#!/usr/bin/env node
// Mutationsprobe für «Selbst gestalten: Material + Modelle»: baut absichtliche Fehler in die Quellen ein und verlangt, dass die Tests ROT werden.
// Ein Test, der einen eingebauten Fehler nicht bemerkt, schützt nichts. Gearbeitet wird in einer KOPIE im Temp-Ordner, das Repo bleibt unberührt.
// Lauf: /opt/node22/bin/node automation/pod_auswahl_mutation.mjs      (Exit 0 = alle Mutanten erkannt, 1 = mindestens einer überlebt, 2 = Mutation nicht anwendbar)
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const DATEIEN = [
  'automation/pod_auswahl.mjs', 'automation/pod_auswahl_test.mjs', 'automation/printful_sync.mjs', 'automation/printful_sync_test.mjs', 'automation/printful_reprice.mjs',
  ...['pod_preise', 'printful_platzierung', 'pod_auswahl_spec', 'pod_auswahl_plan', 'pod_auswahl_daten', 'pod_auswahl_schreiben', 'pod_auswahl_gql'].map((n) => `automation/lib/${n}.mjs`),
  ...['pod_preise', 'printful_platzierung', 'pod_auswahl_plan', 'pod_auswahl_daten', 'pod_auswahl_schreiben', 'pod_auswahl_gql'].map((n) => `automation/lib/${n}_test.mjs`),
  'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_host.mjs',
  ...readdirSync(join(REPO, 'dropship/pod-auswahl')).filter((f) => f.endsWith('.json')).map((f) => `dropship/pod-auswahl/${f}`),
  'dropship/pod-auswahl/README.md', 'automation/pod_auswahl_mutation.mjs',   // vom Test «kein Eszett» gelesen
];
const LIB = ['lib/pod_preise_test.mjs', 'lib/printful_platzierung_test.mjs', 'lib/pod_auswahl_plan_test.mjs', 'lib/pod_auswahl_daten_test.mjs', 'lib/pod_auswahl_gql_test.mjs', 'lib/pod_auswahl_schreiben_test.mjs'];
const ALLE = [...LIB, 'pod_auswahl_test.mjs', 'printful_sync_test.mjs'];

