export const updateDataStructure = (data) => {
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
