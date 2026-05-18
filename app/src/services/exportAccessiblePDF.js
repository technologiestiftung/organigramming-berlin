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
} from "./exportAccessibleShared";

const PDFDocument = window.PDFDocument;
const blobStream = window.blobStream;

const PAGE_MARGIN_X = 48;
const PAGE_MARGIN_TOP = 56;
const PAGE_MARGIN_BOTTOM = 48;
const LINE_GAP = 6;

// Registered PDF font aliases. We use Liberation Sans (SIL OFL) embedded as
// TTF so the resulting PDF satisfies the PDF/UA requirement that every used
// font must be embedded. Helvetica (the PDFKit default) is NOT embedded
// because it is a built-in Type-1 font that PDF readers traditionally
// substitute - which fails PDF/UA validation.
const FONT_NAMES = {
  regular: "BodyRegular",
  bold: "BodyBold",
};

const FONT_URLS = {
  [FONT_NAMES.regular]: `${process.env.PUBLIC_URL || ""}/fonts/LiberationSans-Regular.ttf`,
  [FONT_NAMES.bold]: `${process.env.PUBLIC_URL || ""}/fonts/LiberationSans-Bold.ttf`,
};

const fontBufferCache = new Map();

const loadFontBuffer = async (url) => {
  if (fontBufferCache.has(url)) {
    return fontBufferCache.get(url);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Schrift konnte nicht geladen werden (${response.status}): ${url}`,
    );
  }

  const buffer = await response.arrayBuffer();
  fontBufferCache.set(url, buffer);

  return buffer;
};

const loadEmbeddedFonts = async () => {
  const entries = await Promise.all(
    Object.entries(FONT_URLS).map(async ([name, url]) => [
      name,
      await loadFontBuffer(url),
    ]),
  );

  return Object.fromEntries(entries);
};

const HEADING_FONT_SIZES = {
  1: 20,
  2: 15,
  3: 12.5,
  4: 11.5,
  5: 11,
  6: 10.5,
};

// Same palette as HTML's SECTION_DEPTH_COLORS (used for the depth-coloured
// border accent above each unit section).
const SECTION_DEPTH_COLORS = ["#002856", "#004F9F", "#4F90CD", "#AAC9E7"];

const headingFontSize = (level) => HEADING_FONT_SIZES[level] || 11;

const headingLevelFromDepth = (depth) => Math.min(3 + depth, 6);

const getDepthBorderColor = (depth = 0) =>
  SECTION_DEPTH_COLORS[
    Math.max(0, depth) % SECTION_DEPTH_COLORS.length
  ];

const ensureTrailingSpace = (value) => {
  const text = String(value ?? "").replace(/\s+$/g, "");
  return text ? `${text} ` : "";
};

const pageContentWidth = (doc, indent = 0) =>
  doc.page.width - PAGE_MARGIN_X * 2 - indent;

const ensureSpace = (doc, neededHeight = 20) => {
  const usableBottom = doc.page.height - PAGE_MARGIN_BOTTOM;

  if (doc.y + neededHeight > usableBottom) {
    doc.addPage();
    doc.x = PAGE_MARGIN_X;
    doc.y = PAGE_MARGIN_TOP;
  }
};

const setTextStyle = (doc, { fontSize = 11, bold = false } = {}) => {
  doc.font(bold ? FONT_NAMES.bold : FONT_NAMES.regular);
  doc.fontSize(fontSize);
};

const createPdfBlob = (doc) =>
  new Promise((resolve, reject) => {
    const stream = doc.pipe(blobStream());

    stream.on("finish", () => {
      resolve(stream.toBlob("application/pdf"));
    });

    stream.on("error", reject);

    doc.end();
  });

/**
 * Writes a single text paragraph as a tagged structure element (P, H1-H6,
 * Span, Link, ...) and returns the parent so callers can chain.
 */
const writeStructuredParagraph = (
  doc,
  parent,
  text,
  {
    indent = 0,
    fontSize = 11,
    bold = false,
    before = 0,
    after = 0,
    structType = "P",
    destination = null,
    goTo = null,
    link = null,
  } = {},
) => {
  const normalized = ensureTrailingSpace(text);

  if (!normalized) return null;

  if (before > 0) {
    doc.y += before;
  }

  setTextStyle(doc, { fontSize, bold });

  const options = {
    width: pageContentWidth(doc, indent),
    align: "left",
    lineGap: LINE_GAP,
    structParent: parent,
    structType,
  };

  if (destination) options.destination = destination;
  if (goTo) options.goTo = goTo;
  if (link) options.link = link;
  if (link || goTo) options.underline = true;

  const height = doc.heightOfString(normalized, options);
  ensureSpace(doc, height);

  doc.text(normalized, PAGE_MARGIN_X + indent, doc.y, options);

  if (after > 0) {
    doc.y += after;
  }

  return parent;
};

const writeHeading = (
  doc,
  parent,
  text,
  { level = 2, indent = 0, before = 0, after = 4, destination = null } = {},
) => {
  return writeStructuredParagraph(doc, parent, text, {
    indent,
    fontSize: headingFontSize(level),
    bold: true,
    before,
    after,
    structType: `H${Math.min(Math.max(level, 1), 6)}`,
    destination,
  });
};

/**
 * Renders a coloured rule above a unit section to signal its depth in the
 * hierarchy (mirrors the HTML's coloured border-top).
 */
const drawDepthRule = (doc, depth) => {
  ensureSpace(doc, 6);

  const x = PAGE_MARGIN_X;
  const y = doc.y;
  const width = pageContentWidth(doc, 0);

  doc
    .save()
    .lineWidth(2)
    .strokeColor(getDepthBorderColor(depth))
    .moveTo(x, y)
    .lineTo(x + width, y)
    .stroke()
    .restore();

  doc.y = y + 4;
};

/**
 * Manually lays out a sequence of styled runs across one or more lines.
 *
 * Why not use PDFKit's `continued: true` style? PDFKit's line wrapper
 * buffers words across consecutive `text()` calls and only emits a line
 * when a break is required. The link / goTo / underline options applied
 * to each fragment are the options of the call that caused the line to
 * be emitted - i.e. the LAST call's options. That means with
 * `continued: true` only the last run on each visual line carries its
 * link annotation; earlier runs lose theirs. To get per-run links we
 * therefore have to lay out the runs ourselves.
 *
 * The layout algorithm:
 * - Each run is split into wrap-points (word + optional trailing space).
 * - For each wrap-point we test whether the remaining width on the
 *   current line is enough; if not we drop down to the next line.
 * - Adjacent wrap-points from the same run that fit on the same line
 *   are batched into a single `doc.text(..., {lineBreak: false})` call
 *   so the run produces exactly one structured element per line.
 */
const layoutInlineRuns = (
  doc,
  paragraph,
  filteredRuns,
  { startX, maxX, fontSize },
) => {
  let cursorX = startX;
  let cursorY = doc.y;

  const lineHeight = doc.currentLineHeight(true) + LINE_GAP;

  // Splits a run into [{ text, isSpace }] segments. Each segment is the
  // smallest unit at which we can break a line.
  const splitRun = (text) => {
    const segments = [];
    const regex = /(\s+)|([^\s]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1] !== undefined) {
        segments.push({ text: match[1], isSpace: true });
      } else {
        segments.push({ text: match[2], isSpace: false });
      }
    }

    return segments;
  };

  const wrapToNextLine = () => {
    cursorY += lineHeight;
    cursorX = startX;

    // ensureSpace inspects doc.y, so sync it before checking. If a page
    // break is needed PDFKit resets doc.y to the new page's top and we
    // restart the cursor from there.
    doc.y = cursorY;
    ensureSpace(doc, lineHeight);

    if (doc.y !== cursorY) {
      cursorY = doc.y;
      cursorX = startX;
    }
  };

  filteredRuns.forEach((run) => {
    const hasLink = Boolean(run.goTo || run.link);
    const runStruct = doc.struct(hasLink ? "Link" : "Span");

    paragraph.add(runStruct);

    setTextStyle(doc, { fontSize, bold: Boolean(run.bold) });

    const segments = splitRun(run.text);

    // A buffer of segments that have been confirmed to fit on the current
    // line. We flush them as a single doc.text() call so PDFKit creates
    // one annotation per line for this run.
    let buffer = "";
    let bufferStartX = cursorX;

    const flushBuffer = () => {
      if (!buffer) return;

      // PDFKit's _fragment computes the annotation width as
      //   textWidth + wordSpacing * (wordCount - 1) + ...
      // Normally the LineWrapper sets `textWidth` and `wordCount` on the
      // options. We bypass the wrapper (lineBreak: false, no width), so
      // we have to provide these values explicitly - otherwise the
      // link/goTo annotation receives NaN width and PDFKit throws
      // "unsupported number: NaN".
      const measuredWidth = doc.widthOfString(buffer);
      const wordCount = (buffer.match(/\S+/g) || []).length || 1;

      doc.text(buffer, bufferStartX, cursorY, {
        lineBreak: false,
        textWidth: measuredWidth,
        wordCount,
        structParent: runStruct,
        structType: hasLink ? "Link" : "Span",
        underline: hasLink,
        goTo: run.goTo || null,
        link: run.link || null,
      });

      buffer = "";
    };

    segments.forEach((segment) => {
      const segmentWidth = doc.widthOfString(segment.text);

      if (segment.isSpace) {
        // A space is a wrap candidate: if everything still fits, keep it
        // in the buffer; if we are at the start of a line, drop it.
        if (cursorX === startX && !buffer) {
          return;
        }

        if (cursorX + segmentWidth > maxX) {
          flushBuffer();
          wrapToNextLine();
          bufferStartX = cursorX;
          return;
        }

        buffer += segment.text;
        cursorX += segmentWidth;
        return;
      }

      // Non-space word.
      if (cursorX + segmentWidth > maxX && cursorX !== startX) {
        flushBuffer();
        wrapToNextLine();
        bufferStartX = cursorX;
        // Drop any trailing whitespace that ended up at the start of a
        // new line (we already flushed it on the previous line).
      }

      if (!buffer) {
        bufferStartX = cursorX;
      }

      buffer += segment.text;
      cursorX += segmentWidth;
    });

    flushBuffer();
    runStruct.end();
  });

  // Advance the document cursor to the line after the last laid-out one.
  doc.y = cursorY + lineHeight;
};

/**
 * Renders inline runs (text, link or goto) on a single logical paragraph.
 * Each run is `{ text, goTo?, link?, bold? }`. Falsy/empty texts are
 * dropped.
 */
const writeInlineRuns = (
  doc,
  parent,
  runs,
  { indent = 0, fontSize = 11, before = 0, after = 0 } = {},
) => {
  const filtered = runs.filter((run) => run && safe(run.text));

  if (filtered.length === 0) return null;

  if (before > 0) {
    doc.y += before;
  }

  setTextStyle(doc, { fontSize });

  ensureSpace(doc, doc.currentLineHeight(true) + LINE_GAP);

  const paragraph = doc.struct("P");
  parent.add(paragraph);

  layoutInlineRuns(doc, paragraph, filtered, {
    startX: PAGE_MARGIN_X + indent,
    maxX: PAGE_MARGIN_X + indent + pageContentWidth(doc, indent),
    fontSize,
  });

  if (after > 0) {
    doc.y += after;
  }

  paragraph.end();

  return paragraph;
};

const writeBulletItem = (
  doc,
  listStruct,
  runs,
  { indent = 0, fontSize = 11, after = 0 } = {},
) => {
  const filtered = runs.filter((run) => run && safe(run.text));

  if (filtered.length === 0) return null;

  const item = doc.struct("LI");
  const label = doc.struct("Lbl");
  const body = doc.struct("LBody");

  item.add(label);
  item.add(body);
  listStruct.add(item);

  setTextStyle(doc, { fontSize, bold: false });

  const bulletX = PAGE_MARGIN_X + indent;
  const textStartX = PAGE_MARGIN_X + indent + 14;
  const textMaxX = textStartX + pageContentWidth(doc, indent + 14);

  ensureSpace(doc, doc.currentLineHeight(true) + LINE_GAP);

  const alignedY = doc.y;

  doc.text("•", bulletX, alignedY, {
    lineBreak: false,
    structParent: label,
    structType: "Lbl",
  });

  doc.y = alignedY;

  const paragraph = doc.struct("P");
  body.add(paragraph);

  layoutInlineRuns(doc, paragraph, filtered, {
    startX: textStartX,
    maxX: textMaxX,
    fontSize,
  });

  paragraph.end();

  if (after > 0) {
    doc.y += after;
  }

  return { item, body, close: () => item.end() };
};

const buildPositionRuns = (
  position,
  { isVocabularyAvailable, vocabularyData, registerGlossaryTerm },
) => {
  const {
    positionType,
    positionStatus,
    vocabTerm,
    personName: pName,
    contacts,
  } = resolvePositionDisplay(position);

  const runs = [];

  if (positionType) {
    const goTo = registerGlossaryTerm(vocabTerm, {
      isVocabularyAvailable,
      vocabularyData,
    });

    runs.push({
      text: positionType,
      goTo: goTo || null,
    });

    if (positionStatus) {
      runs.push({ text: ` (${positionStatus})` });
    }
  } else if (positionStatus) {
    runs.push({ text: positionStatus });
  }

  if (pName) {
    if (runs.length > 0) {
      runs.push({ text: ": " });
    }

    runs.push({ text: pName });
  }

  contacts.forEach((entry, index) => {
    if (index === 0) {
      runs.push({ text: " (Kontakt: " });
    } else {
      runs.push({ text: ", " });
    }

    // Print the actual phone number / email / URL as the link text. This is
    // more useful in print/PDF than the abstract label that the HTML uses,
    // because tel:/mailto: links are not always clickable in PDF readers.
    runs.push({ text: `${labelForContactKind(entry.kind)}: ` });
    runs.push({
      text: entry.value,
      link: entry.href,
    });
  });

  if (contacts.length > 0) {
    runs.push({ text: ")" });
  }

  return runs;
};

export const exportAccessiblePDF = async (data, exportFilename) => {
  try {
    return await runExportAccessiblePDF(data, exportFilename);
  } catch (error) {
    // The call site does not catch this rejection, so without this log the
    // error would die silently. Logging here makes the real cause visible
    // in the browser console.
    // eslint-disable-next-line no-console
    console.error("[exportAccessiblePDF] failed:", error);
    throw error;
  }
};

const runExportAccessiblePDF = async (data, exportFilename) => {
  if (!PDFDocument || !blobStream) {
    throw new Error(
      "PDFKit oder blob-stream sind nicht geladen. Bitte die Browser-Builds in index.html einbinden.",
    );
  }

  const title = safe(data?.document?.title) || "Organigramm";
  const version = safe(data?.document?.version);

  const { isAvailable: isVocabularyAvailable, data: vocabularyData } =
    await getVocabularyData();

  // Load the embedded fonts before constructing the document so we can
  // register them before the first text is drawn.
  const fontBuffers = await loadEmbeddedFonts();

  const normalizedRootOrganisations = normalizeOrganisationRoots(
    data?.organisations || [],
  );

  const units = flattenUnits(normalizedRootOrganisations);
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

  // Glossary collection mirrors the HTML behaviour: only register a term
  // (and only emit a link to it) when the vocabulary actually has a
  // comment for it.
  const glossaryTerms = new Map();

  const registerGlossaryTerm = (vocabTerm) => {
    if (!isVocabularyAvailable || !vocabTerm) return null;

    const termData = vocabularyData[vocabTerm];

    if (!termData?.comment) return null;

    if (!glossaryTerms.has(vocabTerm)) {
      glossaryTerms.set(vocabTerm, {
        label: termData.label || vocabTerm,
        comment: termData.comment,
      });
    }

    return glossaryLinkFor(vocabTerm);
  };

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    pdfVersion: "1.7",
    tagged: true,
    lang: "de-DE",
    displayTitle: true,
    autoFirstPage: true,
    bufferPages: true,
    info: {
      Title: `${title} - Barrierefreie Fassung`,
      Subject: "Barrierefreies Organigramm",
      Author: safe(data?.document?.creator) || "Organigramm Tool Berlin",
      Creator: "organigramming-berlin",
      Producer: "PDFKit",
      CreationDate: new Date(),
      ModDate: new Date(),
      Keywords: "Organigramm, Barrierefreiheit, PDF",
    },
  });

  doc.x = PAGE_MARGIN_X;
  doc.y = PAGE_MARGIN_TOP;

  // Register the embedded Liberation Sans faces. From this point on every
  // setTextStyle() call selects one of these embedded fonts, which means
  // the resulting PDF contains the font data and satisfies PDF/UA.
  Object.entries(fontBuffers).forEach(([name, buffer]) => {
    doc.registerFont(name, buffer);
  });

  // Set the initial font so any text drawn before the first explicit
  // setTextStyle call (e.g. from the outline labels) uses the embedded
  // font, not the PDFKit default (Helvetica, non-embedded).
  doc.font(FONT_NAMES.regular);

  const { outline } = doc;
  const rootBookmark = outline.addItem(title, { expanded: true });

  const documentRoot = doc.struct("Document", {
    title: `${title} - Barrierefreie Fassung`,
    lang: "de-DE",
  });
  doc.addStructure(documentRoot);

  const headerSection = doc.struct("Sect", { title: "Dokumentkopf" });
  const tocSection = doc.struct("TOC", { title: "Inhaltsverzeichnis" });
  const orgSection = doc.struct("Sect", { title: "Organisationseinheiten" });

  documentRoot.add(headerSection);
  documentRoot.add(tocSection);
  documentRoot.add(orgSection);

  // -- Header --------------------------------------------------------------

  doc.addNamedDestination("top");

  writeHeading(doc, headerSection, `Organigramm von: ${title}`, {
    level: 1,
    destination: "top",
    after: 6,
  });

  writeStructuredParagraph(
    doc,
    headerSection,
    "Dieses Organigramm ist hierarchisch aufgebaut. Die hierarchische Struktur finden Sie im Inhaltsverzeichnis.",
    { fontSize: 11, after: 6 },
  );

  if (version) {
    const formattedVersion = formatGermanDate(version);

    writeStructuredParagraph(
      doc,
      headerSection,
      `Stand des Organigramms: ${formattedVersion || version}`,
      { fontSize: 11, after: 4 },
    );
  }

  writeStructuredParagraph(
    doc,
    headerSection,
    `Es enthält ${unitsSortedByDepth.length} Organisationseinheiten in ${levelCount} Ebenen und nennt ${personIdentitySet.size} Personen.`,
    { fontSize: 11, after: 4 },
  );

  writeStructuredParagraph(
    doc,
    headerSection,
    `Kontaktangaben sind teilweise vorhanden (Organisationen: ${organisationsWithContactCount}, Personen: ${positionWithContactCount}).`,
    { fontSize: 11, after: 4 },
  );

  if (isVocabularyAvailable) {
    writeStructuredParagraph(
      doc,
      headerSection,
      "Begriffserklärungen finden Sie teilweise im Glossar.",
      { fontSize: 11, after: 4 },
    );
  }

  headerSection.end();

  // -- Table of contents ---------------------------------------------------

  doc.addNamedDestination("toc");
  rootBookmark.addItem("Inhaltsverzeichnis");

  writeHeading(doc, tocSection, "Inhaltsverzeichnis", {
    level: 2,
    destination: "toc",
    before: 8,
    after: 4,
  });

  const writeTocEntries = (orgUnits, structParent, depth = 0) => {
    const visibleOrgUnits = getVisibleChildUnits(orgUnits);

    if (visibleOrgUnits.length === 0) return;

    visibleOrgUnits.forEach((unit) => {
      const sectionId = unitLinkFor(unit);
      const unitName =
        safe(unit?.name) || "Unbenannte Organisationseinheit";

      const tocItem = doc.struct("TOCI");
      structParent.add(tocItem);

      writeStructuredParagraph(doc, tocItem, unitName, {
        indent: 8 + depth * 12,
        fontSize: 11,
        structType: "Link",
        goTo: sectionId,
      });

      writeTocEntries(unit?.organisations || [], tocItem, depth + 1);

      tocItem.end();
    });
  };

  writeTocEntries(normalizedRootOrganisations, tocSection);

  tocSection.end();

  // -- Organisation sections ----------------------------------------------

  doc.addPage();
  doc.x = PAGE_MARGIN_X;
  doc.y = PAGE_MARGIN_TOP;

  doc.addNamedDestination("org-structure");

  writeHeading(doc, orgSection, "Organisationseinheiten", {
    level: 2,
    destination: "org-structure",
    after: 6,
  });

  const structureBookmark = rootBookmark.addItem("Organisationseinheiten", {
    expanded: true,
  });

  if (unitsSortedByDepth.length === 0) {
    writeStructuredParagraph(
      doc,
      orgSection,
      "Es wurden keine Organisationseinheiten gefunden.",
      { fontSize: 11 },
    );
  }

  unitsSortedByDepth.forEach(({ unit, parentName, parentId, depth }, index) => {
    const sectionId = unitLinkFor(unit);
    const unitName = safe(unit?.name) || "Unbenannte Organisationseinheit";
    const unitPurpose = safe(unit?.purpose);

    const section = doc.struct("Sect", { title: unitName });
    orgSection.add(section);

    doc.addNamedDestination(sectionId);
    structureBookmark.addItem(unitName);

    if (index > 0) {
      doc.y += 6;
    }

    drawDepthRule(doc, depth);

    writeHeading(doc, section, unitName, {
      level: headingLevelFromDepth(depth),
      destination: sectionId,
      after: 3,
    });

    if (unitPurpose) {
      writeStructuredParagraph(doc, section, unitPurpose, {
        fontSize: 11,
        after: 3,
      });
    }

    // Direct children description (mirrors HTML's <p>).
    const childDescription = describeChildUnits(unit, {
      sectionIdByUnitId,
      sectionIdByUnitName,
    });

    if (childDescription.count > 0) {
      const runs = [
        {
          text: `Diese Organisationseinheit hat ${childDescription.count} direkt untergeordnete Organisationseinheiten. Die direkt untergeordneten Einheiten sind: `,
        },
      ];

      childDescription.children.forEach((child, childIndex) => {
        runs.push({
          text: child.name,
          goTo: child.sectionId || null,
        });

        if (childIndex < childDescription.children.length - 1) {
          runs.push({ text: ", " });
        }
      });

      writeInlineRuns(doc, section, runs, {
        fontSize: 11,
        after: 3,
      });
    }

    // Meta block (parent unit, type, positions, contact). Mirrors HTML's
    // <ul> with <strong> labels.
    const metaList = doc.struct("L");
    section.add(metaList);

    const ensureMetaListItem = (runs) => {
      writeBulletItem(doc, metaList, runs, { indent: 8, fontSize: 11 });
    };

    if (depth > 0) {
      const resolvedParentLink =
        sectionIdByUnitId.get(parentId) ||
        sectionIdByUnitName.get(parentName) ||
        "";

      const parentRuns = [
        { text: "Übergeordnete Einheit: ", bold: true },
        resolvedParentLink && parentName
          ? { text: parentName, goTo: resolvedParentLink }
          : { text: parentName || "keine" },
      ];

      ensureMetaListItem(parentRuns);
    }

    const { raw: unitTypeRaw, vocabTerm: unitTypeVocab } =
      resolveUnitTypeDisplay(unit);

    if (unitTypeRaw) {
      const goTo = registerGlossaryTerm(unitTypeVocab);

      ensureMetaListItem([
        { text: "Art: ", bold: true },
        { text: unitTypeRaw, goTo: goTo || null },
      ]);
    }

    const positions = unit?.positions || [];

    if (positions.length > 0) {
      const headerItem = writeBulletItem(
        doc,
        metaList,
        [{ text: "Personen und Aufgaben:", bold: true }],
        { indent: 8, fontSize: 11 },
      );

      if (headerItem) {
        const nestedList = doc.struct("L");
        headerItem.body.add(nestedList);

        positions.forEach((position) => {
          const runs = buildPositionRuns(position, {
            isVocabularyAvailable,
            vocabularyData,
            registerGlossaryTerm,
          });

          const positionItem = writeBulletItem(doc, nestedList, runs, {
            indent: 24,
            fontSize: 11,
          });

          positionItem?.close();
        });

        nestedList.end();
        headerItem.close();
      }
    }

    const orgContactEntries = buildContactEntries(unit?.contact);

    if (orgContactEntries.length > 0) {
      const runs = [{ text: "Kontakt: ", bold: true }];

      orgContactEntries.forEach((entry, entryIndex) => {
        // Print the actual value (phone, email, URL) as the link text -
        // see the matching note in buildPositionRuns.
        runs.push({ text: `${labelForContactKind(entry.kind)}: ` });
        runs.push({
          text: entry.value,
          link: entry.href,
        });

        if (entryIndex < orgContactEntries.length - 1) {
          runs.push({ text: ", " });
        }
      });

      ensureMetaListItem(runs);
    }

    metaList.end();

    // Departments (Zugehörige Einheiten).
    const departments = unit?.departments || [];

    if (departments.length > 0) {
      writeHeading(doc, section, "Zugehörige Einheiten", {
        level: Math.min(headingLevelFromDepth(depth) + 1, 6),
        before: 4,
        after: 3,
      });

      const deptList = doc.struct("L");
      section.add(deptList);

      departments.forEach((department) => {
        const deptName =
          safe(department?.name) || "Unbenannte Einheit";

        const deptItem = writeBulletItem(
          doc,
          deptList,
          [{ text: deptName, bold: true }],
          { indent: 8, fontSize: 11 },
        );

        if (!deptItem) return;

        const deptPositions = department?.positions || [];

        if (deptPositions.length > 0) {
          const nestedList = doc.struct("L");
          deptItem.body.add(nestedList);

          deptPositions.forEach((position) => {
            const runs = buildPositionRuns(position, {
              isVocabularyAvailable,
              vocabularyData,
              registerGlossaryTerm,
            });

            const positionItem = writeBulletItem(doc, nestedList, runs, {
              indent: 24,
              fontSize: 11,
            });

            positionItem?.close();
          });

          nestedList.end();
        }

        deptItem.close();
      });

      deptList.end();
    }

    section.end();
  });

  orgSection.end();

  // -- Glossary -----------------------------------------------------------

  if (isVocabularyAvailable && glossaryTerms.size > 0) {
    const glossarySection = doc.struct("Sect", { title: "Glossar" });
    documentRoot.add(glossarySection);

    rootBookmark.addItem("Glossar");

    doc.addPage();
    doc.x = PAGE_MARGIN_X;
    doc.y = PAGE_MARGIN_TOP;

    doc.addNamedDestination("glossary");

    writeHeading(doc, glossarySection, "Glossar", {
      level: 2,
      destination: "glossary",
      after: 4,
    });

    const glossaryList = doc.struct("L");
    glossarySection.add(glossaryList);

    [...glossaryTerms.entries()]
      .sort(([, a], [, b]) => a.label.localeCompare(b.label, "de"))
      .forEach(([vocabTerm, { label, comment }]) => {
        const glossaryDestination = glossaryLinkFor(vocabTerm);
        doc.addNamedDestination(glossaryDestination);

        const item = doc.struct("LI");
        const labelStruct = doc.struct("Lbl");
        const body = doc.struct("LBody");

        item.add(labelStruct);
        item.add(body);
        glossaryList.add(item);

        writeStructuredParagraph(doc, labelStruct, label, {
          indent: 8,
          fontSize: 11,
          bold: true,
          structType: "Lbl",
          destination: glossaryDestination,
          after: 1,
        });

        writeStructuredParagraph(doc, body, comment, {
          indent: 24,
          fontSize: 10.5,
          structType: "P",
          after: 3,
        });

        item.end();
      });

    glossaryList.end();
    glossarySection.end();
  }

  documentRoot.end();

  const blob = await createPdfBlob(doc);
  const fileName = `${exportFilename || title}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
