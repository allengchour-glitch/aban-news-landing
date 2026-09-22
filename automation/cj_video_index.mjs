#!/opt/node22/bin/node
/**
 * cj_video_index.mjs — Welche unserer CJ-Produkte haben bei CJ ein Video?
 *
 * GEMESSEN 22.09.2026: `product/list` traegt je Produkt `isVideo` (1/0), aber NUR, wenn die Liste
 * nach categoryId (oder pid) gefiltert ist — ungefiltert steht dort null. pageSize max 200,
 * ein `isVideo=1`-Filterparameter existiert nicht (gleiche total). Quote im Projektor-Regal:
 * 24 von 200. Der Reel-Motor fragte vorher je Produkt einzeln `queryVideosByProductId`
 * (1 Treffer je 80 Aufrufe) — dieser Index dreht das um: 200 Produkte je Aufruf, und der Motor
 * fragt nur noch Produkte mit Video.
 *
 * Laeuft in Haeppchen (INDEX_CALLS je Lauf, Standard 150) mit persistentem Cursor ueber alle
 * 578 CJ-Kategorien der dritten Ebene; am Ende beginnt die naechste Runde vorn (Auffrischung).
 * Schnittmenge mit dem Shop = Ledger dropship/cj_niche_done.txt (cj:<pid>).
 * Zustand + Ergebnis: dropship/_cj_video_index.json  (shop_video: pid → {n: Name, k: Kategorie})
 * ENV: INDEX_CALLS · DRY=1 (nichts schreiben) · CJ_TOKEN oder /tmp/cj_token.json
 */
import fs from 'fs';
import { takt } from './cj_takt.mjs';

const STATE = 'dropship/_cj_video_index.json';
const SHOP_LEDGER = 'dropship/cj_niche_done.txt';
const CALLS = parseInt(process.env.INDEX_CALLS || '150', 10);
const DRY = process.env.DRY === '1';
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json') ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
if (!CJT) { console.log('Kein CJ-Token (/tmp/cj_token.json) → No-op.'); process.exit(0); }

async function cj(path) {
  await takt();
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/' + path, { headers: { 'CJ-Access-Token': CJT } });
      const j = await r.json();
      if (j.code === 1600200) { await new Promise(r => setTimeout(r, 8000 * (a + 1))); continue; }  // Drossel: warten
      return j;
    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
  }
  return { code: -1, message: 'keine Antwort' };
}

const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { stand: '', kats: [], cursor: { k: 0, page: 1 }, shop_video: {}, stat: { aufrufe: 0, produkte: 0, videos: 0, runden: 0 } };
if (!st.kats.length) {
  const c = await cj('product/getCategory');
  for (const a of (c.data || [])) for (const b of (a.categoryFirstList || [])) for (const d of (b.categorySecondList || [])) st.kats.push({ id: d.categoryId, n: d.categoryName });
  console.log(`Kategorienbaum geladen: ${st.kats.length} Kategorien (Ebene 3)`);
  if (!st.kats.length) { console.log('Kein Kategorienbaum → Abbruch:', c.message); process.exit(0); }
}
const shop = new Set(fs.readFileSync(SHOP_LEDGER, 'utf8').split('\n').map(s => s.trim().replace(/^cj:/, '')).filter(Boolean));

