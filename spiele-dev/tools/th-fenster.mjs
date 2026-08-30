/* th-fenster.mjs — findet Code, der auf `window.X` prueft, obwohl X in der Huelle lebt.
 *
 * ⚠️ WOZU. In PR #2445 stand `if(window.pickups)` mitten im Radar-Code. `pickups` ist ein
 * `var` INNERHALB der grossen Huelle — `window.pickups` ist `undefined`, immer. Der
 * Waechter war dauerhaft falsch, und die Muenzen wurden nie gezeichnet: Code, der
 * dasteht und nie laeuft, ohne Fehlermeldung, ohne Fehlerbild.
 *
 * Das war Zufallsfund. Diese Fehlerklasse gehoert gesucht, nicht abgewartet.
 *
 * ⚠️ KEINE geratene Ausnahmeliste. Ob `window.innerWidth` erlaubt ist und
 * `window.pickups` nicht, entscheidet nicht mein Gedaechtnis, sondern die LAUFZEIT:
 * gemeldet wird nur, was (a) nirgends in der Datei zugewiesen wird UND (b) im
 * fertig geladenen Spiel `undefined` ist. Browser-Felder fallen dadurch von selbst raus.
 *
 * Aufruf:  node spiele-dev/tools/th-fenster.mjs
 */
import { readFileSync } from 'node:fs'
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const roh = readFileSync('traumhaus.html', 'utf8')

/* ⚠️ KOMMENTARE ZUERST ENTFERNEN. Der erste Lauf meldete `window.pickups` und
   `window.WORLD_SOLIDS` — beide standen in der PROSA, die den Fehler von #2445
   beschreibt. Ein Werkzeug, das seine eigene Fehlerbeschreibung als Fehler meldet,
   erzeugt genau die Phantom-Funde, gegen die es gebaut ist.
   `//` nur, wenn ihm kein `:` vorausgeht — sonst frisst die Regel jede URL. */
const quelle = roh
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\w])\/\/[^\n]*/g, '$1')

