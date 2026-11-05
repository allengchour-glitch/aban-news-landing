// 05.11.2026 «weiter verb»: drei kleine, belegbare Korrekturen in einem Lauf (Trockenlauf Vorgabe).
//  1. Wegweiser-Sammlung `aus-tiktok-und-instagram` (Ziel von luxestyle.ch/tt und /ig): sechs Produkte, die in den Beiträgen vom 10.–15.11. beworben werden, fehlten.
//  2. Sammlung `kostueme-ch-lager`: Halloween-Absatz und das ungemessene «meist in 2–3 Werktagen» raus, Fasnacht rein (Text + SEO-Beschreibung).
//  3. Zwei Sandalen mit «echtem Kaninchenhaar» im eigenen Text auf ENTWURF (Vorbild: Tigerkopf-Slipper vom 05.11.).
//   Trockenlauf:  node apply.mjs        Schreiben: LIVE=1 node apply.mjs        Rücknahme: ZURUECK=1 LIVE=1 node apply.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = HIER + 'sicherung.json';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const pause = (ms) => new Promise((s) => setTimeout(s, ms));

const WEGWEISER = 'aus-tiktok-und-instagram';
// Beitragsprodukte mit Termin und Preis laut Metricool (gelesen 05.11. 14:50 UTC); Reihenfolge = Beitragstermin
const NEU = [
  { handle: 'bruder-roadmax-traktor-fga03451', preis: '45.9', beitrag: '10.11. FB/IG' },
  { handle: 'schokoladen-ohrring-haarstecker-609700', preis: '15.9', beitrag: '11.11. FB/IG (Haarspange Herz-Keks)' },
  { handle: 'weihnachtsdeer-kerzenhalter-aus-eisen-1b5d86', preis: '16.9', beitrag: '12.11. FB/IG (ab CHF 16.90)' },
  { handle: 'plusch-kaiserpinguin-26-cm-fga17842', preis: '30.9', beitrag: '13.11. FB/IG' },
  { handle: 'bworld-rennrad-mit-radfahrer-fga063110', preis: '25.9', beitrag: '14.11. FB/IG' },
  { handle: 'usb-stick-flaschenoffner-aus-metall-534784', preis: '15.9', beitrag: '15.11. FB/IG' },
];
const KOLLEKTION = 'kostueme-ch-lager';
const TEXT_ALT = '<p>Über 960 Kostüme und Verkleidungen, die bei uns im Schweizer Lager liegen — meist in 2–3 Werktagen bei dir, das genaue Lieferdatum steht auf jeder Produktseite und in der Kasse. Perfekt, wenn Halloween, Fasnacht oder die Motto-Party vor der Tür steht und keine Zeit für lange Versandwege bleibt. Gratis-Versand in der Schweiz ab CHF 50 · 30 Tage Rückgabe.</p><p data-lux-anlass="halloween">🎃 Für Halloween: Kostüme ab Schweizer Lager kommen in der Schweiz am schnellsten an – das genaue Lieferdatum siehst du auf jeder Produktseite und in der Kasse.</p>';
const TEXT_NEU = '<p>Kostüme und Verkleidungen, die bei uns im Schweizer Lager liegen. Das genaue Lieferdatum steht auf jeder Produktseite und in der Kasse. Perfekt, wenn die Fasnacht (ab 11.11.), ein Maskenball oder die Motto-Party vor der Tür steht und keine Zeit für lange Versandwege bleibt. Gratis-Versand in der Schweiz ab CHF 50 · 30 Tage Rückgabe.</p>';
const SEO_ALT = 'Über 960 Kostüme und Verkleidungen, die bei uns im Schweizer Lager liegen — meist in 2–3 Werktagen bei dir.';
const SEO_NEU = 'Kostüme und Verkleidungen ab Schweizer Lager für Fasnacht, Maskenball und Motto-Party. Das Lieferdatum steht auf jeder Produktseite.';
const SANDALEN = ['handbestickte-lowenkopf-sandalen-fur-damen-419458', 'zhensheng-happy-dongguofeng-tiger-head-sandale-133441'];

