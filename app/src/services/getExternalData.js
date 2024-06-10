import { validateData } from "./service";

export const getExternalData = async (url) => {
  const result = {};
  let data = {};

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type");
    // is it text?
    if (
      contentType &&
      (contentType.includes("text/plain") ||
        contentType.includes("application/json"))
    ) {
      // parse the data
      if (contentType.includes("text/plain")) {
        try {
          const rawJsonData = await response.text();
          data = JSON.parse(rawJsonData);
        } catch {
          result.error = ["Keine valide JSON"];
          return result;
        }
      }
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          result.error = ["Keine valide JSON"];
          return result;
        }
      }
      // run the validator and check if its organigramm data
      try {
        const [valid, errors] = validateData(data);
        if (!valid) {
          result.error = errors;
          console.error(errors);
          return result;
        }
      } catch {
        result.error = ["Keine valide JSON"];
        return result;
      }
    } else {
      result.error = ["Keine Valides Format. Bitte laden sie eine JSON Datei"];
      return result;
    }
  } catch (error) {
    if (!result.error) {
      result.error = [
        "Die Daten konnten nicht geladen werden. Bitte überprüfen Sie die URL",
        error,
      ];
    }
    return result;
  }
  result.data = data;

  const newUrl = `${window.location.pathname}`;
  window.history.pushState({}, "", newUrl);

  return result;
};
