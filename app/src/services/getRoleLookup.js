import { getRoleTypeDescription } from "./service";
import getURI from "./getURI";
const lookup = {};

export default function getRoleLookup(data, type) {
  function eachPositions(position) {
    position?.forEach((pos) => {
      console.log("pos each", pos);
      const roleTypeDescription = getRoleTypeDescription(pos);
      if (roleTypeDescription) {
        lookup[roleTypeDescription] = getURI(type, roleTypeDescription);
      }
    });
  }

  function eachOrg(org) {
    org.organisations?.forEach((subOrg) => {
      eachPositions(subOrg?.positions);
      subOrg.departments?.forEach((department) => {
        eachPositions(department?.positions);
      });
      eachOrg(subOrg);
    });
  }

  eachOrg(data);

  return lookup;
}
