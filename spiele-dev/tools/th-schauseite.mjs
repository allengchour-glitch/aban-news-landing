/* th-schauseite.mjs — zeigt jedes Viertelgebaeude seine Fassade zur Strasse?
 *
 * WOZU. Sichtrunde 2026-09-02: Vergnuegungsviertel und Sportpark zeigten der Strasse
 * riesige glatte Waende. Nicht LOD (alle Meshes sichtbar, 10 m entfernt), sondern die
 * Modelle: th12/th19 tragen ihre Kleinteile (Fenster, Leuchten, Schilder) bei +z, der
 * Generator dreht aber "-z zur Strasse". Seit dem Fix liest viertel() die Schauseite aus
 * dem Modell (schauseiteWinkel) und dreht nach. Das hier misst das Ergebnis:
 * fuer jedes Viertelgebaeude, WELCHE Wand der Strasse zugewandt ist und wie viele
 * Kleinteile dort gegenueber der abgewandten Wand sitzen.
 *
 * Aufruf:  node spiele-dev/tools/th-schauseite.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = mitSonden('traumhaus.html', {
  schau: `function(){
    var L=(window._viertelSolver&&window._viertelSolver.VIERTEL)||[],raus=[];
    L.forEach(function(v){v.bauten.forEach(function(bt){var w=bt.w;if(!w)return;
      w.updateWorldMatrix(true,true);
      /* Strassenrichtung in Welt: die Viertelstrasse liegt auf der Mittelachse */
      var toStrasse=v.laengs?new THREE.Vector3(0,0,v.z-w.position.z):new THREE.Vector3(v.x-w.position.x,0,0);
      toStrasse.normalize();
      var bb=new THREE.Box3().setFromObject(w),c=new THREE.Vector3();bb.getCenter(c);
      var e=new THREE.Vector3();bb.getSize(e);
      var vorn=0,hinten=0,b2=new THREE.Box3(),cc=new THREE.Vector3();
      w.traverse(function(n){if(!n.isMesh||!n.geometry)return;
        if(!n.geometry.boundingSphere)n.geometry.computeBoundingSphere();
        var sk=Math.max(Math.abs(n.scale.x),Math.abs(n.scale.y),Math.abs(n.scale.z));
        if(n.geometry.boundingSphere.radius*sk*(w.scale.x||1)>=0.55)return;
        b2.setFromObject(n);b2.getCenter(cc);cc.sub(c);
        var along=cc.dot(toStrasse),half=Math.abs(toStrasse.x)>0.5?e.x/2:e.z/2;
        if(along>0.8*half)vorn++;else if(along<-0.8*half)hinten++;});
      raus.push({viertel:v.name,datei:(w.userData&&w.userData.datei)||"?",seite:w.userData.schauseite||"-",
                 vorn:vorn,hinten:hinten});});});
    return raus;}`,
}, '_schau_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const r = await page.evaluate(() => window.__th.schau())
let falsch = 0, ohne = 0
console.log(`${r.length} Viertelgebaeude — Kleinteile an der Strassenwand (vorn) gegen die Rueckwand (hinten)\n`)
for (const b of r) {
  const verkehrt = b.hinten >= 12 && b.hinten > b.vorn * 1.5
  if (verkehrt) falsch++
  if (b.vorn < 12 && b.hinten < 12) ohne++
  console.log('  ' + (verkehrt ? '❌' : '  ') + b.viertel.padEnd(20) + b.datei.padEnd(28) + 'vorn ' + String(b.vorn).padStart(4) + ' · hinten ' + String(b.hinten).padStart(4) + '  (erkannt: ' + b.seite + ')')
}
console.log(`\n${falsch ? '❌' : '✅'} Gebaeude mit der Rueckwand zur Strasse: ${falsch}`)
console.log(`ℹ️  ohne erkennbare Schauseite (beide Waende < 12 Kleinteile): ${ohne}`)
console.log(`${jsFehler.length ? '❌' : '✅'} JS-Fehler: ${jsFehler.length}`)
console.log(`\n${!falsch && !jsFehler.length ? '🎉 SCHAUSEITE BESTANDEN' : '💥 SCHAUSEITE FEHLGESCHLAGEN'} — ${r.length} geprueft, ${falsch} verkehrt`)
await browser.close()
aufraeumen(TMP)
process.exit(!falsch && !jsFehler.length ? 0 : 1)
