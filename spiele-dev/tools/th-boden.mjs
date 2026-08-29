/**
 * th-boden.mjs — steht jedes Bauwerk auf dem Boden, den es an seiner Stelle gibt?
 *
 * ⚠️ WOZU. th-3d vergleicht Modell gegen Modell. Das GELAENDE ist keines: es ist ein
 * namenloses Grossmesh ohne `userData.datei` und faellt aus jeder Paarpruefung. Genau
 * dort steckte die Seilbahn (#2370) — zwei Stuetzen 10,6 und 14,4 m im Hang, die
 * Bergstation 6,7 m im Fels — und niemand konnte es sehen.
 *
 * Dieses Werkzeug prueft jedes Objekt aus `window._gebaeude` gegen
 *   window._bergHoehe(x,z)   — grosser Berg + alle 34 Kettenberge (eine Quelle, #2370)
 *   window._seeUfer(a)       — die Uferlinie des Seeparks (eine Quelle, #2374)
 * und meldet drei Sorten Fehler:
 *   IM FELS   Unterkante mehr als 1,5 m unter der Gelaendeoberflaeche
 *   SCHWEBT   Unterkante mehr als 2,0 m ueber dem Gelaende
 *   IM WASSER Grundriss-Mitte innerhalb der Uferlinie
 *
 * Die Schwellen sind grosszuegig: ein Sockel darf in den Hang greifen, ein Vordach
 * darf ueberstehen. Gesucht sind Bauwerke, die sichtbar am falschen Ort sitzen.
 *
 * Aufruf:  node spiele-dev/tools/th-boden.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  var G=window._gebaeude||[], H=window._bergHoehe, U=window._seeUfer;
  if(!H)return {fehler:"window._bergHoehe fehlt — Werkzeug misst nichts"};
  /* ⚠️ ERST DIE AUSNAHMEN, SONST LUEGT DIE LISTE. Der erste Lauf meldete 49-mal
     »schwebt« und 1-mal »im Wasser« — darunter das Gipfelkreuz auf der Bergstation,
     vier Gondeln am Seil, die Obergeschosse eines gestapelten Hochhauses und einen
     SCHWAN im See. Alle vier Sorten gehoeren genau dorthin.
       * Wasservoegel und Boote duerfen im Wasser sein.
       * Was ueber einem ANDEREN Bauwerk sitzt, steht nicht in der Luft, sondern auf
         etwas Gebautem: Terrasse, Sockel, unteres Stockwerk.
       * Was an einem Seil haengt, ebenso. */
  var IM_WASSER_ERLAUBT=/schwan|ente|boot|ruderboot|steg|floss/i;
  var AM_SEIL=/gondel/i;
  var kaesten=[];
  G.forEach(function(w){ if(!w||!w.parent)return;
    var b=new THREE.Box3().setFromObject(w);
    if(isFinite(b.min.x))kaesten.push(b); });
  function traegtEtwas(b){                     /* liegt ein anderes Bauwerk darunter? */
    for(var i=0;i<kaesten.length;i++){var k=kaesten[i];
      if(k===b)continue;
      if(k.max.y>b.min.y+0.5)continue;         /* nicht darunter */
      if(k.max.x<b.min.x||k.min.x>b.max.x)continue;
      if(k.max.z<b.min.z||k.min.z>b.max.z)continue;
      return true;}
    return false;}
  var bb=new THREE.Box3(), R={fels:[],schwebt:[],wasser:[],geprueft:0,erklaert:0};
  G.forEach(function(w){
    if(!w||!w.parent)return;
    var d=(w.userData&&w.userData.datei)||"(ohne Datei)";
    bb.setFromObject(w);
    if(!isFinite(bb.min.x))return;
    R.geprueft++;
    var mx=(bb.min.x+bb.max.x)/2, mz=(bb.min.z+bb.max.z)/2;
    /* Gelaende an den vier Ecken UND in der Mitte: ein Haus am Hang steht auf der
       hoechsten Stelle seiner Grundflaeche, nicht auf der mittleren. */
    var hoch=-1e9, tief=1e9;
    [[bb.min.x,bb.min.z],[bb.max.x,bb.min.z],[bb.min.x,bb.max.z],[bb.max.x,bb.max.z],[mx,mz]]
      .forEach(function(p){var h=H(p[0],p[1]); if(h>hoch)hoch=h; if(h<tief)tief=h;});
    var e={was:d, bei:(+mx.toFixed(1))+"|"+(+mz.toFixed(1)),
           unterkante:+bb.min.y.toFixed(2), gelaende:[+tief.toFixed(2),+hoch.toFixed(2)]};
    if(hoch-bb.min.y>1.5){e.tiefe=+(hoch-bb.min.y).toFixed(2); R.fels.push(e);}
    else if(bb.min.y-hoch>2.0){
      if(AM_SEIL.test(d)||traegtEtwas(bb.clone())){R.erklaert++;}
      else {e.hoehe=+(bb.min.y-hoch).toFixed(2); R.schwebt.push(e);}}
    if(U){var a=Math.atan2(mz-146,mx), r=Math.hypot(mx,mz-146);
      if(r<U(a)){
        if(IM_WASSER_ERLAUBT.test(d))R.erklaert++;
        else R.wasser.push({was:d,bei:e.bei,vomUfer:+(U(a)-r).toFixed(1)});}}
  });
  R.fels.sort(function(a,b){return b.tiefe-a.tiefe;});
  R.schwebt.sort(function(a,b){return b.hoehe-a.hoehe;});
  return R;}`

mitSonden('traumhaus.html', { boden: sonde }, '_boden.html')
const { browser, page, jsFehler } = await spielOeffnen('_boden.html', { warten: 30000 })
const R = await page.evaluate(() => window.__th.boden())
await browser.close()
aufraeumen('_boden.html')

if (R.fehler) { console.log('⚠️ ' + R.fehler); process.exit(1) }
console.log(`${R.geprueft} Bauwerke geprueft · ${R.erklaert} erklaert (auf etwas Gebautem, am Seil, Wasservogel)\n`)
const zeig = (titel, liste, feld, einheit) => {
  if (!liste.length) { console.log(`✅ ${titel}: keins`); return }
  console.log(`⚠️  ${titel}: ${liste.length}`)
  liste.slice(0, 15).forEach(e => console.log(
    `    ${String(e[feld]).padStart(6)} ${einheit}  ${e.bei.padStart(14)}  Unterkante ${e.unterkante}  Gelaende ${e.gelaende[0]}…${e.gelaende[1]}  ${e.was}`))
  if (liste.length > 15) console.log(`    … und ${liste.length - 15} weitere`)
}
zeig('Im Fels', R.fels, 'tiefe', 'm tief')
zeig('Schwebt', R.schwebt, 'hoehe', 'm hoch')
if (!R.wasser.length) console.log('✅ Im Wasser: keins')
else { console.log(`⚠️  Im Wasser: ${R.wasser.length}`)
       R.wasser.forEach(e => console.log(`    ${e.vomUfer} m vom Ufer  ${e.bei}  ${e.was}`)) }
console.log('\nJS-Fehler:', jsFehler.length)
