const { rateLimit } = require('express-rate-limit');
const { fail } = require('../utils/http');

function createManualCheckRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs ?? 60 * 1000,
    limit: options.limit ?? 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: req => String(req.user.userId),
    handler: (_req, res) =>
      fail(res, 'Manual check limit reached. Try again later.', 429)
  });
}

module.exports = createManualCheckRateLimiter;
