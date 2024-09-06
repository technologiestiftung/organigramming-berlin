import { validationRules } from "../validation/validationRules";

function findKeyPath(obj, targetKey, currentPath = "") {
  let paths = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (key === targetKey) {
        // If the current key is the target key, add the current path
        paths.push(newPath);
      }

      if (value && typeof value === "object") {
        // Recursively search in the object
        paths = paths.concat(findKeyPath(value, targetKey, newPath));
      }
    }
  }

  return paths;
}

function getNestedValue(obj, path) {
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current[key] !== undefined) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

export function checkErrors(formData, errors, validatorName, dataToCheck) {
  if (validatorName === "" || validatorName === undefined) {
    return errors;
  }

  if (!validationRules[validatorName]) {
    console.warn(validatorName, "unknown validator");
    return errors;
  }

  const toValidate = validationRules[validatorName];
  for (const key in toValidate) {
    const paths = findKeyPath(formData.current, key);
    paths.forEach((path) => {
      const value = getNestedValue(formData.current, path);
      const regex = toValidate[key].pattern;

      if (value && !regex.test(value)) {
        const error = getNestedValue(errors.current, path);
        const warning = toValidate[key].warning;
        error.addError(warning);
      }
    });
  }

  return errors;
}
