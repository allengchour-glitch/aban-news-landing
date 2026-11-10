#!/usr/bin/env node
// Mutationsprobe für den gehärteten Bestellweg (Strom 3, 05.11.2026): baut absichtliche Fehler in printful_sync.mjs, lib/printful_bestellweg.mjs und lib/printful_platzierung.mjs ein
// und verlangt, dass mindestens eine der drei Testdateien ROT wird. Gearbeitet wird in einer KOPIE (TMPDIR), das Repo bleibt unberührt.
// Lauf:  /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs          (Exit 0 = alle erkannt, 1 = mindestens einer überlebt, 2 = Mutation nicht anwendbar)
//        --pruefen    prüft nur, ob jede Fundstelle genau einmal vorkommt und kein Mutant ein Syntaxfehler ist;   NUR=<Teil des Namens>   nur diese Mutanten;   SHARD=<i>/<n>   nur jeder n-te Mutant
// Stand 06.11.2026 (WP6): dazu die Mutanten «WP6 …» für die neue Schreibweise _Druckdatei, _vorschau, qd, Karte gegen SKU, Bestellung ohne Design und die Standardwerte des Workflows.
// Stand 09.11.2026 (Phase 1): qd-weicht-ab (PR #3031, Codex) statt der alten Prüfung qdPruefen; neu «P1 …»: Dienst-Standort, Aufpreis-Platzierungen gegen das bezahlte Paket, Kosten-Obergrenze,
// Standardwerte von Bestätigen und KI-Kontrolle, Lesen von Rückseite und Ärmel, Editor 6.4.0 Ende zu Ende; dazu die Preisanpassung printful_reprice.mjs (Weiterblättern, Fehlerbehandlung).
// Ergänzt automation/pod_auswahl_mutation.mjs (die CI-Probe der Preis-/Auswahlseite, die einen Teil der Platzierung ebenfalls mutiert).
// Stand 10.11.2026 (Härtung nach der Gegenprüfung P1): Mutanten «H10 F<Nr>» zu den 27 bestätigten Funden (Zahlung am Knoten, frisches Lesen, Markierung vor dem Anlegen, unbekannte Schlüssel, Herkunft der Datei, Standort/Rechte,
// Vorgabe Trockenlauf, Bestätigungsplan, fail-open-Lesarten, vorhandener Auftrag, Workflow-Schalter, Feldtreue der Abfrage, Deckel, Preisanpassung). Ein Mutant mit Syntaxfehler zählt NICHT als erkannt (Exit 2, «UNGÜLTIG»);
// die Ausgabe trennt Kills durch eine benannte Prüfung von Kills durch eine Ausnahme im Test. Die volle Probe dauert rund 78 Minuten Rechenzeit (gemessen 10.11.2026) und läuft von Hand, auf drei Prozesse verteilt in rund 26 Minuten: SHARD=1/3, 2/3, 3/3; die CI führt nur `--pruefen` aus (Fundstellen
// genau einmal UND kein Mutant mit Syntaxfehler). Mutanten «H10 F22» stehen am Ende der Liste, damit die Nummern der übrigen (und damit die Zuordnung zu den Teilen) unverändert bleiben.
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
export const DATEIEN = [
  'automation/printful_sync.mjs', 'automation/printful_sync_test.mjs',
  'automation/lib/printful_platzierung.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/lib/printful_bestellweg.mjs', 'automation/lib/printful_bestellweg_test.mjs',
  'automation/lib/shopify_secret.mjs',
  'dropship/pod-auswahl/platzierung_mitschnitte.json', 'dropship/pod-auswahl/katalog.json', 'dropship/pod-auswahl/bestellweg_katalog_auszug.json',
  'dropship/selbst-gestalten-fertig-0511/bestellweg/editor_640_mitschnitt.json', 'dropship/selbst-gestalten-fertig-0511/bestellweg/standort_messung_1011.json',   // vom Bestellweg-Test gelesen (Ausmass der Sperre «dienst-standort»)
  'automation/printful_reprice.mjs', 'automation/printful_reprice_test.mjs', 'automation/lib/pod_auswahl_spec.mjs',
  'dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs',
  '.github/workflows/printful-sync.yml', '.github/workflows/printful-reprice.yml', '.github/workflows/luxestyle-automation-tests.yml',
];
const TESTS = ['automation/printful_reprice_test.mjs', 'automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/printful_sync_test.mjs'];   // schnellste zuerst
const B = 'automation/lib/printful_bestellweg.mjs', P = 'automation/lib/printful_platzierung.mjs', S = 'automation/printful_sync.mjs', W = '.github/workflows/printful-sync.yml', R = 'automation/printful_reprice.mjs', RW = '.github/workflows/printful-reprice.yml', CIW = '.github/workflows/luxestyle-automation-tests.yml';

