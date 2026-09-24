/* Sonde: alle registrierten Uebergaenge (window._uebergaenge) mit Lage, Richtung, Breite. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_ueberg_tmp.html'
mitSonden('traumhaus.html', { ueb: `function(){return (window._uebergaenge||[]).map(function(u){return u.map(function(v){return typeof v==="number"?+v.toFixed(1):v;});});}` }, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(8000)
const r = await page.evaluate(() => window.__th.ueb())
await browser.close(); aufraeumen(TMP)
console.log(r.length, 'Uebergaenge  [x, z, quer(Strasse laengs x), Laenge, halbe Breite+0.05]')
for (const u of r) console.log('  ', JSON.stringify(u))
