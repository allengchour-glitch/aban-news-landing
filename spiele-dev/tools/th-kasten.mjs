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
  /* ⚠️ DIE FRAGE IST UMGESTELLT — nach drei gescheiterten Anlaeufen auf die alte.
     "Ist der Kasten groesser als sein Bauwerk?" braucht eine Zuordnung Bauteil ->
     Kasten, und jede Zuordnung, die ich probiert habe, hatte eine eigene Luecke:
       1. Referenz _gebaeude: die Wandmodule des Clubs sind 0,42 m dick und fielen
          durch den Mindestmass-Filter; "75 Kaesten ohne Bauwerk" standen in Wahrheit
          voller Reihenhaeuser, die nur nicht als Gruppe gefuehrt sind.
       2. Referenz Szenen-Meshes, Zuordnung "Mitte im Kasten": bei einem langen,
          schmalen Kasten liegt fast jede Mesh-Mitte draussen — 31 m "Ueberhang".
       3. Zuordnung aus kolliderNachziehen abgeschrieben: die Filter dort sind zum
          WACHSEN gebaut und lassen absichtlich Grosses und Hohes aus. Fuer die
          Gegenrichtung zaehlen sie zu wenig — die Schule kam auf "4,2 x 0,8".
     Der Fehler war jedes Mal derselbe: ein STELLVERTRETER statt der Sache.

     Gefragt ist, was die Spielerin merkt: WO WIRD MAN BLOCKIERT, OBWOHL DORT NICHTS
     STEHT? Das braucht keine Zuordnung. Fuer jeden Punkt, an dem inSolid() wahr ist,
     wird geprueft, ob dort auf Brusthoehe (0,3…2,0 m) ueberhaupt Geometrie liegt.
     Kein Heuristik-Schritt, keine Referenzwahl — nur die zwei Dinge, um die es geht. */
  var GITTER=16;
  var netz={};     /* Geometrie auf Brusthoehe 0,3…2,0 m */
  var oben={};     /* alles darueber, bis 12 m — siehe unten */
  var alles={};    /* ohne Hoehenfenster — siehe inhalt() */
  var bb=new THREE.Box3();
  var zahl=0, zahlOben=0;
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry||o.isInstancedMesh)return;
    bb.setFromObject(o);
    if(!isFinite(bb.min.x)||!isFinite(bb.max.x)||!isFinite(bb.min.z)||!isFinite(bb.max.z))return;
    /* ⚠️ ZWEI EBENEN, NICHT EINE. Die erste Fassung fragte nur nach Brusthoehe — und
       liess damit eine ganze Klasse offen: ein Fahrgeschaeft auf Stuetzen, eine Halle
       mit hohem Sockel, ein Vordach oder ein Obergeschoss haben am Kastenrand auf
       0,3…2,0 m NICHTS, und der Kasten ist trotzdem richtig. Wer dort steht, steht
       UNTER einem Bauwerk. Darum wird jeder leere Punkt zweitgeprueft: liegt ueber
       ihm etwas (2,0…12 m), heisst der Befund "unterbaut" und nicht "unsichtbare
       Wand". Ohne diese Trennung ist die Gesamtzahl keine Fehlerliste — genau das
       stand als naechster Schritt im Runbook. */
    if(bb.max.x-bb.min.x>40||bb.max.z-bb.min.z>40)return;
    if(bb.max.y>=2.0&&bb.min.y<=12){
      zahlOben++;
      var ox0=Math.floor(bb.min.x/GITTER), ox1=Math.floor(bb.max.x/GITTER);
      var oz0=Math.floor(bb.min.z/GITTER), oz1=Math.floor(bb.max.z/GITTER);
      for(var ox=ox0;ox<=ox1;ox++)for(var oz=oz0;oz<=oz1;oz++){
        var ok=ox+"_"+oz;(oben[ok]||(oben[ok]=[])).push([bb.min.x,bb.max.x,bb.min.z,bb.max.z]);}}
    /* ⚠️ EIN INDEX OHNE HOEHENFENSTER — sonst zaehlt inhalt() falsch. Der erste Stand
       benutzte den Brusthoehen-Index und meldete die Bergstation (340,7|95,1) und den
       Nachbarkasten als "0 Meshes darin", also als Fehler. Beide stehen aber auf dem
       BERG, auf rund 43 m Hoehe — ihre Teile liegen komplett ueber dem Fenster
       0,3…2,0 m. Aufgefallen ist es nur, weil eine frueher gemessene Zahl daneben lag
       (297 Meshes an derselben Stelle). Eine Null neben einer bekannten Zahl ist kein
       Fund, sondern ein Widerspruch — und der Widerspruch hatte recht. */
    var ax0=Math.floor(bb.min.x/GITTER), ax1=Math.floor(bb.max.x/GITTER);
    var az0=Math.floor(bb.min.z/GITTER), az1=Math.floor(bb.max.z/GITTER);
    for(var qx=ax0;qx<=ax1;qx++)for(var qz=az0;qz<=az1;qz++){
      var qk=qx+"_"+qz;(alles[qk]||(alles[qk]=[])).push([bb.min.x,bb.max.x,bb.min.z,bb.max.z]);}
    if(bb.max.y<0.3||bb.min.y>2.0)return;          /* nur was auf Brusthoehe im Weg ist */
    /* ⚠️ GROSSFLAECHIGES RAUS — genau daran ist die Selbstprobe zuerst gescheitert.
       Ein Test-Kollider ins leere Feld bei (0|-420) meldete 0 von 32 leeren Punkten:
       irgendein Landschafts-Mesh spannt seine achsenparallele Huellbox ueber hunderte
       Meter und reicht dabei ueber 0,3 m — damit ist "da steht etwas" ueberall wahr
       und die Pruefung kann gar nicht mehr "nein" sagen. Dieselbe Grenze wie in
       kolliderNachziehen (bx/bz > 45 raus), nur etwas strenger. */
    zahl++;
    var gx0=Math.floor(bb.min.x/GITTER), gx1=Math.floor(bb.max.x/GITTER);
    var gz0=Math.floor(bb.min.z/GITTER), gz1=Math.floor(bb.max.z/GITTER);
    for(var gx=gx0;gx<=gx1;gx++)for(var gz=gz0;gz<=gz1;gz++){
      var k=gx+"_"+gz;(netz[k]||(netz[k]=[])).push([bb.min.x,bb.max.x,bb.min.z,bb.max.z]);}});

  /* ⚠️ DIE TOLERANZ MUSS ZUR SCHALE PASSEN — sonst misst sie den Rand, nicht den Fehler.
     "inSolid" blockiert die aeussere 0,55-m-Schale des Kastens. Wer einem Kasten die
     ueblichen 0,5 m Luft ums Gebaeude gibt, hat damit eine Schale, die VOLLSTAENDIG im
     Luftspalt liegt — und eine Pruefung mit 0,25 m Toleranz meldet ihn zu 100 % "frei",
     obwohl er sauber sitzt. GEMESSEN am Bankkasten: nach dem Verkleinern auf Modellmass
     plus 0,5 m meldete die alte Fassung weiter 57 von 57 Punkten frei.
     1,0 m ist der Wert, der die beiden Faelle trennt: eine Wand einen Meter neben mir
     ist die Wand DIESES Hauses; 2,3 m daneben (der alte Bankkasten) ist Wiese. */
  var TOL=1.0;
  function trifft(idx,x,z){
    var gx=Math.floor((x-TOL)/GITTER), gx1=Math.floor((x+TOL)/GITTER);
    var gz=Math.floor((z-TOL)/GITTER), gz1=Math.floor((z+TOL)/GITTER);
    for(var a=gx;a<=gx1;a++)for(var c=gz;c<=gz1;c++){
      var b=idx[a+"_"+c];
      if(!b)continue;
      for(var i=0;i<b.length;i++){var e=b[i];
        if(x>=e[0]-TOL&&x<=e[1]+TOL&&z>=e[2]-TOL&&z<=e[3]+TOL)return true;}}
    return false;}
  function etwasDa(x,z){return trifft(netz,x,z);}
  function etwasDrueber(x,z){return trifft(oben,x,z);}

  /* ⚠️ WIE VIELE MESHES STECKEN UEBERHAUPT IN DIESEM KASTEN? Nach zwei Runden
     Kandidaten-Messen ist klar, dass die Schalen-Zahl allein nicht trennt:
       * Riesenrad (499 Meshes), Geisterbahn (100), Basketballplatz (48) — der Kasten
         umschliesst ein OFFENES Bauwerk, dessen Ring durch Luecken laeuft. Kein Fehler.
       * Campanile-Kasten (-68,5|-84): NULL Meshes. Ein Kasten ohne Inhalt ist
         eindeutig — dort steht nichts, was blockieren duerfte.
     Genau diese Null ist der Befund, der sich automatisch pruefen laesst. Der Rest ist
     eine Entwurfsfrage und gehoert in keine Ja/Nein-Pruefung. */
  function inhalt(w){
    var n=0;
    var gx0=Math.floor((w.x-w.hw)/GITTER), gx1=Math.floor((w.x+w.hw)/GITTER);
    var gz0=Math.floor((w.z-w.hd)/GITTER), gz1=Math.floor((w.z+w.hd)/GITTER);
    var gesehen={};
    for(var a=gx0;a<=gx1;a++)for(var c=gz0;c<=gz1;c++){
      var arr=alles[a+"_"+c]; if(!arr)continue;
      for(var i=0;i<arr.length;i++){var e=arr[i];
        if(e[1]<w.x-w.hw||e[0]>w.x+w.hw||e[3]<w.z-w.hd||e[2]>w.z+w.hd)continue;
        var k=a+"_"+c+"_"+i; if(gesehen[k])continue; gesehen[k]=1; n++;}}
    return n;}

  /* Abgetastet wird die Schale jedes Kastens — nur dort ist inSolid ueberhaupt wahr. */
  var proben=0, blockiert=0, leer=0, unterbaut=0, orte=[], leerKasten=[];
  for(var i=0;i<WORLD_SOLIDS.length;i++){
    var w=WORLD_SOLIDS[i];
    var x0=w.x-w.hw, x1=w.x+w.hw, z0=w.z-w.hd, z1=w.z+w.hd;
    var nLeer=0, nGes=0, nUnter=0, bsp=null;
    for(var x=x0;x<=x1+0.001;x+=1){
      for(var z=z0;z<=z1+0.001;z+=1){
        if(x>x0+0.6&&x<x1-0.6&&z>z0+0.6&&z<z1-0.6)continue;   /* nur die Schale */
        proben++;
        if(!inSolid(x,z))continue;
        nGes++; blockiert++;
        if(etwasDa(x,z))continue;
        if(etwasDrueber(x,z)){nUnter++; unterbaut++; continue;}   /* steht unter einem Bauwerk */
        nLeer++; leer++; if(!bsp)bsp=(+x.toFixed(1))+"|"+(+z.toFixed(1));}}
    var inh=inhalt(w);
    if(inh===0&&nGes>0)leerKasten.push({mitte:(+w.x.toFixed(1))+"|"+(+w.z.toFixed(1)),
      mass:(+(w.hw*2).toFixed(1))+"x"+(+(w.hd*2).toFixed(1)), punkte:nGes, tuer:!!w.door});
    if(nLeer>0)orte.push({inhalt:inh, mitte:(+w.x.toFixed(1))+"|"+(+w.z.toFixed(1)),
      mass:(+(w.hw*2).toFixed(1))+"x"+(+(w.hd*2).toFixed(1)),
      flaeche:Math.round(w.hw*2*w.hd*2),
      tuer:!!w.door,
      leer:nLeer, unter:nUnter, ges:nGes, anteil:Math.round(nLeer/Math.max(1,nGes)*100), bsp:bsp});}
  orte.sort(function(a,b){return b.leer-a.leer;});

  /* ⚠️ SELBSTPROBE — 0 ist ein Verdacht, kein Ergebnis (Regel 3). 35 000 Meshes auf
     Brusthoehe und eine Huellbox-Pruefung mit 0,25 m Toleranz: es waere gut moeglich,
     dass irgendein Kasten fast jeden Punkt abdeckt und die Pruefung gar nicht mehr
     "nein" sagen KANN. Darum bekommt sie zum Schluss einen Kollider ins Nichts
     gesetzt — weit draussen im Feld, wo nachweislich nichts steht — und muss ihn
     finden. Ein Werkzeug, das nur "alles gut" sagen kann, ist keins. */
  var pruefX=0, pruefZ=-420;
  addSolid(pruefX, pruefZ, 8, 8);
  var pw=WORLD_SOLIDS[WORLD_SOLIDS.length-1];
  var pGes=0, pLeer=0;
  for(var px=pw.x-pw.hw;px<=pw.x+pw.hw+0.001;px+=1)
    for(var pz=pw.z-pw.hd;pz<=pw.z+pw.hd+0.001;pz+=1){
      if(px>pw.x-pw.hw+0.6&&px<pw.x+pw.hw-0.6&&pz>pw.z-pw.hd+0.6&&pz<pw.z+pw.hd-0.6)continue;
      if(!inSolid(px,pz))continue;
      pGes++; if(!etwasDa(px,pz)&&!etwasDrueber(px,pz))pLeer++;}
  var pInhalt=inhalt(pw);
  WORLD_SOLIDS.pop();

  return {kollider:WORLD_SOLIDS.length, probeInhalt:pInhalt, meshes:zahl, meshesOben:zahlOben, proben:proben,
          blockiert:blockiert, leer:leer, unterbaut:unterbaut, orte:orte, leerKasten:leerKasten,
          probe:{ort:pruefX+"|"+pruefZ, blockiert:pGes, leer:pLeer}};}`

mitSonden('traumhaus.html', { k: sonde, ruhe: ruheSonde }, '_kasten.html')
const { browser, page, jsFehler } = await spielOeffnen('_kasten.html', { warten: 20000 })
const ruhe = await warteAufRuhe(page)
const R = await page.evaluate(() => window.__th.k())
await browser.close()
aufraeumen('_kasten.html')

if (!ruhe.ruhig) console.log(`⚠️  Welt kam in ${ruhe.sekunden} s nicht zur Ruhe — Zwischenstand.`)
else console.log(`Welt steht still (Seitenzeit ${ruhe.seite}s, ${ruhe.kollider} Kollider)`)

/* ⚠️ Regel 3: Bezugszahlen zuerst. "0 leere Stellen" saehe sonst genauso aus wie eine
   Sonde, die nichts abgetastet hat. */
if (!R.blockiert) { console.log(`❌ 0 blockierende Punkte bei ${R.proben} Proben — die Sonde greift nicht`); process.exit(1) }
console.log(`${R.kollider} Kollider · ${R.meshes} Meshes auf Brusthoehe, ${R.meshesOben} darueber · ${R.proben} Rasterpunkte abgetastet`)
console.log(`${R.blockiert} davon blockieren (inSolid). Davon:`)
console.log(`   ${R.blockiert - R.leer - R.unterbaut} mit Geometrie auf Brusthoehe — richtig`)
console.log(`   ${R.unterbaut} UNTERBAUT (nichts auf Brusthoehe, aber etwas darueber: Stuetzen, Vordach, Sockel) — vertretbar`)
console.log(`   ${R.leer} WIRKLICH FREI (auch darueber nichts) — unsichtbare Wand (${Math.round(R.leer / R.blockiert * 100)} %)\n`)

/* ═══ DIE EINE JA/NEIN-FRAGE ════════════════════════════════════════════════════
   Ein Kasten OHNE jedes Mesh darin blockiert nachweislich ins Leere — das ist kein
   Ermessen, sondern ein Fehler. Genau daran haengt das Ergebnis dieser Pruefung.
   Alles andere unten ist Kandidatenliste und Zahlenwerk. */
const K = R.leerKasten || []
/* ⚠️ Auch die Ja/Nein-Frage braucht ihre eigene Selbstprobe. Der Test-Kollider im
   leeren Feld muss als INHALTSLOS erkannt werden — sonst kann die Pruefung nicht
   "nein" sagen, und ihr gruenes Haekchen bedeutet nichts. Genau diese Falle hatte der
   erste Stand: inhalt() erbte das Brusthoehen-Fenster und meldete die Bergstation als
   leer, waehrend dort 297 Meshes auf 43 m Hoehe stehen. */
if (R.probeInhalt !== 0) {
  console.log(`❌ SELBSTPROBE INHALT FEHLGESCHLAGEN: der Test-Kollider im leeren Feld meldet ${R.probeInhalt} Meshes.`)
  console.log('   Die Inhalts-Pruefung kann nicht "nein" sagen — das Haekchen unten ist wertlos.')
} else if (!K.length) console.log('✅ Kein Kollider ohne Inhalt — jeder blockierende Kasten hat etwas darin (Selbstprobe: Testkasten wird als leer erkannt)')
else {
  console.log(`❌ ${K.length} Kollider blockieren, obwohl KEIN EINZIGES Mesh darin steht:`)
  for (const e of K) console.log(`   ${e.mitte.padStart(14)}  ${e.mass.padStart(11)}${e.tuer ? ' Tuer' : ''}  ${e.punkte} blockierende Punkte`)
}
console.log()

const P = R.probe || {}
if (P.blockiert > 0 && P.leer === P.blockiert) console.log(`✅ Selbstprobe: ein Kollider ins Nichts bei ${P.ort} wird erkannt (${P.leer}/${P.blockiert} Punkte leer)`)
else { console.log(`❌ SELBSTPROBE FEHLGESCHLAGEN: der Test-Kollider bei ${P.ort} meldet ${P.leer} von ${P.blockiert} leeren Punkten.`); console.log('   Die Pruefung kann nicht "nein" sagen — jedes gruene Ergebnis unten ist wertlos.') }

if (!R.leer) console.log('✅ Ueberall, wo man blockiert wird, steht auch etwas')
else {
  /* ⚠️ SORTIEREN, NICHT NUR ZAEHLEN. "3801 leere Punkte" ist eine Zahl, keine
     Handlungsanweisung. Zwei Gruppen stecken darin, und sie brauchen Gegensaetzliches:
       * HAUSGROSSE Kaesten (bis 400 m2) mit leeren Raendern sind zu gross geraten —
         ein Haus hat eine Wand, und daneben ist Vorgarten.
       * FLAECHEN-Kaesten (darueber) sind handgesetzte Sperren um ein ganzes Areal:
         Bergstation, Rummelplatz, Zoo. Ob eine Wiese dort gesperrt sein SOLL, ist eine
         Entwurfsfrage und keine, die eine Messung beantwortet.
     Eine Tuer im Kasten ist das zweite Zeichen: sie wird nur fuer BEGEHBARE Gebaeude
     gesetzt. Ein Kasten mit Tuer meint ein Haus, keine Absperrung. */
  const HAUS = 400
  const orteEcht = R.orte.filter((e) => e.leer > 0)
  const haus = orteEcht.filter((e) => e.flaeche <= HAUS)
  const flaeche = orteEcht.filter((e) => e.flaeche > HAUS)
  const hausLeer = haus.reduce((a, e) => a + e.leer, 0)
  const flaecheLeer = flaeche.reduce((a, e) => a + e.leer, 0)
  console.log(`   ${haus.length} hausgrosse Kaesten (bis ${HAUS} m2) mit ${hausLeer} leeren Punkten`)
  console.log(`   ${flaeche.length} Flaechen-Kaesten (darueber) mit ${flaecheLeer} leeren Punkten`)
  console.log(`   davon mit Tuer (= gemeintes Gebaeude): ${orteEcht.filter((e) => e.tuer).length}\n`)
  console.log(`⚠️  ${orteEcht.length} Kaesten blockieren an Stellen, an denen weder auf Brusthoehe noch darueber etwas steht:`)
  /* Hausgrosse zuerst: die sind einzeln zu beheben (Kasten aufs Modellmass), die
     grossen Flaechen sind eine Entwurfsfrage. */
  const sortiert = [...orteEcht].sort((a, b) => (a.flaeche <= HAUS ? 0 : 1) - (b.flaeche <= HAUS ? 0 : 1) || b.leer - a.leer)
  for (const e of sortiert.slice(0, 24)) {
    console.log(`   ${String(e.leer).padStart(4)} von ${String(e.ges).padStart(4)} (${String(e.anteil).padStart(3)} %, ${String(e.unter).padStart(3)} unterbaut, ${String(e.inhalt).padStart(4)} Meshes drin)  ${String(e.flaeche).padStart(5)} m2${e.tuer ? ' Tuer' : '    '}  Kasten ${e.mitte.padStart(13)} ${e.mass.padStart(11)}  z. B. ${e.bsp}`)
  }
  if (orteEcht.length > 20) console.log(`   … und ${orteEcht.length - 20} weitere`)
}

console.log('\nJS-Fehler:', jsFehler.length)
