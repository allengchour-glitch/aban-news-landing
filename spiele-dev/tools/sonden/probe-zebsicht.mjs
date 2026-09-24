/* Sonde: Sichtbarkeit und Instanzzahl der vier Uebergangs-InstancedMeshes, Spieler an zwei Orten. */
import { mitSonden, spielOeffnen, aufraeumen } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
const TMP = '_probe_zebsicht_tmp.html'
mitSonden('traumhaus.html', {
  geh: `function(x,z){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;followSim=null;camTx=x;camTz=z;updCam();return true;}`,
  stand: `function(){var out=[];scene.children.forEach(function(o){if(!o.isInstancedMesh)return;if(!(o.count===0||o.instanceMatrix.count===420||o.instanceMatrix.count===80))return;
      out.push([o.instanceMatrix.count,o.count,o.visible,!!(o.userData&&o.userData.nieAusblenden)]);});return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
for (const P of [[62,58],[242.6,0],[-285,-382]]) {
  await page.evaluate((v) => window.__th.geh(...v), P); await page.waitForTimeout(2500)
  const r = await page.evaluate(() => window.__th.stand())
  console.log('Spieler bei', P.join('|'), '->', JSON.stringify(r), ' [Kapazitaet, count, visible, nieAusblenden]')
}
await browser.close(); aufraeumen(TMP)
