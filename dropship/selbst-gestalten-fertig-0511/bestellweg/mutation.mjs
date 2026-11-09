#!/usr/bin/env node
// Mutationsprobe für den gehärteten Bestellweg (Strom 3, 05.11.2026): baut absichtliche Fehler in printful_sync.mjs, lib/printful_bestellweg.mjs und lib/printful_platzierung.mjs ein
// und verlangt, dass mindestens eine der drei Testdateien ROT wird. Gearbeitet wird in einer KOPIE (TMPDIR), das Repo bleibt unberührt.
// Lauf:  /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs          (Exit 0 = alle erkannt, 1 = mindestens einer überlebt, 2 = Mutation nicht anwendbar)
//        --pruefen    prüft nur, ob jede Fundstelle genau einmal vorkommt;   NUR=<Teil des Namens>   nur diese Mutanten
// Stand 06.11.2026 (WP6): dazu die Mutanten «WP6 …» für die neue Schreibweise _Druckdatei, _vorschau, qd, Karte gegen SKU, Bestellung ohne Design und die Standardwerte des Workflows.
// Stand 09.11.2026 (Phase 1): qd-weicht-ab (PR #3031, Codex) statt der alten Prüfung qdPruefen; neu «P1 …»: Dienst-Standort, Aufpreis-Platzierungen gegen das bezahlte Paket, Kosten-Obergrenze,
// Standardwerte von Bestätigen und KI-Kontrolle, Lesen von Rückseite und Ärmel, Editor 6.4.0 Ende zu Ende; dazu die Preisanpassung printful_reprice.mjs (Weiterblättern, Fehlerbehandlung).
// Ergänzt automation/pod_auswahl_mutation.mjs (die CI-Probe der Preis-/Auswahlseite, die einen Teil der Platzierung ebenfalls mutiert).
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const DATEIEN = [
  'automation/printful_sync.mjs', 'automation/printful_sync_test.mjs',
  'automation/lib/printful_platzierung.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/lib/printful_bestellweg.mjs', 'automation/lib/printful_bestellweg_test.mjs',
  'automation/lib/shopify_secret.mjs',
  'dropship/pod-auswahl/platzierung_mitschnitte.json', 'dropship/pod-auswahl/katalog.json', 'dropship/pod-auswahl/bestellweg_katalog_auszug.json',
  'dropship/selbst-gestalten-fertig-0511/bestellweg/editor_640_mitschnitt.json',
  'automation/printful_reprice.mjs', 'automation/printful_reprice_test.mjs', 'automation/lib/pod_auswahl_spec.mjs',
  'dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs',
  '.github/workflows/printful-sync.yml',
];
const TESTS = ['automation/printful_reprice_test.mjs', 'automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/printful_sync_test.mjs'];   // schnellste zuerst
const B = 'automation/lib/printful_bestellweg.mjs', P = 'automation/lib/printful_platzierung.mjs', S = 'automation/printful_sync.mjs', W = '.github/workflows/printful-sync.yml', R = 'automation/printful_reprice.mjs';

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
  ['Kosten: andere Währung gilt als USD', B, "if (costs.currency && String(costs.currency).toUpperCase() !== 'USD') return", 'if (false) return'],
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
  ['Plan: Menge geht verloren', B, 'const quantity = menge > 0 ? menge : 1;', 'const quantity = 1;'],
  ['Plan: Optionen gehen nicht an Printful', B, 'if (op.optionen.length) item.options = op.optionen;', ''],
  ['Plan: Erlös in Fremdwährung gilt als CHF', B, "String(m.currencyCode || '').toUpperCase() === 'CHF'", 'true'],
  ['Plan: unbekannter Erlös einer Position wird übergangen', B, 'if (betrag === null) erloesBekannt = false;', ''],
  ['Plan: Fehler der KI-Kontrolle geben frei', B, "if (k && k.art !== 'ok') weich(", "if (k && k.art === 'fail') weich("],
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
  ['Kleber: Trockenlauf nur bei «1»', S, "const DRY = !['', '0', 'false', 'no', 'nein', 'off'].includes(", "const DRY = String(process.env.DRY_RUN) === '1' && !['', '0', 'false', 'no', 'nein', 'off'].includes("],
  ['Kleber: nach einem bestehenden Auftrag wird nicht gefragt', S, 'if (vorh.status === 200 && vorh.j && vorh.j.result) {', 'if (false) {'],
  ['Kleber: Nachfrage nicht möglich gilt als «kein Auftrag»', S, 'if (vorh.status !== 404) { await vorlaeufigerFehler(', 'if (false) { await vorlaeufigerFehler('],
  ['Kleber: external_id wird nicht mitgesendet', S, '{ external_id: ext, recipient:', '{ recipient:'],
  ['Kleber: Bestätigen trotz gescheitertem Markieren', S, "if (!(await tagsSetzen(tok, o, ['printful-synced'], pfId))) {", 'if (false) {'],
  ['Kleber: Fehler von tagsAdd werden übersehen', S, 'if (!Array.isArray(ue) || ue.length) return false;', ''],
  ['Kleber: Fehler des Metafelds werden übersehen', S, 'if (!Array.isArray(ue2) || ue2.length) return false;', ''],
  ['Kleber: Tag nur mit Statuslesen? Status wird nicht ausgewertet (immer bestätigt)', S, "if (st && st.art === 'bestaetigt') {", 'if (true) {'],
  ['Kleber: Kosten-Befund wird nicht übernommen', S, 'if (!k.ok) weich.push(', 'if (false) weich.push('],
  ['Kleber: abgelehnte Dateien werden nicht übernommen', S, "if (d.art === 'problem') for (const t of d.texte) weich.push(", 'if (false) for (const t of d.texte) weich.push('],
  ['Kleber: ausgeschaltetes Bestätigen fällt nicht auf', S, 'if (!AUTO_CONFIRM) weich.push(', 'if (false) weich.push('],
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
  ['Kleber: Vorgabe des Mindestgewinns ist 0', S, 'Number(process.env.PRINTFUL_MIN_NETTO_CHF) : 4;', 'Number(process.env.PRINTFUL_MIN_NETTO_CHF) : 0;'],
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
  ['WP6 Schlüssel: nicht lesbarer neuer Schlüssel wird wieder als Editor 5 (Vorderseite) gelesen', B, 'const unlesbar = !mn && SCHL_V6_NEU_VERDACHT.test(k);', 'const unlesbar = false;'],
  ['WP6 Schlüssel: «_druckdatei» in Kleinschreibung gilt nicht als Verdacht', B, 'const SCHL_V6_NEU_VERDACHT = /^_druckdatei/i;', 'const SCHL_V6_NEU_VERDACHT = /^_druckdatei/;'],
  ['WP6 Mischung: die neue Schreibweise zählt als alte (keine Mischung)', B, "stile.add(m ? 'alt' : mn ? 'neu' : 'v5');", "stile.add(m || mn ? 'alt' : 'v5');"],
  ['WP6 Mischung: dieselbe Platzierung in zwei Schreibweisen meldet zusätzlich «datei-doppelt»', B, "if (gesehen.get('v6:' + id) === stil) p('datei-doppelt'", "if (true) p('datei-doppelt'"],
  ['WP6 Doppelt: dieselbe neue Platzierung zweimal fällt nicht auf', B, "if (gesehen.get('v6:' + id) === stil) p('datei-doppelt'", "if (false) p('datei-doppelt'"],
  ['WP6 _vorschau: wird als Druckdatei gelesen', B, 'const SCHL_V5 = /Druckdatei|Print file/i;', 'const SCHL_V5 = /Druckdatei|Print file|vorschau/i;'],
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
  ['P1 Dienst: geschlossene und stornierte Fulfillment-Orders zählen', B, "if (st === 'CLOSED' || st === 'CANCELLED') continue;", ''],
  ['P1 Dienst: jede Fulfillment-Order zählt für jede Position', B, 'const drin = ((fo.lineItems && fo.lineItems.edges) || []).some(', 'const drin = true || ((fo.lineItems && fo.lineItems.edges) || []).some('],
  ['P1 Dienst: ein nicht lesbarer Standort gilt als Händler-Standort', B, "if (offen) return { art: 'unklar', grund: 'der Standort der Fulfillment-Order ist nicht lesbar' };", ''],
  ['P1 Dienst: eine Position ohne Fulfillment-Order gilt als Händler-Standort', B, "if (!gefunden) return { art: 'unklar', grund: 'die Position steht in keiner offenen Fulfillment-Order' };", ''],
  ['P1 Dienst: fehlende Fulfillment-Orders gelten als Händler-Standort', B, "return { art: 'unklar', grund: 'die Bestelldaten enthalten keine Fulfillment-Orders' };", "return { art: 'frei' };"],
  ['P1 Dienst: «dienst-standort» ist nur ein weicher Befund', B, "hart('dienst-standort',", "weich('dienst-standort',"],
  ['P1 Dienst: nach dem Befund laufen die Netzabfragen weiter', B, "im Printful-Dashboard prüfen`)); continue; }", "im Printful-Dashboard prüfen`)); }"],
  ['P1 Dienst: ein unklarer Standort bleibt ohne Befund', B, "if (stdo.art === 'unklar') weich(", "if (false) weich("],
  ['P1 Dienst: die Abfrage fragt nicht nach dem Dienst-Flag', S, 'assignedLocation{ location{ id name isFulfillmentService } }', 'assignedLocation{ location{ id name } }'],
  ['P1 Dienst: die Abfrage fragt nicht nach den Positionen der Fulfillment-Orders', S, 'lineItems(first:50){ edges{ node{ lineItem{ id } } } } } } }', 'lineItems(first:50){ edges{ node{ id } } } } } }'],
  ['P1 Dienst: die Abfrage fragt nicht nach Fulfillment-Orders', S, '  fulfillmentOrders(first:20){ edges{ node{ id status assignedLocation', '  fulfillmentOrdersX(first:20){ edges{ node{ id status assignedLocation'],
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
  ['P1 Kleber: das Paket geht nicht an den Plan', S, 'optionVorgaben: OPTION_VORGABEN, paket: paketVon });', 'optionVorgaben: OPTION_VORGABEN });'],
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
  ['P1 Rückseite v5: der Schlüssel «Hinten» zählt als Vorderseite', B, "const seite = /Hinten|Back/i.test(k) ? 'back' : 'front';", "const seite = 'front';"],
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
];

