const STORAGE_KEY = 'hng-admin-state-v1';
const CHECKOUT_STORAGE_KEY = 'hng-checkout-submissions-v1';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const defaultState = {
  orders: [
    {
      id: 'ORD-260825-001',
      customer: 'Mariana Silva',
      whatsapp: '+55 11 98888-1201',
      email: 'mariana@email.com',
      plan: 'Pacote Turismo Coreia',
      paymentMethod: 'pix',
      paymentDate: '2026-08-25 09:42',
      amount: 2980,
      referralCode: 'ANSA',
      status: 'paid',
    },
    {
      id: 'ORD-260825-002',
      customer: 'Lucas Pereira',
      whatsapp: '+55 21 97777-8822',
      email: 'lucas@email.com',
      plan: 'Pacote Estudante Internacional',
      paymentMethod: 'card',
      paymentDate: '2026-08-25 10:18',
      amount: 5480,
      referralCode: 'SEOUL10',
      status: 'paid',
    },
    {
      id: 'ORD-260824-003',
      customer: 'Aline Costa',
      whatsapp: '+55 31 96666-1122',
      email: 'aline@email.com',
      plan: 'Pacote Turismo Coreia',
      paymentMethod: 'card',
      paymentDate: '2026-08-24 17:36',
      amount: 2980,
      referralCode: 'BRASILVIP',
      status: 'refunded',
    },
    {
      id: 'ORD-260824-004',
      customer: 'Bruno Kim',
      whatsapp: '+55 41 95555-7788',
      email: 'bruno@email.com',
      plan: 'Pacote Estudante Internacional',
      paymentMethod: 'pix',
      paymentDate: '2026-08-24 19:05',
      amount: 5480,
      referralCode: 'ANSA',
      status: 'pending',
    },
  ],
  referralCodes: [
    {
      code: 'ANSA',
      partner: 'ANSA',
      active: true,
      note: 'Canal principal com operação e suporte no Brasil.',
    },
    {
      code: 'SEOUL10',
      partner: 'Seoúl Creator',
      active: true,
      note: 'Campanha para criadores e comunidades de viagem.',
    },
    {
      code: 'BRASILVIP',
      partner: 'Brasil VIP',
      active: false,
      note: 'Campanha antiga em pausa temporária.',
    },
  ],
  products: {
    tourism: {
      title: 'Pacote Turismo Coreia',
      price: 2980,
      image: '/assets/plan-job-seoul.png',
      description: 'Pacote de entrada para viajantes que querem experiência coreana com suporte comercial e atendimento em PT-BR.',
      includes: [
        'Suporte de compra e contratação',
        'Orientação em português do Brasil',
        'Material comercial simplificado',
        'Contato direto por WhatsApp',
      ],
      availability: 'available',
      cta: 'Finalizar inscrição',
    },
    student: {
      title: 'Pacote Estudante Internacional',
      price: 5480,
      image: '/assets/plan-class-seoul.png',
      description: 'Pacote com foco em estudantes estrangeiros, adaptado para chegada, vida local e fluxo de matrícula.',
      includes: [
        'Apoio de chegada e instalação',
        'Organização do fluxo de matrícula',
        'Ajustes de comunicação e suporte local',
        'Integração com a jornada de estudos',
      ],
      availability: 'few',
      cta: 'Iniciar matrícula',
    },
  },
  checkout: {
    pixUrl: '',
    cardUrl: '',
    whatsappUrl: 'https://wa.me/821055613505',
  },
  activity: [
    { title: 'Demo inicial carregada', body: 'Pedidos, parceiros e produtos foram semeados para a área administrativa.', time: 'há poucos segundos', icon: 'bi bi-bag-check' },
    { title: 'Canal ANSA ativo', body: 'O código ANSA aparece vinculado aos pedidos do painel.', time: 'hoje', icon: 'bi bi-people' },
    { title: 'Pacote Estudante atualizado', body: 'Imagem principal e preço ficaram prontos para edição rápida.', time: 'hoje', icon: 'bi bi-box-seam' },
  ],
};

const state = loadState();
const modalRefs = {
  order: new bootstrap.Modal(document.getElementById('orderModal')),
  partner: new bootstrap.Modal(document.getElementById('partnerModal')),
  codeDetail: new bootstrap.Modal(document.getElementById('codeDetailModal')),
};

