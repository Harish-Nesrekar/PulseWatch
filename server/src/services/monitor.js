const { randomUUID, createHash } = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const { pool } = require('../db');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');
const { validatePublicUrl } = require('./ssrf');

const REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const MAX_REDIRECTS = 3;
const MAX_MONITOR_TIMEOUT_MS = 60000;

function mysqlDate(date = new Date()) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function getPositiveNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? Math.min(number, MAX_MONITOR_TIMEOUT_MS)
    : fallback;
}

function getThreshold(value, fallback) {
  const number = Math.floor(Number(value));

  return Number.isInteger(number) && number >= 1 && number <= 20
    ? number
    : fallback;
}

function transitionMonitorState(monitor, checkStatus) {
  const failureThreshold = getThreshold(monitor.failure_threshold, 3);
  const recoveryThreshold = getThreshold(monitor.recovery_threshold, 2);

  const previousFailures = Number(monitor.consecutive_failures || 0);
  const previousSuccesses = Number(monitor.consecutive_successes || 0);

  let consecutiveFailures = previousFailures;
  let consecutiveSuccesses = previousSuccesses;

  let nextStatus = monitor.status || 'PENDING';

  let transitionedToDown = false;
  let transitionedToUp = false;

  if (checkStatus === 'DOWN') {
    consecutiveFailures = previousFailures + 1;
    consecutiveSuccesses = 0;

    if (nextStatus !== 'DOWN' && consecutiveFailures >= failureThreshold) {
      nextStatus = 'DOWN';
      transitionedToDown = true;
    }
  } else {
    consecutiveSuccesses = previousSuccesses + 1;
    consecutiveFailures = 0;

    if (
      (nextStatus === 'DOWN' || nextStatus === 'PENDING') &&
      consecutiveSuccesses >= recoveryThreshold
    ) {
      nextStatus = 'UP';
      transitionedToUp = monitor.status === 'DOWN';
    }
  }

  return {
    nextStatus,
    consecutiveFailures,
    consecutiveSuccesses,
    transitionedToDown,
    transitionedToUp,
    recoveryThreshold
  };
}

