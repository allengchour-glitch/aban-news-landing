// Mutationsprobe für apply.mjs: baut je Muster eine Kopie mit EINEM absichtlichen Fehler und verlangt, dass apply_test.mjs rot wird.
// Aufruf: node mutationsprobe.mjs   (Exit 0 nur, wenn jeder Mutant erkannt wurde und jedes Muster anwendbar war)
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const MUSTER = [
  ['M01 Quellenprüfung aus', 'if (c.value !== z.de) {', 'if (false) {'],
  ['M02 doppelte Schlüssel nicht erkannt', 'if (treffer.length > 1) {', 'if (false) {'],
  ['M03 fehlender Schlüssel nicht erkannt', 'if (treffer.length === 0) {', 'if (false) {'],
  ['M04 «veraltet» zählt als richtig', 't.value === z.fr && !t.outdated', 't.value === z.fr'],
  ['M05 Sicherung wird nicht zusammengeführt', 'if (!hat.has(p.key)) {', 'if (false) {'],
  ['M06 falscher Digest beim Schreiben', 'translatableContentDigest: p.digest', "translatableContentDigest: 'x'"],
  ['M07 falsche Sprache', "tr: [{ locale: 'fr', key: p.key, value: p.fr", "tr: [{ locale: 'de', key: p.key, value: p.fr"],
  ['M08 Rücklesen ignoriert «veraltet»', 'else if (t.outdated) fehler.push', 'else if (false) fehler.push'],
  ['M09 Rücklesen ignoriert Wertabweichung', 'else if (t.value !== z.fr) fehler.push', 'else if (false) fehler.push'],
  ['M10 Rücknahme entfernt nie', 'const d = e.vorher\n        ? await', 'const d = true\n        ? await'],
  ['M11 Trockenlauf schreibt', 'if (!live) return { exit: 0, plan };\n  if (!plan.length)', 'if (false) return { exit: 0, plan };\n  if (!plan.length)'],
  ['M12 userErrors beim Schreiben ignoriert', "if (ue.length) {\n      const offen", 'if (false) {\n      const offen'],
  ['M13 Probleme verhindern das Schreiben nicht', "if (probleme.length) { log('Abbruch", "if (false) { log('Abbruch"],
  ['M14 Rücknahme im Trockenlauf schreibt', "if (!live) { log(`  [Trockenlauf] ${e.vorher", "if (false) { log(`  [Trockenlauf] ${e.vorher"],
  ['M15 Rücklesen nach dem Schreiben fehlt', 'const fehler = await lesenBisGleich(gql, (rs) => pruefenNachher(rs, ziele), warte);', 'const fehler = [];'],
  ['M16 Rücknahme mit falschem Digest', 'value: e.vorher.value, translatableContentDigest: c.digest', "value: e.vorher.value, translatableContentDigest: 'x'"],
  ['M17 Sicherung fehlt ganz', 'if (neu || !existsSync(vorherDatei)) sicherungSchreiben(vorherDatei, s);', ''],
  ['M18 Vorher-Zustand nicht mitgeführt', 'vorher: t ? { value: t.value, outdated: !!t.outdated } : null', 'vorher: null'],
  ['M19 falsche Ressource beim Schreiben', 'id: r.resourceId, key: z.key, digest: c.digest', 'id: ressourcen[0].resourceId, key: z.key, digest: c.digest'],
  ['M20 Rücknahme ohne Sicherung meldet Erfolg', "log('Keine Sicherung vorhanden: nichts zurückzunehmen.'); return { exit: 2 };", "log('Keine Sicherung vorhanden: nichts zurückzunehmen.'); return { exit: 0 };"],
  ['M21 Link nicht zuerst', 'const reihenfolge = [...plan].sort((a, b) => (istLink(b.key) ? 1 : 0) - (istLink(a.key) ? 1 : 0));', 'const reihenfolge = [...plan];'],
  ['M22 Rücknahme meldet übersprungene Schlüssel nicht', 'return { exit: probleme ? 2 : 0 };', 'return { exit: 0 };'],
  ['M23 Rücknahme prüft die Ressource nicht', 'if (e.resourceId && r.resourceId !== e.resourceId) {', 'if (false) {'],
  ['M24 Rücknahme liest nicht zurück', 'if (live && !probleme) {', 'if (false) {'],
  ['M25 Rücklesen ohne Wiederholung', 'warte, versuche = 8) {', 'warte, versuche = 1) {'],
  ['M26 mehrseitige Liste: nur erste Seite', 'if (!d.translatableResources.pageInfo.hasNextPage) break; after', 'break; after'],
  ['M27 keine Token-Erneuerung bei 401', 'if (r.status === 401 && tokenErneuern && !erneuert) {', 'if (false) {'],
  ['M28 Nicht-JSON ohne Wiederholung', 'try { j = JSON.parse(text); } catch {\n      if (versuch < 3) {', 'try { j = JSON.parse(text); } catch {\n      if (false) {'],
  ['M29 errors-Zeichenkette nicht normalisiert', 'const errs = Array.isArray(j.errors) ? j.errors : (j.errors ? [j.errors] : []);', 'const errs = j.errors || [];'],
  ['M30 429/5xx ohne Wiederholung', 'if (r.status === 429 || r.status >= 500) {\n      if (versuch < 6) {', 'if (r.status === 429 || r.status >= 500) {\n      if (false) {'],
  ['M31 Netzfehler ohne Wiederholung', "} catch (e) {\n      if (versuch < 4) {", "} catch (e) {\n      if (false) {"],
  ['M32 Drosselung als Text ohne Wiederholung', "/throttl/i.test(JSON.stringify(e))) && versuch < 6) {", "/throttl/i.test(JSON.stringify(e))) && false) {"],
  ['M33 pruefenZurueck ignoriert falschen Altwert', 'if (e.vorher) { if (!t || t.value !== e.vorher.value)', 'if (e.vorher) { if (false)'],
  ['M34 pruefenZurueck ignoriert verbleibende Übersetzung', 'else if (t) fehler.push({ key: e.key, grund: \'Übersetzung ist noch da\' });', 'else if (false) fehler.push({ key: e.key, grund: \'Übersetzung ist noch da\' });'],
  ['M35 «offen» in der Fehlermeldung leer', 'const offen = reihenfolge.filter((x) => !geschrieben.includes(x.key)).map((x) => x.key);', 'const offen = [];'],
  ['M36 userErrors beim Entfernen/Zurücksetzen ignoriert', "if (ue.length) { log('  FEHLER ' + e.key", "if (false) { log('  FEHLER ' + e.key"],
  ['M37 geschützte Leerzeichen entfernt', "const NB = '\\u00A0';", "const NB = ' ';"],
  ['M38 Linkpräfix /fr entfernt', "fr: '/fr/collections/kostueme-ch-lager'", "fr: '/collections/kostueme-ch-lager'"],
  ['M39 Rücklesen-Fehler meldet Erfolg', "return { exit: 3, fehler }; }\n  log(`Rücklesen: alle", "return { exit: 0, fehler }; }\n  log(`Rücklesen: alle"],
  ['M40 Fusszeile ohne /fr bei den Richtlinien', '<a href="/fr/policies/refund-policy">', '<a href="/policies/refund-policy">'],
  ['M41 Sicherung wird bei jedem Lauf überschrieben', 'const s = sicherungLesen(vorherDatei) || { at: new Date().toISOString(), eintraege: [] };', 'const s = { at: new Date().toISOString(), eintraege: [] };'],
];

