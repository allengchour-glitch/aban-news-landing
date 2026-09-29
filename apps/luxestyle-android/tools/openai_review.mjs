#!/usr/bin/env node
/*
 * Zweite Meinung zur App: ChatGPT (OpenAI) bekommt dieselben Bildschirmfotos und dieselbe Frage
 * wie Gemini (review_prompt.txt). Ergebnis: openai-review.md (+ GitHub-Zusammenfassung).
 * Aufruf: OPENAI_API_KEY=… node tools/openai_review.mjs <ordner-mit-jpgs>
 * Ohne Schlüssel: Hinweis und Ende ohne Fehler (der Gemini-Teil soll trotzdem durchlaufen).
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const dir = process.argv[2] || 'screens-small';
const out = process.env.OUT_FILE || 'openai-review.md';
if (!KEY) { console.error('OPENAI_API_KEY fehlt – ChatGPT-Bewertung übersprungen.'); process.exit(0); }

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
if (files.length === 0) { console.error(`Keine Bilder in ${dir}`); process.exit(1); }

const content = [{ type: 'text', text: fs.readFileSync(new URL('./review_prompt.txt', import.meta.url), 'utf8') }];
for (const f of files) {
  content.push({ type: 'text', text: `Bild: ${f}` });
  const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
  content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' } });
}

const r = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }] }),
});
const j = await r.json().catch(() => ({}));
const text = j?.choices?.[0]?.message?.content || '';
if (!text) { console.error(`${MODEL}: keine Antwort (${r.status}) ${JSON.stringify(j).slice(0, 400)}`); process.exit(1); }

const md = `# ChatGPT-Bewertung der LuxeStyle-App\n_${new Date().toISOString()} · ${MODEL} · ${files.length} Bildschirme_\n\n${text}\n`;
fs.writeFileSync(out, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n${md}`);
console.log(md);
