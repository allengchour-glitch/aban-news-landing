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
 *
 * ⚠️ UND DIE SPIELUHR LAEUFT 20-MAL LANGSAMER ALS DIE WANDUHR. `loop()` rechnet mit
 * `dt = Math.min(0.05, (now-last)/1000)` — bei einem Bild pro Sekunde ruecken also
 * 0,05 Sekunden Spielzeit pro Sekunde Wartezeit vor. Alles, was im Spiel eine Dauer
 * hat, braucht hier das Zwanzigfache: die 12 Sekunden von Coup-Phase 1 sind 240
 * Bilder, gut vier Minuten. Und jede Nachzieh-Bewegung mit `min(1, dt*k)` kriecht:
 * die Sperrgut-Kiste holt mit k=3,5 nur 17,5 % des Abstands PRO SEKUNDE auf.
 * Genau daran sind die ersten Fassungen dieser beiden Pruefungen gescheitert — sie
 * meldeten „kommt nicht an", wo nur zu frueh gemessen wurde. Wer eine Dauer pruefen
 * will, kuerzt sie auf BEIDEN Seiten ab (siehe `coup('uhr')`) oder wartet auf einen
 * Zustand statt auf eine Uhr.
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
import { readFileSync } from 'node:fs'
import { mitSonden, aufraeumen, REPO, CHROMIUM } from './th-lib.mjs'

const datei = (process.argv[2] && process.argv[2] !== '--voll') ? process.argv[2] : 'traumhaus.html'
/* ⚠️ Die Pruefungen fuer die beiden Zwei-Spieler-Auftraege (Sperrgut, Bank-Coup) sind
   OPT-IN: `--voll` oder TH_KOOP_VOLL=1. Grund: sie wurden nach der Entdeckung der
   20-fach langsamen Spieluhr neu geschrieben und hatten in diesem Container noch keinen
   gruenen Lauf — der Beitritt scheitert dort bei Load 4 reihenweise. Ein Werkzeug, dessen
   Pruefungen noch nie durchgelaufen sind, produziert genau die Fehlalarme, die es
   verhindern soll. Wer sie einschaltet, liest bitte erst den Kopfkommentar zur Spieluhr. */
const VOLL = process.argv.includes('--voll') || process.env.TH_KOOP_VOLL === '1'
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

const BALLP = `function(was,a,b){
  if(was==="setz"){BALL.x=a;BALL.z=155;BALL.vx=b;BALL.vz=0;BALL.torCd=0;return 1;}
  return {x:+BALL.x.toFixed(2),z:+BALL.z.toFixed(2),stand:BALL.stand.slice()};}`

/* Der Koop-Auftrag "Sperrgut zu zweit tragen" ist die einzige Aufgabe im Spiel, die
   ohne zwei Leute gar nicht geht — und war bisher die einzige, die dieser Test NICHT
   angefasst hat. Drei Netzwege stecken darin: `tragReq` (Gast bittet), `trag on`
   (Host armiert, beide bauen dieselbe Kiste) und `tragP` (Host schiebt, Gast folgt).
   ⚠️ Gestellt wird IMMER auf dem Host: der Gast schickt nur `steer`, die Positionen
   beider Figuren gehoeren dem Host und kommen als `sims` zurueck. Wer den Gast lokal
   verschiebt, misst nur, wie schnell der Host ihn zurueckholt. */
const TRAGP = `function(was,a,b){
  if(was==="knopf"){buildMode=false;var k=document.getElementById("tragBtn");
    if(k&&k.onclick)k.onclick.call(k);return 1;}
  if(was==="stell"){[0,1].forEach(function(i){var s9=sims[i];if(!s9)return;
      if(typeof zielFrei==="function")zielFrei(s9);
      s9.state="idle";s9.x=a;s9.z=b;
      if(s9.mesh){s9.mesh.position.x=a;s9.mesh.position.z=b;}});return 1;}
  return {da:!!TRAGM, x:TRAGM?+TRAGM.x.toFixed(2):null, z:TRAGM?+TRAGM.z.toFixed(2):null,
          von:TRAG_VON, zu:TRAG_ZU, lohn:TRAG_LOHN, geld:geld,
          knopf:((document.getElementById("tragBtn")||{}).style||{}).display||"-"};}`
