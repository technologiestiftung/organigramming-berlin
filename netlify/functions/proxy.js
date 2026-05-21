// Netlify function: CORS proxy for JSON files referenced via the
// `dataurl` query parameter of the app.
//
// Constraints enforced here (intentionally strict – this proxy is only
// a fallback, not a generic web proxy):
//
//   * Only `GET` requests are accepted.
//   * The target URL must use `http:` or `https:` and end with `.json`.
//   * The remote response must declare a JSON content-type.
//   * The downloaded body is hard-capped at 10 MB.
//   * A simple in-memory rate limit (per source IP) is applied. With
//     Netlify Functions instances being short-lived and per-region this
//     limit is approximate, but it does cap obvious abuse from a single
//     client.
//
// The function returns the JSON body verbatim with permissive CORS
// headers so the browser can read it from the static front-end.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per IP per window
const FETCH_TIMEOUT_MS = 15 * 1000;

// Module-scoped map persists across invocations on the same warm
// instance. Cold starts reset the counter, which is acceptable for an
// approximate guard.
const rateLimitStore = new Map();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const jsonError = (statusCode, message) => ({
  statusCode,
  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});

const checkRateLimit = (ip) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitStore.get(ip) || []).filter(
    (ts) => ts > windowStart,
  );

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);

  // Opportunistic cleanup of stale entries.
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore) {
      const fresh = value.filter((ts) => ts > windowStart);
      if (fresh.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, fresh);
      }
    }
  }

  return true;
};

const validateTargetUrl = (raw) => {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (e) {
    return { error: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { error: "Only http(s) URLs are allowed" };
  }

  if (!parsed.pathname.toLowerCase().endsWith(".json")) {
    return { error: "Only .json URLs are allowed" };
  }

  return { url: parsed.toString() };
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return jsonError(405, "Method not allowed");
  }

  const rawTarget =
    event.queryStringParameters && event.queryStringParameters.url;

  if (!rawTarget) {
    return jsonError(400, "Missing `url` query parameter");
  }

  const { url: targetUrl, error: validationError } =
    validateTargetUrl(rawTarget);

  if (validationError) {
    return jsonError(400, validationError);
  }

  const clientIp =
    (event.headers && (event.headers["x-nf-client-connection-ip"] ||
      event.headers["x-forwarded-for"] ||
      event.headers["client-ip"])) ||
    "unknown";
  // `x-forwarded-for` can be a comma-separated list, use the first hop.
  const firstIp = String(clientIp).split(",")[0].trim();

  if (!checkRateLimit(firstIp)) {
    return jsonError(429, "Too many requests, please try again later");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "application/json, text/plain;q=0.5" },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return jsonError(504, "Upstream request timed out");
    }
    return jsonError(502, "Failed to fetch upstream resource");
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    return jsonError(
      response.status === 404 ? 404 : 502,
      `Upstream responded with ${response.status}`,
    );
  }

  // Accept the common JSON content-types plus the generic fallbacks
  // that some servers use for `.json` downloads (e.g. berlin.de serves
  // `application/octet-stream` with a `.json` Content-Disposition). We
  // already restrict the URL path to `.json`, and we still validate by
  // parsing the body below, so this stays safe.
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const isAcceptableContentType =
    !contentType ||
    contentType.includes("application/json") ||
    contentType.includes("text/json") ||
    contentType.includes("text/plain") ||
    contentType.includes("application/octet-stream") ||
    contentType.includes("binary/octet-stream");

  if (!isAcceptableContentType) {
    return jsonError(415, "Upstream content-type is not JSON");
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength && declaredLength > MAX_BYTES) {
    return jsonError(413, "Upstream payload exceeds 10 MB limit");
  }

  // Stream the response so we can stop early when exceeding the size cap.
  const reader = response.body && response.body.getReader && response.body.getReader();
  let bodyText;

  if (reader) {
    const chunks = [];
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        try { await reader.cancel(); } catch (_) {}
        return jsonError(413, "Upstream payload exceeds 10 MB limit");
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    bodyText = buffer.toString("utf8");
  } else {
    // Fallback for runtimes without streaming bodies.
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return jsonError(413, "Upstream payload exceeds 10 MB limit");
    }
    bodyText = buffer.toString("utf8");
  }

  // Validate that the body is actually parseable JSON.
  try {
    JSON.parse(bodyText);
  } catch (e) {
    return jsonError(415, "Upstream body is not valid JSON");
  }

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: bodyText,
  };
};
