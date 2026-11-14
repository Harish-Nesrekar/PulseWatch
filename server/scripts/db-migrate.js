const {
  closeConnection,
  migrationConnectionOptions,
  mysql,
  parseArguments,
  requireConfirmedDatabase,
  runtimeConfig
} = require('./db-cli-config');
const { runMigrations } = require('../src/db/migration-runner');

async function main() {
  const config = runtimeConfig();
  const options = parseArguments(process.argv.slice(2), [
    'database',
    'confirm-database'
  ]);
  requireConfirmedDatabase(config, options);

  let connection;
  try {
    connection = await mysql.createConnection(
      migrationConnectionOptions(config)
    );
    const result = await runMigrations({
      connection,
      databaseName: config.dbName
    });
    console.log(`Migrations complete: ${result.applied} applied.`);
  } finally {
    await closeConnection(connection);
  }
}

main().catch(error => {
  console.error(`Migration command failed: ${error.message}`);
  process.exitCode = 1;
});
