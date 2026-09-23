/* test_ki_news.mjs — prueft den Block „KI-News heute" auf der Startseite im Browser (Handy).
 * Nimmt die echte data/ki-news.json, verschiebt nur den Zeitstempel: frisch -> „Heute",
 * 5 Tage alt -> „Stand …" + Hinweis „ausgefallen" (Gegenprobe), leer -> Block bleibt weg.
 * Prueft ausserdem, dass die Maerkte nicht „Live" heissen, wenn ihre Daten alt sind.
 *   npm i --no-save playwright   (einmal)   ·   node tools/test_ki_news.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
const srv = spawn('python3', ['-m', 'http.server', '8134'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1200))
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const fehler = []; p.on('pageerror', (e) => fehler.push(String(e)))
const echt = JSON.parse(fs.readFileSync('data/ki-news.json', 'utf8'))
let ok = 0, fehl = 0; const check = (n, g, d) => { console.log((g ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : '')); g ? ok++ : fehl++ }
async function lauf(daten) {
  await p.unrouteAll(); await p.route('**/data/ki-news.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(daten) }))
  await p.goto('http://127.0.0.1:8134/index.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  return p.evaluate(() => ({ sicht: !document.getElementById('kiNews').hidden, eb: document.getElementById('kiNewsEyebrow').textContent,
    sub: document.getElementById('kiNewsSub').innerText, n: document.querySelectorAll('#kiNewsListe li').length,
    erst: (document.querySelector('#kiNewsListe li') || {}).innerText || '', link: (document.querySelector('#kiNewsListe a.t') || {}).href || '',
    markt: (document.querySelector('#marketsPreview .eyebrow') || {}).textContent }))
}
const frisch = { ...echt, stand: new Date(Date.now() - 3 * 36e5).toISOString() }
let r = await lauf(frisch)
console.log('frisch (vor 3 Std.)')
check('Block sichtbar', r.sicht); check('„Heute" im Kopf', r.eb.startsWith('Heute'), r.eb)
check(echt.items.length + ' Meldungen', r.n === echt.items.length, String(r.n)); check('kein Veraltet-Hinweis', !/ausgefallen/.test(r.sub))
check('Link zur Originalquelle', r.link.startsWith('https://') && !r.link.includes('abannews'), r.link.slice(0, 60))
check('Märkte: „Live" nur bei frischen Daten', /^Live/.test(r.markt) === (Date.now() - new Date(JSON.parse(fs.readFileSync('data/markets-mini.json', 'utf8')).last_updated + 'T12:00:00Z') <= 2 * 864e5), r.markt)
r = await lauf({ ...echt, stand: new Date(Date.now() - 5 * 864e5).toISOString() })
console.log('GEGENPROBE: veraltet (vor 5 Tagen)')
check('Kopf sagt „Stand …" statt „Heute"', r.eb.startsWith('Stand'), r.eb); check('Hinweis „ausgefallen"', /ausgefallen/.test(r.sub))
r = await lauf({ stand: new Date().toISOString(), items: [] })
console.log('leer'); check('leere Liste → Block bleibt versteckt', !r.sicht)
check('0 JS-Fehler', fehler.length === 0, fehler.join(' | '))
console.log(`\n${fehl ? '💥' : '🎉'} ${ok} ok, ${fehl} Fehler`)
await b.close(); srv.kill(); process.exit(fehl ? 1 : 0)
