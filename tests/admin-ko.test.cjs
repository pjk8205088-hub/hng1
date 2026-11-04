const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'public/admin.js'), 'utf8');

test('admin document uses Korean labels and fresh assets', () => {
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<title>H&G 관리자/);
  assert.match(html, /추천인 코드/);
  assert.match(html, /상품 설명/);
  assert.match(html, /admin\.js\?v=20261103-h1/);
  assert.match(html, /H-1 워킹홀리데이 플랜 3종/);
  assert.match(html, /등록 상품 3개/);
  for (const type of ['basic', 'standard', 'allin']) {
    assert.match(html, new RegExp(`data-product-form="${type}"`));
    assert.match(html, new RegExp(`id="${type}Preview"`));
  }
  assert.match(html, /<th>입국 예정 시기<\/th>/);
  assert.doesNotMatch(html, />Painel</);
  assert.doesNotMatch(html, />Códigos parceiros</);
  assert.doesNotMatch(html, />Nome do produto</);
});

test('known Portuguese catalog content displays in Korean without changing the stored copy', () => {
  const catalog = vm.runInNewContext(`${script.split('const currency =')[0]}; ({ productCopyForAdmin, productCopyForSite });`);
  const original = 'Pacote de entrada para viajantes que querem experiência coreana com suporte comercial e atendimento em PT-BR.';
  const shown = catalog.productCopyForAdmin(original);
  assert.match(shown, /[가-힣]/u);
  assert.equal(catalog.productCopyForSite(shown), original);
  assert.equal(catalog.productCopyForSite('새 상품'), '새 상품');
  assert.equal(catalog.productCopyForSite('H-1 워킹홀리데이 Basic (베이직)'), 'Plano Basic');
  assert.equal(catalog.productCopyForAdmin('Pacote Turismo Coreia'), 'H-1 워킹홀리데이 Basic (베이직)');
  assert.equal(catalog.productCopyForAdmin('Pacote All-In'), 'H-1 워킹홀리데이 All-In (올인)');
});

test('arrival period follows an application into the order and customer views', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(app, /arrival: data\.arrival \|\| '—'/);
  assert.match(server, /arrival: cleanText\(body\.arrival, 120\)/);
  assert.match(server, /arrival: order\.arrival/);
  assert.match(script, /arrival: submission\.arrival \|\| '—'/);
  assert.match(script, /<td>\$\{order\.arrival \|\| '—'\}<\/td>/);
  assert.match(script, /<td>\$\{member\.arrival \|\| '—'\}<\/td>/);
});
