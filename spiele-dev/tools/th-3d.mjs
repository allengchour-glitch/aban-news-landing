/* th-3d.mjs — Ueberschneidungen NACHPRUEFEN, mit Hoehe.
 *
 * Warum es das gibt: `th-pruef.mjs` und jede Paarliste vergleichen Bounding-Boxen
 * in x und z. Das ueberschaetzt die Lage dramatisch, sobald ein Bauteil etwas
 * ueberdeckt statt es zu beruehren — Vordaecher, Kranausleger, Bruecken,
 * Baumkronen, Bahnsteigdaecher. Gemessenes Beispiel (2026-08):
 *
 *   th43_tankstelle x th7_lkw  ->  2D sagt 2,64 m Ueberschneidung.
 *   In 3D: das Vordach (y 4,38…5,06) zieht 0,68…1,08 m UEBER dem 3,70 m hohen
 *   LKW durch — kein Kontakt. Von acht Meshes im Grundriss beruehren genau ZWEI
 *   das Fahrzeug: eine Vordachstuetze (Cylinder002, y 0,15…4,45, 0,30 x 0,30)
 *   und ihre Fussplatte. Der Fehler ist also 30 cm breit, nicht 2,6 m.
 *
 * Wer nach der 2D-Zahl handelt, verschiebt ganze Gebaeude wegen einer Stuetze —
 * und schiebt sie dabei leicht auf etwas Schlimmeres (die Tankstelle haette bei
 * +5 in x 2,7 m im Ring-Ost-Band gestanden, also auf der Fahrbahn).
 *
 * Aufruf:  node th-3d.mjs            — alle 2D-Funde in 3D nachpruefen
 *          node th-3d.mjs th43 th7_lkw — nur dieses Paar, Mesh fuer Mesh
 *
 * ⚠️ BEWEGTE OBJEKTE LIEGEN IM URSPRUNG. Die ganze Frame-Kette haengt in loop()
 * hinter `if(running){…}`, und `running` wird erst beim Spielstart wahr — eine
 * Sonde drueckt nie auf Start. Alles, was erst updVerkehr/updLandbus/updZug an
 * seinen Platz setzt, steht deshalb waehrend der Messung auf (0|0) und meldet
 * sich als riesige Ueberschneidung: zwei th40_bus zum Beispiel mit 1458
 * Mesh-Paaren, weil beide uebereinander im Nullpunkt stehen. Das ist ein
 * MESSARTEFAKT, kein Fehler im Spiel. Erkennbar daran, dass die Weltbox um
 * (0|0) liegt und sich ueber Sekunden nicht ruehrt. Ausserdem laeuft SwiftShader
 * mit rund 1 Bild/s — kurze Beobachtungsfenster beweisen ohnehin nichts.
 *
 * ⚠️ `REPO` steht in th-lib.mjs fest auf /home/user/aban-news-landing. Aus einem
 * Worktree heraus misst das Werkzeug sonst die Datei des Hauptcheckouts und
 * bestaetigt Aenderungen, die es gar nicht gesehen hat. Zum Pruefen eines
 * Worktrees die Konstante in einer Kopie umbiegen.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const [aArg, bArg] = process.argv.slice(2)
const ZIEL = '_th3d.html'
mitSonden('traumhaus.html', {}, ZIEL)
const { browser, page } = await spielOeffnen(ZIEL, { warten: 90000 })

const zeilen = await page.evaluate(([aArg, bArg]) => {
  const L = []
  /* ⚠️ INSTANZEN WAREN UNSICHTBAR. `bauViele()` setzt gleiche Modelle als
     InstancedMesh und traegt sie ausdruecklich NICHT in `_gebaeude` ein — dieses
     Werkzeug lief daran vorbei, und `Box3.setFromObject` haette ohnehin die Huelle
     der ganzen Gruppe geliefert statt der einzelnen Instanz.
     `bauViele` legt je TEILMESH des Modells eine eigene InstancedMesh an, alle mit
     derselben Stellenliste. Instanz i eines Modells ist also die i-te Matrix in
     JEDER dieser Gruppen — daraus laesst sich das Objekt wieder zusammensetzen.
     Instanzen OHNE `userData.datei` (Gras, Baeume, Streuwerk) bleiben draussen: die
     durchdringen sich planmaessig und wuerden die Liste fluten.
     ⚠️ `scene` ist NICHT global — das Spiel steckt in einer IIFE, und dieses
     Werkzeug injiziert keine Sonde. Der Szenenwurzel kommt man ueber ein Objekt bei,
     das das Spiel selbst veroeffentlicht: `_gebaeude[0]` haengt in ihr. */
  const welt = (window._gebaeude || []).slice()
  let _wurzel = null
  for (let n = welt[0]; n; n = n.parent) if (n.isScene) _wurzel = n
  const _instGr = {}
  if (_wurzel) _wurzel.traverse(o => {
    if (!o.isInstancedMesh || !o.geometry) return
    const d = o.userData && o.userData.datei
    if (!d) return
    /* Nach SATZ gruppieren, nicht nach Datei: derselbe Zaun steht als mehrere
       Linien in der Welt, jede mit eigener Stellenliste. Index i der einen und
       Index i der anderen sind verschiedene Orte — ohne die Satznummer entsteht
       aus zwei Zaunlinien ein Objekt mit 213 m Grundriss (gemessen, erster Lauf). */
    const k = d + '~' + (o.userData.satz || 0)
    ;(_instGr[k] = _instGr[k] || []).push(o)
  })
  const _pseudo = []
  const _M = new THREE.Matrix4()
  Object.keys(_instGr).forEach(k => {
    const gruppen = _instGr[k]
    const datei = k.slice(0, k.lastIndexOf('~'))
    let anz = 0
    gruppen.forEach(g => { if (g.count > anz) anz = g.count })
    for (let i = 0; i < anz; i++) {
      const boxen = []
      for (const g of gruppen) {
        if (i >= g.count) continue
        if (!g.geometry.boundingBox) g.geometry.computeBoundingBox()
        g.getMatrixAt(i, _M)
        const b = g.geometry.boundingBox.clone()
        b.applyMatrix4(_M); b.applyMatrix4(g.matrixWorld)
        if (isFinite(b.min.x)) boxen.push({ n: g.name || 'Instanz',
          x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z })
      }
      if (boxen.length) _pseudo.push({ datei: datei + ' #' + i, boxen })
    }
  })
  const box = o => {
    const b = new THREE.Box3().setFromObject(o)
    return isFinite(b.min.x) ? b : null
  }
  /* Mesh-Boxen eines Objekts — einmal einsammeln, danach nur noch Zahlen. */
  const meshes = o => {
    const a = []
    o.traverse(m => {
      if (!m.isMesh || !m.geometry) return
      const b = new THREE.Box3().setFromObject(m)
      if (isFinite(b.min.x)) a.push({ n: m.name || '?',
        x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z })
    })
    return a
  }
  const ueb = (p, q, k) => Math.min(p[k + '1'], q[k + '1']) - Math.max(p[k + '0'], q[k + '0'])
  const schnitt3 = (p, q) => ueb(p, q, 'x') > 0 && ueb(p, q, 'y') > 0 && ueb(p, q, 'z') > 0

  if (aArg) {                                     /* ── Einzelpaar, ausfuehrlich ── */
    const _alle = welt.map(w => ({ d: w.userData.datei || '', m: null, w }))
                      .concat(_pseudo.map(ps => ({ d: ps.datei, m: ps.boxen, w: null })))
    const A = _alle.filter(o => new RegExp(aArg).test(o.d))
    const B = _alle.filter(o => new RegExp(bArg || aArg).test(o.d))
    L.push(aArg + ': ' + A.length + ' Objekte,  ' + (bArg || aArg) + ': ' + B.length)
    const bm = B.flatMap(o => o.m || meshes(o.w))
    /* Erst sammeln, dann sortieren: die ECHTEN Treffer muessen oben stehen. Ein
       Vordach ueber einem Fahrzeug erzeugt Dutzende Zeilen "frei" — schiebt man
       die nicht weg, scrollt die eine Zeile, auf die es ankommt, aus dem Bild. */
    const rows = []
    A.flatMap(o => o.m || meshes(o.w)).forEach(m => {
      bm.filter(q => ueb(m, q, 'x') > 0 && ueb(m, q, 'z') > 0).forEach(q => {
        rows.push({ oy: ueb(m, q, 'y'),
          t: 'y ' + m.y0.toFixed(2) + '…' + m.y1.toFixed(2) + ' gegen ' +
             q.y0.toFixed(2) + '…' + q.y1.toFixed(2) +
             '  dy ' + ueb(m, q, 'y').toFixed(2) + '   ' + m.n + ' / ' + q.n })
      })
    })
    rows.sort((p, q) => q.oy - p.oy)
    const n = rows.filter(r => r.oy > 0).length
    L.push('Mesh-Paare im Grundriss: ' + rows.length + ' — davon ECHT: ' + n)
    rows.slice(0, Math.max(n + 3, 12)).forEach(r => L.push((r.oy > 0 ? 'ECHT  ' : 'frei  ') + r.t))
    return L
  }

  /* ── Alle 2D-Funde nachpruefen ── */
  const objs = welt.map(w => ({ w, d: w.userData.datei || '?', b: box(w) })).filter(o => o.b)
  _pseudo.forEach(ps => {
    const b = new THREE.Box3()
    ps.boxen.forEach(k => { b.expandByPoint(new THREE.Vector3(k.x0, k.y0, k.z0))
                            b.expandByPoint(new THREE.Vector3(k.x1, k.y1, k.z1)) })
    objs.push({ w: null, d: ps.datei, b, m: ps.boxen })
  })
  const paare = []
  for (let i = 0; i < objs.length; i++)
    for (let j = i + 1; j < objs.length; j++) {
      const p = objs[i].b, q = objs[j].b
      const ox = Math.min(p.max.x, q.max.x) - Math.max(p.min.x, q.min.x)
      const oz = Math.min(p.max.z, q.max.z) - Math.max(p.min.z, q.min.z)
      /* 0,50 m statt 0,05: Leitplanken, Geruest- und Zaunmodule werden in Reihen
         gesetzt und teilen sich planmaessig ihre Kanten — bei 0,05 bestand die
         halbe Liste aus diesen Nachbarn und die echten Funde gingen darin unter. */
      if (ox > 0.5 && oz > 0.5) paare.push({ a: objs[i], b: objs[j], m2: Math.min(ox, oz) })
    }
  paare.sort((x, y) => y.m2 - x.m2)
  L.push('2D-Funde: ' + paare.length)
  const cache = new Map()
  const hol = o => { if (o.m) return o.m
    if (!cache.has(o.w)) cache.set(o.w, meshes(o.w)); return cache.get(o.w) }
  /* ⚠️ NACH EINDRINGTIEFE SORTIEREN, NICHT NACH GRUNDRISS. Die Liste war nach der
     2D-Ueberdeckung geordnet — und die ist fuer GESTAPELTE Bauten das ganze Grundstueck.
     Ganz oben stand darum dauerhaft "th7_hochhaus_modul x th7_hochhaus_modul, 8,20 m":
     ein korrekt gestapeltes Hochhaus (Module bei y 0-6, 6-12, 12-18, 18-24 plus Dach),
     bei dem nur ein Gesims ein paar Zentimeter in das Modul darueber ragt. Wer die Liste
     von oben liest, jagt zuerst das sauberste Bauwerk der Karte.
     Die Frage ist nicht "wie viel Grundflaeche teilen sie sich", sondern "wie tief steckt
     das eine im anderen" — also das KLEINSTE der drei Achsenueberlappungen, und davon das
     groesste Meshpaar. Fuer den gestapelten Turm sind das Zentimeter, fuer die
     Polizeiwache in der Seilbahnstation waren es 19,7 m. */
  let echt = 0, luft = 0
  const zeilen = []
  paare.forEach(p => {
    const am = hol(p.a), bm = hol(p.b)
    let tiefste = null, n = 0, tiefe = 0
    for (const m of am) for (const q of bm) if (schnitt3(m, q)) {
      n++
      const y = Math.max(m.y0, q.y0)
      if (tiefste === null || y < tiefste) tiefste = y
      const d = Math.min(ueb(m, q, 'x'), ueb(m, q, 'y'), ueb(m, q, 'z'))
      if (d > tiefe) tiefe = d
    }
    if (n) { echt++; zeilen.push({ t: tiefe, s: 'ECHT  ' + tiefe.toFixed(2) + 'm tief  (Grundriss ' +
                            p.m2.toFixed(2) + 'm)   ' + n + ' Mesh-Paare   ab y ' +
                            tiefste.toFixed(2) + '   ' + p.a.d + ' x ' + p.b.d }) }
    else { luft++; zeilen.push({ t: -1, s: 'LUFT  ' + p.m2.toFixed(2) + 'm 2D   uebereinander, kein Kontakt   ' +
                          p.a.d + ' x ' + p.b.d }) }
  })
  zeilen.sort((x, y) => y.t - x.t).forEach(z => L.push(z.s))
  L.push('=> ' + echt + ' echt, ' + luft + ' nur 2D (Vordach/Krone/Ausleger)')
  return L
}, [aArg, bArg])

console.log(zeilen.join('\n'))
await browser.close(); aufraeumen(ZIEL); process.exit(0)
