// Test für kombi.mjs, texte_ersetzungen.mjs und den gemeinsamen Soll-Stand (zwölf Dateien). Kein Netz, kein Shopify.
//   node dropship/katalog-fenster-0611/kombi_test.mjs
// Prüft: Ausgangsstand (MD5), Pinnen der Datenquellen, Übertragung der 22 Ersetzungen von (B) (treu zu patch_bauen.py und zu theme/* des Pakets), jede Ersetzung genau einmal (fehlt/doppelt -> Fehler mit
// Dateiname und Nummer), die eine Kollision, beide Marken, keine verlorene Zeile von (A) oder (B), JS-Syntax, Sprachdateien (JSON gültig, keine doppelten Schlüssel, nur die erwarteten Unterschiede), die Texte-Datei,
// Liquid mit dem echten Ruby-Liquid (Sektion mit Labels, Manifest und textsAsset), Soll-Stand gegen daten/pruefstand.json und ziel/.
// PRUEFSUMME_IGNORIEREN=1 überspringt den Vergleich mit daten/pruefstand.json und ziel/ (nur für die Mutationsprobe: sie soll am Verhalten erkannt werden). OHNE_LIQUID=1 überspringt den Ruby-Teil.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import * as A from '../katalog-nur-bestellbar-0511/patches.mjs';
import { rendere, flach, sprachJson, SNIPPET_ATTRAPPEN, rubyLiquidGems } from '../katalog-nur-bestellbar-0511/liquid_helfer.mjs';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, MARKE, MARKE_TEXTE, MARKEN, DATEN_MD5, KOLLISION, TEXTE, NEUE_SCHLUESSEL_A, NEUE_SCHLUESSEL_B, anwendenKombi, anwendenTexte, lesenDaten, einmal } from './kombi.mjs';
import { TEXTE_PAARE, TEXTE_QUELLE, TEXTE_SCHLUESSEL } from './texte_ersetzungen.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const B_ORDNER = HIER + '../katalog-texte-de-0611/';
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const kurz = (w) => { const s = JSON.stringify(w) ?? 'undefined'; return s.length > 300 ? s.slice(0, 300) + '…' : s; };
// Objekte mit sortierten Schlüsseln vergleichen (die Reihenfolge der Schlüssel in der Sprachdatei ist ohne Bedeutung)
const sortiert = (w) => (Array.isArray(w) ? w.map(sortiert) : w && typeof w === 'object' ? Object.fromEntries(Object.keys(w).sort().map((k) => [k, sortiert(w[k])])) : w);
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${kurz(ist)}, soll ${kurz(soll)}`);
const gleichObj = (ist, soll, text) => ok(JSON.stringify(sortiert(ist)) === JSON.stringify(sortiert(soll)), `${text}: Abweichung bei ${Object.keys({ ...ist, ...soll }).filter((k) => JSON.stringify(sortiert(ist?.[k])) !== JSON.stringify(sortiert(soll?.[k]))).slice(0, 6).join(', ')}`);
const wirft = (fn, muster, text) => { try { fn(); ok(false, `${text}: warf nicht`); } catch (e) { ok(muster.test(e.message), `${text}: falsche Meldung «${e.message}»`); } };

const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];
const dateiName = (f) => f.replace('/', '__');
const sich = Object.fromEntries(ALT.map((f) => [f, readFileSync(HIER + 'sicherung/' + dateiName(f) + '.vor', 'utf8')]));
const daten = lesenDaten();
const aDaten = { ausblenden: daten.ausblenden, karte: daten.karte };
const soll = anwendenKombi(sich, daten);
const nurA = A.anwenden(sich, aDaten);
const zeilen = (t) => t.split('\n');
const zeilenNeu = (neu, alt) => { const m = new Set(zeilen(alt)); return zeilen(neu).filter((z) => !m.has(z)); };

// ---------- 1. Ausgangsstand, Datenquellen, Determinismus, Prüfstand ----------
ok(ALT.every((f) => md5(sich[f]) === MD5_VOR[f]), 'Sicherung gleich MD5_VOR (alle neun Dateien)');
ok(ALT.every((f) => md5(sich[f]) === A.MD5_VOR[f]), 'MD5_VOR gleich dem von (A)');
for (const f of ['assets/luxe-clothing.js', 'locales/de.json', 'locales/en.default.json', 'sections/luxe-clothing.liquid']) {
  const orig = readFileSync(B_ORDNER + 'theme/' + dateiName(f) + '.orig', 'utf8');
  ok(md5(orig) === MD5_VOR[f] && orig === sich[f], `Ausgangsstand von (B) (${f}.orig) byte-gleich der Sicherung`);
}
gleich(DATEN_MD5, { ausblenden: md5(readFileSync(HIER + '../katalog-nur-bestellbar-0511/daten/ausblenden-quelle.json', 'utf8')), karte: md5(daten.karte), texte: md5(daten.texte) }, 'Datenquellen gleich den gepinnten Prüfsummen');
ok(md5(daten.texte) === '86cbb8664cddc2e10a3ead2297bc9482', 'Texte-Datei unverändert (md5 86cbb866…)');
gleich(Object.keys(soll).sort(), ALLE.slice().sort(), 'anwendenKombi liefert zwölf Dateien');
gleich(Object.fromEntries(Object.entries(anwendenKombi(sich, daten)).map(([k, v]) => [k, md5(v)])), Object.fromEntries(Object.entries(soll).map(([k, v]) => [k, md5(v)])), 'anwendenKombi ist deterministisch');
gleich(NEU, ['assets/luxe-clothing-ausblenden.json', 'assets/luxe-clothing-variantenkarte.json', 'assets/luxe-clothing-texts-de.json'], 'drei neue Dateien');
// (die Pin-Prüfung selbst läuft in apply_test.mjs: veränderte Quelle -> Exit 1)
if (process.env.PRUEFSUMME_IGNORIEREN !== '1') {
  const pf = JSON.parse(readFileSync(HIER + 'daten/pruefstand.json', 'utf8'));
  gleich(Object.fromEntries(ALLE.map((f) => [f, md5(soll[f])])), pf.md5, 'Soll-Stand gleich daten/pruefstand.json (md5 neu, zwölf Dateien)');
  gleich(Object.fromEntries(ALLE.map((f) => [f, MD5_VOR[f] ?? null])), pf.md5Alt, 'daten/pruefstand.json: md5 alt gleich MD5_VOR (null = neue Datei)');
  for (const f of ALLE) ok(existsSync(HIER + 'ziel/' + dateiName(f)) && readFileSync(HIER + 'ziel/' + dateiName(f), 'utf8') === soll[f], `ziel/${dateiName(f)} gleich dem berechneten Soll-Stand`);
}
// Dateien, die (B) nicht anfasst, sind byte-gleich dem Ergebnis von (A) allein (CSS, Manifest, Titelkacheln, Shopliste, fr.json) und die neuen Daten ebenfalls
for (const f of [DATEIEN.CSS, DATEIEN.MANIFEST, DATEIEN.COVER, DATEIEN.CATEGORY, DATEIEN.FR, A.NEUE_DATEIEN.AUSBLENDEN, A.NEUE_DATEIEN.KARTE]) ok(soll[f] === nurA[f], `${f} gleich dem Ergebnis von (A) allein`);
for (const f of [DATEIEN.JS, DATEIEN.SECTION, DATEIEN.DE, DATEIEN.EN]) ok(soll[f] !== nurA[f] && soll[f] !== sich[f], `${f} unterscheidet sich von (A) allein und vom Ausgangsstand`);
if (process.env.PRUEFSUMME_IGNORIEREN !== '1') {
  const pfA = JSON.parse(readFileSync(HIER + '../katalog-nur-bestellbar-0511/daten/pruefstand.json', 'utf8')).md5;
  for (const f of Object.keys(pfA)) ok(md5(nurA[f]) === pfA[f], `(A) allein gleich seinem Prüfstand: ${f}`);
}

// ---------- 2. Die Übertragung der Ersetzungen von (B) ist treu ----------
{
  const quelle = readFileSync(B_ORDNER + 'patch_bauen.py', 'utf8');
  ok(md5(quelle) === TEXTE_QUELLE['patch_bauen.py'], 'patch_bauen.py ist seit der Übertragung unverändert (md5)');
  gleich(TEXTE_PAARE.length, 22, '22 Ersetzungen von (B)');
  gleich(TEXTE_PAARE.reduce((a, p) => ({ ...a, [p.datei]: (a[p.datei] || 0) + 1 }), {}), { 'assets/luxe-clothing.js': 18, 'sections/luxe-clothing.liquid': 2, 'locales/de.json': 1, 'locales/en.default.json': 1 }, 'Ersetzungen je Datei (JS 18, Sektion 2, de.json 1, en.default.json 1)');
  // (B) allein, auf die *.orig angewandt, ergibt Byte für Byte theme/* des Pakets (unabhängig vom Erzeuger nachgerechnet)
  const zustand = {};
  for (const f of ['assets/luxe-clothing.js', 'sections/luxe-clothing.liquid', 'locales/de.json', 'locales/en.default.json']) zustand[f] = readFileSync(B_ORDNER + 'theme/' + dateiName(f) + '.orig', 'utf8');
  for (const p of TEXTE_PAARE) { ok(zustand[p.datei].split(p.alt).length === 2, `(B) allein: Ersetzung ${p.datei} Nr. ${p.nr} trifft genau einmal`); zustand[p.datei] = zustand[p.datei].split(p.alt).join(p.neu); }
  for (const f of Object.keys(zustand)) ok(zustand[f] === readFileSync(B_ORDNER + 'theme/' + dateiName(f), 'utf8') && md5(zustand[f]) === TEXTE_QUELLE.ausgabe_md5[dateiName(f)], `(B) allein: ${f} byte-gleich theme/ des Texte-Pakets`);
  ok(TEXTE_PAARE.every((p) => p.alt.length > 20 && p.neu.length > p.alt.length - 80), 'Ersetzungen sind keine leeren Stümpfe');
}

// ---------- 3. Ankerstellen: genau einmal; fehlt/doppelt -> Fehler mit Dateiname und Nummer ----------
{
  const nachA = () => ({ ...nurA }); // Ergebnis von (A) (ohne die neuen Dateien braucht anwendenTexte nur die vier Textdateien)
  const ohne = (text, teil) => { ok(text.split(teil).length === 2, `Testvoraussetzung: «${teil.slice(0, 40).replace(/\n/g, '\\n')}» kommt genau einmal vor`); return text.replace(teil, () => ''); };
  const verdoppelt = (text, teil) => text.replace(teil, () => teil + teil);
  ok(zeilen(nurA[DATEIEN.JS]).length > 400, 'Testvoraussetzung: Ergebnis von (A) liegt vor');
  for (const p of TEXTE_PAARE) {
    const istKollision = p.datei === KOLLISION.datei && p.alt === KOLLISION.b_anker;
    const name = `${p.datei} Nr\\. ${p.nr}`;
    if (istKollision) { ok(nurA[p.datei].split(p.alt).length === 1, `Kollision: der Anker von (B) kommt nach (A) nicht mehr vor`); continue; }
    ok(nurA[p.datei].split(p.alt).length === 2, `Ersetzung ${p.datei} Nr. ${p.nr} trifft nach (A) genau einmal`);
    const k = nachA(); k[p.datei] = ohne(k[p.datei], p.alt);
    wirft(() => anwendenTexte(k), new RegExp(`Ersetzung «${name}» kommt 0× vor`), `Anker fehlt (${p.datei} Nr. ${p.nr})`);
    const d = nachA(); d[p.datei] = verdoppelt(d[p.datei], p.alt);
    wirft(() => anwendenTexte(d), new RegExp(`Ersetzung «${name}» kommt 2× vor`), `Anker doppelt (${p.datei} Nr. ${p.nr})`);
  }
  // die Kollision: die Zeile von (A) fehlt / ist doppelt / der Anker von (B) taucht doch auf
  { const k = nachA(); k[KOLLISION.datei] = ohne(k[KOLLISION.datei], KOLLISION.a_stand); wirft(() => anwendenTexte(k), /gemeinsame Fassung\)» kommt 0× vor/, 'Kollision: Zeile von (A) fehlt'); }
  { const k = nachA(); k[KOLLISION.datei] = verdoppelt(k[KOLLISION.datei], KOLLISION.a_stand); wirft(() => anwendenTexte(k), /gemeinsame Fassung\)» kommt 2× vor/, 'Kollision: Zeile von (A) doppelt'); }
  { const k = nachA(); k[KOLLISION.datei] += '\n' + KOLLISION.b_anker; wirft(() => anwendenTexte(k), /Kollision .* noch vor/, 'Kollision: Anker von (B) kommt nach (A) noch vor'); }
  // doppeltes Einspielen
  for (const f of [DATEIEN.JS, DATEIEN.SECTION, DATEIEN.DE, DATEIEN.EN]) wirft(() => anwendenKombi({ ...sich, [f]: soll[f] }, daten), /schon|Marke|Block|Anker|Ersetzung/, `doppeltes Einspielen abgelehnt (${f})`);
  wirft(() => anwendenKombi(sich, { ...daten, texte: '' }), /daten\.texte fehlt/, 'ohne Texte-Datei kein Soll-Stand');
  wirft(() => anwendenKombi({ ...sich, [DATEIEN.JS]: readFileSync(B_ORDNER + 'theme/assets__luxe-clothing.js', 'utf8') }, daten), /Marke LX-KATALOGTEXTE-0511 schon/, '(B) allein schon eingespielt: abgelehnt');
}

// ---------- 3b. Ersetzen ohne Ersetzungsmuster: ein «$» im Ersatztext bleibt erhalten ----------
{
  const gefaehrlich = "$& $' $` $1 $$ ${x} $<n>";
  gleich(einmal('abc', 'b', gefaehrlich, 't'), 'a' + gefaehrlich + 'c', 'einmal(): Ersatztext mit $-Mustern bleibt wörtlich erhalten');
  wirft(() => einmal('abcb', 'b', 'x', 't'), /kommt 2× vor/, 'einmal(): doppelter Anker wird abgelehnt'); wirft(() => einmal('abc', 'z', 'x', 't'), /kommt 0× vor/, 'einmal(): fehlender Anker wird abgelehnt');
}

