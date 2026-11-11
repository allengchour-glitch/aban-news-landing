// Mutationsprobe für den LIVE-, Rücknahme- und Prüfpfad von kategorie_banner_v2.mjs (gegen banner_v2_live_test.mjs + Attrappe).
// Ausgangslage zuerst: der unveränderte Test muss grün sein. Ein Absturz zählt als «ungeklärt», nie als «erkannt».
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const HIER = dirname(fileURLToPath(import.meta.url));
const QUELLE = readFileSync(join(HIER, 'kategorie_banner_v2.mjs'), 'utf8');
const M = [
  ['PLAN_HASH nicht verlangt', "if (E.PLAN_HASH !== hash) throw", "if (false) throw"],
  ['Plan-Inhalt nicht nachgerechnet', "if (hash !== plan.planHash) throw", "if (false) throw"],
  ['Plan-Alter egal', "if (!L.planAlterOk(plan.zeit, JETZT, Number(E.MAX_ALTER_H || 24))) throw", "if (false) throw"],
  ['Stand seit Trockenlauf egal', "if (diff.length) { log(`${e.handle}: übersprungen — seit dem Trockenlauf verändert", "if (false) { log(`${e.handle}: übersprungen — seit dem Trockenlauf verändert"],
  ['Quellprodukte nicht nachgeprüft', "if (schlecht.length) { log(", "if (false) { log("],
  ['Bilddatei nicht gegen Plan geprüft', "if (sha(b) !== e.neu.sha256) throw", "if (false) throw"],
  ['alte Bilddatei nicht gesichert', "writeFileSync(sich.replace(/\\.json$/, '.' + ext), await holen(vorher.bild.url));", "void ext;"],
  ['kein Rücklesen', "const befund = L.rueckleseBefund(soll, vorher, ist);", "const befund = [];"],
  ['CDN nicht geprüft', "if (st !== 200) befund.push('cdn-' + st);", ""],
  ['kein Stopp nach Abweichung', "fehler++; break; }\n      log(`${e.handle}: geschrieben", "fehler++; }\n      log(`${e.handle}: geschrieben"],
  ['Deckel ignoriert', "if (liste.length > max) { log(`Deckel: ${max} von ${liste.length} (MAX)`); liste = liste.slice(0, max); }", ""],
  ['OHNE ignoriert', "&& !ohne.has(e.handle));", ");"],
  ['ungeprüfte Bilder ohne Freigabe', "&& E.UNGEPRUEFT_OK !== '1') {", "&& false) {"],
  ['Ledger ohne Quelle', "zeile.quelle = { produkt: e.neu.quelleProdukt, bild: e.neu.quelleBild.url };", ""],
  ['Teilschreiben ohne Ledger-Zeile', "zeile.befund = ['abbruch:' + x.message]; ledger(zeile);", "zeile.befund = ['abbruch:' + x.message];"],
  ['Teilschreiben ohne «nachher»', "zeile.nachher = L.sicherungsEintrag({ handle: ist?.handle, id: ist?.id, image: ist?.bild, kopf: ist?.kopf }, new Date().toISOString()); zeile.nachherAusAbbruch = true;", "void ist;"],
  ['Rücknahme: fremd wird überschrieben', "fremdUeberschreiben: E.FREMD_UEBERSCHREIBEN === '1'", "fremdUeberschreiben: true"],
  ['Rücknahme: Trockenlauf schreibt', "if (!SCHREIBEN) { log(`${a.handle}: würde zurücknehmen", "if (false) { log(`${a.handle}: würde zurücknehmen"],
  ['Rücknahme: keine gesicherte Datei, wenn CDN weg', "if (await cdnOk(src) !== 200) {", "if (false) {"],
  ['Rücknahme: Kopf nicht zurück', "if (ent.teile.kopf === 'zurueck') await kopfSetzen(", "if (false) await kopfSetzen("],
  ['Prüfung: Gründe der Produkte egal', "else if (n.gruende.length) g.push(", "else if (false) g.push("],
  ['Prüfung: Mitgliedschaft egal', "if (!p.inCollection) gruende.push('kein-mitglied');", ""],
  ['Nachprüfung: Entwurf egal', "if (p.status !== 'ACTIVE') gruende.push('status-' + p.status.toLowerCase());", ""],
  ['Kopf vor Bild auch bei Bild-Fehler', "if (e.teile.includes('kopf')) { await kopfSetzen(c.id, e.kopf.ids);", "if (e.teile.includes('kopf') && !e.teile.includes('xx')) { await kopfSetzen(c.id, e.kopf.ids);"],
];
// Der letzte Mutant ist absichtlich gleichwertig (Kontrolle, dass die Probe nicht alles als «erkannt» meldet): er muss überleben.
const GLEICHWERTIG = new Set(['Kopf vor Bild auch bei Bild-Fehler']);
const tmp = mkdtempSync(join(tmpdir(), 'bv2lm-'));
for (const f of ['banner_v2_lib.mjs']) copyFileSync(join(HIER, f), join(tmp, f));
const lauf = pfad => spawnSync(process.execPath, [join(HIER, 'banner_v2_live_test.mjs')], { env: { ...process.env, RUNNER: pfad }, encoding: 'utf8', timeout: 300000 });
const basis = lauf(join(HIER, 'kategorie_banner_v2.mjs'));
if (basis.status !== 0) { console.log('Ausgangslage ROT, Probe ungültig:\n' + basis.stdout); process.exit(2); }
let erkannt = 0, ueberlebt = 0, nichtAnwendbar = 0, ungeklaert = 0, gleich = 0;
for (const [name, alt, neu] of M) {
  if (!QUELLE.includes(alt)) { console.log(`? ${name}: Muster nicht gefunden`); nichtAnwendbar++; continue; }
  const datei = join(tmp, 'kategorie_banner_v2.mjs'); writeFileSync(datei, QUELLE.replace(alt, neu));
  const r = lauf(datei);
  const fehlschlag = r.status !== 0 && /FEHLGESCHLAGEN/.test(r.stdout);
  if (GLEICHWERTIG.has(name)) { if (fehlschlag) { console.log(`! ${name}: gleichwertig erwartet, aber erkannt`); ungeklaert++; } else gleich++; continue; }
  if (fehlschlag) erkannt++;
  else if (r.status !== 0) { console.log(`? ${name}: Absturz statt Fehlschlag (${(r.stderr || r.stdout || '').split('\n').slice(-3).join(' ')})`); ungeklaert++; }
  else { ueberlebt++; console.log(`✗ überlebt: ${name}`); }
}
rmSync(tmp, { recursive: true, force: true });
const echt = M.length - GLEICHWERTIG.size;
console.log(`LIVE-Mutationsprobe: ${erkannt} von ${echt} erkannt, ${ueberlebt} überlebt, ${ungeklaert} ungeklärt, ${nichtAnwendbar} nicht anwendbar, ${gleich} gleichwertig (Kontrolle)`);
process.exit(ueberlebt || nichtAnwendbar || ungeklaert ? 1 : 0);
