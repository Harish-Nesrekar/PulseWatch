
const { createHash } = require('node:crypto');
const webpush = require('web-push');

const { pool } = require('../db');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 8;
const STALE_LOCK_MINUTES = 5;

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;

  const config = getConfig();

  if (
    !config.vapidPublicKey ||
    !config.vapidPrivateKey ||
    !config.vapidSubject
  ) {
    return false;
  }

  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );

  vapidConfigured = true;
  return true;
}

function getVapidPublicKey() {
  const config = getConfig();
  return config.vapidPublicKey || null;
}

function hashEndpoint(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

function getErrorCode(error) {
  return Number(error?.statusCode || error?.status || 0);
}

function getRetryDelayMinutes(attempts) {
  return Math.min(60, 2 ** Math.min(attempts, 6));
}

async function claimNextDelivery() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
      SELECT id
      FROM push_delivery_outbox
      WHERE (
        status = 'PENDING'
        AND next_attempt_at <= NOW(3)
      )
      OR (
        status = 'PROCESSING'
        AND locked_at < DATE_SUB(
          NOW(3),
          INTERVAL ? MINUTE
        )
      )
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      `,
      [STALE_LOCK_MINUTES]
    );

    if (rows.length === 0) {
      await connection.commit();
      return null;
    }

    const deliveryId = rows[0].id;

    await connection.execute(
      `
      UPDATE push_delivery_outbox
      SET
        status = 'PROCESSING',
        locked_at = NOW(3),
        attempts = attempts + 1
      WHERE id = ?
      `,
      [deliveryId]
    );

    const [claimedRows] = await connection.execute(
      `
      SELECT id, notification_id, user_id, attempts
      FROM push_delivery_outbox
      WHERE id = ?
      LIMIT 1
      `,
      [deliveryId]
    );

    await connection.commit();

    return claimedRows[0] || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function markDeliverySent(deliveryId) {
  await pool.execute(
    `
    UPDATE push_delivery_outbox
    SET
      status = 'SENT',
      sent_at = NOW(3),
      locked_at = NULL,
      last_error = NULL
    WHERE id = ?
    `,
    [deliveryId]
  );
}

async function markDeliveryFailed(delivery, error) {
  const terminal = delivery.attempts >= MAX_ATTEMPTS;

  const status = terminal ? 'FAILED' : 'PENDING';

  const retryMinutes = getRetryDelayMinutes(delivery.attempts);

  const safeError = String(
    error?.message || 'Push delivery failed'
  ).slice(0, 1000);

  await pool.execute(
    `
    UPDATE push_delivery_outbox
    SET
      status = ?,
      locked_at = NULL,
      next_attempt_at = DATE_ADD(
        NOW(3),
        INTERVAL ? MINUTE
      ),
      last_error = ?
    WHERE id = ?
    `,
    [status, retryMinutes, safeError, delivery.id]
  );

  if (terminal) {
    logger.error('push', 'push delivery permanently failed', {
      deliveryId: delivery.id,
      attempts: delivery.attempts
    });
  }
}

async function deliverToSubscriptions(delivery) {
  const [notificationRows] = await pool.execute(
    `
    SELECT
      id,
      type,
      title,
      message,
      link
    FROM notifications
    WHERE id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [delivery.notification_id, delivery.user_id]
  );

  if (notificationRows.length === 0) {
    return { success: true };
  }

  const notification = notificationRows[0];

  const [subscriptions] = await pool.execute(
    `
    SELECT
      id,
      endpoint,
      p256dh,
      auth,
      expiration_time
    FROM push_subscriptions
    WHERE user_id = ?
    `,
    [delivery.user_id]
  );

  if (subscriptions.length === 0) {
    return { success: true };
  }

  const payload = JSON.stringify({
    id: notification.id,
    title: notification.title,
    body: notification.message || '',
    type: notification.type,
    data: {
      url: notification.link || '/notifications',
      notificationId: notification.id
    }
  });

  const results = await Promise.allSettled(
    subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expiration_time,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload,
          {
            TTL: 60 * 60 * 24,
            urgency: 'high'
          }
        );
      } catch (error) {
        const statusCode = getErrorCode(error);

        if (statusCode === 404 || statusCode === 410) {
          await pool.execute(
            `
            DELETE FROM push_subscriptions
            WHERE id = ?
            `,
            [subscription.id]
          );
        }

        throw error;
      }
    })
  );

  const failures = results.filter(
    result => result.status === 'rejected'
  );

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} of ${subscriptions.length} push deliveries failed`
    );
  }

  return {
    success: true,
    delivered: subscriptions.length
  };
}

async function processPendingPushDeliveries() {
  logger.info('push', 'push delivery processor invoked');

  if (!configureVapid()) {
    logger.warn('push', 'push delivery skipped: VAPID configuration missing');
    return;
  }

  logger.info('push', 'VAPID configured; checking delivery queue');

  for (let index = 0; index < BATCH_SIZE; index += 1) {
    let delivery;

    try {
      delivery = await claimNextDelivery();

      if (!delivery) return;

      await deliverToSubscriptions(delivery);
      await markDeliverySent(delivery.id);

      logger.info('push', 'push delivery completed', {
        deliveryId: delivery.id,
        attempts: delivery.attempts
      });
    } catch (error) {
      if (delivery) {
        try {
          await markDeliveryFailed(delivery, error);
        } catch (updateError) {
          logger.error('push', 'failed to update delivery status', {
            deliveryId: delivery.id,
            error: updateError
          });
        }
      }

      logger.error('push', 'push delivery attempt failed', {
        deliveryId: delivery?.id,
        error
      });
    }
  }
}

module.exports = {
  getVapidPublicKey,
  hashEndpoint,
  processPendingPushDeliveries
};
