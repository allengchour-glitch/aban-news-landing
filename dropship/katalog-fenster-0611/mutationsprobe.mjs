// Mutationsprobe für den gemeinsamen Stand: verändert je eine Kernstelle (Kollisionszeile, Reihenfolge der (A)/(B)-Ersetzungen, die drei neuen Assets, Marken, Einspielskript: Reihenfolge der Schritte,
// Fremd-Schutz, Rücknahme) in einer KOPIE der Pakete und prüft, dass mindestens ein Test es bemerkt.
//   NODE_PATH=$(/opt/node22/bin/npm root -g) /opt/node22/bin/node dropship/katalog-fenster-0611/mutationsprobe.mjs
// Umgebung: PARALLEL=3 (Vorgabe) gleichzeitige Mutanten · NUR=<Teil des Namens> nur passende Mutanten · LOG=<Datei> Ausgabe der fehlschlagenden Tests (Vorgabe: Scratch) · CACHE_DIR=<Ordner mit Dokument und Datenschalen>
//   SCHALEN_DIR=<Ordner mit Index und 51 Datenschalen> · MINIFIZIERT=1 ESBUILD=<Pfad> (Browsertests mit der vom CDN verkleinerten Fassung)
// Pro Mutant läuft eine Kopie von katalog-fenster-0611, katalog-nur-bestellbar-0511 (ohne Tests/Sicherung) und der Texte-Datei in einem Wegwerfordner; die Tests laufen nacheinander und HALTEN beim ersten Fehlschlag:
//   Stufe 1  kombi_test.mjs (mit PRUEFSUMME_IGNORIEREN=1: die Prüfsumme in daten/pruefstand.json würde jede Änderung sofort melden und nichts über das Verhalten sagen)
//   Stufe 2  test_bestellbar_kombi.cjs (LOKAL=1 SCHNELL=1, Dokument und Daten aus dem Zwischenspeicher)
//   Stufe 3  test_texte_kombi.cjs schnell (LOKAL=1)         Stufe 4  test_texte_kombi.cjs kombi (LOKAL=1 SCHNELL=1)       Stufe 5 (nur Mutanten mit «szenarien») test_texte_kombi.cjs szenarien (LOKAL=1)
//   apply.mjs-Mutanten: apply_test.mjs
// Vor den Mutanten läuft der unveränderte Stand einmal durch alle Stufen (Referenzlauf, muss grün sein). Ein «?» ist ein Mutant, dessen Muster nicht (genau einmal) vorkommt (Fehlalarm der Probe, zu beheben).
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const HIER = new URL('.', import.meta.url).pathname;
const SCRATCH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/';
const LOG = process.env.LOG || SCRATCH + 'work/fenster/probe_log.txt';
const CACHE = process.env.CACHE_DIR || SCRATCH + 'work/fenster/cache';
const PARALLEL = Number(process.env.PARALLEL || 3);
const F = 'dropship/katalog-fenster-0611/', A = 'dropship/katalog-nur-bestellbar-0511/';
const M = 'LX-NURBESTELLBAR-0511';

