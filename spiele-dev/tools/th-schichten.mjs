/* th-schichten.mjs — was liegt grossflaechig und transparent ueber der Karte?
 *
 * WOZU: Auf dem Handy ist nicht die Dreieckszahl der Engpass, sondern die Fuellrate —
 * wie oft der Bildschirm pro Bild neu eingefaerbt wird. Ein einziges kartengrosses
 * transparentes Plane kostet dabei mehr als tausend kleine Haeuser, weil es unter
 * ALLEM liegt und ueber die ganze Sichtflaeche geht. Beim Leistungs-Lauf fielen fuenf
 * solche Schichten auf; dieses Werkzeug listet sie mit Flaeche, Material-Modus und
 * gemessenem Deckungsgrad, damit man weiss, welche man anfassen darf.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_schichten_probe.html'
mitSonden('traumhaus.html', {
  schichten: `function(){
    var out=[],box=new THREE.Box3();
    scene.traverse(function(n){
      if(!n.isMesh||!n.geometry)return;
      box.setFromObject(n);
      if(!isFinite(box.min.x))return;
      var bx=box.max.x-box.min.x, bz=box.max.z-box.min.z, by=box.max.y-box.min.y;
      if(by>4)return;                 /* nur flach */
      if(bx*bz<40000)return;          /* nur gross: >200x200 m */
      var m=n.material;
      out.push({name:n.name||(n.parent&&n.parent.name)||"(ohne Namen)",
        typ:n.geometry.type, mat:m&&m.type,
        breite:+bx.toFixed(0), tiefe:+bz.toFixed(0), flaeche:Math.round(bx*bz),
        y:+((box.min.y+box.max.y)/2).toFixed(2),
        transparent:!!(m&&m.transparent), opacity:m?m.opacity:null,
        alphaTest:m?m.alphaTest:null, depthWrite:m?m.depthWrite:null,
        hatKarte:!!(m&&m.map), sichtbar:n.visible, renderOrder:n.renderOrder,
        seiten:m?m.side:null});});
    out.sort(function(a,b){return b.flaeche-a.flaeche;});
    return out;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const L = await page.evaluate(() => window.__th.schichten())
console.log(`${L.length} flache Grossflaechen (>200×200 m, <4 m hoch)\n`)
for (const s of L)
  console.log([
    s.name.padEnd(26).slice(0, 26),
    `${String(s.breite).padStart(4)}×${String(s.tiefe).padEnd(4)}m`,
    `y=${String(s.y).padStart(6)}`,
    (s.transparent ? `TRANSP op=${s.opacity}` : 'opak      ').padEnd(18),
    `alphaTest=${s.alphaTest}`,
    `depthWrite=${s.depthWrite ? 'ja' : 'nein'}`,
    s.hatKarte ? 'Textur' : '—',
    s.sichtbar ? '' : '(unsichtbar)',
  ].join('  '))
console.log(`\nJS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
