const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');
const {
  createPrivateOptionFile,
  readDatabaseConfig,
  sanitizedClientEnvironment,
  tlsClientArguments
} = require('./mysql-client-config');

const RESTORE_TARGET_PREFIX = 'pulsewatch_restore_test_';
const BACKUP_HEADER =
  '-- PulseWatch MySQL backup v1; database context is supplied only by the restore target.';

function validateRestoreTarget(target, confirmation) {
  if (
    typeof target !== 'string' ||
    target.length !== RESTORE_TARGET_PREFIX.length + 32 ||
    !new RegExp(`^${RESTORE_TARGET_PREFIX}[a-f0-9]{32}$`).test(target) ||
    confirmation !== target
  ) {
    throw new Error(
      'Restore target must be a new pulsewatch_restore_test_<32 lowercase hex> database and be confirmed exactly.'
    );
  }
}

async function assertDatabaseDoesNotExist(connection, databaseName) {
  const [rows] = await connection.execute(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [databaseName]
  );
  if (rows.length > 0) {
    throw new Error('Restore target already exists; refusing to restore into an existing database.');
  }
}

async function createRestoreDatabase(connection, databaseName) {
  await connection.query(
    `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
}

async function validateBackupFile(backupPath) {
  const stat = fs.lstatSync(backupPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('Backup path must be a regular, non-symlink file.');
  }

  const file = await fs.promises.open(backupPath, 'r');
  let header;
  try {
    const buffer = Buffer.alloc(Buffer.byteLength(BACKUP_HEADER) + 1);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    header = buffer.subarray(0, bytesRead).toString('utf8').split(/\r?\n/, 1)[0];
  } finally {
    await file.close();
  }

  if (header !== BACKUP_HEADER) {
    throw new Error('Restore accepts only PulseWatch database-less backup files.');
  }

  let carry = '';
  const forbiddenPatterns = [
    /\b(?:CREATE|DROP)\s+(?:DATABASE|SCHEMA)\b/i,
    /\bUSE\s+[`'"]?[A-Za-z0-9_]+/i,
    /\b(?:CREATE|ALTER|DROP|TRUNCATE)\s+(?:(?:TEMPORARY\s+)?TABLE|VIEW|TRIGGER|PROCEDURE|FUNCTION|EVENT)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?`?[A-Za-z0-9_]+`?\s*\.\s*`?[A-Za-z0-9_]+`?/i,
    /\b(?:INSERT(?:\s+IGNORE)?\s+INTO|REPLACE\s+INTO|UPDATE|DELETE\s+FROM|REFERENCES|CALL|FROM|JOIN)\s+`?[A-Za-z0-9_]+`?\s*\.\s*`?[A-Za-z0-9_]+`?/i
  ];
  for await (const chunk of fs.createReadStream(backupPath)) {
    const text = carry + chunk.toString('utf8');
    if (forbiddenPatterns.some(pattern => pattern.test(text))) {
      throw new Error('Backup contains a database-selection or database-DDL statement.');
    }
    carry = text.slice(-128);
  }
}

function restoreArguments(config, credentialsFile, target) {
  return [
    `--defaults-extra-file=${credentialsFile}`,
    ...tlsClientArguments(config),
    `--database=${target}`
  ];
}

function runMysqlImport(args, backupPath, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn('mysql', args, {
      env: sanitizedClientEnvironment(environment),
      stdio: ['pipe', 'ignore', 'inherit']
    });
    const input = fs.createReadStream(backupPath);
    let settled = false;

    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    input.on('error', error => {
      child.stdin.destroy();
      child.kill();
      fail(new Error(`Could not read the backup file: ${error.message}`));
    });
    child.stdin.on('error', () => {
      fail(new Error('The mysql restore client stopped accepting the backup.'));
    });
    child.on('error', () => fail(new Error('Could not start the mysql restore client.')));
    child.on('close', code => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else reject(new Error(`mysql restore failed with exit code ${code}. The isolated target was left for inspection.`));
    });
    input.pipe(child.stdin);
  });
}

async function restoreToNewDatabase({
  backupPath,
  target,
  confirmation,
  environment = process.env,
  connect = mysql.createConnection,
  runImport = runMysqlImport
}) {
  validateRestoreTarget(target, confirmation);
  await validateBackupFile(backupPath);
  const config = readDatabaseConfig(environment, 'RESTORE');
  const credentials = createPrivateOptionFile(config);
  let connection;
  let databaseCreated = false;

  try {
    connection = await connect({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      ...(config.caFile
        ? { ssl: { ca: fs.readFileSync(config.caFile, 'utf8'), rejectUnauthorized: true } }
        : {})
    });
    await assertDatabaseDoesNotExist(connection, target);
    await createRestoreDatabase(connection, target);
    databaseCreated = true;
    await connection.end();
    connection = undefined;

    await runImport(
      restoreArguments(config, credentials.filePath, target),
      backupPath,
      sanitizedClientEnvironment(environment)
    );
    return { target, databaseCreated };
  } catch (error) {
    if (databaseCreated) {
      throw new Error(
        `Restore failed after creating the isolated target ${target}; leave it intact for inspection. ${error.message}`,
        { cause: error }
      );
    }
    throw error;
  } finally {
    if (connection) await connection.end();
    credentials.cleanup();
  }
}

function parseArguments(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value || values.has(key.slice(2))) {
      throw new Error('Invalid restore command arguments.');
    }
    values.set(key.slice(2), value);
  }
  if (
    values.size !== 3 ||
    !values.has('backup') ||
    !values.has('target') ||
    !values.has('confirm-target')
  ) {
    throw new Error('Required arguments: --backup <file> --target <new-database> --confirm-target <same-name>');
  }
  return Object.fromEntries(values);
}

if (require.main === module) {
  (async () => {
    const options = parseArguments(process.argv.slice(2));
    const result = await restoreToNewDatabase({
      backupPath: path.resolve(options.backup),
      target: options.target,
      confirmation: options['confirm-target']
    });
    console.log(`Backup restored into new isolated database: ${result.target}`);
  })().catch(error => {
    console.error(`MySQL restore failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertDatabaseDoesNotExist,
  createRestoreDatabase,
  parseArguments,
  restoreArguments,
  restoreToNewDatabase,
  validateBackupFile,
  validateRestoreTarget
};
