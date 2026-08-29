/**
 * th-club.mjs — steht der Spielclub, passt die Einrichtung hinein, kommt man rein?
 *
 * ⚠️ WOZU. Der Club ist das erste Haus im Spiel, dessen INNENRAUM zaehlt. Damit
 * zaehlen Fehler, die draussen niemand sieht: ein Tisch, der halb in der Wand steckt;
 * zwei Moebel auf demselben Fleck; eine Discokugel, die im Dach haengt oder auf
 * Kopfhoehe; ein Kollider ohne Tuerluecke, der das Haus zwar dicht macht, aber auch
 * unbetretbar. Nichts davon wirft einen Fehler — man merkt es erst beim Hineingehen.
 *
 * Acht Fragen:
 *   1. Sind alle zwoelf th14-Teile wirklich in der Szene? (ein 404 ist stumm)
 *   2. Liegt jedes Teil INNERHALB der Waende?
 *   3. Ueberlappen sich zwei Einrichtungsteile im Grundriss?
 *   4. Haengen Discokugel und Kronleuchter zwischen Kopf (2,0 m) und Decke (2,75 m)?
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
  /* ⚠️ DIE MITTE AUS DER WELT LESEN, NICHT AUS DEM TEST. Hier stand "var CX=126,
     CZ=102" fest verdrahtet. Als der Club um 2 m nach Osten ruecken musste (seine
     Westwand stand auf der Ringstrasse, th-pruef: 10 Bauteile im Korridor), meldete
     dieser Test prompt fuenf Teile "ausserhalb des Raums" und drei dichte Waende als
     undicht — er tastete die alte Stelle ab, waehrend das Haus vollstaendig in
     Ordnung war. Genau die Falle, vor der th-netz.mjs warnt ("PRUEFPUNKTE AUS DER
     WELT, NICHT AUS DEM TEST", #2339).
     Der Kollider des Clubs traegt als einziger 17 x 13 UND eine Tuerluecke. */
  var CX=null, CZ=null, CFEHLER="";
  (function(){
    /* ⚠️ WORLD_SOLIDS ist ein var im Spiel-Closure, KEIN window-Global — die Sonde
       laeuft im selben Bereich und muss es darum ohne "window." ansprechen. Mit
       window.WORLD_SOLIDS lief die Suche stumm ins Leere und der Test blieb rot.
       ⚠️ UND DAS MASS ALLEIN REICHT NICHT: 17 x 13 gibt es ZWEIMAL, das zweite bei
       (12|225,2). Die erste Fassung nahm den ersten Treffer, tastete also ein ganz
       anderes Gebaeude ab und meldete Moebel "ausserhalb des Raums" und die Tuer als
       zugemauert. Nur der Club hat zusaetzlich eine Tuerluecke. */
    var S=(typeof WORLD_SOLIDS!=="undefined")?WORLD_SOLIDS:[],T=[];
    for(var i=0;i<S.length;i++)
      if(Math.abs(S[i].hw-8.5)<0.01&&Math.abs(S[i].hd-6.5)<0.01&&S[i].door)T.push(S[i]);
    if(T.length===1){CX=T[0].x;CZ=T[0].z;}
    else CFEHLER=T.length+" Kollider passen auf den Club (erwartet genau 1)";
  })();
  if(CX===null)return {fehler:CFEHLER||"Club-Kollider nicht gefunden"};
  var TEILE=["casinobar","pokertisch","roulettetisch","kartentisch","tanzflaeche",
             "dj_pult","automatenreihe","spielautomat","discokugel","kronleuchter",
             "neonschild_gross","samtkordel"];
  var bb=new THREE.Box3(), gefunden={}, kisten=[], raus_ziele=0;
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
  /* ⚠️ DECKE 2,75 — NICHT 3,00. Das Geschossraster des Baukastens ist 3,00, die
     Wandmodule sind aber 2,75 hoch; die 0,25 m Rest fuellt die Decke. Der erste Stand
     dieses Werkzeugs rechnete mit 3,00 und war damit genau so falsch wie der Bau, den
     es pruefen sollte: die Discokugel steckte mit 25 cm im Dach und die Pruefung sagte
     "gruen". Gefunden hat es erst ein BILD (th-blick), nicht diese Messung. */
  var DECKE=2.75;
  ["discokugel","kronleuchter"].forEach(function(n){
    kisten.filter(function(k){return k.name===n;}).forEach(function(k){
      if(k.y0<2.0||k.y1>DECKE+0.02)haengt.push({name:n,unten:k.y0,oben:k.y1});});});

  /* ⚠️ IST UEBERHAUPT EIN DACH DRUEBER? Der erste Bau hatte zwischen Wandkrone
     (2,75) und Dach (3,00) einen 0,25-m-Spalt rings um das Haus — von aussen ein
     weisser Rand, von innen Tageslicht durch die Decke. Keine der vier anderen
     Fragen konnte das sehen; gefunden hat es ein Bild. Ein Strahl von oben nach
     unten misst es dagegen direkt: er muss im Innenraum auf die Decke treffen,
     nicht auf den Boden. */
  /* ⚠️ NICHT GEGEN DIE GANZE SZENE STRAHLEN. Der erste Versuch tat das und starb mit
     "Cannot read properties of null (reading matrixWorld)" — irgendwo in der Szene
     haengt ein Objekt, das three beim Raycast nicht anfassen kann. Darum vorher eine
     eigene Liste bauen: nur echte Meshes mit Geometrie UND Material, und nur solche,
     deren Huellbox ueberhaupt ueber dem Club liegt. Das ist nebenbei viel schneller. */
  var ziele=[], hb=new THREE.Box3();
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry||!o.material||o.isInstancedMesh)return;
    hb.setFromObject(o);
    if(!isFinite(hb.min.x))return;
    if(hb.max.x<CX-9||hb.min.x>CX+9||hb.max.z<CZ-7||hb.min.z>CZ+7)return;
    ziele.push(o);});
  var dach=[], boden=[];
  var rc=new THREE.Raycaster(); rc.far=30;
  [[0,0],[-6,-4],[6,-4],[-6,4],[6,4]].forEach(function(o){
    rc.set(new THREE.Vector3(CX+o[0],9,CZ+o[1]), new THREE.Vector3(0,-1,0));
    var tr=rc.intersectObjects(ziele,false).filter(function(h){return h.point.y>0.5;});
    dach.push({wo:o[0]+"|"+o[1], hoehe:tr.length?+tr[0].point.y.toFixed(2):null});
    /* ⚠️ UND WORAUF STEHT MAN? Der erste Innenblick zeigte einen Clubraum mit RASEN:
       Discokugel, Pokertisch und Tanzflaeche auf der Wiese. Keine der uebrigen
       Messungen konnte das sehen — sie fragen nach Lage, Groesse und Decke.
       Die Bodenplatte liegt auf -0,20, ihre Oberkante also auf 0,05; das Gelaende ist
       hier gemessen flach 0,00. Der Strahl von 2,0 m nach unten trifft damit
       entweder 0,05 (Boden da) oder 0,00 (Gras). Die Schwelle 0,03 liegt zwischen
       beiden Werten und auf keinem von ihnen. */
    /* ⚠️ NICHT DEN ERSTEN TREFFER NEHMEN. Der erste Lauf tat das und meldete an zwei
       von fuenf Punkten 1,879 m und 1,10 m — das sind die Bar und ein Tisch, nicht der
       Boden. Die Pruefung war gruen, aber aus dem falschen Grund: sie haette einen
       Rasenboden unter einem Tisch nicht bemerkt. Darum nur Treffer UNTER 0,30 m
       betrachten und davon den obersten. Nach unten ist die Reihenfolge: Plattenober-
       kante 0,05, Gelaende 0,00, Plattenunterkante -0,20 — der oberste ist der richtige. */
    rc.set(new THREE.Vector3(CX+o[0],2.0,CZ+o[1]), new THREE.Vector3(0,-1,0));
    var tb=rc.intersectObjects(ziele,false).filter(function(h){return h.point.y<0.30;});
    boden.push({wo:o[0]+"|"+o[1], hoehe:tb.length?+tb[0].point.y.toFixed(3):null});});
  raus_ziele=ziele.length;

  /* ⚠️ TUT DER CLUB AUCH ETWAS? Bis hierher war er Kulisse: man kam hinein und
     konnte nichts tun. Die Tanzflaeche startet jetzt dasselbe Minispiel wie die
     Stereoanlage zu Hause. Drei Dinge muessen dafuer stimmen, und jedes einzelne
     faellt lautlos aus, wenn es fehlt:
       1. window._club existiert (die EINE Quelle fuer Ort und Radius),
       2. sie zeigt auf die WIRKLICHE Tanzflaeche — nicht auf eine zweite,
          von Hand hingeschriebene Koordinate, die beim naechsten Umzug zurueckbleibt,
       3. tanzStart() laesst sich ausloesen und setzt TANZ.on. */
  var C=window._club||null, spiel={quelle:!!C, versatz:null, startet:null};
  if(C){
    var tf=kisten.filter(function(k){return k.name==="tanzflaeche";})[0];
    if(tf){
      var mx=(tf.x0+tf.x1)/2, mz=(tf.z0+tf.z1)/2;
      spiel.versatz=+Math.hypot(mx-C.tanzX,mz-C.tanzZ).toFixed(2);
      spiel.halb=+Math.max((tf.x1-tf.x0)/2,(tf.z1-tf.z0)/2).toFixed(2);
      spiel.radius=C.tanzR;}
    try{
      if(typeof tanzStart==="function"&&!TANZ.on){tanzStart(); spiel.startet=!!TANZ.on;
        TANZ.on=false; if(TANZ.raf)cancelAnimationFrame(TANZ.raf);
        var el=document.getElementById("tanz"); if(el)el.style.display="none";}
    }catch(e9){spiel.startet=String(e9&&e9.message||e9);}
  }

  /* Begehbarkeit: auf jeder Wandflucht tasten. */
  function fest(x,z){return typeof inSolid==="function"?!!inSolid(x,z):null;}
  var tuer=fest(CX+2,CZ-6.2);
  var sued=[fest(CX-5,CZ-6.2),fest(CX-1,CZ-6.2),fest(CX+6,CZ-6.2)];
  var nord=[fest(CX-5,CZ+6.2),fest(CX,CZ+6.2),fest(CX+5,CZ+6.2)];
  var west=[fest(CX-8.2,CZ-3),fest(CX-8.2,CZ+3)];
  var ost =[fest(CX+8.2,CZ-3),fest(CX+8.2,CZ+3)];
  var innen=[fest(CX,CZ),fest(CX+2,CZ-3),fest(CX-3,CZ+2)];
  return {gefunden:gefunden,fehlend:fehlend,kisten:kisten,raus:raus,ueber:ueber,haengt:haengt,dach:dach,boden:boden,spiel:spiel,strahlZiele:raus_ziele,
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

if (R.haengt.length) { fund += R.haengt.length; console.log(`\n❌ Haengendes ausserhalb 2,0…2,75 m:`); for (const h of R.haengt) console.log(`   ${h.name}  unten ${h.unten}  oben ${h.oben}`) }
else console.log('✅ Discokugel und Kronleuchter haengen zwischen Kopf und Decke (2,75)')

const ohneDach = (R.dach || []).filter((d) => d.hoehe === null || d.hoehe < 2.7)
if (!ohneDach.length && (R.dach || []).length) console.log(`✅ Ueber jedem Messpunkt liegt eine Decke (${R.dach.map((d) => d.hoehe).join(', ')} m · ${R.strahlZiele} Meshes im Strahl)`)
else { fund++; console.log(`\n❌ ${ohneDach.length} Messpunkte ohne Decke darueber: ${ohneDach.map((d) => d.wo + ' -> ' + d.hoehe).join(', ')}`) }

const ohneBoden = (R.boden || []).filter((b) => b.hoehe === null || b.hoehe < 0.03)
if (!ohneBoden.length && (R.boden || []).length) console.log(`✅ Unter jedem Messpunkt liegt ein Fussboden (${R.boden.map((b) => b.hoehe).join(', ')} m — Gras waere 0)`)
else { fund++; console.log(`\n❌ ${ohneBoden.length} Messpunkte ohne Fussboden (man steht auf dem Gelaende): ${ohneBoden.map((b) => b.wo + ' -> ' + b.hoehe).join(', ')}`) }

const SP = R.spiel || {}
if (SP.quelle && SP.versatz !== null && SP.versatz < 0.3 && SP.startet === true && SP.radius <= SP.halb + 0.3) {
  console.log(`✅ Die Tanzflaeche ist bedienbar (Quelle stimmt auf ${SP.versatz} m genau, Radius ${SP.radius} bei Halbmass ${SP.halb}, tanzStart greift)`)
} else {
  fund++
  console.log('\n❌ Tanzflaeche als Bedienelement:')
  console.log(`   window._club vorhanden? ${SP.quelle ? 'ja' : 'NEIN'}`)
  console.log(`   Versatz Quelle <-> echte Flaeche: ${SP.versatz} m (erlaubt < 0,3)`)
  console.log(`   Radius ${SP.radius} gegen Halbmass ${SP.halb} (Radius darf nicht groesser sein)`)
  console.log(`   tanzStart() setzt TANZ.on: ${SP.startet}`)
}

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
