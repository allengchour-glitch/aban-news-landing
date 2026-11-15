/**
 * Zugang für die Schaufenster-Werkzeuge (reihenfolge.mjs, kopf_setzen.mjs): Token per Client-Credentials wie automation/verfuegbar_zuerst.mjs,
 * danach GraphQL über lib/shopify_gql.mjs (wartet bei Drosselung). Umgebung: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET.
 */
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';

export async function verbinden() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  return (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
}
export const schlaf = ms => new Promise(r => setTimeout(r, ms));
