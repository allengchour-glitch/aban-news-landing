// Kleiner Admin-Zugang: Token per Client-Credentials, zwischengespeichert ausserhalb des Repos (~24 h).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const CACHE = process.env.LX_TOKEN_CACHE || path.join(os.tmpdir(), 'lx-shoptok-scroll-story.json'); // nie im Repo-Ordner
export async function token() {
  try { const d = JSON.parse(fs.readFileSync(CACHE, 'utf8')); if (d.exp > Date.now() + 600000) return d.t; } catch {}
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('kein Token: HTTP ' + r.status);
  fs.writeFileSync(CACHE, JSON.stringify({ t: j.access_token, exp: Date.now() + (Number(j.expires_in || 86000) * 1000) }), { mode: 0o600 });
  return j.access_token;
}
export async function gql(q, v) {
  const tok = await token();
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await new Promise(r => setTimeout(r, 3000)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 600));
    return j.data;
  }
  throw new Error('gedrosselt');
}
export async function mainTheme() {
  const n = (await gql(`{themes(first:5,roles:[MAIN]){nodes{id name role}}}`)).themes.nodes;
  if (n.length !== 1) throw new Error('MAIN nicht eindeutig');
  return n[0];
}
export async function themeLesen(themeId, namen) {
  const out = {};
  const d = await gql(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:50){nodes{filename checksumMd5 size body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: themeId, f: namen });
  for (const n of d.theme.files.nodes) out[n.filename] = { md5: n.checksumMd5, size: n.size, content: n.body?.content ?? null };
  return out;
}
