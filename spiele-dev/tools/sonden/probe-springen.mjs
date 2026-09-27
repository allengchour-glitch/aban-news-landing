/* Sonde (Runde 102): springen Modelle, WÄHREND man spielt?
   Anlass: dieselbe Tramhaltestelle stand in zwei Läufen desselben Stands an zwei Orten — (-78|108) nach
   55 s, (-60,1|105,2) nach 65 s —, während probe-stabil zwei Läufe mit GLEICHER Wartezeit als gleich meldet.
   Also nicht der Ladevorgang streut, sondern die Welt ändert sich MIT DER ZEIT: _freiRaeumen/_entwirren
   laufen erneut, sobald eine späte GLB-Datei eintrifft, und schieben dann schon sichtbare Dinge weiter.
   Die Sonde misst in EINEM Lauf alle bau()-Modelle zu mehreren Zeitpunkten und meldet, was sich nach dem
   ersten Zeitpunkt noch um mehr als 0,5 m bewegt hat (Fahrzeuge/Boote/Gondeln mit `_bewegt` ausgenommen).
   Gegenprobe: vor der letzten Messung wird ein Modell um 2 m versetzt; es muss gemeldet werden.
   Aufruf: node spiele-dev/tools/sonden/probe-springen.mjs [ab=35] [bis=95] [schritt=15]   (Sekunden nach dem Laden) */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const [AB = 35, BIS = 95, SCHRITT = 15] = process.argv.slice(2).map(Number)
const TMP = '_probe_springen_tmp.html'
mitSonden(process.env.QUELLE || 'traumhaus.html', {   /* QUELLE=_alt.html: Vergleich gegen einen älteren Stand */
  springen: `function(gegen){var o=[];(window._gebaeude||[]).forEach(function(g,i){if(!g.parent||g._bewegt)return;
    if(gegen&&i===gegen){g.position.x+=2;}
    o.push([i,g.userData.datei||"?",+g.position.x.toFixed(2),+g.position.z.toFixed(2),!!(g.userData&&g.userData.fest)]);});return o;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: AB * 1000 })
const T = []
for (let t = AB; t <= BIS; t += SCHRITT) {
  if (t > AB) await page.waitForTimeout(SCHRITT * 1000)
  const letzte = t + SCHRITT > BIS
  T.push({ t, r: await page.evaluate((g) => window.__th.springen(g), letzte ? 60 : 0) })
}
await browser.close(); aufraeumen(TMP)
const erst = new Map(T[0].r.map((e) => [e[0], e]))
const spr = []
for (const s of T.slice(1)) for (const e of s.r) { const a = erst.get(e[0]); if (!a) continue; const d = Math.hypot(e[2] - a[2], e[3] - a[3]); if (d > 0.5) spr.push({ t: s.t, d, a, e }) }
const letzter = new Map(); for (const s of spr) letzter.set(s.e[0], s)   /* je Modell der letzte Stand */
const gp = [...letzter.values()].find((s) => s.e[0] === 60 && Math.abs(s.d - 2) < 0.3)
const L = [...letzter.values()].filter((s) => s !== gp).sort((p, q) => q.d - p.d)
console.log(`${T[0].r.length} ruhende Modelle · Messungen bei ${T.map((s) => s.t + ' s').join(', ')} · JS-Fehler ${jsFehler.length}`)
console.log(`Nach ${AB} s noch bewegt (> 0,5 m): ${L.length}`)
for (const s of L) console.log(`  ${s.d.toFixed(1).padStart(5)} m  ${s.a[1].replace(/\.glb$/, '').padEnd(28)} (${s.a[2]}|${s.a[3]}) → (${s.e[2]}|${s.e[3]}) bis ${s.t} s${s.a[4] ? '  fest' : ''}`)
console.log(`Gegenprobe: Modell #60 vor der letzten Messung um 2 m versetzt → ${gp ? '✓ erkannt' : '✗ NICHT erkannt'}`)
