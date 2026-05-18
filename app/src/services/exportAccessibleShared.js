import { Parser } from "n3";
import typeVocabLookup from "./typeVocabLookup.json";
import { getGenderedPosition } from "./service";

export const BERORGS_VOCAB_URL =
  "https://raw.githubusercontent.com/berlin/lod-vocabulary/main/data/berorgs/berorgs.ttl";

export const BERORGS_NAMESPACE =
  "https://berlin.github.io/lod-vocabulary/berorgs/";

export const RDFS_COMMENT_PREDICATE =
  "http://www.w3.org/2000/01/rdf-schema#comment";

export const RDFS_LABEL_PREDICATE =
  "http://www.w3.org/2000/01/rdf-schema#label";

export const safe = (value) =>
  typeof value === "string" ? value.trim() : "";

export const personName = (person = {}) => {
  const parts = [
    safe(person.salutation),
    safe(person.title),
    safe(person.firstName),
    safe(person.lastName),
  ]
    .filter(Boolean)
    .join(" ");

  return parts || "";
};

export const getVisibleChildUnits = (units = []) => {
  return (units || []).flatMap((unit) => {
    if (unit?.layout?.style === "hide") {
      return getVisibleChildUnits(unit?.organisations || []);
    }

    return [unit];
  });
};

/**
 * Ensures that the exported accessible document has exactly one
 * organisation with depth 0.
 *
 * Cases:
 * - No organisations: []
 * - Exactly one organisation:
 *   that organisation becomes the root
 * - Multiple organisations:
 *   the organisation marked with isMainOrganisation becomes the root
 *   and all other top-level organisations are attached below it
 *
 * Fallback:
 * - If multiple organisations exist but none is marked as main,
 *   the first one is used as root so the output still has only one depth-0 org.
 */
export const normalizeOrganisationRoots = (organisations = []) => {
  const orgs = organisations || [];

  if (orgs.length === 0) {
    return [];
  }

  if (orgs.length === 1) {
    return [
      {
        ...orgs[0],
        isMainOrganisation: true,
      },
    ];
  }

  const mainOrganisation =
    orgs.find((org) => org?.isMainOrganisation === true) || orgs[0];

  const additionalTopLevelOrganisations = orgs.filter(
    (org) => org !== mainOrganisation,
  );

  return [
    {
      ...mainOrganisation,
      isMainOrganisation: true,
      organisations: [
        ...(mainOrganisation?.organisations || []),
        ...additionalTopLevelOrganisations,
      ],
    },
  ];
};

export const flattenUnits = (
  units = [],
  depth = 0,
  parentName = "",
  parentId = "",
  numbering = [],
) => {
  const visibleUnits = getVisibleChildUnits(units);

  return visibleUnits.flatMap((unit, index) => {
    const currentNumbering = [...numbering, index + 1];

    const current = [
      {
        unit,
        depth,
        parentName,
        parentId,
        numbering: currentNumbering,
      },
    ];

    const nested = flattenUnits(
      unit.organisations || [],
      depth + 1,
      safe(unit.name),
      safe(unit.id),
      currentNumbering,
    );

    return [...current, ...nested];
  });
};

export const parseVocabularyData = (turtleText = "") => {
  const dataByTerm = {};

  try {
    const parser = new Parser({ format: "text/turtle" });
    const quads = parser.parse(turtleText || "");

    quads.forEach((quad) => {
      if (quad?.object?.termType !== "Literal") return;
      if ((quad?.object?.language || "").toLowerCase() !== "de") return;

      const subjectValue = quad?.subject?.value || "";
      if (!subjectValue.startsWith(BERORGS_NAMESPACE)) return;

      const term = subjectValue.slice(BERORGS_NAMESPACE.length);
      if (!term) return;

      if (!dataByTerm[term]) {
        dataByTerm[term] = {};
      }

      if (quad?.predicate?.value === RDFS_COMMENT_PREDICATE) {
        const normalizedComment = safe(quad?.object?.value).replace(
          /\s+/g,
          " ",
        );

        if (normalizedComment) {
          dataByTerm[term].comment = normalizedComment;
        }
      } else if (quad?.predicate?.value === RDFS_LABEL_PREDICATE) {
        const normalizedLabel = safe(quad?.object?.value);

        if (normalizedLabel) {
          dataByTerm[term].label = normalizedLabel;
        }
      }
    });
  } catch (_error) {
    return {};
  }

  return dataByTerm;
};

let vocabularyDataCachePromise = null;

