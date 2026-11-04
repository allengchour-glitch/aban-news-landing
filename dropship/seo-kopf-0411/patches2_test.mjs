// Test der Stufe 2 (Filter und Produktkarten verdichten), reine Rechnung ohne Netz: node dropship/seo-kopf-0411/patches2_test.mjs
// Optional gegen gespeicherte Bereiche echter Seiten: REGIONEN=/ordner mit <name>.filter.html und <name>.karten.html
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SNIPPET, DATEI, MD5_VOR, KETTE, SNIPPET_TEXT, anwenden, zuruecknehmen } from './patches2.mjs';

const HIER = new URL('.', import.meta.url).pathname;
let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 300)}\n   soll: ${JSON.stringify(b).slice(0, 300)}`); } };
const wirft = (n, f, muster) => { try { f(); fehl++; console.log(`✗ ${n}: warf nicht`); } catch (e) { if (muster.test(e.message)) ok++; else { fehl++; console.log(`✗ ${n}: falsche Meldung «${e.message}»`); } } };
const md5 = (s) => createHash('md5').update(s).digest('hex');
const vor = readFileSync(HIER + 'sicherung/sections__main-collection.liquid.vor', 'utf8');

// 1. Section: Ausgangsstand, Anwenden, Umkehren
ist('Sicherung hat den erwarteten md5', md5(vor), MD5_VOR);
ist('Dateinamen', [DATEI, SNIPPET], ['sections/main-collection.liquid', 'snippets/lx-verdichten.liquid']);
const neu = anwenden(vor);
ist('zuruecknehmen(anwenden(x)) == x', zuruecknehmen(neu), vor);
ist('Section ruft das Snippet zweimal auf (Filter, Karten)', neu.split("render 'lx-verdichten'").length - 1, 2);
ist('Filter-Aufruf trägt modus filter', neu.includes("html: lx_filter, modus: 'filter'"), true);
ist('Karten-Aufruf trägt modus karten', neu.includes("html: children, modus: 'karten'"), true);
ist('children wird nach dem Verdichten an product-grid gegeben', neu.indexOf('assign children = lx_karten') < neu.indexOf("render 'product-grid'"), true);
ist('der Rest der Section bleibt unverändert (Schema, Raster, Seitenaufteilung)', neu.slice(neu.indexOf('{% assign products_per_page = 24 %}')).includes("paginate: paginate"), true);
wirft('zweites anwenden() wird abgelehnt', () => anwenden(neu), /schon in der Section/);
wirft('zuruecknehmen() auf unverändertem Stand wird abgelehnt', () => zuruecknehmen(vor), /erwartet 1×/);
wirft('fehlender Filter-Anker', () => anwenden(vor.replace("type: 'filters',", "type: 'filter-x',")), /Anker «filter» kommt 0×/);
wirft('fehlender Karten-Anker', () => anwenden(vor.replace("{% endcapture %}\n\n      {% render 'product-grid',", "{% endcapture %}\n      {% render 'product-grid',")), /Anker «karten» kommt 0×/);

// 2. Aufbau des Snippets
ist('Snippet ohne Tabs', SNIPPET_TEXT.includes('\t'), false);
ist('Snippet ohne Wagenrücklauf', SNIPPET_TEXT.includes('\r'), false);
ist('Snippet-Kette wie beschlossen', KETTE, [32, 32, 8, 4, 2, 2]);
ist('Snippet: kein and/or-Gemisch (jede if-Zeile höchstens eines)', SNIPPET_TEXT.split('\n').filter((z) => /\band\b/.test(z) && /\bor\b/.test(z)).length, 0);
ist('Snippet unter 256 KB (Shopify-Grenze für Liquid-Dateien)', Buffer.byteLength(SNIPPET_TEXT) < 262144, true);
ist('Snippet gibt im Rückfall die Rohausgabe aus', SNIPPET_TEXT.includes('{%- else -%}\n  {{- html -}}\n{%- endif -%}'), true);

// 3. Nachbildung des Snippets (replace = alle nicht überlappenden Vorkommen von links; split = Zerlegung an der Zeichenkette)
const sp = (n) => ' '.repeat(n);
const zaehle = (s, m) => s.split(m).length; // Liquid: split ... | size
export function verdichten(html, modus, nl = '\n') {
  let ok2 = nl.length > 0 && nl.length < 3;
  if (ok2) {
    if (html.includes('<textarea')) ok2 = false;
    if (html.includes('<pre>') || html.includes('<pre ')) ok2 = false;
    if (html.includes('<script>')) ok2 = false;
    const auf = zaehle(html, '<script');
    if (modus === 'filter') { if (html.includes('<style')) ok2 = false; if (auf !== zaehle(html, '></script>')) ok2 = false; }
    else if (modus === 'karten') { if (auf !== zaehle(html, '<script type="application/json"')) ok2 = false; }
    else ok2 = false;
  }
  if (!ok2) return html;
  let t = html.split(nl).join(' '); for (const n of KETTE) t = t.split(sp(n)).join(' ');
  return t;
}
const filterProbe = `<script src="a.js"\n  type="module"\n></script>\n<div class="x\n   y">\n      <label>\n        Text\n      </label>\n</div>`;
ist('Filter: leere Skript-Tags sind erlaubt, Leerraum wird verdichtet', verdichten(filterProbe, 'filter'), '<script src="a.js" type="module" ></script> <div class="x y"> <label> Text </label> </div>');
ist('Filter: Skript mit Inhalt verhindert die Verdichtung', verdichten('<script src="a.js"></script><script>var a; // x\n</script>', 'filter'), '<script src="a.js"></script><script>var a; // x\n</script>');
ist('Filter: JSON-Skript verhindert die Verdichtung (nur leere erlaubt)', verdichten('<script type="application/json">\n{}\n</script>', 'filter'), '<script type="application/json">\n{}\n</script>');
ist('Filter: <style> verhindert die Verdichtung', verdichten('<style>\na{}\n</style>', 'filter'), '<style>\na{}\n</style>');
ist('Filter: <textarea> verhindert die Verdichtung', verdichten('<textarea>\n</textarea>', 'filter'), '<textarea>\n</textarea>');
ist('Filter: <pre> verhindert die Verdichtung', verdichten('<pre>\n x</pre>', 'filter'), '<pre>\n x</pre>');
ist('Filter: <predictive-search> ist kein <pre>', verdichten('<predictive-search>\n  a</predictive-search>', 'filter'), '<predictive-search> a</predictive-search>');
const kartenProbe = `<li class="a\n   b">\n  <style data-shopify>\n  </style>\n  <script type="application/json">\n    {"a":  1}\n  </script>\n</li>`;
ist('Karten: JSON-Skript und <style> sind erlaubt', verdichten(kartenProbe, 'karten'), '<li class="a b"> <style data-shopify> </style> <script type="application/json"> {"a": 1} </script> </li>');
ist('Karten: Skript ohne type verhindert die Verdichtung', verdichten('<script>x // y\n</script>', 'karten'), '<script>x // y\n</script>');
ist('Karten: Skript mit anderem type verhindert die Verdichtung', verdichten('<script type="text/javascript">x // y\n</script>', 'karten'), '<script type="text/javascript">x // y\n</script>');
ist('Karten: Skript mit src verhindert die Verdichtung (nicht erwartet)', verdichten('<script src="a.js"></script>', 'karten'), '<script src="a.js"></script>');
ist('unbekannter modus gibt die Rohausgabe zurück', verdichten('a\n  b', 'foo'), 'a\n  b');
ist('leerer modus gibt die Rohausgabe zurück', verdichten('a\n  b', ''), 'a\n  b');
ist('leeres Zeilenumbruch-Muster gibt die Rohausgabe zurück', verdichten('a\n  b', 'filter', ''), 'a\n  b');
ist('Länge-3-Muster gibt die Rohausgabe zurück', verdichten('a\n  b', 'filter', '\n\n\n'), 'a\n  b');
ist('Leerzeichen ohne Umbruch (z. B. Wert mit Doppelleerzeichen) werden mitverdichtet: bekanntes Restrisiko', verdichten('<input value="a  b">', 'filter'), '<input value="a b">');
let schlecht = 0; for (let n = 1; n <= 5000; n++) if (verdichten(sp(n), 'filter') !== ' ') schlecht++;
ist('alle Leerzeichenfolgen von 1 bis 5000 fallen auf eines', schlecht, 0);

// 4. Optional: echte Bereiche
const R = process.env.REGIONEN;
if (R && existsSync(R)) {
  const namen = [...new Set(readdirSync(R).filter((f) => /\.(filter|karten)\.html$/.test(f)).map((f) => f.split('.')[0]))];
  const ausgabe = {};
  for (const n of namen) for (const modus of ['filter', 'karten']) {
    const p = `${R}/${n}.${modus}.html`; if (!existsSync(p)) continue;
    const roh = readFileSync(p, 'utf8'); const k = verdichten(roh, modus);
    ausgabe[`${n}.${modus}`] = k.length;
    ist(`${n} ${modus}: die Verdichtung greift (Schutz lässt zu)`, k !== roh, true);
    ist(`${n} ${modus}: Inhalt ohne Leerraum unverändert`, k.replace(/\s+/g, ''), roh.replace(/\s+/g, ''));
    ist(`${n} ${modus}: keine Zeilenumbrüche/Tabs/Doppelleerzeichen mehr`, /\n|\t|  /.test(k), false);
    ist(`${n} ${modus}: Anzahl Tags gleich`, (k.match(/</g) || []).length, (roh.match(/</g) || []).length);
    ist(`${n} ${modus}: Ersparnis über ${modus === 'filter' ? 25 : 8} %`, k.length < roh.length * (modus === 'filter' ? 0.75 : 0.92), true);
    if (modus === 'karten') { // JSON-Skripte müssen vorher und nachher dasselbe bedeuten
      const js = (t) => [...t.matchAll(/<script type="application\/json">([\s\S]*?)<\/script>/g)].map((m) => JSON.stringify(JSON.parse(m[1])));
      ist(`${n} karten: 24 JSON-Skripte, nach Parsen gleich`, js(k), js(roh)); ist(`${n} karten: Anzahl JSON-Skripte`, js(roh).length, 24);
    }
    if (modus === 'filter') {
      const werte = (t) => [...t.matchAll(/\s(?:value|name|id|for|data-[a-z-]+|aria-label)="([^"]*)"/g)].map((m) => m[1]);
      ist(`${n} filter: alle value/name/id/for/data-/aria-label-Werte gleich`, werte(k), werte(roh));
    }
  }
  writeFileSync(`${R}/_js_ausgabe.json`, JSON.stringify(ausgabe));
}
console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
