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

const context = {
  org: "http://www.w3.org/ns/org#",
  vcard: "http://www.w3.org/2006/vcard/ns#",
};

const member = {
  "@type": "vcard:Individual",
  "vcard:title": "Mr.",
  "vcard:given-name": "Vorname",
  "vcard:family-name": "Namchname 1",
  "vcard:role": "Software Engineer",
  "vcard:tel": {
    "@type": "vcard:Work",
    "vcard:hasValue": "tel:+1-555-555-5555",
  },
  "vcard:fax": {
    "@type": "vcard:Work",
    "vcard:hasValue": "fax:+1-555-555-5556",
  },
  "vcard:email": {
    "@type": "vcard:Work",
    "vcard:hasValue": "john.doe@example.com",
  },
  "vcard:url": {
    "@type": "vcard:Work",
    "vcard:hasValue": "https://www.example.com/johndoe",
  },
};

const orgTemplate = {
  "@id": "http://example.org/organizations#MyToplevelOrganization",
  "@type": "org:Organization",
  "org:name": "My Toplevel Organization",
  "org:classification": "Nonprofit",
  "org:hasSite": {
    "@type": "org:Site",
    "org:siteAddress": {
      "@type": "vcard:Address",
      "vcard:street-address": "Hausnummer + Straße + Gebäude + Raum",
      "vcard:postal-code": "PLZ",
      "vcard:locality": "Berlin",
      //   "vcard:region": "Berlin",
      //   "vcard:country-name": "Germany",
    },
    "vcard:tel": {
      "@type": "vcard:Work",
      "vcard:hasValue": "tel:TEL",
    },
    "vcard:fax": {
      "@type": "vcard:Work",
      "vcard:hasValue": "fax:FAX",
    },
    "vcard:email": {
      "@type": "vcard:Work",
      "vcard:hasValue": "john.doe@example.com",
    },
    "vcard:url": {
      "@type": "vcard:Work",
      "vcard:hasValue": "https://www.example.com/johndoe",
    },
  },
  "org:hasMember": [],
  "org:hasUnit": [],
  "org:hasSubOrganization": [],
};

function hasKeys(obj) {
  return Object.keys(obj).length === 0 ? false : true;
}

function getMemberData(d) {
  // {
  //     "@type": "vcard:Individual",
  //     "vcard:title": "Mr.",
  //     "vcard:given-name": "Vorname",
  //     "vcard:family-name": "Namchname 1",
  //     "vcard:role": "Software Engineer",
  //     "vcard:tel": {
  //       "@type": "vcard:Work",
  //       "vcard:hasValue": "tel:+1-555-555-5555"
  //     },
  //     "vcard:fax": {
  //       "@type": "vcard:Work",
  //       "vcard:hasValue": "fax:+1-555-555-5556"
  //     },
  //     "vcard:email": {
  //       "@type": "vcard:Work",
  //       "vcard:hasValue": "john.doe@example.com"
  //     },
  //     "vcard:url": {
  //       "@type": "vcard:Work",
  //       "vcard:hasValue": "https://www.example.com/johndoe"
  //     }
  //   }
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
          "vcard:street-address": `${aD?.street} ${aD?.housenumber} ${aD?.building} ${aD?.room}`,
        }),
        ...(aD.zipCode && { "vcard:postal-code": aD.zipCode }),
        ...(aD.city && { "vcard:locality": aD.city }),
      };
    }
  }
  return newOrgJSONLD;
}

export const exportRDF = (data) => {
  function createNestedOrganizations(inputJSON, outputObject) {
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

    outputObject.yyy = traverseOrganizations(inputJSON);
  }

  const outputObject = {};
  createNestedOrganizations(data.organisations, outputObject);

  console.log(outputObject);
};

// [
//   {
//     id: "n3",
//     name: "Oberste Organisationseinheit",
//     organisations: [
//       {
//         uri: {},
//         style: "default",
//         background: {
//           color: "",
//           style: "default",
//         },
//         address: {},
//         contact: {},
//         employees: [
//           {
//             uri: {},
//             contact: {
//               telephone: "030 343566",
//             },
//             firstName: "Max",
//             lastName: "Muster",
//             position: "Abteilungsleiter",
//           },
//           {
//             uri: {},
//             contact: {
//               telephone: "030 565767",
//             },
//             firstName: "Miriam",
//             lastName: "Muster",
//             position: "Stellvertretende Abteilungsleiterin",
//           },
//         ],
//         departments: [
//           {
//             name: "Sekretariat",
//             employees: [
//               {
//                 uri: {},
//                 contact: {
//                   telephone: "030 3568355",
//                 },
//                 firstName: "Marie",
//                 lastName: "Tester",
//               },
//               {
//                 uri: {},
//                 contact: {
//                   telephone: "030 3457689",
//                 },
//                 firstName: "Tim",
//                 lastName: "Tester",
//               },
//             ],
//           },
//         ],
//         organisations: [],
//         suborganizationOrientation: "horizontal",
//         id: "n5",
//         name: "Organisationsuntereinheit",
//         type: "Abteilung",
//       },
//       {
//         uri: {},
//         style: "default",
//         background: {
//           color: "",
//           style: "default",
//         },
//         address: {},
//         contact: {},
//         suborganizationOrientation: "horizontal",
//         type: "Neue",
//         name: "Organisationsuntereinheit",
//         id: "n6",
//       },
//       {
//         uri: {},
//         style: "default",
//         background: {
//           color: "",
//           style: "default",
//         },
//         address: {},
//         contact: {},
//         organisations: [
//           {
//             uri: {},
//             style: "light",
//             background: {
//               color: "",
//               style: "default",
//             },
//             address: {},
//             contact: {},
//             organisations: [],
//             suborganizationOrientation: "horizontal",
//             id: "n9",
//             name: "Nachgeordnete Organisationseinheit",
//           },
//         ],
//         suborganizationOrientation: "horizontal",
//         id: "n4",
//         name: "Organisationsuntereinheit",
//       },
//     ],
//     style: "emphasized",
//     contact: {
//       website: "www.berlin.de",
//     },
//     address: {
//       street: "Unter den Linden",
//       housenumber: "1",
//       building: "AB",
//       room: "100",
//       zipCode: "12345",
//       city: "Berlin",
//     },
//     departments: [
//       {
//         name: "Neue Organisationsuntereinheit",
//         employees: [
//           {
//             uri: {
//               uri: "http://www.wikidata.org/entity/Q650",
//               uriLabel: "Fluor",
//               uriDescription:
//                 "chemisches Element mit dem Symbol F und der Ordnungszahl 9",
//             },
//             contact: {},
//           },
//         ],
//       },
//     ],
//     type: "Bezirksamt",
//     employees: [
//       {
//         uri: {
//           uri: "http://www.wikidata.org/entity/Q573",
//           uriLabel: "Tag",
//           uriDescription:
//             "Einheit für einen Zeitraum mit verschiedenen Bedeutungen",
//         },
//         contact: {
//           email: "muster@berlin.de",
//           telephone: "030 345678",
//           fax: "030 345679",
//         },
//         title: "Dr.",
//         firstName: "Erika",
//         lastName: "Muster",
//       },
//     ],
//     uri: {
//       uri: "http://www.wikidata.org/entity/Q623",
//       uriLabel: "Kohlenstoff",
//       uriDescription:
//         "chemisches Element mit dem Symbol C und der Ordnungszahl 6",
//     },
//     background: {
//       color: "",
//       style: "default",
//     },
//     suborganizationOrientation: "horizontal",
//   },
// ];
