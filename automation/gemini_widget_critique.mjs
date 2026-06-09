#!/usr/bin/env node
/* LuxeStyle — Gemini-Kritik fürs POD-Gestalten-Widget (pod/designer.js).
 * Schreibt die Kritik nach dropship/pod/widget-critique.md + Konsole. No-op ohne GEMINI_API_KEY.
 */
import fs from 'node:fs';
const KEY=process.env.GEMINI_API_KEY||'', MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const FILE=process.env.WIDGET_FILE||'pod/designer.js', OUT=process.env.CRITIQUE_FILE||'dropship/pod/widget-critique.md';
if(!KEY){ console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }
if(!fs.existsSync(FILE)){ console.error('fehlt:',FILE); process.exit(1); }
const js=fs.readFileSync(FILE,'utf8');

const prompt=`Du bist Senior Frontend-/UX-/CRO-Expert:in für E-Commerce. Unten der JavaScript-Code eines
PRODUKT-GESTALTEN-WIDGETS (Print-on-Demand) für den Schweizer Shop LuxeStyle. Kontext:
- Wird per <script src> in Shopify-Produktbeschreibungen geladen, rendert in <div class="lspod-designer" data-img-front data-img-back data-variant>.
- Kunde gestaltet: TEXT (Schrift/Farbe/Grösse/Platzierung Oben/Mitte/Unten) und LOGO/BILD (Cloudinary unsigned, nur wenn CLOUD+PRESET gesetzt), je VORNE/HINTEN, mit Live-Vorschau auf dem Produktbild.
- Add-to-cart: liest gewählte Variante aus dem Shopify-Formular, legt sie per /cart/add.js mit dem Design als properties ab; spiegelt das Design ausserdem in versteckte properties-Inputs des Formulars (auch normaler Kauf-Button trägt Design).
- Ziel: maximale Conversion, fehlerfrei, mobil, selbsterklärend; läuft autonom ohne Drittanbieter-App.

Bewerte NUR auf Basis des Codes (kein Screenshot). Nenne die TOP 6 konkreten, PRIORISIERTEN Verbesserungen
(Conversion, UX-Klarheit, Edge-Cases/Bugs, Mobile, Robustheit, Vertrauen). Pro Punkt: 1 prägnanter Satz + WARUM +
falls Bug/Edge-Case: kurz die konkrete Code-Stelle/Lösung. Sei spezifisch & umsetzbar. Antworte auf Deutsch,
nummerierte Liste 1–6, dann "FAZIT:" mit Score /10.

CODE:
${js}`;

const url=`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4}})});
const j=await r.json().catch(()=>({}));
if(!r.ok){ console.error('Gemini-Fehler:',r.status,JSON.stringify(j).slice(0,400)); process.exit(1); }
const text=(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).map(p=>p.text).join('');
if(!text){ console.error('Keine Antwort:',JSON.stringify(j).slice(0,400)); process.exit(1); }
fs.writeFileSync(OUT,`# Gemini-Kritik – POD Gestalten-Widget\n_${new Date().toISOString()} · ${MODEL}_\n\n${text}\n`);
console.log('=== GEMINI WIDGET-KRITIK ===\n'+text+'\n=== ENDE ===');
