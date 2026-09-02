/* th-plaetze.mjs — sucht freie, flache, strassennahe Plaetze in der Welt.
 *
 * ⚠️ WOZU. Koordinaten fuer neue Objekte zu RATEN endet damit, dass etwas im Haus, auf
 * der Fahrbahn oder am Hang steht — und das faellt oft erst im Screenshot auf. Dieses
 * Werkzeug laesst das SPIEL antworten: es prueft jeden Rasterpunkt gegen die echten
 * Funktionen der Welt (inSolid, imBau, wegVonStrasse, gelaendeH) und liefert die
 * brauchbaren zurueck. So sind die drei zusaetzlichen Stunt-Rampen entstanden
 * (272 Treffer, davon die drei mit dem groessten Abstand zueinander).
 *
 * ⚠️ FALLE BEI DER AUSWAHL: "nimm den naechsten passenden Treffer" legte alle vier
 * Rampen an den Westrand (x = -140) — die Suchschleife laesst x aussen laufen, und wer
 * aus einer sortierten Liste auswaehlt, erbt deren Sortierung. Darum: erst den
 * Kartenrand ausschliessen, dann GIERIG den Platz waehlen, der am weitesten von allen
 * bisher gewaehlten weg ist.
 *
 * Aufruf:  node spiele-dev/tools/th-plaetze.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const TMP='spiele-dev/tools/_s.html'
mitSonden('traumhaus.html', { sp:`function(){
  var gut=[],alt=window._rampe;
  for(var x=-150;x<=150;x+=10)for(var z=-150;z<=150;z+=10){
    /* frei von Gebaeuden */
    if(inSolid(x,z)||imBau(x,z))continue;
    /* nicht auf der Strasse: wegVonStrasse darf den Punkt nicht verschieben */
    var w=wegVonStrasse(x,z); if(Math.abs(w[0]-x)>0.01||Math.abs(w[1]-z)>0.01)continue;
    /* aber NAH an einer Strasse — sonst kommt kein Auto auf Tempo */
    var nah=false;
    for(var dx=-26;dx<=26&&!nah;dx+=4)for(var dz=-26;dz<=26&&!nah;dz+=4){
      var w2=wegVonStrasse(x+dx,z+dz);
      if(Math.abs(w2[0]-(x+dx))>0.01||Math.abs(w2[1]-(z+dz))>0.01)nah=true;}
    if(!nah)continue;
    /* flach: die Rampe darf nicht am Hang stehen */
    var h0=gelaendeH(x,z),flach=true;
    for(var a=-4;a<=4&&flach;a+=4)for(var b=-4;b<=4&&flach;b+=4)
      if(Math.abs(gelaendeH(x+a,z+b)-h0)>0.25)flach=false;
    if(!flach)continue;
    /* rundherum Platz fuer den Keil (7x4 m) */
    var frei=true;
    for(var a2=-5;a2<=5&&frei;a2+=2.5)for(var b2=-3;b2<=3&&frei;b2+=1.5)
      if(inSolid(x+a2,z+b2)||imBau(x+a2,z+b2))frei=false;
    if(!frei)continue;
    /* Abstand zur bestehenden Rampe */
    var d=Math.hypot(x-alt.x,z-alt.z); if(d<40)continue;
    gut.push({x:x,z:z,h:+h0.toFixed(2),d:+d.toFixed(0)});}
  return gut;}` }, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 40000 })
const g = await page.evaluate(()=>window.__th.sp())
console.log('freie, strassennahe, flache Plaetze:', g.length)
/* ⚠️ "Nimm den naechsten passenden" legte alle vier an den Westrand (x=-140), weil die
   Schleife x aussen laeuft. Also: erst den Kartenrand ausschliessen, dann GIERIG den
   Platz waehlen, der am weitesten von allen bisherigen weg ist. */
const kern = g.filter(k => Math.abs(k.x) <= 115 && Math.abs(k.z) <= 115)
const alt0 = { x: -64, z: 28 }
const gew = []
while (gew.length < 3) {
  let best = null, bd = -1
  for (const k of kern) {
    const d = Math.min(Math.hypot(k.x - alt0.x, k.z - alt0.z),
                       ...gew.map(p => Math.hypot(p.x - k.x, p.z - k.z)))
    if (d > bd) { bd = d; best = k }
  }
  if (!best || bd < 55) break
  gew.push(best)
}
console.log('im Kern:', kern.length)
console.log('Vorschlag:', JSON.stringify(gew))
await browser.close(); aufraeumen(TMP)
