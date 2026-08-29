/**
 * th-see.mjs — bleiben die Enten im Wasser?
 *
 * ⚠️ WOZU. Die Uferlinie des Seeparks wurde an drei Stellen abgeleitet:
 *   1. `seeR(a)` im Weltaufbau — die Wahrheit,
 *   2. eine Zeichen fuer Zeichen identische Kopie `rad()` in `seePromenade`,
 *   3. eine SCHAETZUNG im Enten-Code: »See-Rand liegt bei ~11…16«.
 * Echt sind 9,1…16,9. Die Enten schwammen darum an den engen Stellen an Land.
 *
 * Der Test treibt die Herde in die ENGSTE Richtung des Sees (Fuetterziel weit
 * ausserhalb) und misst ueber 1200 Takte, wie oft und wie weit eine Ente die
 * Uferlinie ueberschreitet.
 *
 * Aufruf:  node spiele-dev/tools/th-see.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  var uf=window._seeUfer||function(a){return 13+Math.sin(a*3)*1.8+Math.cos(a*5+1.3)*1.2+Math.sin(a*2+0.7)*0.9;};
  var aMin=0,uMin=99; for(var k=0;k<720;k++){var a=k/720*6.283; if(uf(a)<uMin){uMin=uf(a);aMin=a;}}
  var raus=0,proben=0,tief=0,wo=null;
  ENTEN.ziel={x:ENTEN.SEE.x+Math.cos(aMin)*40,z:ENTEN.SEE.z+Math.sin(aMin)*40};ENTEN.zielT=999;
  for(var t=0;t<1200;t++){
    updEnten(0.05,performance.now()+t*50);
    ENTEN.enten.forEach(function(en){
      var a=Math.atan2(en.z-ENTEN.SEE.z,en.x-ENTEN.SEE.x);
      var r=Math.hypot(en.x-ENTEN.SEE.x,en.z-ENTEN.SEE.z), u=uf(a);
      proben++; if(r>u){raus++; if(r-u>tief){tief=r-u;wo=[+en.x.toFixed(1),+en.z.toFixed(1)];}}});}
  return {engsteRichtung:+(aMin*180/Math.PI).toFixed(1),engstesUfer:+uMin.toFixed(2),
          proben:proben,anLand:raus,anteil:+(raus/proben*100).toFixed(1),
          tiefstesLand:+tief.toFixed(2),wo:wo};}`

mitSonden('traumhaus.html', { see: sonde }, '_see.html')
const { browser, page, jsFehler } = await spielOeffnen('_see.html', { warten: 20000 })
const R = await page.evaluate(() => window.__th.see())
await browser.close()
aufraeumen('_see.html')

console.log(`Engste Richtung ${R.engsteRichtung}°, Ufer dort ${R.engstesUfer} m`)
if (R.anLand) console.log(`⚠️  ${R.anLand}/${R.proben} Proben an Land (${R.anteil} %), tiefste ${R.tiefstesLand} m bei ${R.wo}`)
else console.log(`✅ 0 von ${R.proben} Proben an Land`)
console.log('JS-Fehler:', jsFehler.length)
