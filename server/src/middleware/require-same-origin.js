const { getConfig } = require('../config/env');
const { fail } = require('../utils/http');

const clientOrigin = getConfig().clientOrigin;
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = function requireSameOrigin(req, res, next) {
  if (safeMethods.has(req.method)) {
    return next();
  }

  if (req.get('origin') !== clientOrigin) {
    return fail(res, 'Request origin is not allowed', 403);
  }

  return next();
};
