/* th-fahrt.mjs — bewegt sich jedes Fahrgeschaeft, fuer das der Code eine Bewegung vorsieht?
 *
 * ⚠️ WOZU. Am 2026-08-30 gemessen: von elf Fahrgeschaeften bewegten SIEBEN ueber 20 s
 * kein einziges Teil. Kein Werkzeug hat das gemeldet — `th-bewegt` prueft, ob
 * Animationen ANGEMELDET sind, nicht ob sich etwas dreht. Ein Rummelplatz aus
 * Standbildern ist kein Fehler, den ein Kollider oder eine Strasse verraet; man sieht
 * ihn nur, wenn man hinsieht. Also wird jetzt hingemessen.
 *
 * ⚠️ DIE ERWARTUNG KOMMT AUS DEM SPIEL, NICHT AUS EINER LISTE HIER. Ein Fahrgeschaeft
 * SOLL sich bewegen, wenn der Code ihm eine Bewegung gibt — also wenn `_drehRaten`
 * seinen Typ kennt, oder wenn `updFahrgeschaefte` ihm einen `rotor` (Riesenrad) bzw.
 * ein `pendel` (Piratenschiff) angelegt hat. Eine abgeschriebene Namensliste hier waere
 * die vierte Herleitung derselben Sache und wuerde veralten wie `_GPS_VERB` dreimal.
 * Wer ein weiteres Fahrgeschaeft belebt, ist damit automatisch mitgeprueft.
 *
 * ⚠️ DER RIESENRAD-ROTOR HAENGT NICHT UNTER DER GRUPPE. Er ist eine SZENEN-Gruppe an
 * der Weltachse (so gebaut, damit die Radebene sauber dreht). Wer nur `F.w` durchlaeuft,
 * meldet das Riesenrad faelschlich als stillstehend — mir genau so passiert.
 *
 * ⚠️ UND: DIE MODELLE SIND EINGEFROREN. Bei `matrixAutoUpdate=false` baut three.js die
 * Matrix NICHT aus `rotation` neu. Wer zum Test eine Drehung setzt und die Welthuelle
 * misst, sieht null Aenderung und haelt einen richtigen Drehpunkt fuer falsch. Hier wird
 * darum nichts gesetzt, sondern nur beobachtet, was das Spiel selbst tut.
 *
 * Aufruf:  node spiele-dev/tools/th-fahrt.mjs [sekunden]
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const SEK = Number(process.argv[2] || 20)

const TMP = mitSonden('traumhaus.html', {
  fahrt: `function(){
    var R=(typeof _drehRaten!=="undefined")?_drehRaten:{};
    return FAHRTEN.map(function(F){
      var a=[];
      F.w.updateWorldMatrix(true,true);
      F.w.traverse(function(o){a.push(o.rotation.x,o.rotation.y,o.rotation.z,
        o.matrixWorld.elements[12],o.matrixWorld.elements[13],o.matrixWorld.elements[14]);});
      /* Der Rotor haengt an der Szene, nicht an der Gruppe — sonst faellt er durch. */
      if(F.rotor){F.rotor.updateWorldMatrix(true,true);
        F.rotor.traverse(function(o){a.push(o.rotation.x,o.rotation.y,o.rotation.z,
          o.matrixWorld.elements[12],o.matrixWorld.elements[13],o.matrixWorld.elements[14]);});}
      /* ⚠️ "!== undefined", NICHT WAHRHEITSWERT. Die Selbstprobe setzte die Rate des
         Panoramas auf 0 — und das Werkzeug meldete es als "absichtlich still" statt
         als Ausfall. Ein Eintrag mit 0 ist aber kein fehlender Eintrag, sondern eine
         vorgesehene Bewegung, die nicht stattfindet: genau der Fund, um den es geht. */
      return {typ:F.typ,teile:a.length/6,
              soll:(R[F.typ]!==undefined)||!!F.rotor||!!F.pendel,
              grund:(R[F.typ]!==undefined)?"_drehRaten":(F.rotor?"rotor":(F.pendel?"pendel":"")),w:a};});}`,
}, '_fahrt_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const a = await page.evaluate(() => window.__th.fahrt())
await page.waitForTimeout(SEK * 1000)
const b = await page.evaluate(() => window.__th.fahrt())

let fehlt = 0, ruhig = []
console.log(`Fahrgeschaefte ueber ${SEK} s — groesste Aenderung ueber ALLE Teile\n`)
console.log('  ' + 'Typ'.padEnd(17) + 'Teile'.padStart(6) + 'Winkel'.padStart(10) + 'Ort (m)'.padStart(10) + '   soll sich bewegen')
for (let i = 0; i < a.length; i++) {
  let dw = 0, dp = 0
  for (let k = 0; k < a[i].w.length; k += 6) {
    for (let j = 0; j < 3; j++) dw = Math.max(dw, Math.abs(b[i].w[k + j] - a[i].w[k + j]))
    for (let j = 3; j < 6; j++) dp = Math.max(dp, Math.abs(b[i].w[k + j] - a[i].w[k + j]))
  }
  const bewegt = dw > 0.001 || dp > 0.01
  const soll = a[i].soll
  if (soll && !bewegt) fehlt++
  if (!soll) ruhig.push(a[i].typ)
  console.log('  ' + (soll && !bewegt ? '❌' : '  ') + a[i].typ.padEnd(15) + String(a[i].teile).padStart(6) +
    dw.toFixed(4).padStart(10) + dp.toFixed(2).padStart(10) + '   ' +
    (soll ? 'ja (' + a[i].grund + ')' : 'nein') + (bewegt ? '  · bewegt sich' : ''))
}
console.log(`\n${fehlt ? '❌' : '✅'} Vorgesehene Bewegungen, die ausbleiben: ${fehlt}`)
console.log(`ℹ️  Absichtlich still (keine Bewegung im Code vorgesehen): ${ruhig.length} — ${ruhig.join(', ')}`)
console.log(`${jsFehler.length ? '❌' : '✅'} JS-Fehler: ${jsFehler.length}`)
console.log(`\n${fehlt === 0 && jsFehler.length === 0 ? '🎉 FAHRGESCHAEFTE BESTANDEN' : '💥 FAHRGESCHAEFTE FEHLGESCHLAGEN'} — ${a.length} geprueft, ${fehlt} ohne Bewegung`)
await browser.close()
aufraeumen(TMP)
process.exit(fehlt === 0 && jsFehler.length === 0 ? 0 : 1)
