const { randomUUID } = require('node:crypto');
const logger = require('../utils/logger');

const HEARTBEAT_INTERVAL_MS = 10000;
const HEARTBEAT_STALE_MS = 45000;
const MIN_PROGRESS_STALE_MS = 120000;

function age(value, now) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

function assessWorkerHealth(worker, dueMonitorCount = 0, options = {}) {
  if (!worker || worker.status === 'stopped' || worker.status === 'stopping') {
    return { status: 'not_running' };
  }

  const now = options.now ?? Date.now();
  const heartbeatAgeMs = age(worker.heartbeat_age_ms, now);
  const progressTimeoutMs = Math.max(
    MIN_PROGRESS_STALE_MS,
    Number(options.progressTimeoutMs) || MIN_PROGRESS_STALE_MS
  );
  const lastCycleAgeMs = age(worker.last_cycle_age_ms, now);
  const lastCheckAgeMs = age(worker.last_check_age_ms, now);
  const cycleStartedAgeMs = age(worker.cycle_started_age_ms, now);
  const uptimeMs = age(worker.uptime_ms, now);
  const summary = {
    status: 'healthy',
    heartbeatAgeMs,
    lastCycleAgeMs,
    lastCheckAgeMs,
    uptimeMs
  };

  if (heartbeatAgeMs === null || heartbeatAgeMs > HEARTBEAT_STALE_MS) {
    return { ...summary, status: 'heartbeat_stale' };
  }

  if (worker.status === 'starting') {
    return uptimeMs !== null && uptimeMs > progressTimeoutMs
      ? { ...summary, status: 'stalled' }
      : { ...summary, status: 'starting' };
  }

  if (
    (cycleStartedAgeMs !== null && cycleStartedAgeMs > progressTimeoutMs) ||
    (cycleStartedAgeMs === null &&
      (
        lastCycleAgeMs === null
          ? uptimeMs === null || uptimeMs > progressTimeoutMs
          : lastCycleAgeMs > progressTimeoutMs
      )) ||
    (
      Number(dueMonitorCount) > 0 &&
      lastCheckAgeMs !== null &&
      lastCheckAgeMs > progressTimeoutMs
    )
  ) {
    return { ...summary, status: 'stalled' };
  }

  if (
    Number(dueMonitorCount) > 0 &&
    lastCheckAgeMs === null &&
    uptimeMs !== null &&
    uptimeMs > progressTimeoutMs
  ) {
    return { ...summary, status: 'stalled' };
  }

  return summary;
}

async function getWorkerHealth(database, options = {}) {
  const [workers] = await database.execute(`
    SELECT
      worker_id,
      status,
      TIMESTAMPDIFF(MICROSECOND, heartbeat_at, UTC_TIMESTAMP(3)) / 1000
        AS heartbeat_age_ms,
      TIMESTAMPDIFF(MICROSECOND, last_cycle_at, UTC_TIMESTAMP(3)) / 1000
        AS last_cycle_age_ms,
      TIMESTAMPDIFF(MICROSECOND, last_check_at, UTC_TIMESTAMP(3)) / 1000
        AS last_check_age_ms,
      TIMESTAMPDIFF(MICROSECOND, cycle_started_at, UTC_TIMESTAMP(3)) / 1000
        AS cycle_started_age_ms,
      TIMESTAMPDIFF(MICROSECOND, started_at, UTC_TIMESTAMP(3)) / 1000
        AS uptime_ms
    FROM pulsewatch_worker_health
    WHERE status IN ('starting', 'running', 'stopping')
    ORDER BY heartbeat_at DESC
    LIMIT 1
  `);

  if (workers.length === 0) {
    return assessWorkerHealth(null);
  }

  const [dueRows] = await database.execute(`
    SELECT COUNT(*) AS due_count
    FROM monitors
    WHERE is_active = 1
      AND (
        last_checked_at IS NULL
        OR DATE_ADD(last_checked_at, INTERVAL interval_seconds SECOND)
          <= UTC_TIMESTAMP(3)
      )
      AND (
        check_lease_until IS NULL
        OR check_lease_until <= UTC_TIMESTAMP(3)
      )
  `);

  return assessWorkerHealth(
    workers[0],
    Number(dueRows[0]?.due_count || 0),
    options
  );
}

