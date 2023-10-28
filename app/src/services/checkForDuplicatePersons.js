export default function checkForDuplicatePersons(formData) {
  const persons = {};
  const personsDuplicates = {};

  function getName(e) {
    let name =
      (e.firstName ? e.firstName.trim() : "") +
      " " +
      (e.lastName ? e.lastName.trim() : "");

    return name ? name.trim() : "";
  }

  function getPersonData(orgs) {
    // each org
    orgs?.forEach((org) => {
      // departments
      if (org.departments) {
        getPersonData(org.departments);
      }
      // each employee
      org?.positions?.forEach((e) => {
        const person = e.person;
        const name = getName(person);
        if (name === " ") return;
        if (!persons[name]) {
          persons[name] = {
            uri: person.uri?.uri,
            orgNames: [org.name],
            counter: 1,
          };
        } else {
          if (persons[name]?.uri !== person.uri?.uri) {
            persons[name].counter++;
            persons[name].orgNames.push(org.name);
          }
        }
      });
      if (org.organisations) {
        getPersonData(org.organisations);
      }
    });
  }

  getPersonData(formData.organisations);

  Object.keys(persons).forEach((p) => {
    if (persons[p].counter > 1) {
      personsDuplicates[p] = {
        orgNames: persons[p].orgNames,
        counter: persons[p].counter,
      };
    }
  });

  return personsDuplicates;
}
