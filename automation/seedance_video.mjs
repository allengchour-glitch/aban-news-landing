#!/usr/bin/env node
/* seedance_video.mjs — Bild→Video via Seedance 2.0 (ByteDance) über fal.ai. Guenstig (Fast ~$0.022/Sek =
 * ~$0.11-0.22 pro Reel), bis 4K, TikTok-nativ (ByteDance). Spart Luma-Credits, ideal fuers guenstige
 * Gewinner-Testen im Everything-Store. Lernen-Lehre 2026-06-26 (YouTube Seedance 2.0).
 *
 * ENV: FAL_KEY (Pflicht, fal.ai) · SEEDANCE_MODEL (default fal-ai/bytedance/seedance-2.0/fast/image-to-video)
 * Lauf: node automation/seedance_video.mjs --image <pfad|url> --prompt "..." [--res 720p] [--dur 5]
 *       [--ar 9:16] [--audio] [--out reels/seedance-x.mp4] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fal } from '@fal-ai/client';
setTimeout(() => { console.log('WATCHDOG 12min -> exit'); process.exit(1); }, 720000).unref();

const val = (f, d = '') => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const KEY = process.env.FAL_KEY || '';
// ⚠️ FIX 2026-06-26: korrekte fal-Modell-ID OHNE 'fal-ai/'-Praefix (sonst ApiError Not Found).
const MODEL = process.env.SEEDANCE_MODEL || 'bytedance/seedance-2.0/fast/image-to-video';
const IMG = val('--image');
const PROMPT = val('--prompt', 'cinematic gentle camera motion, the product comes alive, soft natural light, premium, no text');
const RES = val('--res', '720p');           // 480p|720p|1080p (Fast = max 720p)
const DUR = parseInt(val('--dur', '5'), 10); // 4-15s
const AR = val('--ar', '9:16');
const AUDIO = process.argv.includes('--audio'); // default aus (TikTok stumm; Meta-Musik backen wir selbst)
const OUT = val('--out', path.join('reels', 'seedance-' + Date.now() + '.mp4'));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Bild → oeffentliche URL (fal nimmt image_url). Lokale Datei -> per fal-Upload? Hier: nur URL unterstuetzt,
// lokale Datei muss vorab auf CDN (Shopify) liegen. Wir posten meist CDN-URLs -> passt.
async function imageUrl(src) {
  if (/^https?:/i.test(src)) return src;
  throw new Error('Lokale Datei: bitte erst auf CDN (Shopify) hochladen und die URL uebergeben.');
}

(async () => {
  if (!IMG) { log('--image fehlt'); process.exit(1); }
  if (!KEY && !DRY) { log('❌ Kein FAL_KEY. fal.ai-Key in ENV setzen (Fast-Tier ~$0.022/Sek). Dann erneut.'); process.exit(0); }
  const input = { prompt: PROMPT, image_url: await imageUrl(IMG), resolution: RES, duration: DUR, aspect_ratio: AR, generate_audio: AUDIO };
  log('Seedance', MODEL, '·', RES, DUR + 's', AR, AUDIO ? '+Audio' : 'stumm');
  if (DRY) { log('[dry] wuerde generieren:', JSON.stringify(input).slice(0, 200), '->', OUT); process.exit(0); }

  // fal-Client (offiziell) handhabt Queue + Result korrekt (rohe REST-Pfade fuer Sub-Modelle sind kaputt).
  fal.config({ credentials: KEY });
  const out = await fal.subscribe(MODEL, { input });
  const url = out?.data?.video?.url || out?.video?.url;
  if (!url) { log('Kein Video in der Antwort:', JSON.stringify(out).slice(0, 200)); process.exit(1); }
  const vb = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, vb);
  log('✅ Seedance-Video gespeichert:', OUT, (vb.length / 1024 / 1024).toFixed(2) + 'MB');
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
