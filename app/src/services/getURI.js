function generateHexCode(hexLength) {
  const chars = "0123456789abcdef";
  let hexCode = "";
  for (let i = 0; i < hexLength; i++) {
    hexCode += chars[Math.floor(Math.random() * 16)];
  }
  return hexCode;
}

// add type: Org or person
export default function getURI(text) {
  return (
    `https://berlin.github.io/lod-organigramm/${text}-` + generateHexCode(10)
  );
}
