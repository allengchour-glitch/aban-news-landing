#!/usr/bin/env node
/* LuxeStyle — gemini_page_critique.mjs
 * Holt eine CRO/UX-Kritik von Gemini zur POD-Seite (dropship/pod/page_body.html) und schreibt sie
 * nach dropship/pod/gemini-critique.md + Konsole. No-op ohne GEMINI_API_KEY.
 * ENV: GEMINI_API_KEY · GEMINI_MODEL (Default gemini-2.5-flash) · CRITIQUE_FILE
 */
import fs from 'node:fs';
const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BODY_FILE = process.env.POD_BODY_FILE || 'dropship/pod/page_body.html';
const OUT = process.env.CRITIQUE_FILE || 'dropship/pod/gemini-critique.md';
if(!KEY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
if(!fs.existsSync(BODY_FILE)){ console.error('Body fehlt:', BODY_FILE); process.exit(1); }
const html = fs.readFileSync(BODY_FILE,'utf8');

const prompt = `Du bist Senior-CRO- und E-Commerce-UX-Experte. Unten der HTML-Body einer Shopify-Landingpage
"Selbst gestalten" (Print-on-Demand / Wunschdesign) des Schweizer Premium-Fashion-Shops LuxeStyle.
Die Seite ist absichtlich PRODUKT-FIRST: Kund:innen sollen zuerst Produkte sehen (Raster mit Bild, Name,
ab-Preis, "Gestalten →"), erst danach kommt Erklärung/Steps/FAQ. Mobile-First, Marken-Gold #c1922f.

Bewerte die Seite NUR inhaltlich/strukturell (du siehst HTML, kein Screenshot) und gib die
TOP 6 konkreten, PRIORISIERTEN Verbesserungen für mehr Conversion. Achte auf: sofortige Produkt-Sichtbarkeit,
Klarheit des "wie funktioniert's", Vertrauen/Social Proof, Mobile, Copy/CTA, fehlende Elemente
(z.B. Reviews, Kategorie-Filter, Beispiel-Designs, Preis-Klarheit, Sticky-CTA).
Jede Verbesserung: 1 prägnanter Stichpunkt + WARUM (Conversion-Effekt). Sei spezifisch & umsetzbar.
Antworte auf Deutsch. Format: nummerierte Liste 1-6, danach eine Zeile "FAZIT:" mit Gesamturteil + Score /10.

HTML:
${html}`;

const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ temperature:0.5 } }) });
const j = await r.json().catch(()=>({}));
if(!r.ok){ console.error('Gemini-Fehler:', r.status, JSON.stringify(j).slice(0,400)); process.exit(1); }
const text = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
if(!text){ console.error('Keine Antwort:', JSON.stringify(j).slice(0,400)); process.exit(1); }
const md = `# Gemini-Kritik – POD-Seite "Selbst gestalten"\n_${new Date().toISOString()} · ${MODEL}_\n\n${text}\n`;
fs.writeFileSync(OUT, md);
console.log('=== GEMINI-KRITIK ===\n'+text+'\n=== ENDE ===');
console.log('geschrieben:', OUT);
