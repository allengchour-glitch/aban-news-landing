// SEO-Push 10.11.2026 (Beleg und Bauplan: dropship/seo-push-1011/README.md). Trockenlauf ist Vorgabe.
//   node dropship/seo-push-1011/apply.mjs                     → liest alles, prüft die Vorbedingungen, schreibt NICHTS
//   LIVE=1 node dropship/seo-push-1011/apply.mjs              → schreibt (Sicherung vorher), stoppt bei der ersten Abweichung
//   NUR=S3,S5 …                                               → nur diese Schritte (Reihenfolge bleibt wie im Plan)
//   ZURUECK=1 [LIVE=1] node dropship/seo-push-1011/apply.mjs  → stellt die Sicherung wieder her (Trockenlauf ohne LIVE)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { lauf } from './ablauf.mjs';
const hier = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(path.join(hier, 'plan.json'), 'utf8'));
const SICH = path.join(hier, 'sicherung.json');
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const tr = await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json();
if (!tr.access_token) { console.error('kein Token'); process.exit(10); }
const gql = async (q, v) => {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tr.access_token }, body: JSON.stringify({ query: q, variables: v }) });
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes('Throttled')) { await new Promise(s => setTimeout(s, 2000 * (i + 1))); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('gedrosselt');
};
const res = await lauf({
  gql, plan, live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1',
  nur: process.env.NUR ? process.env.NUR.split(',').map(s => s.trim()) : null,
  sicherung: { lesen: () => (fs.existsSync(SICH) ? JSON.parse(fs.readFileSync(SICH, 'utf8')) : null), schreiben: o => fs.writeFileSync(SICH, JSON.stringify(o, null, 1)) },
  warte: ms => new Promise(s => setTimeout(s, ms)), log: (...a) => console.log(...a),
});
console.log(JSON.stringify({ exit: res.exit, grund: res.grund || null, geschrieben: (res.ergebnis || []).length }));
process.exit(res.exit);
