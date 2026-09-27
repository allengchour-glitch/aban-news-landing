/* Sonde (Runde 102): steht die Welt bei jedem Laden gleich?
   Anlass: probe-gedraenge fand die Tramhaltestelle in drei Läufen an drei Orten — (-78|108), (-60,1|105,2),
   (-62,9|92) —, das Wirtshaus auf z 71,5 und 74,4, den Laden auf z 76 und 78. Der Entwirrer (_entwirren,
   _freiRaeumen) schiebt alles ohne `userData.fest`, und WIE er schiebt, hängt davon ab, in welcher Reihenfolge
   die GLB-Dateien eintreffen. Auf einem schnellen Handy sieht die Stadt also anders aus als im Test, und
   jede Messung gilt nur für den Lauf, in dem sie entstand.
   Die Sonde lädt das Spiel ZWEIMAL (zwei getrennte Browser), sammelt je Lauf alle bau()-Modelle
   (window._gebaeude: Datei + Lage) und paart je Datei gierig die nächsten Lagen. Gemeldet wird jedes Modell,
   das zwischen den Läufen mehr als 0,5 m auseinander steht.
   Gegenprobe: im zweiten Lauf wird ein Modell um 3 m versetzt, bevor gesammelt wird — es muss gemeldet werden.
   Aufruf: node spiele-dev/tools/sonden/probe-stabil.mjs [schwelle=0.5] */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const S = +(process.argv[2] || 0.5)
const TMP = '_probe_stabil_tmp.html'
mitSonden(process.env.QUELLE || 'traumhaus.html', {   /* QUELLE=_alt.html: Vergleich gegen einen älteren Stand */
  stabil: `function(gegen){var o=[];(window._gebaeude||[]).forEach(function(g,i){if(!g.parent)return;
    var x=g.position.x,z=g.position.z;if(gegen&&o.length===gegen)x+=3;
    o.push([g.userData.datei||"?",+x.toFixed(2),+z.toFixed(2),!!(g.userData&&g.userData.fest)]);});return o;}`
}, TMP)
async function lauf(gegen) {
  const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 50000 })
  await page.waitForTimeout(15000)
  const r = await page.evaluate((g) => window.__th.stabil(g), gegen)
  await browser.close()
  return { r, js: jsFehler.length }
}
const A = await lauf(0)
/* Gegenprobe: das 40. Modell (irgendeines) im zweiten Lauf um 3 m verschoben */
const B = await lauf(40)
aufraeumen(TMP)
const gruppe = (L) => { const m = new Map(); for (const e of L) { if (!m.has(e[0])) m.set(e[0], []); m.get(e[0]).push(e) } return m }
const GA = gruppe(A.r), GB = gruppe(B.r)
const weg = []; let n = 0
for (const [d, la] of GA) {
  const lb = (GB.get(d) || []).slice()
  for (const a of la) {
    n++; let bi = -1, bd = 1e9
    lb.forEach((b, i) => { const dd = Math.hypot(a[1] - b[1], a[2] - b[2]); if (dd < bd) { bd = dd; bi = i } })
    if (bi < 0) { weg.push({ d, a, b: null, dd: null }); continue }
    const b = lb.splice(bi, 1)[0]
    if (bd > S) weg.push({ d, a, b, dd: bd })
  }
}
const gp = B.r[40] ? B.r[40][0] : null
const gegenErk = weg.some((w) => w.d === gp && w.dd > 2.5 && w.dd < 3.5)
console.log(`Lauf A ${A.r.length} Modelle · Lauf B ${B.r.length} · JS-Fehler ${A.js}/${B.js}`)
console.log(`Verschieden (> ${S} m) zwischen zwei Läufen: ${weg.length - (gegenErk ? 1 : 0)} von ${n} (davon fest: ${weg.filter((w) => w.a[3]).length})`)
for (const w of weg.sort((p, q) => (q.dd || 99) - (p.dd || 99))) {
  if (gegenErk && w.d === gp && w.dd > 2.5 && w.dd < 3.5) continue
  console.log(`  ${String(w.dd === null ? '—' : w.dd.toFixed(1)).padStart(5)} m  ${w.d.replace(/\.glb$/, '').padEnd(28)} A (${w.a[1]}|${w.a[2]})  B ${w.b ? '(' + w.b[1] + '|' + w.b[2] + ')' : 'fehlt'}${w.a[3] ? '  fest' : ''}`)
}
console.log(`Gegenprobe: ${gp} im zweiten Lauf um 3 m versetzt → ${gegenErk ? '✓ erkannt' : '✗ NICHT erkannt'}`)
