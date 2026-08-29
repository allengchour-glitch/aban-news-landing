/* th-zahlen.mjs — zeigt die Oberflaeche irgendwo NaN, Infinity oder undefined?
 *
 * ⚠️ WOZU. Auf der Webseite hat genau diese Frage zwei echte Fehler gefunden
 * ("NaN % über Brutto" im Arbeitgeberkosten-Rechner, dazu eine Zeile mit veralteten
 * Zahlen). Das Spiel rechnet an viel mehr Stellen — Geld, Stufe, Beduerfnisse, Uhr,
 * Missionen, Statistiken — und jede Division kann durch null gehen.
 *
 * Geprueft wird der SICHTBARE Text der Bedienoberflaeche, nicht der Code: was der
 * Spieler liest. Ueber mehrere Zeitpunkte, damit auch Zustaende erwischt werden, die
 * erst nach ein paar Sekunden entstehen (Tageswechsel, Nachlade-Anzeigen).
 *
 * Aufruf:  node spiele-dev/tools/th-zahlen.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_zahlen_probe.html'
mitSonden('traumhaus.html', {
  zahl: `function(was,a){
    if(was==="text"){
      /* Nur sichtbare Oberflaeche, nicht das ganze Dokument (der Startbildschirm
         und versteckte Dialoge zaehlen nicht — der Spieler sieht sie nicht). */
      var out=[];
      document.querySelectorAll("#hud, #hud *, #zoomBtns *, #modeBtn, #achBtn, #buskBtn, #crimeBtn, .hintbox, #hint, #tagesReport").forEach(function(el){
        var s=getComputedStyle(el);
        if(s.display==="none"||s.visibility==="hidden")return;
        var t=(el.childNodes.length?[].slice.call(el.childNodes).filter(function(n){return n.nodeType===3;})
               .map(function(n){return n.nodeValue;}).join(" "):"");
        if(t&&t.trim())out.push({id:el.id||el.className||el.tagName, t:t.replace(/\\s+/g," ").trim()});});
      return out;}
    if(was==="geld")   {geld=a;geldSend&&geldSend();updHUD&&updHUD();return geld;}
    if(was==="uhrzeit"){uhrzeit=a;return uhrzeit;}
    if(was==="stats")  {return JSON.parse(JSON.stringify(stats));}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const Z = (...a) => page.evaluate((x) => window.__th.zahl(...x), a)
const MUELL = /\bNaN\b|\bInfinity\b|\bundefined\b|-Infinity/

let fehler = 0, geprueft = 0
async function schauen(wann) {
  const T = await Z('text')
  geprueft += T.length
  T.forEach((e) => {
    if (MUELL.test(e.t)) { fehler++; console.log(`  ❌ ${wann}: ${e.id} → "${e.t.slice(0, 70)}"`) }
  })
}

await schauen('nach dem Start')
/* Extremwerte, die im Spiel wirklich vorkommen koennen. */
for (const [g, wann] of [[0, 'Geld 0'], [-500, 'Geld negativ'], [1e9, 'Geld 1 Mrd']]) {
  await Z('geld', g); await page.waitForTimeout(600); await schauen(wann)
}
await Z('geld', 5040)
/* Ueber einen ganzen Spieltag laufen lassen (Tageswechsel, Nacht, Morgen). */
for (const h of [0, 6, 12, 18, 23]) {
  await Z('uhrzeit', h * 60); await page.waitForTimeout(700); await schauen(`Uhr ${h}:00`)
}
console.log(`\n${fehler ? '❌' : '✅'} ${geprueft} Textstellen der Oberflaeche geprueft · ${fehler} mit NaN/Infinity/undefined`)
console.log(`JS-Fehler: ${jsFehler.length}${jsFehler.length ? ' — ' + jsFehler[0] : ''}`)
await browser.close()
aufraeumen(TMP)
process.exit(fehler === 0 && jsFehler.length === 0 ? 0 : 1)
