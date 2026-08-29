/**
 * th-licht.mjs — brennen nachts so viele Punktlichter wie versprochen, und bleibt
 * ihre ZAHL konstant?
 *
 * ⚠️ DIE ZAHL IST DIE WICHTIGE GROESSE, nicht welche Lampe gerade brennt. three.js
 * baut sein Shader-Programm nach der ANZAHL der Lichter je Art; aendert sie sich, wird
 * bei jedem Wechsel neu uebersetzt — ein Ruckler. Welche der sechs Lampen brennt, ist
 * dagegen gratis: beim Kameraschwenk tauschen sie staendig die Plaetze.
 *
 * Das Werkzeug erzwingt Nacht (__ZEIT(23)), zaehlt ueber 25 s je Bild die sichtbaren
 * PointLights und meldet die Verteilung sowie die Zahl der ZAHLWECHSEL.
 * Erwartet: Verteilung {6: alle Proben}, zahlWechsel 0.
 *
 * Aufruf:  node spiele-dev/tools/th-licht.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(sekunden){
  window.__ZEIT(23);                                  /* Nacht erzwingen */
  return new Promise(function(res){
    var t0=performance.now(), proben=0, zustand=null, wechsel={}, gesehen={}, zahl=null, zahlWechsel=0, zahlen={};
    function tick(){
      var L=window._punktLichter||[];
      if(L.length){
        proben++;
        var jetzt=L.map(function(x){return x.visible?1:0;});
        if(zustand)for(var i=0;i<L.length;i++)
          if(jetzt[i]!==zustand[i])wechsel[i]=(wechsel[i]||0)+1;
        zustand=jetzt;
        var n=jetzt.reduce(function(a,b){return a+b;},0);
        gesehen.sichtbar=n; zahlen[n]=(zahlen[n]||0)+1;
        if(zahl!==null&&n!==zahl)zahlWechsel++;
        zahl=n;
      }
      if(performance.now()-t0<sekunden*1000)requestAnimationFrame(tick);
      else{
        var P=window._lampPool||[];
        res({lichterGesamt:(window._punktLichter||[]).length,
             poolGroesse:P.length,
             poolSichtbar:P.filter(function(x){return x.visible;}).length,
             poolMitLicht:P.filter(function(x){return x.intensity>0;}).length,
             sichtbarGesamt:gesehen.sichtbar,
             nacht:!!window._dorfNacht,
             proben:proben, sekunden:+((performance.now()-t0)/1000).toFixed(1),
             flackernde:Object.keys(wechsel).length, zahlWechsel:zahlWechsel, verteilung:zahlen,
             wechselGesamt:Object.keys(wechsel).reduce(function(a,k){return a+wechsel[k];},0)});}
    }
    requestAnimationFrame(tick);});}`
mitSonden('traumhaus.html', { licht: sonde }, '_licht.html')
const { browser, page, jsFehler } = await spielOeffnen('_licht.html', { warten: 25000 })
console.log(JSON.stringify(await page.evaluate(() => window.__th.licht(25)), null, 1))
await browser.close(); aufraeumen('_licht.html'); console.log('JS-Fehler:', jsFehler.length)
