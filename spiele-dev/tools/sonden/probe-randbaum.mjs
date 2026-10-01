/* Sonde (Runde 102): stehen die Randbäume der Viertel am Rand IHRES Viertels?
   Anlass: Luftbild der Ost-Baustelle — drei Bäume mitten im Rohbau (169|149), (181|149), (193|149), eine Reihe
   im 12-m-Takt. viertel() setzt je Seite alle 12 m einen Baum auf `[-VW/2+4, VW/2-4]` quer zur Strasse. VW ist
   aber die BREITE (cfg.w) — bei einem Viertel längs x (achse "x") läuft die Strasse in x, quer dazu liegt die
   TIEFE VD. Die Reihe landet dann (w−d)/2 Meter ausserhalb des Viertels: Chilbiplatz 30 m, Freizeitpark 110 m.
   Gemessen wird im Spiel, nicht auf dem Papier: jeder baum2-Baum (Stamm-Zylinder 0,18/0,28) in der Nähe einer
   Rand-Position (Formel mit VW quer UND mit VD quer, je 4 m Fang — wegVonStrasse schiebt), und wo er steht:
     draussen  — ausserhalb des eigenen Viertel-Rechtecks (m)
     fremd     — in einem anderen Viertel
     bau       — im Grundriss eines Baus (window._gebaeude, Kasten −0,3 m)
     wasser    — imWasser()
     fest      — in einem Kollider (inSolid)
   Lädt mit ?ohneZF (zusammengefasste Bäume hätten keinen eigenen Stamm mehr).
   Gegenprobe: ein Punkt in der Viertelmitte muss „drinnen" sein, einer 30 m vor der Südkante (z + d/2 + 30) „draussen".
   Aufruf: node spiele-dev/tools/sonden/probe-randbaum.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_randbaum_tmp.html'
mitSonden('traumhaus.html', {
  randbaum: `function(){
    var V=(window._viertelSolver&&window._viertelSolver.VIERTEL)||[];
    var T=[];scene.children.forEach(function(o){if(!o.isGroup||o.children.length!==4)return;var s=o.children[0];
      if(!s.isMesh||!s.geometry||s.geometry.type!=="CylinderGeometry")return;var p=s.geometry.parameters;
      if(Math.abs(p.radiusTop-0.18)>1e-3||Math.abs(p.radiusBottom-0.28)>1e-3)return;T.push([o.position.x,o.position.z]);});
    var bb=new THREE.Box3(),K=[];(window._gebaeude||[]).forEach(function(g){if(!g.parent)return;bb.setFromObject(g);if(bb.isEmpty())return;
      if(bb.max.y-bb.min.y<2.5)return;K.push([bb.min.x+0.3,bb.max.x-0.3,bb.min.z+0.3,bb.max.z-0.3,g.userData.datei||"?"]);});
    /* Rechteck des Viertels: w liegt IMMER in x, d IMMER in z — laengs (achse x) laeuft die Strasse die w-Laenge
       entlang, quer (achse z) die d-Laenge; in beiden Faellen ist x-Ausdehnung w, z-Ausdehnung d.
       ⚠️ Erste Fassung dieser Sonde hatte bei „laengs z" w und d vertauscht und meldete dort 4 Baeume draussen,
       die drinnen stehen — dieselbe Verwechslung wie im Spiel, nur andersherum. */
    function rect(v){return [v.x-v.w/2,v.x+v.w/2,v.z-v.d/2,v.z+v.d/2];}
    function draussen(v,x,z){var r=rect(v);return Math.max(r[0]-x,x-r[1],r[2]-z,z-r[3],0);}
    var out=[];
    V.forEach(function(v){var VW=v.w,VD=v.d,laengs=v.laengs,laenge=laengs?VW:VD,VX=v.x,VZ=v.z;
      var n=Math.floor(laenge/12),rows={VW:[],VD:[]};
      for(var t2=0;t2<n;t2++){var to=-laenge/2+8+t2*12;
        [["VW",VW],["VD",VD]].forEach(function(q){[-q[1]/2+4,q[1]/2-4].forEach(function(o3){
          var tx=laengs?VX+to:VX+o3,tz=laengs?VZ+o3:VZ+to;rows[q[0]].push([tx,tz]);});});}
      var e={name:v.name,laengs:laengs,w:VW,d:VD,treffer:{VW:0,VD:0},baeume:[]};
      ["VW","VD"].forEach(function(k){rows[k].forEach(function(p){var best=null,bd=4;
        T.forEach(function(t){var d=Math.hypot(t[0]-p[0],t[1]-p[1]);if(d<bd){bd=d;best=t;}});
        if(!best)return;e.treffer[k]++;
        if(e.baeume.some(function(b){return b.x===best[0]&&b.z===best[1];}))return;
        var x=best[0],z=best[1],hit=[];
        var dr=draussen(v,x,z);
        V.forEach(function(w2){if(w2!==v&&draussen(w2,x,z)===0)hit.push("Viertel "+w2.name);});
        K.forEach(function(k9){if(x>k9[0]&&x<k9[1]&&z>k9[2]&&z<k9[3])hit.push("Bau "+k9[4]);});
        if(window.imWasser&&window.imWasser(x,z))hit.push("Wasser");
        if(typeof inSolid==="function"&&inSolid(x,z))hit.push("Kollider");
        e.baeume.push({x:+x.toFixed(1),z:+z.toFixed(1),draussen:+dr.toFixed(1),hit:hit,formel:k});});});
      out.push(e);});
    var v0=V[0],gp={mitte:draussen(v0,v0.x,v0.z),vor:draussen(v0,v0.x,v0.z+v0.d/2+30)};
    return {baeume:T.length,V:out,gegen:gp};}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP + '?ohneZF', { warten: 45000 })
await page.waitForTimeout(15000)
const r = await page.evaluate(() => window.__th.randbaum())
await browser.close(); aufraeumen(TMP)
let ges = 0, raus = 0, fremd = 0
console.log(`${r.baeume} baum2-Bäume in der Szene · JS-Fehler ${jsFehler.length}`)
for (const v of r.V) {
  const d = v.baeume.filter((b) => b.draussen > 1)
  ges += v.baeume.length; raus += d.length; fremd += v.baeume.filter((b) => b.hit.length).length
  console.log(`\n${v.name.padEnd(16)} ${v.laengs ? 'längs x' : 'längs z'}  w ${v.w} · d ${v.d}  Randbäume gefunden ${v.baeume.length} (Formel VW quer: ${v.treffer.VW}, VD quer: ${v.treffer.VD}) · ausserhalb > 1 m: ${d.length}${d.length ? ', bis ' + Math.max(...d.map((b) => b.draussen)) + ' m' : ''}`)
  for (const b of v.baeume.filter((b) => b.hit.length)) console.log(`   (${b.x}|${b.z}) ${b.draussen} m draussen → ${b.hit.join(', ')}`)
}
console.log(`\nSUMME: ${ges} Randbäume · ausserhalb ihres Viertels (> 1 m) ${raus} · in etwas anderem (Viertel/Bau/Wasser/Kollider) ${fremd}`)
console.log(`Gegenprobe: Viertelmitte ${r.gegen.mitte === 0 ? '✓ drinnen' : '✗ ' + r.gegen.mitte} · 30 m vor der Südkante ${r.gegen.vor >= 29 ? '✓ draussen (' + r.gegen.vor.toFixed(0) + ' m)' : '✗ ' + r.gegen.vor}`)
