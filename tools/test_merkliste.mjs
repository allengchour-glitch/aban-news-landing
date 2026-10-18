/* test_merkliste.mjs — prueft js/merkliste.js (Merkliste / Favoriten) ohne Browser.
 * Gegenprobe eingebaut: die alte Fassung (reine ID-Liste) muss an den Faellen scheitern,
 * die das neue Modul loest — sonst misst der Test nichts.
 *   node tools/test_merkliste.mjs
 */
import fs from 'node:fs'
import vm from 'node:vm'

const quelle = fs.readFileSync(new URL('../js/merkliste.js', import.meta.url), 'utf8')

function neuesModul () {
  const speicher = new Map()
  const localStorage = {
    getItem: (k) => (speicher.has(k) ? speicher.get(k) : null),
    setItem: (k, v) => speicher.set(k, String(v)),
    removeItem: (k) => speicher.delete(k)
  }
  const ctx = { localStorage, window: { addEventListener () {} } }
  ctx.window.localStorage = localStorage
  vm.createContext(ctx)
  vm.runInContext(quelle, ctx)
  return { M: ctx.window.AbanMerk, speicher }
}

let ok = 0, fehl = 0
const pruef = (name, bedingung, detail) => {
  console.log((bedingung ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  bedingung ? ok++ : fehl++
}

const A = { id: 'demo-1', titel: 'Sofa', preis: "CHF 250.–", ort: 'Bern', kat: 'Möbel' }
const B = { id: 'demo-2', titel: 'Velo', preis: 'CHF 400.–', ort: 'Zürich', kat: 'Fahrrad' }

console.log('\n— Grundfunktionen —')
{
  const { M } = neuesModul()
  pruef('leere Liste am Anfang', M.count() === 0 && M.list().length === 0)
  pruef('merken gibt true', M.toggle(A) === true)
  pruef('danach gemerkt', M.has('demo-1') && M.count() === 1)
  pruef('nochmal tippen entfernt (gibt false)', M.toggle(A) === false && M.count() === 0)
  M.toggle(A); M.toggle(B)
  pruef('zwei Eintraege, Reihenfolge stabil', M.list().map((x) => x.id).join(',') === 'demo-1,demo-2')
  M.remove('demo-1')
  pruef('remove loescht genau einen', M.count() === 1 && M.has('demo-2'))
  pruef('Zahl-ID wird zu Text', (() => { const { M: m } = neuesModul(); m.toggle({ id: 7, titel: 'x' }); return m.has('7') && m.has(7) })())
  pruef('ohne id wird nichts gespeichert', (() => { const { M: m } = neuesModul(); return m.toggle({ titel: 'x' }) === false && m.count() === 0 })())
}

console.log('\n— Der eigentliche Fehler: Merkliste darf nicht am Filter haengen —')
{
  // Vorher hielt die Seite nur IDs und zeigte als "Merkliste" die gefilterte Trefferliste.
  // Lag ein gemerktes Inserat nicht in der Antwort, war es unsichtbar — obwohl gemerkt.
  const { M } = neuesModul()
  M.toggle(A)
  const geladen = [B]                                  // andere Kategorie geladen
  const altModus = geladen.filter((it) => M.has(it.id)) // so rechnete die alte Seite
  const neuModus = M.list()                             // so rechnet die neue
  pruef('alte Rechnung verliert den Eintrag (Gegenprobe)', altModus.length === 0)
  pruef('Merkliste haelt ihn mit Titel und Preis', neuModus.length === 1 && neuModus[0].titel === 'Sofa' && neuModus[0].preis === "CHF 250.–")
  pruef('Beschreibung wird gekappt', (() => {
    const { M: m } = neuesModul(); m.toggle({ id: 'x', beschreibung: 'y'.repeat(900) })
    return m.list()[0].beschreibung.length === 200
  })())
  pruef('kein fremdes Feld wandert mit', (() => {
    const { M: m } = neuesModul(); m.toggle({ id: 'x', geheim: 'nein', titel: 'ja' })
    return m.list()[0].geheim === undefined && m.list()[0].titel === 'ja'
  })())
}

console.log('\n— Altbestand (Liste war mal reine IDs) —')
{
  const { M, speicher } = neuesModul()
  speicher.set('abanMerk', JSON.stringify(['demo-1', 'demo-2']))
  pruef('alte ID-Liste wird gelesen', M.count() === 2 && M.has('demo-1'))
  pruef('alte Eintraege sind entfernbar', (() => { M.remove('demo-1'); return M.count() === 1 && M.has('demo-2') })())
}

console.log('\n— Leeren und Rueckgaengig —')
{
  const { M } = neuesModul()
  M.toggle(A); M.toggle(B)
  const weg = M.clear()
  pruef('clear leert', M.count() === 0)
  pruef('clear gibt die Eintraege zurueck', weg.length === 2 && weg[0].id === 'demo-1')
  M.restore(weg)
  pruef('restore stellt sie her', M.count() === 2 && M.list()[1].titel === 'Velo')
  pruef('restore([]) macht nichts kaputt', (() => { M.restore([]); return M.count() === 2 })())
}

console.log('\n— Deckel und kaputter Speicher —')
{
  const { M } = neuesModul()
  for (let i = 0; i < 130; i++) M.toggle({ id: 'p' + i, titel: 'T' + i })
  pruef('hoechstens 100 Eintraege', M.count() === 100, M.count() + ' Eintraege')
  pruef('die neuesten bleiben', M.has('p129') && !M.has('p0'))

  const ctx = { localStorage: { getItem: () => '{kaputt', setItem () { throw new Error('voll') }, removeItem () {} }, window: { addEventListener () {} } }
  vm.createContext(ctx); vm.runInContext(quelle, ctx)
  pruef('unlesbarer Speicher gibt leere Liste statt Absturz', ctx.window.AbanMerk.count() === 0)
  pruef('voller Speicher wirft nicht', (() => { try { ctx.window.AbanMerk.toggle(A); return true } catch (e) { return false } })())
}

console.log('\n— onChange —')
{
  const { M } = neuesModul()
  let n = 0
  M.onChange(() => n++)
  M.toggle(A); M.toggle(A); M.clear()
  pruef('feuert bei merken, entfernen und leeren', n === 3, 'n=' + n)
}

console.log('\n' + (fehl ? '❌ ' : '✅ ') + ok + ' ok, ' + fehl + ' fehlgeschlagen\n')
process.exit(fehl ? 1 : 0)
