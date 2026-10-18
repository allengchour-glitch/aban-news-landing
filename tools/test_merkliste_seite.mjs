/* test_merkliste_seite.mjs — prueft die Merkliste auf /inserate.html im echten Browser (Handy-Format).
 * Die Inserate kommen aus einer festen Antwort, damit der Test wiederholbar ist.
 *   npm i --no-save playwright   (einmal)   ·   node tools/test_merkliste_seite.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const ITEMS = [
  { id: 'a1', kat: 'Möbel', titel: 'Sofa grau', preis: "CHF 250.–", ort: 'Bern', plz: '3000', zustand: 'Gebraucht', typ: 'Angebot', beschreibung: 'Dreisitzer, gepflegt.' },
  { id: 'a2', kat: 'Fahrrad', titel: 'Velo 28 Zoll', preis: "CHF 400.–", ort: 'Zürich', plz: '8000', zustand: 'Wie neu', typ: 'Angebot', beschreibung: 'Wenig gefahren.' },
  { id: 'a3', kat: 'Handy', titel: 'Smartphone 128 GB', preis: "CHF 180.–", ort: 'Basel', plz: '4051', zustand: 'Gebraucht', typ: 'Angebot', beschreibung: 'Mit Ladekabel.' }
]

const srv = spawn('python3', ['-m', 'http.server', '8141'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1200))
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const fehler = []
p.on('pageerror', (e) => fehler.push(String(e)))
await p.route('**/api/inserate-list**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ demo: false, items: ITEMS }) }))
await p.route('**/api/ebay**', (r) => r.fulfill({ contentType: 'application/json', body: '{"demo":true,"items":[]}' }))
await p.route('**/api/luxestyle**', (r) => r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }))

let ok = 0, fehl = 0
const pruef = (name, bedingung, detail) => {
  console.log((bedingung ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  bedingung ? ok++ : fehl++
}
const auf = async () => {
  await p.goto('http://localhost:8141/inserate.html', { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('#grid .card .heart')
}
const herz = (id) => p.locator('.card[data-id="' + id + '"] .heart')
const titel = () => p.locator('#grid .card h3').allInnerTexts()

console.log('\n— Favoriten-Knopf —')
await auf()
pruef('Modul ist geladen', await p.evaluate(() => !!window.AbanMerk))
pruef('Leiste ist zuerst versteckt', await p.locator('#selbar').isHidden())
pruef('Knopf sagt seinen Zustand (aria-pressed=false)', (await herz('a1').getAttribute('aria-pressed')) === 'false')
pruef('Beschriftung ist eine Handlung, keine Floskel', /hinzuf/i.test(await herz('a1').getAttribute('aria-label')))
{
  const box = await herz('a1').boundingBox()
  pruef('Knopf ist gross genug zum Antippen (≥38px)', box.width >= 38 && box.height >= 38, Math.round(box.width) + '×' + Math.round(box.height) + 'px')
  const treffer = await herz('a1').evaluate((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el, '::after')
    return { w: parseFloat(cs.width) || r.width, h: parseFloat(cs.height) || r.height }
  })
  pruef('Trefferflaeche erreicht 44px', treffer.w >= 44 && treffer.h >= 44, Math.round(treffer.w) + '×' + Math.round(treffer.h) + 'px')
}
await herz('a1').click()
pruef('nach dem Tippen gemerkt', (await herz('a1').getAttribute('aria-pressed')) === 'true')
pruef('Beschriftung dreht auf "entfernen"', /entfernen/i.test(await herz('a1').getAttribute('aria-label')))
pruef('Leiste zeigt 1 gemerkt', (await p.locator('#selcnt').innerText()) === '1' && await p.locator('#selbar').isVisible())
pruef('Tastatur-Fokus bleibt auf dem Knopf', await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('heart')))
pruef('Seite deckt die Leiste nicht ab (Platz unten)', await p.evaluate(() => document.body.classList.contains('has-merk')))
pruef('nochmal tippen entfernt', (await herz('a1').click(), (await herz('a1').getAttribute('aria-pressed')) === 'false'))
pruef('Leiste wieder weg', await p.locator('#selbar').isHidden())

console.log('\n— Der Fehler von vorher: Filter verschluckte die Merkliste —')
await auf()
await herz('a1').click()   // Sofa (Möbel) merken
await herz('a3').click()   // Smartphone (Handy) merken
await p.locator('#q').fill('velo')
await p.waitForTimeout(400)
pruef('Suche filtert die Trefferliste', (await titel()).join('|') === 'Velo 28 Zoll')
await p.locator('#selShow').click()
{
  const t = await titel()
  pruef('Merkliste zeigt beide gemerkten trotz Suche "velo"', t.length === 2 && t.indexOf('Sofa grau') >= 0 && t.indexOf('Smartphone 128 GB') >= 0, t.join(' | '))
  pruef('Zaehler sagt "gemerkt"', /2 gemerkt/.test(await p.locator('#cnt').innerText()))
  pruef('Knopf fuehrt zurueck', /Alle Inserate/.test(await p.locator('#selShow').innerText()))
}
await herz('a1').click()
await p.waitForTimeout(300)
pruef('Entfernen in der Merkliste nimmt nur diese Karte weg', (await titel()).join('|') === 'Smartphone 128 GB')
await p.locator('#selShow').click()
pruef('zurueck zur gefilterten Suche', (await titel()).join('|') === 'Velo 28 Zoll')

console.log('\n— Gemerktes ueberlebt das Neuladen —')
await auf()
pruef('Smartphone ist nach dem Neuladen noch gemerkt', (await herz('a3').getAttribute('aria-pressed')) === 'true')
pruef('Leiste zeigt den Stand', (await p.locator('#selcnt').innerText()) === '1')

console.log('\n— Leeren mit Rueckgaengig —')
await herz('a1').click()
await p.locator('#selClear').click()
pruef('Liste ist leer', (await p.evaluate(() => window.AbanMerk.count())) === 0)
pruef('"Rueckgaengig" wird angeboten', await p.locator('#selUndo').isVisible())
await p.locator('#selUndo').click()
pruef('Rueckgaengig stellt beide her', (await p.evaluate(() => window.AbanMerk.count())) === 2)
pruef('Herzen sind wieder gefuellt', (await herz('a1').getAttribute('aria-pressed')) === 'true' && (await herz('a3').getAttribute('aria-pressed')) === 'true')

console.log('\n— Leere Merkliste —')
await p.locator('#selClear').click()
await p.evaluate(() => { localStorage.removeItem('abanMerk') })
await auf()
await herz('a2').click()
await p.locator('#selShow').click()
await herz('a2').click()
await p.waitForTimeout(300)
pruef('leere Merkliste erklaert sich', /Noch nichts gemerkt/.test(await p.locator('#status').innerText()))

pruef('keine Skriptfehler auf der Seite', fehler.length === 0, fehler.join(' / '))
console.log('\n' + (fehl ? '❌ ' : '✅ ') + ok + ' ok, ' + fehl + ' fehlgeschlagen\n')
await b.close(); srv.kill()
process.exit(fehl ? 1 : 0)
