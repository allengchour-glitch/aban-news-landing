#!/usr/bin/env node
/* th-mass.mjs — Grundflaeche von Modellen bei gegebener Zielhoehe messen.
 *
 *   /opt/node22/bin/node spiele-dev/tools/th-mass.mjs th23_bank:9 th20_parkgarage:11
 *   /opt/node22/bin/node spiele-dev/tools/th-mass.mjs th37_altbau        (Default 8 m)
 *
 * WARUM DAS WICHTIG IST: bau() skaliert ein Modell NUR ueber die Hoehe — Breite und
 * Tiefe ergeben sich daraus. Wer im viertel()-cfg w/d schaetzt, setzt die Reihe zu
 * eng. Real gemessen war th20_parkgarage bei 11 m Hoehe 54.7 x 37 m, im cfg stand
 * 20 x 15; zwei Bauten ueberlappten daraufhin um 10.7 m. IMMER erst messen.
 *
 * Laeuft ueber eine winzige Extraseite statt ueber das Spiel — das volle Spiel
 * braucht ~50 s zum Laden und bricht beim Nachladen weiterer Modelle gern ab.
 */
import { chromium } from 'playwright'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { serverStarten, REPO, PORT, CHROMIUM } from './th-lib.mjs'

const args = process.argv.slice(2)
if (!args.length) {
  console.log('Aufruf: th-mass.mjs <modell>[:hoehe] ...   (Hoehe in Metern, Default 8)')
  process.exit(1)
}
const M = {}
for (const a of args) { const [n, h] = a.split(':'); M[n.replace(/\.glb$/, '')] = h ? +h : 8 }

const seite = '_mass_tmp.html'
writeFileSync(join(REPO, seite), `<!doctype html><body>
<script src="/js/vendor/three.min.js"></script>
<script src="/js/vendor/GLTFLoader.js"></script>
<script>window.__mass=function(M){return Promise.all(Object.entries(M).map(function(e){
  return new Promise(function(res){new THREE.GLTFLoader().load('/models/'+e[0]+'.glb',function(g){
    var b=new THREE.Box3().setFromObject(g.scene),s=new THREE.Vector3();b.getSize(s);
    var k=e[1]/(s.y||1);
    res({m:e[0],h:e[1],b:+(s.x*k).toFixed(1),t:+(s.z*k).toFixed(1),roh:[+s.x.toFixed(2),+s.y.toFixed(2),+s.z.toFixed(2)]});
  },undefined,function(){res({m:e[0],fehlt:true});});});}));};</script>`)

serverStarten()
const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage()
await page.goto(`http://127.0.0.1:${PORT}/${seite}`, { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(1000)
const r = await page.evaluate((m) => window.__mass(m), M)
await browser.close()
try { unlinkSync(join(REPO, seite)) } catch (e) {}

console.log('\n  Modell                        Hoehe    Breite x Tiefe     (Rohmass)')
for (const e of r) {
  if (e.fehlt) { console.log(`  ${e.m.padEnd(28)}  FEHLT`); continue }
  console.log(`  ${e.m.padEnd(28)}  ${String(e.h).padStart(5)} m  ${String(e.b).padStart(6)} x ${String(e.t).padEnd(6)}  (${e.roh.join(' × ')})`)
}
console.log('\n  Fuer viertel()-cfg:  ' + r.filter((e) => !e.fehlt)
  .map((e) => `{file:"${e.m}.glb",h:${e.h},w:${e.b},d:${e.t}}`).join(',\n                       ') + '\n')
