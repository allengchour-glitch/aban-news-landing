/* th-bewegung.mjs — Ist die Bewegung fluessig, oder springt sie?
 *
 * WOZU. Der User: "mach bewegung schoener von allen und fluessig".
 *
 * ⚠️ WARUM DIESES WERKZEUG NICHT MISST, WAS MAN SIEHT — und trotzdem das Richtige misst.
 * Der erste Entwurf zaehlte je BILD: groesste Drehung in einem Bild, Temposprung je Bild.
 * Gemessen hat er nichts, und seine Gegenprobe sagte das auch: "die Zahlen oben sind
 * wertlos". Der Grund ist grundsaetzlich und betrifft jedes kuenftige Werkzeug hier:
 *
 *     DIESER CONTAINER RENDERT 2 BIS 6 BILDER PRO SEKUNDE (Software-Renderer).
 *
 * Bei 2 fps ist ein Bildschritt eine halbe Sekunde. Eine saubere Drehung und ein
 * Richtungssprung sehen darin GLEICH aus — die Frage "springt es innerhalb eines Bildes"
 * ist hier nicht beantwortbar. (Der erste Entwurf verwarf zudem jede Probe mit dt > 0,5 s
 * und kam so auf null Messungen.)
 *
 * Also wird die LOGIK gemessen, nicht das Bild: `simWalk(s, dt)` wird mit FESTEM
 * Zeitschritt 1/60 s aufgerufen und Schritt fuer Schritt protokolliert. Das ist exakt,
 * wiederholbar und von der Bildrate unabhaengig. Drei Fragen:
 *
 *   1. UEBER WIE VIELE SCHRITTE laeuft eine 90-Grad-Kurve? Eins heisst: Sprung.
 *   2. WIE VIELE SCHRITTE braucht die Figur von 0 auf volles Tempo, und zurueck?
 *      Null heisst: sie faehrt an wie ein Schalter.
 *   3. PASST DIE SCHRITTANIMATION ZUM TEMPO? Gemessen als Spanne des Verhaeltnisses
 *      Schrittrate / Tempo. 1,00 heisst: die Fuesse passen immer.
 *
 * ⚠️ GEGENPROBE: bewegt sich die Figur ueberhaupt? Ohne diese Frage saehe eine Figur,
 * die gar nicht laeuft, wie perfekt fluessige Bewegung aus — genau das ist dem ersten
 * Entwurf passiert (der Bewohner stand die ganzen 40 s im Zustand "idle").
 *
 * Aufruf:  node spiele-dev/tools/th-bewegung.mjs
 */
import { spielOeffnen, mitSonden, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_bewegung_probe.html'

const BAHN = 'function(){' +
  'var s=sims[0]; if(!s)return null;' +
  /* Eine Bahn mit einer rechtwinkligen Ecke: erst nach Norden, dann nach Osten. */
  's.state="walk";s.pose="stand";s.target=null;s.useT=0;' +
  's.x=cx(10);s.z=cz(6);s.rot=0;s.walkT=0;' +
  's.path=[[10,14],[18,14]];' +
  'var out=[],dt=1/60;' +
  'for(var i=0;i<900;i++){' +
    'var ax=s.x,az=s.z,ar=s.rot||0,aw=s.walkT||0;' +
    'simWalk(s,dt);' +
    'var d=(s.rot||0)-ar; d=Math.atan2(Math.sin(d),Math.cos(d));' +
    'out.push({dg:Math.abs(d)*180/Math.PI,' +
              'v:Math.hypot(s.x-ax,s.z-az)/dt,' +
              'dw:((s.walkT||0)-aw)/dt});' +
    'if(s.state!=="walk")break;}' +
  'return out;}'

/* Zweite Probe: ein TIER absichtlich um 180 Grad umdrehen lassen und zaehlen, ueber
   wie viele Schritte das geschieht. Auch hier mit festem dt — aus demselben Grund. */
const TIER = 'function(){' +
  'var T=(window._tiere&&window._tiere.land)||[]; if(!T.length)return null;' +
  'var an=T[0];' +
  'var out=[],dt=1/60,now=performance.now();' +
  'for(var i=0;i<300;i++){' +
    /* \u26a0\ufe0f DIE WENDE MUSS INNERHALB DER SCHLEIFE PASSIEREN. Stand sie davor, sah die
       Schleife auf der alten Fassung gar nichts: dort folgt die Richtung dem Ziel
       sofort, die Drehung war also schon vorbei, bevor gemessen wurde. Gemessen
       wurden dann nur die Zufallsschlenker (7,6 Grad) — und das haette wie eine
       bereits fluessige Drehung ausgesehen. */
    'var vr=(an.dreh!==undefined?an.dreh:an.head);' +
    'if(i===1)an.head=vr+Math.PI;' +
    'updTiere(dt,now+i*16);' +
    'var nr=(an.dreh!==undefined?an.dreh:an.head);' +
    'var d=nr-vr; d=Math.atan2(Math.sin(d),Math.cos(d));' +
    'out.push(Math.abs(d)*180/Math.PI);}' +
  'return out;}'

mitSonden('traumhaus.html', { bahn: BAHN, tier: TIER }, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 22000 })
const P = await page.evaluate(() => window.__th.bahn())
const TI = await page.evaluate(() => window.__th.tier())
await browser.close()
aufraeumen(TMP)

