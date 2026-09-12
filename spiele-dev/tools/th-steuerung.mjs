/* th-steuerung.mjs — taugt die Steuerung auf Handy und PC?
 *
 *   node spiele-dev/tools/th-steuerung.mjs           # beide Formate
 *   node spiele-dev/tools/th-steuerung.mjs handy     # nur Handy
 *   node spiele-dev/tools/th-steuerung.mjs pc        # nur PC
 *
 * ⚠️ OHNE ARGUMENT BEIDE. Das Tor ruft Werkzeuge ohne Argumente auf — eine Haelfte,
 * die nur von Hand laeuft, wird nie gelaufen.
 *
 * ⚠️ WOZU. Unter 47 Torpruefungen misst keine einzige die STEUERUNG. Es gibt
 * `th-hud` fuer die Anordnung (Ueberdeckungen, Tippziele unter 44 px) und
 * `th-fahrgefuehl` fuers Auto — aber nichts fuer das, was die Spielerin die ganze
 * Zeit tut: gehen, sich umsehen, rennen.
 *
 * Gemessen wird auf BEIDEN Geraeten — Handy-Format 844x390 und PC-Format 1440x900 —
 * und zwar das VERHALTEN, nicht das Aussehen:
 *   1. Taste gedrueckt → laeuft die Figur? Taste los → haelt sie an?
 *   2. Stick halb ausgelenkt → halbes Tempo? (Sonst ist jede Bewegung Vollgas.)
 *   3. Kamera drehen mit einem Finger.
 *   4. 🔑 KAMERA DREHEN, WAEHREND DER JOYSTICK GEHALTEN WIRD. Das ist auf dem Handy
 *      der Normalfall — linker Daumen laeuft, rechter sieht sich um.
 *
 * ⚠️ UND EINE FALLE IM EIGENEN HAUS, BEIM ERSTEN LAUF PROMPT HINEINGETRETEN: das
 * Mess-FENSTER darf nicht an der Wanduhr haengen. Der erste Anlauf wartete 1,2 s
 * Echtzeit und bekam dreimal dieselben 0,20 m — im Headless-Browser vergehen in
 * dieser Zeit ein, zwei Bilder. Das sah aus wie „die Figur laeuft nicht" und war
 * doch nur die Vorrichtung; derselbe Fehler steht seit Jahr und Tag im Kopf von
 * th-reichweite. Gewartet wird darum auf SPIELZEIT (`warteWeltzeit`).
 *
 * ⚠️ DIE FALLE, DIE PRUEFUNG 4 UEBERHAUPT NOETIG MACHT: `e.touches` enthaelt ALLE
 * Finger auf dem Schirm, nicht nur die auf dem angesprochenen Element. Ein Handler,
 * der ueber `e.touches.length===1` bzw. `===2` verzweigt, haelt den Daumen auf dem
 * Joystick faelschlich fuer den zweiten Finger einer Zoom-Geste. Genau so wird hier
 * gemessen: die Ereignisse tragen in `touches` beide Finger, in `targetTouches` nur
 * den auf der Leinwand — so, wie ein echter Browser sie liefert.
 */
