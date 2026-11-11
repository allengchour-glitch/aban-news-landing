// Attrappe für kategorie_banner_v2.mjs: ersetzt globalThis.fetch (Laden mit `node --import ./banner_v2_attrappe.mjs …`).
// Spielt Shopify-Admin (OAuth, GraphQL), den Staged-Upload und das CDN nach; der Zustand liegt in der JSON-Datei FAKE_STAND
// und wird nach jeder Änderung geschrieben (jeder Lauf ist ein eigener Prozess). Nur für Tests, nie gegen den Shop.
// FAKE_FEHLER: «alt-falsch» (collectionUpdate speichert einen anderen Alt-Text), «update-fehler» (userErrors), «kopf-fehler» (metafieldsSet userErrors),
// «cdn-404» (neue Bilder fehlen im CDN).
import { readFileSync, writeFileSync } from 'node:fs';

const STAND = process.env.FAKE_STAND;
if (!STAND) throw new Error('FAKE_STAND fehlt');
const FEHLER = new Set((process.env.FAKE_FEHLER || '').split(',').filter(Boolean));
const laden = () => JSON.parse(readFileSync(STAND, 'utf8'));
const speichern = s => writeFileSync(STAND, JSON.stringify(s, null, 1));
const stamm = u => String(u || '').split('?')[0];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

/** Masse aus einem JPEG (SOF0/SOF2) lesen. */
function jpegMasse(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return { w: 0, h: 0 };
}

function gql(query, v) {
  const s = laden();
  const coll = h => Object.values(s.collections).find(c => c.handle === h);
  const ausgeben = c => c && ({ id: c.id, handle: c.handle, title: c.title, image: c.image, kopf: c.kopf == null ? null : { value: c.kopf } });
  if (/stagedUploadsCreate/.test(query)) {
    s.zaehler++; speichern(s);
    const name = v.in[0].filename;
    return { stagedUploadsCreate: { stagedTargets: [{ url: 'https://upload.fake/ziel', resourceUrl: `https://upload.fake/res/${s.zaehler}/${name}`, parameters: [{ name: 'key', value: `k${s.zaehler}` }] }], userErrors: [] } };
  }
  if (/collectionUpdate/.test(query)) {
    if (FEHLER.has('update-fehler')) return { collectionUpdate: { collection: null, userErrors: [{ field: ['image'], message: 'Attrappe: Fehler' }] } };
    const c = s.collections[v.i.id]; const src = v.i.image.src;
    const quelle = s.uploads[src] || s.cdn[stamm(src)];
    if (!quelle) return { collectionUpdate: { collection: null, userErrors: [{ field: ['image', 'src'], message: 'Image could not be downloaded' }] } };
    s.zaehler++;
    const name = stamm(src).split('/').pop().replace(/\.(jpe?g|png)$/i, '');
    const neu = `https://cdn.shopify.com/s/files/fake/collections/${name}_${String(s.zaehler).padStart(8, '0')}-0000-4000-8000-000000000000.jpg`;
    if (!FEHLER.has('cdn-404')) s.cdn[neu] = { ...quelle };
    c.image = { url: neu + '?v=' + s.zaehler, altText: FEHLER.has('alt-falsch') ? 'falsch' : v.i.image.altText, width: quelle.w, height: quelle.h };
    s.log.push({ op: 'collectionUpdate', handle: c.handle, src, alt: v.i.image.altText }); speichern(s);
    return { collectionUpdate: { collection: { id: c.id }, userErrors: [] } };
  }
  if (/metafieldsSet/.test(query)) {
    if (FEHLER.has('kopf-fehler')) return { metafieldsSet: { metafields: [], userErrors: [{ field: ['value'], message: 'Attrappe: Kopf-Fehler' }] } };
    const m = v.m[0]; s.collections[m.ownerId].kopf = m.value; s.log.push({ op: 'metafieldsSet', owner: m.ownerId, value: m.value, type: m.type }); speichern(s);
    return { metafieldsSet: { metafields: [{ id: 'gid://shopify/Metafield/1' }], userErrors: [] } };
  }
  if (/metafieldsDelete/.test(query)) {
    const m = v.m[0]; s.collections[m.ownerId].kopf = null; s.log.push({ op: 'metafieldsDelete', owner: m.ownerId }); speichern(s);
    return { metafieldsDelete: { deletedMetafields: [{ key: m.key }], userErrors: [] } };
  }
  if (/nodes\(ids:\$ids\)/.test(query)) {
    const mit = new Set(s.mitglieder[v.cid] || []);
    return { nodes: v.ids.map(id => s.produkte[id] ? { ...s.produkte[id], inCollection: mit.has(id) } : null) };
  }
  if (/collectionByHandle/.test(query) && !/products\(first:50/.test(query)) return { collectionByHandle: ausgeben(coll(v.h)) || null };
  throw new Error('Attrappe: unbekannte Abfrage ' + query.slice(0, 80));
}

globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (/\/admin\/oauth\/access_token$/.test(u)) return json({ access_token: 'attrappe', scope: 'x' });
  if (/\/admin\/api\/[\d-]+\/graphql\.json$/.test(u)) {
    const { query, variables } = JSON.parse(opt.body);
    try { return json({ data: gql(query, variables || {}) }); } catch (e) { return json({ errors: [{ message: e.message }] }); }
  }
  if (u === 'https://upload.fake/ziel') {
    const f = opt.body.get('file'); const b = Buffer.from(await f.arrayBuffer());
    const s = laden();
    // Ziel = resourceUrl der stagedUploadsCreate-Antwort mit demselben key (key «k<n>»)
    const n = Number(String(opt.body.get('key')).slice(1));
    const ziel = `https://upload.fake/res/${n}/${f.name}`;
    const datei = `${STAND}.upload-${n}.jpg`; writeFileSync(datei, b);
    s.uploads[ziel] = { datei, ...jpegMasse(b) }; s.log.push({ op: 'upload', ziel, bytes: b.length }); speichern(s);
    return new Response(null, { status: 201 });
  }
  if (/^https:\/\/cdn\.shopify\.com\//.test(u)) {
    const s = laden(); const e = s.cdn[stamm(u)];
    if (!e) return new Response('nicht da', { status: 404 });
    if ((opt.method || 'GET') === 'HEAD') return new Response(null, { status: 200 });
    return new Response(readFileSync(e.datei), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  }
  throw new Error('Attrappe: kein Netz für ' + u);
};
