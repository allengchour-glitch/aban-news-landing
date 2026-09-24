/* Sonde: was steht am Zebrastreifen (257.4|-140) und (-285|-257.4)? Alle Objekte, deren Weltkasten den Bereich schneidet. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_zebra_tmp.html'
mitSonden('traumhaus.html', {
  amZebra: `function(R){var out=[];var bb=new THREE.Box3();
    scene.traverse(function(o){if(!o.isMesh||!o.visible)return;bb.setFromObject(o);if(bb.isEmpty())return;
      if(bb.max.x<R[0]||bb.min.x>R[1]||bb.max.z<R[2]||bb.min.z>R[3])return;
      var sx=bb.max.x-bb.min.x,sz=bb.max.z-bb.min.z;if(sx>60||sz>60)return;
      var p=o;var f="";while(p){if(p.userData&&p.userData.datei){f=p.userData.datei;break;}p=p.parent;}
      out.push([f||(o.geometry&&o.geometry.type)||o.name,+bb.min.x.toFixed(1),+bb.max.x.toFixed(1),+bb.min.y.toFixed(3),+bb.max.y.toFixed(3),+bb.min.z.toFixed(1),+bb.max.z.toFixed(1)]);});
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(15000)
for (const R of [[254,261,-150,-130],[-292,-278,-262,-252]]) {
  const r = await page.evaluate((R) => window.__th.amZebra(R), R)
  console.log('\nBEREICH x', R[0],'..',R[1],' z', R[2],'..',R[3], ' -> ', r.length, 'Meshes')
  for (const e of r) console.log(`  ${String(e[0]).padEnd(28)} x ${e[1]}..${e[2]}  y ${e[3]}..${e[4]}  z ${e[5]}..${e[6]}`)
}
await browser.close(); aufraeumen(TMP)
