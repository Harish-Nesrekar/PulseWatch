const { getConfig } = require('../config/env');

const SESSION_COOKIE_NAME = 'pulsewatch_session';
const SESSION_COOKIE_PATH = '/api';

function sessionCookieOptions() {
  const config = getConfig();

  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    path: SESSION_COOKIE_PATH,
    maxAge: config.sessionCookieMaxAgeMs
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

function clearSessionCookie(res) {
  const { maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, options);
}

module.exports = {
  SESSION_COOKIE_NAME,
  setSessionCookie,
  clearSessionCookie
};
