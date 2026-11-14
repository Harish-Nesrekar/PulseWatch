
const router = require('express').Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');

const { pool } = require('../db');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/http');
const auth = require('../middleware/auth');
const { setSessionCookie, clearSessionCookie } =
  require('../utils/session-cookie');

const {
  sendOtpEmail,
  sendPasswordResetOtpEmail
} = require('../services/emailService');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const authRateLimit = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    fail(res, 'Too many authentication attempts. Try again later.', 429)
});
const otpRateLimit = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    fail(res, 'Too many verification requests. Try again later.', 429)
});

const config = getConfig();
const JWT_SECRET = config.jwtSecret;

function logAuthError(context, error, requestId) {
  logger.error('api', `${context.toLowerCase()} failed`, {
    requestId,
    error
  });
}

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mysqlDateTime(date = new Date()) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function parseDateValue(value) {
  if (!value) {
    return Number.NaN;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return Number.NaN;
  }

  const isoLike = normalized.includes('T')
    ? normalized
    : normalized.replace(' ', 'T');

  return Date.parse(
    isoLike.endsWith('Z') ? isoLike : `${isoLike}Z`
  );
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(userId, otp) {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${userId}:${otp}`)
    .digest('hex');
}

function safeCompare(firstHash, secondHash) {
  if (
    typeof firstHash !== 'string' ||
    typeof secondHash !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(firstHash) ||
    !/^[a-f0-9]{64}$/i.test(secondHash)
  ) {
    return false;
  }

  const first = Buffer.from(firstHash, 'hex');
  const second = Buffer.from(secondHash, 'hex');

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      sub: user.id,
      email: user.email,
      ver: Number(user.auth_version || 0)
    },
    JWT_SECRET,
    {
      expiresIn: config.jwtLifetimeSeconds
    }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified: Boolean(user.email_verified)
  };
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  return rows[0] || null;
}

async function findUserById(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  return rows[0] || null;
}

function createRateLimitError(seconds) {
  const error = new Error(
    `Please wait ${seconds} seconds before requesting another OTP`
  );

  error.status = 429;
  return error;
}

// -----------------------------------------------------
// REGISTRATION OTP
// -----------------------------------------------------

async function createAndSendOtp(user) {
  const now = Date.now();

  const sentAt = new Date(now).toISOString();
  const expiresAt = new Date(now + OTP_EXPIRY_MS).toISOString();

  const otp = generateOtp();
  const otpHash = hashOtp(user.id, otp);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the user to prevent simultaneous OTP requests.
    await connection.execute(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [user.id]
    );

    const [previousRows] = await connection.execute(
      'SELECT last_sent_at FROM email_otps WHERE user_id = ? FOR UPDATE',
      [user.id]
    );

    const previous = previousRows[0];

    if (previous) {
      const lastSent = parseDateValue(previous.last_sent_at);

      if (
        Number.isFinite(lastSent) &&
        now - lastSent < OTP_RESEND_COOLDOWN_MS
      ) {
        const seconds = Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000
        );

        throw createRateLimitError(seconds);
      }
    }

    await connection.execute(
      `
      INSERT INTO email_otps (
        user_id,
        otp_hash,
        expires_at,
        attempts,
        last_sent_at,
        created_at
      )
      VALUES (?, ?, ?, 0, ?, ?)
      ON DUPLICATE KEY UPDATE
        otp_hash = VALUES(otp_hash),
        expires_at = VALUES(expires_at),
        attempts = 0,
        last_sent_at = VALUES(last_sent_at),
        created_at = VALUES(created_at)
      `,
      [
        user.id,
        otpHash,
        expiresAt,
        sentAt,
        sentAt
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await sendOtpEmail(user.email, otp, user.name);
  } catch (error) {
    await pool.execute(
      'DELETE FROM email_otps WHERE user_id = ? AND otp_hash = ?',
      [user.id, otpHash]
    );

    throw error;
  }
}

// -----------------------------------------------------
// PASSWORD RESET OTP
// -----------------------------------------------------

async function createAndSendPasswordResetOtp(user) {
  const now = Date.now();

  const sentAt = new Date(now).toISOString();
  const expiresAt = new Date(now + OTP_EXPIRY_MS).toISOString();

  const otp = generateOtp();
  const otpHash = hashOtp(user.id, otp);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [user.id]
    );

    const [previousRows] = await connection.execute(
      'SELECT sent_at FROM password_reset_otps WHERE user_id = ? FOR UPDATE',
      [user.id]
    );

    const previous = previousRows[0];

    if (previous) {
      const lastSent = parseDateValue(previous.sent_at);

      if (
        Number.isFinite(lastSent) &&
        now - lastSent < OTP_RESEND_COOLDOWN_MS
      ) {
        const seconds = Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000
        );

        throw createRateLimitError(seconds);
      }
    }

    await connection.execute(
      `
      INSERT INTO password_reset_otps (
        user_id,
        otp_hash,
        expires_at,
        sent_at,
        attempts
      )
      VALUES (?, ?, ?, ?, 0)
      ON DUPLICATE KEY UPDATE
        otp_hash = VALUES(otp_hash),
        expires_at = VALUES(expires_at),
        sent_at = VALUES(sent_at),
        attempts = 0
      `,
      [
        user.id,
        otpHash,
        expiresAt,
        sentAt
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await sendPasswordResetOtpEmail(
      user.email,
      otp,
      user.name
    );
  } catch (error) {
    await pool.execute(
      'DELETE FROM password_reset_otps WHERE user_id = ? AND otp_hash = ?',
      [user.id, otpHash]
    );

    throw error;
  }
}

// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post('/register', authRateLimit(), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (name.length < 2 || name.length > 100) {
      return fail(res, 'Enter a valid name', 400);
    }

    if (!isValidEmail(email)) {
      return fail(res, 'Enter a valid email address', 400);
    }

    if (password.length < 8 || password.length > 72) {
      return fail(
        res,
        'Password must contain between 8 and 72 characters',
        400
      );
    }

    const existing = await findUserByEmail(email);

    if (existing) {
      return fail(
        res,
        'An account with this email already exists. Please sign in or request a reset code.',
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const connection = await pool.getConnection();

    let user;

    try {
      await connection.beginTransaction();

      const userId = crypto.randomUUID();
      const createdAt = mysqlDateTime(new Date());

      await connection.execute(
        `
        INSERT INTO users (
          id,
          name,
          email,
          password_hash,
          email_verified,
          created_at
        )
        VALUES (?, ?, ?, ?, 0, ?)
        `,
        [
          userId,
          name,
          email,
          passwordHash,
          createdAt
        ]
      );

      await connection.execute(
        `
        INSERT INTO organizations (user_id)
        VALUES (?)
        ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)
        `,
        [userId]
      );

      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      user = rows[0];

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await createAndSendOtp(user);

    return ok(
      res,
      {
        user: publicUser(user),
        verificationRequired: true,
        message: 'Verification code sent to your email'
      },
      201
    );
  } catch (error) {
    logAuthError('Registration', error, req.requestId);

    if (error.status) {
      return fail(res, error.message, error.status);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return fail(
        res,
        'An account with this email already exists',
        409
      );
    }

    return fail(
      res,
      'Unable to complete registration. Please try again.',
      500
    );
  }
});

// =====================================================
// VERIFY EMAIL
// POST /api/auth/verify-email
// =====================================================

router.post('/verify-email', otpRateLimit(), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || '').trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return fail(
      res,
      'Enter a valid email and six-digit OTP',
      400
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ? FOR UPDATE',
      [email]
    );

    const user = users[0];

    if (!user) {
      await connection.rollback();
      return fail(res, 'Registration not found', 404);
    }

    if (user.email_verified) {
      await connection.rollback();
      return fail(res, 'Email is already verified', 409);
    }

    const [otpRows] = await connection.execute(
      'SELECT * FROM email_otps WHERE user_id = ? FOR UPDATE',
      [user.id]
    );

    const record = otpRows[0];

    if (!record) {
      await connection.rollback();

      return fail(
        res,
        'Verification code not found. Request a new code.',
        400
      );
    }

    if (Date.now() > parseDateValue(record.expires_at)) {
      await connection.execute(
        'DELETE FROM email_otps WHERE user_id = ?',
        [user.id]
      );

      await connection.commit();

      return fail(
        res,
        'OTP expired. Please request a new code.',
        400
      );
    }

    if (Number(record.attempts) >= MAX_OTP_ATTEMPTS) {
      await connection.execute(
        'DELETE FROM email_otps WHERE user_id = ?',
        [user.id]
      );

      await connection.commit();

      return fail(
        res,
        'Too many attempts. Request a new verification code.',
        429
      );
    }

    const valid = safeCompare(
      record.otp_hash,
      hashOtp(user.id, otp)
    );

    if (!valid) {
      await connection.execute(
        `
        UPDATE email_otps
        SET attempts = attempts + 1
        WHERE user_id = ?
        `,
        [user.id]
      );

      await connection.commit();

      return fail(res, 'Incorrect verification code', 400);
    }

    await connection.execute(
      'UPDATE users SET email_verified = 1 WHERE id = ?',
      [user.id]
    );

    await connection.execute(
      'DELETE FROM email_otps WHERE user_id = ?',
      [user.id]
    );

    await connection.commit();

    const updatedUser = await findUserById(user.id);
    setSessionCookie(res, createToken(updatedUser));

    return ok(res, {
      user: publicUser(updatedUser),
      message: 'Email verified successfully'
    });
  } catch (error) {
    await connection.rollback();

    logAuthError('Email verification', error, req.requestId);

    return fail(res, 'Email verification failed', 500);
  } finally {
    connection.release();
  }
});

// =====================================================
// RESEND REGISTRATION OTP
// POST /api/auth/resend-otp
// =====================================================

router.post('/resend-otp', otpRateLimit(), async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return fail(res, 'Enter a valid email address', 400);
    }

    const user = await findUserByEmail(email);

    if (!user || user.email_verified) {
      return fail(
        res,
        'Unable to resend verification code for this account',
        400
      );
    }

    await createAndSendOtp(user);

    return ok(res, {
      message: 'A new verification code has been sent'
    });
  } catch (error) {
    logAuthError('Resend OTP', error, req.requestId);

    if (error.status) {
      return fail(res, error.message, error.status);
    }

    return fail(
      res,
      'Unable to send a new verification code',
      500
    );
  }
});

// =====================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =====================================================

router.post('/forgot-password', otpRateLimit(), async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return fail(res, 'Enter a valid email address', 400);
    }

    const genericMessage =
      'If an eligible account exists for this email, a password reset code will be sent.';

    const user = await findUserByEmail(email);

    // Do not disclose whether an account exists.
    if (!user || !user.email_verified) {
      return ok(res, {
        message: genericMessage
      });
    }

    try {
      await createAndSendPasswordResetOtp(user);
    } catch (error) {
      if (error.status === 429) {
        return ok(res, {
          message: genericMessage
        });
      }

      logAuthError('Password reset email', error, req.requestId);

      return fail(
        res,
        'Unable to send the password reset email. Please try again later.',
        503
      );
    }

    return ok(res, {
      message: genericMessage
    });
  } catch (error) {
    logAuthError('Forgot password', error, req.requestId);

    return fail(
      res,
      'Unable to process password reset request',
      500
    );
  }
});

// =====================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// =====================================================

router.post('/reset-password', otpRateLimit(), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');

  if (!isValidEmail(email)) {
    return fail(res, 'Enter a valid email address', 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    return fail(res, 'Enter a valid six-digit OTP', 400);
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    return fail(
      res,
      'Password must contain between 8 and 72 characters',
      400
    );
  }

  // Keep compatibility with clients that send only newPassword.
  if (confirmPassword && newPassword !== confirmPassword) {
    return fail(res, 'Passwords do not match', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ? FOR UPDATE',
      [email]
    );

    const user = users[0];

    if (!user || !user.email_verified) {
      await connection.rollback();

      return fail(
        res,
        'Invalid or expired password reset request',
        400
      );
    }

    const [otpRows] = await connection.execute(
      'SELECT * FROM password_reset_otps WHERE user_id = ? FOR UPDATE',
      [user.id]
    );

    const record = otpRows[0];

    if (!record) {
      await connection.rollback();

      return fail(
        res,
        'Password reset code not found. Request a new code.',
        400
      );
    }

    if (Date.now() > parseDateValue(record.expires_at)) {
      await connection.execute(
        'DELETE FROM password_reset_otps WHERE user_id = ?',
        [user.id]
      );

      await connection.commit();

      return fail(
        res,
        'Password reset code expired. Request a new code.',
        400
      );
    }

    if (Number(record.attempts) >= MAX_OTP_ATTEMPTS) {
      await connection.execute(
        'DELETE FROM password_reset_otps WHERE user_id = ?',
        [user.id]
      );

      await connection.commit();

      return fail(
        res,
        'Too many incorrect attempts. Request a new code.',
        429
      );
    }

    const valid = safeCompare(
      record.otp_hash,
      hashOtp(user.id, otp)
    );

    if (!valid) {
      await connection.execute(
        `
        UPDATE password_reset_otps
        SET attempts = attempts + 1
        WHERE user_id = ?
        `,
        [user.id]
      );

      await connection.commit();

      return fail(res, 'Incorrect password reset code', 400);
    }

    await connection.execute(
      'UPDATE users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?',
      [passwordHash, user.id]
    );

    await connection.execute(
      'DELETE FROM password_reset_otps WHERE user_id = ?',
      [user.id]
    );

    await connection.commit();

    return ok(res, {
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (error) {
    await connection.rollback();

    logAuthError('Reset password', error, req.requestId);

    return fail(
      res,
      'Unable to reset password. Please try again.',
      500
    );
  } finally {
    connection.release();
  }
});

// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post('/login', authRateLimit(), async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!isValidEmail(email) || !password) {
      return fail(
        res,
        'Valid email and password are required',
        400
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return fail(res, 'Invalid email or password', 401);
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return fail(res, 'Invalid email or password', 401);
    }

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        error: {
          message: 'Please verify your email before signing in'
        }
      });
    }

    setSessionCookie(res, createToken(user));

    return ok(res, {
      user: publicUser(user),
      message: 'Signed in successfully'
    });
  } catch (error) {
    logAuthError('Login', error, req.requestId);

    return fail(res, 'Unable to sign in', 500);
  }
});

// =====================================================
// GET CURRENT USER
// GET /api/auth/me
// =====================================================

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);

    if (!user) {
      return fail(res, 'User account not found', 401);
    }

    return ok(res, {
      user: publicUser(user)
    });
  } catch (error) {
    logAuthError('Get current user', error, req.requestId);

    return fail(
      res,
      'Unable to retrieve user information',
      500
    );
  }
});

// =====================================================
// LOGOUT
// POST /api/auth/logout
// =====================================================

router.post('/logout', auth, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE users SET auth_version = auth_version + 1 WHERE id = ?',
      [req.user.userId]
    );

    clearSessionCookie(res);
    return ok(res, { message: 'Signed out successfully' });
  } catch (error) {
    logAuthError('Logout', error, req.requestId);
    return fail(res, 'Unable to sign out', 500);
  }
});

module.exports = router;
