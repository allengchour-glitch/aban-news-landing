/* test_angebote.mjs — prueft die Angebote-Suche im echten Browser (Handy-Format).
 * eBay-Antworten kommen aus tools/fixtures/angebote_snapshot.json (echte Treffer, fest), der
 * Wechselkurs ist fest — so ist der Test wiederholbar. Prueft: CHF-Preis, Herkunft, kein falsches
 * Demo-Schild, Kaufberater, „velo" -> „fahrrad", kein irrefuehrender Preis, und dass die Seite
 * ohne js/angebote-plus.js wie frueher weiterlaeuft.
 *   npm i --no-save playwright   (einmal)   ·   node tools/test_angebote.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
const snap = JSON.parse(fs.readFileSync('tools/fixtures/angebote_snapshot.json', 'utf8')).abfragen
const srv = spawn('python3', ['-m', 'http.server', '8133'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1200))
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const fehler = []; p.on('pageerror', (e) => fehler.push(String(e)))
await p.route('**/api/ebay**', (route) => {
  const q = new URL(route.request().url()).searchParams.get('q')
  const items = (snap[q] || snap['fahrrad']).map((it, i) => ({ ...it, img: '', url: 'https://www.ebay.de/itm/' + i }))
  route.fulfill({ contentType: 'application/json', body: JSON.stringify({ demo: false, currency: 'EUR', items }) })
})
await p.route('**/api.frankfurter.dev/**', (r) => r.fulfill({ contentType: 'application/json', body: '{"base":"EUR","date":"2026-09-23","rates":{"CHF":0.939}}' }))
let ok = 0, fehl = 0
const check = (n, g, d) => { console.log((g ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : '')); g ? ok++ : fehl++ }
const lies = () => p.evaluate(() => ({
  plus: [...document.querySelectorAll('#plus > div')].map((d) => d.className + ':' + d.innerText.replace(/\s+/g, ' ')),
  erst: (document.querySelector('#grid .item .t') || {}).innerText || '',
  chf: (document.querySelector('#grid .item .chf') || {}).innerText || '',
  her: (document.querySelector('#grid .item .her') || {}).innerText || '',
  badge: !!document.querySelector('#badge') && getComputedStyle(document.querySelector('#badge')).display !== 'none',
}))
for (const [seite, q] of [['angebote-suche.html', 'velo'], ['fahrrad-angebote.html', 'velo'], ['gaming-angebote.html', 'nintendo switch'], ['angebote-suche.html', 'sofa']]) {
  await p.goto(`http://127.0.0.1:8133/${seite}?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
  const r = await lies()
  console.log(`\n${seite} „${q}"`)
  check('CHF-Preis am ersten Angebot', /≈ CHF \d/.test(r.chf), r.chf)
  check('Herkunft am ersten Angebot', /Versand aus/.test(r.her), r.her)
  check('kein falsches Demo-Schild', !r.badge)
  const kb = r.plus.find((x) => x.startsWith('kb:'))
  check('Kaufberater-Karte', !!kb, kb ? kb.slice(3, 70) : 'keine')
  if (q === 'velo') {
    const als = r.plus.find((x) => x.startsWith('als:')) || ''
    check('„velo" als „fahrrad" gesucht und erklärt', /fahrrad/.test(als), als.slice(4, 90))
    const hatPortale = await p.$('#portals')
    check('Portal-Satz nur, wo es Portale gibt', /Portale unten/.test(als) === !!hatPortale, hatPortale ? 'mit Portalen' : 'ohne Portale')
    check('kein irreführender „typischer Preis" bei velo', !r.plus.some((x) => x.startsWith('sp:')))
  }
  if (q === 'sofa') check('typischer Preis bei Sofa', r.plus.some((x) => x.startsWith('sp:')), (r.plus.find((x) => x.startsWith('sp:')) || '').slice(3, 90))
}
/* Ohne Modul (Netzfehler) muss die Seite wie vorher laufen */
await p.route('**/js/angebote-plus.js', (r) => r.abort())
await p.goto('http://127.0.0.1:8133/angebote-suche.html?q=sofa', { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
const n = await p.evaluate(() => document.querySelectorAll('#grid .item').length)
check('ohne angebote-plus.js: Seite zeigt trotzdem Angebote', n === 50, n + ' Angebote')
check('0 JS-Fehler', fehler.length === 0, fehler.join(' | '))
console.log(`\n${fehl ? '💥' : '🎉'} ${ok} ok, ${fehl} Fehler`)
await b.close(); srv.kill(); process.exit(fehl ? 1 : 0)
