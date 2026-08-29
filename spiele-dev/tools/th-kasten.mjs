/**
 * th-kasten.mjs — wie weit ragt ein Kollider ueber sein Bauwerk hinaus?
 *
 * ⚠️ WOZU. `th-baeume` fand 18 Pflanzen "im Gebaeude" — und beim Nachmessen stand
 * KEINE davon im Baukoerper. Alle 18 lagen im UEBERHANG des Kollibers: der Kasten
 * greift ueber das Haus hinaus in den Vorgarten. Dort stoesst man gegen eine
 * unsichtbare Wand, wo nichts steht. Das ist ein eigener Fehler mit eigener Ursache,
 * und die Pflanzen waren nur der Zufall, der ihn sichtbar gemacht hat — sie stehen
 * eben dort, wo Vorgarten ist. Diese Pruefung fragt es fuer die GANZE Stadt.
 *
 * ⚠️ EIN UEBERHANG IST NICHT PER SE FALSCH. `kolliderNachziehen` vergroessert die
 * Kaesten mit Absicht: sonst laeuft man unter einer Traufe durch die Wand (der Grund,
 * aus dem es die Funktion ueberhaupt gibt). Ein Dachueberstand von einem halben Meter
 * gehoert dazu. Gewertet wird darum erst ab 1,5 m auf einer Seite.
 *
 * ⚠️ UND DIE PFLANZE IST KEIN HAUS — die Falle aus th-baeume, hier gleich mit: ein
 * Baum ist breiter als 3 m und hoeher als 2,2 m und geht sonst als Bauwerk durch.
 * Dann waere die "Referenz" fuer den Kasten ein Baum daneben und jede Zahl Unsinn.
 *
 * Zwei Fragen:
 *   1. Wie weit ragt jeder Kasten ueber die Huellbox der Bauwerke hinaus, die er
 *      umschliesst?
 *   2. Gibt es Kaesten GANZ OHNE Bauwerk? Das waere eine unsichtbare Wand im Nichts.
 *
 * ⚠️⚠️ DIESE PRUEFUNG IST NOCH NICHT VERLAESSLICH — sie steht deshalb NICHT im Tor.
 * Zwei Anlaeufe, zwei Messfehler, beide hier festgehalten, damit der naechste nicht
 * denselben Weg geht:
 *
 *   1. Referenz `_gebaeude` (verworfen). Groesster "Ueberhang" 12,4 m war der
 *      Spielclub: seine Waende sind th34-Module von 4 x 2,75 x 0,42 und fielen durch
 *      den Mindestmass-Filter, als Bauwerk blieb die Bar im Inneren uebrig. Und
 *      "75 Kaesten ohne jedes Bauwerk" lagen in sauberen Reihen bei z = +-77 und
 *      x = +-89 — dort STEHEN Reihenhaeuser, nur nicht als Gruppe in `_gebaeude`.
 *      Gegen Szenen-Meshes gemessen wurden aus 75 dann 15.
 *
 *   2. Zuordnung "Mesh-Mitte im Kasten" (die aktuelle, ebenfalls falsch). Bei einem
 *      LANGEN, SCHMALEN Kasten liegt die Mitte der meisten Wand-Meshes ausserhalb.
 *      Ergebnis: Kasten 31,4 x 4,7 bei (25|102) mit einem "Bauwerk" von 0,1 x 0,1 und
 *      31,17 m Ueberhang. Die 51 Funde oberhalb 1,5 m sind darum KEINE Fundliste,
 *      sondern eine Liste von Verdachtsfaellen, in der echte und falsche stecken.
 *
 * Was der naechste Anlauf braucht: eine Zuordnung, die nicht auf der Mitte beruht —
 * etwa alle Meshes, deren Huellbox den Kasten schneidet, aber begrenzt auf die, die
 * KEINEM naeheren Kasten gehoeren (dieselbe Naechste-Mitte-Regel, die
 * `kolliderNachziehen` im Spiel schon benutzt, um Nachbarhaeuser auseinanderzuhalten).
 * Dort steht sie fertig; sie waere zu uebernehmen statt neu zu erfinden.
 *
 * Aufruf:  node spiele-dev/tools/th-kasten.mjs
 */
import { mitSonden, spielOeffnen, warteAufRuhe, aufraeumen } from './th-lib.mjs'

