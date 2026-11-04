// Katzenhängematte (Auftrag Besitzer 04.11.2026): Material «Holz» → «Stoff» (CJ-Beschreibung: «Material: Fabric», das strukturierte Feld «Wood» ist falsch)
// und englische Farbnamen in der Option «Ausführung» eindeutschen. Trockenlauf Vorgabe, LIVE=1 schreibt. Sicherung vorher, Rücklesen nachher.
import { writeFileSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1';
const HANDLE = 'faltbare-katzenhangematte-mit-saugnapfen-639500';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token;
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const lesen = async () => (await q(`query($h:String!){productByHandle(handle:$h){id title descriptionHtml options{id name optionValues{id name}} variants(first:50){nodes{sku title}}}}`, { h: HANDLE })).productByHandle;
const p = await lesen();
writeFileSync((process.env.ARBEIT || '/tmp/katalog-korrektur-0411/') + 'sicherung_vor.json', JSON.stringify(p, null, 1));
const FARBEN = { 'Sea Salt Blue': 'Hellblau', 'Milk Fufu Yellow': 'Milchgelb' };
const ALT = '<strong>Material:</strong> Holz</li>', NEU = '<strong>Material:</strong> Stoff</li>';
if (p.descriptionHtml.split(ALT).length !== 2) throw new Error('Material-Zeile kommt nicht genau einmal vor');
const opt = p.options.find((o) => o.name === 'Ausführung');
const umbenennen = opt.optionValues.map((v) => {
  let n = v.name; for (const [a, b] of Object.entries(FARBEN)) n = n.replace(a, b);
  return { id: v.id, alt: v.name, name: n };
}).filter((x) => x.alt !== x.name);
console.log('Beschreibung:', ALT, '→', NEU);
console.log('Optionswerte:'); for (const u of umbenennen) console.log('  ', u.alt, '→', u.name);
const doppelt = new Set(opt.optionValues.map((v) => v.name).map((n) => { let m = n; for (const [a, b] of Object.entries(FARBEN)) m = m.replace(a, b); return m; }));
if (doppelt.size !== opt.optionValues.length) throw new Error('Umbenennung würde Werte zusammenfallen lassen');
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
const u1 = await q(`mutation($i:ProductInput!){productUpdate(input:$i){product{id} userErrors{field message}}}`, { i: { id: p.id, descriptionHtml: p.descriptionHtml.replace(ALT, NEU) } });
console.log('Beschreibung', JSON.stringify(u1.productUpdate.userErrors)); if (u1.productUpdate.userErrors.length) process.exit(5);
const u2 = await q(`mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u){product{id} userErrors{field message code}}}`, { p: p.id, o: { id: opt.id }, u: umbenennen.map((x) => ({ id: x.id, name: x.name })) });
console.log('Optionen', JSON.stringify(u2.productOptionUpdate.userErrors)); if (u2.productOptionUpdate.userErrors.length) process.exit(5);
await new Promise((s) => setTimeout(s, 5000));
const n = await lesen();
console.log('NACH:', JSON.stringify(n.options.find((o) => o.name === 'Ausführung').optionValues.map((v) => v.name)));
console.log('Material-Zeile:', (n.descriptionHtml.match(/<strong>Material:<\/strong>[^<]*/) || [])[0]);
console.log('SKUs unverändert:', JSON.stringify(n.variants.nodes.map((v) => v.sku)) === JSON.stringify(p.variants.nodes.map((v) => v.sku)), '| Varianten', n.variants.nodes.length);
console.log(n.variants.nodes.map((v) => v.title).join(' · '));
