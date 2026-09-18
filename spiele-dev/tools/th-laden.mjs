/* th-laden.mjs — Wie lange dauert der Start, und wann reagiert das Spiel wieder?
 *
 * WARUM DIESES WERKZEUG. Der User fragte: „das spiel laedt am anfang lange? eine
 * ladebildschirm bis alles geladen ist?" Eine ehrliche Antwort braucht zwei Zahlen,
 * und nur eine davon ist die Ladezeit:
 *
 *   1. WIEVIEL kommt herein und WANN — am Netz gemessen, nicht im Spiel. Eine erste
 *      Sonde, die `window._glbVorlage` umwickelte, meldete ueber vier Minuten hinweg
 *      NULL Modelle. Das kann nicht sein: ohne Modelle gaebe es keine Stadt. Am Netz
 *      waren es 340 Modelle und 157 MB. Lehre: das Messgeraet war kaputt, nicht die
 *      Welt — und die Gegenprobe („0 Modelle sind unmoeglich") hat es entlarvt.
 *
 *   2. OB DER HAUPTFADEN BLOCKIERT. Das ist die Zahl, die der Spieler wirklich spuert.
 *      Beim ersten Netz-Lauf brauchte ein Klick auf „Solo bauen" 34 Sekunden, bis er
 *      ankam — nicht weil der Knopf fehlte, sondern weil der Hauptfaden mit dem
 *      Auspacken von 220 Modellen beschaeftigt war. Eine Ladeanzeige, die in dieser
 *      Zeit selbst einfriert, waere nichts wert.
 *
 * GEGENPROBE IST EINGEBAUT (Runbook-Lehre 1). Das Werkzeug blockiert den Hauptfaden
 * absichtlich zwei Sekunden und prueft, ob der Stau-Messer das auch meldet. Schlaegt
 * die Gegenprobe nicht an, misst es nichts und sagt das, statt „alles gut" zu melden.
 *
 * Aufruf:  node spiele-dev/tools/th-laden.mjs [pc|handy]
 */
import { chromium } from 'playwright'
import { serverStarten, PORT, CHROMIUM, REPO } from './th-lib.mjs'

const FORMAT = (process.argv[2] || 'handy') === 'pc'
  ? { name: 'PC 1440', viewport: { width: 1440, height: 900 }, screen: { width: 1440, height: 900 } }
  : { name: 'Handy 390', viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }

/* Der Stau-Messer laeuft IM Spiel und wird vor jedem Skript eingesetzt. Ein Takt alle
   50 ms; wird er spaeter gerufen, war der Hauptfaden so lange blockiert. */
const STAU = `(function(){var letzte=performance.now(),max=0,summe=0,anz=0;
  setInterval(function(){var n=performance.now(),d=n-letzte-50;letzte=n;
    if(d>max)max=d; if(d>100){summe+=d;anz++;}},50);
  window.__stau=function(){return {max:Math.round(max),summe:Math.round(summe),anz:anz};};
  window.__stauNull=function(){max=0;summe=0;anz=0;};})()`

serverStarten()
const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage({ viewport: FORMAT.viewport, screen: FORMAT.screen })
await page.addInitScript(STAU)

const t0 = Date.now()
const netz = []
page.on('response', async (r) => {
  const u = r.url(); if (!u.includes(`:${PORT}/`)) return
  let n = 0; try { n = (await r.body()).length } catch (e) {}
  netz.push({ t: Date.now() - t0, u: u.split(`:${PORT}/`)[1], n })
})
const jsFehler = []
page.on('pageerror', (e) => jsFehler.push(String(e).slice(0, 160)))

await page.goto(`http://127.0.0.1:${PORT}/traumhaus.html`, { waitUntil: 'domcontentloaded', timeout: 60000 })
const tDom = Date.now() - t0

/* ---- 1. Wie lange wartet ein Fingertipp auf den Startknopf? ----
   Kein Playwright-Klick mit seiner eigenen Wartelogik, sondern: wir bitten die Seite,
   etwas Winziges zu tun. Wie lange sie dafuer braucht, IST die Blockade. */
