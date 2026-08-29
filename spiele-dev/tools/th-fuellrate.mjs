/* th-fuellrate.mjs — was kosten die grossflaechigen Boden-Overlays wirklich?
 *
 * ⚠️ WOZU. Auf dem Handy ist die Fuellrate der Engpass, nicht die Dreieckszahl:
 * ein kartengrosses transparentes Plane faerbt den halben Bildschirm ein zweites
 * Mal ein. Fuenf solche Schichten liegen uebereinander (nahe Wiese, Maehstreifen,
 * Umland-Ring, Fern-Ebene, Wolkenschatten). Bevor man daran etwas aendert, muss
 * man wissen, was jede einzelne kostet — sonst optimiert man das Falsche, wie
 * schon bei saveGame und den Update-Funktionen (beide gemessen: unschuldig).
 *
 * ⚠️ ZUR AUSSAGEKRAFT. Dieser Container rendert in SOFTWARE. Absolute Millisekunden
 * sind darum wertlos. Der VERGLEICH taugt aber: Software-Rasterung kostet wie eine
 * Handy-GPU pro eingefaerbtem Pixel — eine Schicht, die hier 20 % kostet, kostet
 * auch dort etwas. Gemessen wird der Median ueber viele Bilder, nicht ein Bild.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_fuellrate_probe.html'
mitSonden('traumhaus.html', {
  fuell: `function(was,a){
    if(!window._SCHICHTEN){
      var L=[],box=new THREE.Box3();
      scene.traverse(function(n){
        if(!n.isMesh||!n.geometry||!n.material||!n.material.transparent)return;
        box.setFromObject(n);
        if(!isFinite(box.min.x))return;
        var bx=box.max.x-box.min.x,bz=box.max.z-box.min.z;
        if(box.max.y-box.min.y>4||bx*bz<20000)return;
        L.push({m:n,gr:Math.round(bx)+"x"+Math.round(bz),f:bx*bz});});
      L.sort(function(x,y){return y.f-x.f;});
      window._SCHICHTEN=L;}
    var L=window._SCHICHTEN;
    if(was==="liste")return L.map(function(s){return s.gr;});
    if(was==="zeige"){L.forEach(function(s,i){s.m.visible=(a===-1)||(i!==a);});return true;}
    if(was==="nurBoden"){L.forEach(function(s){s.m.visible=false;});return true;}
    if(was==="wechsel"){
      /* ⚠️ BLOCKWEISE MESSEN LUEGT. Erster Versuch: erst alle Schichten an messen,
         dann alle aus. Ergebnis: "aus" war LANGSAMER als "an" (-11 %) — die
         Software-Rasterung driftet ueber die Zeit staerker, als die Schichten
         kosten. Darum jetzt abwechselnd A B A B A B im selben Zeitfenster: die
         Drift trifft beide Seiten gleich und faellt aus der Differenz heraus. */
      var idx=a[0], runden=a[1], A=[], B=[];
      for(var r=0;r<runden;r++){
        for(var seite=0;seite<2;seite++){
          L.forEach(function(s,i){ s.m.visible = (seite===0) ? true : (idx===-1 ? false : i!==idx); });
          var t0=performance.now();renderer.render(scene,camera);
          (seite===0?A:B).push(performance.now()-t0);}}
      L.forEach(function(s){s.m.visible=true;});
      function med(v){v=v.slice().sort(function(x,y){return x-y;});return v[v.length>>1];}
      return {an:+med(A).toFixed(1), aus:+med(B).toFixed(1),
              streuung:+(med(A.map(function(x,i){return Math.abs(x-A[(i+1)%A.length]);}))).toFixed(1)};}
    if(was==="kamera"){ /* Spielernahe Sicht: flach ueber dem Boden, wo die Overlays den ganzen Schirm fuellen */
      camera.position.set(26,6,80);camera.lookAt(26,1,20);camera.updateMatrixWorld(true);return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const F = (...a) => page.evaluate((args) => window.__th.fuell(...args), a)
const R = 6                     // Runden je Vergleich, jede Runde ein Bild pro Seite

await F('kamera')
const namen = await F('liste')
console.log(`${namen.length} transparente Grossflaechen: ${namen.join(', ')}\n`)
await F('mess_warm')            // no-op, faellt auf null zurueck
await F('wechsel', [-1, 2])     // aufwaermen: Shader + Texturen sind beim ersten Bild teuer

const zeile = (was, e) => {
  const d = e.an - e.aus
  const rausch = e.streuung
  const sicher = Math.abs(d) > rausch
  console.log(`  ${was.padEnd(26)} an ${String(e.an).padStart(6)} ms · aus ${String(e.aus).padStart(6)} ms · ` +
    `Unterschied ${(d >= 0 ? '+' : '') + d.toFixed(1)} ms (${(d / e.an * 100).toFixed(0)} %) · ` +
    `Rauschen ±${rausch} ms → ${sicher ? 'messbar' : 'IM RAUSCHEN'}`)
  return { d, rausch, sicher }
}

console.log('Abwechselnd gemessen (A B A B …), damit die Drift aus der Differenz faellt:\n')
const ges = zeile('ALLE Schichten', await F('wechsel', [-1, R]))
for (let i = 0; i < namen.length; i++) zeile(`nur ${namen[i]}`, await F('wechsel', [i, R]))

console.log(`\n${ges.sicher
  ? `→ Die Boden-Overlays kosten zusammen messbar ${ges.d.toFixed(1)} ms.`
  : `→ BEFUND: Die Boden-Overlays sind NICHT der Engpass. Alle fuenf zusammen liegen `
  + `mit ${ges.d.toFixed(1)} ms im Rauschen (±${ges.rausch} ms). Wer hier optimiert, optimiert das Falsche.`}`)
console.log(`\nJS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