// ---------- 4. Beide Marken, die Kollisionszeile ----------
const js = soll[DATEIEN.JS];
ok(js.includes(MARKE) && js.includes(MARKE_TEXTE), 'JS trägt beide Marken');
ok(js.trimEnd().endsWith(`/* ${MARKE} */`), 'JS: Schlussmarke von (A) bleibt am Ende');
ok(soll[DATEIEN.CSS].includes(MARKE) && !soll[DATEIEN.CSS].includes(MARKE_TEXTE), 'CSS: Marke von (A), keine von (B) (B ändert kein CSS)');
ok(soll[DATEIEN.SECTION].includes(MARKE_TEXTE), 'Sektion trägt die Marke von (B)');
gleich(MARKEN, [MARKE, MARKE_TEXTE], 'MARKEN: erst (A), dann (B)');
gleich(js.split(KOLLISION.gemeinsam).length - 1, 1, 'Kollision: die gemeinsame Zeile kommt genau einmal vor');
ok(!js.includes("t('original_variants'") && !js.includes('original_variants_one'), 'JS ruft weder t(\'original_variants\') noch das Etikett original_variants_one auf (die gemeinsame Zeile zählt bestellbare Ausführungen)');
ok(js.includes("variants.length===1?t('orderable_variants_one'):t('orderable_variants'") && !/\boz\b/.test(KOLLISION.gemeinsam), 'Kollision: Einzahl/Mehrzahl der bestellbaren Ausführungen, kein oz');
ok(js.includes(MARKE_TEXTE + ': gemeinsame Zeile mit ' + MARKE), 'Kollision: Kommentar nennt beide Pakete');
ok(js.split('const labelOr = ').length === 2 && js.split('const textDe = ').length === 2 && js.split('lxPrepare = async').length === 2, 'JS: labelOr, textDe und lxPrepare je genau einmal definiert');
gleich(js.split('const count=el(').length - 1, 1, 'JS: die Zeile «const count=el(» kommt genau einmal vor');
try { new vm.Script(js, { filename: 'luxe-clothing.js' }); ok(true, ''); } catch (e) { ok(false, 'JS-Syntax: ' + e.message); }

