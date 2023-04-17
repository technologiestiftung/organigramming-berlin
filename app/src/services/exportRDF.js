import { toSnakeCase } from "./service";
const downloadData = async (data, rdf) => {
  const fileName = data.export.filename || toSnakeCase(data.document.title);
  const json = JSON.stringify(rdf);
  const blob = new Blob([json], { type: "application/json" });
  const href = await URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName + ".json";
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
    ...(d.title && { "vcard:title": d.title }),
    // @todo find a data property for salutation
    ...(d.salutation && { "vcard:additional-name": d.salutation }),
    ...(d.firstName && { "vcard:given-name": d.firstName }),
    ...(d.lastName && { "vcard:family-name": d.lastName }),
    ...(d.position && { "vcard:role": d.position }),
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
    ...(d.uri && d.uri.uri && { "@id": d.uri.uri }),
    ...(d.name && { "org:name": d.name }),
    ...(d.type && { "org:classification": d.type }),
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
    console.log("EMPLOYYY", d.employees);
    newOrgJSONLD["org:hasMember"] = d.employees.map((d) => {
      return getMemberData(d);
    });
  }
  if (d.departments && d.departments.length) {
    newOrgJSONLD["org:hasUnit"] = d.departments.map((d) => {
      console.log("ÄÄÄÄÄÄÄÄÄÄÄ", d);

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

    return traverseOrganizations(inputJSON)[0];
  }

  const orgs = createNestedOrganizations(data.organisations);
  let rdf = {
    "@context": {
      org: "http://www.w3.org/ns/org#",
      vcard: "http://www.w3.org/2006/vcard/ns#",
    },
    ...orgs,
  };

  console.log(rdf);
  downloadData(data, rdf);
};
