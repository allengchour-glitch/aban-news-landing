/* th-fahrbahn.mjs — steht etwas auf der Strasse, wo es nicht hingehoert?
 *
 * ⚠️ WOZU. Diese Fehlerklasse ist in dieser Datei schon mehrfach aufgetreten (der Code
 * traegt eigens einen "STRASSEN-SCHUTZ", weil Baeume und Baenke auf der Fahrbahn
 * standen). Sie faellt beim Spielen kaum auf — man faehrt hindurch — und im Screenshot
 * nur, wenn man zufaellig hinsieht. Gefunden wurde damit eine BUSHALTESTELLE, die
 * 2,1 m innerhalb des Asphalts stand: Mast, Schild und Bank mitten auf der Strasse.
 *
 * ⚠️ VIER MESSFEHLER AUF DEM WEG ZU DIESEM EINEN BEFUND — alle lehrreich:
 *
 *   1. FAHRZEUGE SIND BAEUME, KEINE KNOTEN. Der erste Lauf schloss nur den Hauptknoten
 *      der Autos aus und meldete jedes Cube/Cylinder eines fahrenden Wagens:
 *      1827 Treffer, alle bei z ~ +-58, also genau dort, wo Autos hingehoeren.
 *      → die Vorfahrenkette pruefen, nicht das einzelne Teil.
 *   2. EINZELTEILE SIND KEINE OBJEKTE. Auch danach blieben 1626 Treffer, geballt an
 *      wenigen Stellen: dieselben Objekte, viele Male gezaehlt.
 *      → je Objekt einmal, an seiner obersten Huelle unter der Szene.
 *   3. `wegVonStrasse` IST KEIN STRASSENTEST. Es ist ein PLATZIERUNGS-Helfer mit
 *      Sicherheitsabstand ("halbe Fahrbahn + Gehweg + Reserve"). Wer damit fragt
 *      "liegt es auf dem Asphalt", meldet jede Strassenlaterne: 346 Treffer, fast alle
 *      4-m-Masten am Fahrbahnrand, wo sie hingehoeren.
 *      → gegen die ECHTE Fahrbahnbreite messen.
 *   4. UND ZWAR JE STRASSE. Mit einheitlichen 8 m blieben 43 Treffer — die
 *      Querstrassen sind aber nur 10 m breit (strasseMesh(10,…)), also 5 m je Seite.
 *      Ihre Laternen stehen 6,1 m von der Mitte, mithin korrekt.
 *      → Breiten aus dem Code lesen: 16 m Haupt, 10 m Quer, 9 m Ring.
 *
 * Danach: 5 Treffer, alle einzeln nachpruefbar. 1827 → 5, jede Reduktion mit Grund.
 *
 * Aufruf:  node spiele-dev/tools/th-fahrbahn.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const TMP='spiele-dev/tools/_st.html'
mitSonden('traumhaus.html', { s:`function(){
  var treffer=[],geprueft=0;
  /* ⚠️ Ein Fahrzeug ist ein GANZER BAUM. Der erste Anlauf schloss nur den Hauptknoten
     aus und zaehlte danach jedes Cube/Cylinder eines fahrenden Autos als "steht auf der
     Fahrbahn" — 1827 Treffer, alle bei z ~ +-58, also genau auf der Strasse, wo sie
     hingehoeren. Darum: die Vorfahrenkette pruefen, nicht das einzelne Teil. */
  var wurzeln=new Set();
  (verkehr||[]).forEach(function(v){wurzeln.add(v.mesh);});
  if(typeof busRec!=="undefined"&&busRec&&busRec.mesh)wurzeln.add(busRec.mesh);
  (sims||[]).forEach(function(s2){if(s2.mesh)wurzeln.add(s2.mesh);});
  (typeof npcs!=="undefined"?npcs:[]).forEach(function(n){if(n.mesh)wurzeln.add(n.mesh);});
  /* ⚠️ 5. MESSFEHLER, gefunden beim Nachpruefen der letzten drei Treffer: die
     Fussgaenger heissen "fussg", nicht "npcs". Ohne sie meldete der Scanner Beinpaare
     (0,16 x 0,44 in Hosenfarben, daneben ein Schuh) als Hindernis — Leute, die am
     Bordstein auf Gruen warten und dabei 0,7 m ueber der Kante stehen. Menschen und
     Fahrraeder BEWEGEN sich; sie sind kein Platzierungsfehler. */
  (typeof fussg!=="undefined"?fussg:[]).forEach(function(f){if(f.mesh)wurzeln.add(f.mesh);});
  /* window._tiere ist KEIN Feld (der erste Versuch warf "forEach is not a function").
     Also erst nachsehen, was es ist, statt es anzunehmen. */
  var _ti=window._tiere;
  /* window._tiere ist {enten:[…], land:[…]} — zwei Felder IN einem Objekt. Der erste
     Versuch sammelte die Felder selbst statt ihrer Eintraege, und das Reh blieb im
     Bericht. Eine Ebene tiefer. */
  var tierListe=[];
  if(Array.isArray(_ti))tierListe=_ti;
  else if(_ti&&typeof _ti==="object")Object.keys(_ti).forEach(function(k){
    if(Array.isArray(_ti[k]))tierListe=tierListe.concat(_ti[k]);});
  tierListe.forEach(function(t){if(t&&t.mesh)wurzeln.add(t.mesh);
    if(t&&t.isObject3D)wurzeln.add(t);});
  if(window.autoRec&&window.autoRec.mesh)wurzeln.add(window.autoRec.mesh);
  function istFahrzeug(o){for(var a=o;a;a=a.parent)if(wurzeln.has(a))return true;return false;}
  /* ⚠️ UND DIE RICHTIGE EBENE. Auch nach dem Fahrzeug-Ausschluss blieben 1626 Treffer —
     aber alle an einer Handvoll Stellen geballt: es sind wieder EINZELTEILE (Cube030,
     Cube031, …) desselben Objekts. Gefragt ist "welches OBJEKT steht auf der Strasse",
     nicht "welches Dreieck". Darum je Objekt nur einmal zaehlen, und zwar an seiner
     obersten Huelle unter der Szene. */
  var gezaehlt=new Set();
  function huelle(o){var h=o;for(var a=o;a&&a.parent;a=a.parent)if(a.parent===scene)return a;return h;}
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry)return;
    var H=huelle(o); if(gezaehlt.has(H))return;
    /* Flache Liegeteile (Fahrbahn, Markierungen, Zebra, Gehweg) ausschliessen:
       sie LIEGEN auf der Strasse, das ist ihr Zweck. Erkennungsmerkmal: sehr flach. */
    o.geometry.computeBoundingBox&&o.geometry.computeBoundingBox();
    var bb=new THREE.Box3().setFromObject(o);
    var hoehe=bb.max.y-bb.min.y;
    if(hoehe<0.5)return;                 /* liegt flach → Belag/Markierung */
    if(bb.min.y>2.5)return;              /* schwebt hoch → Ampelkopf, Dach, Baumkrone */
    var p=new THREE.Vector3();o.getWorldPosition(p);
    if(istFahrzeug(o))return;
    var r=Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z)/2;
    if(r>14)return;                      /* Gebaeude/Grossflaechen */
    geprueft++;
    /* ⚠️ wegVonStrasse ist ein PLATZIERUNGS-HELFER mit Sicherheitsabstand ("halbe
       Fahrbahn + Gehweg + Reserve"), kein Test "liegt auf dem Asphalt". Wer ihn dafuer
       nimmt, meldet jede Strassenlaterne: 346 Treffer, davon fast alle 4-m-Masten am
       Fahrbahnrand, wo sie hingehoeren. Gefragt ist die ECHTE Fahrbahn — die
       Hauptstrasse ist 16 m breit (PlaneGeometry(RL,16)), also 8 m je Seite. */
    /* Die Breiten stehen im Code, nicht im Kopf: strasseMesh(RL,16,…) fuer die
       Hauptstrassen, strasseMesh(10,…) fuer die Querstrassen. Also 8 bzw. 5 m je Seite.
       Mit einheitlichen 8 m galten die Laternen der Querstrasse (6,1 m von der Mitte)
       faelschlich als "auf der Fahrbahn". */
    var SZ9=GH*CS/2+12;
    var auf=false, achse="";
    if(Math.abs(Math.abs(p.z)-SZ9)<8&&Math.abs(p.x)<RL/2){auf=true;achse="Hauptstrasse (16 m) z="+(p.z>0?"+":"-")+SZ9;}
    if(Math.abs(Math.abs(p.x)-RX)<5&&Math.abs(p.z)<124){auf=true;achse="Querstrasse (10 m) x="+(p.x>0?"+":"-")+RX;}
    if(!auf)return;
    /* Und ein Objekt, das nur mit dem Rand ueber die Kante ragt, ist kein Befund:
       ein am Bordstein abgestelltes Fahrrad steht 0,2 m im Asphalt. Erst ab einem
       halben Meter ist etwas wirklich IN der Fahrbahn. */
    var tiefe=0;
    if(/Hauptstrasse/.test(achse))tiefe=8-Math.abs(Math.abs(p.z)-SZ9);
    else tiefe=5-Math.abs(Math.abs(p.x)-RX);
    if(tiefe<0.5)return;
    var w=wegVonStrasse(p.x,p.z);
    var vs=Math.hypot(w[0]-p.x,w[1]-p.z);
    if(true)vs=vs;
    if(vs>0.01){gezaehlt.add(H);treffer.push({x:+p.x.toFixed(1),z:+p.z.toFixed(1),vs:+vs.toFixed(1),
      h:+hoehe.toFixed(1),r:+r.toFixed(1),name:(H.name||o.name||"?"),wo:achse,
      kette:(function(){var k=[];for(var a=o;a&&a!==scene;a=a.parent)k.push(a.name||a.type);return k.slice(0,6).join("<");})(),
      farbe:(o.material&&o.material.color)?"#"+o.material.color.getHexString():"?"});}
  });
  treffer.sort(function(a,b){return b.vs-a.vs;});
  return {geprueft:geprueft,treffer:treffer.length,top:treffer.slice(0,14)};}` }, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 45000 })
const r = await page.evaluate(()=>window.__th.s())
console.log('  geprueft:', r.geprueft, '· auf der Fahrbahn:', r.treffer)
r.top.forEach(t=>{console.log('   ', ('('+t.x+','+t.z+')').padEnd(16), 'h'+t.h+' r'+t.r, t.farbe, t.wo); console.log('        Kette:', t.kette)})
await browser.close(); aufraeumen(TMP)
