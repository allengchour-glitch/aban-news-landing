/**
 * th-lod.mjs — blinkt die Sichtbarkeitsgrenze, wenn jemand daran entlanggeht?
 *
 * ⚠️ WOZU. lodTakt() blendet Kleinteile ab 78 m aus (nahe Stufe: 34 m). Mit EINER
 * Schwelle schaltet alles, was genau auf der Kante steht, bei jeder Ueberschreitung
 * um — und wer an einer Hauswand entlanggeht, ueberschreitet sie staendig.
 *
 * Der Test ruft lodTakt() direkt auf und laesst die Figur zwanzigmal einen Meter hin
 * und her gehen. Ein Objekt darf dabei hoechstens zweimal umschalten (rein, raus);
 * mehr heisst, es sitzt auf der Kante und blinkt.
 *
 * ⚠️ Die Groesse des LOD-Index schwankt zwischen Laeufen (5400…5700), weil das
 * Streuwerk zufaellig gesetzt wird. Verglichen wird die Zahl der FLACKERNDEN, nicht
 * die des Index.
 *
 * Aufruf:  node spiele-dev/tools/th-lod.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(){
  if(typeof lodTakt!=="function")return {fehler:"lodTakt nicht erreichbar"};
  var L=_lodKlein;
  if(!L||!L.length)return {fehler:"LOD-Index leer — laenger warten"};
  var stand=L.map(function(e){return e.m.visible?1:0;});
  var wechsel=L.map(function(){return 0;});
  /* Ein Spieler, der einen Meter hin und her geht: px 0 -> 1 -> 0, zwanzigmal. */
  for(var runde=0;runde<20;runde++){
    for(var s=0;s<2;s++){
      lodTakt(s?1:0, 0);
      for(var i=0;i<L.length;i++){
        var v=L[i].m.visible?1:0;
        if(v!==stand[i]){wechsel[i]++;stand[i]=v;}}}}
  var flapp=[];
  for(var k=0;k<L.length;k++) if(wechsel[k]>2)
    flapp.push({n:wechsel[k], bei:(+L[k].x.toFixed(0))+"|"+(+L[k].z.toFixed(0)),
                d:+Math.hypot(L[k].x,L[k].z).toFixed(1), nah:L[k].nah});
  flapp.sort(function(a,b){return b.n-a.n;});
  return {imIndex:L.length, flackernd:flapp.length,
          gesamtWechsel:wechsel.reduce(function(a,b){return a+b;},0),
          schlimmste:flapp.slice(0,10)};}`
mitSonden('traumhaus.html', { lodh: sonde }, '_lodh.html')
const { browser, page, jsFehler } = await spielOeffnen('_lodh.html', { warten: 28000 })
const R = await page.evaluate(() => window.__th.lodh())
await browser.close(); aufraeumen('_lodh.html')
if (R.fehler) console.log('⚠️', R.fehler)
else {
  console.log(`${R.imIndex} Objekte im LOD-Index · ${R.gesamtWechsel} Sichtbarkeitswechsel bei 20x einem Meter hin und her`)
  console.log(`${R.flackernd} davon flackern (mehr als 2 Wechsel):`)
  for (const e of R.schlimmste) console.log(`   ${String(e.n).padStart(3)} Wechsel  ${e.bei.padStart(12)}  Abstand ${e.d} m  ${e.nah ? 'Nahstufe 34 m' : 'Stufe 78 m'}`)
}
console.log('JS-Fehler:', jsFehler.length)
