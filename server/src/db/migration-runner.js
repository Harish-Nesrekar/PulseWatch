const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const TRACKING_TABLE = 'pulsewatch_schema_migrations';
const MIGRATIONS_DIRECTORY = path.resolve(__dirname, '../../migrations');
const SCHEMA_CONFIRMATION = 'I_HAVE_VERIFIED_SCHEMA_MATCH';

function assertDatabaseName(databaseName) {
  if (
    typeof databaseName !== 'string' ||
    !/^[A-Za-z0-9_]{1,64}$/.test(databaseName) ||
    /[\r\n]/.test(databaseName)
  ) {
    throw new Error('A valid explicit database name is required.');
  }
}

function checksumFiles(migrationPath, extraFiles = []) {
  if (!Array.isArray(extraFiles) || extraFiles.some(file => typeof file !== 'string')) {
    throw new Error(`Invalid checksum file list for ${path.basename(migrationPath)}.`);
  }

  const files = [...new Set([
    migrationPath,
    ...extraFiles.map(file => path.resolve(path.dirname(migrationPath), file))
  ])].sort();
  const checksum = crypto.createHash('sha256');

  for (const file of files) {
    const contents = fs.readFileSync(file);
    checksum.update(path.relative(path.dirname(migrationPath), file));
    checksum.update('\0');
    checksum.update(contents);
    checksum.update('\0');
  }

  return checksum.digest('hex');
}

function discoverMigrations(directory = MIGRATIONS_DIRECTORY) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const migrations = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

    const match = /^(\d{3})_([a-z0-9][a-z0-9_-]*)\.js$/.exec(entry.name);
    if (!match) {
      throw new Error(`Migration filename must use NNN_name.js: ${entry.name}`);
    }

    const filePath = path.join(directory, entry.name);
    const implementation = require(filePath);
    if (!implementation || typeof implementation.up !== 'function') {
      throw new Error(`Migration ${entry.name} must export an up(connection) function.`);
    }

    migrations.push({
      version: Number(match[1]),
      name: match[2],
      filePath,
      checksum: checksumFiles(filePath, implementation.checksumFiles),
      up: implementation.up,
      verifyBaseline: implementation.verifyBaseline
    });
  }

  migrations.sort((left, right) => left.version - right.version);

  const seenVersions = new Set();
  migrations.forEach((migration, index) => {
    if (seenVersions.has(migration.version)) {
      throw new Error(`Duplicate migration version ${migration.version}.`);
    }
    seenVersions.add(migration.version);

    if (migration.version !== index + 1) {
      throw new Error('Migration versions must be sequential, starting at 001.');
    }
  });

  return migrations;
}

async function queryRows(connection, sql, values = []) {
  const [rows] = await connection.query(sql, values);
  return rows;
}

async function assertConnectedDatabase(connection, databaseName) {
  assertDatabaseName(databaseName);
  const rows = await queryRows(connection, 'SELECT DATABASE() AS database_name');

  if (rows[0]?.database_name !== databaseName) {
    throw new Error('The active MySQL connection does not match the confirmed database.');
  }
}

async function advisoryLock(connection, databaseName, timeoutSeconds) {
  const suffix = crypto.createHash('sha256').update(databaseName).digest('hex').slice(0, 40);
  const lockName = `pw:mig:${suffix}`;
  const rows = await queryRows(connection, 'SELECT GET_LOCK(?, ?) AS acquired', [
    lockName,
    timeoutSeconds
  ]);

  if (Number(rows[0]?.acquired) !== 1) {
    throw new Error('Could not acquire the database migration lock.');
  }

  return async () => {
    const releaseRows = await queryRows(connection, 'SELECT RELEASE_LOCK(?) AS released', [
      lockName
    ]);
    if (Number(releaseRows[0]?.released) !== 1) {
      throw new Error('Could not release the database migration lock.');
    }
  };
}

async function withAdvisoryLock(connection, databaseName, callback, timeoutSeconds = 30) {
  const release = await advisoryLock(connection, databaseName, timeoutSeconds);
  let operationError;

  try {
    return await callback();
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await release();
    } catch (releaseError) {
      if (operationError) {
        throw new AggregateError(
          [operationError, releaseError],
          'Migration operation failed and its advisory lock could not be released.'
        );
      }
      throw releaseError;
    }
  }
}

async function trackingTableExists(connection) {
  const rows = await queryRows(
    connection,
    `SELECT COUNT(*) AS table_count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [TRACKING_TABLE]
  );
  return Number(rows[0]?.table_count) > 0;
}

async function listOtherTables(connection) {
  return queryRows(
    connection,
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> ?
     ORDER BY TABLE_NAME`,
    [TRACKING_TABLE]
  );
}

async function createTrackingTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${TRACKING_TABLE}\` (
      version INT UNSIGNED NOT NULL,
      name VARCHAR(191) NOT NULL,
      checksum CHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL,
      started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      executed_at DATETIME(3) NULL,
      PRIMARY KEY (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function readHistory(connection) {
  return queryRows(
    connection,
    `SELECT version, name, checksum, status
     FROM \`${TRACKING_TABLE}\`
     ORDER BY version`
  );
}

