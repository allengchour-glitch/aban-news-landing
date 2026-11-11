// Tests für anwenden.mjs mit einer Attrappe der Shopify-Admin-API (kein Netz).
// Aufruf: /opt/node22/bin/node anwenden_test.mjs        (GK_WERKZEUG=<pfad> prüft eine andere Fassung, z. B. für die Mutationsprobe)
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const W = process.env.GK_WERKZEUG || join(HIER, 'anwenden.mjs');
const T = await import(pathToFileURL(W).href);
const NUR_EIN = process.env.GK_TEST || '';   // nur Tests, deren Name diesen Text enthält

// ── Hilfen ─────────────────────────────────────────────────────────────────────────────────────
const MUT = new Set(['GkStaged', 'GkMedienNeu', 'GkProdukt', 'GkOption', 'GkMetaSetzen', 'GkMetaLoeschen', 'GkVarLoesen', 'GkVarHaengen', 'GkDateiRef', 'GkOrdnen']);
const MI = (n) => `gid://shopify/MediaImage/${n}`, VA = (n) => `gid://shopify/ProductVariant/${n}`, OV = (n) => `gid://shopify/ProductOptionValue/${n}`;
const PID = 'gid://shopify/Product/1', HANDLE = 'test-produkt';
function jpeg(w, h, text = 'x') {
  const com = Buffer.from(text, 'utf8');
  const comSeg = Buffer.concat([Buffer.from([0xff, 0xfe, (com.length + 2) >> 8, (com.length + 2) & 255]), com]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, comSeg, sof, Buffer.from([0xff, 0xd9])]);
}
function png(w, h) {
  const b = Buffer.alloc(40);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'ascii'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); b[24] = 8; b[25] = 6;
  return b;
}

const DESC = '<p>Dieser Gürtel aus hochwertigem Leder passt zu allem.</p>\n<ul>\n<li><strong>Material:</strong> Denim</li>\n<li>Länge: Regulär (50cm &lt; Länge ≤ 65cm)</li>\n</ul>';
const DESC_SOLL = '<p>Dieser Gürtel aus Leder passt zu allem.</p>\n<ul>\n<li><strong>Material:</strong> Rindsleder</li>\n<li>Länge: Regulär (50cm &lt; Länge ≤ 65cm)</li>\n<li>Grössen: asiatisch</li>\n</ul>';

// ── Attrappe der Admin-API ──────────────────────────────────────────────────────────────────────
function neuerShop(f = {}) {
  const S = { aufrufe: [], log: [], uploads: 0, angelegt: 0, seq: 9000, staged: new Map(), hoch: new Map(), job: null, f: { readyNach: 1, ordnenNach: 1, ...f }, hooks: {} };
  const dateien = new Map();
  const datei = (id, alt, typ = 'IMAGE') => dateien.set(id, { id, alt, typ, url: `https://cdn.test/files/${id.split('/').pop()}.jpg`, status: 'READY', bisReady: 0, refs: new Set([PID]), w: 800, h: 800 });
  [101, 102, 103, 104, 105, 106].forEach((n, i) => datei(MI(n), ['Etikett Khaki', 'sauber', 'Etikett Schwarz', 'Etikett Braun', 'Gold sauber', 'Grau sauber'][i]));
  datei('gid://shopify/Video/107', 'Video', 'VIDEO');
  const P = {
    id: PID, handle: HANDLE, title: 'Echtleder-Gürtel Gold Alt', status: 'ACTIVE', vendor: 'LuxeStyle', productType: 'Gürtel', tags: ['cj-real', 'damen'],
    descriptionHtml: DESC, seo: { title: 'Alt SEO | LuxeStyle CH', description: 'Alte SEO-Beschreibung' },
    options: [{ id: 'gid://shopify/ProductOption/1', name: 'Farbe', optionValues: [{ id: OV(1), name: 'Schwarz' }, { id: OV(2), name: 'Braun' }, { id: OV(3), name: 'Gold' }, { id: OV(4), name: 'Ausländische Version Grau' }] }],
    variants: [
      { id: VA(1), sku: 'SKU-1', price: '29.90', media: [MI(103)] }, { id: VA(2), sku: 'SKU-2', price: '29.90', media: [MI(104)] },
      { id: VA(3), sku: 'SKU-3', price: '31.90', media: [MI(105)] }, { id: VA(4), sku: 'SKU-4', price: '31.90', media: [MI(106)] }],
    mediaIds: [MI(101), MI(102), MI(103), MI(104), MI(105), MI(106), 'gid://shopify/Video/107'],
    meta: new Map([['mm-google-shopping.color', { type: 'single_line_text_field', value: 'Gold' }], ['mm-google-shopping.custom_product', { type: 'boolean', value: 'true' }], ['judgeme.badge', { type: 'string', value: 'x' }]]),
  };
  S.P = P; S.dateien = dateien;
  const tick = () => {
    for (const d of dateien.values()) if (d.status === 'PROCESSING') { if (d.bisReady > 0) d.bisReady--; if (d.bisReady <= 0) d.status = 'READY'; }
    if (S.job) { S.job.rest--; if (S.job.rest <= 0) { for (const mv of S.job.moves) { const i = P.mediaIds.indexOf(mv.id); if (i < 0) continue; P.mediaIds.splice(i, 1); P.mediaIds.splice(Math.min(Number(mv.newPosition), P.mediaIds.length), 0, mv.id); } S.job = null; } }
  };
  const produkt = () => ({
    id: P.id, handle: P.handle, title: P.title, status: P.status, vendor: P.vendor, productType: P.productType, tags: [...P.tags], descriptionHtml: P.descriptionHtml,
    seo: { ...P.seo }, featuredMedia: P.mediaIds[0] ? { id: P.mediaIds[0] } : null,
    options: P.options.map((o) => ({ id: o.id, name: o.name, optionValues: o.optionValues.map((v) => ({ ...v })) })),
    variants: { pageInfo: { hasNextPage: false }, nodes: P.variants.map((v) => ({ id: v.id, sku: v.sku, price: v.price, media: { nodes: v.media.map((id) => ({ id })) } })) },
    media: { pageInfo: { hasNextPage: false }, nodes: P.mediaIds.map((id) => { const d = dateien.get(id); return { id, alt: d.alt, mediaContentType: d.typ, status: d.status, ...(d.typ === 'IMAGE' ? { image: d.status === 'READY' ? { url: d.url, width: d.w, height: d.h } : null } : {}) }; }) },
  });
  const fehlerOk = (feld, extra = {}) => ({ [feld]: { userErrors: [], ...extra } });
  const ign = (k) => (S.f.ignorieren || []).includes(k);
  async function gql(query, v = {}) {
    const op = (String(query).match(/^\s*(?:query|mutation)\s+(\w+)/) || [])[1];
    S.aufrufe.push(op);
    if (S.hooks.vorAufruf) await S.hooks.vorAufruf(op, v);
    if (/^\s*mutation/.test(query) && !MUT.has(op)) throw new Error('Attrappe: unbekannte Mutation ' + op);
    switch (op) {
      case 'GkLesen': tick(); return { productByIdentifier: v.h === P.handle ? produkt() : null };
      case 'GkMeta': {
        if (v.id !== P.id) return { product: null };
        const out = { id: P.id };
        for (let i = 0; `n${i}` in v; i++) { const m = P.meta.get(`${v[`n${i}`]}.${v[`k${i}`]}`); out[`m${i}`] = m ? { id: 'gid://shopify/Metafield/' + i, type: m.type, value: m.value } : null; }
        return { product: out };
      }
      case 'GkDateien': return { nodes: v.i.map((id) => (dateien.has(id) ? { id, fileStatus: 'READY' } : null)) };
      case 'GkStaged': {
        const n = ++S.seq, url = `https://staged.test/up/${n}`, res = `https://staged.test/res/${n}`;
        S.staged.set(url, { res, filename: v.i[0].filename, mime: v.i[0].mimeType, size: v.i[0].fileSize });
        return { stagedUploadsCreate: { stagedTargets: [{ url, resourceUrl: res, parameters: [{ name: 'key', value: String(n) }] }], userErrors: [] } };
      }
      case 'GkMedienNeu': {
        if (S.f.medienVorher > 0) { S.f.medienVorher--; throw new Error('socket hang up (vor dem Anlegen)'); }
        for (const m of v.m) {
          const up = S.hoch.get(m.originalSource);
          if (!up) return { productUpdate: { product: null, userErrors: [{ field: ['media'], message: 'Quelle unbekannt' }] } };
          const id = MI(++S.seq);
          dateien.set(id, { id, alt: ign('alt') ? '' : m.alt, typ: 'IMAGE', url: `https://cdn.test/files/${up.filename}?v=1`, status: 'PROCESSING', bisReady: S.f.readyNach, refs: new Set([P.id]), w: up.w, h: up.h });
          P.mediaIds.push(id); S.angelegt++;
        }
        if (S.f.medienNachher > 0) { S.f.medienNachher--; throw new Error('ECONNRESET (Antwort verloren, Bild angelegt)'); }
        return { productUpdate: { product: { id: P.id }, userErrors: [] } };
      }
      case 'GkProdukt': {
        const x = v.p;
        if ('title' in x && !ign('title')) P.title = x.title;
        if ('descriptionHtml' in x && !ign('descriptionHtml')) P.descriptionHtml = x.descriptionHtml;
        if (x.seo && !ign('seo')) { P.seo = { title: x.seo.title === P.title ? null : (x.seo.title ?? null), description: x.seo.description || null }; }
        if (S.f.preisAendern) P.variants[0].price = '1.00';
        return { productUpdate: { product: { id: P.id }, userErrors: [] } };
      }
      case 'GkOption': {
        const o = P.options.find((x) => x.id === v.o.id);
        if (!o) return fehlerOk('productOptionUpdate', { userErrors: [{ field: ['option'], message: 'Option fehlt' }] });
        for (const u of v.v) {
          const w = o.optionValues.find((x) => x.id === u.id);
          if (!w) return fehlerOk('productOptionUpdate', { userErrors: [{ field: ['optionValuesToUpdate'], message: 'Wert fehlt' }] });
          if (o.optionValues.some((x) => x.id !== u.id && x.name === u.name)) return fehlerOk('productOptionUpdate', { userErrors: [{ field: ['optionValuesToUpdate'], message: 'doppelt', code: 'DUPLICATED_OPTION_VALUE' }] });
        }
        if (!ign('option')) for (const u of v.v) o.optionValues.find((x) => x.id === u.id).name = u.name;
        return fehlerOk('productOptionUpdate', { product: { id: P.id } });
      }
      case 'GkMetaSetzen': {
        for (const m of v.m) { const k = `${m.namespace}.${m.key}`, alt = P.meta.get(k); if (m.ownerId !== P.id) return fehlerOk('metafieldsSet', { userErrors: [{ field: ['ownerId'], message: 'falsch' }] }); if (alt && alt.type !== m.type) return fehlerOk('metafieldsSet', { userErrors: [{ field: ['type'], message: 'Typ passt nicht', code: 'INVALID_TYPE' }] }); }
        if (!ign('meta')) for (const m of v.m) P.meta.set(`${m.namespace}.${m.key}`, { type: m.type, value: m.value });
        return fehlerOk('metafieldsSet', { metafields: v.m.map((m) => ({ namespace: m.namespace, key: m.key })) });
      }
      case 'GkMetaLoeschen': { if (!ign('meta')) for (const m of v.m) P.meta.delete(`${m.namespace}.${m.key}`); return fehlerOk('metafieldsDelete', { deletedMetafields: v.m }); }
      case 'GkVarLoesen': {
        if (S.f.loesenFehler > 0) { S.f.loesenFehler--; return fehlerOk('productVariantDetachMedia', { userErrors: [{ field: ['variantMedia'], message: 'kaputt' }] }); }
        for (const x of v.vm) { const va = P.variants.find((y) => y.id === x.variantId); va.media = va.media.filter((id) => !x.mediaIds.includes(id)); }
        return fehlerOk('productVariantDetachMedia');
      }
      case 'GkVarHaengen': {
        if (S.f.haengenFehler > 0) { S.f.haengenFehler--; return fehlerOk('productVariantAppendMedia', { userErrors: [{ field: ['variantMedia'], message: 'Fehler beim Anhängen' }] }); }
        for (const x of v.vm) {
          const va = P.variants.find((y) => y.id === x.variantId);
          if (!va) return fehlerOk('productVariantAppendMedia', { userErrors: [{ message: 'Variante fehlt' }] });
          if (va.media.length) return fehlerOk('productVariantAppendMedia', { userErrors: [{ message: 'hat schon ein Bild', code: 'PRODUCT_VARIANT_ALREADY_HAS_MEDIA' }] });
          for (const id of x.mediaIds) { if (!P.mediaIds.includes(id)) return fehlerOk('productVariantAppendMedia', { userErrors: [{ message: 'nicht am Produkt', code: 'MEDIA_DOES_NOT_EXIST_ON_PRODUCT' }] }); if (dateien.get(id).status !== 'READY') return fehlerOk('productVariantAppendMedia', { userErrors: [{ message: 'nicht bereit', code: 'NON_READY_MEDIA' }] }); }
        }
        for (const x of v.vm) P.variants.find((y) => y.id === x.variantId).media.push(...x.mediaIds);
        return fehlerOk('productVariantAppendMedia');
      }
      case 'GkDateiRef': {
        for (const x of v.f) if (!dateien.has(x.id)) return fehlerOk('fileUpdate', { userErrors: [{ field: ['files'], message: 'Datei fehlt', code: 'FILE_DOES_NOT_EXIST' }] });
        for (const x of v.f) {
          const d = dateien.get(x.id);
          if ((x.referencesToRemove || []).includes(P.id)) { P.mediaIds = P.mediaIds.filter((id) => id !== x.id); d.refs.delete(P.id); for (const va of P.variants) va.media = va.media.filter((id) => id !== x.id); if (S.f.loeschtDatei) dateien.delete(x.id); }
          if ((x.referencesToAdd || []).includes(P.id)) { if (!P.mediaIds.includes(x.id)) P.mediaIds.push(x.id); d.refs.add(P.id); }
        }
        return fehlerOk('fileUpdate', { files: v.f.map((x) => ({ id: x.id })) });
      }
      case 'GkOrdnen': {
        for (const mv of v.m) if (!P.mediaIds.includes(mv.id)) return { productReorderMedia: { job: null, mediaUserErrors: [{ field: ['moves'], message: 'unbekannt' }] } };
        if (!S.f.ordnenNie) S.job = { moves: v.m, rest: S.f.ordnenNach };
        return { productReorderMedia: { job: { id: 'gid://shopify/Job/1', done: false }, mediaUserErrors: [] } };
      }
      default: throw new Error('Attrappe: unbekannte Operation ' + op);
    }
  }
  async function upload(ziel, buf, name, mime) {
    const s = S.staged.get(ziel.url);
    if (!s) throw new Error('Attrappe: Staged-Ziel unbekannt');
    if (s.mime !== mime) throw new Error('Attrappe: mime passt nicht');
    S.uploads++;
    const m = T.bildMasse(buf);
    S.hoch.set(s.res, { filename: name, w: m?.breite, h: m?.hoehe, bytes: buf.length });
  }
  const zustand = () => JSON.stringify({
    title: P.title, desc: P.descriptionHtml, seo: P.seo, opt: P.options, var: P.variants.map((v) => [v.id, v.sku, v.price, v.media]),
    media: P.mediaIds.map((id) => [id, dateien.get(id)?.alt]), meta: [...P.meta].sort(),
  });
  return { S, P, dateien, zustand, io: { gql, upload, warte: async () => {}, jetzt: () => Date.parse('2026-11-11T21:00:00Z'), log: (t) => S.log.push(String(t)) } };
}

