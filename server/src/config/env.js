
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const net = require('node:net');
const { z } = require('zod');

const integerSetting = (fallback, minimum, maximum) =>
  z.string()
    .regex(/^\d+$/, 'must be an integer')
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum))
    .default(String(fallback));

const optionalIntegerSetting = (minimum, maximum) =>
  z.string()
    .regex(/^\d+$/, 'must be an integer')
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum))
    .optional();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: integerSetting(5001, 1, 65535),
  CLIENT_ORIGIN: z.string().trim().optional(),
  TRUSTED_PROXY_IPS: z.string().optional(),

  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().trim().optional(),

  SESSION_COOKIE_MAX_AGE_MS: optionalIntegerSetting(
    60000,
    30 * 24 * 60 * 60 * 1000
  ),

  DB_HOST: z.string().trim().optional(),
  DB_PORT: integerSetting(3306, 1, 65535),
  DB_NAME: z.string().trim().optional(),
  DB_USER: z.string().trim().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_CONNECTION_LIMIT: integerSetting(10, 1, 100),
  DB_SSL_CA_FILE: z.string().trim().optional(),

  BREVO_API_KEY: z.string().trim().optional(),
  BREVO_SENDER_EMAIL: z.string().trim().optional(),
  BREVO_SENDER_NAME: z.string().trim().optional(),

  ALERT_WEBHOOK_URL: z.string().trim().optional(),

  // Browser push notifications (optional)
  VAPID_PUBLIC_KEY: z.string().trim().optional(),
  VAPID_PRIVATE_KEY: z.string().trim().optional(),
  VAPID_SUBJECT: z.string().trim().optional(),

  SKIP_EMAIL: z.enum(['true', 'false']).default('false'),

  MONITOR_TIMEOUT_MS: integerSetting(10000, 1, 60000),
  MONITOR_CONCURRENCY: integerSetting(5, 1, 25),
  MONITOR_WORKER_ENABLED: z.enum(['true', 'false']).default('true')
});

const placeholderPattern =
  /(?:replace|change.?me|your_|placeholder|example|sample)/i;

const maxJwtLifetimeSeconds = 30 * 24 * 60 * 60;

function isLocalHost(hostname) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (
    host === 'localhost' ||
    host === 'host.docker.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const family = net.isIP(host);

  if (family === 4) {
    const [first, second] = host.split('.').map(Number);

    return (
      first === 0 ||
      first === 10 ||
      (first === 100 && second >= 64 && second <= 127) ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 168))
    );
  }

  if (family === 6) {
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80:')
    );
  }

  return (
    !host.includes('.') ||
    /(^|[.-])(your|placeholder)(?:[.-]|$)/.test(host) ||
    /\.(test|invalid|example)$/.test(host) ||
    host === 'example.com' ||
    host.endsWith('.example.com') ||
    host === 'example.net' ||
    host.endsWith('.example.net') ||
    host === 'example.org' ||
    host.endsWith('.example.org')
  );
}

function isPlaceholder(value) {
  const text = String(value || '').trim();
  return !text || /[<>]/.test(text) || placeholderPattern.test(text);
}

function isLocalDatabaseHost(hostname) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (
    host === 'localhost' ||
    host === 'host.docker.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const family = net.isIP(host);

  if (family === 4) {
    const [first, second] = host.split('.').map(Number);

    return (
      first === 0 ||
      first === 127 ||
      (first === 169 && second === 254)
    );
  }

  return (
    family === 6 &&
    (host === '::' || host === '::1' || host.startsWith('fe80:'))
  );
}

function parseJwtLifetime(value) {
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(value);

  if (!match) return null;

  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };

  const seconds = Number(match[1]) * units[match[2]];

  return Number.isSafeInteger(seconds) ? seconds : null;
}

function parseTrustedProxyIps(value) {
  if (!value || !value.trim()) return [];

  const entries = value.split(',').map(entry => entry.trim());

  if (entries.some(entry => !entry)) {
    throw new Error('Invalid trusted proxy configuration.');
  }

  return [...new Set(entries)].map(entry => {
    const [address, prefix, ...extra] = entry.split('/');
    const family = net.isIP(address);
    const maxPrefix = family === 4 ? 32 : family === 6 ? 128 : 0;

    if (
      !family ||
      address === '0.0.0.0' ||
      address === '::' ||
      extra.length > 0 ||
      (
        prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) !== maxPrefix)
      )
    ) {
      throw new Error('Invalid trusted proxy configuration.');
    }

    return entry;
  });
}

function hasProductionSecretStrength(value) {
  if (
    Buffer.byteLength(value, 'utf8') < 32 ||
    isPlaceholder(value)
  ) {
    return false;
  }

  const frequencies = new Map();

  for (const character of value) {
    frequencies.set(
      character,
      (frequencies.get(character) || 0) + 1
    );
  }

  const entropy = [...frequencies.values()].reduce((total, count) => {
    const probability = count / value.length;
    return total - probability * Math.log2(probability);
  }, 0);

  return frequencies.size >= 12 && entropy >= 3.5;
}

