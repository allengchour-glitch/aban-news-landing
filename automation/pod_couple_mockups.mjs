/**
 * Couple-POD Gemini-Mockups: erzeugt photorealistische Produktfotos für die 8 Paar-Produkte
 * (4 Tassen-Sets + 4 Shirts) und tauscht das Shopify-Hauptbild.
 *
 * Gemini 2.5 Flash Image (i2i): IMAGE 1 = echtes Blank-Foto (Tasse/Shirt), IMAGE 2 = Design-PNG.
 * Pro Produkt 2 Designs → 2 Fotos → mit ImageMagick `montage` nebeneinander = Paar-Hauptbild.
 *
 * ENV: GEMINI_API_KEY · SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · SHOPIFY_SHOP
 * No-op-safe: ohne GEMINI_API_KEY sauberer Leerlauf. DRY_RUN=1 = nur erzeugen, kein Swap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const KEY = process.env.GEMINI_API_KEY || '';
const GMODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSEC = process.env.SHOPIFY_CLIENT_SECRET || '';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const API = '2025-01';
const DRY = process.env.DRY_RUN === '1';
const FORCE = process.env.FORCE === '1';
const BG = '#f3f0e9';

const DESIGN_DIR = path.join(ROOT, 'pod', 'couple', 'print');
const OUT = path.join(ROOT, 'pod', 'couple', 'gemini');
fs.mkdirSync(OUT, { recursive: true });

const BASES = {
  shirt: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/blank-tee-white.png',
  mug: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1320_1663762583_6854cbf8-0ca1-4f08-9e2c-3d3673d1f211.jpg',
};
const PROMPT = {
  shirt: `You are a professional apparel product photographer. IMAGE 1 is a blank plain white unisex cotton t-shirt photographed flat on a light grey studio background. IMAGE 2 is a graphic design artwork. TASK: realistically PRINT the design from IMAGE 2 onto the CENTRE CHEST of the t-shirt in IMAGE 1, sized like a real screen print (roughly 24-28 cm wide, upper-centre chest). The print must naturally follow the fabric folds, wrinkles, curvature and studio lighting/shadows so it looks like a genuine printed shirt photo. KEEP the t-shirt shape, colour, pose, background and lighting 100% IDENTICAL. Do NOT add any extra text, logo, border or watermark. Output a clean, photorealistic, e-commerce product photo.`,
  mug: `You are a professional product photographer. IMAGE 1 is a blank glossy white ceramic mug on a plain background. IMAGE 2 is a graphic design artwork. TASK: realistically PRINT/WRAP the design from IMAGE 2 onto the FRONT of the mug in IMAGE 1, curving naturally around the cylindrical surface and following the mug's glossy lighting and shadows, like a real printed mug. KEEP the mug shape, handle, colour, background and lighting 100% IDENTICAL. Do NOT add any extra text or watermark. Output a clean, photorealistic, e-commerce product photo.`,
};

// handle, type, [designA, designB]
const PRODUCTS = [
  ['king-queen-tassen-set-2-tassen-fur-paare-👑', 'mug', ['king', 'queen']],
  ['mr-mrs-tassen-set-2-tassen-zur-hochzeit-💍', 'mug', ['mr', 'mrs']],
  ['her-king-his-queen-tassen-set-2-tassen-fur-verliebte-👑', 'mug', ['her-king', 'his-queen']],
  ['hubby-wifey-tassen-set-2-tassen-mit-herz-❤️', 'mug', ['hubby', 'wifey']],
  ['king-queen-partner-shirts-couple-t-shirts-👑', 'shirt', ['king', 'queen']],
  ['mr-mrs-partner-shirts-couple-t-shirts-zur-hochzeit-💍', 'shirt', ['mr', 'mrs']],
  ['her-king-his-queen-partner-shirts-couple-t-shirts-👑', 'shirt', ['her-king', 'his-queen']],
  ['hubby-wifey-partner-shirts-couple-t-shirts-mit-herz-❤️', 'shirt', ['hubby', 'wifey']],
];

async function fetchImage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + r.status + ' ' + url);
  const ct = (r.headers.get('content-type') || '').split(';')[0] || 'image/png';
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct };
}
function localDesign(name) {
  const p = path.join(DESIGN_DIR, `print-${name}.png`);
  return { b64: fs.readFileSync(p).toString('base64'), mime: 'image/png' };
}
function extractImage(j) {
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) { const d = p.inline_data || p.inlineData; if (d?.data) return d.data; }
  return null;
}
async function gemini(type, design) {
  const base = await fetchImage(BASES[type]);
  const url = `${GBASE}/models/${GMODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents: [{ parts: [
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
async function swapMedia(tok, handle, name, bytes, alt) {
  const pm = (await gql(tok, Q_MEDIA, { h: handle }))?.data?.productByHandle;
  if (!pm) { console.error('   ✗ Produkt nicht gefunden:', handle); return false; }
  const oldIds = (pm.media?.edges || []).map(e => e.node.id);
  const resourceUrl = await stagedUpload(tok, `couple-${name}.jpg`, bytes);
  const cr = await gql(tok, M_CREATE, { id: pm.id, m: [{ originalSource: resourceUrl, mediaContentType: 'IMAGE', alt }] });
  const errs = cr?.data?.productCreateMedia?.mediaUserErrors || [];
  const newId = cr?.data?.productCreateMedia?.media?.[0]?.id;
  if (errs.length || !newId) { console.error('   ✗ createMedia:', JSON.stringify(errs.length ? errs : cr).slice(0, 200)); return false; }
  await gql(tok, M_REORDER, { id: pm.id, moves: [{ id: newId, newPosition: '0' }] });
  if (oldIds.length) await gql(tok, M_DELETE, { id: pm.id, ids: oldIds });
  return true;
}

// ── Lauf ──
if (!KEY) { console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
let tok = null;
if (!DRY) { tok = await token(); if (!tok) console.log('Keine Shopify-Creds → nur Bild-Erzeugung.'); }

let made = 0, swapped = 0; const fails = [];
for (const [handle, type, designs] of PRODUCTS) {
  const slug = handle.replace(/[^a-z0-9-]+/gi, '').slice(0, 40);
  const pairFile = path.join(OUT, `${type}-${designs.join('-')}.jpg`);
  try {
    if (FORCE || !fs.existsSync(pairFile)) {
      const singles = [];
      for (const d of designs) {
        const b64 = await gemini(type, localDesign(d));
        if (!b64) { throw new Error(`Gemini leer für ${type}/${d}`); }
        const sf = path.join(OUT, `single-${type}-${d}.png`);
        fs.writeFileSync(sf, Buffer.from(b64, 'base64'));
        singles.push(sf);
        await new Promise(x => setTimeout(x, 400));
      }
      // zwei Fotos nebeneinander -> Paar-Hauptbild
      execSync(`montage "${singles[0]}" "${singles[1]}" -tile 2x1 -geometry +24+24 -background "${BG}" -resize 1500x "${pairFile}"`, { stdio: 'pipe' });
      made++;
      console.log(`✅ ${type} ${designs.join(' & ')} -> ${path.basename(pairFile)} (${(fs.statSync(pairFile).size/1024)|0}kB)`);
    } else { console.log(`= ${path.basename(pairFile)} existiert`); }

    if (!DRY && tok) {
      const ok = await swapMedia(tok, handle, `${type}-${designs.join('-')}`, fs.readFileSync(pairFile), `${type === 'shirt' ? 'Partner-Shirts' : 'Paar-Tassen'} ${designs.join(' & ')}`);
      if (ok) { swapped++; console.log(`   ↳ Hauptbild getauscht: ${handle}`); }
      await new Promise(x => setTimeout(x, 300));
    }
  } catch (e) { fails.push(`${handle}: ${e.message}`); console.error('✗', handle, e.message); }
}
console.log(`\nFertig: ${made} Paar-Mockup(s), ${swapped} Hauptbild(er) getauscht${fails.length ? `, ${fails.length} Fehler` : ''}.`);
