/* Sonde (Runde 107, User: „unspielbar auf handy" — ruckelt, Vollbild geht nicht, nach paar Sekunden nur weiss,
   Aufloesung schlecht). Handy-Kontext (isMobile, Touch, deviceScaleFactor 3), quer 844×390:
   1. Vollbild-Knopf da und sichtbar, Tipp darauf → document.fullscreenElement.
   2. Aufloesungs-Stufen der dynamischen Aufloesung: auf dem Handy keine unter 1.
   3. Grafik weg (WEBGL_lose_context.loseContext) → dunkle Tafel statt Leerbild; restoreContext → Tafel weg, das Spiel
      zeichnet weiter (Bildzaehler steigt), keine JS-Fehler. Ohne preventDefault gaebe Chrome den Kontext nie zurueck —
      darum zaehlt der Bildzaehler NACH dem Zurueckholen, nicht nur die Tafel.
   5. Begruessungskarte: „Los geht's" im Bild, echter Tipp schliesst; alle festen Vollbild-Ebenen passen oder scrollen.
      GEGENPROBE: der Stand vor Runde 107 meldet „Los geht's 443–493 von 390" und „introCard 644 px".
   4. Hochformat 390×844: Hinweis mit Knopf „Vollbild & quer".
   Bilder nach spiele-dev/screenshots/r107-*.png. */
