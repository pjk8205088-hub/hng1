const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const start = source.indexOf('function payverseConfigured()');
const end = source.indexOf('function payverseSdkUrl()', start);
const functions = source.slice(start, end);

function enabled(overrides = {}) {
  const env = {
    PAYVERSE_MID: 'test-mid',
    PAYVERSE_CLIENT_KEY: 'test-client-key',
    PAYVERSE_SECRET_KEY: 'test-secret-key',
    PAYVERSE_ENABLED: 'true',
    ...overrides,
  };
  return vm.runInNewContext(`${functions}\npayverseEnabled()`, { process: { env } });
}

test('PayVerse requires all credentials and explicit enablement', () => {
  assert.equal(enabled({ PAYVERSE_MID: '' }), false);
  assert.equal(enabled({ PAYVERSE_CLIENT_KEY: '' }), false);
  assert.equal(enabled({ PAYVERSE_SECRET_KEY: '' }), false);
  assert.equal(enabled({ PAYVERSE_ENABLED: 'false' }), false);
});

test('PayVerse sandbox is not offered on production', () => {
  assert.equal(enabled({ PAYVERSE_MODE: 'sandbox', RAILWAY_ENVIRONMENT_NAME: 'sandbox' }), true);
  assert.equal(enabled({ PAYVERSE_MODE: 'sandbox', RAILWAY_ENVIRONMENT_NAME: 'production' }), false);
});

test('PayVerse live requires a separate switch', () => {
  assert.equal(enabled({ PAYVERSE_MODE: 'live', RAILWAY_ENVIRONMENT_NAME: 'production' }), false);
  assert.equal(enabled({ PAYVERSE_MODE: 'live', PAYVERSE_LIVE_ENABLED: 'true', RAILWAY_ENVIRONMENT_NAME: 'sandbox' }), false);
  assert.equal(enabled({ PAYVERSE_MODE: 'live', PAYVERSE_LIVE_ENABLED: 'true', RAILWAY_ENVIRONMENT_NAME: 'production' }), true);
});

test('PayVerse callback and webhook verify transactions before marking paid', () => {
  const start = source.indexOf("if (pathname === '/api/payments/payverse/confirm'");
  const end = source.indexOf("if (pathname === '/api/payments/ebanx/pix'", start);
  const handler = source.slice(start, end);
  assert.ok(handler.includes('payverseReconcileOrder(orderIndex)'));
  assert.ok(handler.includes('crypto.timingSafeEqual'));
  assert.ok(handler.includes('transaction?.resultStatus'));
  assert.ok(handler.includes('transaction.orderId !== orderId'));
});

test('PayVerse result is checked against the local order before marking paid', () => {
  const start = source.indexOf('async function payverseReconcileOrder(');
  const end = source.indexOf('function ebanxJwsSignature(', start);
  const handler = source.slice(start, end);
  for (const field of ['result.orderId', 'result.requestCurrency', 'result.requestAmount', 'result.transactionType', 'result.transactionStatus', 'result.tid']) {
    assert.ok(handler.includes(field), `${field} must be verified`);
  }
});

test('PayVerse lookup cannot mark a mismatched order paid', async () => {
  const start = source.indexOf('async function payverseReconcileOrder(');
  const end = source.indexOf('function ebanxJwsSignature(', start);
  const functionSource = source.slice(start, end);
  const data = { orders: [{ id: 'CHK-1', provider: 'payverse', payverseReqDate: '20261124120000', amount: 100, status: 'pending' }] };
  let saves = 0;
  const context = {
    data,
    process: { env: { PAYVERSE_CURRENCY: 'BRL' } },
    payverseRequest: async () => ({ resultStatus: 'SUCCESS', orderId: 'another-order', requestCurrency: 'BRL', requestAmount: 100, transactionType: '0040', transactionStatus: 'SUCCESS', tid: 'test-tid' }),
    saveData: () => { saves += 1; },
    Date,
  };
  const reconcile = vm.runInNewContext(`${functionSource}\npayverseReconcileOrder`, context);
  const mismatch = await reconcile(0);
  assert.equal(mismatch.verified, false);
  assert.equal(data.orders[0].status, 'pending');
  assert.equal(saves, 0);
  context.payverseRequest = async () => ({ resultStatus: 'SUCCESS', orderId: 'CHK-1', requestCurrency: 'BRL', requestAmount: 100, transactionType: '0040', transactionStatus: 'SUCCESS', tid: 'test-tid' });
  const match = await reconcile(0);
  assert.equal(match.verified, true);
  assert.equal(data.orders[0].status, 'paid');
  assert.equal(data.orders[0].providerPaymentId, 'test-tid');
  assert.equal(saves, 1);
  data.orders[0].status = 'refunded';
  const afterRefund = await reconcile(0);
  assert.equal(afterRefund.verified, false);
  assert.equal(data.orders[0].status, 'refunded');
  assert.equal(saves, 1);
});
