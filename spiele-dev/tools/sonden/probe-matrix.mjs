/* Sonde: stimmt JEDE Weltmatrix? node probe-matrix.mjs [quelle]
   Runde 106: die Szene steht nicht mehr auf matrixAutoUpdate (spart ~30 ms je Bild, siehe traumhaus.html bei
   `scene.matrixAutoUpdate=false`). Vorher erzwang die Szene in jedem Bild `force` fuer alle 42'000 Knoten — das hat
   jede Stelle gerettet, die eine lokale Matrix aenderte, ohne es zu melden. Jetzt nicht mehr.
   Geprueft wird fuer jeden Knoten: matrixWorld == Eltern.matrixWorld x matrix (Toleranz 1e-4). Ausgenommen sind
   Knoten, die gerade als geaendert gemeldet sind (matrixWorldNeedsUpdate, auch bei einem Vorfahren) — die rechnet
   das naechste Bild ohnehin. Zeitpunkte: fertige Welt, nach einer Rundreise (6 Orte), in/nach drei Fahrgeschaeften,
   nachts, nach einem Bauvorgang.
   Gegenprobe: ein eingefrorenes Testobjekt, dessen .matrix danach direkt umgeschrieben wird, MUSS gemeldet werden. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const [A = 'traumhaus.html'] = process.argv.slice(2)
const TMP = '_probe_matrix_tmp.html'
mitSonden(A, {
  mpruef: `function(){var E=new THREE.Matrix4(),n=0,fehl=0,bsp=[];
    function pfad(o){var s=[];for(var x=o;x&&x!==scene&&s.length<4;x=x.parent)s.push(x.name||(x.userData&&x.userData.datei)||x.type);return s.join("<");}
    (function geh(o,offen){for(var i=0;i<o.children.length;i++){var c=o.children[i];n++;
      var off=offen||c.matrixWorldNeedsUpdate;
      if(!off){E.multiplyMatrices(o.matrixWorld,c.matrix);var a=E.elements,b=c.matrixWorld.elements,d=0;
        for(var k=0;k<16;k++){var q=Math.abs(a[k]-b[k]);if(q>d)d=q;}
        if(d>1e-4){fehl++;if(bsp.length<8)bsp.push(pfad(c)+" Δ"+d.toFixed(3)+(c.matrixAutoUpdate?" auto":" frost"));}}
      geh(c,off);}})(scene,false);
    return {knoten:n,fehl:fehl,bsp:bsp,szeneAuto:scene.matrixAutoUpdate};}`,
  kam: `function(x,z,r){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;followSim=null;camTx=x;camTz=z;camRT=r;camR=r;updCam();
    if(typeof lodTakt==="function")lodTakt(x,z);return true;}`,
  bild: `function(){return renderer.info.render.frame;}`,
  falle: `function(){var m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());m.name="GEGENPROBE";
    m.position.set(3,1,3);scene.add(m);m.updateMatrixWorld(true);m.matrixAutoUpdate=false;
    m.matrix.makeTranslation(40,1,40);return true;}`,
  bauen: `function(an){if(buildMode!==an)document.getElementById("modeBtn").onclick();return buildMode;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 60000 })
async function bilder(n) { const b0 = await page.evaluate(() => window.__th.bild()); for (let i = 0; i < 120; i++) { await page.waitForTimeout(500); if (await page.evaluate(() => window.__th.bild()) - b0 >= n) return } }
let schlecht = 0
async function pruef(wann) { const r = await page.evaluate(() => window.__th.mpruef()); schlecht += r.fehl
  console.log(`${wann.padEnd(30)} ${String(r.knoten).padStart(6)} Knoten  ${String(r.fehl).padStart(4)} falsch  szene.auto=${r.szeneAuto}` + (r.bsp.length ? '\n    ' + r.bsp.join('\n    ') : '')); return r }
const ru = await warteAufRuhe(page, { minSekunden: 150 })
await bilder(6)
await pruef(`fertige Welt (${ru.seite} s)`)
for (const [x, z, r] of [[78, 58, 44], [0, 20, 44], [117, 0, 44], [230, 0, 44], [-180, 60, 60], [0, 60, 20]]) { await page.evaluate((v) => window.__th.kam(...v), [x, z, r]); await bilder(4) }
await pruef('nach Rundreise (6 Orte)')
const F = await page.evaluate(() => window.__th.fahrten())
for (const f of F.slice(0, 3)) {
  await page.evaluate((v) => window.__th.tp(v.x + 3, v.z + 3), f); await bilder(3)
  const drin = await page.evaluate(() => window.__th.einsteigen()); await bilder(8)
  await pruef(`in Fahrt ${f.typ} (${drin ? 'drin' : 'nicht drin'})`)
  await page.evaluate(() => window.__th.aussteigen()); await bilder(3)
}
await page.evaluate(() => window.__th.zeit(23 * 60)); await bilder(6)
await pruef('nachts 23:00')
await page.evaluate(() => window.__th.zeit(12 * 60))
const bm = await page.evaluate(() => window.__th.bauen(true)); await bilder(4)
await pruef(`Baumodus (${bm})`)
await page.evaluate(() => window.__th.bauen(false)); await bilder(3)
await pruef('Baumodus wieder aus')
console.log(`\nSUMME falsche Weltmatrizen ueber alle Zeitpunkte: ${schlecht}`)
await page.evaluate(() => window.__th.falle()); await bilder(3)
const g = await pruef('GEGENPROBE (Matrix direkt)')
console.log(g.bsp.some((b) => b.includes('GEGENPROBE')) ? 'Gegenprobe: erkannt ✓' : 'Gegenprobe: NICHT erkannt — Messgeraet stumm (oder die Szene erzwingt noch force)')
if (jsFehler.length) console.log('JS-Fehler:', jsFehler.slice(0, 5))
await browser.close(); aufraeumen(TMP)
