/**
 * th-alle.mjs — alle Pruefwerkzeuge nacheinander, eine Tabelle am Ende.
 *
 * ⚠️ WOZU. In spiele-dev/tools liegen inzwischen ueber dreissig Messgeraete, und
 * keines kennt die anderen. Wer eine Aenderung an traumhaus.html macht, muesste
 * wissen, welche davon sie betreffen koennte — und weiss es nicht. Genau daran ist
 * in dieser Datei schon mehrfach etwas kaputtgegangen, das ein vorhandenes Werkzeug
 * sofort gemeldet haette: der Hausberg begrub 18 Bauwerke, nachdem die Seilbahn
 * repariert war; die Weihnachtsbuden standen im Sommer auf der Wiese, nachdem die
 * Gruppen-Sichtpruefung eingebaut war.
 *
 * Dieses Werkzeug faehrt die Reihe ab und sagt am Ende in einer Zeile je Pruefung,
 * ob sie haelt. Es ersetzt die einzelnen Werkzeuge nicht — wer einen Fehler sucht,
 * ruft das betroffene direkt auf und liest seine Ausgabe.
 *
 * ⚠️ ES DAUERT. Jedes Werkzeug startet einen eigenen Browser und wartet, bis die
 * Welt fertig gebaut ist (20…30 s). Die volle Reihe braucht darum rund eine halbe
 * Stunde. Mit --schnell laeuft nur die Kernreihe (rund zehn Minuten).
 *
 * Aufruf:  node spiele-dev/tools/th-alle.mjs [--schnell]
 *          TH_REPO=/pfad/zum/worktree node spiele-dev/tools/th-alle.mjs
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HIER = dirname(fileURLToPath(import.meta.url))
const SCHNELL = process.argv.includes('--schnell')

/* wert: aus der Ausgabe die eine Zahl ziehen, die zaehlt.
   gut:  wann die Pruefung haelt. kern: laeuft auch bei --schnell. */
const PRUEFUNGEN = [
  { name: 'Netz (Wege, Marken, Anschluesse)', datei: 'th-netz.mjs', kern: true,
    wert: (s) => (s.match(/(\d+) ok, (\d+) Fehler/) || []).slice(1).join('/'),
    gut: (s) => /BESTANDEN/.test(s) && /0 Fehler/.test(s) },
  { name: 'Boden (Fels, Luft, Wasser)', datei: 'th-boden.mjs', kern: true,
    wert: (s) => ['Fels', 'Schwebt', 'Wasser'].map((k) => (s.match(new RegExp(`(⚠️|✅)\\s+(?:Im )?${k}[^:]*: (\\d+|keins)`)) || [, , '?'])[2]).join('/'),
    gut: (s) => (s.match(/✅/g) || []).length >= 3 },
  { name: 'Belag (Zubehoer quer auf Fahrbahn)', datei: 'th-belag.mjs', kern: true,
    wert: (s) => (s.match(/(\d+) Treffer/) || [, '?'])[1],
    gut: (s) => /\b0 Treffer/.test(s) },
  { name: 'Laternen (Untergrund)', datei: 'th-laternen.mjs', kern: true,
    wert: (s) => (s.match(/(\d+) Laternen, (\d+)/) || []).slice(1).join('/'),
    gut: (s) => /0 auf falschem Untergrund|alle auf tragfaehigem Grund/.test(s) },
  { name: 'See (Enten im Wasser)', datei: 'th-see.mjs', kern: true,
    wert: (s) => (s.match(/(\d+)\/(\d+) Proben an Land/) || [, '0'])[1],
    gut: (s) => /✅ 0 von/.test(s) },
  { name: 'Linien (Sperr- gegen Leitlinie)', datei: 'th-linien.mjs', kern: true,
    wert: (s) => (s.match(/z=/g) || []).length + ' Lagen',
    gut: (s) => (s.match(/z=/g) || []).length === 4 },
  { name: 'Viertel (Platz und Stufe)', datei: 'th-viertel.mjs', kern: true,
    wert: (s) => (s.match(/(\d+) Viertel, davon (\d+)/) || []).slice(1).join('/'),
    gut: (s) => /davon 0 nicht auf Stufe 2/.test(s) },
  { name: 'Licht (Zahl der Punktlichter)', datei: 'th-licht.mjs', kern: true,
    wert: (s) => (s.match(/"zahlWechsel": (\d+)/) || [, '?'])[1] + ' Wechsel',
    gut: (s) => /"zahlWechsel": 0/.test(s) },
  { name: 'LOD (Flackern an der Grenze)', datei: 'th-lod.mjs', kern: true,
    wert: (s) => (s.match(/(\d+) davon flackern/) || [, '?'])[1],
    gut: (s) => /^0 davon flackern/m.test(s) },
  { name: 'Bewegt (Animationen angemeldet)', datei: 'th-bewegt.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) angemeldete Bewegliche/) || [, '?'])[1],
    gut: (s) => /✅ Alles Angemeldete bewegt sich/.test(s) },
  { name: 'Speichern (Umweg verlustfrei)', datei: 'th-speichern.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) Unterschiede/) || [, '0'])[1] + ' Unterschiede',
    gut: (s) => /nichts geht verloren/.test(s) },
  { name: 'Flimmern (bei stiller Kamera)', datei: 'th-flimmern.mjs', kern: false,
    wert: (s) => (s.match(/Zahlwechsel: (\d+)/) || [, '?'])[1] + ' Lichtwechsel',
    gut: (s) => /Kein Mesh schaltet mehr als einmal um/.test(s) },
  { name: 'Gleis (was liegt auf den Schienen)', datei: 'th-gleis.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) Bauteile ueber dem Gleiskoerper/) || [, '?'])[1],
    gut: (s) => { const m = s.match(/(\d+) Bauteile ueber dem Gleiskoerper/); return !!m && +m[1] <= 2 } },
  { name: 'Mauern (durchlaufbare Gebaeude)', datei: 'th-mauern.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) ohne Kollider/) || [, '0'])[1] + ' offen',
    gut: (s) => { const n = +(s.match(/(\d+) ohne Kollider/) || [, 0])[1]; return n <= 13 } },
  { name: 'Katalog (erscheint jeder Eintrag)', datei: 'th-katalog.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) Katalog-Eintraege hingestellt/) || [, '?'])[1] + ' Eintraege',
    gut: (s) => /✅ Jeder Eintrag in der Moebelliste erscheint/.test(s) },
  { name: 'Bewohner (steckt jemand fest)', datei: 'th-bewohner.mjs', kern: false,
    wert: (s) => (s.match(/Besucher (\d+) -> (\d+)/) || [, '?', '?']).slice(1).join('->') + ' Besucher',
    gut: (s) => /Jeder bewegt sich oder steht mit Grund/.test(s) && /Niemand steht dauerhaft in einem Kollider/.test(s) },
  { name: 'Erfolge (erreichbar, sturzsicher)', datei: 'th-erfolge.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) Erfolge/) || [, '?'])[1] + ' Erfolge',
    gut: (s) => /✅ Alle Erfolge und Missionen sind erreichbar/.test(s) },
  { name: 'Club (Innenraum, begehbar)', datei: 'th-club.mjs', kern: false,
    wert: (s) => (s.match(/(\d+) th14-Teile/) || [, '?'])[1] + ' Teile',
    gut: (s) => /✅ Der Spielclub steht, ist moebliert und begehbar/.test(s) },
  { name: 'Koop (kommen alle an)', datei: 'th-koop.mjs', kern: false,
    wert: (s) => (s.match(/alle (\d+) geprueften kommen an/) || [, '?'])[1] + ' Wege',
    gut: (s) => /kommen an/.test(s) },
]