const ruheSonde = `function(){
  var g=window._gebaeude||[], s=0, n=0;
  for(var i=0;i<g.length;i++){var u=g[i].userData||{};
    if(u._bewegt||g[i]._bewegt||u.nieAusblenden)continue;
    n++; s=(s*31+Math.round(g[i].position.x*100))|0; s=(s*31+Math.round(g[i].position.z*100))|0;}
  return {n:n,h:s,kollider:WORLD_SOLIDS.length,
          offen:(window._ladeOffen===undefined?-1:window._ladeOffen),seite:performance.now()/1000};}`

const sonde = `function(){
  var PFLANZEN={baum:1,tanne:1,fichte:1,eiche:1,birke:1,ahorn:1,pappel:1,busch:1,
                strauch:1,hecke:1,kiefer:1,weide:1,schilf:1,blume:1,blumenbeet:1,
                blumenrabatte:1,farn:1,gras:1,wald:1};
  function istPflanze(datei){
    var n=String(datei);
    var kl=n.indexOf("("); if(kl>=0)n=n.slice(0,kl);
    var pk=n.lastIndexOf("."); if(pk>=0)n=n.slice(0,pk);
    var t=n.split("_");
    for(var i=1;i<t.length;i++)if(PFLANZEN[t[i].toLowerCase()])return true;
    return false;}

  /* ⚠️ NICHT GEGEN "_gebaeude" MESSEN. Der erste Lauf tat das und lieferte zwei
     Kopfzahlen, die beide falsch waren:
       * groesster "Ueberhang" 12,4 m war der Spielclub — seine Waende sind
         th34-Module von 4 x 2,75 x 0,42 und fielen durch den Mindestmass-Filter;
         als "Bauwerk" blieb die Bar im Inneren uebrig.
       * "75 Kaesten ohne jedes Bauwerk" lagen in sauberen Reihen bei z = +-77 und
         x = +-89 — dort stehen die Reihenhaeuser. Sie sind nur nicht als Gruppe in
         "_gebaeude", sondern als einzelne Meshes bzw. Instanzen.
     Die Referenz sind darum die MESHES der Szene, nicht die Gruppenliste. Damit
     zaehlen Module, prozedurale Haeuser und alles andere mit.
     ⚠️ INSTANZIERTES BLEIBT AUSSEN VOR: eine InstancedMesh liegt im Ursprung, ihre
     Huellbox sagt ueber die einzelnen Instanzen nichts. Das ist eine bekannte Luecke
     dieser Pruefung, keine gedeckte Flaeche. */
  var bau=[], b3=new THREE.Box3(), ausgelassen=0;
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry||o.isInstancedMesh){ if(o.isInstancedMesh)ausgelassen++; return; }
    var w9=o; var pflanze=false, bewegt=false;
    while(w9){ var u=w9.userData||{};
      if(u._bewegt||w9._bewegt)bewegt=true;
      if(u.datei&&istPflanze(u.datei))pflanze=true;
      w9=w9.parent; }
    if(pflanze||bewegt)return;
    b3.setFromObject(o);
    if(!isFinite(b3.min.x))return;
    var hy=b3.max.y-Math.max(0,b3.min.y);
    if(hy<2.0)return;                       /* nur was hoch genug ist, um Wand zu sein */
    if(b3.max.y>40)return;                  /* Berge und Himmel sind kein Bauwerk */
    bau.push({x0:b3.min.x,x1:b3.max.x,z0:b3.min.z,z1:b3.max.z,
              mx:(b3.min.x+b3.max.x)/2, mz:(b3.min.z+b3.max.z)/2,
              datei:(o.name||"mesh")});});

  var raus=[], ohne=[];
  for(var k=0;k<WORLD_SOLIDS.length;k++){
    var w=WORLD_SOLIDS[k];
    var kx0=w.x-w.hw, kx1=w.x+w.hw, kz0=w.z-w.hd, kz1=w.z+w.hd;
    /* Welche Bauwerke stecken in diesem Kasten? Mitte drin = gehoert dazu. */
    var x0=null,x1=null,z0=null,z1=null,teile=[],n=0;
    for(var b=0;b<bau.length;b++){
      var B=bau[b];
      if(B.mx<kx0||B.mx>kx1||B.mz<kz0||B.mz>kz1)continue;
      n++;
      if(x0===null){x0=B.x0;x1=B.x1;z0=B.z0;z1=B.z1;}
      else{x0=Math.min(x0,B.x0);x1=Math.max(x1,B.x1);z0=Math.min(z0,B.z0);z1=Math.max(z1,B.z1);}
      if(teile.length<3)teile.push(B.datei);}
    if(!n){ ohne.push({mitte:(+w.x.toFixed(1))+"|"+(+w.z.toFixed(1)),
                       mass:(+(w.hw*2).toFixed(1))+"x"+(+(w.hd*2).toFixed(1))}); continue; }
    var w9=Math.max(x0-kx0, kx1-x1), t9=Math.max(z0-kz0, kz1-z1);
    var ueber=Math.max(w9,t9);
    raus.push({mitte:(+w.x.toFixed(1))+"|"+(+w.z.toFixed(1)),
               mass:(+(w.hw*2).toFixed(1))+"x"+(+(w.hd*2).toFixed(1)),
               bauMass:(+(x1-x0).toFixed(1))+"x"+(+(z1-z0).toFixed(1)),
               bauten:n, teile:teile.join(", "),
               ueber:+ueber.toFixed(2), tuer:!!w.door});}
  raus.sort(function(a,b){return b.ueber-a.ueber;});
  return {kollider:WORLD_SOLIDS.length, bauwerke:bau.length, instanzen:ausgelassen, mit:raus, ohne:ohne};}`

