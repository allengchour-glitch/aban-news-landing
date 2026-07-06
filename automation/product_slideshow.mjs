#!/usr/bin/env node
/* product_slideshow.mjs — «1-Sekunden-Bild-Filme» (User-Idee 2026-07-06): baut aus den
 * vorhandenen Produktfotos ein kurzes Video (0.9s/Bild, sanfter Zoom, 1080×1080) und hängt es
 * als ERSTES Medium ans Produkt (wie bei CJ/Temu: Video zuerst im Produkt-Galerie-Slot).
 * Gratis (ffmpeg), massentauglich, kein CJ-Video nötig.
 * ENV: SHOPIFY_CLIENT_ID/SECRET · QUERY='tag:viral status:active' · LIMIT=30 · [DRY=1]
 * Ledger: dropship/_slideshow_done.txt (Produkt-IDs) — idempotent.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const QUERY = process.env.QUERY || 'tag:viral status:active';
const LIMIT = parseInt(process.env.LIMIT || '30', 10);
const DRY = process.env.DRY === '1';
const LEDGER = 'dropship/_slideshow_done.txt';
const TMP = '/tmp/slideshow';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, q, v) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query: q, variables: v }) });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
    return j;
  }
  return {};
}

const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
const t = await tok(); if (!t) { console.error('kein Token'); process.exit(1); }
fs.mkdirSync(TMP, { recursive: true });

let cursor = null, made = 0;
while (made < LIMIT) {
  const d = await gql(t, `query($q:String!,$c:String){ products(first:25, query:$q, after:$c, sortKey:CREATED_AT, reverse:true){
    pageInfo{hasNextPage endCursor}
    edges{ node{ id title media(first:9){ edges{ node{ id mediaContentType preview{image{url}} } } } } } }}`, { q: QUERY, c: cursor });
  const page = d.data?.products; if (!page) break;
  for (const e of page.edges) {
    if (made >= LIMIT) break;
    const n = e.node;
    const num = n.id.split('/').pop();
    if (done.has(num)) continue;
    const hasVideo = n.media.edges.some(m => m.node.mediaContentType === 'VIDEO');
    if (hasVideo) { done.add(num); fs.appendFileSync(LEDGER, num + '\n'); continue; }
    const imgs = n.media.edges.filter(m => m.node.mediaContentType === 'IMAGE')
      .map(m => (m.node.preview || {}).image?.url).filter(Boolean).slice(0, 8);
    if (imgs.length < 3) continue;
    // Bilder holen
    execSync(`rm -rf ${TMP}/f && mkdir -p ${TMP}/f`);
    let ok = 0;
    for (let i = 0; i < imgs.length; i++) {
      try { execSync(`curl -sL --max-time 25 "${imgs[i].split('?')[0]}?width=1080" -o ${TMP}/f/${String(i).padStart(2, '0')}.jpg`); ok++; } catch {}
    }
    if (ok < 3) continue;
    if (DRY) { console.log(`[DRY] ${n.title.slice(0, 50)} → ${ok} Frames`); made++; continue; }
    // Slideshow: 0.9s/Bild, dezenter Zoom, 1080x1080
    const out = `${TMP}/v-${num}.mp4`;
    try {
      execSync(`ffmpeg -y -framerate 1/0.9 -pattern_type glob -i '${TMP}/f/*.jpg' -vf "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,zoompan=z='min(zoom+0.0012,1.08)':d=27:s=1080x1080:fps=30" -r 30 -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -an ${out} 2>/dev/null`);
    } catch { continue; }
    const buf = fs.readFileSync(out);
    if (buf.length < 40000) continue;
    // Staged Upload → VIDEO-Media → an Position 1
    const su = await gql(t, `mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{name value} } userErrors{message} } }`,
      { i: [{ resource: 'VIDEO', filename: `slideshow-${num}.mp4`, mimeType: 'video/mp4', fileSize: String(buf.length), httpMethod: 'POST' }] });
    const st2 = su.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!st2) { console.log('✗ staged', n.title.slice(0, 30), JSON.stringify(su).slice(0, 100)); continue; }
    const fd = new FormData();
    for (const p of st2.parameters) fd.append(p.name, p.value);
    fd.append('file', new Blob([buf], { type: 'video/mp4' }), `slideshow-${num}.mp4`);
    const up = await fetch(st2.url, { method: 'POST', body: fd });
    if (!up.ok) { console.log('✗ upload', up.status); continue; }
    const cm = await gql(t, `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id,media:$m){ media{ id } userErrors{message} } }`,
      { id: n.id, m: [{ originalSource: st2.resourceUrl, mediaContentType: 'VIDEO' }] });
    const mid = cm.data?.productCreateMedia?.media?.[0]?.id;
    if (!mid) { console.log('✗ media', JSON.stringify(cm.data?.productCreateMedia?.userErrors).slice(0, 100)); continue; }
    // warten bis READY, dann nach vorne
    for (let w = 0; w < 12; w++) {
      await sleep(5000);
      const ms = await gql(t, `query($id:ID!){ node(id:$id){ ... on Media { status } } }`, { id: mid });
      const s = ms.data?.node?.status;
      if (s === 'READY') {
        await gql(t, `mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ userErrors{message} } }`,
          { id: n.id, m: [{ id: mid, newPosition: '0' }] });
        console.log(`🎬 ${n.title.slice(0, 50)} → Video an Pos. 1 (${(buf.length / 1e6).toFixed(1)} MB, ${ok} Bilder)`);
        break;
      }
      if (s === 'FAILED') { console.log('✗ processing FAILED', n.title.slice(0, 40)); break; }
    }
    done.add(num); fs.appendFileSync(LEDGER, num + '\n');
    made++;
    fs.rmSync(out, { force: true });
  }
  cursor = page.pageInfo.endCursor;
  if (!page.pageInfo.hasNextPage) break;
}
console.log(`FERTIG: ${made} Produkt-Videos erstellt/geprüft.`);