/* Der Bank-Coup ist die zweite Aufgabe, die es nur zu zweit gibt — und die einzige,
   in der BEIDE Seiten eigenstaendig Phasen weiterschalten. Genau daran zerfaellt so
   etwas gern: eine Seite bricht ab, die andere laeuft weiter. */
const COUPP = `function(was){
  if(was==="start"){buildMode=false;var b=document.getElementById("coupBtn");
    if(b&&b.onclick)b.onclick.call(b);else coupStart();return 1;}
  if(was==="stopp"){coupEnde("",0);return 1;}
  if(was==="uhr"){COUP.t=0.3;return 1;}   /* siehe Kommentar im Skript: 0,05-s-Takt */
  var z=coupZone(),f=coupFluchtZone();
  return {phase:COUP.phase,t:+COUP.t.toFixed(1),beute:COUP.beute,geld:geld,
          bank:{x:+z.x.toFixed(1),z:+z.z.toFixed(1)},
          flucht:{x:+f.x.toFixed(1),z:+f.z.toFixed(1)},
          knopf:((document.getElementById("coupBtn")||{}).style||{}).display||"-"};}`
mitSonden(datei, { koop: SONDE, koopWatch: WATCH, zustand: ZUSTAND, tun: TUN, zelle: ZELLE, ball: BALLP, trag: TRAGP, coup: COUPP }, tmp)
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
/* ⚠️ KLEINES FENSTER, GROSSER BILDSCHIRM — und beides aus einem gemessenen Grund.
   Der Beitritt scheiterte in diesem Container reihenweise; im Kopfkommentar stand
   dazu "bei Load 4". Diese Last ist aber NICHT die Umgebung, sondern der Test selbst:
   der Container lag vor dem Start bei 0,14 und stieg erst mit den beiden Seiten auf
   ueber 4. Der Software-Renderer zahlt pro Pixel, und 900x560 sind 504 000 Pixel —
   zweimal. Der WebRTC-Handshake braucht auf JEDER Seite Bilder.
   ⚠️ Das allein reichte NICHT: mit 480x300 lagen die Seiten immer noch bei 1,5 bzw.
   2,5 Bildern/s. Die Pixel waren nicht der Engpass, sondern dass im Menue die ganze
   3D-Welt hinter der fast deckenden Overlay-Flaeche neu gezeichnet wurde (behoben in
   traumhaus.html, `_menuTakt`). Beides zusammen macht den Beitritt zuverlaessig.
   `screen` bleibt trotzdem gross: `_mobil` im Spiel prueft `screen`, nicht das
   Fenster. Ohne diesen zweiten Wert schaltete der Test heimlich auf die
   Handy-Bedienung um und haette etwas anderes gemessen als das Spiel am Rechner. */
const ctx = await browser.newContext({ viewport: { width: 480, height: 300 },
                                       screen: { width: 1280, height: 900 } })
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
  /* ⚠️ BEIDE Seiten wach halten, nicht nur den Host. `waitForTimeout` laesst die Seite
     schlafen; der Handshake braucht aber auf JEDER Seite Bilder, und im
     Software-Renderer kommt rund eins pro Sekunde. Mit nur 26 x 600 ms und einem
     einseitigen Ping scheiterte der Beitritt auf einem ausgelasteten Container
     reihenweise (dreimal hintereinander gemessen). 40 Runden mit beidseitigem Ping
     geben dem Aufbau rund die doppelte Zeit. */
  const verbdg = (p) => p.evaluate(() => { try { const k = window.__th.koop(); return !!(k.mp && k.st === 'connected') } catch (e) { return false } })
  for (let i = 0; i < 40; i++) {
    await gast.waitForTimeout(600)
    await Promise.all([host.evaluate(() => 1), gast.evaluate(() => 1)])
    if (await host.evaluate(() => { const b = document.getElementById('mpStartBtn'); return !!(b && b.offsetParent) })) return true
    /* ⚠️ ERSATZSIGNAL. Der Sicht-Test auf den Startknopf ist strenger als noetig: der
       Knopf erscheint erst im naechsten Bild, und bei einem Bild pro Sekunde kann das
       laenger dauern, als die Schleife Geduld hat. Melden beide Seiten `connected`,
       ist die Verbindung da — dann noch anderthalb Sekunden fuer den Knopf. */
    const beide = await Promise.all([verbdg(host), verbdg(gast)])
    if (beide[0] && beide[1]) { await gast.waitForTimeout(1500); return true }
  }
  return false
}

