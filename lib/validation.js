// Functions provided by professor Rob Hess of Oregon State University.

// Affirms that the object contains all required fields of the provided schema.
// Returns true if so, false otherwise.
exports.validateAgainstSchema = function (obj, schema) {
  return obj && Object.keys(schema).every(
    field => !schema[field].required || obj[field]
  );
};

// Creates a new object containing only relevant fields of the provided schema.
exports.extractValidFields = function (obj, schema) {
  let validObj = {};
  Object.keys(schema).forEach((field) => {
    if (obj[field]) {
      validObj[field] = obj[field];
    }
  });
  return validObj;
};