function createWorkerHealthStore(database, options = {}) {
  const workerId = options.workerId || randomUUID();
  const heartbeatIntervalMs = options.heartbeatIntervalMs || HEARTBEAT_INTERVAL_MS;
  let heartbeatTimer;
  let started = false;
  let stopped = false;

  async function update(operation, sql, values = []) {
    if (!started || stopped) return;
    try {
      await database.execute(sql, values);
    } catch (error) {
      logger.error('worker', 'health state update failed', {
        workerId,
        operation,
        error
      });
    }
  }

  return {
    workerId,

    async start() {
      try {
        await database.execute(
          `INSERT INTO pulsewatch_worker_health
            (worker_id, status, started_at, heartbeat_at)
           VALUES (?, 'running', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
          [workerId]
        );
        started = true;
        heartbeatTimer = setInterval(() => {
          update(
            'heartbeat',
            `UPDATE pulsewatch_worker_health
             SET heartbeat_at = UTC_TIMESTAMP(3)
             WHERE worker_id = ? AND status = 'running'`,
            [workerId]
          );
        }, heartbeatIntervalMs);
        heartbeatTimer.unref?.();
        return true;
      } catch (error) {
        logger.error('worker', 'health registration failed', {
          workerId,
          error
        });
        return false;
      }
    },

    beginCycle() {
      return update(
        'cycle_start',
        `UPDATE pulsewatch_worker_health
         SET cycle_started_at = UTC_TIMESTAMP(3), heartbeat_at = UTC_TIMESTAMP(3)
         WHERE worker_id = ? AND status = 'running'`,
        [workerId]
      );
    },

    completeCycle() {
      return update(
        'cycle_complete',
        `UPDATE pulsewatch_worker_health
         SET last_cycle_at = UTC_TIMESTAMP(3), cycle_started_at = NULL,
             heartbeat_at = UTC_TIMESTAMP(3)
         WHERE worker_id = ? AND status = 'running'`,
        [workerId]
      );
    },

    failCycle() {
      return update(
        'cycle_failure',
        `UPDATE pulsewatch_worker_health
         SET cycle_started_at = NULL, heartbeat_at = UTC_TIMESTAMP(3)
         WHERE worker_id = ? AND status = 'running'`,
        [workerId]
      );
    },

    checkCompleted() {
      return update(
        'check_complete',
        `UPDATE pulsewatch_worker_health
         SET last_check_at = UTC_TIMESTAMP(3), heartbeat_at = UTC_TIMESTAMP(3)
         WHERE worker_id = ? AND status = 'running'`,
        [workerId]
      );
    },

    markStopping() {
      return update(
        'stopping',
        `UPDATE pulsewatch_worker_health
         SET status = 'stopping', heartbeat_at = UTC_TIMESTAMP(3)
         WHERE worker_id = ? AND status = 'running'`,
        [workerId]
      );
    },

    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(heartbeatTimer);
      if (!started) return;
      try {
        await database.execute(
          `UPDATE pulsewatch_worker_health
           SET status = 'stopped', heartbeat_at = UTC_TIMESTAMP(3),
               cycle_started_at = NULL
           WHERE worker_id = ?`,
          [workerId]
        );
      } catch (error) {
        logger.error('worker', 'health shutdown update failed', {
          workerId,
          error
        });
      }
    }
  };
}

function startWorkerHealthWatchdog(options) {
  const intervalMs = options.intervalMs ?? 15000;
  const startupGraceMs = options.startupGraceMs ?? HEARTBEAT_STALE_MS;
  const now = options.now || Date.now;
  const startedAt = now();
  const readHealth = options.readHealth || (() => getWorkerHealth(
    options.database,
    { progressTimeoutMs: options.progressTimeoutMs }
  ));
  let interval;
  let stopped = false;
  let checking = false;
  let pendingCheck;
  let lastStatus;

  async function notify(event, details) {
    try {
      await options.alertManager?.send(event, details);
    } catch (error) {
      logger.error('api', 'health alert failed', { error });
    }
  }

  async function checkOnce() {
    if (stopped) return;
    if (checking) return pendingCheck;
    checking = true;
    pendingCheck = (async () => {
      try {
        const health = await readHealth();
        if (health.status !== lastStatus) {
          logger.info('api', 'worker health state changed', {
            workerStatus: health.status
          });
          lastStatus = health.status;
        }

        const withinStartupGrace =
          health.status === 'not_running' &&
          now() - startedAt < startupGraceMs;
        if (
          !withinStartupGrace &&
          ['not_running', 'heartbeat_stale', 'stalled'].includes(health.status)
        ) {
          const event = health.status === 'stalled'
            ? 'monitoring_stalled'
            : 'worker_unhealthy';
          await notify(event, { status: health.status });
        }
      } catch (error) {
        logger.error('api', 'worker health check failed', { error });
        await notify('database_unavailable', { status: 'unknown' });
      } finally {
        checking = false;
        pendingCheck = undefined;
      }
    })();

    return pendingCheck;
  }

  interval = setInterval(() => {
    void checkOnce();
  }, intervalMs);
  interval.unref?.();
  void checkOnce();

  return {
    checkOnce,
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      return pendingCheck;
    }
  };
}

module.exports = {
  HEARTBEAT_STALE_MS,
  MIN_PROGRESS_STALE_MS,
  assessWorkerHealth,
  createWorkerHealthStore,
  getWorkerHealth,
  startWorkerHealthWatchdog
};
