/**
 * th-seilbahn.mjs — steht die Seilbahn auf dem Berg oder IM Berg?
 *
 * ⚠️ WOZU EIN EIGENES WERKZEUG. Die Seilbahn hat ihre Gelaendehoehen jahrelang mit
 * einer NACHGEBAUTEN Formel gerechnet (`-6 + 75*(1 - d/51.75)`, ein runder Kegel),
 * waehrend `bergGeo` den Hausberg elliptisch staucht (streck 1,4835 laengs des Grats,
 * 0,92 quer) und um rotation.y = 3,5 rad dreht. Zwei Ableitungen derselben Form, die
 * auseinanderlaufen — der haeufigste Fehler in diesem Spiel.
 * Kein anderes Werkzeug hat es gefunden: th-3d sieht nur Modell GEGEN Modell, nie
 * Modell gegen GELAENDE, und das Gelaende ist ein einziges grosses Mesh.
 *
 * Ausgabe:
 *   imFels   — Teile, deren Unterkante mehr als 1,5 m unter der Gelaendeoberflaeche
 *              liegt. MUSS leer sein.
 *   schwebt  — Teile mehr als 2 m ueber dem Gelaende. Auf der Bergstation ist das
 *              normal (sie steht auf dem Felssockel), auf einer Stuetze nicht.
 *   probe    — window._bergHoehe an den Schluesselpunkten der Bahn.
 *
 * Aufruf:  node spiele-dev/tools/th-seilbahn.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  var R={},B=window._berge||[];
  R.berge=B.length; R.mitHoehe=B.filter(function(b){return !!b.hoehe;}).length;
  R.probe={};
  [[121.5,174.9],[150.8,127],[138.9,142.8],[129,156],[144,136],[228,24]].forEach(function(p){
    R.probe[p[0]+"|"+p[1]]=+window._bergHoehe(p[0],p[1]).toFixed(2);});
  var teile=[];
  scene.traverse(function(o){
    var n=o.userData&&(o.userData.datei||o.userData.name);
    if(n&&String(n).indexOf("th26_")===0){
      var bb=new THREE.Box3().setFromObject(o);
      teile.push({n:String(n),x:+o.position.x.toFixed(1),z:+o.position.z.toFixed(1),
        y0:+bb.min.y.toFixed(2),y1:+bb.max.y.toFixed(2),
        gel:+window._bergHoehe(o.position.x,o.position.z).toFixed(2)});}});
  R.anzahl=teile.length;
  R.teile=teile.sort(function(a,b){return a.n<b.n?-1:1;});
  R.imFels=teile.filter(function(t){return t.gel-t.y0>1.5;})
    .map(function(t){return t.n+" "+t.x+"|"+t.z+" steckt "+(t.gel-t.y0).toFixed(2)+" m tief";});
  R.schwebt=teile.filter(function(t){return t.y0-t.gel>2 && t.n.indexOf("gondel")<0;})
    .map(function(t){return t.n+" "+t.x+"|"+t.z+" schwebt "+(t.y0-t.gel).toFixed(2)+" m";});
  return R;}`

mitSonden('traumhaus.html', { seil: sonde }, '_seil.html')
const { browser, page, jsFehler } = await spielOeffnen('_seil.html', { warten: 25000 })
const R = await page.evaluate(() => window.__th.seil())
await browser.close()
aufraeumen('_seil.html')
console.log(JSON.stringify(R, null, 1))
console.log('JS-Fehler:', jsFehler.length, jsFehler.slice(0, 3))
