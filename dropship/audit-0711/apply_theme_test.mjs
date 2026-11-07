import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  aendereLayout,
  aendereCollection,
  LEGACY_NOINDEX_BLOCK,
  NOINDEX_BLOCK,
  NOINDEX_TEMPLATES,
  FAQ_ALT,
  FAQ_NEU,
  sollNoindex,
} from './apply_theme.mjs';
let n = 0; const ok = (b, m) => { assert.ok(b, m); n++; };
// Layout
const l = aendereLayout('<html><head>\n<title>x</title>\n</head><body></body></html>');
ok(l.geaendert && l.text.includes('lx-audit-0711') && l.text.indexOf('lx-audit-0711') < l.text.indexOf('</head>'), 'Block vor </head>');
ok(aendereLayout(l.text).geaendert === false, 'idempotent');
assert.throws(() => aendereLayout('<head><!-- lx-audit-0711-v2: unbekannter Zielstand --></head>'), /Zieltext.*ab/); n++;
assert.throws(() => aendereLayout(`<head>${NOINDEX_BLOCK}${NOINDEX_BLOCK}</head>`), /neuer.*mehrfach/); n++;
const migration = aendereLayout(`<head>${LEGACY_NOINDEX_BLOCK}</head>`);
ok(migration.geaendert && migration.text.includes('lx-audit-0711-v2') && !migration.text.includes('Startseite und Seiten unberührt'), 'alten Live-Block exakt migriert');
assert.throws(() => aendereLayout('<head><!-- lx-audit-0711: unbekannter Altstand --></head>'), /weicht.*ab/); n++;
assert.throws(() => aendereLayout(`<head>${LEGACY_NOINDEX_BLOCK}${LEGACY_NOINDEX_BLOCK}</head>`), /mehrfach/); n++;
assert.throws(() => aendereLayout('<html><body></body></html>'), /erwartet 1/); n++;
assert.throws(() => aendereLayout('</head></head>'), /erwartet 1/); n++;
ok(NOINDEX_TEMPLATES.join(',') === 'product,collection,article,blog,index,page,list-collections', 'begrenzte Vorlagenliste');
for (const t of NOINDEX_TEMPLATES) ok(sollNoindex({ primary: false, isoCode: 'fr', templateName: t }), `fr ${t} noindex`);
for (const t of ['cart', 'search', 'customers/login']) ok(!sollNoindex({ primary: false, isoCode: 'fr', templateName: t }), `fr ${t} nicht ergänzt`);
ok(!sollNoindex({ primary: true, isoCode: 'fr', templateName: 'page' }), 'primäre Sprache bleibt indexierbar');
ok(!sollNoindex({ primary: false, isoCode: 'en', templateName: 'page' }), 'andere Nebensprache bleibt unberührt');
ok(!sollNoindex({ primary: false, isoCode: 'fr-CH', templateName: 'page', frIndexReady: true }), 'belegte FR-Abdeckung hebt Sperre auf');
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
  const render = ({ primary, isoCode, tpl, ready = false }) => eng.parseAndRenderSync(NOINDEX_BLOCK, {
    request: { locale: { primary, iso_code: isoCode } },
    template: { name: tpl },
    shop: { metafields: { luxe: { fr_index_ready: { value: ready } } } },
  });
  for (const t of NOINDEX_TEMPLATES) ok(render({ primary: false, isoCode: 'fr', tpl: t }).includes('noindex'), `Liquid fr ${t} noindex`);
  for (const t of ['cart', 'search']) ok(!render({ primary: false, isoCode: 'fr', tpl: t }).includes('noindex'), `Liquid fr ${t} ohne Zusatz`);
  for (const t of NOINDEX_TEMPLATES) ok(!render({ primary: true, isoCode: 'de', tpl: t }).includes('noindex'), `Liquid de ${t} ohne noindex`);
  ok(!render({ primary: false, isoCode: 'fr', tpl: 'page', ready: true }).includes('noindex'), 'Liquid belegte FR-Abdeckung indexierbar');
} else console.log('LiquidJS fehlt (LIQUIDJS setzen), Liquid-Fälle übersprungen');
console.log(`audit-0711 apply_theme_test: ${n} Prüfungen bestanden`);
