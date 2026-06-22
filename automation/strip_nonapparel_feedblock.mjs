// strip_nonapparel_feedblock.mjs — entfernt den irrtümlich angehängten <div class="ls-feed-details">-Block
// (Grösse XS–XL · Material · Muster) von NICHT-Mode-Produkten (Schmuck/Beauty/Accessoires). Fix des
// "Set/Box"-Falsch-Treffers in enrich_apparel_descriptions.mjs. Idempotent: nach Bereinigung kein Treffer mehr.
// Lauf: node automation/strip_nonapparel_feedblock.mjs   (DRY=1 = nur anzeigen). Creds aus ENV (NIE im Repo).
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP;
const DRY = process.env.DRY === '1'; const MAX = Number(process.env.MAX || 600);
if (!ID || !SEC || !SHOP) { console.log('strip: keine Shopify-Creds -> skip'); process.exit(0); }
const NON_APPAREL = /roller|gua.?sha|schmuck|halskette|\bkette\b|armband|armreif|armkette|\bring\b|ohrring|ohrhänger|creole|anhänger|brosche|\bbeauty\b|serum|cr[eè]me|maske|\bkerze|duft|parfum|diffuser|tasche|rucksack|beutel|portemonnaie|\buhr\b|brille|\bhut\b|mütze|\bcap\b|schal|stola|kissen|\blampe|spielzeug|deko/i;
const tj = await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json();
const tok = tj.access_token; if (!tok) { console.log('strip: kein Token -> skip'); process.exit(0); }
const api = `https://${SHOP}/admin/api/2024-10/graphql.json`; const H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
const q = async (query, variables) => (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query, variables }) })).json());
const BLOCK = /\s*<div class="ls-feed-details">[\s\S]*?<\/div>\s*$/;
let cursor = null, seen = 0, fixed = 0;
while (seen < MAX) {
  const d = await q(`query($c:String){products(first:50,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor} nodes{id title productType descriptionHtml}}}`, { c: cursor });
  const pr = d?.data?.products; if (!pr) { console.log('strip: query-Fehler', JSON.stringify(d).slice(0, 150)); break; }
  for (const p of pr.nodes) {
    seen++;
    if (!(p.descriptionHtml || '').includes('ls-feed-details')) continue;
    const hay = (p.productType + ' ' + p.title).toLowerCase();
    if (!NON_APPAREL.test(hay)) continue; // nur Schmuck/Beauty/Accessoires bereinigen, echte Mode behalten
    const cleaned = (p.descriptionHtml || '').replace(BLOCK, '').replace(/<div class="ls-feed-details">[\s\S]*?<\/div>/, '');
    if (cleaned === p.descriptionHtml) continue;
    if (DRY) { console.log('[DRY] würde bereinigen:', p.title); fixed++; continue; }
    const r = await q(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`, { i: { id: p.id, descriptionHtml: cleaned } });
    const err = r?.data?.productUpdate?.userErrors;
    console.log((err && err.length ? 'FEHLER ' : 'bereinigt '), p.title, err && err.length ? JSON.stringify(err) : '');
    fixed++;
  }
  if (!pr.pageInfo.hasNextPage) break; cursor = pr.pageInfo.endCursor;
}
console.log(`strip-feedblock${DRY ? ' [DRY]' : ''}: ${seen} gesehen, ${fixed} bereinigt`);
