// 05.11.2026 «weiter verb»: drei kleine, belegbare Korrekturen in einem Lauf (Trockenlauf Vorgabe). Nach Gegenlesung (wf_6321b3d6-e93) überarbeitet.
//  1. Wegweiser-Sammlung `aus-tiktok-und-instagram` (Ziel von luxestyle.ch/tt und /ig): Produkte aus den Beiträgen vom 10.–15.11., die dort fehlten.
//     Drei Produkte sind nach der Gegenlesung ZURÜCKGEHALTEN (Feld `halten`), bis ihre Seite stimmt.
//  2. Sammlung `kostueme-ch-lager`: Halloween-Absatz, «Über 960» und das ungemessene «meist in 2–3 Werktagen» raus, Fasnacht rein (Text + SEO-Beschreibung).
//  3. Zwei Sandalen mit «echtem Kaninchenhaar» im eigenen Text auf ENTWURF (Vorbild: Tigerkopf-Slipper vom 05.11.).
//   Trockenlauf:  node apply.mjs        Schreiben: LIVE=1 node apply.mjs        Rücknahme: ZURUECK=1 LIVE=1 node apply.mjs
//   Exit: 0 gut · 3 Text-Schritt übersprungen (Ist-Text weicht ab) · 6 Abweichung beim Rücklesen · 1/2 Fehler
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = process.env.SICHERUNG || HIER + 'sicherung.json';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const pause = (ms) => new Promise((s) => setTimeout(s, ms));

const WEGWEISER = 'aus-tiktok-und-instagram';
// Beitragsprodukte mit Termin und Preis laut Metricool (gelesen 05.11. 14:50 UTC); Reihenfolge = Beitragstermin.
// `halten` = Grund, warum das Produkt noch NICHT aufgenommen wird (Gegenlesung 05.11.); Feld entfernen, sobald die Seite stimmt.
const NEU = [
  { handle: 'bruder-roadmax-traktor-fga03451', preis: '45.9', beitrag: '10.11. FB/IG' },
  { handle: 'schokoladen-ohrring-haarstecker-609700', preis: '15.9', beitrag: '11.11. FB/IG (Haarspange Herz-Keks)', halten: 'Variante «Quadrat» vorgewählt, Text verspricht Herz; kein Hinweis auf Kleinteile' },
  { handle: 'weihnachtsdeer-kerzenhalter-aus-eisen-1b5d86', preis: '16.9', beitrag: '12.11. FB/IG', halten: '«ab 16.90» gehört zum Windlicht, der Hirsch kostet 21.90; Text beschreibt Verzierung, die kein Bild zeigt' },
  { handle: 'plusch-kaiserpinguin-26-cm-fga17842', preis: '30.9', beitrag: '13.11. FB/IG' },
  { handle: 'bworld-rennrad-mit-radfahrer-fga063110', preis: '25.9', beitrag: '14.11. FB/IG' },
  { handle: 'usb-stick-flaschenoffner-aus-metall-534784', preis: '15.9', beitrag: '15.11. FB/IG', halten: 'Kapazität 4–128 GB zum selben Preis unbelegt (CJ-Datenblatt gegenlesen)' },
];
const KOLLEKTION = 'kostueme-ch-lager';
const TEXT_ALT = '<p>Über 960 Kostüme und Verkleidungen, die bei uns im Schweizer Lager liegen — meist in 2–3 Werktagen bei dir, das genaue Lieferdatum steht auf jeder Produktseite und in der Kasse. Perfekt, wenn Halloween, Fasnacht oder die Motto-Party vor der Tür steht und keine Zeit für lange Versandwege bleibt. Gratis-Versand in der Schweiz ab CHF 50 · 30 Tage Rückgabe.</p><p data-lux-anlass="halloween">🎃 Für Halloween: Kostüme ab Schweizer Lager kommen in der Schweiz am schnellsten an – das genaue Lieferdatum siehst du auf jeder Produktseite und in der Kasse.</p>';
// Neu nach Gegenlesung: keine «bei uns liegen»-Zusage (39 % der Produkte sind ausverkauft), «voraussichtliche» statt «genaue», keine Eilzusage, «nach Rabatt» wie überall.
const TEXT_NEU = '<p>Kostüme und Verkleidungen ab Schweizer Lager, solange der Vorrat reicht. Das voraussichtliche Lieferdatum steht beim Artikel und in der Kasse. Perfekt, wenn die Fasnacht (ab 11.11.), ein Maskenball oder die Motto-Party vor der Tür steht. Gratis-Versand in der Schweiz ab CHF 50 nach Rabatt · 30 Tage Rückgabe.</p>';
const SEO_ALT = 'Über 960 Kostüme und Verkleidungen, die bei uns im Schweizer Lager liegen — meist in 2–3 Werktagen bei dir.';
const SEO_NEU = 'Kostüme und Verkleidungen ab Schweizer Lager für Fasnacht, Maskenball und Motto-Party. Voraussichtliches Lieferdatum beim Artikel.';
const SANDALEN = ['handbestickte-lowenkopf-sandalen-fur-damen-419458', 'zhensheng-happy-dongguofeng-tiger-head-sandale-133441'];

