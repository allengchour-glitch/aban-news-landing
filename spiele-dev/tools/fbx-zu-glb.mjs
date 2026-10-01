/* fbx-zu-glb.mjs — FBX (z. B. Quaternius-CC0-Figuren) ohne Blender nach GLB wandeln (Runde 105 Teil 3).
 *
 * WARUM: Im Container gibt es kein Blender. three.js r128 (dieselbe Version wie das Spiel)
 * hat einen FBX-Lader und einen GLTF-Exporter — beide laufen im Browser. Das Werkzeug
 * laedt jede FBX, meldet Clips, Knochen, Dreiecke und Hoehe (ueber die Knochen, nicht Box3:
 * Box3 ignoriert Skinning) und schreibt eine GLB, die GLTFLoader r128 wieder liest.
 *
 * Aufruf: node spiele-dev/tools/fbx-zu-glb.mjs <ordner-mit-fbx> <zielordner> [--nur-bericht]
 *         [--clips Idle,Walk,Run,...]   nur diese Clips behalten (Name ohne Praefix, Gross/klein egal)
 *         [--praefix q_]                Dateinamen im Ziel: q_<name-klein>.glb
 * Die Lader holt es sich einmalig aus dem npm-Paket three@0.128.0 (Zwischenablage /tmp/three128).
 */
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { CHROMIUM } from './th-lib.mjs'

const a = process.argv.slice(2)
const opt = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d }
const nurBericht = a.includes('--nur-bericht'); if (nurBericht) a.splice(a.indexOf('--nur-bericht'), 1)
const clipsNur = (opt('--clips', '') || '').split(',').filter(Boolean).map(s => s.toLowerCase())
const praefix = opt('--praefix', 'q_')
const [quelle, ziel] = a
if (!quelle || !ziel) { console.error('Aufruf: fbx-zu-glb.mjs <quelle> <ziel>'); process.exit(2) }

const T = '/tmp/three128/package'
if (!existsSync(join(T, 'examples/js/loaders/FBXLoader.js'))) {
  mkdirSync('/tmp/three128', { recursive: true })
  execSync('curl -sL -m 120 https://registry.npmjs.org/three/-/three-0.128.0.tgz | tar -xz -C /tmp/three128')
}
const js = ['build/three.min.js', 'examples/js/libs/fflate.min.js', 'examples/js/curves/NURBSUtils.js',
  'examples/js/curves/NURBSCurve.js', 'examples/js/loaders/FBXLoader.js', 'examples/js/exporters/GLTFExporter.js', 'examples/js/utils/BufferGeometryUtils.js']
  .map(f => readFileSync(join(T, f), 'utf8')).join('\n;\n')

const dateien = readdirSync(quelle).filter(f => /\.fbx$/i.test(f)).sort()
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader'] })
const page = await browser.newPage()
await page.setContent('<html><body></body></html>')
await page.addScriptTag({ content: js })
if (!nurBericht) mkdirSync(ziel, { recursive: true })

