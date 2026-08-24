/* th-augen.mjs — die Stadt auf AUGENHOEHE ansehen, nicht aus der Vogelperspektive.
 *
 *   node spiele-dev/tools/th-augen.mjs <x> <z> [rot] [ziel.png]
 *
 * WARUM ES DAS GIBT: alle Karten-Runden bis 2026-08-23 haben die Stadt von oben
 * beurteilt. Der erste Blick aus Spielerhoehe hat sofort etwas gezeigt, das von
 * oben unsichtbar war — der Himmel fuellt dort rund 40 % des Bildes und war das
 * flachste Element der Szene (64-Zeilen-Verlauf mit sichtbaren Streifen, Wolken
 * alle oberhalb des Bildrands).
 *
 * ⚠️ NICHT `th-blick` mit kleinem Radius nehmen. Das landet zu leicht unter einem
 * Vordach oder in einer Wand — genau das ist passiert (Bild eines Portikus von
 * unten). Dieses Werkzeug setzt die Spielfigur an den Ort und schaltet die
 * EGO-Kamera des Spiels ein; damit ist der Blickpunkt immer ein gueltiger.
 *
 * ⚠️ Das Wetter wuerfelt pro Lauf (`rollWetter`). Zwei Bilder unterscheiden sich
 * in der Helligkeit dann durch das Wetter, nicht durch die Aenderung. Wer
 * vergleicht, muss das Wetter aus der Kopfzeile mitlesen.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const [xa, za, ra, out] = process.argv.slice(2)
if (xa === undefined) { console.log('Aufruf: th-augen.mjs <x> <z> [rot] [ziel.png]'); process.exit(1) }
const x = +xa, z = +za, rot = ra === undefined ? 0 : +ra
const ziel = out || '/tmp/th-augen.png'
const tmp = '_augen_tmp.html'

/* ⚠️ EINE FREIE STELLE SUCHEN. Beim ersten Versuch stand die Figur bei (0|96)
   IM Bahnhofsgebaeude — das Bild zeigte nur zwei Wandflaechen, und ohne diesen
   Hinweis haette ich es fuer einen Grafikfehler halten koennen. `freiPlatz`
   kennt die Grundrisse; ist der Wunschpunkt belegt, wird spiralfoermig nach
   aussen gesucht und die tatsaechlich benutzte Stelle gemeldet. */
const STELL = `function(x,z,r){
  var gx=x,gz=z,weg=0;
  if(typeof freiPlatz==="function"&&!freiPlatz(x,z,2)){
    suche: for(var d=3;d<=30;d+=3){
      for(var w=0;w<12;w++){
        var a=w/12*6.283, px=x+Math.cos(a)*d, pz=z+Math.sin(a)*d;
        if(freiPlatz(px,pz,2)){gx=px;gz=pz;weg=d;break suche;}}}}
  var s=sims[0];s.x=gx;s.z=gz;s.rot=r;
  /* ⚠️ Die Ego-Kamera schaut entlang Math.PI + camA — NICHT entlang sim.rot.
     Deshalb zeigten mehrere Fotos die Gegenrichtung, egal was rot war. Der
     Blickwinkel dieses Werkzeugs ist Welt-Yaw (0 = +z) und wird hier in camA
     uebersetzt. */
  camA=r-Math.PI;
  /* ⚠️ _hide friert die Figur ein — OHNE das laeuft die Spiel-KI zwischen
     Setzen und Foto weiter, dreht die Figur um und das Bild zeigt die
     Gegenrichtung. Genau so entstanden mehrere Fotos der falschen Seite. */
  s._hide=true;
  followSim=s;camTx=gx;camTz=gz;
  return {x:+gx.toFixed(1),z:+gz.toFixed(1),weg:weg,wetter:wetter,uhr:+uhrzeit.toFixed(0)};}`

/* ⚠️ `freiPlatz` REICHT NICHT als Beweis fuer eine gute Kameraposition. Bei
   (0|96) meldete es "frei", die Ego-Kamera steckte aber sichtbar in Geometrie —
   das Bild zeigte nur zwei Flaechen. `freiPlatz` kennt die eingetragenen
   Grundrisse, nicht jedes Dach, jeden Vorsprung und jede Bahnsteigkante.
   Darum wird zusaetzlich GEMESSEN: ein Strahl aus der Kamera in Blickrichtung.
   Ist der erste Treffer naeher als 1,5 m, steht die Kamera in etwas drin. */
const SICHT = `function(){
  var rc=new THREE.Raycaster();
  var dir=new THREE.Vector3();camera.getWorldDirection(dir);
  rc.set(camera.position.clone(),dir);
  /* ⚠️ NICHT rekursiv ueber scene.children strahlen. Dabei stiess der Raycaster
     auf ein Objekt ohne gueltige Elternkette und starb mit
     "Cannot read properties of null (reading 'matrixWorld')". Erst eine eigene
     Liste aus sichtbaren Meshes mit Geometrie UND Eltern sammeln, dann flach
     schneiden. */
  var ziele=[];
  scene.traverse(function(o){if(o&&o.isMesh&&o.geometry&&o.parent&&o.visible)ziele.push(o);});
  var tr=rc.intersectObjects(ziele,false).filter(function(t){return t.distance>0.01;});
  if(!tr.length)return {frei:true,dist:999,was:"nichts"};
  var o=tr[0].object,n=o.name||"";
  for(var a=o;a&&!n;a=a.parent)n=(a.userData&&a.userData.datei)||a.name||"";
  return {frei:tr[0].distance>1.5,dist:+tr[0].distance.toFixed(2),was:n||"unbenannt"};}`

mitSonden('traumhaus.html', { stell: STELL, sicht: SICHT }, tmp)
const { browser, page, jsFehler } = await spielOeffnen(tmp, { warten: 50000 })
/* Zweimal setzen: die Spielschleife zieht die Figur sonst wieder an ihren
   alten Platz, bevor das Bild faellt. */
let info = await page.evaluate((a) => window.__th.stell(a[0], a[1], a[2]), [x, z, rot])
await page.evaluate(() => window.__th.ego(true))
await page.waitForTimeout(6000)
info = await page.evaluate((a) => window.__th.stell(a[0], a[1], a[2]), [x, z, rot])
await page.waitForTimeout(6000)
const sicht = await page.evaluate(() => { try { return window.__th.sicht() } catch (e) { return { fehler: String(e).slice(0, 140) } } })
await page.screenshot({ path: ziel, timeout: 90000 })
const verschoben = info.weg ? `  ⚠️ ${x}/${z} war belegt -> ${info.x}/${info.z} (${info.weg} m)` : ''
console.log(`${ziel}  (Augenhoehe bei ${info.x}/${info.z}, Blick ${rot})${verschoben}`)
console.log(`   Wetter: ${info.wetter} · Uhr ${info.uhr} · JS-Fehler: ${jsFehler.length}`)
if (sicht.fehler) console.log(`   Sicht: Messung fehlgeschlagen — ${sicht.fehler}`)
else console.log(`   Sicht: erster Treffer ${sicht.dist} m (${sicht.was})${sicht.frei ? '' : '  ⚠️ KAMERA STECKT DRIN — anderen Standort waehlen'}`)
await browser.close()
aufraeumen(tmp)
