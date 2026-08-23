/* th-koop.mjs — Online-Koop WIRKLICH zu zweit pruefen, nicht nur behaupten.
 *
 *   node spiele-dev/tools/th-koop.mjs [datei.html]
 *
 * WARUM: Koop-Aenderungen wurden bisher am Quelltext beurteilt. Das Spiel bringt
 * aber eine echte zweite Engine mit (`?mp=local`, rohes WebRTC ueber
 * BroadcastChannel) — damit laufen Host und Gast als ZWEI Seiten in EINEM
 * Browser ueber echte DataChannels. Geprueft wird die echte Kette
 * Eingabe -> Netz -> Simulation.
 *
 * ⚠️ WAS SICH HIER NICHT MESSEN LAESST: Antwortzeiten. Beide Seiten laufen im
 * Software-Renderer bei rund EINEM Bild pro Sekunde — jede Millisekundenzahl
 * waere die Bildrate, nicht das Netz. Ein `setInterval(50)` in der Seite lief
 * im Versuch genau ein einziges Mal.
 * WAS SICH MESSEN LAESST: ob die vorhergesagte Figur des Gasts mit der Wahrheit
 * des Hosts zusammenbleibt. Genau das ist das Risiko der Vorhersage.
 *
 * Fallen, die hier schon Zeit gekostet haben (alle behoben, nicht wiederholen):
 *   * `python3 -m http.server` ist EINFAEDIG — die zweite Seite verhungert.
 *   * Zwei volle 3D-Szenen legen den Container lahm -> .glb-Anfragen abweisen.
 *   * Chromium versteckt lokale IPs hinter `.local`-mDNS-Namen -> ICE findet
 *     kein Paar -> `--disable-features=WebRtcHideLocalIpsWithMdns`.
 *   * Der Beitritt ueber Loopback klappt nicht jedes Mal -> bis zu 3 Versuche.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mitSonden, aufraeumen, REPO, CHROMIUM } from './th-lib.mjs'

const datei = process.argv[2] || 'traumhaus.html'
const tmp = '_koop_tmp.html'
const KPORT = 8901

function koopServer() {
  try {
    const c = execSync(`curl -s -o /dev/null -m 2 -w '%{http_code}' http://127.0.0.1:${KPORT}/${datei}`, { encoding: 'utf8' }).trim()
    if (c === '200') return
  } catch (e) {}
  spawn('python3', ['-c',
    `from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler;` +
    `ThreadingHTTPServer(('127.0.0.1',${KPORT}),SimpleHTTPRequestHandler).serve_forever()`],
    { cwd: REPO, detached: true, stdio: 'ignore' }).unref()
  execSync('sleep 1.5')
}

/* ⚠️ DEN GRUND AM ENTSTEHUNGSORT ABGREIFEN. Das Spiel setzt `MPs = null` noch
   im selben Zug, in dem die Sitzung auf "closed" geht — wer danach pollt, sieht
   nur noch ein leeres Feld. Diese Sonde haengt sich EINMAL in onStatus ein und
   haelt die Sitzung in einem Abschluss fest, damit `_why` erhalten bleibt. */
const WATCH = `function(){
  var S=MPs; if(!S) return false;
  if(!S._beobachtet){S._beobachtet=1;
    S.onStatus(function(st){(window._koopSpur=window._koopSpur||[]).push(st+":"+(S._why||"-"));});}
  return true;}`

const SONDE = `function(){
  return {run:!!window._running, mp:!!MPs, host:!!mpHost, si:meinSi(),
          why:(MPs&&MPs._why)||"", st:MPs?MPs.status:"-",
          s:(sims||[]).map(function(q){return {x:+q.x.toFixed(3),z:+q.z.toFixed(3)};})};}`

/* Zweite Stufe: was EINE Seite tut, muss auf der anderen ankommen. Genau das
   ist die Klasse von Fehlern, die man solo nie sieht. */
