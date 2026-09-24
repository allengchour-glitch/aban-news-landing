/* angebote_qualitaet.mjs — misst, ob die Angebote-Suche das gesuchte Ding zeigt statt Zubehoer.
 *
 * Daten: tools/fixtures/angebote_snapshot.json (12 Suchen x 50 echte eBay-Treffer, 2026-09-23)
 *        tools/fixtures/angebote_labels.json   (von Hand gelabelt, OHNE Blick auf den Algorithmus)
 * Kennzahl: Anteil echter Produkte unter den ersten 6 Treffern (erster Handy-Bildschirm),
 *           vorher (eBay-Reihenfolge) und nachher (js/angebote-plus.js ordne()).
 * ZURUECKGEHALTEN: 4 Suchen wurden beim Entwickeln nicht angesehen — sie zeigen, ob die Regeln
 * verallgemeinern. Wer an den Regeln dreht, muss die zurueckgehaltenen Zahlen ehrlich berichten.
 *
 *   node tools/angebote_qualitaet.mjs      Exit 1, wenn nachher schlechter als vorher
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const A = createRequire(import.meta.url)(path.join(ROOT, 'js/angebote-plus.js'))
const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/angebote_snapshot.json'), 'utf8')).abfragen
const lab = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/angebote_labels.json'), 'utf8')).kein_produkt
/* ⚠️ Die „zurueckgehaltenen" 4 tauchten in der Fehleranalyse der 2. Fassung auf — sie sind
   seither NICHT mehr ungesehen. Wirklich ungesehen war nur „Neu" (erst nach dem Tuning geholt). */
const ZURUECK = new Set(['nintendo switch', 'lego technic', 'staubsauger', 'gartenstuhl'])
const NEU = new Set(['fahrrad', 'waschmaschine', 'fernseher', 'bohrmaschine'])
const N = 6

function messe(q) {
  const items = snap[q].map((it, i) => ({ ...it, _i: i }))
  const kein = new Set(lab[q])
  const gut = (liste) => liste.slice(0, N).filter((it) => !kein.has(it._i)).length
  const nach = A.ordne(items, q)
  return { vor: gut(items), nach: gut(nach), erstVor: !kein.has(items[0]._i), erstNach: !kein.has(nach[0]._i) }
}

let schlechter = false
const gruppeVon = (q) => (NEU.has(q) ? 'Neu (nach dem Tuning geholt)' : ZURUECK.has(q) ? 'Zurückgehalten' : 'Entwicklung')
for (const gruppe of ['Entwicklung', 'Zurückgehalten', 'Neu (nach dem Tuning geholt)']) {
  let sv = 0, sn = 0, n = 0
  console.log(`\n── ${gruppe} ──  (echte Produkte unter den ersten ${N})`)
  for (const q of Object.keys(snap)) {
    if (q === 'velo') continue
    if (gruppeVon(q) !== gruppe) continue
    const r = messe(q)
    sv += r.vor; sn += r.nach; n++
    if (r.nach < r.vor) schlechter = true
    console.log(`  ${q.padEnd(16)} vorher ${r.vor}/${N}  nachher ${r.nach}/${N}${r.nach < r.vor ? '  ❌ schlechter' : ''}`)
  }
  console.log(`  ${'Summe'.padEnd(16)} vorher ${(100 * sv / (n * N)).toFixed(0)} %   nachher ${(100 * sn / (n * N)).toFixed(0)} %`)
}

/* Typischer Preis: nur zeigen, wenn er stimmt. Fuer „fahrrad" (viel unerkanntes Zubehoer) darf
   keiner erscheinen; wo er erscheint, muss er in der Spanne der echten Produkte liegen. */
console.log('\n── Typischer Preis ──')
for (const q of Object.keys(snap)) {
  const kein = new Set(lab[q])
  const sp = A.spanne(A.ordne(snap[q].map((it, i) => ({ ...it, _i: i })), q))
  const echt = snap[q].filter((_, i) => !kein.has(i)).map((it) => A.preis(it.price)).sort((a, b) => a - b)
  const m = echt[echt.length >> 1]
  const ok = !sp || (m >= sp.tief * 0.6 && m <= sp.hoch * 1.6)
  if (!ok) schlechter = true
  console.log(`  ${q.padEnd(16)} ${sp ? `${sp.tief}–${sp.hoch} (Mitte ${sp.mitte})` : 'keiner angezeigt'.padEnd(20)}  echter Median ${m}${ok ? '' : '  ❌ irreführend'}`)
}

/* „velo" ist kein Ranking-, sondern ein Wortproblem: ebay.de kennt es nicht. */
const b = A.begriff('velo')
console.log(`\n  velo: 2/50 Treffer sind Velos → wird als „${b.q}" gesucht (begriff())`)
process.exit(schlechter ? 1 : 0)