const lauf = (datei) => new Promise((res) => {
  const t0 = Date.now()
  const p = spawn(process.execPath, [join(HIER, datei)], { env: process.env })
  let out = ''
  p.stdout.on('data', (d) => { out += d })
  p.stderr.on('data', (d) => { out += d })
  p.on('close', (code) => res({ out, code, ms: Date.now() - t0 }))
})

const liste = PRUEFUNGEN.filter((p) => !SCHNELL || p.kern)
console.log(`${liste.length} Pruefungen${SCHNELL ? ' (Kernreihe)' : ''} — jede startet einen eigenen Browser, das dauert.\n`)

const zeilen = []
let schlecht = 0
for (const p of liste) {
  /* Die Laufzeile ueberschreibt sich nur im Terminal. Wird die Ausgabe in eine Datei
     geleitet, steht sonst jede Pruefung doppelt drin. */
  const TTY = process.stdout.isTTY
  if (TTY) process.stdout.write(`… ${p.name}`)
  /* ⚠️ EIN WIEDERHOLUNGSVERSUCH. Jede Pruefung startet einen eigenen Browser; nach
     einer Viertelstunde und einem Dutzend Starts faellt schon mal einer aus, ohne
     dass an der Welt etwas waere (gesehen bei th-koop, das einzeln aufgerufen sofort
     wieder haelt). Genau EINMAL nachfassen und das im Bericht sagen — wer zweimal
     scheitert, hat ein echtes Problem. */
  let r = await lauf(p.datei)
  let ok = r.code === 0 && p.gut(r.out)
  let wieder = false
  if (!ok) { wieder = true; r = await lauf(p.datei); ok = r.code === 0 && p.gut(r.out) }
  if (!ok) schlecht++
  const wert = (() => { try { return p.wert(r.out) || '—' } catch (e) { return '—' } })()
  zeilen.push({ name: p.name, ok, wert, s: Math.round(r.ms / 1000), code: r.code, wieder })
  process.stdout.write(`${TTY ? '\r' : ''}${ok ? '✅' : '❌'} ${p.name.padEnd(38)} ${String(wert).padStart(16)}  ${String(Math.round(r.ms / 1000)).padStart(4)} s${wieder ? '  (zweiter Versuch)' : ''}\n`)
}

const dauer = zeilen.reduce((a, z) => a + z.s, 0)
console.log(`\n${liste.length - schlecht} von ${liste.length} halten · ${Math.round(dauer / 60)} min gesamt`)
if (schlecht) {
  console.log('\nNicht gehalten — das betroffene Werkzeug einzeln aufrufen und seine Ausgabe lesen:')
  zeilen.filter((z) => !z.ok).forEach((z) => console.log(`   ${z.name}  (Rueckgabe ${z.code})`))
}
process.exit(schlecht ? 1 : 0)
