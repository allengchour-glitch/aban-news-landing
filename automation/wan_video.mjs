#!/usr/bin/env node
/* wan_video.mjs — GRATIS Image→Video via Hugging-Face-Space (Wan 2.2 i2v, ZeroGPU). Echte KI-Kamerafahrt,
 * kein Watermark, kein Limit (best-effort: ZeroGPU-Queue; mit HF_TOKEN deutlich zuverlaessiger). Spart Luma-Credits.
 *
 * ENV: HF_TOKEN (optional, gratis huggingface.co -> stabiler) · WAN_SPACE (Default prithivMLmods/wan2.2-i2v-fast)
 * Lauf: node automation/wan_video.mjs --image <pfad|url> --prompt "..." [--dur 4] [--out reels/wan-x.mp4] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
setTimeout(() => { console.log('WATCHDOG 12min -> exit'); process.exit(1); }, 720000).unref();

const val = (f, d = '') => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const SPACE = (process.env.WAN_SPACE || 'prithivMLmods/wan2.2-i2v-fast');
const BASE = `https://${SPACE.replace('/', '-').toLowerCase()}.hf.space`;
const HF = process.env.HF_TOKEN || '';
const IMG = val('--image');
const PROMPT = val('--prompt', 'cinematic gentle camera motion, the product comes alive, soft natural light, premium, no text');
const DUR = parseFloat(val('--dur', '4'));
const OUT = val('--out', path.join('reels', 'wan-' + Date.now() + '.mp4'));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = HF ? { Authorization: `Bearer ${HF}` } : {};

async function loadBytes(src) {
  if (/^https?:/i.test(src)) { const r = await fetch(src); return { buf: Buffer.from(await r.arrayBuffer()), name: 'in.jpg' }; }
  return { buf: fs.readFileSync(src), name: path.basename(src) };
}

(async () => {
  if (!IMG) { log('--image fehlt'); process.exit(1); }
  log('Space', SPACE, HF ? '(mit HF_TOKEN)' : '(anonym - ZeroGPU evtl. limitiert)');
  if (DRY) { log('[dry] wuerde Video generieren aus', IMG, '->', OUT); process.exit(0); }

  // 1) Bild hochladen
  const { buf, name } = await loadBytes(IMG);
  const fd = new FormData();
  fd.append('files', new Blob([buf]), name);
  let up = await fetch(`${BASE}/gradio_api/upload`, { method: 'POST', headers: H, body: fd });
  if (!up.ok) { log('Upload-Fehler', up.status, (await up.text()).slice(0, 120)); process.exit(1); }
  const uploaded = (await up.json())[0];
  log('Bild hochgeladen:', uploaded);

  // 2) Pipeline starten (Reihenfolge = api_info: image,prompt,steps,neg,duration,gs,gs2,seed,randomize)
  const data = [{ path: uploaded, meta: { _type: 'gradio.FileData' } }, PROMPT, 4, 'blurry, low quality, watermark, text, distorted', DUR, 1, 1, 0, true];
  let call = await fetch(`${BASE}/gradio_api/call/run_pipeline`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
  if (!call.ok) { log('Call-Fehler', call.status, (await call.text()).slice(0, 160)); process.exit(1); }
  const eid = (await call.json()).event_id;
  log('Generierung gestartet, event', eid, '- warte (ZeroGPU-Queue)...');

  // 3) SSE-Stream pollen
  const res = await fetch(`${BASE}/gradio_api/call/run_pipeline/${eid}`, { headers: H });
  const text = await res.text();
  // letzte data:-Zeile mit dem Ergebnis suchen
  let videoUrl = null, lastErr = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      if (payload === 'null' || !payload) continue;
      try { const arr = JSON.parse(payload); const v = Array.isArray(arr) ? arr[0] : arr;
        const u = v?.video?.url || v?.url || (v?.video?.path ? `${BASE}/gradio_api/file=${v.video.path}` : null) || (v?.path ? `${BASE}/gradio_api/file=${v.path}` : null);
        if (u) videoUrl = u;
      } catch { lastErr = payload.slice(0, 120); }
    }
    if (/event:\s*error/.test(line)) lastErr = 'event:error';
  }
  if (!videoUrl) { log('Kein Video. Hinweis:', lastErr || 'ZeroGPU-Quota/Queue - mit HF_TOKEN erneut versuchen.'); process.exit(1); }

  // 4) Video laden
  const vb = Buffer.from(await (await fetch(videoUrl, { headers: H })).arrayBuffer());
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, vb);
  log('✅ GRATIS Wan-Video gespeichert:', OUT, (vb.length / 1024 / 1024).toFixed(2) + 'MB');
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