// [Name, Datei, von (muss genau einmal vorkommen), zu]
export const MUTANTEN = [
  // ── Adresse und Eigenschaften der Position
  ['Adresse: http wird akzeptiert', B, "if (u.protocol !== 'https:') return 'keine https-Adresse';", ''],
  ['Adresse: fremder Host wird akzeptiert', B, "if (!hosts.map((h) => h.toLowerCase()).includes(u.hostname.toLowerCase())) return", 'if (false) return'],
  ['Adresse: Zugangsdaten in der Adresse werden akzeptiert', B, 'if (u.username || u.password)', 'if (false)'],
  ['Eigenschaften: leere Druckdatei zählt als Fehler', B, "if (w.trim() === '') continue;", ''],
  ['Eigenschaften: v5 und v6 gemischt fällt nicht auf', B, 'if (stile.size > 1) p(', 'if (false) p('],
  ['Eigenschaften: doppelte v6-Platzierung fällt nicht auf', B, "if (gesehen.has('v6:' + id)) {", 'if (false) {'],
  ['Eigenschaften: doppelte v5-Seite fällt nicht auf', B, "if (gesehen.has('v5:' + seite)) {", 'if (false) {'],
  ['Eigenschaften: der Dateityp aus _pod_karte.dt wird ignoriert', B, '? karte.dt[id] : id', '? id : id'],
  ['Eigenschaften: Datei ohne Eintrag in der Karte fällt nicht auf', B, "if (karte && !karte.pl.includes(id)) p(", 'if (false) p('],
  ['Eigenschaften: Karte ohne Datei fällt nicht auf', B, "if (karte) for (const id of karte.pl) if (typeof id === 'string' && !gesehen.has('v6:' + id)) p(", "if (false) for (const id of karte.pl) if (typeof id === 'string' && !gesehen.has('v6:' + id)) p("],
  ['Eigenschaften: Optionen aus _pod_karte.o werden nicht gelesen', B, 'for (const [id, w] of Object.entries(o.o))', 'for (const [id, w] of [])'],
  ['Eigenschaften: ⚙️-Option gewinnt nicht gegen die Karte (Reihenfolge)', B, "if (mo) { const v = optionWert(w); if (v !== null) optionen[mo[1]] = v; continue; }", 'if (mo) { continue; }'],
  // ── SKU und POD-Erkennung
  ['SKU: die der Variante hat wieder Vorrang', B, 'vid: a || b || null', 'vid: b || a || null'],
  ['SKU: Widerspruch fällt nicht auf', B, 'if (a && b && a !== b)', 'if (false)'],
  ['SKU: Nummer 0 gilt als Variante', B, 'return n > 0 ? n : null;', 'return n >= 0 ? n : null;'],
  ['POD: das Tag printful_personalized_product zählt nicht', B, "|| tags.includes('printful_personalized_product')", '|| false'],
  // ── Optionen, Technik, Konflikte
  ['Optionen: Garnfarben der Stickerei sind nicht Pflicht', B, 'if (g) fehlt(g,', 'if (false) fehlt(g,'],
  ['Optionen: stitch_color ist nicht Pflicht', B, "if (ids.includes('stitch_color') && typen.length) fehlt(", "if (false) fehlt("],
  ['Optionen: yarn_colors bei Strick ist nicht Pflicht', B, "if (strick && ids.includes('yarn_colors')) fehlt(", "if (false) fehlt("],
  ['Optionen: unbekannte Option wird gesendet', B, 'if (!def) { merke(', 'if (false) { merke('],
  ['Optionen: Wert einer Radio-Option wird nicht geprüft', B, 'return k === undefined ? { fehler:', 'return false ? { fehler:'],
  ['Optionen: ungültige Garnfarbe wird gesendet', B, 'if (k === undefined) return { fehler: `«${x}» ist kein erlaubter Wert` };', ''],
  ['Optionen: apparel_front findet thread_colors_apparel nicht', B, "`thread_colors_${rest.replace(/_front$/, '')}`", '`thread_colors_${rest}`'],
  ['Technik: Mischung fällt nicht auf', B, 'return fam.length > 1 ?', 'return fam.length > 5 ?'],
  ['Technik: DTF zählt als Standard', B, "if (/_dtf(_|$)/.test(t)) return 'DTFILM';", ''],
  ['Konflikt: gilt nur in einer Richtung', B, 'zu(k.placement, c); zu(c, k.placement);', 'zu(k.placement, c);'],
  ['Konflikt: Datei «default» wird nicht zu «front»', B, 'const namen = typen.map((t) => platzierungsName(t, produkt));', 'const namen = typen.slice();'],
  ['Konflikt: nicht lesbare Konfliktliste fällt nicht auf', B, 'return typen.length > 1 ? [{ art:', 'return typen.length > 100 ? [{ art:'],
  // ── Auflösung
  ['Auflösung: PNG ohne IHDR wird gelesen', B, 'if (!(b[12] === 0x49', 'if (false && !(b[12] === 0x49'],
  ['Auflösung: PNG-Breite und -Höhe vertauscht', B, 'const breite = u32(16), hoehe = u32(20);', 'const breite = u32(20), hoehe = u32(16);'],
  ['Auflösung: JPEG wird nicht gelesen', B, 'if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {', 'if (false) {'],
  ['Auflösung: fit rechnet wie cover', B, "druckdatei.fillMode === 'fit' ? Math.max(rb, rh) : Math.min(rb, rh)", 'Math.min(rb, rh)'],
  ['Auflösung: genau die Grenze gilt als zu klein', B, 'const ok = dpi + 1e-9 >= min;', 'const ok = dpi > min;'],
  ['Auflösung: Vorgabe-Mindest-dpi 300 statt 72', B, 'export const MIN_DPI_VORGABE = 72;', 'export const MIN_DPI_VORGABE = 300;'],
  ['Auflösung: Platzierung «default» findet die Druckdatei nicht über den Alias', B, 'platz[name] ?? platz[typ]', 'platz[typ]'],
  ['Auflösung: die verdichteten Katalogdaten werden nicht gelesen', B, 'if (!platz && Array.isArray(pf.variant_printfiles_gruppen))', 'if (false)'],
  ['Auflösung: Stickerei ohne Druckdatei-Grösse braucht wieder eine', B, "if (technikFamilie(arten[i]) !== 'EMBROIDERY') weich('aufloesung'", "weich('aufloesung'"],
  ['Auflösung: zu kleine Datei fällt nicht auf', B, 'if (!r.ok) weich(', 'if (false) weich('],
  ['Auflösung: nicht lesbare Datei fällt nicht auf', B, "if (!masse) weich('aufloesung'", "if (false) weich('aufloesung'"],
  ['Datei: 404 der Druckdatei ist kein harter Befund', B, 'if (kopf && (kopf.status === 404 || kopf.status === 410))', 'if (false)'],
  // ── Kosten, Status, Dateistatus
  ['Kosten: Printfuls Steuer wird mitgerechnet', B, 'const ohneSteuer = total - (num(costs.tax) || 0) - (num(costs.vat) || 0);', 'const ohneSteuer = total;'],
  ['Kosten: Verlust fällt nicht auf', B, 'if (nettoChf < nettoMin)', 'if (nettoChf < nettoMin - 1000)'],
  ['Kosten: andere Währung gilt als USD', B, "if (!costs.currency || String(costs.currency).trim().toUpperCase() !== 'USD') return unbek(", 'if (!costs.currency) return unbek('],
  ['H10 F8 Kosten: eine fehlende Währung gilt als USD', B, "if (!costs.currency || String(costs.currency).trim().toUpperCase() !== 'USD') return unbek(", "if (costs.currency && String(costs.currency).trim().toUpperCase() !== 'USD') return unbek("],
  ['Kosten: «calculating» gilt als fertig', B, "if (costs.calculation_status && String(costs.calculation_status).toLowerCase() !== 'done') return", 'if (false) return'],
  ['Kosten: Erlös 0 gilt als bekannt', B, 'if (erloes === null || erloes <= 0)', 'if (erloes === null)'],
  ['Kosten: Wechselkurs 1.2 statt 0.90', B, 'kurs: 0.90,', 'kurs: 1.2,'],
  ['Status: «pending» gilt nicht als bestätigt', B, "new Set(['pending', 'inprocess', 'partial', 'fulfilled', 'inreview'])", "new Set(['inprocess', 'partial', 'fulfilled', 'inreview'])"],
  ['Status: «failed» wird nicht erkannt', B, "if (s === 'failed') return {", "if (false) return {"],
  ['Status: «draft» nach dem Bestätigen gilt als bestätigt', B, "if (s === 'draft') return { art: 'wartet'", "if (s === 'draft') return { art: 'bestaetigt'"],
  ['Dateistatus: Vorschau-Datei zählt', B, "if (!f || f.type === 'preview' || f.type === 'mockup') continue;", 'if (!f) continue;'],
  ['Dateistatus: Warnung bei «ok» wird übergangen', B, 'else if (f.warning) texte.push(', 'else if (false) texte.push('],
  ['Dateistatus: «waiting» wird nicht abgewartet', B, "if (st === 'waiting' || st === 'processing' || st === 'uploading') { wartet = true; continue; }", ''],
  // ── Kennung, Empfänger, Tags, Telegram
  ['Kennung: external_id nicht begrenzt (Normalfall)', B, "if (/^#?[A-Za-z0-9]+$/.test(String(name).trim())) return ('LX' + roh).slice(0, 32);", "if (/^#?[A-Za-z0-9]+$/.test(String(name).trim())) return ('LX' + roh).slice(0, 320);"],
  ['Kennung: external_id nicht begrenzt (mit Bestell-ID)', B, "return 'LX' + roh.slice(0, rest) + 'N' + num;", "return 'LX' + roh + 'N' + num;"],
  ['Kennung: die Bestell-ID wird nicht angehängt (Kollision «#1034-1» und «#10341»)', B, "return 'LX' + roh.slice(0, rest) + 'N' + num;", "return ('LX' + roh).slice(0, 32);"],
  ['Kennung: auch der saubere Name bekommt ein Suffix', B, "if (/^#?[A-Za-z0-9]+$/.test(String(name).trim())) return ('LX' + roh).slice(0, 32);", "if (false) return ('LX' + roh).slice(0, 32);"],
  ['Empfänger: fehlendes Land wird stillschweigend CH', B, "country_code: a.countryCodeV2 || ''", "country_code: a.countryCodeV2 || 'CH'"],
  ['Empfänger: unvollständige Adresse ist kein harter Befund', B, "befunde: fehlt.length ? [{ art: 'adresse', text: `Lieferadresse unvollständig: ${fehlt.join(', ')} fehlt`, hart: true }] : []", 'befunde: []'],
  ['Befundplan: dieselbe Art wird jedes Mal neu gemeldet', B, 'const neu = befunde.filter((b) => !hat.has(befundTag(b.art)));', 'const neu = befunde.slice();'],
  ['Befundplan: ohne Befunde wird trotzdem das Review-Tag gesetzt', B, 'const hinzu = befunde.length ? [', 'const hinzu = true ? ['],
  ['Versuche: der Zähler liest immer 0', B, 'n = Math.max(n, parseInt(m[1], 10));', 'n = 0;'],
  ['KI-Antwort: «PASSED» zählt als PASS', B, '(pass|fail)\\b/i', '(pass|fail)/i'],
  ['KI-Kopie: keine kleinere Kopie für die Kontrolle', B, '${m[1]}c_limit,w_${breite}/${m[2]}', '${m[1]}${m[2]}'],
  ['Telegram-Text: HTML wird nicht maskiert', B, ".replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')", ''],
  // ── Planung einer Bestellung
  ['Plan: über 50 Positionen fällt nicht auf', B, 'if (li && li.pageInfo && li.pageInfo.hasNextPage) hart(', 'if (false) hart('],
  ['Plan: Druckdatei an Nicht-POD-Produkt fällt nicht auf', B, 'if (eig.dateien.length || eig.karte) hart(', 'if (false) hart('],
  ['Plan: SKU ohne Variante fällt nicht auf', B, "if (!sku.vid) { hart('ohne-variante'", "if (false) { hart('ohne-variante'"],
  ['Plan: Position ohne Druckdatei fällt nicht auf', B, 'if (!dateien.length) {\n      // Bestellung ohne Design', 'if (false) {\n      // Bestellung ohne Design'],
  ['Plan: Menge geht verloren', B, 'const quantity = menge;', 'const quantity = 1;'],
  ['Plan: Optionen gehen nicht an Printful', B, 'if (op.optionen.length) item.options = op.optionen;', ''],
  ['Plan: Erlös in Fremdwährung gilt als CHF', B, "String(m.currencyCode || '').toUpperCase() === 'CHF'", 'true'],
  ['Plan: unbekannter Erlös einer Position wird übergangen', B, 'if (betrag === null) erloesBekannt = false; else erloes += betrag;', 'if (betrag === null) { /* übergangen */ } else erloes += betrag;'],
  ['Plan: Fehler der KI-Kontrolle geben frei', B, 'if (k && k.art !== \'ok\' && k.art !== \'trocken\') weich(', 'if (k && k.art === \'fail\') weich('],
  ['Plan: Druckdaten nicht lesbar fällt nicht auf', B, "if (!dd || dd.art !== 'ok') weich('druckdaten'", "if (false) weich('druckdaten'"],
  ['Plan: Positionen werden harter Befund, der Rest läuft trotzdem durch', B, 'if (befunde.slice(bf0).some((b) => b.hart)) continue;      // schon hart gescheitert', '      // schon hart gescheitert'],
  // ── Platzierung
  ['Platzierung: nur eine Platzierung überschreibt die Seite wieder', P, "if (s === 'back' && dr[0] !== 'back') return {", 'if (false) return {'],
  ['Platzierung: doppelte Platzierung fällt nicht auf', P, 'if (belegt.has(name)) merke(', 'if (false) merke('],
  ['Platzierung: Alias «front» für «default» wird nicht anerkannt', P, 'Object.entries(al).some(([id, name]) => name === t && dr.includes(id))', 'false'],
  ['Platzierung: ungültig geschriebene ID wird anerkannt', P, "if (!/^[a-z0-9_]+$/.test(t)) return", 'if (false) return'],
  ['Platzierung: Aliase werden nicht gelesen', P, 'if (Object.keys(aliase).length) info.aliase = aliase;', ''],
  ['Platzierung: ausdrückliche Platzierung wird wie Vorderseite behandelt', P, 'const e = ausdruecklich ? entscheideExplizit(', 'const e = false ? entscheideExplizit('],
  ['Platzierung: Rohantwort geht im Cache verloren', P, 'roh = info ? (r && r.result) || null : null;', 'roh = null;'],
  // ── Der Kleber (printful_sync.mjs)
  ['Kleber: Trockenlauf nur bei «1»', S, "const DRY = !['0', 'false', 'no', 'nein', 'off'].includes(", "const DRY = String(process.env.DRY_RUN) === '1' && !['0', 'false', 'no', 'nein', 'off'].includes("],
  ['Kleber: nach einem bestehenden Auftrag wird nicht gefragt', S, 'if (vorh.status === 200 && vorh.j && vorh.j.result) {', 'if (false) {'],
  ['Kleber: Nachfrage nicht möglich gilt als «kein Auftrag»', S, 'if (vorh.status !== 404) { await vorlaeufigerFehler(', 'if (false) { await vorlaeufigerFehler('],
  ['Kleber: external_id wird nicht mitgesendet', S, '{ external_id: ext, recipient:', '{ recipient:'],
  ['Kleber: Bestätigen trotz gescheitertem Markieren', S, "if (!(await tagsSetzen(tok, o, ['printful-synced'], pfId))) {", 'if (false) {'],
  ['Kleber: Fehler von tagsAdd werden übersehen', S, 'if (!Array.isArray(ue) || ue.length) return false;', ''],
  ['Kleber: Fehler des Metafelds werden übersehen', S, 'if (!Array.isArray(ue2) || ue2.length) return false;', ''],
  ['Kleber: Tag nur mit Statuslesen? Status wird nicht ausgewertet (immer bestätigt)', S, "if (st && st.art === 'bestaetigt') {", 'if (true) {'],
  ['Kleber: Kosten-Befund wird nicht übernommen', S, 'if (!k.ok) weich.push(', 'if (false) weich.push('],
  ['Kleber: abgelehnte Dateien werden nicht übernommen', S, "if (d.art === 'problem') for (const t of d.texte) weich.push(", 'if (false) for (const t of d.texte) weich.push('],
  ['Kleber: ausgeschaltetes Bestätigen fällt nicht auf', S, 'if (!BESTAETIGEN) weich.push(', 'if (false) weich.push('],
  ['Kleber: Bestätigen ohne KI-Schlüssel gilt als bestanden', S, "if (!GEMINI) return { art: 'fehlt'", "if (!GEMINI) return { art: 'ok'"],
  ['Kleber: KI-Fehler (HTTP) gilt als bestanden', S, "if (!g.ok) return { art: 'technisch'", "if (false) return { art: 'technisch'"],
  ['Kleber: KI-Antwort ohne PASS/FAIL gilt als bestanden', S, "if (l === 'pass') return { art: 'ok'", "if (l !== 'fail') return { art: 'ok'"],
  ['Kleber: KI-Schlüssel in der Adresse statt im Kopf', S, "'x-goog-api-key': GEMINI }, body:", "'x-x': GEMINI }, body:"],
  ['Kleber: nur die erste Seite der Bestellungen wird gelesen', S, 'if (!mehr) break;', 'break;'],
  ['Kleber: Bestellungen in Prüfung werden wieder gelesen', S, ' -tag:printful-review\';', "';"],
  ['Kleber: Seitenlimit fehlt', S, 'if (seiten >= MAX_SEITEN) {', 'if (false) {'],
  ['Kleber: Telegram nicht zugestellt wird übergangen', S, 'if (ok === false) { fehlerAdd(`${o.name}: Telegram-Meldung', 'if (false) { fehlerAdd(`${o.name}: Telegram-Meldung'],
  ['Kleber: Fehler führen nicht zu Exit 1', S, 'process.exitCode = 1; }\n  if ((zaehler.bestaetigt', 'process.exitCode = 0; }\n  if ((zaehler.bestaetigt'],
  ['Kleber: der dritte Fehlversuch bleibt ohne Befund', S, 'if (n >= MAX_VERSUCHE) await befundMelden(', 'if (false) await befundMelden('],
  ['Kleber: ein nicht quittiertes Anlegen wird nicht über external_id geprüft', S, 'res.status === 0 || res.status === 408 || res.status === 429 || res.status >= 500 || res.ok) {', 'false) {'],
  ['Kleber: HTTP 401 wird als Befund statt als Fehler behandelt', S, 'if (res.status === 401 || res.status === 403) {', 'if (false) {'],
  ['Kleber: harter Befund verhindert den Auftrag nicht', S, 'if (befunde.some((b) => b.hart) || !plan.items.length) {', 'if (!plan.items.length) {'],
  ['Kleber: Druckdatei-Eigenschaft ohne POD-Tag wird nicht geprüft', S, 'istPod(li) || hatDruckdatei(li)', 'istPod(li)'],
  ['Kleber: weitere Hosts aus PRINTFUL_DATEI_HOSTS gelten nicht', S, "...String(process.env.PRINTFUL_DATEI_HOSTS || '')", "...String('')"],
  ['Kleber: die Datei wird ganz statt nur der Anfang geholt', S, "headers: { Range: 'bytes=0-65535' }, ", ''],
  ['Kleber: Anlegen ohne Zeitlimit', S, "items: plan.items }, 60000);", "items: plan.items }, 0);"],
  ['Kleber: Variantenabfrage ohne Zeitlimit', S, 'signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined', 'signal: undefined'],
  ['Kleber: alte API-Version 2025-01', S, "const API = '2026-01';", "const API = '2025-01';"],
  ['Kleber: ohne PRINTFUL_API_KEY wieder stiller No-op (Exit 0)', S, "if (!PF_KEY) { console.error('❌ Kein PRINTFUL_API_KEY: der Bestellweg kann nichts tun (früher stiller No-op mit Exit 0, jetzt sichtbar).'); process.exit(1); }", "if (!PF_KEY) { console.error('PRINTFUL_API_KEY'); process.exit(0); }"],
  ['Kleber: vorhandener Auftrag bekommt kein Tag/Metafeld', S, "if (!DRY && !(await tagsSetzen(tok, o, ['printful-synced'], ord.id)))", 'if (false)'],
  ['Kleber: Zeitlimit des Laufs fehlt', S, 'if (Date.now() - START > RUN_LIMIT_MS) {', 'if (false) {'],
  ['Kleber: Statuslesen nach dem Bestätigen wartet nicht auf «draft»', S, "return s.art === 'wartet' ? null : s;", 'return s;'],
  // ── Runde 2 (Gegenleser 05.11.2026): Kosten, Stickerei nach Typ, Optionen, Kennung, Menge, Versand
  ['Kosten: Summe 0 gilt als gerechnet', B, 'if (total <= 0) return unbek(', 'if (false) return unbek('],
  ['Kosten: Steuer grösser als die Summe gilt als gerechnet', B, 'if (ohneSteuer <= 0) return unbek(', 'if (false) return unbek('],
  ['Kosten: Mindestgewinn wird ignoriert (nur Verlust zählt)', B, 'if (nettoChf < nettoMin) return', 'if (nettoChf < 0) return'],
  ['Kosten: Text nennt jeden zu kleinen Gewinn «Verlust»', B, "${nettoChf < 0 ? 'Verlust' : 'Gewinn unter dem Mindestgewinn'}", 'Verlust'],
  ['Technik: Zusatzstickerei (addon_embroidery_) zählt nicht als Stickerei', B, "if (/^(addon_)?embroidery_/.test(t)) return 'EMBROIDERY';", "if (/^embroidery_/.test(t)) return 'EMBROIDERY';"],
  ['Garnfarben: Zusatzstickerei sucht die normale Option', B, 'const zusatz = /^addon_embroidery_/.test(t);', 'const zusatz = false;'],
  ['Optionen: Stickerei ohne Garnfarben-Option im Katalog fällt nicht auf', B, 'else merke(`Für die Stickerei', 'else void (`Für die Stickerei'],
  ['Optionen: die Nahtfarbe-Vorgabe überschreibt die Wahl der Kundin', B, "&& typen.length && !('stitch_color' in wahl)) wahl.stitch_color", '&& typen.length) wahl.stitch_color'],
  ['Optionen: die Nahtfarbe-Vorgabe wird auch ohne die Option am Produkt gesetzt', B, "vorgaben.stitch_color && ids.includes('stitch_color') && typen.length", 'vorgaben.stitch_color && typen.length'],
  ['Optionen: Werte mit Leerzeichen werden an jedem Leerzeichen zerlegt', B, 'if (finde(t) !== undefined || !/\\s/.test(t)) return [t];', "if (!/\\s/.test(t)) return [t];"],
  ['Optionen: das Komma trennt keine Werte', B, 'if (/[,;]/.test(t)) return t.split(', 'if (false) return t.split('],
  ['Plan: Stickerei wird an der Datei-ID statt am Typ erkannt', B, 'const arten = typen.map((t) => platzierungsName(t, prod && prod.info));', 'const arten = typen.slice();'],
  ['Plan: entfernte Position (currentQuantity 0) wird trotzdem gedruckt', B, 'if (menge === 0) { entfernt++; continue; }', 'if (false) { entfernt++; continue; }'],
  ['Plan: teilweise entfernte Position zählt mit dem ganzen Umsatz', B, 'const betrag = betrag0 === null ? null : betrag0 * anteil;', 'const betrag = betrag0;'],
  ['Plan: der bezahlte Versand zählt nicht zum Erlös', B, 'const versandChf = pod && erloesBekannt && alleBekannt && versandGanz !== null', 'const versandChf = false && versandGanz !== null'],
  ['Plan: der ganze Versand gehört der Druckposition (Mischbestellung)', B, 'Math.min(versandGanz, versandGanz * erloes / alleSumme)', 'Math.min(versandGanz, versandGanz)'],
  ['Plan: Position in Fremdwährung hebt den Versandanteil nicht auf', B, 'if (betrag === null) alleBekannt = false; else alleSumme += betrag;', 'if (betrag === null) { /* nichts */ } else alleSumme += betrag;'],
  ['Auflösung: JPEG-Kopfzeilen ausser SOF0 werden nicht gelesen', B, 'if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {', 'if (m === 0xc0) {'],
  ['Empfänger: das Bundesland geht nicht an Printful', B, "state_code: a.provinceCode || ''", "state_code: ''"],
  ['Kleber: das Tag wird vor dem Metafeld gesetzt', S, '  try {\n    if (pfId) {\n      const m = await gql(tok, MF_SET', '  try {\n    if (pfId) { await gql(tok, TAG_ADD, { id: o.id, tags });\n      const m = await gql(tok, MF_SET'],
  ['Kleber: nach einem 4xx beim Anlegen wird nicht nachgefragt', S, 'if (nach4.status === 200 && nach4.j && nach4.j.result) {', 'if (false) {'],
  ['Kleber: ein 4xx mit nicht beantwortbarer Nachfrage wird zum harten Befund', S, 'if (nach4.status !== 404) { await vorlaeufigerFehler(', 'if (false) { await vorlaeufigerFehler('],
  ['Kleber: Wartezeit nur noch vier Lesungen', S, 'const WARTE_FOLGE = [2, 4, 6, 8, 12, 16];', 'const WARTE_FOLGE = [2, 4, 6];'],
  ['Kleber: das Warten ignoriert das Zeitlimit des Laufs', S, '      if (Date.now() - START > RUN_LIMIT_MS) break;          // das Zeitlimit', '      // das Zeitlimit'],
  ['Kleber: 429 beim Bestätigen wird nicht wiederholt', S, 'if (c.status === 429) { await pause(', 'if (false) { await pause('],
  ['Kleber: 429 beim Bestätigen gilt als endgültige Ablehnung', S, 'const unklar = !c.ok && (c.status === 0 || c.status === 408 || c.status === 429 || c.status >= 500);', 'const unklar = !c.ok && (c.status === 0 || c.status === 408 || c.status >= 500);'],
  ['Kleber: der bezahlte Versand wird nicht abgefragt', S, '  currentShippingPriceSet{ shopMoney{ amount currencyCode } }\n', ''],
  ['Kleber: currentQuantity wird nicht abgefragt', S, 'id quantity currentQuantity sku title', 'id quantity sku title'],
  ['Kleber: eine entfernte Position macht die Bestellung zum Kandidaten', S, '.filter((li) => li.currentQuantity !== 0);', '.filter(() => true);'],
  ['Kleber: der Trockenlauf zählt anstehende Bestellungen nicht', S, '    zaehler.anstehend++;\n', ''],
  ['Kleber: Befundtexte stehen in der öffentlichen Zusammenfassung', S, "zeilen.push(`${o.name}: [${b.art}]${DETAIL ? ' ' + b.text : ''}`)", "zeilen.push(`${o.name}: [${b.art}] ${b.text}`)"],
  ['Kleber: der Trockenlauf druckt den Telegram-Text ins öffentliche Protokoll', S, "console.log('[DRY] Telegram würde senden' + (DETAIL ?", "console.log('[DRY] Telegram würde senden' + (true ?"],
  ['Kleber: Fehlerdetails stehen im öffentlichen Protokoll', S, "const fehlerLog = (f) => f.kurz + (DETAIL && f.detail ? ' | ' + f.detail : '');", "const fehlerLog = (f) => f.kurz + (f.detail ? ' | ' + f.detail : '');"],
  ['Kleber: die Fehlermeldung an Telegram verliert die Details', S, "const fehlerTg = (f) => f.kurz + (f.detail ? ' | ' + f.detail : '');", 'const fehlerTg = (f) => f.kurz;'],
  ['Kleber: Vorgabe des Mindestgewinns ist 0', S, 'Number.isFinite(NETTO_MIN_ZAHL) ? NETTO_MIN_ZAHL : 4;', 'Number.isFinite(NETTO_MIN_ZAHL) ? NETTO_MIN_ZAHL : 0;'],
  ['Kleber: die Nahtfarbe-Vorgabe erreicht die Planung nicht', S, 'optionVorgaben: OPTION_VORGABEN', 'optionVorgaben: {}'],
  ['Kleber: die Bestell-ID geht nicht in die external_id', S, 'externalId(o.name, o.id)', 'externalId(o.name)'],
  ['Kleber: Datei wird ohne Begrenzung gezogen (Streaming)', S, 'while (n < 65536) {', 'while (true) {'],
  ['Kleber: der Rest der Datei wird nicht abgebrochen', S, 'try { await rd.cancel(); } catch { /* egal */ }', ''],
  ['Kleber: der Bestellname geht unmaskiert an Telegram', S, 'Bestellung <b>${esc(o.name)}</b> ${esc(kopf)}', 'Bestellung <b>${o.name}</b> ${esc(kopf)}'],
  ['Plan: die Variante der Karte (pv) wird nicht gegen die SKU geprüft', B, "if (kpv !== null && kpv !== sku.vid) hart(", "if (false) hart("],
  ['Plan: das Produkt der Karte (m) wird nicht gegen die Variante geprüft', B, "if (km !== null && pid && km !== pid) {", "if (false) {"],
  ['Kleber: die Wartezeit auf Printful wird nicht protokolliert', S, "  console.log(`${o.name}: Printful-Entwurf #${pfId}: Dateien und Kosten ${lese.urteil ? 'fertig' : 'NICHT fertig'} nach ${lese.sek} s Wartezeit`);", ''],
  ['Workflow: ein zweiter Zeitplan', W, "    - cron: '37 13 * * *'\n", "    - cron: '37 13 * * *'\n    - cron: '41 6 * * *'\n"],
  ['Workflow: der Handstart steht standardmässig auf scharf', W, '        default: true', '        default: false'],
  ['Workflow: der Mindestgewinn wird nicht durchgereicht', W, '          PRINTFUL_MIN_NETTO_CHF: ${{ secrets.PRINTFUL_MIN_NETTO_CHF || vars.PRINTFUL_MIN_NETTO_CHF }}\n', ''],
  // ── WP6 (06.11.2026): neue Schreibweise «_Druckdatei», _vorschau, qd, Karte gegen SKU, Bestellung ohne Design, Standardwerte des Workflows
  ['WP6 Schlüssel: «_Druckdatei (…)» wird nicht gelesen', B, 'mn = k.match(SCHL_V6_NEU), mo', 'mn = null, mo'],
  ['WP6 Schlüssel: neue Schreibweise erlaubt Grossbuchstaben in der ID', B, "const SCHL_V6_NEU = /^_Druckdatei \\(([a-z0-9_]+)\\)$/;", "const SCHL_V6_NEU = /^_Druckdatei \\(([A-Za-z0-9_]+)\\)$/;"],
  ['WP6 Schlüssel: nicht lesbarer neuer Schlüssel wird wieder als Editor 5 (Vorderseite) gelesen', B, 'const unlesbar = !m && !mn && seite5 === null && SCHL_DATEI_VERDACHT.test(k);', 'const unlesbar = false;'],
  ['WP6 Schlüssel: «druckdatei» in Kleinschreibung gilt nicht als Verdacht', B, 'const SCHL_DATEI_VERDACHT = /druckdatei|print\\s*file/i;', 'const SCHL_DATEI_VERDACHT = /druckdatei|print\\s*file/;'],
  ['WP6 Mischung: die neue Schreibweise zählt als alte (keine Mischung)', B, "stile.add(m ? 'alt' : mn ? 'neu' : 'v5');", "stile.add(m || mn ? 'alt' : 'v5');"],
  ['WP6 Mischung: dieselbe Platzierung in zwei Schreibweisen meldet zusätzlich «datei-doppelt»', B, "if (gesehen.get('v6:' + id) === stil) p('datei-doppelt'", "if (true) p('datei-doppelt'"],
  ['WP6 Doppelt: dieselbe neue Platzierung zweimal fällt nicht auf', B, "if (gesehen.get('v6:' + id) === stil) p('datei-doppelt'", "if (false) p('datei-doppelt'"],
  ['WP6 _vorschau: wird als Druckdatei gelesen', B, 'const SCHL_DATEI_VERDACHT = /druckdatei|print\\s*file/i;', 'const SCHL_DATEI_VERDACHT = /druckdatei|print\\s*file|vorschau/i;'],
  ['WP6 qd: wird nicht gelesen', B, "if (karte && karte.qd !== undefined && karte.qd !== null) {", 'if (false) {'],
  ['WP6 qd: die Obergrenze 1000 fehlt', B, 'karte.qd >= QD_MIN && karte.qd <= QD_MAX) qd = karte.qd;', 'karte.qd >= QD_MIN) qd = karte.qd;'],
  ['WP6 qd: eine Kommazahl gilt', B, "typeof karte.qd === 'number' && Number.isInteger(karte.qd) &&", "typeof karte.qd === 'number' &&"],
  ['WP6 qd: die Untergrenze ist 0 statt 1', B, 'karte.qd >= QD_MIN && karte.qd <= QD_MAX) qd = karte.qd;', 'karte.qd >= 0 && karte.qd <= QD_MAX) qd = karte.qd;'],
  ['WP6 qd: ein unbrauchbarer Wert ist ein harter Befund', B, 'die Foto-Auflösung laut Editor ist unbekannt`, false);', 'die Foto-Auflösung laut Editor ist unbekannt`, true);'],
  ['WP6 qd: ein unbrauchbarer Wert fällt nicht auf', B, "else p('aufloesung-angabe', `_pod_karte.qd ist keine ganze Zahl", "else void (`_pod_karte.qd ist keine ganze Zahl"],
  ['WP6 Karte: Variante pv ≠ SKU ist nur ein weicher Befund', B, "hart('karte-widerspruch', vor(`Der Editor nennt die Printful-Variante", "weich('karte-widerspruch', vor(`Der Editor nennt die Printful-Variante"],
  ['WP6 Karte: Modell m ≠ SKU-Modell fällt nicht auf', B, 'if (km !== null && skuModell !== null && km !== skuModell) hart(', 'if (false) hart('],
  ['WP6 Karte: Modell m ≠ SKU-Modell ist nur ein weicher Befund', B, "hart('karte-widerspruch', vor(`Der Editor nennt das Printful-Produkt ${km}, die SKU", "weich('karte-widerspruch', vor(`Der Editor nennt das Printful-Produkt ${km}, die SKU"],
  ['WP6 Karte: Modell m ≠ Produkt der Variante ist nur ein weicher Befund', B, "{ hart('karte-widerspruch', vor(`Der Editor nennt das Printful-Produkt ${km}, die Variante", "{ weich('karte-widerspruch', vor(`Der Editor nennt das Printful-Produkt ${km}, die Variante"],
  ['WP6 Karte: nach dem Produkt-Widerspruch laufen die Datei- und KI-Abfragen weiter', B, 'gehört aber zu Produkt ${pid}: es wird kein Auftrag angelegt`)); continue; }', 'gehört aber zu Produkt ${pid}: es wird kein Auftrag angelegt`)); }'],
  ['WP6 SKU: jede SKU mit Zahlenvorsilbe gilt als Modell-SKU', B, 'Number.isInteger(n) && n >= 1 && n <= 99999 ? n : null;', 'Number.isInteger(n) ? n : null;'],
  ['WP6 SKU: die Basis selbst (9100000) gilt als Modell 0', B, 'n >= 1 && n <= 99999', 'n >= 0 && n <= 99999'],
  ['WP6 SKU: die Basis ist 9000000', B, 'export const SKU_BASIS = 9100000;', 'export const SKU_BASIS = 9000000;'],
  ['WP6 Ohne Design: die Meldung nennt den Ablauf nicht', B, ', Ablauf: dropship/wp6-0611/OHNE-DESIGN.md`);', '`);'],
  ['WP6 Ohne Design: «karte-ohne-datei» bleibt zusätzlich in der Meldung', B, "if (befunde[i].art === 'karte-ohne-datei') befunde.splice(i, 1);", 'if (false) befunde.splice(i, 1);'],
  ['WP6 Ohne Design: die Bereinigung löscht auch Befunde anderer Positionen', B, 'for (let i = befunde.length - 1; i >= bf0; i--)', 'for (let i = befunde.length - 1; i >= 0; i--)'],
  ['WP6 Ohne Design: der Titel wird nicht gekürzt (Verweis rutscht über 300 Zeichen)', B, 'titel.slice(0, 60)', 'titel'],
  ['WP6 Ohne Design: nur ein weicher Befund', B, "hart('keine-druckdatei', `Ohne Design bezahlt", "weich('keine-druckdatei', `Ohne Design bezahlt"],
  ['WP6 Kleber: Druckdatei-Eigenschaft in neuer Schreibweise ohne Karte macht die Bestellung nicht zum Kandidaten', S, "const hatDruckdatei = (li) => (li.customAttributes || []).some((a) => /Druckdatei|Print file|^_pod_karte$/i.test((a && a.key) || ''));", "const hatDruckdatei = (li) => (li.customAttributes || []).some((a) => /(^|[^_])Druckdatei|Print file|^_pod_karte$/i.test((a && a.key) || ''));"],
  ['WP6 Workflow: PRINTFUL_AUTO_CONFIRM hat den Standard 1', W, "|| vars.PRINTFUL_AUTO_CONFIRM || '0' }}", "|| vars.PRINTFUL_AUTO_CONFIRM || '1' }}"],
  ['WP6 Workflow: PRINTFUL_KI_KONTROLLE hat den Standard «pflicht»', W, "|| vars.PRINTFUL_KI_KONTROLLE || 'aus' }}", "|| vars.PRINTFUL_KI_KONTROLLE || 'pflicht' }}"],
  ['WP6 Workflow: PRINTFUL_MIN_NETTO_CHF bekommt einen eigenen Standard (0)', W, 'vars.PRINTFUL_MIN_NETTO_CHF }}', "vars.PRINTFUL_MIN_NETTO_CHF || '0' }}"],
  ['WP6 Workflow: die Platzierungs-Bibliothek fehlt im sparse-checkout', W, '            automation/lib/printful_platzierung.mjs\n', ''],
  ['WP6 Workflow: die Geheimnis-Hilfe fehlt im sparse-checkout', W, '            automation/lib/shopify_secret.mjs\n', ''],
  // ── qd-weicht-ab (PR #3031, Codex): Prüfung der Warenkorb-Angabe gegen Katalog und Messung
  ['qd-weicht-ab: qd wird nicht geprüft', B, 'if (qd !== null) {', 'if (false) {'],
  ['qd-weicht-ab: der Parser-Wert eig.qd wird nicht benutzt', B, 'const qd = eig.qd;', 'const qd = null;'],
  ['qd-weicht-ab: die gemessene dpi der Datei wird nicht gesammelt', B, 'gemesseneDpi.push(r.dpi);', ''],
  ['qd-weicht-ab: auch eine Teilmessung wird verglichen', B, 'gemesseneDpi.length > 0 && gemesseneDpi.length === plz.files.length ? Math.min(...gemesseneDpi) : null', 'gemesseneDpi.length > 0 ? Math.min(...gemesseneDpi) : null'],
  ['qd-weicht-ab: verglichen wird mit dem Maximum statt dem Minimum der Messungen', B, 'Math.min(...gemesseneDpi)', 'Math.max(...gemesseneDpi)'],
  ['qd-weicht-ab: die Messung wird gerundet statt abgerundet', B, 'Math.floor(gemessen + 1e-9)', 'Math.round(gemessen)'],
  ['qd-weicht-ab: der Mindestwert des Katalogs wird nicht verglichen', B, 'if ((min !== null && qd < min) || (gemessenGanz !== null && qd !== gemessenGanz)) {', 'if ((gemessenGanz !== null && qd !== gemessenGanz)) {'],
  ['qd-weicht-ab: die Abweichung von der Messung wird nicht verglichen', B, 'if ((min !== null && qd < min) || (gemessenGanz !== null && qd !== gemessenGanz)) {', 'if ((min !== null && qd < min)) {'],
  ['qd-weicht-ab: genau der Mindestwert gilt als zu klein', B, 'if ((min !== null && qd < min) ||', 'if ((min !== null && qd <= min) ||'],
  ['qd-weicht-ab: ist ein harter Befund', B, "weich('qd-weicht-ab',", "hart('qd-weicht-ab',"],
  // ── P1: Dienst-Standort (Fulfillment-Service)
  ['P1 Dienst: ein Dienst-Standort wird nicht erkannt', B, 'if (ort && ort.isFulfillmentService === true) dienst = dienst || ort;', 'if (false) dienst = dienst || ort;'],
  ['P1 Dienst: das Flag als Text «true» gilt als Dienst', B, 'if (ort && ort.isFulfillmentService === true) dienst', 'if (ort && ort.isFulfillmentService) dienst'],
  ['P1 Dienst: stornierte Fulfillment-Orders zählen', B, 'if (st === \'CANCELLED\') continue;', ''],
  ['P1 Dienst: jede Fulfillment-Order zählt für jede Position', B, 'const drinIn = (x) => ((x.lineItems && x.lineItems.edges) || []).some(', 'const drinIn = (x) => true || ((x.lineItems && x.lineItems.edges) || []).some('],
  ['P1 Dienst: ein nicht lesbarer Standort gilt als Händler-Standort', B, "if (offen) return { art: 'unklar', grund: 'der Standort der Fulfillment-Order ist nicht lesbar' };", ''],
  ['P1 Dienst: eine Position ohne Fulfillment-Order gilt als Händler-Standort', B, "if (!gefunden) return { art: 'unklar', grund: 'die Position steht in keiner offenen Fulfillment-Order' };", ''],
  ['P1 Dienst: fehlende Fulfillment-Orders gelten als Händler-Standort', B, "return { art: 'unklar', grund: 'die Bestelldaten enthalten keine Fulfillment-Orders' };", "return { art: 'frei' };"],
  ['P1 Dienst: «dienst-standort» ist nur ein weicher Befund', B, "hart('dienst-standort',", "weich('dienst-standort',"],
  ['P1 Dienst: nach dem Befund laufen die Netzabfragen weiter', B, "(sonst Doppeldruck); im Printful-Dashboard prüfen`)); continue; }", "(sonst Doppeldruck); im Printful-Dashboard prüfen`)); }"],
  ['P1 Dienst: ein unklarer Standort bleibt ohne Befund', B, "if (stdo.art === 'unklar') { hart('dienst-standort-unklar',", "if (false) { hart('dienst-standort-unklar',"],
  ['P1 Dienst: die Abfrage fragt nicht nach dem Dienst-Flag', S, 'assignedLocation{ location{ id name isFulfillmentService } }', 'assignedLocation{ location{ id name } }'],
  ['P1 Dienst: die Abfrage fragt nicht nach den Positionen der Fulfillment-Orders', S, 'lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ lineItem{ id } } } } } } }', 'lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ id } } } } } }'],
  ['P1 Dienst: die Abfrage fragt nicht nach Fulfillment-Orders', S, 'fulfillmentOrders(first:20){ pageInfo{ hasNextPage } edges{ node{ id status assignedLocation', 'fulfillmentOrdersX(first:20){ pageInfo{ hasNextPage } edges{ node{ id status assignedLocation'],
  ['P1 Paket: die Abfrage fragt nicht nach den Optionen der Variante', S, 'variant{ sku title selectedOptions{ name value } }', 'variant{ sku }'],
  // ── P1: Aufpreis-Platzierungen gegen das bezahlte Paket
  ['P1 Aufpreis: kein Aufpreis wird je geprüft', B, 'if (usd > 0 && !gedeckt(typ)) aus.push(', 'if (false) aus.push('],
  ['P1 Aufpreis: Aufpreise unter 1 USD zählen nicht', B, 'if (usd > 0 && !gedeckt(typ)) aus.push(', 'if (usd > 1 && !gedeckt(typ)) aus.push('],
  ['P1 Aufpreis: auch eine bezahlte Platzierung wird gemeldet', B, 'if (usd > 0 && !gedeckt(typ)) aus.push(', 'if (usd > 0) aus.push('],
  ['P1 Aufpreis: ein nicht bestimmbares Paket deckt alles', B, 'if (!Array.isArray(bezahlt)) return false;', 'if (!Array.isArray(bezahlt)) return true;'],
  ['P1 Aufpreis: die Platzierung wird nur nach ID, nicht nach Typname abgeglichen', B, 'if (f && (f.id === typ || f.type === typ) && (namen.has(String(f.id)) || namen.has(String(f.type)))) return true;', ''],
  ['P1 Aufpreis: ein unbekannter Preis ist ein harter Befund', B, "ob sie bezahlt ist, lässt sich nicht prüfen`, hart: false });", "ob sie bezahlt ist, lässt sich nicht prüfen`, hart: true });"],
  ['P1 Aufpreis: auch ein unbekannter Preis der Vorderseite wird gemeldet', B, "if (typ !== 'default' && typ !== 'front') aus.push(", 'if (true) aus.push('],
  ['P1 Aufpreis: ein unbekannter Preis wird verschwiegen', B, "if (typ !== 'default' && typ !== 'front') aus.push(", 'if (false) aus.push('],
  ['P1 Aufpreis: «aufpreis-unbezahlt» ist nur ein weicher Befund', B, "entscheidest du`, hart: true });", "entscheidest du`, hart: false });"],
  ['P1 Aufpreis: ein unlesbarer Preis gilt als 0', B, 'if (!Number.isFinite(n) || n < 0) return null;', 'if (!Number.isFinite(n) || n < 0) continue;'],
  ['P1 Aufpreis: bei mehreren Einträgen zählt der letzte statt der höchste Preis', B, 'if (n > max) max = n;', 'max = n;'],
  ['P1 Aufpreis: ein Katalog ohne Dateiliste ergibt Preis 0', B, 'const dateien = roh && Array.isArray(roh.files) ? roh.files : null;\n  if (!dateien) return null;', 'const dateien = roh && Array.isArray(roh.files) ? roh.files : [];\n  if (!dateien.length) return 0;'],
  ['P1 Aufpreis: das Mockup zählt als Platzierung', B, "f.type !== 'mockup' && (f.id === typ || f.type === typ)", "(f.id === typ || f.type === typ)"],
  ['P1 Aufpreis: die Paket-Funktion der Konfiguration wird ignoriert', B, "(typeof cfg.paket === 'function' ? cfg.paket : paketStandard)(z,", 'paketStandard(z,'],
  ['P1 Aufpreis: ein Paket ohne Liste gilt als alles bezahlt', B, 'paket && Array.isArray(paket.bezahlt) ? paket.bezahlt : null, quelle', 'paket && Array.isArray(paket.bezahlt) ? paket.bezahlt : typen, quelle'],
  ['P1 Aufpreis: nach dem harten Befund laufen Katalog-, Datei- und KI-Abfragen weiter', B, "    if (befunde.slice(bf0).some((b) => b.hart)) continue;\n    let dd = null;", '    let dd = null;'],
  ['P1 Aufpreis: das Standard-Paket deckt die Rückseite', B, "bezahlt: [], quelle: 'Standard: nur Vorderseite bezahlt'", "bezahlt: ['back'], quelle: 'Standard: nur Vorderseite bezahlt'"],
  ['P1 Aufpreis: das Standard-Paket ist «nicht bestimmbar»', B, "bezahlt: [], quelle: 'Standard: nur Vorderseite bezahlt'", "bezahlt: null, quelle: 'Standard: nur Vorderseite bezahlt'"],
  ['P1 Paket aus Option: ein unbekannter Wert gilt als Vorgabe', B, "{ bezahlt: null, quelle: `Option «${option}» = «${wert}» ist kein bekanntes Paket` }", "{ bezahlt: vorgabe, quelle: `Option «${option}» = «${wert}» ist kein bekanntes Paket` }"],
  ['P1 Paket aus Option: der Optionsname ist schreibweisenabhängig', B, "String(x.name || '').trim().toLowerCase() === String(option).toLowerCase()", "String(x.name || '').trim() === String(option)"],
  ['P1 Paket aus Option: der Wert wird nicht getrimmt', B, "String(opts[0].value == null ? '' : opts[0].value).trim()", "String(opts[0].value == null ? '' : opts[0].value)"],
  ['P1 Paket aus Option: fehlt die Option, ist das Paket nicht bestimmbar statt Vorgabe', B, "{ bezahlt: Array.isArray(vorgabe) ? vorgabe.slice() : [], quelle: `Option «${option}» fehlt an der Variante: Vorgabe` }", "{ bezahlt: null, quelle: `Option «${option}» fehlt an der Variante: Vorgabe` }"],
  ['P1 Paket aus Option: die Liste wird nicht kopiert', B, 'Array.isArray(liste) ? { bezahlt: liste.slice(),', 'Array.isArray(liste) ? { bezahlt: liste,'],
  ['P1 Kleber: PRINTFUL_PAKET_BEZAHLT wird ignoriert', S, 'const paketVon = () => (PAKET_BEZAHLT.length ?', 'const paketVon = () => (false ?'],
  ['P1 Kleber: das Paket geht nicht an den Plan', S, 'optionVorgaben: OPTION_VORGABEN, paket: paketVon, scopeHinweis })', 'optionVorgaben: OPTION_VORGABEN, scopeHinweis })'],
  ['P1 Kleber: eine ungültige Platzierungs-ID in PRINTFUL_PAKET_BEZAHLT wird hingenommen', S, 'if (PAKET_FEHLER.length) {', 'if (false) {'],
  // ── P1: Kosten-Obergrenze
  ['P1 Obergrenze: die Obergrenze wird nie geprüft', B, 'if (grenze !== null && grenze > 0 && total > grenze) return', 'if (false) return'],
  ['P1 Obergrenze: genau die Grenze gilt als zu teuer', B, 'grenze > 0 && total > grenze', 'grenze > 0 && total >= grenze'],
  ['P1 Obergrenze: die Grenze 0 sperrt alles', B, 'if (grenze !== null && grenze > 0 && total > grenze)', 'if (grenze !== null && total > grenze)'],
  ['P1 Obergrenze: ein Text als Grenze wird nicht gelesen', B, 'const grenze = num(maxUsd);', 'const grenze = typeof maxUsd === "number" ? maxUsd : null;'],
  ['P1 Obergrenze: die Obergrenze vergleicht die Ware ohne Steuer', B, 'total > grenze) return { ok: false, art: \'kosten-obergrenze\'', '(total - (num(costs.tax) || 0)) > grenze) return { ok: false, art: \'kosten-obergrenze\''],
  ['P1 Obergrenze: sie gilt erst nach der Erlösrechnung', B, "  // Absolute Obergrenze je Auftrag (PRINTFUL_MAX_KOSTEN_USD", "  const erloes0 = num(erloesChf); if (erloes0 === null || erloes0 <= 0) return unbek('Erlös der Positionen unbekannt');\n  // Absolute Obergrenze je Auftrag (PRINTFUL_MAX_KOSTEN_USD"],
  ['P1 Obergrenze: der Kleber reicht sie nicht an die Kostenprüfung', S, 'nettoMin: NETTO_MIN, maxUsd: MAX_KOSTEN_USD })', 'nettoMin: NETTO_MIN })'],
  ['P1 Obergrenze: ein unbrauchbarer Wert wird still ignoriert', S, 'if (MAX_KOSTEN_FEHLER) {', 'if (false) {'],
  ['P1 Obergrenze: «0» ist eine Grenze statt aus', S, "MAX_KOSTEN_ROH === '' || MAX_KOSTEN_ROH === '0' || MAX_KOSTEN_ROH === 'aus'", "MAX_KOSTEN_ROH === '' || MAX_KOSTEN_ROH === 'aus'"],
  ['P1 Obergrenze: «aus» ist ein Konfigurationsfehler', S, "MAX_KOSTEN_ROH === '' || MAX_KOSTEN_ROH === '0' || MAX_KOSTEN_ROH === 'aus'", "MAX_KOSTEN_ROH === '' || MAX_KOSTEN_ROH === '0'"],
  ['P1 Obergrenze: eine negative Zahl ist eine gültige Grenze', S, 'Number.isFinite(MAX_KOSTEN_USD) && MAX_KOSTEN_USD > 0', 'Number.isFinite(MAX_KOSTEN_USD)'],
  ['P1 Obergrenze: der Workflow reicht sie nicht durch', W, '          PRINTFUL_MAX_KOSTEN_USD: ${{ secrets.PRINTFUL_MAX_KOSTEN_USD || vars.PRINTFUL_MAX_KOSTEN_USD }}\n', ''],
  ['P1 Obergrenze: der Workflow setzt einen eigenen Standard', W, 'vars.PRINTFUL_MAX_KOSTEN_USD }}', "vars.PRINTFUL_MAX_KOSTEN_USD || '50' }}"],
  ['P1 Workflow: PRINTFUL_PAKET_BEZAHLT wird durchgereicht', W, '          PRINTFUL_MAX_KOSTEN_USD:', '          PRINTFUL_PAKET_BEZAHLT: ${{ secrets.PRINTFUL_PAKET_BEZAHLT }}\n          PRINTFUL_MAX_KOSTEN_USD:'],
  // ── P1: Standardwerte des Skripts = Standardwerte des Workflows
  ['P1 Standard: das Skript bestätigt ohne Angabe', S, "process.env.PRINTFUL_AUTO_CONFIRM == null ? '' : process.env.PRINTFUL_AUTO_CONFIRM", "process.env.PRINTFUL_AUTO_CONFIRM == null ? '1' : process.env.PRINTFUL_AUTO_CONFIRM"],
  ['P1 Standard: jede Angabe ausser «aus» bestätigt (ein Tippfehler bestätigt)', S, 'const AUTO_CONFIRM = EIN.includes(', "const AUTO_CONFIRM = !['0', 'false', 'no', 'nein', 'off', 'aus'].includes("],
  ['P1 Standard: nur «1» bestätigt', S, "const EIN = ['1', 'true', 'ja', 'yes', 'on', 'an'];", "const EIN = ['1'];"],
  ['P1 Standard: die KI-Kontrolle ist ohne Angabe Pflicht', S, "const KI = KI_ROH === '' || KI_ROH === 'aus' ? 'aus' : 'pflicht';", "const KI = KI_ROH === 'aus' ? 'aus' : 'pflicht';"],
  ['P1 Standard: ein Tippfehler schaltet die KI-Kontrolle ab', S, "const KI = KI_ROH === '' || KI_ROH === 'aus' ? 'aus' : 'pflicht';", "const KI = KI_ROH === 'pflicht' ? 'pflicht' : 'aus';"],
  ['P1 Standard: «Pflicht» in Grossschreibung gilt nicht', S, ".trim().toLowerCase();\nconst KI = ", ".trim();\nconst KI = "],
  // ── P1: Rückseite und Ärmel lesen
  ['P1 Rückseite: die Platzierung «back» wird als Vorderseite gelesen', B, "seite: id === 'back' ? 'back' : id === 'front' || id === 'default' ? 'front' : null", "seite: id === 'back' ? 'front' : id === 'front' || id === 'default' ? 'front' : null"],
  ['P1 Ärmel: eine Platzierung ohne Seite (sleeve_left) wird als Rückseite gelesen', B, "id === 'front' || id === 'default' ? 'front' : null", "id === 'front' || id === 'default' ? 'front' : 'back'"],
  ['P1 Ärmel: ein Unterstrich in der Platzierungs-ID wird nicht gelesen (alte Schreibweise)', B, "Druckdatei \\(([a-z0-9_]+)\\)$/u;", "Druckdatei \\(([a-z0-9]+)\\)$/u;"],
  ['P1 Ärmel: ein Unterstrich in der Platzierungs-ID wird nicht gelesen (neue Schreibweise)', B, "const SCHL_V6_NEU = /^_Druckdatei \\(([a-z0-9_]+)\\)$/;", "const SCHL_V6_NEU = /^_Druckdatei \\(([a-z0-9]+)\\)$/;"],
  ['P1 Rückseite v5: der Schlüssel «Hinten» zählt als Vorderseite', B, "return /^(Hinten|Back)$/.test(m[1] || '') ? 'back' : 'front';", "return 'front';"],
  ['P1 Rückseite: der Auftrag sendet jede Datei als Vorderseite', P, 'files.push({ type: e.platzierung, url: d.url });', "files.push({ type: 'front', url: d.url });"],
  ['P1 Rückseite: eine ausdrücklich genannte Platzierung gilt nie als gesichert', P, 'const gueltig = dr.includes(t) ||', 'const gueltig = false && dr.includes(t) ||'],
  // ── P1: printful_reprice.mjs
  ['P1 Reprice: Varianten über 100 werden nicht weitergeblättert', R, 'while(pi?.hasNextPage){', 'while(false){'],
  ['P1 Reprice: die Produktabfrage fragt nicht nach der nächsten Variantenseite', R, 'id handle title variants(first:100){ pageInfo{ hasNextPage endCursor } edges', 'id handle title variants(first:100){ edges'],
  ['P1 Reprice: userErrors werden nur protokolliert', R, "if((r.userErrors||[]).length){ fehlerAdd(p.title,'userErrors '+JSON.stringify(r.userErrors).slice(0,200)); ok=false; break; }", "if((r.userErrors||[]).length){ console.error('userErrors'); }"],
  ['P1 Reprice: eine fehlende Antwort zählt als Erfolg', R, "if(!r){ fehlerAdd(p.title,'Schreibaufruf ohne Antwort (productVariantsBulkUpdate fehlt)'); ok=false; break; }", ''],
  ['P1 Reprice: Fehler ändern den Exit-Code nicht', R, 'if(FEHLER.length){ process.exitCode=1; }', ''],
  ['P1 Reprice: GraphQL-Fehler werfen nicht', R, 'if(j.errors){ const text=', 'if(false){ const text='],
  ['P1 Reprice: HTTP 429 und 5xx werden nicht wiederholt', R, "if(r.status===429||r.status>=500){ letzte=new Error('Shopify HTTP '+r.status); if(i<2) await pause(PAUSE*(i+1)); continue; }", ''],
  ['P1 Reprice: Throttled wird nicht wiederholt', R, 'if(/throttled/i.test(text)&&i<2){ await pause(PAUSE*(i+1)); continue; } throw letzte;', 'throw letzte;'],
  ['P1 Reprice: alle Varianten in einem Schreibaufruf', R, 'const CHUNK=100;', 'const CHUNK=100000;'],
  ['P1 Reprice: ein Fehler der Produktliste bleibt still', R, "if(!c){ fehlerAdd('Produktliste','Query-Fehler '+JSON.stringify(d).slice(0,200)); break; }", 'if(!c){ break; }'],
  ['P1 Reprice: ein Produkt mit unvollständigen Varianten wird trotzdem bearbeitet', R, 'if(!varianten){ fehlgeschlagen++; continue; }', 'if(!varianten){ fehlgeschlagen++; }'],
  ['P1 Reprice: ein Fehler beim Weiterblättern wird verschluckt', R, "}catch(e){ fehlerAdd(p.title,'weitere Varianten nicht lesbar: '+(e&&e.message||e)); return null; }", '}catch(e){ break; }'],
  ['P1 Reprice: nach einem Fehler im ersten Stück werden weitere Stücke gesendet', R, "fehlerAdd(p.title,'userErrors '+JSON.stringify(r.userErrors).slice(0,200)); ok=false; break; }", "fehlerAdd(p.title,'userErrors '+JSON.stringify(r.userErrors).slice(0,200)); ok=false; }"],
  ['P1 Reprice: ein gescheiterter Auth-Versuch beendet mit Exit 0', R, "console.error('❌ Shopify-Auth fehlgeschlagen'); process.exit(1);", "console.error('❌ Shopify-Auth fehlgeschlagen'); process.exit(0);"],
  ['P1 Reprice: die Sperre der «Selbst gestalten»-Produkte fehlt', R, 'if(!MIT_AUSWAHL && AUSWAHL.has(p.handle)){', 'if(false){'],
  ['P1 Reprice: das fehlgeschlagene Produkt zählt als angepasst', R, 'if(!ok){ fehlgeschlagen++; continue; }', 'if(!ok){ fehlgeschlagen++; }'],
  // ── HÄRTUNG 10.11.2026 (Gegenprüfung P1, 27 bestätigte Funde). Jeder Mutant steht für eine Zusage dieser Runde; «H10» + Fundnummer.
  // Fund 0: Zahlung am Knoten (Testbestellung, Storno, Erstattung, fehlende Felder)
  ['H10 F0 Abfrage: test und displayFinancialStatus werden nicht abgefragt', S, 'id name email tags cancelledAt test displayFinancialStatus\n', 'id name email tags cancelledAt\n'],
  ['H10 F0 Abfrage: test wird nicht abgefragt', S, 'cancelledAt test displayFinancialStatus\n', 'cancelledAt displayFinancialStatus\n'],
  ['H10 F0 Abfrage: displayFinancialStatus wird nicht abgefragt', S, 'cancelledAt test displayFinancialStatus\n', 'cancelledAt test\n'],
  ['H10 F0 Abfrage: cancelledAt wird nicht abgefragt', S, 'email tags cancelledAt test', 'email tags test'],
  ['H10 F0 Suche: Testbestellungen werden nicht ausgeschlossen', S, ' -test:true -tag:printful-synced', ' -tag:printful-synced'],
  ['H10 F0 Suche: «bezahlt» wird nicht verlangt', S, 'status:open financial_status:paid fulfillment_status', 'status:open fulfillment_status'],
  ['H10 F0 Liste: die Zahlung wird am Knoten nicht geprüft', S, "if (!z.ok) { if (z.art === 'unlesbar') fehlerAdd(", "if (false) { if (z.art === 'unlesbar') fehlerAdd("],
  ['H10 F0 Liste: ein unlesbarer Zahlungsstatus bleibt still', S, "if (z.art === 'unlesbar') fehlerAdd(`${n.name}: Zahlungsstatus nicht lesbar", "if (false) fehlerAdd(`${n.name}: Zahlungsstatus nicht lesbar"],
  ['H10 F0 zahlungPruefen: eine Testbestellung wird nicht erkannt', B, "if (n.test === true) return { ok: false, art: 'test'", "if (false) return { ok: false, art: 'test'"],
  ['H10 F0 zahlungPruefen: ein fehlendes Feld «test» gilt als kein Test', B, "if (n.test !== false) return { ok: false, art: 'unlesbar', text: 'Das Feld «test» fehlt in der Antwort' };", ''],
  ['H10 F0 zahlungPruefen: ein fehlendes Feld «cancelledAt» gilt als nicht storniert', B, 'if (n.cancelledAt === undefined) return {', 'if (false) return {'],
  ['H10 F0 zahlungPruefen: ein Storno wird nicht erkannt', B, "if (n.cancelledAt) return { ok: false, art: 'storniert'", "if (false) return { ok: false, art: 'storniert'"],
  ['H10 F0 zahlungPruefen: ein fehlender Zahlungsstatus gilt als bezahlt', B, "if (typeof n.displayFinancialStatus !== 'string' || !n.displayFinancialStatus) return {", 'if (false) return {'],
  ['H10 F0 zahlungPruefen: nur PENDING gilt als unbezahlt', B, "if (n.displayFinancialStatus.toUpperCase() !== 'PAID') return", "if (n.displayFinancialStatus.toUpperCase() === 'PENDING') return"],
  ['H10 F0 zahlungPruefen: «paid» in Kleinschreibung gilt nicht', B, "if (n.displayFinancialStatus.toUpperCase() !== 'PAID') return", "if (n.displayFinancialStatus !== 'PAID') return"],
  // Fund 1: frisch lesen vor dem Anlegen und vor dem Bestätigen
  ['H10 F1 Kleber: vor dem Anlegen wird nicht frisch gelesen', S, 'const fr = await frischLesen(tok, o, \'anlegen\', soll);', 'const fr = { art: \'ok\' };'],
  ['H10 F1 Kleber: vor dem Bestätigen wird nicht frisch gelesen', S, 'const fr2 = await frischLesen(tok, o, \'bestaetigen\', soll);', 'const fr2 = { art: \'ok\' };'],
  ['H10 F1 Kleber: eine Zahlungsänderung vor dem Anlegen wird übergangen', S, "if (fr.art === 'zahlung') {", 'if (false) {'],
  ['H10 F1 Kleber: eine unlesbare frische Lesung vor dem Anlegen legt trotzdem an', S, "if (fr.art !== 'ok') { await vorlaeufigerFehler(", 'if (false) { await vorlaeufigerFehler('],
  ['H10 F1 Kleber: ein anderer Lauf (schon bearbeitet) wird nicht beachtet', S, "if (fr.art === 'schon-bearbeitet') {", 'if (false) {'],
  ['H10 F1 Kleber: nach einer Änderung vor dem Bestätigen wird trotzdem bestätigt', S, "if (fr2.art !== 'ok') {", 'if (false) {'],
  ['H10 F1 frischLesen: die Zahlung wird nicht geprüft', S, '  const z = zahlungPruefen(n);\n  if (!z.ok) return z.art', '  const z = { ok: true };\n  if (!z.ok) return z.art'],
  ['H10 F1 frischLesen: die ID der gelesenen Bestellung wird nicht verglichen', S, "if (!n || typeof n !== 'object' || n.id !== o.id)", "if (!n || typeof n !== 'object')"],
  ['H10 F1 frischLesen: ein fehlendes Feld «tags» gilt als in Ordnung', S, "if (!tags) return { art: 'unlesbar', text: 'Das Feld «tags» fehlt in der Antwort' };", ''],
  ['H10 F1 frischLesen: ein anderer Lauf mit printful-synced/printful-review wird nicht beachtet', S, "if (tags.includes('printful-synced') || tags.includes(REVIEW_TAG)) return {", 'if (false) return {'],
  ['H10 F1 frischLesen: eine junge Markierung eines anderen Laufs wird nicht beachtet', S, 'if (anlegenGesperrt(alter)) return { art: \'schon-bearbeitet\'', 'if (false) return { art: \'schon-bearbeitet\''],
  // Fund 6: Markierung VOR dem Anlegen, Sperre 60 Minuten, Nachfrage nach unquittiertem Anlegen
  ['H10 F6 Kleber: die Markierung vor dem Anlegen wird nicht gesetzt', S, 'if (!(await tagsSetzen(tok, o, [meinTag]))) {', 'if (false) {'],
  ['H10 F6 Kleber: scheitert die Markierung, wird trotzdem angelegt', S, 'Markierung vor dem Anlegen nicht gesetzt: es wird nichts angelegt`); return; }', 'Markierung vor dem Anlegen nicht gesetzt: es wird nichts angelegt`); }'],
  ['H10 F6 Kleber: die Sperre nach einer jungen Markierung fehlt', S, 'if (anlegenGesperrt(frueher)) {', 'if (false) {'],
  ['H10 F6 anlegenAlterMin: zählt die älteste statt der jüngsten Markierung', B, '(jung === null || ms > jung)', '(jung === null || ms < jung)'],
  ['H10 F6 anlegenAlterMin: ein Alter aus der Zukunft wird negativ', B, 'Math.max(0, Math.floor((jetztMs - jung) / 60000))', 'Math.floor((jetztMs - jung) / 60000)'],
  ['H10 F6 Sperre dauert nur 5 statt 60 Minuten', B, 'export const ANLEGEN_SPERRE_MIN = 60;', 'export const ANLEGEN_SPERRE_MIN = 5;'],
  ['H10 F6 anlegenTag: der Monat zählt ab 0', B, 'zwei(d.getUTCMonth() + 1)', 'zwei(d.getUTCMonth())'],
  ['H10 F6/F18 Kleber: die Nachfrage nach einem unquittierten Anlegen fragt eine andere external_id', S, "const nach = await pfLesen('/orders/@' + encodeURIComponent(ext), 2);\n      if (nach.status === 200", "const nach = await pfLesen('/orders/@' + encodeURIComponent(ext + 'x'), 2);\n      if (nach.status === 200"],
  // Fund 2/23: unbekannte Druckdatei-Schlüssel
  ['H10 F2 Verdacht: «Print  file» (zwei Leerzeichen) fällt nicht auf', B, '|print\\s*file/i;', '|print file/i;'],
  ['H10 F2 Verdacht: das Wort «Druckdatei» fehlt', B, 'const SCHL_DATEI_VERDACHT = /druckdatei|print\\s*file/i;', 'const SCHL_DATEI_VERDACHT = /print\\s*file/i;'],
  ['H10 F2 ein unbekannter Schlüssel ist nur ein weicher Befund', B, "es wird nichts geraten`, true); continue; }", "es wird nichts geraten`, false); continue; }"],
  ['H10 F2 ein unbekannter Schlüssel wird nach dem Befund trotzdem als Datei gelesen', B, "es wird nichts geraten`, true); continue; }", "es wird nichts geraten`, true); }"],
  ['H10 F2 die Klammer eines v5-Schlüssels darf jeder Text sein', B, "const SEITE_V5 = '(Vorne|Hinten|Front|Back)';", "const SEITE_V5 = '([A-Za-z_]+)';"],
  // Fund 3: Herkunft der Druckdatei
  ['H10 F3 Adresse: ein Rückstrich wird akzeptiert', B, "if (w.includes('\\\\')) return 'Adresse enthält einen Rückstrich';", ''],
  ['H10 F3 Adresse: ein Port wird akzeptiert', B, "if (u.port) return 'Adresse enthält einen Port';", ''],
  ['H10 F3 Adresse: eine fremde Cloudinary-Cloud wird akzeptiert', B, 'if (!u.pathname.startsWith(vor)) return \'Cloudinary-Adresse nicht aus der eigenen Cloud unter /image/upload/\';', ''],
  ['H10 F3 Adresse: /image/fetch/ und andere Pfade der eigenen Cloud werden akzeptiert', B, 'const vor = `/${EIGENE_CLOUDINARY_CLOUD}/image/upload/`;', 'const vor = `/${EIGENE_CLOUDINARY_CLOUD}/`;'],
  ['H10 F3 Adresse: die eigene Cloud heisst anders als im Editor', B, "export const EIGENE_CLOUDINARY_CLOUD = 'dwyi6kkrl';", "export const EIGENE_CLOUDINARY_CLOUD = 'dwyi6kkrl2';"],
  ['H10 F3/F18 Adresse: eine Host-Endung (xres.cloudinary.com) wird akzeptiert', B, "if (!hosts.map((h) => h.toLowerCase()).includes(u.hostname.toLowerCase())) return", "if (!hosts.some((h) => u.hostname.toLowerCase().endsWith(h.toLowerCase()))) return"],
  ['H10 F3 Datei: die Adresse wird nicht normalisiert weitergegeben (v6)', B, "url: adresseNormal(w), quelle: 'v6'", "url: w, quelle: 'v6'"],
  ['H10 F3 Kopf-Abruf: Weiterleitungen werden blind verfolgt', S, "{ headers: { Range: 'bytes=0-65535' }, redirect: 'manual', signal", "{ headers: { Range: 'bytes=0-65535' }, redirect: 'follow', signal"],
  ['H10 F3 Kopf-Abruf: das Ziel einer Weiterleitung wird nicht gegen die Hostliste geprüft', S, 'if (!ziel || sprung >= 3 || adresseProblem(ziel, HOSTS)) return', 'if (!ziel || sprung >= 3) return'],
  ['H10 F3 Kopf-Abruf: Weiterleitungen sind unbegrenzt', S, 'if (!ziel || sprung >= 3 || adresseProblem(ziel, HOSTS)) return', 'if (!ziel || adresseProblem(ziel, HOSTS)) return'],
  ['H10 F3 Kopf-Abruf: eine erlaubte Weiterleitung wird nicht verfolgt', S, 'return holeKopf(ziel, sprung + 1);', 'return { status: 0, bytes: null };'],
  // Fund 4/18/21: Dienst-Standort
  ['H10 F4 Standort: eine abgeschnittene Order-Liste gilt als vollständig', B, 'unvollstaendig = fos.pageInfo && fos.pageInfo.hasNextPage ?', 'unvollstaendig = false && fos.pageInfo.hasNextPage ?'],
  ['H10 F4 Standort: eine abgeschnittene Positionsliste gilt als vollständig', B, 'if (fo.lineItems && fo.lineItems.pageInfo && fo.lineItems.pageInfo.hasNextPage) unvollstaendig =', 'if (false) unvollstaendig ='],
  ['H10 F4 Standort: eine unvollständige Liste ergibt trotzdem «frei»', B, "if (unvollstaendig) return { art: 'unklar', grund: unvollstaendig };", ''],
  ['H10 F18 (D3) Standort: Dienst plus unlesbarer Standort ergibt nur «unklar»', B, "if (dienst) return { art: 'dienst', name:", "if (dienst && !offen) return { art: 'dienst', name:"],
  ['H10 F4 Abfrage: die Order-Liste fragt nicht nach dem Seitenkopf', S, 'fulfillmentOrders(first:20){ pageInfo{ hasNextPage } edges{', 'fulfillmentOrders(first:20){ edges{'],
  ['H10 F4 Abfrage: die Positionsliste der Order fragt nicht nach dem Seitenkopf', S, 'lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ lineItem{ id } } } } } } }', 'lineItems(first:50){ edges{ node{ lineItem{ id } } } } } } }'],
  ['H10 F4/F13 Abfrage: der Status der Fulfillment-Order wird nicht abgefragt', S, 'edges{ node{ id status assignedLocation', 'edges{ node{ id assignedLocation'],
  ['H10 F21 Kleber: die Rechte des Tokens werden nicht gelesen', S, 'const scopes = await scopesLesen(tok);', "const scopes = { art: 'ok', fehlt: [] };"],
  ['H10 F21 Kleber: ein fehlendes Recht bricht den scharfen Lauf nicht ab', S, "while (kandidaten.length < MAX && !(scopes.art === 'fehlt' && !DRY)) {", 'while (kandidaten.length < MAX) {'],
  ['H10 F21 Kleber: ein fehlendes Recht wird nicht als Fehler gemeldet', S, "if (scopes.art === 'fehlt') { scopeHinweis =", "if (false) { scopeHinweis ="],
  ['H10 F21 Kleber: der Befundtext nennt das fehlende Recht nicht', S, "scopeHinweis = `dem Token fehlt das Recht ${scopes.fehlt.join(', ')}`;", "scopeHinweis = '';"],
  ['H10 F21 Plan: das fehlende Recht steht nicht im Befundtext', B, "${cfg.scopeHinweis ? '; ' + cfg.scopeHinweis : ''}", ''],
  ['H10 F21 scopesBewerten: write_ der Händler-Standorte ersetzt read_ nicht', B, "['read_merchant_managed_fulfillment_orders', 'write_merchant_managed_fulfillment_orders']", "['read_merchant_managed_fulfillment_orders']"],
  ['H10 F21 scopesBewerten: eine nicht abfragbare Liste gilt als fehlend', B, "if (!Array.isArray(handles)) return { art: 'unbekannt', fehlt: [] };", "if (!Array.isArray(handles)) return { art: 'fehlt', fehlt: [] };"],
  ['H10 F4 Plan: «dienst-standort-unklar» ist nur ein weicher Befund', B, "if (stdo.art === 'unklar') { hart('dienst-standort-unklar',", "if (stdo.art === 'unklar') { weich('dienst-standort-unklar',"],
  ['H10 F4 Plan: nach «dienst-standort-unklar» laufen die Netzabfragen weiter', B, "Fulfillment-Orders der Bestellung im Shopify-Admin ansehen, im Printful-Dashboard prüfen`)); continue; }", "Fulfillment-Orders der Bestellung im Shopify-Admin ansehen, im Printful-Dashboard prüfen`)); }"],
  // Fund 5/20/24: Vorgabe Trockenlauf
  ['H10 F5 Kleber: ohne DRY_RUN wird geschrieben', S, "const DRY = !['0', 'false', 'no', 'nein', 'off'].includes(String(process.env.DRY_RUN == null ? '' : process.env.DRY_RUN)", "const DRY = !['', '0', 'false', 'no', 'nein', 'off'].includes(String(process.env.DRY_RUN == null ? '' : process.env.DRY_RUN)"],
  ['H10 F5 Kleber: nur bestimmte Wörter sind Trockenlauf (ein Tippfehler schreibt)', S, "const DRY = !['0', 'false', 'no', 'nein', 'off'].includes(", "const DRY = ['1', 'true', 'ja', 'yes', 'on'].includes("],
  ['H10 F5 Kleber: «off» gilt nicht als ausdrückliches Nein', S, "const DRY = !['0', 'false', 'no', 'nein', 'off'].includes(", "const DRY = !['0', 'false', 'no', 'nein'].includes("],
  // Fund 7: wann bestätigt der Sync selbst
  ['H10 F7 bestaetigenPlan: ohne AUTO_CONFIRM wird bestätigt', B, 'if (!autoConfirm) return { bestaetigen: false,', 'if (false) return { bestaetigen: false,'],
  ['H10 F7 bestaetigenPlan: ohne Kostenobergrenze wird bestätigt', B, 'if (maxKostenAus) return { bestaetigen: false, grund:', 'if (false) return { bestaetigen: false, grund:'],
  ['H10 F7 bestaetigenPlan: ohne Kostenobergrenze ist es kein Konfigurationsfehler', B, "konfigFehler: 'PRINTFUL_AUTO_CONFIRM=1 verlangt eine Kostenobergrenze:", "konfigFehler: null && 'PRINTFUL_AUTO_CONFIRM=1 verlangt eine Kostenobergrenze:"],
  ['H10 F7 bestaetigenPlan: ohne KI-Kontrolle wird bestätigt', B, "if (ki !== 'pflicht') return { bestaetigen: false,", 'if (false) return { bestaetigen: false,'],
  ['H10 F7 Kleber: ein Konfigurationsfehler beendet den Lauf nicht', S, "console.error(`❌ ${BEST.konfigFehler}.`); process.exit(1);", "console.error(`❌ ${BEST.konfigFehler}.`);"],
  ['H10 F7 Kleber: bestätigt wird nach AUTO_CONFIRM allein, nicht nach dem Plan', S, 'const BESTAETIGEN = BEST.bestaetigen;', 'const BESTAETIGEN = AUTO_CONFIRM;'],
  // Fund 8: fail-open-Lesarten
  ['H10 F8 dateienStatus: ein Auftrag ohne Datei gilt als in Ordnung', B, ': wartet || echte === 0 || artikelOhne > 0 ? { art: \'wartet\', texte, leer: echte === 0, teilweise: echte > 0 && artikelOhne > 0 } :', ': wartet ? { art: \'wartet\', texte, leer: false } :'],
  ['H10 F8 entwurfVergleichen: eine andere Artikelzahl fällt nicht auf', B, 'if (items.length !== soll.length) {', 'if (false) {'],
  ['H10 F8 entwurfVergleichen: eine andere Variante fällt nicht auf', B, 'if (it.variant_id !== undefined && it.variant_id !== null && Number(it.variant_id) !== Number(p.variant_id)) texte.push(', 'if (false) texte.push('],
  ['H10 F8 entwurfVergleichen: eine andere Menge fällt nicht auf', B, 'if (it.quantity !== undefined && it.quantity !== null && Number(it.quantity) !== Number(p.quantity)) texte.push(', 'if (false) texte.push('],
  ['H10 F8 entwurfVergleichen: andere Dateitypen fallen nicht auf', B, 'if (JSON.stringify(echte.slice().sort()) !== JSON.stringify(gesendet)) texte.push(', 'if (false) texte.push('],
  ['H10 F8 entwurfVergleichen: die Dateitypen werden in der Reihenfolge verglichen', B, 'JSON.stringify(echte.slice().sort()) !== JSON.stringify(gesendet)', 'JSON.stringify(echte) !== JSON.stringify(gesendet)'],
  ['H10 F8 entwurfVergleichen: Vorschau und Mockup zählen als Datei', B, ".filter((f) => f && f.type !== 'preview' && f.type !== 'mockup').map((f) => String(f.type));", '.filter((f) => f).map((f) => String(f.type));'],
  ['H10 F8 Kleber: der Entwurf wird nicht mit dem Gesendeten verglichen', S, 'v: entwurfVergleichen(ord, plan.items),', 'v: { ok: true, texte: [] },'],
  ['H10 F8 Kleber: Abweichungen des Entwurfs werden nicht gemeldet', S, "if (!v.ok) for (const t of v.texte) weich.push({ art: 'entwurf-abweichend'", "if (false) for (const t of v.texte) weich.push({ art: 'entwurf-abweichend'"],
  ['H10 F8 Kleber: ein Entwurf ohne Datei bleibt ohne Befund «datei-wartet»', S, "else if (d.art === 'wartet') weich.push(", "else if (false) weich.push("],
  ['H10 F8 Kosten: Zahlen werden locker gelesen (Hex, Exponent)', B, 'if (!DEZIMAL.test(t)) return null;', ''],
  ['H10 F8 Kosten: Wahrheitswerte und Listen gelten als Zahl', B, "if (typeof x !== 'string') return null;", "if (typeof x !== 'string') return Number(x);"],
  ['H10 F8 Kosten: die Untergrenze von 0.50 USD fehlt', B, 'if (total < KOSTEN_MIN_USD) return unbek(', 'if (false) return unbek('],
  ['H10 F8 aufpreisUsd: ein fehlendes Preisfeld gilt als gratis', B, "if (f.additional_price === undefined) return null; ", "if (f.additional_price === undefined) continue; "],
  // Fund 9: vorhandener Auftrag mit gleicher external_id
  ['H10 F9 Kleber: ein vorhandener Auftrag wird nicht mit der Bestellung verglichen', S, 'const passt = vorhandenVergleichen(ord, o);', 'const passt = { ok: true, texte: [] };'],
  ['H10 F9 Kleber: ein fremder Auftrag ist nur ein weicher Befund', S, "hart: true }], 'hat einen fremden Printful-Auftrag mit gleicher Kennung');", "hart: false }], 'hat einen fremden Printful-Auftrag mit gleicher Kennung');"],
  ['H10 F9 Kleber: ein fremder Auftrag wird trotzdem als erledigt markiert', S, 'if (!passt.ok) {', 'if (false) {'],
  ['H10 F9 Kleber: nach dem Befund «vorhanden-fremd» geht es weiter', S, "'hat einen fremden Printful-Auftrag mit gleicher Kennung');\n    return;", "'hat einen fremden Printful-Auftrag mit gleicher Kennung');"],
  ['H10 F9 Vergleich: der Name wird nicht verglichen', B, 'if (woerter(r.name) !== woerter(emp.name)) texte.push(', 'if (false) texte.push('],
  ['H10 F9 Vergleich: die PLZ wird nicht verglichen', B, "if (roh(r.zip).replace(/ /g, '') !== roh(emp.zip).replace(/ /g, '')) texte.push(", 'if (false) texte.push('],
  ['H10 F9 Vergleich: das Land wird nicht verglichen', B, "if (String(r.country_code || '').toUpperCase() !== String(emp.country_code || '').toUpperCase()) texte.push(", 'if (false) texte.push('],
  ['H10 F9 Vergleich: die Stückzahl wird nicht verglichen', B, 'if (ist !== soll) texte.push(', 'if (false) texte.push('],
  ['H10 F9 Vergleich: ein nicht lesbarer Empfänger gilt als passend', B, "else if (!r) texte.push('der Empfänger des vorhandenen Printful-Auftrags ist nicht lesbar');", ''],
  ['H10 F9 Vergleich: nicht lesbare Artikel gelten als passend', B, "if (!items) texte.push('die Artikel des vorhandenen Printful-Auftrags sind nicht lesbar');", 'if (!items) void 0;'],
  ['H10 F9 Vergleich: entfernte Positionen zählen zur Soll-Menge', B, 'a + (mengeVon(z) > 0 ? mengeVon(z) : 0), 0);', 'a + (mengeVon(z) > 0 ? mengeVon(z) : 1), 0);'],
  ['H10 F9 Vergleich: die Wörter des Namens werden nicht sortiert', B, ".split(' ').filter(Boolean).sort().join(' ');", ".split(' ').filter(Boolean).join(' ');"],
  // Fund 12: der Workflow-Schalter wird AUSGEFÜHRT geprüft
  ['H10 F12 Workflow: der Zeitplan schreibt, wenn die Freigabedatei FEHLT', W, 'if [ -f dropship/PRINTFUL-SYNC-FREI.txt ]; then dry=0; fi', 'if [ ! -f dropship/PRINTFUL-SYNC-FREI.txt ]; then dry=0; fi'],
  ['H10 F12 Workflow: der Zeitplan schreibt immer', W, 'if [ -f dropship/PRINTFUL-SYNC-FREI.txt ]; then dry=0; fi', 'dry=0'],
  ['H10 F12 Workflow: jedes Ereignis ausser dem Zeitplan schreibt', W, 'elif [ "$EREIGNIS" = "workflow_dispatch" ] && [ "$DRY_EINGABE" = "false" ]; then', 'elif [ "$EREIGNIS" != "schedule" ]; then'],
  ['H10 F12 Workflow: der Handstart mit Haken «Nur testen» schreibt trotzdem', W, 'elif [ "$EREIGNIS" = "workflow_dispatch" ] && [ "$DRY_EINGABE" = "false" ]; then', 'elif [ "$EREIGNIS" = "workflow_dispatch" ]; then'],
  ['H10 F12 Workflow: eine leere Eingabe des Handstarts schreibt', W, '[ "$DRY_EINGABE" = "false" ]', '[ "$DRY_EINGABE" != "true" ]'],
  ['H10 F12 Workflow: das Ergebnis des Schritts wird nicht ausgegeben', W, '          echo "dry=$dry" >> "$GITHUB_OUTPUT"\n', ''],
  ['H10 F12 Workflow: der Sync bekommt immer DRY_RUN=0', W, "DRY_RUN: ${{ steps.modus.outputs.dry == '0' && '0' || '1' }}", "DRY_RUN: '0'"],
  ['H10 F12 Workflow: fehlt das Ergebnis, ist DRY_RUN leer statt 1', W, "&& '0' || '1' }}", "&& '0' || '' }}"],
  ['H10 F12 Workflow: der Sync bekommt DRY_RUN=0 bei Ergebnis 1', W, "DRY_RUN: ${{ steps.modus.outputs.dry == '0' && '0' || '1' }}", "DRY_RUN: ${{ steps.modus.outputs.dry == '1' && '0' || '1' }}"],
  // Fund 13: jedes gelesene Feld steht in der Abfrage (die Attrappe liefert nur genannte Felder)
  ['H10 F13 Abfrage: email fehlt', S, 'id name email tags cancelledAt', 'id name tags cancelledAt'],
  ['H10 F13 Abfrage: tags der Bestellung fehlen', S, 'id name email tags cancelledAt', 'id name email cancelledAt'],
  ['H10 F13 Abfrage: provinceCode fehlt', S, 'address2 city provinceCode countryCodeV2', 'address2 city countryCodeV2'],
  ['H10 F13 Abfrage: address2 fehlt', S, 'address1 address2 city', 'address1 city'],
  ['H10 F13 Abfrage: phone fehlt', S, 'zip phone }', 'zip }'],
  ['H10 F13 Abfrage: der Name der Lieferadresse fehlt', S, 'shippingAddress{ name firstName lastName', 'shippingAddress{ firstName lastName'],
  ['H10 F13 Abfrage: Vor- und Nachname der Lieferadresse fehlen', S, 'shippingAddress{ name firstName lastName', 'shippingAddress{ name'],
  ['H10 F13 Abfrage: die Positionsliste fragt nicht nach dem Seitenkopf', S, 'lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ id quantity', 'lineItems(first:50){ edges{ node{ id quantity'],
  ['H10 F13 Abfrage: quantity der Position fehlt', S, 'id quantity currentQuantity sku title', 'id currentQuantity sku title'],
  ['H10 F13 Abfrage: sku der Position fehlt', S, 'id quantity currentQuantity sku title', 'id quantity currentQuantity title'],
  ['H10 F13 Abfrage: der Erlös der Position fehlt', S, '    discountedTotalSet{ shopMoney{ amount currencyCode } }\n', ''],
  ['H10 F13 Abfrage: productType fehlt', S, 'product{ productType tags metafield', 'product{ tags metafield'],
  ['H10 F13 Abfrage: das Metafeld custom.print_file fehlt', S, 'tags metafield(namespace:"custom", key:"print_file"){ value } }', 'tags }'],
  ['H10 F13 Abfrage: sku der Variante fehlt', S, 'variant{ sku title selectedOptions', 'variant{ title selectedOptions'],
  ['H10 F13 Abfrage: die Eigenschaften der Position fehlen', S, '    customAttributes{ key value } } } }', '    } } }'],
  ['H10 F13 Empfänger: die Stadt ist keine Pflicht', B, "['city', 'Ort'], ", ''],
  ['H10 F13 Empfänger: die Strasse ist keine Pflicht', B, "['address1', 'Strasse'], ", ''],
  ['H10 F13 Empfänger: die PLZ ist keine Pflicht', B, "['zip', 'PLZ'], ", ''],
  ['H10 F13 Empfänger: der Name ist keine Pflicht', B, "[['name', 'Name'], ['address1', 'Strasse']", "[['address1', 'Strasse']"],
  // Fund 14: Deckel je Lauf
  ['H10 F14 Kleber: der Deckel MAX Bestellungen je Lauf kürzt nicht', S, 'for (const o of kandidaten.slice(0, MAX)) {', 'for (const o of kandidaten) {'],
  // Fund 10/18: Preisanpassung
  ['H10 F10 Reprice: Senkungen werden ohne SENKEN=1 geschrieben', R, 'if(!SENKEN && parseFloat(np)<parseFloat(cur)){', 'if(false && parseFloat(np)<parseFloat(cur)){'],
  ['H10 F10 Reprice: Erhöhungen werden als Senkung übersprungen', R, 'if(!SENKEN && parseFloat(np)<parseFloat(cur)){', 'if(!SENKEN && parseFloat(np)>parseFloat(cur)){'],
  ['H10 F10 Reprice: SENKEN=1 wird nicht gelesen', R, "const SENKEN=['1','true','ja','yes','on'].includes(", 'const SENKEN=[].includes('],
  ['H10 F10 Reprice: ohne DRY_RUN wird geschrieben', R, "const DRY=!['0','false','no','nein','off'].includes(", "const DRY=!['','0','false','no','nein','off'].includes("],
  ['H10 F10 Reprice: nur bestimmte Wörter sind Vorschau (ein Tippfehler schreibt)', R, "const DRY=!['0','false','no','nein','off'].includes(", "const DRY=['1','true','ja','yes','on'].includes("],
  ['H10 F18 (V7) Reprice: der Preis nimmt das niedrigere von Aufschlag und Mindestmarge', R, 'const target=Math.max(costChf*MARKUP, costChf+MIN_MARGE);', 'const target=Math.min(costChf*MARKUP, costChf+MIN_MARGE);'],
  // ── Fund 22 (am Ende angefügt, damit die Nummern der Mutanten davor unverändert bleiben): ein Editor-Produkt druckt nie das feste Motiv des Besitzers aus dem Metafeld
  ['H10 F22 Plan: ein Editor-Produkt druckt ohne Design der Kundin das Muster aus dem Metafeld', B, 'if (!dateien.length && !editorProdukt(z)) {', 'if (!dateien.length) {'],
  ['H10 F22 editorProdukt: die Fertigware (Tag printful_personalized_product) gilt als Editor-Produkt', B, "((li && li.product && li.product.tags) || []).map((x) => String(x).toLowerCase()).includes('wunschdesign')", "((li && li.product && li.product.tags) || []).map((x) => String(x).toLowerCase()).includes('printful_personalized_product')"],

  // ── ZWEITE RUNDE 10.11.2026 (drei Gegenleser nach der Härtung P1): am Ende angefügt, damit die Nummern der Mutanten davor und die Zuordnung zu den Teilen unverändert bleiben
  ['R2 L1/1 Standort: ein gehaltener Status (ON_HOLD …) gilt als druckbar', B, 'if (!FO_DRUCKBAR.includes(st)) { gehalten', 'if (false) { gehalten'],
  ['R2 L1/1 Standort: ON_HOLD steht auf der Liste der druckbaren Status', B, 'Object.freeze([\'OPEN\', \'IN_PROGRESS\'])', 'Object.freeze([\'OPEN\', \'IN_PROGRESS\', \'ON_HOLD\'])'],
  ['R2 L1/1 Standort: eine geschlossene Dienst-Order neben einer offenen wird übergangen', B, 'if (geschlossenDienst) return { art: \'unklar\'', 'if (false) return { art: \'unklar\''],
  ['R2 L1/1 Standort: auch eine geschlossene HÄNDLER-Order neben einer offenen macht es unklar', B, 'if (drinIn(fo) && !(ort && ort.isFulfillmentService === false)) geschlossenDienst', 'if (drinIn(fo)) geschlossenDienst'],
  ['R2 L1/1 Standort: geschlossene Orders zählen gar nicht mehr als Warnzeichen', B, 'if (st === \'CLOSED\') {', 'if (false) {'],
  ['R2 L1/1 Standort: gehalten gewinnt nicht gegen offen (die erste offene Order genügt)', B, 'if (gehalten) return { art: \'gehalten\', status: gehalten };', ''],
  ['R2 L1/1 Standort: gehalten am Dienst-Standort wird nicht als Dienst erkannt', B, 'if (ort && ort.isFulfillmentService === true) dienst = dienst || ort;               // an einem Dienst-Standort gilt jeder nicht geschlossene Status', ''],
  ['R2 L1/1 Plan: eine gehaltene Fulfillment-Order ist kein Befund', B, 'if (stdo.art === \'gehalten\') {', 'if (false) {'],
  ['R2 L1/1 Plan: die Positionen des Auftrags werden nicht gemerkt (positionIds leer)', B, 'items.push(item); positionIds.push(String(z.id || \'\'));', 'items.push(item);'],
  ['R2 L1/2 Kleber: das frische Lesen vergleicht den Stand der Bestellung nicht', S, 'const ab = soll ? bestellAbweichung(n, soll) : null;', 'const ab = null;'],
  ['R2 L1/2 Kleber: der Stand wird ohne die geplanten Positionen gemerkt (kein Fulfillment-Vergleich)', S, 'const soll = bestellStand(o, plan.positionIds);', 'const soll = bestellStand(o, []);'],
  ['R2 L1/2 frischLesen: das Stopp-Tag printful-review vor dem Bestätigen wird nicht beachtet', S, '} else if (tags.includes(REVIEW_TAG)) return { art: \'geaendert\'', '} else if (false) return { art: \'geaendert\''],
  ['R2 L1/2 Kleber: eine Änderung zwischen Liste und Anlegen legt trotzdem an', S, 'if (fr.art === \'geaendert\') { zaehler.spaeter++;', 'if (false) { zaehler.spaeter++;'],
  ['R2 L1/2 Kleber: die Änderung vor dem Bestätigen heisst «zahlung-unlesbar» statt «bestellung-geaendert»', S, 'fr2.art === \'geaendert\' ? \'bestellung-geaendert\'', 'fr2.art === \'geaendert-x\' ? \'bestellung-geaendert\''],
  ['R2 L1/2 Abfrage frisch: die E-Mail fehlt', S, 'test displayFinancialStatus email\n', 'test displayFinancialStatus\n'],
  ['R2 L1/2 Abfrage frisch: die Lieferadresse fehlt', S, '  ${ADRESSE_Q}\n  lineItems(first:50){ edges{', '  lineItems(first:50){ edges{'],
  ['R2 L1/2 Abfrage frisch: die Positionen fehlen', S, '  lineItems(first:50){ edges{ node{ currentQuantity quantity id } } }\n', ''],
  ['R2 L1/2 Abfrage frisch: die Fulfillment-Orders fehlen', S, '  ${FO_Q}\n} } }`;', '} } }`;'],
  ['R2 L1/2 Abfrage frisch: die Menge currentQuantity fehlt', S, 'node{ currentQuantity quantity id }', 'node{ quantity id }'],
  ['R2 L1/2 bestellAbweichung: die Lieferadresse wird nicht verglichen', B, 'if (JSON.stringify(empfaengerAus(n).recipient) !== soll.empfaenger) return ge(', 'if (false) return ge('],
  ['R2 L1/2 bestellAbweichung: Positionen und Mengen werden nicht verglichen', B, 'if (JSON.stringify(positionenListe(n)) !== soll.positionen) return ge(', 'if (false) return ge('],
  ['R2 L1/2 bestellAbweichung: der Fulfillment-Order-Status wird nicht verglichen', B, 'if (s.art !== \'frei\') return ge(', 'if (false) return ge('],
  ['R2 L1/2 bestellAbweichung: ein fehlendes Feld shippingAddress ist kein Mangel', B, 'if (n.shippingAddress === undefined) return un(', 'if (false) return un('],
  ['R2 L1/2 bestellAbweichung: ein fehlendes Feld email ist kein Mangel', B, 'if (n.email === undefined) return un(', 'if (false) return un('],
  ['R2 L1/2 bestellAbweichung: fehlende Positionen sind kein Mangel', B, 'if (!n.lineItems || !Array.isArray(n.lineItems.edges)) return un(', 'if (false) return un('],
  ['R2 L1/2 bestellAbweichung: fehlende Fulfillment-Orders sind kein Mangel', B, 'if (soll.positionIds.length && (!n.fulfillmentOrders', 'if (false && (!n.fulfillmentOrders'],
  ['R2 L1/2 Stand: die Positionen werden nicht sortiert (die Reihenfolge zählt)', B, '.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))', ''],
  ['R2 L1/3 Kleber: der Anspruch wird nicht nachgelesen', S, 'const anspruch = await anspruchPruefen(tok, o, meinTag);', 'const anspruch = { art: \'ok\' };'],
  ['R2 L1/3 Kleber: ein verlorener Anspruch legt trotzdem an', S, 'if (anspruch.art === \'verloren\') {', 'if (false) {'],
  ['R2 L1/3 Kleber: ein nicht nachlesbarer Anspruch legt trotzdem an', S, 'if (anspruch.art !== \'ok\') { fehlerAdd(', 'if (false) { fehlerAdd('],
  ['R2 L1/3 Kleber: die Markierung hat keinen Zufallsteil', S, 'const meinTag = anlegenTag(Date.now(), randomBytes(4).toString(\'hex\'));', 'const meinTag = anlegenTag(Date.now());'],
  ['R2 L1/3 Abfrage Anspruch: die Tags fehlen', S, '... on Order { id tags } } }`;', '... on Order { id } } }`;'],
  ['R2 L1/3 anspruchGewonnen: die GRÖSSTE Markierung gewinnt', B, 'const frueher = aktiv.filter((t) => t < meinTag);', 'const frueher = aktiv.filter((t) => t > meinTag);'],
  ['R2 L1/3 anspruchGewonnen: eine fehlende eigene Markierung ist kein Mangel', B, 'if (!aktiv.includes(meinTag)) return', 'if (false) return'],
  ['R2 L1/3 anspruchGewonnen: auch uralte Markierungen zählen', B, 'Math.max(0, Math.floor((jetztMs - ms) / 60000)) < ANLEGEN_SPERRE_MIN; });', 'true; });'],
  ['R2 L1/3 anlegenTag: ohne Sekunden und Millisekunden', B, 'return `${basis}-${zwei(d.getUTCSeconds())}${String(d.getUTCMilliseconds()).padStart(3, \'0\')}-${z}`;', 'return `${basis}-00000-${z}`;'],
  ['R2 L1/3 anlegenTag: der Zufallsteil wird nicht geprüft', B, 'if (!/^[a-z0-9]{4,12}$/.test(z)) throw', 'if (false) throw'],
  ['R2 L1/3 Markierung: die neue Form (mit Zufallsteil) wird nicht als Markierung gelesen', B, '(\\d{2})(\\d{2})(?:-\\d{5}-[a-z0-9]{4,12})?$/;', '(\\d{2})(\\d{2})$/;'],
  ['R2 L1/3 Sperre: genau 60 Minuten alt sperrt noch', B, 'alterMin !== null && alterMin < ANLEGEN_SPERRE_MIN', 'alterMin !== null && alterMin <= ANLEGEN_SPERRE_MIN'],
  ['R2 L1/4 Kleber: ein negativer Mindestgewinn ist kein Konfigurationsfehler', S, 'const NETTO_MIN_FEHLER = NETTO_MIN_ROH !== \'\' && Number.isFinite(NETTO_MIN_ZAHL) && NETTO_MIN_ZAHL < 0;', 'const NETTO_MIN_FEHLER = false;'],
  ['R2 L1/4 Kleber: der negative Mindestgewinn bricht nur scharf ab', S, 'if (NETTO_MIN_FEHLER) {', 'if (NETTO_MIN_FEHLER && !DRY) {'],
  ['R2 L1/4 Kleber: der Mindestgewinn 0 ist ein Fehler', S, 'Number.isFinite(NETTO_MIN_ZAHL) && NETTO_MIN_ZAHL < 0;', 'Number.isFinite(NETTO_MIN_ZAHL) && NETTO_MIN_ZAHL <= 0;'],
  ['R2 L1/5 Plan: eine unlesbare Menge ist kein Befund (sie wird als 1 gedruckt)', B, 'if (menge < 0) { hart(\'menge-unlesbar\'', 'if (false) { hart(\'menge-unlesbar\''],
  ['R2 L1/5 Menge: quantity 0 ohne currentQuantity gilt als lesbar', B, 'return Number.isInteger(z && z.quantity) && z.quantity > 0 ? z.quantity : -1;', 'return Number.isInteger(z && z.quantity) && z.quantity >= 0 ? z.quantity : -1;'],
  ['R2 L1/5 vorhandenVergleichen: eine unlesbare Menge wird nicht gemeldet', B, 'if (podZeilen.some((z) => mengeVon(z) < 0)) texte.push(', 'if (false) texte.push('],
  ['R2 L1/6 Adresse: ein fremder Pfad im Shopify-CDN wird akzeptiert', B, '&& !u.pathname.startsWith(EIGENER_SHOPIFY_CDN_PFAD)) return', '&& false) return'],
  ['R2 L1/6 Adresse: der eigene Pfad im Shopify-CDN ist zu weit gefasst', B, 'export const EIGENER_SHOPIFY_CDN_PFAD = \'/s/files/1/0943/6856/3585/\';', 'export const EIGENER_SHOPIFY_CDN_PFAD = \'/s/files/1/\';'],
  ['R2 L1/6 Adresse: Cloudinary-Transformationen werden nicht geprüft', B, 'const g = cloudinaryPfadProblem(u.pathname.slice(vor.length));', 'const g = null;'],
  ['R2 L1/6 Adresse: jede Transformation steht auf der Liste', B, 'const unerlaubt = s.split(\',\').find((x) => !CLD_TRANSFORM_ERLAUBT.test(x));', 'const unerlaubt = undefined;'],
  ['R2 L1/6 Adresse: die Kürzel der Überlagerungen (l_, u_, e_ …) gelten als Ordnername', B, 'const CLD_TRANSFORM_KUERZEL = /^(?:a|ac|af|ar|b|bl|bo|br|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|p|pg|q|r|so|sp|t|u|vc|w|x|y|z|zo)_/;', 'const CLD_TRANSFORM_KUERZEL = /^(?!)/;'],
  ['R2 L1/6 Adresse: der Kürzel l_ fehlt in der Liste', B, '|if|ki|l|o|p|pg|', '|if|ki|o|p|pg|'],
  ['R2 L1/6 Adresse: der Kürzel u_ fehlt in der Liste', B, '|t|u|vc|', '|t|vc|'],
  ['R2 L1/6 Adresse: der Kürzel e_ fehlt in der Liste', B, '|dn|dpr|du|e|eo|', '|dn|dpr|du|eo|'],
  ['R2 L1/6 Adresse: der Kürzel t_ fehlt in der Liste', B, '|so|sp|t|u|', '|so|sp|u|'],
  ['R2 L1/6 Adresse: der Dateiname wird nicht geprüft', B, 'if (!datei || !CLD_NAME.test(datei)) return', 'if (false) return'],
  ['R2 L1/6 Adresse: Ordnernamen werden nicht geprüft', B, 'if (!CLD_NAME.test(s)) return \'Cloudinary-Adresse enthält ein unzulässiges Pfadstück\';', ''],
  ['R2 L1/8 Kleber: die KI-Kontrolle läuft auch im Trockenlauf (Kundenbild an Google)', S, 'if (DRY) return { art: \'trocken\'', 'if (false) return { art: \'trocken\''],
  ['R2 L1/8 Plan: das Ergebnis «trocken» der KI zählt als Befund', B, 'if (k && k.art !== \'ok\' && k.art !== \'trocken\') weich(', 'if (k && k.art !== \'ok\') weich('],
  ['R2 L2/2 dateienStatus: ein Artikel ohne Datei neben einem mit Datei gilt als ok', B, 'wartet || echte === 0 || artikelOhne > 0 ? {', 'wartet || echte === 0 ? {'],
  ['R2 L2/2 dateienStatus: ein Artikel ohne Datei wird nicht gezählt', B, 'if (!proArtikel) artikelOhne++;', ''],
  ['R2 L2/2 entwurfVergleichen: ein Artikel ohne Datei neben einem mit Datei gibt den Entwurf frei', B, 'if (ohneDatei.length && ohneDatei.length < soll.filter((p) => (p.files || []).length).length) texte.push(', 'if (false) texte.push('],
  ['R2 L2/2 entwurfVergleichen: ein Artikel ohne Datei wird nicht gemerkt (altes «continue»)', B, 'if (!echte.length) { if (gesendet.length) ohneDatei.push(i + 1); continue; }', 'if (!echte.length) continue;'],
  ['R2 L2/2 Kleber: es wird nur die erste Position gesendet', S, 'items: plan.items }, 60000);', 'items: plan.items.slice(0, 1) }, 60000);'],
  ['R2 L2/5 Kleber: ein nicht lesbarer Status nach dem Bestätigen gilt als bestätigt', S, 'if (st && st.art === \'bestaetigt\') {', 'if (!st || st.art === \'bestaetigt\') {'],
  ['R2 L2/5 Kleber: die Vorgabe MAX ist 200 statt 20', S, 'parseInt(process.env.MAX || \'20\', 10)', 'parseInt(process.env.MAX || \'200\', 10)'],
  ['R2 L2/5 Kleber: eine unbrauchbare Kostenobergrenze bricht nur scharf ab', S, 'if (MAX_KOSTEN_FEHLER) {', 'if (MAX_KOSTEN_FEHLER && !DRY) {'],
  ['R2 L2/5 Kleber: eine ungültige Platzierungs-ID des bezahlten Pakets bricht nur scharf ab', S, 'if (PAKET_FEHLER.length) {', 'if (PAKET_FEHLER.length && !DRY) {'],
  ['R2 L2/1 Workflow: kein concurrency-Schutz', W, 'concurrency:\n  group: printful-sync\n  cancel-in-progress: false\n', ''],
  ['R2 L2/1 Workflow: cancel-in-progress true', W, 'cancel-in-progress: false', 'cancel-in-progress: true'],
  ['R2 L2/1 Workflow: die Gruppe ist je Lauf eindeutig', W, 'group: printful-sync\n', 'group: printful-sync-${{ github.run_id }}\n'],
  ['R2 L2/1 Workflow: das Zeitlimit des Jobs fehlt', W, '    timeout-minutes: 15\n', ''],
  ['R2 L2/3 Workflow: der Zeitplan läuft stündlich', W, '- cron: \'37 13 * * *\'', '- cron: \'37 * * * *\''],
  ['R2 L2/3 Workflow: der Zeitplan feuert nie', W, '- cron: \'37 13 * * *\'', '- cron: \'37 13 31 2 *\''],
  ['R2 L2/3 Workflow: die Freigabedatei fehlt im sparse-checkout', W, '            dropship/PRINTFUL-SYNC-FREI.txt\n', ''],
  ['R2 L2/3 Workflow: der Handstart-Haken heisst anders', W, 'DRY_EINGABE: ${{ github.event.inputs.dry_run }}', 'DRY_EINGABE: ${{ github.event.inputs.dry_runx }}'],
  ['R2 L2/3 Workflow: PRINTFUL_MAX wird nicht durchgereicht', W, '          MAX: ${{ secrets.PRINTFUL_MAX || vars.PRINTFUL_MAX }}\n', ''],
  ['R2 L2/3 Workflow: PRINTFUL_API_KEY wird nicht durchgereicht', W, '          PRINTFUL_API_KEY: ${{ secrets.PRINTFUL_API_KEY }}\n', ''],
  ['R2 L2/3 Workflow: GEMINI_API_KEY wird nicht durchgereicht', W, '          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}\n', ''],
  ['R2 L2/3 Workflow: die Rechte sind write', W, 'permissions:\n  contents: read\n', 'permissions:\n  contents: write\n'],
  ['R2 L2/4 Preis-Workflow: apply hat den Standard true', RW, '        default: false\n      senken:', '        default: true\n      senken:'],
  ['R2 L2/4 Preis-Workflow: ein Zeitplan-Auslöser wird ergänzt', RW, 'on:\n  workflow_dispatch:', 'on:\n  schedule:\n    - cron: \'0 3 * * *\'\n  workflow_dispatch:'],
  ['R2 L2/4 Preis-Workflow: die Rechte sind write', RW, 'permissions:\n  contents: read\n', 'permissions:\n  contents: write\n'],
  ['R2 L2/4 Preis-Workflow: der Standard-Tag der Eingabe ist die Fertigware', RW, 'default: \'wunschdesign\'', 'default: \'printful_personalized_product\''],
  ['R2 L2/4 Preis-Workflow: bei leerer Eingabe gilt die Fertigware', RW, 'github.event.inputs.tag || \'wunschdesign\'', 'github.event.inputs.tag || \'printful_personalized_product\''],
  ['R2 L2/4 Preis-Workflow: die Gruppe bricht laufende Läufe ab', RW, 'cancel-in-progress: false', 'cancel-in-progress: true'],
  ['R2 L2/6 CI: der Sync-Test läuft mit «|| true» (nie rot)', CIW, '          node automation/printful_sync_test.mjs\n', '          node automation/printful_sync_test.mjs || true\n'],
  ['R2 L2/6 CI: der Bestellweg-Test läuft mit «|| true»', CIW, '          node automation/lib/printful_bestellweg_test.mjs\n', '          node automation/lib/printful_bestellweg_test.mjs || true\n'],
  ['R2 L2/6 CI: die Mutationsprobe des Bestellwegs ist continue-on-error', CIW, '      - name: Mutationsprobe «Selbst gestalten» (221 absichtliche Fehler, alle müssen rot werden)\n', '      - name: Mutationsprobe «Selbst gestalten» (221 absichtliche Fehler, alle müssen rot werden)\n        continue-on-error: true\n'],
  ['R2 L2/6 CI: der Test der Preisanpassung fehlt', CIW, '          node automation/printful_reprice_test.mjs\n', ''],
  ['R2 L1/7 Reprice: unbrauchbare Printful-Kosten gelten als Preis', R, 'cost=Number.isFinite(c)&&c>0?c:null;', 'cost=c;'],
  ['R2 L1/7 Reprice: Kosten 0 gelten als Preis', R, 'cost=Number.isFinite(c)&&c>0?c:null;', 'cost=Number.isFinite(c)&&c>=0?c:null;'],
  ['R2 L2/9 Reprice: die Shopify-API ist 2025-01', R, 'const API=\'2026-01\';', 'const API=\'2025-01\';'],
  // Dritte Runde 11.11.2026 (eigene Durchsicht der zweiten Runde): ein Lesefehler ist sichtbar, kein stiller Verlust
  ['D3 Anspruch: eine fehlende eigene Markierung gilt als Verlust gegen einen anderen Lauf (still)', B, 'steht nicht (mehr) an der Bestellung\', art: \'eigene-fehlt\' }', 'steht nicht (mehr) an der Bestellung\', art: \'verloren\' }'],
  ['D3 Kleber: die fehlende eigene Markierung beim Nachlesen ist kein Lesefehler (kein Fehler, Exit 0)', S, 'if (g.art === \'eigene-fehlt\') return { art: \'unlesbar\', text: g.grund };', ''],
  ['D3 CI: das Zeitlimit des Jobs «tests» steht auf 15 statt 20 Minuten (Doku und Messung nennen 20)', CIW, '    timeout-minutes: 20\n    steps:', '    timeout-minutes: 15\n    steps:'],
  ['D3 Kleber: eine geänderte Bestellung beim Anlegen fehlt in der Zusammenfassung', S, 'zeilen.push(`${o.name}: wartet (die Bestellung hat sich seit dem Planen geändert; der nächste Lauf liest neu)`); ', ''],
];

