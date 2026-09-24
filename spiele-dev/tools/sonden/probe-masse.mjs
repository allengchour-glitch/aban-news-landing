/* Sonde: geladene Grundflaeche (w x d) je Modell bei Zielhoehe h — wie bau() skaliert (h / Boxhoehe). */
import { mitSonden, spielOeffnen, aufraeumen } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
const L = JSON.parse(process.argv[2])
const TMP = '_probe_masse_tmp.html'
mitSonden('traumhaus.html', {
  masse: `function(L){var out={};L.forEach(function(e){var f=e[0],h=e[1];
      window._glbHol(f,function(root){if(!root){out[f]="fehlt";return;}var r=root.clone(true);
        var bb=new THREE.Box3().setFromObject(r),sz=new THREE.Vector3();bb.getSize(sz);
        var s=h/(sz.y||1);out[f]=[+(sz.x*s).toFixed(1),+(sz.z*s).toFixed(1),+sz.y.toFixed(2),+(bb.min.x*s).toFixed(1),+(bb.max.x*s).toFixed(1),+(bb.min.z*s).toFixed(1),+(bb.max.z*s).toFixed(1)];});});
    window.__masse=out;return true;}`,
  masseLesen: `function(){return window.__masse||{};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.evaluate((v) => window.__th.masse(v), L)
let r = {}
for (let i = 0; i < 40; i++) { await page.waitForTimeout(3000); r = await page.evaluate(() => window.__th.masseLesen()); if (Object.keys(r).length >= L.length) break }
await browser.close(); aufraeumen(TMP)
for (const [f, h] of L) { const v = r[f]; console.log(v ? `${f.padEnd(30)} h ${String(h).padStart(5)}  w ${String(v[0]).padStart(6)}  d ${String(v[1]).padStart(6)}   (roh y ${v[2]})  x ${v[3]}..${v[4]}  z ${v[5]}..${v[6]}` : `${f.padEnd(30)} ??`) }
