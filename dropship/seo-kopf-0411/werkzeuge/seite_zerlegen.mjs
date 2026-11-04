// Nur lesend: Zusammensetzung der ganzen Seite nach Shopify-Abschnitten und die grössten Skript-/JSON-Blöcke.
import { readFileSync } from 'node:fs';
const h = readFileSync(process.argv[2], 'utf8');
const B = (s) => Buffer.byteLength(s, 'utf8');
const teile = h.split(/(?=<div id="shopify-section-|<section id="shopify-section-|<footer|<\/main>|<main)/);
let off = 0;
for (const t of teile) {
  const id = (t.match(/id="(shopify-section-[^"]+)"/) || [])[1] || (t.startsWith('<footer') ? 'footer' : t.startsWith('<main') ? '<main>' : t.startsWith('</main') ? '</main>…' : '(Kopf/Dazwischen)');
  const b = B(t);
  if (b > 15000) console.log(String(off).padStart(8), String(b).padStart(8), id.replace('shopify-section-', '').slice(0, 90));
  off += b;
}
console.log('--- grösste script-Blöcke ---');
const sc = [...h.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ a: m[1].trim().slice(0, 80), b: B(m[2]) })).sort((x, y) => y.b - x.b).slice(0, 8);
for (const s of sc) console.log(String(s.b).padStart(8), s.a);
console.log('--- grösste style-Blöcke ---');
const st = [...h.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)].map((m) => ({ a: m[1].trim().slice(0, 60), b: B(m[2]) })).sort((x, y) => y.b - x.b).slice(0, 6);
for (const s of st) console.log(String(s.b).padStart(8), s.a);
console.log('--- erste Produktkarte (gekürzt 2500 Zeichen) ---');
const c = h.match(/<li[^>]*product-grid__item[\s\S]*?<\/li>/);
if (c) { console.log(B(c[0]), 'Byte'); console.log(c[0].replace(/\s+/g, ' ').slice(0, 2500)); }