const ZUSTAND = `function(){
  return {b:Object.keys(floors).length, w:Object.keys(walls).length, f:furn.length,
          geld:geld, uhr:+(+uhrzeit).toFixed(2)};}`
const ZELLE = `function(x,y,d){
  var fb=floors[x+","+y], ww=walls[x+","+y+","+d];
  return {b:(fb===undefined?null:fb), w:(ww?ww.type:null)};}`
const TUN = `function(was,a,b,c){
  if(was==="boden")doPlaceFloor(a,b,0);
  else if(was==="wand")doPlaceWall(a,b,c,"wand");
  else if(was==="geld"){geld+=a;geldSend();}
  else if(was==="bodenI")doPlaceFloor(a,b,c);
  else if(was==="wandT")doPlaceWall(a,b,c===0?0:1,arguments[4]);
  return true;}`

mitSonden(datei, { koop: SONDE, koopWatch: WATCH, zustand: ZUSTAND, tun: TUN, zelle: ZELLE }, tmp)
koopServer()

const browser = await chromium.launch({ executablePath: CHROMIUM,
  /* ⚠️ HINTERGRUND-DROSSELUNG AUS. Nur EINE Seite kann im Vordergrund sein;
     Chromium haelt in der anderen `requestAnimationFrame` an. Damit stand die
     Spielschleife des Hosts still — er hat die Steuerbefehle des Gasts nie
     ausgefuehrt (gemessen: Gast lief 0,20 m vor, Host bewegte sich gar nicht,
     und der Abstand blieb konstant). Ohne diese drei Schalter misst der Test
     die Drosselung statt das Spiel. */
  args: ['--disable-features=WebRtcHideLocalIpsWithMdns',
         '--disable-background-timer-throttling',
         '--disable-backgrounding-occluded-windows',
         '--disable-renderer-backgrounding'] })
const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } })
ctx.setDefaultTimeout(150000)
await ctx.route('**/*.glb', (r) => r.abort())

const url = `http://127.0.0.1:${KPORT}/${tmp}?mp=local`
const fehler = []
const seite = async (tag) => {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => fehler.push(tag + ': ' + String(e).slice(0, 160)))
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await p.waitForTimeout(2500)
  return p
}
const host = await seite('Host')
const gast = await seite('Gast')
for (const p of [host, gast]) await p.waitForSelector('#mpName', { state: 'visible' })

async function raumAuf() {
  await host.fill('#mpName', 'Host')
  await host.click('#hostBtn')
  await host.waitForFunction(() => (document.getElementById('mpCodeShow') || {}).textContent, null, { timeout: 30000 })
  return (await host.textContent('#mpCodeShow')).trim()
}
async function beitreten(code) {
  await gast.fill('#mpName', 'Gast')
  await gast.fill('#mpCode', code)
  await gast.click('#joinBtn')
  for (let i = 0; i < 26; i++) {
    await gast.waitForTimeout(600)
    await host.evaluate(() => 1)          // beide Seiten wach halten
    if (await host.evaluate(() => { const b = document.getElementById('mpStartBtn'); return !!(b && b.offsetParent) })) return true
  }
  return false
}

let code = await raumAuf()
console.log(`Raum-Code: ${code}`)
let verbunden = await beitreten(code)
for (let v = 2; v <= 6 && !verbunden; v++) {
  console.log(`  Beitritt-Versuch ${v - 1} fehlgeschlagen — neu`)
  for (const p of [gast, host]) { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500) }
  code = await raumAuf()
  verbunden = await beitreten(code)
}
if (!verbunden) {
  const st = async (p) => await p.evaluate(() => (document.getElementById('mpStatus') || {}).textContent || '')
  console.log(`\n⚠️ Gast hat sich in 6 Versuchen nicht verbunden.\n   Host: ${await st(host)}\n   Gast: ${await st(gast)}`)
  await browser.close(); aufraeumen(tmp); process.exit(1)
}

