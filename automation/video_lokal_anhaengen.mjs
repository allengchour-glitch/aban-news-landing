#!/opt/node22/bin/node
/**
 * video_lokal_anhaengen.mjs — CJ-Produktvideos, die SCHON LOKAL liegen, an ihr Shop-Produkt hängen (02.10.2026).
 *
 * ANLASS: Betreiber «grow videos push». Der Lieferantenvideo-Nachtrag (`cj_video_backfill.mjs`) braucht für jedes Produkt
 * einen CJ-Aufruf — und die CJ-Punkte sind morgens schon leer (06:24 UTC gemessen). Gleichzeitig liegen 107 rohe
 * CJ-Produktvideos im Repo, die der Server für den Reel-Motor geholt hat (`auftraege/ergebnis/*-rq-<pid>.mp4`, dazu
 * /tmp/reelbuild/src_<pid>.mp4) — alle 107 gehören zu aktiven Shop-Produkten, keines hing an seiner Produktseite.
 * Seit Grow (01.10.) erlaubt der Plan 1'000 statt 250 Videos.
 *
 * Gleicher Ablauf wie `anhaengen()` im Nachtrag: Staged Upload (resource VIDEO) → productCreateMedia → Bild bleibt vorn.
 * Zusätzlich: Produkt ACTIVE und OHNE Video (live geprüft), Video wird bis READY verfolgt; FAILED → Medium wieder weg.
 * Ledger = das des Nachtrags (`dropship/_cj_video_backfill.txt`, Spalte «ok-lokal») → nichts doppelt.
 * Eimer-Boden (eimer_etikette) nach jeder Shopify-Antwort.
 *
 *   node automation/video_lokal_anhaengen.mjs            # Trockenlauf (Standard)
 *   SCHARF=1 MAX=20 node automation/video_lokal_anhaengen.mjs
 * Paare: /tmp/claude-0/video_lokal_paare.json oder PAARE=<datei> ([[gid, pid, pfad], …])
 */
import fs from 'node:fs';
import { nachlauf } from './eimer_etikette.mjs';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const TOK = (process.env.SHOPIFY_ADMIN_TOKEN || fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8')).trim();
const SCHARF = process.env.SCHARF === '1';
const MAX = parseInt(process.env.MAX || '200', 10);
const LEDGER = 'dropship/_cj_video_backfill.txt';
const PAARE = process.env.PAARE || '/tmp/claude-0/video_lokal_paare.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sgql(q, v) {
  let letzter = '';
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK },
        body: JSON.stringify({ query: q, variables: v }), signal: AbortSignal.timeout(60000) });
      const j = await r.json();
      await nachlauf(j);
      if (j.data && !JSON.stringify(j.errors || '').includes('THROTTLED')) return j;
      letzter = JSON.stringify(j.errors || j).slice(0, 160);
    } catch (e) { letzter = String(e.message || e).slice(0, 160); }
    await sleep(4000 * (i + 1));
  }
  throw new Error('Shopify antwortet nicht: ' + letzter);
}

async function anhaengen(gid, pfad, name) {
  const p = (await sgql(`query($id:ID!){product(id:$id){status title media(first:30){nodes{mediaContentType}}}}`, { id: gid })).data.product;
  if (!p || p.status !== 'ACTIVE') return 'nicht-aktiv';
  if (p.media.nodes.some(m => m.mediaContentType === 'VIDEO')) return 'hat-schon-video';
  const buf = fs.readFileSync(pfad);
  if (buf.length > 60 * 1024 * 1024) return 'video-zu-gross';
  if (buf.length < 20000) return 'video-zu-klein';
  if (!SCHARF) return 'trocken';
  const stg = await sgql(`mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}}userErrors{message}}}`,
    { input: [{ resource: 'VIDEO', filename: `${name}.mp4`, mimeType: 'video/mp4', httpMethod: 'POST', fileSize: String(buf.length) }] });
  const stgErr = (stg.data.stagedUploadsCreate.userErrors || []).map(e => e.message).join(' ');
  const tgt = stg.data.stagedUploadsCreate.stagedTargets?.[0];
  if (/videos|does not permit/i.test(stgErr) || !tgt?.url) return 'plan-deckel:' + stgErr.slice(0, 80);
  const form = new FormData();
  for (const x of tgt.parameters) form.append(x.name, x.value);
  form.append('file', new Blob([buf], { type: 'video/mp4' }), `${name}.mp4`);
  const up = await fetch(tgt.url, { method: 'POST', body: form });
  if (up.status >= 300) return 'upload-abgelehnt-' + up.status;
  const cm = await sgql(`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}`,
    { id: gid, m: [{ originalSource: tgt.resourceUrl, mediaContentType: 'VIDEO', alt: p.title.slice(0, 120) }] });
  if (cm.data.productCreateMedia.mediaUserErrors?.length) return 'shopify-lehnt-ab';
  const mid = cm.data.productCreateMedia.media[0].id;
  let status = '';
  for (let i = 0; i < 40; i++) {           // Videoverarbeitung dauert bis ~2 min
    await sleep(6000);
    const s = (await sgql(`query($id:ID!){node(id:$id){... on Video{status}}}`, { id: mid })).data.node;
    status = s?.status || '';
    if (status === 'READY' || status === 'FAILED') break;
  }
  if (status !== 'READY') {
    await sgql(`mutation($id:ID!,$m:[ID!]!){productDeleteMedia(productId:$id,mediaIds:$m){deletedMediaIds}}`, { id: gid, m: [mid] });
    return 'video-' + (status || 'zeitueberschreitung').toLowerCase() + '-entfernt';
  }
  const mm = (await sgql(`query($id:ID!){product(id:$id){media(first:30){nodes{id mediaContentType}}}}`, { id: gid })).data.product.media.nodes;
  if (mm.length && mm[0].mediaContentType !== 'IMAGE') {   // Bild muss vorn bleiben (Karte + Google)
    const bild = mm.find(n => n.mediaContentType === 'IMAGE');
    if (bild) await sgql(`mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}`,
      { id: gid, m: [{ id: bild.id, newPosition: '0' }] });
  }
  return 'ok-lokal';
}

const paare = JSON.parse(fs.readFileSync(PAARE, 'utf8'));
const erledigt = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(l => l.split('\t')[0]) : []);
console.log(`START ${new Date().toISOString().slice(0, 16)}Z · ${SCHARF ? 'SCHARF' : 'TROCKEN'} · ${paare.length} Paare`);
const zahl = {};
let n = 0;
for (const [gid, pid, pfad] of paare) {
  if (erledigt.has(gid) || n >= MAX) continue;
  if (!fs.existsSync(pfad)) { zahl['datei-fehlt'] = (zahl['datei-fehlt'] || 0) + 1; continue; }
  n++;
  let erg;
  try { erg = await anhaengen(gid, pfad, `cj-video-${pid}`); } catch (e) { erg = 'fehler:' + String(e.message).slice(0, 80); }
  zahl[erg.split(':')[0]] = (zahl[erg.split(':')[0]] || 0) + 1;
  console.log(`  ${erg.padEnd(22)} ${pid}  ${gid}`);
  if (SCHARF && /^(ok-lokal|hat-schon-video|nicht-aktiv|video-zu)/.test(erg)) { fs.appendFileSync(LEDGER, `${gid}\t${erg}\n`); erledigt.add(gid); }
  if (erg.startsWith('plan-deckel')) { console.log('PAUSE: Plan-Deckel erreicht'); break; }
}
console.log('FERTIG:', JSON.stringify(zahl));
