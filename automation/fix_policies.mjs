#!/usr/bin/env node
/**
 * fix_policies.mjs — korrigiert die E-Mail-Tippfehler in den Shop-Policies automatisch.
 *
 * Hintergrund: Inkonsistente Kontaktdaten in Policies sind ein häufiger Google-Merchant-
 * „Misrepresentation"-Sperrgrund. Diese Fixes gehen NICHT per Shopify-MCP (Scope
 * `write_legal_policies` fehlt dort) — ABER mit den Creds der „ALLE-Zugriffe"-Custom-App
 * (client_credentials) sehr wohl, da diese App alle Scopes hat.
 *
 * Ersetzt in ALLEN Policies:
 *   info@luxestyle.com      -> info@luxestyle.ch
 *   allengchour@gmail.com   -> info@luxestyle.ch
 *
 * ENV (transient/GitHub-Secrets, NIE committen):
 *   SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET   (oder SHOPIFY_TOKEN direkt)
 * Lauf:  node automation/fix_policies.mjs        ·   DRY=1 …  (nur anzeigen)
 */
const SHOP = process.env.SHOPIFY_SHOP, CID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1', API = '2025-01';
const REPLACE = [
  [/info@luxestyle\.com/gi, 'info@luxestyle.ch'],
  [/allengchour@gmail\.com/gi, 'info@luxestyle.ch'],
];
async function token() {
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: SEC, grant_type: 'client_credentials' }) });
  if (!r.ok) throw new Error('token grant failed: ' + r.status + ' ' + await r.text());
  return (await r.json()).access_token;
}
async function gql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
}
(async () => {
  const tok = await token();
  const d = await gql(tok, `{ shop { shopPolicies { type body } } }`);
  let changed = 0;
  for (const pol of d.shop.shopPolicies) {
    if (!pol.body) continue;
    let nb = pol.body;
    for (const [re, to] of REPLACE) nb = nb.replace(re, to);
    if (nb !== pol.body) {
      console.log(`fix ${pol.type}: ${[...pol.body.matchAll(/[\w.+-]+@[\w.-]+/g)].map(m=>m[0]).join(', ')} → info@luxestyle.ch`);
      if (!DRY) {
        const r = await gql(tok, `mutation($p:ShopPolicyInput!){ shopPolicyUpdate(shopPolicy:$p){ userErrors{field message} } }`,
          { p: { type: pol.type, body: nb } });
        const errs = r.shopPolicyUpdate.userErrors;
        if (errs.length) console.error('  ⚠️', JSON.stringify(errs)); else changed++;
      } else changed++;
    }
  }
  console.log(`${DRY?'[DRY] ':''}policies updated: ${changed}`);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
