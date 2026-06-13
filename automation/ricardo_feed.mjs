#!/usr/bin/env node
/* LuxeStyle — ricardo_feed.mjs  (Produkt-FEED für Ricardo erzeugen — KEINE Zugangsdaten nötig)
 *
 * Erzeugt eine saubere Feed-Datei (CSV) aus dem ÖFFENTLICHEN Shop (luxestyle.ch/products.json).
 * Ricardo richtet den Feed-Import MANUELL ein (Feed-URL an accountmanagement@ricardo.ch senden).
 * Dieses Skript POSTET NICHTS und braucht KEINE Logins/Keys — es bereitet nur die Daten auf.
 * Nur aktive/online-sichtbare Produkte sind enthalten (archivierte/China-Artikel fehlen automatisch).
 *
 * Lauf:  node automation/ricardo_feed.mjs            → schreibt ricardo_feed.csv
 *        node automation/ricardo_feed.mjs --limit 200
 * Hosten: Datei committen → roher GitHub-URL ODER Shopify-Files/eigener Webspace; URL an Ricardo geben.
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const LIMIT = Number((args[args.indexOf('--limit') + 1]) || 0); // 0 = alle
const OUT = 'ricardo_feed.csv';

function csv(v) { v = (v == null ? '' : String(v)).replace(/"/g, '""'); return `"${v}"`; }

(async () => {
  const rows = [];
  for (let page = 1; page < 40; page++) {
    const d = await (await fetch(`https://luxestyle.ch/products.json?limit=250&page=${page}`)).json();
    const ps = d.products || []; if (!ps.length) break;
    for (const p of ps) {
      const v = (p.variants || [])[0] || {};
      const img = (p.images || [])[0]?.src || '';
      if (!img || !v.price) continue;
      rows.push({
        id: p.id,
        sku: v.sku || p.id,
        title: p.title,
        description: (p.body_html || p.title).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        brand: p.vendor || 'LuxeStyle',
        price: v.price,
        currency: 'CHF',
        condition: 'new',
        availability: 'in stock',
        product_type: p.product_type || '',
        image: img,
        link: `https://luxestyle.ch/products/${p.handle}`,
      });
    }
    if (LIMIT && rows.length >= LIMIT) break;
  }
  const data = LIMIT ? rows.slice(0, LIMIT) : rows;
  const head = ['id', 'sku', 'title', 'description', 'brand', 'price', 'currency', 'condition', 'availability', 'product_type', 'image', 'link'];
  const out = [head.join(',')].concat(data.map(r => head.map(h => csv(r[h])).join(','))).join('\n');
  fs.writeFileSync(OUT, out);
  console.error(`Feed geschrieben: ${OUT} — ${data.length} Produkte (nur aktive). URL an accountmanagement@ricardo.ch senden.`);
})().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
