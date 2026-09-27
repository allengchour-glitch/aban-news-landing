/* Sonde (Runde 102): JEDER Ort der Karte aus der Spielkamera — schraeg von oben, die Figur steht dort.
   Anlass: User „gestallte alles besser um". Um zu urteilen, was schlecht angeordnet ist, muss man die ganze
   Welt sehen, nicht nur die sechs Orte von th-stadtrundgang. Die Liste kommt aus dem Spiel (WORLD_POIS,
   von marke()/domMarke() auf die echte Lage nachgezogen), dazu das eigene Grundstueck.
   ⚠️ Die Figur wird MITversetzt: Entfernungs-Ausblendung (lodTakt) haengt am Spieler, nicht an der Kamera —
   sonst fotografiert man eine leergeraeumte Wiese (th-blick, 2026-09-08).
   Das Werkzeug urteilt nicht; die Bilder werden angeschaut.
   Aufruf: node spiele-dev/tools/sonden/probe-luftbild.mjs <ausgabeordner> [r=55] [neigung=0.95] [nur=Name,Name] */
import fs from 'fs'
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const [OUT = 'spiele-dev/screenshots/lb', R = '55', B = '0.95', NUR = ''] = process.argv.slice(2)
fs.mkdirSync(OUT, { recursive: true })
const TMP = '_probe_luftbild_tmp.html'
mitSonden('traumhaus.html', {
  lbOrte: `function(){var o=[["Zuhause",cx(BAUX0+(BAUW>>1)),cz(BAUY0+(BAUH>>1))]];
    WORLD_POIS.forEach(function(p){o.push([p[3],p[0],p[1]]);});return o;}`,
  lbHin: `function(x,z,r,b){var me=sims[0];me.x=x;me.z=z;me.state="idle";me.pose="stand";me.path=null;
    if(me.mesh){me.mesh.position.x=x;me.mesh.position.z=z;}
    followSim=me;camTx=x;camTz=z;camRT=r;camR=r;camB=b;updCam();
    if(typeof lodTakt==='function')lodTakt(x,z);
    if(typeof updVerdecker==='function'){updVerdecker();updVerdecker();updVerdecker();}return true;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 60000, screen: { width: 412, height: 915 }, viewport: { width: 844, height: 390 } })
await page.waitForTimeout(15000)
let orte = await page.evaluate(() => window.__th.lbOrte())
if (NUR) { const n = NUR.split(','); orte = orte.filter((o) => n.includes(o[0])) }
let i = 0
for (const [name, x, z] of orte) {
  i++
  await page.evaluate((a) => window.__th.lbHin(...a), [x, z, +R, +B])
  await page.waitForTimeout(3500)
  const f = `${OUT}/${String(i).padStart(2, '0')}-${name.replace(/[^\wäöüÄÖÜ-]/g, '_')}.png`
  await page.screenshot({ path: f, timeout: 120000 })
  console.log(`📷 ${f.split('/').pop()}  (${(+x).toFixed(0)}|${(+z).toFixed(0)})`)
}
console.log(`${orte.length} Orte · JS-Fehler ${jsFehler.length}`)
await browser.close(); aufraeumen(TMP)
