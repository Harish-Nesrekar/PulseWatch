const { randomUUID } = require('node:crypto');
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, message, status = 400) => {
  const safeMessage = process.env.NODE_ENV === 'production' && status >= 500
    ? 'Internal server error'
    : message;

  return res.status(status).json({
    success: false,
    error: { message: safeMessage }
  });
};
module.exports = { id: randomUUID, ok, fail };
