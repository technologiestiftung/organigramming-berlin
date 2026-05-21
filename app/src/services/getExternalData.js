import { validateData } from "./service";

// Treat any of these content-types as "JSON-ish" – some servers send
// JSON as `text/plain` or as a generic binary attachment
// (`application/octet-stream`). The URL is already required to end in
// `.json` and we parse the body to confirm it actually is JSON, so we
// can be lenient on the content-type header.
const isJsonContentType = (contentType = "") => {
  const ct = contentType.toLowerCase();
  if (!ct) return true;
  return (
    ct.includes("application/json") ||
    ct.includes("text/json") ||
    ct.includes("text/plain") ||
    ct.includes("application/octet-stream") ||
    ct.includes("binary/octet-stream")
  );
};

// Fetch a URL and return the parsed JSON body. Returns `{ data }` on
// success and `{ error }` (array of strings) otherwise. The 10 MB size
// limit is enforced by the Netlify proxy function on the server side
// only; clients trust the user-supplied source for direct fetches.
const fetchJson = async (url) => {
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    // Network / CORS / DNS errors all surface here. We do not have a
    // reliable way of distinguishing CORS from a generic network error
    // from JS, so callers will treat any thrown error as a candidate
    // for the proxy retry.
    const err = new Error(e?.message || "Network request failed");
    err.cause = e;
    throw err;
  }

  if (!response.ok) {
    return {
      error: [
        `Die Daten konnten nicht geladen werden (HTTP ${response.status}).`,
      ],
    };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!isJsonContentType(contentType)) {
    return {
      error: ["Keine Valides Format. Bitte laden sie eine JSON Datei"],
    };
  }

  let text;
  try {
    text = await response.text();
  } catch (e) {
    return { error: ["Die externen Daten konnten nicht gelesen werden"] };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { error: ["Keine valide JSON"] };
  }

  return { data: parsed };
};

const buildProxyUrl = (target) => {
  // `/proxy` is wired through `netlify.toml` to the function. We deploy
  // the front-end and the function on the same origin, so we can use a
  // relative URL and avoid hard-coding the domain.
  return `/proxy?url=${encodeURIComponent(target)}`;
};

export const getExternalData = async (url) => {
  let attempt;
  let directNetworkError = null;
  try {
    attempt = await fetchJson(url);
  } catch (directError) {
    // Direct fetch threw (network/CORS/DNS). Remember the message and
    // try again through the Netlify proxy as a fallback.
    directNetworkError = directError;
    try {
      attempt = await fetchJson(buildProxyUrl(url));
    } catch (proxyError) {
      // Both the direct fetch and the proxy fallback failed at the
      // network layer – the user is most likely offline (or behind a
      // captive portal).
      return {
        error: [
          "Die Daten konnten nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung und die URL.",
        ],
      };
    }
  }

  if (attempt.error) {
    // If we only ended up at the proxy because the direct fetch threw,
    // a non-JSON response from the proxy almost certainly means we are
    // hitting the dev server fallback (which serves `index.html`) or a
    // captive portal interception. In that case prefer the more
    // meaningful "could not load" message over the misleading
    // "not a JSON file" message.
    if (directNetworkError) {
      return {
        error: [
          "Die Daten konnten nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung und die URL.",
        ],
      };
    }
    return { error: attempt.error };
  }

  const data = attempt.data;

  // Run the schema validator – this is the same check the existing
  // import flow performs.
  try {
    const [valid, errors] = validateData(data);
    if (!valid) {
      console.error(errors);
      return { error: errors };
    }
  } catch (e) {
    return { error: ["Keine valide JSON"] };
  }

  return { data };
};
