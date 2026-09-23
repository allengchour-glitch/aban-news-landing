/* such_qualitaet.mjs — misst, ob die Seitensuche findet, was Leute wirklich tippen.
 *
 * Fuehrt das UNVERAENDERTE <script> aus suchmaschine.html in Node aus (kleines Schein-DOM,
 * kein Browser) — getestet wird also genau der Code, der live laeuft, nicht eine Kopie.
 * Die Anfragen stehen in tools/such_fragen.json: so, wie Menschen tippen („zügeln",
 * „natel", „was bleibt vom lohn"), nicht wie die Seitentitel heissen.
 *
 *   node tools/such_qualitaet.mjs            Bericht + Exit 1, wenn unter der Schwelle
 *   node tools/such_qualitaet.mjs --alle     auch die bestandenen Anfragen zeigen
 *   node tools/such_qualitaet.mjs --datei tools/such_fragen_kontrolle.json   anderes Set
 *   node tools/such_qualitaet.mjs --seite alt.html                          andere Suchseite
 *
 * Bestanden = eine der erwarteten Seiten steht unter den ersten 3 Treffern.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCHWELLE = 0.95   // Anteil bestandener Anfragen, darunter schlaegt CI fehl
const alle = process.argv.includes('--alle')
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }

const html = fs.readFileSync(path.resolve(ROOT, arg('--seite', 'suchmaschine.html')), 'utf8')
const skripte = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const code = skripte.find((s) => s.includes('site-index.json'))
if (!code) { console.error('Such-Skript in suchmaschine.html nicht gefunden'); process.exit(2) }
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site-index.json'), 'utf8'))
const bekannt = new Set(index.map((it) => it.u))

/* --- Schein-DOM: nur was das Skript anfasst --- */
const el = () => ({ innerHTML: '', textContent: '', hidden: false, value: '', dataset: {}, _h: {},
  addEventListener(t, f) { this._h[t] = f }, querySelectorAll: () => [] })
const E = { '#q': el(), '#list': el(), '#cnt': el(), '#chips': el(), '#total': el(), '#f': el() }
let geladen
const ctx = {
  document: { querySelector: (s) => E[s] || null },
  location: { search: '', pathname: '/suchmaschine.html' },
  history: { replaceState() {} },
  URLSearchParams,
  setTimeout: (f) => f(), clearTimeout() {},
  fetch: () => ({ then: (f) => { const r = f({ json: () => index }); return { then: (g) => { geladen = g(r); return { catch() {} } } } } }),
}
vm.runInNewContext(code, ctx)

function suche(q) {
  E['#q'].value = q
  E['#q']._h.input()
  return [...E['#list'].innerHTML.matchAll(/class="res" href="([^"]+)"/g)].map((m) => m[1])
}

const { fragen } = JSON.parse(fs.readFileSync(path.resolve(ROOT, arg('--datei', 'tools/such_fragen.json')), 'utf8'))
let ok = 0
const durch = []
for (const [q, erwartet] of fragen) {
  for (const u of erwartet) {
    if (!u.endsWith('/') && !bekannt.has(u)) { console.error(`⚠ „${q}": erwartete Seite ${u} steht nicht im Index — Testzeile korrigieren`); process.exit(2) }
  }
  const treffer = suche(q)
  const top = treffer.slice(0, 3)
  const gut = top.some((u) => erwartet.some((e) => (e.endsWith('/') ? u.startsWith(e) : u === e)))
  if (gut) ok++
  else durch.push([q, erwartet[0], treffer.length ? top.join('  ') : '— 0 Treffer —'])
  if (alle && gut) console.log(`  ✅ ${q}`)
}

const anteil = ok / fragen.length
for (const [q, soll, ist] of durch) console.log(`  ❌ „${q}"  soll ${soll}\n        ist ${ist}`)
console.log(`\nSuch-Qualität: ${ok}/${fragen.length} = ${(anteil * 100).toFixed(1)} % richtige Seite unter den ersten 3 (Schwelle ${SCHWELLE * 100} %)`)
process.exit(anteil >= SCHWELLE ? 0 : 1)