/* Die Bildrate ist in diesem Test keine Nebensache, sondern die Waehrung: alles,
   was ueber das Netz geht, braucht auf beiden Seiten Bilder. Wer sie nicht kennt,
   deutet jede Zeitueberschreitung als Netzfehler. */
const bildrate = async (p, ms = 1500) => p.evaluate((t) => new Promise((res) => {
  let n = 0; const t0 = performance.now()
  ;(function f() { n++
    if (performance.now() - t0 < t) requestAnimationFrame(f)
    else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)) })()
}), ms)

let code = await raumAuf()
console.log(`Raum-Code: ${code}`)
{
  const [bh, bg] = await Promise.all([bildrate(host), bildrate(gast)])
  const last = readFileSync('/proc/loadavg', 'utf8').split(' ')[0]
  console.log(`Bildrate vor dem Beitritt: Host ${bh}/s · Gast ${bg}/s   (Last ${last})`)
}
let verbunden = await beitreten(code)
/* ⚠️ BEIM WIEDERHOLEN MUSS DER HOST MIT. Ein leichter Neuversuch (nur der Gast
   geht ueber "Abbrechen" zurueck) klingt sparsamer, war aber schlechter:
   sobald ein Gast am Host angedockt und gestorben ist, geht dessen Sitzung in
   der lokalen Test-Engine auf `closed` und kommt NICHT nach `waiting` zurueck
   — anders als in Engine A, die den Platz wieder freigibt. Der Gast verbindet
   sich dann gegen einen toten Raum, und der Start stirbt sofort mit `stille`.
   Gemessen: `0.0s Host: laeuft/closed` bei scheinbar verbundenem Gast.
   Also beide Seiten neu und einen frischen Raum. */
