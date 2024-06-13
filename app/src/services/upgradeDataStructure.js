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

    // add an URI to all positions
    org.positions?.forEach((position) => {
      if (!position.uri && !position.uri?.uri) {
        position.uri = { uri: getURI("position") };
      }
      if (!position?.person?.uri && !position.person?.uri?.uri) {
        position.person.uri = { uri: getURI("person") };
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

      department.positions?.forEach((position) => {
        if (!position.uri && !position.uri?.uri) {
          position.uri = { uri: getURI("position") };
        }
        if (!position?.person?.uri && !position.person?.uri?.uri) {
          position.person.uri = { uri: getURI("person") };
        }
      });
    });

    addUrisToOrgsAndEmployees(org);
  });
}

function toSameAsArray(d) {
  return {
    uri: d.uri || "",
    sameAsUris: [
      {
        uriSameAs: d.uriSameAs || "",
        uriSameAsLabel: d.uriSameAsLabel || "",
        uriSameAsDescription: d.uriSameAsDescription || "",
      },
    ],
  };
}

function moveSameAsToArray(data) {
  data.organisations?.forEach((org) => {
    if (org.uri?.uriSameAs) {
      org.uri = toSameAsArray(org.uri);
    }

    org.employees?.forEach((employee) => {
      if (employee.uri?.uriSameAs) {
        employee.uri = toSameAsArray(employee.uri);
      }
    });

    // add an URI to all positions
    org.positions?.forEach((position) => {
      if (position?.uri?.uriSameAs) {
        position.uri = toSameAsArray(position.uri);
      }
      if (position.person?.uri?.uriSameAs) {
        position.person.uri = toSameAsArray(position.person.uri);
      }
    });

    org.departments?.forEach((department) => {
      if (department?.uri?.uriSameAs) {
        department.uri = toSameAsArray(department.uri);
      }

      department.employees?.forEach((employee) => {
        if (employee.uri?.uriSameAs) {
          employee.uri = toSameAsArray(employee.uri);
        }
      });

      department.positions?.forEach((position) => {
        if (position.uri?.uriSameAs) {
          position.uri = toSameAsArray(position.uri);
        }

        if (position.person?.uri?.uriSameAs) {
          position.person.uri = toSameAsArray(position.person.uri);
        }
      });
    });

    moveSameAsToArray(org);
  });
}

function addNewPropsToOrgs(data) {
  data.organisations?.forEach((org) => {
    // add an URI to all orgs
    if (org.isMainOrganisation === undefined) {
      org.isMainOrganisation = false;
    }

    if (org.purpose === undefined) {
      org.purpose = "";
    }

    if (!org?.background && !org?.layout) {
      org.background = {
        color: "",
        style: "default",
      };
    }

    // background has moved to layout.
    // migrate it and delete it
    if (org.background) {
      org.layout = {
        bgColor: org.background.color,
        bgStyle: org.background.style,
      };
      delete org.background;
    }
    // style has moved to layout.
    // migrate it and delete it
    if (org.style) {
      if (!org.layout) {
        org.layout = {};
      }
      org.layout.style = org.style;
      org.layout.grid = "none";

      delete org.style;
    }

    addNewPropsToOrgs(org);
  });
}

function migrateEmployeesToPositionLogic(data) {
  function eachEmployee(employees, orgOrDepartment) {
    // if there are employees
    if (employees) {
      orgOrDepartment.positions = [];
    } else {
      return;
    }
    employees?.forEach((employee) => {
      const employeePosition = employee.position;
      delete employee.position;
      orgOrDepartment.positions.push({
        ...(employeePosition && { positionType: employeePosition }),
        // position is new so a URI is added
        uri: { uri: getURI("position") },
        // "positionStatus" is a new attribute. it i therefor not migrated
        person: employee,
      });
    });
  }

  data.organisations?.forEach((org) => {
    eachEmployee(org.employees, org);
    delete org.employees;
    org.departments?.forEach((department) => {
      eachEmployee(department.employees, department);
      delete department.employees;
    });
    migrateEmployeesToPositionLogic(org);
  });
}

// this functions adds new properties to the imported data if its missing.
// e.g. the uri property has been added later to the tool
export const upgradeDataStructure = (data) => {
  // add meta data id not added yet
  if (!data.meta) {
    data.meta = initDocument.meta;
  }
  // add uri to document if not there
  if (!data.document?.uri) {
    data.document.uri = { uri: getURI("organigram") };
  }

  // if doc has prop uriSameAs -> move it to sameAsUris
  if (data.document.uri.uriSameAs) {
    data.document.uri = toSameAsArray(data.document.uri);
  }

  // add new props to orgs if missing
  addNewPropsToOrgs(data);

  // traverse all orgs and add uris to orgs and employees
  addUrisToOrgsAndEmployees(data);

  // traverse all orgs and employees and move prop uriSameAs ->  to sameAsUris
  moveSameAsToArray(data);

  // rearrange data to move employees to position.person logic
  migrateEmployeesToPositionLogic(data);

  return data;
};
