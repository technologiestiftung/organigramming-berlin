import Ajv from "ajv";
import addFormats from "ajv-formats";
import { Subject } from "rxjs";

import { getDefinitions } from "./getDefinitions";
const definitions = getDefinitions();

const subject1 = new Subject();
const subject2 = new Subject();

export const dragNodeService = {
  sendDragInfo: (id) => subject1.next({ draggedNodeId: id }),
  clearDragInfo: () => subject1.next(),
  getDragInfo: () => subject1.asObservable(),
};

export const selectNodeService = {
  sendSelectedNodeInfo: (id) => subject2.next({ selectedNodeId: id }),
  clearSelectedNodeInfo: () => subject2.next(),
  getSelectedNodeInfo: () => subject2.asObservable(),
};

export const toSnakeCase = (str) => {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join("_");
};

export const isDefiend = (object) => {
  return typeof object !== "undefined" && object !== null;
};

export const getItemByPath = (obj, path) =>
  path.reduce((obj, item) => obj[item], obj);

export const createItemByPath = (obj, path, value) => {
  var lastKey = path.pop();
  for (var i = 0; i < path.length; i++) {
    obj = obj[path[i]] = obj[path[i]] || {};
  }
  if (lastKey) obj = obj[lastKey] = value;
  return obj;
};

export const handleDropEnd = async (e, dsDigger) => {
  if (
    !e.destination ||
    (e.source.droppableId === e.destination.droppableId &&
      e.destination.index === e.source.index)
  ) {
    return;
  }

  const sourcePath = e.source.droppableId.split("_");
  const destinationPath = e.destination.droppableId.split("_");

  let sourceNode = await dsDigger.findNodeById(sourcePath[0]);
  sourcePath.shift();

  const sourceList = getItemByPath(sourceNode, sourcePath);

  const item = await JSON.parse(JSON.stringify(sourceList[e.source.index]));
  sourceList.splice(e.source.index, 1);

  createItemByPath(sourceNode, sourcePath, sourceList);

  await dsDigger.updateNode(sourceNode);

  let destinationNode = await dsDigger.findNodeById(destinationPath[0]);
  destinationPath.shift();

  let destinationList = getItemByPath(destinationNode, destinationPath);

  if (isDefiend(destinationList)) {
    if (e.destination.index >= destinationList.length) {
      destinationList.push(item);
    } else {
      destinationList.splice(e.destination.index, 0, item);
    }
  } else {
    createItemByPath(destinationNode, destinationPath, [item]);
  }

  await dsDigger.updateNode(destinationNode);
  return { ...dsDigger.ds };
};

export const validateData = (data) => {
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
  return [validate(data), validate.errors];
};

export const getContrastTextColor = (bgColor) => {
  if (!bgColor) return "white";
  // Convert hex color to RGB values
  let color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  let r = parseInt(color.substring(0, 2), 16); // Red
  let g = parseInt(color.substring(2, 4), 16); // Green
  let b = parseInt(color.substring(4, 6), 16); // Blue

  // Calculate brightness (luminance)
  let brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 155 ? "#333" : "white";
};

export const getHalfData = (data, position) => {
  const half = Math.ceil(data.length / 2);
  if (position === "right") {
    const right = data.slice(half);
    return right;
  }
  if (position === "left") {
    const left = data.slice(0, half);
    return left;
  }
};

export const computeBackgroundColor = (userColor) => {
  const r = parseInt(userColor.substring(1, 3), 16);
  const g = parseInt(userColor.substring(3, 5), 16);
  const b = parseInt(userColor.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  let adjustmentFactor = 40; // You can adjust this value based on how much you want to darken or lighten

  if (brightness > 155) {
    // If it's bright, darken the color
    return `#${clamp(r - adjustmentFactor)
      .toString(16)
      .padStart(2, "0")}${clamp(g - adjustmentFactor)
      .toString(16)
      .padStart(2, "0")}${clamp(b - adjustmentFactor)
      .toString(16)
      .padStart(2, "0")}`;
  } else {
    // If it's dark, lighten the color
    return `#${clamp(r + adjustmentFactor)
      .toString(16)
      .padStart(2, "0")}${clamp(g + adjustmentFactor)
      .toString(16)
      .padStart(2, "0")}${clamp(b + adjustmentFactor)
      .toString(16)
      .padStart(2, "0")}`;
  }
};

function clamp(value, min = 0, max = 255) {
  return Math.min(Math.max(value, min), max);
}

export function replaceUrlParts(json, newBaseUri) {
  for (let key in json) {
    if (key === "@id" || (key === "organigram" && !json["@context"])) {
      json[key] = json[key].replace(
        "https://berlin.github.io/lod-organigram/",
        newBaseUri
      );
    } else if (typeof json[key] === "object" && json[key] !== null) {
      replaceUrlParts(json[key], newBaseUri);
    }
  }
  return json;
}

export function comparableString(inputString) {
  if (!inputString) return "";
  // Convert to lowercase and remove all spaces
  return inputString.toLowerCase().replaceAll(/\s/g, "");
}

export function getRoleTypeDescription(pos) {
  return comparableString(
    (pos?.positionType || "") + (pos?.positionStatus || "")
  );
}

export function nameExists(pos) {
  let fullName = comparableString(
    (pos?.person?.firstName || "") + (pos?.person?.lastName || "")
  );
  return fullName ? true : false;
}
