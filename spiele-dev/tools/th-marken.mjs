/* th-marken.mjs — steht an jeder Kartenmarke und an jedem Lieferziel wirklich etwas?
 *
 * WARUM: `WORLD_POIS` und `LIEFERZIELE` sind handgetippte Koordinatenlisten. Die Welt
 * darunter aendert sich staendig — Viertel weichen aus, Modelle ziehen um, ein Quartier
 * faellt still aus. Dann zeigt die Karte auf eine leere Wiese und ein Lieferauftrag
 * fuehrt ins Nichts, ohne dass irgendwo ein Fehler erscheint. Genau so war es bei
 * "Bauernhof", "Sportpark" und "Gewerbe Ost" (siehe TH5-ASSETS §2i, fuenfte Runde).
 *
 * ⚠️ ZWEI MASSE, nicht eines. Viel in dieser Welt ist prozedural gebaut und traegt kein
 * `userData.datei` — die Achterbahn zum Beispiel ist ein Catmull-Rom-Rundkurs aus Tubes.
 * Wer nur den Abstand zum naechsten MODELL misst, meldet sie als "nichts da" (101 m),
 * obwohl die Station genau auf der Marke steht. Darum zaehlt zusaetzlich der Abstand zum
 * naechsten KOLLIDER. Verdaechtig ist eine Marke erst, wenn BEIDE weit weg sind.
 *
 * Aufruf:  node spiele-dev/tools/th-marken.mjs [grenze]
 *          TH_REPO=/pfad/zum/worktree node spiele-dev/tools/th-marken.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const GRENZE = Number(process.argv[2] || 25)

const sonde = `function(){
  var W=[],p=new THREE.Vector3();
  scene.traverse(function(o){
    if(!o.userData||!o.userData.datei)return;
    o.getWorldPosition(p);W.push({d:o.userData.datei,x:p.x,z:p.z});});
  function nah(x,z){
    var best=null,bd=1e9,liste=[];
    for(var i=0;i<W.length;i++){var t=Math.hypot(W[i].x-x,W[i].z-z);
      if(t<bd){bd=t;best=W[i];}
      if(t<40)liste.push({d:W[i].d,t:+t.toFixed(1)});}
    liste.sort(function(a,b){return a.t-b.t;});
    var sd=1e9;
    for(var q=0;q<WORLD_SOLIDS.length;q++){var s=WORLD_SOLIDS[q];
      var dx=Math.max(0,Math.abs(x-s.x)-s.hw),dz=Math.max(0,Math.abs(z-s.z)-s.hd);
      var t2=Math.hypot(dx,dz); if(t2<sd)sd=t2;}
    return {modell:best?best.d:"-", mDist:+bd.toFixed(1), kol:+sd.toFixed(1),
            umfeld:liste.slice(0,5)};}
  return {poi:WORLD_POIS.map(function(P){var n=nah(P[0],P[1]);
            return {art:"Marke",name:P[3],x:P[0],z:P[1],m:n.mDist,k:n.kol,
                    modell:n.modell,umfeld:n.umfeld};}),
          lz:LIEFERZIELE.map(function(L){var n=nah(L[1],L[2]);
            return {art:"Lieferziel",name:L[0],x:L[1],z:L[2],m:n.mDist,k:n.kol,
                    modell:n.modell,umfeld:n.umfeld};}),
          modelle:W.length};}`

mitSonden('traumhaus.html', { marken: sonde }, '_marken.html')
const { browser, page, jsFehler } = await spielOeffnen('_marken.html', { warten: 58000 })
const r = await page.evaluate(() => window.__th.marken())
await browser.close()
aufraeumen('_marken.html')

const alle = [...r.poi, ...r.lz]
const zeile = (e) =>
  `  ${e.m > GRENZE && e.k > GRENZE ? '!!' : '  '} ${e.art.padEnd(10)} ${String(e.name).padEnd(18)}` +
  ` (${String(e.x).padStart(6)}|${String(e.z).padStart(5)})  Modell ${String(e.m).padStart(6)} m  ${e.modell.padEnd(26)} Kollider ${e.k} m`

console.log(`Modelle in der Welt: ${r.modelle} · Grenze ${GRENZE} m`)
alle.forEach((e) => console.log(zeile(e)))
/* Eine begruendete Ausnahme, kein pauschales Stummschalten: die Marke "Meer" zeigt
   auf offenes Wasser. Dort steht planmaessig nichts — das naechste Modell ist ein
   Segelboot in 83 m. Wer hier weitere Namen eintraegt, schreibt den Grund dazu. */
const ERLAUBT = {
  Meer: 'offenes Wasser, dort steht planmaessig nichts',
  /* Der Gipfel ist GELAENDE, kein Modell — er hat weder Mesh in Marker-Naehe noch
     Kollider, und trotzdem ist die Marke richtig. NACHGEMESSEN, nicht angenommen:
     gelaendeH(60,-420) = 170 m, und es faellt nach allen Seiten ab
     (x: 96,7 → 170 → 106,8 · z: 91,3 → 170 → 101,7). Ein Gipfel, wie er im Buche steht. */
  'Grosser Berg': 'Gelaendegipfel auf 170 m — Gelaende hat kein Modell und keinen Kollider',
}
const schlecht = alle.filter((e) => e.m > GRENZE && e.k > GRENZE && !ERLAUBT[e.name])
const geduldet = alle.filter((e) => e.m > GRENZE && e.k > GRENZE && ERLAUBT[e.name])
console.log(`\nVerdaechtig (Modell UND Kollider weiter als ${GRENZE} m): ${schlecht.length}`)
schlecht.forEach((e) => {
  console.log(`  ${e.name} (${e.x}|${e.z}) — im Umkreis 40 m:`)
  console.log('     ' + (e.umfeld.length ? e.umfeld.map((u) => `${u.d} ${u.t}m`).join(', ') : '— nichts —'))
})
geduldet.forEach((e) => console.log(`  (geduldet) ${e.name}: ${ERLAUBT[e.name]}`))
console.log('JS-Fehler:', jsFehler.length, jsFehler.slice(0, 3))