await host.click('#mpStartBtn')
/* ⚠️ DEN START MITSCHREIBEN. Genau hier stirbt die Sitzung, wenn sie stirbt:
   waehrend die Welt gebaut wird, steht der Hauptthread. `MPs` wird vom Spiel
   auf null gesetzt, sobald es solo weiterlaeuft — der Grund waere danach weg.
   Also engmaschig abfragen und den letzten belegten Grund merken. */
for (const p of [host, gast]) await p.evaluate(() => { try { return window.__th.koopWatch() } catch (e) { return false } })
const lauf = { Host: '', Gast: '' }, grund = { Host: '', Gast: '' }, spur = []
for (let i = 0; i < 120; i++) {
  await host.waitForTimeout(500)
  for (const [t, p] of [['Host', host], ['Gast', gast]]) {
    const k = await p.evaluate(() => { try { return window.__th.koop() } catch (e) { return null } })
    if (!k) continue
    if (k.why) grund[t] = k.why
    const z = `${k.run ? 'laeuft' : 'menue'}/${k.st}`
    if (z !== lauf[t]) { spur.push(`  ${(i * 0.5).toFixed(1)}s ${t}: ${z}`); lauf[t] = z }
  }
  if (lauf.Host.startsWith('laeuft') && lauf.Gast.startsWith('laeuft') && i > 16) break
}
console.log('Startverlauf:'); spur.forEach((x) => console.log(x))
for (const [t, p] of [['Host', host], ['Gast', gast]]) {
  const sp = await p.evaluate(() => window._koopSpur || [])
  if (sp.length) console.log(`  Statuswechsel ${t}: ${sp.join('  ')}`)
}
const vor = await gast.evaluate(() => window.__th.koop())
console.log(`Gast: verbunden=${vor.mp} host=${vor.host} eigene Figur=sims[${vor.si}]`)
if (!vor.mp) { console.log('  ⚠️ Sitzung beim Start abgerissen — Messung waere wertlos.'); await browser.close(); aufraeumen(tmp); process.exit(1) }

/* ── Vorhersage gegen Wahrheit ─────────────────────────────────────────────── */
const simVon = async (p, i) => await p.evaluate((k) => window.__th.koop().s[k], i)
const startG = await simVon(gast, vor.si)
/* ⚠️ ECHTE Tastatur, kein `dispatchEvent`. Ein selbst gebautes KeyboardEvent
   erreichte den Spiel-Handler nicht — die Figur blieb ueber alle 12 Proben
   exakt stehen (0,00 m). Playwrights Tastatur erzeugt vertrauenswuerdige
   Ereignisse; dafuer muss die Seite im Vordergrund sein. */
await gast.bringToFront()
await gast.keyboard.down('w')
const reihe = []
for (let i = 0; i < 12; i++) {
  await gast.waitForTimeout(400)
  await host.evaluate(() => 1)     // Host wach halten, er simuliert
  const g = await simVon(gast, vor.si), h = await simVon(host, vor.si)
  reihe.push({ ab: +Math.hypot(g.x - h.x, g.z - h.z).toFixed(2),
               weg: +Math.hypot(g.x - startG.x, g.z - startG.z).toFixed(2) })
}
await gast.keyboard.up('w')
await gast.waitForTimeout(2000)
const gE = await simVon(gast, vor.si), hE = await simVon(host, vor.si)
const abst = reihe.map((r) => r.ab)

console.log(`\n── Gast steuert seine eigene Figur (${reihe.length} Proben) ──`)
console.log(`  Gelaufene Strecke        ${reihe[reihe.length - 1].weg} m`)
console.log(`  Abstand Gast ↔ Host      Mittel ${(abst.reduce((a, b) => a + b, 0) / abst.length).toFixed(2)} m · groesster ${Math.max(...abst).toFixed(2)} m`)
console.log(`  Nach dem Loslassen       ${Math.hypot(gE.x - hE.x, gE.z - hE.z).toFixed(2)} m   (soll gegen 0 gehen)`)
console.log(`  Verlauf: ${abst.join(' ')}`)
console.log(`\n  JS-Fehler: ${fehler.length}${fehler.length ? '\n   ' + fehler.slice(0, 4).join('\n   ') : ''}`)