// [Datei, Art, Name, alt, neu, Option]   Art: kombi | szenarien | apply   Option: 'szenarien' (Stufe 5 zusätzlich)
const MUTANTEN = [
  // ---- Die Kollision (kombi.mjs) ----
  [F + 'kombi.mjs', 'kombi', 'Kollision: Einzahl fehlt in der gemeinsamen Zeile', "gemeinsam: \"const count=el('p','lcl-small',(variants.length===1?", "gemeinsam: \"const count=el('p','lcl-small',(variants.length<0?"],
  [F + 'kombi.mjs', 'kombi', 'Kollision: Einzahl gilt auch bei zwei', "gemeinsam: \"const count=el('p','lcl-small',(variants.length===1?", "gemeinsam: \"const count=el('p','lcl-small',(variants.length<3?"],
  [F + 'kombi.mjs', 'kombi', 'Kollision: Einzahl aus dem Etikett von (B) («1 Originalvariante»)', "gemeinsam: \"const count=el('p','lcl-small',(variants.length===1?t('orderable_variants_one')", "gemeinsam: \"const count=el('p','lcl-small',(variants.length===1?t('original_variants_one')"],
  [F + 'kombi.mjs', 'kombi', 'Kollision: Mehrzahl zählt wieder «Originalvarianten»', ":t('orderable_variants'/* \" + A.MARKE + \" */,{count:variants.length}))/* \" + MARKE_TEXTE", ":t('original_variants'/* \" + A.MARKE + \" */,{count:variants.length}))/* \" + MARKE_TEXTE"],
  [F + 'kombi.mjs', 'kombi', 'Kollision: Zeile verliert ihr Ende (Syntaxfehler)', "nur bestellbare Ausführungen, Einzahl bei einer */);\",", "nur bestellbare Ausführungen, Einzahl bei einer */;\","],
  [F + 'kombi.mjs', 'kombi', 'Kollision: Kommentar nennt (B) nicht mehr', "\": gemeinsame Zeile mit \"", "\": Zeile mit \""],
  [F + 'kombi.mjs', 'kombi', 'Kollision: Prüfung, dass der Anker von (B) fehlt, entfernt', "if (zaehle(out[p.datei], KOLLISION.b_anker) !== 0) throw", "if (false) throw"],
  [F + 'kombi.mjs', 'kombi', 'Kollision: gemeinsame Zeile ersetzt die Zeile von (A) nicht (unverändert)', "out[p.datei] = einmal(out[p.datei], KOLLISION.a_stand, KOLLISION.gemeinsam, name + ' (gemeinsame Fassung)');", "out[p.datei] = einmal(out[p.datei], KOLLISION.a_stand, KOLLISION.a_stand, name + ' (gemeinsame Fassung)');"],
  // ---- Reihenfolge und Anker-Strenge der Zusammenführung ----
  [F + 'kombi.mjs', 'kombi', 'Zusammenführung: (B) vor (A)', "const out = A.anwenden(dateien, daten); // wirft selbst, wenn (A) schon eingespielt ist oder ein Anker nicht genau einmal vorkommt\n  anwendenTexte(out);", "const out = { ...dateien }; anwendenTexte(out); Object.assign(out, A.anwenden(out, daten));"],
  [F + 'kombi.mjs', 'kombi', 'Zusammenführung: eine Ersetzung von (B) darf fehlen (0 Treffer)', "if (n !== 1) throw new Error(`Ersetzung", "if (n > 1) throw new Error(`Ersetzung"],
  [F + 'kombi.mjs', 'kombi', 'Zusammenführung: eine Ersetzung von (B) darf mehrfach treffen', "if (n !== 1) throw new Error(`Ersetzung", "if (n < 1) throw new Error(`Ersetzung"],
  [F + 'kombi.mjs', 'kombi', 'Zusammenführung: (B) schon eingespielt wird nicht abgelehnt', "dateien[f].includes(MARKE_TEXTE)) throw new Error(`Datei", "dateien[f].includes('@@nie@@')) throw new Error(`Datei"],
  [F + 'kombi.mjs', 'kombi', 'Zusammenführung: Ersetzungen von (B) ersetzen mit String.replace statt split/join (ein «$» im Text)', "return text.split(alt).join(neu); // split/join", "return text.replace(alt, neu); // split/join"],
  // ---- Die drei neuen Assets ----
  [F + 'kombi.mjs', 'kombi', 'Assets: die Texte-Datei wird nicht als drittes Asset geführt', "out[NEUE_DATEIEN.TEXTE] = daten.texte;\n  return out;", "return out;"],
  [F + 'kombi.mjs', 'kombi', 'Assets: NEUE_DATEIEN kennt die Texte-Datei nicht', "TEXTE: 'assets/luxe-clothing-texts-de.json' };", "};"],
  [F + 'kombi.mjs', 'kombi', 'Assets: falscher Name der Texte-Datei', "TEXTE: 'assets/luxe-clothing-texts-de.json' };", "TEXTE: 'assets/luxe-clothing-texte-de.json' };"],
  [F + 'kombi.mjs', 'kombi', 'Assets: Pinnen der Texte-Datei mit falscher Prüfsumme', "texte: '86cbb8664cddc2e10a3ead2297bc9482',", "texte: '86cbb8664cddc2e10a3ead2297bc9483',"],
  [F + 'kombi.mjs', 'kombi', 'Assets: Pinnen der Karte mit falscher Prüfsumme', "karte: '5790968bda235f40049578e0471e9899',", "karte: '5790968bda235f40049578e0471e9898',"],
  [F + 'kombi.mjs', 'kombi', 'Assets: Pin wird nicht geprüft', "if (md5(roh[k]) !== DATEN_MD5[k]) throw", "if (false) throw"],
  [F + 'kombi.mjs', 'kombi', 'Marken: MARKEN kennt die Marke von (B) nicht', "export const MARKEN = [MARKE, MARKE_TEXTE];", "export const MARKEN = [MARKE];"],
  [F + 'kombi.mjs', 'kombi', 'Sprachschlüssel: TEXTE enthält die Schlüssel von (B) nicht', "export const TEXTE = { de: { ...A.TEXTE.de, ...TEXTE_SCHLUESSEL.de }, en: { ...A.TEXTE.en, ...TEXTE_SCHLUESSEL.en },", "export const TEXTE = { de: { ...A.TEXTE.de }, en: { ...A.TEXTE.en },"],
  // ---- Verhalten von (B) im gemeinsamen JS (texte_ersetzungen.mjs) ----
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Textdatei wird nie geladen', "if (!german || textsDe || !config.textsAsset) return textsDe;", "return textsDe;", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Positionen bleiben Englisch', "textDe('positionen',string(file.title || file.type),product.id)", "string(file.title || file.type)", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Techniken bleiben Englisch', "textDe('techniken',string(tech.display_name || tech.displayName || tech.key))", "string(tech.display_name || tech.displayName || tech.key)", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Optionstitel bleiben Englisch', "metricText(textDe('optionstitel',plainText(option.title)))", "metricText(plainText(option.title))", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Optionswerte bleiben Englisch', "metricText(textDe('optionswerte',text))", "metricText(text)", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Beschreibung bleibt Englisch', "const description=descriptionTranslated?plainText(descriptionTranslated):metricText(plainText(product.description));", "const description=metricText(plainText(product.description));", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Hinweis «maschinell übersetzt» fehlt', "descriptionTranslated?labelOr('original_note_translated',t('original_note')):t('original_note')", "t('original_note')", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Farbnamen werden auch ausserhalb von Deutsch umgeformt (fr, en)', "const raw = string(value); if (!german) return raw;", "const raw = string(value);", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Titel behalten die Unzen-Angabe', "(string(extra?.titleDe) || string(product.titleDe)) || (german ? dropOz(product.title) : product.title)", "(string(extra?.titleDe) || string(product.titleDe)) || product.title", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Unzen werden nicht in ml umgerechnet', "if (ounces) return Math.round(Number(ounces[1]) * 29.5735) + ' ml';", "if (ounces) return ounces[1] + ' oz';", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Regionen bleiben Englisch', "${textDe('regionen',string(regions[item.region]) || string(item.region))}", "${string(regions[item.region]) || string(item.region)}", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-JS: Material bleibt Englisch', "(textHit('material',nameKey)??part.name)", "part.name", 'browser'],
  [F + 'texte_ersetzungen.mjs', 'szenarien', 'B-JS: veraltete Übersetzung wird trotz geändertem Herstellertext gezeigt (Quellenhash)', "hashText(product.description) === stamp", "true", 'browser-szenarien'],
  [F + 'texte_ersetzungen.mjs', 'szenarien', 'B-JS: Wartezeit auf die Textdatei 25 s statt 2,5 s', "setTimeout(resolve, 2500)", "setTimeout(resolve, 25000)", 'browser-szenarien'],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-Sektion: textsAsset fehlt in der Konfiguration', String.raw`\"textsAsset\": {{ 'luxe-clothing-texts-de.json' | asset_url | json }},`, String.raw`\"textsAssetX\": {{ 'luxe-clothing-texts-de.json' | asset_url | json }},`],
  [F + 'texte_ersetzungen.mjs', 'kombi', 'B-Sektion: Etikett original_note_translated trägt den alten Hinweis', String.raw`\"original_note_translated\": {{ 'luxe_clothing.original_note_translated' | t | json }},`, String.raw`\"original_note_translated\": {{ 'luxe_clothing.original_note' | t | json }},`],
  // ---- (A) im gemeinsamen Stand: dieselben Browsertests sehen seine Kernzusagen ----
  [A + 'patches.mjs', 'kombi', 'A-JS: Varianten nicht auf bestellbare beschränkt', "(lxVids === null || lxVids.has(id(v.id)))", "(true)"],
  [A + 'patches.mjs', 'kombi', 'A-JS: Karte ohne Knopf «Jetzt selbst gestalten»', "const buy = lxCardCta(product); if (buy) copy.append(buy);", ""],
  [A + 'patches.mjs', 'kombi', 'A-JS: Zusatzschutz für Modelle ignoriert', "if(!row || hideModels.has(row.model) || hideVariants.has(vid))return;", "if(!row || hideVariants.has(vid))return;"],
  [A + 'patches.mjs', 'kombi', 'A-JS: Zeile «bestellbare Ausführungen» ohne Einzahl (im JS von (A))', "(variants.length===1?t('orderable_variants_one'):t('orderable_variants'/* ${MARKE} */,{count:variants.length}))", "t('orderable_variants'/* ${MARKE} */,{count:variants.length})"],
  // ---- apply.mjs: Reihenfolge der Schritte ----
  [F + 'apply.mjs', 'apply', 'apply: CSS/JS vor Texte/Liquid', "['2 Texte und Liquid', SCHRITT_TEXTE], ['3 CSS und JS', SCHRITT_CODE]];", "['3 CSS und JS', SCHRITT_CODE], ['2 Texte und Liquid', SCHRITT_TEXTE]];"],
  [F + 'apply.mjs', 'apply', 'apply: CSS/JS als erster Schritt', "const SCHRITTE = [['1a Daten', SCHRITT_1A],", "const SCHRITTE = [['3 CSS und JS', SCHRITT_CODE], ['1a Daten', SCHRITT_1A],"],
  [F + 'apply.mjs', 'apply', 'apply: Texte/Liquid vor den neuen Daten', "const SCHRITTE = [['1a Daten', SCHRITT_1A], ['1b Texte-Datei', SCHRITT_1B], ['2 Texte und Liquid', SCHRITT_TEXTE],", "const SCHRITTE = [['2 Texte und Liquid', SCHRITT_TEXTE], ['1a Daten', SCHRITT_1A], ['1b Texte-Datei', SCHRITT_1B],"],
  [F + 'apply.mjs', 'apply', 'apply: Karte und Texte-Datei in einem Aufruf (Nutzlast)', "['1a Daten', SCHRITT_1A], ['1b Texte-Datei', SCHRITT_1B],", "['1 Daten', [...SCHRITT_1A, ...SCHRITT_1B]],"],
  [F + 'apply.mjs', 'apply', 'apply: Daten und Texte/Liquid in einem Aufruf', "['2 Texte und Liquid', SCHRITT_TEXTE], ['3 CSS und JS', SCHRITT_CODE]];", "['2 Texte und Liquid', [...SCHRITT_TEXTE, ...SCHRITT_CODE]]];"],
  // ---- apply.mjs: die drei neuen Assets ----
  [F + 'apply.mjs', 'apply', 'apply: die Texte-Datei wird nicht geschrieben', "const SCHRITT_1B = [NEUE_DATEIEN.TEXTE];", "const SCHRITT_1B = [];"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme löscht die Texte-Datei nicht', "const zuLoeschen = NEU_BEHALTEN ? [] : NEU.filter((n) => zustand[n]", "const zuLoeschen = NEU_BEHALTEN ? [] : NEU.slice(0, 2).filter((n) => zustand[n]"],
  [F + 'apply.mjs', 'apply', 'apply: Löschaufruf nennt nur zwei der drei Dateien', "await loeschen(zuLoeschen);", "await loeschen(zuLoeschen.slice(0, 2));"],
  [F + 'apply.mjs', 'apply', 'apply: eine fremde Texte-Datei (Name einer neuen Datei) wird nicht erkannt', "const fremdNeu = NEU.filter((n) => jetzt[n]", "const fremdNeu = NEU.slice(0, 2).filter((n) => jetzt[n]"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme hält eine fremd veränderte neue Datei für «neu»', "'fehlt' : jetzt[n].md5 === soll[n] ? 'neu' : 'fremd';", "'fehlt' : 'neu';"],
  [F + 'apply.mjs', 'apply', 'apply: Teilzustand mit nur neuen Dateien wird nicht erkannt', "|| NEU.some((n) => jetzt[n]) ||", "||"],
  [F + 'apply.mjs', 'apply', 'apply: Rücklesen kennt die Texte-Datei nicht (nur zwei neue Dateien)', "const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];", "const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN).slice(0, 2), ALLE = [...ALT, ...NEU];"],
  // ---- apply.mjs: Fremd-Schutz ----
  [F + 'apply.mjs', 'apply', 'apply: kein frisches Lesen vor den Schritten', "    if (abw.length) {\n      if (i === 0) {", "    if (false) {\n      if (i === 0) {"],
  [F + 'apply.mjs', 'apply', 'apply: frisches Lesen nur vor dem ersten Schritt', "    if (abw.length) {\n      if (i === 0) {", "    if (abw.length && i === 0) {\n      if (i === 0) {"],
  [F + 'apply.mjs', 'apply', 'apply: frisches Lesen prüft nur CSS/JS', "return { frisch, erw, abw: ALLE.filter(", "return { frisch, erw, abw: SCHRITT_CODE.filter("],
  [F + 'apply.mjs', 'apply', 'apply: frisches Lesen prüft die eigenen geschriebenen Dateien nicht', "const erwartetJetzt = () => Object.fromEntries(ALLE.map((n) => [n, geschrieben.has(n) ? sollMd5[n] : (MD5_VOR[n] ?? null)]));", "const erwartetJetzt = () => Object.fromEntries(ALLE.map((n) => [n, geschrieben.has(n) ? (jetzt[n]?.md5 ?? null) : (MD5_VOR[n] ?? null)]));"],
  [F + 'apply.mjs', 'apply', 'apply: kein Warten bis die Prüfsummen eines Schritts stimmen', "if (!(await warteBisGleich(nurDiese, dateien, 150000))) {", "if (false) {"],
  [F + 'apply.mjs', 'apply', 'apply: Warten ignoriert die Prüfsumme', "const offen = namen.filter((n) => (soll[n] === null ? nach[n] != null : nach[n]?.md5 !== soll[n]));", "const offen = [];"],
  [F + 'apply.mjs', 'apply', 'apply: Abbruch wegen Fremdänderung mit Exit 0', "    process.exit(4);\n    }\n    if (i === 0) {", "    process.exit(0);\n    }\n    if (i === 0) {"],
  [F + 'apply.mjs', 'apply', 'apply: nicht sichtbarer Schritt endet mit Exit 0', "die folgenden Schritte NICHT geschrieben.`); console.error(TEILZUSTAND); process.exit(6); }", "die folgenden Schritte NICHT geschrieben.`); console.error(TEILZUSTAND); process.exit(0); }"],
  [F + 'apply.mjs', 'apply', 'apply: Merkliste nicht geschrieben', "writeFileSync(MERKLISTE, JSON.stringify({ erstellt", "void (JSON.stringify({ erstellt"],
  [F + 'apply.mjs', 'apply', 'apply: Sicherung nicht gegen den Ausgangsstand geprüft', "if (md5(sich[n]) !== MD5_VOR[n]) {", "if (false) {"],
  [F + 'apply.mjs', 'apply', 'apply: MD5-Wächter des Ausgangsstands weg', "const ausgang = ALT.every((n) => jetzt[n].md5 === MD5_VOR[n]) && NEU.every((n) => !jetzt[n]);", "const ausgang = true;"],
  [F + 'apply.mjs', 'apply', 'apply: Schon-eingespielt erkennt die Marke von (B) nicht', "const schon = MARKEN.some(", "const schon = [MARKEN[0]].some("],
  [F + 'apply.mjs', 'apply', 'apply: «unberührt» ignoriert die Marke von (B)', "!MARKEN.some((m) => jetzt[n].content.includes(m))", "!jetzt[n].content.includes(MARKEN[0])"],
  [F + 'apply.mjs', 'apply', 'apply: «unberührt» ignoriert die Marke von (A)', "!MARKEN.some((m) => jetzt[n].content.includes(m))", "!jetzt[n].content.includes(MARKEN[1])"],
  [F + 'apply.mjs', 'apply', 'apply: «unberührt» gilt für alle Dateien', "const unberuehrt = (n) => SCHRITT_CODE.includes(n) && ", "const unberuehrt = (n) => "],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme erkennt fremde Dateien nicht', "if (fremde.length && !FREMD_OK) {", "if (false) {"],
  [F + 'apply.mjs', 'apply', 'apply: FREMD_UEBERSCHREIBEN schreibt auch unberührte Dateien', "const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');", "const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd' || zustand[n] === 'unberuehrt');"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme ohne frisches Lesen vor Texten/Liquid', "if (!(await nochGleich([...rueckTexte, ...zuLoeschen]))) process.exit(3);", ""],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme prüft die zu löschenden Dateien nicht vor dem Schreiben', "if (!(await nochGleich([...rueckTexte, ...zuLoeschen]))) process.exit(3);", "if (!(await nochGleich([...rueckTexte]))) process.exit(3);"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme ohne frisches Lesen vor dem Löschen', "if (!(await nochGleich(zuLoeschen))) process.exit(3);", ""],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme wartet nicht auf die Texte vor dem Löschen', "if (rueckTexte.length && !(await warteBisGleich(alt, rueckTexte, 150000))) {", "if (false) {"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme wartet nicht auf CSS/JS', "if (rueckProgramm.length && (rueckTexte.length || zuLoeschen.length) && !(await warteBisGleich(alt, rueckProgramm, 150000))) {", "if (false) {"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme löscht, ohne vorher zurückzuschreiben', "if (rueckTexte.length) await schreiben(sich, rueckTexte);\n    if (zuLoeschen.length) {", "if (zuLoeschen.length) {"],
  [F + 'apply.mjs', 'apply', 'apply: Rücknahme schreibt zuerst die Texte, dann CSS/JS', "if (rueckProgramm.length) await schreiben(sich, rueckProgramm);\n    if (rueckProgramm.length && (rueckTexte.length || zuLoeschen.length) && !(await warteBisGleich(alt, rueckProgramm, 150000))) { console.error('Rücknahme: CSS/JS sind nach 150 s in der API noch nicht auf dem Ausgangsstand sichtbar. Texte, Liquid und neue Dateien NICHT angefasst. ' + WIEDERHOLBAR); process.exit(6); }", "if (rueckTexte.length) await schreiben(sich, rueckTexte);"],
  [F + 'apply.mjs', 'apply', 'apply: userErrors ohne Abbruch', "console.error(TEILZUSTAND); process.exit(5); }\n}\nasync function loeschen", "console.error(TEILZUSTAND); }\n}\nasync function loeschen"],
  [F + 'apply.mjs', 'apply', 'apply: Rücklesen meldet immer gut', "endCode = (await pruefenNachSchreiben(sollMd5, 'neu')) ? 0 : 6;", "endCode = 0;"],
  [F + 'apply.mjs', 'apply', 'apply: Ausnahme beim Schreiben still', "  process.exit(7);\n}\nprocess.exit(endCode);", "  process.exit(0);\n}\nprocess.exit(endCode);"],
  [F + 'apply.mjs', 'apply', 'apply: veränderte Datenquelle wird nicht gemeldet (Exit 0)', "console.error('Datenquelle nicht lesbar oder verändert: nichts geschrieben:', e.message); process.exit(1);", "console.error('Datenquelle nicht lesbar oder verändert: nichts geschrieben:', e.message); process.exit(0);"],
];

const NUR = process.env.NUR || '';
const liste = MUTANTEN.filter((m) => !NUR || m[2].includes(NUR));
const env = (extra = {}) => ({ ...process.env, CACHE_DIR: CACHE, SHOTS_DIR: tmpdir(), ...extra });
const lauf = (dir, datei, extra = {}, args = []) => new Promise((resolve) => {
  const p = spawn(process.execPath, [join(dir, F, datei), ...args], { env: env(extra), cwd: dir });
  let aus = ''; p.stdout.on('data', (d) => { aus += d; }); p.stderr.on('data', (d) => { aus += d; });
  const kill = setTimeout(() => p.kill('SIGKILL'), 900000);
  p.on('close', (code) => { clearTimeout(kill); resolve({ code, aus }); });
});
// Kopie: die drei Pakete in der Ordnerstruktur des Repos (ohne Tests, Sicherungen und grosse Zwischenstände)
const kopie = () => {
  const d = mkdtempSync(join(tmpdir(), 'lxmut-'));
  mkdirSync(join(d, 'dropship'), { recursive: true });
  cpSync(HIER, join(d, F), { recursive: true, filter: (s) => !/\/(ziel|sicherung\/eingespielt\.json)$/.test(s) && !/\/ziel\//.test(s) });
  cpSync(HIER + '../katalog-nur-bestellbar-0511/', join(d, A), { recursive: true, filter: (s) => !/\/(sicherung|test_nur_bestellbar\.cjs|mutationsprobe\.mjs|patches_test\.mjs|apply_test\.mjs|waechter[^/]*|messen\.cjs)$/.test(s) });
  mkdirSync(join(d, 'dropship/katalog-texte-de-0611'), { recursive: true });
  cpSync(HIER + '../katalog-texte-de-0611/luxe-clothing-texts-de.json', join(d, 'dropship/katalog-texte-de-0611/luxe-clothing-texts-de.json'));
  cpSync(HIER + '../katalog-texte-de-0611/patch_bauen.py', join(d, 'dropship/katalog-texte-de-0611/patch_bauen.py'));
  cpSync(HIER + '../katalog-texte-de-0611/theme', join(d, 'dropship/katalog-texte-de-0611/theme'), { recursive: true });
  return d;
};
const LOK = { LOKAL: '1', PRUEFSUMME_IGNORIEREN: '1' };
const STUFEN = (mitSzenarien) => [
  ['kombi_test', 'kombi_test.mjs', { PRUEFSUMME_IGNORIEREN: '1' }, []],
  ['test_bestellbar_kombi', 'test_bestellbar_kombi.cjs', { ...LOK, SCHNELL: '1' }, []],
  ['test_texte schnell', 'test_texte_kombi.cjs', LOK, ['schnell']],
  ['test_texte kombi', 'test_texte_kombi.cjs', { ...LOK, SCHNELL: '1' }, ['kombi']],
  ...(mitSzenarien ? [['test_texte szenarien', 'test_texte_kombi.cjs', LOK, ['szenarien']]] : []),
];
// Die Tests laufen nacheinander und halten beim ersten Fehlschlag; Rückgabe: [Name der Stufe oder null, Ausgabe]
// Option 'browser': die Stufe kombi_test.mjs entfällt, damit die Browsertests allein zeigen, ob sie das Verhalten sehen (sonst fängt kombi_test die Änderung an texte_ersetzungen.mjs schon an der Treue zum Texte-Paket)
async function testen(dir, art, mitSzenarien, nurBrowser = false, mitApply = false) {
  if (art === 'apply') { const r = await lauf(dir, 'apply_test.mjs'); return r.code !== 0 ? ['apply_test', r.aus] : [null, '']; }
  if (mitApply) { const r = await lauf(dir, 'apply_test.mjs'); if (r.code !== 0) return ['apply_test', r.aus]; }
  for (const [name, datei, extra, args] of STUFEN(mitSzenarien).slice(nurBrowser ? 1 : 0)) { const r = await lauf(dir, datei, extra, args); if (r.code !== 0) return [name, r.aus]; }
  return [null, ''];
}

// MUSTER_PRUEFEN=1: nur prüfen, dass jedes Muster genau einmal vorkommt (kein Test, keine Kopie ausser einer)
if (process.env.MUSTER_PRUEFEN === '1') {
  const dir = kopie(); let schlecht = 0;
  for (const [datei, , name, alt] of liste) { const n = readFileSync(join(dir, datei), 'utf8').split(alt).length - 1; if (n !== 1) { schlecht++; console.log('  ?', name, '- Muster kommt', n, '× vor'); } }
  rmSync(dir, { recursive: true, force: true }); console.log(`${liste.length} Mutanten, ${schlecht} mit unpassendem Muster`); process.exit(schlecht ? 1 : 0);
}
console.log('Referenzlauf (unveränderter Stand, alle Stufen und apply_test) …');
{
  const dir = kopie(); const [stufe, aus] = await testen(dir, 'szenarien', true); const [stufeA, ausA] = await testen(dir, 'apply', false);
  rmSync(dir, { recursive: true, force: true });
  if (stufe || stufeA) { console.log('Referenzlauf NICHT grün:', stufe || stufeA); console.log((aus + ausA).split('\n').filter((z) => /✗|FAIL| - |FEHLER|ABBRUCH|Error/.test(z)).slice(0, 14).join('\n')); process.exit(2); }
  console.log('Referenzlauf grün (kombi_test, test_bestellbar_kombi, test_texte schnell/kombi/szenarien, apply_test).');
}
writeFileSync(LOG, `Mutationsprobe ${new Date().toISOString()}\n`);
let erkannt = 0; const uebrig = [], nichtAnwendbar = [], stufenZaehler = {}; let naechster = 0;
async function arbeiter() {
  while (naechster < liste.length) {
    const [datei, art, name, alt, neu, option] = liste[naechster++];
    const dir = kopie(); const p = join(dir, datei); const text = readFileSync(p, 'utf8'); const teile = text.split(alt);
    if (teile.length !== 2) { console.log('  ?', name, '- Muster kommt', teile.length - 1, '× vor (Mutant nicht anwendbar)'); nichtAnwendbar.push(name); rmSync(dir, { recursive: true, force: true }); continue; }
    writeFileSync(p, teile[0] + neu + teile[1]);
    const [stufe, aus] = await testen(dir, art === 'apply' ? 'apply' : 'kombi', option === 'szenarien' || art === 'szenarien' || option === 'browser-szenarien', option === 'browser' || option === 'browser-szenarien', datei.endsWith('/kombi.mjs')); rmSync(dir, { recursive: true, force: true });
    if (stufe) { erkannt++; stufenZaehler[stufe] = (stufenZaehler[stufe] || 0) + 1; } else uebrig.push(name);
    console.log(stufe ? `  erkannt (${stufe})` : '  ÜBERLEBT', name);
    appendFileSync(LOG, `\n### ${stufe ? 'erkannt' : 'ÜBERLEBT'} (${stufe || '-'}) ${name}\n` + (aus || '').split('\n').filter((z) => /✗|FAIL| - |FEHLER|ABBRUCH|Error/.test(z)).slice(0, 3).join('\n') + '\n');
  }
}
await Promise.all(Array.from({ length: PARALLEL }, arbeiter));
console.log(`Mutationsprobe: ${erkannt} von ${liste.length} erkannt` + (nichtAnwendbar.length ? `; nicht anwendbar (?): ${nichtAnwendbar.join('; ')}` : '') + (uebrig.length ? `; übrig: ${uebrig.join('; ')}` : '') + `; erkannt durch Stufe: ${JSON.stringify(stufenZaehler)}`);
process.exit(erkannt === liste.length && !nichtAnwendbar.length ? 0 : 1);
