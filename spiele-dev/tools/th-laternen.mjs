/**
 * th-laternen.mjs — steht jede Strassenlaterne auf einem Untergrund, der sie trägt?
 *
 * ⚠️ WOZU. Die Laternenpunkte laufen durch `wegVonStrasse(x,z)` — das haelt sie aus
 * der FAHRBAHN, und dabei ist es geblieben. Wasser, Stellplaetze und Fahrgassen
 * kennt diese Pruefung nicht. Gefunden hat es niemand, weil th-strassen nur Baender
 * kennt und th-3d nur Modell gegen Modell prueft; ein See ist beides nicht.
 *
 * Geprueft wird gegen die Geometrie, aus der See und Parkplatz wirklich entstehen:
 *   See       `seeR(a) = 13 + sin(3a)*1.8 + cos(5a+1.3)*1.2 + sin(2a+0.7)*0.9`  um (0|146)
 *   Parkplatz `PX=25, PZ=97, PW=36, PD=16`, Stellreihen x 9,6…40,4, Fahrgasse ±2,8 um z=97
 *
 * Aufruf:  node spiele-dev/tools/th-laternen.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  var P=window._lampPos||[],R=[];
  function seeR(a){return 13+Math.sin(a*3)*1.8+Math.cos(a*5+1.3)*1.2+Math.sin(a*2+0.7)*0.9;}
  var PX=25,PZ=97,PW=36,PD=16,BAY0=9.6,BAY1=40.4,GASSE=2.8;
  P.forEach(function(p){
    var x=p[0],z=p[1],grund=[];
    var a=Math.atan2(z-146,x), d=Math.hypot(x,z-146), ufer=seeR(a);
    if(d<ufer)grund.push("IM SEE, "+(ufer-d).toFixed(1)+" m vom Ufer");
    if(Math.abs(x-PX)<PW/2&&Math.abs(z-PZ)<PD/2){
      if(Math.abs(z-PZ)<GASSE)grund.push("in der FAHRGASSE des Parkplatzes");
      else if(x>BAY0&&x<BAY1)grund.push("auf einem STELLPLATZ");}
    if(grund.length)R.push({x:+x.toFixed(1),z:+z.toFixed(1),grund:grund.join(" + ")});});
  return {gesamt:P.length,fehler:R};}`

mitSonden('traumhaus.html', { lampen: sonde }, '_lamp.html')
const { browser, page, jsFehler } = await spielOeffnen('_lamp.html', { warten: 22000 })
const R = await page.evaluate(() => window.__th.lampen())
await browser.close()
aufraeumen('_lamp.html')

console.log(`${R.gesamt} Laternen, ${R.fehler.length} auf falschem Untergrund`)
for (const f of R.fehler) console.log(`  ⚠️  ${f.x}|${f.z}  ${f.grund}`)
if (!R.fehler.length) console.log('  ✅ alle auf tragfaehigem Grund')
console.log('JS-Fehler:', jsFehler.length)