// { name, datei, von, zu, alle? (alle Vorkommen ersetzen, sonst muss `von` genau einmal vorkommen), tests }
const L = (n) => `automation/lib/${n}.mjs`;
export const MUTANTEN = [
  // ── Preisregel
  { name: 'Richtwert-Faktor 2.0 statt 2.3', datei: L('pod_preise'), von: 'faktor: 2.3,', zu: 'faktor: 2.0,', tests: ALLE },
  { name: 'Richtwert = min statt max', datei: L('pod_preise'), von: 'Math.max(einkaufRp * regel.faktor', zu: 'Math.min(einkaufRp * regel.faktor', tests: ALLE },
  { name: 'Versandbeitrag schon bei genau 50.00', datei: L('pod_preise'), von: '(preisRp < regel.gratisAb * 100 ?', zu: '(preisRp <= regel.gratisAb * 100 ?', tests: ALLE },
  { name: 'Mindest-Netto halbiert', datei: L('pod_preise'), von: 'if (n >= regel.nettoMin * 100) {', zu: 'if (n >= regel.nettoMin * 50) {', tests: ALLE },
  { name: 'Höchstpreis 249.90 statt 149.90', datei: L('pod_preise'), von: 'maxPreis: 149.90,', zu: 'maxPreis: 249.90,', tests: ALLE },
  { name: 'Zahlungsgebühr ohne Fixbetrag', datei: L('pod_preise'), von: 'gebuehrFix: 0.30,', zu: 'gebuehrFix: 0.00,', tests: ALLE },
  { name: 'Wechselkurs 0.95 statt 0.90', datei: L('pod_preise'), von: 'usdChf: 0.90,', zu: 'usdChf: 0.95,', tests: ALLE },
  { name: 'Preis nicht auf X.90 sondern X.00 (Raster beginnt bei 100)', datei: L('pod_preise'), von: 'let k = Math.max(0, Math.ceil((rw - 90) / 100 - EPS));\n  for (let preis = k * 100 + 90;', zu: 'let k = Math.max(0, Math.ceil((rw - 90) / 100 - EPS));\n  for (let preis = k * 100 + 100;', tests: ALLE },
  // ── Plan
  { name: 'EU-Lager wird ignoriert', datei: L('pod_auswahl_plan'), von: "kv.eu !== 'in_stock'", zu: 'false', alle: true, tests: ALLE },
  { name: 'SKU mit Bindestrich statt Unterstrich', datei: L('pod_auswahl_plan'), von: 'export const skuVon = (praefix, pfId) => `${praefix}_${pfId}`;', zu: 'export const skuVon = (praefix, pfId) => `${praefix}-${pfId}`;', tests: ALLE },
  { name: '«Material» an Position 2 statt 1', datei: L('pod_auswahl_plan'), von: 'const nachher = [{ name: matName, position: 1, werte: materialWerte }, ...vorher', zu: 'const nachher = [{ name: matName, position: 2, werte: materialWerte }, ...vorher', tests: ALLE },
  { name: 'vorhandene Variante bekommt +1 CHF', datei: L('pod_auswahl_plan'), von: 'preisChf: Number(v.price), pf, optionen: nachherOptionen(v)', zu: 'preisChf: Number(v.price) + 1, pf, optionen: nachherOptionen(v)', tests: ALLE },
  { name: 'alter Materialblock wird nicht ersetzt, sondern der Rest bleibt stehen', datei: L('pod_auswahl_plan'), von: 'return s.slice(0, a) + block + s.slice(z + MARKE_ZU.length);', zu: 'return s.slice(0, a) + block + s.slice(z);', tests: ALLE },
  { name: 'Hash hängt von der Schlüsselreihenfolge ab', datei: L('pod_auswahl_plan'), von: "'{' + Object.keys(x).sort().map(", zu: "'{' + Object.keys(x).map(", tests: ALLE },
  { name: 'Befund «vorhandene SKU ist ein anderes Printful-Produkt» wird unterdrückt', datei: L('pod_auswahl_plan'), von: 'if (pr.produkt !== erwartetProdukt) {', zu: 'if (false) {', tests: ALLE },
  { name: 'schon angelegte Variante wird trotzdem noch einmal geplant', datei: L('pod_auswahl_plan'), von: 'if (da) schonDa.push(', zu: 'if (false) schonDa.push(', tests: ALLE },
  { name: 'Variantengrenze wird nicht durchgesetzt', datei: L('pod_auswahl_plan'), von: 'while (neu.length > max && modelle.length) {', zu: 'while (false) {', tests: ALLE },
  { name: 'Samsung-Beschreibung behält «iPhone»', datei: L('pod_auswahl_plan'), von: 'auf einer <strong>Samsung-Hülle</strong>', zu: 'auf einer <strong>iPhone-Hülle</strong>', tests: ALLE },
  { name: 'Preis wird NICHT gegen den Katalogpreis gerechnet (Einkauf 1 USD)', datei: L('pod_auswahl_plan'), von: 'einkaufUsd: Number(kv.price), versandUsd: rate.usd }, ctx.regel)', zu: 'einkaufUsd: 1, versandUsd: rate.usd }, ctx.regel)', alle: true, tests: ALLE },
  // ── Platzierung
  { name: 'PHONE-CASE fehlt in den Einzel-Typen', datei: L('printful_platzierung'), von: "['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'FRAMED-POSTER'", zu: "['MUG', 'STICKER', 'POSTER', 'FRAMED-POSTER'", tests: ALLE },
  { name: 'eine einzige Platzierung wird nicht erkannt', datei: L('printful_platzierung'), von: 'if (dr.length === 1) return { platzierung: dr[0]', zu: 'if (false) return { platzierung: dr[0]', tests: ALLE },
  { name: 'Rückseite wird immer zu «front»', datei: L('printful_platzierung'), von: "return { platzierung: s, gesichert, quelle: 'printful-typ'", zu: "return { platzierung: 'front', gesichert, quelle: 'printful-typ'", tests: ALLE },
  { name: 'Rückfall vergisst «POSTER»', datei: L('printful_platzierung'), von: "'STICKER', 'POSTER', 'CANVAS', 'MAGNET']);", zu: "'STICKER', 'CANVAS', 'MAGNET']);", tests: ALLE },
  { name: 'Rückfall vergisst «CANVAS»', datei: L('printful_platzierung'), von: "'STICKER', 'POSTER', 'CANVAS', 'MAGNET']);", zu: "'STICKER', 'POSTER', 'MAGNET']);", tests: ALLE },
  { name: 'Rückfall vergisst «MAGNET» (echte Shop-Produktart, 7 Produkte)', datei: L('printful_platzierung'), von: "'STICKER', 'POSTER', 'CANVAS', 'MAGNET']);", zu: "'STICKER', 'POSTER', 'CANVAS']);", tests: ALLE },
  { name: 'Rückfall vergisst «MUG»', datei: L('printful_platzierung'), von: "const ALTE_LISTE = Object.freeze(['MUG', 'PHONE-CASE'", zu: "const ALTE_LISTE = Object.freeze(['PHONE-CASE'", tests: ALLE },
  { name: 'EINZEL_TYPEN nimmt das unbelegte «MAGNET» wieder auf', datei: L('printful_platzierung'), von: "'POSTER', 'FRAMED-POSTER', 'CANVAS']);", zu: "'POSTER', 'FRAMED-POSTER', 'CANVAS', 'MAGNET']);", tests: ALLE },
  { name: 'MEHRLAGEN_TYPEN nimmt das unbelegte «DIRECT-TO-FABRIC» wieder auf', datei: L('printful_platzierung'), von: "['T-SHIRT', 'CUT-SEW']);", zu: "['T-SHIRT', 'CUT-SEW', 'DIRECT-TO-FABRIC']);", tests: ALLE },
  { name: 'Rückfall gilt ohne bekannte Shop-Art als gesichert', datei: L('printful_platzierung'), von: "return { platzierung, gesichert: bekannt, quelle: 'rueckfall'", zu: "return { platzierung, gesichert: true, quelle: 'rueckfall'", tests: ALLE },
  { name: 'die Dateiliste wird für die gewünschte Seite nicht befragt', datei: L('printful_platzierung'), von: 'const gesichert = dr.length ? kennt : true;', zu: 'const gesichert = true;', tests: ALLE },
  { name: 'Rückseite wird in der Dateiliste nicht gesucht (vorne zählt)', datei: L('printful_platzierung'), von: "const kennt = s === 'back' ? dr.includes('back') :", zu: "const kennt = s === 'back' ? (dr.includes('default') || dr.includes('front')) :", tests: ALLE },
  { name: 'vorübergehender Fehler wird dauerhaft gemerkt', datei: L('printful_platzierung'), von: "if (erg.art !== 'nicht-lesbar') m.set(k, erg);", zu: 'm.set(k, erg);', tests: ALLE },
  { name: 'HTTP 5xx und 429 werden nicht wiederholt', datei: L('printful_platzierung'), von: 'status === 0 || status === 408 || status === 429 || status >= 500;', zu: 'status === 0;', tests: ALLE },
  { name: 'HTTP 404 wird wie ein vorübergehender Fehler wiederholt', datei: L('printful_platzierung'), von: 'status === 0 || status === 408 || status === 429 || status >= 500;', zu: 'status === 0 || status === 404 || status === 408 || status === 429 || status >= 500;', tests: ALLE },
  { name: 'Retry-After von Printful wird ignoriert', datei: L('printful_platzierung'), von: '((r && Number(r.retryAfter)) || 0) * 1000', zu: '0', tests: ALLE },
  { name: 'ungesicherte Platzierung setzt needReview nicht', datei: L('printful_platzierung'), von: 'needReview: hinweise.length > 0,', zu: 'needReview: false,', tests: ALLE },
  // ── Bestellweg (printful_sync.mjs): Verhalten gegen gefälschtes fetch (printful_sync_test.mjs), nicht nur Quelltext
  { name: 'Bestellweg: Seite der Druckdatei geht verloren (alles «front»)', datei: 'automation/printful_sync.mjs', von: 'pfFiles.push(plz.files[i]);', zu: "pfFiles.push({type:'front',url:f.url});", tests: ALLE },
  { name: 'Bestellweg: Shop-Produktart wird nicht als Rückfall mitgegeben', datei: 'automation/printful_sync.mjs', von: 'shopTyp:li.product&&li.product.productType', zu: "shopTyp:''", tests: ALLE },
  { name: 'Bestellweg: falscher Printful-Pfad (/products/<id> statt /products/variant/<id>)', datei: 'automation/printful_sync.mjs', von: "pf('/products/variant/'+vid", zu: "pf('/products/'+vid", tests: ALLE },
  { name: 'Bestellweg: Variantennummer geht nicht an die Abfrage', datei: 'automation/printful_sync.mjs', von: 'platzierungenFuerDateien({vid,dateien:files', zu: 'platzierungenFuerDateien({vid:0,dateien:files', tests: ALLE },
  { name: 'Bestellweg: die Druckdateien gehen nicht an die Platzierung', datei: 'automation/printful_sync.mjs', von: 'platzierungenFuerDateien({vid,dateien:files', zu: 'platzierungenFuerDateien({vid,dateien:[]', tests: ALLE },
  { name: 'Bestellweg: HTTP-Status der Variantenabfrage geht verloren (alles gilt als 200)', datei: 'automation/printful_sync.mjs', von: 'return {status:r.status,result:', zu: 'return {status:200,result:', tests: ALLE },
  { name: 'Bestellweg: ungesicherte Platzierung macht den Auftrag nicht zum Entwurf', datei: 'automation/printful_sync.mjs', von: 'if(plz.needReview){ needReview=true;', zu: 'if(plz.needReview){', tests: ALLE },
  { name: 'Bestellweg: Variantenabfrage ohne Zeitlimit', datei: 'automation/printful_sync.mjs', von: 'signal:timeoutMs?AbortSignal.timeout(timeoutMs):undefined', zu: 'signal:undefined', tests: ALLE },
  { name: 'Bestellweg: die Bestellung selbst bekommt ein Zeitlimit (eine zweite Bestellung wäre möglich)', datei: 'automation/printful_sync.mjs', von: "const res=await pf('/orders'+(confirm?'?confirm=1':''),'POST',{recipient,items});", zu: "const res=await pf('/orders'+(confirm?'?confirm=1':''),'POST',{recipient,items},20000);", tests: ALLE },
  { name: 'Bestellweg: ein Entwurf wird trotzdem bestätigt', datei: 'automation/printful_sync.mjs', von: 'const confirm = AUTO_CONFIRM && !needReview;', zu: 'const confirm = AUTO_CONFIRM;', tests: ALLE },
  // ── Schreibweg
  { name: 'Tageslimit wird nicht erkannt', datei: L('pod_auswahl_schreiben'), von: 'const DROSSEL = /VARIANT_THROTTLE|Daily variant creation limit/i;', zu: 'const DROSSEL = /NIE_TREFFER/i;', tests: ALLE },
  { name: 'neue Varianten werden mit Bestandsführung angelegt', datei: L('pod_auswahl_schreiben'), von: 'inventoryItem: { sku: v.sku, tracked: false, requiresShipping: true },', zu: 'inventoryItem: { sku: v.sku, tracked: true, requiresShipping: true },', tests: ALLE },
  { name: 'Sicherung überschreibt vorhandene Datei', datei: L('pod_auswahl_schreiben'), von: 'if (existsSync(pfad)) return false;', zu: '', tests: ALLE },
  { name: 'Ledger-Erfolge werden nicht übersprungen', datei: L('pod_auswahl_schreiben'), von: 'if (ledger.has(ledgerSchluessel(p))) {', zu: 'if (false) {', tests: ALLE },
  { name: 'Abweichung beendet mit Exit 2 statt 3', datei: L('pod_auswahl_schreiben'), von: 'return { ergebnisse, exit: 3 };', zu: 'return { ergebnisse, exit: 2 };', tests: ALLE },
  { name: 'Abbruch erst nach 99 Fehlern', datei: L('pod_auswahl_schreiben'), von: 'if (folge >= maxFehlerFolge) {', zu: 'if (folge >= 99) {', tests: ALLE },
  { name: 'Stücke zu 500 statt 50', datei: L('pod_auswahl_schreiben'), von: 'export const CHUNK = 50;', zu: 'export const CHUNK = 500;', tests: ALLE },
  { name: 'Blocker-Befund sperrt nicht mehr', datei: L('pod_auswahl_schreiben'), von: 'if (offen.length) {', zu: 'if (false) {', tests: ALLE },
  { name: 'Preisabweichung nach dem Schreiben wird nicht bemerkt', datei: L('pod_auswahl_schreiben'), von: 'Math.abs(Number(v.price) - s.preisChf) > 0.001', zu: 'Math.abs(Number(v.price) - s.preisChf) > 999', tests: ALLE },
  { name: 'Optionswerte werden nicht vorab angelegt', datei: L('pod_auswahl_schreiben'), von: 'if (!fehlt.length) continue;', zu: 'continue;', tests: ALLE },
  { name: 'Samsung bleibt nicht DRAFT', datei: L('pod_auswahl_schreiben'), von: "title: np.titel, handle: np.handle, status: 'DRAFT',", zu: "title: np.titel, handle: np.handle, status: 'ACTIVE',", tests: ALLE },
  // ── Korrekturrunde 27.10.2026: doppelte Printful-Varianten, Texte, Preisleiter, Netto ohne Kundenversand, OHNE, Umstellungsrechnung
  { name: 'Kollision mit einem anderen Produkt wird nicht gefunden', datei: L('pod_auswahl_plan'), von: 'if (a.handle === handle) continue;', zu: 'continue;', tests: ALLE },
  { name: 'Kollision mit dem EIGENEN Produkt zählt auch', datei: L('pod_auswahl_plan'), von: 'if (a.handle === handle) continue;', zu: '', tests: ALLE },
  { name: 'Kollisionsbefund sperrt LIVE nicht mehr (nur Hinweis)', datei: L('pod_auswahl_plan'), von: "return { schwere: 'blocker', code: 'sku-in-anderem-produkt'", zu: "return { schwere: 'hinweis', code: 'sku-in-anderem-produkt'", tests: ALLE },
  { name: 'Netto des Einzelprodukts wird gegen 0 statt gegen die Regel gemessen', datei: L('pod_auswahl_plan'), von: 'k.andererNettoChf < regel.nettoMin);', zu: 'k.andererNettoChf < 0);', tests: ALLE },
  { name: 'OHNE schliesst nichts mehr aus', datei: L('pod_auswahl_plan'), von: '(o) => o.handle === handle && o.material === material)', zu: '(o) => false)', tests: ALLE },
  { name: 'OHNE darf das vorhandene Material ausschliessen', datei: L('pod_auswahl_plan'), von: 'if (m.bestand) throw new Error(', zu: 'if (false) throw new Error(', tests: ALLE },
  { name: 'OHNE ändert den Plan-Hash nicht', datei: L('pod_auswahl_plan'), von: "ausgeschlossen: (p.nichtAngelegt || []).filter((n) => n.code === 'ausgeschlossen').map((n) => n.material), ", zu: '', tests: ALLE },
  { name: 'Netto ohne Kundenversand rechnet die Gebühr nicht ab', datei: L('pod_preise'), von: 'return preisRp - gebuehrRp(preisRp, regel) - einkaufRp - versandRp;', zu: 'return preisRp - einkaufRp - versandRp;', tests: ALLE },
  { name: 'Hinweis «Netto nur mit Kundenversand» kommt nie', datei: L('pod_auswahl_plan'), von: 'if (schwach.length) {', zu: 'if (false) {', tests: ALLE },
  { name: 'Preisleiter: grösseres, billigeres Format fällt nicht auf', datei: L('pod_auswahl_plan'), von: 'reihe[i].e.preisChf < reihe[i - 1].e.preisChf', zu: 'reihe[i].e.preisChf > reihe[i - 1].e.preisChf', tests: ALLE },
  { name: 'Katalog-Lücken bei festen Zeilen werden verschwiegen', datei: L('pod_auswahl_plan'), von: 'if (zeilen.some((z) => z.zweiter === w)) continue;', zu: 'continue;', tests: ALLE },
  { name: 'Texte ausserhalb des Blocks werden nie gemeldet', datei: L('pod_auswahl_plan'), von: 'if (!nicht.length) continue;', zu: 'continue;', tests: ALLE },
  { name: 'Texte: Stelle zählt auch, wenn sie für ALLE Materialien gilt', datei: L('pod_auswahl_plan'), von: 'if (!nicht.length) continue;', zu: '', tests: ALLE },
  { name: 'Block verschweigt, dass der Haupttext nur das vorhandene Material beschreibt', datei: L('pod_auswahl_plan'), von: 'grundWert && vorhandeneWerte.length > 1 ?', zu: 'false ?', tests: ALLE },
  { name: 'MagSafe-Aussage im Block der Hartschale fehlt (ohne MagSafe®-Magnete)', datei: L('pod_auswahl_spec'), von: "F('ohne MagSafe®-Magnete (MagSafe® gibt es nur beim Material «Hartschale MagSafe»)', Z(601,", zu: "F('mit MagSafe®-Magneten (MagSafe® gibt es bei diesem Material)', Z(601,", tests: ALLE },
  { name: 'Umstellungsrechnung: Einkauf des gemeinten Produkts halbiert', datei: L('pod_auswahl_plan'), von: 'endpreis({ einkaufUsd: Number(alt.price), versandUsd }, ctx.regel)', zu: 'endpreis({ einkaufUsd: Number(alt.price) / 2, versandUsd }, ctx.regel)', tests: ALLE },
  { name: 'Versandraten des gemeinten Produkts werden nicht angefordert', datei: L('pod_auswahl_plan'), von: 'if (b && gemeint) for', zu: 'if (false && gemeint) for', tests: ALLE },
  // ── Exit-Codes und Bestätigung
  { name: 'Produkt mit FEHLER beendet den Lauf mit Exit 0', datei: L('pod_auswahl_schreiben'), von: "if (ergebnisse.some((r) => r.status === 'FEHLER')) return 1;", zu: "if (ergebnisse.some((r) => r.status === 'FEHLER')) return 0;", tests: ALLE },
  { name: 'GESPERRTES Produkt beendet den Lauf mit Exit 0', datei: L('pod_auswahl_schreiben'), von: "if (ergebnisse.some((r) => r.status === 'GESPERRT')) return 5;", zu: "if (ergebnisse.some((r) => r.status === 'GESPERRT')) return 0;", tests: ALLE },
  { name: 'Lauf gibt immer Exit 0 zurück (alter Fehler)', datei: L('pod_auswahl_schreiben'), von: 'return { ergebnisse, exit: endeCode(ergebnisse) };', zu: 'return { ergebnisse, exit: 0 };', tests: ALLE },
  { name: 'Bestätigung gilt pauschal für das ganze Produkt', datei: L('pod_auswahl_schreiben'), von: '(befundOk || []).includes(`${handle}:${code}`);', zu: '(befundOk || []).includes(handle) || (befundOk || []).includes(`${handle}:${code}`);', tests: ALLE },
  { name: 'Die Ausgabe nennt den Grund des Endes nicht', datei: L('pod_auswahl_schreiben'), von: "`ENDE: Exit ${res.exit} – ${EXIT_TEXT[res.exit] ?? 'unbekannt'}`", zu: "''", tests: ALLE },
  // ── Schreibweg: Mutationen nie still wiederholen
  { name: 'Mutation wird bei 5xx still wiederholt (Doppelanlage möglich)', datei: L('pod_auswahl_gql'), von: 'const NICHT_AUSGEFUEHRT = /throttled|HTTP 429/i;', zu: 'const NICHT_AUSGEFUEHRT = /throttled|HTTP 429|HTTP 5\\d\\d|fetch/i;', tests: ALLE },
  { name: 'Mutation bekommt die Geduld einer Abfrage (6 Versuche in shopifyGql)', datei: L('pod_auswahl_gql'), von: '...(mutation ? { versuche: 1 } : {})', zu: '...({})', tests: ALLE },
  { name: 'Tageslimit wird als Drosselung wiederholt', datei: L('pod_auswahl_gql'), von: '&& !TAGESLIMIT.test(m) && i < drosselVersuche', zu: '&& i < drosselVersuche', tests: ALLE },
  { name: 'Schemafehler einer Abfrage werden geworfen statt als {errors} gemeldet', datei: L('pod_auswahl_gql'), von: 'if (/^GraphQL: \\[/.test(m)) return { errors: [{ message: m }] };', zu: '', tests: ALLE },
  // ── SKU-Index und Reprice-Sperre
  { name: 'SKU-Index zählt die eigenen Produkte mit', datei: L('pod_auswahl_daten'), von: 'if (eigene.has(p.handle)) continue;', zu: '', tests: ALLE },
  { name: 'SKU-Index merkt sich nicht, dass er Produkte mit über 100 Varianten nur zu Teilen las', datei: L('pod_auswahl_daten'), von: 'if (p.variants?.pageInfo?.hasNextPage) abgeschnitten.push(p.handle);', zu: '', tests: ALLE },
  { name: 'SKU-Index liest nur die erste Seite', datei: L('pod_auswahl_daten'), von: 'cursor = seite.pageInfo.hasNextPage ? seite.pageInfo.endCursor : null;', zu: 'cursor = null;', tests: ALLE },
  { name: 'printful_reprice senkt die «Selbst gestalten»-Preise wieder', datei: 'automation/printful_reprice.mjs', von: 'if(!MIT_AUSWAHL && AUSWAHL.has(p.handle)){', zu: 'if(false){', tests: ALLE },
  // ── Kommando
  { name: 'LIVE prüft den geprüften Plan nicht mehr', datei: 'automation/pod_auswahl.mjs', von: 'if (geprueft.hash !== plan.hash) {', zu: 'if (false) {', tests: ALLE },
  { name: 'LIVE zusammen mit OFFLINE wird nicht abgelehnt', datei: 'automation/pod_auswahl.mjs', von: 'if (LIVE && OFFLINE) throw', zu: 'if (false) throw', tests: ALLE },
  // ── Korrekturrunde 2 (27.10.2026): Tageslimit mitten im Produkt, Optionsreihenfolge, Beschreibung, Handle, Budget, Datenalter, Metafeld, API-Version
  { name: 'Alle Optionswerte VOR allen Varianten (alter Fehler: ausgegraute Werte bei Tageslimit)', datei: L('pod_auswahl_schreiben'), von: 'const gruppen = reihe.map((w) => ({ wert: w, varianten: offen.filter((n) => n.optionen[matName] === w) })).filter((g) => g.varianten.length);', zu: "const gruppen = offen.length ? [{ wert: 'alle', varianten: offen }] : [];", tests: ALLE },
  { name: 'Leerer Optionswert wird nach gescheitertem Aufruf nicht entfernt', datei: L('pod_auswahl_schreiben'), von: 'try { entfernt = await leereWerteEntfernen({ gql, log, handle: p.handle, materialOption: matName, planWerte, hinzu }); }', zu: 'try { entfernt = []; }', tests: ALLE },
  { name: 'Aufräumen löscht auch Optionswerte, die Varianten tragen', datei: L('pod_auswahl_schreiben'), von: 'if (ist.variants.some((v) => v.optionen[o.name] === ov.name)) continue;', zu: '', tests: ALLE },
  { name: 'Zustandstext nach dem Tageslimit nennt die Wiederaufnahme nicht', datei: L('pod_auswahl_schreiben'), von: 'Wiederaufnahme: denselben Befehl später wiederholen', zu: 'Danach ist Schluss', tests: ALLE },
  { name: 'Optionsreihenfolge wird nur geprüft, nicht hergestellt', datei: L('pod_auswahl_schreiben'), von: 'if (ok(ist)) return ist;', zu: 'return ist;', tests: ALLE },
  { name: 'Reihenfolge nach productOptionsReorder wird nicht mehr frisch geprüft', datei: L('pod_auswahl_schreiben'), von: 'if (!ok(neu)) throw new AbweichungFehler(', zu: 'if (false) throw new AbweichungFehler(', tests: ALLE },
  { name: 'Reihenfolge wird nur direkt nach dem Anlegen hergestellt, nicht bei der Wiederaufnahme', datei: L('pod_auswahl_schreiben'), von: "    log(`   Option «${matName}» angelegt, vorhandene Varianten = «${p.optionen.bestandsWert}»`);\n  }\n  // 3b. Optionsreihenfolge herstellen (auch bei Wiederaufnahme: eine halbe Vorrunde kann «Material» an falscher Stelle zurückgelassen haben)\n  ist = await stelleReihenfolgeHer({ gql, log, p, ist });", zu: "    log(`   Option «${matName}» angelegt, vorhandene Varianten = «${p.optionen.bestandsWert}»`);\n    ist = await stelleReihenfolgeHer({ gql, log, p, ist });\n  }", tests: ALLE },
  { name: 'Fremde Option im Shop wird nicht erkannt (Reorder rät)', datei: L('pod_auswahl_schreiben'), von: "if ([...optionsReihe(ist)].sort().join('|') !== [...soll].sort().join('|')) throw new AbweichungFehler(", zu: "if (false) throw new AbweichungFehler(", tests: ALLE },
  { name: 'Beschreibung: fremde Änderung VOR dem Lauf wird nicht bemerkt', datei: L('pod_auswahl_schreiben'), von: "if (beschreibungSeitPlanVeraendert(p, ist.descriptionHtml)) vorab.push(", zu: "if (false) vorab.push(", tests: ALLE },
  { name: 'Beschreibung: fremde Änderung WÄHREND des Laufs wird überschrieben', datei: L('pod_auswahl_schreiben'), von: "if (beschreibungSeitPlanVeraendert(p, aktuell.descriptionHtml)) throw new AbweichungFehler(", zu: "if (false) throw new AbweichungFehler(", tests: ALLE },
  { name: 'Beschreibungsvergleich zählt den eigenen Block als fremde Änderung mit', datei: L('pod_auswahl_schreiben'), von: "return nurText(ohneBlock(String(html ?? ''))) !== nurText(ohneBlock(String(p.beschreibung.vorher)));", zu: "return nurText(String(html ?? '')) !== nurText(ohneBlock(String(p.beschreibung.vorher)));", tests: ALLE },
  { name: 'Vorhandener Handle wird ohne Prüfung übernommen', datei: L('pod_auswahl_schreiben'), von: 'if (fremd.length) throw new AbweichungFehler(', zu: 'if (false) throw new AbweichungFehler(', tests: ALLE },
  { name: 'Vorhandenes Produkt: Status ACTIVE fällt nicht auf', datei: L('pod_auswahl_schreiben'), von: "if (schon.status !== 'DRAFT') a.push(", zu: 'if (false) a.push(', tests: ALLE },
  { name: 'Vorhandenes Produkt: fremde SKU fällt nicht auf', datei: L('pod_auswahl_schreiben'), von: 'for (const v of schon.variants) if (!erlaubt.has(v.sku)) a.push(', zu: 'for (const v of schon.variants) if (false) a.push(', tests: ALLE },
  { name: 'Vorhandenes Produkt: zusätzliche Tags fallen nicht auf', datei: L('pod_auswahl_schreiben'), von: 'if (tags !== soll) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'Budget-Vorprüfung fehlt', datei: L('pod_auswahl_schreiben'), von: 'if (budget !== null && p.neu.length > budget) {', zu: 'if (false) {', tests: ALLE },
  { name: 'Budget wird nach einem fertigen Produkt nicht abgezogen', datei: L('pod_auswahl_schreiben'), von: 'if (budget !== null) budget -= r.neu;', zu: '', tests: ALLE },
  { name: 'Das Werkzeug überschreibt das Material-Metafeld eines vorhandenen Produkts', datei: L('pod_auswahl_schreiben'), von: '  return { varianten: nach.variants.length, neu: offen.length };\n}', zu: "  await gql(M_META, { mf: [{ ownerId: ist.id, namespace: 'mm-google-shopping', key: 'material', type: 'single_line_text_field', value: 'X' }] });\n  return { varianten: nach.variants.length, neu: offen.length };\n}", tests: ALLE },
  { name: 'Plan-Hash zählt schon angelegte Varianten nicht mit (Wiederaufnahme ändert den Hash)', datei: L('pod_auswahl_plan'), von: 'neu: [...(p.schonDa || []), ...p.neu].map(', zu: 'neu: [...p.neu].map(', tests: ALLE },
  { name: 'Metafeld «Material» sperrt LIVE nicht mehr (nur Hinweis)', datei: L('pod_auswahl_plan'), von: "return [{ schwere: 'blocker', code: 'material-metafeld', wert: w,", zu: "return [{ schwere: 'hinweis', code: 'material-metafeld', wert: w,", tests: ALLE },
  { name: 'Leeres Metafeld «Material» zählt als Befund', datei: L('pod_auswahl_plan'), von: '  if (!w) return [];\n', zu: '', tests: ALLE },
  { name: 'Nicht gelesenes Metafeld «Material» wird stillschweigend durchgewinkt', datei: L('pod_auswahl_plan'), von: "if (wert === undefined) return [{ schwere: 'hinweis', code: 'material-metafeld-ungeprueft',", zu: "if (wert === undefined) return []; if (false) return [{ schwere: 'hinweis', code: 'material-metafeld-ungeprueft',", tests: ALLE },
  { name: 'Metafeld «Material» wird bei nur einem Material gemeldet', datei: L('pod_auswahl_plan'), von: 'if (materialWerte.length < 2) return [];', zu: '', tests: ALLE },
  { name: 'Samsung: Hartschale matt und glänzend wieder als zwei (byte-identische) Bilder', datei: L('pod_auswahl_spec'), von: "    bilder: [\n      { url: 'https://files.cdn.printful.com/products/686/21474_1737960312.jpg', alt: 'Samsung-Hülle Hartschale – blanko, selbst gestalten – LuxeStyle' },", zu: "    bilder: [\n      { url: 'https://files.cdn.printful.com/products/686/21474_1737960312.jpg', alt: 'Samsung-Hülle Hartschale matt – blanko, selbst gestalten – LuxeStyle' },\n      { url: 'https://files.cdn.printful.com/products/686/21473_1738068080.jpg', alt: 'Samsung-Hülle Hartschale glänzend – blanko, selbst gestalten – LuxeStyle' },", tests: ALLE },
  { name: 'Samsung: Material-Metafeld behauptet für alle vier Ausführungen Polyurethan (TPU)', datei: L('pod_auswahl_spec'), von: "value: 'Polycarbonat (PC), bei der Hartschale mit Innenfutter aus Polyurethan (TPU)' },", zu: "value: 'Polycarbonat, Polyurethan (TPU)' },", tests: ALLE },
  { name: 'API-Version fällt auf das nicht mehr unterstützte 2025-01 zurück', datei: L('pod_auswahl_gql'), von: "export const API_VERSION = '2026-01';", zu: "export const API_VERSION = '2025-01';", tests: ALLE },
  { name: 'Schreibabfrage nutzt wieder das veraltete productByHandle', datei: L('pod_auswahl_schreiben'), von: 'productByIdentifier(identifier:{handle:$h}){ id handle title status productType vendor tags descriptionHtml seo{ title description } category{ id }', zu: 'productByHandle(handle:$h){ id handle title status productType vendor tags descriptionHtml seo{ title description } category{ id }', tests: ALLE },
  { name: 'Bestandsabfrage nutzt wieder das veraltete productByHandle', datei: L('pod_auswahl_daten'), von: 'query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status productType vendor tags descriptionHtml seo{ title description }\n  materialMetafeld', zu: 'query($h:String!){ productByHandle(handle:$h){ id handle title status productType vendor tags descriptionHtml seo{ title description }\n  materialMetafeld', tests: ALLE },
  { name: 'Datenpaket: zu altes Alter wird nicht bemerkt', datei: L('pod_auswahl_daten'), von: 'else if (h > maxStunden) out.push(', zu: 'else if (false) out.push(', tests: ALLE },
  { name: 'Datenpaket: fehlender Stand gilt als frisch', datei: L('pod_auswahl_daten'), von: 'if (h === null) out.push(', zu: 'if (false) out.push(', tests: ALLE },
  { name: 'Datenpaket: Beschreibungen und SKU-Prüfung werden nicht auf ihr Alter geprüft', datei: L('pod_auswahl_daten'), von: "for (const k of ['katalog', 'beschreibungen', 'versand', 'skuPruefung']) {", zu: "for (const k of ['katalog', 'versand']) {", tests: ALLE },
  { name: 'LIVE verweigert alte Daten nicht (nur Warnung)', datei: 'automation/pod_auswahl.mjs', von: 'if (LIVE) throw new Error(`LIVE=1 verweigert: Printful-Daten zu alt', zu: 'if (false) throw new Error(`LIVE=1 verweigert: Printful-Daten zu alt', tests: ALLE },
  { name: 'Das Tor ruft die Gegenprüfung bei Printful nicht auf', datei: 'automation/pod_auswahl.mjs', von: 'const abw = await pruefeVarianten(plan);', zu: 'const abw = [];', tests: ALLE },
  { name: 'Das Tor lässt auch einen fremden Hash passieren', datei: 'automation/pod_auswahl.mjs', von: 'if (geprueft.hash !== plan.hash) { err(', zu: 'if (false) { err(', tests: ALLE },
  { name: 'Das Tor reicht das Variantenbudget nicht an den Schreibweg', datei: 'automation/pod_auswahl.mjs', von: 'ledgerPfad, sicherungsDir, befundOk, nur, variantenBudget, log });', zu: 'ledgerPfad, sicherungsDir, befundOk, nur, log });', tests: ALLE },
  { name: 'Gegenprüfung bei Printful ignoriert den Einkaufspreis', datei: L('pod_auswahl_daten'), von: 'if (!(Math.abs(Number(pv.price) - Number(v.einkaufUsd)) <= 0.005)) abw.push(', zu: 'if (false) abw.push(', tests: ALLE },
  { name: 'Gegenprüfung bei Printful ignoriert das EU-Lager', datei: L('pod_auswahl_daten'), von: "if (eu === undefined ? pv.in_stock !== true : eu !== 'in_stock') abw.push(", zu: 'if (false) abw.push(', tests: ALLE },
  { name: 'Gegenprüfung bei Printful: nicht lesbare Variante gilt als in Ordnung', datei: L('pod_auswahl_daten'), von: "if (status !== 200 || !pv) { abw.push(`Printful ${v.pf} (${v.sku}): nicht lesbar (HTTP ${status})`); continue; }", zu: 'if (status !== 200 || !pv) { continue; }', tests: ALLE },
  { name: 'DATEN=holen übernimmt alte Versandraten (der Stand «heute» wäre gelogen)', datei: 'automation/pod_auswahl.mjs', von: "const datei = { stand: heute, ziel: ziel || 'CH 8001 (Printful /shipping/rates, STANDARD, 1 Stück, USD)', raten: {} };", zu: "const datei = existsSync(vp) ? JSON.parse(readFileSync(vp, 'utf8')) : { stand: heute, ziel: 'CH', raten: {} }; datei.stand = heute;", tests: ALLE },
  // ── Korrekturrunde 3 (28.10.2026): A Optionswert-Anlage und Zurücklesen in der Fehlerbehandlung, B Aufräumen zustandsbasiert, C ehrlicher Zustandstext, D Lesegrenze, E Prüfer-Funde
  { name: 'A: Aufräumen läuft nur nach Fehlern der Variantenanlage (Optionswert-Anlage und Zurücklesen wieder ungeschützt)', datei: L('pod_auswahl_schreiben'), von: '  } catch (e) {\n    const nach = await nachAbbruch(', zu: '  } catch (e) {\n    if (!/Varianten anlegen/.test(String(e.message))) throw e;\n    const nach = await nachAbbruch(', tests: ALLE },
  { name: 'A: Aufräumen läuft nur nach einem Tageslimit, nicht nach gewöhnlichen Fehlern', datei: L('pod_auswahl_schreiben'), von: '  } catch (e) {\n    const nach = await nachAbbruch(', zu: '  } catch (e) {\n    if (!(e instanceof TageslimitFehler)) throw e;\n    const nach = await nachAbbruch(', tests: ALLE },
  { name: 'A: ergänzte Optionswerte werden erst NACH dem Senden notiert (eine verlorene Antwort entzieht sie dem Aufräumen)', datei: L('pod_auswahl_schreiben'),
    von: "        for (const w of fehlt) hinzu.push({ optionName: o.name, wert: w });\n        ergaenzt = true;\n        pruefeAntwort(await gql(M_OPTION_WERTE, { pid: ist.id, opt: { id: io.id }, add: fehlt.map((w) => ({ name: w })) }), `${p.handle}: Optionswerte «${o.name}»`, 'productOptionUpdate');",
    zu: "        ergaenzt = true;\n        pruefeAntwort(await gql(M_OPTION_WERTE, { pid: ist.id, opt: { id: io.id }, add: fehlt.map((w) => ({ name: w })) }), `${p.handle}: Optionswerte «${o.name}»`, 'productOptionUpdate');\n        for (const w of fehlt) hinzu.push({ optionName: o.name, wert: w });", tests: ALLE },
  { name: 'B: Aufräumen kennt bei «Material» nur die in diesem Aufruf ergänzten Werte (die Wiederaufnahme repariert nichts)', datei: L('pod_auswahl_schreiben'), von: 'if (o.name === materialOption) (planWerte.includes(ov.name) ? eigene : fremde).push(e);', zu: 'if (false) (planWerte.includes(ov.name) ? eigene : fremde).push(e);', tests: ALLE },
  { name: 'B: Aufräumen entfernt auch fremde leere Material-Werte, die der Plan nicht kennt', datei: L('pod_auswahl_schreiben'), von: '(planWerte.includes(ov.name) ? eigene : fremde).push(e);', zu: 'eigene.push(e);', tests: ALLE },
  { name: 'B: Aufräumen entfernt auch leere Werte fremder Optionen, die dieser Aufruf nicht ergänzt hat', datei: L('pod_auswahl_schreiben'), von: 'else if (hinzu.some((h) => h.optionName === o.name && h.wert === ov.name)) eigene.push(e);', zu: 'else eigene.push(e);', tests: ALLE },
  { name: 'B: Aufräumen ignoriert die in diesem Aufruf ergänzten Werte anderer Optionen (Grösse, Modell)', datei: L('pod_auswahl_schreiben'), von: 'else if (hinzu.some((h) => h.optionName === o.name && h.wert === ov.name)) eigene.push(e);', zu: 'else if (false) eigene.push(e);', tests: ALLE },
  { name: 'C: der Zustandstext verschweigt ein Material mit nur Teil seiner Grössen', datei: L('pod_auswahl_schreiben'), von: 'if (stand.teilweise.length) t.push(', zu: 'if (false) t.push(', tests: ALLE },
  { name: 'C: der Zustandstext meldet einen stehengebliebenen leeren Wert nicht als ACHTUNG', datei: L('pod_auswahl_schreiben'), von: 'for (const e of uebrig) t.push(', zu: 'for (const e of []) t.push(', tests: ALLE },
  { name: 'C: der Zustandstext nennt einen fremden leeren Wert nicht', datei: L('pod_auswahl_schreiben'), von: 'for (const e of fremde) t.push(', zu: 'for (const e of []) t.push(', tests: ALLE },
  { name: 'C: der Zustand nach dem Abbruch wird nicht frisch gelesen', datei: L('pod_auswahl_schreiben'), von: 'try { ist = await leseFrisch(gql, p.handle); } catch (e3) {', zu: 'try { ist = null; } catch (e3) {', tests: ALLE },
  { name: 'C: der Zustandstext nennt die Altersgrenze der Daten bei der Wiederaufnahme nicht', datei: L('pod_auswahl_schreiben'), von: '; die Daten dürfen höchstens ${DATEN_MAX_ALTER_H} Stunden alt sein, sonst zuerst DATEN=holen)', zu: ')', tests: ALLE },
  { name: 'C: Exit 4 sagt wieder «nicht wiederholen, morgen neu planen»', datei: L('pod_auswahl_schreiben'), von: '`TAGESLIMIT für neue Varianten erreicht: nicht sofort wiederholen, später denselben Befehl (der', zu: '`TAGESLIMIT für neue Varianten erreicht (nicht wiederholen, morgen neu planen) (der', tests: ALLE },
  { name: 'C: Exit 4 nennt die Altersgrenze der Daten nicht', datei: L('pod_auswahl_schreiben'), von: 'solange die Daten höchstens ${DATEN_MAX_ALTER_H} Stunden alt sind; sonst zuerst DATEN=holen)`,', zu: 'ohne Einschränkung)`,', tests: ALLE },
  { name: 'C: Kopf von pod_auswahl.mjs sagt wieder «Tageslimit (nicht wiederholen)»', datei: 'automation/pod_auswahl.mjs', von: '4 Tageslimit für neue Varianten (später denselben Befehl wiederholen)', zu: '4 Tageslimit für neue Varianten (nicht wiederholen)', tests: ALLE },
  { name: 'C: Kopf von pod_auswahl_schreiben.mjs sagt wieder «Tageslimit (nicht wiederholen)»', datei: L('pod_auswahl_schreiben'), von: '4 Tageslimit für neue Varianten erreicht (später denselben Befehl wiederholen)', zu: '4 Tageslimit für neue Varianten erreicht (nicht wiederholen)', tests: ALLE },
  { name: 'C: README verspricht wieder «höchstens EIN Wert ohne Variante»', datei: 'dropship/pod-auswahl/README.md', von: '**Was nicht zugesagt wird:**', zu: 'Es steht höchstens EIN Wert ohne Variante im Shop. **Was nicht zugesagt wird:**', tests: ALLE },
  { name: 'C: README verschweigt, dass ein Material mit nur Teil seiner Grössen bleibt', datei: 'dropship/pod-auswahl/README.md', von: '**bleibt bestehen**: Varianten werden nie gelöscht. Die Ausgabe nennt es «TEILWEISE angelegt: Leinwand (50 von 60 Grössen)»', zu: 'wird entfernt. Die Ausgabe nennt es «unvollständig»', tests: ALLE },
  { name: 'E: README sagt nichts mehr zur fehlenden Wiederaufnahme der Samsung-Hülle', datei: 'dropship/pod-auswahl/README.md', von: '- **Samsung ohne Wiederaufnahme für fehlende Varianten.**', zu: '- Samsung:', tests: ALLE },
  { name: 'E: README nennt die Altersgrenze der Wiederaufnahme nicht', datei: 'dropship/pod-auswahl/README.md', von: ', **solange die Daten höchstens 72 Stunden alt sind**: sonst verweigert LIVE', zu: ': sonst verweigert LIVE', tests: ALLE },
  { name: 'E: README-Tabelle sagt bei Exit 4 wieder nur «derselbe Befehl später» ohne die Altersgrenze der Daten', datei: 'dropship/pod-auswahl/README.md', von: '**nicht sofort wiederholen, später derselbe Befehl setzt den Lauf fort**, der Plan-Hash bleibt gleich, solange die Daten höchstens 72 Stunden alt sind;', zu: '**derselbe Befehl später wiederholt den Lauf**, der Plan-Hash bleibt gleich;', tests: ALLE },
  { name: 'D: leseFrisch erkennt genau 250 gelesene Varianten nicht', datei: L('pod_auswahl_schreiben'), von: 'if (n >= LESEGRENZE_VARIANTEN || weitere) throw', zu: 'if (n > LESEGRENZE_VARIANTEN || weitere) throw', tests: ALLE },
  { name: 'D: leseFrisch ignoriert pageInfo.hasNextPage', datei: L('pod_auswahl_schreiben'), von: 'if (n >= LESEGRENZE_VARIANTEN || weitere) throw', zu: 'if (n >= LESEGRENZE_VARIANTEN) throw', tests: ALLE },
  { name: 'D: leseFrisch liest 250 Varianten und rechnet weiter (keine Lesegrenze)', datei: L('pod_auswahl_schreiben'), von: 'if (n >= LESEGRENZE_VARIANTEN || weitere) throw', zu: 'if (false) throw', tests: ALLE },
  { name: 'D: die Abfrage fragt die weitere Seite nicht ab', datei: L('pod_auswahl_schreiben'), von: ' pageInfo{ hasNextPage } }\n  media(first:50)', zu: ' }\n  media(first:50)', tests: ALLE },
  { name: 'E: Datenstand in der Zukunft gilt als frisch', datei: L('pod_auswahl_daten'), von: 'else if (h < -ZUKUNFT_TOLERANZ_H) out.push(', zu: 'else if (false) out.push(', tests: ALLE },
  { name: 'E: Toleranz für Stände in der Zukunft ist 30 Tage statt 1 Stunde', datei: L('pod_auswahl_daten'), von: 'export const ZUKUNFT_TOLERANZ_H = 1;', zu: 'export const ZUKUNFT_TOLERANZ_H = 720;', tests: ALLE },
  { name: 'E: das Format des Datenstands wird nicht geprüft (Date.parse nähme «2026-10» an)', datei: L('pod_auswahl_daten'), von: "if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(stand ?? ''))) return null;", zu: '', tests: ALLE },
  { name: 'E: die Vorab-Prüfung prüft eine vorhandene Option «Material» nicht (Szenario S6)', datei: L('pod_auswahl_schreiben'), von: '  vorab.push(...materialOptionAbweichungen({ matName,', zu: '  if (false) vorab.push(...materialOptionAbweichungen({ matName,', tests: ALLE },
  { name: 'E: Option «Material»: Fremdwerte werden nicht gemeldet', datei: L('pod_auswahl_plan'), von: 'if (fremd.length) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'E: Option «Material»: abweichendes Material der vorhandenen Varianten wird nicht gemeldet', datei: L('pod_auswahl_plan'), von: 'const w = materialVon(b.sku); if (w !== undefined && w !== bestandsWert)', zu: 'const w = materialVon(b.sku); if (false)', tests: ALLE },
  { name: 'E: Option «Material»: abweichendes Material der schon angelegten Varianten wird nicht gemeldet', datei: L('pod_auswahl_plan'), von: 'if (w !== undefined && w !== s.optionen[matName])', zu: 'if (false)', tests: ALLE },
  { name: 'E: der Plan meldet die vorhandene Option «Material» nicht als Verstoss (nicht schon im Trockenlauf)', datei: L('pod_auswahl_plan'), von: 'for (const a of p.optionPruefung || []) v.push(', zu: 'for (const a of []) v.push(', tests: ALLE },
  { name: 'E: der Plan prüft die Werte der vorhandenen Option «Material» nicht', datei: L('pod_auswahl_plan'), von: 'optionWerte: hatMaterial ? vorher.find((o) => o.name === matName).werte : null,', zu: 'optionWerte: null,', tests: ALLE },
  { name: 'E: das Variantenbudget zieht bei einem Produkt, das mit einem gewöhnlichen Fehler endet, nichts ab', datei: L('pod_auswahl_schreiben'), von: 'if (budget !== null) budget -= verbrauch.varianten;', zu: '', tests: ALLE },
  { name: 'E: das Variantenbudget zählt nur bestätigte Antworten, nicht den frisch gelesenen Zustand', datei: L('pod_auswahl_schreiben'), von: 'if (nach.neuAngelegt !== null) verbrauch.varianten = Math.max(verbrauch.varianten, nach.neuAngelegt);', zu: '', tests: ALLE },
  { name: 'E: das Ergebnis FEHLER trägt den Zustandstext nicht', datei: L('pod_auswahl_schreiben'), von: "status: 'FEHLER', fehler: e.message, ...zustand }", zu: "status: 'FEHLER', fehler: e.message }", tests: ALLE },
  { name: 'E: vorhandener Handle: abweichender Titel fällt nicht auf', datei: L('pod_auswahl_schreiben'), von: 'if (schon.title !== np.titel) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'E: vorhandener Handle: abweichender Verkäufer fällt nicht auf', datei: L('pod_auswahl_schreiben'), von: 'if (schon.vendor !== np.vendor) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'E: vorhandener Handle: abweichende Produktart fällt nicht auf', datei: L('pod_auswahl_schreiben'), von: 'if (schon.productType !== np.produktart) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'E: vorhandener Handle: abweichende Optionsnamen fallen nicht auf', datei: L('pod_auswahl_schreiben'), von: 'if (namen !== sollNamen) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'E: Wächter-Tor «unbekannt»: neue Variante mit Material ausserhalb des Plans wird nicht abgelehnt', datei: L('pod_auswahl_schreiben'), von: 'if (unbekannt.length) throw new AbweichungFehler(', zu: 'if (false) throw new AbweichungFehler(', tests: ALLE },
  { name: 'E: Optionsreihenfolge: die Positionen 1..n werden nicht geprüft (nur die Reihenfolge der Namen)', datei: L('pod_auswahl_schreiben'), von: ' && x.options.every((o) => o.position === soll.indexOf(o.name) + 1);', zu: ';', tests: ALLE },
  // ── Korrekturrunde 4 (28.10.2026): Optionen werden über optionValues { id name hasVariants } gelesen, nie über ProductOption.values (ein Wert ohne Variante fehlt dort)
  { name: 'R4 Lesen: OPTIONEN_FELDER fragt nur ProductOption.values (Werte ohne Variante unsichtbar)', datei: L('pod_auswahl_daten'), von: "export const OPTIONEN_FELDER = 'options{ id name position optionValues{ id name hasVariants } }';", zu: "export const OPTIONEN_FELDER = 'options{ id name position values }';", tests: ALLE },
  { name: 'R4 Lesen: OPTIONEN_FELDER ohne hasVariants (ein leerer Wert ist nicht erkennbar)', datei: L('pod_auswahl_daten'), von: "'options{ id name position optionValues{ id name hasVariants } }'", zu: "'options{ id name position optionValues{ id name } }'", tests: ALLE },
  { name: 'R4 Lesen: OPTIONEN_FELDER ohne die ID der Optionswerte (Löschen über die Wert-ID unmöglich)', datei: L('pod_auswahl_daten'), von: "'options{ id name position optionValues{ id name hasVariants } }'", zu: "'options{ id name position optionValues{ name hasVariants } }'", tests: ALLE },
  { name: 'R4 Lesen: Q_PRODUKT (frisches Lesen) fragt wieder nur values', datei: L('pod_auswahl_schreiben'), von: '  ${OPTIONEN_FELDER}\n  variants(first:250){ edges{ node{ id sku price compareAtPrice', zu: '  options{ id name position values }\n  variants(first:250){ edges{ node{ id sku price compareAtPrice', tests: ALLE },
  { name: 'R4 Lesen: BESTAND_Q (Datenpaket) fragt wieder nur values', datei: L('pod_auswahl_daten'), von: '  ${OPTIONEN_FELDER}\n  variants(first:250){ edges{ node{ id sku price inventoryPolicy', zu: '  options{ id name position values }\n  variants(first:250){ edges{ node{ id sku price inventoryPolicy', tests: ALLE },
  { name: 'R4 Lesen: die Antwort von productOptionsReorder fragt wieder values', datei: L('pod_auswahl_schreiben'), von: 'productOptionsReorder(productId:$pid, options:$opts){ product{ id ${OPTIONEN_FELDER} }', zu: 'productOptionsReorder(productId:$pid, options:$opts){ product{ id options{ name position values } }', tests: ALLE },
  { name: 'R4 Lesen: die Antwort des Löschens von Optionswerten fragt wieder values', datei: L('pod_auswahl_schreiben'), von: 'optionValuesToDelete:$del){ product{ id ${OPTIONEN_FELDER} }', zu: 'optionValuesToDelete:$del){ product{ id options{ name position values } }', tests: ALLE },
  { name: 'R4 Lesen: ein Shopify-`values` in der Antwort hat Vorrang vor den Namen aus optionValues', datei: L('pod_auswahl_daten'), von: 'position: o.position, values: optionValues.map((v) => v.name), optionValues };', zu: 'position: o.position, values: o.values || optionValues.map((v) => v.name), optionValues };', tests: ALLE },
  { name: 'R4 Lesen: als vorhanden zählen nur Werte mit Variante (der ursprüngliche Fehler)', datei: L('pod_auswahl_daten'), von: 'position: o.position, values: optionValues.map((v) => v.name), optionValues };', zu: 'position: o.position, values: optionValues.filter((v) => v.hasVariants).map((v) => v.name), optionValues };', tests: ALLE },
  { name: 'R4 Lesen: eine Antwort ohne optionValues wird nicht abgelehnt', datei: L('pod_auswahl_daten'), von: 'if (!Array.isArray(o.optionValues)) throw new Error(', zu: 'if (false) throw new Error(', tests: ALLE },
  { name: 'R4 Lesen: frisch gelesene Optionen werden nicht normalisiert (rohe Antwort)', datei: L('pod_auswahl_schreiben'), von: 'options: optionenAusAntwort(p.options, `Abfrage ${p.handle}`),', zu: 'options: p.options,', tests: ALLE },
  { name: 'R4 Existenz: ein Optionswert ohne Variante zählt als nicht vorhanden (Wiederaufnahme legt ihn neu an)', datei: L('pod_auswahl_schreiben'), von: 'filter((w) => !io.optionValues.some((x) => x.name === w));', zu: 'filter((w) => !io.optionValues.some((x) => x.name === w && x.hasVariants));', tests: ALLE },
  { name: 'R4 Existenz: jeder Optionswert wird angelegt, auch ein schon vorhandener', datei: L('pod_auswahl_schreiben'), von: 'filter((w) => !io.optionValues.some((x) => x.name === w));', zu: 'filter((w) => true);', tests: ALLE },
  { name: 'R4 leer: hasVariants wird ignoriert (nur die gelesenen Varianten entscheiden)', datei: L('pod_auswahl_schreiben'), von: 'if (ov.hasVariants !== false) continue;', zu: '', tests: ALLE },
  { name: 'R4 leer: ein Wert ohne Angabe zu hasVariants gilt als leer (unbekannt wird angefasst)', datei: L('pod_auswahl_schreiben'), von: 'if (ov.hasVariants !== false) continue;', zu: 'if (ov.hasVariants) continue;', tests: ALLE },
  { name: 'R4 Löschen: mit dem Namen des Werts statt seiner ID aus optionValues', datei: L('pod_auswahl_schreiben'), von: 'opt: { id: optionId }, del: g.ids })', zu: 'opt: { id: optionId }, del: g.namen })', tests: ALLE },
  { name: 'R4 Vorab: ein leerer Fremdwert der Option «Material» («Holz») wird nicht gesehen', datei: L('pod_auswahl_schreiben'), von: 'optionWerte: ist.options.find((o) => o.name === matName)?.values ?? null,', zu: 'optionWerte: ist.options.find((o) => o.name === matName)?.optionValues.filter((v) => v.hasVariants).map((v) => v.name) ?? null,', tests: ALLE },
  { name: 'R4 Verdrahtung: die Vorab-Prüfung der Option «Material» bekommt die schon angelegten Varianten nicht', datei: L('pod_auswahl_schreiben'), von: 'bestehende: p.bestehende, schonDa: p.schonDa, materialVon:', zu: 'bestehende: p.bestehende, schonDa: [], materialVon:', tests: ALLE },
  { name: 'R4 Verdrahtung: die Prüfung der Option «Material» im Plan bekommt die schon angelegten Varianten nicht', datei: L('pod_auswahl_plan'), von: 'werte : null, bestehende, schonDa,', zu: 'werte : null, bestehende, schonDa: [],', tests: ALLE },
  { name: 'R4 Zustandstext: das Ergebnis ABWEICHUNG trägt den Zustandstext nicht', datei: L('pod_auswahl_schreiben'), von: 'liste: e.liste, ...zustand }', zu: 'liste: e.liste }', tests: ALLE },
  { name: 'R4 Zustandstext: die Ausgabe zu ABWEICHUNG nennt den Zustandstext nicht', datei: L('pod_auswahl_schreiben'), von: "for (const x of e.liste.slice(0, 20)) log('   · ' + x); if (e.zustand) log(`   ${e.zustand}`);", zu: "for (const x of e.liste.slice(0, 20)) log('   · ' + x);", tests: ALLE },
  { name: 'R4 Budget: die Zählung nach jedem Stück fehlt (Lesen scheitert nach Stück 1: nichts wird abgezogen)', datei: L('pod_auswahl_schreiben'), von: 'angelegt += stueck.length; verbrauch.varianten = angelegt;', zu: 'angelegt += stueck.length;', tests: ALLE },
  { name: 'R4 Budget: der frisch gelesene Stand überschreibt die bestätigte Zählung statt das Grössere zu nehmen', datei: L('pod_auswahl_schreiben'), von: 'verbrauch.varianten = Math.max(verbrauch.varianten, nach.neuAngelegt);', zu: 'verbrauch.varianten = nach.neuAngelegt;', tests: ALLE },
  { name: 'R4 README: die Wiederaufnahme legt einen leeren Wert wieder neu an (statt ihn zu sehen und zu füllen)', datei: 'dropship/pod-auswahl/README.md', von: '**sieht** ihn (Existenz über `optionValues`)', zu: 'legt ihn neu an', tests: ALLE },
  // ── Korrekturrunde 5 (28.10.2026): Abschlussvergleich der Optionswerte und der Position, Vorab-Prüfung für ALLE Optionen, kein Fehlercode als Tatsache, Wegwerf-Probe
  { name: 'R5 Abschlussvergleich: als vorhanden zählen nur Werte mit Variante (Rückfall auf die alte Semantik, ein leerer Wert bleibt unbemerkt)', datei: L('pod_auswahl_schreiben'), von: "if ([...io.values].sort().join('|') !== [...o.werte].sort().join('|')) a.push(", zu: "if ([...io.optionValues.filter((v) => v.hasVariants).map((v) => v.name)].sort().join('|') !== [...o.werte].sort().join('|')) a.push(", tests: ALLE },
  { name: 'R5 Abschlussvergleich: die Optionswerte werden nicht verglichen', datei: L('pod_auswahl_schreiben'), von: "if ([...io.values].sort().join('|') !== [...o.werte].sort().join('|')) a.push(", zu: 'if (false) a.push(', tests: ALLE },
  { name: 'R5 Abschlussvergleich: die Position der Option wird nicht verglichen', datei: L('pod_auswahl_schreiben'), von: 'if (io.position !== o.position) a.push(', zu: 'if (false) a.push(', tests: ALLE },
  { name: 'R5 Vorab: die Werte der übrigen Optionen (Grösse, Handymodell) werden nicht geprüft (Verallgemeinerung zurückgenommen, nur «Material»)', datei: L('pod_auswahl_schreiben'), von: '  vorab.push(...fremdeOptionswerte(p, ist));\n', zu: '', tests: ALLE },
  { name: 'R5 Vorab: geprüft wird nur die Option «Grösse», nicht jede Option (Handymodell bleibt ungeprüft)', datei: L('pod_auswahl_schreiben'), von: 'if (o.name === ausser) continue;', zu: "if (o.name !== 'Grösse') continue;", tests: ALLE },
  { name: 'R5 Vorab: auch «Material» wird in fremdeOptionswerte geprüft (jeder Fremdwert doppelt gemeldet)', datei: L('pod_auswahl_schreiben'), von: 'if (o.name === ausser) continue;', zu: '', tests: ALLE },
  { name: 'R5 Vorab: nur LEERE Fremdwerte zählen (ein Wert mit fremder Variante wird durchgewinkt)', datei: L('pod_auswahl_schreiben'), von: 'const fremd = io.values.filter((w) => !o.werte.includes(w));', zu: 'const fremd = io.optionValues.filter((v) => v.hasVariants === false && !o.werte.includes(v.name)).map((v) => v.name);', tests: ALLE },
  { name: 'R5 Vorab-Meldung: der Hinweis fehlt ganz (kein DATEN=holen, kein neuer Trockenlauf)', datei: L('pod_auswahl_schreiben'), von: 'seit dem Plan verändert. ${NEUER_PLAN_HINWEIS}', zu: 'seit dem Plan verändert', tests: ALLE },
  { name: 'R5 Vorab-Meldung: der Hinweis verweist nicht mehr auf DATEN=holen', datei: L('pod_auswahl_schreiben'), von: 'Zuerst DATEN=holen (Datenpaket auffrischen), dann einen neuen Trockenlauf machen und ansehen;', zu: 'Zuerst den Shop prüfen, dann einen neuen Trockenlauf machen und ansehen;', tests: ALLE },
  { name: 'R5 Vorab-Meldung: der Hinweis verweist nicht mehr auf einen neuen Trockenlauf', datei: L('pod_auswahl_schreiben'), von: 'dann einen neuen Trockenlauf machen und ansehen; LIVE erst mit dem neuen, geprüften Plan wiederholen.', zu: 'dann LIVE wiederholen.', tests: ALLE },
  { name: 'R5 Vorab-Meldung: der Hinweis sagt nicht, dass nichts geschrieben wurde', datei: L('pod_auswahl_schreiben'), von: "'Nichts geschrieben. Zuerst DATEN=holen", zu: "'Zuerst DATEN=holen", tests: ALLE },
  { name: 'R5 Fehlercodes: pruefeAntwort überhört einen userError mit dem Code OPTION_VALUE_ALREADY_EXISTS (Verlass auf einen nicht gemessenen Code)', datei: L('pod_auswahl_schreiben'), von: 'const ue = j?.data?.[pfad]?.userErrors || [];', zu: "const ue = (j?.data?.[pfad]?.userErrors || []).filter((x) => x.code !== 'OPTION_VALUE_ALREADY_EXISTS');", tests: ALLE },
  { name: 'R5 Kopf von pod_auswahl_schreiben.mjs nennt OPTION_VALUE_ALREADY_EXISTS wieder als Tatsache (Exit 1)', datei: L('pod_auswahl_schreiben'), von: 'sie legte ihn neu an und bekäme für den schon vorhandenen Namen einen userError (Exit 1).', zu: 'sie legte ihn neu an: OPTION_VALUE_ALREADY_EXISTS, Exit 1).', tests: ALLE },
  { name: 'R5 README: der gemessene Fehlercode steht ohne Marke GEMESSEN da (wieder eine Behauptung)', datei: 'dropship/pod-auswahl/README.md', von: 'ist **GEMESSEN (28.10.2026, 19:13 UTC, Admin-API 2026-01)**: `OPTION_VALUE_ALREADY_EXISTS`, Meldung', zu: 'ist `OPTION_VALUE_ALREADY_EXISTS`, Meldung', tests: ALLE },
  { name: 'R5 README: der Fehlercode wird wieder als «NICHT gemessen» gekennzeichnet (die Probe vom 28.10.2026 wird ignoriert)', datei: 'dropship/pod-auswahl/README.md', von: 'Welchen Fehlercode Shopify dabei nennt, ist **GEMESSEN (28.10.2026, 19:13 UTC, Admin-API 2026-01)**', zu: 'Welchen Fehlercode Shopify dabei nennt, ist **NICHT gemessen**', tests: ALLE },
  { name: 'R5 README Schritt 1: verschweigt die Vorab-Prüfung der Werte aller Optionen', datei: 'dropship/pod-auswahl/README.md', von: 'Dazu die Werte **aller** Optionen (nicht nur «Material»):', zu: 'Dazu die Werte der Option «Material»:', tests: ALLE },
  { name: 'R5 README: oben steht die Wegwerf-Probe wieder als nicht ausgeführt da', datei: 'dropship/pod-auswahl/README.md', von: 'wurde am **28.10.2026 ausgeführt** und hat die vier Verhaltensannahmen', zu: 'ist noch nicht ausgeführt und soll die vier Verhaltensannahmen', tests: ALLE },
  { name: 'R5 README Wegwerf-Probe: Schritt G (Löschen des Wegwerf-Produkts per productDelete) fehlt', datei: 'dropship/pod-auswahl/README.md', von: '- **G** Aufräumen: `productDelete(input: { id: <Produkt-ID> })`.', zu: '- **G** Aufräumen: von Hand.', tests: ALLE },
  { name: 'R5 README Wegwerf-Probe: Schritt F2 (Löschen eines Werts MIT Variante) fehlt', datei: 'dropship/pod-auswahl/README.md', von: '**F2** (zusätzlich, nur an diesem Wegwerf-Produkt)', zu: '(zusätzlich, nur an diesem Wegwerf-Produkt)', tests: ALLE },
  { name: 'R5 README Wegwerf-Probe: verschweigt, dass die Probe 3 Varianten braucht und am Tageslimit scheitert', datei: 'dropship/pod-auswahl/README.md', von: 'Die Probe brauchte 3 Varianten (A, D und E je eine) und **scheitert bei erreichtem Limit** schon in Schritt A (dann ist nichts angelegt)', zu: 'Die Probe braucht nur wenige Varianten', tests: ALLE },
  // ── Runde 5b (Prüfer der Runde 5): Optionsnamen vorab, Vergleich nach Inhalt
  { name: 'R5b Abschlussvergleich: die Optionswerte werden nur nach ANZAHL verglichen (ein Tausch Planwert ↔ Fremdwert bleibt unbemerkt)', datei: L('pod_auswahl_schreiben'), von: "if ([...io.values].sort().join('|') !== [...o.werte].sort().join('|')) a.push(", zu: 'if (io.values.length !== o.werte.length) a.push(', tests: ALLE },
  { name: 'R5b Vorab: abweichendeOptionen wird in erweitern nicht aufgerufen (eine unbekannte Option meldet erst stelleReihenfolgeHer, nach Sicherung und productOptionsCreate)', datei: L('pod_auswahl_schreiben'), von: '  vorab.push(...abweichendeOptionen(p, ist));\n', zu: '', tests: ALLE },
  { name: 'R5b abweichendeOptionen: nur eine ZUSÄTZLICHE Option zählt, eine fehlende Plan-Option nicht', datei: L('pod_auswahl_schreiben'), von: "return plan.join('|') === shop.join('|') ? [] :", zu: 'return shop.every((n) => plan.includes(n)) ? [] :', tests: ALLE },
  { name: 'R5b abweichendeOptionen: «Material» wird nicht ausgenommen (jeder erste Lauf meldet fälschlich eine Abweichung)', datei: L('pod_auswahl_schreiben'), von: 'const ohne = (namen) => namen.filter((n) => n !== ausser).sort();', zu: 'const ohne = (namen) => [...namen].sort();', tests: ALLE },
  // ── Daten
  { name: 'Versand: nicht STANDARD, sondern die erste Rate', datei: L('pod_auswahl_daten'), von: "liste.find((x) => x.id === 'STANDARD') ||", zu: 'liste[0] ||', tests: ALLE },
  { name: 'EU-Lager des Katalogs wird immer als lieferbar gespeichert', datei: L('pod_auswahl_daten'), von: 'eu: (v.avail && v.avail.EU) ?? null', zu: "eu: 'in_stock'", tests: ALLE },
];

function zaehle(text, teil) { let n = 0, i = -1; while ((i = text.indexOf(teil, i + 1)) >= 0) n++; return n; }
/** Führt die Testdateien aus und gibt die roten zurück. `stopp`: beim ersten roten aufhören (für Mutanten genügt EIN roter Test; die schnellen Dateien stehen vorn, so bleibt die Probe in der CI kurz). */
function testen(wurzel, tests, stopp = false) {
  const fehler = [];
  for (const t of tests) {
    const r = spawnSync(process.execPath, [join(wurzel, 'automation', t)], { cwd: wurzel, encoding: 'utf8', timeout: 120000, env: { PATH: process.env.PATH, HOME: process.env.HOME } });
    if (r.status !== 0) { fehler.push(t.replace(/^lib\//, '')); if (stopp) break; }
  }
  return fehler;
}

export function mutationsprobe({ log = console.log, nur = null } = {}) {
  const wurzel = mkdtempSync(join(tmpdir(), 'pod-mutation-'));
  try {
    for (const d of DATEIEN) { mkdirSync(dirname(join(wurzel, d)), { recursive: true }); copyFileSync(join(REPO, d), join(wurzel, d)); }
    const kontrolle = testen(wurzel, ALLE);
    if (kontrolle.length) { log(`✗ Kontrolllauf ohne Mutation ist schon rot: ${kontrolle.join(', ')}`); return { exit: 2, ueberlebt: [], erkannt: 0 }; }
    log(`Kontrolllauf ohne Mutation: alle ${ALLE.length} Testdateien grün.\n`);
    let erkannt = 0; const ueberlebt = [];
    for (const m of MUTANTEN) {
      if (nur && !m.name.toLowerCase().includes(nur.toLowerCase())) continue;
      const pfad = join(wurzel, m.datei), original = readFileSync(pfad, 'utf8');
      const n = zaehle(original, m.von);
      if (n === 0 || (n > 1 && !m.alle)) { log(`✗ Mutation nicht anwendbar (${n}× gefunden): ${m.name}`); return { exit: 2, ueberlebt, erkannt }; }
      writeFileSync(pfad, original.split(m.von).join(m.zu));
      const rot = testen(wurzel, m.tests, true);
      writeFileSync(pfad, original);                                    // zurücksetzen
      if (rot.length) { erkannt++; log(`✓ erkannt  ${m.name.padEnd(78)} ← ${rot.join(', ')}`); } else { ueberlebt.push(m.name); log(`✗ ÜBERLEBT ${m.name}`); }
    }
    log(`\n${erkannt} von ${erkannt + ueberlebt.length} Mutanten erkannt.${ueberlebt.length ? ' ÜBERLEBT: ' + ueberlebt.join('; ') : ''}`);
    return { exit: ueberlebt.length ? 1 : 0, ueberlebt, erkannt };
  } finally { rmSync(wurzel, { recursive: true, force: true }); }
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(mutationsprobe({ nur: process.env.NUR || null }).exit);
