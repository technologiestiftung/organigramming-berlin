import { v4 as uuidv4 } from "uuid";

// add type: Org or person
export default function getURI(type) {
  return `https://berlin.github.io/lod-organigramm/${type}` + uuidv4();
}
