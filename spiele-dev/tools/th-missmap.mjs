/* th-missmap.mjs — prueft die GTA-Missions-Marker auf Weltkarte + Radar.
 *
 * Checks:
 *  1. missZiele() liefert fuer eine bekannte Missions-Liste 3 Orte
 *  2. ⚽ zeigt auf den Sportplatz (53,155), 🦆 auf den Enten-See (0,146)
 *  3. done-Missionen verschwinden aus missZiele()
 *  4. ECHTER Maus-Klick auf den ⚽-Marker der grossen Karte rastet ein:
 *     GPS-Ziel = exakt (53,155), Route vorhanden
 *  5. Screenshot der Karte mit gelben Markern + lila Route
 */
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_missmap_probe.html'
mitSonden('traumhaus.html', {
  mm: `function(was,a,b){
    if(was==="setzMiss"){ /* bekannte Liste erzwingen: Tor, Enten, Lieferung (Auto=null -> Zuhause) */
      missHeute={tag:tag,bonus:false,liste:[
        {i:11,e:"⚽",tx:"Schiesse 1 Tor auf dem Sportplatz",ziel:1,basis:0,done:false},
        {i:10,e:"🦆",tx:"Besuche die Enten am See",ziel:1,basis:0,done:false},
        {i:3,e:"📦",tx:"Erledige 2 Blitz-Lieferungen",ziel:2,basis:0,done:false}]};
      return true;}
    if(was==="done"){missHeute.liste[a].done=true;return true;}
    if(was==="ziele")return missZiele();
    if(was==="trafo")return _bigTrafo;
    if(was==="karte"){bigMapOpen();return true;}
    if(was==="gps")return {aktiv:GPS.aktiv,x:GPS.x,z:GPS.z,n:GPS.pfad?GPS.pfad.length:0};
    if(was==="tp"){var me=sims[meinSi()];me.x=a;me.z=b;return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const S = (...a) => page.evaluate((args) => window.__th.mm(...args), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

await S('setzMiss')
await S('tp', 26, 67) // Marktplatz — freier Startpunkt fuer die Route
let z = await S('ziele')
check('3 Missions-Orte', z.length === 3, JSON.stringify(z.map((m) => [m.e, m.x, m.z])))
const tor = z.find((m) => m.e === '⚽'), ente = z.find((m) => m.e === '🦆'), post = z.find((m) => m.e === '📦')
check('⚽ am Sportplatz', tor && tor.x === 53 && tor.z === 155)
check('🦆 am Enten-See', ente && ente.x === 0 && ente.z === 146)
check('📦 ohne Auto -> Zuhause', post && Math.abs(post.x) <= 7 && post.z === 0, post && `(${post.x},${post.z})`)
await S('done', 1)
z = await S('ziele')
check('done-Mission verschwindet', z.length === 2 && !z.some((m) => m.e === '🦆'))

/* Echter Klick auf den ⚽-Marker: Karte oeffnen, Weltkoordinate -> Canvas-Pixel ->
   CSS-Pixel (Canvas ist per max-width skaliert!), dann page.mouse.click. */
await S('karte')
await page.waitForTimeout(400)
const t = await S('trafo')
const box = await page.evaluate(() => {
  const r = document.getElementById('bigmap').getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height, cw: document.getElementById('bigmap').width, ch: document.getElementById('bigmap').height }
})
const px = (t.ox + (53 - t.X0) * t.sc) * box.w / box.cw + box.x
const py = (t.oy + (155 - t.Z0) * t.sc) * box.h / box.ch + box.y
await page.mouse.click(px + 3, py - 3) // absichtlich 3px daneben — muss trotzdem einrasten
await page.waitForTimeout(600)
const g = await S('gps')
check('Klick rastet auf Mission ein', g.aktiv && g.x === 53 && g.z === 155, JSON.stringify(g))
check('Route berechnet', g.n > 2, 'Punkte=' + g.n)
await page.waitForTimeout(300)
await page.screenshot({ path: REPO + '/spiele-dev/screenshots/missmap-bigmap.png' })

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 MISSMAP BESTANDEN' : '💥 MISSMAP FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
