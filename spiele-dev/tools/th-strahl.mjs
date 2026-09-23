/* th-strahl.mjs — was liegt an einem Punkt uebereinander? Alle Treffer eines Strahls von oben.
 *
 *   node spiele-dev/tools/th-strahl.mjs '[[x,z],[x,z],...]'
 *
 * WOZU (Runde 92): th-autoboden meldete "Postauto faehrt auf Gruen", th-flaeche und th-umfeld
 * zeigten unter dem Wagen aber nur Asphalt — beide filtern nach Groesse oder Hoehe. Dieses
 * Werkzeug filtert NICHTS: es listet je Punkt jeden Treffer von y 3 abwaerts mit Hoehe,
 * Farbe, Geometrie, Groesse und Name. So kamen der 541-m-Bergsaum (y 0) und das 457-m-
 * Feldernetz (y 0,02) ueber der Strasse zum Vorschein.
 * ⚠️ Nur Meshes: Sprites brauchen raycaster.camera, sonst "matrixWorld of null".
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const P = JSON.parse(process.argv[2] || '[[0,0]]')
const TMP = 'spiele-dev/tools/_strahl_probe.html'
mitSonden('traumhaus.html', {
  strahl: `function(x,z){
    var RC=new THREE.Raycaster(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));RC.far=4;
    /* Sprites brauchen raycaster.camera — sonst "matrixWorld of null". Nur echte Meshes. */
    RC.camera=camera;var L=[];scene.traverse(function(o){if((o.isMesh||o.isInstancedMesh)&&!o.isSprite&&o.geometry)L.push(o);});
    var H=RC.intersectObjects(L,false),out=[];
    H.forEach(function(h){var o=h.object,m=Array.isArray(o.material)?o.material[0]:o.material;
      var nm="",p=o;while(p&&p!==scene){var d=(p.userData&&p.userData.datei)||p.name;if(d){nm=d;break;}p=p.parent;}
      var bb=new THREE.Box3().setFromObject(o),s=new THREE.Vector3();bb.getSize(s);
      out.push({y:+h.point.y.toFixed(3),n:String(nm).slice(0,30),typ:o.geometry.type.replace("Geometry",""),inst:!!o.isInstancedMesh,
        c:m&&m.color?"#"+m.color.getHexString():"-",map:!!(m&&m.map),tr:!!(m&&m.transparent),dw:m?m.depthWrite:null,
        ny:h.face?+h.face.normal.clone().transformDirection(o.matrixWorld).y.toFixed(2):null,
        gr:[+s.x.toFixed(0),+s.y.toFixed(2),+s.z.toFixed(0)]});});
    return out;}`,
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 70000 })
for (const [x, z] of P) {
  const R = await page.evaluate((v) => window.__th.strahl(...v), [x, z])
  console.log(`\n(${x}|${z}):`)
  for (const h of R) console.log(`  y ${String(h.y).padStart(7)}  ${h.c}  ${h.typ.padEnd(9)} ${h.inst ? 'INST' : '    '} map ${h.map ? 1 : 0} tr ${h.tr ? 1 : 0} dw ${h.dw}  ny ${h.ny}  ${h.gr.join('x')}  ${h.n}`)
}
console.log('JS-Fehler', jsFehler.length)
await browser.close(); aufraeumen(TMP)
