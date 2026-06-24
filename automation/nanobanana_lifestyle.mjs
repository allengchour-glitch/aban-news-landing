#!/usr/bin/env node
/* nanobanana_lifestyle.mjs — erzeugt aus einem ECHTEN Produktbild ein Lifestyle-/Model-/UGC-Ad-Bild
 * via Google Nano Banana 2 (Gemini Image API). Das Produktbild geht als Referenz mit -> das Produkt bleibt
 * ORIGINALGETREU (kein Misrepresentation), drumherum kommt Model/Umgebung/Licht.
 * Gelernt aus YouTube (Claude Code + Nano Banana 2). Ergaenzt die Luma-UGC-VIDEO-Pipeline (Bild=NanoBanana, Video=Luma).
 *
 * ENV:  GEMINI_API_KEY (Pflicht; aistudio.google.com)
 *       NANOBANANA_MODEL=gemini-3-pro-image-preview  (Default-Liste mit Fallback unten)
 * Lauf: node automation/nanobanana_lifestyle.mjs --image <url|pfad> --title "Wasserfeste Kette" [--style lifestyle|model|ugc|hero] [--out datei.png]
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

// ===== LuxeStyle Signature-Stil "Alpenlicht Editorial" (2026-06-24, User: eigener Stil, nicht geklaut) =====
// Fixe Kombi = unverwechselbar: warmer Schweizer Stein (Travertin) + EIN Alpen-Botanical (Edelweiss/Trockengras) +
// Golden-Hour-Seitenlicht von links + cremiges Tuerkissee-Bokeh + warmer Editorial-Grade (lifted blacks, leichtes Korn).
// ⚠️ KEIN dunkles Wasser/Tropfen (das war der geklaute Parfum-Look). Wasser NUR fuer wasserfesten Schmuck = helles Alpensee-Tuerkis.
function promptFor(title, style) {
  const base = `Use the provided product image as the EXACT reference — keep the product "${title}" identical in shape, color, material, proportions and details (do not alter or replace the product). `;
  const clause = ` Warm golden-hour side-light from the left with long soft shadows, warm editorial grade with lifted soft blacks and faint film grain, creamy defocused alpine bokeh (pale mountains / sliver of turquoise Swiss lake), serene quiet-luxury Swiss mood, generous calm negative space, lower third uncluttered. True colors, photorealistic, 9:16 vertical, product clearly the hero. No on-screen text, no logos, no watermarks, no extra brands.`;
  switch (style) {
    case 'model': // Apparel/Kleider — on-model editorial
      return base + `Place the garment on a relaxed elegant young Swiss woman on a sun-washed travertine stone terrace, a single sprig of dried wild grass on a stone ledge nearby.` + clause;
    case 'jewelry': // Schmuck (kein Wasser) — Editorial Still-Life
      return base + `Rest the jewelry on a pale travertine stone slab beside a single edelweiss sprig; the light grazes the metal/stones into a soft brushed-gold gleam.` + clause;
    case 'bag': case 'accessory':
      return base + `Lean the product on a raw travertine/pale-granite stone edge over a fold of oat linen, one dried eucalyptus sprig beside it.` + clause;
    case 'sunglasses':
      return base + `Place the sunglasses open on a sun-warmed pale stone slab beside a sprig of dried alpine grass, a crisp warm reflection across the lenses.` + clause;
    case 'beauty':
      return base + `Stand the product upright on a smooth travertine stone beside a small pressed alpine flower and a fold of linen, gentle highlight bloom, spa-clean Swiss-apothecary mood.` + clause;
    case 'home': case 'wellness':
      return base + `Place the item on a pale stone shelf or linen-draped wood in a calm sunlit Swiss interior opening to a blurred alpine view, one dried botanical sprig beside it, cozy quiet-luxury wellness mood.` + clause;
    case 'men':
      return base + `Rest the product on a raw granite/slate stone beside a sprig of dried grass, graded slightly cooler and higher-contrast for a restrained masculine tone, defocused stone-and-mountain terrace behind.` + clause;
    case 'seetest': case 'water': case 'hero': case 'studio': // WASSER nur fuer wasserfesten Schmuck — helles Alpensee-Tuerkis, NICHT dunkel
      return base + `Photograph the waterproof jewelry resting half-submerged at the bright sunlit edge of a crystal-clear turquoise Swiss alpine lake, clean water gently lapping with a few natural droplets, pale stones and a defocused mountain shoreline behind; the piece stays brilliant in water. Bright daylight, turquoise and Swiss (never dark moody water).` + clause;
    case 'ugc':
      return base + `Authentic phone-shot UGC look: a real young Swiss woman holding/wearing the product in a bright everyday setting, casual and relatable, slight imperfection, not polished studio.` + clause;
    default: // 'lifestyle' = Signature Still-Life (produkt-agnostischer Fallback)
      return base + `Rest the product on a warm travertine stone surface over a fold of oat linen, with exactly one alpine-botanical accent (edelweiss or dried grass) beside it on a sunlit Swiss terrace.` + clause;
  }
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
