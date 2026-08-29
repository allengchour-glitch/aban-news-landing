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
    if(was==="deckung")return MISS_POOL.map(function(p,i){
      return {i:i,e:p[0],tx:p[1],hatOrt:!!MISS_ORTE[i]};});
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

/* ⚠️ JEDE MISSION BRAUCHT EINEN ORT — oder einen Grund, keinen zu haben. Ohne
   Marker weiss der Spieler nicht, wohin; ohne diese Pruefung faellt eine neu
   eingefuegte Mission ohne Ort niemandem auf. Zwei Ausnahmen sind belegt:
   Emotes gehen ueberall, Strassenmusik auch (nur 17-21 Uhr, das steht seit
   #2417 im Missionstext). Die Lieferungen (3) bekommen ihren Ort dynamisch
   vom geparkten Auto. */
const OHNE_ORT_ERLAUBT = { 7: 'Strassenmusik — ueberall, nur 17-21 Uhr (steht im Text)',
                           8: 'Emotes — ueberall moeglich' }
const deck = await S('deckung')
const ortlos = deck.filter((d) => !d.hatOrt && d.i !== 3 && !OHNE_ORT_ERLAUBT[d.i])
check('Jede Mission hat einen Ort (oder einen belegten Grund)', ortlos.length === 0,
      ortlos.length ? ortlos.map((d) => `${d.i} ${d.e} ${d.tx}`).join(' | ')
                    : `${deck.length} Missionen, ${Object.keys(OHNE_ORT_ERLAUBT).length} bewusst ortlos`)
/* Und umgekehrt: eine Ausnahme, die es nicht mehr braucht, gehoert weg. */
const unnoetig = Object.keys(OHNE_ORT_ERLAUBT).filter((i) => (deck[+i] || {}).hatOrt)
check('Keine ueberfluessige Ausnahme in der Liste', unnoetig.length === 0,
      unnoetig.length ? 'hat jetzt doch einen Ort: ' + unnoetig.join(', ') : '')

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
