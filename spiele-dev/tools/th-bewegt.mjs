/**
 * th-bewegt.mjs — bewegt sich alles, was sich bewegen soll?
 *
 * ⚠️ WOZU. `_spaetEinfrieren()` setzt `matrixAutoUpdate = false` auf allem, was nicht
 * vorher als bewegt angemeldet wurde — das spart je Bild eine Matrixrechnung pro
 * Objekt. Wer eine neue Animation einbaut und die Anmeldung vergisst, bekommt kein
 * Fehlerbild: das Ding steht einfach still. Genau so ist der Freizeitpark schon
 * einmal erstarrt (Charge #2303), und der Kommentar dort verlangt ausdruecklich,
 * nach jeder neuen Animation gegenzumessen.
 *
 * Der Test liest die bekannten Animationslisten (verkehr, _boote, _tiere, FAHRTEN,
 * Hafenkran, Leuchtturm, Zuege, Enten, Falter) und vergleicht die Weltposition oder
 * Drehung jedes Eintrags ueber mehrere Sekunden. Was sich um weniger als 1 mm
 * bewegt UND sich nicht dreht, gilt als eingefroren.
 *
 * ⚠️ SwiftShader liefert hier rund 2 Bilder je Sekunde. Langsame Dinge brauchen
 * darum ein grosszuegiges Fenster; die Vorgabe sind 30 s.
 *
 * Aufruf:  node spiele-dev/tools/th-bewegt.mjs [sekunden]
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const SEK = Number(process.argv[2] || 30)

const sonde = `function(sekunden){
  var L=[];
  function add(name,obj){
    if(!obj)return;
    var m=obj.mesh||obj.w||obj.g||obj;
    if(!m||!m.isObject3D)return;
    L.push({name:name,m:m});}
  (window.verkehr||[]).forEach(function(v,i){add("Verkehr #"+i,v);});
  (window._boote||[]).forEach(function(b,i){add("Boot #"+i+" "+((b.w&&b.w.userData&&b.w.userData.datei)||""),b);});
  if(window._tiere){
    (window._tiere.land||[]).forEach(function(t,i){add("Landtier #"+i,t);});
    (window._tiere.enten||[]).forEach(function(t,i){add("Ente #"+i,t);});}
  (window.FAHRTEN||[]).forEach(function(f,i){add("Fahrt #"+i+" "+(f.name||f.typ||""),f);});
  add("Baukran",window._baukran);
  add("Hafenkran",window._hafenkran);
  add("Leuchtturm",window._leuchtturm);
  if(window._seeZug)add("Bruecken-Zug",window._seeZug.g);
  /* ⚠️ DIE ANIMATION SITZT NICHT IMMER IM ANGEMELDETEN OBJEKT. Der erste Lauf meldete
     Hafenkran und Leuchtturm als eingefroren — beide zu Unrecht: die Laufkatze des
     Krans und der Lichtkegel des Leuchtturms sind EIGENE Objekte, die updHafen() beim
     ersten Takt anlegt und unter userData ablegt (katze, strahl). Der Turm selbst steht
     voellig richtig still. Wer nur den Wrapper misst, meldet gesunde Technik als Defekt.
     Darum zaehlt je Eintrag die groesste Bewegung ueber das Objekt UND alles, was als
     Object3D an seinem userData haengt. */
  L.forEach(function(e){
    e.satelliten=[];
    var u=e.m.userData||{};
    Object.keys(u).forEach(function(k){ if(u[k]&&u[k].isObject3D)e.satelliten.push(u[k]); });});
  return new Promise(function(res){
    var t0=performance.now(), proben=0;
    /* Satelliten koennen erst beim ersten Takt entstehen — darum vor der Messung
       einmal nachfassen. */
    L.forEach(function(e){
      var u=e.m.userData||{};
      Object.keys(u).forEach(function(k){
        if(u[k]&&u[k].isObject3D&&e.satelliten.indexOf(u[k])<0)e.satelliten.push(u[k]); });});
    var start=L.map(function(e){var p=new THREE.Vector3();e.m.getWorldPosition(p);
      return {p:p,rx:e.m.rotation.x,ry:e.m.rotation.y,rz:e.m.rotation.z};});
    var weg=L.map(function(){return 0;});
    var dreh=L.map(function(){return 0;});
    var letzte=start.map(function(s){return {p:s.p.clone(),rx:s.rx,ry:s.ry,rz:s.rz};});
    function tick(){
      proben++;
      var p=new THREE.Vector3();
      for(var i=0;i<L.length;i++){
        var E=L[i], teile=[E.m].concat(E.satelliten), bestW=0, bestD=0;
        for(var t=0;t<teile.length;t++){
          var T=teile[t];
          if(!letzte[i].sat)letzte[i].sat={};
          var vor=letzte[i].sat[t];
          T.getWorldPosition(p);
          if(vor){
            var w9=p.distanceTo(vor.p); if(w9>bestW)bestW=w9;
            var d9=Math.abs(T.rotation.x-vor.rx)+Math.abs(T.rotation.y-vor.ry)+Math.abs(T.rotation.z-vor.rz);
            if(d9>bestD)bestD=d9;}
          letzte[i].sat[t]={p:p.clone(),rx:T.rotation.x,ry:T.rotation.y,rz:T.rotation.z};}
        weg[i]+=bestW; dreh[i]+=bestD;}
      if(performance.now()-t0<sekunden*1000)requestAnimationFrame(tick);
      else res({eintraege:L.length, proben:proben,
        sekunden:+((performance.now()-t0)/1000).toFixed(1),
        liste:L.map(function(e,i){return {name:e.name, weg:+weg[i].toFixed(3),
          dreh:+dreh[i].toFixed(4), auto:e.m.matrixAutoUpdate, teile:1+e.satelliten.length,
          bewegt:!!(e.m._bewegt||(e.m.userData&&e.m.userData.animiert))};})});}
    requestAnimationFrame(tick);});}`

mitSonden('traumhaus.html', { bewegt: sonde }, '_bewegt.html')
const { browser, page, jsFehler } = await spielOeffnen('_bewegt.html', { warten: 25000 })
const R = await page.evaluate((s) => window.__th.bewegt(s), SEK)
await browser.close()
aufraeumen('_bewegt.html')

const still = R.liste.filter((e) => e.weg < 0.001 && e.dreh < 0.0001)
console.log(`${R.eintraege} angemeldete Bewegliche, ${R.proben} Bilder in ${R.sekunden} s\n`)
if (!still.length) console.log('✅ Alles Angemeldete bewegt sich')
else {
  console.log(`⚠️  ${still.length} bewegen sich NICHT:`)
  for (const e of still) console.log(`   ${e.name.padEnd(38)}  matrixAutoUpdate=${e.auto}  angemeldet=${e.bewegt}  Teile=${e.teile}`)
}
const langsam = R.liste.filter((e) => e.weg >= 0.001 && e.weg < 0.5 && e.dreh < 0.0001)
if (langsam.length) {
  console.log(`\n   (${langsam.length} bewegen sich nur wenig — bei ~2 Bildern/s normal fuer Langsames:)`)
  for (const e of langsam.slice(0, 8)) console.log(`   ${e.name.padEnd(38)}  ${e.weg} m`)
}
console.log('\nJS-Fehler:', jsFehler.length)
