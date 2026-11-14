function createContentSecurityPolicy(nonce, apiUrl) {
  const apiOrigin = new URL(apiUrl).origin;

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `connect-src 'self' ${apiOrigin}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:"
  ].join('; ');
}

module.exports = { createContentSecurityPolicy };
