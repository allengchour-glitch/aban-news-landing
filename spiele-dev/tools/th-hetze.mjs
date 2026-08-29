/* th-hetze.mjs — spielt die 90-Sekunden-Hetze durch und prueft, ob die Schleife schliesst.
 *
 * ⚠️ WOZU. Eine Kurzrunde lebt von drei Dingen, die man nicht ansehen kann: dass sie
 * wirklich ENDET, dass der Punktestand zaehlt was er zaehlen soll (und nichts sonst),
 * und dass der Weg zurueck in die naechste Runde EIN Tipp ist. Dazu die wichtigste
 * Absicherung: die Hetze darf kein Geld erzeugen — sonst waere endloses Wiederholen
 * die beste Strategie. Jede Behauptung hier hat ihre Gegenprobe.
 *
 * Aufruf:  node spiele-dev/tools/th-hetze.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_hetze_probe.html'
mitSonden('traumhaus.html', {
  hz: `function(was,a){
    if(was==="stand")return {an:HETZE.an,t:+HETZE.t.toFixed(2),punkte:HETZE.punkte,
      best:HETZE.best,kette:HETZE.kette,geld:geld,serie:KOMBO.n,
      hud:(function(){var e=document.getElementById("hetzeHud");
        return e?{sichtbar:e.style.display!=="none",text:(e.textContent||"").replace(/\\s+/g," ").trim()}:null;})(),
      ergebnis:(function(){var e=document.getElementById("hetzePanel");
        return e?{offen:e.style.display==="flex",
          text:(document.getElementById("hetzeErg").textContent||"").replace(/\\s+/g," ").trim()}:null;})()};
    if(was==="start"){hetzeStart();return true;}
    if(was==="takt"){hetzeTakt(a);return true;}
    if(was==="verdiene")return verdiene(a);
    if(was==="geschenk")return verdiene(a,false);
    if(was==="serie"){KOMBO.n=a;KOMBO.t=99;komboHudUpd();return KOMBO.n;}
    if(was==="reset"){HETZE.an=false;HETZE.t=0;HETZE.punkte=0;HETZE.best=0;HETZE.kette=0;
      KOMBO.n=0;KOMBO.t=0;KOMBO.verdient=0;hetzeHudUpd();komboHudUpd();
      document.getElementById("hetzePanel").style.display="none";return true;}
    if(was==="tipp"){var b=document.getElementById(a);if(!b)return null;b.click();return true;}
    if(was==="knopf"){document.getElementById("achBtn").click();
      var t=(document.getElementById("hetzeBtn").textContent||"").trim();
      document.getElementById("achClose").click();return t;}
    if(was==="lage"){var e2=document.getElementById("hetzeHud"),k=document.getElementById("komboHud");
      var a2=e2.getBoundingClientRect(),b2=k.getBoundingClientRect();
      return {hetzeOben:a2.top,hetzeUnten:a2.bottom,serieUnten:b2.bottom,
        serieSichtbar:k.style.display!=="none",
        ueberlappt:!(a2.bottom<=b2.top||a2.top>=b2.bottom)};}
    if(was==="speichern")return snapshot().hz;
    if(was==="laden"){loadSnapshot(Object.assign(snapshot(),{hz:a}));return HETZE.best;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const H = (...a) => page.evaluate((x) => window.__th.hz(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

await H('reset')
const aus = await H('stand')
check('Ohne Runde ist die Uhr unsichtbar', aus.hud && !aus.hud.sichtbar)

/* --- 1. Start: Uhr laeuft, Serie steht auf null --- */
await H('serie', 7)
await H('start')
const an = await H('stand')
check('Start setzt die volle Zeit', an.an && Math.abs(an.t - 90) < 0.1, an.t + ' s')
check('Start loescht eine vorgewaermte Serie', an.serie === 0, 'Serie=' + an.serie)
check('Uhr ist sichtbar und nennt Zeit und Punkte', an.hud.sichtbar && /90s/.test(an.hud.text) && /0 \$/.test(an.hud.text),
  '"' + an.hud.text + '"')

