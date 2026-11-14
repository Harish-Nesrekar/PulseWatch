# PulseWatch Backend

Express + MySQL API and a lightweight uptime-check worker designed around the PulseWatch Next.js frontend.

For the single-server production design, service templates, release and rollback procedure, smoke checklist, and current free-tier caveats, see the [production deployment guide](../docs/production-deployment.md).

## Requirements
- Node.js 20 or newer
- npm
- MySQL 8.x running locally on `localhost:3306`
- MySQL `mysql` and `mysqldump` client utilities for restore testing and backups

## Run the backend
```bash
cd server
cp .env.example .env
# Set a strong JWT_SECRET and MySQL credentials in .env
npm install
npm run dev
```
API: `http://localhost:5001/api`
Health endpoints: `http://localhost:5001/api/health/live`, `/api/health/ready`, and `/api/health/worker`

The API and worker verify connectivity only. They do not create databases or execute schema DDL on startup. For a genuinely new local installation, provision an empty database and run the explicit migration command before starting the API. Do not use the fresh-install migration flow on an existing database; follow the baseline procedure below.

## Environment configuration

`src/config/env.js` validates configuration before the API or worker uses it. Invalid settings produce errors naming the setting, never its value. `.env.example` is a development-only template; all example credentials are placeholders and must not be used in production.

| Variable | Development/test behavior | Production requirement |
|---|---|---|
| `NODE_ENV` | Must be explicit: `development` or `test`. | Must be `production`; omission is an error. |
| `PORT` | Defaults to `5001`. | Optional; integer from `1` to `65535`. |
| `CLIENT_ORIGIN` | Defaults to `http://localhost:3000`. | Required HTTPS origin; localhost and non-origin paths are rejected. |
| `JWT_SECRET` | Required; at least 32 bytes. | Required; strong, non-placeholder secret. Generate one with `openssl rand -base64 48` and store it in a secret manager. |
| `JWT_EXPIRES_IN` | Defaults to `7d`. | Required; `s`, `m`, `h`, or `d` duration from 60 seconds through 30 days. |
| `SESSION_COOKIE_MAX_AGE_MS` | Defaults to the JWT lifetime; if set, must match it. | Required in milliseconds and must exactly match `JWT_EXPIRES_IN`. |
| `DB_HOST` | Defaults to `localhost`. | Required; local/development hosts are rejected. |
| `DB_PORT` | Defaults to `3306`. | Optional; integer from `1` to `65535`. |
| `DB_NAME` | Defaults to `pulsewatch`. | Required; letters, numbers, and underscores only. |
| `DB_USER` | Defaults to `root`. | Required; `root` is rejected. |
| `DB_PASSWORD` | Defaults to empty for local MySQL. | Required; placeholder values are rejected. Store it in a secret manager. |
| `DB_CONNECTION_LIMIT` | Defaults to `10`. | Optional; integer from `1` to `100`, sized to the total API/worker/database connection budget. |
| `DB_SSL_CA_FILE` | Optional path to a readable CA certificate. | Required. Mount the database provider's CA certificate and configure its path; TLS certificate verification is always enabled. |
| `BREVO_API_KEY` | Needed when sending email; not needed with test-only `SKIP_EMAIL=true`. | Required; real credential from a secret manager. |
| `BREVO_SENDER_EMAIL` | Needed when sending email. | Required valid sender address; placeholder domains are rejected. |
| `BREVO_SENDER_NAME` | Defaults to `PulseWatch`. | Optional. |
| `SKIP_EMAIL` | Defaults to `false`; `true` is for isolated development/tests only. | Must not be `true`; email delivery settings are mandatory. |
| `ALERT_WEBHOOK_URL` | Optional HTTPS webhook; omit to disable alerts. | Optional HTTPS webhook with a public hostname; its value is never included in logs or payloads. |
| `MONITOR_TIMEOUT_MS` | Defaults to `10000`. | Optional; integer from `1` to `60000`. |
| `MONITOR_CONCURRENCY` | Defaults to `5`. | Optional; integer from `1` to `25`. |
| `MONITOR_WORKER_ENABLED` | Defaults to `true`. | Optional `true`/`false`; set `false` when running the worker separately. |

