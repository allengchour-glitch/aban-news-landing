import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { aendereLayout, aendereCollection, NOINDEX_BLOCK, FAQ_ALT, FAQ_NEU } from './apply_theme.mjs';
let n = 0; const ok = (b, m) => { assert.ok(b, m); n++; };
// Layout
const l = aendereLayout('<html><head>\n<title>x</title>\n</head><body></body></html>');
ok(l.geaendert && l.text.includes('lx-audit-0711') && l.text.indexOf('lx-audit-0711') < l.text.indexOf('</head>'), 'Block vor </head>');
ok(aendereLayout(l.text).geaendert === false, 'idempotent');
assert.throws(() => aendereLayout('<html><body></body></html>'), /erwartet 1/); n++;
assert.throws(() => aendereLayout('</head></head>'), /erwartet 1/); n++;
// Collection
const c = aendereCollection('a ' + FAQ_ALT + ' b');
ok(c.geaendert && c.text === 'a ' + FAQ_NEU + ' b' && !c.text.includes('Alles rund um'), 'FAQ ersetzt');
ok(aendereCollection(c.text).geaendert === false, 'FAQ idempotent');
assert.throws(() => aendereCollection('nichts'), /nicht gefunden/); n++;
assert.throws(() => aendereCollection(FAQ_ALT + FAQ_ALT), /mehrfach/); n++;
// Liquid-Verhalten (LiquidJS, falls vorhanden: LIQUIDJS=<Pfad zu node_modules/liquidjs>)
let Liquid = null;
try { if (process.env.LIQUIDJS) ({ Liquid } = createRequire(import.meta.url)(process.env.LIQUIDJS)); } catch (e) { console.log('LiquidJS nicht ladbar:', e.message); Liquid = null; }
if (Liquid) {
  const eng = new Liquid();
  const render = (primary, tpl) => eng.parseAndRenderSync(NOINDEX_BLOCK, { request: { locale: { primary } }, template: { name: tpl } });
  for (const t of ['product', 'collection', 'article', 'blog']) ok(render(false, t).includes('noindex'), `fr ${t} noindex`);
  for (const t of ['index', 'page', 'cart', 'search', 'list-collections']) ok(!render(false, t).includes('noindex'), `fr ${t} ohne noindex`);
  for (const t of ['product', 'collection', 'article', 'blog', 'index']) ok(!render(true, t).includes('noindex'), `de ${t} ohne noindex`);
} else console.log('LiquidJS fehlt (LIQUIDJS setzen), Liquid-Fälle übersprungen');
console.log(`audit-0711 apply_theme_test: ${n} Prüfungen bestanden`);
