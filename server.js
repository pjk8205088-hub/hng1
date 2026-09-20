const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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

function mercadoPagoConfigured() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

async function mercadoPagoRequest(pathname, options = {}) {
  const response = await fetch(`https://api.mercadopago.com${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Mercado Pago request failed (${response.status}).`);
  return payload;
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
      return sendJson(res, 503, { error: 'Admin credentials are not configured on the server.' });
    }
    const body = await readJson(req, 16 * 1024);
    const email = cleanText(body.email, 160).toLowerCase();
    const password = String(body.password ?? '');
    if (email !== process.env.ADMIN_EMAIL.toLowerCase() || password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: 'E-mail ou senha incorretos.' });
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
      joinedAt: order.paymentDate,
      status: 'active',
    };
    if (memberIndex >= 0) data.members[memberIndex] = { ...data.members[memberIndex], ...member };
    else data.members = [member, ...data.members].slice(0, 500);
    saveData();
    return sendJson(res, 201, { ok: true, orderId: order.id });
  }

  if (pathname === '/api/payments/mercadopago/pix' && req.method === 'POST') {
    if (!mercadoPagoConfigured()) return sendJson(res, 503, { error: 'Mercado Pago is not configured.' });
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const amount = selectedPlan.amount;
    const orderId = cleanText(body.orderId, 80) || `CHK-${Date.now()}`;
    const payment = await mercadoPagoRequest('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': orderId },
      body: JSON.stringify({
        transaction_amount: Math.round(amount * 100) / 100,
        description: selectedPlan.name,
        payment_method_id: 'pix',
        payer: { email: cleanText(body.email, 160), first_name: cleanText(body.customer || body.name, 80) || 'Cliente' },
        external_reference: orderId,
        ...(process.env.MP_WEBHOOK_URL ? { notification_url: process.env.MP_WEBHOOK_URL } : {}),
      }),
    });
    const pix = payment.point_of_interaction?.transaction_data || {};
    const orderIndex = data.orders.findIndex((item) => item.id === orderId);
    if (orderIndex >= 0) { data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'mercadopago', providerPaymentId: String(payment.id), status: payment.status || 'pending' }; saveData(); }
    return sendJson(res, 201, { ok: true, provider: 'mercadopago', paymentId: payment.id, status: payment.status, qrCode: pix.qr_code || '', qrCodeBase64: pix.qr_code_base64 || '', ticketUrl: pix.ticket_url || '' });
  }

  if (pathname === '/api/payments/mercadopago/card' && req.method === 'POST') {
    if (!mercadoPagoConfigured()) return sendJson(res, 503, { error: 'Mercado Pago is not configured.' });
    const body = await readJson(req, 64 * 1024);
    const selectedPlan = resolvePlan(body.plan);
    if (!selectedPlan) return sendJson(res, 400, { error: 'Invalid plan.' });
    const amount = selectedPlan.amount;
    const orderId = cleanText(body.orderId, 80) || `CHK-${Date.now()}`;
    const preference = await mercadoPagoRequest('/checkout/preferences', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': orderId },
      body: JSON.stringify({
        items: [{ id: orderId, title: selectedPlan.name, quantity: 1, currency_id: 'BRL', unit_price: amount }],
        payer: { name: cleanText(body.customer || body.name, 120), email: cleanText(body.email, 160) },
        external_reference: orderId,
        ...(process.env.MP_WEBHOOK_URL ? { notification_url: process.env.MP_WEBHOOK_URL } : {}),
        back_urls: { success: 'https://www.hng1.com/?payment=success', failure: 'https://www.hng1.com/?payment=failure', pending: 'https://www.hng1.com/?payment=pending' },
        auto_return: 'approved',
      }),
    });
    return sendJson(res, 201, { ok: true, provider: 'mercadopago', preferenceId: preference.id, checkoutUrl: preference.init_point || preference.sandbox_init_point || '' });
  }

  if (pathname === '/api/webhooks/mercadopago' && (req.method === 'POST' || req.method === 'GET')) {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true });
    const body = await readJson(req, 64 * 1024);
    const paymentId = body.data?.id || body.id;
    if (paymentId && mercadoPagoConfigured()) {
      try {
        const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`);
        const orderIndex = data.orders.findIndex((item) => item.id === payment.external_reference);
        if (orderIndex >= 0) { data.orders[orderIndex] = { ...data.orders[orderIndex], provider: 'mercadopago', status: payment.status || data.orders[orderIndex].status }; saveData(); }
      } catch (error) { console.warn('Mercado Pago webhook lookup failed:', error.message); }
    }
    return sendJson(res, 200, { ok: true });
  }

  if (!pathname.startsWith('/api/admin/')) return false;
  if (!hasAdminSession(req)) {
    sendJson(res, 401, { error: 'Admin authentication required.' });
    return true;
  }

  if (pathname === '/api/admin/state' && req.method === 'GET') {
    return sendJson(res, 200, data);
  }

  if (pathname === '/api/admin/state' && req.method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJson(res, 400, { error: 'Invalid admin state.' });
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

  sendJson(res, 404, { error: 'Admin endpoint not found.' });
  return true;
}

const server = http.createServer(async (req, res) => {
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
