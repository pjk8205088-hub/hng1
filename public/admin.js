const STORAGE_KEY = 'hng-admin-state-v1';
const CHECKOUT_STORAGE_KEY = 'hng-checkout-submissions-v1';

// Admin-only Korean display for existing PT-BR catalog copy. Saving an
// unchanged translated field restores the original customer-facing text.
const PRODUCT_COPY_KO = new Map([
  ['Plano Basic', 'H-1 워킹홀리데이 Basic (베이직)'],
  ['Plano Standard', 'H-1 워킹홀리데이 Standard (스탠더드)'],
  ['Plano All-In', 'H-1 워킹홀리데이 All-In (올인)'],
  ['Pacote de entrada para viajantes que querem experiência coreana com suporte comercial e atendimento em PT-BR.', '한국 여행 경험을 원하는 고객을 위한 입문 상품입니다. 구매 상담과 브라질 포르투갈어 안내를 제공합니다.'],
  ['Suporte de compra e contratação', '구매 및 계약 지원'],
  ['Orientação em português do Brasil', '브라질 포르투갈어 안내'],
  ['Material comercial simplificado', '간결한 상품 안내 자료'],
  ['Contato direto por WhatsApp', 'WhatsApp 직접 상담'],
  ['Finalizar inscrição', '신청 완료'],
  ['Pacote com foco em estudantes estrangeiros, adaptado para chegada, vida local e fluxo de matrícula.', '외국인 유학생의 입국, 현지 생활 및 등록 절차를 지원하는 상품입니다.'],
  ['Apoio de chegada e instalação', '입국 및 정착 지원'],
  ['Organização do fluxo de matrícula', '등록 절차 안내'],
  ['Ajustes de comunicação e suporte local', '현지 소통 및 지원'],
  ['Integração com a jornada de estudos', '학업 일정 연계'],
  ['Iniciar matrícula', '등록 시작'],
]);
const PRODUCT_COPY_PT = new Map([...PRODUCT_COPY_KO].map(([pt, ko]) => [ko, pt]));
const LEGACY_PLAN_NAMES_KO = new Map([
  ['Pacote Turismo Coreia', 'H-1 워킹홀리데이 Basic (베이직)'],
  ['Pacote Turismo', 'H-1 워킹홀리데이 Basic (베이직)'],
  ['Pacote Estudante Internacional', 'H-1 워킹홀리데이 Standard (스탠더드)'],
  ['Pacote Estudante', 'H-1 워킹홀리데이 Standard (스탠더드)'],
  ['Pacote All-In', 'H-1 워킹홀리데이 All-In (올인)'],
]);
const productCopyForAdmin = (value) => PRODUCT_COPY_KO.get(value) || LEGACY_PLAN_NAMES_KO.get(value) || value || '';
const productCopyForSite = (value) => PRODUCT_COPY_PT.get(value) || value || '';
const PARTNER_NOTE_KO = new Map([
  ['Canal principal com operação e suporte no Brasil.', '브라질 운영 및 지원을 담당하는 주요 채널'],
  ['Campanha para criadores e comunidades de viagem.', '크리에이터와 여행 커뮤니티 대상 캠페인'],
  ['Campanha antiga em pausa temporária.', '일시 중단된 이전 캠페인'],
]);
const PARTNER_NOTE_PT = new Map([...PARTNER_NOTE_KO].map(([pt, ko]) => [ko, pt]));

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
  members: [
    {
      id: 'MEM-260825-001',
      name: 'Mariana Silva',
      whatsapp: '+55 11 98888-1201',
      email: 'mariana@email.com',
      plan: 'Pacote Turismo Coreia',
      referralCode: 'ANSA',
      joinedAt: '25/08/2026 09:42',
      status: 'active',
    },
    {
      id: 'MEM-260825-002',
      name: 'Lucas Pereira',
      whatsapp: '+55 21 97777-8822',
      email: 'lucas@email.com',
      plan: 'Pacote Estudante Internacional',
      referralCode: 'SEOUL10',
      joinedAt: '25/08/2026 10:18',
      status: 'active',
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
    basic: {
      title: 'Plano Basic',
      price: 2980,
      image: '/assets/plan-job-seoul.png',
      description: 'Instalação e emprego na Coreia',
      includes: [
        'Suporte a emprego',
        'Indicação de moradia',
        'Care Day (ARC + banco)',
        'Chip SIM coreano',
        'Orientação básica do Working Holiday na Coreia (OT)',
      ],
      availability: 'available',
      cta: 'Inscrever-se agora',
    },
    standard: {
      title: 'Plano Standard',
      price: 5480,
      image: '/assets/plan-home-seoul.png',
      description: 'Instalação e estadia de 1 mês em Seul',
      includes: [
        'Tudo do Plano Basic',
        '1 mês de acomodação inclusa',
        'Suporte no check-in',
      ],
      availability: 'few',
      cta: 'Inscrever-se agora',
    },
    allin: {
      title: 'Plano All-In',
      price: 6480,
      image: '/assets/plan-class-seoul.png',
      description: 'Estadia, curso de coreano e suporte ampliado',
      includes: [
        'Tudo do Plano Standard',
        '2 semanas de curso de coreano',
        'Suporte de instalação ampliado',
      ],
      availability: 'available',
      cta: 'Inscrever-se agora',
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
  member: new bootstrap.Modal(document.getElementById('memberModal')),
};

const el = {
  ordersBody: document.getElementById('ordersTableBody'),
  partnersBody: document.getElementById('partnersTableBody'),
  membersBody: document.getElementById('membersTableBody'),
  activity: document.getElementById('activityTimeline'),
  productPreviews: Object.fromEntries(['basic', 'standard', 'allin'].map((type) => [type, document.getElementById(`${type}Preview`)])),
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
  memberModalTitle: document.getElementById('memberModalTitle'),
  memberSearch: document.getElementById('memberSearch'),
  memberStatusFilter: document.getElementById('memberStatusFilter'),
};

let activeOrderId = null;
let remoteReady = false;
let remoteSaveInFlight = false;
let remoteSaveQueued = false;

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
  merged.members = Array.isArray(input.members) && input.members.length ? input.members : merged.members;
  merged.referralCodes = Array.isArray(input.referralCodes) && input.referralCodes.length ? input.referralCodes : merged.referralCodes;
  merged.products = {
    ...merged.products,
    ...(input.products || {}),
    basic: { ...merged.products.basic, ...(input.products?.basic || {}) },
    standard: { ...merged.products.standard, ...(input.products?.standard || {}) },
    allin: { ...merged.products.allin, ...(input.products?.allin || {}) },
  };
  merged.checkout = { ...merged.checkout, ...(input.checkout || {}) };
  merged.activity = Array.isArray(input.activity) && input.activity.length ? input.activity : merged.activity;
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (remoteReady) syncRemoteState();
}

async function syncRemoteState() {
  if (remoteSaveInFlight) {
    remoteSaveQueued = true;
    return;
  }
  remoteSaveInFlight = true;
  try {
    const response = await fetch('/api/admin/state', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!response.ok) throw new Error(`Admin state save failed (${response.status})`);
  } catch (error) {
    console.warn(error.message);
  } finally {
    remoteSaveInFlight = false;
    if (remoteSaveQueued) {
      remoteSaveQueued = false;
      syncRemoteState();
    }
  }
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
        arrival: submission.arrival || '—',
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
  return method === 'pix' ? 'PIX' : '신용카드';
}

function paymentBadgeClass(method) {
  return method === 'pix' ? 'badge-pix' : 'badge-card';
}

function statusLabel(status) {
  switch (status) {
    case 'paid':
      return '결제 완료';
    case 'refunded':
      return '환불 완료';
    case 'refund_pending':
      return '환불 처리 중';
    case 'refund_rejected':
      return '환불 거절';
    default:
      return '결제 대기';
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'paid':
      return 'badge-paid';
    case 'refunded':
      return 'badge-refunded';
    case 'refund_pending':
      return 'badge-pending';
    case 'refund_rejected':
      return 'badge-refunded';
    default:
      return 'badge-pending';
  }
}

function availabilityLabel(value) {
  if (value === 'few') return '잔여 수량 적음';
  if (value === 'soldout') return '품절';
  return '판매 가능';
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
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="닫기"></button>
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
      productCopyForAdmin(order.plan),
      order.arrival,
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
    el.ordersBody.innerHTML = '<tr><td colspan="12" class="text-center text-secondary py-4">주문 내역이 없습니다.</td></tr>';
    return;
  }

  el.ordersBody.innerHTML = rows.map((order) => `
    <tr>
      <td class="fw-semibold">${order.id}</td>
      <td>${order.customer}</td>
      <td><a href="https://wa.me/${sanitizeDigits(order.whatsapp)}" target="_blank" rel="noreferrer">${order.whatsapp}</a></td>
      <td><a href="mailto:${order.email}">${order.email}</a></td>
      <td>${productCopyForAdmin(order.plan)}</td>
      <td><span class="badge badge-soft ${paymentBadgeClass(order.paymentMethod)}">${paymentLabel(order.paymentMethod)}</span></td>
      <td><span class="text-uppercase fw-semibold">${order.referralCode}</span></td>
      <td>${order.arrival || '—'}</td>
      <td>${order.paymentDate}</td>
      <td class="fw-bold">${formatCurrency(order.amount)}</td>
      <td><span class="badge badge-soft ${statusBadgeClass(order.status)}">${statusLabel(order.status)}</span></td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-action="view-order" data-id="${order.id}">상세 보기</button>
        <button class="btn btn-sm btn-outline-danger ms-1" data-action="refund-order" data-id="${order.id}" ${['refunded', 'refund_pending'].includes(order.status) ? 'disabled' : ''}>환불 처리</button>
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
    el.partnersBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">등록된 추천인 코드가 없습니다.</td></tr>';
    return;
  }

  el.partnersBody.innerHTML = rows.map((code) => `
    <tr>
      <td class="fw-semibold">${code.code}</td>
      <td>${code.partner}</td>
      <td class="text-end">${code.totalOrders}</td>
      <td class="text-end fw-semibold">${formatCurrency(code.totalRevenue)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-success" data-action="code-detail" data-code="${code.code}">고객 목록</button>
        <button class="btn btn-sm btn-outline-secondary ms-1" data-action="code-edit" data-code="${code.code}">수정</button>
      </td>
    </tr>
  `).join('');
}

function memberStatusLabel(status) {
  return status === 'inactive' ? '비활성' : '활성';
}

function memberStatusClass(status) {
  return status === 'inactive' ? 'badge-pending' : 'badge-paid';
}

function filteredMembers() {
  const query = (el.memberSearch?.value || '').trim().toLowerCase();
  const status = el.memberStatusFilter?.value || 'all';
  return state.members.filter((member) => {
    const haystack = [member.name, member.email, member.whatsapp, member.plan, productCopyForAdmin(member.plan), member.referralCode, member.arrival].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (status === 'all' || member.status === status);
  });
}

function renderMembers() {
  if (!el.membersBody) return;
  const members = filteredMembers();
  if (!members.length) {
    el.membersBody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary py-4">회원이 없습니다.</td></tr>';
    return;
  }
  el.membersBody.innerHTML = members.map((member) => `
    <tr>
      <td class="fw-semibold">${member.name}</td>
      <td><a href="https://wa.me/${sanitizeDigits(member.whatsapp)}" target="_blank" rel="noreferrer">${member.whatsapp}</a></td>
      <td><a href="mailto:${member.email}">${member.email}</a></td>
      <td>${productCopyForAdmin(member.plan) || '—'}</td>
      <td><span class="text-uppercase fw-semibold">${member.referralCode || '—'}</span></td>
      <td>${member.arrival || '—'}</td>
      <td>${member.joinedAt || '—'}</td>
      <td><span class="badge badge-soft ${memberStatusClass(member.status)}">${memberStatusLabel(member.status)}</span></td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" data-action="member-edit" data-id="${member.id}">수정</button>
        <button class="btn btn-sm btn-outline-danger ms-1" data-action="member-delete" data-id="${member.id}">삭제</button>
      </td>
    </tr>
  `).join('');
}

function fillProductForm(form, product) {
  if (!form || !product) return;
  form.elements.title.value = productCopyForAdmin(product.title);
  form.elements.price.value = Number(product.price || 0).toFixed(2);
  form.elements.image.value = product.image || '';
  form.elements.description.value = productCopyForAdmin(product.description);
  form.elements.includes.value = (product.includes || []).map(productCopyForAdmin).join('\n');
  form.elements.availability.value = product.availability || 'available';
  form.elements.cta.value = productCopyForAdmin(product.cta);
}

function updateProductPreview(type) {
  const product = state.products[type];
  const preview = el.productPreviews[type];
  if (preview && product) {
    preview.src = product.image || '';
    preview.alt = product.title || '상품 미리보기';
  }
}

function renderProducts() {
  ['basic', 'standard', 'allin'].forEach((type) => {
    fillProductForm(document.querySelector(`[data-product-form="${type}"]`), state.products[type]);
    updateProductPreview(type);
  });
}

function renderActivity() {
  if (!state.activity.length) {
    el.activity.innerHTML = '<div class="text-secondary small">최근 활동이 없습니다.</div>';
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
  renderMembers();
  renderProducts();
  renderActivity();
  renderCheckoutForm();
  saveState();
}

function exportCsv() {
  const rows = [
    ['pedido', 'cliente', 'whatsapp', 'email', 'plano', 'pagamento', 'codigo', 'previsao_chegada', 'data_pagamento', 'valor_brl', 'status'],
    ...getFilteredOrders().map((order) => [
      order.id,
      order.customer,
      order.whatsapp,
      order.email,
      order.plan,
      paymentLabel(order.paymentMethod),
      order.referralCode,
      order.arrival || '—',
      order.paymentDate,
      Number(order.amount || 0).toFixed(2).replace('.', ','),
      statusLabel(order.status),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(';')).join('\n');
  downloadFile('hng-orders.csv', csv, 'text/csv;charset=utf-8;');
  toast('필터링한 주문 내역을 CSV로 다운로드했습니다.');
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
  document.getElementById('modalRefundBtn').disabled = ['refunded', 'refund_pending'].includes(order.status);

  document.getElementById('orderModalBody').innerHTML = `
    <div class="col-md-6">
      <div class="p-3 bg-body-tertiary rounded-4 h-100">
        <div class="text-secondary small mb-1">고객</div>
        <div class="fw-semibold fs-5">${order.customer}</div>
        <div class="small text-secondary mt-2">${order.email}</div>
        <div class="small text-secondary">${order.whatsapp}</div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="p-3 bg-body-tertiary rounded-4 h-100">
        <div class="text-secondary small mb-1">주문번호</div>
        <div class="fw-semibold">${order.id}</div>
        <div class="small text-secondary mt-2">플랜: ${productCopyForAdmin(order.plan)}</div>
        <div class="small text-secondary">코드: ${order.referralCode}</div>
        <div class="small text-secondary">결제: ${paymentLabel(order.paymentMethod)} • ${order.paymentDate}</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-white border rounded-4 h-100">
        <div class="text-secondary small">금액</div>
        <div class="fs-4 fw-bold">${formatCurrency(order.amount)}</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-white border rounded-4 h-100">
        <div class="text-secondary small">상태</div>
        <div class="mt-2"><span class="badge badge-soft ${statusBadgeClass(order.status)}">${statusLabel(order.status)}</span></div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-white border rounded-4 h-100">
        <div class="text-secondary small">결제수단</div>
        <div class="mt-2"><span class="badge badge-soft ${paymentBadgeClass(order.paymentMethod)}">${paymentLabel(order.paymentMethod)}</span></div>
      </div>
    </div>
  `;
  modalRefs.order.show();
}

async function refundOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status === 'refunded' || order.refundStatus === 'success') return;
  if (!confirm(`주문 ${order.id} (${order.customer})을 환불 처리하시겠습니까?`)) return;
  try {
    const response = await fetch('/api/admin/orders/refund', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'PG 환불 요청에 실패했습니다.');
    const index = state.orders.findIndex((item) => item.id === order.id);
    if (index >= 0) state.orders[index] = payload.order || { ...order, status: 'refund_pending', refundStatus: String(payload.status || 'pending').toLowerCase() };
    renderAll();
    modalRefs.order.hide();
    toast(`주문 ${order.id} 환불 요청이 접수되었습니다. (${payload.status || 'PENDING'})`, 'danger');
    pushActivity('환불 처리', `${order.customer}의 주문 ${order.id}에 PG 환불을 요청했습니다.`, '지금', 'bi bi-arrow-counterclockwise');
  } catch (error) {
    toast(error.message, 'danger');
  }
}

function openPartnerForm(code = null) {
  const form = document.getElementById('partnerForm');
  form.reset();
  if (code) {
    const entry = state.referralCodes.find((item) => item.code === code);
    if (!entry) return;
    el.partnerModalTitle.textContent = `추천인 코드 ${entry.code} 수정`;
    form.elements.originalCode.value = entry.code;
    form.elements.code.value = entry.code;
    form.elements.partner.value = entry.partner;
    form.elements.active.value = String(Boolean(entry.active));
    form.elements.note.value = PARTNER_NOTE_KO.get(entry.note) || entry.note || '';
  } else {
    el.partnerModalTitle.textContent = '새 추천인 코드';
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
  const noteInput = form.elements.note.value.trim();
  const note = PARTNER_NOTE_PT.get(noteInput) || noteInput;

  if (!code || !partner) return;

  const duplicate = state.referralCodes.find((item) => item.code.toUpperCase() === code && item.code.toUpperCase() !== originalCode.toUpperCase());
  if (duplicate) {
    toast(`추천인 코드 ${code}가 이미 등록되어 있습니다.`, 'danger');
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
  toast(`추천인 코드 ${code}를 저장했습니다.`);
  pushActivity('추천인 코드 저장', `코드 ${code}가 생성 또는 수정되었습니다.`, '지금', 'bi bi-people');
}

function openMemberForm(memberId = null) {
  const form = document.getElementById('memberForm');
  form.reset();
  form.elements.originalId.value = '';
  if (memberId) {
    const member = state.members.find((item) => item.id === memberId);
    if (!member) return;
    el.memberModalTitle.textContent = `${member.name} 회원 수정`;
    form.elements.originalId.value = member.id;
    form.elements.name.value = member.name || '';
    form.elements.whatsapp.value = member.whatsapp || '';
    form.elements.email.value = member.email || '';
    form.elements.plan.value = productCopyForAdmin(member.plan);
    form.elements.referralCode.value = member.referralCode || '';
    form.elements.status.value = member.status || 'active';
  } else {
    el.memberModalTitle.textContent = '새 회원';
    form.elements.status.value = 'active';
  }
  modalRefs.member.show();
}

function saveMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const originalId = form.elements.originalId.value.trim();
  const member = {
    id: originalId || `MEM-${Date.now()}`,
    name: form.elements.name.value.trim(),
    whatsapp: form.elements.whatsapp.value.trim(),
    email: form.elements.email.value.trim(),
    plan: productCopyForSite(form.elements.plan.value.trim()) || '—',
    referralCode: form.elements.referralCode.value.trim().toUpperCase() || '—',
    joinedAt: originalId ? (state.members.find((item) => item.id === originalId)?.joinedAt || '—') : new Date().toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }),
    status: form.elements.status.value === 'inactive' ? 'inactive' : 'active',
  };
  if (!member.name || !member.email || !member.whatsapp) return;
  const duplicate = state.members.find((item) => item.email.toLowerCase() === member.email.toLowerCase() && item.id !== originalId);
  if (duplicate) {
    toast('이 이메일로 등록된 회원이 이미 있습니다.', 'danger');
    return;
  }
  const index = state.members.findIndex((item) => item.id === originalId);
  if (index >= 0) state.members[index] = member;
  else state.members.unshift(member);
  saveState();
  renderMembers();
  modalRefs.member.hide();
  toast(`${member.name} 회원을 저장했습니다.`);
  pushActivity('회원 정보 수정', `${member.name} 회원 정보가 등록 또는 수정되었습니다.`, '지금', 'bi bi-person-vcard');
}

function deleteMember(memberId) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member || !confirm(`${member.name} 회원을 삭제하시겠습니까?`)) return;
  state.members = state.members.filter((item) => item.id !== memberId);
  saveState();
  renderMembers();
  toast(`${member.name} 회원을 삭제했습니다.`, 'danger');
}

function openCodeDetails(code) {
  const entry = state.referralCodes.find((item) => item.code === code);
  if (!entry) return;
  const orders = state.orders.filter((order) => order.referralCode?.toUpperCase() === code.toUpperCase());
  const totalRevenue = orders.reduce((sum, order) => sum + (order.status === 'refunded' ? 0 : Number(order.amount || 0)), 0);

  el.codeDetailTitle.textContent = `추천인 코드 ${entry.code} · ${entry.partner}`;
  el.codeDetailSummary.innerHTML = `
    <div class="col-md-4"><div class="p-3 bg-body-tertiary rounded-4 h-100"><div class="text-secondary small">총 사용 건수</div><div class="fs-4 fw-bold">${orders.length}</div></div></div>
    <div class="col-md-4"><div class="p-3 bg-body-tertiary rounded-4 h-100"><div class="text-secondary small">순매출</div><div class="fs-4 fw-bold">${formatCurrency(totalRevenue)}</div></div></div>
    <div class="col-md-4"><div class="p-3 bg-body-tertiary rounded-4 h-100"><div class="text-secondary small">상태</div><div class="mt-2"><span class="badge badge-soft ${entry.active ? 'badge-paid' : 'badge-pending'}">${entry.active ? '활성' : '비활성'}</span></div></div></div>
  `;

  if (!orders.length) {
    el.codeDetailBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">이 코드와 연결된 고객이 없습니다.</td></tr>';
  } else {
    el.codeDetailBody.innerHTML = orders.map((order) => `
      <tr>
        <td>${order.customer}</td>
        <td>${productCopyForAdmin(order.plan)}</td>
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
        title: productCopyForSite(form.elements.title.value.trim()),
        price: Number(form.elements.price.value || 0),
        image: form.elements.image.value.trim(),
        description: productCopyForSite(form.elements.description.value.trim()),
        includes: form.elements.includes.value.split(/\r?\n/).map((line) => productCopyForSite(line.trim())).filter(Boolean),
        availability: form.elements.availability.value,
        cta: productCopyForSite(form.elements.cta.value.trim()) || 'Inscrever-se agora',
      };
      state.products[type] = next;
      saveState();
      updateProductPreview(type);
      toast(`${next.title} 상품을 저장했습니다.`);
      pushActivity('상품 정보 수정', `${next.title} 상품의 이미지, 가격 또는 설명을 수정했습니다.`, '지금', 'bi bi-box-seam');
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
    toast('데이터를 새로고침했습니다.');
  });

  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return;
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
  el.memberSearch?.addEventListener('input', renderMembers);
  el.memberStatusFilter?.addEventListener('change', renderMembers);
  document.getElementById('newMemberBtn')?.addEventListener('click', () => openMemberForm());

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

  document.getElementById('membersTableBody')?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'member-edit') openMemberForm(id);
    if (action === 'member-delete') deleteMember(id);
  });

  document.getElementById('modalRefundBtn').addEventListener('click', () => {
    if (activeOrderId) refundOrder(activeOrderId);
  });

  document.getElementById('partnerForm').addEventListener('submit', savePartnerCode);
  document.getElementById('memberForm')?.addEventListener('submit', saveMember);

  document.getElementById('checkoutSettingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    state.checkout.pixUrl = form.elements.pixUrl.value.trim();
    state.checkout.cardUrl = form.elements.cardUrl.value.trim();
    state.checkout.whatsappUrl = form.elements.whatsappUrl.value.trim();
    saveState();
    toast('결제 설정을 저장했습니다.');
    pushActivity('결제 설정 수정', 'PIX, 카드 및 WhatsApp 링크를 수정했습니다.', '지금', 'bi bi-credit-card');
  });

  document.querySelectorAll('.product-form input[name="image"]').forEach((input) => {
    input.addEventListener('input', () => {
      const type = input.closest('[data-product-form]').dataset.productForm;
      updateProductPreview(type);
    });
  });

  document.getElementById('adminLogoutButton')?.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.reload();
  });
}

