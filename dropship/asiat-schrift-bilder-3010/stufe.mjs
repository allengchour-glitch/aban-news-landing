import { readFileSync, appendFileSync, existsSync } from 'node:fs';
const KEY = process.env.GEMINI_API_KEY, MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash', BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const PROMPT = 'You are checking a product photo for a Swiss online shop. Customers see it at about 600 px width. Does it show Chinese, Japanese or Korean script? Rate how noticeable that script is to a normal shopper looking at the photo at this size. Reply JSON only: {"stufe":"keine"|"winzig"|"klein"|"deutlich","texte":["..."],"grund":"short"}. Rules: "deutlich" = script is readable or clearly noticeable at a glance (overlay text, price tag, watch dial or device screen text, front of packaging, large labels, printed on the product). "klein" = visible if you look, but small (small label, secondary packaging text, minor screen text). "winzig" = tiny, blurred or incidental (sticker on a fridge, book spine, background signs, text on a small bag inside, fine print). "keine" = no Asian script.';
async function frage(buf, mime) {
  const body = { contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: buf.toString('base64') } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } };
  const r = await fetch(`${BASE}/v1beta/models/${MODEL}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text(); if (!r.ok) return { fehler: r.status, text: t.slice(0, 200) };
  try { return JSON.parse(JSON.parse(t).candidates[0].content.parts[0].text); } catch { return { fehler: 'parse' }; }
}
const OUT = '/tmp/cm/cjk/stufe.jsonl';
const bereit = new Set(existsSync(OUT) ? readFileSync(OUT,'utf8').split('\n').filter(Boolean).map(z=>JSON.parse(z).url) : []);
if (process.argv[2] === 'kontrolle') { // Kontrolle: bekannte Fotos
  for (const f of process.argv.slice(3)) console.log(f.split('/').pop(), JSON.stringify(await frage(readFileSync(f), 'image/jpeg')));
  process.exit(0);
}
const plan = JSON.parse(readFileSync('/tmp/cm/cjk/plan_voll.json','utf8'));
const jobs = []; for (const p of plan) for (const b of p.bilder) if (b.treffer && b.url && !bereit.has(b.url)) jobs.push({ handle: p.handle, pos: b.pos, url: b.url });
console.log('Bilder', jobs.length);
let stop = false, n = 0;
async function arbeiter() { while (!stop && jobs.length) { const j = jobs.shift(); try {
  const res = await fetch(j.url + (j.url.includes('?') ? '&' : '?') + 'width=700'); if (!res.ok) throw new Error('bild ' + res.status);
  const a = await frage(Buffer.from(await res.arrayBuffer()), res.headers.get('content-type') || 'image/jpeg');
  if (a.fehler) { if ([402,429,403,400].includes(a.fehler)) { stop = true; jobs.unshift(j); console.log('STOPP', JSON.stringify(a)); } else console.log('Fehler', j.handle, JSON.stringify(a)); continue; }
  appendFileSync(OUT, JSON.stringify({ ...j, stufe: a.stufe, texte: a.texte || [], grund: a.grund || '' }) + '\n');
  if (++n % 100 === 0) console.log('fertig', n);
} catch (e) { console.log('Fehler', j.handle, String(e).slice(0, 80)); } } }
await Promise.all([1,2,3,4].map(arbeiter));
console.log(stop || jobs.length ? 'ABGEBROCHEN offen ' + jobs.length : 'FERTIG', n);