Production MySQL connections use `DB_SSL_CA_FILE` as the trusted CA and set `rejectUnauthorized: true`; do not disable certificate checks. Mount the CA file into the API, worker, and operational command environments. Provision the MySQL server/database explicitly; production configuration does not permit falling back to local development credentials.

Example production configuration (all angle-bracketed values are placeholders, not usable credentials):

```env
NODE_ENV=production
PORT=5001
CLIENT_ORIGIN=https://app.your-domain.tld
JWT_SECRET=<generated-secret-from-secret-manager>
JWT_EXPIRES_IN=7d
SESSION_COOKIE_MAX_AGE_MS=604800000
DB_HOST=<managed-mysql-hostname>
DB_PORT=3306
DB_NAME=pulsewatch
DB_USER=pulsewatch_app
DB_PASSWORD=<managed-database-password>
DB_CONNECTION_LIMIT=10
DB_SSL_CA_FILE=/run/secrets/mysql-ca.pem
BREVO_API_KEY=<email-provider-api-key>
BREVO_SENDER_EMAIL=notifications@your-domain.tld
BREVO_SENDER_NAME=PulseWatch
SKIP_EMAIL=false
```

The application uses Brevo's SMTP API. Configure a verified sender and production API key before enabling account registration or password reset. Never put any backend secret in a `NEXT_PUBLIC_*` frontend variable.

Run isolated configuration tests without opening a database connection:

```bash
npm run test:config
```

## Versioned MySQL migrations

MySQL migrations live in `migrations/` as sequential `NNN_name.js` files. Each exports an `up(connection)` function. The migration runner stores version, name, SHA-256 checksum, status, start time, and execution time in `pulsewatch_schema_migrations`. It acquires a per-database MySQL advisory lock, skips matching applied versions, and refuses checksum changes, missing migration files, gaps, untracked tables, or failed/in-progress history.

The migration runner does not wrap DDL in a transaction. MySQL implicitly commits many DDL statements, so a failed migration may have partially changed the schema. It records that version as failed and blocks subsequent runs; inspect the schema and take a verified backup before any manual recovery. Never edit an applied migration. Migration 001's checksum also covers `src/db/schema.js`; treat both files as immutable after applying or baselining version 001 and add a new numbered migration for forward changes.

The API and standalone worker do not run migrations at startup. Provision the database first and supply the separate `MIGRATION_DB_USER` and `MIGRATION_DB_PASSWORD` values through the deployment secret manager or shell environment. The migration username must differ from runtime `DB_USER`. Both explicit confirmations must match `DB_NAME`:

```bash
npm run db:migrate -- --database pulsewatch --confirm-database pulsewatch
```

Migration 002 adds the worker-health table used by the API readiness and worker-health endpoints. Run the explicit migration command for an existing installation after following its normal baseline/backup process; neither API nor worker applies this migration automatically.

The command connects only to the configured database; it never creates the database. It refuses a non-empty database without migration history. This includes an existing `pulsewatch` installation: it is not treated as an empty database or automatically baselined.

### Existing-installation baseline

Baseline only after the following manual steps:

1. Stop schema-changing application deployments and create a backup using the procedure below.
2. Verify that backup can be restored to an isolated restore-test database.
3. Compare `SHOW CREATE TABLE` output for every expected table with `migrations/001_initial_schema.js` and its checked schema source, `src/db/schema.js`. Confirm indexes, constraints, column types/defaults, and the absence of unexpected application tables.
4. Run the baseline command with the exact database name, migration version, schema confirmation phrase, and backup confirmation phrase.

The command also checks the active database name, the complete expected set of eight PulseWatch tables, and required baseline columns. It only records migration history; it does not execute the initial schema migration. If any check fails or the current schema differs, stop. Do not force a baseline or use fresh-install migrations on that database; schema differences require a separately reviewed, data-preserving migration.

```bash
npm run db:baseline -- \
  --database pulsewatch \
  --confirm-database pulsewatch \
  --version 001 \
  --confirm-schema-match I_HAVE_VERIFIED_SCHEMA_MATCH \
  --confirm-backup I_HAVE_VERIFIED_BACKUP
```

The repository also contains `src/db/migrations/001_email_verification.js`, a legacy SQLite migration. It is not part of the MySQL runner and must not be moved or treated as a MySQL migration.

## MySQL backup and restore-test workflow

The backup command requires the installed `mysqldump` client and these environment variables, supplied from an operational secret store rather than command-line arguments:

