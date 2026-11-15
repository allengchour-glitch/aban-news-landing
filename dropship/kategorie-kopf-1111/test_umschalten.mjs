// Offline-Test der Umschalt-Logik (umschalten_lib.mjs). Aufruf: /opt/node22/bin/node test_umschalten.mjs
import { readFileSync } from 'node:fs';
const W = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const L = await import(process.env.LXU_LIB || W + 'umschalten_lib.mjs');
let ok = 0, fehl = 0;
const pruef = (n, b, i = '') => { if (b) ok++; else { fehl++; console.log('FEHLER', n, i); } };
const wirft = f => { try { f(); return false; } catch { return true; } };
const BASE = readFileSync(W + 'theme/sections/main-collection.liquid', 'utf8');
const KOPIE = readFileSync(process.env.LXU_KOPIE || W + 'neu/sections/lx-main-collection-kompakt.liquid', 'utf8').split('\n').slice(1).join('\n');
const THEME = readFileSync(W + 'k2/live/layout__theme.liquid', 'utf8');
const COLL = readFileSync(W + 'theme/templates/collection.json', 'utf8');
const LXKOPF = readFileSync(W + 'neu/templates/collection.lxkopf.json', 'utf8');

// main-collection.liquid
pruef('U1 Basis-md5 stimmt', L.md5(BASE) === L.MAIN_BASIS_MD5);
const gepatcht = L.mainPatchen(BASE);
pruef('U2 Patch = getestete Kopie ohne Kopfkommentar (Byte fuer Byte)', gepatcht === KOPIE);
pruef('U3 Entpatchen ergibt wieder die Basis', L.mainEntpatchen(gepatcht) === BASE);
pruef('U4 doppelt patchen wirft', wirft(() => L.mainPatchen(gepatcht)));
pruef('U5 fehlende Stelle wirft', wirft(() => L.mainPatchen(BASE.replace("closest.product: product %}\n            {% # theme-check-enable %}", 'x'))));
pruef('U6 Entpatchen ohne eigenen Block wirft', wirft(() => L.mainEntpatchen(BASE)));
pruef('U7 Kein Typwechsel mehr: Patch rendert weiter lx-verdichten in main-collection', gepatcht.includes("render 'lx-verdichten'") && !gepatcht.includes('lx-main-collection-kompakt'));
// Ruecknahme main mit fremder Aenderung
const fremdM = gepatcht.replace('{% endschema %}', '{% endschema %}\n{%- comment -%}fremd{%- endcomment -%}');
let p = L.ruecknahmePlan(gepatcht, BASE, L.mainEntpatchen, false);
pruef('U8 Ruecknahme main sauber', p.ok && p.schreiben === BASE && !p.fremd);
p = L.ruecknahmePlan(fremdM, BASE, L.mainEntpatchen, false);
pruef('U9 Ruecknahme main bei fremder Aenderung: Abbruch', !p.ok);
p = L.ruecknahmePlan(fremdM, BASE, L.mainEntpatchen, true);
pruef('U10 FREMD: nur eigener Block raus, fremde Aenderung bleibt (nie ganze Sicherung)', p.ok && p.fremd && p.schreiben.includes('fremd') && !p.schreiben.includes('capture lx_karte -%}') && p.schreiben !== BASE);
p = L.ruecknahmePlan(BASE, BASE, L.mainEntpatchen, true);
pruef('U11 eigener Block fehlt: auch mit FREMD Abbruch', !p.ok);

// theme.liquid
pruef('U12 theme.liquid hat </head> genau einmal (Live-Stand 12.11.)', THEME.split('</head>').length === 2);
const mitZeile = L.ankEinfuegen(THEME);
pruef('U13 Einfuegen: genau eine Zeile vor </head>', mitZeile.length === THEME.length + L.ANK_ZEILE.length && mitZeile.includes(L.ANK_ZEILE + '</head>'));
pruef('U14 Entfernen ergibt Original', L.ankEntfernen(mitZeile) === THEME);
pruef('U15 doppelt einfuegen wirft', wirft(() => L.ankEinfuegen(mitZeile)));
const spaeter = mitZeile.replace('<body', '<!-- Hero-Video v2 -->\n<body');
p = L.ruecknahmePlan(spaeter, THEME, L.ankEntfernen, false);
pruef('U16 theme.liquid spaeter fremd geaendert: Abbruch statt ganze Sicherung', !p.ok);
p = L.ruecknahmePlan(spaeter, THEME, L.ankEntfernen, true);
pruef('U17 FREMD: nur die eine Zeile raus, Hero-Aenderung bleibt', p.ok && p.schreiben === spaeter.replace(L.ANK_ZEILE, '') && p.schreiben.includes('Hero-Video v2'));
p = L.ruecknahmePlan(mitZeile, THEME, L.ankEntfernen, false);
pruef('U18 theme.liquid sauber zurueck', p.ok && p.schreiben === THEME);
const zweimal = L.ANK_ZEILE + mitZeile;
pruef('U18b nur die Zeile direkt vor </head> wird entfernt', L.ankEntfernen(zweimal) === L.ANK_ZEILE + THEME);

