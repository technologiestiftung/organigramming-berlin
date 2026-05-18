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

const PDFDocument = window.PDFDocument;
const blobStream = window.blobStream;

// -----------------------------------------------------------------------
// PDFKit patches to make goTo (internal cross-references) PDF/UA-compliant
// -----------------------------------------------------------------------
//
// PDFKit (as of 0.13.0) wires URI link annotations into the structure tree
// via an OBJR entry, but ONLY when the annotation is created via `link()`
// AND `options.structParent` is set. For internal cross-references created
// with `goTo()` this wiring is missing entirely - `_fragment` calls
// `this.goTo(x, y, w, h, name)` without an options object, so no
// structParent is passed and `goTo()` itself never wires up the OBJR even
// if one were supplied.
//
// PDF/UA-1 (ISO 14289-1:2014, clauses 7.18.1 and 7.18.5) requires that
// EVERY link annotation - including internal-destination links - is
// referenced from the structure tree via an OBJR entry. Without these
// patches veraPDF reports hundreds of failed checks for our TOC entries,
// glossary references and parent-unit pointers.
//
// We patch PDFKit's prototype exactly once per page load so the patches
// also benefit other modules that might use the library later.
const patchPdfkitForAccessibility = (PdfDoc) => {
  if (!PdfDoc || PdfDoc.__a11yPatched) return;

  PdfDoc.__a11yPatched = true;

  // 1) Make goTo() honour an `options.structParent` argument the same way
  //    link() does. We also set a meaningful `Contents` value so the
  //    annotation passes PDF/UA's clause 7.18.5-2 ("Contents != ''"),
  //    which PDFKit's built-in handling does not satisfy.
  const originalGoTo = PdfDoc.prototype.goTo;
  PdfDoc.prototype.goTo = function goTo(x, y, w, h, name, options = {}) {
    options.Subtype = "Link";
    options.A = this.ref({
      S: "GoTo",
      D: new String(name),
    });
    options.A.end();

    if (options.structParent && !options.Contents) {
      options.Contents = new String(`Verweis zu ${name}`);
    }

    return this.annotate(x, y, w, h, options);
  };
  // Keep a reference for diagnostics / restore.
  PdfDoc.prototype.goTo.__original = originalGoTo;

  // 2) Patch link() to provide non-empty Contents when none is given.
  //    PDFKit's stock behaviour sets `Contents = new String('')` whenever
  //    a structParent is supplied, which PDF/UA's rule 7.18.5-2 rejects
  //    because the Contents string is empty.
  const originalLink = PdfDoc.prototype.link;
  PdfDoc.prototype.link = function link(x, y, w, h, url, options = {}) {
    if (options.structParent && !options.Contents) {
      // PDFKit would otherwise default Contents to an empty string here.
      // Providing a description that includes the URL gives screen
      // readers something to announce and makes the annotation valid for
      // PDF/UA.
      options.Contents = new String(`Verweis: ${url}`);
    }

    return originalLink.call(this, x, y, w, h, url, options);
  };

  // 2) Patch _fragment() to forward `_currentStructureElement` to goTo,
  //    mirroring what PDFKit already does for `link`.
  const originalFragment = PdfDoc.prototype._fragment;
  PdfDoc.prototype._fragment = function _fragment(text, x, y, options) {
    if (options && options.goTo != null) {
      const goToOptions = {};
      if (
        this._currentStructureElement &&
        this._currentStructureElement.dictionary.data.S === "Link"
      ) {
        goToOptions.structParent = this._currentStructureElement;
      }

      // We want our patched goTo to receive the structParent option, but
      // PDFKit's original _fragment calls `this.goTo(...)` without it.
      // The cleanest interception is to shadow `goTo` on the instance
      // for the duration of the original _fragment call, then remove
      // the shadow so subsequent calls go through the prototype again.
      const realGoTo = this.goTo;
      this.goTo = (gx, gy, gw, gh, gname) =>
        realGoTo.call(this, gx, gy, gw, gh, gname, goToOptions);

      try {
        return originalFragment.call(this, text, x, y, options);
      } finally {
        // Removing the instance shadow lets prototype lookups resume.
        delete this.goTo;
      }
    }

    return originalFragment.call(this, text, x, y, options);
  };
};

