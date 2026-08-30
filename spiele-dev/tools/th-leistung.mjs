/* th-leistung.mjs — misst, was das Spiel den Grafikchip kostet.
 *
 * ⚠️ Die BILDRATE hier ist wertlos: dieser Container rendert in Software.
 * Aussagekräftig sind die geräteunabhängigen Zahlen — Zeichenaufrufe, Dreiecke,
 * Texturen, Programme, bewegte Objekte. Genau die entscheiden auf dem Handy.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_leistung_probe.html'
mitSonden('traumhaus.html', {
  leistung: `function(was){
    if(was==="info"){var r=renderer.info;
      var lichter=0,meshes=0,inst=0,instTeile=0,transparent=0,schatten=0,bewegt=0,mats={};
      scene.traverse(function(o){
        if(o.isLight)lichter++;
        if(o.isInstancedMesh){inst++;instTeile+=o.count;}
        else if(o.isMesh)meshes++;
        if(o.isMesh){
          if(o.castShadow)schatten++;
          if(o.matrixAutoUpdate)bewegt++;
          var m=o.material;(Array.isArray(m)?m:[m]).forEach(function(mm){
            if(!mm)return; if(mm.transparent)transparent++;
            mats[mm.uuid]=1;});}
      });
      return {zeichenaufrufe:r.render.calls, dreiecke:r.render.triangles,
        geometrien:r.memory.geometries, texturen:r.memory.textures,
        programme:renderer.info.programs?renderer.info.programs.length:0,
        lichter:lichter, meshes:meshes, instanzMeshes:inst, instanzTeile:instTeile,
        transparenteMeshes:transparent, schattenwerfer:schatten,
        nichtEingefroren:bewegt, materialien:Object.keys(mats).length,
        schattenkarte:renderer.shadowMap.enabled?sun.shadow.mapSize.width:0,
        pixelVerhaeltnis:renderer.getPixelRatio(),
        mobil:(typeof _mobil!=="undefined")?_mobil:null};}
    if(was==="glowsNacht"){ /* Gegenprobe: nachts muessen die Kegel wieder da sein */
      var G=window._lampGlows||[];
      G.forEach(function(gm){gm.opacity=0.26;gm.visible=true;});
      var t=[];scene.traverse(function(o){if(o.isMesh&&o.material&&G.indexOf(o.material)>=0)t.push(o);});
      var gez=0,ges=[];
      t.forEach(function(o){ges.push([o,o.onBeforeRender]);o.onBeforeRender=function(){gez++;};});
      renderer.render(scene,camera);
      ges.forEach(function(x){x[0].onBeforeRender=x[1];});
      G.forEach(function(gm){gm.opacity=0;gm.visible=false;});   /* zurueck auf Tag */
      return {nachtsGezeichnet:gez, kegel:t.length};}
    if(was==="glows"){
      var G=window._lampGlows||[];
      /* Die Liste enthaelt MATERIALIEN, nicht Meshes — Traeger dazu suchen */
      var traeger=[];scene.traverse(function(o){if(o.isMesh&&o.material&&G.indexOf(o.material)>=0)traeger.push(o);});
      return {materialien:G.length, meshes:traeger.length,
              sichtbar:traeger.filter(function(m){return m.visible;}).length,
              deckkraft0:G.filter(function(m){return (m.opacity||0)===0;}).length};}
    if(was==="durchsicht"){ /* Transparente Flaechen: wie viele werden WIRKLICH gezeichnet? */
      var liste=[],gesetzt=[];
      var haken=function(){var m=this.material;
        if(m&&m.transparent)liste.push({
          farbe:m.color?"#"+m.color.getHexString():"?",
          hatTextur:!!m.map, y:+this.position.y.toFixed(3),
          renderOrder:this.renderOrder, nie:!!(this.userData&&this.userData.nieAusblenden),
          n:this.name||(this.userData&&this.userData.datei)||this.geometry.type,
          op:+(m.opacity||0).toFixed(2), tief:!!m.depthWrite,
          misch:m.blending===THREE.AdditiveBlending?"additiv":"normal",
          flaeche:this.geometry.boundingSphere?Math.round(this.geometry.boundingSphere.radius):0,
          elt:(this.parent&&((this.parent.userData&&this.parent.userData.datei)||this.parent.name))||""});};
      scene.traverse(function(o){if(o.isMesh&&o.visible){gesetzt.push([o,o.onBeforeRender]);o.onBeforeRender=haken;}});
      renderer.render(scene,camera);
      gesetzt.forEach(function(x){x[0].onBeforeRender=x[1];});
      liste.sort(function(a,b){return b.flaeche-a.flaeche;});
      return {transparentGezeichnet:liste.length, liste:liste};}
    if(was==="upd"){ /* CPU-Kosten je Aktualisierungsfunktion, 60 Durchlaeufe */
      var N=60,aus=[],now=performance.now();
      function miss(name,fn){
        try{fn();}catch(e){return;}                 /* einmal warmlaufen */
        var t0=performance.now();
        for(var i=0;i<N;i++){try{fn();}catch(e){}}
        aus.push({n:name,ms:+((performance.now()-t0)/N).toFixed(3)});}
      miss("updVerkehr",function(){updVerkehr(0.016);});
      miss("updSims",function(){if(typeof updSims==="function")updSims(0.016);});
      miss("updFussg",function(){if(typeof updFussg==="function")updFussg(0.016);});
      miss("updEnten",function(){updEnten(0.016,now);});
      miss("updMinimap",function(){_mmT=0;updMinimap(0.016);});
      miss("gruppenSicht",function(){gruppenSicht();});
      miss("lodTakt",function(){var p=spielerPos();lodTakt(p.x,p.z);});
      miss("updLampPool",function(){window._lampPoolT=0;updLampPool(0.016);});
      miss("updFahrgeschaefte",function(){updFahrgeschaefte(0.016);});
      miss("render",function(){renderer.render(scene,camera);});
      aus.sort(function(a,b){return b.ms-a.ms;});
      return aus;}
    if(was==="speichern"){ /* Wie teuer ist der 6-Sekunden-Speicherlauf? */
      var t0,t1,proben=[],groesse=0,teile={};
      for(var k=0;k<5;k++){
        t0=performance.now();var snap=snapshot();var txt=JSON.stringify(snap);
        try{localStorage.setItem("_messung",txt);}catch(e){}
        t1=performance.now();proben.push(+(t1-t0).toFixed(1));groesse=txt.length;}
      try{localStorage.removeItem("_messung");}catch(e){}
      /* Welcher Teil des Spielstands ist der groesste? */
      var snap2=snapshot();
      Object.keys(snap2).forEach(function(k2){
        try{teile[k2]=JSON.stringify(snap2[k2]).length;}catch(e){teile[k2]=0;}});
      var gross=Object.keys(teile).sort(function(a,b){return teile[b]-teile[a];}).slice(0,6);
      proben.sort(function(a,b){return a-b;});
      return {ms:proben, median:proben[2], zeichen:groesse,
              groessteFelder:gross.map(function(k3){return k3+":"+teile[k3];})};}
    if(was==="gezeichnet"){ /* WAS wird tatsaechlich gezeichnet? Renderliste mitschreiben */
      var liste=[];
      var alt=renderer.render;
      /* Ein Durchlauf mit Mitschrift: onBeforeRender feuert je gezeichnetem Objekt. */
      var haken=function(r,sc,cam,geo,mat,grp){
        liste.push({n:this.name||(this.userData&&this.userData.datei)||this.geometry.type,
          tri:(this.geometry.index?this.geometry.index.count/3:this.geometry.attributes.position.count/3)|0,
          inst:this.isInstancedMesh?this.count:0,
          elt:(this.parent&&((this.parent.userData&&this.parent.userData.datei)||this.parent.name))||""});};
      var gesetzt=[];
      scene.traverse(function(o){if(o.isMesh&&o.visible){gesetzt.push([o,o.onBeforeRender]);o.onBeforeRender=haken;}});
      renderer.render(scene,camera);
      gesetzt.forEach(function(p){p[0].onBeforeRender=p[1];});
      /* Nach Herkunft buendeln */
      var proQuelle={};
      liste.forEach(function(x){var k=x.elt||x.n;proQuelle[k]=(proQuelle[k]||0)+1;});
      var top=Object.keys(proQuelle).sort(function(a,b){return proQuelle[b]-proQuelle[a];});
      return {gezeichnet:liste.length,
              top:top.slice(0,12).map(function(k){return proQuelle[k]+"x "+k.slice(0,40);})};}
    if(was==="versteckt"){ /* Welche Gebaeude sind absichtlich unsichtbar — VOR meiner Pruefung? */
      var G=window._gebaeude||[],aus=[],box=new THREE.Box3(),V=new THREE.Vector3();
      /* Sichtpruefung kurz aussetzen und den Rohzustand ablesen */
      var alt=renderer.shadowMap.enabled;renderer.shadowMap.enabled=true;
      G.forEach(function(w,i){if(!w.visible){box.setFromObject(w);box.getCenter(V);
        aus.push({i:i,d:(w.userData&&w.userData.datei)||w.name||"?",
                  x:Math.round(V.x),z:Math.round(V.z),
                  nie:!!(w.userData&&w.userData.nieAusblenden)});}});
      renderer.shadowMap.enabled=alt;
      return {unsichtbar:aus.length, liste:aus.slice(0,10)};}
    if(was==="gebaeude"){ /* Wie viele Meshes stecken in den geladenen Gebaeuden? */
      var G=window._gebaeude||[],gesamt=0,gross=[],box=new THREE.Box3(),V=new THREE.Vector3();
      G.forEach(function(w){var n=0;w.traverse(function(c){if(c.isMesh)n++;});gesamt+=n;
        if(n>=40){box.setFromObject(w);box.getCenter(V);
          gross.push({n:n,d:(w.userData&&w.userData.datei)||w.name||"?",
                      x:Math.round(V.x),z:Math.round(V.z)});}});
      gross.sort(function(a,b){return b.n-a.n;});
      /* Wie weit ist der Bestand vom Spieler entfernt? */
      var me=sims[meinSi()],nah=0,fern=0;
      G.forEach(function(w){box.setFromObject(w);box.getCenter(V);
        var d=Math.hypot(V.x-me.x,V.z-me.z);
        if(d<120)nah++;else fern++;});
      return {gruppen:G.length, meshesInGebaeuden:gesamt,
              naeherAls120m:nah, weiterWeg:fern,
              groesste:gross.slice(0,6)};}
    if(was==="sicht"){ /* Wie viel Szene laeuft pro Bild ueberhaupt durch die Pruefung? */
      var sichtbar=0,unsichtbar=0,tiefe=0,maxTiefe=0,culled=0,nichtCulled=0;
      var unsichtbareTeilbaeume=0,darunter=0;
      (function lauf(o,d){
        if(d>maxTiefe)maxTiefe=d;
        for(var i=0;i<o.children.length;i++){var c=o.children[i];tiefe++;
          if(!c.visible){unsichtbar++;
            /* Ein unsichtbarer Teilbaum wird von three.js gar nicht erst betreten —
               das ist der billigste Fall. Zaehlen, wie viel dadurch wegfaellt. */
            var n=0;c.traverse(function(){n++;});
            unsichtbareTeilbaeume++;darunter+=n-1;continue;}
          sichtbar++;
          if(c.isMesh){if(c.frustumCulled)culled++;else nichtCulled++;}
          lauf(c,d+1);}
      })(scene,0);
      return {sichtbareKnoten:sichtbar, unsichtbareKnoten:unsichtbar,
              unsichtbareTeilbaeume:unsichtbareTeilbaeume, dahinterVerborgen:darunter,
              maxTiefe:maxTiefe,
              meshMitCulling:culled, meshOhneCulling:nichtCulled};}
    /* ⚠️ NICHT MEHR NACH "visible" FRAGEN — DER BESITZER IST UMGEZOGEN (#2447).
       Frueher entschied der Pool selbst, welche Laterne sichtbar ist. Heute sagt er nur
       noch WO und WIE HELL; ueber "visible" entscheidet der LAMP_MAX-Deckel in der
       Bildschleife. Diese Sonde ruft updLampPool direkt auf, ohne dass ein Bild
       laeuft — "visible" ist danach ein Wert von vorhin, und die Pruefung meldete
       "Schaltverhalten falsch" bei einwandfreiem Schalten.
       GEMESSEN ueber die Uhr statt ueber die Sonde (22:00 / 12:00 / 01:00, je 5 s
       laufende Bildschleife): nachts 8 von 8 hell und 5 sichtbar, tags 0 hell und
       0 sichtbar — genau richtig. Gefragt wird jetzt nach der HELLIGKEIT, das ist die
       Ausgabe des Pools. Wie viele davon brennen duerfen, ist Sache von th-licht. */
    if(was==="nacht"){ /* Nacht erzwingen und pruefen, ob die Laternen wirklich leuchten */
      window._dorfNacht=true;window._lampPoolT=0;
      camTx=0;camTz=58;                    /* Kamera an eine Laternenkette */
      updLampPool(0.5);
      var P=(window._lampPool||[]);
      return {an:P.filter(function(L){return L.visible;}).length,
              hell:P.filter(function(L){return L.intensity>0;}).length,
              orte:P.filter(function(L){return L.visible;}).slice(0,3)
                    .map(function(L){return [Math.round(L.position.x),Math.round(L.position.z)];})};}
    if(was==="tag"){ /* zurueck auf Tag */
      window._dorfNacht=false;window._lampPoolT=0;updLampPool(0.5);
      var P2=(window._lampPool||[]);
      return {an:P2.filter(function(L){return L.visible;}).length,
              hell:P2.filter(function(L){return L.intensity>0;}).length};}
    if(was==="detail"){
      var lichter=[],matTyp={},matGleich={},schattenAn=renderer.shadowMap.enabled;
      scene.traverse(function(o){
        if(o.isLight){var pool=(window._lampPool||[]).indexOf(o)>=0;
          lichter.push({typ:o.type,an:o.visible,int:+(o.intensity||0).toFixed(2),
            pool:pool, name:o.name||"", eltern:o.parent===scene?"scene":(o.parent.name||o.parent.type),
            pos:[Math.round(o.position.x),Math.round(o.position.z)]});}
        if(o.isMesh){var m=o.material;(Array.isArray(m)?m:[m]).forEach(function(mm){
          if(!mm)return;matTyp[mm.type]=(matTyp[mm.type]||0)+1;
          /* Wie viele Materialien sind INHALTLICH gleich? Signatur aus den Werten,
             die den Zustandswechsel bestimmen. */
          var sig=[mm.type,mm.color&&mm.color.getHexString(),mm.map?mm.map.uuid:0,
                   mm.transparent?1:0,mm.roughness,mm.metalness,mm.side,mm.opacity].join("|");
          matGleich[sig]=(matGleich[sig]||0)+1;});}
      });
      var mehrfach=Object.keys(matGleich).filter(function(k){return matGleich[k]>1;});
      mehrfach.sort(function(a,b){return matGleich[b]-matGleich[a];});
      var aktiv=lichter.filter(function(l){return l.an;});
      var leer=aktiv.filter(function(l){return l.int===0;});
      return {schattenAn:schattenAn, lichterGesamt:lichter.length,
        imShader:aktiv.length, davonWirkungslos:leer.length, lichter:lichter,
        materialTypen:matTyp,
        verschiedeneSignaturen:Object.keys(matGleich).length,
        top5Dubletten:mehrfach.slice(0,5).map(function(k){return matGleich[k]+"x "+k.slice(0,52);}),
        einsparbar:mehrfach.reduce(function(a,k){return a+matGleich[k]-1;},0)};}
    if(was==="weltpos"){ /* Weltposition der beweglichen Dinge — bewegt sie sich WIRKLICH? */
      var V=new THREE.Vector3(),aus={};
      function w(name,o){if(!o)return;o.getWorldPosition(V);aus[name]=[+V.x.toFixed(3),+V.y.toFixed(3),+V.z.toFixed(3)];}
      w("auto0",(verkehr[0]||{}).mesh); w("auto1",(verkehr[1]||{}).mesh);
      /* ⚠️ Drei Sonden waren falsch, nicht der Code:
         - sims[0] ist der SPIELER: ohne Eingabe steht er zu Recht. Mia (sims[1])
           laeuft von selbst.
         - ENTEN.teile[0] ist der Instanz-CONTAINER, der sich nie bewegt; die Enten
           stecken in seinen Instanzmatrizen.
         - Ein Kind auf der Drehachse behaelt seine Weltposition, auch wenn es dreht —
           dafuer muss man die Rotation der Weltmatrix ansehen. */
      w("mia",(sims[1]||{}).mesh);
      var M0=new THREE.Matrix4();ENTEN.teile[0].getMatrixAt(0,M0);
      aus.ente=[+M0.elements[12].toFixed(3),+M0.elements[14].toFixed(3)];
      var F=(typeof FAHRTEN!=="undefined")?FAHRTEN:[];
      var rr=F.filter(function(f){return f.typ==="riesenrad";})[0];
      if(rr&&rr.rotor){aus.riesenradRotor=[+rr.rotor.rotation.z.toFixed(4)];
        if(rr.rotor.children[0]){rr.rotor.children[0].getWorldPosition(V);
          aus.riesenradGondel=[+V.x.toFixed(3),+V.y.toFixed(3),+V.z.toFixed(3)];}}
      var ka=F.filter(function(f){return f.typ==="karussell";})[0];
      if(ka&&ka.w&&ka.w.children[0]){var e=ka.w.children[0].matrixWorld.elements;
        aus.karussellDrehung=[+e[0].toFixed(4),+e[2].toFixed(4)];}
      if(window._zug&&window._zug.mesh)w("zug",window._zug.mesh);
      return aus;}
    if(was==="beweger"){ /* Zustand aller Systeme, die sich bewegen sollen */
      function zu(o){return o?{auto:o.matrixAutoUpdate,bewegt:!!o._bewegt,top:o.parent===scene}:null;}
      return {
        verkehr: (verkehr||[]).slice(0,3).map(function(v){return zu(v.mesh);}),
        bus: zu(typeof busRec!=="undefined"&&busRec?busRec.mesh:null),
        sims: (sims||[]).map(function(s2){return zu(s2.mesh);}),
        fussg: (typeof fussg!=="undefined"?fussg:[]).slice(0,2).map(function(f){return zu(f.mesh);}),
        zug: zu((window._zug||{}).mesh), heli: zu((window._heli||{}).mesh),
        coasterZug: zu((window._coaster||{}).zug),
        entenTeile: (ENTEN.teile||[]).map(zu)
      };}
    if(was==="fahrt"){ /* Drehen die Fahrgeschaefte auch SICHTBAR? */
      if(typeof FAHRTEN==="undefined")return "keine FAHRTEN";
      return FAHRTEN.filter(function(f){return f.w;}).map(function(f){
        var m=f.w.matrixWorld.elements;
        return {typ:f.typ, rot:+f.w.rotation.y.toFixed(3),
                autoUpdate:f.w.matrixAutoUpdate, bewegt:!!f.w._bewegt,
                m0:+m[0].toFixed(4), m2:+m[2].toFixed(4)};});}
    if(was==="frost"){ /* Wie tief greift das Einfrieren wirklich? */
      var oben=0,obenFrei=0,tief=0,tiefFrei=0;
      scene.children.forEach(function(o){
        oben++; if(o.matrixAutoUpdate)obenFrei++;
        o.traverse(function(c){if(c===o)return;tief++;if(c.matrixAutoUpdate)tiefFrei++;});});
      return {topLevel:oben, topLevelOffen:obenFrei, nachfahren:tief, nachfahrenOffen:tiefFrei,
              gemeldet:window._eingefroren||0};}
    if(was==="teuerste"){ /* Welche Objekte kosten die meisten Dreiecke? */
      var L=[];
      scene.traverse(function(o){
        if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;
        var n=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;
        if(o.isInstancedMesh)n*=o.count;
        if(n>3000)L.push({n:Math.round(n), name:(o.name||(o.userData&&o.userData.datei)||o.geometry.type),
          inst:o.isInstancedMesh?o.count:0, sichtbar:o.visible});});
      L.sort(function(a,b){return b.n-a.n;});return L.slice(0,14);}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000, viewport: { width: 844, height: 390 } })
