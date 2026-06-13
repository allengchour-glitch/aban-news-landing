#!/usr/bin/env node
/* LuxeStyle — ae-video-fetch.mjs  (Weg A: AliExpress-Produktvideos über PC-Claude-Browser)
 * ---------------------------------------------------------------------------------
 * AliExpress blockt direktes Scraping aus der Cloud (403, Akamai-Bot-Schutz). Deshalb
 * läuft das hier am PC über das eingeloggte Brave (CDP-Port 9222) — wie die Follower-/
 * DM-Tools. Das Skript sucht je Produkt auf AliExpress, öffnet den Top-Treffer und
 * fängt die echte Video-.mp4 aus dem Netzwerk ab (Video-CDN cloud.video.taobao.com).
 *
 * Danach: wenn Shopify-Creds gesetzt sind, hängt es das Video direkt ans Produkt
 * (attach_video_to_product.mjs). Sonst legt es das mp4 nur in reels/ ab + schreibt
 * ae-video-found.csv (productGID,title,localfile) für einen späteren Attach-Lauf.
 *
 * START am PC (Brave mit --remote-debugging-port=9222, eingeloggt):
 *   node automation/local/ae-video-fetch.mjs --in ae-targets.csv
 *   node automation/local/ae-video-fetch.mjs "gid://shopify/Product/123|Retro Plattenspieler Bluetooth Speaker"
 *   --dry   nur suchen/zeigen, nichts herunterladen
 *
 * ae-targets.csv  (eine Zeile je Produkt):  <productGID>,<Suchtitel EN bevorzugt>
 *
 * Hinweis Copyright: Lieferanten-Marketingvideos sind im Dropshipping üblich, aber
 * rechtlich grau. Für 100% saubere Clips → luma_product_video.mjs (eigene Generierung).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const DRY = process.argv.includes('--dry');
const REELS = path.resolve('reels'); fs.mkdirSync(REELS, { recursive: true });
const FOUND = path.resolve('ae-video-found.csv');

// Ziele einlesen: --in <csv> oder direkte "GID|Titel"-Argumente
function readTargets() {
  const out = [];
  const inIdx = process.argv.indexOf('--in');
  if (inIdx >= 0 && process.argv[inIdx + 1]) {
    for (const line of fs.readFileSync(process.argv[inIdx + 1], 'utf8').split(/\r?\n/)) {
      const s = line.trim(); if (!s || s.startsWith('#')) continue;
      const [gid, ...rest] = s.split(','); out.push({ gid: gid.trim(), title: rest.join(',').trim() });
    }
  }
  for (const a of process.argv.slice(2)) {
    if (a.includes('|')) { const [gid, title] = a.split('|'); out.push({ gid: gid.trim(), title: title.trim() }); }
  }
  return out;
}

const VIDEO_RE = /\.(mp4|m3u8)(\?|$)|cloud\.video\.taobao|video\.aliexpress|\/video\//i;

async function fetchOne(ctx, { gid, title }) {
  const page = await ctx.newPage();
  let videoUrl = '';
  page.on('response', (res) => {
    const u = res.url();
    if (!videoUrl && /\.mp4(\?|$)/i.test(u) && VIDEO_RE.test(u)) videoUrl = u;
  });
  try {
    const q = encodeURIComponent(title);
    await page.goto(`https://www.aliexpress.com/wholesale?SearchText=${q}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
    // ersten Produkt-Link öffnen
    const href = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/item/"]'); return a ? a.href : '';
    });
    if (!href) { console.error('  ⏭️  kein Treffer:', title); await page.close(); return null; }
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    // Video-Thumbnail in der Galerie anklicken (löst das Laden der .mp4 aus)
    try {
      const vid = await page.$('[class*="video"] , [class*="Video"] , video');
      if (vid) { await vid.click({ timeout: 3000 }).catch(() => {}); }
    } catch {}
    // bis zu 8s auf eine abgefangene .mp4 warten
    for (let i = 0; i < 16 && !videoUrl; i++) await page.waitForTimeout(500);
    // Fallback: <video src> aus dem DOM
    if (!videoUrl) videoUrl = await page.evaluate(() => {
      const v = document.querySelector('video'); return v && v.src && v.src.startsWith('http') ? v.src : '';
    });
    await page.close();
    if (!videoUrl) { console.error('  ⏭️  kein Video gefunden:', title); return null; }
    console.error('  🎯 Video-URL:', videoUrl.slice(0, 90));
    if (DRY) return { gid, title, file: '' };
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const out = path.join(REELS, `ae-${slug}.mp4`);
    const buf = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
    fs.writeFileSync(out, buf);
    console.error('  ⬇️ ', out, `(${(buf.length / 1e6).toFixed(1)} MB)`);
    return { gid, title, file: out };
  } catch (e) { console.error('  ❌', title, '-', e.message); try { await page.close(); } catch {} return null; }
}

(async () => {
  const targets = readTargets();
  if (!targets.length) { console.error('Keine Ziele. --in ae-targets.csv ODER "GID|Titel".'); process.exit(1); }
  let browser;
  try { browser = await chromium.connectOverCDP(CDP); }
  catch (e) { console.error('Brave-CDP (9222) nicht erreichbar. Brave mit --remote-debugging-port=9222 starten.', e.message); process.exit(1); }
  const ctx = browser.contexts()[0] || (await browser.newContext());

  // optionaler Direkt-Attach, wenn Shopify-Creds da sind
  let attach = null;
  if (process.env.SHOPIFY_SHOP && (process.env.SHOPIFY_ADMIN_TOKEN || (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET))) {
    try { ({ attachVideo: attach } = await import('../attach_video_to_product.mjs')); } catch {}
  }

  for (const tgt of targets) {
    console.error(`🔎 ${tgt.title}`);
    const r = await fetchOne(ctx, tgt);
    if (r && r.file) {
      fs.appendFileSync(FOUND, `${r.gid},"${r.title.replace(/"/g, '""')}",${r.file}\n`);
      if (attach && tgt.gid?.startsWith('gid://')) {
        try { await attach({ productId: tgt.gid, file: r.file, alt: `${tgt.title} – Produktvideo` }); console.error('  📎 ans Produkt gehängt.'); }
        catch (e) { console.error('  ⚠️ Attach später (Creds/Limit):', e.message); }
      }
    }
    await new Promise(r => setTimeout(r, 4000 + Math.random() * 4000)); // menschliches Tempo
  }
  console.error('Fertig. Funde in', FOUND);
  process.exit(0);
})();
