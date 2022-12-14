import Ajv from "ajv";
import addFormats from "ajv-formats";
import definitions from "../schemas/organization_chart";

export const validateImportedJSON = (data) => {
  const ajv = new Ajv();

  //add custom formats to validate against
  addFormats(ajv);
  ajv.addFormat(
    "data-url",
    /^data:([a-z]+\/[a-z0-9-+.]+)?;(?:name=(.*);)?base64,(.*)$/
  );
  ajv.addFormat("integer", /([0-9])/);
  ajv.addFormat(
    "color",
    /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/
  );
  ajv.addVocabulary(["version", "enumNames"]);

  const validate = ajv.compile(definitions);
  if (!validate(data)) {
    return validate.errors;
  }
  return validate(data);
};
