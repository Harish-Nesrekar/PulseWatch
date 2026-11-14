
const router = require('express').Router();
const { z } = require('zod');

const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/http');

// PATCH /api/settings/profile
router.patch('/profile', auth, async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120)
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return fail(res, parsed.error.issues[0].message, 422);
  }

  try {
    await pool.execute(
      `
      UPDATE users
      SET name = ?, updated_at = UTC_TIMESTAMP(3)
      WHERE id = ?
      `,
      [parsed.data.name, req.user.userId]
    );

    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    if (users.length === 0) {
      return fail(res, 'User account not found', 404);
    }

    return ok(res, users[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    return fail(res, 'Unable to update profile', 500);
  }
});

// GET /api/settings
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [[userRows], [organizationRows]] = await Promise.all([
      pool.execute(
        `
        SELECT id, name, email, created_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      ),

      pool.execute(
        `
        SELECT name, updated_at
        FROM organizations
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
      )
    ]);

    if (userRows.length === 0) {
      return fail(res, 'User account not found', 404);
    }

    return ok(res, {
      user: userRows[0],
      organization: organizationRows[0] || null
    });
  } catch (error) {
    console.error('Get settings error:', error);

    return fail(res, 'Unable to load settings', 500);
  }
});

// PATCH /api/settings/organization
router.patch('/organization', auth, async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120)
  }).safeParse(req.body);

  if (!parsed.success) {
    return fail(
      res,
      parsed.error.issues[0].message,
      422
    );
  }

  try {
    const userId = req.user.userId;
    const organizationName = parsed.data.name;

    await pool.execute(
      `
      INSERT INTO organizations (user_id, name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        updated_at = CURRENT_TIMESTAMP
      `,
      [userId, organizationName]
    );

    const [rows] = await pool.execute(
      `
      SELECT name, updated_at
      FROM organizations
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    return ok(res, rows[0]);
  } catch (error) {
    console.error('Update organization error:', error);

    return fail(
      res,
      'Unable to update organization settings',
      500
    );
  }
});

module.exports = router;
