/* th-autoboden.mjs — worauf stehen und fahren die Autos?
 *
 *   node spiele-dev/tools/th-autoboden.mjs            (Bericht)
 *   node spiele-dev/tools/th-autoboden.mjs --json     (Rohdaten dazu)
 *
 * WOZU. User 2026-09-23: „auto gehoeren nicht auf rasen". Kein Werkzeug fragte das:
 * th-strassen sucht Dinge AUF der Fahrbahn (die Umkehrung), th-3d Autos IN Gebaeuden.
 * Ein Wagen mitten in der Wiese kollidiert mit nichts und steht auf keiner Strasse —
 * er faellt durch beide Netze.
 *
 * WIE. Fuer jedes Auto werden Mitte und vier Ecken (je 20 % nach innen) bestimmt —
 * aus der Box des Modells im EIGENEN Koordinatensystem, damit ein quer stehender
 * Wagen nicht die Ecken seiner achsparallelen Huelle meldet. Von dort geht ein
 * Strahl senkrecht nach unten; gewertet wird die erste nach oben zeigende Flaeche.
 * Deren sichtbare Farbe (Materialfarbe x mittlere Texturfarbe) entscheidet:
 *   gruen   — Rasen, Wiese, Hecke        → Befund
 *   erde    — Sand, Kies, Feldweg         → Befund nur fuer Stadtautos
 *   asphalt — dunkler Belag               → richtig
 *   hell    — Gehweg, Pflaster, Markierung → richtig fuer Parkplaetze, Gehweg ist Grenzfall
 *   wasser  — See, Meer                   → Befund
 * Die Farbe statt einer Liste von Belaegen: Belaege entstehen an 40 Stellen im Code
 * (Viertelboeden, Vorplaetze, Parktaschen). Eine Liste waere die vierte Herleitung
 * derselben Sache und liefe auseinander — die Farbe sieht, was der Spieler sieht.
 *
 * WELCHE AUTOS. Drei Quellen, weil Autos auf drei Wegen in die Welt kommen:
 *   1. alles mit Lackteilen (Material /lack/i) — die Wagen aus Charge 37/40/50,
 *      auch die ohne Dateinamen (Parktaschen klonen die Vorlage direkt),
 *   2. `bau()`-Gruppen mit Fahrzeug-Dateinamen (th7_taxi, th_auto_*, Loeschfahrzeug …),
 *   3. die Listen, die sich bewegen: verkehr, Landbus, Polizei.
 * Fahrende Wagen werden zusaetzlich SIMULIERT (updVerkehr direkt getickt, wie th-stich):
 * ein Standbild zeigt nur, wo sie gerade sind, nicht wo ihre Spur verlaeuft.
 *
 * GEGENPROBE (eingebaut, Lehre 1 aus dem Runbook: erst das Messgeraet pruefen):
 * ein Wagen wird kuenstlich mitten auf die Wiese des eigenen Grundstuecks gestellt
 * und muss "gruen" melden; einer mitten auf die Hauptstrasse muss "asphalt" melden.
 * Schlaegt eine der beiden fehl, ist der Bericht wertlos und das Werkzeug bricht ab.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const JSON_AUS = process.argv.includes('--json')
const TMP = 'spiele-dev/tools/_autoboden_probe.html'

mitSonden('traumhaus.html', {
  ab: `function(was,arg){
    var VEH=/(th37_(limousine|kombi|sportwagen|lieferwagen)|th40_(postauto|kleinbus|muellwagen|bus)|th50_[a-z0-9]+|th_auto_[a-z]+|th7_(taxi|lkw|lieferwagen)|th43_loeschfahrzeug|th25_(tankwagen|gepaeckwagen)|th18_(traktor|anhaenger)|th38_traktor)[.]glb/;
    var FELD=/traktor|anhaenger/;                       /* gehoeren aufs Feld */
    var W=window.__abW||(window.__abW={});
    /* ---------- Fahrzeuge einsammeln ---------- */
    function wurzel(n){
      /* hoechster Vorfahr, der noch "ein Auto gross" ist (max. 12 m lang, 6 m hoch) */
      var best=n,p=n.parent,bb=new THREE.Box3(),s=new THREE.Vector3();
      while(p&&p!==scene){bb.setFromObject(p);bb.getSize(s);
        if(Math.max(s.x,s.z)>12.5||s.y>6)break;best=p;p=p.parent;}
      return best;}
    function sammeln(){
      var R=new Map();
      function add(o,art,datei){if(!o)return;var e=R.get(o);
        if(e){if(art!=="statisch")e.art=art;if(datei&&!e.datei)e.datei=datei;return;}
        R.set(o,{o:o,art:art,datei:datei||""});}
      scene.traverse(function(n){
        var d=n.userData&&n.userData.datei;
        if(d&&VEH.test(d)){add(n,FELD.test(d)?"feld":"statisch",d);return;}
        /* ⚠️ /lack/i passte auch auf "B-lack" — die Windmuehle galt als Auto. Die Wagen
           tragen SdLack (Charge 37/50) bzw. NfLack (Charge 40), gemessen per GLB-Liste. */
        if(n.isMesh&&n.material&&!Array.isArray(n.material)&&/^(Sd|Nf)Lack/.test(n.material.name||"")){
          var w=wurzel(n);if(!R.has(w))add(w,"statisch","");}});
      /* Lack-Suche findet auch Wagen INNERHALB einer bau()-Gruppe — die Gruppe gewinnt */
      R.forEach(function(e,o){var p=o.parent;while(p&&p!==scene){if(R.has(p)){R.delete(o);break;}p=p.parent;}});
      (verkehr||[]).forEach(function(v){add(v.mesh,"verkehr",v.datei);});
      if(busRec)add(busRec.mesh,"bus","th40_bus.glb");
      (window._landbus||[]).forEach(function(b){if(b&&b.w)add(b.w,"landbus","th40_bus.glb");});
      (polizei||[]).forEach(function(p){add(p.mesh,"polizei","th50_streife.glb");});
      if(window.autoRec&&window.autoRec.mesh)add(window.autoRec.mesh,"eigenes",window.autoRec.datei||"");
      return Array.from(R.values());}
    /* ---------- Boden-Kandidaten, einmal je Lauf ---------- */
    function istFahrzeugTeil(n,set){var p=n;while(p){if(set.has(p))return true;p=p.parent;}return false;}
    function boden(fz){
      var set=new Set(fz.map(function(e){return e.o;}));
      var G={},immer=[],bb=new THREE.Box3(),C=8;
      scene.traverse(function(n){
        if(!(n.isMesh||n.isInstancedMesh)||!n.geometry||n.isSprite)return;
        var m=n.material;if(!m||Array.isArray(m)&&!m.length)return;
        var m0=Array.isArray(m)?m[0]:m;if(m0.visible===false||(m0.transparent&&m0.opacity<0.05))return;
        /* ⚠️ GEGENPROBE HAT ES GEFUNDEN: der Wolkenschatten (760 x 760 m, y 0,008) liegt
           ueber jeder Strasse und jeder Wiese — beide Probewagen meldeten "wasser" #162234.
           Durchsichtige Auflagen ohne Tiefenschreiben sind Licht und Schatten, kein Belag. */
        if(n===window._wolkenSchatten||(m0.transparent&&m0.depthWrite===false))return;
        if(istFahrzeugTeil(n,set))return;
        if(n.isInstancedMesh){if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();
          var s9=new THREE.Vector3();n.geometry.boundingBox.getSize(s9);
          if(Math.min(s9.x,s9.y,s9.z)<0.02)immer.push(n);   /* flache Instanzen: Striche, Platten */
          return;}
        bb.setFromObject(n);if(bb.isEmpty())return;
        if(bb.min.y>3)return;                                /* Daecher, Baumkronen, Leitungen */
        var x0=Math.floor(bb.min.x/C),x1=Math.floor(bb.max.x/C),z0=Math.floor(bb.min.z/C),z1=Math.floor(bb.max.z/C);
        if((x1-x0+1)*(z1-z0+1)>4000){immer.push(n);return;} /* Weltflaechen (Rasen, Fernebene) */
        var h=bb.max.y-bb.min.y;
        for(var i=x0;i<=x1;i++)for(var k=z0;k<=z1;k++){var key=i+","+k;(G[key]=G[key]||[]).push({n:n,h:h});}});
      return {G:G,immer:immer,C:C};}
    var _texC={};
    function texMittel(t){
      if(!t||!t.image)return null;var id=t.uuid;if(_texC[id])return _texC[id];
      var c=new THREE.Color(1,1,1);
      try{var cv=document.createElement("canvas");cv.width=cv.height=16;var x=cv.getContext("2d");
        x.drawImage(t.image,0,0,16,16);var d=x.getImageData(0,0,16,16).data,r=0,g=0,b=0;
        for(var i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}
        var n=d.length/4;c.setRGB(r/n/255,g/n/255,b/n/255);}catch(e){}
      _texC[id]=c;return c;}
    function farbe(hit){
      var o=hit.object,m=o.material;if(Array.isArray(m))m=m[(hit.face&&hit.face.materialIndex)||0]||m[0];
      var c=new THREE.Color(1,1,1);if(m&&m.color)c.copy(m.color);
      if(m&&m.map){var t=texMittel(m.map);if(t)c.multiply(t);}
      var ca=o.geometry.attributes&&o.geometry.attributes.color;
      if(ca&&m&&m.vertexColors&&hit.face){var f=hit.face;
        c.r*=(ca.getX(f.a)+ca.getX(f.b)+ca.getX(f.c))/3;c.g*=(ca.getY(f.a)+ca.getY(f.b)+ca.getY(f.c))/3;
        c.b*=(ca.getZ(f.a)+ca.getZ(f.b)+ca.getZ(f.c))/3;}
      if(o.isInstancedMesh&&o.instanceColor&&hit.instanceId!==undefined){
        var ic=new THREE.Color();o.getColorAt(hit.instanceId,ic);c.multiply(ic);}
      return c;}
    function klasse(c){
      var h={};c.getHSL(h);
      if(h.s>0.16&&h.h>0.17&&h.h<0.47&&h.l>0.06)return "gruen";
      if(h.s>0.25&&h.h>0.47&&h.h<0.72)return "wasser";
      if(h.s>0.22&&h.h>=0.03&&h.h<=0.17&&h.l>0.2&&h.l<0.85)return "erde";
      return h.l<0.42?"asphalt":"hell";}
    var RC=new THREE.Raycaster(),DN=new THREE.Vector3(0,-1,0),O=new THREE.Vector3();
    function unten(B,x,z,y){
      var key=Math.floor(x/B.C)+","+Math.floor(z/B.C),L=(B.G[key]||[]).map(function(e){return e.n;}).concat(B.immer);
      O.set(x,y+0.8,z);RC.set(O,DN);RC.far=3.5;
      var H=RC.intersectObjects(L,false);
      for(var i=0;i<H.length;i++){var hi=H[i];
        if(!hi.face)continue;
        var nrm=hi.face.normal.clone().transformDirection(hi.object.matrixWorld);
        if(Math.abs(nrm.y)<0.6)continue;                 /* Waende, Boeschungskanten */
        /* Hoch UND klein = Objekt (Hecke, Mauer, Haus). Hoch und weit = Gelaende: der
           Huegel am Bauernhof ist 170 m hoch gemeldet worden, liegt aber UNTER dem Wagen. */
        var hoch=0;if(!hi.object.isInstancedMesh){var b9=new THREE.Box3().setFromObject(hi.object);
          hoch=b9.max.y-b9.min.y;if(Math.max(b9.max.x-b9.min.x,b9.max.z-b9.min.z)>40)hoch=0;}
        var name=(hi.object.userData&&hi.object.userData.datei)||hi.object.name||"";
        var p=hi.object.parent;while(!name&&p&&p!==scene){name=(p.userData&&p.userData.datei)||p.name||"";p=p.parent;}
        var col=farbe(hi);
        return {k:(hoch>0.7?"objekt":klasse(col)),y:+hi.point.y.toFixed(2),n:name.slice(0,40),
                hex:"#"+col.getHexString(),hoch:+hoch.toFixed(2),rasen:hi.object===rasen};}
      return {k:"nichts",y:null,n:"",hex:"",hoch:0};}
    /* Mitte + vier Ecken im Eigensystem des Wagens */
    function punkte(o){
      o.updateMatrixWorld(true);
      var inv=new THREE.Matrix4().copy(o.matrixWorld).invert(),box=new THREE.Box3(),t=new THREE.Box3(),M=new THREE.Matrix4();
      o.traverse(function(n){if(!n.isMesh||!n.geometry||n.isSprite)return;
        if(n.material&&!Array.isArray(n.material)&&n.material.transparent&&!n.material.depthWrite)return; /* Kontaktschatten */
        if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();
        M.multiplyMatrices(inv,n.matrixWorld);t.copy(n.geometry.boundingBox).applyMatrix4(M);box.union(t);});
      if(box.isEmpty())return null;
      var ax=box.max.x-box.min.x,az=box.max.z-box.min.z,y0=box.min.y,P=[];
      [[0.5,0.5],[0.2,0.2],[0.8,0.2],[0.2,0.8],[0.8,0.8]].forEach(function(f){
        var v=new THREE.Vector3(box.min.x+ax*f[0],y0,box.min.z+az*f[1]).applyMatrix4(o.matrixWorld);P.push(v);});
      var s=new THREE.Vector3();new THREE.Box3().setFromObject(o).getSize(s);
      return {P:P,laenge:+Math.max(s.x,s.z).toFixed(1)};}
    function pruefe(B,e){
      var pk=punkte(e.o);if(!pk)return null;
      var S=pk.P.map(function(v){return unten(B,v.x,v.z,v.y);});
      var gr=S.filter(function(s){return s.k==="gruen"||s.k==="wasser";}).length;
      var er=S.filter(function(s){return s.k==="erde";}).length;
      var ob=S.filter(function(s){return s.k==="objekt";}).length;
      return {art:e.art,datei:e.datei.replace(/[.]glb$/,""),x:+pk.P[0].x.toFixed(1),z:+pk.P[0].z.toFixed(1),
              laenge:pk.laenge,mitte:S[0].k,gruen:gr,erde:er,objekt:ob,proben:S};}
    /* ================= Aufrufe ================= */
    if(was==="gegenprobe"){
      /* Ein Verkehrswagen wird kurz umgesetzt und danach zurueckgestellt. */
      var v=verkehr[0];if(!v)return {fehler:"kein Verkehr"};
      var alt=v.mesh.position.clone(),altR=v.mesh.rotation.y;
      var B=boden(sammeln()),out={};
      /* Der Wiesenplatz wird ueber das RASEN-OBJEKT gefunden, nicht ueber die Farbe —
         sonst pruefte die Gegenprobe den Farbtest mit sich selbst. (Erster Versuch mit
         der Grundstuecksmitte traf das Starthaus: Tisch "Cube156".) */
      out.wiese=null;
      for(var gx=-68;gx<=68&&!out.wiese;gx+=4)for(var gz=-44;gz<=44;gz+=4){
        v.mesh.position.set(gx,v.mesh.position.y,gz);v.mesh.updateMatrixWorld(true);
        var r0=pruefe(B,{o:v.mesh,art:"probe",datei:"wiese"});
        if(r0&&r0.proben.every(function(p){return p.rasen;})){out.wiese=r0;break;}}
      var SZr=GH*CS/2+12;
      v.mesh.position.set(20,v.mesh.position.y,SZr);v.mesh.rotation.y=Math.PI/2;v.mesh.updateMatrixWorld(true);
      out.strasse=pruefe(B,{o:v.mesh,art:"probe",datei:"strasse"});
      v.mesh.position.copy(alt);v.mesh.rotation.y=altR;v.mesh.updateMatrixWorld(true);
      return out;}
    if(was==="stand"){
      var F=sammeln(),B2=boden(F);W.B=B2;
      return F.map(function(e){return pruefe(B2,e);}).filter(Boolean);}
    if(was==="fahrt"){
      /* arg Sekunden Verkehr simulieren; je Sekunde alle Wagen abtasten */
      var B3=W.B||boden(sammeln()),agg={};
      for(var t=0;t<arg;t++){
        for(var q=0;q<20;q++){updVerkehr(0.05);}
        verkehr.forEach(function(v){var r=pruefe(B3,{o:v.mesh,art:"verkehr",datei:v.datei});if(!r)return;
          var ro=v.route||{},key=ro.axis+":"+(ro.z!==undefined?ro.z:ro.x!==undefined?ro.x:ro.r!==undefined?ro.r:ro.g!==undefined?ro.g:"")+" | "+r.datei;
          var a=agg[key]||(agg[key]={n:0,gruen:0,erde:0,objekt:0,bsp:[]});a.n++;
          if(r.gruen>=2||r.mitte==="gruen"){a.gruen++;if(a.bsp.length<4)a.bsp.push([r.x,r.z,r.proben.map(function(p){return p.k[0]+p.hex;}).join(" ")]);}
          if(r.erde>=2)a.erde++;if(r.objekt>=2)a.objekt++;});}
      return agg;}
    if(was==="polizei"){
      /* Wo wuerde ein Streifenwagen erscheinen? Dieselbe Formel wie mkPolizeiAuto,
         fuer mehrere Standorte des Spielers und 24 Winkel. */
      var B4=W.B||boden(sammeln()),res={};
      var ORTE=[["Zuhause",0,0],["Markt",40,96],["Seepark",0,120],["Landstrasse",200,0],["Gewerbe",250,0]];
      /* Seit Runde 92 waehlt polizeiStart() den Ort; die Sonde ruft sie 24x je Standort auf.
         Fehlt sie (aelterer Stand), gilt die alte Formel: 34 m in zufaelligem Winkel. */
      var s0=sims[meinSi()]||sims[0],ax=s0.x,az=s0.z;
      ORTE.forEach(function(o){var z={gruen:0,asphalt:0,hell:0,erde:0,objekt:0,wasser:0,nichts:0,strasse:0};
        s0.x=o[1];s0.z=o[2];
        for(var i=0;i<24;i++){var x,zz;
          if(typeof polizeiStart==="function"){var st=polizeiStart();x=st[0];zz=st[1];}
          else{var a=i/24*6.283;x=o[1]+Math.cos(a)*34;zz=o[2]+Math.sin(a)*34;}
          var u=unten(B4,x,zz,0.05);z[u.k]=(z[u.k]||0)+1;if(gpsStrasse(x,zz))z.strasse++;}
        res[o[0]]=z;});
      s0.x=ax;s0.z=az;
      return res;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 70000 })