const produkt = async (handle) => {
  const n = (await q(`query($h:String!){products(first:2,query:$h){nodes{id handle title status tracksInventory totalInventory onlineStoreUrl priceRangeV2{minVariantPrice{amount}} descriptionHtml}}}`, { h: `handle:${handle}` })).products.nodes.filter((p) => p.handle === handle);
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
const fehler = (j, name) => { if (!j) throw new Error(name + ': leere Antwort'); if (j.userErrors?.length) throw new Error(name + ': ' + JSON.stringify(j.userErrors)); };
// Rücklesen mit Wiederholung (collectionRemoveProducts/-AddProducts laufen asynchron)
const bis = async (name, pruefe, versuche = 8, ms = 2500) => { for (let i = 0; i < versuche; i++) { await pause(ms); if (await pruefe()) return true; } console.log('  ABWEICHUNG nach', versuche, 'Versuchen:', name); return false; };
const speichere = (s) => writeFileSync(SICH, JSON.stringify(s, null, 1));

if (ZURUECK) {
  const s = JSON.parse(readFileSync(SICH, 'utf8')); let nf = 0;
  console.log('Rücknahme: Wegweiser-Produkte', s.hinzugefuegt.length, '| Kostüm-Text', s.kostuem ? 'ja' : 'nein', '| Sandalen', s.sandalen.length);
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const w = await kollektion(WEGWEISER); const drinJetzt = await mitglieder(WEGWEISER);
  const raus = s.hinzugefuegt.filter((x) => drinJetzt.has(x.handle));
  if (raus.length) {
    fehler((await q(`mutation($id:ID!,$p:[ID!]!){collectionRemoveProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: w.id, p: raus.map((x) => x.id) })).collectionRemoveProducts, 'collectionRemoveProducts');
    if (!(await bis('Wegweiser raus', async () => { const m = await mitglieder(WEGWEISER); return raus.every((x) => !m.has(x.handle)); }))) nf++;
  } else console.log('Wegweiser: nichts zu entfernen');
  if (s.kostuem) {
    const k = await kollektion(KOLLEKTION);
    if (k.descriptionHtml === TEXT_NEU && k.seo.description === SEO_NEU) {
      fehler((await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`, { i: { id: k.id, descriptionHtml: s.kostuem.descriptionHtml, seo: { title: s.kostuem.seo.title, description: s.kostuem.seo.description } } })).collectionUpdate, 'collectionUpdate');
      if (!(await bis('Kostüm-Text zurück', async () => { const n = await kollektion(KOLLEKTION); return n.descriptionHtml === s.kostuem.descriptionHtml && n.seo.description === s.kostuem.seo.description; }))) nf++;
    } else console.log('Kostüm-Text: weicht vom geschriebenen Stand ab (anderswo geändert), NICHT zurückgesetzt');
  }
  for (const x of s.sandalen) {
    const p = await produkt(x.handle);
    if (p.status !== 'DRAFT') { console.log('Sandale nicht DRAFT, übersprungen:', x.handle, p.status); continue; }
    fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: { id: x.id, status: x.status } })).productUpdate, 'productUpdate');
    if (!(await bis('Sandale ' + x.handle, async () => (await produkt(x.handle)).status === x.status, 4, 1500))) nf++;
  }
  console.log('Rücknahme geschrieben', nf ? 'MIT ABWEICHUNG' : 'und zurückgelesen'); process.exit(nf ? 6 : 0);
}

