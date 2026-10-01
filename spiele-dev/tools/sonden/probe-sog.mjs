/* Sonde (Runde 103): wie lange traegt das Spiel — die Sog-Kurve.
   Anlass: User „handy spiel optimieren, gutes langes suechtiges spiel draus machen". Bevor etwas
   geaendert wird, muss messbar sein, WANN der Spieler was bekommt und ab wann NICHTS Neues mehr
   kommt. Die Sonde liest jede Formel aus traumhaus.html (Regex auf die Quellzeile — nicht
   abgeschrieben; fehlt eine Zeile, bricht sie ab statt zu raten) und spielt damit N Spieltage
   fuer zwei Spielertypen durch:
     gemuetlich: Mia arbeitet, 2 Lieferungen, 1 Angelrunde, 2 Gespraeche, baut den Rest der Zeit
     aktiv:      4 Lieferungen, 2 Taxifahrten, 1 Angelrunde, 3 Gespraeche, alle 3 Missionen
   Ein Spieltag dauert 1440/4 = 360 s echt (uhrzeit+=dt*4). Jede Taetigkeit kostet echte
   Sekunden; der Tag ist voll, wenn 360 s verbraucht sind. Ausgaben: erst Moebel bis zur
   naechsten Wohnstufe (Hauswert = Moebelkosten 1:1), dann Haeuser (Miete), dann Autos.
   Gemeldet: Tag/Minute je Wohnstufe, je Auto, je Haus, Tag der letzten Freischaltung
   (Horizont), Tage ohne Neues, und was Stufe 4/5 ueberhaupt freischalten.
   Gegenprobe: mit doppeltem Einkommen muessen die Stufen frueher kommen, und nie vor dem
   4-Tage-Takt der Abnahme (Palast fruehestens Tag 20).
   Seit Runde 103 kennt die Sonde auch Buergerrang (Punkte-Formel aus der Quelle, Praemie, +% je Rang), Haus-Ausbau,
   Entdecker-Album (Orte je Tag: Annahme 1 gemuetlich / 2 aktiv) und die Rueckkehr-Belohnung (eine Sitzung je
   3 Spieltage, 12 h Pause). Erfolge je Tag sind eine Annahme (6+0,8/Tag aktiv, 5+0,5/Tag gemuetlich, gedeckelt).
   Runde 104: Stufen ab 6 und Raenge ab 9 kommen aus den Erzeugerfunktionen der Quelle (stufeDaten, rangSchwelle,
   rangDaten — als Funktionsrumpf uebernommen), Stufe ≥ 6 misst das Vermoegen (Hauswert + Haeuser + Ausbauten),
   Ausbau bis IMMO_LV_MAX, Punkte auch aus dem Gesamtverdienst. Standard sind jetzt 365 Tage (36,5 h).
   Aufruf: node spiele-dev/tools/sonden/probe-sog.mjs [tage=365] */
import { readFileSync } from 'node:fs'
const TAGE = +(process.argv[2] || 365)
const src = readFileSync('traumhaus.html', 'utf8')
const zeile = (re, was) => { const m = src.match(re); if (!m) throw new Error('Formel nicht gefunden: ' + was); return m }
/* Klammer-Abgleich statt "naechstes ];" — NPC_AUFTRAEGE schliesst auf derselben Zeile wie das letzte Element. */
const block = (start, was) => { const i = src.indexOf(start); if (i < 0) throw new Error("Block nicht gefunden: " + was)
  let k = i + start.length - 1, tiefe = 0, inStr = null, inKom = null
  for (; k < src.length; k++) { const c = src[k], n = src[k + 1]
    if (inKom === "/*") { if (c === "*" && n === "/") { inKom = null; k++ } continue }
    if (inKom === "//") { if (c === "\n") inKom = null; continue }
    if (inStr) { if (c === "\\") { k++; continue } if (c === inStr) inStr = null; continue }
    if (c === "/" && n === "*") { inKom = "/*"; k++; continue } if (c === "/" && n === "/") { inKom = "//"; k++; continue }
    if (c === "\"" || c === "'" || c === "`") { inStr = c; continue }
    if (c === "[" || c === "{" || c === "(") tiefe++
    else if (c === "]" || c === "}" || c === ")") { tiefe--; if (tiefe === 0) return src.slice(i + start.length - 1, k + 1) } }
  throw new Error("Block ohne Ende: " + was) }

