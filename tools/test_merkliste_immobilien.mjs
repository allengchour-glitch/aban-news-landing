/* test_merkliste_immobilien.mjs — prueft die Merkliste auf /immobilien.html im Browser (Handy-Format).
 * Wichtigster Punkt: die Merkliste ist dieselbe wie auf /inserate.html (eine Liste fuer den
 * ganzen Marktplatz), und sie haengt auch hier nicht am Filter.
 *   node tools/test_merkliste_immobilien.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const ITEMS = [
  { id: 'i1', kat: 'Immobilien', titel: '3.5-Zimmer-Wohnung Bern', preis: "CHF 1'850.–", ort: 'Bern', plz: '3000', typ: 'Angebot', beschreibung: 'Hell, Balkon, Nähe Bahnhof.' },
  { id: 'i2', kat: 'Immobilien', titel: 'WG-Zimmer Zürich', preis: "CHF 780.–", ort: 'Zürich', plz: '8000', typ: 'Angebot', beschreibung: 'Möbliert, ab sofort.' },
  { id: 'i3', kat: 'Immobilien', titel: 'Einfamilienhaus Aarau', preis: "CHF 980'000.–", ort: 'Aarau', plz: '5000', typ: 'Angebot', beschreibung: 'Garten, Garage, 6 Zimmer.' }
]
const INSERATE = [{ id: 'a1', kat: 'Möbel', titel: 'Sofa grau', preis: "CHF 250.–", ort: 'Bern', plz: '3000', typ: 'Angebot', beschreibung: 'Dreisitzer.' }]

const srv = spawn('python3', ['-m', 'http.server', '8143'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1200))
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const fehler = []
p.on('pageerror', (e) => fehler.push(String(e)))
await p.route('**/api/inserate-list**', (r) => {
  const kat = new URL(r.request().url()).searchParams.get('kat') || ''
  const items = kat === 'Immobilien' ? ITEMS : INSERATE
  r.fulfill({ contentType: 'application/json', body: JSON.stringify({ demo: false, items }) })
})
await p.route('**/api/ebay**', (r) => r.fulfill({ contentType: 'application/json', body: '{"demo":true,"items":[]}' }))
await p.route('**/api/luxestyle**', (r) => r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }))

let ok = 0, fehl = 0
const pruef = (name, bedingung, detail) => {
  console.log((bedingung ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  bedingung ? ok++ : fehl++
}
const auf = async (seite) => {
  await p.goto('http://localhost:8143/' + seite, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('#grid .card .lxm-herz')
}
const herz = (id) => p.locator('.card[data-id="' + id + '"] .lxm-herz')
const titel = () => p.locator('#grid .card h3').allInnerTexts()

console.log('\n— Favoriten-Knopf auf /immobilien.html —')
await auf('immobilien.html')
pruef('jede Karte hat ein Herz', (await p.locator('#grid .card .lxm-herz').count()) === 3)
pruef('Leiste ist zuerst versteckt', await p.locator('#lxm-bar').isHidden())
pruef('Knopf sagt seinen Zustand', (await herz('i1').getAttribute('aria-pressed')) === 'false')
{
  const box = await herz('i1').boundingBox()
  pruef('Knopf ist gross genug zum Antippen', box.width >= 38 && box.height >= 38, Math.round(box.width) + '×' + Math.round(box.height) + 'px')
}
await herz('i1').click()
pruef('nach dem Tippen gemerkt', (await herz('i1').getAttribute('aria-pressed')) === 'true')
pruef('Leiste zeigt 1 gemerkt', (await p.locator('#lxm-bar .lxm-zahl').innerText()) === '1')
pruef('Titel der Karte bleibt lesbar', (await titel())[0] === '3.5-Zimmer-Wohnung Bern')

console.log('\n— Merkliste haengt auch hier nicht am Filter —')
await herz('i3').click()
await p.locator('#loc').fill('Zürich')   // Ortsfilter greift im Browser, ohne Neuladen
await p.waitForTimeout(500)
pruef('Ortsfilter engt die Trefferliste ein', (await titel()).join('|') === 'WG-Zimmer Zürich', (await titel()).join('|'))
await p.locator('#lxm-bar .lxm-zeig').click()
{
  const t = await titel()
  pruef('Merkliste zeigt beide gemerkten trotz Ortsfilter', t.length === 2 && t.indexOf('3.5-Zimmer-Wohnung Bern') >= 0 && t.indexOf('Einfamilienhaus Aarau') >= 0, t.join(' | '))
  pruef('Zaehler sagt "gemerkt"', /2 gemerkt/.test(await p.locator('#cnt').innerText()))
}
await herz('i1').click()
await p.waitForTimeout(300)
pruef('Entfernen nimmt nur diese Karte weg', (await titel()).join('|') === 'Einfamilienhaus Aarau')

console.log('\n— Eine Merkliste fuer den ganzen Marktplatz —')
await auf('inserate.html')
pruef('das Haus aus Immobilien ist auf /inserate.html gemerkt', (await p.evaluate(() => window.AbanMerk.count())) === 1)
await p.locator('.card[data-id="a1"] .lxm-herz').click()
await p.locator('#lxm-bar .lxm-zeig').click()
{
  const t = await titel()
  pruef('beide Seiten teilen sich die Liste', t.length === 2 && t.indexOf('Einfamilienhaus Aarau') >= 0 && t.indexOf('Sofa grau') >= 0, t.join(' | '))
}
await auf('immobilien.html')
await p.locator('#lxm-bar .lxm-zeig').click()
pruef('und zurueck auf /immobilien.html genauso', (await titel()).length === 2)

console.log('\n— Leeren und Rueckgaengig —')
await p.locator('#lxm-bar .lxm-leer').click()
pruef('Liste ist leer', (await p.evaluate(() => window.AbanMerk.count())) === 0)
await p.locator('#lxm-bar .lxm-undo').click()
pruef('Rueckgaengig stellt beide her', (await p.evaluate(() => window.AbanMerk.count())) === 2)

pruef('keine Skriptfehler auf der Seite', fehler.length === 0, fehler.join(' / '))
console.log('\n' + (fehl ? '❌ ' : '✅ ') + ok + ' ok, ' + fehl + ' fehlgeschlagen\n')
await b.close(); srv.kill()
process.exit(fehl ? 1 : 0)