function readDatabaseCa(file) {
  if (!file) return undefined;

  try {
    const ca = fs.readFileSync(path.resolve(file), 'utf8');
    tls.createSecureContext({ ca });
    return ca;
  } catch {
    throw new Error(
      'DB_SSL_CA_FILE must point to a readable CA certificate.'
    );
  }
}

function loadConfig(source = process.env) {
  const parsed = envSchema.safeParse(source);
  const issues = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(
        `${issue.path.join('.') || 'environment'} ${issue.message}`
      );
    }
  }

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${issues.join('; ')}`
    );
  }

  const raw = parsed.data;
  const isProduction = raw.NODE_ENV === 'production';

  const addIssue = (key, message) =>
    issues.push(`${key} ${message}`);

  const hasExplicit = key =>
    typeof source[key] === 'string' &&
    source[key].trim().length > 0;

  let trustedProxyIps;

  try {
    trustedProxyIps = parseTrustedProxyIps(raw.TRUSTED_PROXY_IPS);
  } catch {
    addIssue(
      'TRUSTED_PROXY_IPS',
      'must contain comma-separated IP addresses or CIDRs.'
    );
  }

  if (
    !raw.JWT_SECRET ||
    Buffer.byteLength(raw.JWT_SECRET, 'utf8') < 32
  ) {
    addIssue('JWT_SECRET', 'must be configured with at least 32 bytes.');
  } else if (
    isProduction &&
    !hasProductionSecretStrength(raw.JWT_SECRET)
  ) {
    addIssue('JWT_SECRET', 'must be a strong, non-placeholder secret.');
  }

  const jwtExpiresIn = raw.JWT_EXPIRES_IN || '7d';
  const jwtLifetimeSeconds = parseJwtLifetime(jwtExpiresIn);

  if (
    jwtLifetimeSeconds === null ||
    jwtLifetimeSeconds < 60 ||
    jwtLifetimeSeconds > maxJwtLifetimeSeconds
  ) {
    addIssue(
      'JWT_EXPIRES_IN',
      'must be between 60 seconds and 30 days using s, m, h, or d units.'
    );
  }

  const sessionCookieMaxAgeMs =
    raw.SESSION_COOKIE_MAX_AGE_MS ??
    (
      jwtLifetimeSeconds === null
        ? undefined
        : jwtLifetimeSeconds * 1000
    );

  if (
    isProduction &&
    !hasExplicit('SESSION_COOKIE_MAX_AGE_MS')
  ) {
    addIssue(
      'SESSION_COOKIE_MAX_AGE_MS',
      'must be explicitly configured in production.'
    );
  }

  if (
    jwtLifetimeSeconds !== null &&
    sessionCookieMaxAgeMs !== jwtLifetimeSeconds * 1000
  ) {
    addIssue(
      'SESSION_COOKIE_MAX_AGE_MS',
      'must exactly match JWT_EXPIRES_IN.'
    );
  }

  const clientOriginValue =
    raw.CLIENT_ORIGIN ||
    (isProduction ? '' : 'http://localhost:3000');

  let clientOrigin;

  if (clientOriginValue) {
    try {
      const url = new URL(clientOriginValue);

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        addIssue(
          'CLIENT_ORIGIN',
          'must be an origin without credentials, path, query, or fragment.'
        );
      } else {
        clientOrigin = url.origin;

        if (
          isProduction &&
          (url.protocol !== 'https:' || isLocalHost(url.hostname))
        ) {
          addIssue(
            'CLIENT_ORIGIN',
            'must use HTTPS and a non-local hostname in production.'
          );
        }
      }
    } catch {
      addIssue('CLIENT_ORIGIN', 'must be a valid origin.');
    }
  } else if (isProduction) {
    addIssue('CLIENT_ORIGIN', 'is required in production.');
  }

  const dbHost = raw.DB_HOST || (isProduction ? '' : 'localhost');
  const dbName = raw.DB_NAME || (isProduction ? '' : 'pulsewatch');
  const dbUser = raw.DB_USER || (isProduction ? '' : 'root');
  const dbPassword = raw.DB_PASSWORD || '';

  let alertWebhookUrl;

  if (isProduction) {
    for (const key of [
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ]) {
      if (!hasExplicit(key)) {
        addIssue(key, 'is required in production.');
      }
    }

    if (dbUser.toLowerCase() === 'root') {
      addIssue('DB_USER', 'must not be root in production.');
    }

    if (isPlaceholder(dbPassword)) {
      addIssue(
        'DB_PASSWORD',
        'must not be a placeholder in production.'
      );
    }

    if (isLocalDatabaseHost(dbHost) || isPlaceholder(dbHost)) {
      addIssue(
        'DB_HOST',
        'must not refer to a local or development host in production.'
      );
    }

    if (!hasExplicit('JWT_EXPIRES_IN')) {
      addIssue('JWT_EXPIRES_IN', 'must be explicitly configured in production.');
    }

    if (!hasExplicit('DB_SSL_CA_FILE')) {
      addIssue('DB_SSL_CA_FILE', 'is required in production.');
    }

    if (!hasExplicit('BREVO_API_KEY')) {
      addIssue('BREVO_API_KEY', 'is required in production.');
    } else if (isPlaceholder(raw.BREVO_API_KEY)) {
      addIssue('BREVO_API_KEY', 'must not be a placeholder in production.');
    }

    if (!hasExplicit('BREVO_SENDER_EMAIL')) {
      addIssue('BREVO_SENDER_EMAIL', 'is required in production.');
    }

    if (raw.SKIP_EMAIL === 'true') {
      addIssue('SKIP_EMAIL', 'must not be enabled in production.');
    }
  }

  if (dbName && !/^[A-Za-z0-9_]{1,64}$/.test(dbName)) {
    addIssue(
      'DB_NAME',
      'must contain only letters, numbers, and underscores.'
    );
  }

  if (raw.BREVO_SENDER_EMAIL) {
    const email = z.string().email().safeParse(raw.BREVO_SENDER_EMAIL);

    if (!email.success) {
      addIssue('BREVO_SENDER_EMAIL', 'must be a valid email address.');
    } else if (
      isProduction &&
      (
        isLocalHost(raw.BREVO_SENDER_EMAIL.split('@')[1]) ||
        isPlaceholder(raw.BREVO_SENDER_EMAIL)
      )
    ) {
      addIssue(
        'BREVO_SENDER_EMAIL',
        'must not use a placeholder domain in production.'
      );
    }
  }

  if (raw.ALERT_WEBHOOK_URL) {
    try {
      const url = new URL(raw.ALERT_WEBHOOK_URL);

      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.hash ||
        isLocalHost(url.hostname)
      ) {
        addIssue(
          'ALERT_WEBHOOK_URL',
          'must be an HTTPS URL with a public hostname.'
        );
      } else {
        alertWebhookUrl = url.toString();
      }
    } catch {
      addIssue('ALERT_WEBHOOK_URL', 'must be a valid HTTPS URL.');
    }
  }

  // VAPID settings must either all be configured or all be omitted.
  const vapidValues = [
    raw.VAPID_PUBLIC_KEY,
    raw.VAPID_PRIVATE_KEY,
    raw.VAPID_SUBJECT
  ];

  const hasAnyVapidValue = vapidValues.some(Boolean);
  const hasAllVapidValues = vapidValues.every(Boolean);

  if (hasAnyVapidValue && !hasAllVapidValues) {
    addIssue(
      'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT',
      'must all be configured together.'
    );
  }

  if (raw.VAPID_SUBJECT) {
    const validSubject =
      raw.VAPID_SUBJECT.startsWith('mailto:') ||
      /^https:\/\//i.test(raw.VAPID_SUBJECT);

    if (!validSubject) {
      addIssue(
        'VAPID_SUBJECT',
        'must be a mailto: address or HTTPS URL.'
      );
    }
  }

  let databaseCa;

  try {
    databaseCa = readDatabaseCa(raw.DB_SSL_CA_FILE);
  } catch {
    addIssue(
      'DB_SSL_CA_FILE',
      'must point to a readable, valid CA certificate.'
    );
  }

  if (issues.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${issues.join('; ')}`
    );
  }

  return {
    nodeEnv: raw.NODE_ENV,
    isProduction,
    port: raw.PORT,
    clientOrigin,
    trustedProxyIps,

    jwtSecret: raw.JWT_SECRET,
    jwtExpiresIn,
    jwtLifetimeSeconds,
    sessionCookieMaxAgeMs,

    dbHost,
    dbPort: raw.DB_PORT,
    dbName,
    dbUser,
    dbPassword,
    dbConnectionLimit: raw.DB_CONNECTION_LIMIT,

    dbSsl: databaseCa
      ? { ca: databaseCa, rejectUnauthorized: true }
      : undefined,

    brevoApiKey: raw.BREVO_API_KEY,
    brevoSenderEmail: raw.BREVO_SENDER_EMAIL,
    brevoSenderName: raw.BREVO_SENDER_NAME || 'PulseWatch',

    alertWebhookUrl,

    // Never expose vapidPrivateKey through an API response.
    vapidPublicKey: raw.VAPID_PUBLIC_KEY,
    vapidPrivateKey: raw.VAPID_PRIVATE_KEY,
    vapidSubject: raw.VAPID_SUBJECT,

    skipEmail: raw.SKIP_EMAIL === 'true',
    monitorTimeoutMs: raw.MONITOR_TIMEOUT_MS,
    monitorConcurrency: raw.MONITOR_CONCURRENCY,
    monitorWorkerEnabled: raw.MONITOR_WORKER_ENABLED === 'true'
  };
}

let activeConfig;

function configure(source = process.env) {
  activeConfig = loadConfig(source);
  return activeConfig;
}

function getConfig() {
  if (!activeConfig) {
    throw new Error(
      'Application configuration has not been initialized.'
    );
  }

  return activeConfig;
}

module.exports = {
  configure,
  getConfig,
  loadConfig,
  parseJwtLifetime
};
