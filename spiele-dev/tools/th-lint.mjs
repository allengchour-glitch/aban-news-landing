/**
 * th-lint.mjs — die eine Falle, in die ich dreizehnmal getreten bin, mechanisch fangen.
 *
 * ⚠️ WOZU. Runbook-Regel 1 lautet seit Langem: KEIN BACKTICK IN EINER SONDE. Sonden
 * sind Template-Literale; ein Backtick darin — meist als Zitat um einen Bezeichner
 * gemeint, `WORLD_SOLIDS` etwa — beendet das Literal und der Lauf stirbt mit
 * "Unexpected identifier". Die Regel steht ganz oben im Runbook. Ich bin trotzdem
 * DREIZEHNMAL an einem Tag hineingelaufen, jedes Mal einen Lauf lang.
 *
 * Eine Regel, gegen die man dreizehnmal verstoesst, ist keine Regel, sondern ein
 * Wunsch. Darum steht sie jetzt als Pruefung da: dieses Werkzeug liest die anderen
 * Werkzeuge und meldet jeden Backtick INNERHALB eines Sonden-Literals, bevor ein
 * Browser startet — statt danach.
 *
 * ⚠️ UND GENAU DAS IST PASSIERT — 2026-08-30, SELBST GEMESSEN. Gesucht wurde nur nach
 * "= \x60". Sonden stehen aber meistens als OBJEKT-EIGENSCHAFT da, also "name: \x60function".
 * Die wurden nie gelesen. Konkret: ein Backtick im Kommentar der Sonde in th-leistung
 * liess "node --check" mit "Unexpected identifier" sterben, waehrend dieses Werkzeug
 * daneben "✅ Kein Backtick bricht ein Sonden-Literal" meldete. Der Waechter gegen den
 * haeufigsten Fehler dieses Repos hatte ein Loch an der haeufigsten Schreibweise.
 * Jetzt zaehlt, WOMIT das Literal ANFAENGT: eine Sonde beginnt immer mit "function".
 * Der erste Anlauf nahm stattdessen jedes Literal nach "=", ":", "(" oder "," — das waren
 * 423 statt 39, davon 34 angebliche Funde, fast alle geschachtelte Ausgabe-Vorlagen
 * (${x ? ... : ...}). Genau der Laerm, vor dem der Kommentar weiter unten warnt: eine
 * Pruefung, die auf gebraeuchlichen Mustern anschlaegt, wird abgeschaltet statt gelesen.
 *
 * ⚠️ WEITER NICHT PERFEKT, UND DAS BLEIBT HIER STEHEN: erkannt wird eine Schreibweise,
 * kein Sprachaufbau. Wer eine Sonde anders schreibt, faellt durch. Eine Null hier ist
 * "nichts gefunden", nicht "es gibt nichts" (Regel 3). Darum laeuft "node --check" auf
 * jedem geaenderten Werkzeug weiter mit — dieses Werkzeug sagt WO, node sagt OB.
 *
 * Aufruf:  node spiele-dev/tools/th-lint.mjs
 * Dauer:   Millisekunden. Kein Browser.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = dirname(fileURLToPath(import.meta.url))
const BT = String.fromCharCode(96)

const dateien = readdirSync(HIER).filter((d) => d.endsWith('.mjs') && d !== 'th-lint.mjs')
let sonden = 0, funde = 0

for (const d of dateien) {
  const txt = readFileSync(join(HIER, d), 'utf8')
  /* Sonden-Literale finden: von einem Vorzeichen ("=", ":", "(", ",") bis zum
     schliessenden Backtick. */
  let i = 0
  for (;;) {
    const treffer = /[=:(,]\s*/g
    treffer.lastIndex = i
    let start = -1, von = -1
    for (let m; (m = treffer.exec(txt)) !== null;) {
      if (txt[m.index + m[0].length] === BT) { start = m.index; von = m.index + m[0].length + 1; break }
      treffer.lastIndex = m.index + 1
    }
    if (start < 0) break
    const bis = txt.indexOf(BT, von)
    if (bis < 0) break
    i = bis + 1
    /* Nur Sonden: ihr Rumpf faengt mit "function" an. Alles andere ist eine
       Ausgabe-Vorlage dieses Verzeichnisses und geht die Regel nichts an. */
    if (!/^\s*function\b/.test(txt.slice(von, von + 40))) continue
    sonden++
    const koerper = txt.slice(von, bis)
    /* Ein Backtick IM Koerper kann es nicht geben — das Literal waere dort zu Ende.
       Gesucht wird darum das Gegenteil: endet das Literal mitten in einem Kommentar
       oder mitten in einer Zeile, ist der Autor in die Falle getreten. */
    const danach = txt.slice(bis + 1, bis + 60)
    /* ⚠️ "+" GEHOERT DAZU. Der erste Lauf meldete th-mauern als verdaechtig — dort
       endet ein Literal mitten in einem regulaeren Ausdruck und wird mit "+" an den
       naechsten Teil gehaengt. Voellig richtig geschrieben. Eine Pruefung, die auf
       einem gebraeuchlichen Muster anschlaegt, ist Laerm und wird abgeschaltet, statt
       gelesen — dann fehlt sie beim vierzehnten Mal. */
    /* ⚠️ "}" GEHOERT DAZU (2026-09-03). Eine Sonde, die die LETZTE Eigenschaft ihres
       Objekts ist, endet als `…}` gefolgt von "}, TMP)" — voellig richtig geschrieben.
       th-plaetze.mjs wurde so gemeldet, obwohl `node --check` sie sauber findet. Ein
       Fehlalarm ist hier besonders teuer: die Pruefung steht als erste im Tor, und wer
       ihr nicht traut, schaltet sie ab — dann fehlt sie beim naechsten echten Fall. */
    const sauberesEnde = /^\s*(\)|,|;|\+|\}|\s*$)/.test(danach) || /^\s*\n/.test(danach)
    if (!sauberesEnde) {
      funde++
      const zeile = txt.slice(0, bis).split('\n').length
      console.log(`❌ ${d}:${zeile} — Sonden-Literal endet mitten im Text:`)
      console.log(`   …${txt.slice(Math.max(0, bis - 60), bis)}[BACKTICK]${danach.split('\n')[0]}`)
    }
  }
}

console.log(`\n${dateien.length} Werkzeuge, ${sonden} Sonden-Literale geprueft`)
console.log(funde ? `⚠️  ${funde} verdaechtige Stellen` : '✅ Kein Backtick bricht ein Sonden-Literal')
process.exit(funde ? 1 : 0)
