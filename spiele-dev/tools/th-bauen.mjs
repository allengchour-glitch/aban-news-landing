/* th-bauen.mjs — spielt die Bau-Werkzeuge echt durch (Runde 89).
 *
 * WARUM: Wand ziehen, Zimmer, Rueckgaengig, Pipette und Abriss laufen ueber Maus-
 * Gesten und bewegen Geld. Ein Fehler dort kostet Spielgeld oder erzeugt welches —
 * und ist im Bild nicht zu sehen. Hier wird jede Geste mit echten Mausereignissen
 * gefahren und danach Stand UND Kasse nachgerechnet.
 *
 * Aufruf:  /opt/node22/bin/node spiele-dev/tools/th-bauen.mjs [--bilder]
 * Exit 1, sobald eine Pruefung scheitert.
 *
 * ⚠️ Gegenprobe eingebaut: vor den Pruefungen wird gemessen, ob eine Mausgeste
 * ueberhaupt im Spiel ankommt (ein Einzeltipp muss genau eine Wand setzen). Kommt
 * sie nicht an, bricht das Werkzeug ab, statt 0 = 0 als „bestanden" zu melden.
 */
import { spielOeffnen, mitSonden, REPO } from './th-lib.mjs'
import { unlinkSync } from 'node:fs'

const BILDER = process.argv.includes('--bilder')
const DATEI = '_th_bauen.html'
mitSonden('traumhaus.html', {
  bau: `function(){var w=0,t=0,f=0;for(var k in walls){w++;if(walls[k].type==="tuer")t++;}for(var k2 in floors)f++;
    var sk=null;for(var k3 in wallMeshes){sk=wallMeshes[k3].scale.y;break;}
    return {walls:w,tueren:t,floors:f,furn:furn.length,geld:geld,undo:BAU_UNDO.length,redo:BAU_REDO.length,
      buildMode:buildMode,curItem:curItem,wandSkala:sk,halb:wandHalb,camTx:camTx,camTz:camTz};}`,
  proj: `function(x,z){var v=new THREE.Vector3(x,0,z).project(camera);return {x:(v.x+1)/2*W,y:(1-v.y)/2*H};}`,
  geldSetzen: `function(v){geld=v;geldLast=v;updHUD();}`,
  waehle: `function(id){return waehleTeil(id);}`,
  geist: `function(){return {da:!!ghost,modell:!!(ghost&&ghost.userData&&ghost.userData.modell),ok:ghostOk};}`,
}, DATEI)

const { browser, page, jsFehler } = await spielOeffnen(DATEI, {
  warten: 20000, viewport: { width: 1280, height: 760 }, screen: { width: 1920, height: 1080 } })
const ergebnisse = []
function pruefe(name, ok, info) { ergebnisse.push({ name, ok, info }); console.log((ok ? '✅' : '❌') + ' ' + name + (info ? '  — ' + info : '')) }
const bau = () => page.evaluate(() => window.__th.bau())
const proj = (x, z) => page.evaluate(([x, z]) => window.__th.proj(x, z), [x, z])
const bild = async (n) => { if (BILDER) await page.screenshot({ path: `${REPO}/spiele-dev/screenshots/bauen-${n}.png`, timeout: 150000 }) }
async function ziehe(x0, z0, x1, z1, schritte = 8) {
  const a = await proj(x0, z0), b = await proj(x1, z1)
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  for (let i = 1; i <= schritte; i++) await page.mouse.move(a.x + (b.x - a.x) * i / schritte, a.y + (b.y - a.y) * i / schritte)
  await page.mouse.up(); await page.waitForTimeout(300)
}
async function tippe(x, z) { const a = await proj(x, z); await page.mouse.click(a.x, a.y); await page.waitForTimeout(300) }
async function taste(k) { await page.keyboard.press(k); await page.waitForTimeout(300) }