// Prioritaet: die Kategorien UNSERER aktiven Produkte zuerst. Der Shop speichert keine CJ-Kategorie
// (productType ist die eigene deutsche Gruppe), darum einmalig eine Stichprobe: SAMPLE aktive
// cj-real-Produkte (neueste zuerst) → product/list?pid= liefert categoryId (1 Aufruf je Produkt).
// GEMESSEN 22.09.: die ersten beiden Kategorien in CJ-Reihenfolge brachten 7'690 Produkte, 34 Videos, 0 im Shop.
const SAMPLE = parseInt(process.env.SAMPLE || '120', 10);
const TOK = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
if (!st.prio && TOK && SAMPLE > 0) {
  const pids = []; let cursor = null;
  while (pids.length < SAMPLE) {
    const r = await fetch('https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query: `query($c:String){ products(first:50, after:$c, sortKey:CREATED_AT, reverse:true, query:"status:active tag:cj-real"){ pageInfo{hasNextPage endCursor} nodes{ variants(first:1){nodes{sku price}} mediaCount{count} } } }`, variables: { c: cursor } }) }).then(r => r.json()).catch(() => null);
    const pg = r?.data?.products; if (!pg) break;
    for (const n of pg.nodes) { const m = /^CJ-([0-9A-Za-z-]{10,})/.exec(n.variants.nodes[0]?.sku || ''); if (m && parseFloat(n.variants.nodes[0]?.price || '0') >= 14.9 && (n.mediaCount?.count || 0) >= 2) pids.push(m[1]); }
    if (!pg.pageInfo.hasNextPage) break; cursor = pg.pageInfo.endCursor;
  }
  const treffer = {}; let ok = 0;
  for (const pid of pids.slice(0, SAMPLE)) {
    const r = await cj(`product/list?pid=${pid}&pageSize=1`);
    const p = r.data?.list?.[0]; if (!p) continue; ok++;
    treffer[p.categoryId] = (treffer[p.categoryId] || 0) + 1;
  }
  const rang = id => treffer[id] || 0;
  st.kats.sort((a, b) => rang(b.id) - rang(a.id));
  st.prio = { stand: new Date().toISOString(), stichprobe: ok, kategorien: Object.keys(treffer).length };
  st.cursor = { k: 0, page: 1 };
  console.log(`Prioritaet gesetzt: ${ok} Stichproben → ${Object.keys(treffer).length} Kategorien vorn (Top: ${st.kats.slice(0, 5).map(k => k.n + ' ' + rang(k.id)).join(' · ')})`);
  if (!DRY) fs.writeFileSync(STATE, JSON.stringify(st));
}
console.log(`Shop-Ledger: ${shop.size} CJ-pids · Index bisher: ${Object.keys(st.shop_video).length} mit Video · Cursor Kategorie ${st.cursor.k + 1}/${st.kats.length} Seite ${st.cursor.page}`);

let calls = 0, neu = 0, produkte = 0, videos = 0, stopp = '';
while (calls < CALLS) {
  const kat = st.kats[st.cursor.k];
  const r = await cj(`product/list?pageNum=${st.cursor.page}&pageSize=200&categoryId=${kat.id}&productType=ORDINARY_PRODUCT`);
  calls++;
  if (r.code === 16900500) { stopp = 'CJ-Tagesbudget erschoepft'; break; }
  if (r.code !== 200) { console.log(`  ✗ ${kat.n}: ${r.code} ${r.message}`); if (r.code === -1) { stopp = 'CJ antwortet nicht'; break; } st.cursor = { k: (st.cursor.k + 1) % st.kats.length, page: 1 }; continue; }
  const L = r.data?.list || [];
  for (const p of L) {
    produkte++;
    if (String(p.isVideo) !== '1') continue;
    videos++;
    if (shop.has(String(p.pid)) && !st.shop_video[p.pid]) { st.shop_video[p.pid] = { n: (p.productNameEn || p.productName || '').slice(0, 80), k: kat.n }; neu++; }
  }
  if (L.length < 200) {
    st.cursor.k++; st.cursor.page = 1;
    if (st.cursor.k >= st.kats.length) { st.cursor.k = 0; st.stat.runden++; console.log(`### Katalogende — Runde ${st.stat.runden} abgeschlossen, Cursor vorn.`); }
  } else st.cursor.page++;
}
st.stat.aufrufe += calls; st.stat.produkte += produkte; st.stat.videos += videos; st.stand = new Date().toISOString();
if (!DRY) fs.writeFileSync(STATE, JSON.stringify(st));
console.log(`FERTIG${stopp ? ' (' + stopp + ')' : ''}: ${calls} Aufrufe · ${produkte} Produkte gesehen · ${videos} mit Video · ${neu} NEU im Shop-Index · Index gesamt ${Object.keys(st.shop_video).length} · naechster Cursor ${st.cursor.k + 1}/${st.kats.length} S.${st.cursor.page}${DRY ? ' · DRY' : ''}`);
