#!/usr/bin/env node
/* LuxeStyle — image_gen.mjs  (GRATIS Bild-Generierung mit Fallback — Luma-Ersatz für Stills)
 *
 * User 2026-06-17 „gratis Tools für alles mögliche" + früher „mache Bilder … sauber". Erzeugt
 * edle Hintergründe / Lifestyle-Szenen / Marken-Banner / Story-Backdrops — GRATIS, primär OHNE Key.
 * Probiert mehrere Quellen durch (falls eine ausfällt):
 *   1) pollinations  (GRATIS, KEIN Key, FLUX)            https://image.pollinations.ai
 *   2) cloudflare    (Workers AI FLUX, gratis-Tier)      CF_ACCOUNT_ID + CF_API_TOKEN
 *   3) huggingface   (Inference API, gratis-Tier)        HF_API_KEY
 * Skaliert das Ergebnis sauber auf die Zielgrösse (Standard 1080×1920, ffmpeg Lanczos).
 *
 * ⚠️ REGEL: KI-Bilder NUR als Hintergrund/Lifestyle/Banner/Story — NIE ein echtes Produkt
 *    fälschen oder ein KI-„Produktfoto" als das gelieferte Produkt ausgeben (Misrepresentation).
 *    Asiatische/fremde Schrift im Prompt vermeiden; „no text, no watermark" anhängen.
 *
 * CLI:  node automation/ai/image_gen.mjs "<prompt>" out.jpg [--w 1080] [--h 1920] [--seed 7]
 * API:  import { generateImage } from './ai/image_gen.mjs'
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const ENV = process.env;
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

async function dl(url, out, opts = {}, timeoutMs = 90000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2000) throw new Error('leer/zu klein');
    fs.writeFileSync(out, buf); return true;
  } finally { clearTimeout(t); }
}

const SAFE = ', high quality, professional photography, no text, no watermark, no logo';

const SRC = {
  async pollinations(prompt, raw, { width, height, seed }) {
    const p = encodeURIComponent(prompt + SAFE);
    const url = `https://image.pollinations.ai/prompt/${p}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;
    await dl(url, raw); return true;
  },
  async cloudflare(prompt, raw) {
    if (!ENV.CF_ACCOUNT_ID || !ENV.CF_API_TOKEN) throw new Error('no key');
    const model = ENV.CF_IMG_MODEL || '@cf/black-forest-labs/flux-1-schnell';
    const url = `https://api.cloudflare.com/client/v4/accounts/${ENV.CF_ACCOUNT_ID}/ai/run/${model}`;
    const r = await fetch(url, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.CF_API_TOKEN}` },
      body: JSON.stringify({ prompt: prompt + SAFE }) });
    if (!r.ok) throw new Error(`cf ${r.status}`);
    const j = await r.json();
    const b64 = j.result?.image; if (!b64) throw new Error('keine Bilddaten');
    fs.writeFileSync(raw, Buffer.from(b64, 'base64')); return true;
  },
  async huggingface(prompt, raw) {
    if (!ENV.HF_API_KEY) throw new Error('no key');
    const model = ENV.HF_IMG_MODEL || 'black-forest-labs/FLUX.1-schnell';
    await dl(`https://api-inference.huggingface.co/models/${model}`, raw, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.HF_API_KEY}` },
      body: JSON.stringify({ inputs: prompt + SAFE }) });
    return true;
  },
};

const ORDER = (ENV.IMG_PROVIDER_ORDER || 'pollinations,cloudflare,huggingface').split(',').map(s => s.trim());

export async function generateImage({ prompt, out, width = 1080, height = 1920, seed = Math.floor(Math.random() * 1e6) }) {
  const raw = out + '.raw';
  for (const name of ORDER) {
    if (!SRC[name]) continue;
    try {
      await SRC[name](prompt, raw, { width, height, seed });
      // sauber auf Zielgrösse skalieren/croppen (Lanczos) → einheitlich 1080×1920 o.ä.
      execSync(`ffmpeg -y -i "${raw}" -vf "scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}" -q:v 2 "${out}"`,
        { stdio: 'pipe' });
      fs.rmSync(raw, { force: true });
      log(`✓ Bild via ${name} → ${out}`);
      return { ok: true, provider: name, out };
    } catch (e) { log(`… ${name} fiel aus (${e.message}) → nächster`); fs.rmSync(raw, { force: true }); }
  }
  log('⚠️ Keine Bild-Quelle verfügbar.');
  return { ok: false, provider: 'none' };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const a = process.argv.slice(2);
  const prompt = a.filter(x => !x.startsWith('--') && !/^\d+$/.test(x))[0] || a[0];
  const out = a.filter(x => /\.(jpg|jpeg|png)$/i.test(x))[0] || 'out.jpg';
  const gv = (f, d) => { const i = a.indexOf(f); return i >= 0 ? Number(a[i + 1]) : d; };
  if (!prompt) { log('Nutzung: node image_gen.mjs "<prompt>" out.jpg [--w 1080] [--h 1920] [--seed 7]'); process.exit(1); }
  const r = await generateImage({ prompt, out, width: gv('--w', 1080), height: gv('--h', 1920), seed: gv('--seed', Math.floor(Math.random() * 1e6)) });
  process.exit(r.ok ? 0 : 2);
}
