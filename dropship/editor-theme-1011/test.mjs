// node dropship/editor-theme-1011/test.mjs [pfad/zu/liquidjs]  (ohne Pfad wird das LiquidJS-Rendern übersprungen)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { T1, T2, T3, SCHRITTE, zustand, anwenden, zuruecknehmen, allesAnwenden, allesZurueck } from './patch.mjs';
const hier = path.dirname(fileURLToPath(import.meta.url));
let ok = 0, bad = 0; const T = (n, c, i) => { if (c) ok++; else { bad++; console.log('✗', n, i === undefined ? '' : String(i).slice(0, 200)); } };
const echt = f => { const p = path.join(hier, 'sicherung', f + '.vor'); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
const th = echt('layout__theme.liquid') ?? ('<html><head>\n<meta>\n' + 'x'.repeat(10) + '\n' + T3.alt + '\n</head><body></body></html>');
const bb = echt('blocks__buy-buttons.liquid') ?? ('<div>\n' + T2.alt + '\n</div>');
const texte = { 'layout/theme.liquid': th, 'blocks/buy-buttons.liquid': bb };
T('Ausgangslage alt', SCHRITTE.every(s => zustand(s, texte[s.datei]) === 'alt'), SCHRITTE.map(s => zustand(s, texte[s.datei])));
const neu = allesAnwenden(texte);
T('nach Anwenden neu', SCHRITTE.every(s => zustand(s, neu[s.datei]) === 'neu'));
T('Anwenden ändert nur gewollt: Theme +Block', neu['layout/theme.liquid'].length === th.length + T1.block.length + (T3.neu.length - T3.alt.length));
T('buy-buttons Länge', neu['blocks/buy-buttons.liquid'].length === bb.length + (T2.neu.length - T2.alt.length));
T('Block steht vor </head> und genau einmal', neu['layout/theme.liquid'].split('</head>').length === 2 && neu['layout/theme.liquid'].indexOf(T1.block) < neu['layout/theme.liquid'].indexOf('</head>'));
const zur = allesZurueck(neu);
T('Rücknahme byte-gleich', zur['layout/theme.liquid'] === th && zur['blocks/buy-buttons.liquid'] === bb);
T('Doppeltes Anwenden wirft schon', (() => { try { anwenden(T1, neu['layout/theme.liquid']); } catch (e) { return /^schon/.test(e.message); } })());
T('Rücknahme ohne Einspielen wirft', (() => { try { zuruecknehmen(T3, th); } catch (e) { return /nicht eingespielt/.test(e.message); } })());
T('Anker doppelt: Fehler', (() => { try { anwenden(T3, th + '\n' + T3.alt); } catch (e) { return /nicht genau einmal/.test(e.message); } })());
T('Anker fehlt: Fehler', (() => { try { anwenden(T2, 'nichts'); } catch (e) { return /nicht genau einmal/.test(e.message); } })());
T('</head> doppelt: Fehler', (() => { try { anwenden(T1, th + '</head>'); } catch (e) { return /nicht genau einmal/.test(e.message); } })());
// Rücknahme lässt Fremdänderungen stehen
{ const fremd = '<!-- fremd -->' + neu['layout/theme.liquid']; const z = allesZurueck({ ...neu, 'layout/theme.liquid': fremd }); T('Fremdänderung bleibt bei Rücknahme', z['layout/theme.liquid'].includes('<!-- fremd -->') && !z['layout/theme.liquid'].includes(T1.marke) && z['layout/theme.liquid'].includes(T3.alt)); }
// nur-Filter
{ const e = allesAnwenden(texte, ['T3']); T('nur T3', zustand(T3, e['layout/theme.liquid']) === 'neu' && zustand(T1, e['layout/theme.liquid']) === 'alt' && e['blocks/buy-buttons.liquid'] === bb); }
// Inhalt der Texte
T('T3 prüft gespeicherte Zustimmung', /localStorage\.getItem\(KEY\)/.test(T3.neu) && /if\(s\|\|banner\.style\.display==="block"\)return/.test(T3.neu));
T('T2 nennt die echten Knopfnamen', /Druckvorschau prüfen/.test(T2.neu) && /Druckvorschau bestätigen und in den Warenkorb/.test(T2.neu) && !/Mit meinem Design in den Warenkorb/.test(T2.neu));
T('T1 nur Produktseite und höchstens 600 px', /template\.name == 'product'/.test(T1.block) && /max-width:600px/.test(T1.block) && /min-height:44px/.test(T1.block) && /min-width:44px/.test(T1.block));
// LiquidJS-Rendern der drei Fälle
const lj = process.argv[2];
if (lj) {
  const req = createRequire(import.meta.url); const { Liquid } = req(path.resolve(lj));
  const e = new Liquid(); const frag = T2.neu;
  const r = (ctx) => e.parseAndRenderSync(frag, ctx).replace(/\s+/g, ' ').trim();
  const norm = r({ product: { description: '<div>Editor</div>' }, request: { locale: { iso_code: 'de' } } });
  T('de normal', /Druckvorschau prüfen» und legst es dort mit «Druckvorschau bestätigen und in den Warenkorb» ab/.test(norm) && !/nicht bestellbar/.test(norm), norm);
  const en = r({ product: { description: '<div>Editor</div>' }, request: { locale: { iso_code: 'en' } } });
  T('en normal', /This item is printed with your own design/.test(en) && !/Personalisation is currently/.test(en), en);
  const sp = r({ product: { description: '<div data-lspod-blocked="1">x</div>' }, request: { locale: { iso_code: 'de' } } });
  T('de gesperrt', /derzeit nicht bestellbar\. Die Begründung steht im Kasten weiter unten\./.test(sp) && !/Druckvorschau/.test(sp), sp);
  const spe = r({ product: { description: '<div data-lspod-blocked="1">x</div>' }, request: { locale: { iso_code: 'en' } } });
  T('en gesperrt', /currently not available/.test(spe), spe);
} else console.log('(LiquidJS-Rendern übersprungen)');
console.log(ok + ' Prüfungen bestanden' + (bad ? ', ' + bad + ' FEHLER' : '')); process.exit(bad ? 1 : 0);