const A = (was, arg) => page.evaluate(([w, a]) => window.__th.ab(w, a), [was, arg])

/* 1. Gegenprobe — ohne sie ist der Rest nichts wert */
const G = await A('gegenprobe')
const wk = G.wiese && G.wiese.mitte, sk = G.strasse && G.strasse.mitte
console.log(`Gegenprobe: Wagen auf der Wiese → ${wk} (${G.wiese && G.wiese.proben.map(p => p.k).join(',')}) · auf der Hauptstrasse → ${sk} (${G.strasse && G.strasse.proben.map(p => p.k).join(',')})`)
if (wk !== 'gruen' || sk !== 'asphalt') {
  console.log('💥 GEGENPROBE FEHLGESCHLAGEN — die Farbklassen stimmen nicht, Bericht abgebrochen.')
  console.log(JSON.stringify(G, null, 1).slice(0, 3000))
  await browser.close(); aufraeumen(TMP); process.exit(2)
}

/* 2. Stehende und gerade fahrende Wagen */
const S = await A('stand')
const schlecht = S.filter((r) => r.art !== 'feld' && (r.gruen >= 2 || r.mitte === 'gruen' || r.mitte === 'wasser'))
const erde = S.filter((r) => r.art !== 'feld' && r.erde >= 2 && !schlecht.includes(r))
const objekt = S.filter((r) => r.objekt >= 2)
const nachArt = {}
for (const r of S) { const a = nachArt[r.art] || (nachArt[r.art] = { n: 0, gruen: 0 }); a.n++; if (schlecht.includes(r)) a.gruen++ }
console.log(`\nFahrzeuge gefunden: ${S.length}  ·  ${Object.entries(nachArt).map(([k, v]) => `${k} ${v.n}${v.gruen ? ` (${v.gruen} im Gruenen)` : ''}`).join(' · ')}`)
console.log(`\n🟩 AUF RASEN/WASSER (Mitte gruen oder ≥2 Ecken): ${schlecht.length}`)
for (const r of schlecht) console.log(`   ${r.art.padEnd(8)} ${(r.datei || '(ohne Datei)').padEnd(22)} (${r.x}|${r.z})  L ${r.laenge} m  Mitte ${r.mitte}  Ecken ${r.proben.slice(1).map(p => p.k).join(',')}  ${r.proben[0].hex}`)
console.log(`\n🟫 AUF ERDE/SAND (≥2 Ecken): ${erde.length}`)
for (const r of erde) console.log(`   ${r.art.padEnd(8)} ${(r.datei || '(ohne Datei)').padEnd(22)} (${r.x}|${r.z})  Ecken ${r.proben.map(p => p.k).join(',')}`)
console.log(`\n🧱 IN EINEM OBJEKT (≥2 Proben treffen etwas >0,7 m Hohes): ${objekt.length}`)
for (const r of objekt) console.log(`   ${r.art.padEnd(8)} ${(r.datei || '(ohne Datei)').padEnd(22)} (${r.x}|${r.z})  ${r.proben.filter(p => p.k === 'objekt').map(p => p.n + ' ' + p.hoch + 'm').join(' / ')}`)

