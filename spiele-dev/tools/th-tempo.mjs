/* th-tempo.mjs — wohin die Bildzeit geht.
 *
 *   node spiele-dev/tools/th-tempo.mjs [datei.html]
 *
 * WARUM: "das Spiel laggt" ist ein Gefuehl, kein Befund. Ohne Aufteilung in
 * Renderzeit und Spiellogik wird an der falschen Stelle optimiert — genau das ist in
 * dieser Sitzung schon einmal passiert: die naheliegende Vermutung "zu viele Pixel"
 * war messbar falsch, die Ursache war eine gerenderte Szene hinter einer deckenden
 * Menue-Flaeche.
 *
 * ⚠️ HANDY ODER RECHNER — DAS WERKZEUG MUSS ES SAGEN. Das Spiel entscheidet ueber
 * `_mobil`, und das prueft `Math.min(screen.width, screen.height) < 820`. Playwright
 * setzt `screen` standardmaessig auf das FENSTER — mit dem 1100x620-Standard ist 620 < 820,
 * also lief jede Messung im HANDY-Modus: Schatten aus, `_schattenSparen()` aktiv,
 * Pixel-Deckel 1,35. Das war beim ersten Lauf nicht bemerkt worden und macht jede
 * Desktop-Aussage wertlos. Jetzt wird `screen` explizit gesetzt und der Modus mitgemeldet;
 * `--desktop` misst den Rechner-Pfad (Schatten AN), sonst den Handy-Pfad.
 *
 * ⚠️ WAS DIESER CONTAINER NICHT MESSEN KANN: die echte Bildrate. Hier laeuft
 * SwiftShader, ein reiner Software-Rasterizer ohne GPU. Alles, was auf einem Geraet
 * die Grafikkarte macht (Fuellrate, Schatten, Transparenz), ist hier dramatisch
 * teurer und ueberzeichnet. Vergleichbar sind dagegen die CPU-seitigen Zahlen:
 * Zeichenaufrufe, Dreiecke, Objekte in der Szene, Matrix-Updates und die reine
 * JS-Zeit der Spiellogik. Absolute fps aus diesem Werkzeug NIE als Geraetewert
 * weitergeben; Verhaeltnisse und Anzahlen schon.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const desktop = process.argv.includes('--desktop')
const datei = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'traumhaus.html'
const tmp = '_tempo_tmp.html'

const sonden = {
  tempo: `function(){
    var r=renderer.info.render, m=renderer.info.memory;
    var objekte=0, meshes=0, sichtbar=0, dreieckeSichtbar=0, autoMat=0, schattenWerfer=0;
    var lichter=[], mats={}, geos=0;
    scene.traverse(function(o){
      objekte++;
      if(o.isLight)lichter.push({t:o.type,s:!!o.castShadow,
        g:o.shadow&&o.shadow.mapSize?o.shadow.mapSize.width:0});
      if(o.matrixAutoUpdate)autoMat++;
      if(!o.isMesh)return;
      meshes++;
      if(o.castShadow)schattenWerfer++;
      if(o.visible&&(!o.parent||o.parent.visible))sichtbar++;
      var mt=o.material; if(mt){var k=(mt.type||"?")+(mt.transparent?"+alpha":"");mats[k]=(mats[k]||0)+1;}
      if(o.geometry&&o.geometry.attributes&&o.geometry.attributes.position)geos++;});
    return {calls:r.calls,tri:r.triangles,linien:r.lines,
            geometrien:m.geometries,texturen:m.textures,
            objekte:objekte,meshes:meshes,sichtbar:sichtbar,autoMat:autoMat,
            schattenWerfer:schattenWerfer,lichter:lichter,materialien:mats,
            pixel:[renderer.domElement.width,renderer.domElement.height],
            schatten:renderer.shadowMap.enabled,
            schattenGr:(function(){var g=0;scene.traverse(function(o){
              if(o.isLight&&o.castShadow&&o.shadow&&o.shadow.mapSize)g=Math.max(g,o.shadow.mapSize.width);});return g;})(),
            mobil:(typeof _mobil!=="undefined")?_mobil:null,
            schirm:[screen.width,screen.height],
            lod:(typeof _lodBereit!=="undefined")?_lodBereit:null,
            eingefroren:(window._eingefrorenAnzahl||null)};}`,
  /* Renderzeit gegen Gesamtzeit: EINMAL zusaetzlich rendern und stoppen. Das ist
     nicht die exakte Bildzeit, aber der Anteil stimmt — und der Anteil ist die Frage. */
  takte: `function(n){
    var t=[],r=[];
    for(var i=0;i<n;i++){
      var a=performance.now(); renderer.render(scene,camera); var b=performance.now();
      r.push(b-a);}
    r.sort(function(x,y){return x-y;});
    return {median:+r[(r.length/2)|0].toFixed(1),min:+r[0].toFixed(1),max:+r[r.length-1].toFixed(1)};}`
}

mitSonden(datei, sonden, tmp)
const { browser, page, jsFehler } = await spielOeffnen(tmp,
  { viewport: { width: 1100, height: 620 },
    /* `screen` explizit: sonst erbt es das Fenster und `_mobil` kippt ungewollt. */
    screen: desktop ? { width: 1920, height: 1080 } : { width: 412, height: 915 } })

/* Bildrate im LAUFENDEN Spiel (nicht im Menue) */
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now()
  ;(function f() { n++
    if (performance.now() - t0 < 6000) requestAnimationFrame(f)
    else res(+(n / ((performance.now() - t0) / 1000)).toFixed(2)) })()
}))
const t = await page.evaluate(() => window.__th.tempo())
const r = await page.evaluate(() => window.__th.takte(5))
await browser.close(); aufraeumen(tmp)

const ms = (1000 / fps)
console.log(`\n=== Tempo (${datei}) ===\n`)
console.log(`Modus                    ${t.mobil ? '📱 HANDY' : '🖥️  RECHNER'}   (screen ${t.schirm[0]}x${t.schirm[1]}, _mobil=${t.mobil})`)
console.log(`Bildrate im Spiel        ${fps}/s  =  ${ms.toFixed(0)} ms je Bild   ⚠️ Software-Rasterizer, kein Geraetewert`)
console.log(`Davon reines Rendern     ${r.median} ms  (min ${r.min} · max ${r.max})  = ${(100 * r.median / ms).toFixed(0)} % der Bildzeit`)
console.log(`Rest (Spiellogik + Rest) ${(ms - r.median).toFixed(0)} ms  = ${(100 * (ms - r.median) / ms).toFixed(0)} %`)
console.log(`\nZeichenaufrufe           ${t.calls}      Dreiecke ${t.tri.toLocaleString('de-CH')}`)
console.log(`Leinwand                 ${t.pixel[0]}x${t.pixel[1]} px`)
console.log(`Objekte in der Szene     ${t.objekte}   davon Meshes ${t.meshes}  (sichtbar ${t.sichtbar})`)
console.log(`Geometrien / Texturen    ${t.geometrien} / ${t.texturen}`)
console.log(`matrixAutoUpdate an      ${t.autoMat}   (jedes davon kostet pro Bild eine Matrix)`)
console.log(`Schattenwerfer           ${t.schattenWerfer}   Schattenkarte: ${t.schatten ? `an (${t.schattenGr}px)` : 'aus'}`)
console.log(`Lichter                  ${t.lichter.map(l => l.t + (l.s ? ` (Schatten ${l.g})` : '')).join(', ')}`)
console.log(`Materialien              ${Object.entries(t.materialien).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join('  ')}`)
if (jsFehler.length) console.log('JS-Fehler:', jsFehler.slice(0, 3))
