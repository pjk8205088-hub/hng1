const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const start = source.indexOf('function dLocalConfigured()');
const end = source.indexOf('function dLocalSignature(', start);
const functions = source.slice(start, end);

function enabled(overrides) {
  const env = {
    DLOCAL_X_LOGIN: 'test-login',
    DLOCAL_X_TRANS_KEY: 'test-trans-key',
    DLOCAL_SECRET_KEY: 'test-secret',
    ...overrides,
  };
  return vm.runInNewContext(`${functions}\ndLocalPaymentsEnabled()`, { process: { env } });
}

test('dLocal is off without credentials or an explicit mode switch', () => {
  assert.equal(enabled({ DLOCAL_SECRET_KEY: '' }), false);
  assert.equal(enabled({}), false);
});

test('sandbox requires a non-production environment and sandbox API', () => {
  const sandbox = {
    DLOCAL_MODE: 'sandbox',
    DLOCAL_SANDBOX_ENABLED: 'true',
    DLOCAL_API_BASE: 'https://sandbox.dlocal.com',
    RAILWAY_ENVIRONMENT_NAME: 'staging',
  };
  assert.equal(enabled(sandbox), true);
  assert.equal(enabled({ ...sandbox, RAILWAY_ENVIRONMENT_NAME: 'production' }), false);
  assert.equal(enabled({ ...sandbox, DLOCAL_API_BASE: 'https://api.dlocal.com' }), false);
  assert.equal(enabled({ ...sandbox, DLOCAL_SANDBOX_ENABLED: 'false' }), false);
});

test('live requires its own switch and production API', () => {
  const live = { DLOCAL_MODE: 'live', DLOCAL_LIVE_ENABLED: 'true', DLOCAL_API_BASE: 'https://api.dlocal.com' };
  assert.equal(enabled(live), true);
  assert.equal(enabled({ ...live, DLOCAL_API_BASE: 'https://sandbox.dlocal.com' }), false);
  assert.equal(enabled({ ...live, DLOCAL_LIVE_ENABLED: 'false' }), false);
});
