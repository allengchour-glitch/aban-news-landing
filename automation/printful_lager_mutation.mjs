#!/usr/bin/env node
// Mutationsprobe des Printful-Lager-Wächters: baut absichtliche Fehler in die Quellen ein und verlangt, dass mindestens ein Test ROT wird.
// Ein Test, der einen eingebauten Fehler nicht bemerkt, schützt nichts. Gearbeitet wird in einer KOPIE im Temp-Ordner, das Repo bleibt unberührt.
// Lauf: /opt/node22/bin/node automation/printful_lager_mutation.mjs      (Exit 0 = alle Mutanten erkannt, 1 = mindestens einer überlebt, 2 = Ausgangslage nicht grün oder Muster nicht anwendbar)
// Jeder Mutant nennt `von` (muss genau einmal vorkommen) und `zu`. Steht «?» in der Ausgabe, passt das Muster nicht mehr zum Code: Mutant nachziehen.
// Die Probe zählt nur bei sauberer Ausgangslage: beide Tests müssen auf der unveränderten Kopie grün sein (sonst meldete sie für jeden Mutanten «erkannt»).
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const DATEIEN = [
  'automation/printful_lager.mjs', 'automation/lib/printful_lager.mjs', 'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs',
  'automation/printful_lager_test.mjs', 'automation/lib/printful_lager_test.mjs',
  'dropship/katalog-fenster-0611/ziel/assets__luxe-clothing-ausblenden.json', 'dropship/codex-katalog/ausblenden.json',
];
const TESTS = ['automation/lib/printful_lager_test.mjs', 'automation/printful_lager_test.mjs'];
const L = 'automation/lib/printful_lager.mjs', R = 'automation/printful_lager.mjs';

