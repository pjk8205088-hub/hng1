const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const dictionaries = vm.runInNewContext(`${script.split('function normalizeLanguage')[0]}; I18N;`);
const keys = [...html.matchAll(/data-i18n(?:-alt|-aria|-placeholder)?="([^"]+)"/g)].map((match) => match[1]);

test('each visible label and accessibility attribute has translations in all three languages', () => {
  for (const language of ['ko', 'en', 'pt']) {
    for (const key of keys) {
      assert.ok(typeof dictionaries[language][key] === 'string' && dictionaries[language][key].trim(), `${language}: missing ${key}`);
    }
  }
});

test('Korean copy contains Korean, including FAQ answers and price captions', () => {
  for (const [key, value] of Object.entries(dictionaries.ko)) {
    assert.match(value, /[가-힣]/u, `Untranslated Korean label: ${key}: ${value}`);
  }
});

test('all dictionaries have the same keys so repeated language switches cannot retain old copy', () => {
  const expected = Object.keys(dictionaries.pt).sort();
  assert.deepEqual(Object.keys(dictionaries.ko).sort(), expected);
  assert.deepEqual(Object.keys(dictionaries.en).sort(), expected);
});
