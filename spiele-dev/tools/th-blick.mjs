#!/usr/bin/env node
/* th-blick.mjs — Screenshot aus dem laufenden Spiel.
 *
 *   /opt/node22/bin/node spiele-dev/tools/th-blick.mjs 78 58 40 0.9 [datei.png]
 *                                                       x  z  r  neigung
 *
 * r = Kameraabstand, neigung 0.3 flach … 1.4 fast senkrecht von oben.
 * ⚠️ Bei kleinem r und flacher Neigung landet die Kamera INNERHALB von Gebaeuden
 * und man fotografiert eine Wand — das ist mehrfach passiert. Im Zweifel r >= 40
 * und neigung >= 0.8 nehmen, dann sieht man den Ort sicher.
 *
 * ⚠️ DIE FIGUR KOMMT MIT (seit 2026-09-08). Die Sichtbarkeitsstufe `lodTakt` haengt
 * am SPIELER, nicht an der Kamera. Wer den Seepark bei (53|155) fotografiert,
 * waehrend die Figur noch am Startpunkt steht, bekommt eine leergeraeumte Wiese —
 * und haelt sie fuer den Zustand der Welt. Genau diese Falle hat in Runde 76 vier
 * Bildlaeufe gekostet (siehe RUNBOOK-TRAUMHAUS, "Drei Abschalter"). Darum setzt
 * dieses Werkzeug die Figur an den fotografierten Ort. Wer das ausdruecklich NICHT
 * will, setzt die Umgebungsvariable TH_FIGUR=nein.
 */
import { spielOeffnen, aufraeumen, REPO, mitSonden } from './th-lib.mjs'
import { existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const [x, z, r, n, out] = process.argv.slice(2)
if (x === undefined) { console.log('Aufruf: th-blick.mjs <x> <z> [radius=45] [neigung=0.9] [ziel.png]'); process.exit(1) }
const ziel = out || '/tmp/th-blick.png'
const mitFigur = process.env.TH_FIGUR !== 'nein'
const tmp = mitFigur
  ? mitSonden('traumhaus.html',
      { setzSpieler: 'function(x,z){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;return [s.x,s.z];}' },
      '_blick_tmp.html')
  : '_blick_tmp.html'
if (!mitFigur) copyFileSync(join(REPO, 'traumhaus.html'), join(REPO, tmp))

const { browser, page, jsFehler } = await spielOeffnen(tmp, { warten: 34000 })
if (mitFigur) await page.evaluate((v) => window.__th.setzSpieler(v[0], v[1]), [+x, +z])
await page.evaluate((v) => window.__CAM(v[0], v[1], v[2], v[3]), [+x, +z, +(r || 45), +(n || 0.9)])
await page.waitForTimeout(mitFigur ? 5000 : 3000)
await page.screenshot({ path: ziel, timeout: 90000 })
await browser.close()
aufraeumen(tmp)
console.log(`${ziel}  (Kamera ${x}/${z}, r=${r || 45}, Neigung=${n || 0.9}` +
  `${mitFigur ? ', Figur mitgenommen' : ', OHNE Figur — Sichtbarkeitsstufe kann Dinge ausblenden'})` +
  ` · JS-Fehler: ${jsFehler.length}`)
