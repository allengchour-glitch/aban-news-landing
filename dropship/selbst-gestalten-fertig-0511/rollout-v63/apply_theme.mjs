/**
 * Gesicherter Theme-Rollout fuer den eigenen LuxeStyle-POD-Editor v6.3.
 *
 * Standard ist immer DRY. Das Skript liest ein explizit benanntes Theme, legt
 * eine lokale Sicherung samt Hashes ab und zeigt den exakten Plan. Es schreibt
 * erst mit LIVE=1; MAIN braucht zusaetzlich ALLOW_MAIN=1 und jede Einspielung
 * braucht BASIS_MD5=<frisch im Trockenlauf ausgegebene layout/theme.liquid-MD5>.
 *
 * Beispiele (nur Dokumentation, nicht automatisch ausfuehren):
 *   THEME_ID=123 node apply_theme.mjs
 *   THEME_ID=123 node apply_theme.mjs --panel=84
 *   THEME_ID=123 BASIS_MD5=<md5> LIVE=1 node apply_theme.mjs --panel=84
 *   THEME_ID=123 ZURUECK=1 node apply_theme.mjs
 *   THEME_ID=123 ZURUECK=1 LIVE=1 node apply_theme.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
import { normalizeShopifyHost } from '../../../automation/lib/shopify_host.mjs';
import { bauen } from './build.mjs';
import { patchThemeLayout } from './theme_patch.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, '../../../');
const SICHERUNG = resolve(HIER, 'sicherung');
export const LAYOUT = 'layout/theme.liquid';
export const EDITOR = 'assets/lspod-designer-v6-6.3.0.js';
export const LUXESTYLE_PRIMARY_DOMAIN = 'luxestyle.ch';
export const md5 = (value) => createHash('md5').update(value).digest('hex');
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function fail(message, code = 2) {
  const error = new Error(message);
  error.exitCode = code;
  throw error;
}

export function normalisiereThemeId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^gid:\/\/shopify\/OnlineStoreTheme\/\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `gid://shopify/OnlineStoreTheme/${raw}`;
  fail('THEME_ID muss numerisch oder eine OnlineStoreTheme-GID sein');
}

export function waehleTheme(themes, { themeId = '', themeName = '', allowMain = false } = {}) {
  const id = normalisiereThemeId(themeId);
  const name = String(themeName || '').trim();
  if (!id && !name) fail('Explizites Ziel fehlt: THEME_ID oder THEME_NAME setzen');
  const matches = themes.filter((theme) => (id ? theme.id === id : theme.name === name));
  if (matches.length !== 1) fail(`Theme-Ziel ist nicht eindeutig (${matches.length} Treffer)`);
  const theme = matches[0];
  if (theme.role === 'MAIN') {
    if (!allowMain) fail('MAIN ist gesperrt; nur mit ausdruecklichem ALLOW_MAIN=1', 4);
  } else if (theme.role !== 'UNPUBLISHED') {
    fail(`Theme-Rolle ${theme.role || 'unbekannt'} ist nicht UNPUBLISHED`, 4);
  }
  return theme;
}

export function gleichesSnapshot(a, b, filenames) {
  return filenames.every((filename) =>
    Boolean(a[filename]) === Boolean(b[filename]) &&
    (!a[filename] || (a[filename].md5 === b[filename].md5 && a[filename].size === b[filename].size)));
}

export function rollbackPlan(current, before, after, filenames) {
  const states = {};
  for (const filename of filenames) {
    const now = current[filename]?.md5 ?? null;
    const old = before[filename]?.md5 ?? null;
    const applied = after[filename] ?? null;
    states[filename] = now === applied ? 'angewendet' : now === old ? 'vorher' : 'fremd';
  }
  const foreign = filenames.filter((filename) => states[filename] === 'fremd');
  return {
    states,
    foreign,
    restore: filenames.filter((filename) => states[filename] === 'angewendet' && before[filename]),
    remove: filenames.filter((filename) => states[filename] === 'angewendet' && !before[filename]),
  };
}

function sicherungsName(theme, layoutMd5) {
  const id = theme.id.split('/').pop();
  return `vor-${id}-${layoutMd5}.json`;
}

function writeExact(path, text) {
  if (existsSync(path)) {
    if (readFileSync(path, 'utf8') !== text) fail(`Vorhandene Sicherung weicht ab: ${path}`, 4);
    return;
  }
  writeFileSync(path, text, { mode: 0o600 });
}

function backupPayload(theme, snapshot, filenames) {
  return {
    schema: 1,
    theme: { id: theme.id, name: theme.name, role: theme.role },
    files: Object.fromEntries(filenames.map((filename) => [filename, snapshot[filename]
      ? { exists: true, md5: snapshot[filename].md5, size: snapshot[filename].size, content: snapshot[filename].content }
      : { exists: false, md5: null, size: 0, content: null }])),
  };
}

function snapshotFromBackup(backup) {
  return Object.fromEntries(Object.entries(backup.files).flatMap(([filename, item]) => item.exists
    ? [[filename, { md5: item.md5, size: item.size, content: item.content }]] : []));
}

export function quellDateien({ panelModels = [] } = {}) {
  const { allow, outputs, report } = bauen({ write: false, panelModels });
  const expectedProducts = allow.products.length;
  const expectedVariants = allow.products.reduce((sum, product) => sum + product.variants.length, 0);
  const byStatus = (status) => allow.products.filter((product) => product.rolloutStatus === status);
  const variantsByStatus = (status) => byStatus(status).reduce((sum, product) => sum + product.variants.length, 0);
  const expectedExcluded = allow.blocked.length;
  if (!expectedProducts || report.productCount !== expectedProducts || report.variantCount !== expectedVariants
    || report.readyPreviewProductCount !== byStatus('ready-preview').length || report.readyPreviewVariantCount !== variantsByStatus('ready-preview')
    || report.readyBindingProductCount !== byStatus('ready-binding').length || report.readyBindingVariantCount !== variantsByStatus('ready-binding')
    || report.blockedProductCount !== byStatus('blocked').length || report.blockedVariantCount !== variantsByStatus('blocked')
    || report.excludedActiveCount !== expectedExcluded || report.blockedActiveCount !== byStatus('blocked').length + expectedExcluded) {
    fail('Builder-Scope weicht von der expliziten Allowlist ab', 4);
  }
  const editor = readFileSync(resolve(REPO, 'pod/v6/lspod-designer-v6-6.3.0.js'), 'utf8');
  if (!/^[0-9a-f]{64}$/.test(allow.editorSha256 || '') || sha256(editor) !== allow.editorSha256) {
    fail('Editor-SHA256 weicht von der expliziten Allowlist ab', 4);
  }
  const intendedAssets = { [EDITOR]: editor };
  const allowByHandle = new Map(allow.products.map((product) => [product.handle, product]));
  const addAsset = (asset, text, label) => {
    if (!/^[a-z0-9][a-z0-9._-]*\.json$/.test(asset || '') || typeof text !== 'string') fail(`${label}: Theme-Asset ist ungueltig`, 4);
    const filename = `assets/${asset}`;
    if (Object.prototype.hasOwnProperty.call(intendedAssets, filename)) fail(`${label}: Theme-Asset ist doppelt`, 4);
    intendedAssets[filename] = text;
  };
  if (outputs.length !== allow.products.length) fail('Builder-Ausgaben sind unvollstaendig', 4);
  for (const output of outputs) {
    const product = allowByHandle.get(output.handle);
    if (!product || output.productId !== product.shopifyProductId || output.asset !== product.asset || output.status !== product.rolloutStatus || sha256(output.text) !== output.sha256) {
      fail(`${output.handle || '(ohne Handle)'}: Builder-Ausgabe weicht von der Allowlist ab`, 4);
    }
    addAsset(output.asset, output.text, output.handle);
    if (product.previewAsset) {
      if (output.previewAsset !== product.previewAsset || !output.previewText || sha256(output.previewText) !== output.previewSha256) fail(`${output.handle}: Vorschau-Ausgabe fehlt oder weicht ab`, 4);
      addAsset(output.previewAsset, output.previewText, `${output.handle} Vorschau`);
    } else if (output.previewAsset || output.previewText || output.previewSha256) fail(`${output.handle}: unerwartetes Vorschau-Asset`, 4);
  }
  return { allow, report, intendedAssets };
}

/** Strenger Mini-Parser fuer den einen belegten Editor-Container. Er zaehlt
 * keine Text-/Kommentar-Treffer und bricht bei unvollstaendigen Tags/Attributen
 * ab, statt einen unsicheren Theme-Rollout zu erlauben. */
