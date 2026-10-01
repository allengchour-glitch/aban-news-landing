/* Sonde: was kostet EIN Bild an festen Kamerapunkten? node probe-bildlast.mjs [quelle] [vergleich.html]
   Runde 99 (User: „gefuehlte 10 fps"). th-tempo misst in der Startansicht — die ist seit Runde 89 eine andere als auf
   main (Kamera faehrt zum Grundstueck), ein Vergleich beider Staende war damit schief. Hier: dieselben fuenf Punkte,
   je Punkt fuenf eigene render() mit erzwungenem Abschluss (readPixels 1 px), Median der Zeit, dazu Aufrufe und
   Dreiecke genau dieses Bildes. ⚠️ Die ms sind Software-Rasterizer-Werte (SwiftShader), keine Geraetewerte — nur das
   Verhaeltnis zweier Staende im selben Lauf zaehlt. Handy-Pfad wie th-tempo (Playwright-Fenster < 820 px). */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const [A = 'traumhaus.html', B] = process.argv.slice(2)
const P = [['Kreuzung (78|58)', 78, 58, 44, 0.78, 0.8], ['Stadtmitte', 0, 20, 44, 0.78, 0.3], ['Ring Ost', 117, 0, 44, 0.78, 1.3],
  ['Weit (90)', 20, 58, 90, 0.6, 0], ['Viertel Gewerbe', 230, 0, 44, 0.78, 0.5], ['Zuhause nah', 0, 60, 20, 0.8, 0.4]]
async function messe(quelle) {
  const TMP = '_probe_bildlast_tmp.html'
  mitSonden(quelle, {
    kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
      followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();camera.updateMatrixWorld(true);
      if(typeof lodTakt==="function")lodTakt(x,z);   /* ⚠️ sonst misst man den LOD-Stand des LETZTEN Punktes: lodTakt
         laeuft nur jedes 8. Bild, headless sind das ~4 s */
      var p=new THREE.Vector3(x,0,z).project(camera);return [+p.x.toFixed(2),+p.y.toFixed(2)];}`,
    last: `function(){var gl=renderer.getContext(),px=new Uint8Array(4),T=[],c=0,t=0;
      if(typeof gruppenSicht==="function")gruppenSicht();
      /* Aufschluesselung: was wird gezeichnet, nach Entfernung zur Kamera und Art */
      scene.updateMatrixWorld();var F=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      var B={},cp=camera.position,v=new THREE.Vector3();
      (function geh(o,modell){if(!o.visible)return;if(o.userData&&o.userData.datei)modell=1;
        if((o.isMesh||o.isInstancedMesh)&&o.geometry&&o.material&&(!o.frustumCulled||F.intersectsObject(o))){
          if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
          v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);var d=v.distanceTo(cp);
          var band=d<60?"<60":d<120?"60-120":d<200?"120-200":d<350?"200-350":">350";
          var art=o.isInstancedMesh?"inst":modell?"modell":"prozedural";var k=band+" "+art;B[k]=(B[k]||0)+(Array.isArray(o.material)?Math.max(1,o.geometry.groups.length):1);}
        for(var i=0;i<o.children.length;i++)geh(o.children[i],modell);})(scene,0);
      for(var i=0;i<5;i++){var t0=performance.now();renderer.render(scene,camera);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
        T.push(performance.now()-t0);c=renderer.info.render.calls;t=renderer.info.render.triangles;}
      T.sort(function(a,b){return a-b;});return {ms:+T[2].toFixed(1),calls:c,tri:t,pr:+renderer.getPixelRatio().toFixed(2),mobil:_mobil,B:B};}`
  }, TMP)
  const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
  /* ⚠️ ERST WENN DIE WELT FERTIG IST (Runde 99): der erste Vergleich mass bei ~60 s — da waren Doppelhaeuser
     und Kreuzungs-Bauten noch nicht geladen, also auch nicht zusammengefasst (293 Aufrufe fuer ein Haus). */
  const ru = await warteAufRuhe(page, { minSekunden: 150 })
  await page.waitForTimeout(12000)   /* 2,5 + 4 s bis _spaetEinfrieren, dann die Scheiben des Zusammenfassens */
  const R = { _ruhe: ru }
  for (const [n, ...k] of P) {
    let p = [9, 9]
    for (let i = 0; i < 5 && (Math.abs(p[0]) > 0.15 || Math.abs(p[1]) > 0.15); i++) { await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(2500); p = await page.evaluate((v) => window.__th.kam(...v), k) }
    await page.waitForTimeout(1000)
    R[n] = await page.evaluate(() => window.__th.last())
  }
  R._zf = await page.evaluate(() => window._zfStat || null)
  await browser.close(); aufraeumen(TMP)
  return R
}
const RA = await messe(A), RB = B ? await messe(B) : null
let sa = 0, sb = 0
console.log(`Punkt               ${A.padEnd(24)}${RB ? B : ''}`)
for (const [n] of P) {
  const a = RA[n], b = RB && RB[n]; sa += a.ms; if (b) sb += b.ms
  console.log(`${n.padEnd(19)} ${String(a.ms).padStart(6)} ms ${String(a.calls).padStart(5)} Aufr. ${String(Math.round(a.tri / 1000)).padStart(4)}k Dr.` +
    (b ? `   |  ${String(b.ms).padStart(6)} ms ${String(b.calls).padStart(5)} Aufr. ${String(Math.round(b.tri / 1000)).padStart(4)}k Dr.` : ''))
}
if (process.env.BAENDER) for (const [n] of P) { const a = RA[n]; console.log(n, JSON.stringify(Object.fromEntries(Object.entries(a.B).sort()))) }
for (const [q, R] of [[A, RA], [B, RB]]) if (R) console.log(`${q}: Welt ruhig nach ${R._ruhe.seite} s (${R._ruhe.ruhig ? 'ruhig' : 'NICHT ruhig'})`)
for (const [q, R] of [[A, RA], [B, RB]]) if (R && R._zf) console.log(`${q}: zusammengefasst ${R._zf.vorher} Teile aus ${R._zf.modelle} Modellen → ${R._zf.nachher} Meshes, ${Math.round(R._zf.ms)} ms in ${R._zf.laeufe} Laeufen`)
console.log(`SUMME ${sa.toFixed(0)} ms` + (RB ? ` | ${sb.toFixed(0)} ms  → ${(100 * (sa / sb - 1)).toFixed(0)} %` : '') + `   (Pixelratio ${RA[P[0][0]].pr}, Handy ${RA[P[0][0]].mobil})`)
