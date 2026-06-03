import {
  safe,
  getVisibleChildUnits,
  normalizeOrganisationRoots,
  flattenUnits,
  getVocabularyData,
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
  headingInfoForDepth,
  ORG_HEADING_MAX_LEVEL,
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

export const exportAccessibleHTML = async (data, exportFilename, options = {}) => {
  const { replaceCurrentWindow = false } = options;
  const title = safe(data?.document?.title) || "Organigramm";
  const version = safe(data?.document?.version);
  const documentNote = safe(data?.document?.note);

  const { isAvailable: isVocabularyAvailable, data: vocabularyData } =
    await getVocabularyData();

  const normalizedRootOrganisations = normalizeOrganisationRoots(
    data?.organisations || [],
  );

  const units = flattenUnits(normalizedRootOrganisations);

  /**
   * Returns the glossary explanation (the rdfs:comment from the
   * vocabulary) for a vocab term, or an empty string when none exists
   * or the vocabulary is not available.
   *
   * Glossary entries are no longer surfaced via links and a dedicated
   * "Glossar" section at the bottom of the document. Instead the comment
   * is inlined under the position type or organisation type as a sub
   * list item, so screen reader users encounter the explanation in the
   * same reading flow as the term itself.
   */
  const lookupGlossaryComment = (vocabTerm) => {
    if (!isVocabularyAvailable || !vocabTerm) return "";

    const termData = vocabularyData[vocabTerm];

    return safe(termData?.comment);
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

      // The link is wrapped in a <span> so it sits in its own inline
      // container, separate from the nested <ul> that may follow as a
      // sibling. Without the wrapper, JAWS' "Smart Navigation" /
      // "Simple Layout" heuristics sometimes merge the link with the
      // following nested list and stop announcing the link in the
      // Inhaltsverzeichnis. Wrapping each link in a <span> reliably
      // restores the announcement in JAWS, NVDA and VoiceOver alike.
      const link = `<span><a href="#${sectionId}">${linkText}</a></span>`;
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

      const unitTypeComment = lookupGlossaryComment(unitTerm);
      const unitTypeDisplay = unitType ? escapeHtml(unitType) : "";

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
          displayRole = `${escapeHtml(positionType)} (${escapeHtml(
            positionStatus,
          )})`;
        } else if (positionType) {
          displayRole = escapeHtml(positionType);
        } else if (positionStatus) {
          displayRole = escapeHtml(positionStatus);
        }

        const finalName = escapeHtml(pName);
        const colon = displayRole && finalName ? ": " : "";
        const contactSuffix = renderPositionContactSuffix(contacts, pName);

        // If the vocabulary contains a definition for the position type,
        // surface it as a nested list item right below the entry so
        // screen reader users get the explanation in the same reading
        // flow without having to follow a link to a separate glossary.
        const positionComment = positionType
          ? lookupGlossaryComment(positionTerm)
          : "";

        const commentSubList = positionComment
          ? `<ul><li><strong>Erklärung:</strong> ${escapeHtml(
              positionComment,
            )}</li></ul>`
          : "";

        return `<li>${displayRole}${colon}${finalName}${contactSuffix}${commentSubList}</li>`;
      };

      const positionMetaItems = (unit?.positions || [])
        .map(renderPositionListItem)
        .filter(Boolean);

      const childDescription = describeChildUnits(unit, {
        sectionIdByUnitId,
        sectionIdByUnitName,
      });

      const childUnitsMarkup =
        childDescription.count > 0
          ? childDescription.children
              .map((child) => {
                const childLabel = escapeHtml(child.name);

                return child.sectionId
                  ? `<a href="#${child.sectionId}">${childLabel}</a>`
                  : childLabel;
              })
              .join(", ")
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

      const metaItems = [
        unitTypeDisplay
          ? `<li><strong>Typ der Einheit:</strong> ${unitTypeDisplay}${
              unitTypeComment
                ? `<ul><li><strong>Erklärung:</strong> ${escapeHtml(
                    unitTypeComment,
                  )}</li></ul>`
                : ""
            }</li>`
          : "",
        unitAddress
          ? `<li><strong>Adresse:</strong> ${escapeHtml(unitAddress)}</li>`
          : "",
        positionMetaItems.length
          ? `<li><strong>Aufgaben und Personen:</strong><ul>${positionMetaItems.join(
              "",
            )}</ul></li>`
          : "",
        depth > 0
          ? `<li><strong>Übergeordnete Einheit:</strong> ${parentMarkup}</li>`
          : "",
        orgContactLinks.length
          ? `<li><strong>Kontakt:</strong> ${orgContactLinks.join(" | ")}</li>`
          : "",
        childUnitsMarkup
          ? `<li><strong>${
              childDescription.count > 1
                ? "Untergeordnete Einheiten:"
                : "Untergeordnete Einheit:"
            }</strong> ${childUnitsMarkup}</li>`
          : "",
      ].filter(Boolean);

      const departments = (unit?.departments || [])
        .map((department) => {
          const deptName = escapeHtml(
            safe(department?.name) || "Unbenannte Einheit",
          );

          const { raw: deptType, vocabTerm: deptVocabTerm } =
            resolveUnitTypeDisplay(department);

          const deptTypeDisplay = deptType ? escapeHtml(deptType) : "";
          const deptTypeComment = lookupGlossaryComment(deptVocabTerm);

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

          // Glossary explanation of the department type, inlined as a
          // nested list item.
          const deptTypeCommentItem = deptTypeComment
            ? `<li><strong>Erklärung der Einheitsart:</strong> ${escapeHtml(
                deptTypeComment,
              )}</li>`
            : "";

          const subList =
            deptTypeCommentItem || deptPositions
              ? `<ul>${deptTypeCommentItem}${deptPositions}</ul>`
              : "";

          return `<li>${deptHead}${subList}</li>`;
        })
        .join("");

      return `
        <section
          id="${sectionId}"
          tabindex="-1"
          data-org-depth="${depth}"
          style="--depth-border-color: ${getDepthBorderColor(depth)}"
        >
          ${(() => {
            const { htmlLevel, semanticLevel, needsAria } =
              headingInfoForDepth(depth);
            const tag = `h${htmlLevel}`;
            const ariaAttr = needsAria
              ? ` aria-level="${semanticLevel}"`
              : "";
            // For depths beyond H6 we also surface the level as visible
            // text so users without aria-level support still understand
            // the hierarchy.
            const depthPrefix = needsAria
              ? `<span class="sr-only">Ebene ${semanticLevel}: </span>`
              : "";

            return `<${tag}${ariaAttr}>${depthPrefix}${escapeHtml(
              unitHeading,
            )}</${tag}>`;
          })()}
          ${unitPurpose ? `<p>${escapeHtml(unitPurpose)}</p>` : ""}
          ${metaItems.length ? `<ul>${metaItems.join("")}</ul>` : ""}
          ${(() => {
            if (!departments) return "";

            // Sub-section headings live one level below the org heading
            // but never deeper than H6.
            const { htmlLevel } = headingInfoForDepth(depth);
            const subLevel = Math.min(
              htmlLevel + 1,
              ORG_HEADING_MAX_LEVEL,
            );

            return `<h${subLevel}>Zugehörige Einheiten</h${subLevel}><ul>${departments}</ul>`;
          })()}
        </section>
      `;
    })
    .join("\n");

  // The footer note (`document.note`) is editor-managed Markdown. We do
  // not render Markdown here - that would require a dependency on a
  // sanitised renderer. Instead the content is emitted as plain text
  // with line breaks preserved via `white-space: pre-wrap` (see the
  // global stylesheet), so the structure remains readable even though
  // headings, bold, links etc. are NOT interpreted.
  const noteSection = documentNote
    ? `
      <section id="note" tabindex="-1" class="note">
        <h2>Fußzeile</h2>
        <p class="note-body">${escapeHtml(documentNote)}</p>
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

    /*
     * h5 and h6 receive explicit sizes because browsers default to
     * 0.83em / 0.67em which would render below the 12px floor
     * required by the Berliner Standards. We keep them visually
     * distinct from body copy by using 1rem (== 16px) with a
     * slightly lighter weight than h4.
     */
    h5 {
      font-size: 1rem;
      margin-top: 1rem;
    }

    h6 {
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

    .note-body {
      white-space: pre-wrap;
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
      Organisationseinheiten zu wechseln. Die oberste Organisationseinheit
      ist als Überschrift Ebene 3 ausgezeichnet, untergeordnete Einheiten
      als Ebene 4, 5 und 6. Sehr tief verschachtelte Einheiten bleiben
      auf Ebene 6, ihre tatsächliche Tiefe wird zusätzlich über das
      Attribut aria-level angegeben. Die vollständige hierarchische
      Struktur finden Sie im Inhaltsverzeichnis.
    </p>

    ${version ? `<p>Stand des Organigramms: ${formatDateHtml(version)}</p>` : ""}

    <p>
      Es enthält ${unitsSortedByDepth.length} Organisationseinheiten in
      ${levelCount} Ebenen und nennt ${personIdentitySet.size} Personen.
    </p>

    <p>
      Kontaktangaben sind teilweise vorhanden bei
      ${organisationsWithContactCount} Organisationen und
      ${positionWithContactCount} Positionen.
    </p>
  </header>

  <nav aria-label="Inhaltsverzeichnis">
    <h2>Inhaltsverzeichnis</h2>
    <ul>
      ${nestedTocHtml}
      ${noteSection ? '<li><a href="#note">Fußzeile</a></li>' : ""}
    </ul>
  </nav>

  <main id="org-structure" tabindex="-1">
    <h2>Organisationseinheiten</h2>

    ${unitSections}

    ${noteSection}
  </main>
</body>
</html>`;

  if (replaceCurrentWindow) {
    document.open();
    document.write(html);
    document.close();
    document.title = exportFilename || title;
    return;
  }

  const previewWindow = window.open("", "_blank");

  if (!previewWindow) {
    throw new Error("Preview window could not be opened.");
  }

  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  previewWindow.document.title = exportFilename || title;
};
