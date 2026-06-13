#!/usr/bin/env node
/* Regeneriert cloudflare/src/products.js aus automation/good_products.csv.
 * Lauf: node cloudflare/sync-products.mjs   (danach `wrangler deploy` im cloudflare/-Ordner). */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const csv = path.join(ROOT, 'automation', 'good_products.csv');
const out = path.join(ROOT, 'cloudflare', 'src', 'products.js');
const lines = fs.readFileSync(csv, 'utf8').split('\n').filter(Boolean).slice(1);
const arr = lines.map(l => { const [name, image_url, label] = l.split(','); return { name:(name||'').trim(), image_url:(image_url||'').trim(), label:(label||'').trim() }; })
                 .filter(p => p.name && p.image_url);
fs.writeFileSync(out,
  '// Auto-generiert aus automation/good_products.csv — kuratierte Top-Produkte für die Veredelungs-Pipeline.\n' +
  '// Aktualisieren: good_products.csv pflegen, dann `node cloudflare/sync-products.mjs` neu laufen lassen.\n' +
  'export const PRODUCTS = ' + JSON.stringify(arr, null, 2) + ';\n');
console.log(`wrote ${arr.length} products → cloudflare/src/products.js`);
