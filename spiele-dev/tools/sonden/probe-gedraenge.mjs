/* Sonde (Runde 102): welche Bauten stehen zu dicht — Wand an Wand, ohne dass es so gebaut ist?
   Anlass: User „gestallte alles besser um"; Luftbild Altstadt: Rohbau und Schule 10 cm auseinander, der Kran
   zwischen Markthalle und Gleis eingeklemmt. th-echt meldet nur DURCHDRINGUNG, th-pruef nur „steckt drin".
   Ein Spalt von 20 cm zwischen zwei fremden Häusern ist keines von beiden — und sieht trotzdem falsch aus.
   Gemessen je Bau (bau()-Modell, `window._gebaeude`, ≥ 3 m hoch, Grundriss ≥ 16 m²): die Kästen der Bauteile,
   die AUF DEM BODEN stehen (beginnen unter 1 m, reichen über 1 m — Vordach, Ausleger, Dachüberstand zählen nicht:
   Runde 101, „Hüllbox ≠ Baukörper"). Abstand zweier Bauten = kleinster Abstand zweier solcher Teile.
   Gemeldet wird jedes Paar unter GRENZE (Standard 1,5 m) — auch Überlappungen (Abstand 0).
   Lädt mit ?ohneZF (zusammengefasste Modelle hätten nur noch einen Kasten je Material). ⚠️ Mit ZF=1 lädt sie
   ohne den Schalter — dann stehen die Dinge so, wie der Spieler sie sieht (siehe Runbook Runde 102: entwirren()
   legte die Tramhaltestelle mit ?ohneZF an eine andere Stelle).
   Gegenprobe: ein Bau wird 0,3 m neben einen anderen gesetzt und muss gemeldet werden.
   Aufruf: node spiele-dev/tools/sonden/probe-gedraenge.mjs [grenze=1.5] [x0 z0 x1 z1] */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const [G = '1.5', ...R] = process.argv.slice(2)
const RECHT = R.length === 4 ? R.map(Number) : null
const TMP = '_probe_gedraenge_tmp.html'
mitSonden(process.env.QUELLE || 'traumhaus.html', {   /* QUELLE=_alt.html: Vergleich gegen einen älteren Stand */
  gedraenge: `function(GRENZE,RE,gegen){
    var _lodAn=[];scene.traverse(function(n){if((n._lodM||n._gsAus)&&!n.visible){n.visible=true;_lodAn.push(n);}});
    var bb=new THREE.Box3(),B=[];
    (window._gebaeude||[]).forEach(function(g){if(!g.parent)return;g.updateMatrixWorld(true);
      var teile=[],ges=new THREE.Box3();
      g.traverse(function(n){if(!n.isMesh||!n.geometry)return;var mt=Array.isArray(n.material)?n.material[0]:n.material;
        if(mt&&(mt.isMeshBasicMaterial||(mt.transparent&&mt.opacity<0.6)))return;
        if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();bb.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld);
        if(bb.min.y>1.0||bb.max.y<1.0)return;
        teile.push([bb.min.x,bb.max.x,bb.min.z,bb.max.z]);ges.union(bb);});
      if(!teile.length)return;var h=new THREE.Box3().setFromObject(g);
      if(h.max.y-h.min.y<3)return;if((ges.max.x-ges.min.x)*(ges.max.z-ges.min.z)<16)return;
      if(RE&&(ges.max.x<RE[0]||ges.min.x>RE[2]||ges.max.z<RE[1]||ges.min.z>RE[3]))return;
      B.push({g:g,n:g.userData.datei||"?",t:teile,k:[ges.min.x,ges.max.x,ges.min.z,ges.max.z],x:g.position.x,z:g.position.z});});
    var probe=null;
    if(gegen&&B.length>1){var a=B[0],b=B[1];
      /* b so verschieben, dass seine Westkante 0,3 m östlich von a liegt (gleiche z-Mitte) */
      var dx=(a.k[1]+0.3)-b.k[0],dz=((a.k[2]+a.k[3])-(b.k[2]+b.k[3]))/2;
      b.t=b.t.map(function(t){return [t[0]+dx,t[1]+dx,t[2]+dz,t[3]+dz];});b.k=[b.k[0]+dx,b.k[1]+dx,b.k[2]+dz,b.k[3]+dz];probe=[a.n,b.n];}
    function ab(p,q){var dx=Math.max(0,p[0]-q[1],q[0]-p[1]),dz=Math.max(0,p[2]-q[3],q[2]-p[3]);return Math.hypot(dx,dz);}
    var out=[];
    for(var i=0;i<B.length;i++)for(var j=i+1;j<B.length;j++){var a1=B[i],b1=B[j];
      if(ab(a1.k,b1.k)>=GRENZE)continue;var m=1e9;
      for(var s=0;s<a1.t.length&&m>0;s++)for(var u=0;u<b1.t.length;u++){var d=ab(a1.t[s],b1.t[u]);if(d<m){m=d;if(m===0)break;}}
      if(m<GRENZE)out.push({a:a1.n,ax:+a1.x.toFixed(1),az:+a1.z.toFixed(1),b:b1.n,bx:+b1.x.toFixed(1),bz:+b1.z.toFixed(1),d:+m.toFixed(2)});}
    _lodAn.forEach(function(n){n.visible=false;});
    return {bauten:B.length,paare:out.sort(function(p,q){return p.d-q.d;}),probe:probe};}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP + (process.env.ZF ? '' : '?ohneZF'), { warten: 45000 })
await page.waitForTimeout(20000)
const r = await page.evaluate((a) => window.__th.gedraenge(...a), [+G, RECHT, false])
const g = await page.evaluate((a) => window.__th.gedraenge(...a), [+G, RECHT, true])
await browser.close(); aufraeumen(TMP)
const kurz = (n) => n.replace(/\.glb$/, '').slice(0, 30)
console.log(`${r.bauten} Bauten · Paare unter ${G} m: ${r.paare.length} (davon Berührung/Überlappung: ${r.paare.filter((p) => p.d === 0).length}) · JS-Fehler ${jsFehler.length}`)
for (const p of r.paare) console.log(`  ${String(p.d).padStart(5)} m  ${kurz(p.a).padEnd(30)} (${p.ax}|${p.az})  ↔  ${kurz(p.b).padEnd(30)} (${p.bx}|${p.bz})`)
const erk = g.probe && g.paare.some((p) => p.d > 0.25 && p.d < 0.35 && ((p.a === g.probe[0] && p.b === g.probe[1]) || (p.a === g.probe[1] && p.b === g.probe[0])))
console.log(`Gegenprobe: ${g.probe ? g.probe.join(' ↔ ') : '—'} auf 0,3 m zusammengerückt → ${erk ? '✓ erkannt' : '✗ NICHT erkannt'}`)
