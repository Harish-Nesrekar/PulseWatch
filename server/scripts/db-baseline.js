const {
  closeConnection,
  migrationConnectionOptions,
  mysql,
  parseArguments,
  requireConfirmedDatabase,
  runtimeConfig
} = require('./db-cli-config');
const {
  baselineExistingSchema
} = require('../src/db/migration-runner');

async function main() {
  const config = runtimeConfig();
  const options = parseArguments(process.argv.slice(2), [
    'database',
    'confirm-database',
    'version',
    'confirm-schema-match',
    'confirm-backup'
  ]);
  requireConfirmedDatabase(config, options);

  if (!/^\d{3}$/.test(options.version)) {
    throw new Error('Baseline version must be a three-digit migration version.');
  }

  let connection;
  try {
    connection = await mysql.createConnection(
      migrationConnectionOptions(config)
    );
    const result = await baselineExistingSchema({
      connection,
      databaseName: config.dbName,
      version: Number(options.version),
      confirmedDatabase: options['confirm-database'],
      schemaConfirmation: options['confirm-schema-match'],
      backupConfirmed: options['confirm-backup'] === 'I_HAVE_VERIFIED_BACKUP'
    });
    console.log(`Existing schema recorded at migration ${String(result.baselined).padStart(3, '0')}.`);
  } finally {
    await closeConnection(connection);
  }
}

main().catch(error => {
  console.error(`Baseline command failed: ${error.message}`);
  process.exitCode = 1;
});
