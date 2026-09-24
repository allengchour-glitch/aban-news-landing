/* Sonde: Materialien der Zelt-Modelle (sv_tent, cc0_tent) — warum sieht man nur Stangen? */
import { mitSonden, spielOeffnen, aufraeumen } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
const TMP = '_probe_zelt_tmp.html'
mitSonden('traumhaus.html', {
  zelte: `function(){var out=[];
    scene.traverse(function(o){var f=o.userData&&o.userData.datei;if(!f||!/_tent\.glb/.test(f))return;
      var ms=[];o.traverse(function(m){if(!m.isMesh)return;var mt=Array.isArray(m.material)?m.material[0]:m.material;
        var bb=new THREE.Box3().setFromObject(m),s=new THREE.Vector3();bb.getSize(s);
        ms.push([m.name,mt&&mt.type,mt&&mt.transparent,mt&&+mt.opacity.toFixed(2),mt&&mt.side,mt&&!!mt.map,mt&&mt.color&&mt.color.getHexString(),+s.x.toFixed(1),+s.y.toFixed(1),+s.z.toFixed(1),m.visible]);});
      out.push([f,+o.position.x.toFixed(1),+o.position.z.toFixed(1),ms]);});
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(15000)
const r = await page.evaluate(() => window.__th.zelte())
await browser.close(); aufraeumen(TMP)
for (const e of r) { console.log(`${e[0]} @ ${e[1]}|${e[2]}`); for (const m of e[3]) console.log(`   ${String(m[0]).padEnd(22)} ${m[1]} transp ${m[2]} op ${m[3]} side ${m[4]} map ${m[5]} col #${m[6]}  ${m[7]}x${m[8]}x${m[9]} vis ${m[10]}`) }