for (const f of dateien) {
  const b64 = readFileSync(join(quelle, f)).toString('base64')
  const erg = await page.evaluate(async ({ b64, clipsNur, nurBericht, name }) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
    const obj = new THREE.FBXLoader().parse(bin, '')
    obj.updateMatrixWorld(true)
    let tris = 0, meshes = 0, skinned = 0, mats = new Set(), bones = []
    obj.traverse(o => {
      if (o.isBone) bones.push(o.name)
      if (o.isMesh) { meshes++; if (o.isSkinnedMesh) skinned++
        const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3
        ;(Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.type + ':' + (m.name || '') + ':' + (m.color ? m.color.getHexString() : '')))
      }
    })
    const v = new THREE.Vector3(); let minY = 1e9, maxY = -1e9
    obj.traverse(o => { if (o.isBone) { o.getWorldPosition(v); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y) } })
    /* ── 1) FARBEN EINBACKEN ─────────────────────────────────────────────────────────
       ⚠️ GEMESSEN (erster Lauf): FBXLoader liefert eine NICHT indizierte Geometrie mit
       150–190 Materialgruppen (jeder Wechsel Haut/Hemd/Hose ist eine Gruppe). GLTFExporter
       r128 macht daraus je Gruppe ein Primitiv, das ALLE Eckpunkte zeichnet: 150 Teile,
       280 000–420 000 Dreiecke statt 1 800–2 800, und die letzte Farbe (Schuhe) uebermalt
       die ganze Figur. Darum: jede Gruppe schreibt ihre Materialfarbe in die Eckpunktfarbe,
       danach EIN Material, EINE Gruppe — eine Figur ist dann ein einziger Zeichenaufruf. */
    const mitTextur = []
    obj.traverse(o => {
      if (!o.isMesh) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      const g = o.geometry, ix = g.index, n = g.attributes.position.count
      const col = new Float32Array(n * 3)
      const gruppen = g.groups.length ? g.groups : [{ start: 0, count: ix ? ix.count : n, materialIndex: 0 }]
      for (const gr of gruppen) {
        const m = mats[gr.materialIndex] || mats[0]
        if (m.map) mitTextur.push(m.name)
        const c = m.color || new THREE.Color(1, 1, 1)
        for (let k = gr.start; k < gr.start + gr.count; k++) { const vi = ix ? ix.getX(k) : k; col[vi * 3] = c.r; col[vi * 3 + 1] = c.g; col[vi * 3 + 2] = c.b }
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.clearGroups()
      /* ⚠️ GEMESSEN: 5 562 Eckpunkte ohne Index, Geometrie = 75 % der Datei. Normalen und UV
         weg (keine Textur; ohne NORMAL schaltet GLTFLoader r128 selbst auf flatShading = der
         Low-Poly-Look des Pakets), dann gleiche Eckpunkte zusammenlegen. */
      g.deleteAttribute('normal'); if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.uv2) g.deleteAttribute('uv2')
      o.geometry = THREE.BufferGeometryUtils.mergeVertices(g, 1e-5)
      o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, skinning: !!o.isSkinnedMesh })
      o.material.name = 'figur'
    })
    /* ── 2) GROESSE IN METERN ─────────────────────────────────────────────────────────
       Die FBX sind in Zentimeter-artigen Einheiten (~460 hoch). Hoehe ueber die GEHAEUTETEN
       Eckpunkte (boneTransform), nicht Box3 — Box3 ignoriert Skinning. */
    const zielH = /female|woman/i.test(name) ? 1.66 : 1.75
    const hoehe = () => { const v2 = new THREE.Vector3(); let a0 = 1e9, a1 = -1e9; obj.updateMatrixWorld(true)
      obj.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position
        for (let q = 0; q < p.count; q += 3) { v2.fromBufferAttribute(p, q); if (o.isSkinnedMesh) o.boneTransform(q, v2); v2.applyMatrix4(o.matrixWorld); a0 = Math.min(a0, v2.y); a1 = Math.max(a1, v2.y) } })
      return a1 - a0 }
    const h0 = hoehe(); obj.scale.multiplyScalar(zielH / h0); const h1 = hoehe()
    /* ── 3) CLIPS ENTSCHLACKEN ────────────────────────────────────────────────────────
       Spuren auf Hilfsknochen (PoleTarget = IK-Ziel aus Blender, *_end = Knochenspitze)
       bewegen keinen Eckpunkt. Spuren, die ueber den ganzen Clip auf dem Ruhewert stehen,
       aendern nichts. Beides faellt raus; optimize() streicht doppelte Schluesselbilder. */
    const ruhe = {}; obj.traverse(o => { ruhe[o.name] = o })
    let spurenVor = 0, spurenNach = 0
    const gleich = (w, a, b) => { for (let i = 0; i < b.length; i++) if (Math.abs(w[a + i] - b[i]) > 1e-4) return false; return true }
    for (const c of obj.animations) {
      spurenVor += c.tracks.length
      c.tracks = c.tracks.filter(t => {
        const [knoten, eig] = t.name.split('.')
        if (/PoleTarget|_end$/.test(knoten)) return false
        const r = ruhe[knoten]; if (!r || !r[eig]) return true
        const rw = r[eig].toArray(), w = t.values, st = rw.length
        for (let a = 0; a < w.length; a += st) if (!gleich(w, a, rw)) return true
        return false
      })
      c.optimize(); spurenNach += c.tracks.length
    }
    /* FBX-Zusatzdaten (transformData je Knoten) landen sonst als extras im JSON: 45 kB. */
    obj.traverse(o => { o.userData = {} })
    let ecken = 0; obj.traverse(o => { if (o.isMesh) ecken += o.geometry.attributes.position.count })
    const kurz = n => n.replace(/^.*\|/, '').replace(/^(Man|Male|Female|Woman)_/, '').toLowerCase()
    let clips = obj.animations
    if (clipsNur.length) clips = clips.filter(c => clipsNur.includes(kurz(c.name)))
    clips.forEach(c => { c.name = c.name.replace(/^.*\|/, '').replace(/^(Man|Male|Female|Woman)_/, '') })  /* Quaternius: Man_Walk / Female_Walk -> Walk, damit Maenner und Frauen dieselben Namen tragen */
    const bericht = { meshes, skinned, tris: Math.round(tris), bones: bones.length, knochen: bones.slice(0, 60).join(','),
      knochenHoehe: +(maxY - minY).toFixed(3), skala: obj.scale.toArray().map(x => +x.toFixed(4)),
      mats: [...mats].join(' | '), clipsAlle: obj.animations.map(c => c.name + '(' + c.duration.toFixed(2) + ')').join(' '),
      clipsBehalten: clips.length, mitTextur: mitTextur.join(','), hoeheVor: +h0.toFixed(2), hoeheNach: +h1.toFixed(3),
      spuren: spurenVor + '→' + spurenNach, ecken }
    if (nurBericht) return { bericht }
    const glb = await new Promise((ok, fehl) => new THREE.GLTFExporter().parse(obj, ok,
      { binary: true, animations: clips, onlyVisible: true, embedImages: true, truncateDrawRange: true }))
    let s = ''; const u = new Uint8Array(glb); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768))
    return { bericht, glb: btoa(s) }
  }, { b64, clipsNur, nurBericht, name: f })
  console.log(f, JSON.stringify(erg.bericht))
  if (erg.glb) {
    const aus = join(ziel, praefix + basename(f, '.fbx').toLowerCase() + '.glb')
    writeFileSync(aus, Buffer.from(erg.glb, 'base64'))
    console.log('  →', aus, Buffer.from(erg.glb, 'base64').length, 'Bytes')
  }
}
await browser.close()
