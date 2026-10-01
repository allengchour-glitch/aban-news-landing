/* Sonde (Runde 106): Handy-Sparmodus ansehen — dieselben drei Ansichten mit und ohne Sparmodus, Handy quer
   (844x390, screen 390 → _mobil), fertige Welt, 13 Uhr, mit der ?fps-Anzeige oben links. Urteilt nicht, zeigt nur —
   die Bilder werden angesehen.
   Aufruf: node spiele-dev/tools/sonden/probe-r106-bilder.mjs [ordner=spiele-dev/screenshots] */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const ORD = process.argv[2] || 'spiele-dev/screenshots', TMP = '_probe_r106b_tmp.html'
mitSonden('traumhaus.html', {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
    followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();camera.updateMatrixWorld(true);
    if(typeof lodTakt==="function")lodTakt(x,z);
    var p=new THREE.Vector3(x,0,z).project(camera);return [+p.x.toFixed(2),+p.y.toFixed(2)];}`,
  stand: `function(){return {spar:_sparHandy,zoomMax:ZOOM_MAX,lampen:LAMP_MAX,lod:LOD_SPAR,klein:window._texKleinN||0,
    aufrufe:renderer.info.render.calls,dreiecke:renderer.info.render.triangles,pixel:+renderer.getPixelRatio().toFixed(2)};}`,
  uhr: `function(){uhrzeit=13*60;window._zeitFaktor=0.0001;return true;}`
}, TMP)
const P = [['kreuzung', 78, 58, 44, 0.78, 0.8], ['stadtmitte', 0, 20, 44, 0.78, 0.3], ['weit', 20, 58, 80, 0.6, 0]]
const bilder = {}
for (const [name, q] of [['spar', '?fps'], ['voll', '?fps&voll']]) {
  const { browser, page, jsFehler } = await spielOeffnen(TMP + q, { warten: 45000, viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 } })
  const ru = await warteAufRuhe(page, { minSekunden: 150 })
  await page.evaluate(() => window.__th.uhr())
  for (const [n, ...k] of P) {
    let p = [9, 9]
    for (let i = 0; i < 5 && (Math.abs(p[0]) > 0.15 || Math.abs(p[1]) > 0.15); i++) { await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(2500); p = await page.evaluate((v) => window.__th.kam(...v), k) }
    await page.waitForTimeout(6000)
    const pfad = `${ORD}/r106-${n}-${name}.png`
    await page.screenshot({ path: pfad }); (bilder[n] = bilder[n] || {})[name] = pfad
    console.log(`${name.padEnd(5)} ${n.padEnd(11)} ${JSON.stringify(await page.evaluate(() => window.__th.stand()))}`)
  }
  console.log(`${name}: Welt ruhig nach ${ru.seite} s · JS-Fehler ${jsFehler.length}${jsFehler.length ? ' — ' + jsFehler.slice(0, 2).join(' | ') : ''}`)
  await browser.close()
}
aufraeumen(TMP)
console.log(JSON.stringify(bilder))
