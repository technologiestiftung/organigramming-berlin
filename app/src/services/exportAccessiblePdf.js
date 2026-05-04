import typeVocabLookup from "./typeVocabLookup.json";
import { getGenderedPosition } from "./service";
import { Parser } from "n3";

const BERORGS_VOCAB_URL =
  "https://raw.githubusercontent.com/berlin/lod-vocabulary/main/data/berorgs/berorgs.ttl";

let vocabularyCommentCachePromise = null;

const safe = (value) => (typeof value === "string" ? value.trim() : "");

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const personName = (person = {}) => {
  const parts = [
    safe(person.title),
    safe(person.firstName),
    safe(person.lastName),
  ]
    .filter(Boolean)
    .join(" ");
  return parts || "";
};

const getVisibleChildUnits = (units = []) => {
  return (units || []).flatMap((unit) => {
    if (unit?.layout?.style === "hide") {
      return getVisibleChildUnits(unit?.organisations || []);
    }
    return [unit];
  });
};

const flattenUnits = (
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
      { unit, depth, parentName, parentId, numbering: currentNumbering },
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

const BERORGS_NAMESPACE = "https://berlin.github.io/lod-vocabulary/berorgs/";
const RDFS_COMMENT_PREDICATE = "http://www.w3.org/2000/01/rdf-schema#comment";
const RDFS_LABEL_PREDICATE = "http://www.w3.org/2000/01/rdf-schema#label";

const parseVocabularyData = (turtleText = "") => {
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

      if (!dataByTerm[term]) dataByTerm[term] = {};

      if (quad?.predicate?.value === RDFS_COMMENT_PREDICATE) {
        const normalizedComment = safe(quad?.object?.value).replace(/\s+/g, " ");
        if (normalizedComment) dataByTerm[term].comment = normalizedComment;
      } else if (quad?.predicate?.value === RDFS_LABEL_PREDICATE) {
        const normalizedLabel = safe(quad?.object?.value);
        if (normalizedLabel) dataByTerm[term].label = normalizedLabel;
      }
    });
  } catch (_error) {
    return {};
  }

  return dataByTerm;
};

