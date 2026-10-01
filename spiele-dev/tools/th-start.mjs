/* th-start.mjs — Was sieht man, wenn das Spiel anfaengt?
 *
 * WOZU. Der User: „besser machen der start ist nicht tolle ort und platzierungen in
 * mitte passen nicht". Zwei Aussagen, zwei Messgroessen:
 *
 *   1. DER STARTORT. Wo steht der Bewohner in der ersten Sekunde, wie weit ist er von
 *      seinem eigenen Grundstueck weg — und ist er ueberhaupt im Bild? Das Letzte ist
 *      die eigentliche Frage: ein Startort, an dem man seine Figur nicht sieht, ist
 *      kein Startort, sondern ein Rechenfehler.
 *   2. DIE MITTE. Wie viele Objekte stehen im Grundstueck, und stehen sie sich
 *      gegenseitig im Weg (Mittelpunkte naeher als die Summe ihrer halben Breiten)?
 *
 * ⚠️ GEGENPROBE, OHNE DIE DAS GANZE WERTLOS WAERE. Beide Zahlen werden ZWEIMAL
 * erhoben: einmal wie die Welt ist, und einmal nachdem der Bewohner absichtlich in die
 * Grundstuecksmitte gesetzt wurde. Aendern sich Entfernung und Sichtbarkeit dann nicht,
 * misst das Werkzeug nicht den Bewohner, sondern irgendwas anderes — dann sind die
 * Zahlen oben Ausschuss. (Im Projekt sind genau daran schon vier Werkzeuge
 * aufgefallen: th-rand zaehlte Welt-Ebenen als Versiegelung, th-echt die Maschinenlast
 * statt der Welt, th-bewegung las den Ausgangswert nach der Drehung — zweimal.)
 *
 * ⚠️ UND DIE SICHTBARKEIT WIRD NICHT AUS DER KAMERA-ENTFERNUNG GERATEN, sondern mit
 * `project()` in Bildschirmkoordinaten gerechnet. Eine Figur kann 40 m entfernt und
 * mitten im Bild sein, oder 20 m entfernt und hinter dem Bildrand.
 *
 * Aufruf:  node spiele-dev/tools/th-start.mjs
 */
import { spielOeffnen, mitSonden, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_start_probe.html'

/* Eine Sonde, zwei Aufrufe: `wohin` setzt den Bewohner, `null` laesst ihn stehen. */
const MESSEN = 'function(wohin){' +
  'var s=sims[0]; if(!s)return null;' +
  'if(wohin){s.x=wohin[0];s.z=wohin[1];if(s.mesh)s.mesh.position.set(s.x,s.mesh.position.y,s.z);}' +
  /* Das Grundstueck kommt AUS DER WELT (Baufenster + Randstreifen), nicht aus dem Test. */
  'var BW=BAUW*CS/2+3, BH=BAUH*CS/2+3;' +
  /* Entfernung zur Einfahrt im Norden und zur Grundstuecksmitte. */
  'var dMitte=Math.hypot(s.x,s.z);' +
  'var dRand=Math.max(0,Math.abs(s.x)-BW)+Math.max(0,Math.abs(s.z)-BH);' +
  'var drin=(Math.abs(s.x)<=BW&&Math.abs(s.z)<=BH);' +
  /* Ist der Bewohner im Bild? In Bildschirmanteilen, 0..1 heisst sichtbar. */
  'var P=new THREE.Vector3(s.x,1.0,s.z); P.project(camera);' +
  'var sx=(P.x+1)/2, sy=(1-P.y)/2;' +
  'var imBild=(P.z<1 && sx>0.02 && sx<0.98 && sy>0.02 && sy<0.98);' +
  /* Wie leer ist die Umgebung des Startorts? Alles im Umkreis von 18 m. */
  'var nah=0, nahListe=[], W=new THREE.Vector3();' +
  '(window._gebaeude||[]).forEach(function(g){' +
    'var d=g.userData&&g.userData.datei; if(!d)return;' +
    'g.getWorldPosition(W);' +
    'var dd=Math.hypot(W.x-s.x,W.z-s.z);' +
    'if(dd<18){nah++; if(nahListe.length<6)nahListe.push(d+" "+dd.toFixed(0)+"m");}' +
  '});' +
  /* --- Die Mitte: was steht im Grundstueck, und stoert es sich? --- */
  'var innen=[], B=new THREE.Box3();' +
  '(window._gebaeude||[]).forEach(function(g){' +
    'var d=g.userData&&g.userData.datei; if(!d)return;' +
    'g.getWorldPosition(W);' +
    'if(Math.abs(W.x)>BW||Math.abs(W.z)>BH)return;' +
    'B.setFromObject(g);' +
    'var bx=(B.max.x-B.min.x)/2, bz=(B.max.z-B.min.z)/2;' +
    'if(!isFinite(bx)||bx<=0)return;' +
    'innen.push({d:d,x:+W.x.toFixed(2),z:+W.z.toFixed(2),rx:+bx.toFixed(2),rz:+bz.toFixed(2)});' +
  '});' +
  /* ⚠️ GEGENPROBE, DIE EINEN STARTORT ERST BRAUCHBAR MACHT: steht die Figur frei?
     Ein Platz kann mitten auf dem eigenen Grundstueck liegen und trotzdem IM Hindernis
     stecken — dann ruehrt sich der Bewohner beim ersten Schritt nicht. Geprueft werden
     alle Plaetze, die die Welt selbst vergibt, nicht nur der erste. */
  'var blockiert=[];' +
  'if(typeof heimX==="function"&&typeof inSolid==="function"){' +
    'for(var q=0;q<6;q++){var hx=heimX(q),hz=heimZ(q);' +
      'if(inSolid(hx,hz))blockiert.push(q+":("+hx.toFixed(1)+"|"+hz.toFixed(1)+")");}' +
  '}' +
  'return {blockiert:blockiert,x:+s.x.toFixed(2),z:+s.z.toFixed(2),state:s.state,BW:BW,BH:BH,' +
          'dMitte:+dMitte.toFixed(1),dRand:+dRand.toFixed(1),drin:drin,' +
          'sx:+sx.toFixed(3),sy:+sy.toFixed(3),tiefe:+P.z.toFixed(3),imBild:imBild,' +
          'camR:camR,camTx:+camTx.toFixed(1),camTz:+camTz.toFixed(1),' +
          'nah:nah,nahListe:nahListe,innen:innen};' +
'}'

mitSonden('traumhaus.html', { start: MESSEN }, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 45000 })
const A = await page.evaluate(() => window.__th.start(null))
if (!A) { console.log('❌ kein Bewohner — Messgeraet pruefen'); await browser.close(); aufraeumen(TMP); process.exit(1) }
/* Gegenprobe: in die Grundstuecksmitte setzen. */
const B = await page.evaluate(() => window.__th.start([0, 0]))
await browser.close()
aufraeumen(TMP)

