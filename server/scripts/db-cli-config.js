const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const mysql = require('mysql2/promise');
const { configure } = require('../src/config/env');

function runtimeConfig() {
  return configure(process.env);
}

function migrationConnectionOptions(config, environment = process.env) {
  if (!environment.MIGRATION_DB_USER || !environment.MIGRATION_DB_PASSWORD) {
    throw new Error('MIGRATION_DB_USER and MIGRATION_DB_PASSWORD are required for migration commands.');
  }
  if (environment.MIGRATION_DB_USER === config.dbUser) {
    throw new Error('MIGRATION_DB_USER must be distinct from the runtime DB_USER.');
  }

  return {
    host: config.dbHost,
    port: config.dbPort,
    user: environment.MIGRATION_DB_USER,
    password: environment.MIGRATION_DB_PASSWORD,
    database: config.dbName,
    ...(config.dbSsl ? { ssl: config.dbSsl } : {}),
    charset: 'utf8mb4'
  };
}

function parseArguments(args, requiredKeys) {
  const parsed = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value || parsed.has(key.slice(2))) {
      throw new Error('Invalid command arguments.');
    }
    parsed.set(key.slice(2), value);
  }

  if (
    parsed.size !== requiredKeys.length ||
    requiredKeys.some(key => !parsed.has(key))
  ) {
    throw new Error(`Required arguments: ${requiredKeys.map(key => `--${key}`).join(' ')}`);
  }
  return Object.fromEntries(parsed);
}

function requireConfirmedDatabase(config, options) {
  if (
    options.database !== config.dbName ||
    options['confirm-database'] !== config.dbName
  ) {
    throw new Error('The explicit database and its confirmation must exactly match DB_NAME.');
  }
}

async function closeConnection(connection) {
  if (connection) await connection.end();
}

module.exports = {
  closeConnection,
  migrationConnectionOptions,
  mysql,
  parseArguments,
  requireConfirmedDatabase,
  runtimeConfig
};
