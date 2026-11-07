import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { productHandle } from './product_handle.mjs';

test('removes emoji and keeps a stable CJ suffix', () => {
  const handle = productHandle('🦃 Black Friday Mega-Deal – 40 %', 'CJ-1477820492730732544');
  assert.match(handle, /^black-friday-mega-deal-40-cj-\d{12}-[a-f0-9]{8}$/);
  assert.equal(handle, productHandle('🦃 Black Friday Mega-Deal – 40 %', 'CJ-1477820492730732544'));
});

test('transliterates Swiss-relevant German characters before stripping accents', () => {
  const handle = productHandle('Ärmel, Öl & süsse Grüsse aus Köln', 'pid-umlaut');
  assert.match(handle, /^aermel-oel-suesse-gruesse-aus-koeln-cj-/);
  assert.match(handle, /^[a-z0-9-]+$/);
});

test('uses a safe fallback when the generated title is empty or only emoji', () => {
  assert.match(productHandle('', 'pid-empty'), /^produkt-cj-/);
  assert.match(productHandle('🎁✨', 'pid-emoji'), /^produkt-cj-/);
});

test('equal titles with different provider IDs cannot reuse the same handle', () => {
  const first = productHandle('Gleicher Titel', 'provider-100000000001');
  const second = productHandle('Gleicher Titel', 'provider-200000000001');
  assert.notEqual(first, second);
});

test('limits the complete handle without cutting into the stable suffix', () => {
  const providerId = 'CJ-12345678901234567890';
  const handle = productHandle('Sehr '.repeat(80), providerId, { maxLength: 60 });
  assert.ok(handle.length <= 60);
  assert.match(handle, /-cj-\d{12}-[a-f0-9]{8}$/);
  assert.equal(handle, productHandle('Sehr '.repeat(80), providerId, { maxLength: 60 }));
});

test('rejects missing provider identity and invalid limits', () => {
  assert.throws(() => productHandle('Titel', ''), /providerId is required/);
  assert.throws(() => productHandle('Titel', 'pid', { maxLength: 31 }), /between 32 and 255/);
});

test('all three CJ writers pass an explicit guarded provider identity to productSet', async () => {
  const files = [
    ['../../dropship/cj_autopilot.mjs', /productHandle\(title,\s*providerId\)/],
    ['../cj_gaps_import.mjs', /productHandle\(title,\s*p\.pid\)/],
    ['../cj_trending_import.mjs', /productHandle\(title,\s*p\.pid\)/],
  ];

  for (const [relative, call] of files) {
    const source = await readFile(new URL(relative, import.meta.url), 'utf8');
    assert.match(source, /import \{ productHandle \}/, relative);
    assert.match(source, call, relative);
    assert.match(source, /\bhandle[,}]/, relative);
  }
  const autopilot = await readFile(new URL('../../dropship/cj_autopilot.mjs', import.meta.url), 'utf8');
  assert.match(autopilot, /const providerId = String\(p\.pid \|\| ''\)\.trim\(\)/);
  assert.match(autopilot, /if \(!providerId\).*continue/);
});
