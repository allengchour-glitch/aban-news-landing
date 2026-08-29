/* th-echt.mjs — welche der gemeldeten Ueberschneidungen sind ECHT?
 *
 * ⚠️ WOZU. th-pruef vergleicht GRUPPEN-Kaesten. Bei einem T- oder L-foermigen
 * Bauwerk luegt der Kasten: der Oberleitungsmast ist auf 7,5 m Hoehe 11,2 m breit,
 * sein Kasten reicht also ueber das ganze Loeschfahrzeug davor — der Mastfuss steht
 * aber 0,75 m frei und das Metall haengt 6 m darueber. Der Kommentar im Spiel warnt
 * ausdruecklich: "Wer das aufraeumt, indem er den Mast verschiebt, macht es kaputt."
 *
 * Dieses Werkzeug prueft dieselben Paare eine Ebene tiefer: MESH gegen MESH. Ein
 * Mast besteht aus Fuss und Ausleger mit je eigenem Kasten — die T-Form loest sich
 * damit auf. Was danach noch ueberlappt, ist ein echter Durchdringungs-Befund.
 *
 * Aufruf:  node spiele-dev/tools/th-echt.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_echt_probe.html'
mitSonden('traumhaus.html', {
  echt: `function(){
    var G=window._gebaeude||[],bb=[];
    function nam(w){
      var n=(w.userData&&w.userData.datei)||w.name||"";
      if(n)return n;
      var m="";w.traverse(function(x){if(x.isMesh&&!m)m=x.name||"";});
      return m?"mesh:"+m:"(namenlos)";}
    G.forEach(function(w){
      if(w.userData&&(w.userData._bewegt||w._bewegt||w.userData.nieAusblenden))return;
      var b=new THREE.Box3().setFromObject(w);
      if(!isFinite(b.min.x)||b.max.y-b.min.y<0.45)return;
      bb.push({b:b,w:w,n:nam(w)});});
    function ueber(A,B){
      var ox=Math.min(A.max.x,B.max.x)-Math.max(A.min.x,B.min.x);
      var oz=Math.min(A.max.z,B.max.z)-Math.max(A.min.z,B.min.z);
      var oy=Math.min(A.max.y,B.max.y)-Math.max(A.min.y,B.min.y);
      return (ox>0&&oz>0&&oy>0)?{x:ox,z:oz,y:oy,tief:Math.min(ox,oz)}:null;}
    /* Mesh-Kaesten einmal je Bauwerk sammeln (Weltkoordinaten). */
    function meshBoxen(w){
      if(w.__mb)return w.__mb;
      var L=[];w.updateMatrixWorld(true);
      w.traverse(function(n){
        if(!n.isMesh||!n.geometry)return;
        var b=new THREE.Box3().setFromObject(n);
        if(isFinite(b.min.x))L.push(b);});
      w.__mb=L;return L;}
    var out=[];
    for(var i=0;i<bb.length;i++)for(var j=i+1;j<bb.length;j++){
      var gr=ueber(bb[i].b,bb[j].b);
      if(!gr||gr.x<=1.0||gr.z<=1.0||gr.y<=1.0)continue;
      var MA=meshBoxen(bb[i].w),MB=meshBoxen(bb[j].w),tiefste=0,paare=0;
      for(var a=0;a<MA.length;a++)for(var c=0;c<MB.length;c++){
        var e=ueber(MA[a],MB[c]);
        if(e&&e.tief>0.05&&e.y>0.05){paare++;if(e.tief>tiefste)tiefste=e.tief;}}
      out.push({a:bb[i].n, b:bb[j].n,
        kasten:+gr.tief.toFixed(1), mesh:+tiefste.toFixed(2), meshPaare:paare,
        meshA:MA.length, meshB:MB.length});}
    out.sort(function(p,q){return q.mesh-p.mesh||q.kasten-p.kasten;});
    return out;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const L = await page.evaluate(() => window.__th.echt())
const echt = L.filter((o) => o.meshPaare > 0)
console.log(`${L.length} Paare, deren GRUPPEN-Kaesten sich um >1 m schneiden.`)
console.log(`Davon ${echt.length} mit echter Mesh-Durchdringung, ${L.length - echt.length} nur Kasten-Artefakt.\n`)
console.log('  Kasten   Mesh  Paare   A                              B')
for (const o of L)
  console.log(`  ${String(o.kasten).padStart(5)} m ${String(o.mesh || '—').padStart(6)} ${String(o.meshPaare).padStart(6)}   ` +
    `${o.a.padEnd(30).slice(0, 30)} ${o.b}`)
console.log('\n"Mesh —" heisst: die Gruppen-Kaesten ueberlappen, kein einziges Mesh tut es.')
console.log(`JS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