/* 1. Alle gelesenen window-Felder einsammeln. */
const gelesen = new Map()
for (const m of quelle.matchAll(/window\.([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
  const n = m[1]
  gelesen.set(n, (gelesen.get(n) || 0) + 1)
}

/* 2. Wer wird irgendwo zugewiesen? Auch Kurzformen (+=, ||=) und window["x"]. */
const zugewiesen = new Set()
for (const m of quelle.matchAll(/window\.([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=[^=]|\|\|=|\+=|-=|\?\?=)/g))
  zugewiesen.add(m[1])
for (const m of quelle.matchAll(/window\[\s*(["'])([A-Za-z_$][A-Za-z0-9_$]*)\1\s*\]\s*=[^=]/g))
  zugewiesen.add(m[2])
/* delete window.x zaehlt als bewusster Umgang, nicht als Zuweisung — aber wer loescht,
   hat vorher gesetzt (oft dynamisch). Darum ebenfalls als "bekannt" behandeln. */
for (const m of quelle.matchAll(/delete\s+window\.([A-Za-z_$][A-Za-z0-9_$]*)/g))
  zugewiesen.add(m[1])

const ohneZuweisung = [...gelesen.keys()].filter((n) => !zugewiesen.has(n)).sort()

console.log(`  ${gelesen.size} verschiedene window-Felder gelesen, ${zugewiesen.size} davon irgendwo gesetzt`)
console.log(`  ${ohneZuweisung.length} werden gelesen, aber nie gesetzt (Kandidaten):`)
console.log('    ' + ohneZuweisung.join(', '))

/* 3. Die Laufzeit entscheidet. */
const TMP = 'spiele-dev/tools/_fenster_probe.html'
mitSonden('traumhaus.html', {
  fn: `function(was,a){
    if(was==="pruefe"){var r=[];
      for(var i=0;i<a.length;i++){var n=a[i];
        var imFenster=(typeof window[n]);
        /* Gibt es einen gleichnamigen Namen INNERHALB der Huelle? Das ist der Fall,
           der weh tut: der Waechter fragt window, gemeint war die Huelle. */
        var inHuelle="nein";
        try{ inHuelle=eval("typeof "+n); }catch(e){ inHuelle="nein"; }
        r.push({name:n,fenster:imFenster,huelle:inHuelle});}
      return r;}
    /* Die konkrete Folge des Funds: der Gipfel des Grossen Bergs sollte als Ort auf der
       Karte stehen. Ob er es tut, entscheidet nicht der Quelltext, sondern die Liste. */
    if(was==="orte")return {anzahl:WORLD_POIS.length,
      berg:WORLD_POIS.some(function(o){return /Grosser Berg/.test(o[3]||"");}),
      namen:WORLD_POIS.map(function(o){return o[3];}).slice(-6)};
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const F = (...a) => page.evaluate((x) => window.__th.fn(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

const lauf = await F('pruefe', ohneZuweisung)
const echteBrowserfelder = lauf.filter((r) => r.fenster !== 'undefined')
const tot = lauf.filter((r) => r.fenster === 'undefined')
const schlimm = tot.filter((r) => r.huelle !== 'undefined' && r.huelle !== 'nein')

console.log(`  davon im Browser vorhanden (also in Ordnung): ${echteBrowserfelder.length}`)
console.log(`  zur Laufzeit undefined: ${tot.length}`)
for (const r of tot) console.log(`    · window.${r.name} = undefined · in der Huelle: ${r.huelle}`)

/* Selbstprobe: erkennt das Werkzeug den Fall, den es finden soll? Der behobene Fall aus
   #2445 wird kuenstlich nachgestellt — ohne ihn koennte die Suche auch blind sein und
   "0 Funde" melden. Eine Null ist ein Verdacht, kein Ergebnis. */
const probe = await F('pruefe', ['pickups', 'innerWidth', '__gibtesnicht__'])
const pPick = probe.find((r) => r.name === 'pickups')
const pWidth = probe.find((r) => r.name === 'innerWidth')
const pNix = probe.find((r) => r.name === '__gibtesnicht__')
check('SELBSTPROBE: der Fall aus #2445 wird als solcher erkannt',
  pPick.fenster === 'undefined' && pPick.huelle === 'object',
  'window.pickups=' + pPick.fenster + ', in der Huelle=' + pPick.huelle)
check('SELBSTPROBE: ein echtes Browser-Feld wird NICHT gemeldet',
  pWidth.fenster !== 'undefined', 'window.innerWidth=' + pWidth.fenster)
check('SELBSTPROBE: ein erfundener Name ist nirgends',
  pNix.fenster === 'undefined' && (pNix.huelle === 'undefined' || pNix.huelle === 'nein'),
  'window=' + pNix.fenster + ', Huelle=' + pNix.huelle)

/* Das Etikett muss halten, was es sagt: `window.pickups` und `window.WORLD_POIS` stehen
   heute NUR noch in der Prosa, die ihre Behebung beschreibt — beide muessen nach dem
   Entfernen der Kommentare verschwunden sein. `window.autoRec` ist echter Code und muss
   bleiben; ohne diese zweite Haelfte wuerde auch ein Stripper bestehen, der alles frisst. */
check('SELBSTPROBE: Prosa wird nicht als Code gelesen',
  /window\.pickups/.test(roh) && !/window\.pickups/.test(quelle) &&
  /window\.WORLD_POIS/.test(roh) && !/window\.WORLD_POIS/.test(quelle) &&
  /window\.autoRec/.test(quelle),
  'beide Kommentar-Erwaehnungen entfernt, echter Code (window.autoRec) bleibt')
check('SELBSTPROBE: das Entfernen der Kommentare frisst nicht die halbe Datei',
  quelle.length > roh.length * 0.6,
  Math.round((quelle.length / roh.length) * 100) + ' % der Datei bleiben Code')

check('Kein Waechter fragt window nach etwas, das in der Huelle liegt',
  schlimm.length === 0,
  schlimm.map((r) => 'window.' + r.name + ' (Huelle: ' + r.huelle + ')').join(', ') || 'keiner')
/* ⚠️ KEINE Behauptung "kein window-Feld darf fehlen". Der erste Lauf meldete
   `window.webkitAudioContext` — das ist der Safari-Rueckfall in
   `new (window.AudioContext||window.webkitAudioContext)()` und voellig richtig so.
   Ein Feld, das in EINEM Browser fehlt, absichtlich abzufragen, ist kein Fehler.
   Der Fehler ist ausschliesslich: window fragen, wo die HUELLE gemeint war. Genau das
   prueft die Zeile darueber — mehr behauptet dieses Werkzeug nicht. */
const rueckfall = tot.filter((r) => r.huelle === 'undefined' || r.huelle === 'nein')
console.log('  bewusste Rueckfaelle (in der Huelle ebenfalls unbekannt): ' +
  (rueckfall.map((r) => r.name).join(', ') || 'keine'))

/* --- Die Folge, nicht nur die Ursache --- */
const orte = await F('orte')
console.log('  Orte auf der Karte: ' + orte.anzahl + ' · zuletzt: ' + orte.namen.join(', '))
check('Der Gipfel des Grossen Bergs steht als Ort auf der Karte', orte.berg,
  orte.berg ? 'eingetragen' : 'FEHLT — der Waechter oben hat ihn verschluckt')

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 FENSTER BESTANDEN' : '💥 FENSTER FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
