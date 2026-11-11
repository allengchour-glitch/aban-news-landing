import assert from 'node:assert/strict';
import {
  designerContainerAnzahl,
  gleichesSnapshot,
  normalisiereThemeId,
  quellDateien,
  rollbackPlan,
  waehleTheme,
} from './apply_theme.mjs';

let tests = 0;
const test = (name, fn) => {
  try { fn(); tests += 1; console.log('ok', name); }
  catch (error) { console.error('not ok', name); throw error; }
};

test('numerische Theme-ID wird kanonische GID', () => {
  assert.equal(normalisiereThemeId('123'), 'gid://shopify/OnlineStoreTheme/123');
});
test('ungueltige Theme-ID wird abgewiesen', () => {
  assert.throws(() => normalisiereThemeId('main'), /THEME_ID/);
});
test('genau benanntes unveroeffentlichtes Theme ist zulaessig', () => {
  const theme = waehleTheme([{ id: 'gid://shopify/OnlineStoreTheme/123', name: 'Pilot', role: 'UNPUBLISHED' }], { themeName: 'Pilot' });
  assert.equal(theme.id, 'gid://shopify/OnlineStoreTheme/123');
});
test('MAIN braucht die separate Schranke', () => {
  const themes = [{ id: 'gid://shopify/OnlineStoreTheme/123', name: 'Live', role: 'MAIN' }];
  assert.throws(() => waehleTheme(themes, { themeId: '123' }), /MAIN ist gesperrt/);
  assert.equal(waehleTheme(themes, { themeId: '123', allowMain: true }).name, 'Live');
});
test('mehrdeutige Namen werden abgewiesen', () => {
  const themes = [1, 2].map((n) => ({ id: `gid://shopify/OnlineStoreTheme/${n}`, name: 'Pilot', role: 'UNPUBLISHED' }));
  assert.throws(() => waehleTheme(themes, { themeName: 'Pilot' }), /nicht eindeutig/);
});
test('andere Theme-Rollen bleiben gesperrt', () => {
  const themes = [{ id: 'gid://shopify/OnlineStoreTheme/1', name: 'Dev', role: 'DEVELOPMENT' }];
  assert.throws(() => waehleTheme(themes, { themeId: '1' }), /nicht UNPUBLISHED/);
});
test('Snapshot erkennt fehlende und veraenderte Dateien', () => {
  const a = { x: { md5: 'a', size: 1 }, y: { md5: 'b', size: 2 } };
  assert.equal(gleichesSnapshot(a, structuredClone(a), ['x', 'y']), true);
  assert.equal(gleichesSnapshot(a, { x: a.x }, ['x', 'y']), false);
  assert.equal(gleichesSnapshot(a, { ...a, y: { md5: 'c', size: 2 } }, ['x', 'y']), false);
});
test('Rollback trennt Wiederherstellen, Loeschen und Fremdzustand', () => {
  const before = { a: { md5: 'old-a' }, c: { md5: 'old-c' } };
  const after = { a: 'new-a', b: 'new-b', c: 'new-c', d: 'new-d' };
  const current = { a: { md5: 'new-a' }, b: { md5: 'new-b' }, c: { md5: 'old-c' }, d: { md5: 'foreign' } };
  assert.deepEqual(rollbackPlan(current, before, after, ['a', 'b', 'c', 'd']), {
    states: { a: 'angewendet', b: 'angewendet', c: 'vorher', d: 'fremd' },
    foreign: ['d'], restore: ['a'], remove: ['b'],
  });
});
test('Designer-Container wird als exaktes class-Token gezaehlt', () => {
  assert.equal(designerContainerAnzahl('<p>Text</p><div id="x" class="vor lspod-designer nach" data-x=1></div>'), 1);
  assert.equal(designerContainerAnzahl('<div class="lspod-designer-v6"></div><!-- <div class="lspod-designer"></div> -->'), 0);
});
test('zwei Designer-Container bleiben als zwei sichtbar', () => {
  assert.equal(designerContainerAnzahl('<div class=lspod-designer></div><div class="lspod-designer"></div>'), 2);
});
test('unvollstaendiges HTML wird fail-closed abgewiesen', () => {
  assert.throws(() => designerContainerAnzahl('<div class="lspod-designer></div>'), /unvollstaendigen Tag/);
  assert.throws(() => designerContainerAnzahl('<!-- offen'), /offenen Kommentar/);
});
test('Designer-Markierung muss ein echter div-Container sein', () => {
  assert.throws(() => designerContainerAnzahl('<span class="lspod-designer"></span>'), /kein echter div-Container/);
  assert.throws(() => designerContainerAnzahl('<div class="lspod-designer"/>'), /kein echter div-Container/);
});
test('lokale Quellen stimmen exakt mit der expliziten Allowlist ueberein', () => {
  assert.throws(() => quellDateien(), /PANEL84_EXPLICIT_APPROVAL_MISSING/);
  const { allow, report, intendedAssets } = quellDateien({ panelModels: [84] });
  assert.equal(report.productCount, allow.products.length);
  assert.equal(report.variantCount, allow.products.reduce((sum, product) => sum + product.variants.length, 0));
  assert.equal(report.blockedActiveCount, allow.blocked.length + allow.products.filter((product) => product.rolloutStatus === 'blocked').length);
  assert.deepEqual([
    report.readyPreviewProductCount, report.readyPreviewVariantCount,
    report.readyBindingProductCount, report.readyBindingVariantCount,
    report.blockedProductCount, report.blockedVariantCount, report.excludedActiveCount,
  ], [9, 73, 8, 170, 1, 1, 1]);
  assert.equal(Object.keys(intendedAssets).length, allow.products.length + allow.products.filter((product) => product.previewAsset).length + 1);
});

console.log(`APPLY_THEME_UNIT_OK tests=${tests}`);
