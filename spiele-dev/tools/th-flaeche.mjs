/* th-flaeche.mjs — flache Boden-Meshes in einem Weltbereich auflisten.
 *
 *   node spiele-dev/tools/th-flaeche.mjs <x0> <z0> <x1> <z1>
 *
 * WOZU: Markierungen (Haltelinien, Zebras, Pfeile, Parkfelder) sind duenne Planes
 * ohne Namen — wenn eine davon im Rasen statt auf der Fahrbahn liegt (User-Screenshot
 * an der Kreuzung -78/58), findet man den Verursacher von oben nicht. Dieses Werkzeug
 * listet jedes flache Mesh (<0,3 m hoch) im Bereich mit Weltbox, Farbe und Geometrie.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const [x0, z0, x1, z1] = process.argv.slice(2).map(Number)
if (isNaN(x1)) { console.log('Aufruf: th-flaeche.mjs <x0> <z0> <x1> <z1>'); process.exit(1) }
const TMP = 'spiele-dev/tools/_flaeche_probe.html'
mitSonden('traumhaus.html', {
  flaechen: `function(ax0,az0,ax1,az1){
    var out=[],box=new THREE.Box3();
    scene.traverse(function(n){
      if(!n.isMesh||!n.geometry)return;
      box.setFromObject(n);
      if(!isFinite(box.min.x))return;
      var cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
      if(cx<ax0||cx>ax1||cz<az0||cz>az1)return;
      if(box.max.y-box.min.y>0.3||box.max.y>1.5)return;
      var c=n.material&&n.material.color?"#"+n.material.color.getHexString():"?";
      out.push({typ:n.geometry.type,farbe:c,name:n.name||n.parent&&n.parent.name||"",
        inst:!!n.isInstancedMesh,anz:n.count||1,
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
