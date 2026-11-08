#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
import {
  ALLOWLIST, BLOCKLIST, PREVIEW_IDS, assetUrl, baustein, beschreibungPlanen,
  blockerBaustein, blockerProduktPruefen, numericId, produktPruefen,
  releaseAusAllowlist, releasePruefen, sha256,
} from './direct_rollout_lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HIER, '../../..');

const MODE = String(process.env.MODE || 'plan').toLowerCase();
const SCOPE = String(process.env.SCOPE || 'canary').toLowerCase();
const CANARY = 'keramik-tasse-selbst-gestalten';
const LIVE = process.env.LIVE === '1';
const ACK = process.env.ACK || process.env.ACK_FULL || '';
const SHOP = String(process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'au3j0y-hq.myshopify.com';
const API = '2026-01';
const EXPECTED_SHOP = 'au3j0y-hq.myshopify.com';
const SOURCE_ALLOWLIST = resolve(process.env.SOURCE_ALLOWLIST || join(HIER, '../rollout-v63/allowlist.json'));
const ASSET_ROOT = resolve(process.env.ASSET_ROOT || join(ROOT, 'pod/v6'));
const OUT = resolve(process.env.OUT_DIR || join(HIER, 'lauf'));
const ROLLBACK_PLAN = process.env.ROLLBACK_PLAN ? resolve(process.env.ROLLBACK_PLAN) : '';

if (!['plan', 'apply', 'rollback'].includes(MODE)) throw new Error('MODE muss plan, apply oder rollback sein');
if (!['canary', 'full'].includes(SCOPE)) throw new Error('SCOPE muss canary oder full sein');
if (MODE !== 'plan' && !LIVE) throw new Error(`${MODE}: LIVE=1 fehlt`);
if (MODE === 'apply' && SCOPE === 'canary' && ACK !== 'V63_CANARY_TASSE') throw new Error('Canary braucht ACK=V63_CANARY_TASSE');
if (MODE === 'apply' && SCOPE === 'full' && ACK !== 'V63_FULL_19_SAFE') throw new Error('Vollausrollung braucht ACK=V63_FULL_19_SAFE');
if (MODE === 'rollback' && SCOPE === 'canary' && ACK !== 'V63_ROLLBACK_TASSE') throw new Error('Canary-Rollback braucht ACK=V63_ROLLBACK_TASSE');
if (MODE === 'rollback' && SCOPE === 'full' && ACK !== 'V63_ROLLBACK_19_SAFE') throw new Error('Voll-Rollback braucht ACK=V63_ROLLBACK_19_SAFE');
if (MODE !== 'rollback' && !existsSync(SOURCE_ALLOWLIST)) throw new Error(`Quell-Allowlist fehlt: ${SOURCE_ALLOWLIST}`);

async function token() {
  const direkt = String(process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
  if (direkt) return direkt;
  const id = String(process.env.SHOPIFY_CLIENT_ID || '').trim();
  const secret = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!id || !secret) throw new Error('Shopify-Zugangsdaten fehlen');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Shopify-Token nicht erhältlich (HTTP ${r.status})`);
  return j.access_token;
}
const SHOP_Q = `{ shop { myshopifyDomain currencyCode primaryDomain { host url } } }`;
const PRODUCT_Q = `query($id:ID!){ product(id:$id){ id handle title status updatedAt tags onlineStoreUrl descriptionHtml variants(first:250){ pageInfo{ hasNextPage } nodes{ id sku availableForSale inventoryPolicy inventoryItem{ tracked } } } } }`;
const UPDATE_M = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id handle updatedAt descriptionHtml } userErrors{ field message } } }`;

async function identitaetPruefen(tok) {
  const s = (await shopifyGql(SHOP, API, tok, SHOP_Q)).shop;
  if (!s || s.myshopifyDomain !== EXPECTED_SHOP || s.primaryDomain?.host !== 'luxestyle.ch' || s.currencyCode !== 'CHF') throw new Error(`Shop-Identität abweichend: ${s?.myshopifyDomain || '?'} / ${s?.primaryDomain?.host || '?'} / ${s?.currencyCode || '?'}`);
  return s;
}

async function produkt(tok, id) {
  const p = (await shopifyGql(SHOP, API, tok, PRODUCT_Q, { id })).product;
  if (!p) throw new Error(`Produkt fehlt: ${id}`);
  return p;
}

function canonicalPfad(html) {
  const tags = String(html || '').match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel=(['"])canonical\1/i.test(tag)) continue;
    const m = tag.match(/\bhref=(['"])(.*?)\1/i);
    if (!m) continue;
    try { return decodeURIComponent(new URL(m[2], 'https://luxestyle.ch').pathname); } catch { return ''; }
  }
  return '';
}

async function storefrontPruefen(p) {
  const u = new URL(p.onlineStoreUrl);
  u.searchParams.set('lspod_check', `${Date.now()}-${p.id.split('/').pop()}`);
  const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (r.status !== 200) throw new Error(`${p.handle}: Storefront HTTP ${r.status}`);
  const text = await r.text();
  if (canonicalPfad(text) !== `/products/${p.handle}`) throw new Error(`${p.handle}: Canonical/Storefront nicht bestätigt`);
}

async function assetPruefen(url, soll, art) {
  const versioniert = assetUrl(url, soll);
  const r = await fetch(versioniert, { redirect: 'error', signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!r.ok) throw new Error(`Asset HTTP ${r.status}: ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  const ist = sha256(b);
  if (ist !== soll) throw new Error(`Asset-SHA abweichend: ${url} (${ist} statt ${soll})`);
  const acao = r.headers.get('access-control-allow-origin');
  const corp = r.headers.get('cross-origin-resource-policy');
  if (acao !== '*' || corp !== 'cross-origin') throw new Error(`Asset-CORS/CORP fehlt: ${url} (ACAO ${acao || '-'}, CORP ${corp || '-'})`);
  const typ = String(r.headers.get('content-type') || '').toLowerCase();
  if (art === 'editor' ? !/(javascript|ecmascript)/.test(typ) : !/application\/json/.test(typ)) throw new Error(`Asset-Content-Type falsch: ${url} (${typ || '-'})`);
  const cache = String(r.headers.get('cache-control') || '').toLowerCase();
  if (art === 'editor' && (!/max-age=31536000/.test(cache) || !/immutable/.test(cache))) throw new Error(`Editor-Cache-Regel fehlt: ${url} (${cache || '-'})`);
  if (art !== 'editor' && (!/max-age=86400/.test(cache) || !/must-revalidate/.test(cache) || /immutable/.test(cache))) throw new Error(`Karten-Cache-Regel falsch: ${url} (${cache || '-'})`);
}

function releaseLokalBauen() {
  const allowlist = JSON.parse(readFileSync(SOURCE_ALLOWLIST, 'utf8'));
  const editorPfad = join(ASSET_ROOT, 'lspod-designer-v6-6.3.0.js');
  if (!existsSync(editorPfad)) throw new Error(`Lokaler v6.3-Editor fehlt: ${editorPfad}`);
  const assetSha256 = new Map();
  for (const id of ALLOWLIST.map((x) => x.numericId)) {
    const card = `lspod-${id}.karte.json`;
    const cardPfad = join(ASSET_ROOT, 'maps', card);
    if (!existsSync(cardPfad)) throw new Error(`Lokale Karte fehlt: ${card}`);
    assetSha256.set(card, sha256(readFileSync(cardPfad)));
    if (PREVIEW_IDS.includes(id)) {
      const preview = `lspod-${id}.vorschau.json`;
      const previewPfad = join(ASSET_ROOT, 'maps', preview);
      if (!existsSync(previewPfad)) throw new Error(`Lokale Vorschau fehlt: ${preview}`);
      assetSha256.set(preview, sha256(readFileSync(previewPfad)));
    }
  }
  return releaseAusAllowlist(allowlist, { editorSha256: sha256(readFileSync(editorPfad)), assetSha256 });
}

function auswahl(alle) {
  if (SCOPE === 'full') return alle;
  const p = alle.find((x) => x.handle === CANARY);
  if (!p) throw new Error(`Canary nicht in Allowlist: ${CANARY}`);
  return [p];
}

async function planen(tok, release) {
  releasePruefen(release);
  await assetPruefen(release.editor.url, release.editor.sha256, 'editor');
  const byId = new Map(release.products.map((p) => [p.id, p]));
  const plaene = [];
  for (const a of ALLOWLIST) {
    const rp = byId.get(a.id);
    const p = await produkt(tok, a.id);
    produktPruefen(p, rp);
    await storefrontPruefen(p);
    await assetPruefen(rp.cardUrl, rp.cardSha256, 'karte');
    if (rp.previewUrl) await assetPruefen(rp.previewUrl, rp.previewSha256, 'vorschau');
    const diff = beschreibungPlanen(p.descriptionHtml, baustein({ product: p, releaseProduct: rp, editor: release.editor }));
    plaene.push({ kind: 'editor', id: p.id, numericId: numericId(p.id), handle: p.handle, title: p.title, updatedAt: p.updatedAt, onlineStoreUrl: p.onlineStoreUrl, expectedVariantIds: rp.variantIds.map(String), ...diff });
  }
  for (const b of BLOCKLIST) {
    const p = await produkt(tok, b.id);
    blockerProduktPruefen(p, b);
    await storefrontPruefen(p);
    const variantIds = (p.variants?.nodes || []).map((v) => numericId(v.id));
    const diff = beschreibungPlanen(p.descriptionHtml, blockerBaustein({ product: p, blocker: b }), { blocked: true });
    plaene.push({ kind: 'blocked', blockerReason: b.reason, id: p.id, numericId: numericId(p.id), handle: p.handle, title: p.title, updatedAt: p.updatedAt, onlineStoreUrl: p.onlineStoreUrl, expectedVariantIds: variantIds, ...diff });
  }
  return plaene;
}

function planSchreiben(plaene, release) {
  if (existsSync(join(OUT, 'plan.json')) || existsSync(join(OUT, 'ledger.json'))) throw new Error(`Ausgabeordner enthält bereits einen Lauf: ${OUT}`);
  mkdirSync(OUT, { recursive: true });
  for (const p of plaene) {
    writeFileSync(join(OUT, `${p.numericId}.before.html`), p.vorher);
    writeFileSync(join(OUT, `${p.numericId}.after.html`), p.nachher);
    if (sha256(readFileSync(join(OUT, `${p.numericId}.before.html`))) !== p.vorherSha256 || sha256(readFileSync(join(OUT, `${p.numericId}.after.html`))) !== p.nachherSha256) throw new Error(`${p.handle}: Sicherungs-Readback weicht ab`);
  }
  const releaseText = JSON.stringify(release, null, 2) + '\n';
  writeFileSync(join(OUT, 'release.json'), releaseText);
  const meta = { schema: 2, createdAt: new Date().toISOString(), shop: EXPECTED_SHOP, primaryDomain: 'luxestyle.ch', currency: 'CHF', releaseSha256: sha256(releaseText), scope: SCOPE, canary: SCOPE === 'canary' ? CANARY : null, products: plaene.map(({ vorher, nachher, ...x }) => x) };
  const planText = JSON.stringify(meta, null, 2) + '\n';
  writeFileSync(join(OUT, 'plan.json'), planText);
  if (readFileSync(join(OUT, 'plan.json'), 'utf8') !== planText || readFileSync(join(OUT, 'release.json'), 'utf8') !== releaseText) throw new Error('Plan-/Release-Readback weicht ab');
  planMetaPruefen(meta, OUT);
  return meta;
}

function planMetaPruefen(meta, quelle) {
  if (!meta || meta.schema !== 2 || meta.shop !== EXPECTED_SHOP || meta.primaryDomain !== 'luxestyle.ch' || meta.currency !== 'CHF' || !Array.isArray(meta.products)) throw new Error('Planidentität/Schema weicht ab');
  const soll = new Map([...ALLOWLIST.map((x) => [x.id, { ...x, kind: 'editor' }]), ...BLOCKLIST.map((x) => [x.id, { ...x, kind: 'blocked' }])]);
  if (meta.products.length !== soll.size) throw new Error(`Plan muss exakt ${soll.size} Produkte enthalten`);
  const gesehen = new Set();
  for (const x of meta.products) {
    const s = soll.get(x.id);
    if (!s || gesehen.has(x.id) || x.handle !== s.handle || x.numericId !== s.numericId || x.kind !== s.kind) throw new Error(`Planprodukt unzulässig/doppelt: ${x.id || '?'}`);
    gesehen.add(x.id);
    if (!/^[a-f0-9]{64}$/.test(x.vorherSha256 || '') || !/^[a-f0-9]{64}$/.test(x.nachherSha256 || '')) throw new Error(`${x.handle}: Beschreibungshash fehlt`);
    if (!Array.isArray(x.expectedVariantIds) || !x.expectedVariantIds.length || x.expectedVariantIds.some((id) => !/^\d+$/.test(String(id))) || new Set(x.expectedVariantIds.map(String)).size !== x.expectedVariantIds.length) throw new Error(`${x.handle}: Variantenscope im Plan unbrauchbar`);
    const vorher = join(quelle, `${x.numericId}.before.html`);
    const nachher = join(quelle, `${x.numericId}.after.html`);
    if (!existsSync(vorher) || !existsSync(nachher) || sha256(readFileSync(vorher)) !== x.vorherSha256 || sha256(readFileSync(nachher)) !== x.nachherSha256) throw new Error(`${x.handle}: Sicherungsdatei fehlt oder Hash weicht ab`);
  }
  const releasePfad = join(quelle, 'release.json');
  if (!existsSync(releasePfad) || sha256(readFileSync(releasePfad)) !== meta.releaseSha256) throw new Error('Release-Sicherung fehlt oder Hash weicht ab');
  releasePruefen(JSON.parse(readFileSync(releasePfad, 'utf8')));
  return true;
}

function rollbackMeta(tokMeta, quelle) {
  planMetaPruefen(tokMeta, quelle);
  const ledgerPfad = join(quelle, 'ledger.json');
  if (!existsSync(ledgerPfad)) throw new Error('Rollback braucht das Ledger des Apply-Laufs');
  const ledger = JSON.parse(readFileSync(ledgerPfad, 'utf8'));
  if (ledger?.schema !== 1 || ledger.mode !== 'apply' || ledger.scope !== SCOPE || ledger.sourcePlanSha256 !== sha256(readFileSync(join(quelle, 'plan.json'))) || !Array.isArray(ledger.products) || !ledger.products.length) throw new Error('Apply-Ledger passt nicht zum Rollback-Scope/Plan');
  const planById = new Map(tokMeta.products.map((p) => [p.id, p]));
  const ids = new Set();
  for (const x of ledger.products) {
    if (!planById.has(x.id) || ids.has(x.id) || !['applied', 'unchanged', 'rejected', 'unknown', 'unknown-write-response', 'unknown-readback', 'unknown-readback-unavailable'].includes(x.state)) throw new Error(`Apply-Ledger unzulässig: ${x.id || '?'} / ${x.state || '?'}`);
    ids.add(x.id);
  }
  if (SCOPE === 'canary' && (ids.size !== 1 || !ids.has(ALLOWLIST.find((x) => x.handle === CANARY)?.id))) throw new Error('Canary-Ledger enthält nicht exakt den Tassen-Canary');
  return { ...tokMeta, products: tokMeta.products.filter((p) => ids.has(p.id)) };
}

async function anwenden(tok, meta, quelle) {
  const ziel = auswahl(meta.products);
  if (existsSync(join(OUT, 'ledger.json'))) throw new Error(`Ledger existiert bereits; kein blinder Wiederholungslauf: ${OUT}`);
  const ledger = { schema: 1, startedAt: new Date().toISOString(), mode: MODE, scope: SCOPE, sourcePlanSha256: sha256(readFileSync(join(quelle, 'plan.json'))), products: [] };
  mkdirSync(OUT, { recursive: true });
  for (const x of ziel) {
    const p = await produkt(tok, x.id);
    if (x.kind === 'editor') produktPruefen(p, { id: x.id, handle: x.handle, variantIds: x.expectedVariantIds });
    else blockerProduktPruefen(p, BLOCKLIST.find((b) => b.id === x.id), x.expectedVariantIds);
    await storefrontPruefen(p);
    const erwartet = MODE === 'rollback' ? x.nachherSha256 : x.vorherSha256;
    const sollDatei = MODE === 'rollback' ? `${x.numericId}.before.html` : `${x.numericId}.after.html`;
    const soll = readFileSync(join(quelle, sollDatei), 'utf8');
    const frischSha = sha256(p.descriptionHtml || '');
    if (MODE === 'rollback' && frischSha === x.vorherSha256) {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'already-rolled-back', sha256: frischSha, readAt: new Date().toISOString() });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      continue;
    }
    if (frischSha !== erwartet) throw new Error(`${x.handle}: Beschreibung seit dem Plan verändert; nichts überschrieben`);
    if (sha256(soll) === erwartet) {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'unchanged', sha256: erwartet, readAt: new Date().toISOString() });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      continue;
    }
    let r;
    try {
      r = (await shopifyGql(SHOP, API, tok, UPDATE_M, { p: { id: x.id, descriptionHtml: soll } }, { versuche: 1 })).productUpdate;
    } catch {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'unknown-write-response' });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      throw new Error(`${x.handle}: Write-Antwort unbekannt; keine Wiederholung`);
    }
    if (r?.userErrors?.length) {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'rejected', userErrors: r.userErrors });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      throw new Error(`${x.handle}: Shopify hat das Update abgelehnt; keine Wiederholung`);
    }
    if (!r || !Array.isArray(r.userErrors) || !r.product) {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'unknown', userErrors: r?.userErrors || null });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      throw new Error(`${x.handle}: Write unklar/fehlerhaft; keine Wiederholung`);
    }
    let frisch;
    try { frisch = await produkt(tok, x.id); }
    catch {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'unknown-readback-unavailable' });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      throw new Error(`${x.handle}: Rücklesung nicht verfügbar; keine Wiederholung`);
    }
    if (sha256(frisch.descriptionHtml || '') !== sha256(soll)) {
      ledger.products.push({ id: x.id, handle: x.handle, state: 'unknown-readback' });
      writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
      throw new Error(`${x.handle}: Rücklesung weicht ab; keine Wiederholung`);
    }
    ledger.products.push({ id: x.id, handle: x.handle, state: MODE === 'rollback' ? 'rolled-back' : 'applied', sha256: sha256(soll), readAt: new Date().toISOString() });
    writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
  }
  ledger.completedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
  return ledger;
}

const tok = await token();
await identitaetPruefen(tok);
if (MODE === 'rollback') {
  if (!ROLLBACK_PLAN || !existsSync(join(ROLLBACK_PLAN, 'plan.json'))) throw new Error('ROLLBACK_PLAN mit plan.json fehlt');
  const meta = rollbackMeta(JSON.parse(readFileSync(join(ROLLBACK_PLAN, 'plan.json'), 'utf8')), ROLLBACK_PLAN);
  const ledger = await anwenden(tok, meta, ROLLBACK_PLAN);
  console.log(JSON.stringify({ mode: MODE, scope: SCOPE, changed: ledger.products.length }, null, 2));
} else {
  const release = releaseLokalBauen();
  const alle = await planen(tok, release);                         // alle 19 vor jedem Write erneut prüfen
  const meta = planSchreiben(alle, release);
  if (MODE === 'plan') console.log(JSON.stringify({ mode: MODE, productsChecked: alle.length, selected: auswahl(meta.products).map((x) => x.handle), output: OUT }, null, 2));
  else {
    const ledger = await anwenden(tok, meta, OUT);
    console.log(JSON.stringify({ mode: MODE, scope: SCOPE, changed: ledger.products.length, output: OUT }, null, 2));
  }
}