function requestHeaders(url, validated, method, timeoutMs) {
  const client = url.protocol === 'https:' ? https : http;
  const addresses = validated.addresses;
  const hostname = validated.hostname;

  return new Promise((resolve, reject) => {
    let settled = false;

    const request = client.request(
      url,
      {
        method,
        agent: false,
        headers: {
          'user-agent': 'PulseWatch-Monitor/1.0'
        },
        servername: net.isIP(hostname) ? undefined : hostname,
        lookup: (requestedHost, options, callback) => {
          if (
            requestedHost.toLowerCase().replace(/\.$/, '') !== hostname
          ) {
            callback(new Error('Unexpected hostname during connection'));
            return;
          }

          if (options?.all) {
            callback(null, addresses);
            return;
          }

          const address = addresses[0];
          callback(null, address.address, address.family);
        }
      },
      response => {
        const metadata = {
          contentType: response.headers['content-type'] || null,
          contentLength: response.headers['content-length'] || null,
          server: response.headers.server || null
        };

        settled = true;

        resolve({
          statusCode: response.statusCode || null,
          location: response.headers.location || null,
          metadata
        });

        response.destroy();
      }
    );

    const timer = setTimeout(() => {
      request.destroy(new Error('Request timed out'));
    }, timeoutMs);

    request.once('error', error => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    request.once('close', () => clearTimeout(timer));

    request.end();
  });
}

async function performHealthCheck(monitor, options = {}) {
  const validateUrl = options.validateUrl || validatePublicUrl;
  const sendRequest = options.request || requestHeaders;

  const started = Date.now();
  const timeoutMs = getConfig().monitorTimeoutMs;
  const deadline = started + timeoutMs;

  let status = 'DOWN';
  let statusCode = null;
  let error = null;
  let metadata = null;

  let target = monitor.url;
  let redirects = 0;

  try {
    while (true) {
      const remainingMs = deadline - Date.now();

      if (remainingMs <= 0) {
        throw new Error('Request timed out');
      }

      const validation = await validateUrl(target, {
        timeoutMs: remainingMs
      });

      const response = await sendRequest(
        validation.url,
        validation,
        monitor.method || 'GET',
        Math.max(1, deadline - Date.now())
      );

      statusCode = response.statusCode;

      metadata = {
        ...response.metadata,
        redirects
      };

      if (REDIRECT_STATUSES.includes(statusCode)) {
        if (!response.location || redirects >= MAX_REDIRECTS) {
          throw new Error('Too many or invalid redirects');
        }

        target = new URL(response.location, validation.url).toString();
        redirects += 1;
        continue;
      }

      const expectedStatus = Number(monitor.expected_status || 200);

      status = statusCode === expectedStatus ? 'UP' : 'DOWN';

      if (status === 'DOWN') {
        error = `Expected HTTP ${expectedStatus}, received ${statusCode}`;
      }

      break;
    }
  } catch (err) {
    error =
      err.message === 'Request timed out'
        ? err.message
        : err.message || 'Health check failed';
  }

  return {
    status,
    statusCode,
    latency: Date.now() - started,
    error,
    metadata,
    checkedAt: mysqlDate()
  };
}

async function acquireCheckLease(monitorId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
      SELECT
        id,
        is_active,
        check_lease_token,
        check_lease_until,
        check_lease_until > UTC_TIMESTAMP(3) AS lease_active
      FROM monitors
      WHERE id = ?
      FOR UPDATE
      `,
      [monitorId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return {
        acquired: false,
        reason: 'MONITOR_NOT_FOUND'
      };
    }

    const monitor = rows[0];

    if (!monitor.is_active) {
      await connection.rollback();

      return {
        acquired: false,
        reason: 'MONITOR_PAUSED'
      };
    }

    if (Number(monitor.lease_active) === 1) {
      await connection.rollback();

      return {
        acquired: false,
        reason: 'CHECK_ALREADY_RUNNING'
      };
    }

    const leaseToken = randomUUID();
    const timeoutMs = getConfig().monitorTimeoutMs;
    const leaseSeconds = Math.ceil((timeoutMs + 30000) / 1000);

    await connection.execute(
      `
      UPDATE monitors
      SET
        check_lease_token = ?,
        check_lease_until = DATE_ADD(
          UTC_TIMESTAMP(3),
          INTERVAL ? SECOND
        )
      WHERE id = ?
      `,
      [leaseToken, leaseSeconds, monitorId]
    );

    await connection.commit();

    return {
      acquired: true,
      leaseToken
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
async function saveCheckResult(monitorId, leaseToken, result) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
      SELECT
        *,
        check_lease_until > UTC_TIMESTAMP(3) AS lease_active
      FROM monitors
      WHERE id = ?
      FOR UPDATE
      `,
      [monitorId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return {
        saved: false,
        reason: 'MONITOR_NOT_FOUND'
      };
    }

    const monitor = rows[0];

    if (
      monitor.check_lease_token !== leaseToken ||
      Number(monitor.lease_active) !== 1
    ) {
      await connection.rollback();

      return {
        saved: false,
        reason: 'STALE_CHECK_RESULT'
      };
    }

    if (!monitor.is_active) {
      await connection.execute(
        `
        UPDATE monitors
        SET
          check_lease_token = NULL,
          check_lease_until = NULL
        WHERE id = ?
        `,
        [monitorId]
      );

      await connection.commit();

      return {
        saved: false,
        reason: 'MONITOR_PAUSED'
      };
    }

    const {
      nextStatus,
      consecutiveFailures,
      consecutiveSuccesses,
      transitionedToDown,
      transitionedToUp,
      recoveryThreshold
    } = transitionMonitorState(monitor, result.status);

    // Save every individual health-check result.
    await connection.execute(
      `
      INSERT INTO checks (
        id,
        monitor_id,
        status,
        status_code,
        latency_ms,
        error,
        response_metadata,
        checked_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        monitorId,
        result.status,
        result.statusCode,
        result.latency,
        result.error,
        result.metadata ? JSON.stringify(result.metadata) : null,
        result.checkedAt
      ]
    );

    // Update the monitor's confirmed health state.
    await connection.execute(
      `
      UPDATE monitors
      SET
        status = ?,
        last_checked_at = ?,
        last_status_code = ?,
        last_latency_ms = ?,
        consecutive_failures = ?,
        consecutive_successes = ?,
        check_lease_token = NULL,
        check_lease_until = NULL,
        updated_at = UTC_TIMESTAMP(3)
      WHERE id = ?
      `,
      [
        nextStatus,
        result.checkedAt,
        result.statusCode,
        result.latency,
        consecutiveFailures,
        consecutiveSuccesses,
        monitorId
      ]
    );

    // Keep the related incident ID so notifications can deep-link to it.
    let incidentId = null;

    // Create or update an incident while the monitor is confirmed DOWN.
    if (nextStatus === 'DOWN' && result.status === 'DOWN') {
      const [activeIncidents] = await connection.execute(
        `
        SELECT id
        FROM incidents
        WHERE monitor_id = ?
          AND status IN ('OPEN', 'ACKNOWLEDGED')
        LIMIT 1
        FOR UPDATE
        `,
        [monitorId]
      );

      if (activeIncidents.length === 0) {
        incidentId = randomUUID();

        await connection.execute(
          `
          INSERT INTO incidents (
            id,
            user_id,
            monitor_id,
            title,
            message,
            status,
            started_at
          )
          VALUES (?, ?, ?, ?, ?, 'OPEN', ?)
          `,
          [
            incidentId,
            monitor.user_id,
            monitorId,
            `${monitor.name} is down`,
            result.error || 'Health check failed',
            result.checkedAt
          ]
        );
      } else {
        incidentId = activeIncidents[0].id;

        await connection.execute(
          `
          UPDATE incidents
          SET message = ?
          WHERE id = ?
          `,
          [result.error || 'Health check failed', incidentId]
        );
      }
    }

    // Create exactly one notification when the monitor transitions to DOWN.
    // This insert is part of the same transaction as the monitor/incident update.

    if (transitionedToDown) {
      const eventKey = createHash('sha256')
        .update(`${monitorId}:DOWN:${result.checkedAt}`)
        .digest('hex');

      const notificationId = randomUUID();

      const [insertResult] = await connection.execute(
        `
    INSERT INTO notifications (
      id,
      user_id,
      monitor_id,
      incident_id,
      event_key,
      type,
      title,
      message,
      link
    )
    VALUES (?, ?, ?, ?, ?, 'MONITOR_DOWN', ?, ?, ?)
    ON DUPLICATE KEY UPDATE id = id
    `,
        [
          notificationId,
          monitor.user_id,
          monitorId,
          incidentId,
          eventKey,
          `${monitor.name} is down`,
          result.error || 'The monitor failed its health checks.',
          incidentId
            ? `/incidents/${incidentId}`
            : `/monitors/${monitorId}`
        ]
      );

      // Queue push delivery only when a new notification was inserted.
      if (insertResult.affectedRows === 1) {
        await connection.execute(
          `
      INSERT INTO push_delivery_outbox (
        id,
        notification_id,
        user_id
      )
      VALUES (?, ?, ?)
      `,
          [
            randomUUID(),
            notificationId,
            monitor.user_id
          ]
        );
      }
    }



    // Resolve active incidents only after confirmed recovery.
    if (transitionedToUp) {
      const [activeIncidents] = await connection.execute(
        `
        SELECT id
        FROM incidents
        WHERE monitor_id = ?
          AND status IN ('OPEN', 'ACKNOWLEDGED')
        LIMIT 1
        FOR UPDATE
        `,
        [monitorId]
      );

      const recoveredIncidentId = activeIncidents[0]?.id || null;

      // Resolve the active incident in the same transaction.
      await connection.execute(
        `
        UPDATE incidents
        SET
          status = 'RESOLVED',
          resolved_at = ?,
          resolution_type = 'AUTOMATIC',
          resolution_note = ?
        WHERE monitor_id = ?
          AND status IN ('OPEN', 'ACKNOWLEDGED')
        `,
        [
          result.checkedAt,
          `Automatically resolved after ${recoveryThreshold} consecutive successful health checks.`,
          monitorId
        ]
      );

      // Create the recovery notification.
      const eventKey = createHash('sha256')
        .update(`${monitorId}:RECOVERED:${result.checkedAt}`)
        .digest('hex');

      const notificationId = randomUUID();

      const [insertResult] = await connection.execute(
        `
        INSERT INTO notifications (
          id,
          user_id,
          monitor_id,
          incident_id,
          event_key,
          type,
          title,
          message,
          link
        )
        VALUES (?, ?, ?, ?, ?, 'MONITOR_RECOVERED', ?, ?, ?)
        ON DUPLICATE KEY UPDATE id = id
        `,
        [
          notificationId,
          monitor.user_id,
          monitorId,
          recoveredIncidentId,
          eventKey,
          `${monitor.name} has recovered`,
          `The monitor is healthy again after ${recoveryThreshold} consecutive successful health checks.`,
          recoveredIncidentId
            ? `/incidents/${recoveredIncidentId}`
            : `/monitors/${monitorId}`
        ]
      );

      // Queue push delivery only when a new notification was inserted.
      if (insertResult.affectedRows === 1) {
        await connection.execute(
          `
          INSERT INTO push_delivery_outbox (
            id,
            notification_id,
            user_id
          )
          VALUES (?, ?, ?)
          `,
          [
            randomUUID(),
            notificationId,
            monitor.user_id
          ]
        );
      }
    }



    await connection.commit();

    return {
      saved: true,
      status: nextStatus,
      checkStatus: result.status,
      consecutiveFailures,
      consecutiveSuccesses,
      transitionedToDown,
      transitionedToUp,
      checkedAt: result.checkedAt
    };
  } catch (err) {
    await connection.rollback();

    logger.error('monitor', 'check result persistence failed', {
      monitorId,
      error: err
    });

    throw err;
  } finally {
    connection.release();
  }
}
async function releaseCheckLease(monitorId, leaseToken) {
  try {
    await pool.execute(
      `
      UPDATE monitors
      SET
        check_lease_token = NULL,
        check_lease_until = NULL
      WHERE id = ?
        AND check_lease_token = ?
      `,
      [monitorId, leaseToken]
    );
  } catch (err) {
    logger.error('monitor', 'could not release check lease', {
      monitorId,
      error: err
    });
  }
}

async function runCheck(monitor, options = {}) {
  const monitorId = monitor.id;

  const lease = await acquireCheckLease(monitorId);

  if (!lease.acquired) {
    return {
      skipped: true,
      reason: lease.reason
    };
  }

  try {
    const result = await performHealthCheck(monitor, options);

    return await saveCheckResult(
      monitorId,
      lease.leaseToken,
      result
    );
  } catch (err) {
    await releaseCheckLease(monitorId, lease.leaseToken);
    throw err;
  }
}

let cyclePromise = null;

async function runDueChecks(options = {}) {
  if (cyclePromise) {
    return cyclePromise;
  }

  cyclePromise = (async () => {
    try {
      const concurrency = Number(getConfig().monitorConcurrency);

      if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 25) {
        throw new Error('MONITOR_CONCURRENCY must be an integer between 1 and 25');
      }
      const database = options.database || pool;

      const [dueMonitors] = await database.execute(
        `
        SELECT *
        FROM monitors
        WHERE
          is_active = 1
          AND (
            last_checked_at IS NULL
            OR DATE_ADD(
              last_checked_at,
              INTERVAL interval_seconds SECOND
            ) <= UTC_TIMESTAMP(3)
          )
          AND (
            check_lease_until IS NULL
            OR check_lease_until <= UTC_TIMESTAMP(3)
          )
        ORDER BY
          last_checked_at IS NOT NULL,
          last_checked_at ASC
               LIMIT ${concurrency}
        `
      );

      await Promise.all(
        dueMonitors.map(async monitor => {
          try {
            const result = await (options.runCheck || runCheck)(monitor);

            if (result?.saved) {
              await options.onCheckCompleted?.(monitor, result);
            }
          } catch (err) {
            logger.error('monitor', 'monitor check failed', {
              monitorId: monitor.id,
              error: err
            });
          }
        })
      );

      return true;
    } catch (err) {
      logger.error('worker', 'monitor scheduling cycle failed', {
        error: err
      });

      throw err;
    } finally {
      cyclePromise = null;
    }
  })();

  return cyclePromise;
}

function startMonitorWorker(options = {}) {
  const intervalMs = getPositiveNumber(options.intervalMs, 15000);

  const { createWorkerHealthStore } = require('./worker-health');

  const healthStore =
    options.healthStore || createWorkerHealthStore(pool);

  const workerId = healthStore.workerId || 'test-worker';

  let stopped = false;
  let interval;
  let cycleInFlight;
  let startPromise;

  const runCycle = () => {
    if (stopped) return Promise.resolve();

    if (cycleInFlight) return cycleInFlight;

    cycleInFlight = (async () => {
      try {
        await healthStore.beginCycle?.();

        await (options.runDueChecks || runDueChecks)({
          ...options,

          onCheckCompleted: async (monitor, result) => {
            await healthStore.checkCompleted?.();

            await options.onCheckCompleted?.(monitor, result);

            logger.info('worker', 'monitor check completed', {
              workerId,
              monitorId: monitor.id,
              status: result.checkStatus
            });
          }
        });

        // Process queued browser push notifications after each monitor cycle.
        if (options.onCycleCompleted) {
          logger.info('push', 'push processor callback started', {
            workerId
          });

          try {
            await options.onCycleCompleted();

            logger.info('push', 'push processor callback completed', {
              workerId
            });
          } catch (pushError) {
            // Push delivery failures must not mark monitor checks as failed.
            logger.error('push', 'push processor callback failed', {
              workerId,
              error: pushError
            });
          }
        }

        await healthStore.completeCycle?.();
      } catch (error) {
        await healthStore.failCycle?.();

        logger.error('worker', 'monitor cycle failed', {
          workerId,
          error
        });

        if (options.alertManager) {
          try {
            await options.alertManager.send('worker_cycle_failed');
          } catch (alertError) {
            logger.error('worker', 'cycle failure alert failed', {
              workerId,
              error: alertError
            });
          }
        }
      } finally {
        cycleInFlight = null;
      }
    })();

    return cycleInFlight;
  };

  startPromise = (async () => {
    await healthStore.start?.();

    if (stopped) return;

    logger.info('worker', 'monitor worker started', {
      workerId,
      intervalMs
    });

    interval = setInterval(() => {
      void runCycle();
    }, intervalMs);

    interval.unref?.();

    void runCycle();
  })();

  startPromise.catch(error => {
    logger.error('worker', 'monitor worker initialization failed', {
      workerId,
      error
    });
  });

  return {
    workerId,

    ready: startPromise,

    runOnce: async () => {
      await startPromise;
      return runCycle();
    },

    async stop() {
      if (stopped) return;

      stopped = true;

      clearInterval(interval);

      await startPromise;

      await healthStore.markStopping?.();

      if (cycleInFlight) {
        await cycleInFlight;
      }

      await healthStore.stop?.();

      logger.info('worker', 'monitor worker stopped', {
        workerId
      });
    }
  };
}

module.exports = {
  performHealthCheck,
  transitionMonitorState,
  runCheck,
  runDueChecks,
  startMonitorWorker
};