patchPdfkitForAccessibility(PDFDocument);

const PAGE_MARGIN_X = 48;
const PAGE_MARGIN_TOP = 56;
const PAGE_MARGIN_BOTTOM = 48;
const LINE_GAP = 6;

// Body font size in points. The Berliner Standards for PDF require a
// minimum of 12 pt for the body text (Verdana would be 11 pt, but we use
// a sans-serif similar to Arial).
const BODY_FONT_SIZE = 12;

// Hyperlink colour. Berliner Standards require links to be visually
// distinct from body text by colour AND a second cue (we additionally
// underline). Dark blue is the worldwide-established convention.
const LINK_COLOR = "#0B57D0";
const TEXT_COLOR = "#000000";

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
  1: 22,
  2: 18,
  3: 15,
  4: 13.5,
  5: 12.5,
  6: 12,
};

// Same palette as HTML's SECTION_DEPTH_COLORS (used for the depth-coloured
// border accent above each unit section).
const SECTION_DEPTH_COLORS = ["#002856", "#004F9F", "#4F90CD", "#AAC9E7"];

const headingFontSize = (level) => HEADING_FONT_SIZES[level] || BODY_FONT_SIZE;

// All organisation units share the same heading level (H3) regardless of
// their position in the tree. PDF/UA requires headings to follow a strict
// "no skipping levels" rule. Mapping every org depth to H3 keeps the
// heading hierarchy clean and meets the Berliner Standard for PDF, which
// explicitly forbids skipping heading levels. The hierarchy itself is
// still conveyed via the "Übergeordnete Einheit:" bullet and the
// "Direkt untergeordnete Einheiten"-Paragraph in each section.
const headingLevelFromDepth = () => 3;

// Sub-section headings inside an organisation (e.g. "Zugehörige Einheiten")
// are one level deeper than the org heading and therefore H4.
const SUB_SECTION_HEADING_LEVEL = 4;

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

const setTextStyle = (
  doc,
  { fontSize = BODY_FONT_SIZE, bold = false, color = TEXT_COLOR } = {},
) => {
  doc.font(bold ? FONT_NAMES.bold : FONT_NAMES.regular);
  doc.fontSize(fontSize);
  doc.fillColor(color);
};

/**
 * Marks the wrapped graphics / text operations as an Artifact so screen
 * readers ignore them. Used for decorative content (bullet glyphs,
 * separator rules) that must not pollute the structure tree.
 */
