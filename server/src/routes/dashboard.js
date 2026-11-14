const router = require('express').Router();

const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/http');

function mysqlDate(date) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const since = mysqlDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const [
      [monitorStats],
      [checkRows],
      [recentIncidents],
      [recentActivity],
      [timeline]
    ] = await Promise.all([
      pool.execute(
        `
        SELECT
          COUNT(*) AS total_monitors,
          SUM(CASE WHEN is_active = 1 AND status = 'UP' THEN 1 ELSE 0 END) AS operational_monitors,
          SUM(CASE WHEN is_active = 1 AND status = 'DOWN' THEN 1 ELSE 0 END) AS down_monitors,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS paused_monitors
        FROM monitors
        WHERE user_id = ?
        `,
        [userId]
      ),
      pool.execute(
        `
        SELECT
          COUNT(*) AS total_checks,
          SUM(CASE WHEN c.status = 'UP' THEN 1 ELSE 0 END) AS successful_checks,
          AVG(c.latency_ms) AS avg_response_time_ms
        FROM checks c
        INNER JOIN monitors m ON m.id = c.monitor_id
        WHERE m.user_id = ?
          AND c.checked_at >= ?
        `,
        [userId, since]
      ),
      pool.execute(
        `
        SELECT
          i.id, i.monitor_id, i.title, i.message, i.status,
          i.started_at, i.resolved_at, m.name AS monitor_name
        FROM incidents i
        INNER JOIN monitors m ON m.id = i.monitor_id
        WHERE i.user_id = ?
        ORDER BY i.started_at DESC
        LIMIT 5
        `,
        [userId]
      ),
      pool.execute(
        `
        SELECT
          c.id, c.monitor_id, c.status, c.status_code,
          c.latency_ms, c.error, c.checked_at, m.name AS monitor_name
        FROM checks c
        INNER JOIN monitors m ON m.id = c.monitor_id
        WHERE m.user_id = ?
        ORDER BY c.checked_at DESC
        LIMIT 10
        `,
        [userId]
      ),
      pool.execute(
        `
        SELECT
          DATE_FORMAT(c.checked_at, '%Y-%m-%dT%H:00:00Z') AS bucket,
          COUNT(*) AS checks,
          SUM(CASE WHEN c.status = 'UP' THEN 1 ELSE 0 END) AS successful,
          ROUND(AVG(c.latency_ms)) AS avg_response_time_ms
        FROM checks c
        INNER JOIN monitors m ON m.id = c.monitor_id
        WHERE m.user_id = ?
          AND c.checked_at >= ?
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [userId, since]
      )
    ]);

    const [activeIncidentRows] = await pool.execute(
      `
      SELECT COUNT(*) AS count
      FROM incidents
      WHERE user_id = ?
        AND status IN ('OPEN', 'ACKNOWLEDGED')
      `,
      [userId]
    );

    const checks = Number(checkRows[0].total_checks || 0);
    const successful = Number(checkRows[0].successful_checks || 0);
    const stats = monitorStats[0];

    return ok(res, {
      period: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        label: 'Last 24 hours'
      },
      stats: {
        totalMonitors: Number(stats.total_monitors || 0),
        operationalMonitors: Number(stats.operational_monitors || 0),
        downMonitors: Number(stats.down_monitors || 0),
        pausedMonitors: Number(stats.paused_monitors || 0),
        activeIncidents: Number(activeIncidentRows[0].count || 0),
        overallUptime: checks > 0
          ? Number(((successful / checks) * 100).toFixed(2))
          : null,
        checkCount: checks,
        avgResponseTimeMs: checkRows[0].avg_response_time_ms === null
          ? null
          : Math.round(Number(checkRows[0].avg_response_time_ms))
      },
      recentIncidents,
      recentActivity,
      timeline: timeline.map(row => ({
        ...row,
        checks: Number(row.checks),
        successful: Number(row.successful),
        avg_response_time_ms: row.avg_response_time_ms === null
          ? null
          : Number(row.avg_response_time_ms),
        uptime: Number(row.checks) > 0
          ? Number(((Number(row.successful) / Number(row.checks)) * 100).toFixed(2))
          : null
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return fail(res, 'Unable to load dashboard data', 500);
  }
});

module.exports = router;
