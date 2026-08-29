/**
 * th-club.mjs — steht der Spielclub, passt die Einrichtung hinein, kommt man rein?
 *
 * ⚠️ WOZU. Der Club ist das erste Haus im Spiel, dessen INNENRAUM zaehlt. Damit
 * zaehlen Fehler, die draussen niemand sieht: ein Tisch, der halb in der Wand steckt;
 * zwei Moebel auf demselben Fleck; eine Discokugel, die im Dach haengt oder auf
 * Kopfhoehe; ein Kollider ohne Tuerluecke, der das Haus zwar dicht macht, aber auch
 * unbetretbar. Nichts davon wirft einen Fehler — man merkt es erst beim Hineingehen.
 *
 * Fuenf Fragen:
 *   1. Sind alle zwoelf th14-Teile wirklich in der Szene? (ein 404 ist stumm)
 *   2. Liegt jedes Teil INNERHALB der Waende?
 *   3. Ueberlappen sich zwei Einrichtungsteile im Grundriss?
 *   4. Haengen Discokugel und Kronleuchter zwischen Kopf (2,0 m) und Decke (3,0 m)?
 *   5. Kommt man hinein? inSolid muss in der Tuerluecke FALSCH und auf den drei
 *      anderen Wandfluchten WAHR sein.
 *
 * ⚠️ Frage 5 ist die, die man am leichtesten falsch misst: inSolid ist nur in der
 * aeusseren Schale wahr (0,55 m). Wer mitten im Raum misst, bekommt ueberall "frei"
 * und haelt eine massive Wand fuer eine Tuer. Darum wird auf der WANDFLUCHT getastet.
 *
 * Aufruf:  node spiele-dev/tools/th-club.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  var CX=126, CZ=102;
  var TEILE=["casinobar","pokertisch","roulettetisch","kartentisch","tanzflaeche",
             "dj_pult","automatenreihe","spielautomat","discokugel","kronleuchter",
             "neonschild_gross","samtkordel"];
  var bb=new THREE.Box3(), gefunden={}, kisten=[];
  (window._gebaeude||[]).forEach(function(g){
    var d=g.userData.datei||"";
    if(d.indexOf("th14_")!==0)return;
    var name=d.replace("th14_","").replace(".glb","");
    gefunden[name]=(gefunden[name]||0)+1;
    bb.setFromObject(g);
    if(!isFinite(bb.min.x))return;
    kisten.push({name:name,
      x0:+bb.min.x.toFixed(2),x1:+bb.max.x.toFixed(2),
      z0:+bb.min.z.toFixed(2),z1:+bb.max.z.toFixed(2),
      y0:+bb.min.y.toFixed(2),y1:+bb.max.y.toFixed(2)});});
  var fehlend=TEILE.filter(function(t){return !gefunden[t];});

  /* Waende: Aussenmass 16 x 12 um (CX|CZ), Innenflucht knapp davor. */
  var IX=7.7, IZ=5.7;
  var DRAUSSEN=["neonschild_gross","samtkordel"];   /* gehoeren nach draussen */
  var raus=[], ueber=[], haengt=[];
  kisten.forEach(function(k){
    if(DRAUSSEN.indexOf(k.name)>=0)return;
    if(k.x0<CX-IX-0.01||k.x1>CX+IX+0.01||k.z0<CZ-IZ-0.01||k.z1>CZ+IZ+0.01)raus.push(k);});
  for(var i=0;i<kisten.length;i++)for(var j=i+1;j<kisten.length;j++){
    var a=kisten[i], b=kisten[j];
    var ux=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0);
    var uz=Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0);
    /* Haengendes darf ueber Bodenteilen liegen — nur pruefen, wenn sich auch die
       Hoehen schneiden. Sonst meldet die Discokugel die Tanzflaeche als Konflikt. */
    var uy=Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0);
    if(ux>0.05&&uz>0.05&&uy>0.05)ueber.push({a:a.name,b:b.name,ux:+ux.toFixed(2),uz:+uz.toFixed(2)});}
  ["discokugel","kronleuchter"].forEach(function(n){
    kisten.filter(function(k){return k.name===n;}).forEach(function(k){
      if(k.y0<2.0||k.y1>3.02)haengt.push({name:n,unten:k.y0,oben:k.y1});});});

  /* Begehbarkeit: auf jeder Wandflucht tasten. */
  function fest(x,z){return typeof inSolid==="function"?!!inSolid(x,z):null;}
  var tuer=fest(CX+2,CZ-6.2);
  var sued=[fest(CX-5,CZ-6.2),fest(CX-1,CZ-6.2),fest(CX+6,CZ-6.2)];
  var nord=[fest(CX-5,CZ+6.2),fest(CX,CZ+6.2),fest(CX+5,CZ+6.2)];
  var west=[fest(CX-8.2,CZ-3),fest(CX-8.2,CZ+3)];
  var ost =[fest(CX+8.2,CZ-3),fest(CX+8.2,CZ+3)];
  var innen=[fest(CX,CZ),fest(CX+2,CZ-3),fest(CX-3,CZ+2)];
  return {gefunden:gefunden,fehlend:fehlend,kisten:kisten,raus:raus,ueber:ueber,haengt:haengt,
          tuer:tuer,sued:sued,nord:nord,west:west,ost:ost,innen:innen};}`

mitSonden('traumhaus.html', { club: sonde }, '_club.html')
const { browser, page, jsFehler } = await spielOeffnen('_club.html', { warten: 30000 })
const R = await page.evaluate(() => window.__th.club())
await browser.close()
aufraeumen('_club.html')

/* ⚠️ Regel 3: eine Null ist ein Verdacht. Ohne Bezugszahl saehe "0 Fehler" genauso
   aus wie ein Club, den es gar nicht gibt. */
console.log(`${R.kisten.length} th14-Teile in der Szene (${Object.keys(R.gefunden).length} verschiedene von 12)\n`)
if (!R.kisten.length) { console.log('❌ kein einziges th14-Teil gefunden — der Club fehlt, oder die Sonde misst am falschen Ort'); process.exit(1) }

let fund = 0
if (R.fehlend.length) { fund += R.fehlend.length; console.log(`❌ ${R.fehlend.length} Modelle fehlen (nicht geladen?): ${R.fehlend.join(', ')}`) }
else console.log('✅ Alle zwoelf th14-Modelle stehen')

if (R.raus.length) { fund += R.raus.length; console.log(`\n❌ ${R.raus.length} Teile ragen aus dem Raum:`); for (const k of R.raus) console.log(`   ${k.name.padEnd(18)} x ${k.x0}…${k.x1}  z ${k.z0}…${k.z1}`) }
else console.log('✅ Jedes Innenteil liegt innerhalb der Waende')

if (R.ueber.length) { fund += R.ueber.length; console.log(`\n❌ ${R.ueber.length} Ueberschneidungen im Grundriss:`); for (const u of R.ueber) console.log(`   ${u.a} × ${u.b}  ${u.ux} m in x, ${u.uz} m in z`) }
else console.log('✅ Keine zwei Einrichtungsteile auf demselben Fleck')

if (R.haengt.length) { fund += R.haengt.length; console.log(`\n❌ Haengendes ausserhalb 2,0…3,0 m:`); for (const h of R.haengt) console.log(`   ${h.name}  unten ${h.unten}  oben ${h.oben}`) }
else console.log('✅ Discokugel und Kronleuchter haengen zwischen Kopf und Decke')

const dicht = (a) => a.every((v) => v === true)
const wandOk = dicht(R.nord) && dicht(R.west) && dicht(R.ost) && R.sued.every((v) => v === true)
const innenFrei = R.innen.every((v) => v === false)
if (R.tuer === false && wandOk && innenFrei) console.log('✅ Man kommt durch die Tuer hinein — und nur dort durch die Wand')
else {
  fund++
  console.log('\n❌ Begehbarkeit:')
  console.log(`   Tuerluecke frei? ${R.tuer === false ? 'ja' : 'NEIN (' + R.tuer + ')'}`)
  console.log(`   Waende dicht?    sued ${JSON.stringify(R.sued)} nord ${JSON.stringify(R.nord)} west ${JSON.stringify(R.west)} ost ${JSON.stringify(R.ost)}`)
  console.log(`   Innenraum frei?  ${JSON.stringify(R.innen)}`)
}

console.log('\nJS-Fehler:', jsFehler.length)
console.log(fund ? `\n⚠️  ${fund} Befunde` : '\n✅ Der Spielclub steht, ist moebliert und begehbar')
