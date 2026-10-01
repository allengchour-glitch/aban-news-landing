/* Sonde: alle Objekte der obersten Ebene (und bau()-Modelle) in einem Rechteck, mit Weltkasten.
   node probe-umkreis.mjs x0 x1 z0 z1 */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const [x0, x1, z0, z1] = process.argv.slice(2).map(Number); const TMP = '_probe_umkreis_tmp.html'
mitSonden('traumhaus.html', {
  um: `function(x0,x1,z0,z1){var out=[];scene.updateMatrixWorld(true);
    scene.children.forEach(function(top){if(top.isInstancedMesh||top.isLight||top.isCamera)return;
      var bx=new THREE.Box3().setFromObject(top);if(bx.isEmpty())return;
      if(bx.max.x-bx.min.x>60||bx.max.z-bx.min.z>60)return;
      if(bx.max.x<x0||bx.min.x>x1||bx.max.z<z0||bx.min.z>z1)return;
      var n=top.userData&&(top.userData.datei||top.userData.glb)||top.name||(top.geometry&&top.geometry.type)||top.type;
      out.push([n,+bx.min.x.toFixed(1),+bx.max.x.toFixed(1),+bx.min.z.toFixed(1),+bx.max.z.toFixed(1),+bx.min.y.toFixed(2),+bx.max.y.toFixed(2)]);});
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(8000)
const r = await page.evaluate((v) => window.__th.um(...v), [x0, x1, z0, z1])
await browser.close(); aufraeumen(TMP)
r.sort((a, b) => a[3] - b[3])
for (const e of r) console.log(JSON.stringify(e))
