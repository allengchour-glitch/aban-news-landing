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
 * ⚠️ ZWEI LEHREN VOM 2026-08-30, BEIDE TEUER BEZAHLT (der User schickte einen
 * Screenshot: "sachen passen nicht dort rein").
 *
 *   1. DAS LEERE HUD IST NICHT DAS HUD. Ein frisches Spiel zeigt "Lv0 · Lv0" ohne
 *      Krimi-Rang und ohne Familie. Der Fehler zeigte sich erst bei einem gespielten
 *      Stand: "Arbeit Lv2 · Liebe Lv1 · Krimi Lv1" braucht 149 px, der Kasten gab bei
 *      667x375 nur 122 — die Zeile brach um, "Lv1" stand allein darunter. Dieses
 *      Werkzeug fuellt das HUD darum jetzt selbst bis zum Anschlag, bevor es misst.
 *   2. EINE GROESSE IST KEINE ABDECKUNG. Bei 844x390 passt dieselbe Zeile auf den
 *      Pixel genau (149 von 149) — der Standardaufruf haette nie etwas gefunden. Der
 *      Deckel steht in `@media (max-height:380px)`, greift also erst darunter. Ohne
 *      Argumente laeuft das Werkzeug jetzt ueber MEHRERE Handy-Formate.
 *
 * Aufruf:  node spiele-dev/tools/th-hud.mjs [breite] [hoehe]
 *          ohne Argumente: 844x390, 667x375 und 568x320
 */
import { spielOeffnen, aufraeumen, mitSonden, REPO } from './th-lib.mjs'

/* Das HUD bis zum Anschlag fuellen — jede Zeile in ihrer laengsten Fassung. */
const tmp = mitSonden('traumhaus.html', {
  /* ⚠️ KEINE KINDER FAELSCHEN. Der erste Anlauf schob zwei Objekte in `kinder`, um
     die Familien-Zeile zu fuellen — sie hatten kein `mesh`, und die Bildschleife warf
     danach in JEDEM Bild einen Fehler (17 bis 18 je Lauf). Ein Werkzeug, das den
     Messgegenstand kaputtmacht, misst den Schaden, den es selbst angerichtet hat.
     Gefuellt wird nur, was ohne Nebenwirkung geht: Raenge, Geld, Uhrzeit.
     ⚠️ UND NICHT AUF NACHT STELLEN. Der zweite Anlauf setzte 23:05 (die laengste
     Uhrzeit-Zeile) — daraufhin gingen die Sims ins Bett, `romScene` legte den
     Turtel-Vorhang `#romKiss` ueber den Bildschirm, und die Ueberdeckungs-Pruefung
     meldete brav "Sperrschicht aktiv" fuer ALLE drei Formate. Sie war damit
     abgeschaltet, und der Lauf sah trotzdem gruen aus. 13:05 ist gleich breit. */
  voll: `function(){
    skills.arbeit.lv=2;skills.liebe.lv=1;skills.krimi.lv=1;liebe=62;geld=1234567;tag=13;uhrzeit=785;
    updHUD();return true;}`,
}, '_hud_tmp.html')

