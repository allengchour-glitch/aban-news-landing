#!/usr/bin/env node
// NUR LESEN. Sammelt je Fell-Kandidat ein Dossier: Shop-Text + CJ-Datenblatt (Material, Titel, Beschreibung) + Bilder.
// Zweck: Klären, ob «Kaninchenfell»/«Nerz»/«Pelzkragen» echtes Fell oder Plüsch/Imitat meint (Besitzer 04./05.11.: kein echtes Fell).
// Aufruf: OUT=<Ordner> node dropship/pelz-0411/dossier.mjs        (schreibt OUT/dossier_<handle>.json und OUT/bild_<handle>_<n>.jpg)
// Schreibt NICHTS in Shopify oder bei CJ.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { cjToken } from '../../automation/lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from '../../automation/lib/cj_fetch.mjs';
import { strategien } from '../../automation/lib/fakten_block.mjs';

const OUT = process.env.OUT || '/tmp/fell_dossier';
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const FEST = [
  // Kaninchen-/Hasenfell als Material genannt (Scan 05.11., «OHNE» Imitat-Wort im Umfeld)
  'faux-fur-decke-im-tie-dye-look-627100', 'hooded-cardigan-sweatshirt-mit-fledermausarmel-603400', 'samt-kissenbezug-mit-schlaufenmuster-188160',
  'strick-cardigan-mit-rundhals-und-knopfen-626200', 'kapuzen-cardigan-mit-strickknopfen-615500', 'retro-ubergangsjacke-fur-herren-634200',
  'kleidung-fur-neugeborene-720768', 'fruhlings-colorblock-jacke-fur-herren-603200', 'racing-carbon-laufschuhe-657100',
  'elegantes-abendkleid-fur-damen-628700', 'retro-warmer-mantel-mit-kapuze-610000', 'rutschfeste-bodensocken-fur-kinder-764224',
  'herren-kapuzen-sweatshirt-aus-cord-630900', 'herren-hemd-mit-revers-und-kurzen-armeln-607700', 'mannliche-v-ausschnitt-blockstrickweste-601800',
  'corduroy-baby-set-striped-2-teilig-605600',
  // Nerz
  'handgemachter-quasten-pullover-aus-nerzfell-635500', 'herren-strickjacke-mit-polokragen-612000', 'bedruckte-weste-aus-denim-ee3ba9',
  'katzen-kapuzenpullover-mit-fleecefutter-635400', 'falsche-nerzwimpern-3d-mk-13-5-paar-593858', 'clover-blossom-nerz-wimpernverlangerung-767936',
  '3d-nerzhaar-wimpern-7f9eeb',
];
const KRAGEN = /(pelzkragen|fellkragen|pelzbesatz|fellbesatz|pelzmantel|pelzjacke|pelzweste|pelzm[uü]tze|pelzstola|pelzkapuze|fellkapuze|fell-?kragen|pelz-?kragen|pelz\b)/i;
const IMITAT = /(imitat|faux|kunstfell|kunstpelz|plüsch|plusch|synthet|polyester|künstlich|kunstlich|fake|vegan)/i;

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const cj = await cjToken(); if (!cj) { console.error('Kein CJ-Token'); process.exit(1); }

