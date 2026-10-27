#!/usr/bin/env node
/**
 * Prüft die eingebetteten Eingabetypen von Grind 2.0 (lib/grind_plan.mjs → SCHEMA) gegen die Introspektion der ECHTEN Shopify-Admin-API in der Version, die Grind fährt (API_VERSION).
 * NUR LESEN: ein Token per Client-Credentials-Grant und Introspektionsabfragen, keine Mutation. Vor jedem Wechsel von API_VERSION laufen lassen.
 *
 *   node automation/grind_schema_pruefen.mjs            (Version = API_VERSION; VERSIONEN=2026-01,2026-04 prüft mehrere)
 *   Exit 0 = alles deckt sich · 1 = Abweichung oder kein Zugang
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';
import { SCHEMA, SCHEMA_ENUMS, API_VERSION, SCHEMA_API_VERSION } from './lib/grind_plan.mjs';
import { typText, vergleicheTyp, vergleicheEnum } from './lib/grind_schema.mjs';

let shop = '';
try { shop = normalizeShopifyHost(process.env.SHOPIFY_SHOP); } catch (e) { console.error(String(e.message)); process.exit(1); }
if (!shop || !process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) { console.error('SHOPIFY_SHOP / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET fehlen'); process.exit(1); }
const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const tok = (await r.json().catch(() => ({}))).access_token;
if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }

const TYP = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
let abweichungen = 0;
if (SCHEMA_API_VERSION !== API_VERSION) { console.log(`ABWEICHUNG: SCHEMA wurde gegen ${SCHEMA_API_VERSION} gelesen, Grind fährt ${API_VERSION}`); abweichungen++; }
for (const v of (process.env.VERSIONEN || API_VERSION).split(',')) {
  console.log(`\n===== Admin-API ${v} =====`);
  const q = (a, b) => shopifyGql(shop, v, tok, a, b);
  for (const [name, felder] of Object.entries(SCHEMA)) {
    const d = (await q(`${TYP} query($n:String!){ __type(name:$n){ kind inputFields{ name type{ ...T } } } }`, { n: name })).__type;
    if (!d) { console.log(`  ${name}: TYP FEHLT in ${v}`); abweichungen++; continue; }
    const c = vergleicheTyp(name, felder, Object.fromEntries(d.inputFields.map(f => [f.name, typText(f.type)])));
    if (c.ok) console.log(`  ${name}: deckt sich (${d.inputFields.length} Felder)`);
    else { abweichungen++; console.log(`  ${name}: im SCHEMA, nicht in ${v}: [${c.fehlt}] · in ${v}, nicht im SCHEMA: [${c.neu}] · Typ: [${c.typ}] · Pflicht: [${c.pflicht}]`); }
  }
  for (const [name, werte] of Object.entries(SCHEMA_ENUMS)) {
    const d = (await q('query($n:String!){ __type(name:$n){ enumValues{ name } } }', { n: name })).__type;
    const c = vergleicheEnum(werte, (d?.enumValues || []).map(x => x.name));
    if (c.ok) console.log(`  Enum ${name}: deckt sich`); else { abweichungen++; console.log(`  Enum ${name}: fehlen in ${v}: [${c.fehlt}] · neu: [${c.neu}]`); }
  }
}
console.log(abweichungen ? `\n${abweichungen} Abweichung(en): SCHEMA in lib/grind_plan.mjs nachziehen` : '\nalles deckt sich');
process.exit(abweichungen ? 1 : 0);
