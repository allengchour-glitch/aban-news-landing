#!/usr/bin/env node
// Mutationsprobe der Modell-Fabrik: baut absichtliche Fehler in die Quellen ein und verlangt, dass mindestens ein Test ROT wird.
// Ein Test, der einen eingebauten Fehler nicht bemerkt, schützt nichts. Gearbeitet wird in einer KOPIE im Temp-Ordner, das Repo bleibt unberührt.
// Lauf: /opt/node22/bin/node automation/pod_modell/mutation.mjs      (Exit 0 = alle Mutanten erkannt, 1 = mindestens einer überlebt, 2 = Mutation nicht anwendbar)
// Jeder Mutant nennt `von` (muss genau einmal vorkommen, ausser mit `alle`) und `zu`. Steht «?» in der Ausgabe, passt das Muster nicht mehr zum Code: Mutant nachziehen.
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, readdirSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const LIB = ['pod_auswahl_schreiben', 'pod_auswahl_plan', 'pod_auswahl_daten', 'pod_auswahl_spec', 'pod_auswahl_gql', 'pod_preise', 'printful_platzierung', 'shopify_gql', 'shopify_host', 'shopify_secret'].map((n) => `automation/lib/${n}.mjs`);
const TESTS = ['glossar', 'beschreibung', 'plan', 'tore', 'charge', 'bildmass', 'anlegen', 'pod_modell'].map((n) => `automation/pod_modell/${n}_test.mjs`);
const P = (n) => `automation/pod_modell/${n}.mjs`;