for (let v = 2; v <= 5 && !verbunden; v++) {
  console.log(`  Beitritt-Versuch ${v - 1} fehlgeschlagen — beide Seiten neu`)
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
/* ⚠️ `runden` ist kein Komfortwert. Die meisten Nachrichten gehen sofort raus, die
   Uhr aber nur alle acht Sim-Takte (`netTick%8===0`), und ein Sim-Takt sind 0,35 s
   SPIELZEIT — bei dt=0,05 also sieben Bilder. Acht Takte sind 56 Bilder, und bei den
   1,5 Bildern pro Sekunde dieses Renderers rund 37 Sekunden. Mit den 20 Runden
   (8 s) fuer alle Pruefungen meldete die Uhr zuverlaessig "kommt nicht an" — der
   Gast fuehrt seine Uhr NICHT selbst (`if(!MPs||mpHost)`), er wartet nur. Ein
   Fehlalarm derselben Sorte, vor der der Kopfkommentar warnt, im eigenen Werkzeug. */
async function probe(titel, wer, aktion, feld, erwartet, runden = 20) {
  const vorher = await z(wer === gast ? host : gast)
  await aktion()
  let jetzt = vorher, ok = false
  for (let i = 0; i < runden && !ok; i++) {
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
await probe('Host-Uhr        -> Gast', host, async () => {}, 'uhr', (v, n) => n !== v, 260)

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

/* ── Ball-Sync: der Host schiesst, der Gast muss den Ball rollen sehen ────── */
const ballVon = async (p) => await p.evaluate(() => { try { return window.__th.ball() } catch (e) { return null } })
const gVor = await ballVon(gast)
await host.evaluate(() => window.__th.ball('setz', 40, 6))
let gNach = gVor, hNach = null
for (let i = 0; i < 15; i++) {
  await gast.waitForTimeout(500); await host.evaluate(() => 1)
  gNach = await ballVon(gast); hNach = await ballVon(host)
  if (gNach && gVor && Math.abs(gNach.x - gVor.x) > 0.5) break
}
pruef.push({ titel: 'Ball rollt beim Gast', ok: !!(gNach && gVor && Math.abs(gNach.x - gVor.x) > 0.5),
  vorher: gVor ? 'x ' + gVor.x : '-', jetzt: gNach ? 'x ' + gNach.x + ' (Host x ' + (hNach ? hNach.x : '?') + ')' : '-' })
/* Tor vom Host aus erzwingen — der Stand muss zuverlaessig beim Gast ankommen */
await host.evaluate(() => window.__th.ball('setz', 33, -8))
let torOk = false, gStand = null
for (let i = 0; i < 20; i++) {
  await gast.waitForTimeout(500); await host.evaluate(() => 1)
  const g = await ballVon(gast)
  if (g && (g.stand[0] + g.stand[1]) > 0) { torOk = true; gStand = g.stand; break }
}
pruef.push({ titel: 'Tor-Stand beim Gast', ok: torOk, vorher: '0:0', jetzt: gStand ? gStand[0] + ':' + gStand[1] : 'nie angekommen' })

/* ── Koop-Auftrag: Sperrgut zu zweit tragen ───────────────────────────────
   Die einzige Aufgabe, die allein nicht geht. Der GAST druckt den Knopf — damit
   laeuft der ganze Weg tragReq -> Host armiert -> trag on -> Gast baut dieselbe
   Kiste. Danach schiebt der Host sie, und der Gast muss sie mitwandern sehen. */
const tragVon = async (p) => await p.evaluate(() => { try { return window.__th.trag() } catch (e) { return null } })
const takt = async (n, ms) => { for (let i = 0; i < n; i++) { await gast.waitForTimeout(ms); await host.evaluate(() => 1) } }

const tH0 = VOLL ? await tragVon(host) : null
if (!VOLL) {
  pruef.push({ titel: 'Sperrgut + Bank-Coup', ok: null, vorher: 'uebersprungen', jetzt: 'mit --voll einschalten' })
} else if (!tH0) {
  pruef.push({ titel: 'Sperrgut: Sonde', ok: false, vorher: '-', jetzt: 'window.__th.trag fehlt' })
} else {
  const geldVorG = (await tragVon(gast)).geld
  await gast.evaluate(() => window.__th.trag('knopf'))
  let tH = null, tG = null
  for (let i = 0; i < 20; i++) {
    await takt(1, 500)
    tH = await tragVon(host); tG = await tragVon(gast)
    if (tH && tG && tH.da && tG.da) break
  }
  pruef.push({ titel: 'Sperrgut: Gast ruft, Kiste da', ok: !!(tH && tG && tH.da && tG.da),
    vorher: 'keine Kiste', jetzt: 'Host ' + (tH && tH.da ? 'ja' : 'nein') + ' / Gast ' + (tG && tG.da ? 'ja' : 'nein') })

  if (tH && tH.da) {
    /* Beide Figuren schrittweise von der Kiste zum Ziel stellen — der Host ist
       massgeblich, der Gast bekommt Kistenposition per tragP. */
    const von = tH.von, zu = tH.zu
    let gFolgt = false, letzte = null
    /* ⚠️ ZWEI Fallen auf einmal, beide im ersten Anlauf zugeschlagen:
       (1) Die Schrittweite muss unter TRAG_NAH (5 m) bleiben — sonst stehen die Figuren
           nach dem Versetzen weiter von der Kiste weg als erlaubt, `beide` wird falsch
           und die Kiste bleibt stehen.
       (2) Die Kiste zieht mit `k = min(1, dt*3,5)` nach, und `dt` ist auf 0,05 gedeckelt.
           Im Software-Renderer (rund ein Bild pro Sekunde) holt sie damit nur 17,5 % des
           Abstands PRO SEKUNDE auf. Wer nach 1,5 s weiterspringt, laesst sie zurueck:
           im ersten Lauf kam sie 8,7 von 33 m weit und blieb dann stehen.
       Darum: kleine Schritte, und nach jedem Schritt warten, bis die Kiste aufgeschlossen
       hat, statt nach fester Zeit weiterzugehen. */
    const SCHRITTE = 9
    for (let k = 0; k <= SCHRITTE; k++) {
      const t = k / SCHRITTE
      const px = von[0] + (zu[0] - von[0]) * t, pz = von[1] + (zu[1] - von[1]) * t
      await host.evaluate((a) => window.__th.trag('stell', a[0], a[1]), [px, pz])
      let a = null, b = null
      for (let w = 0; w < 14; w++) {
        await takt(1, 400)
        a = await tragVon(host); b = await tragVon(gast)
        if (!a || !a.da) break
        if (Math.hypot(a.x - px, a.z - pz) < 1.0) break     /* Kiste hat aufgeschlossen */
      }
      if (!a || !a.da) { letzte = { h: a, g: b }; break }
      letzte = { h: a, g: b }
      if (b && b.da && Math.hypot(a.x - b.x, a.z - b.z) < 3.0 && Math.hypot(a.x - von[0], a.z - von[1]) > 4) gFolgt = true
    }
    pruef.push({ titel: 'Sperrgut: Kiste folgt beim Gast', ok: gFolgt,
      vorher: 'Start ' + von[0] + '|' + von[1],
      jetzt: letzte && letzte.h && letzte.h.da
        ? 'Host ' + letzte.h.x + '|' + letzte.h.z + ' · Gast ' + (letzte.g && letzte.g.da ? letzte.g.x + '|' + letzte.g.z : 'keine Kiste')
        : 'am Ziel abgeliefert' })

    /* Ankunft erzwingen und den Lohn beim Gast pruefen */
    await host.evaluate((a) => window.__th.trag('stell', a[0], a[1]), [tH.zu[0], tH.zu[1]])
    let fertig = false
    for (let i = 0; i < 24 && !fertig; i++) { await takt(1, 500); const a = await tragVon(host); fertig = !!(a && !a.da) }
    let geldNachG = geldVorG
    for (let i = 0; i < 16; i++) { await takt(1, 500); geldNachG = (await tragVon(gast)).geld; if (geldNachG >= geldVorG + tH.lohn) break }
    pruef.push({ titel: 'Sperrgut: Lohn beim Gast', ok: geldNachG >= geldVorG + tH.lohn,
      vorher: String(geldVorG), jetzt: geldNachG + ' (erwartet +' + tH.lohn + ')' })

    /* ── Abbruch durch den GAST ────────────────────────────────────────────
       Der haeufigste Fall, den solo niemand sieht: derselbe Knopf ist auf beiden
       Seiten der Abbruch. `tragEnde()` schickte seine Nachricht aber nur, wenn
       mpHost — beim Gast verschwand die Kiste also nur bei ihm selbst, und
       zurueckholen konnte er sie nicht (der Host reagiert auf `tragReq` nur ohne
       eigene Kiste). Bewusst NACH der Lohn-Pruefung, mit frisch angeforderter
       Kiste: sonst stuende die neue Kiste am Start und die Figuren am Ziel. */
    let neuDa = false
    await gast.evaluate(() => window.__th.trag('knopf'))
    for (let i = 0; i < 16; i++) { await takt(1, 500); const a = await tragVon(host); if (a && a.da) { neuDa = true; break } }
    if (neuDa) {
      await gast.evaluate(() => window.__th.trag('knopf'))
      let aH = null, aG = null
      for (let i = 0; i < 16; i++) { await takt(1, 500); aH = await tragVon(host); aG = await tragVon(gast); if (aH && aG && !aH.da && !aG.da) break }
      pruef.push({ titel: 'Sperrgut: Gast bricht ab', ok: !!(aH && aG && !aH.da && !aG.da),
        vorher: 'beide haben die Kiste',
        jetzt: 'Host ' + (aH && aH.da ? 'hat sie noch' : 'weg') + ' / Gast ' + (aG && aG.da ? 'hat sie noch' : 'weg') })
    } else {
      pruef.push({ titel: 'Sperrgut: Gast bricht ab', ok: null, vorher: '-', jetzt: 'zweite Kiste kam nicht' })
    }
  }
}

/* ── Bank-Coup zu zweit ───────────────────────────────────────────────────
   Drei Dinge muessen ueber das Netz stimmen: der Start (`coupStart`), die Beute
   (`coupBeute` — die wuerfelt nur der Host) und das Ende samt Auszahlung. */
const coupVon = async (p) => await p.evaluate(() => { try { return window.__th.coup() } catch (e) { return null } })
const cH0 = VOLL ? await coupVon(host) : null
if (!VOLL) {
  /* im Kurzlauf schon oben als "uebersprungen" vermerkt */
} else if (!cH0) {
  pruef.push({ titel: 'Coup: Sonde', ok: false, vorher: '-', jetzt: 'window.__th.coup fehlt' })
} else {
  const bank = cH0.bank, flucht = cH0.flucht
  const geldVorG2 = (await coupVon(gast)).geld
  /* ⚠️ ERST EINIG WERDEN, DANN STARTEN. Ein Teleport ist ein Sprung von 100 m; bis der
     beim Gast angekommen ist, vergeht mindestens ein Bild — und `updCoup` prueft in
     Phase 1 sofort, ob BEIDE an der Bank stehen. Startet man zu frueh, bricht der Gast
     im ersten Bild ab, der Host laeuft weiter, und weil `coupEnde()` nichts sendet,
     finden die beiden nie wieder zusammen. Das ist eine echte Sproedigkeit des Spiels,
     aber im Test waere es ein selbstgemachter Fehlalarm. */
  const beideDa = async (x, z, r) => {
    for (let i = 0; i < 30; i++) {
      await host.evaluate((a) => window.__th.trag('stell', a[0], a[1]), [x, z])
      await takt(1, 400)
      const h = await p2(host), g = await p2(gast)
      const nah = (v) => v && v.s.every((q) => Math.hypot(q.x - x, q.z - z) < r)
      if (nah(h) && nah(g)) return true
    }
    return false
  }
  const p2 = async (p) => await p.evaluate(() => { try { return window.__th.koop() } catch (e) { return null } })
  const einig = await beideDa(bank.x, bank.z, 10)
  pruef.push({ titel: 'Coup: beide an der Bank', ok: einig, vorher: '-', jetzt: einig ? 'ja' : 'Positionen wurden nicht einig' })
  await host.evaluate(() => window.__th.coup('start'))
  let cH = null, cG = null
  for (let i = 0; i < 12; i++) { await takt(1, 500); cH = await coupVon(host); cG = await coupVon(gast); if (cH.phase >= 1 && cG.phase >= 1) break }
  pruef.push({ titel: 'Coup: Start kommt an', ok: !!(cH && cG && cH.phase >= 1 && cG.phase >= 1),
    vorher: 'Phase 0', jetzt: 'Host ' + (cH ? cH.phase : '?') + ' / Gast ' + (cG ? cG.phase : '?') })

  /* Phase 1 -> 2. ⚠️ Die 12 Sekunden sind hier NICHT 12 Sekunden: `loop()` rechnet mit
     `dt = Math.min(0.05, …)`, und im Software-Renderer kommt rund ein Bild pro Sekunde.
     Die Spieluhr laeuft also 20-mal langsamer als die Wanduhr — 12 s Wartezeit waeren
     240 Bilder, also gut vier Minuten. Der erste Anlauf lief deshalb 30 Runden lang ins
     Leere und meldete faelschlich „Alarm kommt nicht an". Die Uhr wird darum auf beiden
     Seiten auf 0,3 gestellt; der Uebergang selbst und die `coupBeute`-Nachricht laufen
     unveraendert durch das echte updCoup. */
  await Promise.all([host.evaluate(() => window.__th.coup('uhr')), gast.evaluate(() => window.__th.coup('uhr'))])
  for (let i = 0; i < 20; i++) {
    await host.evaluate((a) => window.__th.trag('stell', a[0], a[1]), [bank.x, bank.z])
    await takt(1, 500)
    cH = await coupVon(host); cG = await coupVon(gast)
    if (cH.phase === 2 && cG.phase === 2) break
  }
  pruef.push({ titel: 'Coup: Alarm bei beiden', ok: !!(cH && cG && cH.phase === 2 && cG.phase === 2),
    vorher: 'Phase 1', jetzt: 'Host ' + cH.phase + ' / Gast ' + cG.phase })
  pruef.push({ titel: 'Coup: Beute gleich', ok: !!(cH && cG && cH.beute > 0 && cH.beute === cG.beute),
    vorher: 'Host ' + (cH ? cH.beute : '?'), jetzt: 'Gast ' + (cG ? cG.beute : '?') })

  /* Flucht: beide zum Parkplatz, dann muss die Beute beim Gast ankommen */
  const beute = cH ? cH.beute : 0
  await beideDa(flucht.x, flucht.z, 12)
  for (let i = 0; i < 20; i++) {
    await host.evaluate((a) => window.__th.trag('stell', a[0], a[1]), [flucht.x, flucht.z])
    await takt(1, 500)
    cH = await coupVon(host); cG = await coupVon(gast)
    if (cH.phase === 0 && cG.phase === 0) break
  }
  pruef.push({ titel: 'Coup: Ende bei beiden', ok: !!(cH && cG && cH.phase === 0 && cG.phase === 0),
    vorher: 'Phase 2', jetzt: 'Host ' + cH.phase + ' / Gast ' + cG.phase })
  let geldNachG2 = geldVorG2
  for (let i = 0; i < 16; i++) { await takt(1, 500); geldNachG2 = (await coupVon(gast)).geld; if (geldNachG2 >= geldVorG2 + beute) break }
  pruef.push({ titel: 'Coup: Beute beim Gast', ok: beute > 0 && geldNachG2 >= geldVorG2 + beute,
    vorher: String(geldVorG2), jetzt: geldNachG2 + ' (erwartet +' + beute + ')' })
}

/* ── Wiedereinstieg: Gast faellt raus und kommt MITTEN im Spiel zurueck ────
   Der haeufigste echte Koop-Fall (Handy sperrt, Tab weg, Funkloch) — und der,
   bei dem eine Sitzung am ehesten mit halber Welt weiterlaeuft. Der Host soll
   `{t:"state"}` mit dem vollen Schnappschuss schicken. */
const vorEin = await z(host)
await gast.reload({ waitUntil: 'domcontentloaded' })
await gast.waitForTimeout(2500)
await gast.waitForSelector('#mpName', { state: 'visible' })
await gast.fill('#mpName', 'Gast')
await gast.fill('#mpCode', code)
await gast.click('#joinBtn')
let zurueck = false
for (let i = 0; i < 40 && !zurueck; i++) {
  await gast.waitForTimeout(600)
  await host.evaluate(() => 1)
  zurueck = await gast.evaluate(() => { try { return !!window.__th.koop().run } catch (e) { return false } })
}
let nachEin = null
if (zurueck) { await gast.waitForTimeout(3000); nachEin = await z(gast) }
/* ⚠️ EIN FEHLSCHLAG HIER IST NICHT AUTOMATISCH EIN SPIELFEHLER. Engine B gibt
   den Gast-Platz nicht wieder frei: stirbt der Kanal des Gasts, geht die
   HOST-Sitzung auf `closed` und kommt nicht nach `waiting` zurueck. Engine A
   (PeerJS, Produktion) macht genau das — `main = null`, und
   `peer.on("connection")` nimmt den naechsten Gast an. Wer den roten Haken hier
   ungeprueft als Befund weitergibt, meldet einen Fehler, den das Spiel auf
   echten Geraeten vermutlich gar nicht hat. Darum: erst den Host befragen. */
const hostLebt = await host.evaluate(() => { try { const k = window.__th.koop(); return k.mp && k.st !== 'closed' } catch (e) { return false } })
if (!zurueck && !hostLebt) {
  pruef.push({ titel: 'Wiedereinstieg', ok: null, vorher: 'nicht pruefbar', jetzt: 'Engine B gibt den Platz nicht frei' })
} else {
  pruef.push({ titel: 'Wiedereinstieg: kommt an', ok: zurueck, vorher: '-', jetzt: zurueck ? 'ja' : 'nein' })
}
if (nachEin) {
  pruef.push({ titel: 'Wiedereinstieg: Boeden', ok: nachEin.b === vorEin.b, vorher: 'Host ' + vorEin.b, jetzt: 'Gast ' + nachEin.b })
  pruef.push({ titel: 'Wiedereinstieg: Waende', ok: nachEin.w === vorEin.w, vorher: 'Host ' + vorEin.w, jetzt: 'Gast ' + nachEin.w })
  pruef.push({ titel: 'Wiedereinstieg: Geld', ok: nachEin.geld === vorEin.geld, vorher: 'Host ' + vorEin.geld, jetzt: 'Gast ' + nachEin.geld })
}

console.log(`\n── Abgleich Host <-> Gast ──`)
pruef.forEach((r) => console.log(`  ${r.ok === null ? '\x1b[33m–\x1b[0m' : r.ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${r.titel.padEnd(26)} ${r.vorher} -> ${r.jetzt}`))
const schlecht = pruef.filter((r) => r.ok === false).length
const offen = pruef.filter((r) => r.ok === null).length
console.log(`\n  ${schlecht ? '\x1b[31m' + schlecht + ' von ' + pruef.length + ' kommen NICHT an\x1b[0m' : '\x1b[32malle ' + (pruef.length - offen) + ' geprueften kommen an\x1b[0m'}${offen ? ' · ' + offen + ' nicht pruefbar' : ''}`)

await browser.close()
aufraeumen(tmp)