export const getVocabularyData = async () => {
  if (!vocabularyDataCachePromise) {
    vocabularyDataCachePromise = fetch(BERORGS_VOCAB_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not fetch vocabulary (${response.status})`);
        }

        return response.text();
      })
      .then((ttl) => ({
        isAvailable: true,
        data: parseVocabularyData(ttl),
      }))
      .catch(() => ({
        isAvailable: false,
        data: {},
      }));
  }

  return vocabularyDataCachePromise;
};

export const slugify = (value = "") => {
  const replacements = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    ß: "ss",
  };

  return safe(value)
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => replacements[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const glossaryLinkFor = (term) => `glossar-${slugify(term)}`;

/**
 * Creates a stateful function that returns a stable, unique slug-based id
 * for an organisation unit. Uses the unit's id (or name as fallback) as a
 * cache key so the same unit always receives the same slug.
 */
export const createUnitLinkFor = () => {
  const unitSlugCache = new Map();
  const slugCounter = new Map();

  return (unit) => {
    const key = safe(unit?.id) || safe(unit?.name) || "";

    if (unitSlugCache.has(key)) {
      return unitSlugCache.get(key);
    }

    const unitName = safe(unit?.name) || "unbenannt";
    const base = `org-${slugify(unitName)}`;
    const count = slugCounter.get(base) || 0;

    slugCounter.set(base, count + 1);

    const id = count === 0 ? base : `${base}-${count + 1}`;

    unitSlugCache.set(key, id);

    return id;
  };
};

export const linkableWebsite = (website = "") => {
  const clean = safe(website);

  if (!clean) return "";

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  return `https://${clean}`;
};

export const normalizePhone = (phone = "") => {
  const clean = safe(phone);

  if (!clean) return "";

  // Remove shorthand alternatives like "/02"
  const primary = clean.split("/")[0];

  // Remove all spaces and non-essential characters, but keep + and digits
  return primary.replace(/[^\d+]/g, "");
};

const MONTH_NAMES = [
  "",
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/**
 * Parses a YYYY-MM-DD date string and returns a long German date label
 * (e.g. "5. Mai 2024"). If the input cannot be parsed, returns the trimmed
 * input as-is so callers can still display the raw value.
 */
export const formatGermanDate = (dateStr = "") => {
  const clean = safe(dateStr);

  if (!clean) return "";

  const parts = clean.split("-");

  if (parts.length !== 3) {
    return clean;
  }

  const [year, month, day] = parts;
  const monthIndex = parseInt(month, 10);

  if (monthIndex < 1 || monthIndex > 12) {
    return clean;
  }

  const dayNum = parseInt(day, 10);

  return `${dayNum}. ${MONTH_NAMES[monthIndex]} ${year}`;
};

/**
 * Computes a structural summary used in both export formats:
 * - levelCount:                       depth of the deepest unit + 1
 * - personIdentitySet:                unique persons by title|firstName|lastName
 * - positionWithContactCount:         positions whose person has any contact
 * - organisationsWithContactCount:    units that have any contact
 */
export const summarizeUnits = (unitsSortedByDepth = []) => {
  const levelCount =
    unitsSortedByDepth.length > 0
      ? Math.max(...unitsSortedByDepth.map(({ depth }) => depth)) + 1
      : 0;

  const personIdentitySet = new Set();
  let positionWithContactCount = 0;

  unitsSortedByDepth.forEach(({ unit }) => {
    const allPositions = [
      ...(unit?.positions || []),
      ...(unit?.departments || []).flatMap(
        (department) => department?.positions || [],
      ),
    ];

    allPositions.forEach((position) => {
      const identity = [
        safe(position?.person?.title),
        safe(position?.person?.firstName),
        safe(position?.person?.lastName),
      ]
        .filter(Boolean)
        .join("|");

      if (identity) {
        personIdentitySet.add(identity);
      }

      if (
        safe(position?.person?.contact?.telephone) ||
        safe(position?.person?.contact?.fax) ||
        safe(position?.person?.contact?.email) ||
        safe(position?.person?.contact?.website)
      ) {
        positionWithContactCount += 1;
      }
    });
  });

  const organisationsWithContactCount = unitsSortedByDepth.filter(
    ({ unit }) =>
      safe(unit?.contact?.telephone) ||
      safe(unit?.contact?.fax) ||
      safe(unit?.contact?.email) ||
      safe(unit?.contact?.website),
  ).length;

  return {
    levelCount,
    personIdentitySet,
    positionWithContactCount,
    organisationsWithContactCount,
  };
};

/**
 * Builds the lookup tables used to resolve "parent unit" links by id or name.
 */
export const buildSectionIdLookups = (unitsSortedByDepth, unitLinkFor) => {
  const sectionIdByUnitId = new Map();
  const sectionIdByUnitName = new Map();

  unitsSortedByDepth.forEach(({ unit }) => {
    const sectionId = unitLinkFor(unit);

    if (safe(unit?.id)) {
      sectionIdByUnitId.set(safe(unit.id), sectionId);
    }

    if (safe(unit?.name) && !sectionIdByUnitName.has(safe(unit.name))) {
      sectionIdByUnitName.set(safe(unit.name), sectionId);
    }
  });

  return { sectionIdByUnitId, sectionIdByUnitName };
};

/**
 * Builds an abstract list of contact entries for a contact object. Each entry
 * is format-agnostic and contains everything renderers need to produce a
 * "Telefon" / "Fax" / "E-Mail" / "Webseite" link or label.
 *
 * Returned shape:
 *   [{ kind: "telephone" | "fax" | "email" | "website", value, href }]
 *
 * The `fax:` URI scheme (RFC 2806) is supported by very few PDF readers /
 * browsers, but emitting it is harmless: handlers that do not understand
 * it simply ignore the click, while the visible link text still shows
 * the actual fax number.
 */
export const buildContactEntries = (contact = {}) => {
  const entries = [];

  if (safe(contact?.telephone)) {
    const value = safe(contact.telephone);

    entries.push({
      kind: "telephone",
      value,
      href: `tel:${normalizePhone(value)}`,
    });
  }

  if (safe(contact?.fax)) {
    const value = safe(contact.fax);

    entries.push({
      kind: "fax",
      value,
      href: `fax:${normalizePhone(value)}`,
    });
  }

  if (safe(contact?.email)) {
    const value = safe(contact.email);

    entries.push({
      kind: "email",
      value,
      href: `mailto:${value}`,
    });
  }

  if (safe(contact?.website)) {
    const value = safe(contact.website);

    entries.push({
      kind: "website",
      value,
      href: linkableWebsite(value),
    });
  }

  return entries;
};

const CONTACT_LABEL_BY_KIND = {
  telephone: "Telefon",
  fax: "Fax",
  email: "E-Mail",
  website: "Webseite",
};

export const labelForContactKind = (kind) =>
  CONTACT_LABEL_BY_KIND[kind] || kind;

/**
 * Returns the format-agnostic display data for a position. Contains the
 * gendered position type, the (optional) vocabulary term used for glossary
 * lookups, status, person name and a list of contact entries.
 */
export const resolvePositionDisplay = (position = {}) => {
  const positionTypeRaw = safe(position?.positionType);
  const positionStatus = safe(position?.positionStatus);

  let positionType = "";
  let vocabTerm = "";

  if (positionTypeRaw) {
    positionType =
      getGenderedPosition(positionTypeRaw, position?.person?.gender) ||
      positionTypeRaw;

    vocabTerm = typeVocabLookup[positionTypeRaw]?.name || "";
  }

  return {
    positionType,
    positionStatus,
    vocabTerm,
    personName: personName(position?.person),
    contacts: buildContactEntries(position?.person?.contact),
  };
};

/**
 * Returns the format-agnostic vocabulary information for an organisation
 * unit's type. The `vocabTerm` (if any) can be used by the renderer to
 * decide whether to link the type into the glossary.
 */
export const resolveUnitTypeDisplay = (unit = {}) => {
  const raw = safe(unit?.type);

  return {
    raw,
    vocabTerm: raw ? typeVocabLookup[raw]?.name || "" : "",
  };
};

/**
 * Returns the visible direct child units of a unit together with their
 * pre-resolved section ids so that renderers can build links without having
 * to know about the lookup tables themselves.
 */
export const describeChildUnits = (unit, { sectionIdByUnitId, sectionIdByUnitName } = {}) => {
  const directChildren = getVisibleChildUnits(unit?.organisations || []);

  return {
    count: directChildren.length,
    children: directChildren.map((child) => ({
      name: safe(child?.name) || "Unbenannte Organisationseinheit",
      sectionId:
        sectionIdByUnitId?.get(safe(child?.id)) ||
        sectionIdByUnitName?.get(safe(child?.name)) ||
        "",
    })),
  };
};

/**
 * Formats an address object into a single human-readable line suitable
 * for both HTML and PDF output. Returns an empty string when the address
 * has no recognisable parts.
 */
export const formatAddress = (address = {}) => {
  const street = [safe(address?.street), safe(address?.housenumber)]
    .filter(Boolean)
    .join(" ");

  const location = [safe(address?.zipCode), safe(address?.city)]
    .filter(Boolean)
    .join(" ");

  const building = safe(address?.building)
    ? `Gebäude ${safe(address.building)}`
    : "";

  const room = safe(address?.room) ? `Raum ${safe(address.room)}` : "";

  return [street, building, room, location].filter(Boolean).join(", ");
};
