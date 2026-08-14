#!/usr/bin/env node
/* 📝 shop_seo_guides.mjs — Programmatic-SEO: Ratgeber-Seite(n) aus dem Katalog
 *
 * Baut aus automation/good_products.csv eine SEO-Ratgeber-Seite (z. B. „Sommer-Favoriten"),
 * die die Produkte verlinkt → organischer Such-Traffic mit Kaufabsicht. Anti-Hype-Stil,
 * ItemList-JSON-LD. Reines Node, kein API, no-op-safe.
 * Output: automation/autopilot/guides/*.html  (auf GitHub Pages / Shop-Blog veröffentlichbar)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const GOOD = path.join(ROOT, 'automation', 'good_products.csv');
const DIR = path.join(ROOT, 'automation', 'autopilot', 'guides');
const STORE = 'https://luxestyle.ch';

let rows = [];
try { rows = fs.readFileSync(GOOD, 'utf8').trim().split('\n').slice(1); } catch { console.log('good_products.csv fehlt → No-Op.'); process.exit(0); }
// good_products.csv = name,image_url,label  → Spalte 0 (name) IST der Produkt-Handle.
const products = rows.map(r => { const c = r.split(','); return { handle: (c[0] || '').trim(), label: (c[2] || '').trim() }; }).filter(p => p.label && p.handle);
if (!products.length) { console.log('Keine Produkte mit Handle → No-Op.'); process.exit(0); }
fs.mkdirSync(DIR, { recursive: true });

const esc = s => String(s || '').replace(/[<>&"]/g, m => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]));
const today = new Date().toISOString().slice(0, 10);
const title = 'Sommer-Favoriten 2026 — die meistgewählten Stücke bei LuxeStyle';
const intro = 'Eine kuratierte Auswahl unserer beliebtesten Sommer-Teile — Schweizer Online-Shop, faire Preise, Gratis-Versand ab CHF 50. Mit Code WELCOME10 gibt es 10 % auf die erste Bestellung.';

const list = products.map((p, i) => {
  const url = `${STORE}/products/${p.handle}`;
  return `    <li class="g-item">
      <a href="${esc(url)}"><strong>${i + 1}. ${esc(p.label)}</strong></a>
      <p>Jetzt ansehen im Shop — –10 % mit Code <code>WELCOME10</code>.</p>
    </li>`;
}).join('\n');

const jsonld = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'ItemList', name: title,
  itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.label, url: `${STORE}/products/${p.handle}` })),
});

const html = `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(intro.slice(0, 155))}">
<link rel="canonical" href="${STORE}/pages/sommer-favoriten-2026">
<script type="application/ld+json">${jsonld}</script>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1c1c1e}.g-item{margin:.8rem 0}a{color:#b45309}code{background:#f5f0e8;padding:.1rem .3rem;border-radius:4px}</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(intro)}</p>
<ol style="list-style:none;padding:0">
${list}
</ol>
<p><a href="${STORE}/collections/sommer">→ Alle Sommer-Artikel im Shop ansehen</a></p>
<p style="color:#666;font-size:.9rem">Stand: ${today} · LuxeStyle CH · auto-generiert aus den Shop-Favoriten.</p>
</body>
</html>`;
const out = path.join(DIR, 'sommer-favoriten-2026.html');
fs.writeFileSync(out, html);
console.log(`✅ ${path.relative(ROOT, out)}: SEO-Ratgeber mit ${products.length} Produkten (ItemList-JSON-LD). Auf Shop-Blog/Pages veröffentlichbar.`);
