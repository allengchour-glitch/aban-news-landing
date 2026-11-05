// Fell-Wahrheit 05.11.2026: Titel/Texte ohne unbelegtes Fell-Wort; zwei Produkte mit ausdrücklich ECHTEM Fell im eigenen Text auf ENTWURF.
//   Trockenlauf (Vorgabe):  node fell_titel.mjs
//   Schreiben:               LIVE=1 node fell_titel.mjs
//   Rücknahme:               ZURUECK=1 LIVE=1 node fell_titel.mjs   (liest die Sicherung fell_sicherung.json)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = process.env.SICHERUNG || HIER + 'fell_sicherung.json';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

const TITEL = [
  { handle: 'kuscheldecke-hasenfell-imitat-tie-dye-697984', neu: 'Kuscheldecke Kunstfell Tie-Dye', texte: [['Mit ihrem luxuriösen Hasenfell-Imitat und', 'Mit ihrem luxuriösen Kunstfell und']] },
  { handle: 'farbenfroher-hasenfell-pompon-rucksack-804864', neu: 'Farbenfroher Pompon-Rucksack', texte: [['Rucksack mit Hasenfell-Pompon ist', 'Rucksack mit Pompon ist']] },
  { handle: 'doppelseitiges-hasenfell-kissen-fur-sofa-748992', neu: 'Doppelseitiges Plüsch-Kissen für Sofa', texte: [] },
  { handle: 'wohnzimmer-und-eingangsbereichs-fussmatte-mit-602700', neu: 'Wohnzimmer- und Eingangsbereichs Fussmatte mit Kunstfell-Textur', texte: [] },
  { handle: 'cheviot-lounge-sesselhusse-mit-kaninchenfell-p-625100', neu: 'Cheviot Lounge Sesselhusse aus Samt und Plüsch', texte: [['veredelt mit Kaninchenfell-Plüsch', 'veredelt mit Plüsch'], ['luxuriösem Kaninchenfell-Plüsch', 'luxuriösem Plüsch']] },
];
const ENTWURF = ['vielseitiger-baumwollmantel-mit-pelzkragen-622900', 'chinesische-tigerkopf-slipper-fur-damen-030017'];

const LESEN = `query($h:String!){products(first:2,query:$h){nodes{id handle title status seo{title description} descriptionHtml}}}`;
const lies = async (handle) => { const n = (await q(LESEN, { h: `handle:${handle}` })).products.nodes.filter((p) => p.handle === handle); if (n.length !== 1) throw new Error('Produkt nicht eindeutig: ' + handle + ' (' + n.length + ')'); return n[0]; };
const SCHREIBEN = `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id title status seo{title description} descriptionHtml} userErrors{field message}}}`;
const schreibe = async (input) => { const j = (await q(SCHREIBEN, { p: input })).productUpdate; if (j.userErrors?.length) throw new Error('userErrors: ' + JSON.stringify(j.userErrors)); return j.product; };
const ersetzeAlle = (s, von, nach) => (s || '').split(von).join(nach);

if (ZURUECK) {
  const sich = JSON.parse(readFileSync(SICH, 'utf8'));
  for (const s of sich) {
    const ist = await lies(s.handle);
    console.log('zurück', s.handle, '| jetzt:', ist.status, '|', ist.title);
    if (!LIVE) continue;
    await schreibe({ id: s.id, title: s.title, status: s.status, seo: { title: s.seo.title, description: s.seo.description }, descriptionHtml: s.descriptionHtml });
  }
  console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf, nichts geschrieben'); process.exit(0);
}

const plan = [];
for (const t of TITEL) {
  const p = await lies(t.handle);
  if (p.status !== 'ACTIVE') { console.log('ÜBERSPRUNGEN (nicht aktiv):', t.handle, p.status); continue; }
  if (p.title === t.neu) { console.log('schon erledigt:', t.handle); continue; }
  const alt = p.title;
  let html = p.descriptionHtml;
  for (const [von, nach] of t.texte) { if (!html.includes(von)) throw new Error(`Textstelle fehlt bei ${t.handle}: «${von}»`); html = ersetzeAlle(html, von, nach); }
  const seoT = p.seo.title ? ersetzeAlle(p.seo.title, alt, t.neu) : p.seo.title;
  const seoD = p.seo.description ? ersetzeAlle(p.seo.description, alt, t.neu) : p.seo.description;
  plan.push({ art: 'titel', p, input: { id: p.id, title: t.neu, seo: { title: seoT, description: seoD }, descriptionHtml: html }, zeigen: `${alt}  →  ${t.neu} | SEO «${seoT}»` });
}
for (const h of ENTWURF) {
  const p = await lies(h);
  if (p.status !== 'ACTIVE') { console.log('ÜBERSPRUNGEN (nicht aktiv):', h, p.status); continue; }
  plan.push({ art: 'entwurf', p, input: { id: p.id, status: 'DRAFT' }, zeigen: `${p.title}  →  ENTWURF` });
}
for (const x of plan) console.log(x.art.padEnd(8), x.p.handle, '|', x.zeigen);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

// Sicherung VOR dem Schreiben
const alteSicherung = existsSync(SICH) ? JSON.parse(readFileSync(SICH, 'utf8')) : [];
const neueSicherung = plan.filter((x) => !alteSicherung.some((s) => s.id === x.p.id)).map((x) => ({ id: x.p.id, handle: x.p.handle, title: x.p.title, status: x.p.status, seo: x.p.seo, descriptionHtml: x.p.descriptionHtml }));
writeFileSync(SICH, JSON.stringify([...alteSicherung, ...neueSicherung], null, 1));
let fehler = 0;
for (const x of plan) {
  await schreibe(x.input);
  await new Promise((s) => setTimeout(s, 1500));
  const nach = await lies(x.p.handle);
  const gleich = x.art === 'titel' ? (nach.title === x.input.title && nach.seo.title === x.input.seo.title && nach.descriptionHtml === x.input.descriptionHtml) : nach.status === 'DRAFT';
  console.log('rücklesen', x.p.handle, gleich ? 'GLEICH' : 'ABWEICHUNG', '|', nach.status, '|', nach.title);
  if (!gleich) fehler++;
}
process.exit(fehler ? 6 : 0);
