/**
 * th-bewohner.mjs — stecken Bewohner oder Besucher fest, oder stehen sie in einer Wand?
 *
 * ⚠️ WOZU. `th-koop.mjs` prueft zwei Spielerwege im Mehrspielermodus. Die uebrigen
 * Bewohner (`sims`) und die Besucher (`npcs`) hat nie jemand beobachtet. Ein NPC, der
 * in einer Ecke haengenbleibt oder mitten in einem Haus steht, erzeugt kein Fehlerbild
 * — er steht einfach da, und niemand merkt es beim Programmieren.
 *
 * Zwei Fragen, beide ueber die Zeit gemessen:
 *   1. Bewegt sich jeder, der sich bewegen soll? (Weg ueber 60 s)
 *   2. Steht jemand IN einem Kollider? (inSolid an seiner Stelle, ueber alle Proben)
 *
 * ⚠️ NICHT JEDER STILLSTAND IST EIN FEHLER. Wer schlaeft, sitzt, arbeitet oder auf
 * etwas wartet, steht mit Absicht. Darum zaehlt nicht "hat sich nicht bewegt", sondern
 * "hat sich waehrend der ganzen Messung nicht bewegt UND war nie in einem erklaerenden
 * Zustand". Der Zustand steht in `s.state`.
 *
 * ⚠️ SwiftShader liefert hier rund 2 Bilder je Sekunde — 60 s sind also etwa 120 Proben.
 *
 * Aufruf:  node spiele-dev/tools/th-bewohner.mjs [sekunden]
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const SEK = Number(process.argv[2] || 60)

const sonde = `function(sekunden){
  /* ⚠️ DIE UHR FESTHALTEN, SONST MISST MAN EINE LEERE WELT. Der Besucher-Pool haengt
     an der Tageszeit: 8…12 Uhr Postbote, 13…18 Uhr Nachbarin und Haendler, sonst ist
     der Pool LEER und es kommt niemand. Bei rund zwei Bildern je Sekunde wandert die
     Spielzeit waehrend der Messung aus dem Fenster — der erste Lauf sah darum 60 s
     lang null Besucher und haette beinahe "alles in Ordnung" gemeldet.
     Jetzt steht die Uhr auf 9 Uhr und wird bei jedem Takt nachgesetzt. */
  if(typeof window.__ZEIT==="function")window.__ZEIT(9*60);
  /* ⚠️ UND DEN BESUCHS-ZAEHLER ANSTOSSEN. Das dt der Spielschleife ist gedeckelt —
     sonst zerrisse die Physik bei den zwei Bildern je Sekunde dieses Containers.
     GEMESSEN: in 45 s Echtzeit faellt npcTimer nur von 20 auf 13,5, Spielzeit laeuft
     also rund siebenmal langsamer. Der erste Besucher kaeme erst nach zweieinhalb
     Minuten, und ein Test, der darauf wartet, misst eine leere Welt und meldet
     "alles in Ordnung". Darum den Zaehler auf 0 setzen und danach jedes Mal, wenn
     wieder Platz ist — so laeuft der ganze Zyklus (kommen, handeln, gehen) mehrfach. */
  if(typeof npcTimer!=="undefined")npcTimer=0.1;
  return new Promise(function(res){
    var t0=performance.now(), proben=0;
    var wer=[];
    /* ⚠️ DIE SPIELFIGUR IST KEIN NPC. meinSi() liefert im Einzelspieler 0, und
       simDefs[0] ist Max — die Figur, die der Spieler steuert. Sie steht still, weil
       die Sonde keine Taste drueckt; das ist richtig und kein Fund. Der erste Lauf
       meldete "Max hat sich 0 m bewegt" und meinte damit nur sich selbst. */
    var ich=(typeof meinSi==="function")?meinSi():0;
    (sims||[]).forEach(function(s,i){
      wer.push({art:(i===ich?"Spielfigur":"Bewohner"),i:i,o:s});});
    var npcStart=(typeof npcs!=="undefined"?npcs:[]).length;
    function sammeln(){
      /* npcs kommen und gehen — nur die verfolgen, die von Anfang an da sind. */
      (typeof npcs!=="undefined"?npcs:[]).forEach(function(n,i){
        if(!wer.some(function(w){return w.o===n;}))wer.push({art:"Besucher",i:i,o:n});});}
    sammeln();
    var weg=wer.map(function(){return 0;});
    var imFesten=wer.map(function(){return 0;});
    var zustaende=wer.map(function(){return {};});
    var letzt=wer.map(function(w){return {x:w.o.x,z:w.o.z};});
    function tick(){
      proben++;
      if(typeof window.__ZEIT==="function")window.__ZEIT(9*60);
      if(typeof npcTimer!=="undefined"&&npcs.length<2&&npcTimer>0.5)npcTimer=0.1;
      sammeln();                       /* neu eingetroffene Besucher aufnehmen */
      while(weg.length<wer.length){weg.push(0);imFesten.push(0);zustaende.push({});
        letzt.push({x:wer[weg.length-1].o.x,z:wer[weg.length-1].o.z});}
      for(var i=0;i<wer.length;i++){
        var o=wer[i].o;
        if(o.x===undefined||o.z===undefined)continue;
        weg[i]+=Math.hypot(o.x-letzt[i].x,o.z-letzt[i].z);
        letzt[i].x=o.x; letzt[i].z=o.z;
        if(typeof inSolid==="function"&&inSolid(o.x,o.z))imFesten[i]++;
        var z=o.state||o.zustand||"?";
        zustaende[i][z]=(zustaende[i][z]||0)+1;}
      if(performance.now()-t0<sekunden*1000)requestAnimationFrame(tick);
      else res({proben:proben, sekunden:+((performance.now()-t0)/1000).toFixed(1),
        npcStart:npcStart, npcEnde:(typeof npcs!=="undefined"?npcs:[]).length,
        liste:wer.map(function(w,i){
          return {art:w.art, i:w.i, name:w.o.name||w.o.typ||("#"+w.i),
                  weg:+weg[i].toFixed(2), fest:imFesten[i],
                  ort:(+w.o.x.toFixed(0))+"|"+(+w.o.z.toFixed(0)),
                  zustaende:Object.keys(zustaende[i]).join(",")};})});}
    requestAnimationFrame(tick);});}`

mitSonden('traumhaus.html', { bew: sonde }, '_bew.html')
const { browser, page, jsFehler } = await spielOeffnen('_bew.html', { warten: 28000 })
const R = await page.evaluate((s) => window.__th.bew(s), SEK)
await browser.close()
aufraeumen('_bew.html')

console.log(`${R.liste.length} verfolgt · ${R.proben} Proben in ${R.sekunden} s · Besucher ${R.npcStart} -> ${R.npcEnde}\n`)
/* ⚠️ DIE AUSNAHME AUCH ANWENDEN, nicht nur beschreiben. Wer arbeitet, schlaeft,
   sitzt oder wartet, steht mit Absicht — der erste Lauf meldete "Mia hat sich nicht
   bewegt" und verschwieg, dass ihr Zustand die ganze Zeit `work` war. */
const ERKLAERT = /work|schlaf|sleep|sitz|sit|warte|wait|essen|eat|act|pause/i
const still = R.liste.filter((e) => e.weg < 0.5 && e.art !== 'Spielfigur' && !ERKLAERT.test(e.zustaende))
const erklaert = R.liste.filter((e) => e.weg < 0.5 && (e.art === 'Spielfigur' || ERKLAERT.test(e.zustaende)))
const drin = R.liste.filter((e) => e.fest > R.proben * 0.5)
if (erklaert.length) {
  console.log(`ℹ️  ${erklaert.length} stehen mit Grund (Zustand erklaert es):`)
  for (const e of erklaert) console.log(`   ${e.art.padEnd(11)} ${String(e.name).padEnd(14)} ${e.weg} m  ${e.art === 'Spielfigur' ? 'wird nicht gesteuert' : 'Zustand: ' + e.zustaende}`)
  console.log()
}
if (!still.length) console.log('✅ Jeder bewegt sich oder steht mit Grund')
else {
  console.log(`⚠️  ${still.length} haben sich kaum bewegt (< 0,5 m in ${R.sekunden} s):`)
  for (const e of still) console.log(`   ${e.art.padEnd(9)} ${String(e.name).padEnd(14)} ${e.weg} m  bei ${e.ort.padStart(10)}  Zustand: ${e.zustaende}`)
}
if (!drin.length) console.log('✅ Niemand steht dauerhaft in einem Kollider')
else {
  console.log(`\n⚠️  ${drin.length} stehen ueber die halbe Messung IN einem Kollider:`)
  for (const e of drin) console.log(`   ${e.art.padEnd(9)} ${String(e.name).padEnd(14)} ${e.fest}/${R.proben} Proben  bei ${e.ort}`)
}
console.log('\nJS-Fehler:', jsFehler.length)
