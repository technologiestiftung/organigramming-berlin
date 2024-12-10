import {
  toSnakeCase,
  replaceUrlParts,
  getRoleTypeDescription,
  nameExists,
  getSameAsURIs,
} from "./service";
import { convertJsonLdToRdfXml } from "./convertJsonLdToRdfXml";
import { convertJsonLdToTurtle } from "./convertJsonLdToTurtle";
import typeVocabLookup from "./typeVocabLookup.json";
import rdfVocab from "./rdfVocab.json";
import getURI from "./getURI";
const subClasses = {};

const downloadData = async (data, rdf) => {
  const fileName = data.export.filename || toSnakeCase(data.document.title);
  const rdfType = data.export.rdfType;
  const baseUri = data.export?.baseUri;

  let fileData;
  let fileType = "";
  let fileExtension = "";

  if (baseUri && baseUri !== "https://berlin.github.io/lod-organigram/") {
    rdf = replaceUrlParts(rdf, baseUri);
  }

  if (rdfType === "json-ld") {
    fileData = JSON.stringify(rdf);
    fileType = "application/json";
    fileExtension = ".jsonld";
  }
  if (rdfType === "nquads") {
    fileType = "application/n-quads";
    fileExtension = ".nq";
    fileData = await convertJsonLdToRdfXml(rdf);
  }
  if (rdfType === "turtle") {
    fileData = await convertJsonLdToTurtle(rdf);
    fileType = "application/ttl";
    fileExtension = ".ttl";
  }
  const blob = new Blob([fileData], { type: fileType });
  const href = await URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName + fileExtension;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function hasKeys(obj) {
  if (!obj) return false;
  return Object.keys(obj).length === 0 ? false : true;
}

function getPositionData(position) {
  const newPositionJSONLD = {
    "@type": "org:Post",
    ...(position.positionType &&
      typeVocabLookup[position.positionType] && {
        "org:role": {
          "@id": `${typeVocabLookup[position.positionType].vocab}:${
            typeVocabLookup[position.positionType].name
          }`,
        },
      }),
    // if the position is NOT in the vocab
    ...(position.positionType &&
      !typeVocabLookup[position.positionType] && {
        "@type": "org:Post",
        "org:role": {
          "@type": "org:Role",
          "@id": getURI("role", getRoleTypeDescription(position)),
          "skos:prefLabel": {
            "@value":
              position.positionType +
              (position?.positionStatus ? ` (${position.positionStatus})` : ""),
            "@language": "de",
          },
        },
      }),
    ...(position.positionStatus && { "rdfs:comment": position.positionStatus }),
    ...(position?.uri?.uri && { "@id": position.uri.uri }),
    ...(position?.uri?.sameAsUris && {
      "owl:sameAs": getSameAsURIs(position.uri.sameAsUris),
    }),
  };

  return newPositionJSONLD;
}

const genderHelper = {
  m: "schema:Male",
  w: "schema:Female",
  d: "berorgs:Divers",
};
function getMemberData(d) {
  if (!nameExists(d)) return;
  const person = d.person;
  const dC = person.contact;
  const newMemberJSONLD = {
    "@type": "vcard:Individual",
    ...(person?.uri?.uri && { "@id": person.uri.uri }),
    ...(person?.uri?.sameAsUris && {
      "owl:sameAs": getSameAsURIs(person.uri.sameAsUris),
    }),
    ...(person.title && { "vcard:title": person.title }),
    ...(person.salutation && { "vcard:honorific-prefix": person.salutation }),
    ...(person.firstName && { "vcard:given-name": person.firstName }),
    ...(person.lastName && { "vcard:family-name": person.lastName }),
    ...((person.firstName || person.lastName) && {
      "rdfs:label": [person.firstName, person.lastName]
        .filter(Boolean)
        .join(" "),
    }),
    ...(person.gender &&
      person.gender !== "1" && {
        "schema:gender": { "@id": genderHelper[person.gender] },
      }),
    ...(dC.telephone && {
      "vcard:tel": dC.telephone,
    }),
    ...(dC.fax && {
      "vcard:fax": dC.fax,
    }),
    ...(dC.email && {
      "vcard:email": dC.email,
    }),
    ...(dC.website && {
      "vcard:url": dC.website,
    }),
    "org:holds": { "@id": d.uri.uri },
  };
  return newMemberJSONLD;
}

function getOrgData(d) {
  const orgTypeUri = "organigram:" + getURI("orgtype", d.type, true);

  if (!typeVocabLookup[d.type]) {
    subClasses[orgTypeUri] = {
      "@id": orgTypeUri,
      "@type": "rdfs:Class",
      "rdfs:subClassOf": {
        "@id": "org:Organization",
      },
      "rdfs:label": {
        "@value": d.type || "",
        "@language": "de",
      },
    };
  }

  const newOrgJSONLD = {
    "@type": typeVocabLookup[d.type]
      ? [
          "org:Organization",
          `${typeVocabLookup[d.type].vocab}:${typeVocabLookup[d.type].name}`,
        ]
      : orgTypeUri,
    ...(d?.uri?.uri && { "@id": d.uri.uri }),
    ...(d?.uri?.sameAsUris && {
      "owl:sameAs": getSameAsURIs(d.uri.sameAsUris),
    }),
    ...(d.name && {
      "skos:prefLabel": {
        "@value": d.name,
        "@language": "de",
      },
    }),
    ...(d.altName && {
      "skos:altLabel": {
        "@value": d.altName,
        "@language": "de",
      },
    }),
    ...(d.purpose && {
      "org:purpose": {
        "@value": d.purpose,
        "@language": "de",
      },
    }),
  };

  const cD = d.contact;
  const aD = d.address;
  if (hasKeys(aD) || hasKeys(cD)) {
    newOrgJSONLD["org:hasSite"] = {
      "@type": "org:Site",
      ...(cD.telephone && {
        "vcard:tel": cD.telephone,
      }),
      ...(cD.fax && {
        "vcard:fax": cD.fax,
      }),
      ...(cD.email && {
        "vcard:email": cD.email,
      }),
      ...(cD.website && {
        "vcard:url": cD.website,
      }),
    };
    if (hasKeys(aD)) {
      const hasAddress = aD.street || aD.housenumber || aD.building || aD.room;
      newOrgJSONLD["org:hasSite"]["org:siteAddress"] = {
        "@type": "vcard:Address",
        ...(hasAddress && {
          "vcard:street-address": `${aD?.street} ${aD?.housenumber}${
            aD?.building ? " | Gebäude: " + aD?.building : ""
          }${aD?.room ? " | Raum: " + aD?.room : ""}`,
        }),
        ...(aD.zipCode && { "vcard:postal-code": aD.zipCode }),
        ...(aD.city && { "vcard:locality": aD.city }),
      };
    }
  }
  if (d.positions && d.positions.length) {
    newOrgJSONLD["org:hasMember"] = d.positions.map((d) => {
      return getMemberData(d);
    });
  }
  if (d.positions && d.positions.length) {
    newOrgJSONLD["org:hasPost"] = d.positions.map((d) => {
      return getPositionData(d);
    });
  }
  if (d.departments && d.departments.length) {
    newOrgJSONLD["org:hasUnit"] = d.departments.map((d) => {
      return getOrgData(d);
    });
  }
  return newOrgJSONLD;
}

export const exportRDF = (data) => {
  function createNestedOrganizations(inputJSON) {
    function traverseOrganizations(organizations) {
      if (!organizations) return;
      return organizations.map((org) => {
        if (org.layout.style === "hide") {
          const { organisations } = org;
          const result = traverseOrganizations(organisations);
          return result[0];
        } else {
          const { organisations } = org;
          const result = getOrgData(org);
          delete result.organisations;
          const subOrganizations = traverseOrganizations(organisations);
          if (subOrganizations && subOrganizations.length > 0) {
            if (subOrganizations[0]["@type"]) {
              result["org:hasSubOrganization"] = subOrganizations;
            } else {
              result["org:hasSubOrganization"] = subOrganizations[0];
            }
          }
          return result;
        }
      });
    }
    return traverseOrganizations(inputJSON);
  }

  // get the document data which will the the main org
  let mainOrg;
  let subOrgs;
  if (data.organisations.length === 1) {
    // case: there is only ONE org. Searching for the main org is not needed
    mainOrg = getOrgData(data.organisations[0]);
    if (data.organisations[0].organisations) {
      subOrgs = createNestedOrganizations(data.organisations[0].organisations);
    }
  } else {
    subOrgs = [];
    data.organisations.forEach((org) => {
      if (org.isMainOrganisation) {
        mainOrg = getOrgData(org);
        if (org.organisations) {
          subOrgs.push(...createNestedOrganizations(org.organisations));
        }
      } else {
        subOrgs.push(...createNestedOrganizations([org]));
      }
    });
  }

  let rdf = {
    "@context": rdfVocab,
    "@graph": [
      ...(subClasses && Object.values(subClasses)),
      {
        "@id": data.document?.uri?.uri,
        ...(data.document?.uri?.sameAsUris && {
          "owl:sameAs": getSameAsURIs(data.document.uri.sameAsUris),
        }),
        "@type": "berorgs:Organogram",
        "rdfs:label": {
          "@value": data.document?.title || "",
          "@language": "de",
        },
        ...(data.document?.creator && {
          "dcterms:creator": {
            "schema:name": {
              "@value": data.document?.creator,
              "@language": "de",
            },
          },
        }),
        ...(data.document?.version && {
          "dcterms:created": {
            "@value": data.document?.version,
            "@type": "xsd:date",
          },
        }),
        "berorgs:contains": {
          ...mainOrg,
          ...(subOrgs && { "org:hasSubOrganization": subOrgs }),
        },
      },
    ],
  };

  downloadData(data, rdf);
};
