import {
  safe,
  getVisibleChildUnits,
  normalizeOrganisationRoots,
  flattenUnits,
  getVocabularyData,
  glossaryLinkFor,
  createUnitLinkFor,
  formatGermanDate,
  summarizeUnits,
  buildSectionIdLookups,
  buildContactEntries,
  labelForContactKind,
  resolvePositionDisplay,
  resolveUnitTypeDisplay,
  describeChildUnits,
  formatAddress,
} from "./exportAccessibleShared";

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const SECTION_DEPTH_COLORS = ["#002856", "#004F9F", "#4F90CD", "#AAC9E7"];

const getDepthBorderColor = (depth = 0) =>
  SECTION_DEPTH_COLORS[
    Math.max(0, depth) % SECTION_DEPTH_COLORS.length
  ];

const formatDateHtml = (dateStr = "") => {
  const clean = safe(dateStr);

  if (!clean) return "";

  const formatted = formatGermanDate(clean);

  // If formatGermanDate returned the input unchanged, the value was not a
  // recognisable ISO date and we should just escape it as plain text.
  if (formatted === clean) {
    return escapeHtml(clean);
  }

  return `<time datetime="${escapeHtml(clean)}">${formatted}</time>`;
};

export const exportAccessibleHTML = async (data, exportFilename) => {
  const title = safe(data?.document?.title) || "Organigramm";
  const version = safe(data?.document?.version);
  const documentNote = safe(data?.document?.note);

  const { isAvailable: isVocabularyAvailable, data: vocabularyData } =
    await getVocabularyData();

  const normalizedRootOrganisations = normalizeOrganisationRoots(
    data?.organisations || [],
  );

  const units = flattenUnits(normalizedRootOrganisations);
  const glossaryTerms = new Map();

  const describeTermInline = (rawLabel, vocabTerm) => {
    if (!isVocabularyAvailable || !vocabTerm) {
      return escapeHtml(rawLabel);
    }

    const termData = vocabularyData[vocabTerm];

    if (!termData?.comment) {
      return escapeHtml(rawLabel);
    }

    if (!glossaryTerms.has(vocabTerm)) {
      glossaryTerms.set(vocabTerm, {
        label: termData.label || vocabTerm,
        comment: termData.comment,
      });
    }

    const href = `#${glossaryLinkFor(vocabTerm)}`;

    return `<a href="${href}">${escapeHtml(rawLabel)}</a>`;
  };

  const unitsSortedByDepth = [...units];

  const unitLinkFor = createUnitLinkFor();

  const { sectionIdByUnitId, sectionIdByUnitName } = buildSectionIdLookups(
    unitsSortedByDepth,
    unitLinkFor,
  );

  const {
    levelCount,
    personIdentitySet,
    positionWithContactCount,
    organisationsWithContactCount,
  } = summarizeUnits(unitsSortedByDepth);

  const generateNestedToc = (orgUnits = []) => {
    const visibleOrgUnits = getVisibleChildUnits(orgUnits);

    if (visibleOrgUnits.length === 0) {
      return "";
    }

    const items = visibleOrgUnits.map((unit) => {
      const sectionId = unitLinkFor(unit);

      const linkText = escapeHtml(
        safe(unit?.name) || "Unbenannte Organisationseinheit",
      );

      const link = `<a href="#${sectionId}">${linkText}</a>`;
      const childrenHtml = generateNestedToc(unit.organisations || []);

      return `<li>${link}${
        childrenHtml
          ? `\n<ul>\n${childrenHtml}\n</ul>\n`
          : ""
      }</li>`;
    });

    return items.join("\n");
  };

  const nestedTocHtml = generateNestedToc(normalizedRootOrganisations);

  const unitSections = unitsSortedByDepth
    .map(({ unit, parentName, parentId, depth }) => {
      const sectionId = unitLinkFor(unit);

      const unitName =
        safe(unit?.name) || "Unbenannte Organisationseinheit";

      const unitAltName = safe(unit?.altName);
      const unitHeading = unitAltName
        ? `${unitName} (${unitAltName})`
        : unitName;

      const unitPurpose = safe(unit?.purpose);
      const unitAddress = formatAddress(unit?.address);

      const parentLabel = parentName || "";

      const resolvedParentLink =
        sectionIdByUnitId.get(parentId) ||
        sectionIdByUnitName.get(parentName) ||
        "";

      const parentMarkup = resolvedParentLink
        ? `<a href="#${resolvedParentLink}">${escapeHtml(parentLabel)}</a>`
        : escapeHtml(parentLabel || "keine");

      const { raw: unitType, vocabTerm: unitTerm } =
        resolveUnitTypeDisplay(unit);

      const unitTypeDisplay = unitType
        ? describeTermInline(unitType, unitTerm)
        : "";

      const renderPositionContactSuffix = (contacts, pName) => {
        if (contacts.length === 0) return "";

        const links = contacts
          .map((entry) => {
            const baseLabel = labelForContactKind(entry.kind);
            const ariaLabel = pName
              ? `${baseLabel} ${
                  entry.kind === "email" ? "an" : "von"
                } ${escapeHtml(pName)}`
              : baseLabel;

            return `<a href="${escapeHtml(
              entry.href,
            )}" aria-label="${ariaLabel}">${baseLabel}</a>`;
          })
          .join(" | ");

        return ` <span>(Kontakt: ${links})</span>`;
      };

      const renderPositionListItem = (position) => {
        const {
          positionType,
          positionStatus,
          vocabTerm: positionTerm,
          personName: pName,
          contacts,
        } = resolvePositionDisplay(position);

        let displayRole = "";

        if (positionType && positionStatus) {
          displayRole = `${describeTermInline(
            positionType,
            positionTerm,
          )} (${escapeHtml(positionStatus)})`;
        } else if (positionType) {
          displayRole = describeTermInline(positionType, positionTerm);
        } else if (positionStatus) {
          displayRole = escapeHtml(positionStatus);
        }

        const finalName = escapeHtml(pName);
        const colon = displayRole && finalName ? ": " : "";
        const contactSuffix = renderPositionContactSuffix(contacts, pName);

        return `<li>${displayRole}${colon}${finalName}${contactSuffix}</li>`;
      };

      const positionMetaItems = (unit?.positions || [])
        .map(renderPositionListItem)
        .filter(Boolean);

      const metaItems = [
        depth > 0
          ? `<li><strong>Übergeordnete Einheit:</strong> ${parentMarkup}</li>`
          : "",
        unitTypeDisplay
          ? `<li><strong>Art:</strong> ${unitTypeDisplay}</li>`
          : "",
        unitAddress
          ? `<li><strong>Adresse:</strong> ${escapeHtml(unitAddress)}</li>`
          : "",
        positionMetaItems.length
          ? `<li><strong>Personen und Aufgaben:</strong><ul>${positionMetaItems.join(
              "",
            )}</ul></li>`
          : "",
      ].filter(Boolean);

      const childDescription = describeChildUnits(unit, {
        sectionIdByUnitId,
        sectionIdByUnitName,
      });

      const directChildDescription =
        childDescription.count > 0
          ? (() => {
              const childLinks = childDescription.children.map((child) => {
                const childLabel = escapeHtml(child.name);

                return child.sectionId
                  ? `<a href="#${child.sectionId}">${childLabel}</a>`
                  : childLabel;
              });

              return `<p>Diese Organisationseinheit hat ${childDescription.count} direkt untergeordnete Organisationseinheiten. Die direkt untergeordneten Einheiten sind: ${childLinks.join(
                ", ",
              )}</p>`;
            })()
          : "";

      const orgContactEntries = buildContactEntries(unit?.contact);

      const orgContactLinks = orgContactEntries.map((entry) => {
        const baseLabel = labelForContactKind(entry.kind);
        const ariaLabel = `${baseLabel} der Organisationseinheit ${escapeHtml(
          unitName,
        )}`;

        return `<a href="${escapeHtml(
          entry.href,
        )}" aria-label="${ariaLabel}">${baseLabel}</a>`;
      });

      if (orgContactLinks.length > 0) {
        metaItems.push(
          `<li><strong>Kontakt:</strong> ${orgContactLinks.join(
            " | ",
          )}</li>`,
        );
      }

      const departments = (unit?.departments || [])
        .map((department) => {
          const deptName = escapeHtml(
            safe(department?.name) || "Unbenannte Einheit",
          );

          const { raw: deptType, vocabTerm: deptVocabTerm } =
            resolveUnitTypeDisplay(department);

          const deptTypeDisplay = deptType
            ? describeTermInline(deptType, deptVocabTerm)
            : "";

          const deptPurpose = safe(department?.purpose);

          const deptHead = [
            `<strong>${deptName}</strong>`,
            deptTypeDisplay || "",
            deptPurpose ? escapeHtml(deptPurpose) : "",
          ]
            .filter(Boolean)
            .join(" — ");

          const deptPositions = (department?.positions || [])
            .map(renderPositionListItem)
            .join("");

          return `<li>${deptHead}${
            deptPositions ? `<ul>${deptPositions}</ul>` : ""
          }</li>`;
        })
        .join("");

      return `
        <section
          id="${sectionId}"
          tabindex="-1"
          data-org-depth="${depth}"
          style="--depth-border-color: ${getDepthBorderColor(depth)}"
        >
          <h3>${escapeHtml(unitHeading)}</h3>
          ${unitPurpose ? `<p>${escapeHtml(unitPurpose)}</p>` : ""}
          ${directChildDescription}
          ${metaItems.length ? `<ul>${metaItems.join("")}</ul>` : ""}
          ${
            departments
              ? `<h4>Zugehörige Einheiten</h4><ul>${departments}</ul>`
              : ""
          }
        </section>
      `;
    })
    .join("\n");

  const glossarySection =
    isVocabularyAvailable && glossaryTerms.size > 0
      ? `
      <section id="glossary" tabindex="-1">
        <h2>Glossar</h2>
        <dl>
          ${[...glossaryTerms.entries()]
            .sort(([, a], [, b]) => a.label.localeCompare(b.label, "de"))
            .map(
              ([term, { label, comment }]) =>
                `<dt id="${glossaryLinkFor(
                  term,
                )}" tabindex="-1">${escapeHtml(
                  label,
                )}</dt><dd>${escapeHtml(comment)}</dd>`,
            )
            .join("")}
        </dl>
      </section>
    `
      : "";

  const noteSection = documentNote
    ? `
      <section id="note" tabindex="-1">
        <h2>Fußzeile</h2>
        <p>${escapeHtml(documentNote)}</p>
      </section>
    `
    : "";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(exportFilename || title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      margin: 2rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    h1 {
      font-size: 1.8rem;
      margin-bottom: .25rem;
    }

    h2 {
      font-size: 1.35rem;
      margin-top: 1.5rem;
    }

    h3 {
      font-size: 1.1rem;
      margin-top: 0;
    }

    h4 {
      font-size: 1rem;
      margin-top: 1rem;
    }

    section {
      border: 1px solid #d9d9d9;
      border-top: 4px solid var(--depth-border-color, #002856);
      padding: .8rem 1rem;
      margin-bottom: .9rem;
    }

    nav ul,
    section ul {
      margin-left: 1.2rem;
    }

    dl dt {
      font-weight: 700;
      margin-top: .7rem;
    }

    dl dd {
      margin-left: 1rem;
      margin-bottom: .6rem;
    }

    a {
      color: #0b57d0;
      text-decoration: underline;
    }

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
      a {
        color: inherit;
      }

      @page {
        margin: 20mm;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Organigramm von: ${escapeHtml(title)}</h1>

    <p>
      Dieses Organigramm ist hierarchisch aufgebaut. Nutzen Sie die
      Überschriftennavigation Ihres Screenreaders, um zwischen den
      Organisationseinheiten zu wechseln. Die hierarchische Struktur
      finden Sie im Inhaltsverzeichnis.
    </p>

    ${version ? `<p>Stand des Organigramms: ${formatDateHtml(version)}</p>` : ""}

    <p>
      Es enthält ${unitsSortedByDepth.length} Organisationseinheiten in
      ${levelCount} Ebenen und nennt ${personIdentitySet.size} Personen.
    </p>

    <p>
      Kontaktangaben sind teilweise vorhanden
      (Organisationen: ${organisationsWithContactCount},
      Personen: ${positionWithContactCount}).
    </p>

    ${
      isVocabularyAvailable
        ? `<p>Begriffserklärungen finden Sie teilweise im Glossar.</p>`
        : ""
    }
  </header>

  <nav aria-label="Inhaltsverzeichnis">
    <h2>Inhaltsverzeichnis</h2>
    <ul>
      ${nestedTocHtml}
      ${glossarySection ? '<li><a href="#glossary">Glossar</a></li>' : ""}
      ${noteSection ? '<li><a href="#note">Fußzeile</a></li>' : ""}
    </ul>
  </nav>

  <main id="org-structure" tabindex="-1">
    <h2>Organisationseinheiten</h2>

    ${unitSections}

    ${glossarySection}

    ${noteSection}
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
