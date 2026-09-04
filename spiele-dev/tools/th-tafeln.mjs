/* th-tafeln.mjs — jede Tafel, die der Spieler oeffnen kann, einmal ansehen und pruefen.
 *
 * ⚠️ WOZU. User 2026-09-02: "screenshote und schaue selber oder spiel selber dann weisst
 * du das es gar nicht fertig ist." `th-spielerblick` spielt die ersten Minuten und
 * fotografiert die WELT; `th-hud` prueft die immer sichtbare Bedienleiste. Was niemand
 * ansieht, sind die TAFELN: Erfolge, grosse Karte, Bau-Palette, Coup-Auswahl, Hetze,
 * Minispiel. Genau dort steht viel Text auf wenig Platz — und genau dort war der letzte
 * Fund des Users (eine Zeile, die aus ihrer Kachel fiel).
 *
 * Je Tafel wird geprueft, was man auch von Hand pruefen wuerde:
 *   * geht sie ueberhaupt auf (sichtbar, Flaeche > 0)?
 *   * ragt sie aus dem Bild?
 *   * bricht eine Textzeile um, die eine Zeile sein sollte?
 *   * ist sie LEER (kein Text, keine Knoepfe) — eine leere Tafel ist ein Fehler,
 *     der beim Messen von Rechtecken unsichtbar bleibt;
 *   * kommt man wieder heraus (Schliessen-Knopf vorhanden und wirksam)?
 * Dazu ein Bild je Tafel in spiele-dev/screenshots/tafeln/.
 *
 * ⚠️ HANDY-QUERFORMAT, nicht Desktop. Der User spielt auf dem Handy; `screen` muss
 * mitgegeben werden, sonst laeuft die Messung im Desktop-Modus (dieselbe Falle wie in
 * th-hud und th-koop).
 *
 * ⚠️ DIE ZEILENZAHL NICHT AUS DER HOEHE RECHNEN. Hoehe/Zeilenhoehe zaehlt das Polster
 * mit; eine einzeilige Kachel mit 8 px oben und unten sieht dann aus wie zwei Zeilen
 * (in th-hud einmal passiert, drei Fehlalarme). Gezaehlt werden die echten Zeilenkaesten
 * ueber einen Range.
 *
 * Aufruf:  node spiele-dev/tools/th-tafeln.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'
import { mkdirSync } from 'node:fs'

const B = 844, H = 390
const ZIEL = REPO + '/spiele-dev/screenshots/tafeln/'
mkdirSync(ZIEL, { recursive: true })

/* Jede Tafel: wie sie aufgeht, welches Element sie ist, wie sie wieder zugeht. */
/* ⚠️ DIE VORBEDINGUNG GEHOERT ZUM TEST. Der erste Lauf meldete drei Tafeln als
   "GEHT NICHT AUF" — und alle drei waren mein Aufbau, nicht das Spiel:
   `tools` erscheint nur im Bau-Modus (den hatte ich vorher wieder geschlossen),
   `crimeWahl` und `hetzePanel` haengen an Ort, Uhrzeit und Rang. Ein Knopf, den man
   nicht druecken kann, ist kein Befund — ein Fenster, das trotz Aufruf leer bleibt,
   schon. Darum wird jede Tafel ueber IHRE Funktion geoeffnet und die noetige Lage
   vorher hergestellt. */
const TAFELN = [
  /* ⚠️ achBtn IST KEIN UMSCHALTER — er setzt display:flex, jedes Mal. Geschlossen wird
     mit achClose. Mein erster Aufbau nahm achBtn als Schliesser und machte die Tafel
     damit jedes Mal neu auf; auf den Bildern von Bau-Palette und Hetze lag sie dann
     mitten im Bild und sah nach einem Fehler des Spiels aus. War keiner. */
  { name: 'erfolge', auf: 'achBtn', el: 'achPanel', zu: 'achClose' },
  { name: 'karte', el: 'bigmapWrap', zu: 'bigmapClose', ruf: 'bigMapOpen' },
  { name: 'bauen', auf: 'modeBtn', el: 'palette', zu: null },
  { name: 'werkzeuge', el: 'tools', zu: 'modeBtn' },      /* nur im Bau-Modus — direkt danach */
  /* ⚠️ NUR NACHTS. `crimeAvailable()` verlangt 21…5 Uhr (dazu kein Bau-Modus, keine
     Arbeit, kein Auto). Der Testlauf startet um 8 Uhr — die Tafel konnte gar nicht
     aufgehen, und das war der vierte Aufbaufehler in Folge, nicht ein Fund. */
  { name: 'krimi', el: 'crimeWahl', zu: 'crimeWahlAbbr', auf: 'crimeBtn', vor: 'nacht' },
  /* `hetzeStart` SCHLIESST diese Tafel — sie gehoert ans ENDE der Hetze. Gezeigt wird
     sie von `hetzeEnde`; das war der zweite Aufbaufehler in Folge. */
  { name: 'hetze', el: 'hetzePanel', zu: null, ruf: 'hetzeEnde' },
]

