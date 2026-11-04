// Test der Kopfzeilen-Verschlankung (reine Rechnung, kein Netz): node dropship/seo-kopf-0411/patches_test.mjs
// Optional gegen eine gespeicherte Seite: SEITE=/pfad/zu/seite.html (rohes HTML einer Live-Seite) prüft die Kette am echten Drawer.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DATEI, MD5_VOR, KETTE, anwenden, zuruecknehmen } from './patches.mjs';

const HIER = new URL('.', import.meta.url).pathname;
let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 300)}\n   soll: ${JSON.stringify(b).slice(0, 300)}`); } };
const wirft = (n, f, muster) => { try { f(); fehl++; console.log(`✗ ${n}: warf nicht`); } catch (e) { if (muster.test(e.message)) ok++; else { fehl++; console.log(`✗ ${n}: falsche Meldung «${e.message}»`); } } };
const md5 = (s) => createHash('md5').update(s).digest('hex');

const vor = readFileSync(HIER + 'sicherung/snippets__header-drawer.liquid.vor', 'utf8');
const referenz = readFileSync(HIER + 'header-drawer.slim2.liquid', 'utf8');

// 1. Ausgangsstand und Rechenergebnis
ist('Sicherung hat den erwarteten md5', md5(vor), MD5_VOR);
ist('Datei heisst', DATEI, 'snippets/header-drawer.liquid');
const neu = anwenden(vor);
ist('anwenden() ergibt Byte für Byte die geprüfte Fassung (slim2)', neu, referenz);
ist('zuruecknehmen(anwenden(x)) == x', zuruecknehmen(neu), vor);
ist('keine Tabs im Ergebnis', neu.includes('\t'), false);
ist('keine Wagenrückläufe im Ergebnis', neu.includes('\r'), false);
ist('Kette wie beschlossen', KETTE, [32, 32, 8, 4, 2, 2]);

// 2. Schutz gegen falschen Stand
wirft('zweites anwenden() wird abgelehnt', () => anwenden(neu), /schon im Snippet/);
wirft('zuruecknehmen() auf unverändertem Stand wird abgelehnt', () => zuruecknehmen(vor), /erwartet 1×/);
wirft('fehlender Anker wird gemeldet', () => anwenden(vor.replace('></script>\n\n<header-drawer', '></script>\n<header-drawer')), /Anker «drawer» kommt 0×/);
wirft('doppelter Anker wird gemeldet', () => anwenden(vor + '\n</header-drawer>\n\n{% stylesheet %}\n'), /Anker «ende» kommt 2×/);
wirft('teilweise zurückgenommener Stand wird abgelehnt', () => zuruecknehmen(neu.replace('{%- capture luxe_drawer_html -%}\n', '')), /erwartet 1×/);

// 3. Aufbau des Ergebnisses
const iEnd = neu.indexOf('{%- endcapture -%}'), iSty = neu.indexOf('{% stylesheet %}'), iCap = neu.indexOf('{%- capture luxe_drawer_html -%}'), iScr = neu.indexOf('<script\n  src=');
ist('stylesheet-Tag steht NACH dem capture (Shopify verbietet es darin)', iSty > iEnd && iEnd > iCap, true);
ist('das <script src> steht VOR dem capture (Wächter sieht kein Skript)', iScr > -1 && iScr < iCap, true);
ist('genau ein capture des Drawers', neu.split('{%- capture luxe_drawer_html -%}').length - 1, 1);
ist('genau ein capture des Zeilenumbruchs', neu.split('capture luxe_nl').length - 1 + neu.split('endcapture').length - 1 >= 4, true);
ist('Bedingung mischt nie and/or: nur die <pre>-Zeile hat or', (neu.match(/\{%- if [^%]*\bor\b[^%]*-%\}/g) || []).length, 1);
ist('Rückfall gibt unveränderte Ausgabe aus', neu.includes('{%- else -%}\n  {{- luxe_drawer_html -}}\n{%- endif -%}'), true);

// 4. Rechnerische Nachbildung der Liquid-Kette (replace = alle nicht überlappenden Vorkommen von links)
const sp = (n) => ' '.repeat(n);
const kette = (s, nl = '\n') => { let t = s.split(nl).join(' '); for (const n of KETTE) t = t.split(sp(n)).join(' '); return t; };
let schlecht = 0;
for (let n = 1; n <= 5000; n++) if (kette(sp(n)) !== ' ') schlecht++;
ist('alle Leerzeichenfolgen von 1 bis 5000 fallen auf genau eines', schlecht, 0);
ist('Umbruch + Einrückung wird ein Leerzeichen', kette('<a>\n        <b>'), '<a> <b>');
ist('Text mit einzelnen Leerzeichen bleibt unberührt', kette('Hallo Welt, wie geht es'), 'Hallo Welt, wie geht es');
ist('mehrere Umbrüche hintereinander', kette('a\n\n\n   b'), 'a b');
ist('CRLF-Fall: mit einem LF-Muster bleibt \\r stehen, wird aber nie leeres Muster (Wächter: size < 3)', kette('a\r\n  b', '\n'), 'a\r b');
{ const roh = '<li class="x">\n   Text A\n  </li>\n<li>'; ist('Inhalt (ohne Leerraum) ändert sich nie', kette(roh).replace(/\s+/g, ''), roh.replace(/\s+/g, '')); }
// Wächter-Nachbildung
const waechter = (html, nlLen) => { let ok2 = nlLen > 0 && nlLen < 3; if (ok2) { for (const m of ['<script', '<style', '<textarea']) if (html.includes(m)) ok2 = false; if (html.includes('<pre>') || html.includes('<pre ')) ok2 = false; } return ok2; };
ist('Wächter: normaler Drawer darf verdichtet werden', waechter('<header-drawer><predictive-search></predictive-search></header-drawer>', 1), true);
ist('Wächter: leeres Zeilenumbruch-Muster verhindert die Kette', waechter('<a>', 0), false);
ist('Wächter: CRLF (Länge 2) ist noch erlaubt', waechter('<a>', 2), true);
ist('Wächter: Länge 3 und mehr verhindert die Kette', waechter('<a>', 3), false);
ist('Wächter: <script> verhindert die Kette', waechter('<a><script>x // y\n</script>', 1), false);
ist('Wächter: <style> verhindert die Kette', waechter('<style>a{}</style>', 1), false);
ist('Wächter: <textarea> verhindert die Kette', waechter('<textarea>\n</textarea>', 1), false);
ist('Wächter: <pre> verhindert die Kette', waechter('<pre>\n</pre>', 1), false);
ist('Wächter: <pre class> verhindert die Kette', waechter('<pre class="x">', 1), false);
ist('Wächter: <predictive-search> ist KEIN <pre>', waechter('<predictive-search>', 1), true);

// 5. Optional: am echten Drawer einer gespeicherten Seite
const SEITE = process.env.SEITE;
if (SEITE && existsSync(SEITE)) {
  const h = readFileSync(SEITE, 'utf8'); const m = h.match(/<header-drawer[\s\S]*?<\/header-drawer>/);
  ist('Seite trägt genau einen Drawer', !!m, true);
  if (m) {
    const k = kette(m[0]);
    ist('echter Drawer: keine Zeilenumbrüche, Tabs oder Doppelleerzeichen mehr', /\n|\t|  /.test(k), false);
    ist('echter Drawer: Inhalt ohne Leerraum unverändert', k.replace(/\s+/g, ''), m[0].replace(/\s+/g, ''));
    ist('echter Drawer: Wächter erlaubt die Kette', waechter(m[0], 1), true);
    ist('echter Drawer: um mehr als 40 % kleiner', k.length < m[0].length * 0.6, true);
  }
}
console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
