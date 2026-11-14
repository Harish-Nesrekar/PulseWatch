
const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const { configure } = require('./config/env');
const config = configure(process.env);
const {
  processPendingPushDeliveries
} = require('./services/pushNotifications');

const logger = require('./utils/logger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const {
  pool,
  testConnection,
  closePool
} = require('./db');

const { startMonitorWorker } = require('./services/monitor');
const requireSameOrigin = require('./middleware/require-same-origin');
const { requireHttps } = require('./middleware/require-https');
const {
  createHelmetOptions,
  permissionsPolicy
} = require('./middleware/security-headers');
const createApiErrorHandler = require('./middleware/api-error-handler');
const requestContext = require('./middleware/request-context');
const { closeHttpServer } = require('./utils/graceful-shutdown');
const { createAlertManager } = require('./services/alerts');
const { startWorkerHealthWatchdog } = require('./services/worker-health');
const { createHealthHandlers } = require('./routes/health');

const authRoutes = require('./routes/authRoutes');
const monitorRoutes = require('./routes/monitors');
const dashboardRoutes = require('./routes/dashboard');
const incidentRoutes = require('./routes/incidents');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const statusPageRoutes = require('./routes/statusPages');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const alertManager = createAlertManager();

const PORT = config.port;
const CLIENT_ORIGIN = config.clientOrigin;
const healthHandlers = createHealthHandlers({
  database: pool,
  progressTimeoutMs: Math.max(120000, config.monitorTimeoutMs + 30000)
});

app.set(
  'trust proxy',
  config.trustedProxyIps.length > 0 ? config.trustedProxyIps : false
);

app.use(requestContext);

// Security middleware
app.use(helmet(createHelmetOptions(config.isProduction)));
app.use(permissionsPolicy);

app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin === CLIENT_ORIGIN ? CLIENT_ORIGIN : false);
  },
  credentials: true
}));

app.use('/api', requireHttps(config.isProduction));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use('/api', requireSameOrigin);

app.get('/api/health/live', healthHandlers.live);
app.get('/api/health/worker', healthHandlers.worker);
app.get('/api/health/ready', healthHandlers.ready);
app.get('/api/health', healthHandlers.ready);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/status-pages', statusPageRoutes);
app.use('/api/notifications', notificationsRoutes);

// Unknown API route
app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

app.use(createApiErrorHandler(config.isProduction));

let server;
let shutdownPromise;
let monitorWorker;
let workerHealthWatchdog;

async function startServer() {
  try {
    logger.info('api', 'server starting');

    // Verify connectivity only; schema changes run through the explicit migration command.
    await testConnection();
    if (shutdownPromise) return;

    const onListening = () => {
      logger.info('api', 'server listening', { port: PORT });
    };
    server = config.isProduction
      ? app.listen(PORT, '127.0.0.1', onListening)
      : app.listen(PORT, onListening);

    if (config.monitorWorkerEnabled) {
      monitorWorker = startMonitorWorker({
  alertManager,
  onCycleCompleted: processPendingPushDeliveries
});
      await monitorWorker.ready;
    }
    if (shutdownPromise) return;

    workerHealthWatchdog = startWorkerHealthWatchdog({
      database: pool,
      alertManager,
      progressTimeoutMs: Math.max(120000, config.monitorTimeoutMs + 30000)
    });
  } catch (error) {
    if (config.isProduction) {
      logger.error('api', 'server startup failed');
    } else {
      logger.error('api', 'server startup failed', { error });
    }

    if (workerHealthWatchdog) {
      try {
        await workerHealthWatchdog.stop();
      } catch (closeError) {
        logger.error('api', 'health watchdog cleanup failed', { error: closeError });
      }
    }
    if (monitorWorker) {
      try {
        await monitorWorker.stop();
      } catch (closeError) {
        logger.error('api', 'monitor worker cleanup failed', { error: closeError });
      }
    }
    try {
      await closeHttpServer(server);
    } catch (closeError) {
      logger.error('api', 'HTTP server cleanup failed', { error: closeError });
    }
    try {
      await closePool();
    } catch (closeError) {
      logger.error('api', 'database pool cleanup failed', { error: closeError });
    }

    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    logger.info('api', 'shutdown started', { signal });
    const forceTimer = setTimeout(() => {
      logger.error('api', 'shutdown grace period exceeded');
      process.exit(1);
    }, 90000);

    let failed = false;
    const cleanup = async (label, operation) => {
      try {
        await operation();
      } catch (error) {
        failed = true;
        logger.error('api', `${label} shutdown failed`, { signal, error });
      }
    };

    const serverClosed = closeHttpServer(server, {
      timeoutMs: 75000,
      onTimeout: () => logger.warn('api', 'closing remaining HTTP connections')
    });
    await cleanup('health watchdog', () => workerHealthWatchdog?.stop());
    await cleanup('monitor worker', () => monitorWorker?.stop());
    await cleanup('HTTP server', () => serverClosed);
    await cleanup('database pool', closePool);
    clearTimeout(forceTimer);

    if (failed) {
      process.exitCode = 1;
      logger.warn('api', 'shutdown completed with cleanup errors', { signal });
    } else {
      logger.info('api', 'shutdown completed', { signal });
    }
  })();

  return shutdownPromise;
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();

module.exports = app;