// { name, datei, von, zu, alle? }
export const MUTANTEN = [
  // ── Glossar
  { name: 'Handle darf 60 statt 50 Zeichen haben', datei: P('glossar'), von: 'export const HANDLE_MAX = 50;', zu: 'export const HANDLE_MAX = 60;' },
  { name: 'Adjektiv an weibliches Nomen mit «-es»', datei: P('glossar'), von: "const ENDUNG = { m: 'er', f: 'e', n: 'es', pl: 'e' };", zu: "const ENDUNG = { m: 'er', f: 'es', n: 'es', pl: 'e' };" },
  { name: 'Gildan ist keine Fremdmarke mehr', datei: P('glossar'), von: "'gildan', ", zu: '' },
  { name: 'Farbrang: veränderte Farben gleich rein', datei: P('glossar'), von: 'return best === 99 ? 99 : (rein ? best : 100 + best);', zu: 'return best;' },
  { name: 'Weiss mit Eszett', datei: P('glossar'), von: "white: 'Weiss', black: 'Schwarz'", zu: "white: 'Weiß', black: 'Schwarz'" },
  { name: 'slug: ä wird a statt ae', datei: P('glossar'), von: ".replace(/ä/g, 'ae')", zu: ".replace(/ä/g, 'a')" },
  { name: 'Handle-Kollision wird ignoriert', datei: P('glossar'), von: 'if (!schonVergeben.has(h)) return { handle: h, kollision: false };', zu: 'return { handle: h, kollision: false };' },
  { name: 'Handle endet auf Füllwort «mit»', datei: P('glossar'), von: 'while (FUELL.test(r)) r = r.replace(FUELL, \'\');', zu: '' },
  { name: 'Titelschlüssel kennt den Strich nicht', datei: P('glossar'), von: ".replace(/[–—-]/g, ' ').replace(/\\s+/g, ' ').trim();", zu: ".replace(/\\s+/g, ' ').trim();" },
  { name: 'Handelsname «Staple» bleibt im Titel', datei: P('glossar'), von: 'staple: { drop: true },', zu: "staple: { de: 'Staple', var: true }," },
  // ── Beschreibung
  { name: 'Container trägt die Klasse des Editors v5 (v5 würde ohne Bilder mounten)', datei: P('beschreibung'), von: '<div class="lspod-designer-v6"', zu: '<div class="lspod-designer"' },
  { name: 'Karte steht nicht im Container', datei: P('beschreibung'), von: 'PLATZHALTER_VARIANTE}"><script type="application/json" id="lspod-karte">', zu: 'PLATZHALTER_VARIANTE}"></div><script type="application/json" id="lspod-karte">' },
  { name: 'Beleg wird nicht gegen den Katalogtext geprüft', datei: P('beschreibung'), von: 'if (!o.includes(b)) fehler.push(', zu: 'if (false) fehler.push(' },
  { name: 'Zahlentoleranz riesig', datei: P('beschreibung'), von: 'Math.max(0.06, Math.abs(b) * 0.006)', zu: 'Math.max(1000, Math.abs(b) * 0.006)' },
  { name: 'Rückgabe-Aussage in Übersetzungen erlaubt', datei: P('beschreibung'), von: '[/rückgabe|umtausch|rücksendung|widerruf/i, \'Rückgabe\']', zu: "[/zzzzzzzz/, 'Rückgabe']" },
  { name: 'Behauptungen brauchen kein Gegenstück', datei: P('beschreibung'), von: 'if (bh.de.test(x.de) && !bh.en.test(x.beleg))', zu: 'if (false)' },
  { name: 'Rückgabetext sagt «möglich»', datei: P('beschreibung'), von: 'darum ist eine Rückgabe aus Meinungsänderung ausgeschlossen.', zu: 'darum ist eine Rückgabe aus Meinungsänderung möglich.' },
  { name: 'Spanne 0 Werktage erlaubt', datei: P('beschreibung'), von: 'min < 1 || max < min', zu: 'min < 0 || max < min' },
  { name: 'Skript-JSON schützt «<» nicht', datei: P('beschreibung'), von: ".replace(/</g, '\\\\u003c')", zu: '' },
  { name: 'doppelte Grössentabelle wird gezeigt', datei: P('beschreibung'), von: 'if (tabellen.some((x) => x.h === h))', zu: 'if (false)' },
  { name: 'Lieferbox mit Strich statt «bis»', datei: P('beschreibung'), von: 'return min === max ? `${min} Werktage` : `${min} bis ${max} Werktage`;', zu: 'return min === max ? `${min} Werktage` : `${min}–${max} Werktage`;' },
  { name: 'Tabellenzellen mit Strich statt «bis»', datei: P('beschreibung'), von: "esc(String(w.anzeige).replace(/(\\d)\\s*[–—]\\s*(\\d)/g, '$1 bis $2'))", zu: 'esc(String(w.anzeige))' },
  // ── Tore
  { name: 'Marge: Mindestgewinn nicht geprüft', datei: P('tore'), von: 'x.nettoChf + 1e-9 < nettoMin ||', zu: 'x.nettoChf + 1e-9 < nettoMin - 100 ||' },
  { name: 'Marge: X.90-Regel entfällt', datei: P('tore'), von: 'Math.round(x.preisChf * 100) % 100 !== 90', zu: 'Math.round(x.preisChf * 100) % 100 < 0' },
  { name: 'Bilder: ein einziges genügt', datei: P('tore'), von: '(plan.medien ?? []).length >= minBilder', zu: '(plan.medien ?? []).length >= 1' },
  { name: 'Handle-Länge nicht geprüft', datei: P('tore'), von: 'plan.handle.length <= HANDLE_MAX &&', zu: 'plan.handle.length <= 500 &&' },
  { name: 'oz zählt nicht als Fremdeinheit', datei: P('tore'), von: '|\\boz\\b|\\bounces?\\b', zu: '|\\bounces?\\b' },
  { name: 'langer Gedankenstrich allein', datei: P('tore'), von: 'const STRICH = /[–—]/;', zu: 'const STRICH = /[—]/;' },
  { name: 'Variantengrenze 150', datei: P('tore'), von: 'v.length >= 1 && v.length <= maxV &&', zu: 'v.length >= 1 && v.length <= maxV + 50 &&' },
  { name: 'Stufe wird nicht geprüft', datei: P('tore'), von: 'B(\'klasse\', \'Modell ist gestaltbar (FLACH, FLACH_MIT_HINWEIS, PANEL)\', stufen.includes(plan.stufe),', zu: 'B(\'klasse\', \'Modell ist gestaltbar (FLACH, FLACH_MIT_HINWEIS, PANEL)\', true,' },
  { name: 'Modell schon im Shop wird ignoriert', datei: P('tore'), von: "B('modell_neu', 'Modell wird noch von keinem Shop-Produkt verkauft', !(ctx.verwendeteModelle ?? new Set()).has(plan.printfulProductId),", zu: "B('modell_neu', 'Modell wird noch von keinem Shop-Produkt verkauft', true," },
  { name: 'Editor-Karte bettet den englischen Katalogtitel mit Fremdmarke ein', datei: P('plan'), von: '...(titelDe ? { titelDe } : {}), klasse: karte.klasse,', zu: 'titelEn: karte.titelEn, klasse: karte.klasse,' },
  { name: 'Editor-Karte: Aufpreis in CHF fehlt', datei: P('plan'), von: 'aufpreisChf: aufUsd ? aufpreisChf(aufUsd) : 0,', zu: 'aufpreisChf: 0,' },
  { name: 'Editor-Karte: Druckdatei-Gruppen erst ab sechs Gruppen', datei: P('plan'), von: 'if (gruppenAnzahl > 1) {', zu: 'if (gruppenAnzahl > 5) {' },
  { name: 'Editor-Karte: Hinweis-Code «stickerei» ohne Kundentext des Editors', datei: P('plan'), von: "['stickerei', 'gestrickt',", zu: "['gestrickt'," },
  { name: 'Editor-Karte: Grösse ohne die Variantenabbildung gerechnet', datei: P('plan'), von: "JSON.stringify({ ...edKarte, shop: { varianten: abbildungWorst } })", zu: 'JSON.stringify(edKarte)' },
  { name: 'Metafeld-Karte: die Editor-Karte statt der kompakten Prüfkarte', datei: P('plan'), von: "type: 'json', value: kompaktJson },", zu: "type: 'json', value: JSON.stringify(edKarteMitShop) }," },
  { name: 'Metafeld-Karte darf beliebig gross sein', datei: P('tore'), von: 'const mfGross = (plan.kompaktBytes ?? 0) > max,', zu: 'const mfGross = (plan.kompaktBytes ?? 0) > max * 100,' },
  { name: 'Editor-Karte darf beliebig gross sein', datei: P('tore'), von: 'edGross = (plan.karteBytes ?? 0) > maxEd;', zu: 'edGross = (plan.karteBytes ?? 0) > maxEd * 100;' },
  { name: 'CH-Rate wird nicht verlangt', datei: P('tore'), von: "B('ch_rate', 'Printful-Versandrate nach CH vorhanden', plan.lieferung != null,", zu: "B('ch_rate', 'Printful-Versandrate nach CH vorhanden', true," },
  { name: 'Fremdmarke im Titel wird geduldet', datei: P('tore'), von: 'plan.titel != null && (plan.titelUnbekannt ?? []).length === 0 && fm.length === 0,', zu: 'plan.titel != null && (plan.titelUnbekannt ?? []).length === 0,' },
  { name: 'ungemessene Bilder gelten als bestanden', datei: P('tore'), von: "else if ((plan.bilder?.ungemessen ?? []).length) add(", zu: "else if (false) add(" },
  // ── Plan
  { name: 'Kostenboden ohne Sicherheitszuschlag', datei: P('plan'), von: 'ekAufschlagOhneSchaetzung: 1.26,', zu: 'ekAufschlagOhneSchaetzung: 1.0,' },
  { name: 'SKU mit Bindestrich statt Unterstrich', datei: P('plan'), von: 'sku: `${skuBasis}_${v.printfulVariantId}`', zu: 'sku: `${skuBasis}-${v.printfulVariantId}`' },
  { name: 'Obergrenze 150 statt 100 Varianten', datei: P('plan'), von: 'if (summe + f.vs.length <= max) {', zu: 'if (summe + f.vs.length <= max + 50) {' },
  { name: 'gleicher deutscher Farbname wird doppelt übernommen', datei: P('plan'), von: 'if (gesehen.has(f.de)) {', zu: 'if (false) {' },
  { name: 'EU-Variante gilt als «ausserhalb»', datei: P('plan'), von: "if (s.EU === 'in_stock') return { herkunft: 'EU', regionen: ['EU'] };", zu: "if (s.EU === 'in_stock') return { herkunft: 'ausserhalb', regionen: ['EU'] };" },
  { name: 'EU-Varianten werden nicht bevorzugt', datei: P('plan'), von: 'if (eu.length) {', zu: 'if (false) {' },
  { name: 'Basisfläche: Aufpreis-Flächen gelten als frei', datei: P('plan'), von: 'const frei = fl.filter((p) => !(p.aufpreisUsd > 0));', zu: 'const frei = fl.filter(() => true);' },
  { name: 'Stickerei ohne Digitalisierungsgebühr', datei: P('plan'), von: "(basis?.p?.technik === 'EMBROIDERY' ? regel.digitalisierungUsd : 0)", zu: '0' },
  { name: 'Bestellweg passt immer', datei: P('plan'), von: 'if (weg0.gesichert && basis && weg0.platzierung !== basis.p.id) {', zu: 'if (false) {' },
  { name: 'Bildgrenze 1 px', datei: P('plan'), von: 'return Math.min(m.w, m.h) >= regel.bildMinPx; };', zu: 'return Math.min(m.w, m.h) >= 1; };' },
  { name: 'Bild ohne Messung wird einfach genommen', datei: P('plan'), von: 'if (l === null) { ungemessen.push(g.url); continue; }', zu: 'if (false) { ungemessen.push(g.url); continue; }' },
  { name: 'Titelkollision ohne Strich-Normalisierung', datei: P('plan'), von: 'titelSchluessel(y) === titelSchluessel(titelVoll(x))', zu: 'y === titelVoll(x)' },
  { name: 'Zusatzdrucke gelten als bestellbar', datei: P('plan'), von: 'const frei = !(p.aufpreisUsd > 0) || p.id === basisId;', zu: 'const frei = true;' },
  { name: 'Plan ist ACTIVE statt DRAFT', datei: P('plan'), von: "status: 'DRAFT', vendor: 'LuxeStyle'", zu: "status: 'ACTIVE', vendor: 'LuxeStyle'" },
  { name: 'Plan-Hash hängt von der Uhr ab', datei: P('plan'), von: 'erzeugt: { ...plan.erzeugt, am: null }', zu: 'erzeugt: { ...plan.erzeugt }' },
  { name: 'Marker-Tag fehlt', datei: P('plan'), von: "'printful_personalized_product', 'sg-fabrik', gruppe.tag,", zu: "'printful_personalized_product', gruppe.tag," },
  { name: 'Versand je Variante wird ignoriert', datei: P('plan'), von: 'opt.versandVarianten && opt.versandVarianten[v.printfulVariantId] != null ? Number(opt.versandVarianten[v.printfulVariantId]) : (rate?.rateUsd ?? null);', zu: '(rate?.rateUsd ?? null);' },
  // ── Anlegen
  { name: 'Produkt wird ACTIVE angelegt', datei: P('anlegen'), von: "title: plan.titel, handle: plan.handle, status: 'DRAFT',", zu: "title: plan.titel, handle: plan.handle, status: 'ACTIVE'," },
  { name: 'Variante mit inventoryPolicy DENY', datei: P('anlegen'), von: "sku: v.sku, inventoryPolicy: 'CONTINUE'", zu: "sku: v.sku, inventoryPolicy: 'DENY'" },
  { name: 'fremdes aktives Produkt wird als «eigen» fortgesetzt', datei: P('anlegen'), von: "if (ist.status !== 'DRAFT') a.push(`Status ${ist.status} ≠ DRAFT`);\n  if (!(ist.tags", zu: "if (false) a.push(`Status ${ist.status} ≠ DRAFT`);\n  if (!(ist.tags" },
  { name: 'Rücknahme löscht auch aktive Produkte', datei: P('anlegen'), von: "if (ist.status !== 'DRAFT') gruende.push(", zu: 'if (false) gruende.push(' },
  { name: 'Rücknahme ohne Marker-Tag', datei: P('anlegen'), von: 'if (!(ist.tags ?? []).includes(MARKER_TAG)) gruende.push(`Tag ${MARKER_TAG} fehlt (nicht von dieser Fabrik)`);', zu: '' },
  { name: 'Rücknahme löscht veröffentlichte Produkte', datei: P('anlegen'), von: 'if (ist.kanaele !== 0) gruende.push(', zu: 'if (false) gruende.push(' },
  { name: 'Rücknahme prüft die Ledger-ID nicht', datei: P('anlegen'), von: 'if (ist.id !== e.produktId) gruende.push(', zu: 'if (false) gruende.push(' },
  { name: 'Vergleich ignoriert Veröffentlichung', datei: P('anlegen'), von: "if (ist.kanaele !== 0) a.push(`Produkt ist in", zu: "if (false) a.push(`Produkt ist in" },
  { name: 'Variantenbudget wird nicht geprüft', datei: P('anlegen'), von: 'if (budget !== null && p.varianten.length > budget) {', zu: 'if (false) {' },
  { name: 'Lauf-Grenze von 3000 wird nicht geprüft', datei: P('anlegen'), von: 'if (neuImLauf + p.varianten.length > maxProLauf) {', zu: 'if (false) {' },
  { name: 'Ledger verliert die Produkt-ID bei FEHLER', datei: P('anlegen'), von: "produktId: produktId || m.get(handle)?.produktId || null", zu: 'produktId: produktId || null' },
  { name: 'SKU-Präfix im Shop wird nicht geprüft', datei: P('anlegen'), von: 'if (treffer.length) throw new AbweichungFehler(', zu: 'if (false) throw new AbweichungFehler(' },
  { name: 'fehlgeschlagene Medien werden ignoriert', datei: P('anlegen'), von: 'if (fehlgeschlagen.length) throw new Error(', zu: 'if (false) throw new Error(' },
  { name: 'Verbinden schon vor READY', datei: P('anlegen'), von: 'if (!offen.length) break;', zu: 'break;' },
  { name: 'Variantenabbildung (shop.varianten) wird nicht eingetragen', datei: P('anlegen'), von: '.join(JSON.stringify(shopVarianten ?? {}))', zu: ".join('{}')" },
  { name: 'Variantenabbildung zeigt immer auf Printful-Variante 0', datei: P('anlegen'), von: 'o[nummer(x.id)] = jeSku.get(x.sku);', zu: 'o[nummer(x.id)] = 0;' },
  { name: 'Editor-Adresse wird nicht eingesetzt', datei: P('anlegen'), von: '.split(PLATZHALTER_EDITOR).join(editorUrl)', zu: ".split(PLATZHALTER_EDITOR).join('')" },
  { name: 'Beschreibung wird nicht verglichen', datei: P('anlegen'), von: 'if (normHtml(ist.descriptionHtml) !== normHtml(soll)) a.push(', zu: 'if (false) a.push(' },
  { name: 'Metafelder werden nicht verglichen', datei: P('anlegen'), von: "if (!x) a.push(`Metafeld ${f.namespace}.${f.key} fehlt`);", zu: 'if (false) a.push(`Metafeld ${f.namespace}.${f.key} fehlt`);' },
  { name: 'Handle-Kollision mit fremdem Produkt wird übergangen', datei: P('anlegen'), von: 'if (fremd.length) throw new AbweichungFehler(`${plan.handle}: Handle gibt es schon', zu: 'if (false) throw new AbweichungFehler(`${plan.handle}: Handle gibt es schon' },
  { name: 'Ledger-Eintrag OK schon vor dem Vergleich', datei: P('anlegen'), von: "if (abw.length) { L('FEHLER'", zu: "if (false) { L('FEHLER'" },
  { name: 'Lauf bricht bei Tageslimit nicht ab', datei: P('anlegen'), von: "ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT' }); return { ergebnisse, exit: 4 }; }", zu: "ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT' }); }" },
  // ── CLI
  { name: 'LIVE prüft den Plan-Hash nicht', datei: P('pod_modell'), von: 'if (geprueft.hash !== datei.hash) {', zu: 'if (false) {' },
  { name: 'LIVE prüft das Alter der Daten nicht', datei: P('pod_modell'), von: 'if (!(alterH <= maxH) || !(versandAlterH <= maxH)) {', zu: 'if (false) {' },
  { name: 'LIVE ohne Ledger erlaubt', datei: P('pod_modell'), von: "if (!ledgerPfad) { log('LIVE=1 verweigert: LEDGER", zu: "if (false) { log('LIVE=1 verweigert: LEDGER" },
  { name: 'LIVE ohne Editor-Adresse erlaubt', datei: P('pod_modell'), von: "if (!editorUrl || !/^https:\\/\\//.test(editorUrl)) { log('LIVE=1 verweigert: LSPOD_EDITOR_URL", zu: "if (false) { log('LIVE=1 verweigert: LSPOD_EDITOR_URL" },
  { name: 'ZURUECK löscht auch ohne LIVE', datei: P('pod_modell'), von: "if (!LIVE) { log('ZURUECK=1 ohne LIVE=1", zu: "if (false) { log('ZURUECK=1 ohne LIVE=1" },
  { name: 'LIVE ohne PLAN erlaubt', datei: P('pod_modell'), von: "if (!env.PLAN || !existsSync(env.PLAN)) {", zu: 'if (false) {' },
  // ── Chargen, Bildmass
  { name: 'Chargen ohne Grundlast', datei: P('charge'), von: 'Math.min(proLauf, tagesLimit - grundlast)', zu: 'proLauf' },
  { name: 'Chargen: Stufe egal', datei: P('charge'), von: 'gut.sort((a, b) => (a.stufe - b.stufe) ||', zu: 'gut.sort((a, b) => 0 ||' },
  { name: 'Chargen: Verbrauch der letzten 24 h ignoriert', datei: P('charge'), von: 'const kapTag1 = o.verbraucht24h != null ?', zu: 'const kapTag1 = false ?' },
  { name: 'Bildhöhe aus falschem Byte', datei: P('bildmass'), von: '| b[22] << 8 | b[23]) >>> 0;', zu: '| b[22] << 8) >>> 0;' },
  { name: 'Messer fragt jeden Host an', datei: P('bilder_messen'), von: 'ERLAUBTE_HOSTS.includes(x.hostname)', zu: 'true' },
];

