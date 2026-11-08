import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, md5, LAYOUT, quellDateien } from './apply_theme.mjs';
import { ERWARTETER_BLOCK, MARKER } from './theme_patch.mjs';

const stateDir = mkdtempSync(join(tmpdir(), 'lspod-v63-apply-'));
const originalLayout = `<!doctype html>\n${ERWARTETER_BLOCK}\n</html>\n`;
const files = new Map([[LAYOUT, originalLayout]]);
const mutations = [];
const events = [];
const scope = quellDateien({ panelModels: [84] });
let productMode = 'ok';
let primaryDomain = 'luxestyle.ch';

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});

async function fakeFetch(url, options = {}) {
  assert.match(String(url), /^https:\/\/fixture-shop\.myshopify\.com\/admin\/api\/2025-10\/graphql\.json$/);
  const { query, variables = {} } = JSON.parse(options.body);
  if (query.includes('themes(first:50)')) {
    return jsonResponse({ data: { themes: { nodes: [{ id: 'gid://shopify/OnlineStoreTheme/99', name: 'v63 Pilot', role: 'UNPUBLISHED' }] } } });
  }
  if (query.includes('shop{name myshopifyDomain')) {
    events.push('shop-check');
    return jsonResponse({ data: { shop: { name: 'LuxeStyle', myshopifyDomain: 'fixture-shop.myshopify.com', primaryDomain: { url: `https://${primaryDomain}` } } } });
  }
  if (query.includes('nodes(ids:$ids)')) {
    events.push('product-chunk');
    const wanted = new Set(variables.ids);
    const nodes = scope.allow.products.filter((product) => wanted.has(product.shopifyProductId)).map((product) => ({
      id: product.shopifyProductId, handle: product.handle, status: 'ACTIVE',
      descriptionHtml: '<p>Produkt</p><div data-x="1" class="lspod-designer"></div><script src="https://cdn.example/editor.js" defer></script>',
      variants: { nodes: product.variants.map((variant) => ({ id: `gid://shopify/ProductVariant/${variant.shopifyVariantId}` })), pageInfo: { hasNextPage: productMode === 'over250' } },
    }));
    if (productMode === 'missingVariant' && nodes[0]) nodes[0].variants.nodes.pop();
    if (productMode === 'missingContainer' && nodes[0]) nodes[0].descriptionHtml = '<div class="lspod-designer-v6"></div>';
    if (productMode === 'doubleContainer' && nodes[0]) nodes[0].descriptionHtml = '<div class="lspod-designer"></div><div class=lspod-designer></div>';
    if (productMode === 'brokenHtml' && nodes[0]) nodes[0].descriptionHtml = '<div class="lspod-designer></div>';
    return jsonResponse({ data: { nodes } });
  }
  if (query.includes('theme(id:$id)')) {
    const nodes = variables.files.flatMap((filename) => {
      if (!files.has(filename)) return [];
      const content = files.get(filename);
      return [{ filename, size: Buffer.byteLength(content), checksumMd5: md5(content), body: { __typename: 'OnlineStoreThemeFileBodyText', content } }];
    });
    return jsonResponse({ data: { theme: { files: { nodes } } } });
  }
  if (query.includes('themeFilesUpsert')) {
    mutations.push({ type: 'upsert', files: variables.files.map((item) => item.filename) });
    events.push(variables.files.some((item) => item.filename === LAYOUT) ? 'upsert-layout' : 'upsert-assets');
    for (const item of variables.files) files.set(item.filename, item.body.value);
    return jsonResponse({ data: { themeFilesUpsert: { upsertedThemeFiles: variables.files.map((item) => ({ filename: item.filename })), userErrors: [] } } });
  }
  if (query.includes('themeFilesDelete')) {
    mutations.push({ type: 'delete', files: [...variables.files] });
    for (const filename of variables.files) files.delete(filename);
    return jsonResponse({ data: { themeFilesDelete: { deletedThemeFiles: variables.files.map((filename) => ({ filename })), userErrors: [] } } });
  }
  throw new Error('Unbekannte Fake-Query: ' + query.slice(0, 100));
}

const baseEnv = {
  SHOPIFY_SHOP: 'fixture-shop.myshopify.com', SHOPIFY_ADMIN_TOKEN: 'fixture-token',
  THEME_ID: '99', APPLY_STATE_DIR: stateDir,
};
const run = (env = baseEnv) => main({ env, fetchFn: fakeFetch, panelModels: [84] });

try {
  await assert.rejects(main({ env: baseEnv, fetchFn: fakeFetch }), /PANEL84_EXPLICIT_APPROVAL_MISSING/);
  await run();
  assert.equal(mutations.length, 0, 'Trockenlauf schreibt nicht');
  primaryDomain = 'fremd.example';
  await assert.rejects(run(), /Primaerdomain weicht ab/);
  primaryDomain = 'luxestyle.ch';
  assert.equal(mutations.length, 0, 'Identitaetsabweichung schreibt nicht');
  productMode = 'missingVariant';
  await assert.rejects(run(), /Varianten weichen/);
  productMode = 'over250';
  await assert.rejects(run(), /mehr als 250 Varianten/);
  productMode = 'missingContainer';
  await assert.rejects(run(), /gefunden 0/);
  productMode = 'doubleContainer';
  await assert.rejects(run(), /gefunden 2/);
  productMode = 'brokenHtml';
  await assert.rejects(run(), /nicht sicher parsbar/);
  productMode = 'ok';
  assert.equal(mutations.length, 0, 'Produktabweichungen schreiben nicht');
  await assert.rejects(run({ ...baseEnv, LIVE: '1' }), /BASIS_MD5/);
  assert.equal(mutations.length, 0, 'LIVE ohne Basis schreibt nicht');

  await run({ ...baseEnv, LIVE: '1', BASIS_MD5: md5(originalLayout) });
  assert.deepEqual(mutations.slice(0, 2).map((item) => [item.type, item.files.includes(LAYOUT)]), [['upsert', false], ['upsert', true]], 'Assets zuerst, Layout zuletzt');
  const assetsEvent = events.lastIndexOf('upsert-assets'), layoutEvent = events.indexOf('upsert-layout', assetsEvent + 1);
  assert.ok(assetsEvent >= 0 && layoutEvent > assetsEvent && events.slice(assetsEvent + 1, layoutEvent).includes('product-chunk'), 'Produkt-Gegenprobe nach Asset-Write und vor Layout-Aktivierung');
  assert.match(files.get(LAYOUT), new RegExp(MARKER));
  assert.equal(files.size, Object.keys(scope.intendedAssets).length + 1, 'Layout plus Editor, Karten- und optionale Preview-Assets');

  const beforeDryRollback = mutations.length;
  await run({ ...baseEnv, ZURUECK: '1' });
  assert.equal(mutations.length, beforeDryRollback, 'Rollback-Trockenlauf schreibt nicht');

  await run({ ...baseEnv, ZURUECK: '1', LIVE: '1' });
  assert.equal(files.size, 1);
  assert.equal(files.get(LAYOUT), originalLayout);
  assert.deepEqual(mutations[beforeDryRollback], { type: 'upsert', files: [LAYOUT] }, 'Rollback deaktiviert zuerst das Layout');
  console.log(`APPLY_THEME_INTEGRATION_OK mutations=${mutations.length}`);
} finally {
  rmSync(stateDir, { recursive: true, force: true });
}