/* --- 2. Der Punktestand zaehlt Verdienst — und NUR Verdienst --- */
const geldVor = an.geld
const aus1 = await H('verdiene', 100)
const nach1 = await H('stand')
check('Verdienst landet im Punktestand', nach1.punkte === aus1, nach1.punkte + ' = Auszahlung ' + aus1)
check('Punktestand ist die Auszahlung samt Serien-Aufschlag', aus1 > 100, aus1 + ' $ statt 100 $')
check('Das Geld wandert genau einmal in die Kasse', nach1.geld === geldVor + aus1,
  nach1.geld + ' = ' + geldVor + ' + ' + aus1)

const punkteVor = nach1.punkte
await H('geschenk', 500)     /* zaehlt-false: Miete, Geschenke, Rueckerstattungen */
const nach2 = await H('stand')
check('GEGENPROBE: nicht gezaehlter Zufluss bleibt draussen', nach2.punkte === punkteVor,
  nach2.punkte + ' Punkte, erwartet ' + punkteVor + ' (mitgezaehlt waeren ' + (punkteVor + 500) + ')')
check('… kommt aber trotzdem in der Kasse an', nach2.geld === nach1.geld + 500)

/* --- 3. Die Uhr laeuft ab und die Runde endet --- */
await H('takt', 30)
const mitte = await H('stand')
check('Uhr zaehlt herunter', mitte.t < 61 && mitte.t > 58, mitte.t + ' s')
check('GEGENPROBE: mittendrin ist kein Ergebnis offen', !mitte.ergebnis.offen)

const kette = mitte.kette
await H('takt', 999)
const ende = await H('stand')
check('Abgelaufene Uhr beendet die Runde', !ende.an && !ende.hud.sichtbar)
check('Ergebnis erscheint von selbst', ende.ergebnis.offen)
check('Ergebnis nennt Punktestand und laengste Serie',
  ende.ergebnis.text.includes(String(ende.punkte)) && /Serie/.test(ende.ergebnis.text),
  '"' + ende.ergebnis.text.slice(0, 70) + '"')
check('Erste Runde ist ein Rekord', /REKORD/.test(ende.ergebnis.text) && ende.best === ende.punkte,
  'best=' + ende.best)
check('Laengste Serie wurde mitgeschrieben', ende.kette >= 1 && ende.kette >= kette, 'Kette=' + ende.kette)

/* --- 4. Ein Tipp zurueck in die naechste Runde --- */
await H('tipp', 'hetzeNochmal')
const neu = await H('stand')
check('"Nochmal" startet sofort — ohne Umweg', neu.an && Math.abs(neu.t - 90) < 0.1 && !neu.ergebnis.offen,
  neu.t + ' s')
check('Neue Runde beginnt bei null Punkten', neu.punkte === 0)
check('Rekord der Vorrunde bleibt stehen', neu.best === ende.best, 'best=' + neu.best)

/* --- 5. Schwaechere Runde stuerzt den Rekord nicht --- */
await H('verdiene', 1)
await H('takt', 999)
const schwach = await H('stand')
check('GEGENPROBE: schwaechere Runde ist kein Rekord',
  !/REKORD/.test(schwach.ergebnis.text) && schwach.best === ende.best,
  schwach.punkte + ' $ gegen Rekord ' + schwach.best)
check('Ergebnis zeigt dann den Rekord zum Vergleich', /Rekord/.test(schwach.ergebnis.text))
await H('tipp', 'hetzeZu')
check('"Schluss" schliesst das Ergebnis', !(await H('stand')).ergebnis.offen)

/* --- 6. Zwei Balken duerfen sich nicht ueberlappen --- */
await H('start')
await H('serie', 5)
await page.evaluate(() => window.__th.hz('takt', 0.1))
const lage1 = await H('lage')
check('Uhr liegt unter dem Serien-Balken, ohne ihn zu treffen',
  lage1.serieSichtbar && !lage1.ueberlappt && lage1.hetzeOben >= lage1.serieUnten,
  'Serie endet ' + Math.round(lage1.serieUnten) + ', Hetze ab ' + Math.round(lage1.hetzeOben))
/* --- 7. Rekord im Spielstand --- */
const gesp = await H('speichern')
check('Rekord steht im Spielstand', gesp === ende.best, 'hz=' + gesp)
const gel = await H('laden', 4242)
check('Rekord wird aus dem Spielstand gelesen', gel === 4242, 'best=' + gel)
check('Knopf im Menue nennt den Rekord', /4242/.test(await H('knopf')), await H('knopf'))

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 HETZE BESTANDEN' : '💥 HETZE FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
