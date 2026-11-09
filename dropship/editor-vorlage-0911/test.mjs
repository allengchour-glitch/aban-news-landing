// Test der reinen Funktionen (patch.mjs). Aufruf: node dropship/editor-vorlage-0911/test.mjs [pfad/zu/liquidjs]
// Mit LiquidJS (zweites Argument oder Umgebungsvariable LIQUIDJS) wird zusätzlich gerendert: Block nur auf Produktseiten.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { anwenden, zuruecknehmen, BLOCK, MARKE, CSS_REGEL } from './patch.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };
const THEME = '<!doctype html><html><head><title>x</title><style id="lx-optik-0411-c">a{b:c}</style></head><body>{{ content_for_layout }}</body></html>\n';

ok('Block steht vor dem einzigen </head>', () => {
  const neu = anwenden(THEME);
  assert.equal(neu.split(`id="${MARKE}"`).length - 1, 1);
  assert.ok(neu.indexOf(BLOCK) < neu.indexOf('</head>'));
  assert.equal(neu.length, THEME.length + BLOCK.length);
});
ok('Rücknahme stellt das Original byte-gleich her', () => assert.equal(zuruecknehmen(anwenden(THEME)), THEME));
ok('zweites Einspielen wird abgelehnt', () => assert.throws(() => anwenden(anwenden(THEME)), /schon eingespielt/));
ok('ohne </head> wird abgelehnt', () => assert.throws(() => anwenden('<html><body></body></html>'), /Anker/));
ok('zwei </head> werden abgelehnt', () => assert.throws(() => anwenden(THEME + THEME), /Anker/));
ok('leerer oder nicht lesbarer Text wird abgelehnt', () => { assert.throws(() => anwenden(''), /leer/); assert.throws(() => anwenden(null), /leer/); });
ok('Rücknahme ohne Block wird abgelehnt', () => assert.throws(() => zuruecknehmen(THEME), /0-mal/));
ok('Rücknahme mit doppeltem Block wird abgelehnt', () => assert.throws(() => zuruecknehmen(THEME.replace('</head>', BLOCK + BLOCK + '</head>')), /2-mal/));
ok('Regel ist auf die Bühne des Editors begrenzt und hebt beide Grenzen auf', () => {
  assert.match(CSS_REGEL, /^\.lsp6-stage img\.lsp6-bg,\.lsp6-stage img\.lsp6-tpl\{/);
  assert.match(CSS_REGEL, /max-width:none!important/);
  assert.match(CSS_REGEL, /max-height:none!important/);
  assert.ok(!/(^|[^.\w-])img\s*\{/.test(CSS_REGEL.replace(/\.lsp6-stage img/g, '')), 'keine nackte img-Regel');
});
ok('Block nennt nur Produktseiten und schliesst Liquid sauber', () => {
  assert.equal((BLOCK.match(/\{%-\s*if /g) || []).length, 1);
  assert.equal((BLOCK.match(/\{%-\s*endif\s*-%\}/g) || []).length, 1);
  assert.match(BLOCK, /template\.name == 'product'/);
});

const lq = process.argv[2] || process.env.LIQUIDJS;
if (lq) {
  const { Liquid } = createRequire(import.meta.url)(lq);
  const engine = new Liquid();
  const render = (name) => engine.parseAndRenderSync(anwenden(THEME), { template: { name }, content_for_layout: 'INHALT' });
  ok('LiquidJS: Produktseite trägt den Block', () => { const h = render('product'); assert.ok(h.includes(CSS_REGEL)); assert.ok(h.includes(`id="${MARKE}"`)); });
  for (const t of ['index', 'collection', 'page', 'cart', 'article']) ok(`LiquidJS: Vorlage ${t} trägt den Block nicht`, () => assert.ok(!render(t).includes(MARKE)));
  ok('LiquidJS: der übrige Seitentext bleibt gleich', () => assert.equal(render('index').replace(/\s+/g, ' '), engine.parseAndRenderSync(THEME, { template: { name: 'index' }, content_for_layout: 'INHALT' }).replace(/\s+/g, ' ')));
} else console.log('(LiquidJS nicht angegeben: Render-Prüfungen übersprungen)');
console.log(n + ' Prüfungen bestanden' + (process.exitCode ? ', ABER mit Fehlern' : ''));
