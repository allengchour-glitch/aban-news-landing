/* th-flacker.mjs — flackert es an dieser Stelle wirklich?
 *
 *   node spiele-dev/tools/th-flacker.mjs <x> <z>
 *
 * ⚠️ WOZU. Ein einzelnes Bild kann Flackern gar nicht zeigen — es ist ein Unterschied
 * ZWISCHEN Bildern. Darum wird zweimal gerendert, mit winzig versetzter Kamera, und
 * die Bildpunkte werden verglichen. Kippt eine Flaeche zwischen beiden Aufnahmen die
 * Farbe, streitet sie um die Tiefe; bleibt sie gleich, tut sie es nicht.
 *
 * Zwei Versaetze, beide mit Bedeutung:
 *   0,02 m — was sich beim ruhigen Stehen aendert. Kippt es hier, flackert es schon
 *            im Stillstand.
 *   0,15 m — was sich beim Gehen aendert.
 *
 * ⚠️ DIESES WERKZEUG HAT SEINEN ERSTEN EINSATZ GEGEN DIE EIGENE ERWARTUNG ENTSCHIEDEN.
 * `th-zkampf` meldete bei (233|202) den staerksten Kandidaten ueberhaupt: 616 m²,
 * exakt 0,0 mm Abstand, deutlich verschiedene Farben. Gemessen kippten 0,00 % bzw.
 * 0,01 % der Bildpunkte — es flackert dort nicht. Eine geometrische Rechnung sagt
 * eben nur, dass zwei Flaechen nah beieinanderliegen, nicht dass beide auch SICHTBAR
 * sind. Wer einen Tiefenstreit meldet, soll ihn vorher hiermit belegen. */
import { spielOeffnen, mitSonden } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
import { writeFileSync } from 'node:fs'

const [X, Z] = [+process.argv[2], +process.argv[3]]
const datei = mitSonden('traumhaus.html', {
  setzSpieler: 'function(x,z){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;return [s.x,s.z];}',
  paar: 'function(x,z,eps){' +
    'var S=256,rt=new THREE.WebGLRenderTarget(S,S);' +
    'var cam=new THREE.PerspectiveCamera(40,1,0.1,300);' +
    'function schuss(dx){' +
      'cam.position.set(x+dx,14,z+16);cam.lookAt(x,0,z);cam.updateMatrixWorld(true);' +
      'var alt=renderer.getRenderTarget();' +
      'renderer.setRenderTarget(rt);renderer.render(scene,cam);renderer.setRenderTarget(alt);' +
      'var b=new Uint8Array(S*S*4);renderer.readRenderTargetPixels(rt,0,0,S,S,b);return b;}' +
    'var a=schuss(0),b=schuss(eps);' +
    'var kipp=0,ges=0;' +
    'for(var i=0;i<S*S;i++){' +
      'var d=Math.max(Math.abs(a[i*4]-b[i*4]),Math.abs(a[i*4+1]-b[i*4+1]),Math.abs(a[i*4+2]-b[i*4+2]));' +
      'ges++;if(d>40)kipp++;}' +
    /* Bild aus dem ersten Schuss mitgeben */
    'var cv=document.createElement("canvas");cv.width=S;cv.height=S;' +
    'var ctx=cv.getContext("2d"),img=ctx.createImageData(S,S);' +
    'for(var y=0;y<S;y++)for(var q=0;q<S;q++){var s1=((S-1-y)*S+q)*4,d1=(y*S+q)*4;' +
      'img.data[d1]=a[s1];img.data[d1+1]=a[s1+1];img.data[d1+2]=a[s1+2];img.data[d1+3]=255;}' +
    'ctx.putImageData(img,0,0);rt.dispose();' +
    'return {kipp:kipp,ges:ges,bild:cv.toDataURL()};}'
}, 'spiele-dev/tools/_flacker_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 45000 })
await page.evaluate((v) => window.__th.setzSpieler(v[0], v[1]), [X, Z])
await page.waitForTimeout(6000)
for (const eps of [0.02, 0.15]) {
  const R = await page.evaluate((v) => window.__th.paar(v[0], v[1], v[2]), [X, Z, eps])
  const anteil = (100 * R.kipp / R.ges).toFixed(2)
  console.log(`Versatz ${eps} m → ${R.kipp} von ${R.ges} Bildpunkten kippen (${anteil} %)`)
  writeFileSync(`/tmp/flacker-${eps}.png`, Buffer.from(R.bild.split(',')[1], 'base64'))
}
console.log('JS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
await browser.close()
