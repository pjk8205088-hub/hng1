const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const QRCode = require('qrcode');

const publicDir = path.join(__dirname, 'public');
const dataDir = process.env.ADMIN_DATA_DIR || path.join(__dirname, 'data');
const dataFile = process.env.ADMIN_DATA_FILE || path.join(dataDir, 'admin-data.json');
const port = Number(process.env.PORT || 3000);
const sessionTtlMs = 8 * 60 * 60 * 1000;
const sessions = new Map();
const planCatalog = new Map([
  ['basic', { name: 'Plano Basic', amount: 2980 }],
  ['standard', { name: 'Plano Standard', amount: 5480 }],
  ['all-in', { name: 'Plano All-In', amount: 6480 }],
  ['test-100', { name: 'Plano Teste R$100', amount: 100 }],
]);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.json', 'application/json; charset=utf-8'],
]);

const defaultData = {
  orders: [],
  members: [],
  referralCodes: [],
  products: {},
  checkout: {},
  activity: [],
};

function loadData() {
  try {
    if (!fs.existsSync(dataFile)) return structuredClone(defaultData);
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    return {
      ...structuredClone(defaultData),
      ...parsed,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      referralCodes: Array.isArray(parsed.referralCodes) ? parsed.referralCodes : [],
      products: parsed.products && typeof parsed.products === 'object' ? parsed.products : {},
      checkout: parsed.checkout && typeof parsed.checkout === 'object' ? parsed.checkout : {},
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
    };
  } catch (error) {
    console.warn('Unable to load admin data; starting with an empty store.', error.message);
    return structuredClone(defaultData);
  }
}

let data = loadData();

function saveData() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, dataFile);
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function readJson(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function readJsonWithRawBody(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve({ body: rawBody ? JSON.parse(rawBody) : {}, rawBody });
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function cleanText(value, maxLength = 240) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function resolvePlan(value) {
  const key = cleanText(value, 80).toLowerCase();
  return planCatalog.get(key) || null;
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function adminConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

function hasAdminSession(req) {
  const token = parseCookies(req).hng_admin_session;
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  sessions.set(token, Date.now() + sessionTtlMs);
  return true;
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + sessionTtlMs);
  return token;
}

function sessionCookie(token, maxAge = Math.floor(sessionTtlMs / 1000)) {
  return `hng_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function ebanxConfigured() {
  return Boolean(process.env.EBANX_INTEGRATION_KEY);
}

function ebanxEnabled() {
  return process.env.EBANX_ENABLED === 'true' && ebanxConfigured();
}

function ebanxApiBase() {
  return (process.env.EBANX_API_BASE || 'https://sandbox.ebanxpay.com').replace(/\/$/, '');
}

// dLocal Go uses a separate API and credential pair from the enterprise dLocal API.
// Keep it independently gated so Sandbox keys can never be used as live keys.
function dLocalGoEnabled() {
  return process.env.DLOCAL_GO_ENABLED === 'true'
    && Boolean(process.env.DLOCAL_GO_API_KEY && process.env.DLOCAL_GO_API_SECRET);
}

function dLocalGoApiBase() {
  const mode = process.env.DLOCAL_GO_MODE || 'sandbox';
  return (process.env.DLOCAL_GO_API_BASE || (mode === 'live' ? 'https://api.dlocalgo.com' : 'https://api-sbx.dlocalgo.com')).replace(/\/$/, '');
}

function payverseConfigured() {
  return Boolean(process.env.PAYVERSE_MID && process.env.PAYVERSE_CLIENT_KEY && process.env.PAYVERSE_SECRET_KEY);
}

function payverseEnabled() {
  return process.env.PAYVERSE_ENABLED === 'true' && payverseConfigured();
}

function payverseSdkUrl() {
  const mode = process.env.PAYVERSE_MODE || 'sandbox';
  return process.env.PAYVERSE_SDK_URL || (mode === 'live'
    ? 'https://ui.payverseglobal.com/js/payments.js'
    : 'https://ui-snd.payverseglobal.com/js/payments.js');
}

function payverseSign(orderId, amount, reqDate) {
  const normalizedAmount = String(Number(amount));
  const plainText = `||${process.env.PAYVERSE_SECRET_KEY}||${process.env.PAYVERSE_MID}||${orderId}||${normalizedAmount}||${reqDate}||`;
  return crypto.createHash('sha512').update(plainText, 'utf8').digest('hex');
}

function ebanxJwsSignature(rawBody) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: process.env.EBANX_JWS_KID, b64: false, crit: ['b64'] })).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(header + '.' + rawBody, 'utf8'), process.env.EBANX_JWS_PRIVATE_KEY);
  return header + '..' + signature.toString('base64url');
}

async function dLocalGoRequest(pathname, payload, method = 'POST') {
  const response = await fetch(`${dLocalGoApiBase()}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.DLOCAL_GO_API_KEY}:${process.env.DLOCAL_GO_API_SECRET}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(payload) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `dLocal Go request failed (${response.status}).`);
  return body;
}