const info = await page.evaluate(() => window.__th.leistung('info'))
console.log('=== Geräteunabhängige Kennzahlen (Querformat 844×390) ===')
for (const [k, v] of Object.entries(info)) console.log(`  ${k.padEnd(20)} ${v}`)
const gl = await page.evaluate(() => window.__th.leistung('glows'))
const gn = await page.evaluate(() => window.__th.leistung('glowsNacht'))
console.log('=== Laternen-Lichtkegel ===')
console.log(`  nachts gezeichnet: ${gn.nachtsGezeichnet} von ${gn.kegel}`)
console.log(`  ${gl.materialien} Materialien · ${gl.meshes} Meshes · ${gl.sichtbar} sichtbar · ${gl.deckkraft0} mit Deckkraft 0`)

console.log('\n=== Transparente Flaechen im Bild ===')
const tr = await page.evaluate(() => window.__th.leistung('durchsicht'))
console.log('  transparent gezeichnet:', tr.transparentGezeichnet)
tr.liste.forEach(x => console.log(`    r${String(x.flaeche).padStart(4)} y=${String(x.y).padStart(7)} ${x.misch.padEnd(7)} op=${x.op} tiefe=${x.tief} ${x.hatTextur?'Textur':'Farbe '+x.farbe} · ${x.n}`))

