#!/usr/bin/env node
/**
 * Zweitmeinung — holt Rat/Review von einem ANDEREN Modell (OpenAI oder Gemini).
 * Nutzt den Key, der gesetzt ist (OPENAI_API_KEY bevorzugt, sonst GEMINI_API_KEY).
 * Kein npm nötig (reines https). Kein Key → klare Meldung, exit 0.
 *
 * Aufruf:
 *   OPENAI_API_KEY=sk-... node dropship/zweitmeinung.mjs "Frage…"            # ad-hoc Frage
 *   GEMINI_API_KEY=... node dropship/zweitmeinung.mjs --review <datei...>     # Dateien reviewen lassen
 *   node dropship/zweitmeinung.mjs --autopilot   # fragt gezielt nach Rat zum CJ-Autopilot-Setup
 */
import https from 'node:https';
import fs from 'node:fs';

const { OPENAI_API_KEY, GEMINI_API_KEY } = process.env;
const args = process.argv.slice(2);

function post(host, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const r = https.request({ method: 'POST', hostname: host, path,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } },
      (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b })); });
    r.on('error', reject); r.write(data); r.end();
  });
}

async function askOpenAI(prompt) {
  const r = await post('api.openai.com', '/v1/chat/completions',
    { Authorization: `Bearer ${OPENAI_API_KEY}` },
    { model: 'gpt-4o', messages: [
      { role: 'system', content: 'Du bist ein erfahrener E-Commerce/Dropshipping- und Software-Reviewer. Antworte auf Deutsch, konkret, ehrlich, mit priorisierten Verbesserungen.' },
      { role: 'user', content: prompt }], temperature: 0.4 });
  const j = JSON.parse(r.body);
  if (j.error) throw new Error('OpenAI: ' + j.error.message);
  return j.choices?.[0]?.message?.content || '(keine Antwort)';
}

async function askGemini(prompt) {
  const r = await post('generativelanguage.googleapis.com',
    `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {},
    { contents: [{ parts: [{ text: prompt }] }] });
  const j = JSON.parse(r.body);
  if (j.error) throw new Error('Gemini: ' + j.error.message);
  return j.candidates?.[0]?.content?.parts?.[0]?.text || '(keine Antwort)';
}

const AUTOPILOT_FRAGE = `Ich betreibe einen Schweizer Shopify-Dropshipping-Shop (luxestyle.ch) mit CJdropshipping als Lieferant.
Aktueller Stand: 40 Produkte live (Sommer/Alltags-Gadgets, Küche, Beauty, Pet), deutsche Copy, Preis ~2,8× Einkauf, Versand 7–14 Tage aus China, publiziert auf Onlineshop + TikTok + Meta + Google + Pinterest.
Automatisierung: ein täglicher GitHub-Action-Cron sourct neue CJ-Produkte und legt sie als Draft an; eine KI veredelt dann Copy und schaltet live.
Bitte gib mir die 5 wichtigsten, priorisierten Verbesserungen für (a) Produktauswahl/Marge, (b) Conversion/Trust im CH-Markt, (c) Risiken (Versandzeit, Retouren, rechtliches DE/CH), (d) die Automatisierungs-Architektur. Sei konkret und ehrlich, keine Allgemeinplätze.`;

(async () => {
  let prompt, mode = 'frage';
  if (args[0] === '--autopilot') prompt = AUTOPILOT_FRAGE;
  else if (args[0] === '--review') {
    const files = args.slice(1);
    const blobs = files.map(f => `\n\n===== ${f} =====\n` + fs.readFileSync(f, 'utf8').slice(0, 8000)).join('');
    prompt = `Reviewe die folgenden Dateien kritisch (Bugs, Risiken, Verbesserungen, priorisiert):${blobs}`;
    mode = 'review';
  } else prompt = args.join(' ').trim();

  if (!prompt) { console.log('Nutzung: node dropship/zweitmeinung.mjs "Frage" | --review <datei…> | --autopilot'); process.exit(0); }

  const provider = OPENAI_API_KEY ? 'OpenAI (gpt-4o)' : GEMINI_API_KEY ? 'Gemini (2.0-flash)' : null;
  if (!provider) {
    console.log('Kein API-Key gesetzt. Setze OPENAI_API_KEY oder GEMINI_API_KEY, dann erneut ausführen.');
    console.log(`\n[Geplante ${mode}-Anfrage, sobald ein Key da ist:]\n` + prompt.slice(0, 500) + '…');
    process.exit(0);
  }
  console.error(`→ Frage ${provider} …`);
  try {
    const ans = OPENAI_API_KEY ? await askOpenAI(prompt) : await askGemini(prompt);
    console.log(`\n===== Zweitmeinung von ${provider} =====\n`);
    console.log(ans);
  } catch (e) { console.error('Fehler:', e.message); process.exit(0); }
})();