async function ebanxRequest(pathname, payload) {
  const response = await fetch(`${ebanxApiBase()}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === 'ERROR') {
    throw new Error(body.status_description || body.error || `EBANX request failed (${response.status}).`);
  }
  return body;
}

function validCpf(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const checkDigit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

function resolveFile(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split('?')[0]).replace(/^\/+/, '');
  if (cleanPath === 'admin') return path.join(publicDir, 'admin.html');
  const candidate = cleanPath ? path.join(publicDir, cleanPath) : path.join(publicDir, 'index.html');
  if (candidate.startsWith(publicDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  return path.join(publicDir, 'index.html');
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    if (!adminConfigured()) {
      return sendJson(res, 503, { error: '서버에 관리자 계정이 설정되지 않았습니다.' });
    }
    const body = await readJson(req, 16 * 1024);
    const email = cleanText(body.email, 160).toLowerCase();
    const password = String(body.password ?? '');
    if (email !== process.env.ADMIN_EMAIL.toLowerCase() || password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    const token = createSession();
    return sendJson(res, 200, { ok: true, email }, { 'Set-Cookie': sessionCookie(token) });
  }

  if (pathname === '/api/admin/session' && req.method === 'GET') {
    return hasAdminSession(req)
      ? sendJson(res, 200, { authenticated: true, email: process.env.ADMIN_EMAIL })
      : sendJson(res, 401, { authenticated: false });
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const token = parseCookies(req).hng_admin_session;
    if (token) sessions.delete(token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }

  if (pathname === '/api/checkout' && req.method === 'POST') {
    const body = await readJson(req, 64 * 1024);
    const now = new Date();
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const order = {
      id: cleanText(body.id, 80) || `CHK-${Date.now()}`,
      customer: cleanText(body.customer || body.name, 120) || 'Cliente sem nome',
      whatsapp: cleanText(body.whatsapp || body.phone, 80),
      email: cleanText(body.email, 160),
      plan: selectedPlan.name,
      paymentMethod: body.paymentMethod === 'card' ? 'card' : 'pix',
      paymentDate: cleanText(body.paymentDate, 40) || now.toLocaleString('pt-BR'),
      arrival: cleanText(body.arrival, 120),
      amount: selectedPlan.amount,
      referralCode: cleanText(body.referralCode, 80) || '—',
      status: 'pending',
    };
    if (data.orders.some((item) => item.id === order.id && item.provider === 'payverse')) {
      return sendJson(res, 409, { error: 'PayVerse order already exists.' });
    }
    data.orders = [order, ...data.orders.filter((item) => item.id !== order.id)].slice(0, 500);
    const memberEmail = order.email.toLowerCase();
    const memberIndex = data.members.findIndex((member) => member.email?.toLowerCase() === memberEmail && memberEmail);
    const member = {
      id: memberIndex >= 0 ? data.members[memberIndex].id : `MEM-${Date.now()}`,
      name: order.customer,
      email: order.email,
      whatsapp: order.whatsapp,
      plan: order.plan,
      referralCode: order.referralCode,
      arrival: order.arrival,
      joinedAt: order.paymentDate,
      status: 'active',
    };
    if (memberIndex >= 0) data.members[memberIndex] = { ...data.members[memberIndex], ...member };
    else data.members = [member, ...data.members].slice(0, 500);
    saveData();
    return sendJson(res, 201, { ok: true, orderId: order.id });
  }

  if (pathname === '/api/payment-provider' && req.method === 'GET') {
    const providers = [
      ...(payverseEnabled() ? [{ id: 'payverse', label: 'PayVerse', methods: ['card', 'wallet'] }] : []),
      ...(ebanxEnabled() ? [{ id: 'ebanx', label: 'EBANX', methods: ['pix'] }] : []),
      ...(dLocalGoEnabled() ? [{ id: 'dlocal-go', label: 'dLocal Go', methods: ['pix', 'card'] }] : []),
    ];
    const provider = providers[0]?.id || 'unavailable';
    return sendJson(res, 200, { provider, providers, enabled: providers.length > 0 });
  }

  if (pathname === '/api/payments/payverse' && req.method === 'POST') {
    if (!payverseEnabled()) return sendJson(res, 503, { error: 'PayVerse Sandbox 자격증명이 등록되지 않았습니다.' });
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const orderId = cleanText(body.orderId, 100) || `CHK-${Date.now()}`;
    const reqDate = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const amount = Number(selectedPlan.amount);
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    const order = data.orders[orderIndex];
    if (!order || order.status !== 'pending' || Number(order.amount) !== amount || (order.provider && order.provider !== 'payverse')) {
      return sendJson(res, 409, { error: 'Order is not eligible for PayVerse checkout.' });
    }
    const currency = process.env.PAYVERSE_CURRENCY || 'BRL';
    data.orders[orderIndex] = { ...order, provider: 'payverse', payverseAmount: amount, payverseCurrency: currency };
    saveData();
    return sendJson(res, 200, {
      ok: true,
      provider: 'payverse',
      payverse: {
        sdkUrl: payverseSdkUrl(),
        mid: process.env.PAYVERSE_MID,
        clientKey: process.env.PAYVERSE_CLIENT_KEY,
        reqDate,
        orderId,
        productName: selectedPlan.name,
        requestCurrency: currency,
        requestAmount: String(amount),
        customerId: cleanText(body.email || body.customer || 'customer', 30),
        returnUrl: process.env.PAYVERSE_RETURN_URL || 'https://www.hng1.com/?payment=return',
        webhookUrl: process.env.PAYVERSE_WEBHOOK_URL || 'https://www.hng1.com/api/webhooks/payverse',
        sign: payverseSign(orderId, amount, reqDate),
      },
    });
  }

  if (pathname === '/api/webhooks/payverse' && req.method === 'POST') {
    if (!payverseEnabled()) return sendJson(res, 503, { receiveResult: 'FAILED' });
    const body = await readJson(req, 64 * 1024);
    const { orderId, tid, sign, approvalDay } = body;
    if (body.type !== 'Sale' || body.resultStatus !== 'SUCCESS') return sendJson(res, 200, { receiveResult: 'SUCCESS' });
    if (body.mid !== process.env.PAYVERSE_MID || typeof orderId !== 'string' || !/^[a-z0-9_-]{1,20}$/i.test(tid || '') || !/^\d{8}$/.test(approvalDay || '') || typeof sign !== 'string' || !/^[a-f0-9]{128}$/i.test(sign)) {
      return sendJson(res, 400, { receiveResult: 'FAILED' });
    }
    const expected = payverseSign(orderId, body.requestAmount, approvalDay);
    if (!crypto.timingSafeEqual(Buffer.from(sign, 'hex'), Buffer.from(expected, 'hex'))) return sendJson(res, 403, { receiveResult: 'FAILED' });
    const order = data.orders.find((item) => item.id === orderId && item.provider === 'payverse');
    if (!order || order.status !== 'pending') return sendJson(res, 200, { receiveResult: 'SUCCESS' });
    const host = process.env.PAYVERSE_MODE === 'live' ? 'pay.payverseglobal.com' : 'pay-snd.payverseglobal.com';
    let transaction;
    try {
      const response = await fetch('https://' + host + '/payment/search/transaction/' + encodeURIComponent(tid), {
        headers: { mid: process.env.PAYVERSE_MID, clientKey: process.env.PAYVERSE_CLIENT_KEY },
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (response.ok) transaction = await response.json();
    } catch {}
    if (transaction?.resultStatus !== 'SUCCESS' || transaction.transactionStatus !== 'SUCCESS' || transaction.transactionType !== '0040' || transaction.tid !== tid || transaction.orderId !== orderId || transaction.requestCurrency !== order.payverseCurrency || Number(transaction.requestAmount) !== order.payverseAmount) {
      return sendJson(res, 502, { receiveResult: 'FAILED' });
    }
    const index = data.orders.findIndex((item) => item === order);
    if (index < 0) return sendJson(res, 409, { receiveResult: 'FAILED' });
    data.orders[index] = { ...order, providerPaymentId: tid, status: 'paid' };
    saveData();
    return sendJson(res, 200, { receiveResult: 'SUCCESS' });
  }

  if (pathname === '/api/payments/ebanx/pix' && req.method === 'POST') {
    if (!ebanxEnabled()) return sendJson(res, 503, { error: 'EBANX 결제 자격증명이 등록되지 않았습니다.' });
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const orderId = cleanText(body.orderId, 80) || `CHK-${Date.now()}`;
    const payment = await ebanxRequest('/ws/direct', {
      integration_key: process.env.EBANX_INTEGRATION_KEY,
      payment: {
        payment_type_code: 'pix',
        merchant_payment_code: orderId,
        currency_code: 'BRL',
        amount_total: selectedPlan.amount,
        country: 'br',
        name: cleanText(body.customer || body.name, 120) || 'Cliente',
        email: cleanText(body.email, 160),
        document: cleanText(body.document, 32).replace(/\D/g, ''),
        notification_url: process.env.EBANX_NOTIFICATION_URL || 'https://www.hng1.com/api/webhooks/ebanx',
      },
    });
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) {
      data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'ebanx', providerPaymentId: String(payment.payment?.hash || ''), status: 'pending' };
      saveData();
    }
    const qrCodeValue = payment.payment?.pix?.qr_code_value || '';
    const qrCodeImage = qrCodeValue ? await QRCode.toDataURL(qrCodeValue, { margin: 1, width: 320 }) : '';
    return sendJson(res, 201, {
      ok: true,
      provider: 'ebanx',
      status: payment.payment?.status || 'PE',
      checkoutUrl: payment.payment?.redirect_url || payment.redirect_url || '',
      qrCodeValue,
      qrCodeImage,
      qrCodeUrl: payment.payment?.qrcode_url || '',
      paymentHash: payment.payment?.hash || '',
    });
  }

  if (pathname === '/api/webhooks/ebanx' && req.method === 'POST') {
    const body = await readJson(req, 64 * 1024);
    const payment = body.payment || body;
    const orderIndex = data.orders.findIndex((item) => item.id === String(payment.merchant_payment_code || ''));
    if (orderIndex >= 0) {
      data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'ebanx', providerPaymentId: String(payment.hash || ''), status: payment.status === 'CO' ? 'paid' : payment.status === 'CA' ? 'payment_failed' : 'pending' };
      saveData();
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/payments/dlocal-go' && req.method === 'POST') {
    if (!dLocalGoEnabled()) return sendJson(res, 503, { error: 'dLocal Go Sandbox API 키와 Secret이 설정되지 않았습니다.' });
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const orderId = cleanText(body.orderId, 80) || `CHK-${Date.now()}`;
    const payment = await dLocalGoRequest('/v1/payments', {
      country: 'BR',
      currency: 'BRL',
      amount: Number(selectedPlan.amount),
      order_id: orderId,
      description: selectedPlan.name,
      notification_url: process.env.DLOCAL_GO_NOTIFICATION_URL || 'https://www.hng1.com/api/webhooks/dlocal-go',
      success_url: process.env.DLOCAL_GO_SUCCESS_URL || 'https://www.hng1.com/?payment=success',
      back_url: process.env.DLOCAL_GO_BACK_URL || 'https://www.hng1.com/?payment=return',
      payer: {
        name: cleanText(body.customer || body.name, 120) || 'Cliente',
        email: cleanText(body.email, 160),
      },
    });
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) {
      data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'dlocal-go', providerPaymentId: String(payment.id || payment.payment_id || ''), status: String(payment.status || 'pending').toLowerCase() };
      saveData();
    }
    return sendJson(res, 201, { ok: true, provider: 'dlocal-go', paymentId: payment.id || payment.payment_id, status: payment.status, checkoutUrl: payment.redirect_url || payment.checkout_url || '' });
  }

  if (pathname === '/api/webhooks/dlocal-go' && req.method === 'POST') {
    const body = await readJson(req, 64 * 1024);
    const orderId = String(body.order_id || body.orderId || '');
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) {
      const status = String(body.status || data.orders[orderIndex].status).toLowerCase();
      data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'dlocal-go', providerPaymentId: String(body.id || body.payment_id || data.orders[orderIndex].providerPaymentId || ''), status };
      saveData();
    }
    return sendJson(res, 200, { ok: true });
  }

  if (!pathname.startsWith('/api/admin/')) return false;
  if (!hasAdminSession(req)) {
    sendJson(res, 401, { error: '관리자 로그인이 필요합니다.' });
    return true;
  }

  if (pathname === '/api/admin/state' && req.method === 'GET') {
    return sendJson(res, 200, data);
  }

  if (pathname === '/api/admin/orders/refund' && req.method === 'POST') {
    const body = await readJson(req, 16 * 1024);
    const orderId = cleanText(body.orderId, 80);
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex < 0) return sendJson(res, 404, { error: '주문을 찾을 수 없습니다.' });
    const order = data.orders[orderIndex];
    if (!order.providerPaymentId) return sendJson(res, 400, { error: 'PG 결제 ID가 없는 주문입니다.' });
    if (order.status === 'refunded' || order.refundStatus === 'success') return sendJson(res, 409, { error: '이미 환불 처리된 주문입니다.' });
    let refund;
    if (order.provider === 'dlocal-go') {
      if (!dLocalGoEnabled()) return sendJson(res, 503, { error: 'dLocal Go Sandbox API 키와 Secret이 설정되지 않았습니다.' });
      refund = await dLocalGoRequest('/v1/refunds', {
        payment_id: order.providerPaymentId,
        amount: Number(order.amount),
        currency: 'BRL',
        order_refund_id: `REF-${order.id}-${Date.now()}`.slice(0, 100),
      });
    } else {
      return sendJson(res, 400, { error: 'Automatic refund is not supported for this provider.' });
    }
    data.orders[orderIndex] = {
      ...order,
      refundId: String(refund.id || ''),
      refundStatus: String(refund.status || 'pending').toLowerCase(),
      status: String(refund.status || '').toUpperCase() === 'SUCCESS' ? 'refunded' : 'refund_pending',
      refundedAt: new Date().toISOString(),
    };
    saveData();
    return sendJson(res, 200, { ok: true, refundId: refund.id, status: refund.status, order: data.orders[orderIndex] });
  }

  if (pathname === '/api/admin/state' && req.method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJson(res, 400, { error: '관리자 데이터 형식이 올바르지 않습니다.' });
    }
    data = {
      ...structuredClone(defaultData),
      ...body,
      orders: Array.isArray(body.orders) ? body.orders.slice(0, 500) : [],
      members: Array.isArray(body.members) ? body.members.slice(0, 500) : [],
      referralCodes: Array.isArray(body.referralCodes) ? body.referralCodes.slice(0, 200) : [],
      products: body.products && typeof body.products === 'object' ? body.products : {},
      checkout: body.checkout && typeof body.checkout === 'object' ? body.checkout : {},
      activity: Array.isArray(body.activity) ? body.activity.slice(0, 100) : [],
    };
    saveData();
    return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
  }

  sendJson(res, 404, { error: '관리자 기능을 찾을 수 없습니다.' });
  return true;
}

const server = http.createServer(async (req, res) => {
  if (process.env.RAILWAY_SERVICE_NAME === 'www-redirect') {
    res.writeHead(308, {
      Location: `https://hng1.com${req.url || '/'}`,
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];
  if (pathname.startsWith('/api/')) {
    try {
      const handled = await handleApi(req, res, pathname);
      if (handled !== false) return;
    } catch (error) {
      if (!res.headersSent) sendJson(res, 400, { error: error.message || 'Request failed.' });
      return;
    }
  }

  const filePath = resolveFile(req.url || '/');
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes.get(ext) || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': ['.html', '.js'].includes(ext) ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`H&G landing page listening on port ${port}`);
});
