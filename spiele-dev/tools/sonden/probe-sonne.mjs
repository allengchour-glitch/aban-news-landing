/* Sonde (Runde 100): kommt das Sonnenlicht ueberall aus derselben Richtung? node probe-sonne.mjs [quelle] [vergleich.html]
   loop() setzt Licht UND Ziel jedes Bild auf die Kamera (Schatten-Box um den Spieler). `_einfrieren` fror das Ziel
   ein; `sun.target.updateMatrixWorld()` rechnet dann die lokale Matrix nicht nach — das Ziel blieb am Startpunkt,
   das Licht zog mit, und die Richtung kippte mit der Entfernung (probe-anfasser: Ziel 65 m neben seiner Lage).
   Gemessen je Kamerapunkt um 12:00: Hoehenwinkel und Himmelsrichtung von Licht→Ziel (aus den WELTMATRIZEN, also
   das, womit three.js rechnet) und der Abstand Ziel↔Kamera. Soll: ueberall gleich, Abstand 0. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const [A = 'traumhaus.html', B] = process.argv.slice(2)
const P = [['Start', -67, 43], ['Kreuzung', 78, 58], ['Gewerbe', 230, 0], ['Freizeitpark', 180, 150], ['Sued', 0, -200]]
async function messe(quelle) {
  const TMP = '_probe_sonne_tmp.html'
  mitSonden(quelle, {
    kam: `function(x,z){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;followSim=null;camTx=x;camTz=z;window.__th.zeit(12*60);updCam();return true;}`,
    richtung: `function(){var a=new THREE.Vector3().setFromMatrixPosition(sun.matrixWorld),z=new THREE.Vector3().setFromMatrixPosition(sun.target.matrixWorld),d=a.clone().sub(z).normalize();
      return {hoehe:+(Math.asin(d.y)*180/Math.PI).toFixed(1),azimut:+(Math.atan2(d.x,d.z)*180/Math.PI).toFixed(1),zielDaneben:+Math.hypot(z.x-camTx,z.z-camTz).toFixed(1),gefroren:!sun.target.matrixAutoUpdate};}`
  }, TMP)
  const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
  await warteAufRuhe(page, { minSekunden: 60 })
  const R = []
  for (const [n, x, z] of P) { await page.evaluate(([x, z]) => window.__th.kam(x, z), [x, z]); await page.waitForTimeout(1500); R.push([n, await page.evaluate(() => window.__th.richtung())]) }
  await browser.close(); aufraeumen(TMP); return R
}
for (const q of [A, B].filter(Boolean)) {
  const R = await messe(q); console.log(q)
  R.forEach(([n, r]) => console.log(`   ${n.padEnd(13)} Hoehe ${String(r.hoehe).padStart(5)}°  Richtung ${String(r.azimut).padStart(6)}°  Ziel ${r.zielDaneben} m neben der Kamera${r.gefroren ? ' (Ziel eingefroren)' : ''}`))
  const h = R.map(([, r]) => r.hoehe); console.log(`   Spannweite Hoehenwinkel: ${(Math.max(...h) - Math.min(...h)).toFixed(1)}° (Soll ~0)`)
}
