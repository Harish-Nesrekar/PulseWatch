
const router = require('express').Router();
const crypto = require('crypto');
const { z } = require('zod');

const { pool } = require('../db');
const auth = require('../middleware/auth');
const createManualCheckRateLimiter = require('../middleware/manual-check-rate-limit');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/http');
const { runCheck } = require('../services/monitor');
const { validatePublicUrl } = require('../services/ssrf');

router.use(auth);
const manualCheckRateLimit = createManualCheckRateLimiter();

// --------------------------------------------------
// VALIDATION
// --------------------------------------------------

const createMonitorSchema = z.object({
  name: z.string().trim().min(2).max(120),

  url: z.string().trim().url().max(2048),

  method: z.enum(['GET', 'HEAD']).default('GET'),

  interval_seconds: z.union([
    z.literal(30),
    z.literal(60),
    z.literal(300),
    z.literal(600)
  ]).default(60),

  expected_status: z.number().int().min(100).max(599).default(200),

  failure_threshold: z.number().int().min(1).max(20).default(3),

  recovery_threshold: z.number().int().min(1).max(20).default(2)
}).strict();

const updateMonitorSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),

  url: z.string().trim().url().max(2048).optional(),

  method: z.enum(['GET', 'HEAD']).optional(),

  interval_seconds: z.union([
    z.literal(30),
    z.literal(60),
    z.literal(300),
    z.literal(600)
  ]).optional(),

  expected_status: z.number().int().min(100).max(599).optional(),

  failure_threshold: z.number().int().min(1).max(20).optional(),

  recovery_threshold: z.number().int().min(1).max(20).optional(),

  is_active: z.boolean().optional()
}).strict().refine(
  data => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' }
);

// Only explicitly allowed database columns can be updated.
const allowedColumns = {
  name: 'name',
  url: 'url',
  method: 'method',
  interval_seconds: 'interval_seconds',
  expected_status: 'expected_status',
  failure_threshold: 'failure_threshold',
  recovery_threshold: 'recovery_threshold',
  is_active: 'is_active'
};

function publicMonitor(monitor) {
  const {
    check_lease_token,
    check_lease_until,
    lease_active,
    ...publicData
  } = monitor;

  return publicData;
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

async function validateMonitorUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        valid: false,
        reason: 'Only HTTP and HTTPS URLs are supported'
      };
    }

    return await validatePublicUrl(url);
  } catch {
    return {
      valid: false,
      reason: 'Invalid monitor URL'
    };
  }
}

async function getOwnedMonitor(monitorId, userId) {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM monitors
    WHERE id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [monitorId, userId]
  );

  return rows[0] || null;
}

// --------------------------------------------------
// GET ALL MONITORS
// GET /api/monitors
// --------------------------------------------------

router.get('/', async (req, res) => {
  try {
    const [monitors] = await pool.execute(
      `
      SELECT *
      FROM monitors
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [req.user.userId]
    );

    return ok(res, monitors.map(publicMonitor));
  } catch (error) {
    logger.error('api', 'monitor list failed', {
      requestId: req.requestId,
      error
    });
    return fail(res, 'Unable to load monitors', 500);
  }
});

// --------------------------------------------------
// CREATE MONITOR
// POST /api/monitors
// --------------------------------------------------

router.post('/', async (req, res) => {
  const parsed = createMonitorSchema.safeParse(req.body);

  if (!parsed.success) {
    return fail(res, parsed.error.issues[0].message, 422);
  }

  try {
    const data = parsed.data;
    const userId = req.user.userId;

    const urlValidation = await validateMonitorUrl(data.url);

    if (!urlValidation.valid) {
      return fail(
        res,
        urlValidation.reason || 'Invalid or unsafe monitor URL',
        422
      );
    }

    const monitorId = crypto.randomUUID();

    await pool.execute(
      `
      INSERT INTO monitors (
        id,
        user_id,
        name,
        url,
        method,
        interval_seconds,
        expected_status,
        failure_threshold,
        recovery_threshold
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        monitorId,
        userId,
        data.name,
        data.url,
        data.method,
        data.interval_seconds,
        data.expected_status,
        data.failure_threshold,
        data.recovery_threshold
      ]
    );

    const savedMonitor = await getOwnedMonitor(monitorId, userId);

    if (!savedMonitor) {
      return fail(res, 'Monitor was created but could not be retrieved', 500);
    }

    // Run the initial check asynchronously.
    runCheck(savedMonitor).catch(error => {
      logger.error('api', 'initial monitor check failed', {
        requestId: req.requestId,
        monitorId,
        error
      });
    });

    return ok(res, publicMonitor(savedMonitor), 201);
  } catch (error) {
    logger.error('api', 'monitor creation failed', {
      requestId: req.requestId,
      error
    });
    return fail(res, 'Unable to create monitor', 500);
  }
});

// --------------------------------------------------
// GET SINGLE MONITOR
// GET /api/monitors/:id
// --------------------------------------------------

router.get('/:id', async (req, res) => {
  try {
    const monitor = await getOwnedMonitor(
      req.params.id,
      req.user.userId
    );

    if (!monitor) {
      return fail(res, 'Monitor not found', 404);
    }

    return ok(res, publicMonitor(monitor));
  } catch (error) {
    logger.error('api', 'monitor read failed', {
      requestId: req.requestId,
      monitorId: req.params.id,
      error
    });
    return fail(res, 'Unable to load monitor', 500);
  }
});