function zaehle(text, teil) { let n = 0, i = -1; while ((i = text.indexOf(teil, i + 1)) >= 0) n++; return n; }
/** Erste rote Testdatei samt Art des Scheiterns: 'pruefung' = eine benannte Prüfung (✗) ist rot geworden, 'ausnahme' = der Test brach mit einer Ausnahme ab (z. B. TypeError), ohne dass eine Prüfung rot wurde,
 *  'ungeklaert' = Zeitüberschreitung oder Startfehler (zählt NICHT als erkannt). null = alle grün. */
export function testen(wurzel, zeitlimitMs = 180000) {
  for (const t of TESTS) {
    const r = spawnSync(process.execPath, [join(wurzel, t)], { cwd: wurzel, encoding: 'utf8', timeout: zeitlimitMs, env: { PATH: process.env.PATH, HOME: process.env.HOME } });
    // Zeitüberschreitung, Abbruch durch ein Signal oder ein Startfehler heissen NICHT «erkannt»: der Test hat dann nichts festgestellt (10.11.2026, Gegenleser Linse 2: ein Mutant, der den Kindprozess hängen liess, zählte als erkannt).
    if (r.error || r.signal || r.status === null) return { datei: t.replace(/^automation\//, ''), art: 'ungeklaert', grund: r.error ? String(r.error.code || r.error.message).slice(0, 60) : `Signal ${r.signal}` };
    if (r.status !== 0) return { datei: t.replace(/^automation\//, ''), art: /^✗ /m.test(String(r.stdout || '')) ? 'pruefung' : 'ausnahme' };
  }
  return null;
}
/** Ist die mutierte Datei noch gültiger JavaScript-Code? (Ein Mutant mit Syntaxfehler «bricht» jeden Test und würde als erkannt zählen: das ist keine Aussage über die Tests.) YAML und Markdown werden nicht geprüft. */
function gueltig(pfad) {
  if (!/\.mjs$/.test(pfad)) return true;
  return spawnSync(process.execPath, ['--check', pfad], { encoding: 'utf8' }).status === 0;
}

/** SHARD=<i>/<n> (z. B. 2/3): nur jeder n-te Mutant, beginnend beim i-ten. Damit lässt sich die volle Probe auf mehrere Prozesse verteilen (jeder arbeitet in seiner eigenen Kopie); ohne Angabe laufen alle. */
export function shardLesen(text) {
  if (text == null || String(text).trim() === '') return null;
  const m = /^(\d+)\/(\d+)$/.exec(String(text).trim());
  if (!m || +m[1] < 1 || +m[2] < 1 || +m[1] > +m[2]) throw new Error(`SHARD muss die Form <i>/<n> haben mit 1 <= i <= n (gefunden: «${String(text).slice(0, 20)}»)`);
  return { i: +m[1], n: +m[2] };
}
/** Gehört der Mutant mit der laufenden Nummer `nr` (ab 0) zu diesem Teil? Ohne `shard` gehört jeder dazu. */
export const imShard = (nr, shard) => !shard || nr % shard.n === shard.i - 1;

export function probe({ log = console.log, nur = null, nurPruefen = false, shard = null } = {}) {
  const wurzel = mkdtempSync(join(tmpdir(), 'bestellweg-mutation-'));
  try {
    for (const d of DATEIEN) { if (!existsSync(join(REPO, d))) continue; mkdirSync(dirname(join(wurzel, d)), { recursive: true }); copyFileSync(join(REPO, d), join(wurzel, d)); }
    let falsch = 0;
    for (const [name, datei, von, zu] of MUTANTEN) {
      const n = zaehle(readFileSync(join(wurzel, datei), 'utf8'), von);
      if (n !== 1) { log(`✗ Mutation nicht anwendbar (${n}× gefunden): ${name}`); falsch++; }
      else if (von === zu) { log(`✗ Mutation ohne Wirkung (von = zu): ${name}`); falsch++; }
    }
    if (falsch) return { exit: 2, ueberlebt: [], erkannt: 0, ungueltig: [], ausnahme: [] };
    log(`${MUTANTEN.length} Mutanten, jeder an genau einer Stelle anwendbar.`);
    if (nurPruefen) {
      // Jeder Mutant muss noch gültiger Code sein (sonst «erkennt» jeder Test ihn, weil nichts mehr läuft). Das kostet ein `node --check` je JavaScript-Mutant, in der CI rund eine Viertelminute.
      const ungueltig = [];
      for (const [name, datei, von, zu] of MUTANTEN) {
        const pfad = join(wurzel, datei), original = readFileSync(pfad, 'utf8');
        writeFileSync(pfad, original.split(von).join(zu));
        try { if (!gueltig(pfad)) { ungueltig.push(name); log(`⚠ UNGÜLTIG (Syntaxfehler im Mutanten) ${name}`); } } finally { writeFileSync(pfad, original); }
      }
      if (ungueltig.length) { log(`${ungueltig.length} Mutant(en) mit Syntaxfehler: sie zählten sonst als «erkannt», ohne dass ein Test etwas gesehen hat.`); return { exit: 2, ueberlebt: [], erkannt: 0, ungueltig, ausnahme: [] }; }
      log('Kein Mutant mit Syntaxfehler.');
      return { exit: 0, ueberlebt: [], erkannt: 0, ungueltig: [], ausnahme: [] };
    }
    const rot0 = testen(wurzel);
    if (rot0) { log(`✗ Kontrolllauf ohne Mutation ist schon rot: ${rot0.datei}`); return { exit: 2, ueberlebt: [], erkannt: 0, ungueltig: [], ausnahme: [] }; }
    log('Kontrolllauf ohne Mutation: alle Testdateien grün.\n');
    let erkannt = 0, gesamt = 0; const ueberlebt = [], ungueltig = [], ausnahme = [], ungeklaert = [];
    for (const [nr, [name, datei, von, zu]] of MUTANTEN.entries()) {
      if (nur && !name.toLowerCase().includes(nur.toLowerCase())) continue;
      if (!imShard(nr, shard)) continue;
      gesamt++;
      const pfad = join(wurzel, datei), original = readFileSync(pfad, 'utf8');
      writeFileSync(pfad, original.split(von).join(zu));
      let rot = null, ok = true;
      try { ok = gueltig(pfad); if (ok) rot = testen(wurzel); } finally { writeFileSync(pfad, original); }
      if (!ok) { ungueltig.push(name); log(`⚠ UNGÜLTIG (Syntaxfehler im Mutanten, sagt nichts über die Tests) ${name}`); continue; }
      if (rot && rot.art === 'ungeklaert') { ungeklaert.push(name); log(`? UNGEKLÄRT (${rot.grund}: der Test hat nichts festgestellt) ${name}`); continue; }
      if (rot) { erkannt++; if (rot.art === 'ausnahme') ausnahme.push(name); log(`✓ erkannt  ${name.padEnd(86)} ← ${rot.datei}${rot.art === 'ausnahme' ? ' (durch eine Ausnahme im Test, keine benannte Prüfung)' : ''}`); }
      else { ueberlebt.push(name); log(`✗ ÜBERLEBT ${name}`); }
    }
    log(`\n${erkannt} von ${gesamt - ungueltig.length} gültigen Mutanten erkannt (davon ${erkannt - ausnahme.length} durch eine benannte Prüfung, ${ausnahme.length} durch eine Ausnahme im Test); ${ueberlebt.length} überlebt; ${ungeklaert.length} ungeklärt (Zeitüberschreitung); ${ungueltig.length} ungültig.${ueberlebt.length ? ' ÜBERLEBT: ' + ueberlebt.join('; ') : ''}${ungeklaert.length ? ' UNGEKLÄRT: ' + ungeklaert.join('; ') : ''}${ungueltig.length ? ' UNGÜLTIG: ' + ungueltig.join('; ') : ''}`);
    return { exit: ungueltig.length ? 2 : (ueberlebt.length || ungeklaert.length) ? 1 : 0, ueberlebt, erkannt, ungueltig, ausnahme, ungeklaert };
  } finally { rmSync(wurzel, { recursive: true, force: true }); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let shard = null;
  try { shard = shardLesen(process.env.SHARD); } catch (e) { console.error('✗ ' + e.message); process.exit(2); }
  process.exit(probe({ nur: process.env.NUR || null, nurPruefen: process.argv.includes('--pruefen'), shard }).exit);
}
