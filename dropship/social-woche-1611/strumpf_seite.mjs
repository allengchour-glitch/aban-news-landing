// Weihnachtsstrumpf: Auswahl und Masse auf Deutsch und in cm (11.11.2026), vor den Beiträgen vom 18.11.
// Vorher: Werte «Rot, 10x19inch» / «Grün, 10x19inch», Text «Tassel-Detail», «Masse: 10 × 19 Zoll».
// Nachher: Werte «Rot» / «Grün» (beide Ausführungen gleich gross), «Quaste am oberen Ende», «Masse: ca. 25 × 48 cm (10 × 19 Zoll)».
// SKUs, Preise, Varianten bleiben. Aufruf: node strumpf_seite.mjs · LIVE=1 · ZURUECK=1 LIVE=1
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'strumpf_sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'weihnachtsstrumpf-mit-samt-optik-639700', SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const WERTE = { 'Rot, 10x19inch': 'Rot', 'Grün, 10x19inch': 'Grün' };
const SKU = { 'CJ-CJYS297898001AZ': 'Rot', 'CJ-CJYS297898002BY': 'Grün' };
const TEXT = [['<li>Tassel-Detail am oberen Ende</li>', '<li>Quaste am oberen Ende</li>'],
  ['<strong>Masse:</strong> 10 × 19 Zoll</li>', '<strong>Masse:</strong> ca. 25 × 48 cm (10 × 19 Zoll)</li>']];
let token = null;
async function gql(query, variables = {}) {
  if (!token) { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) }); token = (await r.json()).access_token; if (!token) throw new Error('kein Zugang'); }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300)); return j.data;
}
const lesen = async () => (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id descriptionHtml options{id name optionValues{id name}} variants(first:10){nodes{id sku price selectedOptions{value}}} } }`, { h: HANDLE })).productByIdentifier;
const ist = await lesen();
for (const v of ist.variants.nodes) { const w = v.selectedOptions[0].value; if (!SKU[v.sku] || !(w === SKU[v.sku] || WERTE[w] === SKU[v.sku])) { console.error(`ABBRUCH ${v.sku} «${w}»`); process.exit(1); } }
const opt = ist.options[0];
let html = ist.descriptionHtml, werte;
if (ZURUECK) { const s = JSON.parse(readFileSync(SICHERUNG, 'utf8')); html = s.descriptionHtml; werte = Object.fromEntries(Object.entries(WERTE).map(([a, n]) => [n, a])); }
else { for (const [a, n] of TEXT) if (!html.includes(n)) { if (html.split(a).length !== 2) { console.error('ABBRUCH Text: ' + a); process.exit(1); } html = html.replace(a, n); } werte = WERTE; }
const aend = opt.optionValues.filter((v) => werte[v.name]).map((v) => ({ id: v.id, name: werte[v.name] }));
console.log(`Werte: ${aend.map((a) => a.name).join(', ') || '(gleich)'} | Text geändert: ${html !== ist.descriptionHtml}`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
if (!ZURUECK && !existsSync(SICHERUNG)) writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), ...ist }, null, 1), { flag: 'wx' });
const u = await gql(`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{field message} } }`, { p: { id: ist.id, descriptionHtml: html } });
if (u.productUpdate.userErrors.length) { console.error(JSON.stringify(u.productUpdate.userErrors)); process.exit(1); }
if (aend.length) { const o = await gql(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v){ userErrors{field message} } }`, { p: ist.id, o: { id: opt.id }, v: aend }); if (o.productOptionUpdate.userErrors.length) { console.error(JSON.stringify(o.productOptionUpdate.userErrors)); process.exit(1); } }
await new Promise((r) => setTimeout(r, 4000));
const neu = await lesen();
const ok = neu.descriptionHtml === html && neu.variants.nodes.every((v) => { const a = ist.variants.nodes.find((x) => x.id === v.id); return a && a.sku === v.sku && a.price === v.price; }) && aend.every((a) => neu.options[0].optionValues.find((x) => x.id === a.id)?.name === a.name);
console.log(`NACHGELESEN ${ok ? 'OK' : 'ABWEICHUNG'} | ${neu.options[0].optionValues.map((v) => v.name).join(', ')}`);
process.exit(ok ? 0 : 1);
