const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const clientDirectory = path.resolve(__dirname, '..');

function inspectNextConfig({ nodeEnv, apiUrl, productionBuild = true }) {
  const environment = { ...process.env, NODE_ENV: nodeEnv };
  if (productionBuild) {
    environment.VERCEL_ENV = 'production';
  } else {
    delete environment.VERCEL_ENV;
  }

  if (apiUrl === undefined) {
    delete environment.NEXT_PUBLIC_API_URL;
  } else {
    environment.NEXT_PUBLIC_API_URL = apiUrl;
  }

  const script = productionBuild
    ? 'process.argv.push("build"); require("./next.config.js")'
    : 'require("./next.config.js")';

  return spawnSync(process.execPath, ['-e', script], {
    cwd: clientDirectory,
    env: environment,
    encoding: 'utf8'
  });
}

describe('frontend production API configuration', () => {
  it('keeps the localhost API default for development', () => {
    const result = inspectNextConfig({
      nodeEnv: 'development',
      apiUrl: undefined,
      productionBuild: false
    });

    assert.equal(result.status, 0, result.stderr);
  });

  it('accepts an explicit HTTPS production API URL', () => {
    const result = inspectNextConfig({
      nodeEnv: 'production',
      apiUrl: 'https://api.pulsewatch.com/api'
    });

    assert.equal(result.status, 0, result.stderr);
  });

  it('requires an explicit production API URL', () => {
    const result = inspectNextConfig({
      nodeEnv: 'production',
      apiUrl: undefined
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /NEXT_PUBLIC_API_URL is required/);
  });

  it('rejects HTTP and local production API URLs', () => {
    for (const apiUrl of [
      'http://api.pulsewatch.com/api',
      'https://localhost:5001/api',
      'https://127.0.0.1:5001/api',
      'https://api.your-domain.tld/api'
    ]) {
      const result = inspectNextConfig({
        nodeEnv: 'production',
        apiUrl
      });

      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stderr, new RegExp(apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});
