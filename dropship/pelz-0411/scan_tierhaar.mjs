// NUR LESEN. Zweiter Scan nach Tierarten: Haar-/Wolle-/Angora-Wörter, die der Fell-Scan (scan_echtfell.mjs) nicht abdeckt.
// Ausgabe: Handle | Status | Treffer | Umfeld. Aufruf: node dropship/pelz-0411/scan_tierhaar.mjs
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const TERME = ['Kaninchenhaar', 'Hasenhaar', 'Kaninchenwolle', 'Angora', 'Nerzhaar', 'Fuchshaar', 'Rexkaninchen', 'Rex-Kaninchen', 'Waschbärfell', 'Marderhund', 'Echtpelz', 'Echtfell', 'Pelzmantel', 'Kaninchenpelz', 'Hasenpelz', 'Fuchspelz', 'Nerzpelz', 'Kaschmir'];
const RE = /(kaninchenhaar|hasenhaar|kaninchenwolle|angora|nerzhaar|fuchshaar|rex-?kaninchen|waschb[aä]rfell|marderhund|echtpelz|echtfell|kaninchenpelz|hasenpelz|fuchspelz|nerzpelz|echtes\s+fell|echter\s+pelz)/i;
const IMITAT = /(imitat|faux|kunstfell|kunstpelz|plüsch|plusch|synthet|künstlich|kunstlich|fake|vegan|ohne tierisch)/i;
const gesehen = new Map();
for (const t of TERME.filter((x) => x !== 'Kaschmir')) {
  let after = null;
  for (let s = 0; s < 4; s++) {
    const j = await q(`query($q:String!,$a:String){products(first:100,query:$q,after:$a){nodes{handle title status descriptionHtml}pageInfo{hasNextPage endCursor}}}`, { q: `status:active AND ${t}`, a: after });
    for (const p of j.products.nodes) gesehen.set(p.handle, p);
    if (!j.products.pageInfo.hasNextPage) break; after = j.products.pageInfo.endCursor;
  }
}
let n = 0;
for (const p of gesehen.values()) {
  const text = (p.title + ' ' + p.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  const m = text.match(RE); if (!m) continue;
  const um = text.slice(Math.max(0, m.index - 70), m.index + 90);
  const imi = IMITAT.test(text.slice(Math.max(0, m.index - 120), m.index + 140));
  n++; console.log((imi ? 'imitat? ' : 'OHNE    ') + p.handle + ' | ' + m[0] + ' | ' + um);
}
console.error('gesehen:', gesehen.size, 'mit Treffer:', n);
