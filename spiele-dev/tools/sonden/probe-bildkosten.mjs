/* Sonde: WELCHE Art von Teilen kostet die Bildzeit? node probe-bildkosten.mjs [quelle]
   Runde 106 (User: „1 fps habe ich bei traumhaus"). probe-bildlast zeigte: der PR zeichnet halb so viele Aufrufe wie
   main, braucht im Software-Rasterizer aber +62 % Zeit je Bild. Hier: an denselben Kamerapunkten je Teile-Art alles
   dieser Art ausblenden, Bild neu zeichnen, Median aus 5 — die Differenz zur vollen Szene ist der Anteil dieser Art.
   Arten: gehaeutet (Skinning), Instanzen, durchsichtig, texturiert, Standard-Material, eigener Shader, Sprites/Linien.
   Gegenprobe: ALLES ausblenden muss fast die ganze Zeit wegnehmen, NICHTS ausblenden muss ~0 % ergeben.
   ⚠️ Software-Millisekunden (SwiftShader) — nur Verhaeltnisse zaehlen. Handy-Pfad (Fenster < 820 px). */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const [A = 'traumhaus.html'] = process.argv.slice(2)
const P = [['Kreuzung (78|58)', 78, 58, 44, 0.78, 0.8], ['Stadtmitte', 0, 20, 44, 0.78, 0.3], ['Weit (90)', 20, 58, 90, 0.6, 0]]
const TMP = '_probe_bildkosten_tmp.html'
mitSonden(A, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
    followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();camera.updateMatrixWorld(true);
    if(typeof lodTakt==="function")lodTakt(x,z);
    var p=new THREE.Vector3(x,0,z).project(camera);return [+p.x.toFixed(2),+p.y.toFixed(2)];}`,
  kosten: `function(){var gl=renderer.getContext(),px=new Uint8Array(4);
    if(typeof gruppenSicht==="function")gruppenSicht();
    function mess(){var T=[];for(var i=0;i<5;i++){var t0=performance.now();renderer.render(scene,camera);
      gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);T.push(performance.now()-t0);}
      T.sort(function(a,b){return a-b;});return {ms:T[2],calls:renderer.info.render.calls,tri:renderer.info.render.triangles};}
    function mats(o){return Array.isArray(o.material)?o.material:[o.material];}
    var ART={
      gehaeutet:function(o){return o.isSkinnedMesh;},
      instanzen:function(o){return o.isInstancedMesh;},
      durchsichtig:function(o){return mats(o).some(function(m){return m&&m.transparent;});},
      texturiert:function(o){return mats(o).some(function(m){return m&&(m.map||m.normalMap||m.roughnessMap||m.emissiveMap);});},
      standard:function(o){return mats(o).some(function(m){return m&&m.isMeshStandardMaterial;});},
      eigenerShader:function(o){return mats(o).some(function(m){return m&&(m.isShaderMaterial||m.onBeforeCompile&&String(m.onBeforeCompile).length>40);});},
      spriteLinie:function(o){return o.isSprite||o.isLine||o.isPoints;},
      alles:function(o){return true;},
      nichts:function(o){return false;}};
    var alle=[];scene.traverse(function(o){if((o.isMesh||o.isSprite||o.isLine||o.isPoints)&&o.visible)alle.push(o);});
    var voll=mess(),R={voll:{ms:+voll.ms.toFixed(1),calls:voll.calls,tri:voll.tri}};
    for(var k in ART){var aus=alle.filter(ART[k]);aus.forEach(function(o){o.visible=false;});
      var m=mess();aus.forEach(function(o){o.visible=true;});
      R[k]={n:aus.length,ms:+m.ms.toFixed(1),calls:m.calls,tri:m.tri,anteil:+(100*(1-m.ms/voll.ms)).toFixed(0)};}
    /* Punktlichter: three.js uebersetzt die Shader nach der ZAHL sichtbarer Lichter — 6 → 2 → 0 kostet je eine
       Neu-Uebersetzung, die der Median aus 5 Bildern herausnimmt. */
    var PLs=[];scene.traverse(function(o){if(o.isPointLight)PLs.push(o);});
    var vorPL=PLs.map(function(l){return l.visible;}),anPL=PLs.filter(function(l){return l.visible;});
    [2,0].forEach(function(k){anPL.forEach(function(l,i){l.visible=i<k;});var m=mess();
      R["punktlicht "+anPL.length+"→"+k]={n:anPL.length-k,ms:+m.ms.toFixed(1),calls:m.calls,tri:m.tri,anteil:+(100*(1-m.ms/voll.ms)).toFixed(0)};});
    PLs.forEach(function(l,i){l.visible=vorPL[i];});
    /* Lichter: wie viele Punktlichter haben die Shader, wie viele leuchten? */
    var pl=0,an=0;scene.traverse(function(o){if(o.isPointLight){pl++;if(o.visible&&o.intensity>0)an++;}});
    R._licht={punkt:pl,an:an,schatten:renderer.shadowMap.enabled,pr:+renderer.getPixelRatio().toFixed(2),
      w:renderer.domElement.width,h:renderer.domElement.height,mobil:_mobil};
    return R;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
const ru = await warteAufRuhe(page, { minSekunden: 150 })
await page.waitForTimeout(12000)
console.log(`${A}: Welt ruhig nach ${ru.seite} s`)
for (const [n, ...k] of P) {
  let p = [9, 9]
  for (let i = 0; i < 5 && (Math.abs(p[0]) > 0.15 || Math.abs(p[1]) > 0.15); i++) { await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(2500); p = await page.evaluate((v) => window.__th.kam(...v), k) }
  await page.waitForTimeout(1000)
  const R = await page.evaluate(() => window.__th.kosten())
  console.log(`\n${n}: voll ${R.voll.ms} ms, ${R.voll.calls} Aufr., ${Math.round(R.voll.tri / 1000)}k Dr.  Licht ${JSON.stringify(R._licht)}`)
  for (const [k2, v] of Object.entries(R)) if (!k2.startsWith('_') && k2 !== 'voll')
    console.log(`  ohne ${k2.padEnd(14)} ${String(v.n).padStart(6)} Teile  ${String(v.ms).padStart(7)} ms  (${String(v.anteil).padStart(4)} %)  ${String(v.calls).padStart(5)} Aufr. ${String(Math.round(v.tri / 1000)).padStart(5)}k Dr.`)
}
await browser.close(); aufraeumen(TMP)
