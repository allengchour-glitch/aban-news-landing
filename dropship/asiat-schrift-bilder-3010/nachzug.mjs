import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
const KEY = process.env.GEMINI_API_KEY, MODEL = 'gemini-2.5-flash', BASE = 'https://generativelanguage.googleapis.com';
const src = readFileSync('/tmp/cm/cjk/stufe.mjs','utf8'); const PROMPT = (0, eval)(src.split('\n').find(l => l.startsWith('const PROMPT = ')).slice('const PROMPT = '.length).replace(/;$/, ''));
async function frage(buf, mime) { const body = { contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: buf.toString('base64') } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } };
  const r = await fetch(`${BASE}/v1beta/models/${MODEL}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const t = await r.text(); if (!r.ok) throw new Error('gem ' + r.status); return JSON.parse(JSON.parse(t).candidates[0].content.parts[0].text); }
const plan = JSON.parse(readFileSync('/tmp/cm/cjk/plan_deutlich.json','utf8'));
for (const p of plan) { if (!p.bilder.some(b => b.unbekannt)) continue;
  for (const b of p.bilder) { if (!b.unbekannt) continue; try {
    const res = await fetch(b.url + (b.url.includes('?') ? '&' : '?') + 'width=700'); if (!res.ok) throw new Error('bild ' + res.status);
    const a = await frage(Buffer.from(await res.arrayBuffer()), res.headers.get('content-type') || 'image/jpeg');
    b.treffer = a.stufe === 'deutlich'; b.unbekannt = false; appendFileSync('/tmp/cm/cjk/stufe.jsonl', JSON.stringify({ handle: p.handle, pos: b.pos, url: b.url, stufe: a.stufe, texte: a.texte || [], grund: a.grund || '', nachzug: true }) + '\n');
  } catch (e) { console.log('weiter unbekannt', p.handle, b.pos, String(e).slice(0, 60)); } }
  p.mitVariante = p.bilder.filter(b => b.treffer && p.mitVariante.includes(b.mediaId)).map(b => b.mediaId);
  p.sauber = p.bilder.filter(b => b.typ === 'IMAGE' && !b.treffer && !b.unbekannt).length; p.treffer = p.bilder.filter(b => b.treffer).length;
  console.log(p.handle, 'sauber', p.sauber, 'deutlich', p.treffer, 'unbekannt', p.bilder.filter(b => b.unbekannt).length); }
writeFileSync('/tmp/cm/cjk/plan_deutlich.json', JSON.stringify(plan));
