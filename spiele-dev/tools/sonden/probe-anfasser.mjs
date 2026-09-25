/* Sonde (Runde 100): fasst irgendein Code ein EINZELNES Teil einer Weltgruppe / ein loses Bodenteil nach dem
   Aufbau noch an? node probe-anfasser.mjs [quelle]
   Runde 100 fasst selbstgebaute Gruppen und flache lose Teile per AUSSCHLUSSLISTE zusammen (_zfKandidaten). Das ist
   nur richtig, wenn niemand spaeter ein einzelnes Kind wiederfindet und veraendert — alles, was die GANZE Gruppe
   oder ein MATERIAL betrifft, bleibt gueltig. Diese Sonde laedt mit ?ohneZF (nichts zusammengefasst), nimmt
   genau die Kandidaten des Spiels und beobachtet jedes Mesh darin:
     * `visible` und `material` werden zu Fallen (Setter merken sich den Aufrufer),
     * Lage (position/rotation/scale), Elternteil und die ersten Eckpunkte der Geometrie werden notiert.
   Dann spielt sie: Abend + Nacht (Fenster, Laternen, Stadtfest 19:30–22:30), Winter (Wintermarkt), Regen,
   Schnee, Baumodus an/aus, und laesst die Welt laufen (Ampeln, Verkehr, Brunnen).
   Ausgenommen als Aufrufer: lodTakt / gruppenSicht (blenden nach Entfernung — das Zusammengefasste bekommt
   eigene LOD-Eintraege), der Verdecker (_vd*: tauscht Materialien, arbeitet nach dem Zusammenfassen auf den
   neuen Meshes) und _aufwaermen (schaltet kurz sichtbar, um Shader vorzuuebersetzen).
   Gegenprobe: am Ende setzt die Sonde selbst ein Kandidaten-Teil unsichtbar, verschiebt eins und aendert die
   Eckpunkte eines dritten — alle drei muessen gemeldet werden. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_anfasser_tmp.html'
mitSonden(quelle, {
  fallen: `function(){var K=window._zfKandidaten(),M=[];
    /* nur, was das Spiel WIRKLICH zusammenfassen wuerde: undurchsichtig, ein Material, kein Bewegtes in der Kette
       (durchsichtige Wolkenschatten, der Ring unter der Figur und die Brunnenstrahlen bleiben ohnehin einzeln) */
    function wuerde(o,wurzel){var m=o.material;if(!m||Array.isArray(m)||m.transparent)return false;
      for(var q=o;q&&q!==wurzel.parent;q=q.parent)if(q._bewegt||(q.userData&&q.userData.animiert))return false;return true;}
    K.G.forEach(function(g){g.traverse(function(o){if(o.isMesh&&wuerde(o,g))M.push(o);});});K.L.forEach(function(o){if(wuerde(o,o))M.push(o);});
    var LOG=window._anfLog={};
    function wer(){var s=(new Error().stack||"").split("\\n").slice(3,6).map(function(l){var m=l.match(/at ([^ ]+)/);return m?m[1]:"?";});return s.join("<");}
    /* schritt = _warmObjTakt (Aufwaermen: fuer EINEN Zug sichtbar, sofort zurueck) */
    function merk(art,o){var w=wer();if(/_vd|updVerdecker|lodTakt|gruppenSicht|_aufwaermen|(^|<)schritt/.test(w))return;var k=art+" · "+w;(LOG[k]=LOG[k]||{n:0,bsp:null}).n++;
      if(!LOG[k].bsp){var v=new THREE.Vector3();o.getWorldPosition(v);LOG[k].bsp="("+v.x.toFixed(0)+"|"+v.z.toFixed(0)+") "+o.geometry.type;}}
    M.forEach(function(o){var v=o.visible,m=o.material;
      Object.defineProperty(o,"visible",{configurable:true,get:function(){return v;},set:function(x){if(x!==v)merk("visible",o);v=x;}});
      Object.defineProperty(o,"material",{configurable:true,get:function(){return m;},set:function(x){if(x!==m)merk("material",o);m=x;}});
      var p=o.geometry.attributes.position.array,h=0;for(var i=0;i<Math.min(p.length,30);i++)h+=p[i]*(i+1);
      o._anf={par:o.parent,pos:o.position.clone(),rot:o.rotation.clone(),sk:o.scale.clone(),h:h};});
    window._anfM=M;return {gruppen:K.G.length,lose:K.L.length,meshes:M.length};}`,
  spiel: `function(schritt){
    if(schritt==="abend")window.__th.zeit(19*60+50);
    if(schritt==="nacht")window.__th.zeit(23*60);
    if(schritt==="morgen")window.__th.zeit(7*60);
    if(schritt==="winter"){tag=16;applySaison();}
    if(schritt==="sommer"){tag=1;applySaison();}
    if(schritt==="regen")setWetter("regen");
    if(schritt==="schnee")setWetter("schnee");
    if(schritt==="sonne")setWetter("sonne");
    if(schritt==="bauen")document.getElementById("modeBtn").click();
    return {uhr:uhrzeit,tag:tag,bau:buildMode};}`,
  gegen: `function(){var M=window._anfM;function testAnfassen(){M[0].visible=!M[0].visible;M[1].position.x+=3;
      var p=M[2].geometry.attributes.position.array;p[0]+=1;}testAnfassen();return true;}`,
  bilanz: `function(){var M=window._anfM,R={verschoben:0,entfernt:0,eckpunkte:0,bsp:[]},v=new THREE.Vector3();
    M.forEach(function(o){var a=o._anf,p=o.geometry.attributes.position.array,h=0;for(var i=0;i<Math.min(p.length,30);i++)h+=p[i]*(i+1);
      var z=[];if(o.parent!==a.par)z.push("entfernt");if(!o.position.equals(a.pos)||!o.rotation.equals(a.rot)||!o.scale.equals(a.sk))z.push("verschoben");
      if(Math.abs(h-a.h)>1e-6)z.push("eckpunkte");
      z.forEach(function(k){R[k]++;});if(z.length&&R.bsp.length<8){o.getWorldPosition(v);R.bsp.push(z.join("+")+" ("+v.x.toFixed(0)+"|"+v.z.toFixed(0)+") "+o.geometry.type);}});
    /* Nebenbefund-Suche: eingefroren (matrixAutoUpdate aus), aber im Code weiterbewegt — die Zahl wandert, das Bild
       steht (so der Ring unter der Figur). Jedes Objekt der Szene (Teilbaum), Lage gegen Weltmatrix. */
    var steht=[],pw=new THREE.Vector3(),mw=new THREE.Vector3();scene.updateMatrixWorld(true);
    scene.traverse(function(o){if(o===scene||o.matrixAutoUpdate!==false||o.isLight||o.isCamera)return;
      var e=o.matrix.elements,d=Math.hypot(e[12]-o.position.x,e[13]-o.position.y,e[14]-o.position.z);
      if(d>0.05){o.getWorldPosition(mw);var dd="";for(var q=o;q;q=q.parent)if(q.userData&&q.userData.datei){dd=q.userData.datei;break;}
        steht.push({was:(dd||o.type)+(o.name?" "+o.name:""),bei:"("+mw.x.toFixed(0)+"|"+mw.z.toFixed(0)+")",daneben:+d.toFixed(2)});}});
    var ring=window._eigenRing||null;try{ring=_eigenRing;}catch(e){}
    var ringInfo=ring?{mau:ring.matrixAutoUpdate,bewegt:!!ring._bewegt,abweichung:+Math.hypot(ring.matrixWorld.elements[12]-ring.position.x,ring.matrixWorld.elements[14]-ring.position.z).toFixed(2)}:null;
    return {R:R,LOG:window._anfLog,ring:ringInfo,steht:steht};}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP + '?ohneZF', { warten: 60000 })