```text
BACKUP_DB_HOST
BACKUP_DB_PORT              optional; defaults to 3306
BACKUP_DB_NAME
BACKUP_DB_USER
BACKUP_DB_PASSWORD
BACKUP_DB_SSL_CA_FILE       required when NODE_ENV=production
BACKUP_DIR                  optional; defaults to server/backups/mysql
```

Run:

```bash
npm run db:backup
```

It writes a timestamped SQL file, uses a temporary MySQL option file with owner-only permissions (not a password command-line argument), removes that credential file on exit, and does not overwrite an existing backup. The output directory must not be accessible to group or other users; `server/backups/` is git-ignored. `--single-transaction` provides a consistent snapshot for InnoDB tables; non-transactional tables and concurrent schema changes require a maintenance window. Backups include routines, triggers, and events.

Encrypt backups at rest and in transit, store a copy outside the database host, and restrict access. A minimal-cost policy is seven daily and four weekly copies, with periodic retention review. At least one restore test should be verified before relying on a backup; a successful dump alone is not proof of recoverability.

Restore testing is intentionally constrained to a database that does not already exist and whose name matches `pulsewatch_restore_test_<32 lowercase hex characters>`. Use a separate, isolated MySQL restore server where possible, and provide `RESTORE_DB_HOST`, `RESTORE_DB_PORT`, `RESTORE_DB_USER`, `RESTORE_DB_PASSWORD`, and, in production, `RESTORE_DB_SSL_CA_FILE`. The temporary restore operator must be able to create only the isolated test database and load its objects. The script checks the exact target confirmation and rejects an existing database, database-selection statements, and cross-schema DDL/DML in the dump. It creates the target only after those checks. If import fails, it leaves the isolated target intact for inspection; it never drops it.

```bash
RESTORE_TARGET=pulsewatch_restore_test_0123456789abcdef0123456789abcdef
npm run db:restore-test -- \
  --backup /secure/backups/pulsewatch-2026-11-13T10-00-00-000Z.sql \
  --target "$RESTORE_TARGET" \
  --confirm-target "$RESTORE_TARGET"
```

Never point restore testing at the production host or use `pulsewatch` as a restore target. Do not restore an untrusted SQL file.

### Database roles

Provision distinct accounts manually; the application and these scripts never create, alter, or rotate MySQL users or passwords:

- **Runtime:** only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on the application schema. It has no schema-DDL privileges.
- **Migration:** schema-scoped `CREATE`, `ALTER`, `INDEX`, and `REFERENCES`, plus the `SELECT`, `INSERT`, and `UPDATE` privileges needed for migration tracking. It is used only for explicit migration commands.
- **Backup:** read-only access sufficient for `mysqldump` data, views, routines, triggers, and events. It has no write or DDL privileges.
- **Restore test:** a short-lived operational account restricted to the isolated restore host/test database; revoke it after verification.

Use the least privilege supported by the managed MySQL provider and verify the resulting grants before use. The runtime account must not inherit migration or restore permissions. MySQL may require server-level `CREATE` privilege for database provisioning; perform restore tests on a disposable isolated MySQL instance and never grant that privilege to the production runtime account.

Run the migration, backup, and restore safety tests without connecting to MySQL:

```bash
npm run test:db-operations
```

## Run frontend and backend together
Keep the frontend in its existing `client/` folder and this directory alongside it:

```text
project/
  client/
  server/
```

From the `server/` directory, install both projects once, then start both processes with one command:
```bash
npm install
npm --prefix ../client install
npm run dev:all
```
This uses `concurrently` to run the API and Next.js together. The frontend should use:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```
Restart Next.js after changing environment variables. Both services then run concurrently: frontend on port 3000 and API on port 5001.

## Frontend connection status
The frontend client uses the API helper in `client/src/lib/api.ts`, and requests are sent to `http://localhost:5001/api`. Protected pages fetch real data from authenticated backend endpoints.

The frontend keeps private route content hidden until the backend validates the JWT with `/api/auth/me`. JWTs are held in an HttpOnly `pulsewatch_session` cookie scoped to `/api`, with `SameSite=Strict`, no `Domain`, and `Secure` enabled in production. Protected requests, login, and email verification send credentials; public status reads and unauthenticated auth actions omit them. Frontend JavaScript never receives or stores the JWT. Set `CLIENT_ORIGIN` to the exact frontend origin. Every unsafe API request must include that same `Origin`; safe `GET`, `HEAD`, and `OPTIONS` requests are not blocked. Logout/password reset increment the user's authentication version to revoke existing JWTs.