await page.evaluate(() => window.__th.geldSetzen(20000))
let s = await bau()
const camStart = Math.hypot(s.camTx, s.camTz)
await page.evaluate(() => document.getElementById('modeBtn').click())
/* Nicht auf eine Frist warten, sondern auf Ruhe: im Software-Renderer laeuft die
   Spielzeit ~20x langsamer (dt-Deckel 0,05 s bei ~2 Bildern/s). Die Kamerafahrt, die am
   Geraet 1,5 s dauert, braucht hier eine Minute. */
for (let i = 0, alt = -1; i < 40; i++) {
  await page.waitForTimeout(2000); s = await bau()
  const d = Math.hypot(s.camTx, s.camTz); if (d < 1 || Math.abs(d - alt) < 0.01) break; alt = d }
pruefe('Baumodus an, Kamera faehrt zum Grundstueck', s.buildMode && (camStart <= 30 || Math.hypot(s.camTx, s.camTz) < 1),
  `Abstand ${camStart.toFixed(1)} → ${Math.hypot(s.camTx, s.camTz).toFixed(1)} m`)
/* feste, steile Sicht aufs Baufenster, damit die Projektion eindeutig ist */
await page.evaluate(() => window.__CAM(0, 0, 60, 1.2))
await page.waitForTimeout(800)
await bild('1-grundstueck')

/* ── Gegenprobe: kommt eine Mausgeste ueberhaupt an? ── */
await page.evaluate(() => window.__th.waehle('wand'))
const w0 = (await bau()).walls
await tippe(-19, -9.1)
const w1 = (await bau()).walls
if (w1 !== w0 + 1) { console.log(`\n⛔ Gegenprobe gescheitert: Einzeltipp setzte ${w1 - w0} Waende statt 1 — Mausgesten kommen nicht an. Abbruch.`); await browser.close(); unlinkSync(`${REPO}/${DATEI}`); process.exit(2) }
pruefe('Gegenprobe: Einzeltipp setzt genau eine Wand', true)
await tippe(-19, -9.1)
pruefe('Dieselbe Wand nochmal kostet nichts', (await bau()).walls === w1)
await taste('Control+z')
pruefe('Rueckgaengig nimmt den Einzeltipp zurueck', (await bau()).walls === w0)

/* ── Wand ziehen ── */
let g0 = (await bau()).geld
await ziehe(-10, -8, 6, -8)
s = await bau()
const neu = s.walls - w0
pruefe('Wand ziehen setzt eine ganze Linie', neu >= 8 && neu <= 9, `${neu} Waende`)
pruefe('Kasse: 25 $ je Wand', g0 - s.geld === neu * 25, `${g0 - s.geld} $`)
pruefe('Ein Zug = ein Rueckgaengig-Eintrag', s.undo === 1, `undo=${s.undo}`)
await bild('2-wandzug')
await taste('Control+z')
s = await bau()
pruefe('Rueckgaengig: Linie weg, Geld voll zurueck', s.walls === w0 && s.geld === g0, `walls ${s.walls}, geld ${s.geld}`)
await taste('Control+y')
s = await bau()
pruefe('Wiederholen: Linie wieder da, Geld wieder weg', s.walls === w0 + neu && s.geld === g0 - neu * 25)

/* ── Zimmer ── */
await page.evaluate(() => window.__th.waehle('zimmer'))
g0 = (await bau()).geld
const vor = await bau()
await ziehe(-9.5, 0.5, -2.5, 6.5)
s = await bau()
const zw = s.walls - vor.walls, zf = s.floors - vor.floors, zt = s.tueren - vor.tueren
pruefe('Zimmer: 16 Kanten, 16 Bodenfelder, 1 Tuer', zw === 16 && zf === 16 && zt === 1, `${zw} Kanten, ${zf} Boden, ${zt} Tuer`)
pruefe('Zimmer: Kasse = 15 Waende + 1 Tuer + 16 Parkett', g0 - s.geld === 15 * 25 + 60 + 16 * 12, `${g0 - s.geld} $`)
pruefe('Waende im Baumodus halb hoch', Math.abs(s.wandSkala - 0.36) < 0.01, `Skala ${s.wandSkala}`)
await bild('3-zimmer-halb')
await page.evaluate(() => document.getElementById('halbBtn').click()); await page.waitForTimeout(400)
s = await bau()
pruefe('Knopf schaltet auf volle Hoehe', Math.abs(s.wandSkala - 1) < 0.01, `Skala ${s.wandSkala}`)
await bild('4-zimmer-voll')
await page.evaluate(() => document.getElementById('halbBtn').click()); await page.waitForTimeout(300)

