#!/usr/bin/env node
/* LuxeStyle — luma_product_video.mjs  (Weg C: EIGENE Clips, copyright-sauber)
 *
 * Macht aus dem sauberen Produkt-Hauptbild ein echtes Bewegungs-Video via Luma Dream Machine
 * (Image-to-Video) und hängt es ans Produkt (+ optional in die Social-Video-Queue).
 *
 * Pipeline:  Shopify featuredImage-URL → Luma img2video (ray-flash-2) → poll → mp4 nach reels/
 *            → attach_video_to_product.attachVideo()  → optional social/video_queue.csv
 *
 * Secrets:   LUMA_API_KEY  + SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET (oder SHOPIFY_ADMIN_TOKEN)
 * No-op:     ohne LUMA_API_KEY → sauberer Exit 0 (CI-freundlich), nichts passiert.
 *
 * CLI:
 *   node automation/luma_product_video.mjs gid://shopify/Product/123 [gid://.../456 ...]
 *   node automation/luma_product_video.mjs --pids 123,456            (nackte IDs ok)
 *   --no-attach   nur Clip rendern (nach reels/), nicht ans Produkt hängen
 *   --queue       Clip zusätzlich in social/video_queue.csv eintragen (status=ready)
 *   --duration 5s --resolution 720p --aspect 9:16   (Defaults)
 *   --dry         nur zeigen, was es täte
 *
 * Luma-Doku: https://docs.lumalabs.ai  — POST/GET /dream-machine/v1/generations
 */
import fs from 'node:fs';
import path from 'node:path';
import { attachVideo, getFeaturedImageUrl } from './attach_video_to_product.mjs';

const KEY = process.env.LUMA_API_KEY || process.env.LUMAAI_API_KEY || '';
const LUMA = 'https://api.lumalabs.ai/dream-machine/v1/generations';
const MODEL = process.env.LUMA_MODEL || 'ray-flash-2';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = flag('--dry'), NO_ATTACH = flag('--no-attach'), QUEUE = flag('--queue');
const DURATION = val('--duration', '5s'), RES = val('--resolution', '720p'), ASPECT = val('--aspect', '9:16');

// Produkt-IDs sammeln (GID oder nackt) — aus Args, --pids ODER --in <datei>
let ids = args.filter(a => /^(gid:\/\/shopify\/Product\/)?\d+$/.test(a));
const pidsFlag = val('--pids', '');
if (pidsFlag) ids = ids.concat(pidsFlag.split(',').map(s => s.trim()).filter(Boolean));
const inFile = val('--in', '');
if (inFile && fs.existsSync(inFile)) {
  for (const line of fs.readFileSync(inFile, 'utf8').split(/\r?\n/)) {
    const s = line.trim(); if (s && !s.startsWith('#')) ids.push(s);
  }
}
ids = [...new Set(ids.map(x => x.startsWith('gid://') ? x : `gid://shopify/Product/${x}`))];

if (!KEY) { console.error('LUMA_API_KEY fehlt → No-op (nichts zu tun).'); process.exit(0); }
if (!ids.length) { console.error('Keine Produkt-IDs übergeben. Bsp: node luma_product_video.mjs gid://shopify/Product/123'); process.exit(1); }

const REELS = path.resolve('reels'); fs.mkdirSync(REELS, { recursive: true });

// Premium-Prompt: ruhige Kamera, KEIN Wackeln, kein Text, edle Studio-Anmutung.
function promptFor(title) {
  return `Premium e-commerce product showcase of "${title}". Slow elegant cinematic camera, gentle smooth ` +
    `orbit and subtle push-in, soft studio lighting, shallow depth of field, luxury aesthetic. ` +
    `Product stays sharp and centered, no warping, no text, no logos, no extra objects. Calm, high-end, stable.`;
}

async function luma(method, url, body) {
  const r = await fetch(url, {
    method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Luma ${method} ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

async function generate(imageUrl, title) {
  const start = await luma('POST', LUMA, {
    generation_type: 'video', model: MODEL, prompt: promptFor(title),
    keyframes: { frame0: { type: 'image', url: imageUrl } },
    resolution: RES, duration: DURATION, aspect_ratio: ASPECT,
  });
  const id = start.id;
  if (!id) throw new Error('Keine generation id von Luma.');
  // Pollen bis completed (Luma rendert ~30–120s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const g = await luma('GET', `${LUMA}/${id}`);
    if (g.state === 'completed') { const v = g.assets?.video; if (!v) throw new Error('completed, aber keine video-URL.'); return v; }
    if (g.state === 'failed') throw new Error('Luma failed: ' + (g.failure_reason || '?'));
  }
  throw new Error('Luma Timeout.');
}

function appendQueue(file, title) {
  const csv = path.resolve('social/video_queue.csv');
  if (!fs.existsSync(csv)) return;
  const cap = `${title} ✨ Jetzt bei LuxeStyle 🇨🇭 #luxestyle #schweiz #bern`;
  const line = `\nready,${path.relative(process.cwd(), file)},"${cap.replace(/"/g, '""')}",`;
  fs.appendFileSync(csv, line);
  console.error('  → in social/video_queue.csv eingetragen.');
}

(async () => {
  for (const pid of ids) {
    try {
      const { title, url } = await getFeaturedImageUrl(pid);
      if (!url) { console.error('⏭️  Kein Hauptbild:', pid); continue; }
      console.error(`🎬 ${title} (${pid})`);
      if (DRY) { console.error('   [dry] Luma img2video von', url); continue; }
      const videoUrl = await generate(url, title);
      const slug = (title || 'produkt').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const out = path.join(REELS, `luma-${slug}-${pid.split('/').pop()}.mp4`);
      const buf = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
      fs.writeFileSync(out, buf);
      console.error('   ⬇️  Clip:', out, `(${(buf.length / 1e6).toFixed(1)} MB)`);
      if (!NO_ATTACH) { await attachVideo({ productId: pid, file: out, alt: `${title} – Produktvideo` }); console.error('   📎 ans Produkt gehängt.'); }
      if (QUEUE) appendQueue(out, title);
    } catch (e) { console.error('   ❌', e.message); }
  }
  console.error('Fertig.');
})();