console.log(`\n🏁 TH-START · Grundstueck ${(A.BW * 2).toFixed(0)} x ${(A.BH * 2).toFixed(0)} m`)
console.log(`\nBewohner bei Spielbeginn: (${A.x} | ${A.z})  Zustand "${A.state}"`)
console.log(`   auf dem eigenen Grundstueck: ${A.drin ? '✅ ja' : '❌ nein, ' + A.dRand + ' m davor'}`)
console.log(`   Entfernung zur Grundstuecksmitte: ${A.dMitte} m`)
console.log(`   Kamera blickt auf (${A.camTx} | ${A.camTz}), Abstand ${A.camR}`)
console.log(`   im Bild: ${A.imBild ? '✅' : '❌'}  Bildanteil x=${A.sx} y=${A.sy} (0..1 = sichtbar)`)
console.log(`   Objekte im Umkreis 18 m: ${A.nah}${A.nahListe.length ? ' — ' + A.nahListe.join(', ') : ' (leere Wiese)'}`)
console.log(`   Startplaetze im Hindernis: ${A.blockiert.length ? '❌ ' + A.blockiert.join(', ') : '✅ keiner von 6'}`)

/* --- Die Mitte --- */
const I = A.innen
let stoerend = 0
const paare = []
for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) {
  const a = I[i], b = I[j]
  const ux = (a.rx + b.rx) - Math.abs(a.x - b.x)
  const uz = (a.rz + b.rz) - Math.abs(a.z - b.z)
  if (ux > 0.3 && uz > 0.3) { stoerend++; if (paare.length < 8) paare.push(`${a.d} ✕ ${b.d} (${Math.min(ux, uz).toFixed(1)} m Ueberschnitt)`) }
}
console.log(`\n🏠 IM GRUNDSTUECK: ${I.length} Objekte`)
console.log(`   Paare, die sich durchdringen: ${stoerend}`)
paare.forEach(p => console.log(`      ${p}`))
I.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
  .forEach(o => console.log(`      ${o.d.padEnd(26)} (${String(o.x).padStart(7)} | ${String(o.z).padStart(7)})  ${(o.rx * 2).toFixed(1)}x${(o.rz * 2).toFixed(1)} m`))

console.log(`\n🔍 GEGENPROBE — Bewohner absichtlich auf (0|0) gesetzt`)
const bewegt = Math.abs(B.dMitte - A.dMitte) > 1
console.log(`   Entfernung aendert sich: ${bewegt ? '✅' : '❌'} ${A.dMitte} m → ${B.dMitte} m`)
console.log(`   dort im Bild: ${B.imBild ? '✅' : '❌'} (x=${B.sx} y=${B.sy})`)
if (!bewegt) console.log(`   ⚠️ Das Werkzeug misst NICHT den Bewohner. Zahlen oben sind Ausschuss.`)
console.log(`JS-Fehler: ${jsFehler.length ? jsFehler.slice(0, 2).join(' | ') : 'keine'}`)
process.exit(bewegt ? 0 : 1)
