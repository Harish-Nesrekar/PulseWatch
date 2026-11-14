
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const {
  randomInt,
  createHmac,
  timingSafeEqual,
} = require('node:crypto');

const db = require('../db');
const { id, ok, fail } = require('../utils/http');
const auth = require('../middleware/auth');
const { setSessionCookie } = require('../utils/session-cookie');
const { sendOtpEmail } = require('../services/emailService');

// Validation schemas
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});

const verifySchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().regex(/^\d{6}$/, 'Enter a valid six-digit OTP'),
});

const emailSchema = z.object({
  email: z.string().trim().email(),
});

// JWT generation
function issue(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

// Public user data
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

// OTP hashing
function hashOtp(userId, otp) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update(`${userId}:${otp}`)
    .digest('hex');
}

// Generate six-digit OTP
function generateOtp() {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

// Save OTP in database
function saveOtp(userId, otp) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  db.prepare(`
    INSERT INTO email_otps
      (user_id, otp_hash, expires_at, sent_at, attempts)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET
      otp_hash = excluded.otp_hash,
      expires_at = excluded.expires_at,
      sent_at = excluded.sent_at,
      attempts = 0
  `).run(
    userId,
    hashOtp(userId, otp),
    expiresAt.toISOString(),
    now.toISOString()
  );
}

// Create and send OTP
async function createAndSendOtp(user) {
  const otp = generateOtp();

  saveOtp(user.id, otp);

  try {
    await sendOtpEmail(user.email, otp, user.name);
  } catch (error) {
    db.prepare(
      'DELETE FROM email_otps WHERE user_id = ?'
    ).run(user.id);

    throw error;
  }
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return fail(res, parsed.error.issues[0].message, 422);
    }

    const { name, email, password } = parsed.data;
    const normalized = email.toLowerCase();

    const existing = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get(normalized);

    if (existing) {
      return fail(
        res,
        'An account with this email already exists.',
        409
      );
    }

    const user = {
      id: id(),
      name,
      email: normalized,
    };

    const passwordHash = await bcrypt.hash(password, 12);

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO users
          (id, name, email, password_hash, email_verified)
        VALUES (?, ?, ?, ?, 0)
      `).run(
        user.id,
        name,
        normalized,
        passwordHash
      );

      db.prepare(`
        INSERT INTO organizations (user_id, name)
        VALUES (?, ?)
      `).run(
        user.id,
        `${name}'s Organization`
      );
    });

    transaction();

    try {
      await createAndSendOtp(user);
    } catch (error) {
      console.error('Registration OTP email failed:', error.message);

      return fail(
        res,
        'Your account was created, but the verification email could not be sent. Please try resending the OTP.',
        503
      );
    }

    return ok(
      res,
      {
        user,
        verificationRequired: true,
        message: 'Verification OTP sent to your email.',
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return fail(res, 'An account with this email already exists.', 409);
    }

    return fail(res, 'Unable to complete registration', 500);
  }
});

// VERIFY EMAIL
router.post('/verify-email', async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);

    if (!parsed.success) {
      return fail(res, parsed.error.issues[0].message, 422);
    }

    const email = parsed.data.email.toLowerCase();
    const { otp } = parsed.data;

    const user = db.prepare(`
      SELECT id, name, email, email_verified
      FROM users
      WHERE email = ?
    `).get(email);

    if (!user) {
      return fail(res, 'Invalid email or verification code', 400);
    }

    if (user.email_verified === 1) {
      return fail(res, 'This email is already verified. Please log in.', 400);
    }

    const record = db.prepare(`
      SELECT otp_hash, expires_at, attempts
      FROM email_otps
      WHERE user_id = ?
    `).get(user.id);

    if (!record) {
      return fail(res, 'OTP not found. Please request a new one.', 400);
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      db.prepare(
        'DELETE FROM email_otps WHERE user_id = ?'
      ).run(user.id);

      return fail(res, 'OTP expired. Please request a new one.', 400);
    }

    if (record.attempts >= 5) {
      return fail(
        res,
        'Too many incorrect attempts. Please request a new OTP.',
        429
      );
    }

    const expected = Buffer.from(record.otp_hash, 'hex');
    const actual = Buffer.from(hashOtp(user.id, otp), 'hex');

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      db.prepare(`
        UPDATE email_otps
        SET attempts = attempts + 1
        WHERE user_id = ?
      `).run(user.id);

      return fail(res, 'Incorrect verification code', 400);
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET email_verified = 1
        WHERE id = ?
      `).run(user.id);

      db.prepare(`
        DELETE FROM email_otps
        WHERE user_id = ?
      `).run(user.id);
    });

    transaction();

    setSessionCookie(res, issue(user));
    return ok(res, {
      user: publicUser(user),
      message: 'Email verified successfully.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return fail(res, 'Unable to verify email', 500);
  }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const parsed = emailSchema.safeParse(req.body);

    if (!parsed.success) {
      return fail(res, 'A valid email address is required', 422);
    }

    const email = parsed.data.email.toLowerCase();

    const user = db.prepare(`
      SELECT id, name, email, email_verified
      FROM users
      WHERE email = ?
    `).get(email);

    // Avoid revealing whether an email is registered.
    if (!user || user.email_verified === 1) {
      return ok(res, {
        message: 'If the account requires verification, an OTP will be sent.',
      });
    }

    const previous = db.prepare(`
      SELECT sent_at
      FROM email_otps
      WHERE user_id = ?
    `).get(user.id);

    if (previous) {
      const elapsed =
        Date.now() - new Date(previous.sent_at).getTime();

      if (elapsed < 60 * 1000) {
        return fail(
          res,
          'Please wait before requesting another OTP.',
          429
        );
      }
    }

    try {
      await createAndSendOtp(user);
    } catch (error) {
      console.error('Resend OTP email failed:', error.message);

      return fail(
        res,
        'Unable to send verification email. Try again later.',
        503
      );
    }

    return ok(res, {
      message: 'If the account requires verification, an OTP will be sent.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return fail(res, 'Unable to resend OTP', 500);
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return fail(res, 'Valid email and password are required', 422);
    }

    const user = db.prepare(`
      SELECT *
      FROM users
      WHERE email = ?
    `).get(parsed.data.email.toLowerCase());

    if (
      !user ||
      !(await bcrypt.compare(
        parsed.data.password,
        user.password_hash
      ))
    ) {
      return fail(res, 'Invalid email or password', 401);
    }

    if (user.email_verified !== 1) {
      return fail(
        res,
        'EMAIL_NOT_VERIFIED: Please verify your email before logging in.',
        403
      );
    }

    setSessionCookie(res, issue(user));
    return ok(res, { user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return fail(res, 'Unable to log in', 500);
  }
});

// CURRENT USER
router.get('/me', auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, email, created_at
    FROM users
    WHERE id = ?
  `).get(req.user.sub);

  return user
    ? ok(res, { user })
    : fail(res, 'User not found', 404);
});

module.exports = router;