await warteAufRuhe(page, { minSekunden: 150 }); await page.waitForTimeout(8000)
console.log('Kandidaten', JSON.stringify(await page.evaluate(() => window.__th.fallen())))
for (const [s, ms] of [['abend', 20000], ['nacht', 15000], ['regen', 8000], ['schnee', 8000], ['sonne', 3000], ['winter', 10000], ['sommer', 5000], ['bauen', 6000], ['bauen', 3000], ['morgen', 15000]]) {
  const r = await page.evaluate((x) => window.__th.spiel(x), s); await page.waitForTimeout(ms); console.log('  ', s, JSON.stringify(r))
}
function zeige(t, b) {
  console.log(`\n${t}: verschoben ${b.R.verschoben} · entfernt ${b.R.entfernt} · Eckpunkte geaendert ${b.R.eckpunkte}`); b.R.bsp.forEach((x) => console.log('     ' + x))
  const L = Object.entries(b.LOG); console.log(`   Setter-Aufrufe (ohne LOD/Verdecker/Aufwaermen): ${L.length ? '' : 'keine'}`)
  L.sort((p, q) => q[1].n - p[1].n).slice(0, 15).forEach(([k, v]) => console.log(`     ${String(v.n).padStart(5)}  ${k}  z.B. ${v.bsp}`))
}
const b1 = await page.evaluate(() => window.__th.bilanz()); zeige('SPIEL', b1)
console.log('Ring unter der eigenen Figur (Nebenbefund):', JSON.stringify(b1.ring))
console.log(`Eingefroren, aber im Code weiterbewegt (Lage != Matrix, > 5 cm): ${b1.steht.length}`)
b1.steht.sort((p, q) => q.daneben - p.daneben).slice(0, 15).forEach((x) => console.log(`     ${x.daneben} m  ${x.was} ${x.bei}`))
await page.evaluate(() => window.__th.gegen()); const b2 = await page.evaluate(() => window.__th.bilanz())
const ok = b2.R.verschoben > b1.R.verschoben && b2.R.eckpunkte > b1.R.eckpunkte && Object.keys(b2.LOG).some((k) => /testAnfassen/.test(k))
console.log(`\nGegenprobe (ein Teil unsichtbar, eins verschoben, Eckpunkte geaendert): ${ok ? '✓ alle drei gemeldet' : '✗ MESSGERAET TAUGT NICHT'}`)
console.log('JS-Fehler', jsFehler.length, jsFehler.slice(0, 3))
await browser.close(); aufraeumen(TMP)