const el = {
  ordersBody: document.getElementById('ordersTableBody'),
  partnersBody: document.getElementById('partnersTableBody'),
  activity: document.getElementById('activityTimeline'),
  tourismPreview: document.getElementById('tourismPreview'),
  studentPreview: document.getElementById('studentPreview'),
  metricOrders: document.getElementById('metricOrders'),
  metricRevenue: document.getElementById('metricRevenue'),
  metricPayments: document.getElementById('metricPayments'),
  metricRefunds: document.getElementById('metricRefunds'),
  globalSearch: document.getElementById('globalSearch'),
  statusFilter: document.getElementById('statusFilter'),
  paymentFilter: document.getElementById('paymentFilter'),
  codeDetailTitle: document.getElementById('codeDetailTitle'),
  codeDetailSummary: document.getElementById('codeDetailSummary'),
  codeDetailBody: document.getElementById('codeDetailBody'),
  partnerModalTitle: document.getElementById('partnerModalTitle'),
};

let activeOrderId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return mergeCheckoutSubmissions(structuredClone(defaultState));
    }
    return mergeCheckoutSubmissions(mergeState(JSON.parse(raw)));
  } catch (error) {
    console.warn('Unable to load admin state, using defaults.', error);
    return mergeCheckoutSubmissions(structuredClone(defaultState));
  }
}

function mergeState(input) {
  const merged = structuredClone(defaultState);
  if (!input || typeof input !== 'object') {
    return merged;
  }
  merged.orders = Array.isArray(input.orders) && input.orders.length ? input.orders : merged.orders;
  merged.referralCodes = Array.isArray(input.referralCodes) && input.referralCodes.length ? input.referralCodes : merged.referralCodes;
  merged.products = {
    ...merged.products,
    ...(input.products || {}),
    tourism: { ...merged.products.tourism, ...(input.products?.tourism || {}) },
    student: { ...merged.products.student, ...(input.products?.student || {}) },
  };
  merged.checkout = { ...merged.checkout, ...(input.checkout || {}) };
  merged.activity = Array.isArray(input.activity) && input.activity.length ? input.activity : merged.activity;
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mergeCheckoutSubmissions(baseState) {
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return baseState;
    const submissions = JSON.parse(raw);
    if (!Array.isArray(submissions) || !submissions.length) return baseState;

    const existingIds = new Set((baseState.orders || []).map((order) => order.id));
    const mapped = submissions
      .filter((submission) => submission && !existingIds.has(submission.id))
      .map((submission) => ({
        id: submission.id,
        customer: submission.customer || submission.name || '—',
        whatsapp: submission.whatsapp || submission.phone || '—',
        email: submission.email || '—',
        plan: submission.plan || 'Plano H&G',
        paymentMethod: submission.paymentMethod === 'card' ? 'card' : 'pix',
        paymentDate: submission.paymentDate || '—',
        amount: Number(submission.amount || 0),
        referralCode: submission.referralCode || '—',
        status: submission.status || 'paid',
      }));

    baseState.orders = [...mapped, ...(baseState.orders || [])];
    return baseState;
  } catch (error) {
    console.warn('Unable to merge checkout submissions.', error);
    return baseState;
  }
}

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function paymentLabel(method) {
  return method === 'pix' ? 'PIX' : 'Cartão';
}

function paymentBadgeClass(method) {
  return method === 'pix' ? 'badge-pix' : 'badge-card';
}

function statusLabel(status) {
  switch (status) {
    case 'paid':
      return 'Pago';
    case 'refunded':
      return 'Reembolsado';
    default:
      return 'Pendente';
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'paid':
      return 'badge-paid';
    case 'refunded':
      return 'badge-refunded';
    default:
      return 'badge-pending';
  }
}

function availabilityLabel(value) {
  if (value === 'few') return 'Poucas vagas';
  if (value === 'soldout') return 'Esgotado';
  return 'Disponível';
}

function availabilityBadgeClass(value) {
  if (value === 'few') return 'text-bg-warning-subtle text-warning border border-warning-subtle';
  if (value === 'soldout') return 'text-bg-danger-subtle text-danger border border-danger-subtle';
  return 'text-bg-success-subtle text-success border border-success-subtle';
}

