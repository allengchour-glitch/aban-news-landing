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
 * ⚠️ NICHT PERFEKT, UND DAS STEHT HIER: erkannt wird die Form, in der alle Sonden in
 * diesem Verzeichnis geschrieben sind — `const <name> = \x60function(...)` bis zum
 * naechsten unmaskierten Backtick am Zeilenanfang oder vor dem Semikolon. Wer eine
 * Sonde anders schreibt, faellt durch. Eine Null hier ist also "nichts gefunden",
 * nicht "es gibt nichts" (Regel 3).
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
  /* Sonden-Literale finden: von "= `" bis zum schliessenden Backtick. */
  let i = 0
  for (;;) {
    const start = txt.indexOf('= ' + BT, i)
    if (start < 0) break
    const von = start + 3
    const bis = txt.indexOf(BT, von)
    if (bis < 0) break
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
    const sauberesEnde = /^\s*(\)|,|;|\+|\s*$)/.test(danach) || /^\s*\n/.test(danach)
    if (!sauberesEnde) {
      funde++
      const zeile = txt.slice(0, bis).split('\n').length
      console.log(`❌ ${d}:${zeile} — Sonden-Literal endet mitten im Text:`)
      console.log(`   …${txt.slice(Math.max(0, bis - 60), bis)}[BACKTICK]${danach.split('\n')[0]}`)
    }
    i = bis + 1
  }
}

console.log(`\n${dateien.length} Werkzeuge, ${sonden} Sonden-Literale geprueft`)
console.log(funde ? `⚠️  ${funde} verdaechtige Stellen` : '✅ Kein Backtick bricht ein Sonden-Literal')
process.exit(funde ? 1 : 0)