export function designerContainerAnzahl(html) {
  if (typeof html !== 'string' || !html.length || html.includes('\0')) fail('descriptionHtml ist leer oder unlesbar', 4);
  let cursor = 0, count = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor);
    if (start < 0) break;
    if (html.startsWith('<!--', start)) {
      const endComment = html.indexOf('-->', start + 4);
      if (endComment < 0) fail('descriptionHtml enthaelt einen offenen Kommentar', 4);
      cursor = endComment + 3; continue;
    }
    let quote = '', end = -1;
    for (let index = start + 1; index < html.length; index += 1) {
      const char = html[index];
      if (quote) { if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '>') { end = index; break; }
    }
    if (end < 0 || quote) fail('descriptionHtml enthaelt einen unvollstaendigen Tag', 4);
    let tag = html.slice(start + 1, end).trim();
    cursor = end + 1;
    if (!tag) fail('descriptionHtml enthaelt einen leeren Tag', 4);
    if (tag[0] === '!' || tag[0] === '?') continue;
    if (tag[0] === '/') {
      if (!/^\/[A-Za-z][A-Za-z0-9:-]*\s*$/.test(tag)) fail('descriptionHtml enthaelt einen ungueltigen End-Tag', 4);
      continue;
    }
    const selfClosing = /\/\s*$/.test(tag);
    if (selfClosing) tag = tag.replace(/\/\s*$/, '').trimEnd();
    const nameMatch = /^[A-Za-z][A-Za-z0-9:-]*/.exec(tag);
    if (!nameMatch) fail('descriptionHtml enthaelt einen ungueltigen Start-Tag', 4);
    const tagName = nameMatch[0].toLowerCase();
    let pos = nameMatch[0].length, classValue = null;
    while (pos < tag.length) {
      while (/\s/.test(tag[pos] || '')) pos += 1;
      if (pos >= tag.length) break;
      const attrMatch = /^[^\s"'<>/=]+/.exec(tag.slice(pos));
      if (!attrMatch) fail('descriptionHtml enthaelt ein ungueltiges Attribut', 4);
      const attrName = attrMatch[0].toLowerCase(); pos += attrMatch[0].length;
      while (/\s/.test(tag[pos] || '')) pos += 1;
      let value = '';
      if (tag[pos] === '=') {
        pos += 1; while (/\s/.test(tag[pos] || '')) pos += 1;
        if (pos >= tag.length) fail('descriptionHtml enthaelt ein Attribut ohne Wert', 4);
        if (tag[pos] === '"' || tag[pos] === "'") {
          const attrQuote = tag[pos++], valueStart = pos;
          while (pos < tag.length && tag[pos] !== attrQuote) pos += 1;
          if (pos >= tag.length) fail('descriptionHtml enthaelt einen offenen Attributwert', 4);
          value = tag.slice(valueStart, pos++);
        } else {
          const valueMatch = /^[^\s"'`=<>]+/.exec(tag.slice(pos));
          if (!valueMatch) fail('descriptionHtml enthaelt einen ungueltigen Attributwert', 4);
          value = valueMatch[0]; pos += value.length;
        }
      }
      if (attrName === 'class') {
        if (classValue !== null) fail('descriptionHtml enthaelt ein doppeltes class-Attribut', 4);
        classValue = value;
      }
    }
    const tokens = String(classValue || '').split(/[\t\n\f\r ]+/).filter(Boolean);
    if (tokens.includes('lspod-designer')) {
      if (tagName !== 'div' || selfClosing) fail('lspod-designer ist kein echter div-Container', 4);
      count += 1;
    }
  }
  return count;
}