const kopieren = (von, nach) => { mkdirSync(dirname(nach), { recursive: true }); copyFileSync(von, nach); };

function baue(temp) {
  for (const f of [...LIB, ...TESTS]) kopieren(join(REPO, f), join(temp, f));
  for (const f of readdirSync(join(REPO, 'automation/pod_modell')).filter((x) => x.endsWith('.mjs'))) kopieren(join(REPO, 'automation/pod_modell', f), join(temp, 'automation/pod_modell', f));
  cpSync(join(REPO, 'dropship/selbst-gestalten-fertig-0511/werkzeuge'), join(temp, 'dropship/selbst-gestalten-fertig-0511/werkzeuge'), { recursive: true });
  if (existsSync(join(REPO, 'pod/v6/werkzeug/karte_fuer_editor.mjs'))) kopieren(join(REPO, 'pod/v6/werkzeug/karte_fuer_editor.mjs'), join(temp, 'pod/v6/werkzeug/karte_fuer_editor.mjs'));
  cpSync(join(REPO, 'dropship/pod-auswahl'), join(temp, 'dropship/pod-auswahl'), { recursive: true });
  cpSync(join(REPO, 'dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen'), join(temp, 'dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen'), { recursive: true });
}
const laufe = (temp, tests) => { for (const t of tests) { const r = spawnSync(process.execPath, [join(temp, t)], { cwd: temp, encoding: 'utf8', timeout: 120000 }); if (r.status !== 0) return { rot: true, test: t }; } return { rot: false }; };

