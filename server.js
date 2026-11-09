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

function dLocalConfigured() {
  return Boolean(process.env.DLOCAL_X_LOGIN && process.env.DLOCAL_X_TRANS_KEY && process.env.DLOCAL_SECRET_KEY);
}

function dLocalPaymentsEnabled() {
  if (!dLocalConfigured()) return false;
  const mode = process.env.DLOCAL_MODE || 'live';
  if (mode === 'sandbox') {
    return process.env.DLOCAL_SANDBOX_ENABLED === 'true'
      && process.env.RAILWAY_ENVIRONMENT_NAME !== 'production'
      && dLocalApiBase() === 'https://sandbox.dlocal.com';
  }
  return mode === 'live'
    && process.env.DLOCAL_LIVE_ENABLED === 'true'
    && dLocalApiBase() === 'https://api.dlocal.com';
}

function dLocalApiBase() {
  return (process.env.DLOCAL_API_BASE || 'https://api.dlocal.com').replace(/\/$/, '');
}

function hectoConfigured() {
  return Boolean(process.env.HECTO_MCHT_ID && process.env.HECTO_LICENSE_KEY && process.env.HECTO_ENCRYPTION_KEY);
}

function hectoEnabled() {
  return process.env.HECTO_ENABLED === 'true' && hectoConfigured();
}

function hectoApiBase() {
  return (process.env.HECTO_API_BASE || 'https://tbnpg.settlebank.co.kr').replace(/\/$/, '');
}

function hectoEncrypt(value) {
  const key = Buffer.from(process.env.HECTO_ENCRYPTION_KEY, 'utf8');
  if (key.length !== 32) throw new Error('HECTO_ENCRYPTION_KEY는 UTF-8 32바이트 AES-256 키여야 합니다.');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  return Buffer.concat([cipher.update(String(value ?? ''), 'utf8'), cipher.final()]).toString('base64');
}

function hectoHash(...parts) {
  return crypto.createHash('sha256').update(parts.join(''), 'utf8').digest('hex');
}

function hectoRedirectUrl(pathname) {
  const base = (process.env.PUBLIC_APP_URL || 'https://www.hng1.com').replace(/\/$/, '');
  return `${base}${pathname}`;
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

function dLocalSignature(date, requestBody) {
  return crypto.createHmac('sha256', process.env.DLOCAL_SECRET_KEY)
    .update(`${process.env.DLOCAL_X_LOGIN}${date}${requestBody}`)
    .digest('hex');
}

async function dLocalRequest(pathname, requestPayload, idempotencyKey = '') {
  const requestBody = JSON.stringify(requestPayload);
  const date = new Date().toISOString();
  const response = await fetch(`${dLocalApiBase()}${pathname}`, {
    method: 'POST',
    headers: {
      'X-Date': date,
      'X-Login': process.env.DLOCAL_X_LOGIN,
      'X-Trans-Key': process.env.DLOCAL_X_TRANS_KEY,
      'Content-Type': 'application/json',
      'X-Version': '2.1',
      'User-Agent': 'H&G Agency / 1.0',
      Authorization: `V2-HMAC-SHA256, Signature: ${dLocalSignature(date, requestBody)}`,
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey.slice(0, 42) } : {}),
    },
    body: requestBody,
  });
  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(responsePayload.message || responsePayload.status_detail || `dLocal request failed (${response.status}).`);
  return responsePayload;
}

async function dLocalGet(pathname) {
  const date = new Date().toISOString();
  const response = await fetch(`${dLocalApiBase()}${pathname}`, {
    method: 'GET',
    headers: {
      'X-Date': date,
      'X-Login': process.env.DLOCAL_X_LOGIN,
      'X-Trans-Key': process.env.DLOCAL_X_TRANS_KEY,
      'X-Version': '2.1',
      'User-Agent': 'H&G Agency / 1.0',
      Authorization: `V2-HMAC-SHA256, Signature: ${dLocalSignature(date, '')}`,
    },
  });
  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(responsePayload.message || responsePayload.status_detail || `dLocal request failed (${response.status}).`);
  return responsePayload;
}

