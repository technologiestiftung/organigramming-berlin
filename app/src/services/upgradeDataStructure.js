import initDocument from "../data/initDocument";

export const upgradeDataStructure = (data) => {
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
};
