// Shopify-Admin-Client (lesen und schreiben, nur fuer die GMC-Probe). Token per Client-Credentials, API 2025-01.
const SHOP_RAW = String(process.env.SHOPIFY_SHOP || '').trim();
const SHOP = SHOP_RAW.includes('.') ? SHOP_RAW.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : `${SHOP_RAW}.myshopify.com`;
const API = process.env.API || '2025-01';
let TOKEN = null;
export async function token() {
  if (TOKEN) return TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: String(process.env.SHOPIFY_CLIENT_ID).trim(), client_secret: String(process.env.SHOPIFY_CLIENT_SECRET).trim(), grant_type: 'client_credentials' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Token HTTP ${r.status}`);
  TOKEN = j.access_token; return TOKEN;
}
export async function gql(query, variables = {}) {
  for (let v = 1; v <= 6; v++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await token() }, body: JSON.stringify({ query, variables }) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = null; }
    if (r.status === 429 || (j?.errors || []).some(e => e?.extensions?.code === 'THROTTLED')) { await new Promise(s => setTimeout(s, 2000 * v)); continue; }
    if (!r.ok || !j) throw new Error(`HTTP ${r.status} ${t.slice(0, 300)}`);
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 600));
    return j.data;
  }
  throw new Error('gedrosselt');
}
