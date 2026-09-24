/* Sonde: flimmert es mit der SPIELKAMERA? node probe-tiefenstreit.mjs [quelle]
   Runde 99 (User: „flimmert die ganze map fast"). th-flacker nimmt eine eigene Kamera (near 0,1 / far 300) und rendert
   in ein WebGLRenderTarget (three r128: 16-Bit-Tiefe); das Spiel zeichnet ins Bild mit 24 Bit.
   MASS: dasselbe Bild zweimal, einmal mit dem near-Wert, den das SPIEL gerade hat, einmal mit near REF (Standard 3 m,
   die Kamera steht 7…135 m ueber dem Boden — naeher als 3 m ist dort nichts). Jeder Bildpunkt, der sich dabei aendert,
   hat seinen Gewinner nur wegen fehlender Tiefengenauigkeit — das ist Tiefenstreit, und der wandert beim Bewegen als
   Flimmern ueber die Flaeche. Ein Versatz-Vergleich (erste Fassung) sah das kaum: die Asphaltschichten haben fast
   dieselbe Farbe, und 3 cm Versatz verschieben das Muster nur.
   ⚠️ Die Kamera muss wirklich auf dem Ziel stehen (erster Lauf: Magenta-Probe 0 Bildpunkte, weil sie noch woanders
   stand) — darum wird geprueft, dass das Ziel in der Bildmitte liegt.
   Gegenprobe: Magenta-Flaeche 1 mm UNTER der Fahrbahn der Hauptstrasse muss gezaehlt werden — mit near 0,1 wie vor
   Runde 99 (mit dem neuen near wird 1 mm sauber aufgeloest, die Probe waere dann zu Recht stumm).
   ⚠️ Bleibt ein Rest bei weissen DURCHSICHTIGEN Flaechen (Stadtmitte ~2 %): three.js sortiert Durchsichtiges nach der
   projizierten Tiefe, die von near abhaengt — zwei grosse durchsichtige Ebenen (Wolkenschatten 0,008 und eine bei
   -0,02) tauschen dann die Reihenfolge. Das ist Mischreihenfolge, kein Tiefenstreit (Strahl: beide Treffer transp). */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const REF = +(process.env.REF || 3)
const TMP = '_probe_tiefenstreit_tmp.html'
mitSonden(quelle, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
    followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();camera.updateMatrixWorld(true);
    var p=new THREE.Vector3(x,0,z).project(camera);return [+p.x.toFixed(2),+p.y.toFixed(2)];}`,
  streit: `function(ref,erzwinge){var gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    function bild(){renderer.render(scene,camera);var b=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,b);return b;}
    var spiel=camera.near;if(erzwinge){camera.near=erzwinge;camera.updateProjectionMatrix();}var a=bild();camera.near=ref;camera.updateProjectionMatrix();var b=bild();
    camera.near=spiel;camera.updateProjectionMatrix();renderer.render(scene,camera);
    var n12=0,n40=0;for(var i=0;i<w*h;i++){var d=Math.max(Math.abs(a[i*4]-b[i*4]),Math.abs(a[i*4+1]-b[i*4+1]),Math.abs(a[i*4+2]-b[i*4+2]));if(d>12)n12++;if(d>40)n40++;}
    return {n12:n12,n40:n40,ges:w*h,near:spiel,bits:gl.getParameter(gl.DEPTH_BITS)};}`,
  falle: `function(an){if(window._falle){scene.remove(window._falle);window._falle=null;}if(!an)return 0;
    var m=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({color:0xff00ff}));
    m.rotation.x=-Math.PI/2;m.position.set(20,-0.004,58);m.userData.nieAusblenden=1;scene.add(m);window._falle=m;return 1;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 60000 })
async function hin(k) {
  let p = [9, 9]
  for (let i = 0; i < 5 && (Math.abs(p[0]) > 0.15 || Math.abs(p[1]) > 0.15); i++) { p = await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(2500); p = await page.evaluate((v) => window.__th.kam(...v), k) }
  return p
}
const P = [['Kreuzung (78|58)', 78, 58, 44, 0.78, 0.8], ['Stadtmitte', 0, 20, 44, 0.78, 0.3], ['Ring Ost', 117, 0, 44, 0.78, 1.3],
  ['Hauptstrasse weit', 20, 58, 90, 0.6, 0], ['Viertel Gewerbe', 230, 0, 44, 0.78, 0.5], ['Zoom nah', 60, 58, 14, 0.9, 0.5]]
let summe = 0, ges = 0
for (const [n, ...k] of P) {
  const p = await hin(k)
  const r = await page.evaluate((f) => window.__th.streit(f), REF)
  summe += r.n12; ges += r.ges
  console.log(`${n.padEnd(18)} Tiefenstreit ${(100 * r.n12 / r.ges).toFixed(2).padStart(5)} % der Bildpunkte (stark ${(100 * r.n40 / r.ges).toFixed(2)} %)  · Spiel-near ${r.near} · ${r.bits} Bit · Ziel im Bild (${p})`)
}
console.log(`GESAMT Tiefenstreit ${(100 * summe / ges).toFixed(2)} %`)
await hin([20, 58, 44, 0.78, 0])
const ohne = await page.evaluate((f) => window.__th.streit(f, 0.1), REF)
await page.evaluate(() => window.__th.falle(1))
const mit = await page.evaluate((f) => window.__th.streit(f, 0.1), REF)
await page.evaluate(() => window.__th.falle(0))
console.log(`GEGENPROBE (Magenta 1 mm unter der Fahrbahn, near 0,1 wie vorher): ${ohne.n12} -> ${mit.n12} Bildpunkte ${mit.n12 > ohne.n12 + 200 ? '✓ schlaegt an' : '✗ STUMM'}`)
console.log('JS-Fehler', jsFehler.length)
await browser.close(); aufraeumen(TMP)
