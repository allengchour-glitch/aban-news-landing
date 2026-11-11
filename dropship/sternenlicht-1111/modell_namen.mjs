// Sternenlicht-Projektor: Auswahl «Modell A bis G» verständlich benennen (11.11.2026).
//
// Warum: Codex' Video (R176) bewirbt den Projektor ab 16.11. Die Auswahl hiess nur «A» bis «G»; welches Modell eine
// Galaxie-Scheibe, einen Akku oder die Spieluhr hat, stand nur im Fliesstext. Quelle der Zuordnung: CJ-Datenblatt
// (pid 1477820492730732544, Feld «Light color», gelesen 11.11.2026 09:40 UTC): A basic model · B 6 sets of film ·
// C Galaxy plate + 6 film · D charge + Bluetooth + 6 film · E charge + Bluetooth + Galaxy disk + 6 film ·
// F music box, charging, 18 music, 6 star light panels (without galaxy) · G plug-in rotation, 1 galaxy disk, 3 colour disks.
// Geändert werden NUR die Namen der Optionswerte. Varianten, SKUs, Preise, Bilder bleiben.
//
// Aufruf:  node modell_namen.mjs                    Trockenlauf (Vorgabe)
//          LIVE=1 node modell_namen.mjs             schreibt, Sicherung sicherung_modell.json, liest zurück
//          ZURUECK=1 LIVE=1 node modell_namen.mjs   stellt die alten Namen wieder her
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = process.env.SICHERUNG || join(HIER, 'sicherung_modell.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'sternenlicht-projektor-fur-schlafzimmer-732544';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';
const NEU = {
  A: 'A · Grundmodell',
  B: 'B · mit 6 Motivscheiben',
  C: 'C · Galaxie-Scheibe + 6 Motivscheiben',
  D: 'D · Akku, Bluetooth, 6 Motivscheiben',
  E: 'E · Akku, Bluetooth, Galaxie-Scheibe + 6 Motivscheiben',
  F: 'F · Spieluhr mit Akku, 6 Sternenlicht-Scheiben',
  G: 'G · drehend, Galaxie-Scheibe + 3 Farbscheiben',
};
const SKU = { A: 'CJSN139239101AZ', B: 'CJSN139239102BY', C: 'CJSN139239103CX', D: 'CJSN139239104DW', E: 'CJSN139239105EV', F: 'CJSN139239106FU', G: 'CJSN139239107GT' };

let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = await r.json(); if (!j.access_token) throw new Error('kein Zugang (Client-Credentials)'); token = j.access_token;
  }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}
async function lesen() {
  const d = await gql(`query($h:String!){ productByHandle(handle:$h){ id status options{ id name optionValues{ id name } } variants(first:20){ nodes{ id sku price selectedOptions{ name value } } } } }`, { h: HANDLE });
  const p = d.productByHandle; if (!p) throw new Error('Produkt nicht gefunden');
  const o = p.options.filter((x) => x.name === 'Modell'); if (p.options.length !== 1 || o.length !== 1) throw new Error('erwartet genau eine Option «Modell»');
  return { id: p.id, status: p.status, option: o[0], varianten: p.variants.nodes.map((v) => ({ id: v.id, sku: v.sku, preis: v.price, wert: v.selectedOptions[0].value })) };
}
const buchstabe = (name) => String(name).trim().charAt(0);

const ist = await lesen();
console.log(`IST ${HANDLE} | ${ist.status} | Werte: ${ist.option.optionValues.map((w) => `«${w.name}»`).join(', ')}`);
// Bindung prüfen: jede Variante trägt die SKU, die zu ihrem Buchstaben gehört (sonst nichts anfassen)
for (const v of ist.varianten) { const b = buchstabe(v.wert); if (SKU[b] !== v.sku) { console.error(`ABBRUCH: Variante «${v.wert}» trägt SKU ${v.sku}, erwartet ${SKU[b]}`); process.exit(1); } }
if (ist.varianten.length !== 7 || ist.option.optionValues.length !== 7) { console.error('ABBRUCH: erwartet 7 Varianten und 7 Werte'); process.exit(1); }

let ziel;
if (ZURUECK) {
  if (!existsSync(SICHERUNG)) { console.error('keine Sicherung vorhanden: ' + SICHERUNG); process.exit(1); }
  const alt = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  ziel = ist.option.optionValues.map((w) => ({ id: w.id, alt: w.name, neu: alt.werte.find((x) => x.id === w.id)?.name }));
} else {
  ziel = ist.option.optionValues.map((w) => ({ id: w.id, alt: w.name, neu: NEU[buchstabe(w.name)] }));
}
if (ziel.some((z) => !z.neu)) { console.error('ABBRUCH: für einen Wert fehlt der Zielname'); process.exit(1); }
const aendern = ziel.filter((z) => z.alt !== z.neu);
for (const z of ziel) console.log(`${LIVE ? 'LIVE' : 'PLAN'} «${z.alt}» → «${z.neu}»${z.alt === z.neu ? ' (schon so)' : ''}`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
if (!aendern.length) { console.log('Nichts zu ändern.'); process.exit(0); }
if (!ZURUECK && !existsSync(SICHERUNG)) {
  if (!ist.option.optionValues.every((w) => /^[A-G]$/.test(w.name))) { console.error('ABBRUCH: Werte sind nicht mehr «A» bis «G» und es gibt keine Sicherung'); process.exit(1); }
  writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), produkt: ist.id, option: ist.option.id, werte: ist.option.optionValues, varianten: ist.varianten }, null, 1), { flag: 'wx' });
}
const d = await gql(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v){ userErrors{ field message code } } }`, { p: ist.id, o: { id: ist.option.id }, v: aendern.map((z) => ({ id: z.id, name: z.neu })) });
if (d.productOptionUpdate.userErrors.length) { console.error('FEHLER ' + JSON.stringify(d.productOptionUpdate.userErrors)); process.exit(1); }
await new Promise((ok) => setTimeout(ok, 4000));
const neu = await lesen();
let ok = true;
for (const z of ziel) { const w = neu.option.optionValues.find((x) => x.id === z.id); if (!w || w.name !== z.neu) ok = false; }
for (const v of neu.varianten) { const a = ist.varianten.find((x) => x.id === v.id); if (!a || a.sku !== v.sku || a.preis !== v.preis || buchstabe(a.wert) !== buchstabe(v.wert)) ok = false; }
console.log(`NACHGELESEN Werte: ${neu.option.optionValues.map((w) => `«${w.name}»`).join(', ')} | Varianten ${neu.varianten.length}, SKUs und Preise ${ok ? 'unverändert' : 'PRÜFEN'} | ${ok ? 'OK' : 'ABWEICHUNG'}`);
process.exit(ok ? 0 : 1);
