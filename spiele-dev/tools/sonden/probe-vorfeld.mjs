/* Sonde: Weltkaesten der Flughafen-Fahrzeuge/Bauten (th25_) und der Camping-Wohnmobile. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_vorfeld_tmp.html'
mitSonden('traumhaus.html', {
  kaesten: `function(){var out=[];var bb=new THREE.Box3(),s=new THREE.Vector3();
    scene.children.forEach(function(o){var f=o.userData&&o.userData.datei;
      if(!f||!/th25_(flugzeug|tankwagen|gepaeckwagen|fluggastbruecke)|wohnmobil/.test(f))return;
      bb.setFromObject(o);bb.getSize(s);
      out.push([f,+o.position.x.toFixed(1),+o.position.z.toFixed(1),+o.rotation.y.toFixed(2),+bb.min.x.toFixed(1),+bb.max.x.toFixed(1),+bb.min.z.toFixed(1),+bb.max.z.toFixed(1),+s.y.toFixed(1)]);});
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(15000)
const r = await page.evaluate(() => window.__th.kaesten())
await browser.close(); aufraeumen(TMP)
for (const e of r) console.log(`${e[0].padEnd(26)} pos ${e[1]}|${e[2]} rot ${e[3]}   Kasten x ${e[4]}..${e[5]}  z ${e[6]}..${e[7]}  h ${e[8]}`)