// { name, datei, von, zu }
export const MUTANTEN = [
  // ── Lib: Zuordnung und Fremdware
  { name: 'stocked_on_demand zählt nicht als lieferbar', datei: L, von: "new Set(['in_stock', 'stocked_on_demand'])", zu: "new Set(['in_stock'])" },
  { name: 'SKU: auch Endziffern ohne Muster werden akzeptiert', datei: L, von: "/^(\\d+)_(\\d+)$/.exec(", zu: "/(\\d+)_(\\d+)$/.exec(" },
  { name: 'Fortura-Tag schliesst nicht mehr aus', datei: L, von: '/^(fortura|ch-lager|cj-|cj$|cjdropshipping|zendrop|gelato|spocket)/i', zu: '/^(ch-lager|cj-|cj$|cjdropshipping|zendrop|gelato|spocket)/i' },
  { name: 'Fortura-SKU schliesst nicht mehr aus', datei: L, von: 'export const FREMD_SKU = /^(fortura-|cj)/i;', zu: 'export const FREMD_SKU = /^(zzzz)/i;' },
  { name: 'fehlendes Statusfeld gilt als ausverkauft', datei: L, von: "if (!Array.isArray(v.availability_status)) return { art: 'unbekannt', regionen: [] };", zu: '' },
  // ── Lib: Modell lesen
  { name: '404 gilt nicht als «weg»', datei: L, von: "if (st === 404) return { art: 'weg', id: erwarteteId };", zu: '' },
  { name: 'falsche Modellnummer wird geglaubt', datei: L, von: "if (ganz(r.product.id) !== erwarteteId) return { art: 'unbekannt', id: erwarteteId, grund: 'falsche Modellnummer' };", zu: '' },
  { name: 'leere Variantenliste wird geglaubt', datei: L, von: "if (!Array.isArray(r.variants) || !r.variants.length) return", zu: "if (!Array.isArray(r.variants)) return" },
  { name: 'eingestelltes Modell bleibt im Fenster', datei: L, von: 'if (r.product.is_discontinued === true) return', zu: 'if (false) return' },
  { name: 'Variantenschwund wird nicht bemerkt', datei: L, von: 'varianten.length < basis * REGELN.varianteSchwund', zu: 'varianten.length < 0' },
  { name: '«alle aus» schon bei einer ausverkauften Variante', datei: L, von: 'alleAus: nUnbekannt === 0 && ausIds.length === varianten.length', zu: 'alleAus: ausIds.length >= 1' },
  { name: 'Testvariante darf ausverkauft sein', datei: L, von: "    if (v.art !== 'ok') continue;\n    const k = v.regionen.join('+');", zu: "    const k = v.regionen.join('+');" },
  { name: 'Testvarianten: wenige Regionen zuerst', datei: L, von: 'b.n - a.n ||', zu: 'a.n - b.n ||' },
  { name: 'Signatur ohne Regionen', datei: L, von: "`${v.id}:${v.art}:${v.regionen.join('+')}`", zu: '`${v.id}:${v.art}`' },
  // ── Lib: Versandrate
  { name: '«ausverkauft» gilt als keine Schweizer Rate', datei: L, von: "if (/out of stock/i.test(text)) return { art: 'ausverkauft', grund: text.slice(0, 120) };", zu: "if (/out of stock/i.test(text)) return { art: 'keine-rate', grund: text.slice(0, 120) };" },
  { name: 'unbekannte 400-Meldung gilt als keine Rate', datei: L, von: "return { art: 'unbekannt', grund: text.slice(0, 160) || 'HTTP 400' };", zu: "return { art: 'keine-rate', grund: text.slice(0, 160) || 'HTTP 400' };" },
  { name: '403 ist nicht fatal', datei: L, von: 'if (st === 401 || st === 403) return { art: \'fatal\'', zu: 'if (st === 401) return { art: \'fatal\'' },
  { name: 'teuerste statt günstigste Rate', datei: L, von: 'raten.sort((a, b) => a.usd - b.usd);', zu: 'raten.sort((a, b) => b.usd - a.usd);' },
  { name: 'eine unklare Antwort genügt für «keine Rate»', datei: L, von: 'if (keine.length && !offen.length)', zu: 'if (keine.length)' },
  // ── Lib: wann wird die Rate gemessen
  { name: 'Modelle ohne Rate werden nicht neu gemessen', datei: L, von: "if (chVorher !== true) return { mess: true,", zu: "if (chVorher === null) return { mess: true," },
  { name: 'geänderte Signatur löst keine Messung aus', datei: L, von: "if (z.sig !== lesung.signatur) return { mess: true, grund: 'signatur-geaendert' };", zu: '' },
  { name: 'Shop-Modelle werden nie neu gemessen', datei: L, von: 'alter > REGELN.shopRateMaxTage', zu: 'alter > 99999' },
  { name: 'tägliche Scheibe entfällt', datei: L, von: 'lesung.id % REGELN.scheiben === tagIndex % REGELN.scheiben', zu: 'false' },
  { name: 'veraltete Rate wird nie erneuert', datei: L, von: 'if (alter !== null && alter > REGELN.rateMaxTage)', zu: 'if (false)' },
  // ── Lib: Urteil
  { name: 'unklare Messung zählt als frisch', datei: L, von: 'const frisch = !!rate && rate.ch !== null && rate.ch !== undefined;', zu: 'const frisch = !!rate;' },
  { name: 'alter Stand «keine Rate» darf den Shop anfassen', datei: L, von: 'const shopUnsicher = !shopAus && ch === false;', zu: 'const shopUnsicher = false;' },
  { name: 'technisch ungeeignete Modelle bleiben im Fenster', datei: L, von: "const technisch = b.klasse === 'UNGEEIGNET';", zu: 'const technisch = false;' },
  { name: 'alter Stand «keine Rate» zählt als Shop-Grund', datei: L, von: "if (frisch && rate.ch === false) shopGruende.push('keine-ch-rate');", zu: "if (ch === false) shopGruende.push('keine-ch-rate');" },
  { name: 'ausverkaufte Varianten stehen auch bei ausgeblendeten Modellen', datei: L, von: 'ausVarianten: fensterAus ? [] : [...lesung.ausIds], ch, unbekannt: false };', zu: 'ausVarianten: [...lesung.ausIds], ch, unbekannt: false };' },
  // ── Lib: Datei
  { name: 'Varianten werden auch für ausgeblendete Modelle geschrieben', datei: L, von: 'if (u.fensterAus) modelle.push(id);\n    else if (u.ausVarianten.length)', zu: 'if (u.fensterAus) modelle.push(id);\n    if (u.ausVarianten.length)' },
  { name: 'andere Zeilentrennung in der Datei', datei: L, von: ".join(',\\n');", zu: ".join(',');" },
  { name: 'Vergleich hängt von der Reihenfolge ab', datei: L, von: "m: [...o.modelle].sort((x, y) => x - y)", zu: 'm: [...o.modelle]' },
  { name: 'Schema wird nicht geprüft', datei: L, von: 'o.schemaVersion !== SCHEMA_AUSBLENDEN', zu: 'false' },
  { name: 'Stand der Datei ist beliebig alt', datei: L, von: 'standErneuernTage: 7,', zu: 'standErneuernTage: 7000,' },
  // ── Lib: Shop-Plan
  { name: 'Produkte ohne POD-Tag werden bearbeitet', datei: L, von: 'if (!istPodProdukt(p)) { zaehl.fremdOderOhnePod++; continue; }', zu: '' },
  { name: 'unvollständige Variantenliste genügt', datei: L, von: 'if (p.variantenVollstaendig === false) {', zu: 'if (false) {' },
  { name: 'unsicheres Modell zählt wie lieferbar', datei: L, von: 'if (!m || m.unbekannt || m.shopUnsicher) {', zu: 'if (!m || m.unbekannt) {' },
  { name: 'ENTWURF auch bei einer unbekannten Variante', datei: L, von: "if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0 && nUnb === 0) {", zu: "if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0) {" },
  { name: 'ENTWURF schon bei einer ausverkauften Variante', datei: L, von: "if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0 && nUnb === 0) {", zu: "if (p.status === 'ACTIVE' && nAus > 0 && nUnb === 0) {" },
  { name: 'fremde Entwürfe werden reaktiviert', datei: L, von: "if (p.status === 'DRAFT' && hatTag) {", zu: "if (p.status === 'DRAFT') {" },
  { name: 'Reaktivierung schon bei einer lieferbaren Variante von vielen', datei: L, von: 'nOk > 0 && nOk / zeilen.length >= REAKTIV_MIN_ANTEIL', zu: 'nOk > 0' },
  { name: 'Strategie auto sperrt nicht', datei: L, von: "const alsA = strategie === 'A' || strategie === 'auto';", zu: "const alsA = strategie === 'A';" },
  { name: 'Strategie B sperrt auch', datei: L, von: "const alsA = strategie === 'A' || strategie === 'auto';", zu: 'const alsA = true;' },
  { name: 'bereits gesperrte Variante wird nochmals gesperrt', datei: L, von: "if (sm.ok && z.v.inventoryPolicy === 'CONTINUE') aktionen.push", zu: 'if (sm.ok) aktionen.push' },
  { name: 'Sperre am Dienst-Standort erlaubt', datei: L, von: "if (lv.some((l) => l.location && l.location.isFulfillmentService)) return { ok: false, grund: 'dienststandort' };", zu: '' },
  { name: 'Sperre bei positivem Bestand', datei: L, von: "if (menge > 0) return { ok: false, grund: 'menge-positiv' };", zu: '' },
  { name: 'Sperre bei ungetrackter Variante (Konflikt mit dem Lager-Wächter)', datei: L, von: "if (!it.tracked) return { ok: false, grund: 'ungetrackt' };", zu: '' },
  { name: 'gesperrte Variante wird nie freigegeben', datei: L, von: "} else if (z.art === 'ok' && gesperrt) {", zu: '} else if (false) {' },
  // ── Lib: Bremsen, Ledger, Erlaubnisliste
  { name: 'Bremse «nicht lesbar» zu locker', datei: L, von: 'z.unbekannt / gesamt > r.maxUnbekanntAnteil', zu: 'z.unbekannt / gesamt > r.maxUnbekanntAnteil * 3' },
  { name: 'Bremse «neu verschwindend» zu locker', datei: L, von: 'z.neuAus > maxNeu', zu: 'z.neuAus > maxNeu * 10' },
  { name: 'Bremse «Entwürfe» zu locker', datei: L, von: 'z.entwuerfe > maxEnt', zu: 'z.entwuerfe > maxEnt * 10' },
  { name: 'Mindestzahl neu verschwindender Modelle viel zu hoch', datei: L, von: 'maxNeuAusMin: 20,', zu: 'maxNeuAusMin: 2000,' },
  { name: 'Printful: Schreiben erlaubt', datei: L, von: "(methode === 'GET' && /^\\/products\\/\\d+$/.test(String(pfad))) || (methode === 'POST' && pfad === '/shipping/rates')", zu: "(methode === 'GET' && /^\\/products\\/\\d+$/.test(String(pfad))) || methode === 'POST'" },
  { name: 'Printful: jeder Lesepfad erlaubt', datei: L, von: "(methode === 'GET' && /^\\/products\\/\\d+$/.test(String(pfad)))", zu: "(methode === 'GET')" },
  { name: 'Ledger-Zeile ohne vorher=', datei: L, von: "`printful-lager ${iso} ${typ} ${ziel} vorher=${JSON.stringify(vorher)}`", zu: "`printful-lager ${iso} ${typ} ${ziel} ${JSON.stringify(vorher)}`" },
  { name: 'Kanäle fehlen nie', datei: L, von: 'return (vorher || []).map(String).filter((x) => !j.has(x));', zu: 'return [];' },
  // ── Lauf: Schutzschalter
  { name: 'Printful-Erlaubnisliste wird im Lauf nicht geprüft', datei: R, von: 'if (!pfErlaubt(methode, pfad)) throw', zu: 'if (false) throw' },
  { name: 'Shopify darf im Trockenlauf schreiben', datei: R, von: "if (!schreiben) { z.uebersprungen++; throw new Error('Schreibzugriff im Trockenlauf (Programmfehler)'); }", zu: '' },
  { name: 'LIVE=1 ohne Freigabedatei schreibt', datei: R, von: 'else if (C.live && existsSync(C.freigabe)) schreiben = true;', zu: 'else if (C.live) schreiben = true;' },
  { name: 'Freigabedatei allein schreibt', datei: R, von: 'else if (C.live && existsSync(C.freigabe)) schreiben = true;', zu: 'else if (existsSync(C.freigabe)) schreiben = true;' },
  { name: 'Telegram auch im Trockenlauf', datei: R, von: "if (!schreiben) { log('[Trockenlauf] Telegram: '", zu: "if (false) { log('[Trockenlauf] Telegram: '" },
  { name: 'FORCE hebt auch die Bremse «nicht lesbar» auf', datei: R, von: "const hart = ver.filter((v) => v.art === 'zu-viele-unbekannt' || !C.force);", zu: 'const hart = ver.filter((v) => !C.force);' },
  { name: 'Bremsen werden ignoriert', datei: R, von: 'const abbruch = hart.length > 0;', zu: 'const abbruch = false;' },
  { name: 'Abbruch endet mit Exit 0', datei: R, von: "return await ende(2, `Bremse: ${hart.map((v) => v.art).join(', ')}`);", zu: "return await ende(0, `Bremse: ${hart.map((v) => v.art).join(', ')}`);" },
  { name: 'Zeitlimit wird nicht beachtet', datei: R, von: 'const zeitAbgelaufen = () => jetztMs() - START > C.runLimitMs;', zu: 'const zeitAbgelaufen = () => false;' },
  { name: 'Nachprüfung vor dem ENTWURF entfällt', datei: R, von: "if (a.typ === 'entwurf' && !bestaetigt(a)) {", zu: 'if (false) {' },
  { name: 'Datei wird auch angelegt, wenn sie im Theme fehlt', datei: R, von: "const dateiNeu = live.zustand === 'ok' && !C.modelleTeil &&", zu: 'const dateiNeu = !C.modelleTeil &&' },
  { name: 'Teilmenge schreibt die Datei', datei: R, von: "const dateiNeu = live.zustand === 'ok' && !C.modelleTeil &&", zu: "const dateiNeu = live.zustand === 'ok' &&" },
  { name: 'Stand wird nie erneuert', datei: R, von: 'standAlter >= REGELN.standErneuernTage', zu: 'false' },
  { name: 'Datei wird trotz Änderung durch Dritte überschrieben', datei: R, von: 'if (frisch.zustand !== \'ok\' || frisch.md5 !== live.md5) fehler.push(', zu: 'if (false) fehler.push(' },
  { name: 'Rücklesen der Datei entfällt', datei: R, von: 'if (r.zustand === \'ok\' && r.md5 === md5(text)) { ok = true; break; }', zu: 'ok = true; break;' },
  { name: 'Rücklesen der Produkte entfällt', datei: R, von: "if (!ok) fehler.push(`Rücklesen ${a.typ} ${a.handle}: Stand weicht vom Soll ab`);", zu: '' },
  { name: 'Ledger wird nicht geschrieben', datei: R, von: "const led = (typ, ziel, vorher) => appendFileSync(C.ledger, ledgerZeile(iso(), typ, ziel, vorher) + '\\n');", zu: 'const led = () => {};' },
  { name: 'Kanäle werden vor dem ENTWURF nicht gemerkt', datei: R, von: "let d = await schreibenGql(M_MF_SET, { m: [{ ownerId: produktId, namespace: MF_NAMESPACE, key: MF_KANAELE, type: 'single_line_text_field', value: kanaeleText(kan) }] });", zu: 'let d = { metafieldsSet: { userErrors: [] } };' },
  { name: 'Kanäle werden bei der Rückkehr nicht veröffentlicht', datei: R, von: 'if (fehlt.length) {\n        d = await schreibenGql(M_PUBLISH', zu: 'if (false) {\n        d = await schreibenGql(M_PUBLISH' },
  { name: 'Kanäle nach dem Veröffentlichen nicht geprüft', datei: R, von: "if (fehlt.length) throw new Error(`Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt", zu: "if (false) throw new Error(`Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt" },
  { name: 'Tag wird beim ENTWURF nicht gesetzt', datei: R, von: "d = await schreibenGql(M_TAGS_ADD, { id: produktId, tags: [TAG_AUS] }); f = userFehler(d, 'tagsAdd'); if (f) throw new Error('tagsAdd: ' + f);", zu: '' },
  { name: 'userErrors der Produktänderung werden übersehen', datei: R, von: "d = await schreibenGql(M_STATUS, { p: { id: produktId, status: 'DRAFT' } }); f = userFehler(d, 'productUpdate'); if (f) throw new Error('productUpdate: ' + f);", zu: "d = await schreibenGql(M_STATUS, { p: { id: produktId, status: 'DRAFT' } });" },
  { name: 'Strategie A merkt die alte Einstellung nicht', datei: R, von: "metafields: [{ namespace: MF_NAMESPACE, key: MF_SPERRE, type: 'single_line_text_field', value: a.vorherPolicy }] }] });\n          const f", zu: "}] });\n          const f" },
  { name: 'Sperre setzt CONTINUE statt DENY', datei: R, von: "v: [{ id: a.varianteId, inventoryPolicy: 'DENY', metafields:", zu: "v: [{ id: a.varianteId, inventoryPolicy: 'CONTINUE', metafields:" },
  { name: 'Freigabe löscht die Markierung nicht', datei: R, von: "d = await schreibenGql(M_MF_WEG, { m: [{ ownerId: a.varianteId, namespace: MF_NAMESPACE, key: MF_SPERRE }] }); f = userFehler(d, 'metafieldsDelete'); if (f) throw new Error('metafieldsDelete: ' + f);\n        }", zu: '}' },
  // ── Lauf: Printful-Client
  { name: '429 wird nicht abgewartet', datei: R, von: 'if (r.status === 429) {', zu: 'if (false) {' },
  { name: '401 wird nicht als fatal erkannt', datei: R, von: 'if (r.status === 401 || r.status === 403) throw', zu: 'if (false) throw' },
  { name: '5xx wird nicht wiederholt', datei: R, von: "if (r.status >= 500) { letzte = new PfFehler(`Printful ${pfad}: HTTP ${r.status}`, 'transient'); await sleep(2000 * (i + 1)); continue; }", zu: '' },
  { name: 'abgeschnittene Antwort wird geglaubt', datei: R, von: 'if (!ganz && r.status === 200) {', zu: 'if (false) {' },
  { name: 'X-PF-Store-Id fehlt nie', datei: R, von: "if (C.pfStore) headers['X-PF-Store-Id'] = C.pfStore;", zu: "headers['X-PF-Store-Id'] = C.pfStore;" },
  { name: 'Preisauskunft: Land nicht Schweiz', datei: R, von: "recipient: { country_code: 'CH', zip: '8001' }", zu: "recipient: { country_code: 'DE', zip: '8001' }" },
  // ── Lauf: Shopify, Zustand, Rücknahme
  { name: 'hängender Cursor wird nicht erkannt', datei: R, von: "if (!d.pageInfo.endCursor || d.pageInfo.endCursor === cur) throw", zu: 'if (false) throw' },
  { name: 'Zustandsdatei wird nicht geschrieben', datei: R, von: 'try { writeFileSync(C.zustandDatei, JSON.stringify(neuZ)); } catch { /* Zugabe */ }', zu: '' },
  { name: 'MAX_RATEN begrenzt nichts', datei: R, von: 'const dran = plan2.slice(0, C.maxRaten), vertagt = plan2.slice(C.maxRaten);', zu: 'const dran = plan2, vertagt = [];' },
  { name: 'Rücknahme prüft die fremde Veränderung der Datei nicht', datei: R, von: 'if (aktuell.md5 !== e.vorher.md5Nachher && !C.fremdUeberschreiben) {', zu: 'if (false) {' },
  { name: 'Rücknahme setzt nicht vom Ledger gesetzte Stände zurück', datei: R, von: "const ok = p && (e.typ === 'entwurf' ? (p.status === 'DRAFT' && p.tags.includes(TAG_AUS)) : p.status === 'ACTIVE');", zu: 'const ok = !!p;' },
  { name: 'Rücknahme stellt die Kanäle nicht wieder her', datei: R, von: "if (e.typ === 'entwurf') await produktReaktivieren(e.ziel, Array.isArray(e.vorher.kanaele) ? e.vorher.kanaele : null, () => {});", zu: "if (e.typ === 'entwurf') await produktReaktivieren(e.ziel, null, () => {});" },
  { name: 'ungültige Strategie wird hingenommen', datei: R, von: "if (!['A', 'B', 'AUTO'].includes(strategie)) fehler.push(", zu: "if (false) fehler.push(" },
  { name: 'Fremde Shop-Adresse wird nicht abgelehnt', datei: R, von: "try { return normalizeShopifyHost(env.SHOPIFY_SHOP || '') || 'au3j0y-hq.myshopify.com'; } catch { fehler.push('SHOPIFY_SHOP ungültig'); return ''; }", zu: "return env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';" },
];

