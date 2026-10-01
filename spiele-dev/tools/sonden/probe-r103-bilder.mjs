/* Sonde (Runde 103): drei Bilder fuer Runbook/PR — Kopfzeile nach dem Palast (Rang), das 🏆-Panel mit Rang- und
   Orte-Zeile, der Ausbau-Knopf neben dem eigenen Haus. Handy-Querformat 844x390. Urteilt nicht, zeigt nur.
   Aufruf: node spiele-dev/tools/sonden/probe-r103-bilder.mjs [ordner=spiele-dev/screenshots] */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const ORD = process.argv[2] || 'spiele-dev/screenshots', TMP = '_probe_r103b_tmp.html'
mitSonden('traumhaus.html', {
  palast: `function(){wohnstufe=5;stats.quests=12;stats.orte=WORLD_POIS.slice(0,9).map(function(o){return o[3];});updHUD();return document.getElementById("stufeBox").textContent;}`,
  panel: `function(){document.getElementById("achBtn").click();return document.getElementById("questTxt").textContent;}`,
  haus: `function(){document.getElementById("achClose").click();var hs=window._immo[0];geld=50000;if(immo.indexOf(0)<0){immo.push(0);immoFlagge(hs);}
    sims[0].x=hs.x+3;sims[0].z=hs.z+3;camTx=hs.x;camTz=hs.z;updImmo(1);updImmo(1);var kb=document.getElementById("kaufBtn");return kb.textContent+" · "+kb.style.display;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 45000, viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 } })
const a = await page.evaluate(() => window.__th.palast()); await page.waitForTimeout(800)
await page.screenshot({ path: `${ORD}/r103-rang-kopfzeile.png` }); console.log('Kopfzeile: ' + a)
const b = await page.evaluate(() => window.__th.panel()); await page.waitForTimeout(800)
await page.screenshot({ path: `${ORD}/r103-panel-rang-orte.png` }); console.log('Panel: ' + b.slice(0, 160))
const c = await page.evaluate(() => window.__th.haus()); await page.waitForTimeout(1500)
await page.screenshot({ path: `${ORD}/r103-haus-ausbau.png` }); console.log('Haus: ' + c)
await browser.close(); aufraeumen(TMP)
console.log('JS-Fehler: ' + jsFehler.length + (jsFehler.length ? ' ' + jsFehler.join(' | ') : ''))
