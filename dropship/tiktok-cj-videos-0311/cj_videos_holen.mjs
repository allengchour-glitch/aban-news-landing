#!/usr/bin/env node
// CJ-Produktvideos holen (lokal kopieren, NICHTS veröffentlichen, NICHTS im Shop ändern).
// Je Shopify-Produkt: erste Varianten-SKU → CJ-pid (`product/query`) → Videoliste (`POST product/queryVideosByProductId`, QUELLE developers.cjdropshipping.cn, gelesen 03.11.).
// Geladen werden nur kostenlose Videos (`isFree` = 1, Status ON_STATE); bezahlpflichtige stehen mit Preis im Bericht und werden NIE gekauft.
// CJ verlangt beim Download den Header `Referer: https://developers.cjdropshipping.com/` und bittet, Videos auf dem eigenen Rechner zu speichern statt CJ-Adressen zu verlinken.
//
//   HANDLES=a,b,c  node cj_videos_holen.mjs            nur auflisten (CJ-Abfrage, kein Download)
//   HANDLES=a,b,c  LADEN=1 node cj_videos_holen.mjs    zusätzlich die kostenlosen Videos herunterladen (höchstens 80 MB je Datei)
//   PQUERY='tag:video-hit AND status:active' MAX=40 node cj_videos_holen.mjs   Stichprobe aus einer Shopify-Suche (statt HANDLES)
// Schalter: OUT_DIR (Vorgabe /tmp/luxe-cjvideos) · MAX (Vorgabe 20, höchstens 200) · CJ_TOKEN_CACHE (Vorgabe OUT_DIR/cj_token.json: eine EIGENE Datei, weil /tmp/cj_token.json von anderen
//   Werkzeugen mit anderem Feldnamen stammen kann und dann lautlos nichts liefert).
// Rechte: ob die BEARBEITUNG kostenloser CJ-Videos für eigene Werbung erlaubt ist, steht in der CJ-Doku NICHT (Felder `copyright`, `copyrightPrice`, `notCopyrightPrice`): unbekannt, Entscheid beim Besitzer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { cjFetch } from '../../automation/lib/cj_fetch.mjs';
import { cjToken } from '../../automation/lib/cj_token.mjs';

const SHOP = process.env.SHOPIFY_SHOP || '', API = '2025-01', BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const OUT = process.env.OUT_DIR || '/tmp/luxe-cjvideos';
const MAX = Math.min(parseInt(process.env.MAX || '20', 10), 200);
const LADEN = process.env.LADEN === '1';
const MAX_BYTES = 80 * 1024 * 1024;
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

export function skuZuCj(skuRoh) {   // Shop-SKU «CJ-CJJT170517301AZ» → «CJJT170517301AZ»; eigene SKU (LX-…) → null
  const sku = String(skuRoh || '').replace(/^CJ-(?=CJ)/, '');
  if (!/^CJ/.test(sku) && !/^\d{15,}$/.test(sku) && !/^[0-9A-Fa-f-]{36}$/.test(sku)) return null;
  const istPid = /^\d{15,}$/.test(sku) || /^[0-9A-Fa-f-]{36}$/.test(sku);
  return { sku, istPid, basis: sku.split('-')[0] };
}

async function shopToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }),
  });
  return r.ok ? (await r.json()).access_token || '' : '';
}

async function cjPid(tok, skuRoh) {
  const k = skuZuCj(skuRoh);
  if (!k) return null;
  const wege = k.istPid ? [{ pid: k.sku }, { variantSku: k.sku }] : [{ variantSku: k.sku }, { productSku: k.basis }];
  for (const p of wege) {
    const u = new URL(`${BASE}/product/query`);
    for (const [key, v] of Object.entries(p)) u.searchParams.set(key, v);
    let r;
    try { r = await cjFetch(u.toString(), { headers: { 'CJ-Access-Token': tok }, context: 'CJ-Produkt', weicheCodes: [1602001, 1602002, 1602003] }); } catch { return null; }
    if (r?.data?.pid) return { pid: r.data.pid, name: r.data.productNameEn || '' };
    await schlaf(300);
  }
  return null;
}

async function cjVideos(tok, pid) {   // null = nicht lesbar (nicht «keine»); [] = keine
  for (let i = 0; i < 4; i++) {
    let r;
    try {
      r = await fetch(`${BASE}/product/queryVideosByProductId`, { method: 'POST', headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: pid }), signal: AbortSignal.timeout(60000) });
    } catch { await schlaf(2000 * 2 ** i); continue; }
    if (r.status === 429 || r.status >= 500) { await schlaf(2000 * 2 ** i); continue; }
    let b; try { b = await r.json(); } catch { return null; }
    if (/insufficient api points|daily.*(quota|limit)/i.test(String(b?.message))) throw new Error('CJ_QUOTA: Tagespunkte erschöpft');
    if (b?.success === true || b?.result === true) return Array.isArray(b.data) ? b.data : [];
    return null;
  }
  return null;
}

function probe(datei) {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', datei], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const v = (j.streams || []).find((s) => s.codec_type === 'video') || {};
    return { w: v.width || 0, h: v.height || 0, dauer: Number(j.format?.duration) || 0, ton: (j.streams || []).some((s) => s.codec_type === 'audio') };
  } catch { return null; }
}

