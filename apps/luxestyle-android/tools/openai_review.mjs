#!/usr/bin/env node
/*
 * Weitere Meinungen zur App: ChatGPT (OpenAI) oder jeder Anbieter mit derselben Schnittstelle
 * (z. B. Kimi von Moonshot) bekommt dieselben Bildschirmfotos und dieselbe Frage wie Gemini
 * (review_prompt.txt). Ergebnis: openai-review.md bzw. OUT_FILE (+ GitHub-Zusammenfassung).
 * ChatGPT: OPENAI_API_KEY=… node tools/openai_review.mjs <ordner-mit-jpgs>
 * Kimi:    REVIEW_PROVIDER=kimi KIMI_API_KEY=… node tools/openai_review.mjs <ordner>
 * Ohne Schlüssel: Hinweis und Ende ohne Fehler (der Gemini-Teil soll trotzdem durchlaufen).
 */
import fs from 'node:fs';
import path from 'node:path';

const PROVIDERS = {
  openai: { name: 'ChatGPT', key: 'OPENAI_API_KEY', base: 'https://api.openai.com/v1', model: 'gpt-4o' },
  kimi: { name: 'Kimi', key: 'KIMI_API_KEY', base: 'https://api.moonshot.ai/v1', model: 'kimi-k3' },
};
const P = PROVIDERS[process.env.REVIEW_PROVIDER || 'openai'];
const KEY = process.env[P.key] || '';
const MODEL = process.env.REVIEW_MODEL || process.env.OPENAI_MODEL || P.model;
const dir = process.argv[2] || 'screens-small';
const out = process.env.OUT_FILE || 'openai-review.md';
if (!KEY) { console.error(`${P.key} fehlt – ${P.name}-Bewertung übersprungen.`); process.exit(0); }

// Neue OpenAI-Konten dürfen nur ~30'000 Tokens pro Minute schicken (gemessen: 49 Bilder = 38'098 → abgelehnt).
// Darum höchstens OPENAI_MAX_IMAGES Bilder, gleichmässig über den Rundgang verteilt.
const MAX = Number(process.env.OPENAI_MAX_IMAGES || 20);
const all = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
const files = all.length <= MAX ? all : Array.from({ length: MAX }, (_, i) => all[Math.floor((i * all.length) / MAX)]);
if (files.length === 0) { console.error(`Keine Bilder in ${dir}`); process.exit(1); }

const content = [{ type: 'text', text: fs.readFileSync(new URL('./review_prompt.txt', import.meta.url), 'utf8') }];
for (const f of files) {
  content.push({ type: 'text', text: `Bild: ${f}` });
  const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
  content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' } });
}

// Gestreamt: Denk-Modelle (z. B. kimi-k3) brauchen oft über 5 Minuten; ohne Stream bricht Node
// nach 300 s ohne Antwort-Kopf ab (UND_ERR_HEADERS_TIMEOUT).
const r = await fetch(`${P.base}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: MODEL, stream: true, messages: [{ role: 'user', content }] }),
});
if (!r.ok) { console.error(`${MODEL}: keine Antwort (${r.status}) ${(await r.text()).slice(0, 400)}`); process.exit(1); }
let text = '';
let buf = '';
const dec = new TextDecoder();
for await (const chunk of r.body) {
  buf += dec.decode(chunk, { stream: true });
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line.startsWith('data:') || line === 'data: [DONE]') continue;
    try { text += JSON.parse(line.slice(5)).choices?.[0]?.delta?.content || ''; } catch { /* Teilzeile */ }
  }
}
if (!text) { console.error(`${MODEL}: leere Antwort`); process.exit(1); }

const md = `# ${P.name}-Bewertung der LuxeStyle-App\n_${new Date().toISOString()} · ${MODEL} · ${files.length} Bildschirme_\n\n${text}\n`;
fs.writeFileSync(out, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n${md}`);
console.log(md);
