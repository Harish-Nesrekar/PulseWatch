const router = require('express').Router();

const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/http');

function formatUtc(date) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function parsePeriod(query) {
  if (query.from || query.to) {
    if (
      typeof query.from !== 'string' ||
      typeof query.to !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(query.from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(query.to)
    ) {
      return null;
    }

    const start = new Date(`${query.from}T00:00:00.000Z`);
    const end = new Date(`${query.to}T00:00:00.000Z`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.toISOString().slice(0, 10) !== query.from ||
      end.toISOString().slice(0, 10) !== query.to ||
      end < start
    ) {
      return null;
    }

    end.setUTCDate(end.getUTCDate() + 1);

    if (end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return {
      start,
      end,
      label: `${query.from} to ${query.to}`
    };
  }

  const requestedRange = Number(query.range) || 24;
  const rangeHours = Math.min(Math.max(Math.floor(requestedRange), 1), 720);
  const end = new Date();
  const start = new Date(end.getTime() - rangeHours * 60 * 60 * 1000);

  return {
    start,
    end,
    label: `Last ${rangeHours} hours`
  };
}

function numericOrNull(value) {
  return value === null || value === undefined
    ? null
    : Number(value);
}

router.use(auth);

router.get('/', async (req, res) => {
  const period = parsePeriod(req.query);

  if (!period) {
    return fail(
      res,
      'Choose a valid date range no longer than 31 days',
      422
    );
  }

  try {
    const userId = req.user.userId;
    const start = formatUtc(period.start);
    const end = formatUtc(period.end);
    const bucketFormat =
      period.end.getTime() - period.start.getTime() <= 48 * 60 * 60 * 1000
        ? '%Y-%m-%dT%H:00:00Z'
        : '%Y-%m-%d';

    const [
      [checkTotals],
      [monitorRows],
      [timelineRows],
      [incidentRows],
      [incidentFrequency]
    ] = await Promise.all([
      pool.execute(
        `
        SELECT
          COUNT(*) AS check_count,
          SUM(CASE WHEN c.status = 'UP' THEN 1 ELSE 0 END) AS successful_checks,
          AVG(c.latency_ms) AS avg_response_time_ms,
          MIN(c.latency_ms) AS min_response_time_ms,
          MAX(c.latency_ms) AS max_response_time_ms
        FROM checks c
        INNER JOIN monitors m ON m.id = c.monitor_id
        WHERE m.user_id = ?
          AND c.checked_at >= ?
          AND c.checked_at < ?
        `,
        [userId, start, end]
      ),
      pool.execute(
        `
        SELECT
          m.id,
          m.name,
          COUNT(c.id) AS check_count,
          SUM(CASE WHEN c.status = 'UP' THEN 1 ELSE 0 END) AS successful_checks,
          AVG(c.latency_ms) AS avg_response_time_ms,
          MIN(c.latency_ms) AS min_response_time_ms,
          MAX(c.latency_ms) AS max_response_time_ms
        FROM monitors m
        LEFT JOIN checks c
          ON c.monitor_id = m.id
          AND c.checked_at >= ?
          AND c.checked_at < ?
        WHERE m.user_id = ?
        GROUP BY m.id, m.name, m.created_at
        ORDER BY m.created_at DESC
        `,
        [start, end, userId]
      ),
      pool.execute(
        `
        SELECT
          DATE_FORMAT(c.checked_at, ?) AS bucket,
          COUNT(*) AS check_count,
          SUM(CASE WHEN c.status = 'UP' THEN 1 ELSE 0 END) AS successful_checks,
          ROUND(AVG(c.latency_ms)) AS avg_response_time_ms,
          MIN(c.latency_ms) AS min_response_time_ms,
          MAX(c.latency_ms) AS max_response_time_ms
        FROM checks c
        INNER JOIN monitors m ON m.id = c.monitor_id
        WHERE m.user_id = ?
          AND c.checked_at >= ?
          AND c.checked_at < ?
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [bucketFormat, userId, start, end]
      ),
      pool.execute(
        `
        SELECT
          COUNT(*) AS incident_count,
          COALESCE(
            SUM(
              GREATEST(
                0,
                TIMESTAMPDIFF(
                  MICROSECOND,
                  GREATEST(i.started_at, ?),
                  LEAST(COALESCE(i.resolved_at, UTC_TIMESTAMP(3)), ?)
                )
              ) / 1000
            ),
            0
          ) AS downtime_ms
        FROM incidents i
        WHERE i.user_id = ?
          AND i.started_at < ?
          AND (i.resolved_at IS NULL OR i.resolved_at > ?)
        `,
        [start, end, userId, end, start]
      ),
      pool.execute(
        `
        SELECT
          DATE_FORMAT(i.started_at, '%Y-%m-%d') AS day,
          COUNT(*) AS incidents
        FROM incidents i
        WHERE i.user_id = ?
          AND i.started_at >= ?
          AND i.started_at < ?
        GROUP BY day
        ORDER BY day ASC
        `,
        [userId, start, end]
      )
    ]);

    const checks = Number(checkTotals[0].check_count || 0);
    const successful = Number(checkTotals[0].successful_checks || 0);

    return ok(res, {
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        label: period.label
      },
      summary: {
        checkCount: checks,
        successfulChecks: successful,
        overallUptime: checks > 0
          ? Number(((successful / checks) * 100).toFixed(2))
          : null,
        avgResponseTimeMs: numericOrNull(checkTotals[0].avg_response_time_ms),
        minResponseTimeMs: numericOrNull(checkTotals[0].min_response_time_ms),
        maxResponseTimeMs: numericOrNull(checkTotals[0].max_response_time_ms),
        downtimeMs: Number(incidentRows[0].downtime_ms || 0),
        incidentCount: Number(incidentRows[0].incident_count || 0)
      },
      monitors: monitorRows.map(row => {
        const checkCount = Number(row.check_count || 0);
        const successes = Number(row.successful_checks || 0);

        return {
          id: row.id,
          name: row.name,
          checkCount,
          successfulChecks: successes,
          uptime: checkCount > 0
            ? Number(((successes / checkCount) * 100).toFixed(2))
            : null,
          avgResponseTimeMs: numericOrNull(row.avg_response_time_ms),
          minResponseTimeMs: numericOrNull(row.min_response_time_ms),
          maxResponseTimeMs: numericOrNull(row.max_response_time_ms)
        };
      }),
      timeline: timelineRows.map(row => {
        const checkCount = Number(row.check_count);
        const successes = Number(row.successful_checks);

        return {
          bucket: row.bucket,
          checkCount,
          successfulChecks: successes,
          uptime: checkCount > 0
            ? Number(((successes / checkCount) * 100).toFixed(2))
            : null,
          avgResponseTimeMs: numericOrNull(row.avg_response_time_ms),
          minResponseTimeMs: numericOrNull(row.min_response_time_ms),
          maxResponseTimeMs: numericOrNull(row.max_response_time_ms)
        };
      }),
      incidentFrequency: incidentFrequency.map(row => ({
        day: row.day,
        incidents: Number(row.incidents)
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return fail(res, 'Unable to load analytics', 500);
  }
});

module.exports = router;