await page.waitForTimeout(2000)
const tTippAb = Date.now()
await page.evaluate(() => 1)
const tippWartet = Date.now() - tTippAb

/* ---- 2. Ladeanzeige: gibt es ueberhaupt eine, und bewegt sie sich? ---- */
const anzeige = await page.evaluate(() => {
  const el = document.getElementById('ladeBalken') || document.getElementById('ladeAnzeige')
  if (!el) return { da: false }
  const s = getComputedStyle(el)
  return { da: true, sichtbar: s.display !== 'none' && s.visibility !== 'hidden', text: (el.innerText || '').slice(0, 60) }
})

/* ---- 3. Jetzt wirklich starten und schauen, wann es ruhig wird ---- */
const tKlickAb = Date.now()
await page.evaluate(() => { const b = document.getElementById('soloBtn'); if (b) b.click() })
const klickWartet = Date.now() - tKlickAb
await page.waitForTimeout(600)
await page.evaluate(() => { const b = document.querySelector('button[data-m="klassisch"]'); if (b) b.click() })
await page.waitForTimeout(1500)
await page.evaluate(() => { const b = document.getElementById('introOk'); if (b) b.click() })

let offenNull = null
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(2000)
  const offen = await page.evaluate(() => window._ladeOffen || 0)
  if (offen === 0 && netz.length > 50) { offenNull = Date.now() - t0; break }
}
const stau = await page.evaluate(() => window.__stau())

/* ---- 4. GEGENPROBE: Hauptfaden absichtlich 2 s blockieren ---- */
await page.evaluate(() => window.__stauNull())
await page.evaluate(() => { const bis = performance.now() + 2000; while (performance.now() < bis) {} })
await page.waitForTimeout(400)
const probe = await page.evaluate(() => window.__stau())

const glb = netz.filter(d => d.u.endsWith('.glb'))
const mb = (a) => (a.reduce((s, d) => s + d.n, 0) / 1048576).toFixed(1)
const s = glb.map(d => d.t).sort((a, b) => a - b)
const q = (p) => s.length ? (s[Math.floor((s.length - 1) * p)] / 1000).toFixed(1) : '—'

console.log(`\n⏱  TH-LADEN · ${FORMAT.name}`)
console.log(`HTML gelesen nach ${(tDom / 1000).toFixed(1)} s`)
console.log(`Dateien: ${netz.length} (${mb(netz)} MB) · davon Modelle ${glb.length} (${mb(glb)} MB)`)
console.log(`Modelle: erstes ${q(0)} s · Haelfte ${q(.5)} s · 90 % ${q(.9)} s · letztes ${q(1)} s`)
console.log(`Welt fertig geladen (_ladeOffen === 0) bei ${offenNull ? (offenNull / 1000).toFixed(1) + ' s' : 'nicht erreicht'}`)
console.log(`\n👆 Ein Fingertipp wartete auf den Hauptfaden: ${(tippWartet / 1000).toFixed(1)} s`)
console.log(`   Der Klick auf „Solo bauen": ${(klickWartet / 1000).toFixed(1)} s`)
console.log(`🧱 Laengste Blockade des Hauptfadens: ${(stau.max / 1000).toFixed(1)} s · ` +
  `insgesamt ${(stau.summe / 1000).toFixed(1)} s in ${stau.anz} Blockaden ueber 0,1 s`)
const anzTxt = !anzeige.da ? 'KEINE'
  : anzeige.sichtbar ? 'ja, sichtbar — „' + anzeige.text + '“'
  : 'vorhanden, aber unsichtbar'
console.log(`🖼  Ladeanzeige im Spiel: ${anzTxt}`)
console.log(`JS-Fehler: ${jsFehler.length ? jsFehler.slice(0, 2).join(' | ') : 'keine'}`)

const probeOk = probe.max >= 1500
console.log(`\n🔍 Gegenprobe (2 s absichtlich blockiert): gemeldet ${(probe.max / 1000).toFixed(1)} s → ` +
  (probeOk ? 'Messgeraet reagiert ✅' : 'MESSGERAET MELDET NICHTS ❌ — die Zahlen oben sind wertlos'))

await browser.close()
process.exit(probeOk ? 0 : 1)
