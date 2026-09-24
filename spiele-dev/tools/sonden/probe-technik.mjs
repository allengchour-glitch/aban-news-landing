/* Sonde: Weltkaesten der Technikpark-Objekte + alles, was auf dem Flugfeld (Bahn+Vorfeld) steht. */
import { mitSonden, spielOeffnen, aufraeumen } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
const TMP = '_probe_technik_tmp.html'
mitSonden('traumhaus.html', {
  technik: `function(){var out=[];var bb=new THREE.Box3(),c=new THREE.Vector3(),s=new THREE.Vector3();
    scene.children.forEach(function(o){var f=o.userData&&o.userData.datei;
      if(!f||!/nf_|wasserturm|tankstelle|restaurant|container/.test(f))return;
      bb.setFromObject(o);bb.getCenter(c);bb.getSize(s);
      if(Math.hypot(c.x-405,c.z+260)>80)return;
      out.push([f,+o.position.x.toFixed(1),+o.position.z.toFixed(1),+bb.min.x.toFixed(1),+bb.max.x.toFixed(1),+bb.min.z.toFixed(1),+bb.max.z.toFixed(1),+s.y.toFixed(1)]);});
    return out;}`,
  flugfeld: `function(){var out=[];var bb=new THREE.Box3(),c=new THREE.Vector3();
    scene.children.forEach(function(o){if(!o.visible)return;var f=(o.userData&&o.userData.datei)||"";
      if(/th25_/.test(f))return;
      bb.setFromObject(o);if(bb.isEmpty())return;bb.getCenter(c);
      var sz=new THREE.Vector3();bb.getSize(sz);if(sz.x>200||sz.z>200)return;
      if(c.x<225||c.x>375||c.z<-206||c.z>-150)return;
      out.push([f||o.type+":"+(o.name||"?"),+c.x.toFixed(1),+c.z.toFixed(1),+sz.x.toFixed(1),+sz.y.toFixed(1),+sz.z.toFixed(1)]);});
    return out;}`,
  strasse: `function(){var S=window._viertelSolver;return S&&S.fahrbahn?"solver da":"kein solver";}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(20000)
const t = await page.evaluate(() => window.__th.technik())
const f = await page.evaluate(() => window.__th.flugfeld())
await browser.close(); aufraeumen(TMP)
console.log('TECHNIKPARK (Strasse z=-260, Achse x):')
for (const r of t) console.log(`  ${r[0].padEnd(24)} pos ${r[1]}|${r[2]}  x ${r[3]}..${r[4]}  z ${r[5]}..${r[6]}  h ${r[7]}   Abstand Kasten→Strassenmitte z: ${Math.min(Math.abs(r[5]+260),Math.abs(r[6]+260)).toFixed(1)}`)
console.log('\nAUF DEM FLUGFELD (x 225..375, z -206..-150), ohne th25_:')
for (const r of f) console.log(`  ${String(r[0]).padEnd(30)} ${r[1]}|${r[2]}  ${r[3]}x${r[5]} h ${r[4]}`)
console.log('Anzahl', f.length)
