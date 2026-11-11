// Kubanische Gliederkette (Bestellung #1039): Titel, Text und Auswahl an das CJ-Datenblatt angleichen (11.11.2026).
//
// Befund (GEMESSEN 11.11.): Titel «…, 45 cm», Text «45 cm lang» und «In Gold erhältlich», Auswahl «Grösse» mit
// 8inch/18inch/20inch/24inch und Farben Gold/Silber. CJ-Datenblatt (pid 2512250953081629400): 8inch (20cm),
// 18inch (45cm), 20inch (50cm), 24inch (60cm), je Gold und Silber. Geändert werden Titel, SEO, drei Textstellen,
// Name und Werte der Option. Varianten, SKUs, Preise, Handle, Bilder bleiben.
//
// Aufruf: node apply.mjs (Trockenlauf) · LIVE=1 node apply.mjs · ZURUECK=1 LIVE=1 node apply.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'kubanische-gliederkette-mit-strass-45-cm-629400';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';

const TITEL = 'Kubanische Gliederkette mit Strass, 20 bis 60 cm';
const SEO = { title: 'Kubanische Gliederkette mit Strass, 20 bis 60 cm | LuxeStyle CH', description: 'Kubanische Gliederkette mit Strasssteinen aus Zinklegierung. In Gold oder Silber, Länge 20, 45, 50 oder 60 cm.' };
const TEXT = [
  ['Sie hat eine Länge von 45 cm.', 'Du wählst die Länge: 20, 45, 50 oder 60 cm. Die kürzeste Ausführung entspricht einer Armbandlänge.'],
  ['<li>45 cm lang</li>', '<li>Längen 20, 45, 50 und 60 cm</li>'],
  ['<li>In Gold erhältlich</li>', '<li>In Gold und Silber erhältlich</li>'],
];
const OPTION_ALT = 'Grösse', OPTION_NEU = 'Länge';
const WERTE = { '8inch': '20 cm', '18inch': '45 cm', '20inch': '50 cm', '24inch': '60 cm' };
const SKU_LAENGE = { '01AZ': '8inch', '02BY': '18inch', '03CX': '20inch', '04DW': '24inch', '05EV': '8inch', '06FU': '18inch', '07GT': '20inch', '08HS': '24inch' };

let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = await r.json(); if (!j.access_token) throw new Error('kein Zugang'); token = j.access_token;
  }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}
async function lesen() {
  const d = await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id title descriptionHtml seo{title description} options{id name optionValues{id name}} variants(first:20){nodes{id sku price selectedOptions{name value}}} } }`, { h: HANDLE });
  if (!d.productByIdentifier) throw new Error('Produkt fehlt'); return d.productByIdentifier;
}
const vgl = (p) => JSON.stringify({ t: p.title, d: p.descriptionHtml, s: p.seo, o: p.options.map((o) => [o.name, o.optionValues.map((v) => v.name)]), v: p.variants.nodes.map((v) => [v.sku, v.price]) });

const ist = await lesen();
// Bindung: jede Variante trägt die SKU, deren Länge zum Optionswert passt
for (const v of ist.variants.nodes) {
  const l = v.selectedOptions.find((o) => o.name === OPTION_ALT || o.name === OPTION_NEU)?.value;
  const soll = SKU_LAENGE[v.sku.slice(-4)];
  if (!soll || (l !== soll && l !== WERTE[soll])) { console.error(`ABBRUCH: ${v.sku} trägt «${l}», erwartet ${soll}`); process.exit(1); }
}
let ziel;
if (ZURUECK) {
  if (!existsSync(SICHERUNG)) { console.error('keine Sicherung'); process.exit(1); }
  const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  ziel = { title: s.title, descriptionHtml: s.descriptionHtml, seo: s.seo, optName: OPTION_ALT, werte: Object.fromEntries(Object.entries(WERTE).map(([a, n]) => [n, a])) };
} else {
  let html = ist.descriptionHtml;
  for (const [a, n] of TEXT) { if (!html.includes(n)) { if (html.split(a).length !== 2) { console.error(`ABBRUCH: Textstelle nicht genau einmal: ${a}`); process.exit(1); } html = html.replace(a, n); } }
  ziel = { title: TITEL, descriptionHtml: html, seo: SEO, optName: OPTION_NEU, werte: WERTE };
}
const opt = ist.options.find((o) => o.name === OPTION_ALT || o.name === OPTION_NEU);
const wertAend = opt.optionValues.filter((v) => ziel.werte[v.name] && ziel.werte[v.name] !== v.name).map((v) => ({ id: v.id, name: ziel.werte[v.name] }));
console.log(`Titel: «${ist.title}» → «${ziel.title}»`);
console.log(`SEO: «${ist.seo.title}» → «${ziel.seo.title}»`);
console.log(`Option: «${opt.name}» → «${ziel.optName}», Werte: ${wertAend.map((w) => w.name).join(', ') || '(gleich)'}`);
console.log(`Text geändert: ${ist.descriptionHtml !== ziel.descriptionHtml}`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
if (!ZURUECK && !existsSync(SICHERUNG)) writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), id: ist.id, title: ist.title, descriptionHtml: ist.descriptionHtml, seo: ist.seo, options: ist.options, variants: ist.variants.nodes }, null, 1), { flag: 'wx' });
const u = await gql(`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{field message} } }`, { p: { id: ist.id, title: ziel.title, descriptionHtml: ziel.descriptionHtml, seo: ziel.seo } });
if (u.productUpdate.userErrors.length) { console.error('FEHLER ' + JSON.stringify(u.productUpdate.userErrors)); process.exit(1); }
const o = await gql(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v){ userErrors{field message code} } }`, { p: ist.id, o: { id: opt.id, name: ziel.optName }, v: wertAend });
if (o.productOptionUpdate.userErrors.length) { console.error('FEHLER ' + JSON.stringify(o.productOptionUpdate.userErrors)); process.exit(1); }
await new Promise((r) => setTimeout(r, 4000));
const neu = await lesen();
const nopt = neu.options.find((x) => x.id === opt.id);
const ok = neu.title === ziel.title && neu.descriptionHtml === ziel.descriptionHtml && neu.seo.title === ziel.seo.title && neu.seo.description === ziel.seo.description && nopt.name === ziel.optName
  && opt.optionValues.every((v) => nopt.optionValues.find((x) => x.id === v.id)?.name === (ziel.werte[v.name] || v.name))
  && neu.variants.nodes.every((v) => { const a = ist.variants.nodes.find((x) => x.id === v.id); return a && a.sku === v.sku && a.price === v.price; });
console.log(`NACHGELESEN ${ok ? 'OK' : 'ABWEICHUNG'} | ${neu.title} | ${nopt.name}: ${nopt.optionValues.map((v) => v.name).join(', ')}`);
process.exit(ok ? 0 : 1);