console.log('\n=== CPU-Kosten je Aktualisierung (Mittel aus 60 Läufen) ===')
const up = await page.evaluate(() => window.__th.leistung('upd'))
up.forEach(x => console.log(`  ${String(x.ms).padStart(8)} ms  ${x.n}`))

console.log('\n=== Der 6-Sekunden-Speicherlauf ===')
const sp = await page.evaluate(() => window.__th.leistung('speichern'))
console.log(`  Dauer je Lauf: ${sp.ms.join(' / ')} ms · Median ${sp.median} ms`)
console.log(`  Spielstand: ${(sp.zeichen/1024).toFixed(0)} KB · grösste Felder: ${sp.groessteFelder.join(', ')}`)

console.log('\n=== Woraus bestehen die Zeichenaufrufe? ===')
const gz = await page.evaluate(() => window.__th.leistung('gezeichnet'))
console.log('  tatsächlich gezeichnete Meshes:', gz.gezeichnet)
gz.top.forEach(t => console.log('   ', t))

console.log('\n=== Absichtlich unsichtbare Gebaeude ===')
const vs = await page.evaluate(() => window.__th.leistung('versteckt'))
console.log('  aktuell unsichtbar:', vs.unsichtbar)
vs.liste.forEach(x => console.log(`    ${x.d} @ ${x.x}|${x.z}${x.nie ? ' (nieAusblenden)' : ''}`))

