/* Sonde: welche Objekte stehen an diesen Punkten? node probe-wer.mjs '[[x,z,r],...]' [quelle]
   Liefert je Treffer Name, Geometrie, Kette der Eltern (Name/userData-Schluessel), Weltposition. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const P = JSON.parse(process.argv[2]); const quelle = process.argv[3] || 'traumhaus.html'
const TMP = '_probe_wer_tmp.html'
mitSonden(quelle, {
  wer: `function(P){var out=[];var v=new THREE.Vector3(),bx=new THREE.Box3();
    scene.updateMatrixWorld(true);
    scene.traverse(function(o){if(!o.isMesh||o.isInstancedMesh)return;
      bx.setFromObject(o);if(bx.isEmpty())return;
      P.forEach(function(p,i){if(bx.max.x<p[0]-p[2]||bx.min.x>p[0]+p[2]||bx.max.z<p[1]-p[2]||bx.min.z>p[1]+p[2])return;
        if(bx.max.x-bx.min.x>40||bx.max.z-bx.min.z>40)return;
        var k=[],q=o;while(q&&q!==scene){k.push((q.name||q.type)+(Object.keys(q.userData||{}).length?"{"+Object.keys(q.userData).join(",")+"}":""));q=q.parent;}
        out.push([i,o.geometry&&o.geometry.type,+bx.min.x.toFixed(1),+bx.max.x.toFixed(1),+bx.min.z.toFixed(1),+bx.max.z.toFixed(1),+bx.min.y.toFixed(2),+bx.max.y.toFixed(2),k.slice(0,6).join(" < ")]);});});
    return out;}`,
  zeb: `function(){return {u:window._uebergaenge,s:window._uebSchilder};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(8000)
const r = await page.evaluate((p) => window.__th.wer(p), P)
const z = await page.evaluate(() => window.__th.zeb())
await browser.close(); aufraeumen(TMP)
for (const e of r) console.log(JSON.stringify(e))
if (process.env.ZEB) { const i = +process.env.ZEB; console.log('Uebergang', i, JSON.stringify(z.u[i])); z.s.forEach((s) => { if (s[3] === i) console.log('  Schild', JSON.stringify(s)) }) }
