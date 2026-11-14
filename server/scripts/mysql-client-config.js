const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function readDatabaseConfig(environment, prefix, requireDatabase = false) {
  const host = environment[`${prefix}_DB_HOST`];
  const user = environment[`${prefix}_DB_USER`];
  const password = environment[`${prefix}_DB_PASSWORD`];
  const database = environment[`${prefix}_DB_NAME`];
  const portText = environment[`${prefix}_DB_PORT`] || '3306';
  const port = Number(portText);

  if (!host || !user || !password) {
    throw new Error(
      `${prefix}_DB_HOST, ${prefix}_DB_USER, and ${prefix}_DB_PASSWORD are required.`
    );
  }
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${prefix}_DB_PORT must be an integer from 1 to 65535.`);
  }
  const validDatabase = typeof database === 'string' &&
    /^[A-Za-z0-9_]{1,64}$/.test(database) &&
    !/[\r\n]/.test(database);
  if (requireDatabase && !validDatabase) {
    throw new Error(`${prefix}_DB_NAME must be a valid MySQL database name.`);
  }
  if (database && !validDatabase) {
    throw new Error(`${prefix}_DB_NAME must be a valid MySQL database name.`);
  }
  for (const [label, value] of Object.entries({ host, user, password })) {
    if (/[\0\r\n]/.test(value)) {
      throw new Error(`${prefix}_DB_${label.toUpperCase()} contains unsupported control characters.`);
    }
  }

  const caFile = environment[`${prefix}_DB_SSL_CA_FILE`];
  if (environment.NODE_ENV === 'production' && !caFile) {
    throw new Error(`${prefix}_DB_SSL_CA_FILE is required in production.`);
  }
  if (caFile) {
    try {
      fs.accessSync(caFile, fs.constants.R_OK);
    } catch {
      throw new Error(`${prefix}_DB_SSL_CA_FILE must be a readable certificate file.`);
    }
  }

  return { host, user, password, database, port, caFile };
}

function escapeOptionValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function optionFileContent(config) {
  return [
    '[client]',
    `host=${escapeOptionValue(config.host)}`,
    `port=${config.port}`,
    `user=${escapeOptionValue(config.user)}`,
    `password=${escapeOptionValue(config.password)}`,
    ''
  ].join('\n');
}

function createPrivateOptionFile(config) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pulsewatch-mysql-client-'));
  fs.chmodSync(directory, 0o700);
  const filePath = path.join(directory, 'client.cnf');

  try {
    fs.writeFileSync(filePath, optionFileContent(config), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600
    });
    fs.chmodSync(filePath, 0o600);
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }

  return {
    filePath,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true })
  };
}

function tlsClientArguments(config) {
  if (!config.caFile) return [];
  return ['--ssl-mode=VERIFY_IDENTITY', `--ssl-ca=${config.caFile}`];
}

function sanitizedClientEnvironment(environment) {
  const result = { ...environment };
  for (const key of Object.keys(result)) {
    if (
      key.toUpperCase() === 'MYSQL_PWD' ||
      /(?:PASSWORD|PASS|SECRET|TOKEN|API_KEY)$/i.test(key)
    ) {
      delete result[key];
    }
  }
  return result;
}

module.exports = {
  createPrivateOptionFile,
  escapeOptionValue,
  optionFileContent,
  readDatabaseConfig,
  sanitizedClientEnvironment,
  tlsClientArguments
};
