
const router = require('express').Router();

const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/http');

// Protect all incident routes.
router.use(auth);

// GET /api/incidents
// Returns the latest 200 incidents for the logged-in user.
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [incidents] = await pool.execute(
      `
      SELECT
        i.*,
        m.name AS monitor_name,
        m.url AS monitor_url,
        m.status AS monitor_status,
        m.is_active AS monitor_is_active
      FROM incidents i
      INNER JOIN monitors m
        ON m.id = i.monitor_id
      WHERE i.user_id = ?
      ORDER BY i.started_at DESC
      LIMIT 200
      `,
      [userId]
    );

    return ok(res, incidents);
  } catch (error) {
    console.error('Get incidents error:', error);

    return fail(res, 'Unable to load incidents', 500);
  }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const [incidents] = await pool.execute(
      `
      SELECT
        i.*,
        m.name AS monitor_name,
        m.url AS monitor_url,
        m.status AS monitor_status
      FROM incidents i
      INNER JOIN monitors m ON m.id = i.monitor_id
      WHERE i.id = ?
        AND i.user_id = ?
      LIMIT 1
      `,
      [req.params.id, req.user.userId]
    );

    if (incidents.length === 0) {
      return fail(res, 'Incident not found', 404);
    }

    return ok(res, incidents[0]);
  } catch (error) {
    console.error('Get incident error:', error);
    return fail(res, 'Unable to load incident', 500);
  }
});

// GET /api/incidents/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const [incidents] = await pool.execute(
      `
      SELECT monitor_id, started_at, resolved_at
      FROM incidents
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [req.params.id, req.user.userId]
    );

    const incident = incidents[0];
    if (!incident) {
      return fail(res, 'Incident not found', 404);
    }

    const [checks] = await pool.execute(
      `
      SELECT *
      FROM checks
      WHERE monitor_id = ?
        AND checked_at >= ?
        AND (? IS NULL OR checked_at <= ?)
      ORDER BY checked_at ASC
      LIMIT 500
      `,
      [
        incident.monitor_id,
        incident.started_at,
        incident.resolved_at,
        incident.resolved_at
      ]
    );

    return ok(res, checks);
  } catch (error) {
    console.error('Get incident history error:', error);
    return fail(res, 'Unable to load incident history', 500);
  }
});

// POST /api/incidents/:id/acknowledge
// Acknowledges an open incident without resolving it.
router.post('/:id/acknowledge', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.userId;
    const incidentId = req.params.id;

    await connection.beginTransaction();

    const [incidents] = await connection.execute(
      `
      SELECT id, status
      FROM incidents
      WHERE id = ?
        AND user_id = ?
      FOR UPDATE
      `,
      [incidentId, userId]
    );

    if (incidents.length === 0) {
      await connection.rollback();

      return fail(res, 'Incident not found', 404);
    }

    if (incidents[0].status === 'ACKNOWLEDGED') {
      await connection.rollback();

      return ok(res, {
        acknowledged: true,
        alreadyAcknowledged: true
      });
    }

    if (incidents[0].status !== 'OPEN') {
      await connection.rollback();

      return fail(
        res,
        'Only open incidents can be acknowledged',
        409
      );
    }

    await connection.execute(
      `
      UPDATE incidents
      SET
        status = 'ACKNOWLEDGED',
        acknowledged_at = UTC_TIMESTAMP(3),
        acknowledged_by = ?
      WHERE id = ?
        AND user_id = ?
        AND status = 'OPEN'
      `,
      [userId, incidentId, userId]
    );

    await connection.commit();

    return ok(res, {
      acknowledged: true,
      incidentId
    });
  } catch (error) {
    await connection.rollback();

    console.error('Acknowledge incident error:', error);

    return fail(res, 'Unable to acknowledge incident', 500);
  } finally {
    connection.release();
  }
});

// POST /api/incidents/:id/resolve
// Resolves an incident without conflating resolution with acknowledgement.
router.post('/:id/resolve', async (req, res) => {
  const note = req.body?.note;

  if (note !== undefined && (
    typeof note !== 'string' ||
    note.trim().length > 1000
  )) {
    return fail(res, 'Resolution note must be 1000 characters or fewer', 422);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [incidents] = await connection.execute(
      `
      SELECT id, status
      FROM incidents
      WHERE id = ?
        AND user_id = ?
      FOR UPDATE
      `,
      [req.params.id, req.user.userId]
    );

    if (incidents.length === 0) {
      await connection.rollback();
      return fail(res, 'Incident not found', 404);
    }

    if (incidents[0].status === 'RESOLVED') {
      await connection.rollback();
      return ok(res, {
        resolved: true,
        alreadyResolved: true
      });
    }

    await connection.execute(
      `
      UPDATE incidents
      SET
        status = 'RESOLVED',
        resolved_at = UTC_TIMESTAMP(3),
        resolution_type = 'MANUAL',
        resolved_by = ?,
        resolution_note = ?
      WHERE id = ?
        AND user_id = ?
        AND status IN ('OPEN', 'ACKNOWLEDGED')
      `,
      [
        req.user.userId,
        note?.trim() || null,
        req.params.id,
        req.user.userId
      ]
    );

    await connection.commit();

    return ok(res, {
      resolved: true,
      incidentId: req.params.id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Resolve incident error:', error);
    return fail(res, 'Unable to resolve incident', 500);
  } finally {
    connection.release();
  }
});

module.exports = router;
