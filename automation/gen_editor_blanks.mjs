#!/usr/bin/env node
/* LuxeStyle — gen_editor_blanks.mjs  (echte Blank-Produktfotos für den Selbst-gestalten-Editor)
 *
 * Der Editor (designer.js) zeigt data-img-front nur als VORSCHAU-Hintergrund (die echte Druckdatei
 * enthält nur das zentrierte Motiv). Bisher liegen dort Schema-Zeichnungen (pod/templates/*.png).
 * Dieses Skript erzeugt per Gemini photorealistische, leere Produktfotos auf hellem Studio-Grau
 * (einheitlich zum Shirt/Tasse-Editor) → pod/editor-blanks/<key>.jpg. No-op ohne GEMINI_API_KEY.
 *
 * ENV: GEMINI_API_KEY · [GEMINI_IMAGE_MODEL] · [ONLY=key,key] · [FORCE=1] · [DRY_RUN=1]
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const FORCE = process.env.FORCE === '1';
const DRY = process.env.DRY_RUN === '1';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(ROOT, 'pod', 'editor-blanks');

const COMMON = 'Centered, plain blank product with a large empty printable area, soft even studio lighting, light neutral grey seamless background (#eceae6), photorealistic e-commerce product photo, no text, no logo, no graphic, no watermark, sharp and clean.';
const ITEMS = [
  { key: 'tote',   prompt: `A blank natural off-white cotton tote bag standing upright, flat front facing the camera, two handles up. ${COMMON}` },
  { key: 'kissen', prompt: `A blank plain white square throw pillow / cushion, front facing the camera, soft fabric. ${COMMON}` },
  { key: 'magnet', prompt: `A blank plain white rectangular fridge photo magnet with subtly rounded corners, front facing the camera, slight thickness and soft drop shadow. ${COMMON}` },
  { key: 'poster', prompt: `A blank white portrait poster print in a thin slim black frame, hanging flat on a light neutral grey wall, A2 portrait proportions, the white poster area large and centered. Photorealistic interior product mockup, soft even lighting, no text, no graphic, no watermark.` },
  { key: 'buegeltransfer', prompt: `A blank iron-on heat transfer film sheet, a clean white slightly glossy rectangular carrier sheet with one corner gently peeling up, lying flat. ${COMMON}` },
];

function extractImage(j) {
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) { const d = p.inline_data || p.inlineData; if (d?.data) return d.data; }
  return null;
}
async function gen(prompt) {
  const url = `${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.35 } };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('  Gemini:', r.status, JSON.stringify(j.error || j).slice(0, 200)); return null; }
  return extractImage(j);
}

if (!KEY && !DRY) { console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const queue = ONLY.length ? ITEMS.filter(i => ONLY.includes(i.key)) : ITEMS;
let made = 0;
for (const it of queue) {
  const outFile = path.join(OUT, `${it.key}.jpg`);
  if (!FORCE && fs.existsSync(outFile)) { console.log(`= ${it.key} (existiert)`); continue; }
  if (DRY) { console.log(`[DRY] gen ${it.key}`); made++; continue; }
  console.log(`→ ${it.key} …`);
  const b64 = await gen(it.prompt);
  if (!b64) { console.error('   ⚠️  keine Bilddaten'); continue; }
  fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
  console.log(`   ✅ ${path.relative(ROOT, outFile)} (${(fs.statSync(outFile).size / 1024) | 0}kB)`);
  made++;
}
console.log(`Fertig: ${made} Blank(s).`);
