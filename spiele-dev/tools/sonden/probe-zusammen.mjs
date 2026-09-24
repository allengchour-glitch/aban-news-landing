/* Sonde: aendert das Zusammenfassen je Material (Runde 99) etwas am BILD? node probe-zusammen.mjs [quelle]
   Eine Seite mit ?ohneZF (nichts zusammengefasst), fertige Welt abwarten, an festen Punkten fotografieren; dann
   _zusammenfassen() ausloesen und dieselben Punkte noch einmal. Verglichen wird nur die STATISCHE Welt: alles `_bewegt`
   (Verkehr, Figuren, Zug, Boote) und alles Durchsichtige (Wolkenschatten) ist beim Fotografieren ausgeblendet, sonst
   misst man die Sekunden dazwischen. Erwartet: Unterschiede nur in der Ferne — Kleinteile, die vorher die
   Entfernungs-Ausblendung verbarg, stecken jetzt im zusammengefassten Mesh und bleiben sichtbar.
   ⚠️ Verdecker aus (`_vdAus`): die Sonde stellt die Figur auf den Zielpunkt — am Freizeitpark mitten in den Rohbau.
   Nach dem Zusammenfassen kannte die neu gebaute Verdecker-Liste dessen Dach, machte es durchsichtig, und die Sonde
   blendet Durchsichtiges aus: 11,9 % „Unterschied", der keiner war (so gewollt: Dach ueber der Figur blendet aus).
   Bilder: $OUT/zf-<punkt>-{vor,nach}.png (OUT Standard: Scratch des Aufrufers oder /tmp). */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
import { writeFileSync } from 'node:fs'
const quelle = process.argv[2] || 'traumhaus.html'
const OUT = process.env.OUT || '/tmp'
const TMP = '_probe_zusammen_tmp.html'
mitSonden(quelle, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();
    camera.updateMatrixWorld(true);if(typeof lodTakt==="function")lodTakt(x,z);var p=new THREE.Vector3(x,0,z).project(camera);return [+p.x.toFixed(2),+p.y.toFixed(2)];}`,
  foto: `function(){window._vdAus=true;if(typeof _vdAlleFrei==="function")_vdAlleFrei();
    if(typeof gruppenSicht==="function")gruppenSicht();var aus=[];
    scene.traverse(function(o){var m=o.material;if(o.visible&&(o._bewegt||(o.isMesh&&m&&!Array.isArray(m)&&m.transparent))){aus.push(o);o.visible=false;}});
    var gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;renderer.render(scene,camera);
    var b=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,b);var calls=renderer.info.render.calls;
    aus.forEach(function(o){o.visible=true;});window._fotoPx=b;
    var cv=document.createElement("canvas");cv.width=w;cv.height=h;var cx=cv.getContext("2d"),im=cx.createImageData(w,h);
    for(var y=0;y<h;y++)for(var q=0;q<w;q++){var s1=((h-1-y)*w+q)*4,d1=(y*w+q)*4;im.data[d1]=b[s1];im.data[d1+1]=b[s1+1];im.data[d1+2]=b[s1+2];im.data[d1+3]=255;}
    cx.putImageData(im,0,0);return {bild:cv.toDataURL(),calls:calls,w:w,h:h};}`,
  merke: `function(k){(window._fotos=window._fotos||{})[k]=window._fotoPx;return 1;}`,
  vergleich: `function(k){var a=window._fotos[k],b=window._fotoPx,n12=0,n40=0,unten12=0,N=a.length/4,w=renderer.getContext().drawingBufferWidth;
    for(var i=0;i<N;i++){var d=Math.max(Math.abs(a[i*4]-b[i*4]),Math.abs(a[i*4+1]-b[i*4+1]),Math.abs(a[i*4+2]-b[i*4+2]));
      if(d>12){n12++;if(Math.floor(i/w)<N/w*0.5)unten12++;}if(d>40)n40++;}
    return {n12:n12,n40:n40,unten12:unten12,N:N};}`,
  zf: `function(){window._keinZusammenfassen=false;var v=window._zfFertig||0;window._zusammenfassen();return v;}`,
  zfStand: `function(){return {fertig:window._zfFertig||0,stat:window._zfStat||null};}`
}, TMP)
const P = [['kreuzung', 78, 58, 44, 0.78, 0.8], ['stadtmitte', 0, 20, 44, 0.78, 0.3], ['ring-ost', 117, 0, 44, 0.78, 1.3],
  ['weit', 20, 58, 90, 0.6, 0], ['gewerbe', 230, 0, 44, 0.78, 0.5], ['nah', 0, 60, 16, 0.7, 0.4], ['freizeitpark', 180, 150, 50, 0.8, 0.6]]
const { browser, page, jsFehler } = await spielOeffnen(TMP + '?ohneZF', { warten: 60000 })
await warteAufRuhe(page, { minSekunden: 150 }); await page.waitForTimeout(12000)
async function hin(k) { let p = [9, 9]; for (let i = 0; i < 4 && (Math.abs(p[0]) > 0.15 || Math.abs(p[1]) > 0.15); i++) { p = await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(1500) } }
const vor = {}
for (const [n, ...k] of P) { await hin(k); const f = await page.evaluate(() => window.__th.foto()); await page.evaluate((x) => window.__th.merke(x), n); vor[n] = f.calls; writeFileSync(`${OUT}/zf-${n}-vor.png`, Buffer.from(f.bild.split(',')[1], 'base64')) }
const v0 = await page.evaluate(() => window.__th.zf())
for (let i = 0; i < 60; i++) { const st = await page.evaluate(() => window.__th.zfStand()); if (st.fertig > v0) break; await page.waitForTimeout(1000) }
const st = await page.evaluate(() => window.__th.zfStand())
console.log(`zusammengefasst: ${st.stat.vorher} Teile aus ${st.stat.modelle} Modellen → ${st.stat.nachher} Meshes (${Math.round(st.stat.ms)} ms)`)
for (const [n, ...k] of P) {
  await hin(k); const f = await page.evaluate(() => window.__th.foto()); writeFileSync(`${OUT}/zf-${n}-nach.png`, Buffer.from(f.bild.split(',')[1], 'base64'))
  const r = await page.evaluate((x) => window.__th.vergleich(x), n)
  console.log(`${n.padEnd(13)} Aufrufe ${String(vor[n]).padStart(5)} → ${String(f.calls).padStart(5)} · Bildpunkte anders ${(100 * r.n12 / r.N).toFixed(2)} % (stark ${(100 * r.n40 / r.N).toFixed(2)} %, davon in der unteren = nahen Bildhaelfte ${(100 * r.unten12 / Math.max(1, r.n12)).toFixed(0)} %)`)
}
console.log('JS-Fehler', jsFehler.length, jsFehler.slice(0, 2))
await browser.close(); aufraeumen(TMP)
