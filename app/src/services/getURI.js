function generateHexCode(hexLength) {
  const chars = "0123456789abcdef";
  let hexCode = "";
  for (let i = 0; i < hexLength; i++) {
    hexCode += chars[Math.floor(Math.random() * 16)];
  }
  return hexCode;
}

function generateHexCodeByString(hexLength, str) {
  if (!str) {
    str = "";
  }
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert the integer to a hexadecimal string and ensure it's positive
  var hex = Math.abs(hash).toString(16);

  // Pad with zeroes if necessary to ensure it's at least 10 characters
  while (hex.length < hexLength) {
    hex = "0" + hex;
  }

  // Truncate to 10 characters if longer
  return hex.substring(0, hexLength);
}

// add type: Org or person
export default function getURI(type, str, noUrl) {
  if (str || noUrl) {
    return (
      (noUrl
        ? `${type}-`
        : `https://berlin.github.io/lod-organigram/${type}-`) +
      generateHexCodeByString(10, str)
    );
  }
  return (
    `https://berlin.github.io/lod-organigram/${type}-` + generateHexCode(10)
  );
}