// --------------------------------------------------
// UPDATE MONITOR
// PATCH /api/monitors/:id
// --------------------------------------------------

router.patch('/:id', async (req, res) => {
  const parsed = updateMonitorSchema.safeParse(req.body);

  if (!parsed.success) {
    return fail(res, parsed.error.issues[0].message, 422);
  }

  let connection;

  try {
    const userId = req.user.userId;
    const monitorId = req.params.id;
    const data = parsed.data;

    // Validate URL before opening a database transaction.
    if (data.url) {
      const urlValidation = await validateMonitorUrl(data.url);

      if (!urlValidation.valid) {
        return fail(
          res,
          urlValidation.reason || 'Invalid or unsafe monitor URL',
          422
        );
      }
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Lock the owned monitor while updating it.
    const [existingRows] = await connection.execute(
      `
      SELECT
        *,
        check_lease_until > UTC_TIMESTAMP(3) AS lease_active
      FROM monitors
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [monitorId, userId]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return fail(res, 'Monitor not found', 404);
    }

    if (Number(existingRows[0].lease_active) === 1) {
      await connection.rollback();
      return fail(
        res,
        'Wait for the current monitor check to finish before changing its configuration',
        409
      );
    }

    const updates = Object.entries(data).filter(
      ([key]) => Object.prototype.hasOwnProperty.call(allowedColumns, key)
    );

    if (updates.length > 0) {
      const setClause = updates
        .map(([key]) => `${allowedColumns[key]} = ?`)
        .join(', ');

      const values = updates.map(([, value]) => value);

      await connection.execute(
        `
        UPDATE monitors
        SET ${setClause},
            updated_at = UTC_TIMESTAMP(3)
        WHERE id = ?
          AND user_id = ?
        `,
        [...values, monitorId, userId]
      );
    }

    const [updatedRows] = await connection.execute(
      `
      SELECT *
      FROM monitors
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [monitorId, userId]
    );

    await connection.commit();

    return ok(res, publicMonitor(updatedRows[0]));
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    logger.error('api', 'monitor update failed', {
      requestId: req.requestId,
      monitorId: req.params.id,
      error
    });
    return fail(res, 'Unable to update monitor', 500);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// --------------------------------------------------
// DELETE MONITOR
// DELETE /api/monitors/:id
// --------------------------------------------------

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `
      DELETE FROM monitors
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return fail(res, 'Monitor not found', 404);
    }

    return ok(res, {
      deleted: true,
      monitorId: req.params.id
    });
  } catch (error) {
    logger.error('api', 'monitor deletion failed', {
      requestId: req.requestId,
      monitorId: req.params.id,
      error
    });
    return fail(res, 'Unable to delete monitor', 500);
  }
});

// --------------------------------------------------
// PAUSE / RESUME MONITOR
// POST /api/monitors/:id/pause
// POST /api/monitors/:id/resume
// --------------------------------------------------

async function setMonitorActive(req, res, isActive) {
  try {
    const [result] = await pool.execute(
      `
      UPDATE monitors
      SET
        is_active = ?,
        updated_at = UTC_TIMESTAMP(3)
      WHERE id = ?
        AND user_id = ?
      `,
      [isActive ? 1 : 0, req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      const monitor = await getOwnedMonitor(req.params.id, req.user.userId);

      if (!monitor) {
        return fail(res, 'Monitor not found', 404);
      }
    }

    return ok(res, {
      monitorId: req.params.id,
      is_active: isActive
    });
  } catch (error) {
    logger.error('api', 'monitor state update failed', {
      requestId: req.requestId,
      monitorId: req.params.id,
      error
    });
    return fail(res, 'Unable to update monitor state', 500);
  }
}

router.post('/:id/pause', (req, res) =>
  setMonitorActive(req, res, false)
);

router.post('/:id/resume', (req, res) =>
  setMonitorActive(req, res, true)
);

// --------------------------------------------------
// MANUAL MONITOR CHECK
// POST /api/monitors/:id/check
// --------------------------------------------------

router.post('/:id/check', manualCheckRateLimit, async (req, res) => {
  try {
    const monitor = await getOwnedMonitor(
      req.params.id,
      req.user.userId
    );

    if (!monitor) {
      return fail(res, 'Monitor not found', 404);
    }

    const result = await runCheck(monitor);

    return ok(res, result);
  } catch (error) {
    logger.error('api', 'manual monitor check failed', {
      requestId: req.requestId,
      monitorId: req.params.id,
      error
    });
    return fail(res, 'Unable to check monitor', 500);
  }
});

// --------------------------------------------------
// GET MONITOR CHECK HISTORY
// GET /api/monitors/:id/checks
// --------------------------------------------------

router.get('/:id/checks', async (req, res) => {
  try {
    const monitor = await getOwnedMonitor(
      req.params.id,
      req.user.userId
    );

    if (!monitor) {
      return fail(res, 'Monitor not found', 404);
    }

    const requestedLimit = Number(req.query.limit) || 100;

    const limit = Math.min(
      Math.max(Math.floor(requestedLimit), 1),
      500
    );

    const [checks] = await pool.execute(
      `
      SELECT *
      FROM checks
      WHERE monitor_id = ?
      ORDER BY checked_at DESC
      LIMIT ?
      `,
      [req.params.id, limit]
    );

    return ok(res, checks);
  } catch (error) {
    logger.error('api', 'monitor check history failed', {
      requestId: req.requestId,
      monitorId: req.params.id,
      error
    });
    return fail(res, 'Unable to load check history', 500);
  }
});

module.exports = router;