function fixture(dir, aendern = (p) => p) {
  writeFileSync(join(dir, 'a_schwarz.jpg'), jpeg(800, 800, 'A'));
  writeFileSync(join(dir, 'b_braun.png'), png(800, 800));
  writeFileSync(join(dir, 'c_detail.jpg'), jpeg(720, 720, 'C'));
  const plan = {
    handle: HANDLE, machbar: true, hauptbild: join(dir, 'a_schwarz.jpg'), kontaktbogen: '/x.jpg',
    medien_loesen: [{ media_id: MI(101), url: 'u', grund: 'Etikett' }, { media_id: MI(103), url: 'u', grund: 'Etikett' }, { media_id: MI(104), url: 'u', grund: 'Etikett' }],
    neue_bilder: [
      { datei: join(dir, 'a_schwarz.jpg'), aus_media_id: MI(103), alt: 'Gürtel Schwarz', breite: 800, hoehe: 800, position: 0, varianten_ids: [VA(1)] },
      { datei: join(dir, 'b_braun.png'), aus_media_id: MI(104), alt: 'Gürtel Braun', breite: 800, hoehe: 800, position: 2, varianten_ids: [VA(2)] },
      { datei: join(dir, 'c_detail.jpg'), alt: 'Gürtel Detail', breite: 720, hoehe: 720, position: 4, varianten_ids: [] },
    ],
    titel_neu: 'Echtleder-Gürtel Testprodukt',
    html_paare: [
      { alt: 'aus hochwertigem Leder', neu: 'aus Leder', treffer: 1 },
      { alt: '<strong>Material:</strong> Denim</li>', neu: '<strong>Material:</strong> Rindsleder</li>', treffer: 1 },
      { alt: '<li>Länge: Regulär (50cm &lt; Länge ≤ 65cm)</li>', neu: '<li>Länge: Regulär (50cm &lt; Länge ≤ 65cm)</li>\n<li>Grössen: asiatisch</li>', treffer: 1 },
    ],
    optionen: [{ option: 'Farbe', alt: 'Ausländische Version Grau', neu: 'Grau' }],
    metafelder: [
      { namespace: 'mm-google-shopping', key: 'color', typ: 'single_line_text_field', alt: 'Gold', neu: '' },
      { namespace: 'mm-google-shopping', key: 'custom_product', typ: 'boolean', alt: 'true', neu: 'false' },
      { namespace: 'global', key: 'title_tag', typ: 'string', alt: 'Alt SEO | LuxeStyle CH', neu: 'Neu SEO | LuxeStyle CH' },
      { namespace: 'global', key: 'description_tag', typ: 'string', alt: 'Alte SEO-Beschreibung', neu: 'Neue SEO-Beschreibung' },
    ],
    offen: ['nur Test'],
  };
  return aendern(plan) || plan;
}
const cfgVon = (dir, plan, x = {}) => ({ plaene: { plans: { [HANDLE]: plan }, urteile: {} }, live: false, zurueck: false, nur: null, sicherung: join(dir, 'sicherung.json'), ledger: join(dir, 'ledger.txt'), ...x });
const mutationen = (S, ab = 0) => S.aufrufe.slice(ab).filter((o) => MUT.has(o));
const LIVE = { live: true, nur: [HANDLE] };
const ERWARTET_REIHE = (S) => { const neu = (alt) => [...S.dateien.values()].find((d) => d.alt === alt)?.id; return [neu('Gürtel Schwarz'), MI(102), neu('Gürtel Braun'), MI(105), neu('Gürtel Detail'), MI(106), 'gid://shopify/Video/107']; };