/* ── Moebel, Pipette, Abriss ── */
await page.evaluate(() => window.__th.waehle('sofa'))
{ const a = await proj(-5, 3); await page.mouse.move(a.x, a.y) }
let gs = null
for (let i = 0; i < 20; i++) { gs = await page.evaluate(() => window.__th.geist()); if (gs.modell) break; await page.waitForTimeout(1500) }
pruefe('Vorschau zeigt das echte Modell', gs && gs.modell && gs.ok, JSON.stringify(gs))
if (BILDER) { await page.evaluate(() => window.__CAM(-5, 3, 13, 0.85)); await page.waitForTimeout(2500)
  await bild('5-vorschau-sofa'); await page.evaluate(() => window.__CAM(0, 0, 60, 1.2)); await page.waitForTimeout(800) }
await page.evaluate(() => window.__th.waehle('sessel'))
g0 = (await bau()).geld; const f0 = (await bau()).furn
await tippe(-7, 3)
s = await bau()
pruefe('Sessel gesetzt', s.furn === f0 + 1 && g0 - s.geld === 280, `furn +${s.furn - f0}, ${g0 - s.geld} $`)
await page.evaluate(() => window.__th.waehle('wand'))
await page.evaluate(() => document.getElementById('pipBtn').click())
await tippe(-7, 3)
s = await bau()
pruefe('Pipette nimmt den Sessel auf', s.curItem === 'sessel', `curItem=${s.curItem}`)
await taste('Control+z')
s = await bau()
pruefe('Rueckgaengig: Sessel weg, 280 $ zurueck', s.furn === f0 && s.geld === g0, `furn ${s.furn}, geld ${s.geld}`)
await taste('Control+y')
g0 = (await bau()).geld
await page.evaluate(() => document.getElementById('delBtn').click())
await tippe(-7, 3)
s = await bau()
pruefe('Abriss gibt die Haelfte', s.furn === f0 && s.geld - g0 === 140, `+${s.geld - g0} $`)
await taste('Control+z')
s = await bau()
pruefe('Rueckgaengig des Abrisses: Sessel zurueck, 140 $ wieder weg', s.furn === f0 + 1 && s.geld === g0, `furn ${s.furn}, geld ${s.geld}`)
await page.evaluate(() => document.getElementById('delBtn').click())

/* ── Kein Geld aus Rueckgaengig: Stapel leert sich beim Verlassen ── */
await page.evaluate(() => document.getElementById('modeBtn').click()); await page.waitForTimeout(500)
s = await bau()
pruefe('Baumodus verlassen leert Rueckgaengig', s.undo === 0 && s.redo === 0)
pruefe('Ausserhalb des Baumodus volle Wandhoehe', Math.abs(s.wandSkala - 1) < 0.01, `Skala ${s.wandSkala}`)
pruefe('Keine JS-Fehler', jsFehler.length === 0, jsFehler.slice(0, 3).join(' | '))

await browser.close()
unlinkSync(`${REPO}/${DATEI}`)
const schlecht = ergebnisse.filter((e) => !e.ok).length
console.log(`\n${ergebnisse.length - schlecht}/${ergebnisse.length} bestanden`)
process.exit(schlecht ? 1 : 0)
