/* Sonde (Runde 103): wann steht die NAHE Welt — nicht wann die letzte Datei kommt.
   Anlass: th-laden handy: 379 Modelle / 174 MB, Haelfte erst nach 40 s, letzte nach 56 s. Fuer den Spieler
   zaehlt aber, wann das steht, was er sieht: alles im Umkreis von R um den Startpunkt der Figur (-67|43).
   Die Sonde oeffnet das Spiel im Handy-Format (390x844 als screen → _mobil), tippt „Solo bauen" sofort
   (so tut es der Spieler, th-laden: 0,0 s Wartezeit), und zaehlt jede Sekunde die bau()-Gruppen in
   window._gebaeude innerhalb R sowie insgesamt, bis _ladeOffen 0 ist und die Zahl dreimal steht.
   Gemeldet: Sekunde, ab der die Nahzahl ihren Endwert hat („nah fertig"), und wann alles da ist.
   Vergleich: mit ?ladeAlt laeuft die alte Reihenfolge (Dateireihenfolge, nach dem Start unbegrenzt).
   Gegenprobe: die Nahzahl darf nie sinken, und „nah fertig" <= „alles fertig".
   Aufruf: node spiele-dev/tools/sonden/probe-ladenah.mjs [alt|neu] [R=120] */
import { chromium } from 'playwright'
import { serverStarten, PORT, CHROMIUM } from '../th-lib.mjs'
const MODUS = process.argv[2] || 'neu', R = +(process.argv[3] || 120), BREITE = process.argv[4] ? +process.argv[4] : null, M = [-67, 43]
serverStarten()
const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 } })
const jsFehler = []; page.on('pageerror', (e) => jsFehler.push(String(e).slice(0, 160)))
const t0 = Date.now()
await page.goto(`http://127.0.0.1:${PORT}/traumhaus.html?${MODUS === 'alt' ? 'ladeAlt' : 'neu'}${BREITE ? '&ladeBreite=' + BREITE : ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(1500)
await page.evaluate(() => { const b = document.getElementById('soloBtn'); if (b) b.click() })
await page.waitForTimeout(500)
await page.evaluate(() => { const b = document.querySelector('button[data-m="klassisch"]'); if (b) b.click() })
const reihe = []; let stabil = 0, sinkt = 0, sinktSpaet = 0
for (let i = 0; i < 240; i++) {
  await page.waitForTimeout(1000)
  const z = await page.evaluate(([mx, mz, r]) => { let nah = 0, ges = 0
    ;(window._gebaeude || []).forEach((g) => { if (!g.parent) return; ges++; const dx = g.position.x - mx, dz = g.position.z - mz; if (dx * dx + dz * dz <= r * r) nah++ })
    return { nah, ges, offen: window._ladeOffen, st: window._ladeStand ? window._ladeStand.fertig + '/' + window._ladeStand.gefordert : '?' } }, [M[0], M[1], R])
  const t = (Date.now() - t0) / 1000
  /* Sinkt die Nahzahl, waehrend noch geladen wird, stimmt etwas nicht; NACH dem Ladeende raeumt das Spiel auf
     (Instanz-Vorlagen verschwinden aus _gebaeude, entwirren schiebt) — das ist kein Messfehler, wird aber genannt. */
  if (reihe.length && z.nah < reihe[reihe.length - 1].nah) { if (z.offen === 0 || reihe[reihe.length - 1].offen === 0) sinktSpaet++; else sinkt++ }
  reihe.push({ t, ...z })
  if (z.offen === 0 && reihe.length > 3 && z.ges === reihe[reihe.length - 2].ges && z.nah === reihe[reihe.length - 2].nah) { if (++stabil >= 3) break } else stabil = 0
}
await browser.close()
const end = reihe[reihe.length - 1]
const tNah = reihe.find((r) => r.nah >= end.nah).t, tGes = reihe.find((r) => r.ges >= end.ges).t
const tHalbNah = reihe.find((r) => r.nah >= end.nah / 2).t
console.log(`Reihenfolge ${MODUS.toUpperCase()}${BREITE ? ' · Deckel nach dem Start ' + BREITE : ''} · R ${R} m um (${M[0]}|${M[1]}) · Handy-Format`)
console.log(`  nah: ${end.nah} Bauten — die Haelfte nach ${tHalbNah.toFixed(0)} s, alle nach ${tNah.toFixed(0)} s`)
console.log(`  gesamt: ${end.ges} Bauten (Ladestand ${end.st}) — alle nach ${tGes.toFixed(0)} s · _ladeOffen ${end.offen} · JS-Fehler ${jsFehler.length}`)
for (const r of reihe.filter((_, i) => i % 5 === 0 || i === reihe.length - 1)) console.log(`    ${String(r.t.toFixed(0)).padStart(4)} s  nah ${String(r.nah).padStart(3)}  gesamt ${String(r.ges).padStart(3)}`)
console.log(`Gegenprobe: Nahzahl nie gesunken, solange geladen wird ${sinkt === 0 ? '✓' : '✗ (' + sinkt + 'x)'}${sinktSpaet ? ' (nach dem Ladeende ' + sinktSpaet + 'x gesunken = Aufraeumen)' : ''} · nah fertig <= alles fertig ${tNah <= tGes ? '✓' : '✗'}`)
if (jsFehler.length) console.log('JS-Fehler: ' + jsFehler.join(' | '))