import { chromium } from 'playwright'
import { serverStarten, PORT, CHROMIUM, mitSonden, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html', ORD = 'spiele-dev/screenshots', TMP = '_probe_r107_tmp.html'
mitSonden(quelle, {
  bild: `function(){return renderer.info.render.frame;}`,
  stufen: `function(){return {stufen:_rrStufen.map(function(v){return +v.toFixed(3);}),max:_rrMax,spar:_sparHandy,sparStufe:_sparStufe,tex:TEX_SPAR,zoom:ZOOM_MAX};}`,
  weg: `function(){var e=renderer.getContext().getExtension("WEBGL_lose_context");window.__lc=e;if(!e)return "keine Erweiterung";e.loseContext();return "verloren";}`,
  zurueck: `function(){window.__lc.restoreContext();return true;}`,
  tafel: `function(){var d=[].slice.call(document.body.children).filter(function(x){return x.tagName==="DIV"&&/ausgestiegen/.test(x.textContent||"")&&x.style.display!=="none";});return d.length;}`
}, TMP)
serverStarten()
const browser = await chromium.launch({ executablePath: CHROMIUM })
const fehler = [], erg = []
function ok(b, t) { erg.push(b); console.log(`${b ? '✅' : '❌'} ${t}`) }
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  const page = await ctx.newPage(); page.on('pageerror', (e) => fehler.push(String(e.message || e).slice(0, 140)))
  await page.goto(`http://127.0.0.1:${PORT}/${TMP}`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForSelector('#soloBtn', { timeout: 150000 })
  /* Wie ein Spieler: „Solo bauen", dann in der Modus-Wahl „Klassisch", dann „Los geht's" (probe-starttipp). */
  await page.tap('#soloBtn', { force: true }).catch(() => {})
  await page.waitForSelector('button[data-m="klassisch"]', { state: 'visible', timeout: 60000 }).catch(() => {})
  await page.tap('button[data-m="klassisch"]', { force: true }).catch(() => {})
  await page.waitForSelector('#introOk', { state: 'visible', timeout: 60000 }).catch(() => {})
  /* Runde 107: die Begruessungskarte war 700 px hoch in 390 px, „Los geht's" unter dem Bildrand. Der Knopf muss im
     Bild liegen — ohne Scrollen, denn er klebt jetzt unten in der Karte. */
  const ib = await page.evaluate(() => { const r = document.getElementById('introOk').getBoundingClientRect(); return { oben: Math.round(r.top), unten: Math.round(r.bottom), h: innerHeight } })
  ok(ib.unten <= ib.h && ib.oben >= 0, `Begruessung: „Los geht's" im Bild (${ib.oben}–${ib.unten} von ${ib.h} px)`)
  await page.screenshot({ path: `${ORD}/r107-begruessung-quer.png` })
  await page.tap('#introOk').catch(() => {})
  await page.waitForTimeout(1500)
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('introCard')).display === 'none'), 'Echter Tipp auf „Los geht\'s" schliesst die Karte')
  await page.waitForTimeout(40000)
  ok(await page.evaluate(() => !!window._running), 'Spiel laeuft nach Solo → Klassisch → Los geht\'s')
  /* Alle festen Vollbild-Ebenen der Seite: passt ihr Inhalt in 390 px, oder laesst er sich scrollen? */
  const eb = await page.evaluate(() => {
    const aus = []
    document.querySelectorAll('body > div').forEach((d) => {
      const cs = getComputedStyle(d); if (cs.position !== 'fixed' || +cs.zIndex < 20) return
      const r0 = d.getBoundingClientRect(); if (r0.width < innerWidth * 0.9 || r0.height < innerHeight * 0.9) return
      const alt = d.style.display; if (cs.display === 'none') d.style.display = 'flex'
      const k = d.firstElementChild; if (!k) { d.style.display = alt; return }
      const r = k.getBoundingClientRect(), kcs = getComputedStyle(k), dcs = getComputedStyle(d)
      const scroll = /(auto|scroll)/.test(kcs.overflowY + dcs.overflowY) && (k.scrollHeight > k.clientHeight + 2 || d.scrollHeight > d.clientHeight + 2)
      if (r.height > innerHeight + 2 && !scroll) aus.push(`${d.id || '(ohne id)'} ${Math.round(r.height)} px`)
      d.style.display = alt })
    return aus })
  ok(eb.length === 0, `Feste Ebenen, die nicht in den Schirm passen und nicht scrollen: ${eb.length}${eb.length ? ' — ' + eb.join(', ') : ''}`)
  const st = await page.evaluate(() => window.__th.stufen())
  ok(st.stufen.every((v) => v >= 1 - 1e-6) && st.stufen[0] === st.max, `Aufloesungs-Stufen Handy ${JSON.stringify(st.stufen)} (keine unter 1) · Sparstufe ${st.sparStufe} · Texturen ${st.tex} px · Zoom bis ${st.zoom}`)
  const vb = await page.evaluate(() => { const b = document.getElementById('vollBtn'); if (!b) return null; const r = b.getBoundingClientRect(); return { sichtbar: r.width > 20 && r.height > 20 && getComputedStyle(b).visibility !== 'hidden' && b.offsetParent !== null, x: Math.round(r.x), y: Math.round(r.y) } })
  ok(!!(vb && vb.sichtbar), `Vollbild-Knopf da und sichtbar ${JSON.stringify(vb)}`)
  await page.screenshot({ path: `${ORD}/r107-handy-quer.png` })
  if (vb && vb.sichtbar) { await page.tap('#vollBtn', { force: true }).catch(() => {}); await page.waitForTimeout(1500) }
  const voll = await page.evaluate(() => !!(document.fullscreenElement || document.webkitFullscreenElement))
  ok(voll, `Tipp auf den Knopf → Vollbild ${voll}`)
  await page.evaluate(() => { if (document.exitFullscreen && document.fullscreenElement) return document.exitFullscreen().catch(() => {}) })
  /* Grafik weg */
  const b0 = await page.evaluate(() => window.__th.bild())
  const w = await page.evaluate(() => window.__th.weg()); await page.waitForTimeout(1500)
  const t1 = await page.evaluate(() => window.__th.tafel())
  await page.screenshot({ path: `${ORD}/r107-grafik-weg.png` })
  ok(w === 'verloren' && t1 === 1, `Grafik weg → Tafel sichtbar (${w}, ${t1})`)
  await page.evaluate(() => window.__th.zurueck()); await page.waitForTimeout(8000)
  const t2 = await page.evaluate(() => window.__th.tafel()), b1 = await page.evaluate(() => window.__th.bild())
  await page.waitForTimeout(8000); const b2 = await page.evaluate(() => window.__th.bild())
  await page.screenshot({ path: `${ORD}/r107-grafik-zurueck.png` })
  ok(t2 === 0 && b2 > b1, `Grafik zurueck → Tafel weg (${t2}), Bilder laufen weiter (${b0} → ${b1} → ${b2})`)
  await ctx.close()
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  const page = await ctx.newPage(); page.on('pageerror', (e) => fehler.push(String(e.message || e).slice(0, 140)))
  await page.goto(`http://127.0.0.1:${PORT}/${TMP}`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForTimeout(6000)
  const rh = await page.evaluate(() => { const r = document.getElementById('rotHint'), b = document.getElementById('rotVoll'); return { hinweis: getComputedStyle(r).display, knopf: !!b && b.getBoundingClientRect().height > 30 } })
  await page.screenshot({ path: `${ORD}/r107-handy-hoch.png` })
  ok(rh.hinweis === 'flex' && rh.knopf, `Hochformat: Hinweis ${rh.hinweis}, Knopf „Vollbild & quer" ${rh.knopf}`)
  await ctx.close()
}
ok(fehler.length === 0, `JS-Fehler ${fehler.length}${fehler.length ? ' — ' + fehler.slice(0, 3).join(' | ') : ''}`)
console.log(`\n${erg.filter(Boolean).length}/${erg.length} bestanden`)
await browser.close(); aufraeumen(TMP)
