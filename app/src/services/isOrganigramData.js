// Lightweight shape check that runs BEFORE upgradeDataStructure.
// The goal is to reject foreign JSON (e.g. an accidentally uploaded
// package.json, OpenAPI spec, arbitrary object) without being so strict
// that legacy organigram files fail it — those still need to flow into
// upgradeDataStructure for migration.
//
// Returns: { valid: boolean, errors: string[] }

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export const isOrganigramData = (data) => {
  const errors = [];

  if (!isPlainObject(data)) {
    errors.push(
      "Datei ist kein gültiges Organigramm-Dokument."
    );
    return { valid: false, errors };
  }

  // Must have a document object containing a non-empty title string.
  if (!isPlainObject(data.document)) {
    errors.push(
      "Datei ist kein gültiges Organigramm-Dokument: Feld 'document' fehlt oder ist kein Objekt."
    );
  } else if (
    typeof data.document.title !== "string" ||
    data.document.title.trim() === ""
  ) {
    errors.push(
      "Datei ist kein gültiges Organigramm-Dokument: 'document.title' fehlt oder ist leer."
    );
  }

  // If organisations is present, it must be an array.
  if (data.organisations !== undefined && !Array.isArray(data.organisations)) {
    errors.push(
      "Datei ist kein gültiges Organigramm-Dokument: Feld 'organisations' muss ein Array sein."
    );
  }

  return { valid: errors.length === 0, errors };
};

export default isOrganigramData;
