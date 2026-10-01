/* Sonde: was kosten die Teile einer Runde an Zeichenaufrufen? node probe-aufrufe.mjs [quelle]
   Runde 98: th-pruef meldete 198, 228, 294 Aufrufe fuer denselben Stand — es liest renderer.info nach dem
   LETZTEN Durchgang, und das ist mal das Hauptbild, mal ein anderer. Hier: fester Kamerapunkt, eigener
   render(), einmal mit und einmal ohne alle Meshes mit userData[FLAG] (Standard r98). Die Differenz ist die
   Last der Runde, unabhaengig davon, was sonst im Bild ist. Env FLAG=… fuer andere Markierungen. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html', FLAG = process.env.FLAG || 'r98'
const TMP = '_probe_aufrufe_tmp.html'
mitSonden(quelle, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
    followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();return true;}`,
  zaehl: `function(F){var T=[];scene.traverse(function(o){if(o.isMesh&&o.userData&&o.userData[F])T.push(o);});
    function n(){renderer.render(scene,camera);return [renderer.info.render.calls,renderer.info.render.triangles];}
    var mit=n(),sicht=T.filter(function(o){return o.visible;}).length,vis=T.map(function(o){return o.visible;});
    T.forEach(function(o){o.visible=false;});var ohne=n();T.forEach(function(o,i){o.visible=vis[i];});
    return {teile:T.length,sichtbar:sicht,mit:mit,ohne:ohne};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
const P = [['Kreuzung (78|58)', 78, 58, 30, 0.9, 0.6], ['Kreuzung nah', 80, 52, 14, 0.6, 0.8], ['Ost-Ausfall', 117, 0, 20, 0.7, 1.3], ['Stadtmitte hoch', 0, 0, 90, 1.1, 0.5], ['Ring Nord', 0, -100, 30, 0.8, 0]]
for (const [n, x, z, r, b, a] of P) {
  await page.evaluate((v) => window.__th.kam(...v), [x, z, r, b, a])
  await page.waitForTimeout(4000)
  await page.evaluate((v) => window.__th.kam(...v), [x, z, r, b, a])
  await page.waitForTimeout(1500)
  const z2 = await page.evaluate((f) => window.__th.zaehl(f), FLAG)
  console.log(n.padEnd(18), `Teile ${z2.teile}, sichtbar ${z2.sichtbar} · Aufrufe mit ${z2.mit[0]} / ohne ${z2.ohne[0]} (+${z2.mit[0] - z2.ohne[0]}) · Dreiecke +${z2.mit[1] - z2.ohne[1]}`)
}
await browser.close(); aufraeumen(TMP)
