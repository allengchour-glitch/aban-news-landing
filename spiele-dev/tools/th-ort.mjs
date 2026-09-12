/* th-ort.mjs — was steht eigentlich an dieser Stelle?
 *
 *   node spiele-dev/tools/th-ort.mjs <x> <z> [umkreis=30] [alles]
 *
 * ⚠️ „alles" NIMMT AUCH PROZEDURALES MIT. Ohne den Zusatz werden nur Modelle mit
 * `userData.datei` gelistet — und damit faellt alles durch, was direkt aus Geometrie
 * gebaut wurde. Genau daran ist die Suche nach einem grauen Bogen auf dem eigenen
 * Grundstueck gescheitert: das Werkzeug meldete „nichts", und im Bild lag er da.
 * Ein Werkzeug, das „was steht hier?" beantworten soll, darf die halbe Welt nicht
 * stillschweigend auslassen.
 *
 * ⚠️ WOZU. Aus einem Schraegbild laesst sich nicht entscheiden, WAS man sieht. Drei
 * Befunde dieser Woche kamen erst zustande, als die Frage als Liste beantwortet war:
 * die Kathedrale, deren Marke 216 m danebenlag; ein vermeintlicher „Spielplatz", der
 * ein Friedhof ist; und der leere Bogen auf dem eigenen Grundstueck.
 *
 * ⚠️ DIE FALLE, DIE DIESES WERKZEUG UEBERHAUPT NOETIG MACHT — DREIMAL DIESELBE:
 * Wiederholte Modelle liegen in einer `InstancedMesh`, und `userData.datei` haengt am
 * CONTAINER. Dessen Weltposition ist fast immer der Ursprung. Wer sie ausliest,
 * bekommt jede Instanz-Gruppe der ganzen Welt als „steht hier" gemeldet — die
 * Wegwerf-Fassung meldete 64 LANDEBAHN-Module (th25, Flughafen) auf dem Grundstueck
 * in der Stadtmitte. Nur weil die Antwort absurd war, fiel es auf.
 * Dieselbe Falle sass zuvor in `th-vielfalt` (dort behoben) und in `th-flaeche`
 * (ebenfalls behoben). Merksatz: bei allem, was Instanzen anfasst, ZUERST danach sehen.
 *
 * Gemeldet wird je Datei: Stueckzahl IM Umkreis, groesstes Stueck (Hoehe/Breite) und
 * bis zu drei echte Koordinaten.
 */
import { spielOeffnen, mitSonden, aufraeumen } from './th-lib.mjs'

const [X, Z, R] = [+process.argv[2], +process.argv[3], +(process.argv[4] || 30)]
const ALLES = process.argv.slice(2).includes('alles')
if (!isFinite(X) || !isFinite(Z)) {
  console.log('Aufruf: th-ort.mjs <x> <z> [umkreis=30]'); process.exit(1)
}
const TMP = 'spiele-dev/tools/_ort_probe.html'
mitSonden('traumhaus.html', {
  setzSpieler: 'function(x,z){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;return [s.x,s.z];}',
  umkreis: `function(x,z,r,alles){
    var out={},M=new THREE.Matrix4(),P=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();
    function nimm(k,px,pz,h,b){
      if(!out[k])out[k]={n:0,h:0,b:0,bsp:[]};
      var q=out[k];q.n++;
      if(h>q.h){q.h=+h.toFixed(1);q.b=+b.toFixed(1);}
      if(q.bsp.length<3)q.bsp.push(Math.round(px)+"|"+Math.round(pz));}
    scene.traverse(function(o){
      var k=o.userData&&o.userData.datei;
      if(!k){
        if(!alles||!o.isMesh||!o.geometry)return;
        /* Prozedurales hat keinen Dateinamen — als Schluessel dient Bauform und Farbe,
           damit die Zeile wenigstens sagt, WAS es ist. */
        var m9=Array.isArray(o.material)?o.material[0]:o.material;
        /* ⚠️ WELTGROSSE DINGE HERAUSHALTEN. Himmelskuppel (1040 m), Bodenebene (900 m)
           und Gelaende haben ihren Ursprung bei (0|0) und rutschen damit durch JEDEN
           Umkreisfilter — sie uebertoenen die Antwort, nach der man gesucht hat.
           Wer groesser ist als der Umkreis, steht nicht „hier", er ist ueberall. */
        var bb9=new THREE.Box3().setFromObject(o),e9=new THREE.Vector3();bb9.getSize(e9);
        if(Math.max(e9.x,e9.z)>r*2)return;
        k=(o.name||o.geometry.type)+(m9&&m9.color?" "+("#"+m9.color.getHexString()):"");}
      if(o.isInstancedMesh){
        /* Je Instanz pruefen — der Container steht im Ursprung. */
        if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
        var ge=new THREE.Vector3();o.geometry.boundingBox.getSize(ge);
        o.updateMatrixWorld(true);
        for(var i=0;i<o.count;i++){
          o.getMatrixAt(i,M);M.premultiply(o.matrixWorld);M.decompose(P,Q,S);
          if(Math.hypot(P.x-x,P.z-z)>r)continue;
          nimm(k,P.x,P.z,ge.y*Math.abs(S.y),Math.max(ge.x*Math.abs(S.x),ge.z*Math.abs(S.z)));}
        return;}
      var p=new THREE.Vector3();o.getWorldPosition(p);
      if(Math.hypot(p.x-x,p.z-z)>r)return;
      var bb=new THREE.Box3().setFromObject(o),e=new THREE.Vector3();bb.getSize(e);
      nimm(k,p.x,p.z,e.y,Math.max(e.x,e.z));});
    return out;}`
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 45000 })
/* ⚠️ Die Figur mitnehmen: lodTakt haengt am SPIELER. Ohne das ist der Ort leer
   geraeumt — siehe RUNBOOK, "Drei Abschalter". */
await page.evaluate((v) => window.__th.setzSpieler(v[0], v[1]), [X, Z])
await page.waitForTimeout(6000)
const O = await page.evaluate((v) => window.__th.umkreis(v[0], v[1], v[2], v[3]), [X, Z, R, ALLES])
const zeilen = Object.entries(O).sort((a, b) => b[1].n - a[1].n)
console.log(`\n${ALLES ? 'Alles' : 'Modelle'} im Umkreis ${R} m um (${X}|${Z}) — ${zeilen.length} verschiedene:`)
if (!ALLES) console.log('(nur Modelle mit Dateinamen — fuer prozedurale Teile „alles" anhaengen)')
if (!zeilen.length) console.log('  nichts')
for (const [k, v] of zeilen)
  console.log('  ' + String(v.n).padStart(3) + '×  ' + k.padEnd(30) +
    ` h ${String(v.h).padStart(5)} m  b ${String(v.b).padStart(5)} m   ` + v.bsp.join(', '))
console.log('JS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
await browser.close()
aufraeumen(TMP)
