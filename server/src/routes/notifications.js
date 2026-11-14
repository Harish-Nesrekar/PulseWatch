
const router = require('express').Router();
const { randomUUID } = require('node:crypto');

const {
  getVapidPublicKey,
  hashEndpoint
} = require('../services/pushNotifications');

const { pool } = require('../db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/http');

router.use(auth);

// GET /api/notifications/push/public-key
// Returns the public VAPID key to the authenticated browser.
router.get('/push/public-key', async (req, res) => {
  try {
    const publicKey = getVapidPublicKey();

    if (!publicKey) {
      return fail(res, 'Push notifications are not configured', 503);
    }

    return ok(res, { publicKey });
  } catch (error) {
    logger.error('api', 'push public key retrieval failed', {
      requestId: req.requestId,
      error
    });

    return fail(res, 'Unable to retrieve push configuration', 500);
  }
});


// POST /api/notifications/push-subscriptions
// Saves or updates the current user's browser subscription.
router.post('/push-subscriptions', async (req, res) => {
  try {
    if (!getVapidPublicKey()) {
      return fail(res, 'Push notifications are not configured', 503);
    }

    const subscription = req.body;

    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const authKey = subscription?.keys?.auth;

    if (
      typeof endpoint !== 'string' ||
      endpoint.length < 1 ||
      endpoint.length > 4096 ||
      typeof p256dh !== 'string' ||
      p256dh.length < 1 ||
      p256dh.length > 255 ||
      typeof authKey !== 'string' ||
      authKey.length < 1 ||
      authKey.length > 255
    ) {
      return fail(res, 'Invalid push subscription data', 400);
    }

    let endpointUrl;

    try {
      endpointUrl = new URL(endpoint);
    } catch {
      return fail(res, 'Invalid subscription endpoint', 400);
    }

    if (
      endpointUrl.protocol !== 'https:' ||
      endpointUrl.username ||
      endpointUrl.password
    ) {
      return fail(res, 'Invalid subscription endpoint', 400);
    }

    const expirationTime =
      subscription.expirationTime == null
        ? null
        : Number(subscription.expirationTime);

    if (
      expirationTime !== null &&
      (!Number.isSafeInteger(expirationTime) || expirationTime < 0)
    ) {
      return fail(res, 'Invalid subscription expiration time', 400);
    }

    const userId = req.user.userId;
    const id = randomUUID();
    const endpointHash = hashEndpoint(endpoint);
    const userAgent = String(req.get('user-agent') || '').slice(0, 512);

    await pool.execute(
      `
      INSERT INTO push_subscriptions (
        id,
        user_id,
        endpoint,
        endpoint_hash,
        p256dh,
        auth,
        expiration_time,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        endpoint = VALUES(endpoint),
        p256dh = VALUES(p256dh),
        auth = VALUES(auth),
        expiration_time = VALUES(expiration_time),
        user_agent = VALUES(user_agent)
      `,
      [
        id,
        userId,
        endpoint,
        endpointHash,
        p256dh,
        authKey,
        expirationTime,
        userAgent
      ]
    );

    return ok(res, {
      subscribed: true
    });
  } catch (error) {
    logger.error('api', 'push subscription registration failed', {
      requestId: req.requestId,
      userId: req.user?.userId,
      error
    });

    return fail(res, 'Unable to register push subscription', 500);
  }
});


// DELETE /api/notifications/push-subscriptions
// Removes the current user's browser subscription.
router.delete('/push-subscriptions', async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;

    if (
      typeof endpoint !== 'string' ||
      endpoint.length < 1 ||
      endpoint.length > 4096
    ) {
      return fail(res, 'Invalid subscription endpoint', 400);
    }

    const endpointHash = hashEndpoint(endpoint);

    const [result] = await pool.execute(
      `
      DELETE FROM push_subscriptions
      WHERE endpoint_hash = ?
        AND user_id = ?
      `,
      [endpointHash, req.user.userId]
    );

    return ok(res, {
      unsubscribed: true,
      deleted: result.affectedRows
    });
  } catch (error) {
    logger.error('api', 'push subscription removal failed', {
      requestId: req.requestId,
      userId: req.user?.userId,
      error
    });

    return fail(res, 'Unable to remove push subscription', 500);
  }
});


const MAX_LIMIT = 100;
const STREAM_INTERVAL_MS = 3000;

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) return 30;

  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