function validateHistory(migrations, history) {
  const byVersion = new Map(migrations.map(migration => [migration.version, migration]));

  for (const record of history) {
    const migration = byVersion.get(Number(record.version));
    if (!migration) {
      throw new Error(`Applied migration ${record.version} is missing from this release.`);
    }
    if (record.name !== migration.name || record.checksum !== migration.checksum) {
      throw new Error(`Applied migration ${record.version} does not match its recorded checksum.`);
    }
    if (record.status !== 'applied') {
      throw new Error(
        `Migration ${record.version} is ${record.status}; inspect the schema before retrying.`
      );
    }
  }
}

function validateCurrentMigrations(migrations, history) {
  validateHistory(migrations, history);
  const recordedVersions = new Set(
    history.map(record => Number(record.version))
  );
  const missing = migrations
    .filter(migration => !recordedVersions.has(migration.version))
    .map(migration => String(migration.version).padStart(3, '0'));

  if (missing.length > 0) {
    throw new Error(`Required migrations have not been applied: ${missing.join(', ')}.`);
  }

  return migrations.at(-1)?.version ?? 0;
}

async function ensureTrackingTableForMigrate(connection) {
  const exists = await trackingTableExists(connection);
  const otherTables = await listOtherTables(connection);

  if (!exists) {
    if (otherTables.length > 0) {
      throw new Error(
        'This database is non-empty and has no migration history; verify and baseline it explicitly.'
      );
    }
    await createTrackingTable(connection);
    return [];
  }

  const history = await readHistory(connection);
  if (history.length === 0 && otherTables.length > 0) {
    throw new Error(
      'This database has an empty migration history but existing tables; verify and baseline it explicitly.'
    );
  }
  return history;
}

async function runMigrations({
  connection,
  databaseName,
  migrations = discoverMigrations(),
  lockTimeoutSeconds = 30
}) {
  if (!connection) throw new Error('A MySQL connection is required.');
  assertDatabaseName(databaseName);

  return withAdvisoryLock(connection, databaseName, async () => {
    await assertConnectedDatabase(connection, databaseName);
    const history = await ensureTrackingTableForMigrate(connection);
    validateHistory(migrations, history);
    const appliedVersions = new Set(history.map(record => Number(record.version)));
    let newlyApplied = 0;

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) continue;

      await connection.execute(
        `INSERT INTO \`${TRACKING_TABLE}\`
          (version, name, checksum, status)
         VALUES (?, ?, ?, 'running')`,
        [migration.version, migration.name, migration.checksum]
      );

      try {
        await migration.up(connection);
        await connection.execute(
          `UPDATE \`${TRACKING_TABLE}\`
           SET status = 'applied', executed_at = CURRENT_TIMESTAMP(3)
           WHERE version = ? AND checksum = ? AND status = 'running'`,
          [migration.version, migration.checksum]
        );
        newlyApplied += 1;
      } catch (error) {
        try {
          await connection.execute(
            `UPDATE \`${TRACKING_TABLE}\`
             SET status = 'failed'
             WHERE version = ? AND checksum = ? AND status = 'running'`,
            [migration.version, migration.checksum]
          );
        } catch (trackingError) {
          throw new AggregateError(
            [error, trackingError],
            `Migration ${migration.version} failed and its failure status could not be recorded.`
          );
        }
        throw new Error(
          `Migration ${migration.version} failed. Its status is recorded as failed; inspect the schema before any retry.`,
          { cause: error }
        );
      }
    }

    return { applied: newlyApplied, total: migrations.length };
  }, lockTimeoutSeconds);
}

async function baselineExistingSchema({
  connection,
  databaseName,
  migrations = discoverMigrations(),
  version,
  confirmedDatabase,
  schemaConfirmation,
  backupConfirmed
}) {
  if (!connection) throw new Error('A MySQL connection is required.');
  assertDatabaseName(databaseName);
  if (confirmedDatabase !== databaseName) {
    throw new Error('Baseline requires an exact database-name confirmation.');
  }
  if (schemaConfirmation !== SCHEMA_CONFIRMATION || backupConfirmed !== true) {
    throw new Error('Baseline requires a verified schema match and a verified backup.');
  }

  const migration = migrations.find(item => item.version === Number(version));
  if (!migration || typeof migration.verifyBaseline !== 'function') {
    throw new Error('The selected migration does not support verified baselining.');
  }

  return withAdvisoryLock(connection, databaseName, async () => {
    await assertConnectedDatabase(connection, databaseName);
    const exists = await trackingTableExists(connection);
    const otherTables = await listOtherTables(connection);
    if (otherTables.length === 0) {
      throw new Error('An empty database cannot be marked as an existing-schema baseline.');
    }

    const history = exists ? await readHistory(connection) : [];
    if (history.length > 0) {
      throw new Error('This database already has migration history and cannot be baselined.');
    }

    await migration.verifyBaseline(connection);
    if (!exists) await createTrackingTable(connection);

    await connection.execute(
      `INSERT INTO \`${TRACKING_TABLE}\`
        (version, name, checksum, status, executed_at)
       VALUES (?, ?, ?, 'applied', CURRENT_TIMESTAMP(3))`,
      [migration.version, migration.name, migration.checksum]
    );

    return { baselined: migration.version };
  });
}

module.exports = {
  MIGRATIONS_DIRECTORY,
  SCHEMA_CONFIRMATION,
  TRACKING_TABLE,
  baselineExistingSchema,
  checksumFiles,
  discoverMigrations,
  runMigrations,
  validateCurrentMigrations,
  validateHistory
};
