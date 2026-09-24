/* Sonde (Runde 98, User: „das geht noch besser und schöne übergang"): wo springt der Bordstein oder
   die Gehwegplatte an einem Übergang oder an einer Einmündung senkrecht?
     node spiele-dev/tools/sonden/probe-stufen.mjs [quelle.html]

   STUFEN: an jeder Lücke, die `bordsteinKante` baut (window._bordLuecken: a, Kante, Seite, von, bis, Art,
   Plattenbreite), ein Höhenprofil ±1,6 m um jede Lückengrenze, alle 5 cm:
     * auf der Steinmitte (Kante + Seite·0,13): Sprung > 4 cm zwischen zwei Proben, einer davon >= 7 cm hoch
       = Stufe im Stein. Liegt im Fenster einer Einmündung Boden unter -3 cm (Wiese, Fernebene), zählt das
       als LOCH neben dem Steinende, nicht als Stufe.
     * alt:       (12 → 3 cm an einer Absenkung, 12 cm → Fahrbahn an einer Einmündung). Die 3-cm-Kante am Ende
       einer Absenkung (Anschlag für den Blindenstock, gegen die Fahrbahn auf −0,003 also 3,3–3,6 cm)
       liegt darunter und zählt nicht — mit 3,5 cm zählte sie noch.
     * bei "ab" zusätzlich auf der Plattenmitte: Sprung > 2 cm = Stufe in der Gehwegplatte (6 → 3 cm).
   Höhe = höchster Strahltreffer unter 0,25 m auf FLACHEN Dingen (Weltkasten < 0,3 m hoch): Fahrbahn,
   Platten, Steine, Felder, Streifen — keine Autos, Menschen, Pfähle.
   ECKEN: die 16 Fahrbahnecken der vier Hauptkreuzungen (±78 | ±58). Von der Ecke P (Bordsteinkanten
   Quer ±4,92 bzw. Zubringer ±4,5, Haupt ±7,92) die Diagonale in den Gehweg-Quadranten hinein: ab welcher
   Entfernung steht der Stein (≥ 9 cm)? Scharfe Ecke ≈ 0, Rundung mit Radius R: (√2 − 1)·R.
   GEGENPROBE: ein künstlicher 12-cm-Klotz (0,5 m) mitten auf die erste Absenkung muss 2 Stufen mehr
   ergeben. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_stufen_tmp.html'
mitSonden(quelle, {
  mess: `function(gegen,nurK){var B=window._bordLuecken||[];if(nurK!==undefined&&nurK!==null)B=B.filter(function(e){return Math.abs(e[1]-nurK)<0.01;});
    var flach=[];scene.updateMatrixWorld(true);
    /* ⚠️ Durchsichtiges zaehlt nicht (erster Lauf: ein Schattenfleck auf 0,14 m ueber dem Stein erzeugte an jeder
       Absenkung eine „Stufe" 0,14 → 0,03 — der hoechste Treffer war der Fleck, nicht der Stein). */
    scene.traverse(function(o){if(!o.isMesh||!o.geometry||o.isSprite)return;var mt=Array.isArray(o.material)?o.material[0]:o.material;
      if(mt&&(mt.transparent||mt.depthWrite===false||mt.opacity<0.99))return;
      /* Modelle (bau(): userData.datei an einem Vorfahren) sind kein Boden — der 18-cm-Sockel einer Parklaterne
         auf der abgesenkten Platte zaehlte sonst als Plattenstufe (Chilbiplatz (-6|351)). */
      for(var pa=o.parent;pa&&pa!==scene;pa=pa.parent)if(pa.userData&&pa.userData.datei)return;
      var b=new THREE.Box3().setFromObject(o);if(b.isEmpty()||b.max.y-b.min.y>0.3||b.max.y>0.3)return;flach.push([o,b]);});
    var klotz=null;
    /* Klotz 0,8 m hinter der ersten Grenze, die gemessen wird (nicht am Bandende) — die Mitte einer 5,4-m-
       Absenkung laege ausserhalb der ±1,6-m-Fenster */
    if(gegen){var ab=B.filter(function(e){return e[5]==="ab"&&e[3]>e[7]+0.05;})[0];
      if(ab){var m=ab[3]+0.8,q=ab[1]+ab[2]*0.13;klotz=new THREE.Mesh(new THREE.BoxGeometry(ab[0]==="z"?0.5:0.26,0.12,ab[0]==="z"?0.26:0.5),new THREE.MeshBasicMaterial());
        klotz.position.set(ab[0]==="z"?m:q,0.06,ab[0]==="z"?q:m);scene.add(klotz);klotz.updateMatrixWorld(true);flach.push([klotz,new THREE.Box3().setFromObject(klotz)]);}}
    var RC=new THREE.Raycaster();RC.camera=camera;var V=new THREE.Vector3(0,-1,0),NAH=[];
    /* nur Dinge im Fenster (Weltkasten schneidet es) — sonst prueft jeder Strahl tausende Kaesten */
    function fenster(x0,x1,z0,z1){NAH=flach.filter(function(f){var b=f[1];return b.max.x>=x0&&b.min.x<=x1&&b.max.z>=z0&&b.min.z<=z1;}).map(function(f){return f[0];});}
    function h(x,z){RC.set(new THREE.Vector3(x,1,z),V);RC.far=2;var H=RC.intersectObjects(NAH,false),m=-1;
      H.forEach(function(t){if(t.point.y<0.25&&t.point.y>m)m=t.point.y;});return m;}
    function profil(a,q,t0,t1){if(a==="z")fenster(t0,t1,q-0.1,q+0.1);else fenster(q-0.1,q+0.1,t0,t1);
      /* Raster um 1,25 cm versetzt: Naehte (Keil|Stein) liegen auf Vielfachen von 5 cm, ein Strahl genau auf der
         Naht trifft keins von beiden und meldete zwei falsche Stufen (Profil …0,115 0,05 0,12…). */
      var P=[];for(var t=t0+0.0125;t<=t1+1e-9;t+=0.05)P.push(a==="z"?h(t,q):h(q,t));return P;}
    /* Stufe = senkrechte Flaeche eines HOHEN Steins (einer der beiden Nachbarn >= 7 cm) — das 3-cm-Ende eines
       ausgelaufenen Steins neben tiefer liegendem Boden ist keine Stufe, sondern ein Loch (eigene Zahl). */
    function stufen(P,grenze,hoch){var n=0;for(var i=1;i<P.length;i++)if(Math.abs(P[i]-P[i-1])>grenze&&(hoch===undefined||Math.max(P[i],P[i-1])>=hoch))n++;return n;}
    function loch(P){for(var i=0;i<P.length;i++)if(P[i]<-0.03&&P[i]>-0.5)return 1;return 0;}
    var r={luecken:B.length,ab:0,frei:0,stein:0,platte:0,steinAb:0,steinFrei:0,loch:0,loecher:[],beispiele:[]};
    B.forEach(function(e){var a=e[0],kante=e[1],sg=e[2],g0=e[3],g1=e[4],art=e[5],pb=e[6],von=e[7],bis=e[8];
      if(art==="ab")r.ab++;else r.frei++;
      [g0,g1].forEach(function(xb){if(xb<=von+0.05||xb>=bis-0.05)return;   /* Lueckengrenze am Bandende: kein Nachbarstein */
        var PS=profil(a,kante+sg*0.13,xb-1.6,xb+1.6),s=stufen(PS,0.04,0.07);
        if(art==="frei"&&loch(PS)){r.loch++;if(r.loecher.length<14)r.loecher.push("("+(a==="z"?xb.toFixed(1)+"|"+kante.toFixed(1):kante.toFixed(1)+"|"+xb.toFixed(1))+")");}
        if(s&&(r.profile=r.profile||[]).length<3)r.profile.push([a,kante+"/"+sg,xb,PS.map(function(v){return +v.toFixed(3);}).join(" ")]);
        r.stein+=s;if(art==="ab")r.steinAb+=s;else r.steinFrei+=s;
        /* Platte nur, wo auf der anderen Seite der Grenze Gehweg liegt: stoesst die Absenkung an eine andere
           Luecke derselben Steinlinie (Einmuendung, zweite Absenkung), laeuft die Messlinie dort auf die Fahrbahn
           — die 3-cm-Kante zur Fahrbahn ist gewollt, keine Plattenstufe. */
        var stoesst=B.some(function(o){return o!==e&&o[0]===a&&Math.abs(o[1]-kante)<0.01&&o[2]===sg&&(Math.abs(o[3]-xb)<0.01||Math.abs(o[4]-xb)<0.01);});
        var sp=0;if(art==="ab"&&!stoesst){var PP=profil(a,kante+sg*(0.26+pb/2),xb-1.6,xb+1.6);sp=stufen(PP,0.02);r.platte+=sp;
          if(sp&&(r.profile=r.profile||[]).length<3)r.profile.push([a,kante+"/"+sg+"/Platte",xb,PP.map(function(v){return +v.toFixed(3);}).join(" ")]);}
        if((s||sp)&&r.beispiele.length<12)r.beispiele.push([a,+kante.toFixed(2),+xb.toFixed(1),art,s,sp]);});});
    /* Ecken der Hauptkreuzungen */
    var E=[];[78,-78].forEach(function(xc){[58,-58].forEach(function(zc){[-1,1].forEach(function(ex){[-1,1].forEach(function(ez){
      var stadt=(ez===-Math.sign(zc)),w=stadt?4.92:4.5,px=xc+ex*w,pz=zc+ez*7.92,d=-1;
      fenster(Math.min(px,px+ex*2.2)-0.1,Math.max(px,px+ex*2.2)+0.1,Math.min(pz,pz+ez*2.2)-0.1,Math.max(pz,pz+ez*2.2)+0.1);
      for(var s=0;s<=3;s+=0.05){var y=h(px+ex*s/Math.SQRT2,pz+ez*s/Math.SQRT2);if(y>=0.09){d=s;break;}}
      E.push([xc,zc,ex,ez,+d.toFixed(2)]);});});});});
    r.ecken=E;r.lEcken=window._lEcken||[];if(klotz)scene.remove(klotz);
    /* URSPRUNG: lodAufbau blendet nach dem Ursprung des Netzes aus. Liegt er weit neben der Form (Weltkoordinaten in
       der Geometrie), verschwindet das Teil aus der Ferne — die Strahlen dieser Sonde saehen es trotzdem. Geprueft an
       allen Teilen von Runde 98 (userData.r98). */
    var falsch=null;if(gegen){var fg=new THREE.BoxGeometry(1,0.1,1);fg.translate(50,0,50);falsch=new THREE.Mesh(fg,new THREE.MeshBasicMaterial());
      falsch.userData.r98=1;scene.add(falsch);falsch.updateMatrixWorld(true);}   /* Gegenprobe: Form bei (50|50), Ursprung bei (0|0) */
    var nT=0,weit=[],v3=new THREE.Vector3();scene.traverse(function(o){if(!o.isMesh||!o.userData||!o.userData.r98)return;nT++;
      var b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3()),e=o.matrixWorld.elements,d=Math.hypot(c.x-e[12],c.z-e[14]);
      if(d>5&&weit.length<200)weit.push([+c.x.toFixed(1),+c.z.toFixed(1),+d.toFixed(1)]);});
    if(falsch)scene.remove(falsch);r.teile=nT;r.weit=weit;return r;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(8000)
