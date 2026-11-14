
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { getConfig } = require('../config/env');
const { fail } = require('../utils/http');
const {
  SESSION_COOKIE_NAME,
  clearSessionCookie
} = require('../utils/session-cookie');

module.exports = async function auth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const config = getConfig();

  if (!token) {
    return fail(res, 'Authentication required', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (!decoded || typeof decoded !== 'object') {
      clearSessionCookie(res);
      return fail(res, 'Invalid authentication token', 401);
    }

    const userId = decoded.userId || decoded.sub;

    if (!userId) {
      clearSessionCookie(res);
      return fail(res, 'Invalid authentication token', 401);
    }

    const [users] = await pool.execute(
      'SELECT auth_version FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = users[0];

    if (!user || Number(decoded.ver || 0) !== Number(user.auth_version || 0)) {
      clearSessionCookie(res);
      return fail(res, 'Invalid or expired token', 401);
    }

    req.user = {
      ...decoded,
      userId,
      sub: userId
    };

    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      clearSessionCookie(res);
      return fail(res, 'Invalid or expired token', 401);
    }

    return next(error);
  }
};
