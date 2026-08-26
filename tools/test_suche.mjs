/* test_suche.mjs — prueft die Seitensuche (suchmaschine.html) im echten Browser.
 *
 * Kern: bis 2026-08-26 indexierte build_search_index.py nur ROOT/*.html — 293 deutsche
 * Seiten aus den Unterordnern waren nicht auffindbar. Dieser Test haelt genau das fest.
 *   node tools/test_suche.mjs
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
const PORT = 8123
spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: process.cwd(), detached: true, stdio: 'ignore' }).unref()
execSync('sleep 1.5')

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })  // Handy-Format
const fehler = []
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)))
await page.goto(`http://127.0.0.1:${PORT}/suchmaschine.html`, { waitUntil: 'networkidle' })

let ok = 0, fehl = 0
const check = (n, gut, d) => { console.log((gut ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : '')); gut ? ok++ : fehl++ }

const suche = async (q) => {
  await page.fill('#q', q)
  await page.waitForTimeout(320)
  return page.evaluate(() => ({
    treffer: [...document.querySelectorAll('.res')].map((a) => ({ u: a.getAttribute('href'), t: a.querySelector('.t').textContent })),
    zahl: document.querySelector('#cnt').textContent,
    chips: [...document.querySelectorAll('.chip')].map((c) => c.textContent.trim()),
  }))
}

const total = await page.textContent('#total')
check('Index geladen', +total > 1300, total + ' Seiten')

/* 1. Eine Seite, die es NUR im Unterordner /vergleich/ gibt */
const r1 = await suche('adcreative canva')
check('Vergleichsseite gefunden', r1.treffer.some((x) => x.u.startsWith('/vergleich/')), r1.treffer[0] ? r1.treffer[0].u : 'kein Treffer')

/* 2. Minispiel (Unterordner) */
const r2 = await suche('minispiel')
check('Minispiel gefunden', r2.treffer.some((x) => x.u.startsWith('/minispiele/')), r2.treffer.slice(0, 2).map((x) => x.u).join(', ') || 'kein Treffer')

/* 3. Markt-Seite (Unterordner). ⚠️ NICHT nach "markt" suchen: /maerkte/ sind
   AKTIEN-Seiten ("Alphabet (GOOGL) — Kurs, 30-Tage-Chart"), das Wort kommt dort
   zu Recht nicht vor. Der erste Anlauf dieses Tests pruefte genau das Falsche. */
const r3 = await suche('amazon kurs')
check('Aktien-Seite gefunden', r3.treffer.some((x) => x.u.startsWith('/maerkte/')), r3.treffer.slice(0, 2).map((x) => x.u).join(', ') || 'kein Treffer')

/* 4. Kategorie-Chips erscheinen und filtern */
const r4 = await suche('ki')
check('Filter-Chips erscheinen', r4.chips.length >= 3, r4.chips.slice(0, 5).join(' | '))
await page.click('.chip[data-k="vgl"]')
await page.waitForTimeout(150)
const nurVgl = await page.evaluate(() => [...document.querySelectorAll('.res')].map((a) => a.getAttribute('href')))
check('Filter „Vergleich" zeigt nur Vergleiche', nurVgl.length > 0 && nurVgl.every((u) => u.startsWith('/vergleich/')), nurVgl.length + ' Treffer')

/* 5. Badge sichtbar */
const badge = await page.evaluate(() => { const b = document.querySelector('.res .badge'); return b ? b.textContent : null })
check('Kategorie-Badge am Treffer', badge === 'Vergleich', String(badge))

/* 6. Slug-Treffer: Begriff steht nur in der URL, nicht zwingend im Titel */
const r6 = await suche('abwesenheitsnotiz')
check('Slug-Suche findet die Seite', r6.treffer.some((x) => x.u.includes('abwesenheitsnotiz')), r6.treffer[0] ? r6.treffer[0].u : 'kein Treffer')

/* 7. Filter-Sackgasse: Filter aktiv, neue Suche ohne diese Kategorie -> faellt auf Alle zurueck */
await page.click('.chip[data-k="vgl"]').catch(() => {})
const r7 = await suche('abwesenheitsnotiz')
check('Leerer Filter faellt auf „Alle" zurueck', r7.treffer.length > 0, r7.treffer.length + ' Treffer')

/* 8-10. 🇨🇭 Umlaut-Toleranz an EINER eindeutigen Seite. 1231 der 1396 Seiten haben
   Umlaute — ohne Faltung findet sie nur, wer sie auch tippt.
   ⚠️ Nicht auf "gleicher Top-Treffer" pruefen: bei "uber mich" ist /about.html
   ("Über mich") zu Recht vorn — der erste Anlauf dieses Tests wertete das als Fehler. */
