export const validationRules = {
  berlinerVerwaltung: {
    organisation: {
      contact: {
        telephone: {
          pattern: /^\d{3}-\d{3}-\d{4}$/,
          warning:
            "This is not a valid phone number format. Expected format: XXX-XXX-XXXX",
        },
      },
      uri: {
        uri: {
          pattern: /^http/,
          warning: "Die URI muss mit http beginnnen.",
        },
      },
    },
  },

  // Add more rules here for other properties as needed
};
