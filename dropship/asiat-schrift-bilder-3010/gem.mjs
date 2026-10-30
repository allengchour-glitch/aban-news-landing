import { readFileSync } from 'node:fs';
const KEY = process.env.GEMINI_API_KEY, MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash', BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
export async function frage(buf, mime='image/jpeg') {
  const body = { contents: [{ parts: [ { text: 'Look closely at this product photo. List every piece of text in Chinese, Japanese or Korean script that is visible anywhere on the product, its packaging, its dial/label or in the background. Reply as JSON only: {"asiatisch": true|false, "texte": ["..."], "ort": "where it is"}. Latin-only text, numbers and logos do not count.' }, { inline_data: { mime_type: mime, data: buf.toString('base64') } } ] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } };
  const r = await fetch(`${BASE}/v1beta/models/${MODEL}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text(); if (!r.ok) return { fehler: r.status, text: t.slice(0, 200) };
  try { return JSON.parse(JSON.parse(t).candidates[0].content.parts[0].text); } catch (e) { return { fehler: 'parse', text: t.slice(0, 200) }; }
}
if (process.argv[2]) for (const f of process.argv.slice(2)) console.log(f.split('/').pop(), JSON.stringify(await frage(readFileSync(f))));