const ZIEL = '/ueberwachungskamera-kaufen-schweiz.html'
for (const schreibweise of ['überwachungskamera', 'ueberwachungskamera', 'uberwachungskamera']) {
  const r = await suche(schreibweise)
  check(`„${schreibweise}" findet die Seite`, r.treffer.some((x) => x.u === ZIEL),
    r.treffer[0] ? r.treffer[0].u : 'kein Treffer')
}

/* ── 🌍 SPRACHSUCHEN (en/fr/it) ─────────────────────────────────────────
   Bis 2026-08-26 hatten die 1233 uebersetzten Seiten gar keine Suche. Jede
   Sprachseite muss ihren EIGENEN Index laden — ein deutscher Treffer auf /fr/
   waere fuer beide Seiten Rauschen. */
const SPRACHEN = [
  { code: 'en', datei: '/en/search.html', wort: 'prompt', knopf: 'Search', min: 400 },
  { code: 'fr', datei: '/fr/recherche.html', wort: 'prompt', knopf: 'Chercher', min: 350 },
  { code: 'it', datei: '/it/ricerca.html', wort: 'prompt', knopf: 'Cerca', min: 350 },
]
for (const S of SPRACHEN) {
  await page.goto(`http://127.0.0.1:${PORT}${S.datei}`, { waitUntil: 'networkidle' })
  const lang = await page.getAttribute('html', 'lang')
  const tot = +(await page.textContent('#total'))
  check(`${S.code}: Seite laedt eigenen Index`, lang === S.code && tot >= S.min, `lang=${lang}, ${tot} Seiten`)
  check(`${S.code}: Knopf uebersetzt`, (await page.textContent('#go')).trim() === S.knopf, await page.textContent('#go'))
  await page.fill('#q', S.wort)
  await page.waitForTimeout(320)
  const t = await page.evaluate(() => [...document.querySelectorAll('.res')].map((a) => a.getAttribute('href')))
  check(`${S.code}: findet Treffer`, t.length > 0, t.length + ' Treffer')
  check(`${S.code}: nur Seiten dieser Sprache`, t.length > 0 && t.every((u) => u.startsWith('/' + S.code + '/')),
    t.filter((u) => !u.startsWith('/' + S.code + '/')).slice(0, 2).join(', ') || 'alle korrekt')
  const wechsel = await page.evaluate(() => [...document.querySelectorAll('.lnk a')].map((a) => a.getAttribute('href')))
  check(`${S.code}: Sprachumschalter vollstaendig`,
    ['/suchmaschine.html', '/en/search.html', '/fr/recherche.html', '/it/ricerca.html']
      .filter((u) => u !== S.datei).every((u) => wechsel.includes(u)), wechsel.join(' '))
}

/* ── Synonyme: der ausgeschriebene Begriff muss finden, was die Seiten abkuerzen.
   GEMESSEN vor dem Einbau: „intelligence" auf /fr/ = 0 Treffer, obwohl 374 der
   380 Seiten davon handeln (sie schreiben „IA"). Dasselbe fuer EN/DE. */
const SYNTEST = [
  { datei: '/fr/recherche.html', wort: 'intelligence artificielle', min: 100 },
  { datei: '/en/search.html', wort: 'artificial intelligence', min: 100 },
  { datei: '/suchmaschine.html', wort: 'künstliche intelligenz', min: 100 },
]
for (const T of SYNTEST) {
  await page.goto(`http://127.0.0.1:${PORT}${T.datei}`, { waitUntil: 'networkidle' })
  await page.fill('#q', T.wort)
  await page.waitForTimeout(320)
  const n = await page.evaluate(() => document.querySelectorAll('.res').length)
  const zahl = await page.textContent('#cnt')
  check(`Synonym „${T.wort}" findet Seiten`, n > 0, zahl.trim() || '0 Treffer')
}

/* ── Beschreibungen: der Apostroph-Bug im Index-Generator schnitt 364 von 380
   franzoesischen und 364 von 377 italienischen Beschreibungen auf "L" zusammen —
   genau der Text, auf dem die neue Sprachsuche sucht. */
for (const sprache of ['fr', 'it', 'en']) {
  /* ⚠️ IDX liegt im Modul-Scope der Seite und ist von aussen NICHT sichtbar —
     der erste Anlauf las es per page.evaluate und starb. Die Index-Datei selbst
     ist ein statisches JSON und die ehrlichere Quelle. */
  const idx = await page.evaluate((s) => fetch('/data/site-index-' + s + '.json').then((r) => r.json()), sprache)
  const kurz = idx.filter((x) => (x.d || '').length < 20).length
  check(`${sprache}: keine abgeschnittenen Beschreibungen`, kurz === 0, `${kurz} zu kurz von ${idx.length}`)
}

check('0 JS-Fehler', fehler.length === 0, fehler.join(' | '))
console.log(`\n${fehl === 0 ? '🎉 SUCHE BESTANDEN' : '💥 SUCHE FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
process.exit(fehl === 0 ? 0 : 1)