/* ---- Konstanten aus der Quelle ---- */
const WOHNSTUFEN = new Function('return ' + block('var WOHNSTUFEN=[', 'WOHNSTUFEN'))()
const ACH_N = block('var ACH=[', 'ACH').split('\n').filter((l) => /^\s*\["/.test(l)).length
const MISS_N = block('var MISS_POOL=[', 'MISS_POOL').split('\n').filter((l) => /^\s*\["/.test(l)).length
const QUESTS = new Function('var furn=[],stats={},skills={arbeit:{}},window={};return ' + block('var QUESTS=[', 'QUESTS'))()
const PQ = new Function('var stats={},furn=[];function hausWert(){return 0}var geld=0;return ' + block('var PQ_TPL=[', 'PQ_TPL'))()
const KAT = [...src.matchAll(/^\s*\{id:"(\w+)",n:"([^"]*)",e:"[^"]*",cost:(\d+)(?:,stufe:(\d))?(?:[^}\n]*?car:1)?/gm)]
  .map((m) => ({ id: m[1], n: m[2], cost: +m[3], stufe: m[4] ? +m[4] : 0, car: /car:1/.test(m[0]) }))
const START = +zeile(/var geld=(\d+),tag=1/, 'Startgeld')[1]
const UHR = +zeile(/uhrzeit\+=dt\*(\d+)/, 'Uhr-Takt')[1]; const TAG_S = 1440 / UHR
const TAKT = +zeile(/naechsteAbnahme=(\d)/, 'Abnahme-Takt')[1]
const _sb = zeile(/function stufenBonus\(\)\{return \(1\+wohnstufe\*([\d.]+)\+([\d.]+)\*rangIdx\(rangPunkte\(\)\)\)/, 'stufenBonus')
const bonusF = (wohnstufe, rang) => 1 + wohnstufe * +_sb[1] + rang * +_sb[2]
const RAENGE = new Function('return ' + block('var RAENGE=[', 'RAENGE'))()
const RANG_PRAEMIE = +zeile(/pr\+=Math\.round\((\d+)\*k\*modusFaktor\(\)\)/, 'Rang-Praemie')[1]
/* Punkte-Formel: der Funktionsrumpf aus der Quelle, mit den Spielvariablen als Parameter */
const _rpSrc = block('function rangPunkte(){', 'rangPunkte')
const rangPunkteF = new Function('stats', 'achDone', 'immo', 'skills', 'wohnstufe', 'missSerie', _rpSrc.slice(1, -1).replace(/typeof immo!=="undefined"\?immo\.length:0/, 'immo.length'))
const immoWertS = (immoLv) => immoLv.reduce((w, l, i) => w + HAUS_PREISE[i % HAUS_PREISE.length] * (1 + 1.5 * (Math.pow(2, l - 1) - 1)), 0)
const _fnSrc = (name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) throw new Error('Funktion fehlt: ' + name); const k = src.indexOf('{', i); let t = 0, j = k; for (; j < src.length; j++) { if (src[j] === '{') t++; else if (src[j] === '}') { t--; if (t === 0) break } } return src.slice(i, j + 1) }
const _erz = new Function('WOHNSTUFEN', 'RAENGE', 'STUFEN_MEHR', [_fnSrc('roemisch'), _fnSrc('stufeDaten'), _fnSrc('rangSchwelle'), _fnSrc('rangDaten')].join('\n') + '; return { stufeDaten, rangSchwelle, rangDaten }')(WOHNSTUFEN, RAENGE, new Function('return ' + block('var STUFEN_MEHR=[', 'STUFEN_MEHR'))())
const stufeDaten = _erz.stufeDaten, rangSchwelle = _erz.rangSchwelle, rangDaten = _erz.rangDaten
const rangIdxF = (p) => { let i = 0; while (i < 400 && p >= rangSchwelle(i + 1)) i++; return i }
const _af = zeile(/hs\.preis\*([\d.]+)\*Math\.pow\(([\d.]+),\(immoLv\[i\]\|\|1\)-1\)/, 'Ausbau-Preis')
const AUSBAU_F = +_af[1], AUSBAU_POW = +_af[2], ausbauPreis = (preis, lv) => Math.round(preis * AUSBAU_F * Math.pow(AUSBAU_POW, lv - 1))
const AUSBAU_MIETE = +zeile(/m\+=150\*\(1\+([\d.]+)\*\(\(immoLv\[i\]\|\|1\)-1\)\)/, 'Ausbau-Miete')[1]
const LV_MAX = +zeile(/IMMO_LV_MAX=(\d+)/, 'IMMO_LV_MAX')[1]   /* (\d+): mit (\d) las die Sonde aus „12“ eine 1 — kein Ausbau, Stufenleiter tot ab 6 (Runde 104, erster Lauf) */
const ORT_LOHN = +zeile(/var pr=Math\.round\((\d+)\*stufenBonus\(\)\);verdiene\(pr,false\)/, 'Orte-Lohn')[1]
const ORTE_N = new Function('return ' + block('var WORLD_POIS=[', 'WORLD_POIS'))().length + 1 /* + "Dein Grundstueck" (push) */
const _rk = zeile(/ertrag=Math\.round\(\((\d+)\+immoMiete\(\)\*([\d.]+)\)\*hst\*stufenBonus\(\)\)/, 'Rueckkehr')
const RUECK = { basis: +_rk[1], mieteAnteil: +_rk[2], maxH: +zeile(/var hst=Math\.min\(wegH,(\d+)\)/, 'Rueckkehr-Deckel')[1] }
const arbeitF = new Function('lv', 'return ' + zeile(/var lohn=(2\*\(100\+skills\.arbeit\.lv\*40\))/, 'Arbeit')[1].replace('skills.arbeit.lv', 'lv'))
const liefF = new Function('t', 'weg', 'bonus', 'sb', 'return ' + zeile(/var lohn=(\(\(40\+liefer\.t\*[\d.]+\+\(liefer\.weg\|\|0\)\*[\d.]+\)\*bonus\*stufenBonus\(\)\)\|0)/, 'Lieferung')[1].replace(/liefer\.t/g, 't').replace(/\(liefer\.weg\|\|0\)/g, 'weg').replace('stufenBonus()', 'sb'))
const taxiF = new Function('weg', 't', 'sb', 'var fp=' + zeile(/fp=(Math\.round\(\(25\+TAXI\.weg\*[\d.]+\)\*stufenBonus\(\)\))/, 'Taxi')[1].replace('TAXI.weg', 'weg').replace('stufenBonus()', 'sb') + ';var tg=' + zeile(/tg=(Math\.round\(Math\.max\(0,TAXI\.t\)\*[\d.]+\))/, 'Trinkgeld')[1].replace('TAXI.t', 't') + ';return fp+tg')
const TAXI_MAX = +zeile(/var TAXI_MAX=(\d+)/, 'TAXI_MAX')[1], TAXI_MIETE = +zeile(/TAXI_MIETE=(\d+)/, 'TAXI_MIETE')[1]
const LIEF_MAX = +zeile(/_liefHeute\|\|0\)>=(\d)\)/, 'Lieferdeckel')[1]
const FISCHE = new Function('return ' + zeile(/var FISCHE=(\[\[.*?\]\]);/, 'FISCHE')[1])()
const NPC = new Function('return ' + block('var NPC_AUFTRAEGE=[', 'NPC_AUFTRAEGE'))()
const MISS_LOHN = +zeile(/verdiene\((\d+)\);gtaBanner\("Auftrag erledigt"/, 'Missionslohn')[1]
const missBonusF = new Function('serie', 'return ' + zeile(/var bs=(250\+Math\.min\(500,missSerie\*50\))/, 'Missionsbonus')[1].replace('missSerie', 'serie'))
const streakF = new Function('n', 'return ' + zeile(/var bon8=(Math\.min\(40\*n8,280\))/, 'Treue-Bonus')[1].replace('n8', 'n'))
const MIETE = +zeile(/m\+=(\d+)\*\(1\+[\d.]+\*\(\(immoLv\[i\]\|\|1\)-1\)\)/, 'Miete')[1] /* Grundmiete je Haus und Tag (immoMiete) */
const komboMax = new Function('return ' + zeile(/function komboMult\(\)\{return (1\+Math\.min\(KOMBO\.n,12\)\*[\d.]+)/, 'Kombo')[1].replace('KOMBO.n', '12'))()
const ernteF = new Function('lv', 'sb', 'return ' + zeile(/ertrag=(Math\.round\(\(35\+skills\.arbeit\.lv\*8\)\*stufenBonus\(\)\))/, 'Ernte')[1].replace('skills.arbeit.lv', 'lv').replace('stufenBonus()', 'sb'))
const xpNeed = new Function('lv', 'return ' + zeile(/var need=(sk\.lv\*\d+)/, 'XP')[1].replace('sk.lv', 'lv'))
const HAUS_PREISE = [1800, 2400, 3000, 3600, 4200] /* Quelle: preis:1800+(seed%5)*600 */
zeile(/preis:1800\+\(seed%5\)\*600/, 'Hauspreis')
const IMMO_N = [...src.matchAll(/\[([^\]]+)\]\.forEach\(function\(\w+\)\{haus\(/g)].reduce((n, m) => n + m[1].split(",").length, 0) /* jeder haus()-Aufruf im Dorf ist ein kaufbares Haus (window._immo): drei Reihen a 7/4/4 */
const KOMBO_MITTEL = 1.25 /* Annahme: aktives Spiel haelt im Schnitt x1,25 der bis x2,5 moeglichen Kette */

const CARS = KAT.filter((k) => k.car).sort((a, b) => a.cost - b.cost)
const GATED = KAT.filter((k) => k.stufe > 0)
const fischMittel = FISCHE.reduce((s, f) => s + f[1], 0) / FISCHE.length
const npcMittel = NPC.reduce((s, a) => s + a[1], 0) / NPC.length

/* ---- Taetigkeiten: echte Sekunden je Stueck (Annahmen, im Runbook begruendet) ---- */
const SEK = { lief: 50, taxi: 60, angeln: 40, npc: 12 }
const PROFILE = {
  gemuetlich: { lief: 2, taxi: 0, angeln: 1, npc: 2, missQuote: 0.6, orte: 1, ach0: 5, achTag: 0.5 },
  aktiv: { lief: LIEF_MAX, taxi: 2, angeln: 1, npc: 3, missQuote: 1.0, orte: 2, ach0: 6, achTag: 0.8 },
}

function simuliere(name, prof, faktor = 1) {
  const immoMieteS = () => immoLv.reduce((m, l) => m + MIETE * (1 + AUSBAU_MIETE * (l - 1)), 0)
  let geld = START, hausWert = 0, stufe = 0, lv = 1, xp = 0, serie = 0, immo = 0, tagRealSess = 0
  const autos = [], ereignisse = [], tageOhne = [], immoLv = []
  let questIdx = 0, fische = 0, lief = 0, nextAbnahme = TAKT, orte = 0, quests = 0, abnahmen = 0, rangGezahlt = 0, rang = 0, verdient = 0
  const punkte = (tag) => rangPunkteF({ quests, orte: new Array(orte), immoAusbau: immoLv.reduce((a, l) => a + (l - 1), 0), abnahmen, verdient }, Object.fromEntries(new Array(Math.min(ACH_N, Math.round(prof.ach0 + prof.achTag * tag))).fill(0).map((_, i) => ['a' + i, 1])), new Array(immo), { arbeit: { lv } }, stufe, serie)
  for (let tag = 1; tag <= TAGE; tag++) {
    const neu = []
    rang = rangIdxF(punkte(tag)); const sb = bonusF(stufe, rang)
    let zeit = TAG_S, einn = 0
    /* Orte entdecken (unterwegs, kostet keine eigene Zeit) */
    for (let i = 0; i < prof.orte && orte < ORTE_N; i++) { orte++; einn += ORT_LOHN * sb; if (orte % 5 === 0 || orte === ORTE_N) neu.push('Orte ' + orte + '/' + ORTE_N) }
    /* Mia arbeitet automatisch */
    einn += Math.round(arbeitF(lv) * sb); xp += 1; if (xp >= xpNeed(lv)) { xp -= xpNeed(lv); lv++; neu.push('Karriere Lv' + lv) }
    /* Lieferungen (Mittel der neun Ziele: t≈38 s Rest, weg≈200 m — Kommentar Z.15330: Mittel 185 $) */
    for (let i = 0; i < prof.lief && zeit >= SEK.lief; i++) { zeit -= SEK.lief; einn += liefF(38, 200, 1, sb) * KOMBO_MITTEL; lief++ }
    for (let i = 0; i < Math.min(prof.taxi, TAXI_MAX) && zeit >= SEK.taxi; i++) { zeit -= SEK.taxi; einn += taxiF(220, 30, sb) * KOMBO_MITTEL - TAXI_MIETE }
    for (let i = 0; i < prof.angeln && zeit >= SEK.angeln; i++) { zeit -= SEK.angeln; einn += 3 * fischMittel * sb * KOMBO_MITTEL; fische += 3 }
    for (let i = 0; i < prof.npc && zeit >= SEK.npc; i++) { zeit -= SEK.npc; einn += 0.35 * npcMittel * sb }
    /* Missionen: 3/Tag je MISS_LOHN, alle drei = Bonus + Serie */
    const missDone = Math.round(3 * prof.missQuote); einn += missDone * MISS_LOHN
    if (missDone === 3) { einn += missBonusF(serie); serie++ } else serie = 0
    /* Treue-Bonus: eine echte Sitzung ≈ 3 Spieltage (18 min) */
    if (tag % 3 === 1) { tagRealSess++; einn += streakF(tagRealSess); if (tagRealSess > 1) einn += Math.round((RUECK.basis + immoMieteS() * RUECK.mieteAnteil) * RUECK.maxH * sb) }
    einn += Math.round(immoMieteS() * sb)
    geld += Math.round(einn * faktor); verdient += Math.round(einn * faktor)
    /* Stadt-Auftraege (feste Liste, dann endlos) */
    if (questIdx < QUESTS.length) {
      const q = QUESTS[questIdx]; let ok = false
      if (q[0] === 'pool' && hausWert >= 520) ok = true
      if (q[0] === 'beete' && hausWert >= 800) ok = true
      if (q[0] === 'fische' && fische >= 3) ok = true
      if (q[0] === 'auto' && autos.length) ok = true
      if (q[0] === 'hochzeit' && tag >= 8) ok = true
      if (q[0] === 'karriere' && lv >= 3) ok = true
      if (q[0] === 'villa' && hausWert >= 8000) ok = true
      if (ok) { geld += q[3]; neu.push('Auftrag „' + q[2] + '" +' + q[3]); questIdx++; quests++ }
    } else if (tag % 3 === 0) { const n = questIdx - QUESTS.length; const t = PQ[n % PQ.length](n, { fische: 0, furn: 0, grow: 0, mv: 0, stunts: 0, liefer: 0, verm: 0 }); geld += t.rw; questIdx++; quests++; if (n < 2) neu.push('Endlos-Auftrag ' + (n + 1) + ' +' + t.rw) }
    /* Ausgaben: Moebel bis zur naechsten Stufe, dann Haeuser, dann Autos */
    const ziel = stufeDaten(stufe + 1)
    if (ziel[5] !== 'vermoegen' && hausWert < ziel[1]) { const k = Math.min(geld - 100, ziel[1] - hausWert); if (k > 0) { geld -= k; hausWert += k } }
    else {
      const hp = HAUS_PREISE[immo % HAUS_PREISE.length]
      /* naechster Ausbau = der billigste (niedrigste Stufe, guenstigstes Haus) — nicht Haus 1 bis 12 durchziehen, waehrend 14 Haeuser auf Stufe 1 stehen */
      let ab = -1, abP = Infinity; immoLv.forEach((l, i) => { if (l < LV_MAX) { const p = ausbauPreis(HAUS_PREISE[i % HAUS_PREISE.length], l); if (p < abP) { abP = p; ab = i } } })
      if (immo < IMMO_N && geld - 100 >= hp) { geld -= hp; immo++; immoLv.push(1); neu.push('Haus ' + immo + ' (' + hp + ')') }
      else if (ab >= 0 && geld - 100 >= ausbauPreis(HAUS_PREISE[ab % HAUS_PREISE.length], immoLv[ab])) { geld -= ausbauPreis(HAUS_PREISE[ab % HAUS_PREISE.length], immoLv[ab]); immoLv[ab]++; neu.push('Ausbau Haus ' + (ab + 1) + ' → ' + immoLv[ab]) }
      else { const c = CARS.find((a) => !autos.includes(a.id) && (a.stufe <= stufe) && geld - 100 >= a.cost); if (c) { geld -= c.cost; autos.push(c.id); hausWert += c.cost; neu.push('Auto ' + c.n) } }
    }
    /* Abnahme alle TAKT Tage */
    if (tag >= nextAbnahme) { nextAbnahme = tag + TAKT
      const zn = stufeDaten(stufe + 1), wert = zn[5] === 'vermoegen' ? hausWert + immoWertS(immoLv) : hausWert
      if (wert >= zn[1]) { stufe++; abnahmen++; geld += zn[4]; neu.push('STUFE ' + stufe + ' ' + zn[0].trim() + ' (' + (zn[5] === 'vermoegen' ? 'Vermögen ' : '') + zn[1] + ', +' + zn[4] + ')')
        GATED.filter((g) => g.stufe === stufe).forEach((g) => neu.push('frei: ' + g.n)) } }
    const ri = rangIdxF(punkte(tag)); if (ri > rangGezahlt) { rangGezahlt = ri; geld += RANG_PRAEMIE * ri; neu.push('RANG ' + rangDaten(ri)[0] + ' ' + rangDaten(ri)[1] + ' (' + rangSchwelle(ri) + ' Pkt, +' + RANG_PRAEMIE * ri + ', +' + Math.round(ri * _sb[2] * 100) + ' %)') }
    if (neu.length) ereignisse.push({ tag, min: Math.round(tag * TAG_S / 60), geld, hausWert, stufe, rang: ri, neu })
    else tageOhne.push(tag)
  }
  return { name, ereignisse, tageOhne, stufe, geld, hausWert, immo, autos, orte, rang: rangGezahlt, punkte: punkte(TAGE) }
}

const pad = (s, n) => String(s).padEnd(n)
console.log(`Quelle: Start ${START} $ · Spieltag ${TAG_S} s echt · Abnahme alle ${TAKT} Tage · ${WOHNSTUFEN.length - 1} Stufen · ${RAENGE.length} Raenge (Praemie ${RANG_PRAEMIE}·i, +${Math.round(_sb[2] * 100)} %/Rang) · ${ORTE_N} Orte (je ${ORT_LOHN} $) · Ausbau bis Stufe ${LV_MAX} (Preis ×${AUSBAU_F}·${AUSBAU_POW}^Stufe, Miete +${Math.round(AUSBAU_MIETE * 100)} %/Stufe) · Rueckkehr ${RUECK.basis}+Miete×${RUECK.mieteAnteil} je h, max ${RUECK.maxH} h · ${KAT.length} Katalog-Eintraege (${CARS.length} Autos, ${GATED.length} stufen-gebunden) · ${ACH_N} Erfolge · ${MISS_N} Tagesmissionen · ${QUESTS.length} feste + ${PQ.length} Endlos-Auftragsvorlagen · ${IMMO_N} kaufbare Haeuser (${HAUS_PREISE.join('/')} $, Miete ${MIETE}/Tag) · Kombo max x${komboMax}`)
console.log('Stufen-gebunden: ' + GATED.map((g) => `${g.n} (Stufe ${g.stufe}, ${g.cost} $)`).join(' · '))
console.log('Freischaltungen je Stufe: ' + [1, 2, 3, 4, 5].map((s) => `S${s}=${GATED.filter((g) => g.stufe === s).length}`).join(' '))
for (const [name, prof] of Object.entries(PROFILE)) {
  const r = simuliere(name, prof)
  console.log(`\n=== ${name.toUpperCase()} (${TAGE} Tage = ${Math.round(TAGE * TAG_S / 60)} min) ===`)
  for (const e of r.ereignisse) console.log(`  Tag ${pad(e.tag, 3)} ${pad(e.min + ' min', 8)} Geld ${pad(e.geld, 6)} Haus ${pad(e.hausWert, 6)} S${e.stufe} R${e.rang}  ${e.neu.join(' · ')}`)
  const letzte = r.ereignisse.length ? r.ereignisse[r.ereignisse.length - 1] : null
  const stufenTage = [1, 3, 5, 6, 8, 10, 12].map((s) => { const e = r.ereignisse.find((x) => x.neu.some((n) => n.startsWith('STUFE ' + s))); return `S${s}: ${e ? e.tag + ' (' + e.min + ' min)' : '—'}` })
  console.log(`  Stufen: ${stufenTage.join(' · ')}`)
  console.log(`  Ende: Stufe ${r.stufe} ${stufeDaten(r.stufe)[0]}, Rang ${r.rang} ${rangDaten(r.rang)[1]} (${r.punkte} Pkt), ${r.geld} $ Bargeld, Hauswert ${r.hausWert}, ${r.immo}/${IMMO_N} Haeuser, ${r.autos.length}/${CARS.length} Autos, ${r.orte}/${ORTE_N} Orte`)
  console.log(`  Tage ohne Neues: ${r.tageOhne.length} von ${TAGE}` + (r.tageOhne.length ? ` (erster: ${r.tageOhne[0]}, laengste Luecke: ${(() => { let best = 0, cur = 0, prev = 0; for (const t of r.tageOhne) { cur = t === prev + 1 ? cur + 1 : 1; prev = t; best = Math.max(best, cur) } return best })()} Tage)` : ''))
  console.log(`  Horizont (letzter Neuzugang): Tag ${letzte ? letzte.tag + ' = ' + letzte.min + ' min' : '—'}`)
  const je30 = []; for (let a = 1; a <= TAGE; a += 30) je30.push(r.ereignisse.filter((e) => e.tag >= a && e.tag < a + 30).length); console.log(`  Ereignis-Tage je 30 Tage: ${je30.join(' · ')}`)
  const spaet = r.ereignisse.filter((e) => e.tag > TAGE / 2); console.log(`  Zweite Haelfte (Tag ${Math.floor(TAGE / 2) + 1}–${TAGE}): ${spaet.length} Ereignis-Tage, davon Stufen ${spaet.filter((e) => e.neu.some((n) => n.startsWith('STUFE'))).length}, Raenge ${spaet.filter((e) => e.neu.some((n) => n.startsWith('RANG'))).length}, Ausbauten ${spaet.filter((e) => e.neu.some((n) => n.startsWith('Ausbau'))).length}`)
}
/* Gegenprobe */
const a = simuliere('aktiv', PROFILE.aktiv), b = simuliere('aktiv x2', PROFILE.aktiv, 2)
const tagS = (r, s) => { const e = r.ereignisse.find((x) => x.neu.some((n) => n.startsWith('STUFE ' + s))); return e ? e.tag : 999 }
const frueher = [2, 3, 4, 5].every((s) => tagS(b, s) <= tagS(a, s)), takt = tagS(b, 5) >= 5 * TAKT
console.log(`\nGegenprobe: doppeltes Einkommen → Stufen nie spaeter (${frueher ? '✓' : '✗'}) · Palast nie vor Tag ${5 * TAKT} (${takt ? '✓' : '✗'}, ist Tag ${tagS(b, 5)})`)