import { spielOeffnen, mitSonden, aufraeumen, warteWeltzeit } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_steuerung_probe.html'
mitSonden('traumhaus.html', {
  uhr: 'function(){return uhrzeit;}',
  lage: 'function(){var s=sims[meinSi()]||sims[0];' +
    'return {x:+s.x.toFixed(3),z:+s.z.toFixed(3),camA:+camA.toFixed(4),camB:+camB.toFixed(4),' +
            'camRT:+camRT.toFixed(2)};}',
  taste: 'function(k,runter){' +
    'var e=new KeyboardEvent(runter?"keydown":"keyup",{key:k,bubbles:true});' +
    'window.dispatchEvent(e);return Object.keys(steerKeys).join(",");}',
  stick: 'function(anteil){steer.x=0;steer.z=-anteil;return [steer.x,steer.z];}',
  stickAus: 'function(){steer.x=0;steer.z=0;return true;}',
  /* Beruehrungen von Hand bauen: nur so laesst sich der Unterschied zwischen
     `touches` (alle Finger) und `targetTouches` (nur die auf der Leinwand) messen. */
  /* Zwei Finger AUF DER LEINWAND — die echte Zoom-Geste. Sie muss erhalten bleiben,
     wenn der Joystick-Daumen kuenftig nicht mehr mitzaehlt. */
  zwei: 'function(art,x1,x2){' +
    'var lw=renderer.domElement;' +
    'function t(id,cx){return new Touch({identifier:id,target:lw,clientX:cx,clientY:200});}' +
    'var a=t(1,x1), b=t(2,x2);' +
    'lw.dispatchEvent(new TouchEvent(art,{touches:[a,b],targetTouches:[a,b],changedTouches:[a,b],' +
      'bubbles:true,cancelable:true}));return 2;}',
  /* ⚠️ DAS RAD SELBST SCHICKEN. `page.mouse.wheel` kam in zwei Laeufen unterschiedlich
     an: einmal aenderte sich camRT gar nicht, einmal sprang es auf den rechnerisch
     exakten Wert — waehrend ein eigener Zaehler 0 Ereignisse meldete. Nicht die
     Reaktion des Spiels war unzuverlaessig, sondern die Zustellung der Vorrichtung.
     Ein selbst gebautes WheelEvent ist bestimmbar und trifft denselben Lauscher. */
  rad: 'function(dy){window.__radN=(window.__radN||0)+0;' +
    'renderer.domElement.dispatchEvent(new WheelEvent("wheel",{deltaY:dy,' +
      'clientX:innerWidth/2,clientY:innerHeight/2,bubbles:true,cancelable:true}));' +
    'return camRT;}',
  tippen: 'function(art,mitJoy,x,y){' +
    'var lw=renderer.domElement, joy=document.getElementById("joy");' +
    'function t(id,el,cx,cy){return new Touch({identifier:id,target:el,clientX:cx,clientY:cy});}' +
    'var tl=t(1,lw,x,y), tj=t(2,joy,60,innerHeight-60);' +
    'var alle=mitJoy?[tj,tl]:[tl];' +
    'lw.dispatchEvent(new TouchEvent(art,{touches:alle,targetTouches:[tl],changedTouches:[tl],' +
      'bubbles:true,cancelable:true}));' +
    'return alle.length;}'
}, TMP)

const WAHL = process.argv[2]
const FORMATE = [
  { pc: false, name: '📱 Handy-Format 844x390', v: { width: 844, height: 390 } },
  { pc: true, name: '🖥️  PC-Format 1440x900', v: { width: 1440, height: 900 } }
].filter((f) => !WAHL || (WAHL === 'pc') === f.pc)

let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

for (const F of FORMATE) {
const PC = F.pc
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 45000, viewport: F.v })
console.log('\n' + F.name)
const L = () => page.evaluate(() => window.__th.lage())

console.log('\n⌨️  Tastatur')
const a0 = await L()
await page.evaluate(() => window.__th.taste('w', true))
await warteWeltzeit(page, 2.5, { maxWanduhr: 60 })
const a1 = await L()
const gelaufen = Math.hypot(a1.x - a0.x, a1.z - a0.z)
check('Taste gedrueckt bewegt die Figur', gelaufen > 0.5, gelaufen.toFixed(2) + ' m')
await page.evaluate(() => window.__th.taste('w', false))
await warteWeltzeit(page, 1.5, { maxWanduhr: 60 })
const a2 = await L()
const nachlauf = Math.hypot(a2.x - a1.x, a2.z - a1.z)
check('Taste losgelassen haelt an', nachlauf < 0.3, nachlauf.toFixed(2) + ' m Nachlauf')
/* GEGENPROBE gegen die eigene Wanduhr-Falle: wer hier nur ein, zwei Bilder misst,
   bekommt fuer JEDE Bewegung denselben Kleinstwert — dann ist die Aussage wertlos. */
check('GEGENPROBE: das Messfenster war lang genug', gelaufen > 3,
  gelaufen.toFixed(2) + ' m in 2,5 s Spielzeit')

console.log('\n🕹️  Joystick')
await page.evaluate(() => window.__th.stick(1))
await warteWeltzeit(page, 2.5, { maxWanduhr: 60 })
const b1 = await L()
await page.evaluate(() => window.__th.stickAus())
const voll = Math.hypot(b1.x - a2.x, b1.z - a2.z)
await page.evaluate(() => window.__th.stick(0.5))
await warteWeltzeit(page, 2.5, { maxWanduhr: 60 })
const b2 = await L()
await page.evaluate(() => window.__th.stickAus())
const halb = Math.hypot(b2.x - b1.x, b2.z - b1.z)
check('Voller Ausschlag laeuft', voll > 0.5, voll.toFixed(2) + ' m')
check('Halber Ausschlag laeuft etwa halb so schnell',
  halb > voll * 0.35 && halb < voll * 0.7, halb.toFixed(2) + ' gegen ' + voll.toFixed(2) + ' m')

