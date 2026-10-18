(() => {
  const API = 'https://influencer-korea-production.up.railway.app';
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const date = (v) => v ? new Date(v).toLocaleString('ko-KR') : '-';
  let token = sessionStorage.getItem('hng_admin_token'); let state = { payments: [], users: [], summary: {}, pg: null };
  const authHeaders = () => token ? { Authorization: `Bearer ${token}` } : {};
  async function api(path, options={}) { const res = await fetch(`${API}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers||{}) } }); if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`); return res.status===204 ? null : res.json(); }
  function showApp(){ $('#login-view').classList.add('d-none'); $('#app-view').classList.remove('d-none'); loadAll(); }
  function empty(id,msg='데이터가 없습니다'){ const el=$(id); if(el) el.innerHTML=`<tr><td colspan="10" class="empty-row">${msg}</td></tr>`; }
  function render(){
    $('#stat-payments').textContent = state.summary.supports ?? state.payments.length;
    $('#stat-revenue').textContent = money(state.summary.revenue);
    $('#stat-users').textContent = state.summary.users ?? state.users.length;
    $('#stat-pg').textContent = state.pg?.ready ? '연결됨' : '확인 필요';
    const rows = state.payments || [];
    const row = (p) => `<tr><td>${esc(p.orderNo||p.id||'-')}</td><td>${esc(p.purchaserName||p.customerName||p.fanName||'-')}</td><td>${esc(p.purchaserEmail||p.customerEmail||p.fanEmail||'-')}</td><td>${money(p.amount??p.pointAmount)}</td><td>${esc(p.paymentProvider||p.provider||'dLocal')}</td><td><span class="badge text-bg-${p.status==='PAID'?'success':'secondary'}">${esc(p.status||'-')}</span></td><td>${date(p.paidAt||p.createdAt)}</td></tr>`;
    $('#recent-payments').innerHTML = rows.length ? rows.slice(0,8).map(row).join('') : '<tr><td colspan="5" class="empty-row">최근 결제가 없습니다</td></tr>';
    $('#payments-table').innerHTML = rows.length ? rows.map(row).join('') : '<tr><td colspan="7" class="empty-row">결제 내역이 없습니다</td></tr>';
    $('#members-table').innerHTML = state.users.length ? state.users.map(u=>`<tr><td>${esc(u.name||u.displayName||'-')}</td><td>${esc(u.email)}</td><td>${esc(u.role||'-')}</td><td>${date(u.createdAt)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-row">회원이 없습니다</td></tr>';
    const grouped = {}; rows.forEach(p=>{const code=p.referralCode||p.referrerCode||'없음'; grouped[code]??={count:0,total:0};grouped[code].count++;grouped[code].total+=Number(p.amount??p.pointAmount??0)});
    $('#partners-list').innerHTML=Object.entries(grouped).map(([code,v])=>`<div class="col-md-4"><div class="product-card"><div class="text-muted small">추천인 코드</div><h5>${esc(code)}</h5><div>사용 건수: <b>${v.count}</b></div><div>발생 매출: <b>${money(v.total)}</b></div></div></div>`).join('')||'<div class="col-12 text-muted">아직 결제 데이터가 없습니다.</div>';
    const products=[['basic','Plano Basic - Instalação & Emprego','R$ 2.980,00','일자리·주거·ARC·은행·SIM 지원'],['standard','Plano Standard - com estadia','R$ 5.480,00','Basic 포함·1개월 숙소·체크인 지원'],['allin','Plano All-In - estadia + coreano','R$ 6.480,00','Standard 포함·한국어 과정·확장 정착 지원']];
    $('#products-list').innerHTML=products.map(p=>`<div class="col-md-4"><div class="product-card"><div class="text-muted small">${p[0].toUpperCase()}</div><h5>${p[1]}</h5><div class="price">${p[2]}</div><p class="mb-0 text-muted">${p[3]}</p></div></div>`).join('');
    $('#pg-status').className=`alert ${state.pg?.ready?'alert-success':'alert-warning'}`; $('#pg-status').textContent=state.pg?.ready?'dLocal 연결 준비 완료 · 현재 '+(state.pg.mode==='sandbox'?'테스트':'운영')+' 모드':'dLocal 연결 상태를 확인할 수 없습니다.';
  }
  async function loadAll(){ try { const [summary,payments,users,pg] = await Promise.all([api('/api/admin/summary'),api('/api/admin/payments'),api('/api/admin/users'),api('/api/payments/dlocal-config')]); state={summary,payments,users,pg}; render(); } catch(e){ $('#login-error').textContent=e.message.includes('401')?'관리자 로그인이 필요합니다.':`API 연결 오류: ${e.message}`; if(e.message.includes('401')||e.message.includes('403')){sessionStorage.removeItem('hng_admin_token');token=null;$('#app-view').classList.add('d-none');$('#login-view').classList.remove('d-none')} } }
  $('#login-form').addEventListener('submit', async(e)=>{e.preventDefault();$('#login-error').textContent='';try{const r=await fetch(`${API}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#login-email').value,password:$('#login-password').value})});if(!r.ok)throw new Error('이메일 또는 비밀번호를 확인하세요.');const data=await r.json();token=data.token;sessionStorage.setItem('hng_admin_token',token);showApp()}catch(err){$('#login-error').textContent=err.message}});
  $('#logout').addEventListener('click',()=>{sessionStorage.removeItem('hng_admin_token');token=null;location.reload()}); $('#menu-toggle').addEventListener('click',()=>$('.app-sidebar').classList.toggle('show')); document.querySelectorAll('.sidebar-menu a').forEach(a=>a.addEventListener('click',e=>{document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('d-none'));$(a.getAttribute('href')).classList.remove('d-none');document.querySelectorAll('.sidebar-menu a').forEach(x=>x.classList.remove('active'));a.classList.add('active');$('#page-title').textContent=a.querySelector('p').textContent; if(innerWidth<992) $('.app-sidebar').classList.remove('show')})); $('[data-refresh]').addEventListener('click',loadAll); $('#export-payments').addEventListener('click',()=>{const csv=['주문번호,고객,이메일,금액,상태,결제일',...(state.payments||[]).map(p=>[p.orderNo||p.id,p.purchaserName||p.customerName,p.purchaserEmail||p.customerEmail,p.amount??p.pointAmount,p.status,p.paidAt||p.createdAt].map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='hng-payments.csv';a.click()});
  if(token) showApp();
})();
