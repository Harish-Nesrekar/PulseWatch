
const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const { configure } = require('./config/env');
const config = configure(process.env);
const logger = require('./utils/logger');
const mysql = require('mysql2/promise');
const {
  discoverMigrations,
  TRACKING_TABLE,
  validateCurrentMigrations
} = require('./db/migration-runner');

const DB_NAME = config.dbName;

const pool = mysql.createPool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: DB_NAME,

  waitForConnections: true,
  connectionLimit: config.dbConnectionLimit,
  queueLimit: 0,

  ...(config.dbSsl ? { ssl: config.dbSsl } : {}),
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    ...(config.dbSsl ? { ssl: config.dbSsl } : {}),
    charset: 'utf8mb4'
  });

  try {
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    logger.info('database', 'database verified', { database: DB_NAME });
  } finally {
    await connection.end();
  }
}

/**
 * Check whether MySQL is reachable.
 */
async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.query('SELECT 1');
    if (config.isProduction) {
      const migrationVersion = await verifyProductionSchema(connection);
      logger.info('database', 'production schema verified', {
        migrationVersion
      });
    }

    logger.info('database', 'database connection verified');

    return true;
  } catch (error) {
    logger.error('database', 'database connection failed', { error });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function verifyProductionSchema(connection) {
  try {
    const [history] = await connection.query(
      `SELECT version, name, checksum, status
       FROM \`${TRACKING_TABLE}\`
       ORDER BY version`
    );
    return validateCurrentMigrations(discoverMigrations(), history);
  } catch {
    throw new Error(
      'Production database migrations are incomplete or incompatible; apply the explicit migrations before starting.'
    );
  }
}

/**
 * Gracefully close all MySQL connections.
 */
async function closePool() {
  await pool.end();
  logger.info('database', 'connection pool closed');
}

module.exports = {
  pool,
  testConnection,
  verifyProductionSchema,
  ensureDatabaseExists,
  closePool
};
