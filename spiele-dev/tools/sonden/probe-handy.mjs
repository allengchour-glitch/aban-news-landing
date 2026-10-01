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
/* Runde 107 (User: „nach paar sekunde nur weiss"): GRAFIKSPEICHER AN DEN WEBGL-AUFRUFEN GEMESSEN. Ein weisses Bild
   nach wenigen Sekunden ist auf dem Telefon der Verlust des WebGL-Kontexts — der Grafikspeicher lief ueber.
   renderer.info zaehlt nur Stueck, keine Bytes. Hier wird jeder Puffer (bufferData), jede Textur (texImage2D/
   texStorage2D, Mipmaps ×4/3) und jeder Renderbuffer mitgeschrieben, delete* zieht ab. Ausgabe: Stand, Spitze,
   Verlauf. Annahme 4 Byte je Texel (RGBA8) — RGB wird auf dem Chip ohnehin meist als RGBA gelegt.
   Gegenprobe: eine 2048²-Textur hochladen muss +21 MB zeigen (ohne Mipmaps 16 MB), loeschen wieder −. */
const GPUMESS = `(function(){var P=[WebGLRenderingContext.prototype];if(window.WebGL2RenderingContext)P.push(WebGL2RenderingContext.prototype);
  var M={puffer:0,tex:0,rb:0,spitze:0,verlauf:[],verloren:0},bufGr=new Map(),texGr=new Map(),rbGr=new Map(),gebB={},gebT={},gebR=null,t0=performance.now();
  function summe(){var s=M.puffer+M.tex+M.rb;if(s>M.spitze)M.spitze=s;}
  function setzB(b,n){if(!b)return;M.puffer+=n-(bufGr.get(b)||0);bufGr.set(b,n);summe();}
  function setzT(t,n){if(!t)return;M.tex+=n-(texGr.get(t)||0);texGr.set(t,n);summe();}
  P.forEach(function(pr){
    var bb=pr.bindBuffer;pr.bindBuffer=function(z,b){gebB[z]=b;return bb.apply(this,arguments);};
    var bd=pr.bufferData;pr.bufferData=function(z,d){setzB(gebB[z],typeof d==="number"?d:(d&&d.byteLength)||0);return bd.apply(this,arguments);};
    var db=pr.deleteBuffer;pr.deleteBuffer=function(b){M.puffer-=bufGr.get(b)||0;bufGr.delete(b);return db.apply(this,arguments);};
    var bt=pr.bindTexture;pr.bindTexture=function(z,t){gebT[z]=t;return bt.apply(this,arguments);};
    var ti=pr.texImage2D;pr.texImage2D=function(z,lv){var a=arguments,w,h;
      if(a.length>=9){w=a[3];h=a[4];}else{var q=a[a.length-1];w=q&&(q.videoWidth||q.width);h=q&&(q.videoHeight||q.height);}
      if(lv===0&&w&&h){var tz=(z===0x8513||(z>=0x8515&&z<=0x851A))?0x8513:z,t=gebT[tz];var alt=(t&&t._mw)||0;
        var n=w*h*4*((z>=0x8515&&z<=0x851A)?1:1);if(z>=0x8515&&z<=0x851A){t._sides=(t._sides||0)+n;n=t._sides;}if(t){t._mw=n;setzT(t,n*(t._mip?4/3:1));}}
      return ti.apply(this,arguments);};
    if(pr.texStorage2D){var ts=pr.texStorage2D;pr.texStorage2D=function(z,lv,f,w,h){var t=gebT[z],n=0,ww=w,hh=h;for(var i=0;i<lv;i++){n+=ww*hh*4;ww=Math.max(1,ww>>1);hh=Math.max(1,hh>>1);}
      if(t){t._mw=n;t._mip=false;setzT(t,n);}return ts.apply(this,arguments);};}
    var gm=pr.generateMipmap;pr.generateMipmap=function(z){var t=gebT[z];if(t&&!t._mip){t._mip=true;setzT(t,(t._mw||0)*4/3);}return gm.apply(this,arguments);};
    var dt=pr.deleteTexture;pr.deleteTexture=function(t){M.tex-=texGr.get(t)||0;texGr.delete(t);return dt.apply(this,arguments);};
    var br=pr.bindRenderbuffer;pr.bindRenderbuffer=function(z,r){gebR=r;return br.apply(this,arguments);};
    var rs=pr.renderbufferStorage;pr.renderbufferStorage=function(z,f,w,h){if(gebR){M.rb+=w*h*4-(rbGr.get(gebR)||0);rbGr.set(gebR,w*h*4);summe();}return rs.apply(this,arguments);};
    if(pr.renderbufferStorageMultisample){var rm=pr.renderbufferStorageMultisample;pr.renderbufferStorageMultisample=function(z,sm,f,w,h){
      if(gebR){var n=w*h*4*Math.max(1,sm);M.rb+=n-(rbGr.get(gebR)||0);rbGr.set(gebR,n);summe();}return rm.apply(this,arguments);};}
  });
  document.addEventListener("webglcontextlost",function(){M.verloren++;},true);
  setInterval(function(){M.verlauf.push([Math.round((performance.now()-t0)/1000),Math.round((M.puffer+M.tex+M.rb)/1048576)]);},10000);
  window.__gpu=function(){return {pufferMB:+(M.puffer/1048576).toFixed(0),texMB:+(M.tex/1048576).toFixed(0),rbMB:+(M.rb/1048576).toFixed(0),
    spitzeMB:+(M.spitze/1048576).toFixed(0),verloren:M.verloren,verlauf:M.verlauf,
    /* Groessenklassen der Texturen: wer haelt die Megabytes? */
    texKlassen:(function(){var K={};texGr.forEach(function(n){var k=n>=4e6?">=4 MB":n>=1e6?"1-4 MB":n>=3e5?"0,3-1 MB":"<0,3 MB";K[k]=K[k]||[0,0];K[k][0]++;K[k][1]+=n;});
      Object.keys(K).forEach(function(k){K[k][1]=+(K[k][1]/1048576).toFixed(0);});return K;})()};};
  window.__gpuGegenprobe=function(){var c=document.createElement("canvas"),gl=c.getContext("webgl");var vor=M.tex,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,2048,2048,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.generateMipmap(gl.TEXTURE_2D);var plus=M.tex-vor;gl.deleteTexture(t);
    return {plusMB:+(plus/1048576).toFixed(1),nachLoeschenMB:+((M.tex-vor)/1048576).toFixed(1)};};
})()`
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--enable-precise-memory-info'] })
/* QUER=1: Handy quer (844×390). Hochformat zeigt „Dreh dein Handy quer!" ueber allem (#rotHint). */
const Q = !!process.env.QUER, W = Q ? 844 : 390, H = Q ? 390 : 844
const ctx = await browser.newContext({ viewport: { width: W, height: H }, screen: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
const page = await ctx.newPage()
await page.addInitScript(STAU)
await page.addInitScript(GPUMESS)
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
/* ⚠️ Runde 107 (probe-starttipp): mit frischem Spielstand oeffnet „Solo bauen" die Modus-Wahl IM Startbild — bis hier
   mass diese Sonde also immer das Menue („gestartet false"), nie das laufende Spiel. Jetzt wie ein Spieler weiter. */
await page.waitForSelector('button[data-m="klassisch"]', { state: 'visible', timeout: 90000 }).catch(() => {})
await page.tap('button[data-m="klassisch"]', { force: true }).catch(() => {})
await page.waitForSelector('#introOk', { state: 'visible', timeout: 90000 }).catch(() => {})
await page.tap('#introOk', { force: true }).catch(() => {})
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
const gpu = await page.evaluate(() => window.__gpu()), gpuGp = await page.evaluate(() => window.__gpuGegenprobe())
console.log(`  Grafikspeicher (an WebGL-Aufrufen gemessen): Puffer ${gpu.pufferMB} MB · Texturen ${gpu.texMB} MB · Renderbuffer ${gpu.rbMB} MB · SPITZE ${gpu.spitzeMB} MB · Kontext verloren ${gpu.verloren}×`)
console.log(`  Verlauf [s, MB]: ${gpu.verlauf.map((v) => v.join(':')).join(' ')}`)
console.log(`  Texturen nach Groesse [Stueck, MB]: ${JSON.stringify(gpu.texKlassen)}`)
console.log(Math.abs(gpuGp.plusMB - 21.3) < 0.6 && gpuGp.nachLoeschenMB === 0 ? `  ✅ Gegenprobe Grafikspeicher: 2048²-Textur +${gpuGp.plusMB} MB, nach Loeschen ${gpuGp.nachLoeschenMB}` : `  ❌ Gegenprobe Grafikspeicher: ${JSON.stringify(gpuGp)} (erwartet +21,3 / 0)`)
console.log(gp.max > 1500 ? `  ✅ Gegenprobe: 2-s-Blockade gesehen (${gp.max} ms)` : `  ❌ Gegenprobe: 2-s-Blockade NICHT gesehen (${gp.max} ms) — Takt-Messer blind`)
await browser.close(); aufraeumen(TMP)