const produkt = async (handle) => {
  const n = (await q(`query($h:String!){products(first:2,query:$h){nodes{id handle title status priceRangeV2{minVariantPrice{amount}} descriptionHtml}}}`, { h: `handle:${handle}` })).products.nodes.filter((p) => p.handle === handle);
  if (n.length !== 1) throw new Error('Produkt nicht eindeutig: ' + handle); return n[0];
};
const kollektion = async (handle) => {
  const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id handle title sortOrder descriptionHtml seo{title description}}}`, { h: handle })).collectionByHandle;
  if (!c) throw new Error('Sammlung fehlt: ' + handle); return c;
};
const mitglieder = async (handle) => {
  const ids = new Set(); let after = null;
  for (let s = 0; s < 6; s++) {
    const j = (await q(`query($h:String!,$a:String){collectionByHandle(handle:$h){products(first:100,after:$a){nodes{id handle}pageInfo{hasNextPage endCursor}}}}`, { h: handle, a: after })).collectionByHandle.products;
    for (const p of j.nodes) ids.add(p.handle); if (!j.pageInfo.hasNextPage) break; after = j.pageInfo.endCursor;
  }
  return ids;
};
const fehler = (j, name) => { if (j?.userErrors?.length) throw new Error(name + ': ' + JSON.stringify(j.userErrors)); };

if (ZURUECK) {
  const s = JSON.parse(readFileSync(SICH, 'utf8')); let nf = 0;
  console.log('Rücknahme: Wegweiser', s.hinzugefuegt.length, 'Produkte raus | Kostüm-Text zurück | Sandalen zurück auf', s.sandalen.map((x) => x.status).join('/'));
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const w = await kollektion(WEGWEISER);
  if (s.hinzugefuegt.length) fehler((await q(`mutation($id:ID!,$p:[ID!]!){collectionRemoveProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: w.id, p: s.hinzugefuegt.map((x) => x.id) })).collectionRemoveProducts, 'remove');
  const k = await kollektion(KOLLEKTION);
  fehler((await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`, { i: { id: k.id, descriptionHtml: s.kostuem.descriptionHtml, seo: { title: s.kostuem.seo.title, description: s.kostuem.seo.description } } })).collectionUpdate, 'collectionUpdate');
  for (const x of s.sandalen) fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: { id: x.id, status: x.status } })).productUpdate, 'productUpdate');
  await pause(2000);
  const m = await mitglieder(WEGWEISER); for (const x of s.hinzugefuegt) if (m.has(x.handle)) { console.log('NOCH DRIN', x.handle); nf++; }
  console.log('Rücknahme geschrieben', nf ? 'MIT ABWEICHUNG' : 'ohne Abweichung'); process.exit(nf ? 6 : 0);
}

// ---- Plan lesen ----
const w = await kollektion(WEGWEISER);
const drin = await mitglieder(WEGWEISER);
const plan1 = [];
for (const n of NEU) {
  const p = await produkt(n.handle);
  const preis = String(Number(p.priceRangeV2.minVariantPrice.amount));
  if (p.status !== 'ACTIVE') { console.log('ÜBERSPRUNGEN (nicht aktiv):', n.handle, p.status); continue; }
  if (preis !== n.preis) { console.log('ÜBERSPRUNGEN (Preis weicht vom Beitrag ab):', n.handle, preis, 'statt', n.preis); continue; }
  if (drin.has(n.handle)) { console.log('schon drin:', n.handle); continue; }
  plan1.push({ id: p.id, handle: n.handle, titel: p.title, beitrag: n.beitrag });
}
for (const x of plan1) console.log('WEGWEISER +', x.handle, '|', x.titel, '|', x.beitrag);
const k = await kollektion(KOLLEKTION);
const plan2 = k.descriptionHtml === TEXT_ALT && k.seo.description === SEO_ALT;
if (!plan2) console.log('KOSTÜM-TEXT: weicht vom erwarteten Alt-Text ab (schon geändert oder anders): nichts geschrieben.\n  Text:', k.descriptionHtml.slice(0, 200), '\n  SEO:', k.seo.description);
else console.log('KOSTÜM-TEXT neu:', TEXT_NEU.replace(/<[^>]+>/g, ''), '\n  SEO neu:', SEO_NEU, `(${SEO_NEU.length} Zeichen)`);
const plan3 = [];
for (const h of SANDALEN) {
  const p = await produkt(h);
  if (p.status !== 'ACTIVE') { console.log('SANDALE übersprungen (nicht aktiv):', h, p.status); continue; }
  if (!/echt\w*\s+Kaninchenhaar/i.test(p.descriptionHtml.replace(/<[^>]+>/g, ' '))) { console.log('SANDALE übersprungen (Text nennt kein «echtes Kaninchenhaar» mehr):', h); continue; }
  plan3.push({ id: p.id, handle: h, titel: p.title, status: p.status });
}
for (const x of plan3) console.log('SANDALE → ENTWURF', x.handle, '|', x.titel);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

// ---- Sicherung VOR dem Schreiben ----
const alt = existsSync(SICH) ? JSON.parse(readFileSync(SICH, 'utf8')) : { hinzugefuegt: [], sandalen: [] };
const sich = {
  hinzugefuegt: [...alt.hinzugefuegt, ...plan1.map((x) => ({ id: x.id, handle: x.handle }))],
  kostuem: alt.kostuem || { descriptionHtml: k.descriptionHtml, seo: k.seo },
  sandalen: [...alt.sandalen, ...plan3.filter((x) => !alt.sandalen.some((s) => s.id === x.id)).map((x) => ({ id: x.id, handle: x.handle, status: x.status }))],
};
writeFileSync(SICH, JSON.stringify(sich, null, 1));
let nf = 0;
if (plan1.length) {
  fehler((await q(`mutation($id:ID!,$p:[ID!]!){collectionAddProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: w.id, p: plan1.map((x) => x.id) })).collectionAddProducts, 'collectionAddProducts');
  await pause(2500);
  const m = await mitglieder(WEGWEISER);
  for (const x of plan1) { const ok = m.has(x.handle); console.log('rücklesen Wegweiser', x.handle, ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++; }
}
if (plan2) {
  fehler((await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`, { i: { id: k.id, descriptionHtml: TEXT_NEU, seo: { title: k.seo.title, description: SEO_NEU } } })).collectionUpdate, 'collectionUpdate');
  await pause(2500);
  const n = await kollektion(KOLLEKTION); const ok = n.descriptionHtml === TEXT_NEU && n.seo.description === SEO_NEU && n.seo.title === k.seo.title;
  console.log('rücklesen Kostüm-Text', ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++;
}
for (const x of plan3) {
  fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: { id: x.id, status: 'DRAFT' } })).productUpdate, 'productUpdate'); await pause(1500);
  const n = await produkt(x.handle); const ok = n.status === 'DRAFT'; console.log('rücklesen Sandale', x.handle, ok ? 'GLEICH' : 'ABWEICHUNG', n.status); if (!ok) nf++;
}
process.exit(nf ? 6 : 0);