export async function pruefeShopUndProdukte(q, allow, { shopHost, primaryDomain = 'luxestyle.ch' }) {
  const ids = allow.products.map((product) => product.shopifyProductId);
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^gid:\/\/shopify\/Product\/\d+$/.test(id))) fail('Allowlist enthaelt ungueltige oder doppelte Produkt-IDs', 4);
  const identity = await q(`{shop{name myshopifyDomain primaryDomain{url}}}`);
  const actualMyshopify = normalizeShopifyHost(identity.shop?.myshopifyDomain || '');
  if (actualMyshopify !== shopHost) fail(`Shop-Identitaet weicht ab: ${actualMyshopify || 'unbekannt'}`, 4);
  let actualPrimary = '';
  try { actualPrimary = new URL(identity.shop?.primaryDomain?.url || '').hostname.toLowerCase(); } catch { /* unten fail-closed */ }
  if (actualPrimary !== primaryDomain.toLowerCase()) fail(`Primaerdomain weicht ab: ${actualPrimary || 'unbekannt'}`, 4);
  const nodes = [];
  for (let index = 0; index < ids.length; index += 3) {
    const chunk = ids.slice(index, index + 3);
    const data = await q(`query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle status descriptionHtml variants(first:250){nodes{id} pageInfo{hasNextPage}}}}}`, { ids: chunk });
    for (const product of (data.nodes || []).filter(Boolean)) {
      if (product.variants?.pageInfo?.hasNextPage) fail(`${product.handle || product.id}: mehr als 250 Varianten; exakter Vergleich nicht moeglich`, 4);
      nodes.push(product);
    }
  }
  const byId = new Map(nodes.map((product) => [product.id, product]));
  if (byId.size !== ids.length) fail(`Shopify lieferte ${byId.size}/${ids.length} Allowlist-Produkte`, 4);
  for (const expected of allow.products) {
    const product = byId.get(expected.shopifyProductId);
    if (!product || product.status !== 'ACTIVE' || product.handle !== expected.handle) {
      fail(`${expected.handle}: Produkt-ID, ACTIVE-Status oder Handle weicht ab`, 4);
    }
    let containers;
    try { containers = designerContainerAnzahl(product.descriptionHtml); }
    catch (error) { fail(`${expected.handle}: descriptionHtml nicht sicher parsbar (${error.message})`, 4); }
    if (containers !== 1) fail(`${expected.handle}: erwartet exakt einen .lspod-designer-Container, gefunden ${containers}`, 4);
    const expectedVariants = expected.variants.map((variant) => `gid://shopify/ProductVariant/${variant.shopifyVariantId}`).sort();
    const actualVariants = (product.variants?.nodes || []).map((variant) => variant.id).sort();
    if (JSON.stringify(actualVariants) !== JSON.stringify(expectedVariants)) {
      fail(`${expected.handle}: aktuelle Shopify-Varianten weichen von der exakten Allowlist ab`, 4);
    }
  }
  return { myshopifyDomain: actualMyshopify, primaryDomain: actualPrimary, productCount: ids.length };
}