const csv = (a) => a.map((x) => String(x ?? '').replace(/[",\n]/g, ' ')).join(',');

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  (async () => {
    const stok = await shopToken();
    if (!stok) { console.error('Kein Shopify-Token.'); process.exit(1); }
    const ctok = await cjToken({ cache: process.env.CJ_TOKEN_CACHE || path.join(OUT, 'cj_token.json') });
    if (!ctok) { console.error('Kein CJ-Token (CJ_EMAIL/CJ_API_KEY prüfen; CJ erlaubt getAccessToken nur alle 5 Minuten).'); process.exit(1); }
    let handles = (process.env.HANDLES || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!handles.length) {
      const d = await shopifyGql(SHOP, API, stok, `query($q:String!,$n:Int!){products(first:$n,query:$q,sortKey:UPDATED_AT,reverse:true){nodes{handle}}}`, { q: process.env.PQUERY || 'tag:video-hit AND status:active', n: Math.min(MAX, 50) });
      handles = (d?.products?.nodes || []).map((n) => n.handle);
    }
    handles = handles.slice(0, MAX);
    const zeilen = [csv(['handle', 'pid', 'videoId', 'gratis', 'preis_temporaer', 'preis_dauerhaft', 'breite', 'hoehe', 'dauer_s', 'groesse_mb', 'ton', 'datei', 'status'])];
    const z = { produkte: 0, mitVideo: 0, videos: 0, gratis: 0, geladen: 0, unbekannt: 0 };
    for (const h of handles) {
      z.produkte++;
      const d = await shopifyGql(SHOP, API, stok, `query($h:String!){products(first:1,query:$h){nodes{handle variants(first:1){nodes{sku}}}}}`, { h: `handle:${h}` });
      const sku = d?.products?.nodes?.[0]?.variants?.nodes?.[0]?.sku || '';
      const cj = await cjPid(ctok, sku); await schlaf(400);
      if (!cj) { z.unbekannt++; zeilen.push(csv([h, '', '', '', '', '', '', '', '', '', '', '', sku ? 'cj-unbekannt-oder-eigene-sku' : 'ohne-sku'])); console.log(`  cj-unbekannt  ${h}`); continue; }
      const vl = await cjVideos(ctok, cj.pid); await schlaf(400);
      if (vl === null) { z.unbekannt++; zeilen.push(csv([h, cj.pid, '', '', '', '', '', '', '', '', '', '', 'videoliste-nicht-lesbar'])); console.log(`  nicht-lesbar  ${h}`); continue; }
      const aktiv = vl.filter((v) => v.videoState === 'ON_STATE');
      if (!aktiv.length) { zeilen.push(csv([h, cj.pid, '', '', '', '', '', '', '', '', '', '', 'kein-video'])); console.log(`  kein-video    ${h}`); continue; }
      z.mitVideo++;
      let n = 0;
      for (const v of aktiv) {
        z.videos++;
        const gratis = String(v.isFree) === '1';
        if (gratis) z.gratis++;
        let datei = '', status = gratis ? 'gelistet' : 'kostenpflichtig-nicht-geladen', m = null;
        if (LADEN && gratis && v.videoUrl) {
          try {
            const r = await fetch(v.videoUrl, { headers: { Referer: 'https://developers.cjdropshipping.com/' }, signal: AbortSignal.timeout(180000) });
            if (!r.ok) status = `HTTP${r.status}`;
            else {
              const buf = Buffer.from(await r.arrayBuffer());
              if (buf.length > MAX_BYTES) status = 'zu-gross';
              else if (buf.length < 5000) status = 'zu-klein';
              else { n++; datei = path.join(OUT, `${h}-${n}.mp4`); writeFileSync(datei, buf); m = probe(datei); status = m ? 'geladen' : 'nicht-lesbar'; if (m) z.geladen++; }
            }
          } catch (e) { status = `fehler:${String(e.message).slice(0, 40)}`; }
        }
        zeilen.push(csv([h, cj.pid, v.videoId || v.id, gratis ? 'ja' : 'nein', v.notCopyrightPrice, v.copyrightPrice, m?.w || v.width || '', m?.h || v.height || '', m ? m.dauer.toFixed(1) : (v.duration ? Number(v.duration).toFixed(1) : ''), v.videoSize ? (Number(v.videoSize) / 1048576).toFixed(1) : '', m ? (m.ton ? 'ja' : 'nein') : '', datei, status]));
        console.log(`  ${status.padEnd(28)} ${gratis ? 'gratis' : 'PREIS ' + (v.notCopyrightPrice || '?') + '/' + (v.copyrightPrice || '?')} ${(m?.w || v.width || '?')}x${(m?.h || v.height || '?')} ${(m ? m.dauer : v.duration || 0).toString().slice(0, 5)}s  ${h.slice(0, 44)}`);
      }
    }
    const bericht = path.join(OUT, 'bericht.csv'); writeFileSync(bericht, zeilen.join('\n') + '\n');
    console.log(`\nProdukte ${z.produkte}: ${z.mitVideo} mit CJ-Video, ${z.videos} Videos (${z.gratis} gratis), ${z.geladen} geladen, ${z.unbekannt} bei CJ nicht lesbar (unbekannt, NICHT «kein Video»).`);
    console.log(`Bericht: ${bericht}. Der Lauf schreibt nichts in Shopify und kauft nichts.`);
  })();
}
