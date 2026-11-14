const sensitiveKey = /authorization|cookie|password|passwd|token|otp|secret|api.?key|credential|stack/i;
const jwtPattern = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const keyValuePattern = /\b(password|passwd|token|otp|secret|authorization|cookie|api[_-]?key)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;

function sanitizeString(value) {
  return value
    .replace(jwtPattern, '[REDACTED]')
    .replace(bearerPattern, 'Bearer [REDACTED]')
    .replace(keyValuePattern, '$1$2[REDACTED]');
}

function sanitize(value, key = '', seen = new WeakSet()) {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return sanitizeString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (value instanceof Error) {
    const error = { name: value.name };
    if (value.code) error.code = sanitize(value.code, 'code', seen);
    if (process.env.NODE_ENV !== 'production') {
      error.message = sanitizeString(value.message || '');
      if (value.stack) error.stack = sanitizeString(value.stack);
    }
    return error;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitize(item, '', seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([field, fieldValue]) => [
      field,
      sanitize(fieldValue, field, seen)
    ])
  );
}

function log(severity, component, message, fields = {}) {
  try {
    const safeFields = sanitize(fields);
    const entry = {
      ...safeFields,
      timestamp: new Date().toISOString(),
      severity,
      component,
      message: sanitizeString(String(message))
    };
    const output = JSON.stringify(entry);
    const write = severity === 'error'
      ? console.error
      : severity === 'warn'
        ? console.warn
        : console.log;
    write.call(console, output);
  } catch {
    // Logging must not interrupt application or worker execution.
  }
}

module.exports = {
  debug: (component, message, fields) => log('debug', component, message, fields),
  info: (component, message, fields) => log('info', component, message, fields),
  warn: (component, message, fields) => log('warn', component, message, fields),
  error: (component, message, fields) => log('error', component, message, fields),
  sanitize
};
