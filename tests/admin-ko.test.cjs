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
  assert.match(html, /admin\.js\?v=20261018-ko2/);
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
});
