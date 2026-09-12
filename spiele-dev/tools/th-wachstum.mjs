/* th-wachstum.mjs — waechst im Spiel etwas, das nie wieder verschwindet?
 *
 * ⚠️ WOZU. "Ruckelt am Handy" hatte eine Ursache im Nachladen (#2401). Eine zweite,
 * die dieselben Beschwerden macht, waere ein LECK: Objekte, Geometrien oder Texturen,
 * die im Spiel entstehen und nie aufgeraeumt werden. Das faellt beim Programmieren nie
 * auf — erst nach zwanzig Minuten Spielen wird es zaeh. Kein Werkzeug hat bisher
 * ueber die Zeit gemessen; th-leistung nimmt nur eine Momentaufnahme.
 *
 * Gemessen werden ueber mehrere Minuten Spielzeit:
 *   scene-Kinder, Geometrien, Texturen, Programme, Materialien, Zeichenaufrufe
 * Bewertet wird nicht der absolute Wert, sondern der TREND: waechst etwas monoton
 * weiter, ist es ein Leck. Schwankungen (Verkehr, Partikel) sind normal.
 *
 * Aufruf:  node spiele-dev/tools/th-wachstum.mjs [minuten]
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const MIN = +(process.argv[2] || 3)
const TMP = 'spiele-dev/tools/_wachstum_probe.html'
mitSonden('traumhaus.html', {
  wachs: `function(was,a){
    if(was==="zahlen"){
      var r=renderer.info, mats={}, geos={}, meshes=0;
      scene.traverse(function(o){ if(o.isMesh){meshes++;
        if(o.geometry)geos[o.geometry.uuid]=1;
        var m=o.material;(Array.isArray(m)?m:[m]).forEach(function(x){if(x)mats[x.uuid]=1;});}});
      return {kinder:scene.children.length, meshes:meshes,
              geometrien:Object.keys(geos).length,
              uebergeben:r.memory.geometries, texturen:r.memory.textures,
              programme:r.programs?r.programs.length:0,
              materialien:Object.keys(mats).length,
              zeichnen:r.render.calls, dreiecke:r.render.triangles,
              uhr:+(uhrzeit/60).toFixed(1)};}
    if(was==="uhr"){uhrzeit=a;return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const W = (...a) => page.evaluate((x) => window.__th.wachs(...x), a)

/* ⚠️ ZWEI SORTEN ZAHLEN, NICHT EINE. Geometrien, Texturen, Materialien und Objekte
   sind BESTAENDE — sie koennen lecken. Zeichenaufrufe und Dreiecke sind Messwerte des
   LETZTEN BILDES; sie steigen und fallen mit dem, was gerade zu sehen ist, und koennen
   per Definition nicht lecken. Der erste Anlauf warf beides zusammen und meldete die
   Zeichenaufrufe als Leck, obwohl die letzten drei Messungen schon wieder fielen
   (435 → 432 → 429): das war Verkehr, der durchs Bild fuhr. */
/* ⚠️ `renderer.info.memory.geometries` IST KEIN BESTAND — hier stand es jahrelang als
   einer, und es hat falschen Alarm ausgeloest.
   BEWIESEN 2026-09-13: in 60 s stieg die Zahl um 1753, waehrend KEINE einzige
   Geometrie erzeugt wurde (Proxy ueber alle Bauformen, null Treffer). Der Grund: die
   Zahl zaehlt an die Grafikkarte UEBERGEBENE Geometrien, und uebergeben wird erst beim
   ersten Zeichnen. Gemessen enthaelt die Szene 38'896 verschiedene Geometrien,
   uebergeben waren erst 6'763 — die Zahl darf also um ueber 30'000 steigen, ohne dass
   irgendetwas leckt. Sie ist ein FUELLSTAND, kein Bestand.
   Das erklaert auch, warum die Pruefung mal rot und mal gruen war: es haengt davon ab,
   wie viel die Kamera in der Messzeit zufaellig aufgedeckt hat. Und es wird seit dem
   objektweisen Aufwaermen haeufiger, weil das absichtlich frueh viel zeichnet.
   Gezaehlt wird jetzt die Zahl VERSCHIEDENER Geometrien IN DER SZENE — das ist ein
   echter Bestand: waechst er, wurden Geometrien angelegt und nie wieder entfernt.
   Der Fuellstand bleibt als `uebergeben` in der Zeile stehen, aber nur zur Einordnung. */
const BESTAENDE = ['kinder','meshes','geometrien','texturen','programme','materialien']
const NUR_EINORDNUNG = ['uebergeben']
const PRO_BILD  = ['zeichnen','dreiecke']
const FELDER = BESTAENDE.concat(PRO_BILD)
const reihen = []
const N = Math.max(4, Math.round(MIN * 4))          // alle 15 s eine Messung
console.log(`Messe ${N} Mal im Abstand von 15 s (~${MIN} Minuten Spielzeit)\n`)
for (let i = 0; i < N; i++) {
  if (i) await page.waitForTimeout(15000)
  const z = await W('zahlen')
  reihen.push(z)
  console.log(`  ${String(i * 15).padStart(4)}s  Uhr ${String(z.uhr).padStart(5)}  ` +
    FELDER.map((f) => `${f} ${String(z[f]).padStart(6)}`).join(' · '))
}

/* ⚠️ "MONOTON GESTIEGEN" IST KEIN LECK. Der erste Anlauf meldete sechs Lecks, weil
   ueber drei Minuten +1 Objekt und +18 Meshes dazukamen — das ist die Welt, die
   fertig laedt, und ein Tier, das auftaucht. Ein Leck waechst STETIG weiter; Nachladen
   flacht ab. Also die Rate in der ersten gegen die in der zweiten Haelfte stellen:
   nur wenn es auch am Ende noch spuerbar zulegt, ist es eines. */
console.log('\nTrend — waechst es auch noch in der zweiten Haelfte?')
let lecks = 0
const halb = Math.floor(reihen.length / 2)
for (const f of BESTAENDE) {
  const w = reihen.map((r) => r[f])
  const d = w[w.length - 1] - w[0]
  const rate1 = (w[halb] - w[0]) / halb                    // je Messung, erste Haelfte
  const rate2 = (w[w.length - 1] - w[halb]) / (w.length - 1 - halb)
  const schwelle = Math.max(5, w[0] * 0.01)                // 1 % oder 5 Einheiten
  const leck = rate2 > 0 && d > schwelle && rate2 >= rate1 * 0.5
  if (leck) lecks++
  console.log(`  ${leck ? '❌' : '✅'} ${f.padEnd(12)} ${String(w[0]).padStart(6)} → ${String(w[w.length-1]).padStart(6)}` +
    `  (${d >= 0 ? '+' : ''}${d}, Schwelle ${Math.round(schwelle)})  ` +
    `Rate 1. Haelfte ${rate1.toFixed(2)} · 2. Haelfte ${rate2.toFixed(2)}` +
    `${leck ? '  → LECKVERDACHT' : ''}`)
}
console.log('\nJe Bild gemessen (kein Bestand, kann nicht lecken — nur zur Einordnung):')
for (const f of PRO_BILD) {
  const w = reihen.map((r) => r[f])
  console.log(`  ·  ${f.padEnd(12)} min ${Math.min(...w)} · max ${Math.max(...w)} · zuletzt ${w[w.length-1]}`)
}
console.log(`\n${lecks ? '❌' : '✅'} ${lecks} Bestand/Bestände mit Leckverdacht · JS-Fehler: ${jsFehler.length}`)
await browser.close()
aufraeumen(TMP)
process.exit(lecks === 0 && jsFehler.length === 0 ? 0 : 1)
