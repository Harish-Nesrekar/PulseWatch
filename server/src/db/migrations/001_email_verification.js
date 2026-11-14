
const db = require('../..//db');

// Preserve existing accounts as verified.
// New registrations must explicitly set email_verified = 0.

const columns = db.prepare(
  "PRAGMA table_info(users)"
).all();

const hasEmailVerified = columns.some(
  (column) => column.name === 'email_verified'
);

if (!hasEmailVerified) {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS email_otps (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    sent_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_email_otps_user
  ON email_otps(user_id);
`);

module.exports = true;