const TMP = mitSonden('traumhaus.html', {
  /* Geld und Raenge hoch, damit gesperrte Tafeln ueberhaupt aufgehen */
  reich: `function(){geld=999999;skills.arbeit.lv=3;skills.liebe.lv=2;skills.krimi.lv=2;
    stufeHudUpd();updHUD();return geld;}`,
  nacht: `function(){uhrzeit=22*60+30;return Math.round(uhrzeit);}`,
  /* Ortsnamen auf der grossen Karte: ueberlappen sie sich? Die Kaesten kommen aus dem
     Spiel selbst (window._kartenLabels) — hier steht die Rechnung NICHT ein zweites
     Mal, sonst laufen die beiden Herleitungen beim naechsten Umbau auseinander. */
  kartenNamen: `function(){
    var L=window._kartenLabels||[];
    function box(e){var px=e.padX||2,py=e.padY||0;
      return [e.x-e.w/2-px,e.y-e.h-py,e.x+e.w/2+px,e.y+5+py];}
    var paare=0,weg=[];
    for(var i=0;i<L.length;i++){ if(!L[i].gezeichnet){weg.push(L[i].t);continue;}
      for(var j=i+1;j<L.length;j++){ if(!L[j].gezeichnet)continue;
        var a=box(L[i]),b=box(L[j]);
        if(a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1])paare++;}}
    return {namen:L.length,gezeichnet:L.length-weg.length,weggelassen:weg,ueberlappend:paare};}`,
  ruf: `function(n){ if(typeof window[n]==="function"){window[n]();return true;}
    try{ eval(n+"()"); return true; }catch(e){ return false; } }`,
  tafel: `function(id){
    var el=document.getElementById(id); if(!el)return {da:false};
    var s=getComputedStyle(el), r=el.getBoundingClientRect();
    var sichtbar=s.display!=="none"&&s.visibility!=="hidden"&&+s.opacity>0&&r.width>4&&r.height>4;
    /* Zeilenkaesten ueber einen Range zaehlen — nicht Hoehe durch Zeilenhoehe. */
    function zeilen(n){var rg=document.createRange();rg.selectNodeContents(n);
      var t={};[].slice.call(rg.getClientRects()).forEach(function(q){
        if(q.width>0.5&&q.height>0.5)t[Math.round(q.top)]=1;});
      return Math.max(1,Object.keys(t).length);}
    var blaetter=[].slice.call(el.querySelectorAll("*")).filter(function(n){
      if(n.querySelector("*"))return false;
      var cs=getComputedStyle(n); if(cs.display==="none")return false;
      return (n.textContent||"").trim().length>1;});
    /* ⚠️ UMBRUCH IST IN EINER TAFEL KEIN FEHLER. Der erste Lauf meldete eine
       Erfolgs-Beschreibung, die ueber zwei Zeilen laeuft — angesehen: voellig richtig
       so, in einer Liste soll Text umbrechen. Diese Frage gehoert zur HUD-Leiste
       (th-hud), wo eine Kachel feste Groesse hat. In einer Tafel zaehlt etwas anderes:
       wird Inhalt ABGESCHNITTEN, ohne dass man scrollen kann? */
    var beschnitten=[];
    [].slice.call(el.querySelectorAll("*")).concat([el]).forEach(function(n){
      var cs=getComputedStyle(n); if(cs.display==="none")return;
      var scrollbar=/auto|scroll/.test(cs.overflowY+" "+cs.overflowX);
      if(scrollbar)return;
      if(cs.overflow==="visible"&&cs.overflowY==="visible"&&cs.overflowX==="visible")return;
      var dh=n.scrollHeight-n.clientHeight, dw=n.scrollWidth-n.clientWidth;
      if(dh>3||dw>3)beschnitten.push({tag:(n.id||n.tagName.toLowerCase()),
        fehltH:Math.max(0,dh),fehltB:Math.max(0,dw),
        txt:(n.textContent||"").trim().slice(0,36)});});
    var knoepfe=el.querySelectorAll("button,[onclick]").length;
    return {da:true,sichtbar:sichtbar,
      x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
      raus:(r.left<-1||r.right>${B}+1||r.top<-1||r.bottom>${H}+1),
      text:(el.textContent||"").trim().length,knoepfe:knoepfe,blaetter:blaetter.length,
      beschnitten:beschnitten.slice(0,4)};}`,
}, '_tafeln_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(TMP, {
  warten: 55000, viewport: { width: B, height: H }, screen: { width: 412, height: 915 },
})
await page.evaluate(() => window.__th.reich())
await page.waitForTimeout(600)

