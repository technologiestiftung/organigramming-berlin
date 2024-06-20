// Possible Keys to validate

//   "title",
//   "creator",
//   "note",
//   "type",
//   "name",
//   "altName",
//   "purpose",
//   "address",
//   "positionType",
//   "salutation",
//   "firstName",
//   "lastName",
//   "telephone",
//   "fax",
//   "email",
//   "website",
//   "street",
//   "housenumber",
//   "building",
//   "room",
//   "zipCode",
//   "city"

export const validationRules = {
  berlinerVerwaltung: {
    telephone: {
      pattern: /^\+49 30 /,
      warning:
        'Berliner Fesnetznummer müssen wie folgt beginnen: "+49 30 ". z.B.: +49 30 959996410',
    },
    website: {
      pattern: /^http/,
      warning: 'Webseiten müssen mit "http" beginnen',
    },
  },
  test: {},

  // Add more rules here for other properties as needed
};
