// Lesender Scan: aktive Produkte, deren EIGENER Text echte Tierarten als Pelz/Fell nennt (ohne Imitat-Wort in derselben Umgebung).
// Nur lesen. Ausgabe: Handle | Treffer | Umfeld (kurz).
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
// Suchbegriffe (Shopify-Volltext auf Titel/Text/Tags/Typ); danach lokal mit Regex gefiltert
const TERME = ['Marderhund', 'Waschbär', 'Waschbaer', 'Nerz', 'Silberfuchs', 'Fuchsfell', 'Fuchspelz', 'Kaninchenfell', 'Hasenfell', 'Rexfell', 'Lammfell', 'Schaffell', 'Schafsfell', 'Echtfell', 'Echtpelz', 'Pelzkragen', 'Pelz', 'Kojote', 'Marder', 'Zobel', 'Chinchilla', 'Persianer', 'Kalbfell', 'Ziegenfell', 'Pelzfutter'];
const STARK = /(marderhund|waschb[aä]r|nerz|silberfuchs|fuchsfell|fuchspelz|kojote|zobel|chinchilla|persianer|lammfell|schaffell|schafsfell|kalbfell|ziegenfell|echtfell|echtpelz|echtes\s+(fell|pelz)|echter\s+pelz|rex[-\s]?kaninchen|kaninchenfell|hasenfell|marder)/i;
const IMITAT = /(imitat|faux|kunstfell|kunstpelz|plüsch|plusch|synthet|polyester|künstlich|kunstlich|fake|vegan)/i;
const gesehen = new Map();
for (const t of TERME) {
  let after = null;
  for (let seite = 0; seite < 6; seite++) {
    const j = await q(`query($q:String!,$a:String){products(first:100,query:$q,after:$a){nodes{id handle title status descriptionHtml tags}pageInfo{hasNextPage endCursor}}}`, { q: `status:active AND ${t}`, a: after });
    const d = j.products;
    for (const p of d.nodes) gesehen.set(p.id, p);
    if (!d.pageInfo.hasNextPage) break; after = d.pageInfo.endCursor;
  }
}
const aus = [];
for (const p of gesehen.values()) {
  const text = (p.title + ' ' + p.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  const m = text.match(STARK); if (!m) continue;
  const i = m.index, umfeld = text.slice(Math.max(0, i - 70), i + 90);
  const imitat = IMITAT.test(text.slice(Math.max(0, i - 120), i + 140));
  aus.push({ handle: p.handle, treffer: m[0], imitatImUmfeld: imitat, umfeld });
}
aus.sort((a, b) => Number(a.imitatImUmfeld) - Number(b.imitatImUmfeld) || a.treffer.localeCompare(b.treffer));
console.log('Produkte aus den Suchen:', gesehen.size, '| mit starkem Treffer im eigenen Text:', aus.length, '| davon ohne Imitat-Wort im Umfeld:', aus.filter((x) => !x.imitatImUmfeld).length);
for (const x of aus) console.log((x.imitatImUmfeld ? 'imitat? ' : 'OHNE    ') + x.handle + ' | ' + x.treffer + ' | ' + x.umfeld);
