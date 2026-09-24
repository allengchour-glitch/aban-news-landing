/* th-kante.mjs — wie schliessen Strasse und Trottoir aneinander an? Bordstein, Luecke, Uebergang.
 *
 *   node spiele-dev/tools/th-kante.mjs            (Bericht)
 *   node spiele-dev/tools/th-kante.mjs --alle     (jede Stelle, nicht nur Zusammenfassung)
 *
 * WOZU (Runde 93). User: „schoene verbindung strasse und trottoir, auch schoene uebergaenge".
 * Das ist zweierlei: (1) die KANTE — liegt zwischen Asphalt und Gehwegplatte ein Bordstein,
 * oder ein Streifen Wiese/Viertelboden (Luecke), oder gar kein Gehweg; (2) der UEBERGANG —
 * wo ein Zebrastreifen auf den Bordstein trifft, muss der abgesenkt sein (sonst „Uebergang
 * an eine 12-cm-Mauer").
 *
 * WIE. Fuer jedes Strassenband (feste Baender + window._viertelBaender() + Anschluesse aus
 * window._anschluesse) werden Querschnitte im Abstand von 9 m gelegt. Je Seite wird von
 * y 3 nach unten gestrahlt, an Abstaenden von der Fahrbahnkante: -0,4 (Fahrbahn), +0,08,
 * +0,2, +0,35 (Bordsteinzone), +0,7, +1,2, +1,8 (Gehweg). Klassen nach sichtbarer Farbe
 * (Materialfarbe x Texturmittel, wie th-autoboden): gruen/erde = Boden, sonst Belag.
 *   Bordstein   = hoechste Oberkante in der Bordsteinzone >= 0,09 m
 *   Luecke      = Boden (gruen/erde/kies) zwischen Fahrbahnkante und Gehweg
 *   Gehweg      = Oberkante bei +1,2 >= 0,03 m und kein Boden
 * Uebergaenge kommen aus window._uebergaenge ([x,z,quer,breite]); an beiden Enden (Bordstein
 * beider Seiten) muss die Oberkante <= 0,05 m sein.
 *
 * Gegenprobe (Regel 1 des Runbooks): die Suedstrasse hat GEMESSEN einen Bordstein bei 8,05
 * (bord(), 0,12 hoch) — meldet das Werkzeug dort keinen, ist es kaputt und bricht ab.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const ALLE = process.argv.includes('--alle')
const TMP = 'spiele-dev/tools/_kante_probe.html'
mitSonden('traumhaus.html', {
  kante: `function(was){
    var W=window.__kW||(window.__kW={});
    /* ---- Boden-Kandidaten: alle Meshes unter 4 m, gerastert (wie th-autoboden) ---- */
    function boden(){
      if(W.B)return W.B;
      var G={},immer=[],bb=new THREE.Box3(),C=8;
      scene.traverse(function(n){
        if(!(n.isMesh||n.isInstancedMesh)||!n.geometry||n.isSprite)return;
        var m=n.material;if(!m)return;var m0=Array.isArray(m)?m[0]:m;
        if(m0.visible===false||(m0.transparent&&m0.opacity<0.05))return;
        if(n===window._wolkenSchatten||(m0.transparent&&m0.depthWrite===false))return;
        if(n.isInstancedMesh){if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();
          var s9=new THREE.Vector3();n.geometry.boundingBox.getSize(s9);
          if(Math.min(s9.x,s9.y,s9.z)<0.05)immer.push(n);return;}
        bb.setFromObject(n);if(bb.isEmpty()||bb.min.y>4)return;
        var x0=Math.floor(bb.min.x/C),x1=Math.floor(bb.max.x/C),z0=Math.floor(bb.min.z/C),z1=Math.floor(bb.max.z/C);
        if((x1-x0+1)*(z1-z0+1)>4000){immer.push(n);return;}
        for(var i=x0;i<=x1;i++)for(var k=z0;k<=z1;k++){var key=i+","+k;(G[key]=G[key]||[]).push(n);}});
      return (W.B={G:G,immer:immer,C:C});}
    var _texC={};
    function texMittel(t){if(!t||!t.image)return null;var id=t.uuid;if(_texC[id])return _texC[id];
      var c=new THREE.Color(1,1,1);try{var cv=document.createElement("canvas");cv.width=cv.height=16;var x=cv.getContext("2d");
        x.drawImage(t.image,0,0,16,16);var d=x.getImageData(0,0,16,16).data,r=0,g=0,b=0;
        for(var i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}var n=d.length/4;c.setRGB(r/n/255,g/n/255,b/n/255);}catch(e){}
      _texC[id]=c;return c;}
    function klasse(hit){var o=hit.object,m=o.material;if(Array.isArray(m))m=m[(hit.face&&hit.face.materialIndex)||0]||m[0];
      var c=new THREE.Color(1,1,1);if(m&&m.color)c.copy(m.color);if(m&&m.map){var t=texMittel(m.map);if(t)c.multiply(t);}
      var ca=o.geometry.attributes&&o.geometry.attributes.color;
      if(ca&&m&&m.vertexColors&&hit.face){var f=hit.face;c.r*=(ca.getX(f.a)+ca.getX(f.b)+ca.getX(f.c))/3;c.g*=(ca.getY(f.a)+ca.getY(f.b)+ca.getY(f.c))/3;c.b*=(ca.getZ(f.a)+ca.getZ(f.b)+ca.getZ(f.c))/3;}
      var h={};c.getHSL(h);
      if(h.s>0.16&&h.h>0.17&&h.h<0.47&&h.l>0.06)return "gruen";
      if(h.s>0.22&&h.h>=0.03&&h.h<=0.17&&h.l>0.2&&h.l<0.85)return "erde";
      return h.l<0.42?"asphalt":"hell";}
    var RC=new THREE.Raycaster(),DN=new THREE.Vector3(0,-1,0),O=new THREE.Vector3();RC.camera=camera;
    function unten(x,z){var B=boden(),key=Math.floor(x/B.C)+","+Math.floor(z/B.C),L=(B.G[key]||[]).concat(B.immer);
      O.set(x,3,z);RC.set(O,DN);RC.far=4;var H=RC.intersectObjects(L,false);
      for(var i=0;i<H.length;i++){var hi=H[i];if(!hi.face)continue;
        var nrm=hi.face.normal.clone().transformDirection(hi.object.matrixWorld);if(nrm.y<0.6)continue;
        var bx=new THREE.Box3().setFromObject(hi.object),gr=Math.max(bx.max.x-bx.min.x,bx.max.z-bx.min.z);
        if(bx.max.y-bx.min.y>0.6&&gr<40)return {y:+hi.point.y.toFixed(3),k:"objekt"};   /* Laterne, Bank, Haus — nicht der Belag */
        return {y:+hi.point.y.toFixed(3),k:klasse(hi)};}
      return {y:null,k:"nichts"};}
    /* ---- Baender ---- */
    function baender(){
      var SZr=GH*CS/2+12,B=[
        {n:"Suedstrasse",a:"z",c:SZr,h:8.05,von:-RL/2+8,bis:RL/2-8},{n:"Nordstrasse",a:"z",c:-SZr,h:8.05,von:-RL/2+8,bis:RL/2-8},
        {n:"Quer-Ost",a:"x",c:RX,h:5.05,von:-SZr+10,bis:SZr-10},{n:"Quer-West",a:"x",c:-RX,h:5.05,von:-SZr+10,bis:SZr-10},
        {n:"Ring-Sued",a:"z",c:118,h:4.5,von:-104,bis:104},{n:"Ring-Nord",a:"z",c:-100,h:4.5,von:-104,bis:104},
        {n:"Ring-Ost",a:"x",c:112,h:4.5,von:-92,bis:110},{n:"Ring-West",a:"x",c:-112,h:4.5,von:-92,bis:110},
        /* land: Landstrassen ohne Gehweg (gewollt) — werden gemessen, aber nicht in die Kennzahlen gezaehlt.
           bahn: die Seite, auf der der Bahndamm liegt (Ring-Sued innen: Schotter statt Gehweg, gewollt). */
        {n:"Strandzufahrt",a:"z",c:-30,h:4.8,von:-130,bis:-82,land:true},
        {n:"Achterbahn-West",a:"z",c:173,h:4.2,von:-186,bis:-106,land:true},{n:"Achterbahn-Sued",a:"x",c:-190,h:4.2,von:178,bis:202,land:true}];
      B[4].bahn=-1;   /* Ring-Sued, Seite -1 = innen (z < 118) */
      (window._viertelBaender?window._viertelBaender():[]).forEach(function(b){B.push({n:"Viertel "+(b.n||"?"),a:b.a,c:b.c,h:4.5,von:b.von+8,bis:b.bis-8});});
      (window._anschluesse||[]).forEach(function(b){B.push({n:"Anschluss "+b.n,a:b.a,c:b.c,h:4.5,von:b.von+8,bis:b.bis-8});});
      return B;}
    if(was==="gegenprobe"){var r=[];[0.08,0.2,0.35,1.2].forEach(function(o){r.push(unten(20,58+8.05+o));});return r;}
    if(was==="kanten"){
      var out=[],OFF=[-0.4,0.08,0.2,0.35,0.7,1.2,1.8];
      baender().forEach(function(b){
        var r={n:b.n,schnitte:0,ohneBord:[],luecke:[],ohneGehweg:[],bordH:[],gehH:[],land:!!b.land,bahndamm:0};
        /* ⚠️ Ein Messgeraet, das Bauteile als Fehler zaehlt, treibt die Arbeit in die falsche
           Richtung (Runbook-Lehre 3): an einem Zebrastreifen IST der Bordstein abgesenkt und die
           Gehwegplatte auf 3 cm — das ist der Zweck, kein Befund. Querschnitte, die in einen
           registrierten Uebergang (window._uebergaenge) fallen, werden hier uebersprungen und
           gezaehlt; die Uebergaenge prueft der eigene Lauf unten (abgesenkt ja/nein). */
        var UEB=window._uebergaenge||[];
        function imUebergang(px,pz){for(var i=0;i<UEB.length;i++){var u=UEB[i],br=(u[3]||4.8)/2+0.4,hb=(u[4]||8.05)+0.6;
          if(u[2]?(Math.abs(px-u[0])<br&&Math.abs(pz-u[1])<hb):(Math.abs(pz-u[1])<br&&Math.abs(px-u[0])<hb))return true;}return false;}
        r.uebergang=0;
        for(var l=b.von;l<=b.bis;l+=9){
          [-1,1].forEach(function(seite){
            if(b.bahn===seite){r.bahndamm++;return;}
            var S=OFF.map(function(o){var q=b.c+seite*(b.h+o),x=b.a==="z"?l:q,z=b.a==="z"?q:l;var u=unten(x,z);u.o=o;return u;});
            if(S[0].k!=="asphalt"&&S[0].k!=="hell")return;          /* hier ist keine Fahrbahn (Luecke im Band, Kreuzung) */
            var kx=b.a==="z"?l:b.c+seite*b.h,kz=b.a==="z"?b.c+seite*b.h:l;
            if(imUebergang(kx,kz)){r.uebergang++;return;}
            /* Einmuendung: Asphalt bis 1,8 m hinter der Kante = die Fahrbahn einer anderen Strasse
               (Zubringer-Muendung, Querstrasse, Zufahrt). Dort gibt es keinen Bordstein — gewollt. */
            if(S[5].k==="asphalt"&&S[6].k==="asphalt"){r.einmuendung=(r.einmuendung||0)+1;return;}
            r.schnitte++;
            var bord=Math.max(S[1].y||0,S[2].y||0,S[3].y||0),geh=S[5].y||0;
            var lk=S.slice(1,6).filter(function(u){return u.k==="gruen"||u.k==="erde";});
            var px=b.a==="z"?l:b.c+seite*b.h,pz=b.a==="z"?b.c+seite*b.h:l,p=[+px.toFixed(0),+pz.toFixed(0)];
            r.bordH.push(bord);r.gehH.push(geh);
            if(bord<0.09)r.ohneBord.push(p);
            if(lk.length)r.luecke.push(p.concat([lk[0].o,lk[0].k]));
            if(geh<0.03||S[5].k==="gruen"||S[5].k==="erde")r.ohneGehweg.push(p);});}
        out.push(r);});
      return out;}
    if(was==="uebergaenge"){
      var U=window._uebergaenge||[],res=[];
      U.forEach(function(u){var x=u[0],z=u[1],quer=u[2],br=u[3]||4.8,hb=u[4]||8.05;
        /* quer=true: Streifen liegt ueber eine Strasse in x (Nord/Sued) → Bordsteine bei z ± hb */
        /* ⚠️ ERSTER LAUF MELDETE "16 Uebergaenge, 0 nicht abgesenkt" AUF DEM ALTEN STAND — dort
           lief der 12-cm-Stein durch jeden Zebra. Der Probepunkt lag bei hb-0,15 = 7,90, der
           Stein beginnt bei 7,92: zwei Zentimeter daneben, und die Pruefung war blind. Jetzt
           drei Abstaende ueber die Steinbreite (hb-0,1 / hb+0,05 / hb+0,2). */
        var enden=quer?[[x,z-hb],[x,z+hb]]:[[x-hb,z],[x+hb,z]];
        var hs=enden.map(function(e,ei){var mx=0,sg=ei?1:-1;
          for(var d=-br/2+0.4;d<=br/2-0.4;d+=0.8)[-0.1,0.05,0.2].forEach(function(o){
            var px=quer?e[0]+d:e[0]+sg*o,pz=quer?e[1]+sg*o:e[1]+d;var t=unten(px,pz);mx=Math.max(mx,t.y||0);});
          return +mx.toFixed(3);});
        res.push({x:x,z:z,quer:quer,bord:hs,abgesenkt:hs.every(function(h){return h<=0.05;})});});
      return res;}
    return null;}`,
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 70000 })
const K = (w) => page.evaluate((v) => window.__th.kante(v), w)
const G = await K('gegenprobe')
const gBord = Math.max(...G.slice(0, 3).map((u) => u.y || 0))
console.log(`Gegenprobe Suedstrasse (20|66,1..66,4): Bordstein-Oberkante ${gBord} m, Gehweg ${G[3].y} m ${G[3].k}`)
if (gBord < 0.09) { console.log('💥 GEGENPROBE FEHLGESCHLAGEN — das Werkzeug sieht den bekannten Bordstein nicht.'); await browser.close(); aufraeumen(TMP); process.exit(2) }
const R = await K('kanten')
let sOhneBord = 0, sLuecke = 0, sOhneGeh = 0, sSchnitte = 0, sLand = 0
console.log('\nKANTE je Band (Querschnitte alle 9 m, beide Seiten):')
for (const r of R) {
  /* Landstrassen (Strand, Achterbahn) haben gewollt keinen Gehweg — sie stehen in der Liste, aber nicht
     in den Kennzahlen; sonst treibt das Mass die Arbeit in die falsche Richtung (Runbook-Lehre 3). */
  if (r.land) { sLand += r.ohneBord.length + r.ohneGehweg.length + r.luecke.length }
  else { sOhneBord += r.ohneBord.length; sLuecke += r.luecke.length; sOhneGeh += r.ohneGehweg.length }
  sSchnitte += r.schnitte
  const mB = r.bordH.length ? (r.bordH.reduce((a, b) => a + b, 0) / r.bordH.length).toFixed(2) : '-'
  const mG = r.gehH.length ? (r.gehH.reduce((a, b) => a + b, 0) / r.gehH.length).toFixed(2) : '-'
  const ok = r.land || (!r.ohneBord.length && !r.luecke.length && !r.ohneGehweg.length)
  console.log(`  ${ok ? '✅' : '⚠️ '} ${r.n.padEnd(30)} ${String(r.schnitte).padStart(3)} Schnitte · ohne Bordstein ${r.ohneBord.length} · Luecke ${r.luecke.length} · ohne Gehweg ${r.ohneGehweg.length} · Bord ø ${mB} m · Gehweg ø ${mG} m${r.uebergang ? ` · ${r.uebergang} im Uebergang` : ''}${r.einmuendung ? ` · ${r.einmuendung} in Einmuendung` : ''}${r.land ? ' · Landstrasse ohne Gehweg (gewollt, nicht gezaehlt)' : ''}${r.bahndamm ? ` · ${r.bahndamm} Schnitte Bahndamm-Seite ausgelassen` : ''}`)
  if (ALLE) { if (r.ohneBord.length) console.log('       ohne Bordstein: ' + r.ohneBord.slice(0, 12).map((p) => `(${p[0]}|${p[1]})`).join(' '))
    if (r.luecke.length) console.log('       Luecke: ' + r.luecke.slice(0, 12).map((p) => `(${p[0]}|${p[1]}) +${p[2]} ${p[3]}`).join(' '))
    if (r.ohneGehweg.length) console.log('       ohne Gehweg: ' + r.ohneGehweg.slice(0, 12).map((p) => `(${p[0]}|${p[1]})`).join(' ')) }
}
const U = await K('uebergaenge')
const uSchlecht = U.filter((u) => !u.abgesenkt)
console.log(`\nUEBERGAENGE (window._uebergaenge): ${U.length}, davon ohne abgesenkten Bordstein ${uSchlecht.length}`)
for (const u of uSchlecht.slice(0, 20)) console.log(`   (${u.x}|${u.z}) ${u.quer ? 'ueber Strasse in x' : 'ueber Strasse in z'}  Bordstein-Oberkanten ${u.bord.join(' / ')} m`)
console.log(`\nKENNZAHLEN: Schnitte ${sSchnitte} · ohne Bordstein ${sOhneBord} · Luecke ${sLuecke} · ohne Gehweg ${sOhneGeh} · Uebergaenge ${U.length}, nicht abgesenkt ${uSchlecht.length}  (Landstrassen ohne Gehweg: ${sLand} Befunde, gewollt)`)
console.log('JS-Fehler:', jsFehler.length, jsFehler.slice(0, 3).join(' | '))
await browser.close(); aufraeumen(TMP)
