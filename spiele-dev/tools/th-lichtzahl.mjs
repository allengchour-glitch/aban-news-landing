/* th-lichtzahl.mjs — schwankt die ZAHL der sichtbaren Punktlichter?
 *
 * ⚠️ WOZU. three.js baut sein Shader-Programm nach der ANZAHL der Lichter je Art.
 * Aendert sich diese Zahl, wird jedes Material der Szene neu uebersetzt — auf dem
 * Handy ein Aussetzer. Genau dieser Mechanismus ist in #2401 als Ursache des
 * Ruckelns nachgewiesen worden (dort: Texturen und Shader beim ersten Hinsehen).
 *
 * Zwei Stellen im Spiel schreiben `visible` auf Punktlichter: der Laternen-Pool
 * (updLampPool, alle 0,25 s) und der Deckel in loop() (LAMP_MAX, alle 0,5 s).
 * Beide Kommentare behaupten, die Anzahl bleibe konstant. Der Deckel setzt aber
 *     _kand[i].visible = (i < LAMP_MAX)
 * auf eine Kandidatenliste, aus der Lichter mit Helligkeit 0 vorher herausfallen —
 * die Zahl ist also min(LAMP_MAX, |kandidaten|) und kann beim Auf- und Abblenden
 * der Strassenbeleuchtung durchwandern. Ob sie das TUT, misst dieses Werkzeug:
 * es laesst die Spielzeit durch einen ganzen Tag laufen und protokolliert die
 * Zahl sichtbarer Punktlichter samt der uebersetzten Shader-Programme.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_lichtzahl_probe.html'
mitSonden('traumhaus.html', {
  licht: `function(was,a){
    if(was==="stand"){
      var sicht=0,ges=0,hell=0;
      scene.traverse(function(o){if(o.isPointLight){ges++;if(o.visible){sicht++;if(o.intensity>0)hell++;}}});
      return {sichtbar:sicht, gesamt:ges, hell:hell,
              programme:renderer.info.programs?renderer.info.programs.length:0,
              stunde:(typeof uhrzeit!=="undefined")?+(uhrzeit/60).toFixed(2):null,
              nacht:!!window._dorfNacht};}
    if(was==="uhr"){ /* ⚠️ Die Spieluhr heisst "uhrzeit" und zaehlt MINUTEN, nicht Stunden.
         Der erste Anlauf schrieb auf ein "uhr", das es nicht gibt — die Sonde warf
         "uhr.toFixed is not a function" und haette sonst stumm nichts verstellt.
         ⚠️ Und: KEINE Backticks in Sonden-Quelltext, die beenden das Template. */
      if(typeof uhrzeit!=="undefined")uhrzeit=a*60;return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const L = (...a) => page.evaluate((args) => window.__th.licht(...args), a)

/* Spiel starten, damit loop() den Deckel ueberhaupt anwendet. */
await page.click('#soloBtn').catch(() => {})
await page.click('button[data-m="klassisch"]').catch(() => {})
await page.waitForTimeout(400)
await page.click('#introOk').catch(() => {})
await page.waitForTimeout(1500)

const erst = await L('stand')
console.log(`${erst.gesamt} Punktlichter in der Szene, ${erst.sichtbar} sichtbar, ` +
  `${erst.programme} Shader-Programme, Uhr ${erst.stunde}\n`)

console.log('Spieltag durchfahren (jede Stunde eine Messung):\n')
console.log('  Uhr   sichtbar  hell  Programme  Nacht')
let vorZahl = null, wechsel = 0, progVor = erst.programme, progDazu = 0
const spur = []
for (let h = 0; h < 24; h++) {
  await L('uhr', h)
  await page.waitForTimeout(700)          // loop() braucht seine 0,5-s-Takte
  const s = await L('stand')
  const w = vorZahl !== null && s.sichtbar !== vorZahl
  if (w) wechsel++
  progDazu += Math.max(0, s.programme - progVor)
  spur.push([h, s.sichtbar, s.programme - progVor])
  console.log(`  ${String(h).padStart(2)}:00 ${String(s.sichtbar).padStart(8)} ${String(s.hell).padStart(5)} ` +
    `${String(s.programme).padStart(10)}${(s.programme - progVor) > 0 ? ' (+' + (s.programme - progVor) + ')' : '    '}  ` +
    `${s.nacht ? 'ja' : 'nein'}${w ? '   ← ZAHL GEAENDERT' : ''}`)
  vorZahl = s.sichtbar; progVor = s.programme
}

console.log(`\n→ ${wechsel} Wechsel der Lichterzahl über einen Spieltag, ` +
  `dabei ${progDazu} Shader-Programme neu übersetzt.`)
console.log(wechsel === 0
  ? '   Die Anzahl bleibt konstant — die Kommentare im Code stimmen.'
  : '   Jeder Wechsel übersetzt die Shader neu. Auf dem Handy ist das ein Ruckler.')
console.log(`\nJS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