// ---------- 5. Keine Zeile von (A) oder (B) geht verloren ----------
{
  const jsMenge = new Set(zeilen(js));
  const neuA = zeilenNeu(nurA[DATEIEN.JS], sich[DATEIEN.JS]), bJs = readFileSync(B_ORDNER + 'theme/assets__luxe-clothing.js', 'utf8'), neuB = zeilenNeu(bJs, sich[DATEIEN.JS]);
  ok(neuA.length > 30 && neuB.length > 40, `Testvoraussetzung: (A) fügt ${neuA.length} Zeilen hinzu, (B) ${neuB.length}`);
  const fehltA = neuA.filter((z) => !jsMenge.has(z) && !z.includes(KOLLISION.a_stand));
  gleich(fehltA.map((z) => z.slice(0, 80)), [], 'JS: jede von (A) hinzugefügte Zeile steht im gemeinsamen JS (ausser der Kollisionszeile, die in ihrer gemeinsamen Fassung steht)');
  const fehltB = neuB.filter((z) => !jsMenge.has(z) && !z.includes("labelOr('original_variants_one'"));
  gleich(fehltB.map((z) => z.slice(0, 80)), [], 'JS: jede von (B) hinzugefügte Zeile steht im gemeinsamen JS (ausser der Kollisionszeile von (B))');
  // Bei der Kollisionszeile stecken alle Bestandteile beider Pakete: der Aufbau der Zeile («count.dataset…», «panel.append(count)») bleibt
  const kz = zeilen(js).find((z) => z.includes(KOLLISION.gemeinsam));
  ok(!!kz && kz.includes('count.dataset.lclOriginalVariants=String(variants.length);panel.append(count);}'), 'Kollisionszeile: der Rest der Zeile (Attribut mit der Anzahl, panel.append) bleibt');
  for (const f of [DATEIEN.SECTION, DATEIEN.DE, DATEIEN.EN]) {
    const menge = new Set(zeilen(soll[f]));
    const bf = readFileSync(B_ORDNER + 'theme/' + dateiName(f), 'utf8');
    gleich(zeilenNeu(nurA[f], sich[f]).filter((z) => !menge.has(z)).length, 0, `${f}: jede von (A) hinzugefügte Zeile steht im gemeinsamen Stand`);
    gleich(zeilenNeu(bf, sich[f]).filter((z) => !menge.has(z)).length, 0, `${f}: jede von (B) hinzugefügte Zeile steht im gemeinsamen Stand`);
  }
}