function sanitizeDigits(text) {
  return String(text || '').replace(/\D/g, '');
}

function pushActivity(title, body, time, icon) {
  state.activity = [{ title, body, time, icon }, ...state.activity].slice(0, 8);
  renderActivity();
  saveState();
}

function toast(message, type = 'primary') {
  const host = document.querySelector('.toast-container');
  const id = `toast-${Date.now()}`;
  const colors = {
    primary: 'text-bg-primary',
    success: 'text-bg-success',
    danger: 'text-bg-danger',
    warning: 'text-bg-warning',
  };
  host.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center ${colors[type] || colors.primary} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body fw-semibold">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `);
  const toastEl = document.getElementById(id);
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2600 }).show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove(), { once: true });
}

function getFilteredOrders() {
  const query = (el.globalSearch?.value || '').trim().toLowerCase();
  const status = el.statusFilter?.value || 'all';
  const payment = el.paymentFilter?.value || 'all';

  return state.orders.filter((order) => {
    const haystack = [
      order.id,
      order.customer,
      order.whatsapp,
      order.email,
      order.plan,
      order.referralCode,
      paymentLabel(order.paymentMethod),
      statusLabel(order.status),
    ].join(' ').toLowerCase();

    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = status === 'all' || order.status === status;
    const matchesPayment = payment === 'all' || order.paymentMethod === payment;
    return matchesQuery && matchesStatus && matchesPayment;
  });
}

function renderMetrics() {
  const totalOrders = state.orders.length;
  const revenue = state.orders.reduce((sum, order) => sum + (order.status === 'refunded' ? 0 : Number(order.amount || 0)), 0);
  const pixOrders = state.orders.filter((order) => order.paymentMethod === 'pix').length;
  const cardOrders = state.orders.filter((order) => order.paymentMethod === 'card').length;
  const refundedOrders = state.orders.filter((order) => order.status === 'refunded').length;

  el.metricOrders.textContent = String(totalOrders);
  el.metricRevenue.textContent = formatCurrency(revenue);
  el.metricPayments.textContent = `${pixOrders} / ${cardOrders}`;
  el.metricRefunds.textContent = String(refundedOrders);
}

function renderOrders() {
  const rows = getFilteredOrders();
  if (!rows.length) {
    el.ordersBody.innerHTML = '<tr><td colspan="11" class="text-center text-secondary py-4">Nenhum pedido encontrado.</td></tr>';
    return;
  }

  el.ordersBody.innerHTML = rows.map((order) => `
    <tr>
      <td class="fw-semibold">${order.id}</td>
      <td>${order.customer}</td>
      <td><a href="https://wa.me/${sanitizeDigits(order.whatsapp)}" target="_blank" rel="noreferrer">${order.whatsapp}</a></td>
      <td><a href="mailto:${order.email}">${order.email}</a></td>
      <td>${order.plan}</td>
      <td><span class="badge badge-soft ${paymentBadgeClass(order.paymentMethod)}">${paymentLabel(order.paymentMethod)}</span></td>
      <td><span class="text-uppercase fw-semibold">${order.referralCode}</span></td>
      <td>${order.paymentDate}</td>
      <td class="fw-bold">${formatCurrency(order.amount)}</td>
      <td><span class="badge badge-soft ${statusBadgeClass(order.status)}">${statusLabel(order.status)}</span></td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-action="view-order" data-id="${order.id}">Detalhes</button>
        <button class="btn btn-sm btn-outline-danger ms-1" data-action="refund-order" data-id="${order.id}" ${order.status === 'refunded' ? 'disabled' : ''}>Reembolsar</button>
      </td>
    </tr>
  `).join('');
}

