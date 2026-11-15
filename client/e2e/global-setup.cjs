const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const { createRequire } = require('node:module');

const config = require('./test-config.cjs');
const serverRoot = path.resolve(__dirname, '../../server');
const serverRequire = createRequire(path.join(serverRoot, 'package.json'));
const mysql = serverRequire('mysql2/promise');
const bcrypt = serverRequire('bcryptjs');
serverRequire('dotenv').config({ path: path.join(serverRoot, '.env') });

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => {
      probe.close(error => error ? reject(error) : resolve());
    });
  });
}

module.exports = async function globalSetup() {
  const databaseName =
    `${config.databasePrefix}${randomUUID().replace(/-/g, '')}`;
  const configuredDatabase = process.env.DB_NAME || 'pulsewatch';
  let databaseCreated = false;
  let child;

  if (
    !new RegExp(`^${config.databasePrefix}[a-f0-9]{32}$`).test(databaseName) ||
    databaseName === configuredDatabase
  ) {
    throw new Error('Refusing to use a non-isolated browser test database.');
  }

  const fs = require('node:fs');
const tls = require('node:tls');

const caFile = process.env.DB_SSL_CA_FILE;

if (!caFile) {
  throw new Error('DB_SSL_CA_FILE is required for E2E database connections.');
}

const ca = fs.readFileSync(path.resolve(serverRoot, caFile), 'utf8');

// Validate the CA before opening any database connection.
tls.createSecureContext({ ca });

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
};

  const admin = await mysql.createConnection(connectionConfig);

  try {
    await assertPortAvailable(5010);
    await admin.execute(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    databaseCreated = true;
  } finally {
    await admin.end();
  }

  const cleanup = async () => {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 5000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    if (databaseCreated) {
      const cleanupConnection = await mysql.createConnection(connectionConfig);
      try {
        if (
          !new RegExp(`^${config.databasePrefix}[a-f0-9]{32}$`).test(databaseName) ||
          databaseName === configuredDatabase
        ) {
          throw new Error('Refusing to drop a database outside the isolated browser-test namespace.');
        }
        await cleanupConnection.execute(`DROP DATABASE \`${databaseName}\``);
      } finally {
        await cleanupConnection.end();
      }
    }
  };

  try {
    const { configure } = serverRequire('./src/config/env');
    const { runMigrations } = serverRequire('./src/db/migration-runner');
    configure({
      ...process.env,
      NODE_ENV: 'test',
      DB_NAME: databaseName,
      JWT_SECRET: config.jwtSecret,
    });

    const schemaConnection = await mysql.createConnection({
      ...connectionConfig,
      database: databaseName,
    });
    try {
      await runMigrations({
        connection: schemaConnection,
        databaseName,
      });
    } finally {
      await schemaConnection.end();
    }

    child = spawn(process.execPath, ['src/server.js'], {
      cwd: serverRoot,
      env: {
        ...process.env,
        DB_NAME: databaseName,
        JWT_SECRET: config.jwtSecret,
        PORT: '5010',
        CLIENT_ORIGIN: config.clientOrigin,
        NODE_ENV: 'test',
        MONITOR_WORKER_ENABLED: 'false',
        SKIP_EMAIL: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let serverOutput = '';
    child.stdout.on('data', chunk => {
      serverOutput += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      serverOutput += chunk.toString();
    });

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Test API exited early:\n${serverOutput}`);
      }
      try {
        const response = await fetch(`${config.apiOrigin}/api/health/live`);
        if (response.ok) break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const health = await fetch(`${config.apiOrigin}/api/health/live`).catch(() => null);
    if (!health?.ok) {
      throw new Error(`Timed out starting isolated test API:\n${serverOutput}`);
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(config.userPassword, 12);
    const testDatabase = await mysql.createConnection({
      ...connectionConfig,
      database: databaseName,
    });
    try {
      await testDatabase.execute(
        `
        INSERT INTO users (id, name, email, password_hash, email_verified)
        VALUES (?, 'Phase 5 Browser Test', ?, ?, 1)
        `,
        [userId, config.userEmail, passwordHash]
      );
      await testDatabase.execute(
        'INSERT INTO organizations (user_id, name) VALUES (?, ?)',
        [userId, 'Browser Test Organization']
      );
    } finally {
      await testDatabase.end();
    }

    const login = await fetch(`${config.apiOrigin}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: config.clientOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: config.userEmail,
        password: config.userPassword,
      }),
    });
    if (!login.ok) {
      throw new Error(`Unable to seed browser session: ${await login.text()}`);
    }
    const sessionCookie = login.headers.get('set-cookie')?.split(';', 1)[0];
    if (!sessionCookie) {
      throw new Error('Test login did not set a session cookie.');
    }

    const createPage = await fetch(`${config.apiOrigin}/api/status-pages`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookie,
        Origin: config.clientOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'E2E Public Status', slug: 'e2e-public' }),
    });
    const created = await createPage.json();
    if (!createPage.ok) {
      throw new Error(`Unable to seed public status page: ${JSON.stringify(created)}`);
    }

    const publishPage = await fetch(
      `${config.apiOrigin}/api/status-pages/${created.data.id}/publish`,
      {
        method: 'PATCH',
        headers: {
          Cookie: sessionCookie,
          Origin: config.clientOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: true }),
      }
    );
    if (!publishPage.ok) {
      throw new Error(`Unable to publish browser status page: ${await publishPage.text()}`);
    }
  } catch (error) {
    await cleanup();
    throw error;
  }

  return cleanup;
};