// ── Testrahmen ─────────────────────────────────────────────────────────────────────────────────
let ok = 0, rot = 0;
const fehlerListe = [];
function pruefe(name, bed, detail = '') { if (bed) ok++; else { rot++; fehlerListe.push(`${name}${detail ? ': ' + detail : ''}`); } }
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
async function mitDir(fn) { const dir = mkdtempSync(join(tmpdir(), 'gk-')); try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); } }
const ledgerText = (dir) => (existsSync(join(dir, 'ledger.txt')) ? readFileSync(join(dir, 'ledger.txt'), 'utf8') : '');
const sich = (dir) => JSON.parse(readFileSync(join(dir, 'sicherung.json'), 'utf8'));
const logText = (S) => S.log.join('\n');

// ── reine Bausteine ──
test('bildMasse JPEG/PNG/kaputt', async () => {
  pruefe('jpeg', JSON.stringify(T.bildMasse(jpeg(812, 640))) === JSON.stringify({ typ: 'jpeg', mime: 'image/jpeg', hoehe: 640, breite: 812 }), JSON.stringify(T.bildMasse(jpeg(812, 640))));
  const pm = T.bildMasse(png(1000, 999));
  pruefe('png', pm && pm.typ === 'png' && pm.breite === 1000 && pm.hoehe === 999, JSON.stringify(pm));
  pruefe('kaputt', T.bildMasse(Buffer.from('GIF89a................................')) === null);
  pruefe('jpeg ohne SOF', T.bildMasse(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])) === null);
});
test('bildMasse an den echten Plan-Dateien', async () => {
  const pf = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/gmc1111/korr/alle_plaene.json';
  if (!existsSync(pf)) return;
  const j = JSON.parse(readFileSync(pf, 'utf8'));
  let n = 0;
  for (const [h, p] of Object.entries(j.plans)) {
    pruefe(`planPruefen ${h}`, T.planPruefen(h, p).length === 0, T.planPruefen(h, p).join(' · '));
    for (const b of p.neue_bilder) { if (!existsSync(b.datei)) continue; const m = T.bildMasse(readFileSync(b.datei)); n++; pruefe(`Masse ${b.datei.split('/').pop()}`, m && m.breite === b.breite && m.hoehe === b.hoehe, JSON.stringify(m)); }
  }
  pruefe('echte Bilder gelesen', n >= 30, String(n));
});
test('zielReihe: Hauptbild alt, Lücken, Video am Ende', async () => {
  pruefe('Uhr', JSON.stringify(T.zielReihe({ rest: ['H'], hauptbildAlt: 'W', neue: [2, 3, 4, 5, 6, 7, 8].map((p) => ({ id: 'n' + p, position: p })) })) === JSON.stringify(['W', 'H', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']));
  pruefe('Kariert', JSON.stringify(T.zielReihe({ rest: ['m2', 'm8', 'm9', 'm10', 'm11'], hauptbildAlt: 'm0', neue: [{ id: 'G', position: 2 }, { id: 'R', position: 5 }, { id: 'D', position: 7 }] })) === JSON.stringify(['m0', 'm2', 'G', 'm8', 'm9', 'R', 'm10', 'D', 'm11']));
  pruefe('neues Hauptbild', JSON.stringify(T.zielReihe({ rest: ['x', 'v'], neue: [{ id: 'A', position: 0 }, { id: 'B', position: 2 }] })) === JSON.stringify(['A', 'x', 'B', 'v']));
  let wirft = false; try { T.zielReihe({ rest: ['x'], neue: [{ id: 'A', position: 5 }] }); } catch { wirft = true; }
  pruefe('position hinter dem Ende wirft', wirft);
  wirft = false; try { T.zielReihe({ rest: ['x'], hauptbildAlt: 'H', neue: [{ id: 'A', position: 0 }] }); } catch { wirft = true; }
  pruefe('position 0 bei altem Hauptbild wirft', wirft);
});
test('beschreibungAnwenden: wörtlich, genau 1, Reihenfolge, Schreibweise', async () => {
  const r = T.beschreibungAnwenden(DESC, fixture(mkdtempSync(join(tmpdir(), 'gk-'))).html_paare);
  pruefe('Ergebnis', r.html === DESC_SOLL && !r.fehler.length, JSON.stringify(r));
  const z = T.beschreibungAnwenden('a b a', [{ alt: 'a', neu: 'c' }]);
  pruefe('2 Treffer = Fehler', z.fehler.length === 1 && z.html === 'a b a');
  const n = T.beschreibungAnwenden('x', [{ alt: 'y', neu: 'z' }]);
  pruefe('0 Treffer = Fehler', n.fehler.length === 1);
  const k = T.beschreibungAnwenden('abc', [{ alt: 'abc', neu: 'abc abc' }, { alt: 'abc', neu: 'd' }]);
  pruefe('Zwischenstand zählt', k.fehler.length === 1 && /nach den vorigen Paaren 2/.test(k.fehler[0]), JSON.stringify(k.fehler));
  const e = T.beschreibungAnwenden('<li>50cm &lt; 65cm</li>', [{ alt: '<li>50cm < 65cm</li>', neu: 'x' }]);
  pruefe('unmaskiert trifft nicht, Hinweis auf Schreibweise', e.fehler.length === 1 && /anderer Schreibweise/.test(e.fehler[0]) && e.html === '<li>50cm &lt; 65cm</li>', JSON.stringify(e));
  const g = T.beschreibungAnwenden('<li>50cm &lt; 65cm</li>', [{ alt: '50cm &lt; 65cm', neu: '50 bis 65 cm' }]);
  pruefe('maskiert trifft wörtlich', g.html === '<li>50 bis 65 cm</li>' && !g.fehler.length);
  const d = T.beschreibungAnwenden('xaby', [{ alt: 'ab', neu: "[$&|$'|$`]" }]);
  pruefe('Ersatz ohne $-Muster', d.html === "x[$&|$'|$`]y", d.html);
});
test('seoGleich: null bei Titelgleichheit', async () => {
  pruefe('gleich', T.seoGleich('a', 'a', 't')); pruefe('null = Titel', T.seoGleich(null, 't', 't')); pruefe('null ≠ anderes', !T.seoGleich(null, 'x', 't'));
  pruefe('leer = null', T.seoGleich(null, '', null)); pruefe('ungleich', !T.seoGleich('a', 'b', 'a'));
});
test('schreibSperre: Mutation im Trockenlauf verweigert', async () => {
  let n = 0; const g = T.schreibSperre(false, async () => { n++; return {}; });
  let wirft = false; try { await g('mutation GkProdukt { x }', {}); } catch { wirft = true; }
  pruefe('wirft', wirft); pruefe('nicht weitergereicht', n === 0);
  await g('query GkLesen { x }', {}); pruefe('Abfrage geht durch', n === 1);
  await T.schreibSperre(true, async () => { n++; return {}; })('  mutation GkProdukt { x }', {}); pruefe('LIVE geht durch', n === 2);
});

// ── Lauf ──
test('Trockenlauf schreibt nichts', async () => mitDir(async (dir) => {
  const { S, io, zustand } = neuerShop(); const z0 = zustand();
  const r = await T.lauf(cfgVon(dir, fixture(dir)), io);
  pruefe('exit 0', r.exit === 0, String(r.exit) + logText(S));
  pruefe('keine Mutation', mutationen(S).length === 0, mutationen(S).join(','));
  pruefe('kein Upload', S.uploads === 0);
  pruefe('Zustand gleich', zustand() === z0);
  pruefe('keine Sicherung, kein Ledger', !existsSync(join(dir, 'sicherung.json')) && !existsSync(join(dir, 'ledger.txt')));
  const t = logText(S);
  for (const w of ['1 Neue Bilder', '2 Varianten binden', '3 Titel', '4 Optionswerte', '5 Metafelder', '6 Lösen: 3 von 3', '7 Reihenfolge: 0 NEU a_schwarz.jpg | 1 102 | 2 NEU b_braun.png | 3 105 | 4 NEU c_detail.jpg | 5 106 | 6 107', 'Trockenlauf: nichts geschrieben', 'mm-google-shopping.color löschen'])
    pruefe(`Ausgabe «${w}»`, t.includes(w), t.slice(0, 3000));
}));
test('Vollauf: alles im Soll, richtige Reihenfolge der Schritte', async () => mitDir(async (dir) => {
  const { S, P, io, dateien } = neuerShop();
  let sicherungVorErsterMutation = null;
  S.hooks.vorAufruf = (op) => { if (MUT.has(op) && sicherungVorErsterMutation === null) sicherungVorErsterMutation = existsSync(join(dir, 'sicherung.json')) && !!sich(dir)[HANDLE]?.produkt; };
  const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  pruefe('exit 0', r.exit === 0, String(r.exit) + '\n' + logText(S));
  pruefe('Sicherung vor der ersten Mutation', sicherungVorErsterMutation === true);
  const reihe = ERWARTET_REIHE(S);
  pruefe('Galerie', JSON.stringify(P.mediaIds) === JSON.stringify(reihe), JSON.stringify(P.mediaIds));
  pruefe('Titel', P.title === 'Echtleder-Gürtel Testprodukt');
  pruefe('Beschreibung', P.descriptionHtml === DESC_SOLL, P.descriptionHtml);
  pruefe('SEO', P.seo.title === 'Neu SEO | LuxeStyle CH' && P.seo.description === 'Neue SEO-Beschreibung', JSON.stringify(P.seo));
  pruefe('Option', P.options[0].optionValues.find((v) => v.id === OV(4)).name === 'Grau');
  pruefe('Metafeld gelöscht', !P.meta.has('mm-google-shopping.color'));
  pruefe('Metafeld gesetzt', P.meta.get('mm-google-shopping.custom_product')?.value === 'false' && P.meta.get('mm-google-shopping.custom_product')?.type === 'boolean');
  pruefe('fremdes Metafeld unberührt', P.meta.get('judgeme.badge')?.value === 'x');
  pruefe('V1 → neu Schwarz', JSON.stringify(P.variants[0].media) === JSON.stringify([reihe[0]]));
  pruefe('V2 → neu Braun', JSON.stringify(P.variants[1].media) === JSON.stringify([reihe[2]]));
  pruefe('V3, V4 unverändert', P.variants[2].media[0] === MI(105) && P.variants[3].media[0] === MI(106));
  pruefe('genau 3 neue Dateien', S.angelegt === 3 && S.uploads === 3, `${S.angelegt}/${S.uploads}`);
  pruefe('gelöste Dateien bleiben', [101, 103, 104].every((n) => dateien.has(MI(n)) && !dateien.get(MI(n)).refs.has(PID)));
  pruefe('PNG als image/png', [...S.staged.values()].some((x) => x.filename === 'b_braun.png' && x.mime === 'image/png'));
  const ops = S.aufrufe;
  const zuerst = (o) => ops.indexOf(o), zuletzt = (o) => ops.lastIndexOf(o);
  const ersteEntfernen = ops.findIndex((o, i) => o === 'GkDateiRef');
  pruefe('Upload vor Binden', zuletzt('GkMedienNeu') < zuerst('GkVarLoesen'));
  pruefe('Binden vor productUpdate', zuletzt('GkVarHaengen') < zuerst('GkProdukt'));
  pruefe('productUpdate vor Option vor Metafeldern', zuerst('GkProdukt') < zuerst('GkOption') && zuerst('GkOption') < zuerst('GkMetaSetzen'));
  pruefe('Metafelder vor Lösen', zuletzt('GkMetaLoeschen') < ersteEntfernen);
  pruefe('Lösen vor Ordnen', ersteEntfernen < zuerst('GkOrdnen') && zuerst('GkOrdnen') === zuletzt('GkOrdnen'));
  const s = sich(dir)[HANDLE];
  pruefe('Sicherung: alter Titel, alle Medien, Bindungen, Metafelder', s.produkt.title === 'Echtleder-Gürtel Gold Alt' && s.medien.length === 7 && s.varianten[0].media[0] === MI(103) && s.metafelder.find((m) => m.key === 'color').value === 'Gold' && s.produkt.seo.title === 'Alt SEO | LuxeStyle CH');
  pruefe('Journal fertig', Object.values(s.bilder).length === 3 && Object.values(s.bilder).every((j) => j.status === 'fertig' && j.neu && j.sha256));
  pruefe('Ledger', /GESCHRIEBEN_OK/.test(ledgerText(dir)), ledgerText(dir));
  pruefe('Sperre weg', !existsSync(join(dir, 'sicherung.json.lock')));
}));
test('zweiter Lauf idempotent, Sicherung bleibt', async () => mitDir(async (dir) => {
  const { S, io, zustand } = neuerShop();
  const plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  const z1 = zustand(), ab = S.aufrufe.length, up = S.uploads;
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S));
  pruefe('keine Mutation', mutationen(S, ab).length === 0, mutationen(S, ab).join(','));
  pruefe('kein Upload', S.uploads === up);
  pruefe('Zustand gleich', zustand() === z1);
  pruefe('Sicherung hat weiter den alten Titel', sich(dir)[HANDLE].produkt.title === 'Echtleder-Gürtel Gold Alt');
  pruefe('Ledger SCHON_IM_SOLL', /SCHON_IM_SOLL/.test(ledgerText(dir)));
  const t = await T.lauf(cfgVon(dir, plan), io);
  pruefe('Trockenlauf danach exit 0', t.exit === 0 && /Alles schon im Soll/.test(logText(S)));
}));
async function blockiert(name, dir, plan, shopAendern = () => {}, muster = null) {
  const sh = neuerShop(); shopAendern(sh);
  const z0 = sh.zustand();
  const r = await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  pruefe(`${name}: exit 3`, r.exit === 3, `${r.exit} ${logText(sh.S).slice(-600)}`);
  pruefe(`${name}: keine Mutation`, mutationen(sh.S).length === 0, mutationen(sh.S).join(','));
  pruefe(`${name}: Zustand gleich`, sh.zustand() === z0);
  pruefe(`${name}: Ledger ABGELEHNT`, /ABGELEHNT/.test(ledgerText(dir)));
  if (muster) pruefe(`${name}: Grund`, muster.test(logText(sh.S)), logText(sh.S).slice(-800));
  return sh;
}
test('html-Paar 0 Treffer bricht ab', async () => mitDir((dir) => blockiert('0 Treffer', dir, fixture(dir, (p) => { p.html_paare[1].alt = '<strong>Material:</strong> Seide</li>'; }), undefined, /Paar 2 .*0× in der Beschreibung/)));
test('html-Paar 2 Treffer bricht ab', async () => mitDir((dir) => blockiert('2 Treffer', dir, fixture(dir), (sh) => { sh.P.descriptionHtml = DESC + '<p>Auch aus hochwertigem Leder.</p>'; }, /Paar 1 .*2× in der Beschreibung/)));
test('html-Paar mit «<» statt «&lt;»: Hinweis auf Schreibweise', async () => mitDir((dir) => blockiert('Schreibweise', dir, fixture(dir, (p) => { p.html_paare[2].alt = '<li>Länge: Regulär (50cm < Länge ≤ 65cm)</li>'; }), undefined, /anderer Schreibweise 1×/)));
test('fehlende media_id bricht ab', async () => mitDir((dir) => blockiert('media_id', dir, fixture(dir, (p) => { p.medien_loesen.push({ media_id: MI(999), url: 'u', grund: 'x' }); }), undefined, /media_id 999 \(medien_loesen\) gibt es am Produkt nicht/)));
test('fehlende aus_media_id bricht ab', async () => mitDir((dir) => blockiert('aus_media_id', dir, fixture(dir, (p) => { p.neue_bilder[2].aus_media_id = MI(998); }), undefined, /aus_media_id 998/)));
test('Variante ohne Bild nach Plan bricht ab (Bild wird gelöst)', async () => mitDir((dir) => blockiert('gelöst', dir, fixture(dir, (p) => { p.medien_loesen.push({ media_id: MI(105), url: 'u', grund: 'x' }); }), undefined, /SKU-3: ihr Bild 105 wird gelöst/)));
test('Variante ohne Bild nach Plan bricht ab (heute ohne Bild)', async () => mitDir((dir) => blockiert('ohne', dir, fixture(dir), (sh) => { sh.P.variants[3].media = []; }, /SKU-4 hat kein Bild/)));
test('geplante Variante fehlt am Produkt', async () => mitDir((dir) => blockiert('Variante fehlt', dir, fixture(dir, (p) => { p.neue_bilder[2].varianten_ids = [VA(77)]; }), undefined, /Variante 77 gibt es am Produkt nicht/)));
test('lokale Datei: nicht quadratisch, zu klein, fehlt, falsche Masse', async () => {
  await mitDir((dir) => blockiert('nicht quadratisch', dir, fixture(dir, (p) => { writeFileSync(join(dir, 'c2.jpg'), jpeg(800, 720)); p.neue_bilder[2].datei = join(dir, 'c2.jpg'); p.neue_bilder[2].breite = 800; p.neue_bilder[2].hoehe = 720; }), undefined, /nicht quadratisch/));
  await mitDir((dir) => blockiert('zu klein', dir, fixture(dir, (p) => { writeFileSync(join(dir, 'c3.jpg'), jpeg(600, 600)); p.neue_bilder[2].datei = join(dir, 'c3.jpg'); p.neue_bilder[2].breite = 600; p.neue_bilder[2].hoehe = 600; }), undefined, /kleiner als 700/));
  await mitDir((dir) => blockiert('fehlt', dir, fixture(dir, (p) => { p.neue_bilder[2].datei = join(dir, 'gibtsnicht.jpg'); }), undefined, /Datei fehlt/));
  await mitDir((dir) => blockiert('Masse', dir, fixture(dir, (p) => { p.neue_bilder[2].breite = 1000; p.neue_bilder[2].hoehe = 1000; }), undefined, /der Plan sagt 1000×1000/));
  await mitDir((dir) => blockiert('kein Bild', dir, fixture(dir, (p) => { writeFileSync(join(dir, 'c.gif'), Buffer.from('GIF89a'.padEnd(64, '.'))); p.neue_bilder[2].datei = join(dir, 'c.gif'); }), undefined, /weder JPEG noch PNG/));
});
test('weniger als 3 Bilder bleiben', async () => mitDir((dir) => blockiert('<3', dir, fixture(dir, (p) => {
  p.neue_bilder = p.neue_bilder.slice(0, 2); p.neue_bilder[0].varianten_ids = [VA(1), VA(3), VA(4)];
  p.medien_loesen = [101, 102, 103, 104, 105, 106].map((n) => ({ media_id: MI(n), url: 'u', grund: 'x' }));
}), undefined, /danach nur 2 Bilder/)));
test('Option: Wert fehlt / Kollision', async () => {
  await mitDir((dir) => blockiert('Wert fehlt', dir, fixture(dir, (p) => { p.optionen[0].alt = 'Lila'; }), undefined, /Wert «Lila» gibt es nicht/));
  await mitDir((dir) => blockiert('Kollision', dir, fixture(dir, (p) => { p.optionen[0].neu = 'Gold'; }), undefined, /gibt es beide/));
  await mitDir((dir) => blockiert('Option fehlt', dir, fixture(dir, (p) => { p.optionen[0].option = 'Grösse'; }), undefined, /Option «Grösse» gibt es nicht/));
});
test('Metafeld: anderer Wert oder Typ', async () => {
  await mitDir((dir) => blockiert('Wert', dir, fixture(dir), (sh) => { sh.P.meta.set('mm-google-shopping.color', { type: 'single_line_text_field', value: 'Rot' }); }, /Metafeld mm-google-shopping.color ist «Rot»/));
  await mitDir((dir) => blockiert('Typ', dir, fixture(dir), (sh) => { sh.P.meta.set('mm-google-shopping.custom_product', { type: 'single_line_text_field', value: 'true' }); }, /custom_product ist «true» \(Typ single_line_text_field\)/));
  await mitDir((dir) => blockiert('SEO', dir, fixture(dir), (sh) => { sh.P.seo.title = 'Fremd'; }, /SEO title ist «Fremd»/));
});
test('unbekanntes Medium am Produkt bricht ab', async () => mitDir(async (dir) => {
  const { S, P, io, dateien } = neuerShop(); const plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  dateien.set(MI(555), { id: MI(555), alt: 'fremd', typ: 'IMAGE', url: 'u', status: 'READY', refs: new Set([PID]), w: 800, h: 800 }); P.mediaIds.push(MI(555));
  const ab = S.aufrufe.length;
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('fremdes Medium nach dem Lauf: exit 3', r.exit === 3 && /unbekannte Medien am Produkt.*555/.test(logText(S)), logText(S).slice(-400));
  pruefe('fremdes Medium: keine Mutation', mutationen(S, ab).length === 0);
}));
test('Netzfehler mitten im Upload: Antwort verloren, Bild angelegt, kein Doppel', async () => mitDir(async (dir) => {
  const { S, P, io, dateien } = neuerShop({ medienNachher: 1 });
  const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-800));
  pruefe('genau 3 angelegt', S.angelegt === 3, String(S.angelegt));
  pruefe('genau 3 Uploads', S.uploads === 3 && S.aufrufe.filter((o) => o === 'GkMedienNeu').length === 3);
  pruefe('Schwarz genau einmal', [...dateien.values()].filter((d) => d.alt === 'Gürtel Schwarz').length === 1);
  pruefe('Hinweis im Protokoll', /Antwort war «Ausnahme ECONNRESET/.test(logText(S)));
  pruefe('Galerie im Soll', JSON.stringify(P.mediaIds) === JSON.stringify(ERWARTET_REIHE(S)));
}));
test('Netzfehler vor dem Anlegen: Abbruch, nächster Lauf lädt nicht nochmal hoch', async () => mitDir(async (dir) => {
  const { S, io, zustand } = neuerShop({ medienVorher: 1 });
  const z0 = zustand();
  const plan = fixture(dir);
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('exit 4', r.exit === 4, logText(S).slice(-600));
  pruefe('nichts angelegt', S.angelegt === 0);
  pruefe('Produkt unverändert', zustand() === z0);
  const j = Object.values(sich(dir)[HANDLE].bilder);
  pruefe('Journal ausstehend', j.length === 1 && j[0].status === 'ausstehend' && j[0].vorher.length === 7, JSON.stringify(j));
  pruefe('Ledger ABBRUCH', /ABBRUCH/.test(ledgerText(dir)));
  const ab = S.aufrufe.length, up = S.uploads;
  const r2 = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('zweiter Lauf exit 3', r2.exit === 3, logText(S).slice(-600));
  pruefe('zweiter Lauf: kein Upload, keine Mutation', S.uploads === up && mutationen(S, ab).length === 0, mutationen(S, ab).join(','));
  pruefe('Hinweis «Kein zweiter Upload»', /Kein zweiter Upload/.test(logText(S)));
}));
test('ausstehender Upload, der doch ankam, wird übernommen', async () => mitDir(async (dir) => {
  const sh = neuerShop({ medienNachher: 1 });
  const plan = fixture(dir);
  // Antwort verloren UND das Bild erscheint erst später: erster Lauf findet es nicht (Attrappe versteckt es 3 Lesungen lang)
  let versteckt = null;
  const orig = sh.io.gql;
  sh.io.gql = async (q, v) => { const d = await orig(q, v); if (versteckt && d?.productByIdentifier && versteckt.n-- > 0) d.productByIdentifier.media.nodes = d.productByIdentifier.media.nodes.filter((m) => m.id !== versteckt.id); return d; };
  sh.S.hooks.vorAufruf = (op) => { if (op === 'GkMedienNeu' && !versteckt) versteckt = { id: `gid://shopify/MediaImage/${sh.S.seq + 1}`, n: 3 }; };
  const r = await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  pruefe('erster Lauf exit 4', r.exit === 4, logText(sh.S).slice(-500));
  pruefe('Journal ausstehend', Object.values(sich(dir)[HANDLE].bilder)[0].status === 'ausstehend');
  const up = sh.S.uploads;
  const r2 = await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  pruefe('zweiter Lauf exit 0', r2.exit === 0, logText(sh.S).slice(-800));
  pruefe('übernommen statt neu hochgeladen', /übernommen: a_schwarz.jpg/.test(logText(sh.S)) && sh.S.uploads === up + 2, `${sh.S.uploads - up}`);
  pruefe('Schwarz genau einmal', [...sh.dateien.values()].filter((d) => d.alt === 'Gürtel Schwarz').length === 1);
}));
test('verzögertes READY', async () => mitDir(async (dir) => {
  const { S, P, io } = neuerShop({ readyNach: 6 });
  const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-800));
  pruefe('Varianten gebunden', P.variants[0].media.length === 1 && P.variants[0].media[0] !== MI(103));
}));
test('READY kommt nie / FAILED', async () => mitDir(async (dir) => {
  const { S, io } = neuerShop({ readyNach: 1000 });
  const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  pruefe('exit 4', r.exit === 4 && /nicht READY/.test(logText(S)), logText(S).slice(-300));
  pruefe('nichts gebunden, nichts gelöst', !S.aufrufe.includes('GkVarHaengen') && !S.aufrufe.includes('GkDateiRef'));
}));
test('Reihenfolge-Hintergrundauftrag (verzögert und nie)', async () => {
  await mitDir(async (dir) => {
    const { S, P, io } = neuerShop({ ordnenNach: 5 });
    const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
    pruefe('verzögert: exit 0', r.exit === 0, logText(S).slice(-500));
    pruefe('verzögert: Galerie', JSON.stringify(P.mediaIds) === JSON.stringify(ERWARTET_REIHE(S)));
    pruefe('verzögert: ein Auftrag', S.aufrufe.filter((o) => o === 'GkOrdnen').length === 1);
  });
  await mitDir(async (dir) => {
    const { S, io } = neuerShop({ ordnenNie: true });
    const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
    pruefe('nie: exit 5', r.exit === 5, logText(S).slice(-500));
    pruefe('nie: Ledger ABWEICHUNG Reihenfolge', /ABWEICHUNG · .*Reihenfolge nach 60 s/.test(ledgerText(dir)), ledgerText(dir));
    pruefe('nie: kein zweiter Auftrag', S.aufrufe.filter((o) => o === 'GkOrdnen').length === 1);
  });
});
test('Rücklesen erkennt still ignoriertes Feld', async () => {
  for (const [feld, muster] of [['descriptionHtml', /Beschreibung ≠ Soll/], ['title', /Titel «Echtleder-Gürtel Gold Alt»/], ['meta', /Metafeld mm-google-shopping/], ['alt', /.*/], ['option', /Optionswert/], ['seo', /SEO/]]) {
    await mitDir(async (dir) => {
      const { S, io } = neuerShop({ ignorieren: [feld] });
      const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
      if (feld === 'alt') { pruefe('alt ignoriert: kein «OK»', r.exit !== 0 && !/GESCHRIEBEN_OK/.test(ledgerText(dir)), `${r.exit}`); return; }
      pruefe(`${feld} ignoriert: Exit ≠ 0`, r.exit === 5 || r.exit === 4, `${r.exit} ${logText(S).slice(-400)}`);
      pruefe(`${feld} ignoriert: gemeldet`, muster.test(logText(S)), logText(S).slice(-600));
      pruefe(`${feld} ignoriert: kein GESCHRIEBEN_OK`, !/GESCHRIEBEN_OK/.test(ledgerText(dir)));
    });
  }
});
test('Rücklesen erkennt geänderte Kernfelder und gelöschte Dateien', async () => {
  await mitDir(async (dir) => { const { S, io } = neuerShop({ preisAendern: true }); const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io); pruefe('Preis: exit 5', r.exit === 5 && /Kernfelder/.test(logText(S)), logText(S).slice(-300)); });
  await mitDir(async (dir) => { const { S, io } = neuerShop({ loeschtDatei: true }); const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io); pruefe('Datei weg: exit 5', r.exit === 5 && /nicht mehr unter Inhalt > Dateien/.test(logText(S)), logText(S).slice(-300)); });
});
test('SEO-Titel gleich Produkttitel wird als null gespeichert', async () => mitDir(async (dir) => {
  const { S, P, io } = neuerShop();
  const r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.metafelder[2].neu = p.titel_neu; }), LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-500));
  pruefe('Shopify-Attrappe speichert null', P.seo.title === null);
  const ab = S.aufrufe.length;
  const r2 = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.metafelder[2].neu = p.titel_neu; }), LIVE), io);
  pruefe('zweiter Lauf: null gilt als erledigt', r2.exit === 0 && mutationen(S, ab).length === 0, logText(S).slice(-400));
  const z = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.metafelder[2].neu = p.titel_neu; }), { zurueck: true, ...LIVE }), io);
  pruefe('Rücknahme: SEO null gilt als Ziel, nicht als fremd', z.exit === 0 && P.seo.title === 'Alt SEO | LuxeStyle CH', logText(S).slice(-400));
}));
test('Anhängen scheitert: Variante bekommt ihr altes Bild zurück, nichts gelöst', async () => mitDir(async (dir) => {
  const { S, P, io, zustand } = neuerShop({ haengenFehler: 1 });
  const z0 = zustand();
  const plan = fixture(dir);
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('exit 4', r.exit === 4, logText(S).slice(-500));
  pruefe('V1 hat ihr altes Bild', JSON.stringify(P.variants[0].media) === JSON.stringify([MI(103)]), JSON.stringify(P.variants[0].media));
  pruefe('nichts gelöst', P.mediaIds.includes(MI(101)) && P.mediaIds.includes(MI(103)));
  pruefe('Ausgleich gemeldet', /Ausgleich: 1 Varianten haben ihr altes Bild zurück/.test(logText(S)));
  const r2 = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('Wiederaufnahme exit 0', r2.exit === 0, logText(S).slice(-500));
  pruefe('Wiederaufnahme ohne neuen Upload', S.uploads === 3 && S.angelegt === 3);
  pruefe('Wiederaufnahme Galerie', JSON.stringify(P.mediaIds) === JSON.stringify(ERWARTET_REIHE(S)));
  const r3 = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), io);
  pruefe('Rücknahme nach Abbruch + Wiederaufnahme: exit 0', r3.exit === 0, logText(S).slice(-500));
  pruefe('Rücknahme nach Abbruch + Wiederaufnahme: wie vorher', zustand() === z0);
}));
test('altes Medium mit gleichem Alt-Text wie ein neues Bild', async () => mitDir(async (dir) => {
  const { S, P, io, dateien } = neuerShop();
  dateien.get(MI(102)).alt = 'Gürtel Detail';
  const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-500));
  const c = [...dateien.values()].filter((d) => d.alt === 'Gürtel Detail').map((d) => d.id);
  pruefe('neues Detailbild ist nicht das alte', c.length === 2 && P.mediaIds[4] !== MI(102) && c.includes(P.mediaIds[4]) && P.mediaIds[1] === MI(102), JSON.stringify(P.mediaIds));
}));
test('vor dem Lösen frisch prüfen: fremde Bindung und still ignoriertes Anhängen', async () => {
  await mitDir(async (dir) => {
    const { S, P, io } = neuerShop();
    let n = 0;
    S.hooks.vorAufruf = (op) => { if (op === 'GkProdukt' && n++ === 0) P.variants[2].media = [MI(101)]; };
    const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
    pruefe('fremde Bindung: exit 4', r.exit === 4 && /hängen noch 1 Varianten an zu lösenden Bildern/.test(logText(S)), logText(S).slice(-400));
    pruefe('fremde Bindung: nichts gelöst', !S.aufrufe.includes('GkDateiRef') && P.mediaIds.includes(MI(101)));
  });
  await mitDir(async (dir) => {
    const { S, P, io } = neuerShop();
    const orig = io.gql;
    io.gql = async (q, v) => (/^\s*mutation GkVarHaengen/.test(q) ? { productVariantAppendMedia: { userErrors: [] } } : orig(q, v));
    const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
    pruefe('Anhängen still ignoriert: exit 4', r.exit === 4 && /trägt nicht ihr neues Bild/.test(logText(S)), logText(S).slice(-400));
    pruefe('Anhängen still ignoriert: nichts gelöst', !S.aufrufe.includes('GkDateiRef') && P.mediaIds.includes(MI(103)));
  });
});
test('Lösen scheitert: Varianten ohne Bild bekommen ihr altes zurück', async () => mitDir(async (dir) => {
  const { S, P, io } = neuerShop();
  let n = 0;
  const orig = io.gql;
  io.gql = async (q, v) => { const op = (q.match(/^\s*mutation\s+(\w+)/) || [])[1]; if (op === 'GkVarLoesen' && n++ === 0) { await orig(q, v); throw new Error('ECONNRESET nach dem Lösen'); } return orig(q, v); };
  const r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  pruefe('exit 4', r.exit === 4, logText(S).slice(-400));
  pruefe('V1 hat wieder ein Bild', JSON.stringify(P.variants[0].media) === JSON.stringify([MI(103)]), JSON.stringify(P.variants[0].media));
}));
test('Rücknahme stellt alles her, zweite Rücknahme tut nichts', async () => mitDir(async (dir) => {
  const { S, P, io, zustand, dateien } = neuerShop();
  const z0 = zustand(), plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('vorher geändert', zustand() !== z0);
  const t = await T.lauf(cfgVon(dir, plan, { zurueck: true }), io);
  pruefe('Rücknahme-Trockenlauf exit 0 ohne Mutation', t.exit === 0 && /Trockenlauf: nichts geschrieben/.test(logText(S)));
  const ab0 = S.aufrufe.length;
  const r = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-800));
  pruefe('Rücknahme schreibt', mutationen(S, ab0).length > 0);
  pruefe('Zustand wie vorher', zustand() === z0, `\n${zustand()}\n${z0}`);
  pruefe('neue Dateien gelöst, nicht gelöscht', [...dateien.values()].filter((d) => /^Gürtel /.test(d.alt)).every((d) => !d.refs.has(PID)) && [...dateien.values()].filter((d) => /^Gürtel /.test(d.alt)).length === 3);
  pruefe('Journal zurückgenommen', Object.values(sich(dir)[HANDLE].bilder).every((j) => j.status === 'zurueckgenommen'));
  pruefe('Ledger ZURUECK_OK', /ZURUECK_OK/.test(ledgerText(dir)));
  const ab = S.aufrufe.length;
  const r2 = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), io);
  pruefe('zweite Rücknahme exit 0', r2.exit === 0);
  pruefe('zweite Rücknahme ohne Mutation', mutationen(S, ab).length === 0, mutationen(S, ab).join(','));
  pruefe('Zustand weiter wie vorher', zustand() === z0);
  // danach wieder vorwärts: dieselben Dateien wieder anhängen, kein Upload
  const up = S.uploads, ab2 = S.aufrufe.length;
  const r3 = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('erneut vorwärts exit 0', r3.exit === 0, logText(S).slice(-600));
  pruefe('erneut vorwärts ohne Upload', S.uploads === up && !S.aufrufe.slice(ab2).includes('GkStaged'));
  pruefe('erneut vorwärts Galerie', JSON.stringify(P.mediaIds) === JSON.stringify(ERWARTET_REIHE(S)));
}));
test('Trockenlauf schreibt auch bei Ablehnung und «schon im Soll» kein Ledger', async () => mitDir(async (dir) => {
  const { S, io } = neuerShop();
  const r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.html_paare[0].alt = 'gibt es nicht'; })), io);
  pruefe('abgelehnt: exit 3', r.exit === 3);
  pruefe('abgelehnt: kein Ledger, keine Sicherung', !existsSync(join(dir, 'ledger.txt')) && !existsSync(join(dir, 'sicherung.json')));
  const plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  const vorher = ledgerText(dir);
  const t = await T.lauf(cfgVon(dir, plan), io);
  pruefe('schon im Soll, Trockenlauf: Ledger unverändert', t.exit === 0 && ledgerText(dir) === vorher);
  await T.lauf(cfgVon(dir, plan, { zurueck: true }), io);
  pruefe('Rücknahme-Trockenlauf: Ledger unverändert', ledgerText(dir) === vorher);
}));
test('neues Metafeld anlegen und bei der Rücknahme wieder löschen', async () => mitDir(async (dir) => {
  const { S, P, io, zustand } = neuerShop();
  const z0 = zustand();
  const plan = fixture(dir, (p) => { p.metafelder.push({ namespace: 'mm-google-shopping', key: 'material', typ: 'single_line_text_field', alt: '', neu: 'Leder' }); });
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-400));
  pruefe('angelegt', P.meta.get('mm-google-shopping.material')?.value === 'Leder');
  pruefe('Sicherung: vorher nicht vorhanden', sich(dir)[HANDLE].metafelder.find((m) => m.key === 'material')?.value === null);
  const z = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), io);
  pruefe('Rücknahme exit 0', z.exit === 0, logText(S).slice(-400));
  pruefe('wieder gelöscht', !P.meta.has('mm-google-shopping.material'));
  pruefe('Zustand wie vorher', zustand() === z0);
}));
test('Rücknahme nach Abbruch mitten im Lauf', async () => mitDir(async (dir) => {
  const { S, io, zustand } = neuerShop({ ordnenNie: true });
  const z0 = zustand(), plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  S.f.ordnenNie = false;
  const r = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-500));
  pruefe('Zustand wie vorher', zustand() === z0);
}));
test('Rücknahme bricht bei fremdem Medium ab', async () => mitDir(async (dir) => {
  const { S, P, io, dateien } = neuerShop(); const plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  dateien.set(MI(556), { id: MI(556), alt: 'fremd', typ: 'IMAGE', url: 'u', status: 'READY', refs: new Set([PID]), w: 800, h: 800 }); P.mediaIds.push(MI(556));
  const ab = S.aufrufe.length;
  const r = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), io);
  pruefe('exit 6', r.exit === 6 && /unbekannte Medien/.test(logText(S)), `${r.exit}`);
  pruefe('keine Mutation', mutationen(S, ab).length === 0);
}));
test('lokale Datei nach dem Hochladen geändert', async () => mitDir(async (dir) => {
  const { S, io } = neuerShop(); const plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), io);
  writeFileSync(join(dir, 'a_schwarz.jpg'), jpeg(800, 800, 'anders'));
  const ab = S.aufrufe.length;
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('exit 3', r.exit === 3 && /seit dem Hochladen geändert/.test(logText(S)), logText(S).slice(-300));
  pruefe('keine Mutation', mutationen(S, ab).length === 0);
}));
test('NUR fehlt bei LIVE wird abgelehnt', async () => mitDir(async (dir) => {
  for (const x of [{ live: true }, { live: true, nur: [] }, { live: true, zurueck: true }]) {
    const { S, io } = neuerShop();
    const r = await T.lauf(cfgVon(dir, fixture(dir), x), io);
    pruefe(`exit 2 ${JSON.stringify(x)}`, r.exit === 2);
    pruefe(`kein Aufruf ${JSON.stringify(x)}`, S.aufrufe.length === 0);
  }
  const env = { PATH: process.env.PATH, LIVE: '1' };
  const c = spawnSync(process.execPath, [W], { env, encoding: 'utf8', timeout: 20000 });
  pruefe('Kommandozeile LIVE ohne NUR: exit 2', c.status === 2, `${c.status} ${c.stdout} ${c.stderr}`);
  pruefe('Kommandozeile nennt NUR', /NUR=/.test(c.stdout));
  const { S, io } = neuerShop();
  const r = await T.lauf(cfgVon(dir, fixture(dir), { live: true, nur: ['gibt-es-nicht'] }), io);
  pruefe('NUR mit unbekanntem Handle: exit 2, kein Aufruf', r.exit === 2 && S.aufrufe.length === 0);
}));
test('Planfehler, machbar false, Sperrdatei', async () => mitDir(async (dir) => {
  let sh = neuerShop();
  let r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.neue_bilder[1].position = 0; })), sh.io);
  pruefe('doppelte position: exit 2, kein Aufruf', r.exit === 2 && sh.S.aufrufe.length === 0);
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.html_paare[0].treffer = 2; })), sh.io);
  pruefe('treffer 2: exit 2', r.exit === 2);
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.hauptbild = MI(101); })), sh.io);
  pruefe('hauptbild in medien_loesen: exit 2', r.exit === 2 && /hauptbild steht auch in medien_loesen/.test(logText(sh.S)));
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.hauptbild = p.neue_bilder[1].datei; })), sh.io);
  pruefe('neues Hauptbild nicht an position 0: exit 2', r.exit === 2 && /muss position 0 haben/.test(logText(sh.S)));
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.neue_bilder[2].varianten_ids = [VA(1)]; })), sh.io);
  pruefe('Variante bei zwei Bildern: exit 2', r.exit === 2 && /Variante steht bei zwei Bildern/.test(logText(sh.S)));
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.neue_bilder[2].alt = p.neue_bilder[1].alt; })), sh.io);
  pruefe('doppelter Alt-Text: exit 2', r.exit === 2 && /ein alt steht doppelt/.test(logText(sh.S)));
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.metafelder.push({ namespace: 'global', key: 'harmonized', typ: 'string', alt: 'a', neu: 'b' }); })), sh.io);
  pruefe('global-Schlüssel unbekannt: exit 2', r.exit === 2);
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir, (p) => { p.zusatz = 1; })), sh.io);
  pruefe('unbekanntes Feld: exit 2', r.exit === 2);
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, { handle: HANDLE, machbar: false, grund_falls_nicht: 'neue Fotos nötig' }, LIVE), sh.io);
  pruefe('machbar false: exit 3, nicht angefasst', r.exit === 3 && mutationen(sh.S).length === 0 && /NICHT_MACHBAR/.test(ledgerText(dir)));
  writeFileSync(join(dir, 'sicherung.json.lock'), 'x');
  sh = neuerShop();
  r = await T.lauf(cfgVon(dir, fixture(dir), LIVE), sh.io);
  pruefe('Sperrdatei: exit 2, keine Mutation', r.exit === 2 && mutationen(sh.S).length === 0);
  pruefe('fremde Sperrdatei bleibt', existsSync(join(dir, 'sicherung.json.lock')));
}));
test('Kariertes-Form: altes Hauptbild, neue Bilder verschränkt, Variante ohne neues Bild bleibt', async () => mitDir(async (dir) => {
  const { S, P, io } = neuerShop();
  const plan = fixture(dir, (p) => {
    p.hauptbild = MI(102);
    p.neue_bilder[0].position = 1; p.neue_bilder[1].position = 3; p.neue_bilder[2].position = 6;
  });
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('exit 0', r.exit === 0, logText(S).slice(-600));
  const neu = (alt) => [...S.dateien.values()].find((d) => d.alt === alt)?.id;
  const soll = [MI(102), neu('Gürtel Schwarz'), MI(105), neu('Gürtel Braun'), MI(106), 'gid://shopify/Video/107', neu('Gürtel Detail')];
  pruefe('Galerie', JSON.stringify(P.mediaIds) === JSON.stringify(soll), JSON.stringify(P.mediaIds));
}));

