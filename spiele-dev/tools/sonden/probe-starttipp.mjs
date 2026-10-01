/* Sonde (Runde 107): kommt der Tipp auf „Solo bauen" auf dem Handy an? node probe-starttipp.mjs [quelle]
   probe-handy und probe-r107 meldeten quer „gestartet false" — nach 40 s stand noch der Startbildschirm, der Knopf
   ganz unten, halb unter der Fusszeile. Hier: Handy-Kontext quer (844×390, Touch), sobald der Knopf da ist: wo liegt
   er, WAS liegt an seiner Mitte (elementFromPoint), echter Touch-Tipp auf die Mitte, und wie lange bis #start weg ist.
   Gegenprobe: derselbe Ablauf mit element.click() per Skript muss starten (dann liegt es am Tipp, nicht am Spiel).
   ⚠️ ERGEBNIS (Runde 107): der Tipp kommt an — mit frischem Spielstand oeffnet er die Modus-Wahl („Wie willst du
   spielen?"), und die liegt IM Startbild. „gestartet false" in probe-handy war diese Wahl, kein Fehler. Wer im
   Handy-Pfad wirklich ins Spiel will, tippt danach „Klassisch" und „Los geht's" (so jetzt probe-r107). */
import { chromium } from 'playwright'
import { serverStarten, PORT, CHROMIUM, mitSonden, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html', TMP = '_probe_starttipp_tmp.html'
mitSonden(quelle, { bild: `function(){return renderer.info.render.frame;}` }, TMP)
serverStarten()
const browser = await chromium.launch({ executablePath: CHROMIUM })
async function lauf(art) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  const page = await ctx.newPage(); const fehler = []; page.on('pageerror', (e) => fehler.push(String(e.message || e).slice(0, 120)))
  const t0 = Date.now()
  await page.goto(`http://127.0.0.1:${PORT}/${TMP}`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForSelector('#soloBtn', { timeout: 150000 })
  await page.waitForTimeout(3000)
  const lage = await page.evaluate(() => {
    const b = document.getElementById('soloBtn'), r = b.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2
    const oben = document.elementFromPoint(cx, cy), st = document.getElementById('start')
    const unten = document.elementFromPoint(cx, r.bottom - 4)
    return { knopf: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], innerH: innerHeight,
      mitte: oben ? (oben.id || oben.tagName) + (b.contains(oben) ? ' (Knopf)' : ' (FREMD)') : null,
      unterkante: unten ? (unten.id || unten.tagName) + (b.contains(unten) ? ' (Knopf)' : ' (FREMD)') : null,
      startScroll: st ? [st.scrollHeight, st.clientHeight] : null, cx, cy }
  })
  console.log(`${art}: Knopf ${JSON.stringify(lage.knopf)} bei Hoehe ${lage.innerH} · an der Mitte: ${lage.mitte} · an der Unterkante: ${lage.unterkante} · Startbild scrollt ${JSON.stringify(lage.startScroll)}`)
  const tTipp = Date.now()
  if (art === 'tipp') await page.touchscreen.tap(lage.cx, lage.cy)
  else await page.evaluate(() => document.getElementById('soloBtn').click())
  let weg = null
  for (let i = 0; i < 60; i++) {
    const w = await page.evaluate(() => { const st = document.getElementById('start'); return !st || st.classList.contains('hide') || getComputedStyle(st).display === 'none' }).catch(() => false)
    if (w) { weg = ((Date.now() - tTipp) / 1000).toFixed(1); break }
    await page.waitForTimeout(1000)
  }
  const naechstes = await page.evaluate(() => { const m = document.querySelector('button[data-m="klassisch"]'), o = document.getElementById('introOk')
    return { modusWahl: !!(m && m.offsetParent), intro: !!(o && o.offsetParent) } })
  console.log(`${art}: Startbild weg nach ${weg ?? '> 60'} s (Seite ${((tTipp - t0) / 1000).toFixed(0)} s alt beim Tipp) · danach sichtbar: ${JSON.stringify(naechstes)} · JS-Fehler ${fehler.length}`)
  await page.screenshot({ path: `spiele-dev/screenshots/r107-start-${art}.png` }).catch(() => {})
  await ctx.close()
  return weg
}
const a = await lauf('tipp'), b = await lauf('skript')
console.log(b ? `Gegenprobe (Skript-Klick startet): ✓` : `Gegenprobe: auch der Skript-Klick startet NICHT — dann liegt es nicht am Tipp`)
await browser.close(); aufraeumen(TMP)
