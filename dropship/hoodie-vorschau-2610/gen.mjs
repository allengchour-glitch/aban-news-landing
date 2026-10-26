// gen.mjs <out.png> <aspect> <size> <prompt> <img1> [img2 ...]
import fs from 'node:fs';
const [,, out, aspect, size, prompt, ...imgs] = process.argv;
const KEY = process.env.GEMINI_API_KEY, MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const parts = [{ text: prompt }, ...imgs.map((p) => ({ inline_data: { mime_type: p.endsWith('.jpg') ? 'image/jpeg' : 'image/png', data: fs.readFileSync(p).toString('base64') } }))];
const body = { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], temperature: Number(process.env.TEMP || 0.3), imageConfig: { aspectRatio: aspect, imageSize: size } } };
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const j = await r.json().catch(() => ({}));
if (!r.ok) { console.log('HTTP', r.status, JSON.stringify(j.error || j).slice(0, 500)); process.exit(1); }
const ps = j?.candidates?.[0]?.content?.parts || [];
const img = ps.map((p) => p.inline_data || p.inlineData).find((d) => d?.data);
if (!img) { console.log('kein Bild:', JSON.stringify(j).slice(0, 600)); process.exit(2); }
fs.writeFileSync(out, Buffer.from(img.data, 'base64')); console.log('ok', out, fs.statSync(out).size);
