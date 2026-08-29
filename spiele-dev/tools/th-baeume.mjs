/**
 * th-baeume.mjs — steht Gruenzeug IN einem Gebaeude?
 *
 * ⚠️ WOZU. Aufgefallen ist es an einem BILD: der Blick auf die Baustelle (180|150)
 * zeigte Fichten, die dicht an der Fassade und teils darin zu stehen schienen. Kein
 * vorhandenes Werkzeug fragt danach — `th-boden` prueft Bauwerke gegen Gelaende und
 * Wasser, `th-strassen`/`th-belag` Zubehoer gegen Fahrbahnen, `th-mauern` Gebaeude
 * gegen Kollider. Ein Baum mitten im Wohnzimmer faellt durch alle Raster.
 *
 * ⚠️ DER GROESSTE TEIL DES WALDES IST INSTANZIERT und steht damit NICHT in
 * `window._gebaeude` — genau die Luecke, an der `th-3d` einmal blind war. Wer nur
 * `_gebaeude` durchgeht, misst ein paar Dutzend Einzelbaeume und meldet "alles gut",
 * waehrend dreihundert Instanzen ungeprueft bleiben. Darum werden hier die
 * INSTANZMATRIZEN zerlegt; das deckt beide Wege ab.
 *
 * ⚠️ NICHT JEDE UEBERDECKUNG IST EIN FEHLER. Hecken gehoeren an Villen, und grosse
 * Kollider (Zoo-Gehege, Parkflaechen) umschliessen absichtlich Baeume. Gewertet wird
 * darum nur, was im INNEREN eines Gebaeude-Kollibers steht: kleiner als 30 m in beiden
 * Massen und mehr als die 0,55-m-Wandschale vom Rand entfernt.
 *
 * Aufruf:  node spiele-dev/tools/th-baeume.mjs
 */
