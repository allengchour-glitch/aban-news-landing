#!/usr/bin/env node
// Mutationsprobe für den gehärteten Bestellweg (Strom 3, 05.11.2026): baut absichtliche Fehler in printful_sync.mjs, lib/printful_bestellweg.mjs und lib/printful_platzierung.mjs ein
// und verlangt, dass mindestens eine der drei Testdateien ROT wird. Gearbeitet wird in einer KOPIE (TMPDIR), das Repo bleibt unberührt.
// Lauf:  /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs          (Exit 0 = alle erkannt, 1 = mindestens einer überlebt, 2 = Mutation nicht anwendbar)
//        --pruefen    prüft nur, ob jede Fundstelle genau einmal vorkommt;   NUR=<Teil des Namens>   nur diese Mutanten
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
  'dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs',
];
const TESTS = ['automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/printful_sync_test.mjs'];   // schnellste zuerst
const B = 'automation/lib/printful_bestellweg.mjs', P = 'automation/lib/printful_platzierung.mjs', S = 'automation/printful_sync.mjs';

// [Name, Datei, von (muss genau einmal vorkommen), zu]
export const MUTANTEN = [
  // ── Adresse und Eigenschaften der Position
  ['Adresse: http wird akzeptiert', B, "if (u.protocol !== 'https:') return 'keine https-Adresse';", ''],
  ['Adresse: fremder Host wird akzeptiert', B, "if (!hosts.map((h) => h.toLowerCase()).includes(u.hostname.toLowerCase())) return", 'if (false) return'],
  ['Adresse: Zugangsdaten in der Adresse werden akzeptiert', B, 'if (u.username || u.password)', 'if (false)'],
  ['Eigenschaften: leere Druckdatei zählt als Fehler', B, "if (w.trim() === '') continue;", ''],
  ['Eigenschaften: v5 und v6 gemischt fällt nicht auf', B, 'if (v6 && v5) p(', 'if (false) p('],
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
  ['Auflösung: Stickerei ohne Druckdatei-Grösse braucht wieder eine', B, "if (technikFamilie(f.type) !== 'EMBROIDERY') weich('aufloesung'", "weich('aufloesung'"],
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
  ['Kennung: external_id nicht begrenzt', B, '.slice(0, 30);', '.slice(0, 300);'],
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
  ['Plan: Position ohne Druckdatei fällt nicht auf', B, "if (!dateien.length) { hart('keine-druckdatei'", "if (false) { hart('keine-druckdatei'"],
  ['Plan: Menge geht verloren', B, 'Number.isInteger(z.quantity) && z.quantity > 0 ? z.quantity : 1', '1'],
  ['Plan: Optionen gehen nicht an Printful', B, 'if (op.optionen.length) item.options = op.optionen;', ''],
  ['Plan: Erlös in Fremdwährung gilt als CHF', B, "String(m.currencyCode || '').toUpperCase() === 'CHF'", 'true'],
  ['Plan: unbekannter Erlös einer Position wird übergangen', B, 'if (betrag === null) erloesBekannt = false;', ''],
  ['Plan: Fehler der KI-Kontrolle geben frei', B, "if (k && k.art !== 'ok') weich(", "if (k && k.art === 'fail') weich("],
  ['Plan: Druckdaten nicht lesbar fällt nicht auf', B, "if (!dd || dd.art !== 'ok') weich('druckdaten'", "if (false) weich('druckdaten'"],
  ['Plan: Positionen werden harter Befund, der Rest läuft trotzdem durch', B, 'if (befunde.slice(bf0).some((b) => b.hart)) continue;', ''],
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
  ['Kleber: Telegram nicht zugestellt wird übergangen', S, 'if (ok === false) { fehler.push(`${o.name}: Telegram-Meldung', 'if (false) { fehler.push(`${o.name}: Telegram-Meldung'],
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
