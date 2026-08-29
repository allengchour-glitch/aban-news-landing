/* th-einladung.mjs — prueft, ob die Hetze ihren Spieler ueberhaupt findet.
 *
 * ⚠️ WOZU. Die Hetze lag hinter einem unbeschrifteten Emoji-Knopf, eine Menue-Ebene
 * tief. Ein Feature, das niemand findet, ist nichts wert — und das ist mit Hinsehen
 * nicht zu pruefen, weil es beim Entwickeln IMMER gefunden wird. Hier wird gemessen:
 * kommt die Einladung im richtigen Moment, kommt sie NUR EINMAL, und taucht die Hetze
 * in der Zielliste auf? Jede Behauptung mit Gegenprobe.
 *
 * Aufruf:  node spiele-dev/tools/th-einladung.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_einladung_probe.html'
mitSonden('traumhaus.html', {
  ei: `function(was,a){
    if(was==="reset"){stats.hetzeEinladung=0;stats.hetzen=0;stats.hetzeBest=0;stats.hetzeKette=0;
      achDone={};_achNah={};HETZE.an=false;HETZE.t=0;HETZE.punkte=0;HETZE.best=0;HETZE.kette=0;
      KOMBO.n=0;KOMBO.t=0;KOMBO.verdient=0;
      document.getElementById("hetzePanel").style.display="none";
      hetzeHudUpd();komboHudUpd();return true;}
    if(was==="serieEnde"){KOMBO.n=a;KOMBO.t=1;komboEnde();return KOMBO.n;}
    if(was==="panel"){var e=document.getElementById("hetzePanel");
      return {offen:e.style.display==="flex",
        text:(document.getElementById("hetzeErg").textContent||"").replace(/\\s+/g," ").trim(),
        knopf:(document.getElementById("hetzeNochmal").textContent||"").trim()};}
    if(was==="stand")return {einladung:stats.hetzeEinladung||0,hetzen:stats.hetzen||0,
      best:stats.hetzeBest||0,kette:stats.hetzeKette||0,an:HETZE.an,punkte:HETZE.punkte};
    if(was==="tipp"){document.getElementById(a).click();return true;}
    if(was==="lauf"){hetzeStart();verdiene(a);hetzeTakt(999);return stats.hetzen;}
    if(was==="ziele"){var r=[];for(var i=0;i<ACH.length;i++)
      if(/^hetze|^hetzer$/.test(ACH[i][0]))r.push({id:ACH[i][0],erfuellt:!!ACH[i][4](),
        name:ACH[i][2],stand:achStand(ACH[i][0])});return r;}
    if(was==="pruefAlle"){checkAch();var d=[];for(var k in achDone)if(achDone[k])d.push(k);return d;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const E = (...a) => page.evaluate((x) => window.__th.ei(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

await E('reset')

/* --- 1. Die Einladung trifft den Moment --- */
await E('serieEnde', 3)
const schwach = await E('panel')
check('GEGENPROBE: kurze Serie laedt nicht ein', !schwach.offen)
check('GEGENPROBE: … und verbraucht die Einladung nicht', (await E('stand')).einladung === 0)

await E('serieEnde', 6)
const ein = await E('panel')
check('Starke Serie oeffnet die Einladung', ein.offen)
check('Einladung erklaert, worum es geht',
  /Hetze/.test(ein.text) && /90|neunzig|Neunzig/i.test(ein.text) && /Rekord/.test(ein.text),
  '"' + ein.text.slice(0, 80) + '"')
check('Einladung verspricht nichts Falsches ueber die Serie',
  !/doppelt/i.test(ein.text) && /multipliziert/.test(ein.text))
check('Einladung nennt den Weg fuer spaeter', /🏆/.test(ein.text))
check('Knopf heisst hier "Los", nicht "Nochmal"', /Los/.test(ein.knopf) && !/Nochmal/.test(ein.knopf),
  '"' + ein.knopf + '"')

/* --- 2. Genau einmal --- */
await E('tipp', 'hetzeZu')
await E('serieEnde', 9)
const zweite = await E('panel')
check('GEGENPROBE: die Einladung kommt kein zweites Mal', !zweite.offen)

/* --- 3. Der Knopf startet wirklich, und heisst danach wieder "Nochmal" --- */
await E('reset')
await E('serieEnde', 6)
await E('tipp', 'hetzeNochmal')
const gestartet = await E('stand')
check('"Los" startet die Hetze', gestartet.an, 'an=' + gestartet.an)
const nachStart = await E('panel')
check('Knopf heisst in der laufenden Runde wieder "Nochmal"', /Nochmal/.test(nachStart.knopf),
  '"' + nachStart.knopf + '"')

/* --- 4. Wer schon gespielt hat, wird nicht eingeladen --- */
await E('reset')
await E('lauf', 100)
/* ⚠️ Nach einer gelaufenen Runde steht das ERGEBNIS offen. "Fenster offen" ist hier
   also kein Beleg fuer eine Einladung — erst schliessen, dann fragen. Sonst prueft
   der Test das Ergebnisfenster und nennt es Einladung. */
await E('tipp', 'hetzeZu')
await E('serieEnde', 8)
const kenner = await E('panel')
check('GEGENPROBE: wer die Hetze kennt, wird nicht eingeladen',
  !kenner.offen && !/Lust auf/.test(kenner.text),
  (await E('stand')).hetzen + ' gespielte Runden')

/* --- 5. Die Hetze steht in der Zielliste --- */
await E('reset')
const z0 = await E('ziele')
check('Drei Hetze-Ziele sind angelegt', z0.length === 3, z0.map((x) => x.id).join(', '))
check('GEGENPROBE: keins davon ist beim Start schon erfuellt', z0.every((x) => !x.erfuellt))
check('Die zaehlbaren haben einen Zwischenstand',
  z0.filter((x) => x.stand).length === 2, z0.map((x) => x.id + (x.stand ? '✓' : '–')).join(' '))

await E('lauf', 100)
const z1 = await E('ziele')
const erste = z1.find((x) => x.id === 'hetzer')
const profi = z1.find((x) => x.id === 'hetzeprofi')
check('Eine gespielte Runde erfuellt "Auf Zeit"', erste.erfuellt)
check('… und schiebt den Zaehler von "Rekordjaeger"', profi.stand.ist === 1, profi.stand.ist + '/5')
const vergeben = await E('pruefAlle')
check('checkAch vergibt den Erfolg auch wirklich', vergeben.includes('hetzer'), vergeben.join(', '))

const stand = await E('stand')
check('Punktestand der Runde wird als Bestwert gemerkt', stand.best > 0, stand.best + ' $')
check('GEGENPROBE: "Goldene Neunzig" bleibt bei 100 $ verschlossen',
  !z1.find((x) => x.id === 'hetzekoenig').erfuellt, stand.best + ' von 1000 $')

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 EINLADUNG BESTANDEN' : '💥 EINLADUNG FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