import { mitSonden, spielOeffnen, warteAufRuhe, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  /* ⚠️ KEIN TEILSTRING-MUSTER. Der erste Lauf nahm /baum|eiche|obst|.../ und meldete
     prompt zwei Dinge, die keine Pflanzen sind: "str-EICH-elzoo" und "OBST-stand".
     Zwei von acht Haeusern in der Fundliste waren damit Unsinn. Jetzt wird der
     Dateiname am Unterstrich zerlegt und jedes STUECK gegen eine feste Liste
     geprueft — "streichelzoo" ist kein Stueck, "ahorn" schon. */
  var PFLANZEN={baum:1,tanne:1,fichte:1,eiche:1,birke:1,ahorn:1,pappel:1,busch:1,
                strauch:1,hecke:1,kiefer:1,weide:1,schilf:1,blume:1,blumenbeet:1,
                blumenrabatte:1,farn:1,gras:1,wald:1};
  function istPflanze(datei){
    /* ⚠️ HIER KEINE REGULAEREN AUSDRUECKE. Die Sonde ist ein Template-Literal; ein
       Backslash darin wird VOM LITERAL gefressen, bevor der regulaere Ausdruck ihn
       sieht. Aus "\\(" wurde "(" und damit aus /\(.*\)$/ ein /(.*)$/ — das passt auf
       ALLES und loeschte jeden Dateinamen. Ergebnis: "0 Pflanzen geprueft". Die
       Nullpruefung (Regel 3) hat es gefangen, sonst waere daraus ein gruenes
       "keine Pflanze steht im Gebaeude" geworden. Verwandt mit Regel 1 (Backtick),
       gleiche Ursache: das Literal liest mit.
       Darum reines Zeichen-Handwerk, ohne jedes Sonderzeichen. */
    var n=String(datei);
    var kl=n.indexOf("("); if(kl>=0)n=n.slice(0,kl);      /* "(prozedural)" abschneiden */
    var pk=n.lastIndexOf("."); if(pk>=0)n=n.slice(0,pk);  /* ".glb" abschneiden */
    var t=n.split("_");
    for(var i=1;i<t.length;i++)if(PFLANZEN[t[i].toLowerCase()])return true;
    return false;}
  var stellen=[], quellen={einzeln:0, instanzen:0};

  (window._gebaeude||[]).forEach(function(g){
    var d=g.userData.datei||"";
    if(!istPflanze(d))return;
    stellen.push({datei:d, x:g.position.x, z:g.position.z, art:"einzeln"});
    quellen.einzeln++;});

  var v=new THREE.Vector3(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), M=new THREE.Matrix4();
  scene.traverse(function(o){
    if(!o.isInstancedMesh)return;
    var d=o.userData.datei||"";
    if(!istPflanze(d))return;
    for(var i=0;i<o.count;i++){
      o.getMatrixAt(i,M); M.premultiply(o.matrixWorld); M.decompose(v,q,sc);
      stellen.push({datei:d, x:v.x, z:v.z, art:"instanz"});
      quellen.instanzen++;}});

  /* ⚠️ Regel 3: ohne Bezugszahlen sieht "0 Funde" genauso aus wie eine Sonde, die
     nichts gemessen hat. Darum immer mitgeben, WIE VIEL geprueft wurde. */
  var drin=[];
  var INNEN=0.55;                      /* dieselbe Wandschale wie inSolid */
  for(var s=0;s<stellen.length;s++){
    var p=stellen[s];
    for(var k=0;k<WORLD_SOLIDS.length;k++){
      var w=WORLD_SOLIDS[k];
      if(w.hw>15||w.hd>15)continue;     /* grosse Flaechen sind Gehege/Parks, keine Haeuser */
      var dx=p.x-w.x, dz=p.z-w.z;
      if(dx<=-w.hw+INNEN||dx>=w.hw-INNEN||dz<=-w.hd+INNEN||dz>=w.hd-INNEN)continue;
      drin.push({datei:p.datei, art:p.art,
                 x:+p.x.toFixed(1), z:+p.z.toFixed(1),
                 haus:(+w.x.toFixed(0))+"|"+(+w.z.toFixed(0)),
                 mass:(+(w.hw*2).toFixed(1))+"x"+(+(w.hd*2).toFixed(1)),
                 tief:+Math.min(w.hw-INNEN-Math.abs(dx), w.hd-INNEN-Math.abs(dz)).toFixed(2)});
      break;}}
  drin.sort(function(a,b){return b.tief-a.tief;});
  return {gefunden:stellen.length, quellen:quellen, kollider:WORLD_SOLIDS.length, drin:drin};}`


/* Fingerabdruck FUER warteAufRuhe — mit der Kollider-Zahl, die von aussen unsichtbar
   ist. Ohne sie meldet die Ruhepruefung "still", waehrend WORLD_SOLIDS noch waechst. */
const ruheSonde = `function(){
  var g=window._gebaeude||[], s=0, n=0;
  for(var i=0;i<g.length;i++){
    var u=g[i].userData||{};
    if(u._bewegt||g[i]._bewegt||u.nieAusblenden)continue;
    n++;
    s=(s*31+Math.round(g[i].position.x*100))|0;
    s=(s*31+Math.round(g[i].position.z*100))|0;}
  return {n:n, h:s, kollider:WORLD_SOLIDS.length,
          offen:(window._ladeOffen===undefined?-1:window._ladeOffen),
          seite:performance.now()/1000};}`

mitSonden('traumhaus.html', { b: sonde, ruhe: ruheSonde }, '_baeume.html')
/* ⚠️ HIER IST DIE POSITION DER MESSWERT SELBST — darum wird nicht auf eine Frist
   gewartet, sondern auf Ruhe. Gemessen: ein Lauf bei 28 s sah denselben Ahorn auf
   (-10,4|107,6), nach dem letzten Umbau (116 s) stand er auf (-12|102). Wer hier zu
   frueh misst, meldet Baeume in Haeusern, die dort gar nicht stehen — oder uebersieht
   welche, die erst spaeter hineinruecken. */
const { browser, page, jsFehler } = await spielOeffnen('_baeume.html', { warten: 20000 })
const ruhe = await warteAufRuhe(page)
const R = await page.evaluate(() => window.__th.b())
await browser.close()
aufraeumen('_baeume.html')

if (!ruhe.ruhig) console.log(`⚠️  Die Welt kam in ${ruhe.sekunden} s nicht zur Ruhe — die Zahlen unten sind ein Zwischenstand.`)
else console.log(`Welt steht still (Seitenzeit ${ruhe.seite}s, ${ruhe.objekte} feste Bauwerke, ${ruhe.kollider} Kollider, _ladeOffen ${ruhe.ladeOffen})`)
console.log(`${R.gefunden} Pflanzen geprueft (${R.quellen.einzeln} einzeln, ${R.quellen.instanzen} instanziert) gegen ${R.kollider} Kollider\n`)
if (!R.gefunden) { console.log('❌ 0 Pflanzen gefunden — die Sonde hat nichts gemessen, nicht die Welt ist kahl'); process.exit(1) }

if (!R.drin.length) console.log('✅ Keine Pflanze steht im Inneren eines Gebaeudes')
else {
  console.log(`⚠️  ${R.drin.length} Pflanzen stehen IM Gebaeude (mehr als ${0.55} m hinter der Wandflucht):`)
  const proHaus = {}
  for (const e of R.drin) (proHaus[e.haus] = proHaus[e.haus] || []).push(e)
  for (const haus of Object.keys(proHaus)) {
    const l = proHaus[haus]
    console.log(`   Haus ${haus.padStart(10)} (${l[0].mass})  ${l.length} Pflanze${l.length > 1 ? 'n' : ''}`)
    for (const e of l.slice(0, 4)) console.log(`      ${e.datei.padEnd(26)} ${String(e.x).padStart(7)}|${String(e.z).padStart(7)}  ${e.tief} m tief  (${e.art})`)
  }
}
console.log('\nJS-Fehler:', jsFehler.length)
