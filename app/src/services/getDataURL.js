export const getDataURL = () => {
  const result = {};
  const searchParams = new URLSearchParams(window.location.search);
  const paramsObj = {};
  let validatedDataURL = {};
  for (let [key, value] of searchParams.entries()) {
    paramsObj[key] = value;
  }
  const dataURL = paramsObj["dataurl"];
  // does the URL contain the parm dataurl?
  if (dataURL) {
    // is it a valid URL?
    try {
      validatedDataURL = new URL(dataURL);
    } catch (e) {
      result.error = ["Die URL ist keine valide URL"];
      return result;
    }
    // does it have the correct protocols?
    const acceptedSchemes = ["http:", "https:"];
    if (!acceptedSchemes.includes(validatedDataURL.protocol)) {
      result.error = [
        `${validatedDataURL.protocol} ist kein gültiges URL-Protokoll. Ihre URL muss mit "http:" oder "https:" beginnen.`,
      ];
      return result;
    }
    // does it end with .json?
    if (!dataURL.endsWith(".json")) {
      result.error = [
        "Sie können nur JSON-Dateien laden. Ihre Datei muss mit .json enden.",
      ];
      return result;
    }
    result.url = dataURL;
    return result;
  }

  return paramsObj;
};