const NUR = process.env.KANTE !== undefined ? +process.env.KANTE : null   /* nur Luecken dieser Kante (Fehlersuche) */
const r = await page.evaluate((k) => window.__th.mess(false, k), NUR)
const g = await page.evaluate(() => window.__th.mess(true))
await browser.close(); aufraeumen(TMP)
console.log(`Luecken ${r.luecken} (abgesenkt ${r.ab}, Einmuendung ${r.frei})`)
console.log(`STUFEN im Stein: ${r.stein} (an Absenkungen ${r.steinAb}, an Einmuendungen ${r.steinFrei}) · in der Platte: ${r.platte}`)
console.log(`LOCH neben dem Steinende (Boden unter Fahrbahnhoehe im Fenster, nur Einmuendungen): ${r.loch}  ${r.loecher.join(' ')}`)
for (const b of r.beispiele) console.log('   ', JSON.stringify(b), '[a, Kante, Grenze, Art, Stufen Stein, Stufen Platte]')
const rund = r.ecken.filter((e) => e[4] >= 0.8).length
if (process.env.PROFIL) for (const p of r.profile || []) console.log('PROFIL', p[0], p[1], p[2], '\n  ', p[3])
console.log(`ECKEN der Hauptkreuzungen: gerundet (Stein erst >= 0,8 m auf der Diagonale) ${rund} von ${r.ecken.length}`)
console.log('   ', r.ecken.map((e) => `(${e[0]}|${e[1]} ${e[2] > 0 ? 'O' : 'W'}${e[3] > 0 ? 'S' : 'N'}) ${e[4]}`).join('  '))
console.log(`L-KNICKE mit Aussenkurve: ${(r.lEcken || []).length}  ${(r.lEcken || []).map((e) => '(' + e[0] + '|' + e[1] + ')').join(' ')}`)
console.log(`URSPRUNG: ${r.teile} Teile von Runde 98, davon mit Ursprung > 5 m neben der Form: ${r.weit.length}${r.weit.length ? '  z.B. ' + r.weit.slice(0, 4).map((w) => `(${w[0]}|${w[1]}) ${w[2]} m`).join(' ') : ''}`)
console.log(`GEGENPROBE (12-cm-Klotz auf der ersten Absenkung): Stufen ${r.stein} -> ${g.stein} ${g.stein >= r.stein + 2 ? '✓ schlaegt an' : '✗ Messgeraet stumm'}`)
console.log(`GEGENPROBE (Teil mit Form bei (50|50), Ursprung (0|0)): Ursprung-Befunde ${r.weit.length} -> ${g.weit.length} ${g.weit.length === r.weit.length + 1 ? '✓ schlaegt an' : '✗ Messgeraet stumm'}`)