const FELDER = 'id handle title status descriptionHtml tags productType vendor totalInventory variants(first:3){nodes{sku price}} images(first:6){nodes{url}}';
// Pelzkragen-Gruppe live suchen
const kragen = new Map();
for (const term of ['Pelzkragen', 'Fellkragen', 'Pelzbesatz', 'Fellbesatz', 'Pelzmantel', 'Pelzjacke', 'Pelzweste', 'Pelzmütze', 'Pelzkapuze', 'Fellkapuze']) {
  let after = null;
  for (let s = 0; s < 4; s++) {
    const j = await q(`query($q:String!,$a:String){products(first:100,query:$q,after:$a){nodes{${FELDER}}pageInfo{hasNextPage endCursor}}}`, { q: `status:active AND ${term}`, a: after });
    for (const p of j.products.nodes) kragen.set(p.handle, p);
    if (!j.products.pageInfo.hasNextPage) break; after = j.products.pageInfo.endCursor;
  }
}
const kragenListe = [...kragen.values()].filter((p) => {
  const t = (p.title + ' ' + p.descriptionHtml.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const m = t.match(KRAGEN); if (!m) return false;
  const u = t.slice(Math.max(0, m.index - 100), m.index + 140);
  return !IMITAT.test(u);
});
console.log('Pelzkragen-Gruppe (aktiv, ohne Imitat-Wort im Umfeld):', kragenListe.length, '| Treffer gesamt:', kragen.size);

const alle = new Map();
for (const p of kragenListe) alle.set(p.handle, { gruppe: 'pelzkragen', p });
for (const h of FEST) {
  if (alle.has(h)) continue;
  const j = await q(`query($q:String!){products(first:1,query:$q){nodes{${FELDER}}}}`, { q: `handle:${h}` });
  const p = j.products.nodes[0];
  if (!p) { console.log('NICHT GEFUNDEN', h); continue; }
  alle.set(h, { gruppe: h.includes('nerz') ? 'nerz' : 'kaninchen', p });
}
console.log('Dossiers:', alle.size);

async function cjProdukt(handle, sku) {
  const datei = `${OUT}/cj_${handle}.json`;
  if (existsSync(datei)) { try { return JSON.parse(readFileSync(datei, 'utf8')); } catch { /* neu */ } }
  for (const [art, wert] of strategien(sku)) {
    const rr = await cjFetch(`${BASE}/product/query?${art}=${encodeURIComponent(wert)}`, { context: 'Fell', headers: { 'CJ-Access-Token': cj }, weicheCodes: WEICHE_CODES });
    await schlaf(1100);
    if (rr?.data?.pid || rr?.data?.productNameEn) { writeFileSync(datei, JSON.stringify(rr.data)); return rr.data; }
  }
  return null;
}

const uebersicht = [];
for (const [handle, { gruppe, p }] of alle) {
  const sku = p.variants.nodes[0]?.sku || '';
  let c = null; try { c = await cjProdukt(handle, sku); } catch (e) { c = null; console.log('CJ-Fehler', handle, String(e.message).slice(0, 80)); }
  const text = p.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const bilder = [];
  for (const [i, im] of p.images.nodes.slice(0, 3).entries()) {
    try {
      const res = await fetch(im.url + (im.url.includes('?') ? '&' : '?') + 'width=900');
      if (res.ok) { const f = `${OUT}/bild_${handle}_${i + 1}.jpg`; writeFileSync(f, Buffer.from(await res.arrayBuffer())); bilder.push(f); }
    } catch { /* weiter */ }
  }
  const cjKurz = c ? {
    pid: c.pid, titel: c.productNameEn, material: c.materialNameEn ?? c.materialName ?? null, kategorie: c.categoryName,
    beschreibung: String(c.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500),
    eigenschaften: c.productProperty ?? c.productPropertyEn ?? null, verpackung: c.packingNameEn ?? null, gewicht: c.productWeight ?? null,
  } : null;
  const dossier = { handle, gruppe, status: p.status, id: p.id, titel: p.title, text, tags: p.tags, preis: p.variants.nodes[0]?.price, sku, bestand: p.totalInventory, bilder, cj: cjKurz };
  writeFileSync(`${OUT}/dossier_${handle}.json`, JSON.stringify(dossier, null, 1));
  uebersicht.push({ handle, gruppe, status: p.status, cj: !!cjKurz, material: cjKurz?.material ?? null });
  console.log(gruppe.padEnd(10), p.status.padEnd(6), cjKurz ? 'CJ ok ' : 'CJ FEHLT', handle);
}
writeFileSync(`${OUT}/_uebersicht.json`, JSON.stringify(uebersicht, null, 1));
console.log('fertig:', uebersicht.length, '| ohne CJ-Datenblatt:', uebersicht.filter((x) => !x.cj).length);
