#!/usr/bin/env node
/* LuxeStyle — attach_video_to_product.mjs
 *
 * Hängt ein lokales MP4 als ECHTES Produkt-Video (mediaContentType:VIDEO) an ein Shopify-Produkt.
 * Gemeinsamer Baustein für die Video-Pipelines (Luma = eigene Clips, AliExpress = Lieferanten-Demos,
 * Ken-Burns = ffmpeg). Ablauf (Shopify Admin GraphQL):
 *   stagedUploadsCreate(resource:VIDEO) → multipart-POST der Bytes an GCS → productCreateMedia(VIDEO)
 *   → node(mediaId) pollen bis status=READY.
 *
 * Auth (identisch zu upload_to_shopify_cdn.mjs / reel-analytics.mjs):
 *   SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (Client-Credentials, ~24h) ODER SHOPIFY_ADMIN_TOKEN.
 *
 * CLI:  node automation/attach_video_to_product.mjs <productGID> <datei.mp4> [alt-text]
 * Lib:  import { attachVideo } from './attach_video_to_product.mjs'
 *       await attachVideo({ productId, file, alt })   // wirft bei Fehler, gibt mediaId zurück
 *
 * No-op-sicher: ohne Creds → Exit 1 + klare Meldung (kein Crash in CI).
 */
import fs from 'node:fs';
import path from 'node:path';

const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const API = process.env.SHOPIFY_API_VERSION || '2025-01';

let _token = '';
async function getToken() {
  if (_token) return _token;
  if (!(CID && CSECRET) && TOK_STATIC) return (_token = TOK_STATIC);
  if (SHOP && CID && CSECRET) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CID, client_secret: CSECRET, grant_type: 'client_credentials' }),
    });
    const j = await r.json().catch(() => ({}));
    return (_token = j.access_token || '');
  }
  return '';
}
async function gql(token, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors));
  return j.data;
}

/** Lädt ein lokales MP4 hoch und hängt es als VIDEO ans Produkt. Gibt die mediaId zurück. */
export async function attachVideo({ productId, file, alt }) {
  if (!SHOP) throw new Error('SHOPIFY_SHOP fehlt → No-op.');
  if (!fs.existsSync(file)) throw new Error('Datei nicht gefunden: ' + file);
  const token = await getToken();
  if (!token) throw new Error('Kein gültiger Admin-Token (Client-Credentials/Token fehlen).');

  const filename = path.basename(file).replace(/[^a-zA-Z0-9._-]/g, '-');
  const fileSize = String(fs.statSync(file).size);
  alt = alt || filename;

  // 1) Staged Target (VIDEO)
  const staged = await gql(token,
    `mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){
       stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`,
    { input: [{ resource: 'VIDEO', filename, mimeType: 'video/mp4', httpMethod: 'POST', fileSize }] });
  const t = staged?.stagedUploadsCreate?.stagedTargets?.[0];
  const sErr = staged?.stagedUploadsCreate?.userErrors || [];
  if (!t || sErr.length) throw new Error('stagedUploadsCreate: ' + JSON.stringify(sErr));

  // 2) Bytes posten (Parameter VOR der Datei)
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), filename);
  const up = await fetch(t.url, { method: 'POST', body: form });
  if (up.status !== 201 && up.status !== 200) throw new Error('Staging-Upload: HTTP ' + up.status);

  // 3) Als Produkt-Video registrieren
  const created = await gql(token,
    `mutation($pid:ID!,$media:[CreateMediaInput!]!){ productCreateMedia(productId:$pid, media:$media){
       media{ ... on Video { id status } } mediaUserErrors{ field message } } }`,
    { pid: productId, media: [{ originalSource: t.resourceUrl, mediaContentType: 'VIDEO', alt }] });
  const cErr = created?.productCreateMedia?.mediaUserErrors || [];
  const mediaId = created?.productCreateMedia?.media?.[0]?.id;
  if (!mediaId || cErr.length) throw new Error('productCreateMedia: ' + JSON.stringify(cErr));

  // 4) Pollen bis READY (Video-Transcoding dauert)
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 3000 : 4000));
    const d = await gql(token, `query($id:ID!){ node(id:$id){ ... on Video { status } } }`, { id: mediaId });
    const st = d?.node?.status;
    if (st === 'READY') { console.error('Video READY:', mediaId); return mediaId; }
    if (st === 'FAILED') throw new Error('Video-Transcoding FAILED: ' + mediaId);
  }
  console.error('Hinweis: Timeout beim Warten auf READY (Transcoding läuft evtl. weiter):', mediaId);
  return mediaId;
}

/** Holt die Featured-Image-URL eines Produkts (für die Image→Video-Pipelines). */
export async function getFeaturedImageUrl(productId) {
  const token = await getToken();
  if (!token) throw new Error('Kein Admin-Token.');
  const d = await gql(token, `query($id:ID!){ node(id:$id){ ... on Product { title featuredImage { url } } } }`, { id: productId });
  return { title: d?.node?.title || '', url: d?.node?.featuredImage?.url || '' };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const [productId, file, alt] = process.argv.slice(2);
  if (!productId || !file) { console.error('Nutzung: node attach_video_to_product.mjs <productGID> <datei.mp4> [alt]'); process.exit(1); }
  attachVideo({ productId, file, alt })
    .then(id => { console.log(id); process.exit(0); })
    .catch(e => { console.error('Fehler:', e.message); process.exit(1); });
}