## Production HTTPS, proxy trust, and browser security

The API enforces HTTPS for production requests. Direct TLS is detected by Node; when TLS terminates at a reverse proxy, set `TRUSTED_PROXY_IPS` to the exact immediate proxy peer address(es) as seen by the API:

```env
TRUSTED_PROXY_IPS=10.20.30.40/32
```

Multiple entries are comma-separated. Exact IPs are recommended; optional CIDR notation is restricted to a single host (`/32` for IPv4 or `/128` for IPv6). The setting rejects wildcard trust and broad network ranges, and defaults to trusting no proxy. Do not set it to `true` or a hop count. The API must not be directly reachable from untrusted networks when proxy trust is enabled. Configure the ingress to remove client-supplied forwarding headers and set a single authoritative `X-Forwarded-Proto` value; do not append to an incoming client value. Requests forwarded as HTTPS are accepted only from a configured proxy address. If TLS terminates at the API itself, leave `TRUSTED_PROXY_IPS` empty.

`CLIENT_ORIGIN` remains the single exact allowed frontend origin. Credentialed CORS never uses a wildcard, and all unsafe methods require that exact `Origin`, including anonymous login and registration requests. Configure the frontend's `NEXT_PUBLIC_API_URL` as an HTTPS URL in production. Production health probes must also reach the API over direct TLS or through the trusted HTTPS ingress.

The API emits a restrictive JSON-oriented CSP (`default-src 'none'`), frame and MIME protections, a referrer policy, and a restrictive Permissions-Policy. Production responses receive HSTS with a one-year max-age and no `includeSubDomains` or preload. The Next.js middleware applies a per-request nonce CSP to dynamically rendered pages. Its only inline allowance is `style-src-attr 'unsafe-inline'` for UI-library style attributes; scripts do not allow `unsafe-inline` or `unsafe-eval`. The root layout is dynamically rendered so Next.js can attach the nonce. The application owns the HSTS header: configure the ingress to pass it through or replace it, not append a duplicate.

In production, malformed JSON receives a generic 400 response, oversized request bodies receive 413, and unexpected errors return a generic 500 without exception details. The production health response omits database connectivity details. Detailed error diagnostics remain available in development only.

Run the isolated security and configuration tests from the project directories:

```bash
# server/
npm run test:security
npm run test:config
node --test tests/session-cookie.test.js

# client/
npm run test:security
npm run test:config
```