async function initializeAdmin() {
  const authScreen = document.getElementById('adminAuthScreen');
  const appShell = document.querySelector('.admin-shell');
  const loginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('adminLoginError');
  const loginButton = document.getElementById('adminLoginButton');

  const showLogin = (message = '') => {
    appShell.classList.remove('is-authenticated');
    authScreen.hidden = false;
    loginError.textContent = message;
    loginError.hidden = !message;
  };

  const showApp = () => {
    appShell.classList.add('is-authenticated');
    authScreen.hidden = true;
  };

  const loadRemoteState = async () => {
    const response = await fetch('/api/admin/state', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('관리자 데이터를 불러올 수 없습니다.');
    const remote = await response.json();
    const hasRemoteData = remote.orders?.length || remote.members?.length || remote.referralCodes?.length || Object.keys(remote.products || {}).length;
    if (hasRemoteData) {
      Object.assign(state, mergeState(remote));
    }
    mergeCheckoutSubmissions(state);
    remoteReady = true;
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    loginButton.disabled = true;
    loginError.hidden = true;
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.elements.email.value, password: loginForm.elements.password.value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '로그인할 수 없습니다.');
      await loadRemoteState();
      showApp();
      renderAll();
    } catch (error) {
      showLogin(error.message);
    } finally {
      loginButton.disabled = false;
    }
  });

  try {
    const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
    if (!response.ok) return showLogin();
    await loadRemoteState();
    showApp();
    renderAll();
  } catch (error) {
    showLogin('관리자 화면을 사용하려면 서버 설정이 필요합니다.');
  }
}

bindEvents();
initializeAdmin();
