const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  createPrivateOptionFile,
  readDatabaseConfig,
  sanitizedClientEnvironment,
  tlsClientArguments
} = require('./mysql-client-config');

function timestampForFilename(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function buildDumpArguments(config, credentialsFile) {
  return [
    `--defaults-extra-file=${credentialsFile}`,
    ...tlsClientArguments(config),
    '--single-transaction',
    '--hex-blob',
    '--set-gtid-purged=OFF',
    '--routines',
    '--triggers',
    '--events',
    config.database
  ];
}

function createBackup({
  environment = process.env,
  date = new Date(),
  runCommand = spawnSync,
  fileSystem = fs,
  scriptDirectory = __dirname
} = {}) {
  const config = readDatabaseConfig(environment, 'BACKUP', true);
  const backupDirectory = path.resolve(
    environment.BACKUP_DIR || path.join(scriptDirectory, '../backups/mysql')
  );
  fileSystem.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const directoryMode = fileSystem.statSync(backupDirectory).mode & 0o777;
  if ((directoryMode & 0o077) !== 0) {
    throw new Error('BACKUP_DIR must not be accessible to group or other users.');
  }

  const filename = `${config.database}-${timestampForFilename(date)}.sql`;
  const backupPath = path.join(backupDirectory, filename);
  const temporaryPath = `${backupPath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.partial`;
  const credentials = createPrivateOptionFile(config);
  let outputDescriptor;
  let succeeded = false;

  try {
    outputDescriptor = fileSystem.openSync(temporaryPath, 'wx', 0o600);
    fileSystem.writeSync(
      outputDescriptor,
      '-- PulseWatch MySQL backup v1; database context is supplied only by the restore target.\n'
    );

    const result = runCommand(
      'mysqldump',
      buildDumpArguments(config, credentials.filePath),
      {
        env: sanitizedClientEnvironment(environment),
        stdio: ['ignore', outputDescriptor, 'inherit']
      }
    );
    if (result.error || result.status !== 0) {
      throw new Error('mysqldump failed; the incomplete backup was not kept.');
    }

    fileSystem.fsyncSync(outputDescriptor);
    fileSystem.closeSync(outputDescriptor);
    outputDescriptor = undefined;
    fileSystem.linkSync(temporaryPath, backupPath);
    fileSystem.unlinkSync(temporaryPath);
    succeeded = true;
    return backupPath;
  } finally {
    if (outputDescriptor !== undefined) fileSystem.closeSync(outputDescriptor);
    credentials.cleanup();
    if (!succeeded) {
      try {
        fileSystem.unlinkSync(temporaryPath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
}

if (require.main === module) {
  try {
    console.log(`MySQL backup created: ${createBackup()}`);
  } catch (error) {
    console.error(`MySQL backup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildDumpArguments, createBackup, timestampForFilename };
