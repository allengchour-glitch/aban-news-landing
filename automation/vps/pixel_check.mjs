// pixel_check.mjs — täglicher TikTok-Pixel-Healthcheck. Prüft die Storefront-HTML auf Pixel + PageView und
// stempelt das Shop-Metafeld luxe.pixel_status (von jeder Session/aussen lesbar -> "Pixel-Status regelmässig").
// No-op-sicher. Lauf: node automation/vps/pixel_check.mjs   (Creds aus ENV, NIE im Repo).
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP;
const STORE = process.env.STORE_URL || 'https://luxestyle.ch/';
let html = ''; try { html = await (await fetch(STORE, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone)' }, signal: AbortSignal.timeout(15000) })).text(); } catch (e) { html = ''; console.log('pixel_check: Storefront-Fetch fehlgeschlagen ->', String(e).slice(0,60)); }
const has = s => html.includes(s);
const pid = has('D8EKVR'), load = has('ttq.load'), page = has('ttq.page'), wpm = has('web-pixels-manager');
const ok = pid && page && wpm;
const status = `${ok ? 'OK' : 'WARN'} pid=${pid ? 1 : 0} load=${load ? 1 : 0} page=${page ? 1 : 0} wpm=${wpm ? 1 : 0} @ ${new Date().toISOString()}`;
console.log('pixel_check:', status);
if (!ID || !SEC || !SHOP) { console.log('pixel_check: keine Shopify-Creds -> kein Stamp'); process.exit(0); }
try {
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
  if (!tok) { console.log('pixel_check: kein Token'); process.exit(0); }
  const api = `https://${SHOP}/admin/api/2024-10/graphql.json`; const H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
  const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
  const m = 'mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}';
  await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: m, variables: { mf: [{ ownerId: sid, namespace: 'luxe', key: 'pixel_status', type: 'single_line_text_field', value: status.slice(0, 250) }] } }) });
  console.log('pixel_check: Metafeld luxe.pixel_status gestempelt');
} catch (e) { console.log('pixel_check Fehler:', String(e).slice(0, 80)); }