const getVocabularyData = async () => {
  if (!vocabularyCommentCachePromise) {
    vocabularyCommentCachePromise = fetch(BERORGS_VOCAB_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not fetch vocabulary (${response.status})`);
        }
        return response.text();
      })
      .then((ttl) => parseVocabularyData(ttl))
      .catch(() => ({}));
  }
  return vocabularyCommentCachePromise;
};

const slugify = (value = "") => {
  const replacements = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  return safe(value)
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => replacements[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const glossaryLinkFor = (term) => `glossar-${slugify(term)}`;

const unitSlugCache = new Map();
const slugCounter = new Map();
const unitLinkFor = (unit) => {
  const key = safe(unit?.id) || safe(unit?.name) || "";
  if (unitSlugCache.has(key)) return unitSlugCache.get(key);

  const unitName = safe(unit?.name) || "unbenannt";
  const base = `org-${slugify(unitName)}`;
  const count = slugCounter.get(base) || 0;
  slugCounter.set(base, count + 1);
  const id = count === 0 ? base : `${base}-${count + 1}`;
  unitSlugCache.set(key, id);
  return id;
};

const SECTION_DEPTH_COLORS = ["#002856", "#004F9F", "#4F90CD", "#AAC9E7"];
const getDepthBorderColor = (depth = 0) =>
  SECTION_DEPTH_COLORS[Math.max(0, depth) % SECTION_DEPTH_COLORS.length];

export const exportAccessiblePdf = async (data, exportFilename) => {
  const title = safe(data?.document?.title) || "Organigramm";
  const version = safe(data?.document?.version);
  const formatDate = (dateStr = "") => {
    const clean = safe(dateStr);
    if (!clean) return "";
    const parts = clean.split("-");
    if (parts.length !== 3) return escapeHtml(clean);
    const [year, month, day] = parts;
    const monthNames = ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const monthIndex = parseInt(month, 10);
    if (monthIndex < 1 || monthIndex > 12) return escapeHtml(clean);
    const dayNum = parseInt(day, 10);
    return `<time datetime="${escapeHtml(clean)}">${dayNum}. ${monthNames[monthIndex]} ${year}</time>`;
  };
  const includeVocabularyComments = Boolean(
    data?.export?.includeVocabularyComments,
  );
  const vocabularyData = includeVocabularyComments
    ? await getVocabularyData()
    : {};

  const units = flattenUnits(data?.organisations || []);
  const glossaryTerms = new Map();

  const describeTermInline = (rawLabel, vocabTerm) => {
    if (!includeVocabularyComments || !vocabTerm) return escapeHtml(rawLabel);
    const termData = vocabularyData[vocabTerm];
    if (!termData?.comment) return escapeHtml(rawLabel);

    if (!glossaryTerms.has(vocabTerm)) {
      glossaryTerms.set(vocabTerm, {
        label: termData.label || vocabTerm,
        comment: termData.comment,
      });
    }
    const href = `#${glossaryLinkFor(vocabTerm)}`;
    return `<a href="${href}">${escapeHtml(rawLabel)}</a>`;
  };

  const linkableWebsite = (website = "") => {
    const clean = safe(website);
    if (!clean) return "";
    if (clean.startsWith("http://") || clean.startsWith("https://"))
      return clean;
    return `https://${clean}`;
  };

  const normalizePhone = (phone = "") => {
    const clean = safe(phone);
    if (!clean) return "";
    // Remove shorthand alternatives like "/02"
    const primary = clean.split("/")[0];
    // Remove all spaces and non-essential characters (keep + and digits)
    return primary.replace(/[^\d+]/g, "");
  };

  // const unitsSortedByDepth = [...units].sort((a, b) => a.depth - b.depth);
  const unitsSortedByDepth = [...units];
  const sectionIdByUnitId = new Map();
  const sectionIdByUnitName = new Map();

  unitsSortedByDepth.forEach(({ unit }) => {
    const sectionId = unitLinkFor(unit);
    if (safe(unit?.id)) sectionIdByUnitId.set(safe(unit.id), sectionId);
    if (safe(unit?.name) && !sectionIdByUnitName.has(safe(unit.name))) {
      sectionIdByUnitName.set(safe(unit.name), sectionId);
    }
  });
  const mainOrganisationEntry = unitsSortedByDepth.find(
    ({ unit }) => unit?.isMainOrganisation === true,
  );
  const mainOrganisationName = safe(mainOrganisationEntry?.unit?.name);
  const mainOrganisationSectionId = mainOrganisationEntry
    ? unitLinkFor(mainOrganisationEntry.unit)
    : "";

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
      if (identity) personIdentitySet.add(identity);

      if (
        safe(position?.person?.contact?.telephone) ||
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
      safe(unit?.contact?.email) ||
      safe(unit?.contact?.website),
  ).length;

  const generateNestedToc = (orgUnits = [], depth = 0) => {
    const visibleOrgUnits = getVisibleChildUnits(orgUnits);
    if (visibleOrgUnits.length === 0) return "";

    const items = visibleOrgUnits.map((unit) => {
      const sectionId = unitLinkFor(unit);
      const linkText = escapeHtml(safe(unit?.name) || "Unbenannte Organisationseinheit");
      const link = `<a href="#${sectionId}">${linkText}</a>`;
      const childrenHtml = generateNestedToc(unit.organisations || [], depth + 1);
      
      return `<li>${link}${childrenHtml ? `\n<ul>\n${childrenHtml}\n</ul>\n` : ""}</li>`;
    });

    return items.join("\n");
  };

  const nestedTocHtml = generateNestedToc(data?.organisations || []);

  const unitSections = unitsSortedByDepth
    .map(({ unit, parentName, parentId, depth }) => {
      const sectionId = unitLinkFor(unit);
      const unitName = safe(unit?.name) || "Unbenannte Organisationseinheit";
      const unitPurpose = safe(unit?.purpose);

      let parentLabel = parentName || "";
      let resolvedParentLink =
        sectionIdByUnitId.get(parentId) ||
        sectionIdByUnitName.get(parentName) ||
        "";
      if (
        !parentLabel &&
        depth === 0 &&
        !unit?.isMainOrganisation &&
        mainOrganisationName
      ) {
        parentLabel = mainOrganisationName;
        resolvedParentLink =
          mainOrganisationSectionId ||
          sectionIdByUnitName.get(mainOrganisationName) ||
          "";
      }
      const parentMarkup = resolvedParentLink
        ? `<a href="#${resolvedParentLink}">${escapeHtml(parentLabel)}</a>`
        : escapeHtml(parentLabel || "keine");

      const unitType = safe(unit?.type);
      const unitTerm = typeVocabLookup[unitType]?.name;
      const unitTypeDisplay = unitType
        ? describeTermInline(unitType, unitTerm)
        : "";

      const positionMetaItems = (unit?.positions || [])
        .map((position) => {
          const positionTypeRaw = safe(position?.positionType);
          const positionStatusRaw = safe(position?.positionStatus);
          
          let positionType = "";
          let positionTerm = "";
          if (positionTypeRaw) {
            positionType = getGenderedPosition(
              positionTypeRaw,
              position?.person?.gender,
            );
            positionTerm = typeVocabLookup[positionTypeRaw]?.name;
          }

          let displayRole = "";
          if (positionType && positionStatusRaw) {
            displayRole = `${describeTermInline(positionType, positionTerm)} (${escapeHtml(positionStatusRaw)})`;
          } else if (positionType) {
            displayRole = describeTermInline(positionType, positionTerm);
          } else if (positionStatusRaw) {
            displayRole = escapeHtml(positionStatusRaw);
          }

          const pName = personName(position?.person);
          const positionContactLinks = [];
          if (safe(position?.person?.contact?.telephone)) {
            const telLabel = pName ? `Telefon von ${escapeHtml(pName)}` : "Telefon";
            positionContactLinks.push(
              `<a href="tel:${escapeHtml(normalizePhone(position.person.contact.telephone))}" aria-label="${telLabel}">Telefon</a>`,
            );
          }
          if (safe(position?.person?.contact?.email)) {
            const emailLabel = pName ? `E-Mail an ${escapeHtml(pName)}` : "E-Mail";
            positionContactLinks.push(
              `<a href="mailto:${escapeHtml(safe(position.person.contact.email))}" aria-label="${emailLabel}">E-Mail</a>`,
            );
          }
          if (safe(position?.person?.contact?.website)) {
            const webLabel = pName ? `Webseite von ${escapeHtml(pName)}` : "Webseite";
            positionContactLinks.push(
              `<a href="${escapeHtml(linkableWebsite(position.person.contact.website))}" aria-label="${webLabel}">Webseite</a>`,
            );
          }
          const contactSuffix =
            positionContactLinks.length > 0
              ? ` <span>(Kontakt: ${positionContactLinks.join(" | ")})</span>`
              : "";
          return `<li>${displayRole}${displayRole ? ':' : ''} ${escapeHtml(personName(position?.person))}${contactSuffix}</li>`;
        })
        .filter(Boolean);

      const metaItems = [
        !unit?.isMainOrganisation
          ? `<li><strong>Übergeordnete Einheit:</strong> ${parentMarkup}</li>`
          : "",
        unitTypeDisplay
          ? `<li><strong>Art:</strong> ${unitTypeDisplay}</li>`
          : "",
        positionMetaItems.length
          ? `<li><strong>Personen und Aufgaben:</strong><ul>${positionMetaItems.join("")}</ul></li>`
          : "",
      ].filter(Boolean);

      const directChildren = getVisibleChildUnits(unit?.organisations || []);
      const directChildDescription =
        directChildren.length > 0
          ? (() => {
              const childLinks = directChildren.map((child) => {
                const childSectionId =
                  sectionIdByUnitId.get(safe(child?.id)) ||
                  sectionIdByUnitName.get(safe(child?.name));
                const childLabel = escapeHtml(
                  safe(child?.name) || "Unbenannte Organisationseinheit",
                );
                return childSectionId
                  ? `<a href="#${childSectionId}">${childLabel}</a>`
                  : childLabel;
              });
              return `<p>Diese Organisationseinheit hat ${directChildren.length} direkt untergeordnete Organisationseinheiten. Die direkt untergeordneten Einheiten sind: ${childLinks.join(", ")}</p>`;
            })()
          : "";

      const orgContactLinks = [];
      if (safe(unit?.contact?.telephone)) {
        orgContactLinks.push(
          `<a href="tel:${escapeHtml(normalizePhone(unit.contact.telephone))}" aria-label="Telefon der Organisationseinheit ${escapeHtml(unitName)}">Telefon</a>`,
        );
      }
      if (safe(unit?.contact?.email)) {
        orgContactLinks.push(
          `<a href="mailto:${escapeHtml(safe(unit.contact.email))}" aria-label="E-Mail der Organisationseinheit ${escapeHtml(unitName)}">E-Mail</a>`,
        );
      }
      if (safe(unit?.contact?.website)) {
        orgContactLinks.push(
          `<a href="${escapeHtml(linkableWebsite(unit.contact.website))}" aria-label="Webseite der Organisationseinheit ${escapeHtml(unitName)}">Webseite</a>`,
        );
      }
      if (orgContactLinks.length > 0) {
        metaItems.push(
          `<li><strong>Kontakt:</strong> ${orgContactLinks.join(" | ")}</li>`,
        );
      }

      const departments = (unit?.departments || [])
        .map((department) => {
          const deptName = escapeHtml(
            safe(department?.name) || "Unbenannte Einheit",
          );
          const deptPositions = (department?.positions || [])
            .map((position) => {
              const positionTypeRaw = safe(position?.positionType);
              const positionStatusRaw = safe(position?.positionStatus);
              
              let positionType = "";
              let positionTerm = "";
              if (positionTypeRaw) {
                positionType = getGenderedPosition(
                  positionTypeRaw,
                  position?.person?.gender,
                );
                positionTerm = typeVocabLookup[positionTypeRaw]?.name;
              }

              let displayRole = "";
              if (positionType && positionStatusRaw) {
                displayRole = `${describeTermInline(positionType, positionTerm)} (${escapeHtml(positionStatusRaw)})`;
              } else if (positionType) {
                displayRole = describeTermInline(positionType, positionTerm);
              } else if (positionStatusRaw) {
                displayRole = escapeHtml(positionStatusRaw);
              }

              const positionContactLinks = [];
              if (safe(position?.person?.contact?.telephone)) {
                positionContactLinks.push(
                  `<a href="tel:${escapeHtml(normalizePhone(position.person.contact.telephone))}" aria-label="Telefon von ${escapeHtml(personName(position?.person))}">Telefon</a>`,
                );
              }
              if (safe(position?.person?.contact?.email)) {
                positionContactLinks.push(
                  `<a href="mailto:${escapeHtml(safe(position.person.contact.email))}" aria-label="E-Mail an ${escapeHtml(personName(position?.person))}">E-Mail</a>`,
                );
              }
              if (safe(position?.person?.contact?.website)) {
                positionContactLinks.push(
                  `<a href="${escapeHtml(linkableWebsite(position.person.contact.website))}" aria-label="Webseite von ${escapeHtml(personName(position?.person))}">Webseite</a>`,
                );
              }
              const contactSuffix =
                positionContactLinks.length > 0
                  ? ` <span>(Kontakt: ${positionContactLinks.join(" | ")})</span>`
                  : "";
              
              const finalName = escapeHtml(personName(position?.person));
              const colon = displayRole && finalName ? ': ' : '';
              
              return `<li>${displayRole}${colon}${finalName}${contactSuffix}</li>`;
            })
            .join("");
          return `<li>${deptName}${deptPositions ? `<ul>${deptPositions}</ul>` : ""}</li>`;
        })
        .join("");

      // If it's the main organisation, force h2.
      // Otherwise, the main org is h2 (depth 0), so depth 0 non-main-orgs should be h3, depth 1 should be h4, etc.
      const headingLevel = unit?.isMainOrganisation ? 2 : Math.min(depth + 3, 6);
      const subHeadingLevel = Math.min(headingLevel + 1, 6);

      return `
        <section id="${sectionId}" tabindex="-1" data-level-depth="${depth}" style="--depth-border-color: ${getDepthBorderColor(depth)}">
          <h${headingLevel}>${escapeHtml(unitName)}</h${headingLevel}>
          ${unitPurpose ? `<p>${escapeHtml(unitPurpose)}</p>` : ""}
          ${directChildDescription}
          ${metaItems.length ? `<ul>${metaItems.join("")}</ul>` : ""}
          ${departments ? `<h${subHeadingLevel}>Zugehörige Einheiten</h${subHeadingLevel}><ul>${departments}</ul>` : ""}
        </section>
      `;
    })
    .join("\n");

  const glossarySection =
    includeVocabularyComments && glossaryTerms.size > 0
      ? `
      <section id="glossary" tabindex="-1">
        <h2>Glossar</h2>
        <dl>
          ${[...glossaryTerms.entries()]
            .sort(([, a], [, b]) => a.label.localeCompare(b.label, "de"))
            .map(
              ([term, { label, comment }]) =>
                `<dt id="${glossaryLinkFor(term)}" tabindex="-1">${escapeHtml(label)}</dt><dd>${escapeHtml(comment)}</dd>`,
            )
            .join("")}
        </dl>
      </section>
    `
      : "";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(exportFilename || title)}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.4; margin: 2rem; }
    .skip-link { position: absolute; left: -9999px; top: 0; background: #fff; color: #000; padding: .5rem .8rem; border: 2px solid #0b57d0; z-index: 1000; }
    .skip-link:focus { left: 1rem; top: 1rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
    h1 { font-size: 1.8rem; margin-bottom: .25rem; }
    h2 { font-size: 1.35rem; margin-top: 0; }
    h3 { font-size: 1.1rem; margin-top: 1rem; }
    h6 { font-size: 12px; }
    section { border: 1px solid #d9d9d9; border-top: 4px solid var(--depth-border-color, #002856); padding: .8rem 1rem; margin-bottom: .9rem; }
    nav ul, section ul { margin-left: 1.2rem; }
    dl dt { font-weight: 700; margin-top: .7rem; }
    dl dd { margin-left: 1rem; margin-bottom: .6rem; }
    a { color: #0b57d0; text-decoration: underline; }
    a:focus-visible,
    main:focus,
    section:focus,
    dt:focus {
      outline: 3px solid #0b57d0;
      outline-offset: 2px;
    }
    main:target,
    section:target,
    dt:target {
      outline: 3px solid #0b57d0;
      outline-offset: 2px;
      scroll-margin-top: 1rem;
    }
    @media print {
      a { color: inherit; }
      .skip-link { display: none; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#org-structure">Zum Inhaltsbereich springen</a>
  <header>
    <h1>Organigramm der/des ${escapeHtml(title)}</h1>
    <p>Dieses Organigramm ist hierarchisch aufgebaut. Nutzen Sie die Überschriftennavigation Ihres Screenreaders, um zwischen Organisationsebenen zu wechseln.</p>
    ${version ? `<p>Stand des Organigramms: ${formatDate(version)}</p>` : ""}
    <p>Es enthält ${unitsSortedByDepth.length} Organisationseinheiten in ${levelCount} Ebenen und nennt ${personIdentitySet.size} Personen.</p>
    <p>Kontaktangaben sind teilweise vorhanden (Organisationen: ${organisationsWithContactCount}, Personen: ${positionWithContactCount}).</p>
    <p>Begriffserklärungen finden Sie teilweise im Glossar.</p>
  </header>

  <nav aria-label="Inhaltsverzeichnis">
    <h2>Inhaltsverzeichnis</h2>
    <ul>
      ${nestedTocHtml}
      ${glossarySection ? '<li><a href="#glossary">Glossar</a></li>' : ""}
    </ul>
  </nav>

  <main id="org-structure" tabindex="-1">
    ${unitSections}
    ${glossarySection}
  </main>
</body>
</html>`;

  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    throw new Error("Preview window could not be opened.");
  }

  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  previewWindow.document.title = exportFilename || title;
};
