/* th-raeder.mjs — rollen die Raeder der Verkehrswagen?
 *
 * WOZU. Die th37-Wagen fuhren mit stehenden Raedern; nur der prozedurale Bus drehte
 * seine. Seit 2026-08-30 haengt _raederAnlegen() die vier Raeder jedes Wagens unter
 * Drehpunkte, die updVerkehr mit Weg/Radius dreht. Das hier prueft:
 *   1. jeder fahrende th37-Wagen hat GENAU vier Drehpunkte (Formregel, kein Name),
 *   2. sie drehen sich ueber ein Fenster WELTZEIT (nicht Wanduhr — siehe warteWeltzeit),
 *   3. die Drehung passt zum gefahrenen Weg: delta_phi = weg / (radius * massstab), +-15 %,
 *   4. der Weg dreht in die richtige Richtung (Vorzeichen wie die Fahrt).
 *
 * ⚠️ Die Raeder liegen in der VORLAGE — clone(true) nimmt die Gruppen mit. Wer die
 * Vorlage nach dem ersten Klon aendert, aendert alle spaeteren, nicht die frueheren.
 *
 * Aufruf:  node spiele-dev/tools/th-raeder.mjs [weltsekunden]
 */
import { mitSonden, spielOeffnen, aufraeumen, warteWeltzeit } from './th-lib.mjs'

const SEK = Number(process.argv[2] || 4)

const TMP = mitSonden('traumhaus.html', {
  raeder: `function(){
    return verkehr.map(function(v,i){
      var r=v.raeder||[];
      return {i:i,datei:(v.mesh&&v.mesh.userData&&v.mesh.userData.datei)||"?",n:r.length,
              pos:v.pos,mass:v.radMass||1,rdir:(v.rdir===undefined?null:v.rdir),
              achse:(v.route&&v.route.axis)||"?",tempo:(v.speed||(v.route&&v.route.speed)||0),
              rad:r.map(function(g){return {phi:g.rotation.z,r:g.userData.rad,bewegt:!!g._bewegt};})};});}`,
  uhr: `function(){return uhrzeit;}`,
}, '_raeder_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const a = await page.evaluate(() => window.__th.raeder())
const z = await warteWeltzeit(page, SEK)
const b = await page.evaluate(() => window.__th.raeder())

let ohne = 0, steht = 0, falsch = 0, ok = 0, gewendet = 0, gebremst = 0
const fensterWelt = z.welt || 0   /* Weltsekunden des Messfensters — Grundlage fuer die Bremsprobe */
console.log(`${a.length} Verkehrswagen, Fenster ${z.welt} s Weltzeit (${z.wanduhr} s Wanduhr)\n`)
for (let i = 0; i < a.length; i++) {
  const A = a[i], B = b[i]
  /* th37: 4 Raeder. th40 Muellwagen: 6 (Zwillinge hinten). Alles andere ist ein Fund. */
  if (A.n !== 4 && A.n !== 6) { ohne++; if (ohne <= 5) console.log(`  ❌ Wagen ${i} (${A.datei}): ${A.n} Drehpunkte statt 4 oder 6`); continue }
  const weg = B.pos - A.pos
  const dphi = B.rad.map((r, k) => r.phi - A.rad[k].phi)
  const soll = weg / (A.rad[0].r * A.mass)
  const gedreht = dphi.every((d) => Math.abs(d) > 0.02)
  if (Math.abs(weg) < 0.05) continue                     /* steht an der Ampel — kein Urteil */
  /* ⚠️ WER IM FENSTER GEWENDET ODER GEBREMST HAT, IST NICHT VERGLEICHBAR — und genau
     das machte diese Pruefung wackelig (Tor 53c: ein Wagen von 26, zwei Laeufe zuvor
     mit denselben Aenderungen gruen). GEMESSEN im Spiel: `updVerkehr` dreht die Raeder
     mit `v.pos - _pv` DIREKT nach dem Vorruecken — richtig so — aber danach wird `pos`
     noch begrenzt: am Zubringer-Ende (`v.pos=RAD_R1; v.rdir=-1`), am Stich-Ende und an
     der Haltelinie (`v.pos=sl`). Die Raeder haben dann den ungekuerzten Weg gedreht,
     waehrend `pos` auf dem Anschlag steht. Der Unterschied ist kein Fehler im Spiel,
     sondern liegt zwischen zwei Messpunkten.
     Erkennbar an zwei Dingen: die Fahrtrichtung hat sich gedreht, oder der gefahrene
     Weg liegt deutlich unter dem, was Tempo mal Fensterzeit hergeben wuerde. */
  if (A.rdir !== null && B.rdir !== null && A.rdir !== B.rdir) { gewendet++; continue }
  if (Math.abs(weg) < 0.55 * (A.tempo || 0) * fensterWelt) { gebremst++; continue }
  if (!gedreht) { steht++; if (steht <= 5) console.log(`  ❌ Wagen ${i}: ${weg.toFixed(2)} m gefahren, Raeder still (Δphi ${dphi.map((d) => d.toFixed(3)).join('/')})`); continue }
  const abw = Math.abs(dphi[0] - soll) / Math.max(1e-6, Math.abs(soll))
  if (abw > 0.15 || Math.sign(dphi[0]) !== Math.sign(soll)) { falsch++
    if (falsch <= 5) console.log(`  ❌ Wagen ${i}: Δphi ${dphi[0].toFixed(3)} statt ${soll.toFixed(3)} (Weg ${weg.toFixed(2)} m, r ${A.rad[0].r.toFixed(3)} x ${A.mass.toFixed(2)})`)
    continue }
  ok++
  if (ok <= 3) console.log(`  ✅ Wagen ${i}: ${weg.toFixed(2)} m -> Δphi ${dphi[0].toFixed(3)} rad (soll ${soll.toFixed(3)})`)
}
console.log(`\nℹ️  Im Fenster gewendet (nicht vergleichbar): ${gewendet} · gebremst/an der Haltelinie: ${gebremst}`)
console.log(`${ohne ? '❌' : '✅'} Wagen ohne 4/6 Drehpunkte: ${ohne}`)
console.log(`${steht ? '❌' : '✅'} Wagen mit stehenden Raedern bei Fahrt: ${steht}`)
console.log(`${falsch ? '❌' : '✅'} Wagen mit falscher Drehung (Betrag/Richtung): ${falsch}`)
console.log(`ℹ️  Wagen mit passender Drehung: ${ok}`)
console.log(`${jsFehler.length ? '❌' : '✅'} JS-Fehler: ${jsFehler.length}`)
const gut = !ohne && !steht && !falsch && ok > 0 && !jsFehler.length
console.log(`\n${gut ? '🎉 RAEDER BESTANDEN' : '💥 RAEDER FEHLGESCHLAGEN'} — ${a.length} Wagen, ${ok} rollen richtig`)
await browser.close()
aufraeumen(TMP)
process.exit(gut ? 0 : 1)
