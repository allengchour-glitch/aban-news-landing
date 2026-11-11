// Kiss-Cut-Aufkleber: belegten Hinweis zur Schnittform nach dem Punkt «Konturschnitt …» ergänzen (11.11.2026).
// Beleg: Printful-Mockup-Generator Modell 358, Variante 10164, transparent gegen deckend (kc_vergleich.png).
// Aufruf: node dropship/konturschnitt-1111/apply.mjs (Trockenlauf) · LIVE=1 · ZURUECK=1 LIVE=1. Ändert nur Text ausserhalb des Editor-Markers.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HIER = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HANDLE = process.env.HANDLE || 'kiss-cut-aufkleber-selbst-gestalten', SICH = join(HIER, `sicherung_${HANDLE}.json`);
const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const SATZ = ' Die Form folgt dem Rand deines Motivs, mit einem schmalen weissen Rand. Durchsichtige Flächen fallen weg; ein Foto mit Hintergrund wird zum Quadrat mit runden Ecken (mit «Freistellen» entfernst du den Hintergrund). Prüfe die Form in der Ansicht «Druckversion» (Karos = durchsichtig).';
let token;
async function gql(q, v = {}) {
  if (!token) token = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
  const j = await (await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query: q, variables: v }) })).json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300)); return j.data;
}
const lesen = async () => (await gql(`query($h:String!){productByIdentifier(identifier:{handle:$h}){id descriptionHtml}}`, { h: HANDLE })).productByIdentifier;
const p = await lesen(); const alt = p.descriptionHtml;
const ANKER = { 'kiss-cut-aufkleber-selbst-gestalten': '<li>✂️ Konturschnitt, exakt um dein Motiv geschnitten</li>', 'magnet-zum-selbstgestalten': '<li>3 Grössen (7,6–15 cm), Konturschnitt (Form folgt deinem Motiv)</li>' }[HANDLE];
const EINSCHUB = '\n<li>' + SATZ.trim() + '</li>';
let neu;
if (ZURUECK) { neu = JSON.parse(readFileSync(SICH, 'utf8')).descriptionHtml; }
else {
  if (alt.includes('Die Form folgt dem Rand deines Motivs')) { console.log('schon gesetzt'); process.exit(0); }
  const n = alt.split(ANKER).length - 1;
  if (n !== 1) { console.log(`ABBRUCH: Anker ${n}-mal gefunden (soll 1)`); process.exit(2); }
  const pos = alt.indexOf(ANKER) + ANKER.length;
  neu = alt.slice(0, pos) + EINSCHUB + alt.slice(pos);
  if (neu.slice(0, pos) !== alt.slice(0, pos) || neu.slice(pos + EINSCHUB.length) !== alt.slice(pos)) { console.log('ABBRUCH: mehr als ein Einschub'); process.exit(2); }
  console.log('Einschub nach', JSON.stringify(ANKER), '| Länge', alt.length, '→', neu.length);
}
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben.'); process.exit(0); }
if (!ZURUECK && !existsSync(SICH)) writeFileSync(SICH, JSON.stringify({ gelesen: new Date().toISOString(), id: p.id, descriptionHtml: alt }), { flag: 'wx' });
const d = await gql(`mutation($i:ProductUpdateInput!){productUpdate(product:$i){userErrors{field message}}}`, { i: { id: p.id, descriptionHtml: neu } });
if (d.productUpdate.userErrors.length) { console.log('FEHLER', JSON.stringify(d.productUpdate.userErrors)); process.exit(1); }
await new Promise((r) => setTimeout(r, 3000));
const n = await lesen();
const ok = n.descriptionHtml === neu;
console.log(`NACHGELESEN ${ok ? 'OK' : 'ABWEICHUNG'} | Länge ${n.descriptionHtml.length}`);
process.exit(ok ? 0 : 1);
