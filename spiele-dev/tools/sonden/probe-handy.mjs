/* Sonde: kann ein Handy das Spiel ueberhaupt tragen? node probe-handy.mjs [quelle]
   User 2026-09-30: „auf handy kann ich ned spielen". Ein Handy-Browser schiesst den Tab ab, wenn
   Speicher oder Hauptfaden ueberlaufen — das sieht aus wie „laedt neu" oder „schwarz". Gemessen im
   Handy-Format (390×844, screen 390 → _mobil): Download (Netz), JS-Speicher, geschaetzter Grafik-
   speicher (Geometrie-Puffer + Texturen der Szene, je einmal gezaehlt), Zeichenaufrufe und Dreiecke
   am Startpunkt, laengste Blockade des Hauptfadens (Takt-Messer wie th-laden) und JS-Fehler.
   GEGENPROBE: eine absichtliche 2-s-Blockade muss der Takt-Messer sehen. */
import { chromium } from 'playwright'
import { serverStarten, PORT, CHROMIUM, mitSonden, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_handy_tmp.html'
mitSonden(quelle, {
  bild: `function(){return renderer.info.render.frame;}`,
  speicher: `function(){var geo=new Set(),tex=new Set(),gb=0,tb=0,meshes=0;
    scene.traverse(function(o){if(!o.isMesh&&!o.isPoints&&!o.isLine)return;meshes++;var g=o.geometry;
      if(g&&!geo.has(g)){geo.add(g);Object.keys(g.attributes).forEach(function(k){var a=g.attributes[k];gb+=(a.array?a.array.byteLength:0);});if(g.index)gb+=g.index.array.byteLength;
        if(o.isInstancedMesh&&o.instanceMatrix)gb+=o.instanceMatrix.array.byteLength;}
      (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){if(!m)return;
        ["map","normalMap","roughnessMap","metalnessMap","emissiveMap","aoMap","alphaMap","envMap","lightMap","bumpMap"].forEach(function(k){var t=m[k];
          if(t&&!tex.has(t)){tex.add(t);var im=t.image;var w=(im&&(im.width||(im[0]&&im[0].width)))||0,h=(im&&(im.height||(im[0]&&im[0].height)))||0;tb+=w*h*4*1.33*(t.isCubeTexture?6:1);}});});});
    renderer.render(scene,camera);
    var pm=performance.memory||{};
    return {geometrienMB:+(gb/1048576).toFixed(0),texturenMB:+(tb/1048576).toFixed(0),geometrien:geo.size,texturen:tex.size,meshes:meshes,
      aufrufe:renderer.info.render.calls,dreiecke:renderer.info.render.triangles,jsHeapMB:+((pm.usedJSHeapSize||0)/1048576).toFixed(0),
      programme:renderer.info.programs?renderer.info.programs.length:null,mobil:typeof _mobil!=="undefined"?_mobil:null,pixel:renderer.getPixelRatio(),
      gpuGeo:renderer.info.memory.geometries,gpuTex:renderer.info.memory.textures,klein:window._texKleinN||0,spar:typeof _sparHandy!=="undefined"?_sparHandy:null};}`
}, TMP)
serverStarten()
const STAU = `(function(){var letzte=performance.now(),max=0,summe=0;setInterval(function(){var n=performance.now(),d=n-letzte-50;letzte=n;if(d>max)max=d;if(d>100)summe+=d;},50);
  window.__stau=function(){return {max:Math.round(max),summe:Math.round(summe)};};window.__stauNull=function(){max=0;summe=0;};})()`
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--enable-precise-memory-info'] })
/* QUER=1: Handy quer (844×390). Hochformat zeigt „Dreh dein Handy quer!" ueber allem (#rotHint). */
const Q = !!process.env.QUER, W = Q ? 844 : 390, H = Q ? 390 : 844
const ctx = await browser.newContext({ viewport: { width: W, height: H }, screen: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
const page = await ctx.newPage()
await page.addInitScript(STAU)
let bytes = 0, glb = 0, glbBytes = 0; const fehler = []
page.on('response', async (r) => { try { const b = await r.body(); bytes += b.length; if (/\.glb/.test(r.url())) { glb++; glbBytes += b.length } } catch (e) {} })
page.on('pageerror', (e) => fehler.push(String(e.message || e).slice(0, 120)))
const t0 = Date.now()
await page.goto(`http://127.0.0.1:${PORT}/${TMP}`, { waitUntil: 'load', timeout: 120000 })
/* Start drücken wie ein Spieler, dann laden lassen, bis nichts mehr eintrifft (höchstens 150 s). */
/* ⚠️ Erste Fassung klickte per evaluate und wartete „4 × 2 s kein neues GLB" — sie hoerte nach 13 bzw. 28
   von ~380 Modellen auf (der Startbildschirm drosselt die Ladeschlange auf 4). Jetzt: echter Tipp auf
   #soloBtn, pruefen dass #start weg ist, dann warten bis das Spiel selbst meldet: _ladeOffen === 0. */
/* ⚠️ 60 s reichten einmal nicht (Runde 106, alter Stand): „resolved to visible", dann Zeitueberschreitung — der
   Hauptfaden war vom Laden blockiert, Playwrights Abfrage im Fenster kam nicht durch. 150 s. */
await page.waitForSelector('#soloBtn', { timeout: 150000 })
/* force: der Knopf pulsiert (CSS-Animation), Playwright wartet sonst ewig auf „stabil". force tippt trotzdem
   auf die Knopfmitte — liegt dort etwas darueber (Hochformat: #rotHint), trifft der Tipp DAS, wie beim Finger. */
await page.tap('#soloBtn', { force: true, timeout: 10000 }).catch(() => {})
await page.waitForTimeout(1500)
const gestartet = await page.evaluate(() => { const st = document.getElementById('start'); return !st || st.classList.contains('hide') })
let offen = null
for (let i = 0; i < 90; i++) { await page.waitForTimeout(2000); offen = await page.evaluate(() => window._ladeOffen); if (offen === 0 && i > 5) break }
await page.waitForTimeout(8000)
const tFertig = ((Date.now() - t0) / 1000).toFixed(0)
/* Bildrate im laufenden Spiel (Software-Renderer: nur RELATIV vergleichbar, nicht die Handy-fps) */
const fb0 = await page.evaluate(() => window.__th.bild()).catch(() => null), tb0 = Date.now()
await page.waitForTimeout(15000)
const fb1 = await page.evaluate(() => window.__th.bild()).catch(() => null), tb1 = Date.now()
const msBild = fb0 != null && fb1 > fb0 ? Math.round((tb1 - tb0) / (fb1 - fb0)) : null
const stau = await page.evaluate(() => window.__stau())
const sp = await page.evaluate(() => window.__th.speicher())
/* Gegenprobe Takt-Messer */
await page.evaluate(() => window.__stauNull()); await page.evaluate(() => { const e = performance.now() + 2000; while (performance.now() < e) {} }); await page.waitForTimeout(300)
const gp = await page.evaluate(() => window.__stau())
console.log(`${quelle} ${Q ? 'quer' : 'hoch'}: gestartet ${gestartet}, _ladeOffen ${offen} · Download ${(bytes / 1048576).toFixed(0)} MB (${glb} GLB, ${(glbBytes / 1048576).toFixed(0)} MB) · fertig nach ~${tFertig} s`)
console.log(`  Speicher: JS ${sp.jsHeapMB} MB · Geometrie ${sp.geometrienMB} MB (${sp.geometrien}) · Texturen ${sp.texturenMB} MB (${sp.texturen}) · Meshes ${sp.meshes}`)
console.log(`  Grafikchip haelt: ${sp.gpuGeo} Geometrien · ${sp.gpuTex} Texturen (renderer.info.memory) · Sparmodus ${sp.spar} · verkleinerte Texturen ${sp.klein}`)
console.log(`  Bildzeit im Spiel: ${msBild} ms/Bild (Software-Renderer, relativ)`)
console.log(`  Startbild: ${sp.aufrufe} Aufrufe · ${sp.dreiecke} Dreiecke · Programme ${sp.programme} · mobil ${sp.mobil} · Pixel ${sp.pixel}`)
console.log(`  Hauptfaden: laengste Blockade ${(stau.max / 1000).toFixed(1)} s · Summe ${(stau.summe / 1000).toFixed(0)} s · JS-Fehler ${fehler.length}${fehler.length ? ' — ' + fehler.slice(0, 2).join(' | ') : ''}`)
console.log(gp.max > 1500 ? `  ✅ Gegenprobe: 2-s-Blockade gesehen (${gp.max} ms)` : `  ❌ Gegenprobe: 2-s-Blockade NICHT gesehen (${gp.max} ms) — Takt-Messer blind`)
await browser.close(); aufraeumen(TMP)
