/* th-hud.mjs — ueberdeckt sich die Bedienoberflaeche selbst?
 *
 * ⚠️ WOZU. Der User spielt auf dem Handy im Querformat (844 x 390). Dort ist es eng,
 * und schon einmal lag eine Ecken-Plakette genau auf dem Joystick — gefunden nur, weil
 * jemand hingeschaut hat. Dieses Werkzeug misst statt hinzuschauen: es holt sich die
 * Rechtecke ALLER sichtbaren Bedienelemente und meldet
 *   * Ueberdeckungen (zwei bedienbare Flaechen auf demselben Fleck),
 *   * Elemente, die aus dem Bild ragen,
 *   * Tippziele unter 44 px (die uebliche Mindestgroesse fuer den Finger).
 *
 * Aufruf:  node spiele-dev/tools/th-hud.mjs [breite] [hoehe]
 */
import { spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'

const B = +(process.argv[2] || 844), H = +(process.argv[3] || 390)
const tmp = '_hud_tmp.html'
copyFileSync(join(REPO, 'traumhaus.html'), join(REPO, tmp))

/* ⚠️ viewport UND screen mitgeben. Das Spiel entscheidet ueber `_mobil` anhand von
   `screen`, nicht anhand des Fensters — ohne screen misst man das Handy-Format im
   Desktop-Modus. Und: der erste Anlauf gab "breite/hoehe" statt "viewport" mit; die
   Option gibt es nicht, also mass alles stillschweigend im 1100x620-Standard weiter
   (Elemente bis x=1100 in einem angeblich 844 breiten Bild). */
const { browser, page, jsFehler } = await spielOeffnen(tmp, {
  warten: 55000, viewport: { width: B, height: H }, screen: { width: B, height: H },
})
await page.waitForTimeout(1500)

const r = await page.evaluate(([B, H]) => {
  const sichtbar = (el) => {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false
    const b = el.getBoundingClientRect()
    return b.width > 4 && b.height > 4
  }
  /* Bedienelemente: alles, was man antippen kann, plus die HUD-Kaesten. */
  const auswahl = [...document.querySelectorAll('button, a, #hud > *, #zoomBtns > *, [id]')]
    .filter((el) => {
      if (!sichtbar(el)) return false
      const s = getComputedStyle(el)
      if (s.pointerEvents === 'none') return false
      /* Nur die oberste Ebene je Gruppe: Kinder sichtbarer Eltern ueberspringen wir
         nicht generell — ein Knopf IN einer Leiste ist ein eigenes Ziel. */
      return el.offsetParent !== null || s.position === 'fixed'
    })
  const kasten = (el) => {
    const b = el.getBoundingClientRect()
    return { id: el.id || (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase()),
             tag: el.tagName.toLowerCase(),
             x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
             r: Math.round(b.right), u: Math.round(b.bottom),
             txt: (el.textContent || '').trim().slice(0, 18) }
  }
  /* ⚠️ CONTAINER SIND KEINE UEBERDECKUNG. Der erste Lauf meldete zwoelfmal
     "#wrap ueber X" — #wrap ist die Seitenhuelle und liegt naturgemaess unter allem.
     Wer ein anderes Bedienelement ENTHAELT, ist Rahmen, nicht Rivale. */
  const echte = auswahl.filter((el) => !auswahl.some((o) => o !== el && el.contains(o)))
  const K = echte.map(kasten)
  /* Was der Spieler gerade nicht sieht (eingeklappte Meldungen ueber dem Bildrand),
     ist kein Fehler — gemeldet wird, was IM Bild sein sollte und hinausragt. */
  const raus = K.filter((k) => (k.x < -1 || k.r > B + 1 || k.u > H + 1) && k.y > -5)
  const klein = K.filter((k) => (k.w < 44 || k.h < 44) && k.tag === 'button')
  /* ⚠️ ÜBERDECKUNG IST DIE FALSCHE FRAGE. Der erste Lauf meldete zwoelfmal
     "#wrap ueber X" — #wrap ist eine bildschirmfuellende Ebene (Rechtsklinks), und in
     Hochkant kommt #rotHint dazu (der Dreh-dein-Handy-Hinweis). Beide liegen UNTER
     der Bedienung und stoeren niemanden. Zwei Kaesten duerfen sich ueberlappen; was
     zaehlt, ist: WER BEKOMMT DEN TIPP? Also genau das messen — elementFromPoint in
     der Mitte jedes Bedienelements. Nur wenn dort etwas Fremdes liegt, ist es
     wirklich verdeckt. */
  const ueber = []
  for (const el of echte) {
    const b = el.getBoundingClientRect()
    const cx = Math.round(b.left + b.width / 2), cy = Math.round(b.top + b.height / 2)
    if (cx < 0 || cy < 0 || cx > B || cy > H) continue
    const t = document.elementFromPoint(cx, cy)
    if (!t) continue
    if (t === el || el.contains(t) || t.contains(el)) continue
    /* Container ohne eigene Flaeche (die Mitte faellt in die Luecke zwischen den
       Kindern) sind kein Befund — nur echte Bedienelemente zaehlen. */
    if (el.querySelector('button, a, canvas')) continue
    ueber.push({ a: (t.id || t.tagName.toLowerCase()), b: kasten(el).id,
                 ox: Math.round(b.width), oy: Math.round(b.height), flaeche: b.width * b.height })
  }
  ueber.sort((p, q) => q.flaeche - p.flaeche)
  return { n: K.length, raus, klein, ueber: ueber.slice(0, 12), alle: K }
}, [B, H])

console.log(`Bedienoberflaeche bei ${B}x${H} — ${r.n} sichtbare Elemente\n`)
console.log(`${r.raus.length ? '❌' : '✅'} Ausserhalb des Bildes: ${r.raus.length}`)
r.raus.forEach((k) => console.log(`     ${k.id.padEnd(18)} ${k.x},${k.y} ${k.w}x${k.h} → rechts ${k.r}, unten ${k.u}`))
console.log(`${r.klein.length ? '⚠️ ' : '✅'} Tippziele unter 44px: ${r.klein.length}`)
r.klein.forEach((k) => console.log(`     ${k.id.padEnd(18)} ${k.w}x${k.h}  "${k.txt}"`))
/* ⚠️ EINE ABSICHTLICHE SPERRSCHICHT IST KEIN BEFUND. In Hochkant legt das Spiel
   #rotHint ("dreh dein Handy") ueber alles — dort SOLLEN die Knoepfe nicht reagieren.
   Der erste Lauf meldete das als zwoelf verdeckte Bedienelemente. Wenn ein und
   dasselbe Element ALLE Ziele abfaengt, ist es die Sperrschicht, nicht ein Fehler. */
const taeter = [...new Set(r.ueber.map((u) => u.a))]
const sperre = r.ueber.length >= 3 && taeter.length === 1
if (sperre) {
  console.log(`ℹ️  Sperrschicht aktiv: "${taeter[0]}" faengt alle ${r.ueber.length} Bedienelemente ab.`)
  console.log('     Das ist gewollt (z. B. der Dreh-Hinweis in Hochkant) — kein Befund.')
} else {
  console.log(`${r.ueber.length ? '❌' : '✅'} Bedienelemente, deren Mitte ein FREMDES Element bekommt: ${r.ueber.length}`)
  r.ueber.forEach((u) => console.log(`     ${u.b.padEnd(18)} (${u.ox}x${u.oy}) → Tipp landet auf ${u.a}`))
}
console.log(`\nJS-Fehler: ${jsFehler.length}`)
await page.screenshot({ path: REPO + '/spiele-dev/screenshots/hud-' + B + 'x' + H + '.png' })
await browser.close()
aufraeumen(tmp)
