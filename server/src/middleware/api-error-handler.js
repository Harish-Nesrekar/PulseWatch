const logger = require('../utils/logger');

function createApiErrorHandler(isProduction) {
  return (error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const status = error?.type === 'entity.parse.failed'
      ? 400
      : error?.type === 'entity.too.large'
        ? 413
        : 500;
    const message = status === 400
      ? 'Invalid request body'
      : status === 413
        ? 'Request body too large'
        : 'Internal server error';

    logger.error('api', 'request failed', {
      requestId: req.requestId,
      statusCode: status,
      error: isProduction
        ? { name: error?.name, code: error?.code }
        : error
    });

    return res.status(status).json({
      success: false,
      message
    });
  };
}

module.exports = createApiErrorHandler;
