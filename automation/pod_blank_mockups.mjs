#!/usr/bin/env node
/* LuxeStyle — pod_blank_mockups.mjs  (POD-Mockups säubern: "Dein Design" entfernen)
 *
 * Problem: Die "Selbst gestalten"-Produkte zeigen ein Printful-Mockup mit dem Platzhalter-Text
 * "Dein Design" — auf gewölbten Flächen (Taschen, Tassen, Flaschen, Body) ist der Text ABGESCHNITTEN
 * und wirkt kaputt. Kund:innen sollen das SAUBERE, leere Produkt sehen (sie gestalten es selbst im Editor).
 *
 * Lösung: Gemini 2.5 Flash Image ("Nano Banana", Bild-zu-Bild) entfernt NUR den Platzhalter-Text und
 * rekonstruiert die leere Produktfläche — Produkt bleibt 100% identisch (Form/Farbe/Material/Licht).
 *
 * Ergebnis: pod/blanks/<handle>.jpg (committet → via raw.githubusercontent / Pages öffentlich).
 * Danach werden die Produktbilder per Shopify-MCP/Admin-API getauscht.
 *
 * No-op-safe: ohne GEMINI_API_KEY sauberer Leerlauf.
 * ENV: GEMINI_API_KEY (Pflicht) · GEMINI_IMAGE_MODEL (Default gemini-2.5-flash-image) ·
 *      ONLY (Komma-Liste handles, gezielt) · FORCE=1 (vorhandene überschreiben) · DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const ONLY = (process.env.ONLY || '').split(',').map(s=>s.trim()).filter(Boolean);
const FORCE = process.env.FORCE === '1';
const DRY = process.env.DRY_RUN === '1';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const OUT_DIR = path.join(ROOT, 'pod', 'blanks');
const CDN = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/';

// Featured-Mockups mit "Dein Design"-Platzhalter (Quelle = aktuelles Shopify-CDN-Bild).
const ITEMS = [
  { handle:'bio-jutebeutel-selbst-gestalten',                       src:'eco-tote-bag-oyster-front-6a26ff9aa2784.jpg' },
  { handle:'baumwolltasche-mit-langen-henkeln-selbst-gestalten',    src:'49323_1776180182.jpg' },
  { handle:'urban-umhangetasche-selbst-gestalten',                  src:'urban-crossbody-bag-natural-stone-front-6a27048d667d1.jpg' },
  { handle:'alltags-umhangetasche-selbst-gestalten',                src:'everyday-crossbody-bag-fresh-pink-front-6a2704f779a4c.jpg' },
  { handle:'keramik-tasse-selbst-gestalten',                        src:'1320_1663762583.jpg' },
  { handle:'dad-cap-selbst-gestalten',                              src:'classic-dad-hat-white-front-6a2704153578c.jpg' },
  { handle:'unisex-hoodie-selbst-gestalten',                        src:'unisex-crew-neck-sweatshirt-white-front-6a26fee594a32.jpg' },
  { handle:'premium-hoodie-selbst-gestalten',                       src:'unisex-premium-pullover-hoodie-white-front-6a270618762ce.jpg' },
  { handle:'edelstahl-trinkflasche-mit-strohhalm-selbst-gestalten', src:'stainless-steel-water-bottle-with-a-straw-lid-white-32-oz-front-6a2716901fa54.jpg' },
  { handle:'baby-jersey-body-selbst-gestalten',                     src:'baby-jersey-bodysuit-white-front-6a271704b36b7.jpg' },
  { handle:'allover-rucksack-selbst-gestalten',                     src:'all-over-print-backpack-white-front-6a2719b5540a1.jpg' },
  { handle:'kiss-cut-aufkleber-selbst-gestalten',                   src:'kiss-cut-stickers-white-3x3-default-6a2717b4ee33e.jpg' },
  // Allover-Print-Kleidung (Dein-Design eingebrannt) — 2026-06-13
  { handle:'allover-sport-bh-selbst-gestalten',                     src:'all-over-print-sports-bra-white-front-6a271ed20aef1.jpg' },
  { handle:'allover-yoga-leggings-selbst-gestalten',                src:'all-over-print-yoga-leggings-white-front-6a2718d6c8473.jpg' },
  { handle:'kleid-mit-schlitz-und-allover-druck-selbst-gestalten',  src:'all-over-print-slip-dress-white-front-6a271d8aa07fe.jpg' },
  { handle:'recycelte-allover-jogginghosen-selbst-gestalten',       src:'all-over-print-recycled-mens-joggers-white-front-6a271e3a66302.jpg' },
  { handle:'einteiliger-allover-badeanzug-selbst-gestalten',        src:'all-over-print-one-piece-swimsuit-white-front-6a27184072d96.jpg' },
  { handle:'boardshorts-mit-allover-druck-selbst-gestalten',        src:'all-over-print-mens-board-shorts-white-front-6a271594a268f.jpg' },
  { handle:'unisex-allover-bomberjacke-selbst-gestalten',           src:'all-over-print-unisex-bomber-jacket-white-front-6a271cef7e37f.jpg' },
  { handle:'recycelter-unisex-allover-pullover-selbst-gestalten',   src:'all-over-print-recycled-unisex-sweatshirt-white-front-6a271b2dcf3bd.jpg' },
  { handle:'recycelter-unisex-allover-hoodie-selbst-gestalten',     src:'all-over-print-recycled-unisex-hoodie-white-front-6a271c55cdb4b.jpg' },
];

const PROMPT = `You are a professional product-photo retoucher. The provided image is a plain product mockup with a placeholder watermark text reading "Dein Design" printed on it. TASK: cleanly REMOVE that "Dein Design" placeholder text completely and reconstruct the bare product surface underneath, so the product looks BLANK and ready to be customised. CRITICAL: keep the product 100% IDENTICAL — exact same shape, colour, material, fabric texture, seams, straps, lighting, shadows, reflections, background and camera angle. Do NOT redesign, recolour, move, resize or stylise the product. Do NOT add any new text, logo, pattern or graphic. The ONLY change is the removal of the "Dein Design" text. Output a clean, photorealistic, e-commerce-quality product photo on the same plain background.`;

if(!KEY && !DRY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
fs.mkdirSync(OUT_DIR, { recursive:true });

async function fetchImage(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Bild ${url} → HTTP ${r.status}`);
  const ct = (r.headers.get('content-type')||'').split(';')[0] || 'image/jpeg';
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: ct };
}
function extractImage(j){
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for(const p of parts){ const d = p.inline_data || p.inlineData; if(d?.data) return d.data; }
  return null;
}
async function clean(img){
  const url = `${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents:[{ role:'user', parts:[ { text: PROMPT }, { inline_data:{ mime_type: img.mime, data: img.b64 } } ] }],
                 generationConfig:{ responseModalities:['IMAGE'], temperature: 0.15 } };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ console.error('  Gemini:', r.status, JSON.stringify(j.error||j).slice(0,300)); return null; }
  return extractImage(j);
}

const queue = ONLY.length ? ITEMS.filter(i=>ONLY.includes(i.handle)) : ITEMS;
let made=0, skipped=0;
for(const it of queue){
  const outFile = path.join(OUT_DIR, `${it.handle}.jpg`);
  if(!FORCE && fs.existsSync(outFile)){ console.log(`= ${it.handle} (existiert, skip)`); skipped++; continue; }
  console.log(`→ ${it.handle} …`);
  if(DRY){ console.log('   DRY: würde', it.src, 'säubern'); made++; continue; }
  try{
    const src = await fetchImage(CDN + it.src);
    const b64 = await clean(src);
    if(!b64){ console.error('   ⚠️  keine Bilddaten — übersprungen'); continue; }
    fs.writeFileSync(outFile, Buffer.from(b64,'base64'));
    console.log(`   ✅ ${path.relative(ROOT,outFile)} (${(fs.statSync(outFile).size/1024)|0}kB)`);
    made++;
  }catch(e){ console.error('   Fehler:', e.message); }
}
console.log(`Fertig: ${made} gesäubert, ${skipped} übersprungen.`);
