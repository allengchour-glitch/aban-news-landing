#!/usr/bin/env node
/* veo_product_clip.mjs — EIN Produkt-Clip via Veo (Google, ueber die Gemini-API mit Billing-Guthaben).
 * Eigenstaendig: --image <url> --prompt "..." --out reels/x.mp4 [--aspect 9:16] [--seconds 8].
 * Anders als veo-hero-clip.mjs (das aus good_products.csv liest + Rotation VERBIETET) erlaubt dieses Skript
 * einen FREIEN Prompt — z.B. ein langsam DREHENDES, glaenzendes Schmuckstueck (bei Schmuck ohne Gesicht
 * unproblematisch, kein Warping-Risiko wie bei Kleidung/Model).
 *
 * Bezahlt ueber dein Gemini-API-Guthaben (aistudio.google.com), NICHT ueber fal — drum laeuft es, wenn fal-Credits leer sind.
 * ENV: GEMINI_API_KEY (Pflicht) · VEO_MODEL (Default veo-3.0-fast-generate-001)
 * No-op-safe: ohne Key sauberer Leerlauf.
 */
import fs from 'node:fs';
import path from 'node:path';

const val = (f, d = '') => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.VEO_MODEL || 'veo-3.0-fast-generate-001';
const ASPECT = val('--aspect', '9:16');
const SECONDS = parseInt(val('--seconds', '8'), 10) || 8;
const IMG = val('--image');
const PROMPT = val('--prompt', 'Cinematic luxury product video, gentle motion, premium soft daylight, true to the reference image, no text, no watermark, vertical 9:16, high quality.');
const OUT = val('--out', path.join('reels', 'veo-' + Date.now() + '.mp4'));
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
setTimeout(() => { log('WATCHDOG 12min -> exit'); process.exit(1); }, 720000).unref();

async function fetchImageBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Bild-Download HTTP ${r.status}`);
  const ct = r.headers.get('content-type') || (url.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct.split(';')[0] };
}
async function startVeo(prompt, img) {
  const url = `${BASE}/models/${MODEL}:predictLongRunning?key=${encodeURIComponent(KEY)}`;
  const body = { instances: [{ prompt, image: { bytesBase64Encoded: img.b64, mimeType: img.mime } }],
    parameters: { aspectRatio: ASPECT, durationSeconds: SECONDS, personGeneration: 'allow_adult', sampleCount: 1 } };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.name) { log('Veo-Start-Fehler:', r.status, JSON.stringify(j).slice(0, 400)); return null; }
  log('Veo-Job gestartet:', j.name); return j.name;
}
async function pollVeo(opName) {
  const url = `${BASE}/${opName}?key=${encodeURIComponent(KEY)}`;
  for (let i = 0; i < 60; i++) {
    await new Promise(res => setTimeout(res, 10000));
    const r = await fetch(url); const j = await r.json().catch(() => ({}));
    if (j.done) { if (j.error) { log('Veo-Fehler:', JSON.stringify(j.error).slice(0, 400)); return null; } log('Veo fertig nach', (i + 1) * 10, 's.'); return j.response || j; }
    if (i % 3 === 0) log('… Veo rendert noch', (i + 1) * 10, 's');
  }
  log('Veo-Timeout.'); return null;
}
function extractVideo(resp) {
  const j = JSON.stringify(resp);
  const m = resp?.generateVideoResponse?.generatedSamples?.[0]?.video || resp?.generatedSamples?.[0]?.video
    || resp?.predictions?.[0]?.video || resp?.videos?.[0];
  if (m) { if (m.videoBytes || m.bytesBase64Encoded) return { kind: 'bytes', data: m.videoBytes || m.bytesBase64Encoded };
    if (m.uri || m.fileUri || m.url) return { kind: 'uri', uri: m.uri || m.fileUri || m.url }; }
  const uriMatch = j.match(/"(https:\/\/[^"]+(?:\.mp4|:download|alt=media)[^"]*)"/);
  if (uriMatch) return { kind: 'uri', uri: uriMatch[1] };
  return null;
}
async function downloadVideo(v, outFile) {
  if (v.kind === 'bytes') { fs.writeFileSync(outFile, Buffer.from(v.data, 'base64')); return true; }
  let uri = v.uri; if (!/[?&]key=/.test(uri)) uri += (uri.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(KEY);
  const r = await fetch(uri); if (!r.ok) { log('Video-Download-Fehler:', r.status); return false; }
  fs.writeFileSync(outFile, Buffer.from(await r.arrayBuffer())); return true;
}

(async () => {
  if (!IMG) { log('--image fehlt'); process.exit(1); }
  if (!KEY) { log('⚠️ GEMINI_API_KEY fehlt → No-op (am PC luxe-secrets.ps1 / VPS /opt/luxe/.env).'); process.exit(0); }
  log('Veo', MODEL, ASPECT, SECONDS + 's →', OUT);
  try {
    const img = await fetchImageBase64(IMG);
    const op = await startVeo(PROMPT, img); if (!op) process.exit(1);
    const resp = await pollVeo(op); if (!resp) process.exit(1);
    const v = extractVideo(resp);
    if (!v) { log('Video in Antwort nicht gefunden:', JSON.stringify(resp).slice(0, 400)); process.exit(1); }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    if (await downloadVideo(v, OUT)) { log('✅ Veo-Video gespeichert:', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + 'MB'); }
    else process.exit(1);
  } catch (e) { log('Fehler:', e.message); process.exit(1); }
})();
