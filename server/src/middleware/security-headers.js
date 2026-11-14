function createHelmetOptions(isProduction) {
  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        connectSrc: ["'none'"],
        fontSrc: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        frameSrc: ["'none'"],
        imgSrc: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"]
      }
    },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: false, preload: false }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'deny' }
  };
}

function permissionsPolicy(_req, res, next) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
}

module.exports = {
  createHelmetOptions,
  permissionsPolicy
};
