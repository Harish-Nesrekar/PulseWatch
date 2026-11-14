const {
  testConnection,
  closePool
} = require('./db');
const { startMonitorWorker } = require('./services/monitor');
const { createAlertManager } = require('./services/alerts');
const {
  processPendingPushDeliveries
} = require('./services/pushNotifications');
const logger = require('./utils/logger');

let worker;
let shutdownPromise;

async function start() {
  try {
    await testConnection();
    if (shutdownPromise) return;
   worker = startMonitorWorker({
  alertManager: createAlertManager(),
  onCycleCompleted: processPendingPushDeliveries
});
    await worker.ready;
  } catch (error) {
    logger.error('worker', 'worker startup failed', { error });
    try {
      if (worker) await worker.stop();
    } catch (closeError) {
      logger.error('worker', 'monitor worker cleanup failed', { error: closeError });
    }
    try {
      await closePool();
    } catch (closeError) {
      logger.error('worker', 'database pool cleanup failed', { error: closeError });
    }
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    logger.info('worker', 'shutdown started', {
      signal,
      workerId: worker?.workerId
    });
    const forceTimer = setTimeout(() => {
      logger.error('worker', 'shutdown grace period exceeded', {
        workerId: worker?.workerId
      });
      process.exit(1);
    }, 90000);

    let failed = false;
    if (worker) {
      try {
        await worker.stop();
      } catch (error) {
        failed = true;
        logger.error('worker', 'monitor worker shutdown failed', {
          signal,
          workerId: worker.workerId,
          error
        });
      }
    }
    try {
      await closePool();
    } catch (error) {
      failed = true;
      logger.error('worker', 'database pool shutdown failed', {
        signal,
        error
      });
    }

    clearTimeout(forceTimer);
    if (failed) {
      process.exitCode = 1;
      logger.warn('worker', 'shutdown completed with cleanup errors', {
        signal,
        workerId: worker?.workerId
      });
    } else {
      logger.info('worker', 'shutdown completed', {
        signal,
        workerId: worker?.workerId
      });
    }
  })();

  return shutdownPromise;
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