// collection.json
const vor = L.jsonAus(COLL);
const neu = L.umbauen(vor);
pruef('U19 main bleibt main-collection', neu.sections.main.type === 'main-collection' && JSON.stringify(neu.sections.main) === JSON.stringify(vor.sections.main));
pruef('U20 drei Snippets, usp weg, Reihenfolge', neu.sections.lux_hero.settings.custom_liquid === "{% render 'lx-kopf-kompakt' %}" && neu.sections.lux_subchips.settings.custom_liquid === "{% render 'lx-kopf-chips' %}" && neu.sections.lux_breadcrumb.settings.custom_liquid === "{% render 'lx-kopf-pfad' %}" && !neu.sections.lux_usp_coll && neu.order.join() === 'lux_breadcrumb,lux_hero,lux_subchips,luxe_review_assets,main,lux_faq');
const lx = L.jsonAus(LXKOPF); const lxOhneTyp = structuredClone(lx); lxOhneTyp.sections.main.type = 'main-collection';
pruef('U21 Testvorlage = Umschalt-Ergebnis bis auf main.type (Kopie)', JSON.stringify(lxOhneTyp) === JSON.stringify(neu) && lx.sections.main.type === 'lx-main-collection-kompakt');
pruef('U22 zurueckbauen(umbauen(x)) = x', JSON.stringify(L.zurueckbauen(neu, vor)) === JSON.stringify(vor));
const neuFremd = structuredClone(neu); neuFremd.sections.lux_faq.settings.custom_liquid += '<!-- fremd -->';
const zb = L.zurueckbauen(neuFremd, vor);
pruef('U23 zurueckbauen behaelt fremde Aenderung, setzt eigene Teile zurueck', zb.sections.lux_faq.settings.custom_liquid.endsWith('<!-- fremd -->') && zb.order.join() === vor.order.join() && JSON.stringify(zb.sections.lux_usp_coll) === JSON.stringify(vor.sections.lux_usp_coll) && zb.sections.lux_hero.settings.custom_liquid === vor.sections.lux_hero.settings.custom_liquid);
pruef('U24 Basis-md5 collection.json stimmt', L.md5(COLL) === L.COLLECTION_BASIS_MD5);

// Snippet-md5 im Werkzeug = lokale gepruefte Dateien
for (const [f, m] of Object.entries(L.SNIPPET_MD5)) pruef('U25 md5 festgehalten ' + f, L.md5(readFileSync(W + 'neu/' + f, 'utf8')) === m);
pruef('U26 vier Snippets festgehalten', Object.keys(L.SNIPPET_MD5).length === 4);
// Eager-Block funktional (Korrektur 15.11.): KARTE_NEU mit LiquidJS, content_for durch eine Attrappe mit zwei Galeriebildern ersetzt
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { Liquid } = require('/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/editor_theme/lj/node_modules/liquidjs/dist/liquid.node.cjs.js');
  const eng = new Liquid();
  const CF = "{% content_for 'block', type: '_product-card', id: 'product-card', closest.product: product %}";
  pruef('U27a Attrappe greift (content_for genau einmal im Block)', L.KARTE_NEU.split(CF).length === 2);
  const tpl = '{% for product in produkte %}' + L.KARTE_NEU.replace(CF, '{{ karte }}').replace(/\{% # theme-check-enable %\}/g, '') + '\n§{% endfor %}';
  const IMG = '<img loading="lazy" sizes="auto, 50vw" fetchpriority="auto" src="1"><img loading="lazy" sizes="auto, 50vw" fetchpriority="auto" src="2">';
  const ren = async (seite, karte) => (await eng.parseAndRender(tpl, { produkte: [1, 2, 3, 4, 5, 6], paginate: { current_page: seite }, karte })).split('§').slice(0, 6).map(x => x.trim());
  const k1 = await ren(1, IMG);
  const erstes = k => k.slice(0, k.indexOf('src="1"')), zweites = k => k.slice(k.indexOf('src="1"'));
  pruef('U27b Seite 1: Karten 1-2 eager + high, sizes ohne auto', [0, 1].every(i => erstes(k1[i]) === '<img loading="eager" sizes="50vw" fetchpriority="high" '), k1[0]);
  pruef('U27c Seite 1: Karten 3-4 eager, fetchpriority auto', [2, 3].every(i => erstes(k1[i]) === '<img loading="eager" sizes="50vw" fetchpriority="auto" '), k1[2]);
  pruef('U27d Seite 1: ab Karte 5 unveraendert lazy', [4, 5].every(i => k1[i] === IMG), k1[4]);
  pruef('U27e zweites Bild jeder Karte unveraendert', k1.every(k => zweites(k) === zweites(IMG)), k1[0]);
  const k2 = await ren(2, IMG);
  pruef('U27f Seite 2: alles lazy, nichts high', k2.every(k => k === IMG), k2[0]);
  const k3 = await ren(2, IMG.replace('loading="lazy"', 'loading="eager"'));
  pruef('U27g Seite 2: eager aus der Karte wird lazy', k3.every(k => k === IMG), k3[0]);
}
console.log(`ok ${ok}, Fehler ${fehl}`);
process.exit(fehl ? 1 : 0);
