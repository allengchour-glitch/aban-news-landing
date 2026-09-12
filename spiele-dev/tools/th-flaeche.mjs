/* th-flaeche.mjs — flache Boden-Meshes in einem Weltbereich auflisten.
 *
 *   node spiele-dev/tools/th-flaeche.mjs <x0> <z0> <x1> <z1>
 *
 * WOZU: Markierungen (Haltelinien, Zebras, Pfeile, Parkfelder) sind duenne Planes
 * ohne Namen — wenn eine davon im Rasen statt auf der Fahrbahn liegt (User-Screenshot
 * an der Kreuzung -78/58), findet man den Verursacher von oben nicht. Dieses Werkzeug
 * listet jedes flache Mesh (<0,3 m hoch) im Bereich mit Weltbox, Farbe und Geometrie.
 *
 * ⚠️ INSTANZEN EINZELN PRUEFEN, NICHT DEN CONTAINER (2026-09-12). Vorher lief die
 * Bereichspruefung ueber `box.setFromObject(n)` — bei einer `InstancedMesh` liefert
 * das die Box des CONTAINERS, und die liegt fast immer im Ursprung. Folge: eine
 * Abfrage auf dem eigenen Grundstueck meldete 160 Flaechen, ALLE bei „x 0..0 z 0..0" —
 * Grasbueschel aus der ganzen Welt, die nur deshalb durch den Filter rutschten. Das
 * Gesuchte (ein grauer Bogen in der Wiese) tauchte gar nicht auf.
 * Dieselbe Falle war zuvor in `th-vielfalt` behoben worden; sie sass hier weiter.
 * Jetzt wird je Instanz die Matrix gelesen, nur die Instanzen IM Bereich gezaehlt,
 * und die gemeldete Box ist die der getroffenen Instanzen.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const [x0, z0, x1, z1] = process.argv.slice(2).map(Number)
if (isNaN(x1)) { console.log('Aufruf: th-flaeche.mjs <x0> <z0> <x1> <z1>'); process.exit(1) }
const TMP = 'spiele-dev/tools/_flaeche_probe.html'
mitSonden('traumhaus.html', {
  flaechen: `function(ax0,az0,ax1,az1){
    var out=[],box=new THREE.Box3();
    var M=new THREE.Matrix4(),P=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();
    scene.traverse(function(n){
      if(!n.isMesh||!n.geometry)return;
      var c=n.material&&n.material.color?"#"+n.material.color.getHexString():"?";
      var nam=n.name||n.parent&&n.parent.name||"";
      if(n.isInstancedMesh){
        /* Geometrie EINMAL vermessen, dann je Instanz versetzt pruefen. */
        if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();
        var gb=n.geometry.boundingBox,ge=new THREE.Vector3();gb.getSize(ge);
        n.updateMatrixWorld(true);
        var tr=0,mx0=1e9,mx1=-1e9,mz0=1e9,mz1=-1e9,my=-1e9,hoch=0;
        for(var i=0;i<n.count;i++){
          n.getMatrixAt(i,M);M.premultiply(n.matrixWorld);M.decompose(P,Q,S);
          if(P.x<ax0||P.x>ax1||P.z<az0||P.z>az1)continue;
          var h=ge.y*Math.abs(S.y), ob=P.y+gb.max.y*S.y;
          if(h>0.3||ob>1.5){hoch++;continue;}
          tr++;
          if(P.x<mx0)mx0=P.x;if(P.x>mx1)mx1=P.x;
          if(P.z<mz0)mz0=P.z;if(P.z>mz1)mz1=P.z;
          if(ob>my)my=ob;}
        if(!tr)return;
        out.push({typ:n.geometry.type,farbe:c,name:nam,inst:true,anz:tr,
          x:[+mx0.toFixed(1),+mx1.toFixed(1)],z:[+mz0.toFixed(1),+mz1.toFixed(1)],
          y:+my.toFixed(3)});
        return;}
      box.setFromObject(n);
      if(!isFinite(box.min.x))return;
      var cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
      if(cx<ax0||cx>ax1||cz<az0||cz>az1)return;
      if(box.max.y-box.min.y>0.3||box.max.y>1.5)return;
      out.push({typ:n.geometry.type,farbe:c,name:nam,
        inst:false,anz:1,
        x:[+box.min.x.toFixed(1),+box.max.x.toFixed(1)],
        z:[+box.min.z.toFixed(1),+box.max.z.toFixed(1)],
        y:+box.max.y.toFixed(3)});});
    return out;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const liste = await page.evaluate((a) => window.__th.flaechen(...a), [x0, z0, x1, z1])
liste.sort((a, b) => a.x[0] - b.x[0])
for (const f of liste)
  console.log(`${f.typ.padEnd(18)} ${f.farbe} x ${String(f.x[0]).padStart(7)}..${String(f.x[1]).padEnd(7)} z ${String(f.z[0]).padStart(7)}..${String(f.z[1]).padEnd(7)} y=${f.y}${f.inst ? ' inst×' + f.anz : ''} ${f.name}`)
console.log(`${liste.length} flache Meshes · JS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
