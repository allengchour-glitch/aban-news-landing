/* Sonde (Runde 101): steht etwas IN einem geparkten Auto oder auf einem Parkplatz?
   Anlass: Spielfahrt r101-35 — auf dem Quartiersplatz stand die Bushalte-Tafel th3_bushalte mitten im
   Stellplatz des Taxis (Wagen und Tafel ineinander). th-autoboden prueft nur den BODEN unter den Wagen,
   th-echt nur Gebaeude gegeneinander — ein Hindernis im Stellplatz sah keins von beiden.
   Geprueft wird:
     A) jedes geparkte Auto (userData.fest, Datei nach Autoname): welche anderen Objekte schneiden seinen
        Grundriss (je 10 cm eingezogen)?
     B) jeder angemeldete Parkplatz (window._parkplaetze): welche Objekte ueber 0,4 m Hoehe stehen darauf,
        die keine Autos sind?
   Huellboxen ohne Lichtschein (MeshBasicMaterial / durchsichtig < 0,6 zaehlen nicht) — sonst ist jede
   Laterne 7 m breit — und nur aus Teilen, die unter 1,2 m beginnen (ein Vordach ueber dem Stellplatz
   ist kein Hindernis).
   Gegenprobe: ein Hindernis (1×1×1 m) wird in das erste geparkte Auto gestellt und muss gemeldet werden.
   Aufruf: node spiele-dev/tools/sonden/probe-parkfrei.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_parkfrei_tmp.html'
mitSonden('traumhaus.html', {
  parkfrei: `function(mitGegenprobe){
    /* Entfernungs-Ausblendung (lodTakt, _lodM) und Gruppen-Sichtpruefung (_gsAus) schalten Teile fern der Figur
       bzw. ausserhalb des Blickfelds unsichtbar — sie stehen trotzdem da.
       Ohne das fehlten Trinkbrunnen, Bank und Vogeltraenke mitten im Bahnhof-Parkplatz (Runde 101). */
    var _lodAn=[];scene.traverse(function(n){if((n._lodM||n._gsAus)&&!n.visible){n.visible=true;_lodAn.push(n);}});
    var AUTO=/auto|taxi|van|bus(?!halt)|wagen|th37_|th50_|polizei|limousine|kombi|lkw|traktor|camper|wohnmobil/i;
    var bbT=new THREE.Box3(),bbM=new THREE.Box3();
    /* je Objekt: Gesamtbox UND die Einzelboxen seiner Bauteile. Ueberlappung wird Teil fuer Teil geprueft —
       sonst ist ein Vordach auf vier Pfosten ein massiver Quader, und der Wagen darunter „steckt darin". */
    function box(o){bbT.makeEmpty();var teile=[];o.updateMatrixWorld(true);
      o.traverse(function(n){if(!n.isMesh||!n.geometry||!n.visible)return;var mt=Array.isArray(n.material)?n.material[0]:n.material;
        if(mt&&(mt.isMeshBasicMaterial||(mt.transparent&&mt.opacity<0.6)))return;
        if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();bbM.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld);
        if(bbM.min.y>1.2)return;   /* nur was auf Bodenhoehe steht: Dachueberstand, Vordach, Lampenkopf zaehlen nicht */
        if(bbM.max.y<0.3)return;   /* flacher Boden (Hofasphalt, Markierung) ist kein Hindernis — Wagen stehen darauf */
        bbT.union(bbM);teile.push([bbM.min.x,bbM.max.x,bbM.min.z,bbM.max.z]);});
      if(bbT.isEmpty())return null;var r=[bbT.min.x,bbT.max.x,bbT.min.z,bbT.max.z,bbT.min.y,bbT.max.y];r.teile=teile;return r;}
    function name(o){var u=o.userData||{},nm=u.datei||o.name||"";var c=o;while(!nm&&c&&c.children&&c.children.length===1){c=c.children[0];nm=(c.userData&&c.userData.datei)||c.name||"";}
      if(!nm&&o.children.length)nm=o.type+"["+o.children.slice(0,3).map(function(k){var g=k.geometry;return (k.name||(g&&g.type)||k.type).replace("Geometry","")+(k.material&&k.material.color?"#"+k.material.color.getHexString():"");}).join(" ")+(o.children.length>3?" …"+o.children.length:"")+"]";
      if(!nm&&o.geometry)nm=o.geometry.type.replace("Geometry","")+(o.material&&o.material.color?"#"+o.material.color.getHexString():"");
      return nm||o.type;}
    var probe=null;
    var alle=[];scene.children.forEach(function(o){if(o.isLight||o.isCamera||!o.visible)return;var b=box(o);if(!b)return;
      if(Math.max(b[1]-b[0],b[3]-b[2])>40)return;alle.push({o:o,b:b,n:name(o)});});
    var autos=alle.filter(function(e){return e.o.userData&&e.o.userData.fest&&AUTO.test(e.n);});
    if(mitGegenprobe&&autos.length){var a0=autos[0];probe=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
      probe.position.set((a0.b[0]+a0.b[1])/2,0.5,(a0.b[2]+a0.b[3])/2);probe.name="GEGENPROBE";scene.add(probe);
      alle.push({o:probe,b:box(probe),n:"GEGENPROBE"});}
    var ov=function(a,b,e){return Math.min(a[1]-e,b[1])>Math.max(a[0]+e,b[0])&&Math.min(a[3]-e,b[3])>Math.max(a[2]+e,b[2]);};
    var ovT=function(a,b,e){if(!ov(a,b,e))return false;var T=b.teile||[b];for(var i=0;i<T.length;i++)if(ov(a,T[i],e))return true;return false;};
    var A=[];autos.forEach(function(a){var hit=[];
      alle.forEach(function(e){if(e===a||e.b[5]<0.35||e.b[4]>2.5)return;if(ovT(a.b,e.b,0.1))hit.push(e.n+(AUTO.test(e.n)?" (Auto)":"")+" @"+e.o.position.x.toFixed(1)+"|"+e.o.position.z.toFixed(1));});
      if(hit.length)A.push({auto:a.n,x:+a.o.position.x.toFixed(1),z:+a.o.position.z.toFixed(1),hit:hit});});
    var P=[];(window._parkplaetze||[]).forEach(function(p){var r=[p.x-p.w/2,p.x+p.w/2,p.z-p.d/2,p.z+p.d/2],hit=[];
      alle.forEach(function(e){if(e.b[5]<0.4||e.b[4]>2.5||AUTO.test(e.n))return;if(ovT(r,e.b,0.05))hit.push(e.n+" @"+e.o.position.x.toFixed(1)+"|"+e.o.position.z.toFixed(1)+" box x "+e.b[0].toFixed(1)+"…"+e.b[1].toFixed(1)+" z "+e.b[2].toFixed(1)+"…"+e.b[3].toFixed(1)+" y "+e.b[4].toFixed(2)+"…"+e.b[5].toFixed(2));});
      P.push({n:p.n,hit:hit});});
    if(probe)scene.remove(probe);
    _lodAn.forEach(function(n){n.visible=false;});
    return {autos:autos.length,A:A,P:P};}`
}, TMP)
/* ?ohneZF: zusammengefasste Parkplatz-Wagen haetten keinen eigenen Grundriss mehr */
const { browser, page } = await spielOeffnen(TMP + '?ohneZF', { warten: 30000 })
await page.waitForTimeout(20000)
const r = await page.evaluate(() => window.__th.parkfrei(false))
const g = await page.evaluate(() => window.__th.parkfrei(true))
await browser.close(); aufraeumen(TMP)
console.log(`A) ${r.autos} geparkte Autos · mit Hindernis im Grundriss: ${r.A.length}`)
for (const e of r.A) console.log(`   ${e.auto} (${e.x}|${e.z}) ← ${e.hit.join(' · ')}`)
console.log(`B) ${r.P.length} Parkplaetze · mit Hindernis: ${r.P.filter((p) => p.hit.length).length}`)
for (const p of r.P) if (p.hit.length) { console.log(`   ${p.n}:`); p.hit.forEach((h) => console.log(`      ${h}`)) }
const erkannt = g.A.some((e) => e.hit.some((h) => h.startsWith('GEGENPROBE')))
console.log(`Gegenprobe: Kasten im ersten geparkten Auto → ${erkannt ? '✓ erkannt' : '✗ NICHT erkannt'}`)
