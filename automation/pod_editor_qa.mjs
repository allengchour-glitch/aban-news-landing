#!/usr/bin/env node
/* pod_editor_qa.mjs — QA-Wächter für den «Selbst gestalten»-Editor.
 * Prüft ALLE aktiven Editor-Produkte (data-img-front/back im body_html):
 *   1. Canvas-URLs müssen HTTP 200 liefern (404/403 = Editor zeigt KEIN Produkt → Conversion-Killer).
 *   2. Keine abannews.com-URLs (tote Domain) — nur cdn.shopify.com.
 *   3. designer.js-Src ohne ?v=-Ketten.
 * Exit 1 bei Befunden (für CI/Session-Checks). ENV: SHOPIFY_CLIENT_ID/SECRET
 * REGEL (2026-07-06, teuer gelernt): Editor-Canvas-Bilder IMMER zuerst auf die Shopify-CDN
 * hochladen (upload_to_shopify_cdn.mjs) und die URL aus der Antwort nehmen — nie URLs raten!
 */
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, query, variables) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query, variables }) });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
    return j.data;
  }
  return null;
}

const t = await tok();
let cursor = null, findings = [], checked = 0;
while (true) {
  const d = await gql(t, `query($c:String){ products(first:50,after:$c,query:"tag:printful_personalized_product status:active"){
    pageInfo{hasNextPage endCursor} edges{node{ handle descriptionHtml }} }}`, { c: cursor });
  const page = d?.products; if (!page) break;
  for (const e of page.edges) {
    const h = e.node.descriptionHtml || '';
    const urls = [...h.matchAll(/data-img-(?:front|back)="([^"]+)"/g)].map(m => m[1]);
    if (!urls.length) continue; // Fertigdesign ohne Editor-Canvas
    checked++;
    for (const u of urls) {
      if (u.includes('abannews.com')) { findings.push(`${e.node.handle}: tote Domain ${u.slice(0, 60)}`); continue; }
      try {
        const r = await fetch(u, { method: 'HEAD' });
        if (r.status !== 200) findings.push(`${e.node.handle}: HTTP ${r.status} ${u.slice(0, 70)}`);
      } catch { findings.push(`${e.node.handle}: FETCH-FEHLER ${u.slice(0, 70)}`); }
    }
    if (/\.js\?v=\d+\?v=/.test(h)) findings.push(`${e.node.handle}: designer.js ?v=-Kette`);
  }
  cursor = page.pageInfo.endCursor;
  if (!page.pageInfo.hasNextPage) break;
}
console.log(`Editor-QA: ${checked} Editor-Produkte geprüft, ${findings.length} Befunde.`);
findings.forEach(f => console.log(' ✗', f));
process.exit(findings.length ? 1 : 0);