// ---------- 6. Sprachdateien ----------
// doppelte Schlüssel in IRGENDEINEM Objekt (JSON.parse verschweigt sie)
function doppelteSchluessel(text) {
  const s = text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''); let i = 0; const funde = [];
  const ws = () => { while (/\s/.test(s[i])) i++; };
  const str = () => { let r = ''; i++; while (s[i] !== '"') { if (s[i] === '\\') { r += s[i] + s[i + 1]; i += 2; } else r += s[i++]; } i++; return r; };
  const wert = (pfad) => {
    ws();
    if (s[i] === '{') { i++; const keys = new Set(); ws(); if (s[i] === '}') { i++; return; } for (;;) { ws(); const k = str(); if (keys.has(k)) funde.push(pfad + '.' + k); keys.add(k); ws(); i++; wert(pfad + '.' + k); ws(); if (s[i] === ',') { i++; continue; } i++; return; } }
    if (s[i] === '[') { i++; ws(); if (s[i] === ']') { i++; return; } for (;;) { wert(pfad + '[]'); ws(); if (s[i] === ',') { i++; continue; } i++; return; } }
    if (s[i] === '"') { str(); return; }
    while (i < s.length && !/[,\}\]\s]/.test(s[i])) i++;
  };
  wert('');
  return funde;
}
{
  const json = { de: sprachJson(soll[DATEIEN.DE]), en: sprachJson(soll[DATEIEN.EN]), fr: sprachJson(soll[DATEIEN.FR]) };
  const jsonA = { de: sprachJson(nurA[DATEIEN.DE]), en: sprachJson(nurA[DATEIEN.EN]), fr: sprachJson(nurA[DATEIEN.FR]) };
  const jsonAlt = { de: sprachJson(sich[DATEIEN.DE]), en: sprachJson(sich[DATEIEN.EN]), fr: sprachJson(sich[DATEIEN.FR]) };
  for (const [sp, f] of [['de', DATEIEN.DE], ['en', DATEIEN.EN], ['fr', DATEIEN.FR]]) {
    gleich(doppelteSchluessel(soll[f]), [], `${sp}: kein doppelter Schlüssel in der ganzen Datei`);
    ok(soll[f].startsWith(sich[f].match(/^\/\*[\s\S]*?\*\/\n/)[0]), `${sp}: Kommentarkopf der Sprachdatei erhalten`);
    // gemeinsam = (A) allein + die Schlüssel von (B) im Block luxe_clothing, sonst nichts
    const erwartet = { ...jsonA[sp].luxe_clothing, ...(TEXTE_SCHLUESSEL[sp] || {}) };
    gleichObj(json[sp].luxe_clothing, erwartet, `${sp}: luxe_clothing = Stand von (A) + Schlüssel von (B)`);
    const rest = { ...json[sp] }, restA = { ...jsonA[sp] }; delete rest.luxe_clothing; delete restA.luxe_clothing;
    gleichObj(rest, restA, `${sp}: alle übrigen Blöcke (auch luxe_category) gleich dem Stand von (A)`);
    // alle ursprünglichen Schlüssel ausser den von (A) ersetzten (notice, intro) sind unverändert
    for (const k of Object.keys(jsonAlt[sp].luxe_clothing)) if (!['notice', 'intro'].includes(k)) gleich(json[sp].luxe_clothing[k], jsonAlt[sp].luxe_clothing[k], `${sp}: Schlüssel ${k} unverändert`);
    for (const k of Object.keys(TEXTE_SCHLUESSEL[sp] || {})) ok(!(k in jsonAlt[sp].luxe_clothing), `${sp}: Schlüssel ${k} von (B) ist neu`);
  }
  gleich(Object.keys(TEXTE_SCHLUESSEL.de), ['original_note_translated', 'original_variants_one', 'supplier_out_of_stock', 'stocked_on_demand', 'status_unknown'], 'fünf neue Schlüssel von (B) in de');
  gleich(Object.keys(TEXTE_SCHLUESSEL.en), Object.keys(TEXTE_SCHLUESSEL.de), 'dieselben fünf in en');
  gleich(NEUE_SCHLUESSEL_B, Object.keys(TEXTE_SCHLUESSEL.de), 'NEUE_SCHLUESSEL_B');
  ok(NEUE_SCHLUESSEL_A.every((k) => !NEUE_SCHLUESSEL_B.includes(k)), 'Schlüssel von (A) und (B) überschneiden sich nicht');
  ok(!('original_variants_one' in json.fr.luxe_clothing) && !NEUE_SCHLUESSEL_B.some((k) => k in json.fr.luxe_clothing), 'fr.json: keine Schlüssel von (B) (Rückfall auf die Standardsprache)');
  for (const k of NEUE_SCHLUESSEL_B) ok(k in TEXTE.de && k in TEXTE.en && !(k in TEXTE.fr), `TEXTE (zusammengeführt) enthält den Schlüssel ${k} von (B) in de und en, nicht in fr`);
  for (const k of NEUE_SCHLUESSEL_A) ok(k in TEXTE.de && k in TEXTE.en, `TEXTE (zusammengeführt) enthält den Schlüssel ${k} von (A) in de und en`);
  ok(!/ß/.test(Object.values(TEXTE.de).join(' ')), 'de: Schweizer Rechtschreibung (kein ß) in allen neuen Texten beider Pakete');
  ok(!/\b(?:oz|lbs?|inch(?:es)?|zoll)\b|″|["']\s*(?:x|×)\s*\d/i.test(Object.values(TEXTE.de).join(' ')), 'de: kein neuer Text nennt oz, lb, Zoll');
  gleich(TEXTE.de.orderable_variants_one, '1 bestellbare Ausführung', 'de: Einzahl');
  gleich(TEXTE.de.orderable_variants.replace('[count]', '12'), '12 bestellbare Ausführungen', 'de: Mehrzahl');
  gleich(TEXTE.en.orderable_variants_one, '1 orderable variant', 'en: Einzahl'); gleich(TEXTE.en.orderable_variants.replace('[count]', '12'), '12 orderable variants', 'en: Mehrzahl');
  gleich(TEXTE.fr.orderable_variants_one, '1 version commandable', 'fr: Einzahl');
}

// ---------- 7. Die Texte-Datei ----------
{
  const t = JSON.parse(soll[NEUE_DATEIEN.TEXTE]);
  gleich([t.schema, Object.keys(t.beschreibungen).length, Object.keys(t.positionen).length, Object.keys(t.optionstitel).length, Object.keys(t.optionswerte).length, Object.keys(t.techniken).length, Object.keys(t.regionen).length, Object.keys(t.material).length], [1, 571, 155, 34, 58, 9, 20, 33], 'Texte-Datei: 571 Beschreibungen, 155 Positionen, 34 Optionstitel, 58 Optionswerte, 9 Techniken, 20 Regionen, 33 Materialnamen');
  ok(soll[NEUE_DATEIEN.TEXTE] === daten.texte && soll[NEUE_DATEIEN.TEXTE] === readFileSync(B_ORDNER + 'luxe-clothing-texts-de.json', 'utf8'), 'Texte-Datei: unverändert aus katalog-texte-de-0611 übernommen');
  ok(!/ß/.test(soll[NEUE_DATEIEN.TEXTE]), 'Texte-Datei: Schweizer Rechtschreibung (kein ß)');
  ok(Buffer.byteLength(soll[NEUE_DATEIEN.TEXTE]) === 401815, 'Texte-Datei: 401 815 Byte');
}

// ---------- 8. Liquid mit dem echten Ruby-Liquid ----------
if (process.env.OHNE_LIQUID === '1') console.log('  (Ruby-Liquid übersprungen: OHNE_LIQUID=1)');
else if (!rubyLiquidGems()) ok(false, 'Ruby-Liquid nicht gefunden (RUBY_LIQUID_GEMS setzen oder OHNE_LIQUID=1)');
else {
  const handles = ['unisex-t-shirt-selbst-gestalten', 'bio-jutebeutel-selbst-gestalten', 'keramik-tasse-selbst-gestalten'];
  const alleProdukte = Object.fromEntries(handles.map((h, i) => [h, { handle: h, id: 100 + i, title: h, url: `/products/${h}`, featured_image: { src: `${h}.jpg`, alt: h }, selected_or_first_available_variant: { id: 900 + i }, available: true, price_min: 2490, price_varies: false, options_with_values: [] }]));
  const labels = {};
  for (const [sp, spKey] of [['de', DATEIEN.DE], ['en', DATEIEN.EN], ['fr', DATEIEN.FR]]) {
    for (const [stand, q] of [['gemeinsam', soll], ['A', nurA]]) {
      const tr = { ...flach(sprachJson(q[DATEIEN.EN])), ...flach(sprachJson(q[spKey])) }; // Shopify fällt auf die Standardsprache zurück
      const r = rendere({ main: q[DATEIEN.SECTION], translations: tr, templates: { ...SNIPPET_ATTRAPPEN, 'luxe-clothing-asset-manifest': q[DATEIEN.MANIFEST], 'luxe-selfdesign-cover': q[DATEIEN.COVER] }, context: { section: { id: 'cat' }, all_products: alleProdukte, request: { locale: { iso_code: sp } } } });
      gleich(r.fehler, [], `Sektion ${sp} (${stand}): Liquid ohne Fehler`);
      const m = r.ausgabe.match(/<script type="application\/json" data-lcl-config>([\s\S]*?)<\/script>/);
      ok(!!m, `Sektion ${sp} (${stand}): Konfiguration gefunden`);
      let cfg = null; try { cfg = JSON.parse(m[1]); } catch (e) { ok(false, `Sektion ${sp} (${stand}): Konfiguration ist kein JSON: ${e.message}`); }
      labels[`${sp}-${stand}`] = { cfg, html: r.ausgabe };
    }
    const g = labels[`${sp}-gemeinsam`].cfg, a = labels[`${sp}-A`].cfg;
    if (!g || !a) continue;
    gleich(Object.keys(g.labels).filter((k) => !(k in a.labels)).sort(), [...NEUE_SCHLUESSEL_B].sort(), `Sektion ${sp}: genau die fünf Labels von (B) kommen zu (A) hinzu`);
    gleich(Object.keys(a.labels).filter((k) => !(k in g.labels)), [], `Sektion ${sp}: kein Label von (A) verloren`);
    for (const k of Object.keys(a.labels)) gleich(g.labels[k], a.labels[k], `Sektion ${sp}: Label ${k} von (A) unverändert`);
    for (const k of NEUE_SCHLUESSEL_B) gleich(g.labels[k], sp === 'fr' ? TEXTE_SCHLUESSEL.en[k] : TEXTE_SCHLUESSEL[sp][k], `Sektion ${sp}: Label ${k} von (B)${sp === 'fr' ? ' (fällt auf die Standardsprache zurück)' : ''}`);
    gleich(Object.keys(g).filter((k) => !(k in a)), ['textsAsset'], `Sektion ${sp}: genau ein neuer Schlüssel in der Konfiguration: textsAsset`);
    ok(/\/assets\/luxe-clothing-texts-de\.json\?v=/.test(g.textsAsset), `Sektion ${sp}: textsAsset zeigt auf die Texte-Datei (${g.textsAsset})`);
    for (const k of Object.keys(a)) if (k !== 'labels') gleich(g[k], a[k], `Sektion ${sp}: Konfigurationsschlüssel ${k} unverändert`);
    gleich(Object.keys(g.assets).sort(), Object.keys(a.assets).sort(), `Sektion ${sp}: Manifest = das von (A) (Ausblenden, Variantenkarte; die Texte-Datei läuft über textsAsset)`);
    const hinweis = (h) => (h.match(/<p class="lcl-notice">([^<]*)<\/p>/) || [])[1], hDialog = (h) => (h.match(/<p class="lcl-dialog-notice">([^<]*)<\/p>/) || [])[1];
    gleich(hinweis(labels[`${sp}-gemeinsam`].html), hinweis(labels[`${sp}-A`].html), `Sektion ${sp}: Hinweis im Kopf wie bei (A)`);
    gleich(hDialog(labels[`${sp}-gemeinsam`].html), hDialog(labels[`${sp}-A`].html), `Sektion ${sp}: Hinweis im Dialog wie bei (A)`);
  }
  // Das Dokument ausserhalb der Konfiguration: gleich (A) allein bis auf die Kommentare von (B) (Liquid-Kommentare erzeugen keine Ausgabe)
  const ohneKonfig = (h) => h.replace(/<script type="application\/json" data-lcl-config>[\s\S]*?<\/script>/, '');
  ok(ohneKonfig(labels['de-gemeinsam'].html) === ohneKonfig(labels['de-A'].html), 'Sektion de: Dokument ausserhalb der Konfiguration gleich (A) allein');
  ok(!labels['de-gemeinsam'].html.includes('LX-KATALOGTEXTE-0511'), 'Sektion de: die Liquid-Kommentare von (B) erscheinen nicht in der Ausgabe');
}

console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
