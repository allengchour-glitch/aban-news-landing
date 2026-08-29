/**
 * th-mauern.mjs — durch welche Gebaeude laeuft man hindurch?
 *
 * ⚠️ WOZU. Kollider entstehen auf drei Wegen: von Hand per `addSolid(x,z,hw,hd)`,
 * automatisch per `autoKollider()` — und gar nicht. `autoKollider` greift nur
 * innerhalb r 130, ausserhalb des Baugrundstuecks, fuer Grundflaechen 5…40 m und
 * Oberkanten unter 18 m. ALLE VIERTEL liegen weiter draussen (Gewerbe Ost 250,
 * Sportpark 246, Zoo -200|-250, Flughafen 300|-260, Freizeitpark 60|360), ebenso
 * Hafen und Baustellen. Dort zaehlt nur, was jemand von Hand eingetragen hat, und
 * das ist eine ZWEITE ABLEITUNG des Grundrisses: sie veraltet, sobald ein Modell
 * umzieht oder seine Groesse aendert.
 *
 * Geprueft wird jedes Modell aus `_gebaeude`, das gebaeudeartig ist — Grundflaeche
 * mindestens 4 x 4 m und mindestens 2,5 m hoch. Ausgenommen sind Dinge, durch die
 * man laufen darf oder soll: Pflanzen, Zaeune, Masten, Schilder, Fahrzeuge, Tiere
 * und alles Bewegte.
 *
 * Aufruf:  node spiele-dev/tools/th-mauern.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  /* ⚠️ DIE AUSNAHMEN SIND DER SCHWIERIGE TEIL. Der erste Lauf meldete 39 Modelle,
     darunter fuenf EICHEN — der Filter kannte nur das Wort Baum, nicht die Baumarten.
     Dazu Bahnsteigdaecher, ein Rodelhang, ein Pavillon und ein Helilandeplatz:
     alles Dinge, durch oder ueber die man gehen SOLL. Ein Werkzeug, dessen Liste
     zur Haelfte aus Fehlalarmen besteht, wird beim dritten Mal nicht mehr gelesen. */
  var DURCHLASS=/baum|eiche|buche|ahorn|birke|fichte|tanne|pappel|weide|kastanie|linde|`+
    `erle|ulme|kiefer|zypresse|palme|olive|krone|`+
    `busch|hecke|strauch|blume|rabatte|pflanz|gras|schilf|zaun|gitter|kordel|`+
    `laterne|mast|leuchte|ampel|schild|bake|pylon|markier|gleis|schiene|steg|kaimauer|`+
    `rampe|treppe|bank|tisch|stuhl|korb|schirm|beet|findling|stein|heuballen|`+
    `auto|wagen|bus|lkw|limousine|kombi|sportwagen|lieferwagen|bagger|radlader|mischer|`+
    `boot|schiff|gondel|zug|lok|tram|ente|schwan|katze|hund|reh|hase|`+
    `landebahn|vorfahrt|teppich|platte|belag|`+
    `dach|pavillon|anleger|landeplatz|hang|rodel|zelt|pergola|unterstand|tribuene|`+
    `bruecke|portal|bogen|torbogen|eingang|arkade/i;
  /* ⚠️ NICHT window.WORLD_SOLIDS — die Liste ist eine Modul-Variable, kein Fenster-
     Feld. Der erste Lauf meldete 0 Kollider und daraufhin ALLE 144 Gebaeude als
     durchlaufbar; die Zahl 0 war der Verraeter. Die Sonde laeuft ohnehin INNERHALB
     der IIFE, also einfach direkt. */
  var S=(typeof WORLD_SOLIDS!=="undefined")?WORLD_SOLIDS:[];
  if(!S.length)return {fehler:"WORLD_SOLIDS leer — Sonde misst nichts"};
  function gedeckt(x,z){
    for(var i=0;i<S.length;i++){var s=S[i];
      if(Math.abs(x-s.x)<=s.hw&&Math.abs(z-s.z)<=s.hd)return true;}
    return false;}
  var bb=new THREE.Box3(), offen=[], geprueft=0, gedecktN=0;
  (window._gebaeude||[]).forEach(function(w){
    if(!w||!w.parent)return;
    var d=(w.userData&&w.userData.datei)||"";
    if(DURCHLASS.test(d))return;
    if(w.userData&&w.userData.nieAusblenden)return;      /* bewegt sich */
    if(w._bewegt)return;
    bb.setFromObject(w);
    if(!isFinite(bb.min.x))return;
    var bx=bb.max.x-bb.min.x, bz=bb.max.z-bb.min.z, hy=bb.max.y-Math.max(0,bb.min.y);
    if(Math.min(bx,bz)<4||hy<2.5)return;
    geprueft++;
    var cx=(bb.min.x+bb.max.x)/2, cz=(bb.min.z+bb.max.z)/2;
    if(gedeckt(cx,cz)){gedecktN++;return;}
    /* ⚠️ DIE HUELLBOX IST DAS DACH, NICHT DIE WAND. Ein Kollider in Dachgroesse ist
       eine unsichtbare Mauer unter der Traufe. Fuer die Groesse zaehlt darum nur,
       was zwischen 0,3 und 2,0 m hoch liegt — auf Brusthoehe, wo man anstoesst. */
    var sohle=bb.min.y;
    var wx0=1e9,wx1=-1e9,wz0=1e9,wz1=-1e9,wb=new THREE.Box3();
    w.traverse(function(m){
      if(!m.isMesh||!m.geometry)return;
      wb.setFromObject(m);
      if(!isFinite(wb.min.x))return;
      /* ⚠️ RELATIV ZUR EIGENEN SOHLE, nicht absolut. Die Berghuette steht auf der
         Seilbahnterrasse in 43 m Hoehe und meldete mit einem festen Fenster 0,3…2,0 m
         gar keine Wand. Brusthoehe heisst: 0,3…2,0 m ueber dem, worauf das Ding steht. */
      if(wb.max.y<sohle+0.3||wb.min.y>sohle+2.0)return;
      if(wb.min.x<wx0)wx0=wb.min.x; if(wb.max.x>wx1)wx1=wb.max.x;
      if(wb.min.z<wz0)wz0=wb.min.z; if(wb.max.z>wz1)wz1=wb.max.z;});
    var hatWand=(wx1>wx0);
    offen.push({was:d||"(prozedural)", bei:(+cx.toFixed(0))+"|"+(+cz.toFixed(0)),
                gross:(+bx.toFixed(1))+"x"+(+bz.toFixed(1)), hoch:+hy.toFixed(1),
                wand:hatWand?((+(wx1-wx0).toFixed(1))+"x"+(+(wz1-wz0).toFixed(1))):"—",
                wandMitte:hatWand?((+((wx0+wx1)/2).toFixed(1))+"|"+(+((wz0+wz1)/2).toFixed(1))):"—",
                ab:+Math.hypot(cx,cz).toFixed(0)});});
  offen.sort(function(a,b){return (b.gross.split("x")[0]*b.hoch)-(a.gross.split("x")[0]*a.hoch);});
  return {kollider:S.length, geprueft:geprueft, gedeckt:gedecktN,
          offen:offen.length, liste:offen.slice(0,25)};}`

mitSonden('traumhaus.html', { mauern: sonde }, '_mauern.html')
const { browser, page, jsFehler } = await spielOeffnen('_mauern.html', { warten: 30000 })
const R = await page.evaluate(() => window.__th.mauern())
if (R.fehler) { console.log("⚠️ " + R.fehler); process.exit(1) }
await browser.close()
aufraeumen('_mauern.html')

console.log(`${R.kollider} Kollider · ${R.geprueft} gebaeudeartige Modelle geprueft · ${R.gedeckt} gedeckt\n`)
if (!R.offen) console.log('✅ Kein gebaeudeartiges Modell ohne Kollider')
else {
  console.log(`⚠️  ${R.offen} ohne Kollider — man laeuft hindurch:`)
  for (const e of R.liste)
    console.log(`   Dach ${e.gross.padStart(11)} um ${e.bei.padStart(12)}  Wand ${e.wand.padStart(11)} um ${e.wandMitte.padStart(12)}  ${String(e.hoch).padStart(5)} m  ${e.was}`)
  if (R.offen > R.liste.length) console.log(`   … und ${R.offen - R.liste.length} weitere`)
}
console.log('\nJS-Fehler:', jsFehler.length)