function validDLocalNotification(req, rawBody) {
  if (!dLocalConfigured()) return false;
  const date = String(req.headers['x-date'] || '');
  const authorization = String(req.headers.authorization || '');
  const received = authorization.match(/Signature:\s*([a-f0-9]+)/i)?.[1] || '';
  const expected = dLocalSignature(date, rawBody);
  if (!/^[a-f0-9]{64}$/i.test(received) || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
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
    const provider = ebanxEnabled() ? 'ebanx' : hectoEnabled() ? 'hecto' : dLocalPaymentsEnabled() ? 'dlocal' : 'unavailable';
    return sendJson(res, 200, { provider, enabled: provider !== 'unavailable' });
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

  if ((pathname === '/api/payments/dlocal/pix' || pathname === '/api/payments/dlocal/card') && req.method === 'POST') {
    if (!dLocalPaymentsEnabled()) return sendJson(res, 503, { error: 'O pagamento online ainda não está disponível. Entre em contato pelo WhatsApp.' });
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const document = cleanText(body.document, 32).replace(/\D/g, '');
    if (!validCpf(document)) return sendJson(res, 400, { error: 'Informe um CPF brasileiro válido com 11 dígitos.' });
    const orderId = cleanText(body.orderId, 80) || `CHK-${Date.now()}`;
    const isCard = pathname.endsWith('/card');
    const payment = await dLocalRequest('/payments', {
      amount: selectedPlan.amount,
      currency: 'BRL',
      country: 'BR',
      payment_method_id: isCard ? 'CARD' : 'PQ',
      payment_method_flow: 'REDIRECT',
      payer: {
        name: cleanText(body.customer || body.name, 120) || 'Cliente',
        email: cleanText(body.email, 160),
        document,
        user_reference: orderId,
      },
      order_id: orderId,
      description: selectedPlan.name,
      notification_url: process.env.DLOCAL_NOTIFICATION_URL || 'https://www.hng1.com/api/webhooks/dlocal',
      callback_url: process.env.DLOCAL_CALLBACK_URL || 'https://www.hng1.com/?payment=return',
    }, orderId);
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) {
      data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'dlocal', providerPaymentId: String(payment.id), status: String(payment.status || 'pending').toLowerCase() };
      saveData();
    }
    return sendJson(res, 201, { ok: true, provider: 'dlocal', paymentId: payment.id, status: payment.status, checkoutUrl: payment.redirect_url || payment.redirect_URL || '' });
  }

  if (pathname === '/api/payments/hecto/card' && req.method === 'POST') {
    if (!hectoEnabled()) {
      return sendJson(res, 503, { error: 'Hecto 결제는 계약 후 발급되는 상점 ID와 키를 등록한 뒤 활성화할 수 있습니다.' });
    }
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    if (body.paymentMethod && body.paymentMethod !== 'card') {
      return sendJson(res, 400, { error: '현재 Hecto 연동은 공식 카드 결제창 기준입니다. PIX는 Hecto 계약 및 별도 지원 여부 확인 후 연결할 수 있습니다.' });
    }
    const orderId = cleanText(body.orderId, 100) || `CHK-${Date.now()}`;
    const now = new Date();
    const trdDt = now.toISOString().slice(0, 10).replace(/-/g, '');
    const trdTm = now.toISOString().slice(11, 19).replace(/:/g, '');
    const amount = String(selectedPlan.amount);
    const fields = {
      mchtId: process.env.HECTO_MCHT_ID,
      method: 'card',
      trdDt,
      trdTm,
      mchtTrdNo: orderId,
      mchtName: process.env.HECTO_MCHT_NAME || 'H&G Agency',
      mchtEName: process.env.HECTO_MCHT_ENAME || 'H&G Agency',
      pmtPrdtNm: selectedPlan.name,
      trdAmt: hectoEncrypt(amount),
      notiUrl: process.env.HECTO_NOTI_URL || hectoRedirectUrl('/api/webhooks/hecto'),
      nextUrl: process.env.HECTO_NEXT_URL || hectoRedirectUrl('/api/payments/hecto/return'),
      cancUrl: process.env.HECTO_CANC_URL || hectoRedirectUrl('/api/payments/hecto/cancel'),
      pktHash: hectoHash(process.env.HECTO_MCHT_ID, 'card', orderId, trdDt, trdTm, amount, process.env.HECTO_LICENSE_KEY),
      mchtCustNm: hectoEncrypt(cleanText(body.customer || body.name, 30) || 'Cliente'),
      email: hectoEncrypt(cleanText(body.email, 60)),
      mchtCustId: hectoEncrypt(cleanText(body.email, 50) || orderId),
      instmtMon: '00',
      taxTypeCd: 'N',
    };
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) {
      data.orders[orderIndex] = {
        ...data.orders[orderIndex],
        provider: 'hecto',
        providerMerchantOrderId: orderId,
        status: 'pending',
      };
      saveData();
    }
    return sendJson(res, 201, {
      ok: true,
      provider: 'hecto',
      formAction: `${hectoApiBase()}/card/main.do`,
      fields,
    });
  }

  if ((pathname === '/api/payments/hecto/return' || pathname === '/api/payments/hecto/cancel') && req.method === 'GET') {
    const query = new URL(req.url || '/', 'http://localhost').searchParams;
    const orderId = cleanText(query.get('mchtTrdNo'), 100);
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) {
      const success = query.get('outStatCd') === '0021';
      data.orders[orderIndex] = {
        ...data.orders[orderIndex],
        provider: 'hecto',
        providerTransactionId: cleanText(query.get('trdNo'), 80),
        status: success ? 'paid' : 'payment_failed',
        paymentResultCode: cleanText(query.get('outRsltCd'), 20),
        paymentResultMessage: cleanText(query.get('outRsltMsg'), 240),
      };
      saveData();
    }
    res.writeHead(303, { Location: `/?payment=${query.get('outStatCd') === '0021' ? 'success' : 'failed'}` });
    res.end();
    return;
  }

  if (pathname === '/api/webhooks/hecto' && req.method === 'POST') {
    if (!hectoConfigured()) return sendJson(res, 503, { error: 'Hecto 자격증명이 설정되지 않았습니다.' });
    const body = await readJson(req, 64 * 1024);
    const trdDtm = cleanText(body.trdDtm, 14);
    const expected = hectoHash(body.outStatCd, trdDtm.slice(0, 8), trdDtm.slice(8, 14), body.mchtId, body.mchtTrdNo, body.trdAmt, process.env.HECTO_LICENSE_KEY);
    const receivedHash = String(body.pktHash || '');
    if (receivedHash.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expected))) {
      return sendJson(res, 401, { error: 'Invalid Hecto notification hash.' });
    }
    const orderIndex = data.orders.findIndex((item) => item.id === String(body.mchtTrdNo));
    if (orderIndex >= 0) {
      data.orders[orderIndex] = {
        ...data.orders[orderIndex],
        provider: 'hecto',
        providerTransactionId: cleanText(body.trdNo, 80),
        status: body.outStatCd === '0021' ? 'paid' : 'payment_failed',
        paymentResultCode: cleanText(body.outRsltCd, 20),
        paymentResultMessage: cleanText(body.outRsltMsg, 240),
      };
      saveData();
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OK');
    return;
  }

  if (pathname === '/api/webhooks/dlocal/refund' && (req.method === 'POST' || req.method === 'GET')) {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true });
    const { body, rawBody } = await readJsonWithRawBody(req, 64 * 1024);
    if (!validDLocalNotification(req, rawBody)) return sendJson(res, 401, { error: 'Invalid dLocal signature.' });
    const orderIndex = data.orders.findIndex((item) => item.providerPaymentId === String(body.payment_id || ''));
    if (orderIndex >= 0) {
      data.orders[orderIndex] = {
        ...data.orders[orderIndex],
        refundId: String(body.id || data.orders[orderIndex].refundId || ''),
        refundStatus: String(body.status || 'pending').toLowerCase(),
        status: String(body.status || '').toUpperCase() === 'SUCCESS' ? 'refunded' : data.orders[orderIndex].status,
      };
      saveData();
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/webhooks/dlocal' && (req.method === 'POST' || req.method === 'GET')) {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true });
    const { body, rawBody } = await readJsonWithRawBody(req, 64 * 1024);
    if (!validDLocalNotification(req, rawBody)) return sendJson(res, 401, { error: 'Invalid dLocal signature.' });
    const orderIndex = data.orders.findIndex((item) => item.id === body.order_id);
    if (orderIndex >= 0) {
      data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'dlocal', providerPaymentId: String(body.id || ''), status: String(body.status || data.orders[orderIndex].status).toLowerCase() };
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
    if (!dLocalPaymentsEnabled()) return sendJson(res, 503, { error: 'dLocal 운영 결제가 활성화되지 않았습니다.' });
    const body = await readJson(req, 16 * 1024);
    const orderId = cleanText(body.orderId, 80);
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex < 0) return sendJson(res, 404, { error: '주문을 찾을 수 없습니다.' });
    const order = data.orders[orderIndex];
    if (!order.providerPaymentId) return sendJson(res, 400, { error: 'PG 결제 ID가 없는 주문입니다.' });
    if (order.status === 'refunded' || order.refundStatus === 'success') return sendJson(res, 409, { error: '이미 환불 처리된 주문입니다.' });
    const refund = await dLocalRequest('/refunds', {
      payment_id: order.providerPaymentId,
      amount: Number(order.amount),
      currency: 'BRL',
      order_refund_id: `REF-${order.id}-${Date.now()}`.slice(0, 100),
      description: 'H&G 고객 환불',
      notification_url: process.env.DLOCAL_REFUND_NOTIFICATION_URL || 'https://www.hng1.com/api/webhooks/dlocal/refund',
    }, `refund-${order.id}-${Date.now()}`);
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

  if (pathname.startsWith('/api/admin/refunds/') && pathname.endsWith('/status') && req.method === 'GET') {
    if (!dLocalConfigured()) return sendJson(res, 503, { error: 'dLocal 환불 API 자격증명이 설정되지 않았습니다.' });
    const refundId = decodeURIComponent(pathname.slice('/api/admin/refunds/'.length, -'/status'.length));
    if (!refundId) return sendJson(res, 400, { error: '환불 ID가 필요합니다.' });
    const refund = await dLocalGet(`/refunds/${encodeURIComponent(refundId)}/status`);
    return sendJson(res, 200, refund);
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
