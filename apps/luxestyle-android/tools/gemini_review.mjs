#!/usr/bin/env node
/*
 * Gemini schaut sich die echte App an (Bildschirmfotos aus dem Rundgang) und nennt,
 * was Kundinnen am Kaufen hindert. Ergebnis: gemini-review.md (+ GitHub-Zusammenfassung).
 * Aufruf: node tools/gemini_review.mjs <ordner-mit-jpgs>
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-pro,gemini-2.5-flash').split(',');
const dir = process.argv[2] || 'screens-small';
const out = process.env.OUT_FILE || 'gemini-review.md';
if (!KEY) { console.error('GEMINI_API_KEY fehlt.'); process.exit(1); }

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
if (files.length === 0) { console.error(`Keine Bilder in ${dir}`); process.exit(1); }

const prompt = `Du bist Senior Product-Designer für Mobile-Commerce (Niveau Zalando, Aesop, Net-a-Porter).
Unten Bildschirmfotos der Android-App von LuxeStyle, einem Schweizer Online-Shop für Damenmode,
Schmuck und Accessoires (Preise in CHF, Gratis-Versand ab CHF 45, Code WELCOME10, Lieferung 10–20 Werktage).
Die Bilder stammen aus der echten App mit echten Shopdaten; der Dateiname sagt, welcher Bildschirm es ist.
Bezahlt wird im Web-Checkout von Shopify (nicht abgebildet).

Ziel: mehr Käufe und eine App, die sich hochwertig anfühlt. Nenne die 10 wirksamsten Verbesserungen,
sortiert nach erwarteter Wirkung auf Käufe. Für jede:
- **Titel** (kurz)
- Bildschirm(e) mit Dateiname
- Was du konkret siehst (Problem)
- Was genau geändert werden soll (umsetzbar, kein allgemeiner Rat)
- Aufwand: klein / mittel / gross

Danach: „Was schon gut ist" (max. 5 Punkte) und eine Note von 1–10.
Nichts erfinden: Kommentiere nur, was auf den Bildern zu sehen ist. Keine Fake-Bewertungen oder
Fake-Knappheit vorschlagen. Antworte auf Deutsch (Schweiz, „ss" statt „ß").`;

const parts = [{ text: prompt }];
for (const f of files) {
  parts.push({ text: `Bild: ${f}` });
  parts.push({ inline_data: { mime_type: 'image/jpeg', data: fs.readFileSync(path.join(dir, f)).toString('base64') } });
}

let text = '';
let used = '';
for (const model of MODELS) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent?key=${encodeURIComponent(KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.3 } }),
    },
  );
  const j = await r.json().catch(() => ({}));
  text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (text) { used = model.trim(); break; }
  console.error(`${model}: keine Antwort (${r.status}) ${JSON.stringify(j).slice(0, 300)}`);
}
if (!text) process.exit(1);

const md = `# Gemini-Bewertung der LuxeStyle-App\n_${new Date().toISOString()} · ${used} · ${files.length} Bildschirme_\n\n${text}\n`;
fs.writeFileSync(out, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
