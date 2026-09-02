/* th-kadrierung.mjs — steht die eigene Figur beim Spielstart ueberhaupt im Bild?
 *
 * ⚠️ WOZU. Der allererste Blick entscheidet, ob jemand weiterspielt. Gemessen wurde:
 * die Kamera startet auf dem Weltursprung (camTx/camTz = 0), die Figur spawnt rund
 * 78 m entfernt, und `followSim` wird erst gesetzt, wenn man das erste Mal STEUERT.
 * Ergebnis: leerer Rasen, keine Figur, kein Anhaltspunkt — man bewegt sich blind, bis
 * die Kamera herangeglitten ist.
 *
 * Gemessen wird in Bildkoordinaten (NDC): |x|<1 und |y|<1 heisst "im Bild". Das ist
 * unabhaengig von Fenstergroesse, Zoom und Blickwinkel — anders als ein Screenshot,
 * den man ansehen muss.
 *
 * Aufruf:  node spiele-dev/tools/th-kadrierung.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_kadr_probe.html'
mitSonden('traumhaus.html', {
  kd: `function(was,a){
    if(was==="lage"){var s=sims[a||0];if(!s)return null;
      var v=new THREE.Vector3();s.mesh.getWorldPosition(v);v.project(camera);
      return {ndcX:+v.x.toFixed(3),ndcY:+v.y.toFixed(3),
        imBild:Math.abs(v.x)<1&&Math.abs(v.y)<1,
        sichtbar:s.mesh.visible,
        fig:[+s.x.toFixed(1),+s.z.toFixed(1)],
        kam:[+camTx.toFixed(1),+camTz.toFixed(1)],
        abstand:+Math.hypot(s.x-camTx,s.z-camTz).toFixed(1),
        folgt:followSim===s};}
    if(was==="steuer"){steer.x=a[0];steer.z=a[1];return steerActive();}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, {
  warten: 50000, viewport: { width: 1280, height: 800 }, screen: { width: 1920, height: 1080 },
})
const K = (...a) => page.evaluate((x) => window.__th.kd(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

const start = await K('lage', 0)
console.log('  Start: Figur ' + JSON.stringify(start.fig) + ' · Kamera ' + JSON.stringify(start.kam) +
  ' · Abstand ' + start.abstand + ' m · NDC ' + start.ndcX + '/' + start.ndcY)
check('Die eigene Figur ist beim Start im Bild', start.imBild,
  'NDC x=' + start.ndcX + ', y=' + start.ndcY)
check('Die Kamera schaut auf die Figur, nicht auf den Weltursprung', start.abstand < 12,
  start.abstand + ' m Abstand')
check('Die Figur ist sichtbar geschaltet', start.sichtbar)

/* ⚠️ REIHENFOLGE. Erst die Folge-Kamera pruefen, DANN die Gegenprobe mit der weit
   weggezogenen Kamera — andersherum misst die Folge-Pruefung den Rueckweg aus 136 m
   und faellt durch, obwohl das Folgen einwandfrei arbeitet. Eine Gegenprobe, die den
   Zustand veraendert, gehoert ans Ende. */
await K('steuer', [0.6, -0.6])
await page.waitForTimeout(3000)
await K('steuer', [0, 0])
const gefolgt = await K('lage', 0)
check('Beim Steuern folgt die Kamera weiterhin', gefolgt.folgt && gefolgt.abstand < 12,
  'Abstand ' + gefolgt.abstand + ' m, folgt=' + gefolgt.folgt)

/* Gegenprobe zuletzt: die Messung muss ein Ausserhalb auch als solches erkennen.
   Faellt sie hier nicht durch, misst sie nichts. */
await page.evaluate(() => { window.__CAM(140, 140, 40, 0.78) })
await page.waitForTimeout(400)
const weit = await K('lage', 0)
check('GEGENPROBE: eine weggezogene Kamera wird als "nicht im Bild" erkannt',
  !weit.imBild, 'NDC x=' + weit.ndcX + ', y=' + weit.ndcY)

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 KADRIERUNG BESTANDEN' : '💥 KADRIERUNG FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
