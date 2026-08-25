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
  const { warten = 55000, starten = true, viewport = { width: 1100, height: 620 } } = opt
  serverStarten()
  const browser = await chromium.launch({ executablePath: CHROMIUM })
  const page = await browser.newPage({ viewport })
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

export function aufraeumen(...dateien) {
  for (const d of dateien) { try { if (existsSync(join(REPO, d))) unlinkSync(join(REPO, d)) } catch (e) {} }
}
