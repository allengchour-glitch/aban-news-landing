#!/usr/bin/env node
/*
 * Bild-Check: Gemini schaut das Titelbild der meistgesehenen Produkte an und meldet
 * Lieferanten-Reste (Fremdtext, Wasserzeichen, Collagen, fremde Logos, verpixelte Gesichter).
 * Liest den Shop tokenlos (Storefront API), ändert nichts. Ergebnis: bild-check.md + bild-check.json.
 * Aufruf: GEMINI_API_KEY=… node tools/image_audit.mjs [pro-kollektion=24]
 */
import fs from 'node:fs';

const KEY = process.env.GEMINI_API_KEY || '';
if (!KEY) { console.error('GEMINI_API_KEY fehlt.'); process.exit(1); }
const PER = Number(process.argv[2] || 24);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SHOP = 'https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json';
// Was die App zeigt: Startseiten-Reihen und die wichtigsten Kategorien
const COLLECTIONS = [
  'damen-mode', 'sub-kleider', 'jacken-outdoor', 'schmuck-uhren', 'sub-halsketten', 'sub-armbaender',
  'sub-taschen', 'schuhe', 'damen-strick-pullover', 'bestseller', 'premium-geschenke', 'beauty-pflege',
];

async function gql(query) {
  const r = await fetch(SHOP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  return (await r.json()).data;
}

const products = new Map();
for (const h of COLLECTIONS) {
  const d = await gql(`{ collection(handle: "${h}") { products(first: ${PER}, sortKey: BEST_SELLING) { nodes {
    handle title onlineStoreUrl featuredImage { url } images(first: 8) { nodes { url } } } } } }`);
  for (const p of d?.collection?.products?.nodes ?? []) {
    if (!p.featuredImage || products.has(p.handle)) continue;
    products.set(p.handle, { ...p, collection: h, images: p.images.nodes.map((i) => i.url) });
  }
}
console.error(`${products.size} Produkte`);

const prompt = `Du prüfst Produktbilder für einen hochwertigen Schweizer Mode-Shop.
Für jedes Bild: ist es als ERSTES Bild (Titelbild) geeignet?
Nicht geeignet, wenn: eingebrannter Text oder Werbetext (auch chinesisch/englisch, z. B. "OOTD", "DESIGNED BY", Grössentabellen),
Wasserzeichen oder fremde Logos/Marken, Collage aus mehreren Fotos, verpixeltes/abgedecktes Gesicht,
Handy-Spiegel-Selfie in schlechter Qualität, sehr unscharf, falsches/anderes Produkt sichtbar im Vordergrund.
Antworte NUR mit JSON-Array, ein Eintrag pro Bild in derselben Reihenfolge:
[{"i":0,"ok":true|false,"probleme":["text"|"wasserzeichen"|"logo"|"collage"|"gesicht"|"selfie"|"unscharf"|"anderes"],"notiz":"max 8 Wörter, Deutsch"}]`;

async function judge(batch) {
  const parts = [{ text: prompt }];
  for (const [i, p] of batch.entries()) {
    const img = await fetch(`${p.featuredImage.url}${p.featuredImage.url.includes('?') ? '&' : '?'}width=512`);
    parts.push({ text: `Bild ${i}` });
    parts.push({ inline_data: { mime_type: img.headers.get('content-type') || 'image/jpeg', data: Buffer.from(await img.arrayBuffer()).toString('base64') } });
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
    });
    const j = await r.json().catch(() => ({}));
    const text = j?.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') || '';
    try { return JSON.parse(text); } catch { await new Promise((s) => setTimeout(s, 3000 * (attempt + 1))); }
  }
  return batch.map((_, i) => ({ i, ok: null, probleme: [], notiz: 'keine Antwort' }));
}

const list = [...products.values()];
const results = [];
for (let k = 0; k < list.length; k += 8) {
  const batch = list.slice(k, k + 8);
  const verdicts = await judge(batch);
  batch.forEach((p, i) => {
    const v = verdicts.find((x) => x.i === i) || {};
    results.push({ handle: p.handle, title: p.title, collection: p.collection, url: p.onlineStoreUrl, image: p.featuredImage.url, images: p.images.length, ok: v.ok, probleme: v.probleme || [], notiz: v.notiz || '' });
  });
  console.error(`${Math.min(k + 8, list.length)}/${list.length}`);
}

const bad = results.filter((r) => r.ok === false);
fs.writeFileSync(process.env.OUT_JSON || 'bild-check.json', JSON.stringify(results, null, 1));
const md = [`# Bild-Check Titelbilder (${new Date().toISOString().slice(0, 10)}, ${MODEL})`, '',
  `${results.length} Produkte geprüft, **${bad.length} mit ungeeignetem Titelbild**.`, '',
  '| Produkt | Kollektion | Problem | Notiz |', '|---|---|---|---|',
  ...bad.map((r) => `| [${r.title.replace(/\|/g, '/')}](${r.url || `https://luxestyle.ch/products/${r.handle}`}) | ${r.collection} | ${r.probleme.join(', ')} | ${r.notiz} |`)].join('\n');
fs.writeFileSync(process.env.OUT_FILE || 'bild-check.md', md + '\n');
console.log(`${bad.length}/${results.length} ungeeignet`);
