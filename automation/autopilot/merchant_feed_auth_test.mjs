/** Offline-Regressionen fuer den tatsaechlichen Auth-Block, ohne Generatorimport.
 * Lauf: node automation/autopilot/merchant_feed_auth_test.mjs [andere-Quelldatei]
 * Keine echte Umgebung, kein Netzwerk und kein Import des ausfuehrenden Feed-Generators.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { shopifyClientSecret } from '../lib/shopify_secret.mjs';
import { normalizeShopifyHost } from '../lib/shopify_host.mjs';

const sourcePath = process.argv[2] ? path.resolve(process.argv[2])
  : fileURLToPath(new URL('./merchant_feed.mjs', import.meta.url));
const source = fs.readFileSync(sourcePath, 'utf8');
const shopDeclaration = source.split('\n').find(line => line.startsWith('const SHOP = '));
const start = source.indexOf('async function holeToken() {');
const end = source.indexOf('\nconst TOKEN = await holeToken();', start);
assert.ok(shopDeclaration && start >= 0 && end > start, 'Echter Auth-Block muss auffindbar sein');
const executableBlock = `${shopDeclaration}\n${source.slice(start, end)}\nholeToken;`;
let passed = 0, failed = 0;
const APP = { SHOPIFY_CLIENT_ID: 'fixture-client-id', SHOPIFY_CLIENT_SECRET: 'fixture-client-secret' };
const OLD = 'fixture-static-token';
const FRESH = 'fixture-oauth-token';
const answer = (status, body) => ({ ok: status >= 200 && status < 300, status,
  text: async () => typeof body === 'string' ? body : JSON.stringify(body) });

function fixture(env = {}, request = async () => answer(200, { access_token: FRESH })) {
  const calls = [], logs = [];
  // Leere Fake-Variablen verhindern auch den Default-Env-Zugriff des reinen Secret-Helfers.
  const fakeEnv = { SHOPIFY_SHOP: 'fixture-shop.myshopify.com', SHOPIFY_CLIENT_ID: '',
    SHOPIFY_CLIENT_SECRET: '', SHOPIFY_ADMIN_TOKEN: '', ...env };
  const context = vm.createContext({ process: { env: fakeEnv }, shopifyClientSecret,
    normalizeShopifyHost, console: { log: (...parts) => logs.push(parts.join(' ')) },
    fetch: async (url, options) => { calls.push({ url, options }); return request(url, options); } });
  return { calls, logs, load: () => vm.runInContext(executableBlock, context, { timeout: 1000 }) };
}

async function test(name, run) {
  try { await run(); passed++; console.log(`ok ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}: ${error.message}`); }
}

await test('vollstaendiges App-Paar verdraengt statischen Token', async () => {
  const f = fixture({ ...APP, SHOPIFY_ADMIN_TOKEN: OLD });
  assert.equal(await f.load()(), FRESH);
  assert.equal(f.calls.length, 1);
});
await test('App-Paar allein sendet genau einen korrekten OAuth-Request', async () => {
  const f = fixture(APP);
  assert.equal(await f.load()(), FRESH);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://fixture-shop.myshopify.com/admin/oauth/access_token');
  assert.equal(f.calls[0].options.method, 'POST');
  assert.equal(f.calls[0].options.redirect, 'error');
  assert.equal(f.calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { client_id: APP.SHOPIFY_CLIENT_ID,
    client_secret: APP.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' });
});
await test('Client-ID wird getrimmt und vorhandener Secret-Helfer verwendet', async () => {
  const syntheticSecret = ['shp', 'ss_'].join('') + 'a'.repeat(32);
  const f = fixture({ SHOPIFY_CLIENT_ID: '  fixture-id  ',
    SHOPIFY_CLIENT_SECRET: ` ${syntheticSecret}=SHOPIFY_CLIENT_SECRET ` });
  assert.equal(await f.load()(), FRESH);
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { client_id: 'fixture-id',
    client_secret: syntheticSecret, grant_type: 'client_credentials' });
});
for (const [name, env] of [
  ['nur statischer Token', { SHOPIFY_ADMIN_TOKEN: OLD }],
  ['Client-ID fehlt', { SHOPIFY_CLIENT_SECRET: APP.SHOPIFY_CLIENT_SECRET, SHOPIFY_ADMIN_TOKEN: OLD }],
  ['Client-Secret fehlt', { SHOPIFY_CLIENT_ID: APP.SHOPIFY_CLIENT_ID, SHOPIFY_ADMIN_TOKEN: OLD }],
  ['leere Client-ID', { ...APP, SHOPIFY_CLIENT_ID: '  ', SHOPIFY_ADMIN_TOKEN: OLD }],
  ['leeres Client-Secret', { ...APP, SHOPIFY_CLIENT_SECRET: '  ', SHOPIFY_ADMIN_TOKEN: OLD }],
]) await test(`${name}: statischer Ausweichweg ohne Netzwerk`, async () => {
  const f = fixture(env);
  assert.equal(await f.load()(), OLD);
  assert.equal(f.calls.length, 0);
});
await test('keine nutzbaren Zugangsdaten: klarer Abbruch ohne Netzwerk', async () => {
  const f = fixture();
  assert.equal(await f.load()(), null);
  assert.equal(f.calls.length, 0);
  assert.ok(f.logs.some(line => line.includes('ABBRUCH')));
});
for (const status of [400, 401, 429, 503]) await test(`OAuth HTTP ${status}: kein statischer Rueckfall oder Retry`, async () => {
  const f = fixture({ ...APP, SHOPIFY_ADMIN_TOKEN: OLD }, async () => answer(status, { access_token: FRESH }));
  assert.equal(await f.load()(), null);
  assert.equal(f.calls.length, 1);
});
for (const [name, body] of [
  ['fehlendes Token', {}], ['leeres Token', { access_token: '' }],
  ['nur Leerraum', { access_token: '  ' }], ['falscher Tokentyp', { access_token: 7 }],
  ['ungueltiges JSON', '{ungültig'], ['JSON null', 'null'],
]) await test(`${name}: Abbruch ohne statischen Rueckfall`, async () => {
  const f = fixture({ ...APP, SHOPIFY_ADMIN_TOKEN: OLD }, async () => answer(200, body));
  assert.equal(await f.load()(), null);
  assert.equal(f.calls.length, 1);
});
await test('OAuth-Fehlerantwort und Secret werden nicht protokolliert', async () => {
  const marker = 'antwort-darf-nicht-ins-log';
  const f = fixture(APP, async () => answer(401, { error: marker, access_token: 'antwort-token' }));
  assert.equal(await f.load()(), null);
  assert.ok(f.logs.join(' ').includes('HTTP 401'));
  for (const sensitive of [marker, APP.SHOPIFY_CLIENT_SECRET, 'antwort-token'])
    assert.ok(!f.logs.join(' ').includes(sensitive));
});
await test('Token-Leerraum wird vor der Weitergabe entfernt', async () => {
  const f = fixture(APP, async () => answer(200, { access_token: `  ${FRESH}  ` }));
  assert.equal(await f.load()(), FRESH);
  assert.equal(f.calls.length, 1);
});
await test('Netzfehler wird weitergereicht, nicht mit statischem Token verdeckt', async () => {
  const f = fixture({ ...APP, SHOPIFY_ADMIN_TOKEN: OLD }, async () => { throw new Error('fixture-network'); });
  await assert.rejects(f.load()(), /fixture-network/);
  assert.equal(f.calls.length, 1);
});
await test('Redirect wird blockiert und nicht wiederholt', async () => {
  const f = fixture({ ...APP, SHOPIFY_ADMIN_TOKEN: OLD }, async (_url, options) => {
    assert.equal(options.redirect, 'error');
    throw new TypeError('fixture-redirect-blocked');
  });
  await assert.rejects(f.load()(), /fixture-redirect-blocked/);
  assert.equal(f.calls.length, 1);
});
await test('HTTPS-Shop-URL wird vor OAuth auf reinen Host normalisiert', async () => {
  const f = fixture({ ...APP, SHOPIFY_SHOP: ' HTTPS://FIXTURE-SHOP.myshopify.com/ ' });
  assert.equal(await f.load()(), FRESH);
  assert.equal(f.calls[0].url, 'https://fixture-shop.myshopify.com/admin/oauth/access_token');
});
for (const host of ['luxestyle.ch', 'https://anderer-host.invalid',
  'https://name:pass@fixture-shop.myshopify.com/', 'https://fixture-shop.myshopify.com/admin',
  'http://fixture-shop.myshopify.com', 'fixture-shop.myshopify.com:443'])
  await test(`ungueltiger Host ${host.split(':')[0]} wird vor jedem Request abgelehnt`, async () => {
    const f = fixture({ ...APP, SHOPIFY_SHOP: host });
    assert.throws(() => f.load(), /SHOPIFY_HOST/);
    assert.equal(f.calls.length, 0);
  });

console.log(`${passed} ok, ${failed} Fehler`);
process.exitCode = failed ? 1 : 0;
