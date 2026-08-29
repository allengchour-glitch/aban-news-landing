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
  /* ⚠️ ES GIBT DREI WASSERFLAECHEN, nicht eine. 'window._wasser' fuehrt sie alle:
     das Meer (x -332…-132, z ±170), einen Fluss (x -120…80, z -94…-87) und den
     Seepark-See. Die erste Fassung prueft nur den See ueber '_seeUfer' — Meer und
     Fluss waren blinde Flecken. Bruecken, Stege und Boote duerfen ueber Wasser sein. */
  var IM_WASSER_ERLAUBT=/schwan|ente|boot|ruderboot|steg|floss|bruecke|brueck|ponton|leuchtturm|hafen|kran|anleger|mole|schiff|faehre/i;
  var AM_SEIL=/gondel/i;
  var kaesten=[];
  G.forEach(function(w){ if(!w||!w.parent)return;
    var b=new THREE.Box3().setFromObject(w);
    if(isFinite(b.min.x))kaesten.push(b); });
  /* Nicht alles Tragende ist ein geladenes Modell: der Felssockel und die Platte der
     Bergstation sind prozedurale Meshes und stehen nicht in _gebaeude. Sie melden
     sich ueber userData.traegt. */
  var wurzel=null;
  for(var nn=G[0];nn;nn=nn.parent)if(nn.isScene)wurzel=nn;
  if(wurzel)wurzel.traverse(function(o){
    if(!o.isMesh||!(o.userData&&o.userData.traegt))return;
    var b=new THREE.Box3().setFromObject(o);
    if(isFinite(b.min.x))kaesten.push(b);});
  function traegtEtwas(b){                     /* liegt ein anderes Bauwerk darunter? */
    for(var i=0;i<kaesten.length;i++){var k=kaesten[i];
      if(k===b)continue;
      if(k.max.x<b.min.x||k.min.x>b.max.x)continue;
      if(k.max.z<b.min.z||k.min.z>b.max.z)continue;
      if(k.max.y<=b.min.y+0.5)return true;      /* steht darauf */
      /* AUFGESETZT: ein Rotor auf einem Mast, ein Schild an einer Wand. Der Traeger
         ragt dann HOEHER als die Unterkante des Teils, umschliesst es aber im
         Grundriss. Ohne diese Regel meldete das Werkzeug die Windmuehlenfluegel als
         schwebend — sie sitzen auf halber Turmhoehe. */
      if(k.min.x<=b.min.x&&k.max.x>=b.max.x&&k.min.z<=b.min.z&&k.max.z>=b.max.z)return true;
      if(b.min.x<=k.min.x&&b.max.x>=k.max.x&&b.min.z<=k.min.z&&b.max.z>=k.max.z)return true;}
    return false;}
  /* Die uebrigen Wasserflaechen als Rechtecke — der See selbst wird ueber _seeUfer
     geprueft, weil seine Uferlinie organisch ist und kein Rechteck. */
  var W=[];
  (window._wasser||[]).forEach(function(w){
    var b=new THREE.Box3().setFromObject(w.mesh);
    if(!isFinite(b.min.x))return;
    if(b.min.x>-20&&b.max.x<20&&b.min.z>130&&b.max.z<165)return;   /* das ist der See */
    W.push({min:b.min,max:b.max,name:(b.max.x-b.min.x)>150?"Meer":"Fluss"});});
  var bb=new THREE.Box3(), R={fels:[],schwebt:[],wasser:[],geprueft:0,erklaert:0,flaechen:W.length+1};
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
    var nass=null;
    if(U){var a=Math.atan2(mz-146,mx), r=Math.hypot(mx,mz-146);
      if(r<U(a))nass="Seepark-See, "+(U(a)-r).toFixed(1)+" m vom Ufer";}
    if(!nass&&W)for(var q=0;q<W.length;q++){var wb=W[q];
      /* Mitte deutlich INNERHALB der Flaeche — Uferbebauung soll nicht mitzaehlen. */
      if(mx>wb.min.x+2&&mx<wb.max.x-2&&mz>wb.min.z+2&&mz<wb.max.z-2){
        nass=wb.name+", "+Math.min(mx-wb.min.x,wb.max.x-mx,mz-wb.min.z,wb.max.z-mz).toFixed(1)+" m vom Rand";
        break;}}
    if(nass){
      if(IM_WASSER_ERLAUBT.test(d))R.erklaert++;
      else R.wasser.push({was:d,bei:e.bei,wo:nass});}
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
console.log(`${R.geprueft} Bauwerke geprueft gegen Gelaende und ${R.flaechen} Wasserflaechen · ${R.erklaert} erklaert (auf etwas Gebautem, am Seil, Wasservogel, Bruecke)\n`)
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
       R.wasser.forEach(e => console.log(`    ${e.bei.padStart(14)}  ${e.wo}  ${e.was}`)) }
console.log('\nJS-Fehler:', jsFehler.length)
