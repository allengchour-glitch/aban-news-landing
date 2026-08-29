/* th-lib.mjs — gemeinsame Basis der Traumhaus-Werkzeuge.
 *
 * WARUM: In jeder Session wurde dieselbe Prozedur von Hand neu geschrieben —
 * Kopie der HTML anlegen, eine Sonde in window.__th hineintexten, Server starten,
 * Playwright hochfahren, auf die asynchron ladenden GLB-Dateien warten. Das kostete
 * jedes Mal mehrere Anlaeufe und war die haeufigste Fehlerquelle (zu frueh gemessen,
 * Server nicht da, Skript ausserhalb des Repos, Zombie-Browser).
 * Hier steht es EINMAL und richtig.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/* Der Pfad laesst sich per TH_REPO ueberschreiben — mehrere Sessions arbeiten in
   eigenen git-worktrees, und ohne das misst das Werkzeug die Datei der Nachbarsession. */
export const REPO = process.env.TH_REPO || '/home/user/aban-news-landing'
export const PORT = 8899
export const CHROMIUM = '/opt/pw-browsers/chromium'

/* Der Server MUSS aus dem Repo laufen — Playwright-Skripte ebenso, sonst findet
   node das playwright-Paket nicht (haeufigster Startfehler). */
export function serverStarten() {
  try {
    execSync(`curl -s -o /dev/null -m 2 -w '%{http_code}' http://127.0.0.1:${PORT}/`, { encoding: 'utf8' })
    const code = execSync(`curl -s -o /dev/null -m 2 -w '%{http_code}' http://127.0.0.1:${PORT}/traumhaus.html`, { encoding: 'utf8' }).trim()
    if (code === '200') return 'lief schon'
  } catch (e) { /* nicht erreichbar -> starten */ }
  spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: REPO, detached: true, stdio: 'ignore' }).unref()
  execSync('sleep 1.5')
  return 'gestartet'
}

/* Sonden in window.__th einhaengen. `sonden` ist ein Objekt {name: "function(){...}"}
   als QUELLTEXT — der Code laeuft im IIFE-Scope des Spiels und sieht damit scene,
   renderer, WORLD_SOLIDS, wegVonStrasse, korridorKonflikt und alles andere. */
export function mitSonden(quelldatei, sonden, zieldatei) {
  const src = readFileSync(join(REPO, quelldatei), 'utf8')
  const anker = '  bahnProfil:function(typ){'
  if (!src.includes(anker)) throw new Error('Anker "bahnProfil" fehlt — window.__th umgebaut?')
  const block = Object.entries(sonden).map(([n, f]) => `  ${n}:${f},`).join('\n') + '\n' + anker
  writeFileSync(join(REPO, zieldatei), src.replace(anker, block))
  return zieldatei
}

/* Seite laden und warten, bis wirklich alles da ist.
   ⚠️ Die letzten GLB-Dateien treffen erst nach ~45 s ein. Wer bei 30 s misst,
   bekommt andere Zahlen als bei 60 s — das hat schon zu falschen Befunden gefuehrt
   ("16 Objekte auf der Strasse" bei 557 statt 640 geladenen Modellen). */
