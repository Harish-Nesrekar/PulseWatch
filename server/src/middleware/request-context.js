const { randomUUID } = require('node:crypto');
const logger = require('../utils/logger');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestContext(req, res, next) {
  const suppliedId = req.get('x-request-id');
  const requestId = suppliedId && uuidPattern.test(suppliedId)
    ? suppliedId
    : randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info('api', 'request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    });
  });

  next();
}

module.exports = requestContext;