function zaehle(text, teil) { let n = 0, i = -1; while ((i = text.indexOf(teil, i + 1)) >= 0) n++; return n; }
function testen(wurzel) {
  for (const t of TESTS) {
    const r = spawnSync(process.execPath, [join(wurzel, t)], { cwd: wurzel, encoding: 'utf8', timeout: 180000, env: { PATH: process.env.PATH, HOME: process.env.HOME } });
    if (r.status !== 0) return t.replace(/^automation\//, '');
  }
  return null;
}

export function probe({ log = console.log, nur = null, nurPruefen = false } = {}) {
  const wurzel = mkdtempSync(join(tmpdir(), 'bestellweg-mutation-'));
  try {
    for (const d of DATEIEN) { if (!existsSync(join(REPO, d))) continue; mkdirSync(dirname(join(wurzel, d)), { recursive: true }); copyFileSync(join(REPO, d), join(wurzel, d)); }
    let falsch = 0;
    for (const [name, datei, von] of MUTANTEN) { const n = zaehle(readFileSync(join(wurzel, datei), 'utf8'), von); if (n !== 1) { log(`✗ Mutation nicht anwendbar (${n}× gefunden): ${name}`); falsch++; } }
    if (falsch) return { exit: 2, ueberlebt: [], erkannt: 0 };
    log(`${MUTANTEN.length} Mutanten, jeder an genau einer Stelle anwendbar.`);
    if (nurPruefen) return { exit: 0, ueberlebt: [], erkannt: 0 };
    const rot0 = testen(wurzel);
    if (rot0) { log(`✗ Kontrolllauf ohne Mutation ist schon rot: ${rot0}`); return { exit: 2, ueberlebt: [], erkannt: 0 }; }
    log('Kontrolllauf ohne Mutation: alle Testdateien grün.\n');
    let erkannt = 0, gesamt = 0; const ueberlebt = [];
    for (const [name, datei, von, zu] of MUTANTEN) {
      if (nur && !name.toLowerCase().includes(nur.toLowerCase())) continue;
      gesamt++;
      const pfad = join(wurzel, datei), original = readFileSync(pfad, 'utf8');
      writeFileSync(pfad, original.split(von).join(zu));
      const rot = testen(wurzel);
      writeFileSync(pfad, original);
      if (rot) { erkannt++; log(`✓ erkannt  ${name.padEnd(86)} ← ${rot}`); } else { ueberlebt.push(name); log(`✗ ÜBERLEBT ${name}`); }
    }
    log(`\n${erkannt} von ${gesamt} Mutanten erkannt.${ueberlebt.length ? ' ÜBERLEBT: ' + ueberlebt.join('; ') : ''}`);
    return { exit: ueberlebt.length ? 1 : 0, ueberlebt, erkannt };
  } finally { rmSync(wurzel, { recursive: true, force: true }); }
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(probe({ nur: process.env.NUR || null, nurPruefen: process.argv.includes('--pruefen') }).exit);