async function token(env, fetchFn) {
  if (String(env.SHOPIFY_ADMIN_TOKEN || '').trim()) return String(env.SHOPIFY_ADMIN_TOKEN).trim();
  const id = String(env.SHOPIFY_CLIENT_ID || '').trim();
  const secret = shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET);
  if (!id || !secret) fail('SHOPIFY_ADMIN_TOKEN oder SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET fehlen', 1);
  const response = await fetchFn(`https://${normalizeShopifyHost(env.SHOPIFY_SHOP)}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) fail(`Shopify-Token nicht erhalten (HTTP ${response.status})`, 1);
  return body.access_token;
}

async function readFiles(q, themeId, filenames, fetchFn) {
  const result = await q(`query($id:ID!,$files:[String!]!){theme(id:$id){files(filenames:$files,first:100){nodes{filename size checksumMd5 body{__typename ... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}`, { id: themeId, files: filenames });
  if (!result.theme) fail('Ziel-Theme ist nicht mehr lesbar', 4);
  const out = {};
  for (const node of result.theme.files.nodes) {
    let content = node.body?.__typename === 'OnlineStoreThemeFileBodyText' ? node.body.content : null;
    if (content == null && node.body?.url) {
      const response = await fetchFn(node.body.url, { redirect: 'error' });
      if (response.ok) content = await response.text();
    }
    if (content == null) fail(`${node.filename}: Inhalt nicht lesbar`, 4);
    const localMd5 = md5(content);
    if (node.checksumMd5 && localMd5 !== node.checksumMd5) fail(`${node.filename}: Inhalt/Checksumme widersprechen sich`, 4);
    out[node.filename] = { md5: node.checksumMd5 || localMd5, size: Number(node.size ?? Buffer.byteLength(content)), content };
  }
  return out;
}

async function upsert(q, themeId, files) {
  if (!files.length) return;
  const response = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`, {
    id: themeId,
    files: files.map(({ filename, content }) => ({ filename, body: { type: 'TEXT', value: content } })),
  })).themeFilesUpsert;
  if (response.userErrors?.length) fail(`themeFilesUpsert: ${JSON.stringify(response.userErrors)}`, 5);
  const received = new Set((response.upsertedThemeFiles || []).map((item) => item.filename));
  const missing = files.map((item) => item.filename).filter((filename) => !received.has(filename));
  if (missing.length) fail(`themeFilesUpsert ohne Bestaetigung: ${missing.join(', ')}`, 5);
}

async function remove(q, themeId, filenames) {
  if (!filenames.length) return;
  const response = (await q(`mutation($id:ID!,$files:[String!]!){themeFilesDelete(themeId:$id,files:$files){deletedThemeFiles{filename} userErrors{filename code message}}}`, { id: themeId, files: filenames })).themeFilesDelete;
  if (response.userErrors?.length) fail(`themeFilesDelete: ${JSON.stringify(response.userErrors)}`, 5);
  const received = new Set((response.deletedThemeFiles || []).map((item) => item.filename));
  const missing = filenames.filter((filename) => !received.has(filename));
  if (missing.length) fail(`themeFilesDelete ohne Bestaetigung: ${missing.join(', ')}`, 5);
}

async function assertHashes(read, expected, filenames, label, { timeoutMs = 150000, pollMs = 5000 } = {}) {
  const started = Date.now();
  for (;;) {
    const current = await read(filenames);
    const mismatches = filenames.filter((filename) => (current[filename]?.md5 ?? null) !== (expected[filename] ?? null));
    if (!mismatches.length) return current;
    if (Date.now() - started >= timeoutMs) {
      const error = new Error(`${label}: Ruecklesen nach ${timeoutMs} ms weiter abweichend: ${mismatches.join(', ')}`);
      error.exitCode = 6;
      error.uncertain = true;
      throw error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, pollMs));
  }
}

async function rollback({ q, read, theme, backup, after, live, verifyOptions }) {
  const before = snapshotFromBackup(backup);
  const filenames = Object.keys(backup.files);
  const current = await read(filenames);
  const plan = rollbackPlan(current, before, after, filenames);
  for (const filename of filenames) console.log('rollback', plan.states[filename].padEnd(10), filename);
  if (plan.foreign.length) fail(`Rücknahme gesperrt; fremd verändert: ${plan.foreign.join(', ')}`, 4);
  if (!live) {
    console.log(`DRY rollback: restore=${plan.restore.length} delete=${plan.remove.length}; nichts geschrieben`);
    return;
  }
  const order = [LAYOUT, ...filenames.filter((filename) => filename !== LAYOUT)];
  for (const filename of order) {
    if (plan.states[filename] !== 'angewendet') continue;
    const fresh = await read([filename]);
    if ((fresh[filename]?.md5 ?? null) !== (after[filename] ?? null)) fail(`${filename}: seit Rücknahmeprüfung verändert; Abbruch`, 4);
    if (before[filename]) await upsert(q, theme.id, [{ filename, content: before[filename].content }]);
    else await remove(q, theme.id, [filename]);
    await assertHashes(read, { [filename]: before[filename]?.md5 ?? null }, [filename], 'Rücknahme', verifyOptions);
  }
  console.log('ROLLBACK_OK');
}

export async function main({ env = process.env, fetchFn = fetch, panelModels = [] } = {}) {
  const live = env.LIVE === '1';
  const back = env.ZURUECK === '1';
  const shop = normalizeShopifyHost(env.SHOPIFY_SHOP);
  if (!shop) fail('SHOPIFY_SHOP fehlt', 1);
  const accessToken = await token(env, fetchFn);
  const api = env.SHOPIFY_API_VERSION || '2025-10';
  const q = (query, variables) => shopifyGql(shop, api, accessToken, query, variables, { fetch: fetchFn });
  const themes = (await q(`{themes(first:50){nodes{id name role}}}`)).themes.nodes;
  const theme = waehleTheme(themes, { themeId: env.THEME_ID, themeName: env.THEME_NAME, allowMain: env.ALLOW_MAIN === '1' });
  console.log('THEME', theme.id, JSON.stringify(theme.name), theme.role, live ? 'LIVE' : 'DRY');

  const read = (filenames) => readFiles(q, theme.id, filenames, fetchFn);
  const verifyOptions = {
    timeoutMs: Number(env.APPLY_TIMEOUT_MS || 150000),
    pollMs: Number(env.APPLY_POLL_MS || 5000),
  };
  if (!Number.isFinite(verifyOptions.timeoutMs) || verifyOptions.timeoutMs < 0 || !Number.isFinite(verifyOptions.pollMs) || verifyOptions.pollMs < 1) fail('APPLY_TIMEOUT_MS/APPLY_POLL_MS sind ungueltig', 4);
  const stateDir = resolve(env.APPLY_STATE_DIR || SICHERUNG);
  const ledgerPath = resolve(stateDir, 'eingespielt.json');
  if (back) {
    if (!existsSync(ledgerPath)) fail(`Rollback-Ledger fehlt: ${ledgerPath}`, 4);
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    if (ledger.schema !== 1 || ledger.theme?.id !== theme.id || !ledger.backup || !ledger.after) fail('Rollback-Ledger passt nicht zum Ziel-Theme', 4);
    const backupPath = resolve(stateDir, ledger.backup);
    if (!backupPath.startsWith(stateDir + '/') || !existsSync(backupPath)) fail('Rollback-Sicherung fehlt oder Pfad ist ungueltig', 4);
    const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
    const names = Object.keys(backup.files || {});
    if (backup.schema !== 1 || backup.theme?.id !== theme.id || !names.includes(LAYOUT) || names.length !== Object.keys(ledger.after).length) fail('Rollback-Sicherung ist unvollstaendig', 4);
    for (const filename of names) {
      const item = backup.files[filename];
      if (!item || typeof item.exists !== 'boolean' || (item.exists && (typeof item.content !== 'string' || md5(item.content) !== item.md5)) || !/^[0-9a-f]{32}$/.test(ledger.after[filename] || '')) fail(`Rollback-Daten ungueltig: ${filename}`, 4);
    }
    await rollback({ q, read, theme, backup, after: ledger.after, live, verifyOptions });
    return;
  }

  const { allow, report, intendedAssets } = quellDateien({ panelModels });
  const identity = await pruefeShopUndProdukte(q, allow, { shopHost: shop, primaryDomain: LUXESTYLE_PRIMARY_DOMAIN });
  console.log('SHOP_OK', identity.myshopifyDomain, identity.primaryDomain, `products=${identity.productCount}`);
  const assetNames = Object.keys(intendedAssets);
  const filenames = [LAYOUT, ...assetNames];
  const initial = await read(filenames);
  if (!initial[LAYOUT]) fail(`${LAYOUT} fehlt`, 4);
  const patched = patchThemeLayout(initial[LAYOUT].content, allow);
  const layout = typeof patched === 'string' ? patched : patched.text;
  if (typeof layout !== 'string' || layout === initial[LAYOUT].content) fail('Theme-Patch lieferte keinen geaenderten Layout-Text', 4);
  const intended = { ...intendedAssets, [LAYOUT]: layout };
  const after = Object.fromEntries(filenames.map((filename) => [filename, md5(intended[filename])]));
  const backup = backupPayload(theme, initial, filenames);
  const backupName = sicherungsName(theme, initial[LAYOUT].md5);
  mkdirSync(stateDir, { recursive: true });
  writeExact(resolve(stateDir, backupName), JSON.stringify(backup, null, 2) + '\n');
  const plan = {
    schema: 1,
    theme: { id: theme.id, name: theme.name, role: theme.role }, backup: backupName,
    scope: {
      products: report.productCount, variants: report.variantCount,
      readyPreviewProducts: report.readyPreviewProductCount, readyPreviewVariants: report.readyPreviewVariantCount,
      readyCardOnlyProducts: report.readyBindingProductCount, readyCardOnlyVariants: report.readyBindingVariantCount,
      blockedPrintfulProducts: report.blockedProductCount, blockedPrintfulVariants: report.blockedVariantCount,
      excludedActive: report.excludedActiveCount, blockedActive: report.blockedActiveCount,
    },
    before: Object.fromEntries(filenames.map((filename) => [filename, initial[filename]?.md5 ?? null])), after,
  };
  writeExact(resolve(stateDir, `plan-${theme.id.split('/').pop()}-${initial[LAYOUT].md5}.json`), JSON.stringify(plan, null, 2) + '\n');
  for (const filename of filenames) console.log('plan', filename, initial[filename]?.md5 ?? 'fehlt', '->', after[filename]);
  console.log(`scope products=${report.productCount} variants=${report.variantCount} preview=${report.readyPreviewProductCount}/${report.readyPreviewVariantCount} card_only=${report.readyBindingProductCount}/${report.readyBindingVariantCount} blocked_printful=${report.blockedProductCount}/${report.blockedVariantCount} excluded=${report.excludedActiveCount}`);
  console.log('BASIS_MD5=' + initial[LAYOUT].md5);
  if (!live) {
    console.log('DRY: Sicherung und Plan lokal geschrieben; keine Theme-Datei geschrieben');
    return;
  }

  if (!/^[0-9a-f]{32}$/.test(String(env.BASIS_MD5 || '')) || env.BASIS_MD5 !== initial[LAYOUT].md5) {
    fail('LIVE gesperrt: BASIS_MD5 fehlt oder weicht vom frisch gelesenen layout/theme.liquid ab', 4);
  }
  const fresh = await read(filenames);
  if (!gleichesSnapshot(initial, fresh, filenames)) fail('Zwischen Planung und Write hat sich mindestens eine Zieldatei verändert', 4);
  await pruefeShopUndProdukte(q, allow, { shopHost: shop, primaryDomain: LUXESTYLE_PRIMARY_DOMAIN });
  writeFileSync(ledgerPath, JSON.stringify({ ...plan, mode: 'inflight', startedAt: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
  let writesStarted = false;
  try {
    const assetWrites = assetNames.filter((filename) => initial[filename]?.md5 !== after[filename]).map((filename) => ({ filename, content: intended[filename] }));
    if (assetWrites.length) {
      writesStarted = true;
      await upsert(q, theme.id, assetWrites);
      await assertHashes(read, after, assetWrites.map((item) => item.filename), 'Assets', verifyOptions);
    }
    const beforeLayout = await read([LAYOUT]);
    if (beforeLayout[LAYOUT]?.md5 !== initial[LAYOUT].md5) fail(`${LAYOUT}: unmittelbar vor Aktivierung verändert`, 4);
    await pruefeShopUndProdukte(q, allow, { shopHost: shop, primaryDomain: LUXESTYLE_PRIMARY_DOMAIN });
    writesStarted = true;
    await upsert(q, theme.id, [{ filename: LAYOUT, content: intended[LAYOUT] }]);
    await assertHashes(read, after, filenames, 'Finale Rückleseprobe', verifyOptions);
    writeFileSync(ledgerPath, JSON.stringify({ ...plan, mode: 'applied', appliedAt: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
    console.log('V63_THEME_APPLY_OK');
  } catch (error) {
    console.error('Einspielung fehlgeschlagen:', error.message);
    if (writesStarted && !error.uncertain) {
      try {
        console.error('Versuche gesicherte automatische Rücknahme; nur exakte Vorher-/Soll-Hashes sind zugelassen.');
        await rollback({ q, read, theme, backup, after, live: true, verifyOptions });
      } catch (rollbackError) {
        console.error('RÜCKNAHME UNBEKANNT/BLOCKIERT:', rollbackError.message);
        throw Object.assign(error, { exitCode: 9 });
      }
    } else if (writesStarted) {
      console.error('WRITE-ZUSTAND UNBEKANNT: keine weiteren Writes und keine blinde Rücknahme; Ledger bleibt inflight.');
      error.exitCode = 9;
    }
    throw error;
  }
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main({ panelModels: process.argv.slice(2).includes('--panel=84') ? [84] : [] }).catch((error) => {
    console.error(error.message || error);
    process.exit(error.exitCode || 1);
  });
}
