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

function buildTelephoneResource(telephone) {
  if (!telephone) return null;
  const trimmed = telephone.trim();
  if (!trimmed) return null;
  const value = trimmed.startsWith("tel:") ? trimmed : `tel:${trimmed}`;
  return {
    "@type": "vcard:Telephone",
    "vcard:hasValue": value,
  };
}

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

function getPositionData(position, holderPerson = null, excludePersonalData = false) {
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
    ...(position?.positionType &&
      typeVocabLookup[position?.positionType]?.name && {
        "rdfs:label":
          position.positionType +
          (position?.positionStatus ? ` (${position.positionStatus})` : ""),
      }),
    // if the position is NOT in the vocab
    ...(position.positionType &&
      !typeVocabLookup[position.positionType] && {
        "@type": "org:Post",
        ...(position.positionType && {
          "rdfs:label":
            position.positionType +
            (position?.positionStatus ? ` (${position.positionStatus})` : ""),
        }),
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
    ...(position.positionStatus &&
      !typeVocabLookup[position.positionStatus] && {
        "rdfs:comment": position.positionStatus,
      }),
    ...(position.positionStatus &&
      typeVocabLookup[position.positionStatus]?.type === "positionStatus" && {
        "berorgs:positionsstatus": {
          "@id": `${typeVocabLookup[position.positionStatus].vocab}:${
            typeVocabLookup[position.positionStatus].name
          }`,
        },
      }),
    ...(position?.uri?.uri && { "@id": position.uri.uri }),
    ...(position?.uri?.sameAsUris && {
      "owl:sameAs": getSameAsURIs(position.uri.sameAsUris),
    }),
    ...(!excludePersonalData &&
      holderPerson?.uri?.uri && {
        "org:heldBy": { "@id": holderPerson.uri.uri },
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
      "rdfs:label": [person.title, person.salutation, person.firstName, person.lastName]
        .filter(Boolean)
        .join(" "),
    }),
    ...(person.gender &&
      person.gender !== "1" && {
        "schema:gender": { "@id": genderHelper[person.gender] },
      }),
    ...(dC.telephone && {
      "vcard:hasTelephone": buildTelephoneResource(dC.telephone),
    }),
    ...(dC.fax && {
      "vcard:fax": dC.fax,
    }),
    ...(dC.email && {
      "vcard:email": dC.email,
    }),
    ...(dC.website && {
      "vcard:hasUrl": dC.website,
    }),
    "org:holds": { "@id": d.uri.uri },
  };

  return newMemberJSONLD;
}

/**
 * Export rule:
 * - isMainOrg === true  => org:Organization
 * - isMainOrg === false => org:OrganizationalUnit
 */
function getOrgData(d, excludePersonalData, parentOrg = null, isMainOrg = false) {
  const hasType = Boolean(d?.type?.trim());
  const orgTypeUri = hasType ? "organigram:" + getURI("orgtype", d.type, true) : null;

  // choose base type / base class depending on whether this is the main org
  const baseType = isMainOrg ? "org:Organization" : "org:OrganizationalUnit";

  // Create a class for custom types (not in vocab) and subtype it appropriately
  if (hasType && !typeVocabLookup[d.type]) {
    subClasses[orgTypeUri] = {
      "@id": orgTypeUri,
      "@type": "rdfs:Class",
      "rdfs:subClassOf": { "@id": baseType },
      "rdfs:label": {
        "@value": d.type || "",
        "@language": "de",
      },
    };
  }

  const newOrgJSONLD = {
    "@type": hasType
      ? typeVocabLookup[d.type]
        ? [
            baseType,
            `${typeVocabLookup[d.type].vocab}:${typeVocabLookup[d.type].name}`,
          ]
        : [baseType, orgTypeUri]
      : baseType,

    ...(d?.uri?.uri && { "@id": d.uri.uri }),

    // inverse relation: this unit is a unitOf its parent (works for org->org, unit->org, unit->unit)
    ...(parentOrg?.["@id"] && { "org:unitOf": { "@id": parentOrg["@id"] } }),

    ...(d?.uri?.sameAsUris && {
      "owl:sameAs": getSameAsURIs(d.uri.sameAsUris),
    }),

    ...(d.name && {
      "skos:prefLabel": {
        "@value": d.name,
        "@language": "de",
      },
      "rdfs:label": {
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
  if (cD?.website) {
    newOrgJSONLD["vcard:hasUrl"] = cD.website;
  }
  const hasSiteContact = cD?.telephone || cD?.fax || cD?.email;
  if (hasKeys(aD) || hasSiteContact) {
    newOrgJSONLD["org:hasSite"] = {
      "@type": "org:Site",
      ...(cD?.telephone && {
        "vcard:hasTelephone": buildTelephoneResource(cD.telephone),
      }),
      ...(cD?.fax && {
        "vcard:fax": cD.fax,
      }),
      ...(cD?.email && {
        "vcard:email": cD.email,
      }),
    };

    if (hasKeys(aD)) {
      newOrgJSONLD["org:hasSite"]["org:siteAddress"] = {
        "@type": "vcard:Address",
        ...(aD.street && {
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
    if (!excludePersonalData) {
      newOrgJSONLD["org:hasMember"] = d.positions.map((pos) => getMemberData(pos));
    }
  }

  if (d.positions && d.positions.length) {
    newOrgJSONLD["org:hasPost"] = d.positions.map((pos) =>
      getPositionData(pos, pos?.person, excludePersonalData)
    );
  }

  // departments -> hasUnit + each child gets unitOf
  // children are ALWAYS organizational units
  if (d.departments && d.departments.length) {
    newOrgJSONLD["org:hasUnit"] = d.departments.map((child) => {
      return getOrgData(child, excludePersonalData, newOrgJSONLD, false);
    });
  }

  return newOrgJSONLD;
}

export const exportRDF = (data) => {
  const excludePersonalData = data?.export?.excludePersonalData || false;

  // also pass the parent's JSON-LD node down the recursion.
  function createNestedOrganizations(inputJSON, parentOrgJsonLd = null) {
    function traverseOrganizations(organizations, parent) {
      if (!organizations) return;

      return organizations.flatMap((org) => {
        const childOrgs = org.organisations;

        if (org.layout?.style === "hide") {
          // hidden wrapper level: keep same parent
          const result = traverseOrganizations(childOrgs, parent);
          return result || [];
        }

        // visible org: everything here is NOT the main org -> export as unit
        const result = getOrgData(org, excludePersonalData, parent, false);
        delete result.organisations;

        // traverse children using THIS org as new parent
        const subOrganizations = traverseOrganizations(childOrgs, result);

        if (subOrganizations && subOrganizations.length > 0) {
          // keep your original behavior
          if (subOrganizations[0]?.["@type"]) {
            result["org:hasUnit"] = subOrganizations;
          } else {
            result["org:hasUnit"] = subOrganizations[0];
          }
        }

        return [result];
      });
    }

    return traverseOrganizations(inputJSON, parentOrgJsonLd);
  }

  // get the document data which will be the main org
  let mainOrg;
  let subOrgs;

  if (data.organisations.length === 1) {
    // case: there is only ONE org. Searching for the main org is not needed
    mainOrg = getOrgData(data.organisations[0], excludePersonalData, null, true);

    if (data.organisations[0].organisations) {
      subOrgs = createNestedOrganizations(
        data.organisations[0].organisations,
        mainOrg
      );
    }
  } else {
    subOrgs = [];

    data.organisations.forEach((org) => {
      if (org.isMainOrganisation) {
        mainOrg = getOrgData(org, excludePersonalData, null, true);

        if (org.organisations) {
          subOrgs.push(...createNestedOrganizations(org.organisations, mainOrg));
        }
      } else {
        // top-level non-main org: no parent
        subOrgs.push(...createNestedOrganizations([org], null));
      }
    });
  }

  const rdf = {
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
          ...(subOrgs && { "org:hasUnit": subOrgs }),
        },
      },
    ],
  };

  downloadData(data, rdf);
};
