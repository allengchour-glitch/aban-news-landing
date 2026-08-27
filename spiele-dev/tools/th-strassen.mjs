/* th-strassen.mjs — steht etwas auf einer Fahrbahn?
 *
 *   node spiele-dev/tools/th-strassen.mjs [grenze-in-metern]
 *   TH_REPO=/pfad/zum/worktree node spiele-dev/tools/th-strassen.mjs
 *
 * WARUM: Strassen sind Flaechen, keine Modelle. Keine Modellpruefung sieht sie, und
 * KOLLIDER haben sie auch nicht — sonst koennte niemand darauf fahren. Damit sind sie
 * fuer `wegVonStrasse`, `viertelPasst` und jeden Freiflaechen-Solver unsichtbar. Das hat
 * in einer einzigen Session vier Mal zugeschlagen:
 *   * 16 Ampelmasten und 9 Laternen standen im Belag der Hauptstrasse (PR #2297),
 *   * das wiederbelebte Bauernhof-Viertel endete in der Wende des Landbusses (#2308),
 *   * die vier Ostviertel-Wagen parkten in der Seilbahnstation (#2308),
 *   * die Bank stand auf der Zubringerstrasse 240 Grad (#2310).
 *
 * ⚠️ DIE HALBBREITEN AUS `STRASSENBAND` SIND DIE FALSCHEN. Dort steht ueberall 8,0 —
 * das ist das Schutzband inklusive Gehweg, richtig fuer `wegVonStrasse`, falsch fuer
 * „steht das im Belag?". Die echten Werte stehen in der Bordstein-Geometrie:
 * Hauptstrasse 8,05, Querstrasse 5,05, Stadtring 4,5. Zubringer und Landstrasse sind
 * gemessen (Querschnitt: Asphalt q -3..+3, Kiesbankett bis q +-4,5).
 *
 * ⚠️ UND DIE BAENDER SIND ENDLICH. Hauptstrasse x +-102 (RL 204), Querstrasse z +-69,
 * Zubringer r 123..193 (RAD_R0/RAD_R1). Mit zu langen Baendern zaehlt die halbe Wiese
 * als Strasse — im ersten Anlauf 164 statt 86 Funde, fast alles Ufer und Feld.
 *
 * ⚠️ DIE LANDSTRASSE (r 200) IST NUR ABSCHNITTSWEISE GEPFLASTERT. Gemessen per
 * Farbstrahl quer zum Ring: bei 90 Grad und 280 Grad liegt echter Asphalt (#4a4a53,
 * r 196…204, bei 280 sogar mit Gehweg), bei 180 Grad ist dort MEER (der Ring laeuft
 * ins Wasser), bei 0 und 225 Grad steht Gebirge darauf. Ein Treffer im Band
 * „Landstrasse" ist also erst dann ein Fehler, wenn dort auch Belag liegt — im Zweifel
 * mit einem Querschnitt nachsehen, bevor man etwas verschiebt.
 *
 * ⚠️ BEWEGLICHES VORHER AUSSCHLIESSEN (verkehr, busRec, _landbus, fussg, npcs, sims,
 * polizei). Ohne diese Liste sind zwei Drittel der Funde fahrende Autos, die dort
 * hingehoeren. Rehe und Hasen laufen ebenfalls ueber die Strasse; die bleiben als
 * Rauschen stehen und sind am Namen (`animal-…`) zu erkennen.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const GRENZE = Number(process.argv[2] || 0.45)

const sonde = `function(MINH){
  /* Gerade Baender: Achse, Mitte, halbe BELAGSBREITE, Anfang und Ende laengs */
  var B=[{n:"Hauptstrasse Nord", a:"z",c: 58,h:8.05,von:-102,bis:102},
         {n:"Hauptstrasse Sued", a:"z",c:-58,h:8.05,von:-102,bis:102},
         {n:"Querstrasse Ost",   a:"x",c: 78,h:5.05,von:-69, bis:69},
         {n:"Querstrasse West",  a:"x",c:-78,h:5.05,von:-69, bis:69},
         {n:"Stadtring Ost",     a:"x",c: 112,h:4.5,von:-93.5,bis:111.5},
         {n:"Stadtring West",    a:"x",c:-112,h:4.5,von:-93.5,bis:111.5},
         {n:"Stadtring Sued",    a:"z",c: 118,h:4.5,von:-105.5,bis:105.5},
         {n:"Stadtring Nord",    a:"z",c:-100,h:4.5,von:-105.5,bis:105.5},
         /* 🎢 Achterbahn-Stich (#2326) — der neue L-Weg wurde bis hierher gar nicht
            ueberwacht: ein Werkzeug, das Objekte auf Fahrbahnen findet, muss jede
            neue Fahrbahn kennen, sonst waechst genau dort unbemerkt etwas zu. */
         {n:"Achterbahn-Stich West", a:"z",c:173, h:4.2,von:-194.2,bis:-100},
         {n:"Achterbahn-Stich Sued", a:"x",c:-190,h:4.2,von:169,   bis:205}];
  /* ⚠️ DIE BAENDER DER VIERTEL KOMMEN AUS DEM SPIEL, NICHT AUS DIESEM WERKZEUG.
     Erst fehlten sie ganz — die Zoo-Viertelstrasse lief durch die Windmuehle und alles
     meldete gruen (#2345). Dann standen sie hier als eigene Kopie der Geometrie, und
     als der Generator die Schenkel-Reihenfolge des Anschlusses aenderte, mass dieses
     Werkzeug eine Strasse, die es nicht mehr gab: 42 Treffer auf einem Phantom (#2346).
     Zwei Herleitungen derselben Sache gehen auseinander, sobald eine sich aendert.
     window._viertelBaender() ist jetzt die einzige. */
  try{
    var VB=window._viertelBaender?window._viertelBaender():[];
    for(var vb=0;vb<VB.length;vb++)B.push(VB[vb]);
  }catch(e){}
  /* Zubringer: die sechs Winkel stehen als Routen im Spiel (axis:"radial") */
  var SPEICHEN=[30,60,120,240,300,330], RAD0=123, RAD1=193, SPH=4.5;
  var RINGR=200, RINGH=4.5;                     /* Landstrasse: Spuren 197,5 / 202,5 */
  function bandVon(x,z){
    for(var i=0;i<B.length;i++){var b=B[i];
      var q=b.a==="z"?z:x, l=b.a==="z"?x:z;
      if(Math.abs(q-b.c)<b.h&&l>b.von&&l<b.bis)return b.n;}
    var r=Math.hypot(x,z);
    if(Math.abs(r-RINGR)<RINGH)return "Landstrasse";
    if(r>=RAD0&&r<=RAD1)
      for(var g=0;g<SPEICHEN.length;g++){
        var a=SPEICHEN[g]*Math.PI/180;
        if(Math.abs(x*Math.sin(a)-z*Math.cos(a))<SPH){
          /* nur die richtige Haelfte der Geraden */
          if(x*Math.cos(a)+z*Math.sin(a)>0)return "Zubringer "+SPEICHEN[g]+"\\u00b0";}}
    return null;}
  var beweglich=new Set();
  function markiere(arr){(arr||[]).forEach(function(o){var m=o&&(o.mesh||o.w||o);
    if(m&&m.traverse)m.traverse(function(c){beweglich.add(c);});});}
  try{markiere(verkehr);}catch(e){}
  try{markiere(window._landbus);}catch(e){}
  try{markiere(fussg);}catch(e){}
  try{markiere(npcs);}catch(e){}
  try{markiere(sims);}catch(e){}
  try{markiere(polizei);}catch(e){}
  try{if(busRec&&busRec.mesh)busRec.mesh.traverse(function(c){beweglich.add(c);});}catch(e){}
  var w=new THREE.Vector3(), bb=new THREE.Box3(), karte={};
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry||beweglich.has(o))return;
    o.getWorldPosition(w);
    var band=bandVon(w.x,w.z); if(!band)return;
    bb.setFromObject(o);
    var hy=bb.max.y, gr=Math.max(bb.max.x-bb.min.x, bb.max.z-bb.min.z);
    if(hy<MINH)return;                 /* Markierungen, Platten, Gullys */
    if(gr>60)return;                   /* Himmelskuppel + zusammengefasste Zeilen */
    /* ⚠️ UND NACH UNTEN FILTERN. Ohne das meldete der erste Lauf 193 Treffer auf der
       Landstrasse — allesamt die BERGSTATION der Seilbahn, die bei r=202 auf 47 m
       Hoehe ueber der Strasse thront. Was den Belag nicht beruehrt, steht nicht
       darauf; dieselbe Regel wie bei Baumkronen und Kranauslegern. */
    if(bb.min.y>2)return;
    var q=o,d=null;while(q&&q!==scene){if(q.userData&&q.userData.datei)d=q.userData.datei;q=q.parent;}
    var k=Math.round(w.x/3)+"|"+Math.round(w.z/3)+"|"+band;
    if(!karte[k]||karte[k].hoch<hy)
      karte[k]={x:+w.x.toFixed(1),z:+w.z.toFixed(1),band:band,hoch:+hy.toFixed(2),
                breit:+gr.toFixed(1),was:d||o.name||o.geometry.type};});
  var L=Object.keys(karte).map(function(k){return karte[k];});
  L.sort(function(a,b){return b.hoch-a.hoch;});
  return L;}`

mitSonden('traumhaus.html', { strassen: sonde }, '_str.html')
const { browser, page, jsFehler } = await spielOeffnen('_str.html', { warten: 85000 })
const L = await page.evaluate((g) => window.__th.strassen(g), GRENZE)
await browser.close()
aufraeumen('_str.html')

const tiere = L.filter((f) => /^animal-/.test(f.was))
const rest = L.filter((f) => !/^animal-/.test(f.was))
console.log(`Stellen auf dem Belag: ${rest.length}  (dazu ${tiere.length} laufende Tiere)\n`)
const proBand = {}
rest.forEach((f) => { (proBand[f.band] = proBand[f.band] || []).push(f) })
Object.keys(proBand).sort().forEach((b) => {
  const L2 = proBand[b]
  console.log(`── ${b}  (${L2.length})`)
  /* Modelle zusammenfassen: ein 30-m-Bau liefert Dutzende Meshes im selben Band. */
  const proModell = {}
  L2.forEach((f) => { (proModell[f.was] = proModell[f.was] || []).push(f) })
  Object.keys(proModell).forEach((m) => {
    const g = proModell[m], h = g[0]
    console.log(g.length > 1
      ? `   ${String(g.length).padStart(3)}x  ${m}   z.B. (${h.x}|${h.z}) h=${h.hoch}`
      : `        (${String(h.x).padStart(7)}|${String(h.z).padStart(7)})  h=${String(h.hoch).padStart(5)}  ${m}`)
  })
})
console.log('\nJS-Fehler:', jsFehler.length, jsFehler.slice(0, 3))
