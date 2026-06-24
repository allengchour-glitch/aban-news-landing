#!/usr/bin/env node
/* nanobanana_lifestyle.mjs — erzeugt aus einem ECHTEN Produktbild ein Lifestyle-/Model-/UGC-Ad-Bild
 * via Google Nano Banana 2 (Gemini Image API). Das Produktbild geht als Referenz mit -> das Produkt bleibt
 * ORIGINALGETREU (kein Misrepresentation), drumherum kommt Model/Umgebung/Licht.
 * Gelernt aus YouTube (Claude Code + Nano Banana 2). Ergaenzt die Luma-UGC-VIDEO-Pipeline (Bild=NanoBanana, Video=Luma).
 *
 * ENV:  GEMINI_API_KEY (Pflicht; aistudio.google.com)
 *       NANOBANANA_MODEL=gemini-3-pro-image-preview  (Default-Liste mit Fallback unten)
 * Lauf: node automation/nanobanana_lifestyle.mjs --image <url|pfad> --title "Wasserfeste Kette" [--style lifestyle|model|ugc] [--out datei.png]
 *       (--dry = nur zeigen, was es taete)
 *
 * REGELN: KI-Bild NUR Hintergrund/Lifestyle/Model — NIE ein anderes Produkt faken (Produkt = die Referenz).
 *         Strikt CH-Aesthetik. Kein eingebrannter Text (Preis/Hook kommt spaeter im Reel-Builder, Safe-Zone).
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY;
// Nano Banana 2 = Gemini Image. Modell-Kandidaten der Reihe nach (erstes, das nicht 404/400 gibt, gewinnt).
const MODELS = (process.env.NANOBANANA_MODEL
  ? [process.env.NANOBANANA_MODEL]
  : ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview']);
const val = (flag, def = '') => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : def; };
const DRY = process.argv.includes('--dry');
const IMAGE = val('--image');
const TITLE = val('--title', 'Produkt');
const STYLE = (val('--style', 'lifestyle')).toLowerCase();
const slug = TITLE.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'produkt';
const OUT = val('--out', path.join('social', 'ai-lifestyle', `${slug}.png`));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function promptFor(title, style) {
  const base = `Use the provided product image as the EXACT reference — keep the product "${title}" identical in shape, color, material and details (do not alter or replace the product). `;
  const common = `Strictly Switzerland aesthetic, natural realistic lighting, true colors, high quality, 9:16 vertical composition with the product clearly visible. No on-screen text, no logos, no watermarks, no extra brands.`;
  if (style === 'model') return base + `Place it being worn/used by a real, natural-looking young Swiss woman in an elegant everyday setting. Editorial but believable. ` + common;
  if (style === 'ugc') return base + `Make it look like an authentic phone-shot UGC photo: a real young Swiss woman holding/wearing the product in a bright everyday setting (bedroom, cafe, outdoors), casual and relatable, slight imperfection, not polished studio. ` + common;
  return base + `Place it in a beautiful lifestyle scene (tasteful surface, soft daylight, subtle props that fit a Swiss summer mood) that makes it desirable. Clean, premium, scroll-stopping. ` + common;
}

async function loadImage(src) {
  if (/^https?:\/\//i.test(src)) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`Bild-URL ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = r.headers.get('content-type') || 'image/jpeg';
    return { b64: buf.toString('base64'), mime: mime.split(';')[0] };
  }
  const buf = fs.readFileSync(src);
  const ext = path.extname(src).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { b64: buf.toString('base64'), mime };
}

async function genWith(model, prompt, img) {
  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: img.mime, data: img.b64 } }] }],
    generationConfig: { responseModalities: ['IMAGE'], temperature: 0.7 },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${model} ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
  const parts = j?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
  const data = imgPart?.inlineData?.data || imgPart?.inline_data?.data;
  if (!data) throw new Error(`${model}: keine Bilddaten in der Antwort`);
  return Buffer.from(data, 'base64');
}

(async () => {
  if (!IMAGE) { log('❌ --image <url|pfad> fehlt.'); process.exit(1); }
  const prompt = promptFor(TITLE, STYLE);
  if (DRY) { log('[dry] Modell-Kandidaten:', MODELS.join(', ')); log('[dry] Style:', STYLE); log('[dry] Prompt:', prompt); log('[dry] Out:', OUT); process.exit(0); }
  if (!KEY) { log('⚠️ GEMINI_API_KEY fehlt — am PC (luxe-secrets.ps1) ODER ENV setzen. No-op.'); process.exit(0); }

  const img = await loadImage(IMAGE);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  let lastErr;
  for (const m of MODELS) {
    try {
      log('Generiere mit', m, '…');
      const out = await genWith(m, prompt, img);
      fs.writeFileSync(OUT, out);
      log('✅ Lifestyle-Bild gespeichert:', OUT, `(${m}, ${(out.length / 1024).toFixed(0)} KB)`);
      process.exit(0);
    } catch (e) { lastErr = e; log('  ', String(e.message).slice(0, 140)); }
  }
  log('❌ Kein Modell lieferte ein Bild. Letzter Fehler:', String(lastErr?.message).slice(0, 160));
  process.exit(1);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
