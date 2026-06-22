// Proof-of-Life: stempelt das Shop-Metafeld luxe.vps_last_run (Hostname + Zeit) per Shopify-API.
// Laeuft am Ende von run-api-jobs.sh. So kann jede Session von aussen pruefen, ob die VPS lebt.
// No-op-sicher: ohne Creds einfach skip.
import os from "os";
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP;
if (!ID || !SEC || !SHOP) { console.log("stamp: keine Shopify-Creds -> skip"); process.exit(0); }
try {
  const tj = await (await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: "client_credentials" })
  })).json();
  const tok = tj.access_token;
  if (!tok) { console.log("stamp: kein access_token -> skip"); process.exit(0); }
  const api = `https://${SHOP}/admin/api/2024-10/graphql.json`;
  const H = { "X-Shopify-Access-Token": tok, "Content-Type": "application/json" };
  const sid = (await (await fetch(api, { method: "POST", headers: H, body: JSON.stringify({ query: "{shop{id}}" }) })).json()).data.shop.id;
  const val = `${os.hostname()} ${new Date().toISOString()}`;
  const m = "mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}";
  const r = await (await fetch(api, { method: "POST", headers: H, body: JSON.stringify({ query: m, variables: { mf: [{ ownerId: sid, namespace: "luxe", key: "vps_last_run", type: "single_line_text_field", value: val }] } }) })).json();
  console.log("stamp:", val, JSON.stringify(r?.data?.metafieldsSet?.userErrors || r).slice(0, 120));
} catch (e) { console.log("stamp Fehler (weiter):", String(e).slice(0, 100)); }