// ── Gegenprüfung 11.11. (unabhängiger Prüfer): Funde als Regressionstests ──
test('P1 Rücknahme findet ausstehenden Upload: Journal hält die ID, nächster Vorwärtslauf ohne neuen Upload', async () => mitDir(async (dir) => {
  const sh = neuerShop({ medienNachher: 1 });
  const z0 = sh.zustand(), plan = fixture(dir);
  let versteckt = null;
  const orig = sh.io.gql;
  sh.io.gql = async (q, v) => { const d = await orig(q, v); if (versteckt && d?.productByIdentifier && versteckt.n-- > 0) d.productByIdentifier.media.nodes = d.productByIdentifier.media.nodes.filter((m) => m.id !== versteckt.id); return d; };
  sh.S.hooks.vorAufruf = (op) => { if (op === 'GkMedienNeu' && !versteckt) versteckt = { id: MI(sh.S.seq + 1), n: 3 }; };
  const r = await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  pruefe('P1 erster Lauf exit 4', r.exit === 4, logText(sh.S).slice(-400));
  const z = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), sh.io);
  pruefe('P1 Rücknahme exit 0', z.exit === 0, logText(sh.S).slice(-600));
  pruefe('P1 Rücknahme: Produkt wie vorher', sh.zustand() === z0);
  const j = Object.values(sich(dir)[HANDLE].bilder)[0];
  pruefe('P1 Journal: zurückgenommen mit ID', j.status === 'zurueckgenommen' && !!j.neu, JSON.stringify(j));
  const up = sh.S.uploads;
  const r2 = await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  pruefe('P1 Vorwärts danach exit 0', r2.exit === 0, logText(sh.S).slice(-600));
  pruefe('P1 Schwarz nicht neu hochgeladen', sh.S.uploads === up + 2 && [...sh.dateien.values()].filter((d) => d.alt === 'Gürtel Schwarz').length === 1, String(sh.S.uploads - up));
  const z2 = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), sh.io);
  pruefe('P1 zweite Rücknahme exit 0 und wie vorher', z2.exit === 0 && sh.zustand() === z0, logText(sh.S).slice(-400));
}));
test('P2 Plan nach dem ersten LIVE-Lauf um ein Metafeld erweitert: Rücknahme stellt es zurück', async () => mitDir(async (dir) => {
  const { S, P, io, zustand } = neuerShop();
  const z0 = zustand();
  await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  const planB = fixture(dir, (p) => { p.metafelder.push({ namespace: 'judgeme', key: 'badge', typ: 'string', alt: 'x', neu: 'y' }); });
  const r = await T.lauf(cfgVon(dir, planB, LIVE), io);
  pruefe('P2 Plan B exit 0', r.exit === 0, logText(S).slice(-400));
  const z = await T.lauf(cfgVon(dir, planB, { zurueck: true, ...LIVE }), io);
  pruefe('P2 Rücknahme exit 0', z.exit === 0, logText(S).slice(-400));
  pruefe('P2 judgeme.badge wieder x', P.meta.get('judgeme.badge')?.value === 'x', JSON.stringify(P.meta.get('judgeme.badge')));
  pruefe('P2 Zustand wie vorher', zustand() === z0);
}));
test('P3 Plan nach dem LIVE-Lauf ohne ein Bild: altes Journal-Bild am Produkt blockiert', async () => mitDir(async (dir) => {
  const { S, io, zustand } = neuerShop();
  await T.lauf(cfgVon(dir, fixture(dir), LIVE), io);
  const z1 = zustand(), ab = S.aufrufe.length;
  const planB = fixture(dir, (p) => { p.neue_bilder = p.neue_bilder.slice(0, 2); });
  const r = await T.lauf(cfgVon(dir, planB, LIVE), io);
  pruefe('P3 exit 3', r.exit === 3, r.exit + ' ' + logText(S).slice(-500));
  pruefe('P3 keine Mutation', mutationen(S, ab).length === 0, mutationen(S, ab).join(','));
  pruefe('P3 Zustand gleich', zustand() === z1);
  pruefe('P3 Grund', /c_detail\.jpg .*früheren Fassung des Plans/.test(logText(S)), logText(S).slice(-500));
  const z = await T.lauf(cfgVon(dir, planB, { zurueck: true, ...LIVE }), io);
  pruefe('P3 Rücknahme danach exit 0 (räumt auch das alte Bild ab)', z.exit === 0, logText(S).slice(-500));
  const r2 = await T.lauf(cfgVon(dir, planB, LIVE), io);
  const neu = (alt) => [...S.dateien.values()].find((d) => d.alt === alt)?.id;
  pruefe('P3 Plan B danach exit 0', r2.exit === 0, logText(S).slice(-500));
  pruefe('P3 Plan B: Galerie ohne das alte Bild', JSON.stringify(S.P.mediaIds) === JSON.stringify([neu('Gürtel Schwarz'), MI(102), neu('Gürtel Braun'), MI(105), MI(106), 'gid://shopify/Video/107']), JSON.stringify(S.P.mediaIds));
}));
test('P4 Rücknahme nach fremder Änderung: bricht ab, schreibt nichts', async () => {
  for (const [name, aendern] of [
    ['Beschreibung', (sh) => { sh.P.descriptionHtml = '<p>später von anderer Stelle geändert</p>'; }],
    ['Titel', (sh) => { sh.P.title = 'Fremder Titel'; }],
    ['Optionswert', (sh) => { sh.P.options[0].optionValues.find((v) => v.id === OV(4)).name = 'Hellgrau'; }],
    ['Metafeld', (sh) => { sh.P.meta.set('mm-google-shopping.custom_product', { type: 'boolean', value: 'true' }); sh.P.meta.set('mm-google-shopping.color', { type: 'single_line_text_field', value: 'Blau' }); }],
    ['Variante', (sh) => { sh.P.variants[2].media = [MI(106)]; }],
  ]) await mitDir(async (dir) => {
    const sh = neuerShop();
    const plan = fixture(dir);
    await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
    aendern(sh);
    const z1 = sh.zustand(), ab = sh.S.aufrufe.length;
    const r = await T.lauf(cfgVon(dir, plan, { zurueck: true, ...LIVE }), sh.io);
    pruefe(`P4 ${name}: exit 6`, r.exit === 6, r.exit + ' ' + logText(sh.S).slice(-400));
    pruefe(`P4 ${name}: keine Mutation`, mutationen(sh.S, ab).length === 0, mutationen(sh.S, ab).join(','));
    pruefe(`P4 ${name}: Zustand unverändert`, sh.zustand() === z1);
    pruefe(`P4 ${name}: Grund`, /seit dem Vorwärtslauf von anderer Stelle geändert/.test(logText(sh.S)), logText(sh.S).slice(-400));
  });
});
test('P5 html-Paar: überlappende Treffer zählen', async () => {
  const r = T.beschreibungAnwenden('<p>ab ab ab</p>', [{ alt: 'ab ab', neu: 'x' }]);
  pruefe('P5 überlappend 2× = Fehler', r.fehler.length === 1 && /2× in der Beschreibung/.test(r.fehler[0]) && r.html === '<p>ab ab ab</p>', JSON.stringify(r));
  pruefe('P5 zaehle überlappend', T.zaehle('aaa', 'aa') === 2 && T.zaehle('abc', 'b') === 1 && T.zaehle('x', '') === 0);
});
test('P6 SEO-Beschreibung: Null-Regel nur beim Titel', async () => mitDir(async (dir) => {
  const sh = neuerShop();
  sh.P.seo.description = null;
  const plan = fixture(dir, (p) => { p.metafelder[3].alt = sh.P.title; });
  const r = await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  pruefe('P6 exit 3 (leere SEO-Beschreibung ist nicht der Produkttitel)', r.exit === 3 && /SEO description ist/.test(logText(sh.S)), r.exit + ' ' + logText(sh.S).slice(-400));
}));
test('P4b Rücknahme mit ZURUECK_FREMD überschreibt bewusst', async () => mitDir(async (dir) => {
  const sh = neuerShop(); const z0 = sh.zustand(), plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  sh.P.descriptionHtml = '<p>fremd</p>';
  const r = await T.lauf(cfgVon(dir, plan, { zurueck: true, fremdUeberschreiben: true, ...LIVE }), sh.io);
  pruefe('P4b exit 0 und wie vorher', r.exit === 0 && sh.zustand() === z0, logText(sh.S).slice(-400));
  pruefe('P4b Hinweis', /ZURUECK_FREMD=1 gesetzt/.test(logText(sh.S)));
}));
test('P4c Rücknahme-Trockenlauf meldet fremde Änderung', async () => mitDir(async (dir) => {
  const sh = neuerShop(); const plan = fixture(dir);
  await T.lauf(cfgVon(dir, plan, LIVE), sh.io);
  sh.P.title = 'Fremd';
  const ab = sh.S.aufrufe.length;
  const r = await T.lauf(cfgVon(dir, plan, { zurueck: true }), sh.io);
  pruefe('P4c exit 6, keine Mutation', r.exit === 6 && mutationen(sh.S, ab).length === 0 && /von anderer Stelle geändert: Titel/.test(logText(sh.S)), r.exit + logText(sh.S).slice(-300));
}));
test('P8 Sicherung nach Teil-Lauf verloren: kein zweiter Upload', async () => mitDir(async (dir) => {
  const { S, P, io, dateien } = neuerShop({ haengenFehler: 1 });
  const plan = fixture(dir);
  const r = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('P8 erster Lauf exit 4', r.exit === 4, logText(S).slice(-300));
  rmSync(join(dir, 'sicherung.json'));
  const up = S.uploads, ab = S.aufrufe.length;
  const r2 = await T.lauf(cfgVon(dir, plan, LIVE), io);
  pruefe('P8 ohne Sicherung: exit 3', r2.exit === 3, r2.exit + ' ' + logText(S).slice(-500));
  pruefe('P8 ohne Sicherung: kein Upload, keine Mutation', S.uploads === up && mutationen(S, ab).length === 0, `${S.uploads - up} ${mutationen(S, ab).join(',')}`);
  pruefe('P8 kein Bild doppelt', [...dateien.values()].filter((d) => d.alt === 'Gürtel Schwarz').length === 1);
  pruefe('P8 Grund', /schon am Produkt .*aber keine Sicherung/.test(logText(S)), logText(S).slice(-500));
}));
test('P7 Kommandozeile: LIVE mit GK_ZEIT unter 1 abgelehnt', async () => {
  const c = spawnSync(process.execPath, [W], { env: { PATH: process.env.PATH, LIVE: '1', NUR: 'x', GK_ZEIT: '0.01' }, encoding: 'utf8', timeout: 20000 });
  pruefe('P7 exit 2', c.status === 2, `${c.status} ${c.stdout} ${c.stderr}`);
  pruefe('P7 nennt GK_ZEIT', /GK_ZEIT/.test(c.stdout), c.stdout);
});

// ── Ausführen ──────────────────────────────────────────────────────────────────────────────────
for (const t of tests) {
  if (NUR_EIN && !t.name.includes(NUR_EIN)) continue;
  const vor = rot;
  try { await t.fn(); } catch (e) { rot++; fehlerListe.push(`${t.name}: Ausnahme ${e?.stack || e}`); }
  if (process.env.GK_LAUT) console.log(`${rot === vor ? 'ok ' : 'ROT'} ${t.name}`);
}
for (const f of fehlerListe) console.log('ROT: ' + f.slice(0, 1500));
console.log(`\n${ok + rot} Prüfungen, ${ok} bestanden, ${rot} rot (${tests.length} Testfälle)`);
process.exit(rot ? 1 : 0);
