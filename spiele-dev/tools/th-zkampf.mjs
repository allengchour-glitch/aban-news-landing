/* th-zkampf.mjs — flackern zwei Flaechen gegeneinander?
 *
 *   node spiele-dev/tools/th-zkampf.mjs [mindestUeberlappung=4]
 *
 * ⚠️ WOZU. Diese Welt legt viel flach uebereinander: Rasen, Maehstreifen, Fahrbahnen,
 * Markierungen, Gehwege, Bauplatz-Baender. Liegen zwei davon fast auf derselben Hoehe
 * und ueberlappen sich, entscheidet die Tiefenpruefung je Bildpunkt zufaellig, welche
 * gewinnt — im Bild ein wanderndes Flimmermuster, das sich mit der Kamera bewegt.
 * Auf dem Handy (kleinere Tiefengenauigkeit) faellt es staerker auf als hier.
 *
 * Die bestehenden Pruefungen finden das NICHT zuverlaessig: `th-flimmern` sieht nur
 * dorthin, wo seine Kamera steht, und `th-boden` fragt nach dem Untergrund, nicht nach
 * Paaren. Diese Pruefung ist rein geometrisch — kein Bild, kein Zufall.
 *
 * ⚠️ NICHT JEDE NAEHE IST EIN FEHLER. Flaechen mit `polygonOffset` sind ausdruecklich
 * fuer genau diesen Fall gebaut (die Blob-Schatten nutzen das), und `depthWrite:false`
 * nimmt einer Flaeche die Teilnahme am Streit. Beides wird ausgenommen — sonst zaehlt
 * das Werkzeug Bauteile als Fehler.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const MIN = Number(process.argv[2] || 4)      /* Quadratmeter Ueberlappung */
const TMP = 'spiele-dev/tools/_zkampf_probe.html'
mitSonden('traumhaus.html', {
  flach: `function(){
    var out=[];
    scene.traverse(function(o){
      if(!o.isMesh||!o.geometry)return;
      var m=Array.isArray(o.material)?o.material[0]:o.material;
      if(!m)return;
      /* Ausdruecklich fuer Naehe gebaut → kein Streit. */
      if(m.polygonOffset||m.depthWrite===false||m.depthTest===false)return;
      var b=new THREE.Box3().setFromObject(o);
      if(!isFinite(b.min.x))return;
      var hoehe=b.max.y-b.min.y;
      if(hoehe>0.25)return;                    /* keine flache Flaeche */
      var flaeche=(b.max.x-b.min.x)*(b.max.z-b.min.z);
      if(flaeche<1)return;                     /* Kleinkram interessiert nicht */
      out.push({x0:b.min.x,x1:b.max.x,z0:b.min.z,z1:b.max.z,
                y:(b.min.y+b.max.y)/2,
                farbe:m.color?"#"+m.color.getHexString():"?",
                name:(o.userData&&o.userData.datei)||o.name||(m.name||"")});});
    return out;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const F = await page.evaluate(() => window.__th.flach())
await browser.close()
aufraeumen(TMP)

console.log(`\n${F.length} flache Flaechen (unter 0,25 m hoch, ueber 1 m²) geprueft.`)
/* Paare mit Ueberlappung in xz und fast gleicher Hoehe. */
const funde = []
for (let i = 0; i < F.length; i++) {
  for (let j = i + 1; j < F.length; j++) {
    const a = F[i], b = F[j]
    const dy = Math.abs(a.y - b.y)
    if (dy > 0.005) continue                   /* 5 mm: darunter streiten sie */
    const ux = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
    const uz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0)
    if (ux <= 0 || uz <= 0) continue
    const u = ux * uz
    if (u < MIN) continue
    funde.push({ u, dy, a, b })
  }
}
funde.sort((p, q) => q.u - p.u)
if (!funde.length) console.log('✅ Kein Flaechenpaar streitet um dieselbe Tiefe.')
else {
  console.log(`❌ ${funde.length} Paare liegen naeher als 5 mm beieinander und ueberlappen sich:`)
  for (const f of funde.slice(0, 14))
    console.log(`   ${Math.round(f.u)} m² · ${(f.dy * 1000).toFixed(1)} mm Abstand · ` +
      `y ${f.a.y.toFixed(3)} · ${f.a.farbe} ${String(f.a.name).slice(0, 22)}` +
      `  ↔  ${f.b.farbe} ${String(f.b.name).slice(0, 22)}`)
}
console.log(`\nJS-Fehler: ${jsFehler.length}`)
process.exit(funde.length ? 1 : 0)