// GET /api/notifications
// Returns the current user's notification history and unread count.
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseLimit(req.query.limit);

    const [notifications] = await pool.execute(
      `
      SELECT
        n.id,
        n.user_id,
        n.monitor_id,
        n.incident_id,
        n.type,
        n.title,
        n.message,
        n.link,
        n.read_at,
        n.created_at,
        m.name AS monitor_name
      FROM notifications n
      LEFT JOIN monitors m
        ON m.id = n.monitor_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ?
      `,
      [userId, limit]
    );

    const [countRows] = await pool.execute(
      `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ?
        AND read_at IS NULL
      `,
      [userId]
    );

    return ok(res, {
      items: notifications,
      unreadCount: Number(countRows[0]?.unread_count || 0)
    });
  } catch (error) {
    logger.error('api', 'notification list failed', {
      requestId: req.requestId,
      error
    });

    return fail(res, 'Unable to load notifications', 500);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ?
        AND read_at IS NULL
      `,
      [req.user.userId]
    );

    return ok(res, {
      unreadCount: Number(rows[0]?.unread_count || 0)
    });
  } catch (error) {
    logger.error('api', 'notification count failed', {
      requestId: req.requestId,
      error
    });

    return fail(res, 'Unable to load unread count', 500);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `
      UPDATE notifications
      SET read_at = UTC_TIMESTAMP(3)
      WHERE user_id = ?
        AND read_at IS NULL
      `,
      [req.user.userId]
    );

    return ok(res, {
      updated: result.affectedRows
    });
  } catch (error) {
    logger.error('api', 'mark all notifications read failed', {
      requestId: req.requestId,
      error
    });

    return fail(res, 'Unable to update notifications', 500);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `
      UPDATE notifications
      SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3))
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.execute(
        `
        SELECT id
        FROM notifications
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        `,
        [req.params.id, req.user.userId]
      );

      if (rows.length === 0) {
        return fail(res, 'Notification not found', 404);
      }
    }

    return ok(res, {
      id: req.params.id,
      read: true
    });
  } catch (error) {
    logger.error('api', 'mark notification read failed', {
      requestId: req.requestId,
      notificationId: req.params.id,
      error
    });

    return fail(res, 'Unable to update notification', 500);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `
      DELETE FROM notifications
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return fail(res, 'Notification not found', 404);
    }

    return ok(res, {
      deleted: true,
      id: req.params.id
    });
  } catch (error) {
    logger.error('api', 'notification delete failed', {
      requestId: req.requestId,
      notificationId: req.params.id,
      error
    });

    return fail(res, 'Unable to delete notification', 500);
  }
});

// GET /api/notifications/stream
// Authenticated Server-Sent Events stream.
// The database remains the source of truth; this endpoint polls for new rows.
router.get('/stream', async (req, res) => {
  let closed = false;
  let polling = false;
  let pollTimer;
  let heartbeatTimer;

  try {
    const userId = req.user.userId;

    const [cursorRows] = await pool.execute(
      `
      SELECT
        DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f') AS cursor_time
      `
    );

    let cursorTime = cursorRows[0].cursor_time;
    let cursorId = '';

    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.flushHeaders?.();
    res.write('event: ready\ndata: {}\n\n');

    const stop = () => {
      closed = true;
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    };

    req.on('close', stop);
    res.on('close', stop);

    const poll = async () => {
      if (closed || polling) return;

      polling = true;

      try {
        const [rows] = await pool.execute(
          `
          SELECT
            n.id,
            n.monitor_id,
            n.incident_id,
            n.type,
            n.title,
            n.message,
            n.link,
            n.read_at,
            n.created_at,
            m.name AS monitor_name
          FROM notifications n
          LEFT JOIN monitors m
            ON m.id = n.monitor_id
          WHERE n.user_id = ?
            AND (
              n.created_at > ?
              OR (
                n.created_at = ?
                AND n.id > ?
              )
            )
          ORDER BY n.created_at ASC, n.id ASC
          LIMIT 100
          `,
          [userId, cursorTime, cursorTime, cursorId]
        );

        for (const notification of rows) {
          if (closed) break;

          const createdAt =
            notification.created_at instanceof Date
              ? notification.created_at.toISOString()
              : String(notification.created_at);

          res.write(
            `event: notification\ndata: ${JSON.stringify(notification)}\n\n`
          );

          cursorTime = createdAt;
          cursorId = notification.id;
        }
      } catch (error) {
        logger.error('api', 'notification stream poll failed', {
          requestId: req.requestId,
          error
        });

        if (!closed) {
          res.write(
            `event: stream-error\ndata: ${JSON.stringify({
              message: 'Notification updates are temporarily unavailable'
            })}\n\n`
          );
        }
      } finally {
        polling = false;
      }
    };

    pollTimer = setInterval(() => {
      void poll();
    }, STREAM_INTERVAL_MS);

    heartbeatTimer = setInterval(() => {
      if (!closed) {
        res.write(': keep-alive\n\n');
      }
    }, 25000);

    pollTimer.unref?.();
    heartbeatTimer.unref?.();
  } catch (error) {
    logger.error('api', 'notification stream failed', {
      requestId: req.requestId,
      error
    });

    if (!res.headersSent) {
      return fail(res, 'Unable to start notification stream', 500);
    }

    res.end();
  }
});

module.exports = router;
