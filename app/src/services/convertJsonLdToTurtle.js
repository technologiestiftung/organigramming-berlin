const jsonld = require("jsonld");
const N3 = require("n3");
const rdfVocab = require("./rdfVocab.json");

function parseNQuads(nquads) {
  const parser = new N3.Parser({ format: "N-Quads" });
  const writer = new N3.Writer({
    format: "Turtle",
    prefixes: rdfVocab,
  });

  return new Promise((resolve, reject) => {
    parser.parse(nquads, (error, quad, prefixes) => {
      if (error) reject(error);
      if (quad) {
        writer.addQuad(quad);
      } else {
        writer.end((error, result) => {
          if (error) reject(error);
          resolve(result);
        });
      }
    });
  });
}

export async function convertJsonLdToTurtle(jsonldInput) {
  let outputData;
  const nquads = await jsonld.toRDF(jsonldInput, {
    format: "application/n-quads",
  });
  try {
    outputData = await parseNQuads(nquads);
  } catch (error) {
    console.error(error);
  }

  return outputData;
}