if (!P || !P.length) { console.log('❌ keine Schritte erfasst — Messgeraet pruefen'); process.exit(1) }

const strecke = P.reduce((s, p) => s + p.v / 60, 0)
const bewegt = strecke > 5
const vMax = Math.max(...P.map(p => p.v))
const maxDg = Math.max(...P.map(p => p.dg))
const drehSchritte = P.filter(p => p.dg > 0.05).length
const grosseDreh = P.filter(p => p.dg > 20).length
/* Anfahren: Schritte vom ersten Zucken bis 95 % des Spitzentempos. */
let anfahrt = 0
for (const p of P) { if (p.v > 0.01) { anfahrt++; if (p.v >= vMax * 0.95) break } }
/* Bremsen: Schritte vom letzten Vollgas bis Stillstand. */
let letztVoll = 0
P.forEach((p, i) => { if (p.v >= vMax * 0.95) letztVoll = i })
const bremsen = P.length - 1 - letztVoll
const takte = P.filter(p => p.v > 0.5 && p.dw > 0)
const q = takte.map(p => p.dw / p.v)
const qMin = q.length ? Math.min(...q) : 0, qMax = q.length ? Math.max(...q) : 0

console.log(`\n🏃 TH-BEWEGUNG · ${P.length} Schritte a 1/60 s · ${strecke.toFixed(1)} m gelaufen`)
console.log(`\n1. Richtung`)
console.log(`   groesste Drehung in EINEM Schritt : ${maxDg.toFixed(1)}°`)
console.log(`   Schritte mit Drehung             : ${drehSchritte} (davon ueber 20°: ${grosseDreh})`)
console.log(`   → eine 90°-Kurve in einem einzigen Schritt ist ein Sprung, kein Drehen`)
console.log(`\n2. Tempo (Spitze ${vMax.toFixed(2)} m/s)`)
console.log(`   Schritte zum Anfahren            : ${anfahrt}`)
console.log(`   Schritte zum Anhalten            : ${bremsen}`)
console.log(`\n3. Fuesse`)
console.log(q.length
  ? `   Schrittrate je m/s               : ${qMin.toFixed(2)} … ${qMax.toFixed(2)} (Spanne ${(qMax / Math.max(qMin, 1e-6)).toFixed(2)}×)`
  : `   keine Schrittdaten`)

if (TI && TI.length) {
  const tMax = Math.max(...TI)
  const tSchritte = TI.filter(d => d > 0.05).length
  console.log(`\n4. Tiere (eines absichtlich um 180° umgedreht)`)
  console.log(`   groesste Drehung in EINEM Schritt : ${tMax.toFixed(1)}°`)
  console.log(`   Schritte, ueber die gedreht wird  : ${tSchritte}`)
} else console.log(`\n4. Tiere: keine erfasst`)

console.log(`\n🔍 GEGENPROBE`)
console.log(`   Figur bewegt sich ueberhaupt (> 5 m): ${bewegt ? '✅' : '❌ sie steht — alle Zahlen oben waeren Schein'} ${strecke.toFixed(1)} m`)
console.log(`JS-Fehler: ${jsFehler.length ? jsFehler.slice(0, 2).join(' | ') : 'keine'}`)
process.exit(bewegt ? 0 : 1)