Public frontend routes are `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, and `/status/[slug]`. All other App Router pages are private, including dashboard, monitor list/create/details, incidents/list/details, analytics, settings, and status-page management.

## API routes
All routes are prefixed with `/api`. Protected routes require the `pulsewatch_session` cookie; bearer-token authorization is not supported.

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login and set the HttpOnly session cookie |
| GET | `/auth/me` | Yes | Current user |
| GET, POST | `/monitors` | Yes | List/create monitors |
| GET, PATCH, DELETE | `/monitors/:id` | Yes | Read/update/delete monitor |
| POST | `/monitors/:id/check` | Yes | Trigger immediate check |
| GET | `/monitors/:id/checks` | Yes | Check history |
| POST | `/monitors/:id/pause` | Yes | Pause scheduled checks |
| POST | `/monitors/:id/resume` | Yes | Resume scheduled checks |
| GET | `/dashboard` | Yes | Authenticated dashboard stats, incident/activity lists, and 24-hour timeline |
| GET | `/incidents` | Yes | Incident history |
| GET | `/incidents/:id` | Yes | Incident details |
| GET | `/incidents/:id/history` | Yes | Checks associated with an incident |
| POST | `/incidents/:id/acknowledge` | Yes | Acknowledge an incident |
| POST | `/incidents/:id/resolve` | Yes | Manually resolve an incident |
| GET | `/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` | Yes | Historical uptime, response-time, incident-frequency, and downtime aggregates (up to 31 days) |
| GET | `/settings` | Yes | User and organization settings |
| PATCH | `/settings/profile` | Yes | Update the account display name |
| PATCH | `/settings/organization` | Yes | Update organization name |
| GET, POST | `/status-pages` | Yes | List/create status pages |
| PATCH | `/status-pages/:id` | Yes | Update page name or public slug |
| PATCH | `/status-pages/:id/publish` | Yes | Publish/unpublish |
| DELETE | `/status-pages/:id` | Yes | Delete status page |
| GET | `/status-pages/public/:slug` | No | Public status page data |

Dashboard and analytics values are calculated from stored checks and incidents. Uptime is `null` when no checks exist for the selected period; missing checks are not interpreted as downtime. The status-page UI renders published data at `/status/:slug`; only public page name, active monitor status, and incident history are included.

## Monitor behavior
- Checks newly created monitors immediately, then schedules active monitors in 15-second worker cycles.
- Supports GET and HEAD, expected HTTP status, 30/60/300/600-second intervals, and configurable failure/recovery thresholds (1-20).
- Stores each result, response time, status code, and bounded response metadata in MySQL.
- Confirms downtime/recovery only after each configured consecutive-check threshold; acknowledgement remains separate from resolution.
- Follows at most three redirects, validating and pinning each destination to its resolved public IP.
- Uses database leases to prevent overlapping checks across worker instances and recovers expired leases.
- Stops scheduling and waits for active checks during graceful shutdown.
- Applies in-memory per-process rate limits to registration, login, and OTP flows. This is suitable only while the API runs as one instance: counters reset on restart and are not shared across replicas. A multi-instance deployment needs a shared rate-limit store, and per-IP limits may affect users sharing a public IP.
- Limits authenticated manual monitor checks to three requests per user per minute per API process. This counter is also process-local; keep the API single-instance unless a shared limiter is introduced.

## Health checks, logs, and alerts

- `GET /api/health/live` is an API-process liveness probe and does not query MySQL or the worker.
- `GET /api/health/ready` (also `/api/health`) returns 200 only when MySQL is reachable and the monitoring worker is making progress; otherwise it returns 503. Use this as the traffic/readiness check.
- `GET /api/health/worker` reports only worker state and progress ages, without worker identifiers or database details. It returns 503 when the worker is absent, heartbeat is stale, or monitoring is stalled.
- The worker-health table is written by the worker and read by the API. Run the explicit migration before relying on readiness checks. Health endpoints intentionally return generic status rather than connection strings, SQL errors, or stack traces.
- API and worker logs are JSON records with timestamps, severity, component, and message. API request completion/error records include the request ID returned in `X-Request-ID`. Authorization headers, cookies, passwords, tokens, OTPs, and common secret fields are redacted; do not log request bodies or add credentials to log messages.
- Set optional `ALERT_WEBHOOK_URL` to an HTTPS endpoint to receive deduplicated `worker_unhealthy`, `monitoring_stalled`, `worker_cycle_failed`, and `database_unavailable` notifications. Delivery has a 5-second timeout and a 15-minute per-event cooldown; `not_running` alerts have a 45-second startup grace period. The payload contains only the component, event, timestamp, and an allowlisted status; the webhook URL and credentials are not logged or sent in the payload. Omit the variable to disable alerts.
- Both API and standalone worker handle SIGTERM/SIGINT, stop accepting/scheduling new work, wait for in-flight work, close MySQL pools, and enforce a bounded shutdown deadline. Checks interrupted by forced termination remain recoverable through the existing expiring monitor leases.

Run the isolated Stage 4 tests without connecting to MySQL:

```bash
npm run test:stage4
```

The worker can run separately from the API:
```bash
# API process
MONITOR_WORKER_ENABLED=false npm run dev

# Separate worker process using the same MySQL configuration
npm run worker
```

By default, the API process starts the worker for convenient local development.

## Important security and deployment notes
This remains a development foundation, not a claim of production readiness. SSRF defenses reject local, private, link-local, reserved, and metadata ranges, validate every redirect, and pin the validated DNS result at connection time. Still deploy checks in a restricted network and perform operational review before public exposure. The MySQL lease is the cross-process coordination mechanism; no external queue is required for the current design. Use managed database access controls, secret management, HTTPS, backups, observability, and capacity/load testing before production.

The worker's bounded concurrency is configurable with `MONITOR_CONCURRENCY`; request timeout is bounded to 60 seconds by the service. Run one worker per deployment unless capacity testing supports more. Database leases prevent duplicate checks across worker instances.