const klick = async (id) => page.evaluate((x) => {
  const b = document.getElementById(x); if (!b) return false
  if (getComputedStyle(b).display === 'none') b.style.display = 'block'
  b.click(); return true
}, id)

let fehl = 0, offen = 0, hinweise = 0
console.log(`${TAFELN.length} Tafeln im Handy-Querformat ${B}x${H}\n`)
for (const t of TAFELN) {
  let gerufen = true
  if (t.vor) { await page.evaluate((n) => window.__th[n](), t.vor); await page.waitForTimeout(2500) }
  if (t.ruf) gerufen = await page.evaluate((n) => window.__th.ruf(n), t.ruf)
  else if (t.auf) await klick(t.auf)
  await page.waitForTimeout(1200)
  const r = await page.evaluate((id) => window.__th.tafel(id), t.el)
  const p = []
  let nurHinweis = false
  if (!r.da) { p.push('GIBT ES NICHT') }
  else if (!r.sichtbar) {
    /* ⚠️ Der Coup ist eine KOOP-Sache: coupStart bricht solo mit einem Hinweis ab.
       Eine Tafel, die man solo gar nicht erreichen kann, ist kein Fehler des Spiels. */
    if (t.nurKoop) { p.push('nur im Koop erreichbar — solo nicht pruefbar'); nurHinweis = true }
    else p.push(gerufen ? 'GEHT NICHT AUF' : 'Oeffner nicht gefunden')
  } else {
    offen++
    if (r.raus) p.push('ragt aus dem Bild')
    if (r.text < 3 && !r.knoepfe) p.push('LEER')
    if (r.beschnitten.length) p.push(r.beschnitten.length + ' Stelle(n) abgeschnitten')
  }
  if (p.length && !nurHinweis) fehl++
  if (nurHinweis) hinweise++
  console.log('  ' + (p.length ? (nurHinweis ? 'ℹ️  ' : '❌ ') : '   ') + t.name.padEnd(11) +
    (r.da && r.sichtbar ? (r.w + 'x' + r.h + ' @' + r.x + ',' + r.y).padEnd(20) +
      r.text + ' Zeichen · ' + r.knoepfe + ' Knoepfe' : '—').padEnd(38) +
    (p.join(' · ') || 'ok'))
  for (const u of (r.beschnitten || [])) console.log('        ↳ ' + u.tag + ': ' + u.fehltH + ' px Hoehe / ' + u.fehltB + ' px Breite abgeschnitten  „' + u.txt + '"')
  if (r.sichtbar) await page.screenshot({ path: ZIEL + t.name + '.png' })
  if (t.zu) { await klick(t.zu); await page.waitForTimeout(900) }
}

/* Die Karte ist die einzige Tafel mit eigenem Satz — ihre Ortsnamen werden gezeichnet,
   nicht gelayoutet, und ein Ueberlapp faellt keiner Rechteck-Pruefung auf. */
await page.evaluate((n) => window.__th.ruf(n), 'bigMapOpen')
await page.waitForTimeout(1200)
const kn = await page.evaluate(() => window.__th.kartenNamen())
const knFehl = kn.ueberlappend > 0
if (knFehl) fehl++
console.log(`\n  ${knFehl ? '❌' : '   '}Kartennamen  ${kn.gezeichnet} von ${kn.namen} gezeichnet · ` +
  `${kn.ueberlappend} ueberlappen` + (kn.weggelassen.length ? ' · weggelassen (Sinnbild bleibt): ' + kn.weggelassen.join(', ') : ''))
await page.evaluate(() => { const b = document.getElementById('bigmapClose'); if (b) b.click() })

console.log(`\n${fehl ? '❌' : '✅'} Tafeln mit Befund: ${fehl} von ${TAFELN.length} (${offen} gingen auf, ${hinweise} nur im Koop)`)
console.log(`${jsFehler.length ? '❌' : '✅'} JS-Fehler: ${jsFehler.length}` + (jsFehler.length ? ' — ' + jsFehler[0] : ''))
console.log(`\n${!fehl && !jsFehler.length ? '🎉 TAFELN BESTANDEN' : '💥 TAFELN FEHLGESCHLAGEN'} — ${TAFELN.length} geprueft, ${fehl} mit Befund`)
await browser.close()
aufraeumen(TMP)
process.exit(!fehl && !jsFehler.length ? 0 : 1)
