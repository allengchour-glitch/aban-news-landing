// Textkorrekturen «Selbst gestalten» nach dem Audit vom 04.11.2026: Material- und Faserangaben an die Printful-Katalogtexte angleichen.
// Trockenlauf ist Vorgabe (zeigt die Änderungen), LIVE=1 schreibt (Sicherung nach vorher/, Rücklesen), ZURUECK=1 LIVE=1 stellt aus vorher/ wieder her.
// Je Ersetzung muss die alte Zeichenkette GENAU EINMAL vorkommen, sonst bricht das Produkt ab (nichts geschrieben).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const FASER = [
  ['75 % recycelter Polyester, 25 % Elasthan (Produktion in den USA/Mexiko)', '78 % Polyester, 22 % Elasthan (Produktion in den USA)'],
  ['82 % Polyester, 18 % Elasthan (Produktion in Lettland)', '84 % Polyester, 16 % Elasthan (Produktion in Lettland)'],
  ['Stoffgewicht: 225 g/m² (6.64 oz/yd²) in den USA/Mexiko', 'Stoffgewicht: 290 g/m² (8.55 oz/yd²) in den USA'],
];
const PLAN = {
  'allover-sport-bh-selbst-gestalten': FASER,
  'allover-yoga-leggings-selbst-gestalten': FASER,
  'einteiliger-allover-badeanzug-selbst-gestalten': FASER,
  'bio-jutebeutel-selbst-gestalten': [
    ['Bio-Baumwolle 3/1 Cord', 'Bio-Baumwolle, 3/1-Köper (Twill)'],
    ['<strong>Material:</strong> Baumwolle, Cord', '<strong>Material:</strong> Baumwolle'],
  ],
  'dad-cap-selbst-gestalten': [
    ['100 % Baumwoll-Chino-Cord', '100 % Chino-Baumwollköper'],
    ['Green Camo ist 35 % Baumwoll-Chino-Cord, 65 % Polyester', 'Green Camo: 35 % Chino-Baumwollköper, 65 % Polyester'],
    ['<strong>Material:</strong> Polyester, Cord', '<strong>Material:</strong> Baumwolle'],
  ],
  'kuscheldecke-selbst-gestalten': [
    ['Herrlich weiches Fleece.', 'Herrlich weicher Stoff mit seidigem Griff.'],
    ['Superweiches Fleece, angenehm warm', 'Superweicher Stoff aus 100 % Polyester mit seidigem Griff, angenehm warm'],
  ],
  'strandtuch-selbst-gestalten': [
    ['Weiche Mikrofaser, brillanter Allover-Druck.', 'Weicher Frottee, brillanter Allover-Druck.'],
    ['Weiche, saugfähige Mikrofaser', 'Weiche, saugfähige Frottee-Rückseite (50 % Baumwolle, 50 % Polyester)'],
  ],
};
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const lies = async (h) => (await q(`query($h:String!){productByHandle(handle:$h){id title status descriptionHtml}}`, { h })).productByHandle;
mkdirSync(HIER + 'vorher', { recursive: true });
let fehler = 0;
for (const [h, ers] of Object.entries(PLAN)) {
  const p = await lies(h);
  if (!p) { console.log(`${h}: FEHLT`); fehler++; continue; }
  let neu = p.descriptionHtml;
  if (ZURUECK) {
    const f = HIER + `vorher/${h}.html`; if (!existsSync(f)) { console.log(`${h}: keine Sicherung`); fehler++; continue; }
    neu = readFileSync(f, 'utf8');
  } else {
    let ok = true;
    for (const [alt, nw] of ers) {
      // Leerzeichen im Shop-Text sind teils schmale geschützte (U+202F) oder geschützte (U+00A0): beim Suchen alle drei zulassen, beim Ersetzen die Schreibweise des Shops (schmal vor «%») behalten.
      const re = new RegExp(alt.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/ /g, '[ \u00a0\u202f]'), 'g');
      const n = (neu.match(re) || []).length;
      if (n !== 1) { console.log(`${h}: «${alt.slice(0, 50)}» kommt ${n}× vor, übersprungen`); ok = false; break; }
      neu = neu.replace(re, () => nw.replace(/ %/g, '\u202f%')); }
    if (!ok) { fehler++; continue; }
  }
  if (neu === p.descriptionHtml) { console.log(`${h}: schon im Zielzustand`); continue; }
  console.log(`${h} (${p.status}): ${ZURUECK ? 'zurück' : ers.map(([a, b]) => `«${a.slice(0, 40)}» → «${b.slice(0, 50)}»`).join(' | ')}`);
  if (!LIVE) continue;
  if (!ZURUECK) writeFileSync(HIER + `vorher/${h}.html`, p.descriptionHtml);
  const u = (await q(`mutation($i:ProductInput!){productUpdate(input:$i){product{id} userErrors{field message}}}`, { i: { id: p.id, descriptionHtml: neu } })).productUpdate;
  if (u.userErrors.length) { console.log('  FEHLER', JSON.stringify(u.userErrors)); fehler++; continue; }
  await new Promise((s) => setTimeout(s, 3000));
  const nach = await lies(h);
  console.log('  rücklesen:', nach.descriptionHtml === neu ? 'GLEICH' : 'ABWEICHUNG'); if (nach.descriptionHtml !== neu) fehler++;
}
console.log(fehler ? `${fehler} Fehler` : LIVE ? 'fertig' : 'Trockenlauf, nichts geschrieben');
process.exit(fehler ? 1 : 0);
