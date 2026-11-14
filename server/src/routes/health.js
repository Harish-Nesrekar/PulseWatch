const logger = require('../utils/logger');
const { getWorkerHealth } = require('../services/worker-health');

function createHealthHandlers(options) {
  const log = options.logger || logger;
  const readWorkerHealth = options.readWorkerHealth ||
    (() => getWorkerHealth(options.database, {
      progressTimeoutMs: options.progressTimeoutMs
    }));

  function live(_req, res) {
    return res.status(200).json({
      success: true,
      status: 'alive'
    });
  }

  async function worker(req, res) {
    try {
      const health = await readWorkerHealth();
      const healthy = health.status === 'healthy';
      return res.status(healthy ? 200 : 503).json({
        success: healthy,
        worker: health
      });
    } catch (error) {
      log.error('api', 'worker health endpoint failed', {
        requestId: req.requestId,
        error
      });
      return res.status(503).json({
        success: false,
        worker: { status: 'unknown' }
      });
    }
  }

  async function ready(req, res) {
    try {
      await options.database.execute('SELECT 1');
      const health = await readWorkerHealth();
      const ready = health.status === 'healthy';

      return res.status(ready ? 200 : 503).json({
        success: ready,
        status: ready ? 'ready' : 'not_ready',
        worker: { status: health.status }
      });
    } catch (error) {
      log.error('api', 'readiness check failed', {
        requestId: req.requestId,
        error
      });
      return res.status(503).json({
        success: false,
        status: 'not_ready',
        worker: { status: 'unknown' }
      });
    }
  }

  return { live, worker, ready };
}

module.exports = {
  createHealthHandlers
};