const EINZEL = process.argv[2] ? [[+process.argv[2], +(process.argv[3] || 390)]] : null
const FORMATE = EINZEL || [[844, 390], [667, 375], [568, 320]]
let fehlerGesamt = 0
for (const [B, H] of FORMATE) {

/* ⚠️ viewport UND screen mitgeben. Das Spiel entscheidet ueber `_mobil` anhand von
   `screen`, nicht anhand des Fensters — ohne screen misst man das Handy-Format im
   Desktop-Modus. Und: der erste Anlauf gab "breite/hoehe" statt "viewport" mit; die
   Option gibt es nicht, also mass alles stillschweigend im 1100x620-Standard weiter
   (Elemente bis x=1100 in einem angeblich 844 breiten Bild). */
const { browser, page, jsFehler } = await spielOeffnen(tmp, {
  warten: 55000, viewport: { width: B, height: H }, screen: { width: B, height: H },
})
await page.waitForTimeout(1500)
await page.evaluate(() => window.__th.voll())
await page.waitForTimeout(300)
/* Sicherheitsnetz: laeuft doch eine Zwischenszene (Turteln, Hochzeit), warten statt
   messen — sonst prueft der Lauf einen Vorhang statt der Bedienoberflaeche. */
for (let i = 0; i < 24; i++) {
  const offen = await page.evaluate(() => [...document.querySelectorAll('#romKiss,#mgBox,.overlay')]
    .some((e) => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 200))
  if (!offen) break
  await page.waitForTimeout(500)
}

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
    /* ⚠️ EINE SPERRSCHICHT HAT KINDER. Die Erkennung unten fragte "faengt EIN Element
       alles ab?" — beim Turtel-Vorhang (`#romKiss`, position:fixed, inset:0, z-index 20)
       landen die Tipps mal auf ihm, mal auf seinem Text `#romTxt`. Zwei Namen, eine
       Schicht: gemeldet wurden zwoelf verdeckte Bedienelemente, die alle gewollt sind.
       Darum wird der Taeter auf seine oberste benannte Huelle zurueckgefuehrt. */
    let w = t, k9 = t
    while (k9 && k9.parentElement && k9.parentElement !== document.body) {
      k9 = k9.parentElement
      if (k9.id) w = k9
    }
    ueber.push({ a: (t.id || t.tagName.toLowerCase()), wurzel: (w.id || w.tagName.toLowerCase()),
                 b: kasten(el).id,
                 ox: Math.round(b.width), oy: Math.round(b.height), flaeche: b.width * b.height })
  }
  /* ⚠️ WAS UMBRICHT, PASST NICHT. Eine Textzeile im HUD soll auf EINER Zeile stehen;
     bricht sie um, steht ein Rest allein darunter (der Screenshot des Users). Gemessen
     wird an den BLATT-Elementen — die Kaesten selbst sind Spalten aus mehreren Zeilen
     und duerfen mehrzeilig sein. `noetig` ist die Breite, die die Zeile ungebrochen
     braeuchte: damit steht im Bericht gleich, um wie viel es fehlt. */
  const blaetter = [...document.querySelectorAll('#hud *')]
    .filter((el) => sichtbar(el) && !el.querySelector('*') && (el.textContent || '').trim().length > 1)
  const umbruch = []
  /* ⚠️ HOEHE GETEILT DURCH ZEILENHOEHE IST FALSCH. Der erste Anlauf rechnete so und
     meldete drei Umbrueche, die keine waren — "hat 157 px, braucht 153". Die Hoehe
     eines Kastens enthaelt sein Polster; eine einzeilige Zelle mit 8 px oben und unten
     sieht damit aus wie zwei Zeilen. Gezaehlt werden jetzt die echten Zeilenkaesten
     ueber einen Range: eine Textzeile ist ein Rechteck, zwei Zeilen sind zwei. */
  const zeilenZahl = (el) => {
    const rng = document.createRange()
    rng.selectNodeContents(el)
    const tops = new Set([...rng.getClientRects()]
      .filter((q) => q.width > 0.5 && q.height > 0.5).map((q) => Math.round(q.top)))
    return Math.max(1, tops.size)
  }
  for (const el of blaetter) {
    const b = el.getBoundingClientRect()
    const zeilen = zeilenZahl(el)
    if (zeilen < 2) continue
    const alt = el.style.whiteSpace
    el.style.whiteSpace = 'nowrap'
    const noetig = Math.ceil(el.scrollWidth)
    el.style.whiteSpace = alt
    umbruch.push({ ort: (el.parentElement && el.parentElement.id) || '#hud', zeilen,
                   ist: Math.round(b.width), noetig, txt: (el.textContent || '').trim().slice(0, 34) })
  }
  ueber.sort((p, q) => q.flaeche - p.flaeche)
  return { n: K.length, raus, klein, ueber: ueber.slice(0, 12), umbruch, alle: K }
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
const taeter = [...new Set(r.ueber.map((u) => u.wurzel))]
const sperre = r.ueber.length >= 3 && taeter.length === 1
if (sperre) {
  console.log(`ℹ️  Sperrschicht aktiv: "${taeter[0]}" faengt alle ${r.ueber.length} Bedienelemente ab.`)
  console.log('     Das ist gewollt (z. B. der Dreh-Hinweis in Hochkant) — kein Befund.')
} else {
  console.log(`${r.ueber.length ? '❌' : '✅'} Bedienelemente, deren Mitte ein FREMDES Element bekommt: ${r.ueber.length}`)
  r.ueber.forEach((u) => console.log(`     ${u.b.padEnd(18)} (${u.ox}x${u.oy}) → Tipp landet auf ${u.a}`))
}
console.log(`${r.umbruch.length ? '❌' : '✅'} Textzeilen, die umbrechen: ${r.umbruch.length}`)
r.umbruch.forEach((u) => console.log(`     ${u.ort.padEnd(12)} ${u.zeilen} Zeilen · hat ${u.ist} px, braucht ${u.noetig} px  „${u.txt}"`))
console.log(`JS-Fehler: ${jsFehler.length}`)
if (r.raus.length || (!sperre && r.ueber.length) || r.umbruch.length || jsFehler.length) fehlerGesamt++
await page.screenshot({ path: REPO + '/spiele-dev/screenshots/hud-' + B + 'x' + H + '.png' })
await browser.close()

}
console.log(`\n${fehlerGesamt === 0 ? '🎉 OBERFLAECHE BESTANDEN' : '💥 OBERFLAECHE FEHLGESCHLAGEN'} — ${FORMATE.length} Formate, ${fehlerGesamt} mit Befund`)
aufraeumen(tmp)
process.exit(fehlerGesamt === 0 ? 0 : 1)
