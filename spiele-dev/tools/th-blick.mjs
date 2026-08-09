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
 */
import { spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'
import { existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const [x, z, r, n, out] = process.argv.slice(2)
if (x === undefined) { console.log('Aufruf: th-blick.mjs <x> <z> [radius=45] [neigung=0.9] [ziel.png]'); process.exit(1) }
const ziel = out || '/tmp/th-blick.png'
const tmp = '_blick_tmp.html'
copyFileSync(join(REPO, 'traumhaus.html'), join(REPO, tmp))

const { browser, page, jsFehler } = await spielOeffnen(tmp, { warten: 34000 })
await page.evaluate((v) => window.__CAM(v[0], v[1], v[2], v[3]), [+x, +z, +(r || 45), +(n || 0.9)])
await page.waitForTimeout(3000)
await page.screenshot({ path: ziel, timeout: 90000 })
await browser.close()
aufraeumen(tmp)
console.log(`${ziel}  (Kamera ${x}/${z}, r=${r || 45}, Neigung=${n || 0.9}) · JS-Fehler: ${jsFehler.length}`)
