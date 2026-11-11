// Zoll-Werte in Optionswerten umbenennen (11.11.2026). Regeln: zoll_lib.mjs. Nur Namen ändern sich; Varianten-IDs, SKUs, Preise bleiben.
// Aufruf: node apply.mjs (Trockenlauf) · LIVE=1 node apply.mjs · ZURUECK=1 LIVE=1 node apply.mjs (stellt aus sicherung.json her)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zollPlan } from './zoll_lib.mjs';
const HIER = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const SICHERUNG = join(HIER, 'sicherung.json'), OFFEN = join(HIER, 'offen.json');
const HANDLES = JSON.parse(readFileSync(join(HIER, 'zoll_treffer.json'), 'utf8')).map((t) => t.handle);
const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
let token = null;
async function gql(query, variables = {}, n = 0) {
  if (!token) { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) }); token = (await r.json()).access_token; if (!token) throw new Error('kein Zugang'); }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) { if (n < 4 && JSON.stringify(j.errors).includes('THROTTLED')) { await new Promise((ok) => setTimeout(ok, 3000)); return gql(query, variables, n + 1); } throw new Error(JSON.stringify(j.errors).slice(0, 300)); }
  return j.data;
}
const lesen = async (h) => (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status options{id name optionValues{id name}} variants(first:250){nodes{id sku price}} } }`, { h })).productByIdentifier;
const sicherung = existsSync(SICHERUNG) ? JSON.parse(readFileSync(SICHERUNG, 'utf8')) : {};
const stat = { produkte: 0, werte: 0, offen: 0, abweichung: 0 }; const offen = [];
for (const h of HANDLES) {
  const p = await lesen(h);
  if (!p || p.status !== 'ACTIVE') { console.log(`SKIP ${h}: ${p ? p.status : 'fehlt'}`); continue; }
  let aend;
  if (ZURUECK) {
    const s = sicherung[h]; if (!s) continue;
    aend = []; for (const o of s.options) for (const v of o.optionValues) { const jetzt = p.options.find((x) => x.id === o.id)?.optionValues.find((x) => x.id === v.id); if (jetzt && jetzt.name !== v.name) aend.push({ optionId: o.id, valueId: v.id, alt: jetzt.name, neu: v.name }); }
  } else {
    const pl = zollPlan(p); aend = pl.aenderungen; for (const f of pl.offen) offen.push({ handle: h, ...f });
  }
  if (!aend.length) continue;
  stat.produkte++; stat.werte += aend.length;
  for (const a of aend.slice(0, 2)) console.log(`${LIVE ? 'LIVE' : 'PLAN'} ${h.slice(0, 40).padEnd(40)} «${a.alt}» → «${a.neu}»`);
  if (!LIVE) continue;
  if (!ZURUECK && !sicherung[h]) { sicherung[h] = { gelesen: new Date().toISOString(), id: p.id, options: p.options, variants: p.variants.nodes }; writeFileSync(SICHERUNG, JSON.stringify(sicherung, null, 1)); }
  const je = new Map(); for (const a of aend) je.set(a.optionId, [...(je.get(a.optionId) || []), { id: a.valueId, name: a.neu }]);
  for (const [optionId, werte] of je) {
    const d = (await gql(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v){ userErrors{field message code} } }`, { p: p.id, o: { id: optionId }, v: werte })).productOptionUpdate;
    if (d.userErrors.length) { console.log(`  FEHLER ${h}: ${JSON.stringify(d.userErrors).slice(0, 200)}`); stat.abweichung++; }
  }
  const neu = await lesen(h);
  const ok = aend.every((a) => neu.options.find((o) => o.id === a.optionId)?.optionValues.find((v) => v.id === a.valueId)?.name === a.neu)
    && neu.variants.nodes.length === p.variants.nodes.length && neu.variants.nodes.every((v) => { const x = p.variants.nodes.find((y) => y.id === v.id); return x && x.sku === v.sku && x.price === v.price; });
  if (!ok) { stat.abweichung++; console.log(`  ABWEICHUNG ${h}`); }
}
if (!ZURUECK) writeFileSync(OFFEN, JSON.stringify(offen, null, 1));
stat.offen = offen.length;
console.log(`\n${LIVE ? (ZURUECK ? 'ZURÜCK' : 'GESCHRIEBEN') : 'WÜRDE SCHREIBEN'}: ${stat.werte} Werte in ${stat.produkte} Produkten · offen ${stat.offen} · Abweichungen ${stat.abweichung}`);
process.exit(stat.abweichung ? 1 : 0);
