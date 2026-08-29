/* th-serie.mjs — spielt die Serie durch und prueft, ob sie sich richtig anfuehlt.
 *
 * ⚠️ WOZU. Eine Belohnungs-Schleife kann fehlerfrei laufen und trotzdem nichts taugen:
 * wenn der Multiplikator nicht steigt, die Uhr nicht knapper wird oder der Rekord
 * nicht haelt, fehlt genau das, was zum Weitermachen treibt. Das ist mit blossem
 * Hinsehen nicht zu pruefen — hier wird es gemessen.
 *
 * Aufruf:  node spiele-dev/tools/th-serie.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_serie_probe.html'
mitSonden('traumhaus.html', {
  ser: `function(was,a){
    if(was==="stand")return {n:KOMBO.n,t:+KOMBO.t.toFixed(2),best:KOMBO.best,
      mult:+komboMult().toFixed(3),fenster:+komboFenster(KOMBO.n).toFixed(1),
      extra:KOMBO.verdient,geld:geld,
      hud:(function(){var e=document.getElementById("komboHud");
        return e?{sichtbar:e.style.display!=="none",text:(e.textContent||"").replace(/\\s+/g," ").trim()}:null;})()};
    if(was==="verdiene")return verdiene(a);
    if(was==="takt"){komboTakt(a);return true;}
    if(was==="reset"){KOMBO.n=0;KOMBO.t=0;KOMBO.verdient=0;KOMBO.best=0;KOMBO._neuerRekord=false;komboHudUpd();return true;}
    if(was==="speichern")return snapshot().kb;
    if(was==="laden"){loadSnapshot(Object.assign(snapshot(),{kb:a}));return KOMBO.best;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const S = (...a) => page.evaluate((x) => window.__th.ser(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

await S('reset')
const start = await S('stand')
check('Ohne Serie ist die Anzeige unsichtbar', start.hud && !start.hud.sichtbar)
check('Ohne Serie kein Aufschlag', start.mult === 1, 'x' + start.mult)

/* Kette aufbauen und die Kurve mitschreiben. */
const kurve = []
for (let i = 1; i <= 13; i++) {
  await S('verdiene', 100)
  const z = await S('stand')
  kurve.push({ n: z.n, mult: z.mult, fenster: z.fenster })
}
console.log('\n  Kette   Multiplikator   Fenster')
kurve.forEach((k) => console.log(`   ${String(k.n).padStart(4)}   x${k.mult.toFixed(3).padEnd(10)}   ${k.fenster.toFixed(1)} s`))

check('Multiplikator steigt mit der Kette', kurve[0].mult < kurve[5].mult && kurve[5].mult < kurve[11].mult,
  `x${kurve[0].mult} → x${kurve[5].mult} → x${kurve[11].mult}`)
check('Multiplikator ist gedeckelt', kurve[12].mult === kurve[11].mult && kurve[12].mult <= 2.5,
  `bei 12 und 13 gleich x${kurve[12].mult}`)
check('Fenster wird KNAPPER, nicht grosszuegiger', kurve[0].fenster > kurve[11].fenster,
  `${kurve[0].fenster.toFixed(1)} s → ${kurve[11].fenster.toFixed(1)} s`)
check('Fenster faellt nicht unter 14 s', Math.min(...kurve.map((k) => k.fenster)) >= 14,
  Math.min(...kurve.map((k) => k.fenster)).toFixed(1) + ' s')

const jetzt = await S('stand')
check('Anzeige sichtbar mit Kette und Faktor', jetzt.hud.sichtbar && /13/.test(jetzt.hud.text) && /x2/.test(jetzt.hud.text),
  '"' + jetzt.hud.text + '"')
check('Rekord mitgezogen', jetzt.best === 13, 'best=' + jetzt.best)
check('Aufschlag wurde tatsaechlich ausgezahlt', jetzt.extra > 0, '+' + jetzt.extra + ' $ extra')

/* Uhr ablaufen lassen — die Kette muss enden. */
await S('takt', 999)
const nachher = await S('stand')
check('Abgelaufene Uhr beendet die Serie', nachher.n === 0 && !nachher.hud.sichtbar)
check('Rekord ueberlebt das Ende', nachher.best === 13, 'best=' + nachher.best)

/* Rekord im Spielstand. */
const gespeichert = await S('speichern')
check('Rekord steht im Spielstand', gespeichert === 13, 'kb=' + gespeichert)
const geladen = await S('laden', 7)
check('Rekord wird aus dem Spielstand gelesen', geladen === 7, 'best=' + geladen)

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 SERIE BESTANDEN' : '💥 SERIE FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
