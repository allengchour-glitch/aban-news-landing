/* th-zkampf.mjs — VERDACHTSLISTE, kein Urteil. NICHT im Tor.
 *
 * ⚠️ ZUERST LESEN: seine Funde sind NICHT als sichtbare Fehler bestaetigt. Der
 * staerkste Kandidat der Liste (616 m², exakt 0,0 mm Abstand, deutlich verschiedene
 * Farben, bei 233|202) wurde mit `th-flacker.mjs` nachgeprueft — dort kippen 0,00 %
 * der Bildpunkte. Es flackert nicht.
 * Der Grund ist grundsaetzlich: diese Pruefung rechnet GEOMETRIE. Dass zwei Flaechen
 * nah beieinanderliegen, heisst nicht, dass beide sichtbar sind — eine kann unter
 * einem Gebaeude liegen, verdeckt sein oder nie ins Bild kommen.
 * Darum gehoert das Werkzeug NICHT ins Tor. Wer eine Zeile daraus verfolgt, belegt
 * sie zuerst mit th-flacker; sonst behebt er etwas, das niemand sieht.
 *
 * (urspruenglich: flackern zwei Flaechen gegeneinander?)
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
 * ⚠️ HUELLKOERPER SIND KEIN FLAECHENMASS — erster Lauf, erste Lehre. Die Pruefung
 * meldete 543 Paare, das groesste mit 149'000 m² Ueberlappung. Kein Bauwerk ist so
 * gross: der Huellkoerper eines STRASSENNETZES umspannt die halbe Karte, obwohl die
 * Geometrie nur duenne Baender sind. Zwei solche Huellen ueberlappen sich fast immer,
 * ohne dass sich die Flaechen je beruehren.
 * Darum wird die ECHTE Flaeche gerechnet (Dreiecke, auf die Grundebene projiziert) und
 * verglichen: deckt die Geometrie weniger als ein Drittel ihrer Huelle, ist sie ein
 * Geflecht und wird uebersprungen. Wie viele das sind, steht im Bericht — eine stille
 * Ausnahme waere so schlecht wie die falsche Zahl.
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
      /* Echte Grundflaeche aus den Dreiecken — sonst zaehlt ein Geflecht wie eine Platte. */
      var g=o.geometry,pos=g.attributes&&g.attributes.position,echt=0;
      if(pos){
        var idx=g.index?g.index.array:null, n3=idx?idx.length:pos.count;
        var ax=new THREE.Vector3(),bx=new THREE.Vector3(),cx=new THREE.Vector3();
        for(var t=0;t+2<n3;t+=3){
          var i0=idx?idx[t]:t,i1=idx?idx[t+1]:t+1,i2=idx?idx[t+2]:t+2;
          ax.fromBufferAttribute(pos,i0);bx.fromBufferAttribute(pos,i1);cx.fromBufferAttribute(pos,i2);
          ax.applyMatrix4(o.matrixWorld);bx.applyMatrix4(o.matrixWorld);cx.applyMatrix4(o.matrixWorld);
          /* Nur die Grundriss-Flaeche: senkrechte Waende zaehlen hier nicht. */
          echt+=Math.abs((bx.x-ax.x)*(cx.z-ax.z)-(cx.x-ax.x)*(bx.z-ax.z))/2;}}
      if(echt<flaeche*0.33){window.__zkGeflecht=(window.__zkGeflecht||0)+1;return;}
      out.push({x0:b.min.x,x1:b.max.x,z0:b.min.z,z1:b.max.z,
                y:(b.min.y+b.max.y)/2,
                farbe:m.color?"#"+m.color.getHexString():"?",
                name:(o.userData&&o.userData.datei)||o.name||(m.name||"")});});
    return out;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const F = await page.evaluate(() => window.__th.flach())
const geflecht = await page.evaluate(() => window.__zkGeflecht || 0)
await browser.close()
aufraeumen(TMP)

console.log(`\n${F.length} flache Flaechen (unter 0,25 m hoch, ueber 1 m²) geprueft.`)
console.log(`${geflecht} als Geflecht uebersprungen — ihre Geometrie deckt weniger als` +
  ' ein Drittel ihrer Huelle (Strassennetze, Markierungsbaender).')
/* Paare mit Ueberlappung in xz und fast gleicher Hoehe. */
/* Farbabstand: unter 12 von 255 je Kanal sieht man den Wechsel nicht. */
function kanal (h, i) { return parseInt(h.substr(1 + i * 2, 2), 16) || 0 }
function naheFarbe (p, q) {
  if (!p || !q || p[0] !== '#' || q[0] !== '#') return false
  return Math.abs(kanal(p, 0) - kanal(q, 0)) < 12 &&
         Math.abs(kanal(p, 1) - kanal(q, 1)) < 12 &&
         Math.abs(kanal(p, 2) - kanal(q, 2)) < 12
}
const funde = []
let gleich = 0
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
    /* ⚠️ GLEICHE FARBE KANN NICHT SICHTBAR FLACKERN. Der zweite Lauf meldete reihenweise
       Paare wie „#4a4a53 ↔ #4a4a53" — zwei Asphaltplatten auf 1 mm. Sie streiten zwar
       um die Tiefe, aber das Ergebnis sieht in beiden Faellen gleich aus. Ein
       Grafikfehler ist es erst, wenn der Streit zu SEHEN ist. */
    if (naheFarbe(a.farbe, b.farbe)) { gleich++; continue }
    funde.push({ u, dy, a, b })
  }
}
funde.sort((p, q) => q.u - p.u)
console.log(`${gleich} Paare uebersprungen, weil beide Flaechen dieselbe Farbe tragen —` +
  ' sie streiten um die Tiefe, aber der Streit ist nicht zu sehen.')
if (!funde.length) console.log('✅ Kein sichtbarer Tiefenstreit.')
else {
  console.log(`❌ ${funde.length} Paare koennen sichtbar flackern:`)
  /* ⚠️ OHNE ORT IST KEINE ZEILE UEBERPRUEFBAR — dieselbe Lehre wie bei th-vielfalt.
     Die Mitte der Ueberlappung sagt, wohin die Kamera muss. */
  for (const f of funde.slice(0, 14)) {
    const mx = Math.round((Math.max(f.a.x0, f.b.x0) + Math.min(f.a.x1, f.b.x1)) / 2)
    const mz = Math.round((Math.max(f.a.z0, f.b.z0) + Math.min(f.a.z1, f.b.z1)) / 2)
    console.log(`   ${String(Math.round(f.u)).padStart(5)} m² · ${(f.dy * 1000).toFixed(1)} mm · ` +
      `bei (${mx}|${mz}) y ${f.a.y.toFixed(3)} · ${f.a.farbe} ${String(f.a.name).slice(0, 18)}` +
      `  ↔  ${f.b.farbe} ${String(f.b.name).slice(0, 18)}`)
  }
}
console.log(`\nJS-Fehler: ${jsFehler.length}`)
process.exit(funde.length ? 1 : 0)
