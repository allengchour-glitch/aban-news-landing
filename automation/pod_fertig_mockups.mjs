#!/usr/bin/env node
/* LuxeStyle — pod_fertig_mockups.mjs  (Fertig-Designs: echtes Produkt-Mockup statt „schwebendem" Motiv)
 *
 * Problem: Die 49 Shirt- + 49 Tassen-Fertigprodukte zeigen als Hauptbild das blanke Design-PNG
 * (Motiv „schwebt" auf weiss). Kund:innen sollen das Motiv auf einem ECHTEN Produkt sehen.
 *
 * Lösung: Gemini 2.5 Flash Image (Bild-zu-Bild, 2 Eingaben = echtes Blank-Foto + Design) druckt das
 * Motiv photorealistisch auf das Produkt (Shirt-Brust / Tassen-Front, folgt Falten/Wölbung/Licht).
 * Ergebnis wird (a) nach pod/mockups/<type>/<name>.jpg committet UND (b) als neues Shopify-Hauptbild
 * gesetzt (Staged-Upload → productCreateMedia → nach vorne sortieren → altes Bild löschen).
 *
 * No-op-safe: ohne GEMINI_API_KEY (Gen) bzw. ohne Shopify-Creds (Swap) sauberer Leerlauf.
 * ENV: GEMINI_API_KEY · SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · SHOPIFY_SHOP
 *      TYPE=shirt|mug|both (Default both) · ONLY=name,name · LIMIT=99 · FORCE=1 (Bild neu gen)
 *      GEN_ONLY=1 (nur generieren+committen, kein Shopify-Swap) · DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const GMODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const TYPE = (process.env.TYPE || 'both').trim().toLowerCase();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '99', 10) || 99);
const FORCE = process.env.FORCE === '1';
const GEN_ONLY = process.env.GEN_ONLY === '1';
const DRY = process.env.DRY_RUN === '1';

const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const API = '2025-01';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const DESIGN_BASE = 'https://abannews.com/social/designs/';
const BASES = {
  shirt: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/blank-tee-white.png',
  mug:   'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1320_1663762583_6854cbf8-0ca1-4f08-9e2c-3d3673d1f211.jpg',
};
const PREFIX = { shirt: 'shirt', mug: 'tasse' };
const LEDGER = { shirt: 'social/designs/_pod_shirt_created.txt', mug: 'social/designs/_pod_mug_created.txt' };
const PROMPT = {
  shirt: `You are a professional apparel product photographer. IMAGE 1 is a blank plain white unisex cotton t-shirt photographed flat on a light grey studio background. IMAGE 2 is a graphic design artwork. TASK: realistically PRINT the design from IMAGE 2 onto the CENTRE CHEST of the t-shirt in IMAGE 1, sized like a real screen print (roughly 24–28 cm wide, upper-centre chest). The print must naturally follow the fabric folds, wrinkles, curvature and studio lighting/shadows so it looks like a genuine printed shirt photo. KEEP the t-shirt shape, colour, pose, background and lighting 100% IDENTICAL. Do NOT add any extra text, logo, border or watermark. Output a clean, photorealistic, e-commerce product photo.`,
  mug:   `You are a professional product photographer. IMAGE 1 is a blank glossy white ceramic mug on a plain background. IMAGE 2 is a graphic design artwork. TASK: realistically PRINT/WRAP the design from IMAGE 2 onto the FRONT of the mug in IMAGE 1, curving naturally around the cylindrical surface and following the mug's glossy lighting and shadows, like a real printed mug. KEEP the mug shape, handle, colour, background and lighting 100% IDENTICAL. Do NOT add any extra text or watermark. Output a clean, photorealistic, e-commerce product photo.`,
};

async function fetchImage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  const ct = (r.headers.get('content-type') || '').split(';')[0] || 'image/png';
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct };
}
function extractImage(j) {
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) { const d = p.inline_data || p.inlineData; if (d?.data) return d.data; }
  return null;
}
async function compose(type, base, design) {
  const url = `${GBASE}/models/${GMODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents: [{ role: 'user', parts: [
    { text: PROMPT[type] },
    { text: 'IMAGE 1 (blank product):' }, { inline_data: { mime_type: base.mime, data: base.b64 } },
    { text: 'IMAGE 2 (design to print):' }, { inline_data: { mime_type: design.mime, data: design.b64 } },
  ] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.2 } };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('  Gemini:', r.status, JSON.stringify(j.error || j).slice(0, 200)); return null; }
  return extractImage(j);
}

// ── Shopify ──
async function gql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function works(t) { try { const r = await gql(t, '{shop{name}}'); return r?.data?.shop?.name || null; } catch { return null; } }
async function cc() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function token() { if (ADMIN_TOKEN && await works(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await cc(); if (t && await works(t)) return t; } return null; }

const Q_MEDIA = `query($h:String!){ productByHandle(handle:$h){ id media(first:20){ edges{ node{ id ... on MediaImage{ id } } } } } }`;
const M_STAGE = `mutation($in:[StagedUploadInput!]!){ stagedUploadsCreate(input:$in){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ message } } }`;
const M_CREATE = `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id,media:$m){ media{ id status } mediaUserErrors{ field message } } }`;
const M_REORDER = `mutation($id:ID!,$moves:[MoveInput!]!){ productReorderMedia(id:$id,moves:$moves){ userErrors{ message } } }`;
const M_DELETE = `mutation($id:ID!,$ids:[ID!]!){ productDeleteMedia(productId:$id,mediaIds:$ids){ deletedMediaIds mediaUserErrors{ message } } }`;

async function stagedUpload(tok, filename, bytes) {
  const r = await gql(tok, M_STAGE, { in: [{ filename, mimeType: 'image/jpeg', resource: 'IMAGE', httpMethod: 'POST' }] });
  const t = r?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!t) throw new Error('stagedUpload: ' + JSON.stringify(r).slice(0, 200));
  const fd = new FormData();
  for (const p of t.parameters) fd.append(p.name, p.value);
  fd.append('file', new Blob([bytes], { type: 'image/jpeg' }), filename);
  const up = await fetch(t.url, { method: 'POST', body: fd });
  if (!up.ok && up.status !== 201 && up.status !== 204) throw new Error('upload HTTP ' + up.status);
  return t.resourceUrl;
}
async function swapMedia(tok, handle, type, name, bytes, alt) {
  const pm = (await gql(tok, Q_MEDIA, { h: handle }))?.data?.productByHandle;
  if (!pm) { console.error('   ✗ Produkt nicht gefunden:', handle); return false; }
  const oldIds = (pm.media?.edges || []).map(e => e.node.id);
  const resourceUrl = await stagedUpload(tok, `${type}-${name}.jpg`, bytes);
  const cr = await gql(tok, M_CREATE, { id: pm.id, m: [{ originalSource: resourceUrl, mediaContentType: 'IMAGE', alt }] });
  const errs = cr?.data?.productCreateMedia?.mediaUserErrors || [];
  const newId = cr?.data?.productCreateMedia?.media?.[0]?.id;
  if (errs.length || !newId) { console.error('   ✗ createMedia:', JSON.stringify(errs.length ? errs : cr).slice(0, 200)); return false; }
  await gql(tok, M_REORDER, { id: pm.id, moves: [{ id: newId, newPosition: '0' }] });
  if (oldIds.length) await gql(tok, M_DELETE, { id: pm.id, ids: oldIds });
  return true;
}

// ── Lauf ──
const types = TYPE === 'both' ? ['shirt', 'mug'] : [TYPE];
if (!['shirt', 'mug', 'both'].includes(TYPE)) { console.error('TYPE muss shirt|mug|both sein'); process.exit(1); }

let tok = null;
if (!GEN_ONLY && !DRY) { tok = await token(); if (!tok) { console.log('Keine Shopify-Creds → nur Gen möglich, GEN_ONLY erzwungen.'); } }
if (!KEY && !DRY) { console.log('Kein GEMINI_API_KEY → No-op (Bilder können nicht erzeugt werden).'); process.exit(0); }

let made = 0, swapped = 0, fails = [];
for (const type of types) {
  const names = fs.existsSync(LEDGER[type]) ? fs.readFileSync(LEDGER[type], 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : [];
  const queue = (ONLY.length ? names.filter(n => ONLY.includes(n)) : names).slice(0, LIMIT);
  const outDir = path.join(ROOT, 'pod', 'mockups', type);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n=== ${type.toUpperCase()}: ${queue.length} Design(s) ===`);
  let base = null;
  for (const n of queue) {
    const outFile = path.join(outDir, `${n}.jpg`);
    const handle = `${PREFIX[type]}-` + n.replace(/^ch-/, '');
    try {
      // 1) Bild erzeugen (falls noch nicht vorhanden / FORCE)
      if (FORCE || !fs.existsSync(outFile)) {
        if (DRY) { console.log(`  [DRY] gen ${type}/${n}`); made++; continue; }
        if (!base) base = await fetchImage(BASES[type]);
        const design = await fetchImage(`${DESIGN_BASE}${n}.png`);
        const b64 = await compose(type, base, design);
        if (!b64) { fails.push(`${type}/${n}: keine Bilddaten`); continue; }
        fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
        made++;
        console.log(`  ✅ gen ${type}/${n}.jpg (${(fs.statSync(outFile).size / 1024) | 0}kB)`);
      } else { console.log(`  = ${type}/${n} (Bild existiert)`); }
      // 2) Shopify-Hauptbild tauschen
      if (!GEN_ONLY && !DRY && tok) {
        const bytes = fs.readFileSync(outFile);
        const ok = await swapMedia(tok, handle, type, n, bytes, `${type === 'shirt' ? 'T-Shirt' : 'Tasse'} «${n}»`);
        if (ok) { swapped++; console.log(`     ↳ Hauptbild getauscht: ${handle}`); }
        await new Promise(x => setTimeout(x, 300));
      }
    } catch (e) { fails.push(`${type}/${n}: ${e.message}`); }
  }
}
if (fails.length) fails.slice(0, 20).forEach(f => console.error('✗', f));
console.log(`\nFertig: ${made} Mockup(s) erzeugt, ${swapped} Hauptbild(er) getauscht${fails.length ? `, ${fails.length} Fehler` : ''}.`);
