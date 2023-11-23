const jsonld = require("jsonld");
// const N3 = require("n3");

export async function convertJsonLdToRdfXml(jsonldInput) {
  //   const nquads = await jsonld.toRDF(jsonldInput, {
  //     format: "application/n-quads",
  //   });

  const nquads = await jsonld.toRDF(jsonldInput, {
    format: "application/n-quads",
  });

  //   const parser = new N3.Parser({ format: "N-Quads" });
  //   const quads = parser.parse(nquads);

  return nquads;

  //   return new Promise(async (resolve, reject) => {
  //     const nquads = await jsonld.toRDF(jsonldInput, {
  //       format: "application/n-quads",
  //     });

  //     const parser = new N3.Parser({ format: "N-Quads" });
  //     const writer = new N3.Writer({ format: "application/rdf+xml" });

  //     parser.parse(nquads, (error, quad, prefixes) => {
  //       if (error) {
  //         reject(error);
  //         return;
  //       }

  //       if (quad) {
  //         writer.addQuad(quad);
  //       } else {
  //         writer.end((error, rdfXml) => {
  //           if (error) {
  //             reject(error);
  //             return;
  //           }

  //           resolve(rdfXml);
  //         });
  //       }
  //     });
  //   });
}
