/**
 * th-speichern.mjs — ueberlebt der Spielstand das Speichern und Laden?
 *
 * ⚠️ WOZU. `snapshot()` und `loadSnapshot()` tragen alles, was der Spieler gebaut und
 * erreicht hat — rund 45 Felder, von den Waenden bis zu den Tageslimits. Kein Werkzeug
 * hat sie je geprueft. Geht dabei etwas verloren, merkt es niemand beim Programmieren:
 * es faellt erst auf, wenn jemand sein Haus wiederfindet und ein Stueck fehlt. Die
 * Kommentare im Snapshot zaehlen mehrere solcher Faelle auf, die einzeln nachtraeglich
 * gefunden wurden (Gratis-Flags, Emote-Zaehler, Auftragsfortschritt, Tageslimits).
 *
 * Geprueft wird eine harte Invariante:
 *
 *     speichern(laden(speichern(x)))  ==  speichern(x)
 *
 * Was den Umweg nicht ueberlebt, taucht als Unterschied auf.
 *
 * Der Test BAUT dafuer erst ein Haus (30 Boeden, 22 Waende, 6 Moebel) — ein leerer
 * Stand besteht die Pruefung trivial. Er schreibt nichts in den localStorage; die
 * Aenderung lebt nur im Browser dieses Laufs und verschwindet mit ihm.
 *
 * ⚠️ Bekannte, harmlose Asymmetrie: bei einem FRISCHEN Spiel liefert snapshot()
 * `gb: null`, nach dem ersten Laden `gb: {}`. Beide werden ueberall als `sn.gb || {}`
 * gelesen, der Unterschied hat also keine Wirkung — nach dem ersten Laden ist er weg.
 *
 * Aufruf:  node spiele-dev/tools/th-speichern.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  if(typeof snapshot!=="function"||typeof loadSnapshot!=="function")
    return {fehler:"snapshot/loadSnapshot nicht erreichbar"};
  function tief(o){return JSON.parse(JSON.stringify(o));}
  /* ⚠️ EIN LEERER STAND PRUEFT NICHTS. Der erste Lauf lief auf 0 Boeden, 0 Waenden,
     0 Moebeln — der Umweg war trivial bestanden. Also erst bauen, und zwar mit
     ECHTEN Bezeichnern aus dem Katalog des Spiels, nicht mit erfundenen: ein
     unbekannter Moebel-Bezeichner wuerde beim Laden still verworfen, und der Test
     bestuende wieder aus Nichts. */
  /* ⚠️ EIN LEERER STAND PRUEFT NICHTS. Der erste Lauf lief auf 0 Boeden, 0 Waenden,
     0 Moebeln — der Umweg war trivial bestanden. Also erst bauen.
     ⚠️ UND MIT DEN RICHTIGEN WERTEN, nicht mit erfundenen: applyFloor() nimmt einen
     INDEX in FLOORS (0…2), keine Zeichenkette — der erste Versuch mit einer Katalog-ID
     warf "Cannot read properties of undefined (reading texture)". Moebel dagegen
     kommen ueber applyFurn(id, …) und brauchen echte Katalog-Bezeichner; ein
     unbekannter wuerde still verworfen, und der Test bestuende wieder aus Nichts. */
  var moebel=[];
  Object.keys(KATALOG).forEach(function(k){
    KATALOG[k].forEach(function(e){
      if(moebel.length<6&&!/^boden|^wand|^fenster|^tuer/.test(e.id)&&!e.paint&&!e.stufe)moebel.push(e.id);});});
  if(!moebel.length)return {fehler:"keine Moebel im Katalog gefunden"};
  var bau=tief(snapshot());
  bau.floors={}; bau.walls={}; bau.furn=[];
  for(var bx=4;bx<10;bx++)for(var by=4;by<9;by++)bau.floors[bx+","+by]=(bx+by)%FLOORS.length;
  for(var wx=4;wx<10;wx++){bau.walls[wx+",4,0"]="wand"; bau.walls[wx+",9,0"]="wand";}
  for(var wy=4;wy<9;wy++){bau.walls["4,"+wy+",1"]="wand"; bau.walls["10,"+wy+",1"]="wand";}
  bau.walls["6,4,0"]="tuer"; bau.walls["8,4,0"]="fenster";
  moebel.forEach(function(id,i){
    bau.furn.push({id:id,x:5+(i%4),y:5+((i/4)|0),r:i%4,fid:"f"+(900+i),lv:1,w:0,g:0,b:0});});
  loadSnapshot(tief(bau));
  var S1=tief(snapshot());
  var vorher={boeden:Object.keys(S1.floors||{}).length,
              waende:Object.keys(S1.walls||{}).length,
              moebel:(S1.furn||[]).length,
              gewuenscht:{boeden:Object.keys(bau.floors).length,
                          waende:Object.keys(bau.walls).length,
                          moebel:bau.furn.length}};
  loadSnapshot(tief(S1));
  var S2=tief(snapshot());
  /* Feld fuer Feld vergleichen */
  var unterschiede=[];
  function vgl(pfad,a,b){
    if(a===b)return;
    var ta=Object.prototype.toString.call(a), tb=Object.prototype.toString.call(b);
    if(ta!==tb){unterschiede.push({feld:pfad,vorher:JSON.stringify(a),nachher:JSON.stringify(b),grund:"Typ"});return;}
    if(ta==="[object Array]"){
      if(a.length!==b.length){unterschiede.push({feld:pfad,vorher:a.length+" Eintraege",nachher:b.length+" Eintraege",grund:"Anzahl"});return;}
      for(var i=0;i<a.length;i++)vgl(pfad+"["+i+"]",a[i],b[i]);
      return;}
    if(ta==="[object Object]"){
      var ka=Object.keys(a),kb=Object.keys(b);
      ka.concat(kb).forEach(function(k,ix,arr){ if(arr.indexOf(k)!==ix)return;
        vgl(pfad+"."+k,a[k],b[k]); });
      return;}
    unterschiede.push({feld:pfad,vorher:JSON.stringify(a),nachher:JSON.stringify(b),grund:"Wert"});}
  Object.keys(S1).concat(Object.keys(S2)).forEach(function(k,ix,arr){
    if(arr.indexOf(k)!==ix)return; vgl(k,S1[k],S2[k]); });
  /* zusammengefasst nach oberstem Feld */
  var proFeld={};
  unterschiede.forEach(function(u){var t=u.feld.split(/[.\\[]/)[0];proFeld[t]=(proFeld[t]||0)+1;});
  return {felder:Object.keys(S1).length, inhalt:vorher,
          unterschiede:unterschiede.length, proFeld:proFeld,
          proben:unterschiede.slice(0,15)};}`

mitSonden('traumhaus.html', { save: sonde }, '_save.html')
const { browser, page, jsFehler } = await spielOeffnen('_save.html', { warten: 28000 })
const R = await page.evaluate(() => window.__th.save())
await browser.close()
aufraeumen('_save.html')

if (R.fehler) { console.log('⚠️ ' + R.fehler); process.exit(1) }
const g=R.inhalt.gewuenscht
console.log(`${R.felder} Felder im Spielstand`)
console.log(`gebaut: ${g.boeden} Boeden, ${g.waende} Waende, ${g.moebel} Moebel`)
console.log(`davon im Spielstand angekommen: ${R.inhalt.boeden} / ${R.inhalt.waende} / ${R.inhalt.moebel}\n`)
if (!R.unterschiede) console.log('✅ speichern(laden(speichern(x))) == speichern(x) — nichts geht verloren')
else {
  console.log(`⚠️  ${R.unterschiede} Unterschiede nach dem Umweg:`)
  for (const [f, n] of Object.entries(R.proFeld).sort((a, b) => b[1] - a[1]))
    console.log(`   ${String(n).padStart(5)}x  ${f}`)
  console.log('\n   Einzeln:')
  for (const u of R.proben) console.log(`   ${u.feld}: ${u.vorher} -> ${u.nachher}  (${u.grund})`)
}
console.log('\nJS-Fehler:', jsFehler.length)
