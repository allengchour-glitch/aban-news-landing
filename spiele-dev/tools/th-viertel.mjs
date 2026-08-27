/* th-viertel.mjs — warum ein Viertel dort steht, wo es steht.
 *
 *   node spiele-dev/tools/th-viertel.mjs [datei.html]
 *
 * WARUM: `viertelOrt()` sucht einen Platz in drei Strengestufen (2 = Strassen und
 * Berge meiden, 1 = nur Berge, 0 = Notnagel) und meldet am Ende nur "Wunschort
 * belegt, N m ausgewichen". WELCHE Stufe gewonnen hat und WORAN die strengere
 * gescheitert ist, stand nirgends — und genau das ist die Frage, sobald ein Viertel
 * auf der Landstrasse landet. Ohne diese Zahl wurde in frueheren Runden geraten
 * ("der richtige Weg waere, viertelPasst die Landstrasse beizubringen" — die kannte
 * sie da laengst) und der Wunschort blind verschoben, was es schlimmer machte.
 *
 * Das Werkzeug spielt die Suche im laufenden Spiel NACH: es nimmt das Viertel kurz
 * aus VIERTEL heraus, blendet seine eigenen Kollider aus und laesst jeden Kandidaten
 * auf jeder Stufe bewerten. Gemessen wird an der echten Szene, also inklusive
 * Gelaende und WORLD_SOLIDS — die fehlen jeder Rechnung auf dem Papier.
 *
 * ⚠️ Die Reihenfolge zaehlt: `VIERTEL` fuellt sich waehrend des Ladens. Wer nach
 * 55 s misst, sieht alle Viertel — der echte Solver sah beim Setzen von Gewerbe Ost
 * nur die davor gesetzten. Die Nachstellung ist darum eher zu streng als zu milde.
 *
 * ERSTBEFUND (dokumentiert, damit die Zahl vergleichbar bleibt): vier Viertel, zwei
 * davon nur auf Stufe 0 — und beide scheiterten auf Stufe 1 an EINER einzigen
 * Gelaendebox von 542 x 542 m. Das war kein Platzmangel, sondern die Huellbox einer
 * ganzen Bergkette. Seit das Gelaende gerastert wird, ist der Bauernhof auf Stufe 2.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const datei = process.argv[2] || 'traumhaus.html'
const tmp = '_viertel_tmp.html'

const sonden = {
  vDiag: `function(){
    var S=window._viertelSolver, VIERTEL=S.VIERTEL, viertelMass=S.mass,
        aufFahrbahn=S.fahrbahn, imBerg=S.berg, aufSperre=S.sperre, bergBoxen=S.boxen;
    var raus=[];
    /* ⚠️ "Berg" allein ist keine Auskunft. bergBoxen() sammelt ALLES ueber 20 m Hoehe
       und 30 m Breite — hohe Haeuser landen darin genauso wie Fels. Ohne die Box im
       Klartext waere nicht zu unterscheiden, ob ein Viertel am Gebirge scheitert oder
       an seinem eigenen Hochhaus. Dasselbe gilt fuer die Fahrbahn: Ring, Zubringer und
       Landstrasse sind verschiedene Probleme mit verschiedenen Auswegen. */
    function welcherBerg(x,z,m){
      var B=(typeof bergBoxen==="function")?bergBoxen():[];
      var x0=x-m.hw,x1=x+m.hw,z0=z-m.hd,z1=z+m.hd,tr=[];
      for(var i=0;i<B.length;i++){var b=B[i];
        if(b[1]>x0&&b[0]<x1&&b[3]>z0&&b[2]<z1)
          tr.push("["+Math.round(b[0])+".."+Math.round(b[1])+"|"+Math.round(b[2])+".."+Math.round(b[3])+"]");}
      return tr.slice(0,3).join(" ")+(tr.length>3?" +"+(tr.length-3):"");}
    function band(x,z,m){
      var SP=[30,60,120,240,300,330],H=10.5,tr={};
      for(var px=x-m.hw;px<=x+m.hw;px+=8)for(var pz=z-m.hd;pz<=z+m.hd;pz+=8){
        var r=Math.hypot(px,pz);
        if(Math.abs(r-200)<H)tr["Landstrasse"]=1;
        if(r>=123-H&&r<=193+H)for(var g=0;g<SP.length;g++){var a9=SP[g]*Math.PI/180;
          if(Math.abs(px*Math.sin(a9)-pz*Math.cos(a9))<H&&px*Math.cos(a9)+pz*Math.sin(a9)>0)
            tr["Zubringer "+SP[g]+"\\u00b0"]=1;}}
      return "("+Object.keys(tr).join(", ")+")";}
    /* ⚠️ DIE EIGENEN HAEUSER ZAEHLEN NICHT. Das Viertel aus VIERTEL zu nehmen genuegt
       nicht - seine Bauten stehen als KOLLIDER in WORLD_SOLIDS und blockieren dann
       genau den Ort, an dem das Viertel schon steht. Der erste Lauf meldete darum fuer
       ALLE vier Viertel "nein: Kollider" auf Stufe 0, also auch dort, wo sie
       unbestritten stehen. Wer ein Viertel nachrechnet, blendet alles aus, was
       innerhalb seiner eigenen Grundflaeche liegt. */
    var _eigen=null;
    function fremd(s2){
      if(!_eigen)return true;
      return !(Math.abs(s2.x-_eigen.x)<=_eigen.w/2+10&&Math.abs(s2.z-_eigen.z)<=_eigen.d/2+10);}
    function grund(cfg,x,z,streng){
      var m=viertelMass(cfg);
      if(x-m.hw<-118&&Math.abs(z)<170)return "Meer";
      if(streng>=2&&aufFahrbahn(x-m.hw,x+m.hw,z-m.hd,z+m.hd))return "Fahrbahn "+band(x,z,m);
      if(streng>=1&&imBerg(x-m.hw,x+m.hw,z-m.hd,z+m.hd))return "Berg "+welcherBerg(x,z,m);
      for(var i=0;i<VIERTEL.length;i++){var v=VIERTEL[i];
        if(Math.abs(x-v.x)<m.hw+v.w/2+8&&Math.abs(z-v.z)<m.hd+v.d/2+8)return "Viertel "+v.name;}
      for(var q=0;q<WORLD_SOLIDS.length;q++){var s2=WORLD_SOLIDS[q];
        if(!fremd(s2))continue;
        if(Math.abs(x-s2.x)<m.hw+s2.hw+6&&Math.abs(z-s2.z)<m.hd+s2.hd+6)
          return "Kollider "+(s2.name||(Math.round(s2.x)+"|"+Math.round(s2.z)));}
      if(aufSperre(x-m.hw,x+m.hw,z-m.hd,z+m.hd))return "Sperre";
      return null;}
    VIERTEL.forEach(function(g){
      var i0=VIERTEL.indexOf(g);VIERTEL.splice(i0,1);_eigen=g;
      var cfg=g.cfg;
      var m=viertelMass(cfg), zeile={name:g.name,ort:[g.x,g.z],
        netto:[+(2*m.hw).toFixed(1),+(2*m.hd).toFixed(1)],stufen:{}};
      for(var s=2;s>=0;s--){
        var g0=grund(cfg,g.x,g.z,s);
        zeile.stufen[s]=g0?("nein: "+g0):"ja";}
      zeile.stufe2Ort=null;
      var laengs=cfg.achse==="x", W=g.wx, Z=g.wz;
      if(W!==undefined){
        if(!grund(cfg,W,Z,2))zeile.stufe2Ort=[W,Z,0];
        else for(var d=10;d<=120&&!zeile.stufe2Ort;d+=10){
          var kand=laengs?[[W+d,Z],[W-d,Z],[W,Z+d],[W,Z-d]]:[[W,Z+d],[W,Z-d],[W+d,Z],[W-d,Z]];
          for(var k=0;k<kand.length;k++)
            if(!grund(cfg,kand[k][0],kand[k][1],2)){zeile.stufe2Ort=[kand[k][0],kand[k][1],d];break;}}}
      VIERTEL.splice(i0,0,g);
      raus.push(zeile);});
    return raus;}`
}

mitSonden(datei, sonden, tmp)
const { browser, page, jsFehler } = await spielOeffnen(tmp)
const rows = await page.evaluate(() => window.__th.vDiag())
await browser.close()
aufraeumen(tmp)

console.log(`\n=== Viertel-Diagnose (${datei}) ===\n`)
for (const r of rows) {
  const s2 = r.stufen['2'] === 'ja'
  console.log(`${s2 ? '✅' : '⚠️ '} ${r.name.padEnd(18)} steht ${String(r.ort[0]).padStart(5)}|${String(r.ort[1]).padStart(5)}   netto ${r.netto[0]}x${r.netto[1]}`)
  for (const s of ['2', '1', '0']) console.log(`      Stufe ${s}: ${r.stufen[s]}`)
  if (r.stufe2Ort) console.log(`      Stufe-2-Platz vom Wunschort aus: ${r.stufe2Ort[0]}|${r.stufe2Ort[1]} (${r.stufe2Ort[2]} m)`)
}
const schlecht = rows.filter(r => r.stufen['2'] !== 'ja')
console.log(`\n${rows.length} Viertel, davon ${schlecht.length} nicht auf Stufe 2: ${schlecht.map(r => r.name).join(', ') || '—'}`)
if (jsFehler.length) console.log('JS-Fehler:', jsFehler.slice(0, 3))
