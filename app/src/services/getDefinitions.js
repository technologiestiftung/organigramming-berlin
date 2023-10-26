import orgChart from "../schemas/organization_chart";
import typeVocabLookup from "./typeVocabLookup";

export function getDefinitions() {
  let orgs = [];
  let persons = [];

  Object.keys(typeVocabLookup).forEach((type) => {
    if (typeVocabLookup[type].type === "org") {
      orgs.push(type);
    }
    if (typeVocabLookup[type].type === "person") {
      persons.push(type);
    }
  });

  orgChart.definitions.organisation.properties.type.examples = orgs.sort();
  orgChart.definitions.department.properties.type.examples = orgs.sort();
  orgChart.definitions.employee.properties.position.examples = persons.sort();
  return orgChart;
}
