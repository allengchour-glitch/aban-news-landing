/* Sonde (Runde 100): WER baut die selbstgebauten Gruppen, die nach dem Zusammenfassen noch Hunderte
   Zeichenaufrufe kosten? node probe-gruppen-herkunft.mjs [quelle]
   Haengt sich vor dem Weltaufbau an `scene.add` und merkt sich fuer jedes direkt in die Szene gelegte Objekt die
   Aufrufkette. Nach der fertigen Welt: alle Nicht-Modell-Gruppen (kein userData.datei) nach Herkunftsfunktion,
   mit Meshes, Materialien und dem Anteil, der schon zusammengefasst ist.
   Gegenprobe: die Summe aller erfassten Top-Level-Objekte muss scene.children.length sein (sonst fehlt ein Weg in die
   Szene, z. B. `parent.add` ueber eine Zwischengruppe — die Sonde meldet dann „ohne Herkunft"). */
import { spielOeffnen, aufraeumen, warteAufRuhe, REPO } from '../th-lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_gherk_tmp.html'
const anker = 'var scene=new THREE.Scene();'
let src = readFileSync(join(REPO, quelle), 'utf8')
if (!src.includes(anker)) throw new Error('Anker scene fehlt')
src = src.replace(anker, anker + `window._szene=scene;(function(){var _a=scene.add;scene.add=function(){for(var i=0;i<arguments.length;i++){var o=arguments[i];
  if(o&&!o.__herk){var st=(new Error().stack||"").split("\\n").slice(2,6).map(function(l){var m=l.match(/at ([^ ]+) .*:(\\d+):\\d+\\)?$/)||l.match(/at .*:(\\d+):\\d+$/);return m?(m[2]?m[1]+":"+m[2]:"anon:"+m[1]):l.trim();});o.__herk=st.join(" < ");}}
  return _a.apply(this,arguments);};})();`)
writeFileSync(join(REPO, TMP), src)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 60000 })
await warteAufRuhe(page, { minSekunden: 150 }); await page.waitForTimeout(12000)
const R = await page.evaluate(() => {
  var H = {}, ohne = 0, alle = 0, L = []
  var scene = window._szene
  scene.children.forEach(function (o) {
    alle++
    if (o.userData && o.userData.datei) return
    var n = 0, z = 0, mats = {}, tr = 0, inst = 0
    o.traverse(function (q) { if (q.isInstancedMesh) inst++; else if (q.isMesh) { n++; if (q.userData && q.userData.zusammen) z++; var m = Array.isArray(q.material) ? q.material[0] : q.material; if (m) { mats[m.uuid] = 1; if (m.transparent) tr++ } } })
    if (n < 2) return
    var k = (o.__herk || 'ohne Herkunft').split(' < ')[0]
    if (!o.__herk) ohne++
    var h = H[k] || (H[k] = { gruppen: 0, meshes: 0, zus: 0, mats: 0, tr: 0, inst: 0, bew: 0, kette: o.__herk, bsp: [] })
    h.gruppen++; h.meshes += n; h.zus += z; h.mats += Object.keys(mats).length; h.tr += tr; h.inst += inst; if (o._bewegt || (o.userData && o.userData.animiert)) h.bew++
    L.push({h: o.__herk, x: Math.round(o.position.x), z: Math.round(o.position.z), n: n, ud: Object.keys(o.userData || {}).join(','), bew: !!(o._bewegt || (o.userData && o.userData.animiert)), mau: o.matrixAutoUpdate})
    if (h.bsp.length < 3) h.bsp.push([Math.round(o.position.x), Math.round(o.position.z), o.name || o.type, Object.keys(o.userData || {}).join(',')].join(' '))
  })
  /* LOSE: Meshes direkt in der Szene (keine Gruppe) — nach Herkunft, flach (<=0,35 m) oder nicht, Materialien */
  var LO = {}, bb = new THREE.Box3()
  scene.children.forEach(function (o) {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || o._bewegt) return
    var m = Array.isArray(o.material) ? o.material[0] : o.material
    bb.setFromObject(o); var flach = (bb.max.y - bb.min.y <= 0.3 && bb.max.y <= 0.35)
    var k = (o.__herk || 'ohne').split(' < ')[0] + (flach ? ' [flach]' : ' [hoch]')
    var h = LO[k] || (LO[k] = { n: 0, mats: {}, tr: 0, unsicht: 0, kette: o.__herk, geo: {} })
    h.n++; if (m) { h.mats[m.uuid] = 1; if (m.transparent) h.tr++ } if (!o.visible) h.unsicht++; h.geo[o.geometry.type] = (h.geo[o.geometry.type] || 0) + 1
  })
  Object.keys(LO).forEach(function (k) { LO[k].mats = Object.keys(LO[k].mats).length })
  return { H: H, ohne: ohne, alle: alle, L: L, LO: LO }
})
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(R.L))
console.log(`Top-Level ${R.alle}, Gruppen ohne Herkunft ${R.ohne}`)
Object.entries(R.H).sort((a, b) => b[1].meshes - a[1].meshes).slice(0, +(process.env.TOP || 40)).forEach(([k, h]) =>
  console.log(`${String(h.meshes).padStart(6)} Meshes in ${String(h.gruppen).padStart(4)} Gruppen · zus ${h.zus} · Mat ${h.mats} · durchs ${h.tr} · Inst ${h.inst} · bewegt ${h.bew} · ${k}\n        ${h.kette}\n        z.B. ${h.bsp.join(' | ')}`))
if (process.env.LOSE) { console.log('\n— lose Meshes direkt in der Szene —')
  Object.entries(R.LO).sort((a, b) => b[1].n - a[1].n).slice(0, 40).forEach(([k, h]) => console.log(`${String(h.n).padStart(6)} · Mat ${h.mats} · durchs ${h.tr} · unsichtbar ${h.unsicht} · ${JSON.stringify(h.geo)} · ${k}\n        ${h.kette}`)) }
console.log('JS-Fehler', jsFehler.length, jsFehler.slice(0, 2))
await browser.close(); aufraeumen(TMP)