function lauf(dir, test) {
  const r = spawnSync('/opt/node22/bin/node', [join(dir, test)], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), 'plager-mut-'));
  let code = 0;
  try {
    for (const f of DATEIEN) { mkdirSync(dirname(join(dir, f)), { recursive: true }); copyFileSync(join(REPO, f), join(dir, f)); }
    for (const t of TESTS) { const g = lauf(dir, t); if (g.code !== 0) { console.error(`Ausgangslage nicht grün: ${t}\n${g.out.slice(-600)}`); code = 2; return; } }
    let erkannt = 0, ueberlebt = [], unpassend = [];
    for (const [i, m] of MUTANTEN.entries()) {
      const pfad = join(dir, m.datei);
      const orig = readFileSync(pfad, 'utf8');
      const treffer = orig.split(m.von).length - 1;
      if (treffer !== 1) { unpassend.push(`${m.name} (${treffer} Treffer)`); console.log(`? ${String(i + 1).padStart(3)} ${m.name}: Muster kommt ${treffer}-mal vor`); continue; }
      writeFileSync(pfad, orig.replace(m.von, () => m.zu));
      let rot = false, wer = '';
      for (const t of TESTS) { const g = lauf(dir, t); if (g.code !== 0) { rot = true; wer = t.split('/').pop(); break; } }
      writeFileSync(pfad, orig);
      if (rot) { erkannt++; console.log(`✓ ${String(i + 1).padStart(3)} ${m.name}  [${wer}]`); } else { ueberlebt.push(m.name); console.log(`✗ ${String(i + 1).padStart(3)} ${m.name}: ÜBERLEBT`); }
    }
    console.log(`\nMutationsprobe: ${erkannt} von ${MUTANTEN.length} erkannt, ${ueberlebt.length} überlebt, ${unpassend.length} mit unpassendem Muster`);
    for (const x of ueberlebt) console.log(`  überlebt: ${x}`);
    for (const x of unpassend) console.log(`  unpassend: ${x}`);
    code = unpassend.length ? 2 : ueberlebt.length ? 1 : 0;
  } finally { rmSync(dir, { recursive: true, force: true }); process.exitCode = code; }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