console.log('\n=== Die geladenen Gebaeude ===')
const gb = await page.evaluate(() => window.__th.leistung('gebaeude'))
console.log(`  ${gb.gruppen} Gruppen mit zusammen ${gb.meshesInGebaeuden} Meshes`)
console.log(`  naeher als 120 m: ${gb.naeherAls120m} · weiter weg: ${gb.weiterWeg}`)
gb.groesste.forEach(g => console.log(`    ${String(g.n).padStart(5)} Meshes  ${g.d} @ ${g.x}|${g.z}`))

console.log('\n=== Was laeuft pro Bild durch die Szene? ===')
const si = await page.evaluate(() => window.__th.leistung('sicht'))
for (const [k, v] of Object.entries(si)) console.log(`  ${k.padEnd(24)} ${v}`)

console.log('\n=== Laternen: Tag/Nacht-Gegenprobe ===')
const nacht = await page.evaluate(() => window.__th.leistung('nacht'))
console.log('  Nacht  — sichtbar:', nacht.an, '· mit Intensität:', nacht.hell, '· Orte:', JSON.stringify(nacht.orte))
const tag = await page.evaluate(() => window.__th.leistung('tag'))
console.log('  Tag    — sichtbar:', tag.an, '· mit Intensität:', tag.hell)
console.log((nacht.hell === 8 && tag.hell === 0) ? '  ✅ Laternen schalten korrekt (Helligkeit)' : '  ❌ Schaltverhalten falsch')

