/* th-jagd.mjs — die Rekordjagd waehrend des Laufs und der Verlauf danach.
 *
 * ⚠️ WOZU. Die Hetze hatte einen Rekord, aber waehrend der neunzig Sekunden lief man
 * blind: ob es reicht, erfuhr man erst am Ende. Der staerkste Moment einer Kurzrunde ist
 * aber der, in dem man WEISS, dass 40 $ fehlen und noch zwanzig Sekunden bleiben.
 * Und ein einzelner Punktestand sagt nichts — erst fuenf nebeneinander beantworten die
 * Frage "werde ich besser?".
 *
 * Beides sind Anzeige-Zusagen: sie muessen im richtigen Fenster erscheinen und sonst
 * NICHT. Jede Behauptung hier hat ihre Gegenprobe.
 *
 * Aufruf:  node spiele-dev/tools/th-jagd.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_jagd_probe.html'
mitSonden('traumhaus.html', {
  jd: `function(was,a){
    if(was==="reset"){HETZE.an=false;HETZE.t=0;HETZE.punkte=0;HETZE.best=0;HETZE.kette=0;
      HETZE.letzte=[];KOMBO.n=0;KOMBO.t=0;KOMBO.verdient=0;
      document.getElementById("hetzePanel").style.display="none";hetzeHudUpd();return true;}
    if(was==="setz"){HETZE.an=true;HETZE.t=45;HETZE.punkte=a[0];HETZE.best=a[1];
      hetzeHudUpd();return {punkte:HETZE.punkte,best:HETZE.best};}
    if(was==="hud"){var e=document.getElementById("hetzeHud");
      return {sichtbar:e.style.display!=="none",text:(e.textContent||"").replace(/\\s+/g," ").trim()};}
    if(was==="lauf"){HETZE.an=true;HETZE.t=1;HETZE.punkte=a;HETZE.kette=2;hetzeEnde();
      return {best:HETZE.best,letzte:HETZE.letzte.slice()};}
    if(was==="ergebnis"){var t=document.getElementById("hetzeErg");
      return {text:(t.textContent||"").replace(/\\s+/g," ").trim(),
        balken:t.querySelectorAll("div[style*='border-radius:4px 4px 0 0']").length};}
    if(was==="verlauf")return {liste:HETZE.letzte.slice(),html:hetzeVerlauf().length};
    if(was==="speichern"){var sn=snapshot();return {hz:sn.hz,hzl:sn.hzl};}
    if(was==="laden"){loadSnapshot(Object.assign(snapshot(),{hz:a[0],hzl:a[1]}));
      return {best:HETZE.best,letzte:HETZE.letzte.slice()};}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const J = (...a) => page.evaluate((x) => window.__th.jd(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

await J('reset')

/* --- 1. Die Jagd erscheint im richtigen Fenster --- */
await J('setz', [0, 0])
check('GEGENPROBE: ohne Rekord keine Jagd-Anzeige', !/noch|REKORD/.test((await J('hud')).text),
  '"' + (await J('hud')).text + '"')

await J('setz', [100, 1000])   /* 10 % — zu frueh */
const frueh = await J('hud')
check('GEGENPROBE: weit unter dem Rekord bleibt sie aus', !/noch \d+ \$/.test(frueh.text),
  '"' + frueh.text + '"')

await J('setz', [700, 1000])   /* 70 % — jetzt lohnt es sich */
const nah = await J('hud')
check('Ab der Haelfte zeigt sie den Rueckstand', /noch 300 \$/.test(nah.text), '"' + nah.text + '"')

await J('setz', [999, 1000])
check('Kurz davor stimmt die Zahl auf den Dollar', /noch 1 \$/.test((await J('hud')).text),
  '"' + (await J('hud')).text + '"')

await J('setz', [1000, 1000])
const drueber = await J('hud')
check('Auf Rekordhoehe schlaegt sie um', /REKORD/.test(drueber.text) && !/noch/.test(drueber.text),
  '"' + drueber.text + '"')
await J('setz', [1500, 1000])
check('… und bleibt darueber stehen', /REKORD/.test((await J('hud')).text))

/* --- 2. Der Verlauf --- */
await J('reset')
const l1 = await J('lauf', 100)
check('Erster Lauf steht im Verlauf', l1.letzte.length === 1 && l1.letzte[0] === 100,
  JSON.stringify(l1.letzte))
check('GEGENPROBE: ein einzelner Lauf zeichnet noch keine Balken',
  (await J('verlauf')).html === 0, 'HTML-Laenge 0')

for (const p of [300, 200, 500, 400, 250]) await J('lauf', p)
const v = await J('verlauf')
check('Der Verlauf haelt nur die letzten fuenf', v.liste.length === 5, JSON.stringify(v.liste))
check('… und zwar die juengsten', JSON.stringify(v.liste) === JSON.stringify([300, 200, 500, 400, 250]),
  JSON.stringify(v.liste))

const erg = await J('ergebnis')
check('Das Ergebnis zeichnet fuer jede Runde einen Balken', erg.balken === 5, erg.balken + ' Balken')
check('Das Ergebnis nennt den Rueckstand auf den Rekord', /gefehlt/.test(erg.text),
  '"' + erg.text.slice(0, 90) + '"')
check('Rekord ist der beste, nicht der letzte Lauf', (await J('verlauf')).liste.indexOf(500) >= 0 &&
  (await J('speichern')).hz === 500, 'best=' + (await J('speichern')).hz)

/* --- 3. Beides ueberlebt den Neustart --- */
const gesp = await J('speichern')
check('Verlauf steht im Spielstand', JSON.stringify(gesp.hzl) === JSON.stringify([300, 200, 500, 400, 250]),
  JSON.stringify(gesp.hzl))
const gel = await J('laden', [900, [10, 20, 30]])
check('Verlauf wird aus dem Spielstand gelesen',
  gel.best === 900 && JSON.stringify(gel.letzte) === JSON.stringify([10, 20, 30]), JSON.stringify(gel))
const gekappt = await J('laden', [1, [1, 2, 3, 4, 5, 6, 7, 8]])
check('GEGENPROBE: ein zu langer Verlauf im Spielstand wird gekappt',
  gekappt.letzte.length === 5, JSON.stringify(gekappt.letzte))

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 JAGD BESTANDEN' : '💥 JAGD FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