const withArtifact = (doc, type, draw) => {
  doc.markContent("Artifact", { type });
  try {
    draw();
  } finally {
    doc.endMarkedContent();
  }
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
 *
 * If the paragraph is a hyperlink (link/goTo set), the text rendering is
 * wrapped in a `Link` structure element and emitted inside
 * `linkStruct.add(closure)`. That is required for PDF/UA: PDFKit only
 * connects the link annotation to its surrounding `Link` struct (via an
 * `OBJR` entry) when the closure form is used, because only then is the
 * internal `_currentStructureElement` flag set to the Link element.
 */
const writeStructuredParagraph = (
  doc,
  parent,
  text,
  {
    indent = 0,
    fontSize = BODY_FONT_SIZE,
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

  const hasLink = Boolean(goTo || link);

  setTextStyle(doc, {
    fontSize,
    bold,
    color: hasLink ? LINK_COLOR : TEXT_COLOR,
  });

  const baseOptions = {
    width: pageContentWidth(doc, indent),
    align: "left",
    lineGap: LINE_GAP,
  };

  const height = doc.heightOfString(normalized, baseOptions);
  ensureSpace(doc, height);

  if (hasLink) {
    // Hyperlinks need the closure-form so PDFKit can attach the link
    // annotation's OBJR entry to the Link struct in the structure tree.
    const linkStruct = doc.struct(structType === "Link" ? "Link" : "Link");
    parent.add(linkStruct);

    linkStruct.add(() => {
      setTextStyle(doc, { fontSize, bold, color: LINK_COLOR });

      doc.text(normalized, PAGE_MARGIN_X + indent, doc.y, {
        ...baseOptions,
        underline: true,
        destination: destination || undefined,
        goTo: goTo || undefined,
        link: link || undefined,
      });
    });

    linkStruct.end();
  } else {
    const options = {
      ...baseOptions,
      structParent: parent,
      structType,
    };

    if (destination) options.destination = destination;

    doc.text(normalized, PAGE_MARGIN_X + indent, doc.y, options);
  }

  if (after > 0) {
    doc.y += after;
  }

  // Reset to body colour so subsequent unrelated text never inherits the
  // link colour.
  doc.fillColor(TEXT_COLOR);

  return parent;
};

const writeHeading = (
  doc,
  parent,
  text,
  { level = 2, indent = 0, before = 0, after = 4, destination = null } = {},
) => {
  // Avoid orphaned headings at the bottom of a page: reserve roughly two
  // body lines below the heading so it is forced to the next page if no
  // content would fit underneath it.
  const headingHeight =
    headingFontSize(level) * 1.4 + (BODY_FONT_SIZE + LINE_GAP) * 2;

  ensureSpace(doc, headingHeight);

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
 * hierarchy (mirrors the HTML's coloured border-top). The rule is purely
 * decorative, so it is emitted inside an Artifact marked-content block
 * and therefore ignored by screen readers.
 */
const drawDepthRule = (doc, depth) => {
  ensureSpace(doc, 6);

  const x = PAGE_MARGIN_X;
  const y = doc.y;
  const width = pageContentWidth(doc, 0);

  withArtifact(doc, "Layout", () => {
    doc
      .save()
      .lineWidth(2)
      .strokeColor(getDepthBorderColor(depth))
      .moveTo(x, y)
      .lineTo(x + width, y)
      .stroke()
      .restore();
  });

  // Vertical gap between the rule and the heading underneath. The extra
  // breathing room makes section starts easier to scan visually.
  doc.y = y + 9;
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

    setTextStyle(doc, {
      fontSize,
      bold: Boolean(run.bold),
      color: hasLink ? LINK_COLOR : TEXT_COLOR,
    });

    const segments = splitRun(run.text);

    // A buffer of segments that have been confirmed to fit on the current
    // line. We flush them as a single doc.text() call so PDFKit creates
    // one annotation per line for this run.
    let buffer = "";
    let bufferStartX = cursorX;

    // Pending text calls that need to run inside the structure-element
    // closure. We collect them here, then hand the whole list to
    // `runStruct.add(closure)` at the end. Running them inside the
    // closure is essential for PDF/UA: PDFKit only wires the link
    // annotation into the structure tree (OBJR entry) when
    // `_currentStructureElement` matches the surrounding Link struct -
    // and that flag is only set inside `add(closure)`.
    const pendingTextCalls = [];

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

      pendingTextCalls.push({
        text: buffer,
        x: bufferStartX,
        y: cursorY,
        textWidth: measuredWidth,
        wordCount,
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

    // Render the queued text inside `runStruct.add(closure)`. This sets
    // PDFKit's `_currentStructureElement` to `runStruct` for the
    // duration of the closure, which in turn lets PDFKit attach any
    // link/goTo annotation to that Link struct via an OBJR entry -
    // satisfying PDF/UA 7.18.5.
    runStruct.add(() => {
      setTextStyle(doc, {
        fontSize,
        bold: Boolean(run.bold),
        color: hasLink ? LINK_COLOR : TEXT_COLOR,
      });

      pendingTextCalls.forEach((call) => {
        doc.text(call.text, call.x, call.y, {
          lineBreak: false,
          textWidth: call.textWidth,
          wordCount: call.wordCount,
          underline: hasLink,
          goTo: run.goTo || null,
          link: run.link || null,
        });
      });
    });

    runStruct.end();
  });

  // Reset to body colour and advance the document cursor to the line
  // after the last laid-out one.
  doc.fillColor(TEXT_COLOR);
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
  { indent = 0, fontSize = BODY_FONT_SIZE, before = 0, after = 0 } = {},
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
  { indent = 0, fontSize = BODY_FONT_SIZE, after = 0 } = {},
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

  // Try to keep the bullet and at least one body line on the same page.
  // We approximate the LI height as 2 lines so a long item that would
  // start at the bottom of the page is moved to the next page entirely.
  const lineHeight = doc.currentLineHeight(true) + LINE_GAP;
  ensureSpace(doc, lineHeight * 2);

  const alignedY = doc.y;

  // The bullet glyph is a small filled circle drawn as a vector. We
  // render it inside the `Lbl` structure element (via the closure form
  // of `label.add`) so the Lbl carries real content - an empty Lbl is
  // flagged by some PDF/UA validators as a warning. The circle inside
  // the Lbl marked content is, semantically, a graphical list label.
  const ascender = doc._font ? doc._font.ascender / 1000 * fontSize : fontSize * 0.7;
  const bulletRadius = Math.max(ascender / 6, 1.2);
  const bulletCenterX = bulletX + bulletRadius * 2;
  const bulletCenterY = alignedY + ascender / 2;

  label.add(() => {
    doc
      .save()
      .fillColor(TEXT_COLOR)
      .circle(bulletCenterX, bulletCenterY, bulletRadius)
      .fill()
      .restore();
  });

  doc.y = alignedY;
  doc.fillColor(TEXT_COLOR);

  const paragraph = doc.struct("P");
  body.add(paragraph);

  layoutInlineRuns(doc, paragraph, filtered, {
    startX: textStartX,
    maxX: textMaxX,
    fontSize,
  });

  paragraph.end();
  label.end();

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
  const documentNote = safe(data?.document?.note);

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
    // Subset PDF/UA tells PDFKit to emit the pdfuaid:part 1 XMP metadata
    // entry that PDF/UA-validators look for. Without this, no validator
    // will recognise the file as PDF/UA even if everything else is right.
    subset: "PDF/UA",
    lang: "de-DE",
    displayTitle: true,
    autoFirstPage: true,
    bufferPages: true,
    info: {
      Title: `${title} - Barrierefreie Fassung`,
      Subject: "Barrierefreies Organigramm",
      Author: safe(data?.document?.creator) || "Organigramm Tool Berlin",
      Creator: "organigramming-berlin",
      // "Stand des Organigramms" - the editorial date of the source data,
      // not the moment the PDF was generated. We map it onto CreationDate
      // so PDF readers display it under "Erstellt am" in the document
      // properties. If the source has no version date we fall back to
      // now() so the field is never empty.
      CreationDate: version ? new Date(version) : new Date(),
      Keywords: "Organigramm, Barrierefreiheit, PDF",
    },
  });

  doc.x = PAGE_MARGIN_X;
  doc.y = PAGE_MARGIN_TOP;

  // Tabs = "S" tells assistive technology to follow the structure tree
  // when tabbing through interactive content. PDF/UA requires this on
  // every page. PDFKit creates the first page automatically, so we set
  // it here and also from a "pageAdded" listener for subsequent pages.
  const enforcePageDefaults = () => {
    if (doc.page) {
      doc.page.dictionary.data.Tabs = "S";
    }
  };

  enforcePageDefaults();
  doc.on("pageAdded", enforcePageDefaults);

  // PageMode = UseOutlines opens the document with the bookmarks panel
  // visible. PDFKit sets this automatically when an outline item exists,
  // but we set it explicitly so the behaviour is independent of any
  // future refactoring.
  doc._root.data.PageMode = "UseOutlines";

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
  doc.fillColor(TEXT_COLOR);

  // ---------------------------------------------------------------------
  // PDF/UA CIDSet patch
  // ---------------------------------------------------------------------
  //
  // PDFKit 0.13.0 writes a hard-coded `CIDSet` stream (the byte sequence
  // 0xFFFFFFFFC0) into every embedded subset font descriptor whenever
  // `doc.subset === 1` (the value set by `subset: "PDF/UA"`). That CIDSet
  // is just a placeholder and does NOT match the glyphs that are
  // actually present in the Liberation Sans subset, which causes
  // veraPDF rule 7.21.4.2-2 ("cidSetListsAllGlyphs == true") to fail.
  //
  // PDF/UA-1 explicitly allows the CIDSet stream to be absent. So we
  // patch the EmbeddedFont prototype's `finalize()` to set
  // `doc.subset = 0` for the duration of the font's `embed()` call -
  // which makes PDFKit skip the CIDSet block entirely. We immediately
  // restore the original value so `endSubset()` still writes the proper
  // `<pdfuaid:part>1</pdfuaid:part>` XMP entry that marks the file as
  // PDF/UA-1.
  //
  // The EmbeddedFont class is not exported by PDFKit, so we reach its
  // prototype via the freshly instantiated `doc._font` and patch the
  // prototype once per page load (marker `__a11yCidsetPatched` prevents
  // re-application across multiple PDF generations).
  if (doc._font) {
    const fontProto = Object.getPrototypeOf(doc._font);

    if (
      fontProto &&
      typeof fontProto.finalize === "function" &&
      !fontProto.__a11yCidsetPatched
    ) {
      const originalFinalize = fontProto.finalize;

      fontProto.finalize = function patchedFinalize() {
        const docRef = this.document;
        const savedSubset = docRef ? docRef.subset : undefined;

        if (docRef) {
          docRef.subset = 0;
        }

        try {
          return originalFinalize.call(this);
        } finally {
          if (docRef) {
            docRef.subset = savedSubset;
          }
        }
      };

      fontProto.__a11yCidsetPatched = true;
    }
  }

  const { outline } = doc;
  const rootBookmark = outline.addItem(title, { expanded: true });

  const documentRoot = doc.struct("Document", {
    title: `${title} - Barrierefreie Fassung`,
    lang: "de-DE",
  });
  doc.addStructure(documentRoot);

  const headerSection = doc.struct("Sect", { title: "Dokumentkopf" });
  // tocSection wraps the heading and the actual TOC element. PDF/UA-1
  // clause 7.2-27 ("TOC element may contain only TOC, TOCI and Caption
  // elements") forbids putting an H2 directly inside a TOC, so we use a
  // generic Sect as outer container and create a dedicated TOC element
  // for the entries only.
  const tocSection = doc.struct("Sect", { title: "Inhaltsverzeichnis" });
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
    { fontSize: BODY_FONT_SIZE, after: 6 },
  );

  if (version) {
    const formattedVersion = formatGermanDate(version);

    writeStructuredParagraph(
      doc,
      headerSection,
      `Stand des Organigramms: ${formattedVersion || version}`,
      { fontSize: BODY_FONT_SIZE, after: 4 },
    );
  }

  writeStructuredParagraph(
    doc,
    headerSection,
    `Es enthält ${unitsSortedByDepth.length} Organisationseinheiten in ${levelCount} Ebenen und nennt ${personIdentitySet.size} Personen.`,
    { fontSize: BODY_FONT_SIZE, after: 4 },
  );

  writeStructuredParagraph(
    doc,
    headerSection,
    `Kontaktangaben sind teilweise vorhanden bei ${organisationsWithContactCount} Organisationen und ${positionWithContactCount} Positionen.`,
    { fontSize: BODY_FONT_SIZE, after: 4 },
  );

  if (isVocabularyAvailable) {
    writeStructuredParagraph(
      doc,
      headerSection,
      "Begriffserklärungen finden Sie teilweise im Glossar.",
      { fontSize: BODY_FONT_SIZE, after: 4 },
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

  // The actual TOC structure element holds only TOCI children. PDF/UA-1
  // clause 7.2-27 forbids any other element type as a direct child of
  // TOC (no H2, no P, only TOC/TOCI/Caption). We therefore keep the
  // "Inhaltsverzeichnis"-heading outside in the enclosing Sect and put
  // the entries into this dedicated TOC node.
  const tocList = doc.struct("TOC");
  tocSection.add(tocList);

  // Recursive renderer for the table-of-contents entries.
  //
  // PDF/UA-1 (ISO 14289-1:2014, clause 7.2) requires that:
  //   - "TOC element may contain only TOC, TOCI and Caption elements"
  //   - "TOCI element should be contained in TOC element"
  //
  // That means a TOCI may never directly contain another TOCI. To express
  // hierarchy we wrap nested entries in their own TOC sub-element under
  // their parent TOCI:
  //
  //   TOC
  //     TOCI (root)
  //       TOC                    <- intermediate wrapper required by PDF/UA
  //         TOCI (child)
  //         TOCI (child)
  //           TOC
  //             TOCI (grand-child)
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
        fontSize: BODY_FONT_SIZE,
        structType: "Link",
        goTo: sectionId,
      });

      const childUnits = unit?.organisations || [];

      if (getVisibleChildUnits(childUnits).length > 0) {
        const nestedToc = doc.struct("TOC");
        tocItem.add(nestedToc);
        writeTocEntries(childUnits, nestedToc, depth + 1);
        nestedToc.end();
      }

      tocItem.end();
    });
  };

  writeTocEntries(normalizedRootOrganisations, tocList);

  tocList.end();
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
      { fontSize: BODY_FONT_SIZE },
    );
  }

  unitsSortedByDepth.forEach(({ unit, parentName, parentId, depth }, index) => {
    const sectionId = unitLinkFor(unit);
    const unitName = safe(unit?.name) || "Unbenannte Organisationseinheit";
    const unitAltName = safe(unit?.altName);
    const unitPurpose = safe(unit?.purpose);
    const unitAddress = formatAddress(unit?.address);

    // Heading combines the name and (when present) the short form so
    // both forms are visible at a glance.
    const unitHeadingText = unitAltName
      ? `${unitName} (${unitAltName})`
      : unitName;

    const section = doc.struct("Sect", { title: unitHeadingText });
    orgSection.add(section);

    doc.addNamedDestination(sectionId);
    structureBookmark.addItem(unitHeadingText);

    if (index > 0) {
      doc.y += 6;
    }

    drawDepthRule(doc, depth);

    writeHeading(doc, section, unitHeadingText, {
      level: headingLevelFromDepth(depth),
      destination: sectionId,
      after: 3,
    });

    if (unitPurpose) {
      writeStructuredParagraph(doc, section, unitPurpose, {
        fontSize: BODY_FONT_SIZE,
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
        fontSize: BODY_FONT_SIZE,
        after: 3,
      });
    }

    // Meta block (parent unit, type, positions, contact). Mirrors HTML's
    // <ul> with <strong> labels.
    const metaList = doc.struct("L");
    section.add(metaList);

    const ensureMetaListItem = (runs) => {
      writeBulletItem(doc, metaList, runs, { indent: 8, fontSize: BODY_FONT_SIZE });
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

    if (unitAddress) {
      ensureMetaListItem([
        { text: "Adresse: ", bold: true },
        { text: unitAddress },
      ]);
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

    // Positions are emitted as their own top-level list, separate from
    // the metadata list above. This keeps the structure tree clean: the
    // "Personen und Aufgaben:" heading is a regular paragraph and the
    // positions form a peer `L` element rather than being nested inside
    // an `LBody`, which avoids PDF/UA validator warnings about mixed
    // block content in list bodies.
    const positions = unit?.positions || [];

    if (positions.length > 0) {
      writeInlineRuns(
        doc,
        section,
        [{ text: "Personen und Aufgaben:", bold: true }],
        { indent: 8, fontSize: BODY_FONT_SIZE, before: 2, after: 2 },
      );

      const positionList = doc.struct("L");
      section.add(positionList);

      positions.forEach((position) => {
        const runs = buildPositionRuns(position, {
          isVocabularyAvailable,
          vocabularyData,
          registerGlossaryTerm,
        });

        const positionItem = writeBulletItem(doc, positionList, runs, {
          indent: 16,
          fontSize: BODY_FONT_SIZE,
        });

        positionItem?.close();
      });

      positionList.end();
    }

    // Departments (Zugehörige Einheiten).
    const departments = unit?.departments || [];

    if (departments.length > 0) {
      writeHeading(doc, section, "Zugehörige Einheiten", {
        level: SUB_SECTION_HEADING_LEVEL,
        before: 4,
        after: 3,
      });

      const deptList = doc.struct("L");
      section.add(deptList);

      departments.forEach((department) => {
        const deptName =
          safe(department?.name) || "Unbenannte Einheit";
        const { raw: deptType, vocabTerm: deptVocabTerm } =
          resolveUnitTypeDisplay(department);
        const deptPurpose = safe(department?.purpose);

        // The bullet body is a single inline paragraph that contains
        // - the (bold) name
        // - the optional type, linked to the glossary when available
        // - the optional purpose ("Beschreibung") set in regular weight
        const headRuns = [{ text: deptName, bold: true }];

        if (deptType) {
          const goTo = registerGlossaryTerm(deptVocabTerm);

          headRuns.push({ text: " — " });
          headRuns.push({ text: deptType, goTo: goTo || null });
        }

        if (deptPurpose) {
          headRuns.push({ text: deptType ? ", " : " — " });
          headRuns.push({ text: deptPurpose });
        }

        const deptItem = writeBulletItem(doc, deptList, headRuns, {
          indent: 8,
          fontSize: BODY_FONT_SIZE,
        });

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
              fontSize: BODY_FONT_SIZE,
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
  //
  // Each glossary term is rendered as its own H3 heading followed by a P
  // paragraph with the description. This pattern keeps the structure
  // tree clean for Acrobat's accessibility checker (which previously
  // flagged the Lbl/LBody structure of the list-based variant) and lets
  // screen-reader users navigate the glossary like any other set of
  // headed sections. Inline links from elsewhere in the document
  // (`goTo: glossaryLinkFor(term)`) still resolve correctly because
  // each H3 carries the named destination as its anchor.
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

    [...glossaryTerms.entries()]
      .sort(([, a], [, b]) => a.label.localeCompare(b.label, "de"))
      .forEach(([vocabTerm, { label, comment }]) => {
        const glossaryDestination = glossaryLinkFor(vocabTerm);
        doc.addNamedDestination(glossaryDestination);

        writeHeading(doc, glossarySection, label, {
          level: 3,
          destination: glossaryDestination,
          before: 4,
          after: 2,
        });

        writeStructuredParagraph(doc, glossarySection, comment, {
          fontSize: BODY_FONT_SIZE,
          after: 3,
        });
      });

    glossarySection.end();
  }

  // -- Fußzeile (document.note) ------------------------------------------
  //
  // The schema labels `document.note` as "Fußzeile". The Berliner Standards
  // for PDF explicitly disallow important content in page headers or
  // footers, because assistive technology may not reach them. We therefore
  // render the note as a regular tagged section on its OWN page at the
  // end of the document. It is reachable via the structure tree and the
  // bookmark outline, satisfies the standard, and still conveys the
  // editorial intent of a closing note.
  if (documentNote) {
    const noteSection = doc.struct("Sect", { title: "Fußzeile" });
    documentRoot.add(noteSection);

    rootBookmark.addItem("Fußzeile");

    doc.addPage();
    doc.x = PAGE_MARGIN_X;
    doc.y = PAGE_MARGIN_TOP;

    doc.addNamedDestination("note");

    writeHeading(doc, noteSection, "Fußzeile", {
      level: 2,
      destination: "note",
      after: 4,
    });

    writeStructuredParagraph(doc, noteSection, documentNote, {
      fontSize: BODY_FONT_SIZE,
      after: 4,
    });

    noteSection.end();
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