export function main() {
  const temp = mkdtempSync(join(tmpdir(), 'fabrik-mut-'));
  let erkannt = 0, ueberlebt = 0, nichtAnwendbar = 0;
  try {
    baue(temp);
    const basis = laufe(temp, TESTS);
    if (basis.rot) { console.log(`Grundlinie rot (${basis.test}): erst die Tests reparieren`); return 1; }
    console.log(`Grundlinie grün (${TESTS.length} Testdateien), ${MUTANTEN.length} Mutanten`);
    for (const m of MUTANTEN) {
      const pfad = join(temp, m.datei);
      const orig = readFileSync(pfad, 'utf8');
      const n = orig.split(m.von).length - 1;
      if (n === 0 || (n > 1 && !m.alle)) { console.log(`? ${m.name}: Muster kommt ${n}× vor (nicht anwendbar)`); nichtAnwendbar++; continue; }
      writeFileSync(pfad, m.alle ? orig.split(m.von).join(m.zu) : orig.replace(m.von, () => m.zu));
      const r = laufe(temp, TESTS);
      writeFileSync(pfad, orig);
      if (r.rot) { erkannt++; console.log(`✓ erkannt (${r.test.split('/').pop()}): ${m.name}`); } else { ueberlebt++; console.log(`✗ ÜBERLEBT: ${m.name}`); }
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
  console.log(`\nMutationsprobe: ${erkannt} von ${MUTANTEN.length} erkannt, ${ueberlebt} überlebt, ${nichtAnwendbar} nicht anwendbar`);
  return nichtAnwendbar ? 2 : ueberlebt ? 1 : 0;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exit(main());
