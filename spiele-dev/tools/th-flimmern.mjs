/**
 * th-flimmern.mjs — was schaltet seine Sichtbarkeit um, obwohl sich nichts bewegt?
 *
 * ⚠️ WOZU. `visible` hat in dieser Welt viele Schreiber: der LOD-Index (lodTakt),
 * der Laternen-Pool, der LAMP_MAX-Deckel, das Einfrieren, die Tag/Nacht-Logik.
 * Schreiben zwei davon dasselbe Objekt, schalten sie es gegeneinander um — und
 * niemand merkt es, weil das Bild nur flackert statt zu fehlen. Genau so lag der
 * Fall bei den Punktlichtern: Pool und Deckel setzten dasselbe Feld, 9 statt 6
 * Lichter brannten und three.js baute fuenfmal in 25 s seine Shader neu.
 *
 * Steht die Kamera still, hat kein entfernungsabhaengiger Regler einen Grund
 * umzuschalten. Jeder Wechsel ist dann verdaechtig.
 *
 * Gemessen wird je Bild:
 *   - die ZAHL sichtbarer PointLights (nur ihre Zahl kostet Shader-Uebersetzungen)
 *   - jede Sichtbarkeitsaenderung an Meshes, mit Name und Zahl der Wechsel
 *   - wie weit sich die Kamera bewegt hat, damit echte LOD-Wechsel erkennbar sind
 *
 * Aufruf:  node spiele-dev/tools/th-flimmern.mjs [sekunden]
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const SEK = Number(process.argv[2] || 25)

const sonde = `function(sekunden){
  return new Promise(function(res){
    var t0=performance.now(), proben=0;
    var kam0=camera.position.clone(), kamWeg=0, kamAlt=camera.position.clone();
    var mesh=[], stand=[], wechsel=[], lichtZahl=null, lichtWechsel=0, verteilung={};
    scene.traverse(function(o){ if(o.isMesh||o.isInstancedMesh)mesh.push(o); });
    for(var i=0;i<mesh.length;i++){stand.push(mesh[i].visible?1:0);wechsel.push(0);}
    function tick(){
      proben++;
      kamWeg+=camera.position.distanceTo(kamAlt); kamAlt.copy(camera.position);
      for(var i=0;i<mesh.length;i++){
        var v=mesh[i].visible?1:0;
        if(v!==stand[i]){wechsel[i]++;stand[i]=v;}}
      var n=0;
      scene.traverse(function(o){ if(o.isPointLight&&o.visible)n++; });
      verteilung[n]=(verteilung[n]||0)+1;
      if(lichtZahl!==null&&n!==lichtZahl)lichtWechsel++;
      lichtZahl=n;
      if(performance.now()-t0<sekunden*1000)requestAnimationFrame(tick);
      else{
        var L=[];
        for(var k=0;k<mesh.length;k++) if(wechsel[k]>1){
          var d=null,q=mesh[k];while(q&&q!==scene){if(q.userData&&q.userData.datei)d=q.userData.datei;q=q.parent;}
          var w=new THREE.Vector3(); mesh[k].getWorldPosition(w);
          L.push({was:d||mesh[k].name||mesh[k].geometry.type, n:wechsel[k],
                  bei:(+w.x.toFixed(0))+"|"+(+w.z.toFixed(0))});}
        L.sort(function(a,b){return b.n-a.n;});
        var summe={};
        L.forEach(function(e){summe[e.was]=(summe[e.was]||0)+1;});
        res({meshes:mesh.length, proben:proben, sekunden:+((performance.now()-t0)/1000).toFixed(1),
             kameraWeg:+kamWeg.toFixed(2), kameraVersatz:+camera.position.distanceTo(kam0).toFixed(2),
             lichtWechsel:lichtWechsel, lichtVerteilung:verteilung,
             flimmernd:L.length, nachArt:summe, schlimmste:L.slice(0,12)});}
    }
    requestAnimationFrame(tick);});}`

mitSonden('traumhaus.html', { flimmern: sonde }, '_flimmern.html')
const { browser, page, jsFehler } = await spielOeffnen('_flimmern.html', { warten: 25000 })
const R = await page.evaluate((s) => window.__th.flimmern(s), SEK)
await browser.close()
aufraeumen('_flimmern.html')

console.log(`${R.meshes} Meshes, ${R.proben} Bilder in ${R.sekunden} s`)
console.log(`Kamera: ${R.kameraWeg} m gelaufen, ${R.kameraVersatz} m Versatz gesamt\n`)
console.log(`Punktlichter — Zahlwechsel: ${R.lichtWechsel}   Verteilung: ${JSON.stringify(R.lichtVerteilung)}`)
if (!R.flimmernd) console.log('✅ Kein Mesh schaltet mehr als einmal um')
else {
  console.log(`\n⚠️  ${R.flimmernd} Meshes mit mehr als einem Sichtbarkeitswechsel:`)
  for (const [was, n] of Object.entries(R.nachArt).sort((a, b) => b[1] - a[1]))
    console.log(`   ${String(n).padStart(5)}x  ${was}`)
  console.log('\n   Schlimmste einzeln:')
  for (const e of R.schlimmste) console.log(`   ${String(e.n).padStart(3)} Wechsel  ${e.bei.padStart(12)}  ${e.was}`)
}
console.log('\nJS-Fehler:', jsFehler.length)