/* ── Abgleich: kommt an, was die andere Seite tut? ───────────────────────── */
const z = async (p) => await p.evaluate(() => window.__th.zustand())
const tun = async (p, ...a) => await p.evaluate((x) => window.__th.tun.apply(null, x), a)
const pruef = []
async function probe(titel, wer, aktion, feld, erwartet) {
  const vorher = await z(wer === gast ? host : gast)
  await aktion()
  let jetzt = vorher, ok = false
  for (let i = 0; i < 20 && !ok; i++) {
    await gast.waitForTimeout(400); await host.evaluate(() => 1)
    jetzt = await z(wer === gast ? host : gast)
    ok = erwartet(vorher[feld], jetzt[feld])
  }
  pruef.push({ titel, ok, vorher: vorher[feld], jetzt: jetzt[feld] })
}
await probe('Gast baut Boden -> Host', gast, () => tun(gast, 'boden', 5, 5), 'b', (v, n) => n > v)
await probe('Gast baut Wand  -> Host', gast, () => tun(gast, 'wand', 5, 5, 0), 'w', (v, n) => n > v)
await probe('Host baut Boden -> Gast', host, () => tun(host, 'boden', 7, 7), 'b', (v, n) => n > v)
await probe('Host +500 Geld  -> Gast', host, () => tun(host, 'geld', 500), 'geld', (v, n) => n >= v + 500)
await probe('Host-Uhr        -> Gast', host, async () => {}, 'uhr', (v, n) => n !== v)

/* ── Streitfall: BEIDE greifen im selben Moment dieselbe Zelle an ──────────
   Hier leben die echten Koop-Fehler. Enden die Seiten mit verschiedenen
   Werten, sehen die Spieler dauerhaft verschiedene Haeuser — und nichts
   korrigiert das je wieder. */
const zelle = async (p, x, y, d) => await p.evaluate((a) => window.__th.zelle(a[0], a[1], a[2]), [x, y, d])
await Promise.all([
  host.evaluate(() => window.__th.tun('bodenI', 9, 9, 0)),
  gast.evaluate(() => window.__th.tun('bodenI', 9, 9, 2))
])
await Promise.all([
  host.evaluate(() => window.__th.tun('wandT', 9, 9, 0, 'wand')),
  gast.evaluate(() => window.__th.tun('wandT', 9, 9, 0, 'fenster'))
])
for (let i = 0; i < 12; i++) { await gast.waitForTimeout(400); await host.evaluate(() => 1) }
const zh = await zelle(host, 9, 9, 0), zg = await zelle(gast, 9, 9, 0)
pruef.push({ titel: 'Streit Boden (9|9)', ok: zh.b === zg.b, vorher: 'Host ' + zh.b, jetzt: 'Gast ' + zg.b })
pruef.push({ titel: 'Streit Wand (9|9)', ok: zh.w === zg.w, vorher: 'Host ' + zh.w, jetzt: 'Gast ' + zg.w })

console.log(`\n── Abgleich Host <-> Gast ──`)
pruef.forEach((r) => console.log(`  ${r.ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${r.titel.padEnd(26)} ${r.vorher} -> ${r.jetzt}`))
const schlecht = pruef.filter((r) => !r.ok).length
console.log(`\n  ${schlecht ? '\x1b[31m' + schlecht + ' von ' + pruef.length + ' kommen NICHT an\x1b[0m' : '\x1b[32malle ' + pruef.length + ' kommen an\x1b[0m'}`)

await browser.close()
aufraeumen(tmp)