export async function spielOeffnen(datei, opt = {}) {
  /* ⚠️ `screen` MUSS mitgegeben werden koennen. Das Spiel entscheidet ueber `_mobil`
     per `Math.min(screen.width, screen.height) < 820`, und Playwright setzt `screen`
     sonst auf das FENSTER — mit dem 1100x620-Standard ist 620 < 820, also lief jede
     Messung ungewollt im Handy-Modus (Schatten aus, Pixel-Deckel 1,35). Dieselbe Falle
     hatte th-koop.mjs schon einmal; sie gehoert hierher, nicht in jedes Werkzeug. */
  const { warten = 55000, starten = true, viewport = { width: 1100, height: 620 },
          screen = null } = opt
  serverStarten()
  const browser = await chromium.launch({ executablePath: CHROMIUM })
  const page = await browser.newPage(screen ? { viewport, screen } : { viewport })
  const jsFehler = [], fehlend = []
  page.on('pageerror', (e) => jsFehler.push(String(e).slice(0, 200)))
  page.on('response', (r) => { if (r.status() === 404) fehlend.push(r.url().split('/').pop()) })
  await page.goto(`http://127.0.0.1:${PORT}/${datei}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2500)
  if (starten) {
    await page.evaluate(() => { const b = document.getElementById('soloBtn'); if (b) b.click() })
    await page.waitForTimeout(600)
    /* Frisches Profil hat keinen Save -> Modus-Waehler erscheint: Klassisch tippen. */
    await page.evaluate(() => { const b = document.querySelector('button[data-m="klassisch"]'); if (b) b.click() })
    await page.waitForTimeout(1900)
    await page.evaluate(() => { const b = document.getElementById('introOk'); if (b) b.click() })
  }
  await page.waitForTimeout(warten)
  return { browser, page, jsFehler, fehlend: [...new Set(fehlend)] }
}

/* Warten, bis die WELT FERTIG GEBAUT IST — nicht, bis eine Frist abgelaufen ist.
 *
 * ⚠️ WOZU. `spielOeffnen` wartet eine feste Zeit, und die Werkzeuge geben dafuer gern
 * 26…30 s an. GEMESSEN (Fingerabdruck aller festen `_gebaeude`, alle 4 s ueber 300 s):
 * die Zahl der Bauwerke steht frueh, aber es gibt GENAU EINE spaete Aenderung — bei
 * 116 s ruecken Objekte noch einmal. Wer vorher misst, protokolliert einen Zustand,
 * den die Welt gleich wieder verlaesst: derselbe Ahorn stand bei 28 s auf
 * (-10,4|107,6) und danach auf (-12|102), und das Bahnsteigdach daneben war ebenfalls
 * gewandert.
 *
 * Und das ist kein Zufallswert: der Schlusslauf haengt im Spiel an der LETZTEN
 * GLB-Ladung, nicht an einer Uhr (`_ladeFertigEins` -> 2,5 s -> freiRaeumen/entwirren
 * -> 4 s -> _spaetEinfrieren). Auf dem Software-Renderer dieses Containers faellt das
 * eben auf ~116 s; auf einem schnellen Geraet frueher. Darum wartet dieses Werkzeug
 * auf dasselbe SIGNAL wie das Spiel — `window._ladeOffen === 0` — und danach auf Ruhe.
 * Das ist Runbook-Regel 4, eine Ebene hoeher: nicht auf eine Frist warten, sondern auf
 * das Ereignis.
 *
 * ⚠️ ZWEIMAL SELBST WIDERLEGT, BEIDES HIER FESTGEHALTEN:
 *   1. Der erste Fingerabdruck nahm ALLE `_gebaeude` und meldete nach 216 s "nicht
 *      ruhig" — Zug, Bus, Heli, Ballon und Tiere stehen dort mit drin und stehen nie
 *      still. Ohne die `_bewegt`/`nieAusblenden`-Ausnahme liefe jede Messung ins
 *      Zeitlimit.
 *   2. Der zweite meldete "ruhig nach 28 s" — drei gleiche Proben im 4-s-Takt liegen
 *      bequem in der langen Stille VOR dem Schlusslauf. Ein Ruhefenster, das kuerzer
 *      ist als die Pause zwischen zwei Umbauten, misst die Pause.
 *
 * KOSTEN, offen gesagt: ein Lauf mit dieser Wartezeit dauert rund 3 statt 2 Minuten.
 * Darum benutzt sie bisher NUR `th-baeume`, wo Positionen der Messwert selbst sind.
 * Die uebrigen Werkzeuge messen weiter bei 26…55 s; wo sie Positionen melden, koennen
 * das Zwischenstaende sein. Das ist eine bekannte Grenze, keine behobene Sache.
 *
 * Rueckgabe: {sekunden, seite, proben, objekte, kollider, ruhig, ladeOffen}.
 * `kollider:null` heisst: das Werkzeug hat keine `ruhe`-Sonde angemeldet, die
 * Kollider-Zahl ist also NICHT ueberwacht — siehe die Warnung im Rumpf. `ruhig:false` heisst, die
 * Welt kam bis `max` nicht zur Ruhe — das ist ein Befund, kein Grund weiterzumessen.
 */
export async function warteAufRuhe(page, opt = {}) {
  const { stabil = 3, takt = 15000, minSekunden = 150, max = 260000 } = opt
  const t0 = Date.now()
  let gleich = 0, vorher = null, proben = 0, letzte = { n: 0, offen: -1 }
  for (;;) {
    /* ⚠️ WORLD_SOLIDS LIEGT IN DER IIFE und ist von aussen nicht sichtbar. Genau die
       Zahl aber schwankt: zwei Laeufe auf DERSELBEN, eingeschwungenen Welt meldeten
       186 und 192 Kollider — und damit 19 bzw. 20 Funde. Wer nur Positionen abtastet,
       nennt eine Welt ruhig, in der `autoKollider`/`kolliderNachziehen` noch arbeiten.
       Werkzeuge, die eine Sonde `ruhe` anmelden, liefern die Zahl darum selbst mit;
       ohne sie bleibt es beim Positions-Fingerabdruck (und der Aufrufer weiss aus
       `kollider:null`, dass dieser Teil ungeprueft ist). */
    const f = await page.evaluate(() => {
      if (window.__th && typeof window.__th.ruhe === 'function') return window.__th.ruhe()
      return null
    }) || await page.evaluate(() => {
      /* ⚠️ WAS SICH BEWEGEN SOLL, GEHOERT NICHT IN DEN FINGERABDRUCK — sonst wird
         nie Ruhe gemeldet. Dieselbe Markierung wie in th-echt. */
      const g = window._gebaeude || []
      let s = 0, n = 0
      for (let i = 0; i < g.length; i++) {
        const u = g[i].userData || {}
        if (u._bewegt || g[i]._bewegt || u.nieAusblenden) continue
        n++
        s = (s * 31 + Math.round(g[i].position.x * 100)) | 0
        s = (s * 31 + Math.round(g[i].position.z * 100)) | 0
      }
      return { n, h: s, kollider: null,
               offen: window._ladeOffen === undefined ? -1 : window._ladeOffen,
               seite: performance.now() / 1000 }
    })
    proben++
    letzte = f
    /* ⚠️ DRITTE SELBST-WIDERLEGUNG: `_ladeOffen === 0` ist NICHT "alles gebaut".
       Gemessen: der Zaehler steht schon bei 28 s auf 0, der letzte Umbau kam bei
       116 s. `bau()` zaehlt nur die Ladungen, die GERADE laufen — die Welt baut sich
       aber in Stufen ueber Minuten auf (setTimeout-Ketten), und zwischen zwei Stufen
       ist der Zaehler sauber 0. Er taugt als NOTWENDIGE, nicht als hinreichende
       Bedingung. Darum zusaetzlich `minSekunden`: 150 s Seitenzeit, gemessen gegen
       den letzten beobachteten Wechsel bei 116 s (34 s Reserve). Eine feste Zahl —
       aber eine gemessene, und sie steht neben der Ruhepruefung, nicht an ihrer
       Stelle. Wer sie senkt, misst wieder die Pause statt das Ende. */
    if (f.offen > 0 || f.seite < minSekunden) gleich = 0
    else if (vorher && vorher.n === f.n && vorher.h === f.h && vorher.kollider === f.kollider) gleich++
    else gleich = 0
    vorher = f
    if (gleich >= stabil) return { sekunden: Math.round((Date.now() - t0) / 1000), seite: Math.round(f.seite), proben, objekte: f.n, kollider: f.kollider, ladeOffen: f.offen, ruhig: true }
    if (Date.now() - t0 > max) return { sekunden: Math.round((Date.now() - t0) / 1000), seite: Math.round(letzte.seite), proben, objekte: letzte.n, kollider: letzte.kollider, ladeOffen: letzte.offen, ruhig: false }
    await page.waitForTimeout(takt)
  }
}

export function aufraeumen(...dateien) {
  for (const d of dateien) { try { if (existsSync(join(REPO, d))) unlinkSync(join(REPO, d)) } catch (e) {} }
}
