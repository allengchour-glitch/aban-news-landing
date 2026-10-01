/* Sonde: wohin geht die Hauptfaden-Zeit je Bild? node probe-profil.mjs [quelle] [sekunden]
   Runde 106 (User: „1 fps habe ich bei traumhaus"). probe-bildkosten misst den Rasterizer; auf dem Telefon kann aber
   genauso gut das JavaScript je Bild der Engpass sein (60'000 Meshes im Szenenbaum, Verkehr, Passanten, LOD).
   Hier: Chrome-Profiler (CDP) im Handy-Pfad an der Kreuzung, laufendes Spiel, Eigenzeit je Funktion summiert, dazu
   gezeichnete Bilder im selben Fenster → ms Hauptfaden je Bild. Die GL-Arbeit selbst laeuft im GPU-Prozess und
   zaehlt hier NICHT mit (ausser der Hauptfaden wartet darauf — das erscheint dann als „(program)"/readPixels).
   Gegenprobe: eine kuenstliche 30-ms-Schleife je Bild (?last30) muss als eigene Zeile mit ~30 ms/Bild erscheinen. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const [A = 'traumhaus.html', SEK = '12'] = process.argv.slice(2)
const TMP = '_probe_profil_tmp.html'
mitSonden(A, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
    followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();camera.updateMatrixWorld(true);
    if(typeof lodTakt==="function")lodTakt(x,z);
    var p=new THREE.Vector3(x,0,z).project(camera);return [+p.x.toFixed(2),+p.y.toFixed(2)];}`,
  bild: `function(){return renderer.info.render.frame;}`,
  szene: `function(){var n=0,mesh=0,sicht=0,auto=0;scene.traverse(function(o){n++;if(o.isMesh)mesh++;if(o.matrixAutoUpdate)auto++;});
    (function geh(o){if(!o.visible)return;if(o.isMesh)sicht++;for(var i=0;i<o.children.length;i++)geh(o.children[i]);})(scene);
    var t0=performance.now();for(var i=0;i<5;i++)scene.updateMatrixWorld();var umw=(performance.now()-t0)/5;
    return {knoten:n,meshes:mesh,sichtbar:sicht,autoMatrix:auto,updateMatrixWorldMs:+umw.toFixed(2),
      aufrufe:renderer.info.render.calls,pr:+renderer.getPixelRatio().toFixed(2),mobil:_mobil,spar:typeof _sparHandy!=="undefined"?_sparHandy:null};}`,
  /* ⚠️ Erste Fassung wartete mit `while(performance.now()-t<30)` — der Profiler buchte davon nur ~8 ms je Bild auf
     „now", den Rest auf „(program)" (schnelle Browser-Aufrufe tragen keinen JS-Rahmen). Jetzt reines Rechnen, vorher
     auf 30 ms geeicht, damit die Zeit einer benannten Funktion gehoert. */
  last30: `function(an){window._last30=an;if(an&&!window._last30h){window._last30h=1;
    function rechne30(n){var x=0;for(var i=0;i<n;i++)x+=Math.sqrt(i+x%7);return x;}
    var t=performance.now();rechne30(2e6);var N=Math.round(2e6*30/Math.max(1,performance.now()-t));
    (function f(){requestAnimationFrame(f);if(window._last30)window._l30x=rechne30(N);})();}return an;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
const ru = await warteAufRuhe(page, { minSekunden: 150 })
await page.waitForTimeout(12000)
console.log(`${A}: Welt ruhig nach ${ru.seite} s`)
const k = [78, 58, 44, 0.78, 0.8]
let p = [9, 9]
for (let i = 0; i < 5 && (Math.abs(p[0]) > 0.15 || Math.abs(p[1]) > 0.15); i++) { await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(2500); p = await page.evaluate((v) => window.__th.kam(...v), k) }
console.log('Szene', JSON.stringify(await page.evaluate(() => window.__th.szene())))
const cdp = await page.context().newCDPSession(page)
async function profil(name) {
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 })
  const b0 = await page.evaluate(() => window.__th.bild()), t0 = Date.now()
  await cdp.send('Profiler.start'); await page.waitForTimeout(+SEK * 1000)
  const { profile } = await cdp.send('Profiler.stop')
  const b1 = await page.evaluate(() => window.__th.bild()), dt = (Date.now() - t0) / 1000, bilder = b1 - b0
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]))
  const dts = profile.timeDeltas; let ges = 0
  profile.samples.forEach((id, i) => { const n = byId.get(id), d = (dts[i] || 0) / 1000; ges += d
    const f = n.callFrame, key = (f.functionName || '(anonym)') + (f.url && !/^\(/.test(f.functionName) ? ' :' + (f.lineNumber + 1) : '')
    self.set(key, (self.get(key) || 0) + d) })
  console.log(`\n== ${name}: ${bilder} Bilder in ${dt.toFixed(1)} s = ${(bilder / dt).toFixed(2)} Bilder/s (Software!) · Profil ${ges.toFixed(0)} ms`)
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28)
  for (const [kk, v] of top) console.log(`  ${(v / Math.max(1, bilder)).toFixed(1).padStart(7)} ms/Bild  ${(100 * v / ges).toFixed(1).padStart(5)} %  ${kk}`)
  return { bilder, self, ges }
}
await profil('Kreuzung, laufendes Spiel')
await page.evaluate(() => window.__th.last30(true))
const g = await profil('Gegenprobe +30 ms/Bild')
await page.evaluate(() => window.__th.last30(false))
await browser.close(); aufraeumen(TMP)