/* 3. Verkehr simulieren */
const F = await A('fahrt', 40)
const fz = Object.entries(F).filter(([, a]) => a.gruen > 0).sort((a, b) => b[1].gruen / b[1].n - a[1].gruen / a[1].n)
let summe = 0, gruen = 0
for (const [, a] of Object.entries(F)) { summe += a.n; gruen += a.gruen }
console.log(`\n🚗 VERKEHR, 40 s simuliert: ${gruen} von ${summe} Proben im Gruenen (${(100 * gruen / Math.max(1, summe)).toFixed(1)} %)`)
for (const [k, a] of fz) console.log(`   ${k.padEnd(40)} ${a.gruen}/${a.n}  z. B. ${a.bsp.map((p) => `(${p[0]}|${p[1]} ${p[2]})`).join(' ')}`)

/* 4. Polizei-Einsatzorte */
const P = await A('polizei')
console.log('\n🚓 STREIFENWAGEN-EINSATZORT (34 m um den Spieler, 24 Winkel):')
let pg = 0, pn = 0
for (const [ort, z] of Object.entries(P)) { pg += z.gruen; pn += 24; console.log(`   ${ort.padEnd(12)} gruen ${z.gruen}  asphalt ${z.asphalt}  hell ${z.hell}  erde ${z.erde}  objekt ${z.objekt}  wasser ${z.wasser || 0}  · auf GPS-Strasse ${z.strasse}/24`) }

console.log(`\nKENNZAHLEN: stehend im Gruenen ${schlecht.length} · auf Erde ${erde.length} · in Objekt ${objekt.length} · Verkehr gruen ${(100 * gruen / Math.max(1, summe)).toFixed(1)} % · Polizei-Einsatz gruen ${pg}/${pn}`)
console.log('JS-Fehler:', jsFehler.length, jsFehler.slice(0, 3).join(' | '))
if (JSON_AUS) console.log(JSON.stringify({ S, F, P }, null, 0))
await browser.close()
aufraeumen(TMP)
