/* th-ruckler.mjs — sucht RUCKLER, nicht niedrige Bildrate.
 *
 * ⚠️ WOZU. "Ruckelt am Handy" heisst Aussetzer, nicht durchgehend langsam. Drei
 * Verdaechtige sind bereits gemessen und freigesprochen: saveGame (1 KB, 0,1 ms),
 * die Update-Funktionen (0,25 ms zusammen) und die kartengrossen Boden-Overlays
 * (im Rauschen, th-fuellrate.mjs). Alle drei kosten GLEICHMAESSIG — sie koennen
 * gar kein Stocken erzeugen.
 *
 * Was stockt, sind einmalige Arbeiten mitten im Spiel. Der klassische Fall in
 * three.js: SHADER werden faul uebersetzt. Taucht ein Material zum ersten Mal im
 * Bild auf, uebersetzt der Treiber sein Programm — auf dem Handy zehn bis
 * hunderte Millisekunden, mitten in der Bewegung. Genau das fuehlt sich an wie
 * Ruckeln, waehrend die mittlere Bildrate gut aussieht.
 *
 * Dieses Werkzeug fliegt die Karte ab und zaehlt, wie viele Programme WAEHREND
 * der Fahrt dazukommen. Jedes davon ist ein potenzieller Ruckler beim Spieler.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_ruckler_probe.html'
mitSonden('traumhaus.html', {
  ruck: `function(was,a){
    if(was==="stand")return {programme:renderer.info.programs?renderer.info.programs.length:0,
                             texturen:renderer.info.memory.textures,
                             geometrien:renderer.info.memory.geometries};
    if(was==="blick"){
      camera.position.set(a[0],a[1],a[2]);camera.lookAt(a[3],a[4],a[5]);
      camera.updateMatrixWorld(true);
      var t0=performance.now();renderer.render(scene,camera);
      return +(performance.now()-t0).toFixed(1);}
    if(was==="waerme"){ /* three.js kann alles vorab uebersetzen */
      var t0=performance.now();renderer.compile(scene,camera);
      return +(performance.now()-t0).toFixed(0);}
    return null;}`,
}, TMP)

/* Punkte quer ueber die Karte: Start, Innenstadt, Hafen/Meer, Berg, Freizeitpark,
   Bauernhof, Seepark — jeweils spielernahe Kamerahoehe. */
const ORTE = [
  ['Start',        [26, 6, 80, 26, 1, 20]],
  ['Innenstadt',   [-20, 8, -40, -60, 2, -80]],
  ['Hafen/Meer',   [-150, 10, 20, -230, 2, 0]],
  ['Berg',         [120, 30, -120, 60, 10, -60]],
  ['Freizeitpark', [60, 8, 280, 60, 2, 330]],
  ['Bauernhof',    [-40, 8, -180, -40, 2, -246]],
  ['Seepark',      [0, 8, 100, 0, 2, 146]],
  ['Achterbahn',   [-190, 10, 160, -190, 3, 207]],
]

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const R = (...a) => page.evaluate((args) => window.__th.ruck(...args), a)

const start = await R('stand')
console.log(`Nach dem Laden: ${start.programme} Shader-Programme, ${start.texturen} Texturen, ${start.geometrien} Geometrien\n`)

let vor = start.programme, neu = 0, spitzen = []
console.log('Kamerafahrt ueber die Karte — was kommt WAEHREND des Spiels dazu?\n')
for (const [name, blick] of ORTE) {
  const ms = await R('blick', blick)
  const jetzt = await R('stand')
  const dazu = jetzt.programme - vor
  neu += dazu
  if (dazu > 0) spitzen.push([name, dazu])
  console.log(`  ${name.padEnd(13)} ${String(ms).padStart(7)} ms · ` +
    `+${dazu} Programme · +${jetzt.texturen - start.texturen} Texturen (kumuliert)`)
  vor = jetzt.programme
}

console.log(`\n→ ${neu} Shader-Programme wurden ERST WAEHREND der Fahrt uebersetzt.`)
if (neu > 0) {
  console.log(`   Jedes davon ist auf dem Handy ein Aussetzer beim ersten Hinsehen:`)
  spitzen.forEach(([n, d]) => console.log(`     ${n}: ${d}`))
}
const warm = await R('waerme')
const nachWarm = await R('stand')
console.log(`\nrenderer.compile(scene,camera) braucht ${warm} ms und haelt danach ` +
  `${nachWarm.programme} Programme bereit (vorher ${start.programme} beim Laden).`)
console.log(`\nJS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