let erkannt = 0; const ueberlebt = []; const unanwendbar = [];
for (const [name, alt, neu] of MUSTER) {
  const d = mkdtempSync(path.join(tmpdir(), 'mutfr-'));
  copyFileSync(path.join(HIER, 'apply_test.mjs'), path.join(d, 'apply_test.mjs'));
  const code = readFileSync(path.join(HIER, 'apply.mjs'), 'utf8');
  if (!code.includes(alt)) { unanwendbar.push(name); rmSync(d, { recursive: true, force: true }); continue; }
  writeFileSync(path.join(d, 'apply.mjs'), code.replace(alt, () => neu));
  const r = spawnSync(process.execPath, ['apply_test.mjs'], { cwd: d, encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) erkannt++; else ueberlebt.push(name);
  rmSync(d, { recursive: true, force: true });
}
const anwendbar = MUSTER.length - unanwendbar.length;
console.log(`Mutationsprobe: ${erkannt} von ${anwendbar} anwendbaren Mutanten erkannt (${MUSTER.length} Muster).`);
if (unanwendbar.length) console.log('NICHT ANWENDBAR (Muster veraltet?): ' + unanwendbar.join('; '));
if (ueberlebt.length) console.log('ÜBERLEBT: ' + ueberlebt.join('; '));
process.exit(unanwendbar.length || ueberlebt.length ? 1 : 0);
