
const { getConfig } = require('../config/env');

async function ensureColumn(connection, table, column, definition) {
  const [columns] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);

  const exists = columns.some(item => item.Field === column);

  if (!exists) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );

    console.log(`Schema migration: added ${table}.${column}`);
  }
}

async function ensureIndex(connection, table, indexName, definition) {
  const [indexes] = await connection.query(`SHOW INDEX FROM \`${table}\``);

  const exists = indexes.some(index => index.Key_name === indexName);

  if (!exists) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` ${definition}`
    );

    console.log(`Schema migration: added ${indexName}`);
  }
}

async function ensureUniqueIndex(connection, table, indexName, definition) {
  const [indexes] = await connection.query(`SHOW INDEX FROM \`${table}\``);

  const exists = indexes.some(index => index.Key_name === indexName);

  if (!exists) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${indexName}\` ${definition}`
    );

    console.log(`Schema migration: added unique index ${indexName}`);
  }
}

async function ensureCheckConstraint(connection, table, constraintName, expression) {
  const [constraints] = await connection.execute(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
      AND CONSTRAINT_TYPE = 'CHECK'
    `,
    [table, constraintName]
  );

  if (constraints.length === 0) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\` CHECK (${expression})`
    );
  }
}

async function ensureForeignKey(
  connection,
  table,
  constraintName,
  column,
  referencedTable,
  referencedColumn,
  onDelete
) {
  const [constraints] = await connection.execute(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND REFERENCED_TABLE_NAME = ?
      AND REFERENCED_COLUMN_NAME = ?
    LIMIT 1
    `,
    [table, column, referencedTable, referencedColumn]
  );

  if (constraints.length === 0) {
    await connection.query(
      `ALTER TABLE \`${table}\`
       ADD CONSTRAINT \`${constraintName}\`
       FOREIGN KEY (\`${column}\`)
       REFERENCES \`${referencedTable}\` (\`${referencedColumn}\`)
       ON DELETE ${onDelete}`
    );
  }
}