// ---- Plan lesen ----
const w = await kollektion(WEGWEISER);
const drin = await mitglieder(WEGWEISER);
const plan1 = [];
for (const n of NEU) {
  if (n.halten) { console.log('ZURÜCKGEHALTEN:', n.handle, '|', n.halten); continue; }
  const p = await produkt(n.handle);
  const preis = String(Number(p.priceRangeV2.minVariantPrice.amount));
  if (p.status !== 'ACTIVE') { console.log('ÜBERSPRUNGEN (nicht aktiv):', n.handle, p.status); continue; }
  if (!p.onlineStoreUrl) { console.log('ÜBERSPRUNGEN (nicht im Onlineshop veröffentlicht):', n.handle); continue; }
  if (p.tracksInventory && p.totalInventory <= 0) { console.log('ÜBERSPRUNGEN (ausverkauft):', n.handle); continue; }
  if (preis !== n.preis) { console.log('ÜBERSPRUNGEN (Preis weicht vom Beitrag ab):', n.handle, preis, 'statt', n.preis); continue; }
  if (drin.has(n.handle)) { console.log('schon drin:', n.handle); continue; }
  plan1.push({ id: p.id, handle: n.handle, titel: p.title, beitrag: n.beitrag });
}
for (const x of plan1) console.log('WEGWEISER +', x.handle, '|', x.titel, '|', x.beitrag);
const k = await kollektion(KOLLEKTION);
const plan2 = k.descriptionHtml === TEXT_ALT && k.seo.description === SEO_ALT;
const schonNeu = k.descriptionHtml === TEXT_NEU && k.seo.description === SEO_NEU;
if (schonNeu) console.log('KOSTÜM-TEXT: schon neu');
else if (!plan2) console.log('KOSTÜM-TEXT: weicht vom erwarteten Alt-Text ab (anderswo geändert): wird NICHT geschrieben.\n  Text:', k.descriptionHtml.slice(0, 200), '\n  SEO:', k.seo.description);
else console.log('KOSTÜM-TEXT neu:', TEXT_NEU.replace(/<[^>]+>/g, ''), '\n  SEO neu:', SEO_NEU, `(${SEO_NEU.length} Zeichen)`);
const plan3 = [];
for (const h of SANDALEN) {
  const p = await produkt(h);
  if (p.status !== 'ACTIVE') { console.log('SANDALE übersprungen (nicht aktiv):', h, p.status); continue; }
  const text = p.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;nbsp;/g, ' ').replace(/\s+/g, ' ');
  const m = text.match(/.{0,70}echt\w*\s+Kaninchenhaar.{0,40}/i);
  if (!m || /\b(kein|keine|ohne|nicht)\b[^.]{0,25}echt\w*\s+Kaninchenhaar/i.test(m[0])) { console.log('SANDALE übersprungen (Text nennt kein «echtes Kaninchenhaar» oder verneint es):', h); continue; }
  console.log('SANDALE → ENTWURF', h, '|', p.title, '| «…' + m[0] + '…»');
  plan3.push({ id: p.id, handle: h, titel: p.title, status: p.status });
}
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

// ---- Schreiben; Sicherung erst, wenn der jeweilige Schritt wirklich geschrieben wurde ----
const sich = existsSync(SICH) ? JSON.parse(readFileSync(SICH, 'utf8')) : { hinzugefuegt: [], sandalen: [] };
let nf = 0, exit3 = false;
if (plan1.length) {
  fehler((await q(`mutation($id:ID!,$p:[ID!]!){collectionAddProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: w.id, p: plan1.map((x) => x.id) })).collectionAddProducts, 'collectionAddProducts');
  for (const x of plan1) if (!sich.hinzugefuegt.some((s) => s.id === x.id)) sich.hinzugefuegt.push({ id: x.id, handle: x.handle });
  speichere(sich);
  const ok = await bis('Wegweiser +', async () => { const m = await mitglieder(WEGWEISER); return plan1.every((x) => m.has(x.handle)); });
  for (const x of plan1) console.log('rücklesen Wegweiser', x.handle, ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++;
}
if (plan2) {
  if (!sich.kostuem) { sich.kostuem = { descriptionHtml: k.descriptionHtml, seo: k.seo }; speichere(sich); }
  fehler((await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`, { i: { id: k.id, descriptionHtml: TEXT_NEU, seo: { title: k.seo.title, description: SEO_NEU } } })).collectionUpdate, 'collectionUpdate');
  const ok = await bis('Kostüm-Text', async () => { const n = await kollektion(KOLLEKTION); return n.descriptionHtml === TEXT_NEU && n.seo.description === SEO_NEU && n.seo.title === k.seo.title; });
  console.log('rücklesen Kostüm-Text', ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++;
} else if (!schonNeu) { exit3 = true; console.log('Kostüm-Text übersprungen (Ist-Text weicht ab): Exit 3'); }
for (const x of plan3) {
  if (!sich.sandalen.some((s) => s.id === x.id)) { sich.sandalen.push({ id: x.id, handle: x.handle, status: x.status }); speichere(sich); }
  fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: { id: x.id, status: 'DRAFT' } })).productUpdate, 'productUpdate');
  const ok = await bis('Sandale ' + x.handle, async () => (await produkt(x.handle)).status === 'DRAFT', 4, 1500);
  console.log('rücklesen Sandale', x.handle, ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++;
}
process.exit(nf ? 6 : exit3 ? 3 : 0);