console.log('\n📱 Kamera mit dem Finger')
const c0 = await L()
await page.evaluate(() => window.__th.tippen('touchstart', false, 600, 200))
await page.evaluate(() => window.__th.tippen('touchmove', false, 660, 200))
await page.waitForTimeout(300)
const c1 = await L()
await page.evaluate(() => window.__th.tippen('touchend', false, 660, 200))
check('Ein Finger dreht die Kamera', Math.abs(c1.camA - c0.camA) > 0.05,
  'camA ' + c0.camA + ' → ' + c1.camA)

console.log('\n🔑 Laufen UND umsehen zugleich (Daumen auf dem Joystick)')
const d0 = await L()
await page.evaluate(() => window.__th.tippen('touchstart', true, 600, 200))
await page.evaluate(() => window.__th.tippen('touchmove', true, 660, 200))
await page.waitForTimeout(300)
const d1 = await L()
await page.evaluate(() => window.__th.tippen('touchend', true, 660, 200))
const drehung = Math.abs(d1.camA - d0.camA)
const zoom = Math.abs(d1.camRT - d0.camRT)
check('Kamera dreht auch mit gehaltenem Joystick', drehung > 0.05,
  'camA-Aenderung ' + drehung.toFixed(4))
check('GEGENPROBE: dabei wird NICHT gezoomt', zoom < 0.5,
  'camRT-Aenderung ' + zoom.toFixed(2))

if (PC) {
  console.log('\n🖱️  Maus')
  const m0 = await L()
  await page.mouse.move(700, 400)
  await page.mouse.down()
  await page.mouse.move(780, 400, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const m1 = await L()
  check('Linke Taste ziehen dreht die Kamera', Math.abs(m1.camA - m0.camA) > 0.05,
    'camA ' + m0.camA + ' → ' + m1.camA)

  await page.mouse.move(700, 400)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(780, 440, { steps: 4 })
  await page.mouse.up({ button: 'right' })
  await page.waitForTimeout(200)
  const m2 = await L()
  check('Rechte Taste ziehen dreht NICHT (sie schiebt)', Math.abs(m2.camA - m1.camA) < 0.02,
    'camA-Aenderung ' + Math.abs(m2.camA - m1.camA).toFixed(4))

  const r0 = (await L()).camRT
  await page.evaluate(() => window.__th.rad(400))
  await page.waitForTimeout(250)
  const r1 = (await L()).camRT
  check('Mausrad zoomt heraus', r1 > r0 + 0.5, r0 + ' → ' + r1)
  await page.evaluate(() => window.__th.rad(-400))
  await page.waitForTimeout(250)
  const r2 = (await L()).camRT
  check('Mausrad zoomt wieder hinein', r2 < r1 - 0.5, r1 + ' → ' + r2)
  /* GEGENPROBE gegen einen Zoom, der sich nur zufaellig bewegt: ohne Rad-Ereignis
     darf sich gar nichts aendern. */
  await page.waitForTimeout(250)
  const r3 = (await L()).camRT
  check('GEGENPROBE: ohne Rad bleibt der Zoom stehen', Math.abs(r3 - r2) < 0.01,
    r2 + ' → ' + r3)
}

console.log('\n🤏 Zwei Finger auf der Leinwand (Zoom)')
const e0 = await L()
await page.evaluate(() => window.__th.zwei('touchstart', 400, 500))
await page.evaluate(() => window.__th.zwei('touchmove', 340, 560))
await page.waitForTimeout(300)
const e1 = await L()
await page.evaluate(() => window.__th.zwei('touchend', 340, 560))
check('Zwei Finger zoomen weiterhin', Math.abs(e1.camRT - e0.camRT) > 0.5,
  'camRT ' + e0.camRT + ' → ' + e1.camRT)

console.log('JS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
if (jsFehler.length) { fehl++; console.log('  ❌ JS-Fehler im Lauf') }
await browser.close()
}
aufraeumen(TMP)
console.log(fehl ? `\n💥 STEUERUNG FEHLGESCHLAGEN — ${ok} ok, ${fehl} Fehler`
                 : `\n🎉 STEUERUNG BESTANDEN — ${ok} ok, 0 Fehler`)
process.exit(fehl ? 1 : 0)
