const { getConfig } = require('../config/env');
const logger = require('../utils/logger');

const allowedEvents = new Set([
  'worker_cycle_failed',
  'worker_unhealthy',
  'database_unavailable',
  'monitoring_stalled'
]);
const allowedStatuses = new Set([
  'not_running',
  'heartbeat_stale',
  'stalled',
  'unknown',
  'starting'
]);

function createAlertManager(options = {}) {
  const webhookUrl = options.webhookUrl ?? getConfig().alertWebhookUrl;
  const fetchImpl = options.fetch || globalThis.fetch;
  const cooldownMs = options.cooldownMs ?? 15 * 60 * 1000;
  const now = options.now || Date.now;
  const lastSentAt = new Map();

  async function send(event, details = {}) {
    if (!webhookUrl || !allowedEvents.has(event)) {
      return { sent: false, reason: 'disabled_or_unsupported' };
    }

    const currentTime = now();
    const previousTime = lastSentAt.get(event);
    if (previousTime !== undefined && currentTime - previousTime < cooldownMs) {
      return { sent: false, reason: 'cooldown' };
    }
    lastSentAt.set(event, currentTime);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetchImpl(webhookUrl, {
        method: 'POST',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          component: 'pulsewatch',
          event,
          timestamp: new Date(currentTime).toISOString(),
          ...(allowedStatuses.has(details.status)
            ? { status: details.status }
            : {})
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        logger.warn('alerts', 'webhook delivery failed', {
          event,
          statusCode: response.status
        });
        return { sent: false, reason: 'delivery_failed' };
      }

      logger.info('alerts', 'webhook alert delivered', { event });
      return { sent: true };
    } catch (error) {
      logger.warn('alerts', 'webhook delivery failed', {
        event,
        errorName: error?.name || 'Error'
      });
      return { sent: false, reason: 'delivery_failed' };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { send };
}

module.exports = {
  createAlertManager
};
