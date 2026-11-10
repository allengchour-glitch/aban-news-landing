// Test der reinen Funktionen (patch.mjs). Die CSS-Tests (C25, C39, C42) prüfen den Regeltext und den Snapshot; die Wirkung wurde in einer Browser-Replik der Live-Seiten gemessen (README). Aufruf: node dropship/optik-1011/test.mjs [pfad/zu/liquidjs]
// Mit LiquidJS (zweites Argument oder Umgebungsvariable LIQUIDJS) wird zusätzlich gerendert: jede Gruppe nur auf ihrer Vorlage.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { anwenden, zuruecknehmen, BLOCK, MARKE, GRUPPEN, THEME_DATEI } from './patch.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };
const THEME = '<!doctype html><html><head><title>x</title><style id="lx-editor-vorlage-0911">a{b:c}</style></head><body>{{ content_for_layout }}</body></html>\n';

ok('Block steht vor dem einzigen </head>', () => {
  const neu = anwenden(THEME);
  assert.ok(neu.indexOf(BLOCK) < neu.indexOf('</head>'));
  assert.equal(neu.length, THEME.length + BLOCK.length);
});
ok('Rücknahme stellt das Original byte-gleich her', () => assert.equal(zuruecknehmen(anwenden(THEME)), THEME));
ok('zweites Einspielen wird abgelehnt', () => assert.throws(() => anwenden(anwenden(THEME)), /schon eingespielt/));
ok('auch ein teilweise vorhandener Block (eine Gruppe) gilt als eingespielt', () => assert.throws(() => anwenden(THEME.replace('</head>', `<style id="${MARKE}-start"></style></head>`)), /schon eingespielt/));
ok('ohne </head> wird abgelehnt', () => assert.throws(() => anwenden('<html><body></body></html>'), /Anker/));
ok('zwei </head> werden abgelehnt', () => assert.throws(() => anwenden(THEME + THEME), /Anker/));
ok('leerer oder nicht lesbarer Text wird abgelehnt', () => { assert.throws(() => anwenden(''), /leer/); assert.throws(() => anwenden(null), /leer/); });
ok('Rücknahme ohne Block wird abgelehnt', () => assert.throws(() => zuruecknehmen(THEME), /0-mal/));
ok('Rücknahme mit doppeltem Block wird abgelehnt', () => assert.throws(() => zuruecknehmen(THEME.replace('</head>', BLOCK + BLOCK + '</head>')), /2-mal/));
ok('Rücknahme entfernt auch nach fremder Änderung am Rest nur den Block', () => {
  const fremd = anwenden(THEME).replace('<title>x</title>', '<title>y</title>');
  assert.equal(zuruecknehmen(fremd), THEME.replace('<title>x</title>', '<title>y</title>'));
});
ok('jede Gruppe hat eigene Kennung, Kommentar und Regeln', () => {
  const ids = GRUPPEN.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of GRUPPEN) { assert.ok(g.kommentar.length > 20, g.id); assert.ok(g.css.length > 20, g.id); }
});
ok('Klammern der CSS-Regeln sind ausgeglichen', () => {
  for (const g of GRUPPEN) assert.equal((g.css.match(/\{/g) || []).length, (g.css.match(/\}/g) || []).length, g.id);
});
ok('Liquid-Klammern sind ausgeglichen (if/endif)', () => {
  assert.equal((BLOCK.match(/\{%-?\s*if /g) || []).length, (BLOCK.match(/\{%-?\s*endif\s*-?%\}/g) || []).length);
  assert.equal((BLOCK.match(/\{%-?\s*comment\s*-?%\}/g) || []).length, (BLOCK.match(/\{%-?\s*endcomment\s*-?%\}/g) || []).length);
});
ok('keine Regel trifft ein nacktes Element (img, a, h1, body …) ohne Eltern- oder Klassenbezug', () => {
  for (const g of GRUPPEN) for (const sel of g.css.split('{').slice(0, -1).map((s) => s.split('}').pop().trim()).filter((s) => s && !s.startsWith('@'))) {
    for (const einzel of sel.split(',')) assert.ok(/[.#\[:]|product-card|media-gallery|rte-formatter|\sul\b/.test(einzel.trim()), `${g.id}: «${einzel.trim()}» ist zu breit`);
  }
});
ok('C39 (Regeltext): trifft nur die Zwei-Spalten-Galerie ohne grosses erstes Bild, nie ein einzelnes Bild, nicht den Schnellkauf, und rechnet mit dem Galerie-Abstand', () => {
  const css = GRUPPEN.find((g) => g.id === 'produkt').css;
  assert.ok(css.includes('media-gallery.media-gallery--grid.media-gallery--two-column:not(.media-gallery--large-first-image):not(.quick-add-modal__content *) .media-gallery__grid>li:last-child:nth-child(odd):not(:first-child){grid-column:1/-1;justify-self:center;width:calc((100% - var(--image-gap,4px))/2)}'));
});
ok('C41 (weisser Kachelhintergrund am Desktop) ist NICHT im Block (Besitzervorgabe: keine weissen Hintergründe); C42 (Regeltext) schon', () => {
  const css = GRUPPEN.find((g) => g.id === 'produkt').css;
  assert.ok(!/background-color:#fff/.test(css));
  assert.ok(css.includes('media-gallery .media-fit-contain :is(img,.deferred-media__poster-image){background-color:transparent}'));
});
ok('C25 (Regeltext, Wirkung ist in der Browser-Replik gemessen): Reiter mit höherer Spezifität als das Inline-Style des Templates, Unterfilter-Pillen dabei, «Alle N»-Liste nicht', () => {
  const css = GRUPPEN.find((g) => g.id === 'kollektion').css;
  assert.ok(css.includes('.lx-tabs .lx-tabs__zeile a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px}'));
  assert.ok(css.includes('.lx-uf a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px}'));
  assert.ok(css.includes('.lx-tabs summary{min-height:44px;box-sizing:border-box}'));
  assert.ok(!/(^|[{}])\.lx-tabs a\{/.test(css) && !css.includes('lx-tabs__alle'));
});
ok('Medienabfragen: Tippflächen nur bis 749 px, Spaltenwahl nur ab 750 px', () => {
  const css = GRUPPEN.find((g) => g.id === 'kollektion').css;
  assert.match(css, /@media\(max-width:749px\)\{\.facets-toggle__button\{min-height:44px\}/);
  assert.match(css, /@media\(min-width:750px\)\{\.column-options\{gap:8px\}/);
});
ok('Seiten-Gruppen nennen ihre Seite beim Handle', () => {
  assert.match(GRUPPEN.find((g) => g.id === 'ueber-uns').bedingung, /page\.handle == 'ueber-uns'/);
  assert.match(GRUPPEN.find((g) => g.id === 'rueckgabe').bedingung, /page\.handle == 'rueckgabe'/);
  assert.match(GRUPPEN.find((g) => g.id === 'fehler404').bedingung, /template\.name == '404'/);
});


ok('Ziel und Marke sind festgelegt (apply.mjs und die Seitenprüfung hängen daran)', () => {
  assert.equal(THEME_DATEI, 'layout/theme.liquid');
  assert.equal(MARKE, 'lx-optik-1011');
  for (const id of ['alle', 'start', 'produkt']) assert.ok(GRUPPEN.some((g) => g.id === id), id);
});
ok('Kommentare und Blöcke enthalten nichts, was CSS oder Liquid sprengt (*/, /*, </, {, }, {{, {%)', () => {
  for (const g of GRUPPEN) for (const verboten of ['*/', '/*', '</', '{', '}', '{{', '{%']) assert.ok(!g.kommentar.includes(verboten), `${g.id}: Kommentar enthält ${verboten}`);
  assert.equal((BLOCK.match(/\{\{/g) || []).length, 0, 'kein {{ im Block');
  assert.equal((BLOCK.match(/<\/style>/g) || []).length, GRUPPEN.length, 'je Gruppe genau ein </style>');
  assert.equal((BLOCK.match(/<style id=/g) || []).length, GRUPPEN.length);
  assert.ok(!BLOCK.includes('</head>'));
  assert.equal((BLOCK.match(/\/\*/g) || []).length, GRUPPEN.length, 'je Gruppe genau ein /*');
  assert.equal((BLOCK.match(/\*\//g) || []).length, GRUPPEN.length, 'je Gruppe genau ein */');
});
ok('Einfügeort: genau vor dem einzigen </head>, <header> im Body und ältere Blöcke stören nicht', () => {
  const F = '<!doctype html><html><head><meta charset="utf-8"><style id="lx-optik-0411">a{b:c}</style><style id="lx-optik-0411-b">a{b:c}</style><style id="lx-optik-0411-c">a{b:c}</style><style id="lx-optik-0411-c-etikett">a{b:c}</style></head><body><header>Kopf</header>{{ content_for_layout }}</body></html>\n';
  assert.equal(anwenden(F), F.replace('</head>', () => BLOCK + '</head>'));
  assert.equal(zuruecknehmen(anwenden(F)), F);
});
ok('Marken-Kollision: die vier Blöcke von 0411 gelten NICHT als «schon eingespielt»', () => {
  assert.doesNotThrow(() => anwenden('<head><style id="lx-optik-0411-c-etikett"></style></head>'));
});
ok('Snapshot der Regeln (Änderungsmelder): wer eine Regel ändert, misst sie vorher/nachher am Live-Stand und trägt die neue Summe ein', () => {
  const summe = createHash('sha256').update(JSON.stringify(GRUPPEN.map((g) => [g.id, g.bedingung, g.css]))).digest('hex');
  assert.equal(summe, '42dccf17406a57e9fa640d93f70a184065445d2ec2eda29a723a10b993d7f5ea');
});

const lq = process.argv[2] || process.env.LIQUIDJS;
if (lq) {
  const { Liquid } = createRequire(import.meta.url)(lq);
  const engine = new Liquid();
  const render = (ctx) => engine.parseAndRenderSync(anwenden(THEME), { content_for_layout: 'INHALT', ...ctx });
  const ids = (h) => GRUPPEN.map((g) => g.id).filter((i) => h.includes(`id="${MARKE}-${i}"`)).sort();
  const faelle = [
    [{ template: { name: 'index' } }, ['alle', 'start']],
    [{ template: { name: 'collection' } }, ['alle', 'kollektion']],
    [{ template: { name: 'product' } }, ['alle', 'produkt']],
    [{ template: { name: 'cart' } }, ['alle', 'warenkorb']],
    [{ template: { name: 'page' }, page: { handle: 'ueber-uns' } }, ['alle', 'ueber-uns']],
    [{ template: { name: 'page' }, page: { handle: 'rueckgabe' } }, ['alle', 'rueckgabe']],
    [{ template: { name: 'page' }, page: { handle: 'impressum' } }, ['alle']],
    [{ template: { name: '404' } }, ['alle', 'fehler404']],
    [{ template: { name: 'article' } }, ['alle']],
    [{ template: { name: 'search' } }, ['alle']],
  ];
  for (const [ctx, soll] of faelle) ok(`LiquidJS: ${ctx.template.name}${ctx.page ? ' ' + ctx.page.handle : ''} trägt genau ${soll.join('+')}`, () => assert.deepEqual(ids(render(ctx)), [...soll].sort()));
  ok('LiquidJS: der übrige Seitentext bleibt gleich', () => assert.equal(render({ template: { name: 'index' } }).replace(/<style id="lx-optik-1011[\s\S]*?<\/style>/g, '').replace(/\s+/g, ''), engine.parseAndRenderSync(THEME, { template: { name: 'index' }, content_for_layout: 'INHALT' }).replace(/\s+/g, '')));
} else {
  console.error('FEHLER: LiquidJS nicht angegeben (zweites Argument oder LIQUIDJS): die Render-Prüfungen fehlen. Mit LIQUIDJS_OPTIONAL=1 bewusst überspringen.');
  if (process.env.LIQUIDJS_OPTIONAL !== '1') process.exitCode = 1;
}
console.log(n + ' Prüfungen bestanden' + (process.exitCode ? ', ABER mit Fehlern' : ''));
