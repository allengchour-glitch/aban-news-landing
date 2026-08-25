/* th-netz.mjs — prueft den Strassennetz-Ausbau von GPS + Weltkarte.
 *
 * Vorher: das GPS-Raster endete bei z=280 (Freizeitpark 330, Bauernhof -241 unerreichbar),
 * gpsStrasse kannte nur die Innenstadt, die Karte zeichnete weder Landstrasse noch Sued-Viertel.
 *
 * Checks:
 *  1. gpsStrasse kennt Ring (r 200), Meer-Sektor bleibt ausgespart
 *  2. gpsStrasse kennt Zubringer + Freizeitpark-Verbinder, Wiese bleibt Wiese
 *  3. Route Marktplatz -> Freizeitpark (60,330) existiert, endet am Ziel,
 *     benutzt den Sued-Verbinder (Punkte auf x~60, z>220) und >50 % Strassen
 *  4. Route -> Bauernhof (-40,-196) existiert und endet am Ziel
 *  5. Screenshot der Weltkarte mit vollem Netz
 */
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_netz_probe.html'
mitSonden('traumhaus.html', {
  netz: `function(was,a,b){
    if(was==="strasse")return gpsStrasse(a,b);
    if(was==="tp"){var me=sims[meinSi()];me.x=a;me.z=b;return true;}
    if(was==="setz")return gpsSetz(a,b);
    if(was==="stand")return {aktiv:GPS.aktiv,x:GPS.x,z:GPS.z,pfad:GPS.pfad?GPS.pfad.slice():null};
    if(was==="anteil"){var p=(GPS.pfad||[]).slice(0,-1),s=0;
      for(var i=0;i<p.length;i++)if(gpsStrasse(p[i][0],p[i][1]))s++;
      return p.length?s/p.length:0;}
    if(was==="karte"){bigMapOpen();return true;}
    if(was==="weg"){gpsWeg();return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const S = (...a) => page.evaluate((args) => window.__th.netz(...args), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

/* 1+2: Strassen-Erkennung punktweise */
const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6)
check('Ring Ost (0,200) ist Strasse', await S('strasse', 0, 200))
check('Ring im Meer-Sektor (-200,0) ist KEINE Strasse', !(await S('strasse', -200, 0)))
check('Zubringer 30 Grad (r 160) ist Strasse', await S('strasse', c30 * 160, s30 * 160))
check('Freizeitpark-Verbinder (60,300) ist Strasse', await S('strasse', 60, 300))
check('Bauernhof-Verbinder (-40,-150) ist Strasse', await S('strasse', -40, -150))
check('Wiese (50,50) bleibt Wiese', !(await S('strasse', 50, 50)))

/* 3: Route quer durch die halbe Welt zum Freizeitpark */
await S('tp', 26, 67)
check('Route zum Freizeitpark moeglich', await S('setz', 60, 330) === true)
let st = await S('stand')
if (st.pfad && st.pfad.length) {
  const l = st.pfad[st.pfad.length - 1]
  check('Route endet am Freizeitpark', Math.hypot(l[0] - 60, l[1] - 330) < 2, `Ende (${l[0].toFixed(0)},${l[1].toFixed(0)})`)
  const verb = st.pfad.filter((p) => Math.abs(p[0] - 60) < 6 && p[1] > 220).length
  check('Route benutzt den Sued-Verbinder', verb >= 10, verb + ' Punkte auf x~60/z>220')
} else { check('Route endet am Freizeitpark', false, 'kein Pfad'); check('Route benutzt den Sued-Verbinder', false) }
const anteil = await S('anteil')
check('Route folgt Strassen', anteil > 0.5, 'Anteil=' + (anteil * 100).toFixed(0) + '%')
await S('karte')
await page.waitForTimeout(400)
await page.screenshot({ path: REPO + '/spiele-dev/screenshots/netz-bigmap.png' })
await page.evaluate(() => document.getElementById('bigmapClose').click())
await S('weg')

/* 4: Route in den Norden zum Bauernhof */
check('Route zum Bauernhof moeglich', await S('setz', -40, -196) === true)
st = await S('stand')
if (st.pfad && st.pfad.length) {
  const l2 = st.pfad[st.pfad.length - 1]
  check('Route endet am Bauernhof', Math.hypot(l2[0] + 40, l2[1] + 196) < 2, `Ende (${l2[0].toFixed(0)},${l2[1].toFixed(0)})`)
} else check('Route endet am Bauernhof', false, 'kein Pfad')

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 NETZ BESTANDEN' : '💥 NETZ FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