function renderPartners() {
  const rows = state.referralCodes
    .map((code) => {
      const codeOrders = state.orders.filter((order) => order.referralCode?.toUpperCase() === code.code.toUpperCase());
      const totalRevenue = codeOrders.reduce((sum, order) => sum + (order.status === 'refunded' ? 0 : Number(order.amount || 0)), 0);
      return { ...code, totalOrders: codeOrders.length, totalRevenue };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  if (!rows.length) {
    el.partnersBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum código cadastrado.</td></tr>';
    return;
  }

  el.partnersBody.innerHTML = rows.map((code) => `
    <tr>
      <td class="fw-semibold">${code.code}</td>
      <td>${code.partner}</td>
      <td class="text-end">${code.totalOrders}</td>
      <td class="text-end fw-semibold">${formatCurrency(code.totalRevenue)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-success" data-action="code-detail" data-code="${code.code}">Clientes</button>
        <button class="btn btn-sm btn-outline-secondary ms-1" data-action="code-edit" data-code="${code.code}">Editar</button>
      </td>
    </tr>
  `).join('');
}

function fillProductForm(form, product) {
  if (!form || !product) return;
  form.elements.title.value = product.title || '';
  form.elements.price.value = Number(product.price || 0).toFixed(2);
  form.elements.image.value = product.image || '';
  form.elements.description.value = product.description || '';
  form.elements.includes.value = (product.includes || []).join('\n');
  form.elements.availability.value = product.availability || 'available';
  form.elements.cta.value = product.cta || '';
}

function updateProductPreview(type) {
  const product = state.products[type];
  const preview = type === 'tourism' ? el.tourismPreview : el.studentPreview;
  if (preview && product) {
    preview.src = product.image || '';
    preview.alt = product.title || 'Prévia do produto';
  }
}

function renderProducts() {
  fillProductForm(document.querySelector('[data-product-form="tourism"]'), state.products.tourism);
  fillProductForm(document.querySelector('[data-product-form="student"]'), state.products.student);
  updateProductPreview('tourism');
  updateProductPreview('student');
}

function renderActivity() {
  if (!state.activity.length) {
    el.activity.innerHTML = '<div class="text-secondary small">Sem atividade recente.</div>';
    return;
  }

  el.activity.innerHTML = state.activity.map((item) => `
    <div>
      <i class="bi ${item.icon || 'bi-dot'}"></i>
      <div class="timeline-item shadow-sm">
        <span class="time"><i class="bi bi-clock me-1"></i>${item.time}</span>
        <h3 class="timeline-header fw-semibold">${item.title}</h3>
        <div class="timeline-body">${item.body}</div>
      </div>
    </div>
  `).join('');
}

function renderCheckoutForm() {
  const form = document.getElementById('checkoutSettingsForm');
  if (!form) return;
  form.elements.pixUrl.value = state.checkout.pixUrl || '';
  form.elements.cardUrl.value = state.checkout.cardUrl || '';
  form.elements.whatsappUrl.value = state.checkout.whatsappUrl || '';
}

function renderAll() {
  renderMetrics();
  renderOrders();
  renderPartners();
  renderProducts();
  renderActivity();
  renderCheckoutForm();
  saveState();
}

function exportCsv() {
  const rows = [
    ['pedido', 'cliente', 'whatsapp', 'email', 'plano', 'pagamento', 'codigo', 'data_pagamento', 'valor_brl', 'status'],
    ...getFilteredOrders().map((order) => [
      order.id,
      order.customer,
      order.whatsapp,
      order.email,
      order.plan,
      paymentLabel(order.paymentMethod),
      order.referralCode,
      order.paymentDate,
      Number(order.amount || 0).toFixed(2).replace('.', ','),
      statusLabel(order.status),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(';')).join('\n');
  downloadFile('hng-orders.csv', csv, 'text/csv;charset=utf-8;');
  toast('CSV exportado com os pedidos filtrados.');
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[,;"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openOrderDetails(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  activeOrderId = order.id;
  document.getElementById('modalRefundBtn').disabled = order.status === 'refunded';

  document.getElementById('orderModalBody').innerHTML = `
    <div class="col-md-6">
      <div class="p-3 bg-body-tertiary rounded-4 h-100">
        <div class="text-secondary small mb-1">Cliente</div>
        <div class="fw-semibold fs-5">${order.customer}</div>
        <div class="small text-secondary mt-2">${order.email}</div>
        <div class="small text-secondary">${order.whatsapp}</div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="p-3 bg-body-tertiary rounded-4 h-100">
        <div class="text-secondary small mb-1">Pedido</div>
        <div class="fw-semibold">${order.id}</div>
        <div class="small text-secondary mt-2">Plano: ${order.plan}</div>
        <div class="small text-secondary">Código: ${order.referralCode}</div>
        <div class="small text-secondary">Pagamento: ${paymentLabel(order.paymentMethod)} • ${order.paymentDate}</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-white border rounded-4 h-100">
        <div class="text-secondary small">Valor</div>
        <div class="fs-4 fw-bold">${formatCurrency(order.amount)}</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-white border rounded-4 h-100">
        <div class="text-secondary small">Status</div>
        <div class="mt-2"><span class="badge badge-soft ${statusBadgeClass(order.status)}">${statusLabel(order.status)}</span></div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-white border rounded-4 h-100">
        <div class="text-secondary small">Meio</div>
        <div class="mt-2"><span class="badge badge-soft ${paymentBadgeClass(order.paymentMethod)}">${paymentLabel(order.paymentMethod)}</span></div>
      </div>
    </div>
  `;
  modalRefs.order.show();
}

function refundOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status === 'refunded') return;
  if (!confirm(`Reembolsar ${order.id} (${order.customer})?`)) return;
  order.status = 'refunded';
  saveState();
  renderAll();
  modalRefs.order.hide();
  toast(`Pedido ${order.id} marcado como reembolsado.`, 'danger');
  pushActivity('Reembolso realizado', `${order.customer} teve o pedido ${order.id} reembolsado com sucesso.`, 'agora', 'bi bi-arrow-counterclockwise');
}

function openPartnerForm(code = null) {
  const form = document.getElementById('partnerForm');
  form.reset();
  if (code) {
    const entry = state.referralCodes.find((item) => item.code === code);
    if (!entry) return;
    el.partnerModalTitle.textContent = `Editar código ${entry.code}`;
    form.elements.originalCode.value = entry.code;
    form.elements.code.value = entry.code;
    form.elements.partner.value = entry.partner;
    form.elements.active.value = String(Boolean(entry.active));
    form.elements.note.value = entry.note || '';
  } else {
    el.partnerModalTitle.textContent = 'Novo código de parceiro';
    form.elements.originalCode.value = '';
    form.elements.active.value = 'true';
  }
  modalRefs.partner.show();
}

function savePartnerCode(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const originalCode = form.elements.originalCode.value.trim();
  const code = form.elements.code.value.trim().toUpperCase();
  const partner = form.elements.partner.value.trim();
  const active = form.elements.active.value === 'true';
  const note = form.elements.note.value.trim();

  if (!code || !partner) return;

  const duplicate = state.referralCodes.find((item) => item.code.toUpperCase() === code && item.code.toUpperCase() !== originalCode.toUpperCase());
  if (duplicate) {
    toast(`Já existe um parceiro com o código ${code}.`, 'danger');
    return;
  }

  if (originalCode) {
    const index = state.referralCodes.findIndex((item) => item.code === originalCode);
    if (index >= 0) {
      state.referralCodes[index] = { code, partner, active, note };
    }
  } else {
    state.referralCodes.push({ code, partner, active, note });
  }

  saveState();
  renderPartners();
  modalRefs.partner.hide();
  toast(`Código ${code} salvo com sucesso.`);
  pushActivity('Código de parceiro salvo', `O código ${code} foi criado ou atualizado.`, 'agora', 'bi bi-people');
}

function openCodeDetails(code) {
  const entry = state.referralCodes.find((item) => item.code === code);
  if (!entry) return;
  const orders = state.orders.filter((order) => order.referralCode?.toUpperCase() === code.toUpperCase());
  const totalRevenue = orders.reduce((sum, order) => sum + (order.status === 'refunded' ? 0 : Number(order.amount || 0)), 0);

  el.codeDetailTitle.textContent = `Código ${entry.code} • ${entry.partner}`;
  el.codeDetailSummary.innerHTML = `
    <div class="col-md-4"><div class="p-3 bg-body-tertiary rounded-4 h-100"><div class="text-secondary small">Uso total</div><div class="fs-4 fw-bold">${orders.length}</div></div></div>
    <div class="col-md-4"><div class="p-3 bg-body-tertiary rounded-4 h-100"><div class="text-secondary small">Receita líquida</div><div class="fs-4 fw-bold">${formatCurrency(totalRevenue)}</div></div></div>
    <div class="col-md-4"><div class="p-3 bg-body-tertiary rounded-4 h-100"><div class="text-secondary small">Status</div><div class="mt-2"><span class="badge badge-soft ${entry.active ? 'badge-paid' : 'badge-pending'}">${entry.active ? 'Ativo' : 'Inativo'}</span></div></div></div>
  `;

  if (!orders.length) {
    el.codeDetailBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum cliente vinculado a este código.</td></tr>';
  } else {
    el.codeDetailBody.innerHTML = orders.map((order) => `
      <tr>
        <td>${order.customer}</td>
        <td>${order.plan}</td>
        <td>${paymentLabel(order.paymentMethod)}</td>
        <td>${order.paymentDate}</td>
        <td class="text-end fw-semibold">${formatCurrency(order.amount)}</td>
      </tr>
    `).join('');
  }
  modalRefs.codeDetail.show();
}

function bindProductForms() {
  document.querySelectorAll('[data-product-form]').forEach((form) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      const type = form.dataset.productForm;
      const next = {
        title: form.elements.title.value.trim(),
        price: Number(form.elements.price.value || 0),
        image: form.elements.image.value.trim(),
        description: form.elements.description.value.trim(),
        includes: form.elements.includes.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        availability: form.elements.availability.value,
        cta: form.elements.cta.value.trim() || (type === 'tourism' ? 'Finalizar inscrição' : 'Iniciar matrícula'),
      };
      state.products[type] = next;
      saveState();
      updateProductPreview(type);
      toast(`Produto ${next.title} salvo com sucesso.`);
      pushActivity('Produto atualizado', `${next.title} recebeu uma nova imagem, preço ou texto de descrição.`, 'agora', 'bi bi-box-seam');
    };
  });
}

function bindEvents() {
  document.getElementById('sidebarToggle').addEventListener('click', (event) => {
    event.preventDefault();
    document.body.classList.toggle('sidebar-collapse');
  });

  document.getElementById('refreshDataBtn').addEventListener('click', () => {
    renderAll();
    toast('Dados atualizados.');
  });

  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    if (!confirm('Restaurar os dados de demonstração?')) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  document.getElementById('newPartnerBtn').addEventListener('click', () => openPartnerForm());
  document.getElementById('newPartnerMiniBtn').addEventListener('click', () => openPartnerForm());

  document.getElementById('exportCsvTop').addEventListener('click', exportCsv);
  document.getElementById('exportCsvInline').addEventListener('click', exportCsv);

  document.getElementById('globalSearch').addEventListener('input', renderOrders);
  document.getElementById('statusFilter').addEventListener('change', renderOrders);
  document.getElementById('paymentFilter').addEventListener('change', renderOrders);

  document.getElementById('ordersTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'view-order') openOrderDetails(id);
    if (action === 'refund-order') refundOrder(id);
  });

  document.getElementById('partnersTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, code } = button.dataset;
    if (action === 'code-detail') openCodeDetails(code);
    if (action === 'code-edit') openPartnerForm(code);
  });

  document.getElementById('modalRefundBtn').addEventListener('click', () => {
    if (activeOrderId) refundOrder(activeOrderId);
  });

  document.getElementById('partnerForm').addEventListener('submit', savePartnerCode);

  document.getElementById('checkoutSettingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    state.checkout.pixUrl = form.elements.pixUrl.value.trim();
    state.checkout.cardUrl = form.elements.cardUrl.value.trim();
    state.checkout.whatsappUrl = form.elements.whatsappUrl.value.trim();
    saveState();
    toast('Configurações de checkout salvas.');
    pushActivity('Checkout atualizado', 'Links PIX, cartão e WhatsApp foram atualizados.', 'agora', 'bi bi-credit-card');
  });

  document.querySelectorAll('.product-form input[name="image"]').forEach((input) => {
    input.addEventListener('input', () => {
      const type = input.closest('[data-product-form]').dataset.productForm;
      updateProductPreview(type);
    });
  });
}

function updateProductPreview(type) {
  const product = state.products[type];
  const preview = type === 'tourism' ? el.tourismPreview : el.studentPreview;
  if (preview && product) {
    preview.src = product.image || '';
    preview.alt = product.title || 'Prévia do produto';
  }
}

bindEvents();
renderAll();
