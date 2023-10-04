import initDocument from "../data/initDocument";
import getURI from "./getURI";

function addUrisToOrgsAndEmployees(data) {
  data.organisations?.forEach((org) => {
    // add an URI to all orgs
    if (!org.uri && !org.uri?.uri) {
      org.uri = { uri: getURI("organisation") };
    }

    // add an URI to all employees
    org.employees?.forEach((employee) => {
      if (!employee.uri && !employee.uri?.uri) {
        employee.uri = { uri: getURI("person") };
      }
    });

    // add an URI to all departments
    org.departments?.forEach((department) => {
      if (!department.uri && !department.uri?.uri) {
        department.uri = { uri: getURI("organisation") };
      }
      // add an URI to all employees of departments
      department.employees?.forEach((employee) => {
        if (!employee.uri && !employee.uri?.uri) {
          employee.uri = { uri: getURI("person") };
        }
      });
    });

    addUrisToOrgsAndEmployees(org);
  });
}

// this functions adds new properties to the imported data if its missing.
// e.g. the uri property has been added later to the tool
export const upgradeDataStructure = (data) => {
  // add meta data id not added yet
  if (!data.meta) {
    data.meta = initDocument.meta;
  }

  if (
    data.organisations &&
    data.organisations.length &&
    !data.organisations.background
  ) {
    data.organisations.forEach((org) => {
      org.background = {
        color: "",
        style: "default",
      };
    });
  }

  // traverse all orgs and add uris to orgs and employees
  addUrisToOrgsAndEmployees(data);

  return data;
};
