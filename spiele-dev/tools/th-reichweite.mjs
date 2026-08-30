/* th-reichweite.mjs — ist eine Serie von 12 ueberhaupt erreichbar?
 *
 * ⚠️ WOZU. komboMult deckelt den Aufschlag bei einer Kette von 12. Diese Zahl ist eine
 * BEHAUPTUNG ueber das Spiel, keine ueber den Code: sie stimmt nur, wenn es genug
 * Verdienst-Gelegenheiten gibt, die schnell genug aufeinander folgen. Das Serienfenster
 * schrumpft von 28,6 s auf 14 s — wer zwischen zwei Muenzen 20 s laeuft, kommt nie ueber
 * die Haelfte, und die obere Haelfte der Kurve waere Fiktion.
 *
 * Gemessen wird darum die WELT: Gehtempo, Zahl und Lage der Muenzen, und daraus die
 * laengste Kette, die ein Mensch tatsaechlich laufen kann.
 *
 * ⚠️ UND EINE FALLE, DIE MICH SCHON ERWISCHT HAT: das Gehtempo darf NICHT mit der
 * Wanduhr gemessen werden. Der Headless-Browser rendert hier mit ~2 Bildern/s; eine
 * Messung ueber `waitForTimeout` ergab 0,24 m/s statt 4,0 — in allen vier Richtungen
 * auf zwei Stellen gleich, was der Hinweis war. Darum wird `steerMove` umhuellt und
 * dessen `dt` aufsummiert: gemessen wird Weg pro SPIELZEIT, nicht pro Echtzeit. Das ist
 * unabhaengig von der Bildrate und misst genau das, was die Spielerin erlebt.
 *
 * Aufruf:  node spiele-dev/tools/th-reichweite.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_reichweite_probe.html'
mitSonden('traumhaus.html', {
  rw: `function(was,a){
    if(was==="muenzen")return pickups.map(function(p){
      return {x:+p.x.toFixed(2),z:+p.z.toFixed(2),lohn:p.reward,aktiv:!!p.active,gift:!!p.gift};});
    if(was==="figur")return sims&&sims[0]?{x:+sims[0].x.toFixed(3),z:+sims[0].z.toFixed(3)}:null;
    if(was==="steuer"){steer.x=a[0];steer.z=a[1];return {x:steer.x,z:steer.z,aktiv:steerActive()};}
    /* Weg pro Spielzeit: steerMove bekommt das dt der Bildfolge — genau die Groesse,
       mit der das Spiel rechnet. Die Wanduhr weiss davon nichts. */
    if(was==="uhrAn"){if(!window.__smOrig){window.__smOrig=steerMove;
      steerMove=function(s9,sv,dt,sp){if(s9===sims[0])window.__gz=(window.__gz||0)+dt;
        return window.__smOrig.apply(null,arguments);};}
      window.__gz=0;return true;}
    if(was==="uhrLies")return +(window.__gz||0).toFixed(4);
    if(was==="fenster"){var r=[];for(var n=1;n<=14;n++)r.push(+komboFenster(n).toFixed(2));return r;}
    if(was==="deckel"){var r2=[];for(var n2=0;n2<=14;n2++){KOMBO.n=n2;r2.push(+komboMult().toFixed(3));}
      KOMBO.n=0;return r2;}
    if(was==="rampe")return window._rampe?{x:window._rampe.x,z:window._rampe.z,cd:window._rampe.cd}:null;
    return null;}`,
}, TMP)

/* Zwei Takte stehen als Zahl im Spiel und werden hier AUS DER QUELLE gelesen, nicht
   abgeschrieben — sonst prueft das Werkzeug gegen sein eigenes Gedaechtnis weiter, wenn
   jemand die Zahl im Spiel aendert. */
import { readFileSync } from 'node:fs'
const quelle = readFileSync('traumhaus.html', 'utf8')
const mRes = quelle.match(/\},(\d+)\);\}\s*\/\/ 90s statt 30s/)
const mRmp = quelle.match(/RP\.cd=(\d+(?:\.\d+)?);/)
if (!mRes || !mRmp) { console.error('Takte nicht in der Quelle gefunden — Werkzeug veraltet'); process.exit(2) }
const MUENZ_RESPAWN = +mRes[1] / 1000
const RAMPEN_CD = +mRmp[1]

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const R = (...a) => page.evaluate((x) => window.__th.rw(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

/* --- 1. Gehtempo in SPIELZEIT messen, in vier Richtungen --- */
const richtungen = [[0, 1], [0, -1], [1, 0], [-1, 0]]
const tempi = []
for (const [sx, sz] of richtungen) {
  await R('steuer', [0, 0])
  await page.waitForTimeout(250)
  await R('uhrAn')
  const a1 = await R('figur')
  await R('steuer', [sx, sz])
  await page.waitForTimeout(4000)
  const a2 = await R('figur')
  const gz = await R('uhrLies')
  await R('steuer', [0, 0])
  const d = Math.hypot(a2.x - a1.x, a2.z - a1.z)
  tempi.push(gz > 0.05 ? d / gz : 0)
}
await R('steuer', [0, 0])
const tempo = Math.max(...tempi)
console.log('  Gehtempo je Richtung: ' + tempi.map((t) => t.toFixed(2)).join(' / ') + ' m/s Spielzeit')
/* Die Schranken sind Absicht: ein Wert weit ausserhalb ist ein Messfehler, kein Befund.
   Genau hier flog die Wanduhr-Messung mit 0,24 m/s auf. */
check('Gehtempo liegt im plausiblen Bereich', tempo > 2 && tempo < 8, tempo.toFixed(2) + ' m/s')
check('Alle Richtungen liefern ein aehnliches Tempo (sonst blockiert etwas)',
  Math.min(...tempi) > tempo * 0.5, 'langsamste ' + Math.min(...tempi).toFixed(2) + ' m/s')
check('GEGENPROBE: ohne Steuerung bewegt die Steuerung nichts', await (async () => {
  await R('uhrAn'); await page.waitForTimeout(1200); return (await R('uhrLies')) === 0
})(), 'steerMove wurde nicht aufgerufen')

/* --- 2. Die Welt: wie viele Muenzen, wie weit auseinander --- */
const mz = await R('muenzen')
const aktiv = mz.filter((m) => m.aktiv)
check('Es liegen ueberhaupt Muenzen in der Welt', aktiv.length > 0, aktiv.length + ' von ' + mz.length + ' aktiv')

const fenster = await R('fenster')
const deckel = await R('deckel')
const maxKette = deckel.findIndex((v, i) => i > 0 && v === deckel[deckel.length - 1])
console.log('  Serienfenster 1..14: ' + fenster.join(' ') + ' s')
console.log('  Aufschlag gedeckelt ab Kette ' + maxKette + ' bei x' + deckel[deckel.length - 1])

/* --- 3. Die laengste Kette, die man wirklich laufen kann (Nachbarschafts-Route) --- */
const start = await R('figur')
let pos = { x: start.x, z: start.z }
const offen = aktiv.map((m) => ({ ...m }))
let kette = 0
const route = []
while (offen.length) {
  let bi = -1, bd = Infinity
  for (let i = 0; i < offen.length; i++) {
    const d = Math.hypot(offen[i].x - pos.x, offen[i].z - pos.z)
    if (d < bd) { bd = d; bi = i }
  }
  const zeit = bd / tempo
  const grenze = fenster[Math.min(kette, fenster.length - 1)]
  route.push({ d: Math.round(bd), t: +zeit.toFixed(1), grenze: grenze })
  if (kette > 0 && zeit > grenze) break     /* die Kette reisst hier */
  kette++
  pos = { x: offen[bi].x, z: offen[bi].z }
  offen.splice(bi, 1)
}
console.log('  Route (Luftlinie, ohne Umwege): ' +
  route.slice(0, 14).map((r) => r.d + 'm/' + r.t + 's').join(' → '))
console.log(`  ➡ laengste Muenz-Kette bei ${tempo.toFixed(2)} m/s: ${kette}`)

check('Muenzen tragen wenigstens den Serien-Einstieg', kette >= 3, 'Kette ' + kette)
/* ⚠️ KEINE Behauptung ueber den Deckel aus dieser Zahl. Muenzen sind EINE von 16
   Verdienstquellen; "aus Muenzen allein nur 6" heisst nicht "12 ist unerreichbar".
   Genau diese Verwechslung waere die Sorte Ueberdehnung, gegen die dieses Werkzeug
   gebaut ist. Was Muenzen liefern, ist eine UNTERGRENZE — mehr sagt die Route nicht. */
console.log('  (Untergrenze: Muenzen sind 1 von 16 Verdienstquellen, keine Aussage ueber den Deckel)')

/* Luftlinie schmeichelt: echte Wege sind laenger. Darum dieselbe Rechnung mit Umweg. */
let pos2 = { x: start.x, z: start.z }
const offen2 = aktiv.map((m) => ({ ...m }))
let kette2 = 0
while (offen2.length) {
  let bi = -1, bd = Infinity
  for (let i = 0; i < offen2.length; i++) {
    const d = Math.hypot(offen2[i].x - pos2.x, offen2[i].z - pos2.z)
    if (d < bd) { bd = d; bi = i }
  }
  if (kette2 > 0 && (bd * 1.35) / tempo > fenster[Math.min(kette2, fenster.length - 1)]) break
  kette2++
  pos2 = { x: offen2[bi].x, z: offen2[bi].z }
  offen2.splice(bi, 1)
}
console.log(`  ➡ dasselbe mit 35 % Umweg (Haeuser, Zaeune): ${kette2}`)
check('Auch mit realistischem Umweg traegt der Einstieg', kette2 >= 3,
  'Kette ' + kette2)

/* --- 4. Traegt IRGENDEINE Quelle die Kette bis zum Deckel? --- */
/* Die Frage nach dem Deckel entscheidet sich an der schnellsten WIEDERHOLBAREN Quelle.
   Sie muss oefter kommen, als das kleinste Serienfenster lang ist — sonst reisst die
   Kette zwangslaeufig, egal wie gut man spielt. */
const boden = Math.min(...fenster)
const quellen = [
  { name: 'Muenze (Nachwuchs)', takt: MUENZ_RESPAWN, wiederholbar: true },
  { name: 'Stunt-Rampe (Abklingzeit)', takt: RAMPEN_CD, wiederholbar: true },
]
for (const q of quellen) {
  console.log(`  ${q.name}: alle ${q.takt} s · Serienfenster mindestens ${boden} s → ` +
    (q.takt < boden ? 'traegt die Kette' : 'zu langsam'))
}
const traegt = quellen.filter((q) => q.takt < boden)
check('Mindestens eine wiederholbare Quelle ist schneller als das kleinste Fenster',
  traegt.length >= 1, traegt.map((q) => q.name).join(', ') || 'keine')
check('GEGENPROBE: die Muenzen sind bewusst NICHT diese Quelle',
  MUENZ_RESPAWN > boden, 'Nachwuchs alle ' + MUENZ_RESPAWN + ' s (Absicht: nicht farmbar)')
check('Der Deckel von komboMult ist damit erreichbar, nicht Fiktion', traegt.length >= 1,
  'Deckel bei Kette ' + maxKette + ', getragen von: ' + traegt.map((q) => q.name).join(', '))

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 REICHWEITE BESTANDEN' : '💥 REICHWEITE FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
