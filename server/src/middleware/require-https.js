function isSecureRequest(req) {
  if (req.socket?.encrypted) return true;

  const forwardedProto = req.get
    ? req.get('x-forwarded-proto')
    : req.headers?.['x-forwarded-proto'];

  return req.secure === true &&
    typeof forwardedProto === 'string' &&
    forwardedProto.trim().toLowerCase() === 'https';
}

function requireHttps(isProduction) {
  return (req, res, next) => {
    if (!isProduction || isSecureRequest(req)) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'HTTPS is required'
    });
  };
}

module.exports = {
  isSecureRequest,
  requireHttps
};
