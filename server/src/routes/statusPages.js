
const router = require('express').Router();
const crypto = require('crypto');
const { z } = require('zod');

const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/http');

// PUBLIC STATUS PAGE
// GET /api/status-pages/public/:slug
// This endpoint intentionally does not require authentication.
router.get('/public/:slug', async (req, res) => {
  try {
    const [pages] = await pool.execute(
      `
      SELECT id, user_id, name, slug
      FROM status_pages
      WHERE slug = ?
        AND is_published = 1
      LIMIT 1
      `,
      [req.params.slug]
    );

    if (pages.length === 0) {
      return fail(res, 'Status page not found', 404);
    }

    const page = pages[0];

    const [monitors] = await pool.execute(
      `
      SELECT name, status, last_checked_at
      FROM monitors
      WHERE user_id = ?
        AND is_active = 1
      ORDER BY created_at DESC
      `,
      [page.user_id]
    );

    const [incidents] = await pool.execute(
      `
      SELECT
        i.id, i.title, i.status, i.started_at, i.resolved_at,
        m.name AS monitor_name
      FROM incidents i
      INNER JOIN monitors m ON m.id = i.monitor_id
      WHERE i.user_id = ?
        AND m.is_active = 1
      ORDER BY i.started_at DESC
      LIMIT 20
      `,
      [page.user_id]
    );

    return ok(res, {
      name: page.name,
      slug: page.slug,
      monitors,
      incidents
    });
  } catch (error) {
    console.error('Get public status page error:', error);

    return fail(res, 'Unable to load status page', 500);
  }
});

// All routes below this point require authentication.
router.use(auth);

// GET /api/status-pages
router.get('/', async (req, res) => {
  try {
    const [pages] = await pool.execute(
      `
      SELECT id, name, slug, is_published, created_at
      FROM status_pages
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [req.user.userId]
    );

    return ok(res, pages);
  } catch (error) {
    console.error('List status pages error:', error);

    return fail(res, 'Unable to load status pages', 500);
  }
});

// POST /api/status-pages
router.post('/', async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    slug: z.string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
  }).safeParse(req.body);

  if (!parsed.success) {
    return fail(
      res,
      parsed.error.issues[0].message,
      422
    );
  }

  try {
    const id = crypto.randomUUID();
    const userId = req.user.userId;
    const { name, slug } = parsed.data;

    await pool.execute(
      `
      INSERT INTO status_pages (
        id,
        user_id,
        name,
        slug,
        is_published
      )
      VALUES (?, ?, ?, ?, 0)
      `,
      [id, userId, name, slug]
    );

    return ok(
      res,
      {
        id,
        user_id: userId,
        name,
        slug,
        is_published: 0
      },
      201
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return fail(
        res,
        'This status page slug is already in use',
        409
      );
    }

    console.error('Create status page error:', error);

    return fail(res, 'Unable to create status page', 500);
  }
});

// PATCH /api/status-pages/:id
router.patch('/:id', async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    slug: z.string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return fail(res, parsed.error.issues[0].message, 422);
  }

  try {
    const [result] = await pool.execute(
      `
      UPDATE status_pages
      SET name = ?, slug = ?
      WHERE id = ?
        AND user_id = ?
      `,
      [parsed.data.name, parsed.data.slug, req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        'SELECT id FROM status_pages WHERE id = ? AND user_id = ? LIMIT 1',
        [req.params.id, req.user.userId]
      );

      if (existing.length === 0) {
        return fail(res, 'Status page not found', 404);
      }
    }

    const [pages] = await pool.execute(
      `
      SELECT id, name, slug, is_published, created_at
      FROM status_pages
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [req.params.id, req.user.userId]
    );

    return ok(res, pages[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return fail(res, 'This status page slug is already in use', 409);
    }

    console.error('Update status page error:', error);
    return fail(res, 'Unable to update status page', 500);
  }
});

// PATCH /api/status-pages/:id/publish
router.patch('/:id/publish', async (req, res) => {
  const parsed = z.object({
    published: z.boolean()
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return fail(res, parsed.error.issues[0].message, 422);
  }

  try {
    const published = parsed.data.published ? 1 : 0;

    const [result] = await pool.execute(
      `
      UPDATE status_pages
      SET is_published = ?
      WHERE id = ?
        AND user_id = ?
      `,
      [published, req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        'SELECT id FROM status_pages WHERE id = ? AND user_id = ? LIMIT 1',
        [req.params.id, req.user.userId]
      );

      if (existing.length === 0) {
        return fail(res, 'Status page not found', 404);
      }
    }

    return ok(res, {
      published: Boolean(published)
    });
  } catch (error) {
    console.error('Publish status page error:', error);

    return fail(res, 'Unable to update status page', 500);
  }
});

// DELETE /api/status-pages/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `
      DELETE FROM status_pages
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return fail(res, 'Status page not found', 404);
    }

    return ok(res, {
      deleted: true
    });
  } catch (error) {
    console.error('Delete status page error:', error);

    return fail(res, 'Unable to delete status page', 500);
  }
});

module.exports = router;
