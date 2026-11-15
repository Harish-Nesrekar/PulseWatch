
function createContentSecurityPolicy(nonce, apiUrl) {
  let apiOrigin = "'self'";

  if (apiUrl && apiUrl !== '/api') {
    const parsedUrl = new URL(apiUrl);

    if (parsedUrl.protocol !== 'https:') {
      throw new Error('API URL must use HTTPS in production.');
    }

    apiOrigin = parsedUrl.origin;
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
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