async function ensureSchema(connection) {
  connection ||= require('../db').pool;
  const expectedDatabaseName = getConfig().dbName;

  const statements = [
    `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      auth_version INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS organizations (
      user_id VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL DEFAULT 'My Organization',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_organizations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS email_otps (
      user_id VARCHAR(191) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at VARCHAR(40) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      last_sent_at VARCHAR(40) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_email_otps_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      user_id VARCHAR(191) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at VARCHAR(40) NOT NULL,
      sent_at VARCHAR(40) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_password_reset_otps_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS monitors (
      id VARCHAR(191) NOT NULL,
      user_id VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      method VARCHAR(10) NOT NULL DEFAULT 'GET',
      interval_seconds INT NOT NULL DEFAULT 60,
      expected_status INT NOT NULL DEFAULT 200,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      last_checked_at DATETIME(3) NULL,
      last_status_code INT NULL,
      last_latency_ms INT NULL,
      consecutive_failures INT NOT NULL DEFAULT 0,
      consecutive_successes INT NOT NULL DEFAULT 0,
      failure_threshold INT NOT NULL DEFAULT 3,
      recovery_threshold INT NOT NULL DEFAULT 2,
      check_lease_token VARCHAR(191) NULL,
      check_lease_until DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_monitors_user (user_id),
      INDEX idx_monitors_active_due (is_active, last_checked_at),
      INDEX idx_monitors_check_lease (is_active, check_lease_until),
      CONSTRAINT chk_monitors_interval
        CHECK (interval_seconds IN (30, 60, 300, 600)),
      CONSTRAINT chk_monitors_expected_status
        CHECK (expected_status BETWEEN 100 AND 599),
      CONSTRAINT chk_monitors_method
        CHECK (method IN ('GET', 'HEAD')),
      CONSTRAINT chk_monitors_active
        CHECK (is_active IN (0, 1)),
      CONSTRAINT chk_monitors_status
        CHECK (status IN ('PENDING', 'UP', 'DOWN')),
      CONSTRAINT chk_monitors_failure_threshold
        CHECK (failure_threshold BETWEEN 1 AND 20),
      CONSTRAINT chk_monitors_recovery_threshold
        CHECK (recovery_threshold BETWEEN 1 AND 20),
      CONSTRAINT fk_monitors_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS checks (
      id VARCHAR(191) NOT NULL,
      monitor_id VARCHAR(191) NOT NULL,
      status VARCHAR(20) NOT NULL,
      status_code INT NULL,
      latency_ms INT NULL,
      error TEXT NULL,
      response_metadata JSON NULL,
      checked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_checks_monitor_time (monitor_id, checked_at),
      CONSTRAINT fk_checks_monitor
        FOREIGN KEY (monitor_id) REFERENCES monitors(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS incidents (
      id VARCHAR(191) NOT NULL,
      user_id VARCHAR(191) NOT NULL,
      monitor_id VARCHAR(191) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      resolved_at DATETIME(3) NULL,
      PRIMARY KEY (id),
      INDEX idx_incidents_user (user_id, started_at),
      INDEX idx_incidents_monitor_status (monitor_id, status),
      CONSTRAINT fk_incidents_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_incidents_monitor
        FOREIGN KEY (monitor_id) REFERENCES monitors(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS status_pages (
      id VARCHAR(191) NOT NULL,
      user_id VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(191) NOT NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_status_pages_slug (slug),
      INDEX idx_status_pages_user (user_id),
      CONSTRAINT fk_status_pages_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `
  ];

  try {
    const [databaseRows] = await connection.query(
      'SELECT DATABASE() AS database_name'
    );

    const databaseName = databaseRows[0]?.database_name;

    if (databaseName !== expectedDatabaseName) {
      throw new Error(
        `Expected database "${expectedDatabaseName}", connected to "${databaseName}"`
      );
    }

    for (const statement of statements) {
      await connection.query(statement);
    }

    const [userColumns] = await connection.query('SHOW COLUMNS FROM users');

    const requiredUserColumns = [
      'id',
      'name',
      'email',
      'password_hash',
      'email_verified',
      'created_at'
    ];

    const existingUserColumns = userColumns.map(column => column.Field);

    const missingColumns = requiredUserColumns.filter(
      column => !existingUserColumns.includes(column)
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Users table is missing columns: ${missingColumns.join(', ')}`
      );
    }

    await ensureUniqueIndex(connection, 'users', 'uq_users_email', '(email)');
    await ensureIndex(connection, 'monitors', 'idx_monitors_user', '(user_id)');
    await ensureIndex(
      connection,
      'monitors',
      'idx_monitors_active_due',
      '(is_active, last_checked_at)'
    );
    await ensureIndex(
      connection,
      'checks',
      'idx_checks_monitor_time',
      '(monitor_id, checked_at)'
    );
    await ensureIndex(
      connection,
      'incidents',
      'idx_incidents_user',
      '(user_id, started_at)'
    );
    await ensureIndex(
      connection,
      'incidents',
      'idx_incidents_monitor_status',
      '(monitor_id, status)'
    );

    await ensureForeignKey(
      connection,
      'monitors',
      'fk_monitors_user',
      'user_id',
      'users',
      'id',
      'CASCADE'
    );
    await ensureForeignKey(
      connection,
      'checks',
      'fk_checks_monitor',
      'monitor_id',
      'monitors',
      'id',
      'CASCADE'
    );
    await ensureForeignKey(
      connection,
      'incidents',
      'fk_incidents_user',
      'user_id',
      'users',
      'id',
      'CASCADE'
    );
    await ensureForeignKey(
      connection,
      'incidents',
      'fk_incidents_monitor',
      'monitor_id',
      'monitors',
      'id',
      'CASCADE'
    );

    // Existing monitor migrations.
    await ensureColumn(
      connection,
      'monitors',
      'updated_at',
      `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
       ON UPDATE CURRENT_TIMESTAMP(3)`
    );

    await ensureColumn(
      connection,
      'users',
      'auth_version',
      'INT UNSIGNED NOT NULL DEFAULT 0'
    );

    // Failure and recovery thresholds.
    await ensureColumn(
      connection,
      'monitors',
      'consecutive_successes',
      'INT NOT NULL DEFAULT 0'
    );

    await ensureColumn(
      connection,
      'monitors',
      'failure_threshold',
      'INT NOT NULL DEFAULT 3'
    );

    await ensureColumn(
      connection,
      'monitors',
      'recovery_threshold',
      'INT NOT NULL DEFAULT 2'
    );

    // Database-backed check coordination.
    await ensureColumn(
      connection,
      'monitors',
      'check_lease_token',
      'VARCHAR(191) NULL'
    );

    await ensureColumn(
      connection,
      'monitors',
      'check_lease_until',
      'DATETIME(3) NULL'
    );

    await ensureColumn(
      connection,
      'checks',
      'response_metadata',
      'JSON NULL'
    );

    await ensureIndex(
      connection,
      'monitors',
      'idx_monitors_check_lease',
      '(is_active, check_lease_until)'
    );

    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_interval',
      'interval_seconds IN (30, 60, 300, 600)'
    );
    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_expected_status',
      'expected_status BETWEEN 100 AND 599'
    );
    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_method',
      "method IN ('GET', 'HEAD')"
    );
    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_active',
      'is_active IN (0, 1)'
    );
    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_status',
      "status IN ('PENDING', 'UP', 'DOWN')"
    );
    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_failure_threshold',
      'failure_threshold BETWEEN 1 AND 20'
    );
    await ensureCheckConstraint(
      connection,
      'monitors',
      'chk_monitors_recovery_threshold',
      'recovery_threshold BETWEEN 1 AND 20'
    );

    // Incident acknowledgement and resolution audit fields.
    await ensureColumn(
      connection,
      'incidents',
      'acknowledged_at',
      'DATETIME(3) NULL'
    );

    await ensureColumn(
      connection,
      'incidents',
      'acknowledged_by',
      'VARCHAR(191) NULL'
    );

    await ensureColumn(
      connection,
      'incidents',
      'resolution_type',
      'VARCHAR(30) NULL'
    );

    await ensureColumn(
      connection,
      'incidents',
      'resolved_by',
      'VARCHAR(191) NULL'
    );

    await ensureColumn(
      connection,
      'incidents',
      'resolution_note',
      'TEXT NULL'
    );

    console.log('PulseWatch MySQL schema is ready.');

    return true;
  } catch (error) {
    console.error(
      'MySQL schema initialization failed:',
      error.message
    );

    throw error;
  }
}

const baselineColumns = {
  users: [
    'id', 'name', 'email', 'password_hash', 'email_verified', 'auth_version',
    'created_at', 'updated_at'
  ],
  organizations: ['user_id', 'name', 'updated_at'],
  email_otps: [
    'user_id', 'otp_hash', 'expires_at', 'attempts', 'last_sent_at', 'created_at'
  ],
  password_reset_otps: [
    'user_id', 'otp_hash', 'expires_at', 'sent_at', 'attempts', 'created_at'
  ],
  monitors: [
    'id', 'user_id', 'name', 'url', 'method', 'interval_seconds',
    'expected_status', 'is_active', 'status', 'last_checked_at',
    'last_status_code', 'last_latency_ms', 'consecutive_failures',
    'consecutive_successes', 'failure_threshold', 'recovery_threshold',
    'check_lease_token', 'check_lease_until', 'created_at', 'updated_at'
  ],
  checks: [
    'id', 'monitor_id', 'status', 'status_code', 'latency_ms', 'error',
    'response_metadata', 'checked_at'
  ],
  incidents: [
    'id', 'user_id', 'monitor_id', 'title', 'message', 'status', 'started_at',
    'resolved_at', 'acknowledged_at', 'acknowledged_by', 'resolution_type',
    'resolved_by', 'resolution_note'
  ],
  status_pages: [
    'id', 'user_id', 'name', 'slug', 'is_published', 'created_at'
  ]
};

async function verifyBaselineSchema(connection) {
  connection ||= require('../db').pool;
  const expectedDatabaseName = getConfig().dbName;
  const [databaseRows] = await connection.query(
    'SELECT DATABASE() AS database_name'
  );
  if (databaseRows[0]?.database_name !== expectedDatabaseName) {
    throw new Error('Baseline schema verification connected to the wrong database.');
  }

  const expectedTables = Object.keys(baselineColumns).sort();
  const [tableRows] = await connection.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME <> 'pulsewatch_schema_migrations'
     ORDER BY TABLE_NAME`
  );
  const actualTables = tableRows.map(row => row.table_name).sort();
  if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
    throw new Error('Existing tables do not exactly match the known PulseWatch baseline.');
  }

  const [columnRows] = await connection.query(
    `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${expectedTables.map(() => '?').join(', ')})`,
    expectedTables
  );
  const actualColumns = new Map();
  for (const row of columnRows) {
    if (!actualColumns.has(row.table_name)) {
      actualColumns.set(row.table_name, new Set());
    }
    actualColumns.get(row.table_name).add(row.column_name);
  }

  for (const [table, requiredColumns] of Object.entries(baselineColumns)) {
    const columns = actualColumns.get(table) || new Set();
    const missing = requiredColumns.filter(column => !columns.has(column));
    if (missing.length > 0) {
      throw new Error(`Existing table ${table} is missing baseline columns.`);
    }
  }
}

module.exports = { ensureSchema, verifyBaselineSchema };
