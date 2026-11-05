// Preise der «Selbst gestalten»-Produkte nach der Preisformel (werkzeuge/preisformel.mjs) ANHEBEN (nie senken).
// Trockenlauf ist Vorgabe.  Einspielen: LIVE=1 node apply.mjs   Rücknahme: ZURUECK=1 LIVE=1 node apply.mjs (stellt die gesicherten alten Preise wieder her, nur wo der Preis noch dem neuen Wert entspricht)
// Eingabe: ../werkzeuge/preise_gegenprobe.json (Printful-Kosten und Versand, GEMESSEN 05.11.2026); aktuelle Shoppreise werden frisch gelesen (nach SKU).
// Exit: 0 ok · 1 kein Token/Fehler vor dem Schreiben · 5 userErrors · 6 Rücklesen weicht ab · 3 Rücknahme nicht möglich
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
import { planen } from './plan.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = HIER + 'sicherung.json';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const pause = (ms) => new Promise((s) => setTimeout(s, ms));

const gegenprobe = JSON.parse(readFileSync(HIER + '../werkzeuge/preise_gegenprobe.json', 'utf8'));
const handles = [...new Set(gegenprobe.zeilen.map((z) => z[0]))];

async function shopLesen() {
  const m = {};
  for (const h of handles) {
    const p = (await q(`query($h:String!){productByHandle(handle:$h){id handle status variants(first:100){nodes{id sku price}}}}`, { h })).productByHandle;
    if (!p) continue;
    for (const v of p.variants.nodes) if (v.sku) m[v.sku] = { id: v.id, productId: p.id, handle: p.handle, price: v.price };
  }
  return m;
}

if (ZURUECK) {
  if (!existsSync(SICH)) { console.error('Keine Sicherung vorhanden'); process.exit(3); }
  const s = JSON.parse(readFileSync(SICH, 'utf8'));
  const jetzt = await shopLesen();
  let ok = 0, fremd = 0; const je = {};
  for (const z of s.geaendert) {
    const v = jetzt[z.sku];
    if (!v) { fremd++; continue; }
    if (Math.abs(Number(v.price) - z.neu) > 1e-9) { console.log('FREMD verändert, nicht zurückgesetzt:', z.sku, 'Shop', v.price, 'erwartet', z.neu); fremd++; continue; }
    (je[z.productId] ||= []).push({ id: z.variantId, price: z.alt.toFixed(2) }); ok++;
  }
  console.log('Rücknahme: zurücksetzbar', ok, '| nicht zurückgesetzt', fremd);
  if (!LIVE) { console.log('Trockenlauf (LIVE=1 schreibt).'); process.exit(0); }
  for (const [pid, vs] of Object.entries(je)) {
    const u = (await q(`mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{field message}}}`, { p: pid, v: vs })).productVariantsBulkUpdate;
    if (u.userErrors.length) { console.error('userErrors', JSON.stringify(u.userErrors)); process.exit(5); }
    await pause(400);
  }
  console.log('Rücknahme geschrieben.'); process.exit(0);
}

const shop = await shopLesen();
const res = planen(gegenprobe.zeilen, shop);
console.log('Shop-Varianten gelesen', Object.keys(shop).length, '| Zeilen', gegenprobe.zeilen.length);
console.log('ANHEBEN', res.plan.length, '(Summe +CHF', res.summe.toFixed(2) + ') | gleich', res.gleich.length, '| Formel tiefer (nicht geändert)', res.tiefer.length, '| nicht im Shop', res.fehlt.length, '| ohne Daten', res.ohneDaten.length);
const je = {}; for (const z of res.plan) (je[z.handle] ||= []).push(z);
for (const [h, zs] of Object.entries(je)) console.log(' ', h, zs.length, 'Varianten, z. B.', zs[0].alt.toFixed(2), '→', zs[0].neu.toFixed(2), `(${zs[0].bindend})`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben (LIVE=1 schreibt).'); process.exit(0); }
if (!res.plan.length) { console.log('Nichts zu tun.'); process.exit(0); }
if (existsSync(SICH)) { console.error('sicherung.json liegt schon vor (frühere Einspielung): erst ZURUECK=1 oder Datei prüfen und verschieben.'); process.exit(3); }
writeFileSync(SICH, JSON.stringify({ gesichert: 'vor dem Einspielen, Shop-Preise gelesen', regel: 'preisformel.mjs, kurs 0.90, nettoMin 4.00, faktor 2.3, aufschlagFix 12, nur Erhöhungen', geaendert: res.plan }, null, 1));
const nachProdukt = {}; for (const z of res.plan) (nachProdukt[z.productId] ||= []).push({ id: z.variantId, price: z.neu.toFixed(2) });
for (const [pid, vs] of Object.entries(nachProdukt)) {
  const u = (await q(`mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{field message}}}`, { p: pid, v: vs })).productVariantsBulkUpdate;
  if (u.userErrors.length) { console.error('userErrors', JSON.stringify(u.userErrors), '→ Sicherung', SICH); process.exit(5); }
  await pause(400);
}
// Rücklesen (mit Wartezeit, die API liest kurz nach dem Schreiben teils alt)
let abw = [];
for (let versuch = 0; versuch < 4; versuch++) {
  await pause(versuch ? 8000 : 3000);
  const jetzt = await shopLesen();
  abw = res.plan.filter((z) => !jetzt[z.sku] || Math.abs(Number(jetzt[z.sku].price) - z.neu) > 1e-9);
  if (!abw.length) break;
}
if (abw.length) { console.error('RÜCKLESEN WEICHT AB bei', abw.length, 'Varianten, z. B.', JSON.stringify(abw.slice(0, 3))); process.exit(6); }
console.log('Rückgelesen: alle', res.plan.length, 'Preise gleich Soll. Sicherung:', SICH);