console.log('\n=== Lichter, Schatten, Materialien ===')
const d = await page.evaluate(() => window.__th.leistung('detail'))
console.log('  Schatten aktiv:', d.schattenAn)
console.log(`  Lichter gesamt ${d.lichterGesamt} · im Shader aktiv ${d.imShader} · davon wirkungslos (Intensität 0) ${d.davonWirkungslos}`)
d.lichter.filter(l => l.an && l.int === 0).forEach(l =>
  console.log(`    wirkungslos: ${l.typ} pool=${l.pool} eltern=${l.eltern} pos=${l.pos}`))
console.log('    Pool-Lichter:', JSON.stringify(d.lichter.filter(l => l.pool).map(l => (l.an?'an':'aus')+'/'+l.int)))
console.log('  Material-Typen:', JSON.stringify(d.materialTypen))
console.log('  verschiedene Signaturen:', d.verschiedeneSignaturen, '· einsparbar:', d.einsparbar)
d.top5Dubletten.forEach(x => console.log('   ', x))
console.log('\n=== Bewegt sich nach dem tiefen Einfrieren noch alles? ===')
const w1 = await page.evaluate(() => window.__th.leistung('weltpos'))
await new Promise(r => setTimeout(r, 5000))
const w2 = await page.evaluate(() => window.__th.leistung('weltpos'))
let stillstand = 0
for (const k of Object.keys(w1)) {
  const d = w1[k].reduce((a, v, i) => a + Math.abs(v - w2[k][i]), 0)
  const bewegt = d > 0.002
  if (!bewegt) stillstand++
  console.log(`  ${bewegt ? '✅' : '❌ STEHT'} ${k.padEnd(18)} Δ ${d.toFixed(3)}`)
}
console.log(stillstand ? `  💥 ${stillstand} stehen still` : '  🎉 alles bewegt sich')
console.log('\n=== Zustand der beweglichen Systeme ===')
const bw = await page.evaluate(() => window.__th.leistung('beweger'))
console.log(JSON.stringify(bw, null, 1).slice(0, 1600))
console.log('\n=== Fahrgeschaefte: dreht die Weltmatrix mit? ===')
const f1 = await page.evaluate(() => window.__th.leistung('fahrt'))
await new Promise(r => setTimeout(r, 4000))
const f2 = await page.evaluate(() => window.__th.leistung('fahrt'))
if (Array.isArray(f1)) f1.forEach((a, i) => {
  const b = f2[i]
  const rotDelta = (b.rot - a.rot).toFixed(3)
  const matDelta = Math.abs(b.m0 - a.m0) + Math.abs(b.m2 - a.m2)
  console.log(`  ${a.typ.padEnd(16)} rotation ${rotDelta > 0 ? '+' + rotDelta : rotDelta} · Weltmatrix ${matDelta > 0.0001 ? 'dreht mit ✅' : 'STEHT ❌'} · autoUpdate=${b.autoUpdate} _bewegt=${b.bewegt}`)
})
else console.log('  ', f1)
console.log('\n=== Reichweite des Einfrierens ===')
const f = await page.evaluate(() => window.__th.leistung('frost'))
for (const [k, v] of Object.entries(f)) console.log(`  ${k.padEnd(18)} ${v}`)
console.log('\n=== Teuerste Objekte (Dreiecke) ===')
for (const o of await page.evaluate(() => window.__th.leistung('teuerste')))
  console.log(`  ${String(o.n).padStart(8)}  ${o.name}${o.inst ? ' ×' + o.inst : ''}${o.sichtbar ? '' : ' (unsichtbar)'}`)
console.log('\nJS-Fehler:', jsFehler.length)
await browser.close()
aufraeumen(TMP)
