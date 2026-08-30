/* th-gps.mjs — prueft das GTA-GPS-Wegpunkt-System live.
 *
 * Checks:
 *  1. gpsSetz(x,z) liefert true und einen Pfad mit >2 Punkten
 *  2. Pfad-Endpunkt liegt am Ziel, Startpunkt nahe beim Spieler
 *  3. Kein Pfadpunkt liegt im Wasser (See/Meer) oder in einem Gebaeude (imBau)
 *  4. Route bevorzugt Strassen (Anteil Strassen-Zellen > 40 % bei einem Stadtziel)
 *  5. Leuchtsaeule (beam) + Ring sichtbar an der Zielposition
 *  6. Ankunft: Spieler ans Ziel teleportieren -> GPS raeumt sich weg, stats.gpsZiele=1
 *  7. JEDES Viertel ist anwaehlbar (siehe Warnung unten)
 *  8. Screenshots: grosse Karte mit Route, Radar mit Route
 *
 * ⚠️ EIN ZIEL IST KEINE ABDECKUNG. Bis 2026-08-30 fuhr dieses Werkzeug genau eine
 * Route quer durch die Stadt und meldete "GPS BESTANDEN". Zur selben Zeit war der
 * FREIZEITPARK — das groesste Viertel — mit dem GPS ueberhaupt nicht anwaehlbar:
 * die A*-Schleife brach bei 60 000 Runden ab und `gpsSetz` sagte "Kein Weg dorthin
 * gefunden". Die Stadtroute brauchte 12 000 Runden und lief nie in den Deckel.
 * Darum wird jetzt JEDES Viertel aus `_viertelSolver.VIERTEL` einzeln angefahren —
 * die Liste kommt aus dem Spiel, ein neues Viertel ist damit automatisch mitgeprueft.
 */
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_gps_probe.html'
mitSonden('traumhaus.html', {
  gps: `function(was,a,b){
    if(was==="setz")return gpsSetz(a,b);
    if(was==="tp"){var me=sims[meinSi()];me.x=a;me.z=b;return true;}
    if(was==="tick"){updMinimap(1);return true;}
    if(was==="stand")return {aktiv:GPS.aktiv,x:GPS.x,z:GPS.z,
      pfad:GPS.pfad?GPS.pfad.slice():null,
      beamSichtbar:!!(GPS.beam&&GPS.beam.visible),
      beamPos:GPS.beam?[GPS.beam.position.x,GPS.beam.position.z]:null,
      ringSichtbar:!!(GPS.ring&&GPS.ring.visible),
      ziele:stats.gpsZiele||0};
    if(was==="pruef"){var p=(GPS.pfad||[]).slice(0,-1),schlecht=[],strasse=0;
      /* letzter Punkt = exaktes Tipp-Ziel, darf wie in GTA IM Gebaeude liegen */
      for(var i=0;i<p.length;i++){var x=p[i][0],z=p[i][1];
        if(x<-233||Math.hypot(x,z-146)<25||imBau(x,z))schlecht.push([x,z]);
        if(gpsStrasse(x,z))strasse++;}
      return {n:p.length,schlecht:schlecht,strassenAnteil:p.length?strasse/p.length:0};}
    if(was==="viertel"){
      /* Die Liste kommt aus dem Spiel, nicht aus einer Tabelle hier — sonst veraltet
         sie wie schon dreimal geschehen (siehe _GPS_VERB im Spiel). */
      var L=(window._viertelSolver&&window._viertelSolver.VIERTEL)||[];
      return L.map(function(v){
        var t0=performance.now(),pf=gpsRoute(a,b,v.x,v.z),ms=Math.round(performance.now()-t0);
        if(!pf)return {name:v.name,x:Math.round(v.x),z:Math.round(v.z),pfad:0,ms:ms};
        var p=pf.slice(0,-1),s=0;
        for(var i=0;i<p.length;i++)if(gpsStrasse(p[i][0],p[i][1]))s++;
        return {name:v.name,x:Math.round(v.x),z:Math.round(v.z),pfad:p.length,
                anteil:p.length?Math.round(s/p.length*100):0,ms:ms};});}
    if(was==="karte"){bigMapOpen();return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const S = (...a) => page.evaluate((args) => window.__th.gps(...args), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

/* Spieler an einen bekannten Ort stellen, Ziel: Bahnhof (0,102) -> Kathedrale (-58,-78)
   quer durch die Stadt — muss Strassen benutzen und den Fluss an einer Bruecke queren. */
await S('tp', 0, 102)
const gesetzt = await S('setz', -58, -78)
check('gpsSetz liefert true', gesetzt === true)
let st = await S('stand')
check('GPS aktiv mit Pfad', !!(st.aktiv && st.pfad && st.pfad.length > 2), 'Punkte=' + (st.pfad ? st.pfad.length : 0))
if (st.pfad && st.pfad.length) {
  const erster = st.pfad[0], letzter = st.pfad[st.pfad.length - 1]
  /* Spieler steht per Teleport MITTEN im Bahnhof — der Start ist die naechste freie
     Zelle vor der Tuer (Spiralsuche), darum 12 m Toleranz statt 8. */
  check('Pfad beginnt beim Spieler', Math.hypot(erster[0] - 0, erster[1] - 102) < 12,
    `Start (${erster[0].toFixed(0)},${erster[1].toFixed(0)})`)
  check('Pfad endet am Ziel', Math.hypot(letzter[0] + 58, letzter[1] + 78) < 2,
    `Ende (${letzter[0].toFixed(0)},${letzter[1].toFixed(0)})`)
}
const pr = await S('pruef')
check('Kein Punkt in Wasser/Gebaeude', pr.schlecht.length === 0,
  pr.schlecht.length ? 'schlecht: ' + JSON.stringify(pr.schlecht.slice(0, 3)) : pr.n + ' Punkte sauber')
check('Route folgt Strassen', pr.strassenAnteil > 0.4, 'Anteil=' + (pr.strassenAnteil * 100).toFixed(0) + '%')
check('Leuchtsaeule sichtbar am Ziel', st.beamSichtbar && st.beamPos &&
  Math.hypot(st.beamPos[0] + 58, st.beamPos[1] + 78) < 1, JSON.stringify(st.beamPos))
check('Boden-Ring sichtbar', st.ringSichtbar)

/* JEDES Viertel anfahren. Startpunkt ist der Stadtkern (0|0); von dort aus sind alle
   Viertel ueber Zubringer und Landstrasse angebunden. Gemeldet wird auch der Anteil
   der Route, der auf Asphalt liegt — ein Weg quer ueber die Wiese ist zwar ein Weg,
   aber keiner, dem man mit dem Auto folgen kann. */
const vs = await S('viertel', 0, 0)
const ohne = vs.filter(v => !v.pfad)
const duenn = vs.filter(v => v.pfad && v.anteil < 40)
for (const v of vs) {
  console.log('     ' + v.name.padEnd(20) + (v.x + '|' + v.z).padStart(10) + '  ' +
    (v.pfad ? 'Strasse ' + String(v.anteil).padStart(3) + '% · ' + String(v.pfad).padStart(4) + ' Punkte · ' + String(v.ms).padStart(4) + ' ms'
            : 'KEIN WEG'))
}
check('Jedes Viertel ist anwaehlbar', ohne.length === 0,
  ohne.length ? 'ohne Weg: ' + ohne.map(v => v.name).join(', ') : vs.length + ' Viertel')
/* ⚠️ NUR ueber die Viertel MIT Weg mitteln. Die Selbstprobe gegen den alten
   Rundendeckel meldete "schwaechste NaN%", weil ein Viertel ohne Weg keinen Anteil
   hat — die Zeile haette den Ausfall auch noch huebsch gerechnet. */
const mitWeg = vs.filter(v => v.pfad)
check('Jede Viertel-Route folgt Strassen', duenn.length === 0,
  duenn.length ? duenn.map(v => v.name + ' ' + v.anteil + '%').join(', ')
               : mitWeg.length ? 'schwaechste ' + Math.min(...mitWeg.map(v => v.anteil)) + '%' : 'keine Route')

/* Screenshots: grosse Karte mit Route, dann Radar */
await S('karte')
await page.waitForTimeout(400)
await page.screenshot({ path: REPO + '/spiele-dev/screenshots/gps-bigmap.png' })
await page.evaluate(() => document.getElementById('bigmapClose').click())
await S('tick')
await page.waitForTimeout(300)
await page.screenshot({ path: REPO + '/spiele-dev/screenshots/gps-radar.png',
  clip: { x: 0, y: 100, width: 200, height: 220 } })

/* Ankunft: nah ans Ziel teleportieren, Radar-Takt laufen lassen */
await S('tp', -58, -76)
await S('tick')
st = await S('stand')
check('Ankunft raeumt GPS weg', !st.aktiv && !st.beamSichtbar, 'ziele=' + st.ziele)
check('stats.gpsZiele gezaehlt', st.ziele === 1)

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 GPS BESTANDEN' : '💥 GPS FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
