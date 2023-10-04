import { toSnakeCase } from "./service";
import { convertJsonLdToRdfXml } from "./convertJsonLdToRdfXml";
import { convertJsonLdToTurtle } from "./convertJsonLdToTurtle";

const downloadData = async (data, rdf) => {
  const fileName = data.export.filename || toSnakeCase(data.document.title);
  const rdfType = data.export.rdfType;
  let fileData;
  let fileType = "";
  let fileExtension = "";

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

function getMemberData(d) {
  const dC = d.contact;
  const newMemberJSONLD = {
    "@type": "vcard:Individual",
    ...(d.uri && d.uri.uri && { "@id": d.uri.uri }),
    ...(d.uri && d.uri.uriSameAs && { "owl:sameAs": d.uri.uriSameAs }),
    ...(d.title && { "vcard:title": d.title }),
    ...(d.salutation && { "vcard:honorific-prefix": d.salutation }),
    ...(d.firstName && { "vcard:given-name": d.firstName }),
    ...(d.lastName && { "vcard:family-name": d.lastName }),
    ...(d.position && { "vcard:role": d.position }),
    ...(d.gender && { "vcard:Gender": d.gender }),
    ...(dC.telephone && {
      "vcard:tel": {
        "@type": "vcard:Work",
        "vcard:hasValue": `tel:${dC.telephone}`,
      },
    }),
    ...(dC.fax && {
      "vcard:fax": {
        "@type": "vcard:Work",
        "vcard:hasValue": `fax:${dC.fax}`,
      },
    }),
    ...(dC.email && {
      "vcard:email": {
        "@type": "vcard:Work",
        "vcard:hasValue": dC.email,
      },
    }),
    ...(dC.website && {
      "vcard:url": {
        "@type": "vcard:Work",
        "vcard:hasValue": dC.website,
      },
    }),
  };
  return newMemberJSONLD;
}

function getOrgData(d) {
  const newOrgJSONLD = {
    "@type": "org:Organization",
    ...(d.uri && d.uri.uriSameAs && { "owl:sameAs": d.uri.uriSameAs }),
    ...(d.uri && d.uri.uri && { "@id": d.uri.uri }),
    ...(d.name && { "org:name": d.name }),
    // for the doc org
    ...(d.title && { "org:name": d.title }),
    ...(d.type && { "org:classification": d.type }),
    // @todo
    ...(d.type && { "xyzxyz:classification": d.type }),
  };
  const cD = d.contact;
  const aD = d.address;
  if (hasKeys(aD) || hasKeys(cD)) {
    newOrgJSONLD["org:hasSite"] = {
      "@type": "org:Site",
      ...(cD.telephone && {
        "vcard:tel": {
          "@type": "vcard:Work",
          "vcard:hasValue": `tel:${cD.telephone}`,
        },
      }),
      ...(cD.fax && {
        "vcard:fax": {
          "@type": "vcard:Work",
          "vcard:hasValue": `fax:${cD.fax}`,
        },
      }),
      ...(cD.email && {
        "vcard:email": {
          "@type": "vcard:Work",
          "vcard:hasValue": cD.email,
        },
      }),
      ...(cD.website && {
        "vcard:url": {
          "@type": "vcard:Work",
          "vcard:hasValue": cD.website,
        },
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
  if (d.employees && d.employees.length) {
    newOrgJSONLD["org:hasMember"] = d.employees.map((d) => {
      return getMemberData(d);
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
        const { organisations } = org;
        const result = getOrgData(org);
        delete result.organisations;
        const subOrganizations = traverseOrganizations(organisations);
        if (subOrganizations && subOrganizations.length > 0) {
          result["org:hasSubOrganization"] = subOrganizations;
        }
        return result;
      });
    }

    // return traverseOrganizations(inputJSON);
    return traverseOrganizations(inputJSON);
  }

  // get the document data which will the the main org
  // const docOrg = getOrgData(data.document);
  let mainOrg;
  let subOrgs;

  if (data.organisations.length === 1) {
    mainOrg = getOrgData(data.organisations[0]);
    if (data.organisations[0].organisations) {
      subOrgs = createNestedOrganizations(data.organisations[0].organisations);
    }
  } else {
    subOrgs = [];
    data.organisations.forEach((org) => {
      console.log("!!org", org);
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
    "@context": {
      org: "http://www.w3.org/ns/org#",
      vcard: "http://www.w3.org/2006/vcard/ns#",
      owl: "http://www.w3.org/2002/07/owl#",
      xyzxyz: "https://berlin.github.io/lod-vocabulary/xyzxyz#",
    },
    ...mainOrg,
    ...(subOrgs && { "org:hasSubOrganization": subOrgs }),
  };

  downloadData(data, rdf);
};
