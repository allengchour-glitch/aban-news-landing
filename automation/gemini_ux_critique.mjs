#!/usr/bin/env node
/* Gemini-UX-Kritik: bewertet eine Seite auf SEHR EINFACHE, KLARE, MODERNE Bedienung. */
import fs from 'node:fs';
const KEY=process.env.GEMINI_API_KEY||''; const MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const BODY=process.env.BODY_FILE||'dropship/designs/page_body.html'; const OUT=process.env.OUT_FILE||'dropship/designs/ux-critique.md';
if(!KEY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
const html=fs.readFileSync(BODY,'utf8');
const prompt=`Du bist Senior Product-Designer (Apple-/Linear-/Aesop-Niveau). Unten der HTML-Body einer Shopify-Seite
„Designs & Sticker" (Galerie mit ~250 Motiven zum Selbst-Gestalten) des Schweizer Premium-Shops LuxeStyle.
ZIEL des Users: SEHR EINFACHE, KLARE, MODERNE Bedienung. Premium, ruhig, viel Weissraum, eine klare Aktion.
Theme-Palette: Creme #faf7f2, Anthrazit #2c2c2c, Akzent Taupe-Gold #8b7355.

Bewerte NUR UX/Visual (kein Screenshot, nur HTML/CSS). Gib die TOP 5 KONKRETEN Verbesserungen für maximale
Einfachheit/Klarheit/Modernität. Achte auf: visuelle Hierarchie, Weissraum, Typo-Skala, eine klare Primär-Aktion,
Filter-Bedienung (Touch), Kachel-Konsistenz, Reduktion von Ablenkung, Mobile. Jede: 1 knapper Stichpunkt + konkreter
CSS/Struktur-Vorschlag. Deutsch. Format: 1-5, dann „FAZIT:" + Score /10. Sei streng aber konstruktiv.

HTML:
${html}`;
const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`,
  {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4}})});
const j=await r.json().catch(()=>({})); const t=j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'';
if(!t){ console.error('Keine Antwort:',JSON.stringify(j).slice(0,300)); process.exit(1); }
fs.writeFileSync(OUT,`# Gemini-UX-Kritik – Designs-Seite\n_${new Date().toISOString()} · ${MODEL}_\n\n${t}\n`);
console.log('=== UX-KRITIK ===\n'+t);
