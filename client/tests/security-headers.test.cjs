const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createContentSecurityPolicy
} = require('../src/lib/content-security-policy.cjs');

describe('frontend content security policy', () => {
  it('limits scripts to the request nonce and configured API origin', () => {
    const policy = createContentSecurityPolicy(
      'test-nonce',
      'https://api.pulsewatch.com/api'
    );

    assert.match(policy, /script-src 'self' 'nonce-test-nonce' 'strict-dynamic'/);
    assert.match(policy, /connect-src 'self' https:\/\/api\.pulsewatch\.com/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.doesNotMatch(policy, /unsafe-eval|script-src[^;]*unsafe-inline/);
  });

  it('rejects invalid API URLs rather than widening connect-src', () => {
    assert.throws(() => createContentSecurityPolicy('nonce', 'not a URL'));
  });
});
