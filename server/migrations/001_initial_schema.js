const { ensureSchema, verifyBaselineSchema } = require('../src/db/schema');

module.exports = {
  checksumFiles: ['../src/db/schema.js'],
  up: connection => ensureSchema(connection),
  verifyBaseline: connection => verifyBaselineSchema(connection)
};