mitSonden('traumhaus.html', { k: sonde, ruhe: ruheSonde }, '_kasten.html')
const { browser, page, jsFehler } = await spielOeffnen('_kasten.html', { warten: 20000 })
const ruhe = await warteAufRuhe(page)
const R = await page.evaluate(() => window.__th.k())
await browser.close()
aufraeumen('_kasten.html')

if (!ruhe.ruhig) console.log(`⚠️  Welt kam in ${ruhe.sekunden} s nicht zur Ruhe — Zwischenstand.`)
else console.log(`Welt steht still (Seitenzeit ${ruhe.seite}s, ${ruhe.kollider} Kollider)`)

/* ⚠️ Regel 3: Bezugszahlen zuerst. "0 Ueberhang" saehe sonst aus wie "nichts gemessen". */
if (!R.kollider || !R.bauwerke) { console.log('❌ 0 Kollider oder 0 Bauwerke gemessen — die Sonde greift nicht'); process.exit(1) }
console.log(`${R.kollider} Kollider gegen ${R.bauwerke} Wand-Meshes (${R.instanzen} InstancedMeshes ausgelassen — bekannte Luecke) · ${R.mit.length} mit Bauwerk, ${R.ohne.length} ohne\n`)

const GRENZE = 1.5
const schlimm = R.mit.filter((e) => e.ueber > GRENZE)
if (!schlimm.length) console.log(`✅ Kein Kasten ragt mehr als ${GRENZE} m ueber sein Bauwerk hinaus`)
else {
  console.log(`⚠️  ${schlimm.length} VERDACHTSFAELLE ueber ${GRENZE} m — noch keine Fundliste,`)
  console.log('   die Zuordnung Kasten->Bauwerk ist nachweislich falsch (siehe Kopf der Datei):')
  for (const e of schlimm.slice(0, 20)) {
    console.log(`   ${String(e.ueber).padStart(6)} m  Kasten ${e.mitte.padStart(12)} ${e.mass.padStart(12)}  Bau ${e.bauMass.padStart(12)} (${e.bauten})  ${e.teile}`)
  }
  if (schlimm.length > 20) console.log(`   … und ${schlimm.length - 20} weitere`)
}

if (R.ohne.length) {
  console.log(`\n⚠️  ${R.ohne.length} Kaesten ohne jedes Bauwerk darin — unsichtbare Wand im Nichts:`)
  for (const e of R.ohne.slice(0, 15)) console.log(`   ${e.mitte.padStart(12)}  ${e.mass}`)
  if (R.ohne.length > 15) console.log(`   … und ${R.ohne.length - 15} weitere`)
} else console.log('✅ Jeder Kasten hat ein Bauwerk darin')

console.log('\nJS-Fehler:', jsFehler.length)
