// Mutationsprobe für apply_theme.mjs: verändert je EINE Stelle des Skripts und prüft, ob apply_theme_test.mjs rot wird. Überlebt ein Mutant,
// ist ein Test zu schwach (oder der Mutant gleichwertig: dann steht er unten in GLEICHWERTIG mit Begründung). Ein Muster, das nicht genau einmal
// vorkommt, ist ein Fehler der Probe selbst («nicht anwendbar»).
//   node dropship/lagerbestand-0511/apply_theme_mutation.mjs        (läuft auf Kopien im Wegwerfordner, das Repo bleibt unberührt; 4 Läufe gleichzeitig)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '../..');
const SKRIPT = fs.readFileSync(path.join(HIER, 'apply_theme.mjs'), 'utf8');
const PAKET = 'dropship/lagerbestand-0511';
const KOPIE = [
  'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs',
  PAKET + '/apply_theme_test.mjs', PAKET + '/lux_delivery.alt.liquid', PAKET + '/sicherung/product.json.vor',
];
if (fs.existsSync(path.join(HIER, 'lux_delivery.neu.liquid'))) KOPIE.push(PAKET + '/lux_delivery.neu.liquid');

// [Name, von (muss genau einmal vorkommen), zu]
const M = [
  // --- Konstanten und Eingaben ---
  ['M01 MD5_VOR falsch', "export const MD5_VOR = '2139c46547040628779150957739a93e';", "export const MD5_VOR = '2139c46547040628779150957739a93f';"],
  ['M02 ALT_MD5 falsch', "export const ALT_MD5 = 'bab63e37a934b75accd53a31e5d14c86';", "export const ALT_MD5 = 'bab63e37a934b75accd53a31e5d14c87';"],
  ['M03 Grössengrenze 10-fach', 'export const MAX_BYTE = 250000;', 'export const MAX_BYTE = 2500000;'],
  ['M04 alt.liquid nicht gegen ALT_MD5 geprüft', 'if (md5(altRef) !== ALT_MD5) fail(4,', 'if (false) fail(4,'],
  ['M05 Blockdatei nicht geprüft', 'if (probleme.length) fail(4, \'Neuer Blocktext unbrauchbar', 'if (false) fail(4, \'Neuer Blocktext unbrauchbar'],
  ['M06 U+FFFD wird hingenommen', "if (neu.includes('\\uFFFD')) p.push(", "if (false) p.push("],
  ['M07 Liquid-Gleichgewicht ohne Stapel', "const tag = m[1], innen = stapel[stapel.length - 1];", "const tag = m[1], innen = 'comment';"],
  ['M08 Liquid-Klammerpaare nicht gezählt', "if (zaehle(/\\{%/g) !== zaehle(/%\\}/g)) return", "if (false) return"],
  ['M09 Tag liquid wird akzeptiert', "if (/\\{%-?\\s*liquid\\b/.test(text)) return", "if (false) return"],
  // --- Ersetzen ---
  ['M10 String.replace statt Ausschneiden', 'neuText = text.slice(0, i) + neuStr + danach;', 'neuText = text.replace(alt, neuStr);'],
  ['M11 Treffer-Anzahl nur nach unten geprüft', 'if (treffer.length !== 1) {', 'if (treffer.length < 1) {'],
  ['M12 Schlüssel-Kontext nicht geprüft', "if (!new RegExp('\"' + SCHLUESSEL + '\"\\\\s*:\\\\s*$').test(davor)) throw", "if (false) throw"],
  ['M13 Ende des Wertes nicht geprüft', "if (!/^\\s*[,}]/.test(danach)) throw", "if (false) throw"],
  ['M14 Ausschnitt um ein Zeichen verschoben', 'neuText = text.slice(0, i) + neuStr + danach;', 'neuText = text.slice(0, i + 1) + neuStr + danach;'],
  ['M15 Kommentar am Dateianfang nicht erkannt', "const m = /^\\s*\\/\\*[\\s\\S]*?\\*\\/\\s*/.exec(text);", "const m = null;"],
  ['M16 anderer Block (lux_trust)', "'blocks', 'lux_delivery'];", "'blocks', 'lux_trust'];"],
  ['M17 Blocktyp nicht geprüft', "if (o.type !== 'custom-liquid') throw", "if (false) throw"],
  ['M18 Fehlercode der Maskierung 4 statt 5', "throw fehler(5, `JSON.stringify(alter Blocktext) kommt", "throw fehler(4, `JSON.stringify(alter Blocktext) kommt"],
  // --- Ausgangsstand ---
  ['M19 Datei-MD5 nicht geprüft', 'if (jetzt.md5 !== MD5_VOR) {\n    if (merk &&', 'if (false) {\n    if (merk &&'],
  ['M20 alter Blocktext nicht gegen alt.liquid geprüft', 'if (blockLive !== altRef) {', 'if (false) {'],
  ['M21 «schon eingespielt» am Block nicht erkannt', 'if (blockLive !== null && blockLive === neu) fail(3,', 'if (false) fail(3,'],
  ['M22 «schon eingespielt» an der Merkliste nicht erkannt', 'if (merk && jetzt.md5 === merk.md5_soll) fail(3,', 'if (false) fail(3,'],
  ['M23 fremder Stand ohne FREMD_UEBERSCHREIBEN abgelehnt', 'if (!FREMD_OK) fail(4, `${DATEI} weicht vom erwarteten Ausgangsstand ab', 'if (false) fail(4, `${DATEI} weicht vom erwarteten Ausgangsstand ab'],
  ['M24 Grössengrenze der Vorlage nicht angewandt', 'if (Buffer.byteLength(neuText) > MAX_BYTE) fail(4,', 'if (false) fail(4,'],
  ['M25 Sicherungsname immer gleich', "export const sicherungsName = (md5vor) => (md5vor === MD5_VOR ? 'product.json.vor' : 'product.json.vor-' + md5vor.slice(0, 8));", "export const sicherungsName = (md5vor) => 'product.json.vor';"],
  ['M26 Prüfsumme der Datei fehlt: weiter', "if (!jetzt.md5) fail(4,", "if (false) fail(4,"],
  ['M27 Inhalt passt nicht zur Prüfsumme: weiter', "if (content != null && n.checksumMd5 && md5(content) !== n.checksumMd5) content = null;", ""],
  ['M28 mehrere MAIN-Themes hingenommen', 'if (themen.length !== 1) fail(1,', 'if (themen.length < 1) fail(1,'],
  ['M29 Aufrufe vermischt', 'if ([ZURUECK, TEST, WEG].filter(Boolean).length > 1) fail(1,', 'if ([ZURUECK, TEST, WEG].filter(Boolean).length > 2) fail(1,'],
  // --- Einspielen ---
  ['M30 Sicherung nicht angelegt', 'if (!existsSync(sichPfad)) writeFileSync(sichPfad, jetzt.content);', ''],
  ['M31 Sicherung nicht gegen den Live-Stand geprüft', "if (md5(t) !== md5vor) fail(4, `Sicherung ${name} weicht", "if (false) fail(4, `Sicherung ${name} weicht"],
  ['M32 Merkliste nicht geschrieben', 'writeFileSync(MERKLISTE, JSON.stringify({ erstellt', 'void (JSON.stringify({ erstellt'],
  ['M33 userErrors beim Einspielen ignoriert', "    if (u.userErrors?.length) {\n      console.error('userErrors:'", "    if (false) {\n      console.error('userErrors:'"],
  ['M34 Rücklesen: erste Antwort genügt', 'if (soll === null ? !nach : letzter === soll) return { ok: true, md5: letzter };', 'return { ok: true, md5: letzter };'],
  ['M35 Rücklesen: keine Geduld', 'if (Date.now() - t0 > maxMs * ZEIT) return { ok: false, md5: letzter };', 'if (Date.now() - t0 >= 0) return { ok: false, md5: letzter };'],
  ['M36 Rücklesen weicht ab: kein Rückweg', 'if (!w.ok) await abbruch(6,', 'if (!w.ok) process.exit(6); if (false) await abbruch(6,'],
  ['M37 Seitenprüfung nachher ohne Folge', 'if (!ok) await abbruch(7,', 'if (false) await abbruch(7,'],
  ['M38 nur eine Prüfrunde', 'for (let runde = 1; runde <= RUNDEN; runde++) {', 'for (let runde = 1; runde <= 1; runde++) {'],
  ['M39 Seiten vorher nicht ausgewertet', 'if (!vorOk) fail(4,', 'if (false) fail(4,'],
  ['M40 Blindheit der Seitenprüfung hingenommen', 'if (!hatBlock(vorMessung)) fail(4,', 'if (false) fail(4,'],
  ['M41 Rückweg nur ein Versuch', 'for (let v = 1; v <= 3 && !bestaetigt; v++) {', 'for (let v = 1; v <= 1 && !bestaetigt; v++) {'],
  ['M42 Rückweg gilt ohne Rücklesen als bestätigt', 'bestaetigt = w.ok;', 'bestaetigt = true;'],
  ['M43 Rückweg ignoriert die Seiten', 'const gut = bestaetigt && seitenOk !== false;', 'const gut = bestaetigt;'],
  ['M44 Rückweg: Exit-Code immer der Fehlercode', 'process.exit(ok ? code : 9); };', 'process.exit(code); };'],
  ['M45 Ausnahme nach dem Schreiben ohne Rückweg', "await abbruch(8, 'Ausnahme: ' + (e && e.message ? e.message : e));", "process.exit(8);"],
  ['M46 Signal ohne Rückweg', "if (!zustand.geschrieben || zustand.fertig) { console.error('Abbruch durch ' + s); process.exit(130); }", "if (true) { console.error('Abbruch durch ' + s); process.exit(130); }"],
  ['M47 geschrieben-Flag fehlt', "zustand.geschrieben = true;   // vor dem Aufruf", "zustand.geschrieben = false;   // vor dem Aufruf"],
  // --- Rücknahme ---
  ['M48 Rücknahme: fremder Stand wird überschrieben', "if (z === 'fremd' && !FREMD_OK) {", "if (false) {"],
  ['M49 Rücknahme im Ausgangsstand schreibt trotzdem', "if (z === 'alt') {", "if (false) {"],
  ['M50 Rücknahme: Soll nicht aus der Merkliste', 'if (merk) md5soll = merk.md5_soll;', 'if (false) md5soll = merk.md5_soll;'],
  ['M51 Rücknahme: Sicherung nicht gegen md5_vor geprüft', 'const sicherung = ladeSicherung(sichN, md5vor);', 'const sicherung = ladeSicherung(sichN, md5(readFileSync(HIER + "sicherung/" + sichN, "utf8")));'],
  ['M52 Rücknahme: Seiten nicht ausgewertet', 'ok = auswerten(await messen(pfade), null, { vorfehlerOk: VORFEHLER_OK }); }', 'await messen(pfade); ok = true; }'],
  ['M53 Merkliste: Pfad der Sicherung nicht geprüft', '|| !SICH_NAME.test(m.sicherung || \'\')) fail(4,', ') fail(4,'],
  ['M54 Merkliste: Prüfsummen nicht geprüft', "if (!/^[0-9a-f]{32}$/.test(m.md5_vor || '') || !/^[0-9a-f]{32}$/.test(m.md5_soll || '')", "if (false"],
  // --- Testvorlage ---
  ['M55 Testvorlage schreibt in die echte Vorlage', 'const u = await schreibe(TESTDATEI, testText);', 'const u = await schreibe(DATEI, testText);'],
  ['M56 Löschen trifft die echte Vorlage', 'const d = await loesche(TESTDATEI);', 'const d = await loesche(DATEI);'],
  ['M57 Testmarke fehlt in der Testvorlage', 'ersetzen(jetzt.content, blockLive, neu + TESTMARKE)', 'ersetzen(jetzt.content, blockLive, neu)'],
  ['M58 Testvorlage ohne ?view=lxtest geprüft', "m = await messen(produkte, 'lxtest');", 'm = await messen(produkte);'],
  ['M59 Testmarke wird nicht verlangt', 'ok = auswerten(m, vorMessung, { marke: true, vorfehlerOk: VORFEHLER_OK });', 'ok = auswerten(m, vorMessung, { marke: false, vorfehlerOk: VORFEHLER_OK });'],
  ['M60 kein Warten auf die Auslieferung der Testvorlage', 'Date.now() - t0 > 150000 * ZEIT) break;', 'true) break;'],
  ['M61 Löschung nicht abgewartet', 'const w = await warteBis(TESTDATEI, null, 150000);', 'const w = { ok: true };'],
  ['M62 Testvorlage-Rücklesen ohne Folge', "if (!w.ok) fail(6, 'Die API meldet für die Testvorlage", "if (false) fail(6, 'Die API meldet für die Testvorlage"],
  // --- Seiten ---
  ['M63 Produktnamen nicht geprüft', "let handles = (E.PRUEF_PRODUKTE || '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s));", "let handles = (E.PRUEF_PRODUKTE || '').split(',').map((s) => s.trim()).filter(Boolean);"],
  ['M64 Drosselung (429) nicht abgewartet', 'if (status === 429) {', 'if (false) {'],
  ['M65 HTTP-Status wird nicht geprüft', "if (m.status !== 200) p.push(m.netz || `HTTP ${m.status}`);", ""],
  ['M66 neue Liquid-Fehler werden nicht gemeldet', "if (neue.length) p.push('Liquid-Fehler: ' + neue[0]);", ""],
  ['M67 Zustand des Lieferblocks wird nicht verglichen', "if (vor && vor.art !== 'kein' && m.art !== vor.art) p.push(", "if (false) p.push("],
  ['M68 Liquid-Syntaxfehler nicht erkannt', "/Liquid (?:syntax )?error[^<\\n]{0,160}/gi", "/Liquid error[^<\\n]{0,160}/gi"],
  ['M69 bereits vorhandene Fehler zählen als neu', "const bekannt = vor ? vor.fehler : (opt.vorfehlerOk ? m.fehler : []);", "const bekannt = [];"],
  ['M70 VORFEHLER_OK ohne Wirkung', "const bekannt = vor ? vor.fehler : (opt.vorfehlerOk ? m.fehler : []);", "const bekannt = vor ? vor.fehler : [];"],
  ['M71 Seitenabruf ohne Zeitlimit-Wiederholung', 'for (let v = 0; v < 3; v++) {\n      try {', 'for (let v = 0; v < 1; v++) {\n      try {'],
  // --- Ausgabe ---
  ['M72 Diff-Statistik fehlt', "console.log('--- Diff-Statistik ---');", ''],
  ['M73 Byte-Vergleich nicht gemeldet', 'Byte-Vergleich bestanden)`);', 'Byte-Vergleich ausgelassen)`);'],
  ['M74 Hinweis auf den Rückweg fehlt', "console.log('Rückweg, falls nötig: ' + BEFEHL);", ''],
];

// Gleichwertige oder im Test nicht erzwingbare Mutanten (Begründung)
const G = [
  ['G1 Gegenprobe 1 (Byte-Vergleich ausserhalb) entfernt', "if (!neuText.startsWith(text.slice(0, i)) || !neuText.endsWith(danach) ||", "if (false && !neuText.startsWith(text.slice(0, i)) || !neuText.endsWith(danach) ||", 'Zusatz-Absicherung: der Text wird aus genau diesen Teilen gebaut, die Probe kann nur durch einen Fehler im Bau auslösen (M14 prüft den Bau)'],
  ['G2 Gegenprobe 2 (Struktur) entfernt', "if (JSON.stringify(vorher) !== JSON.stringify(nachher)) throw", "if (false) throw", 'Zusatz-Absicherung wie G1: ausser dem Blocktext kann sich durch den Bau nichts ändern'],
  ['G3 haltAn entfernt', "const haltAn = async () => { if (zustand.signal) await new Promise(() => {}); };", "const haltAn = async () => {};", 'schützt gegen einen Wettlauf (Hauptablauf meldet «Fertig», während der Rückweg läuft); im Test nicht deterministisch erzwingbar'],
  ['G4 zweites Signal während des Rückwegs wird nicht abgefangen', "if (zustand.imRueckweg || zustand.signal) {", "if (false) {", 'greift nur bei einem zweiten Signal innerhalb weniger Millisekunden'],
  ['G5 Fehlercode bei unerwarteter Ausnahme', "Number.isInteger(e && e.code) ? e.code : 1", "(e && e.code) || 1", 'process.exit mit Text wirft selbst und endet ebenfalls mit Exit 1'],
];

function bauen(mutiert) {
  const baum = fs.mkdtempSync(path.join(os.tmpdir(), 'lxmutat-'));
  for (const f of KOPIE) { fs.mkdirSync(path.dirname(path.join(baum, f)), { recursive: true }); fs.copyFileSync(path.join(WURZEL, f), path.join(baum, f)); }
  fs.writeFileSync(path.join(baum, PAKET, 'apply_theme.mjs'), mutiert);
  return baum;
}
function laufen(baum) {
  return new Promise((fertig) => {
    const k = spawn(process.execPath, [path.join(baum, PAKET, 'apply_theme_test.mjs')], { env: { PATH: process.env.PATH, HOME: process.env.HOME, FAILFAST: '1' } });
    let aus = ''; k.stdout.on('data', (d) => (aus += d)); k.stderr.on('data', (d) => (aus += d));
    const wache = setTimeout(() => k.kill('SIGKILL'), 240000);
    k.on('close', (code) => { clearTimeout(wache); fertig({ code, aus }); });
  });
}
function anwenden(von, zu) {
  const teile = SKRIPT.split(von);
  if (teile.length !== 2) return null;
  return teile[0] + zu + teile[1];
}

// Vorprobe: das unveränderte Skript muss bestehen
const v0 = bauen(SKRIPT); const r0 = await laufen(v0); fs.rmSync(v0, { recursive: true, force: true });
if (r0.code !== 0) { console.log('Das unveränderte Skript besteht den Test nicht:\n' + r0.aus.slice(-1500)); process.exit(2); }
console.log('Vorprobe: unverändertes Skript besteht (' + (r0.aus.match(/(\d+) Prüfungen/) || [])[1] + ' Prüfungen)');

const alle = [...M.map((m) => ({ name: m[0], von: m[1], zu: m[2], gleichwertig: false })), ...G.map((g) => ({ name: g[0], von: g[1], zu: g[2], gleichwertig: true, grund: g[3] }))];
const erg = new Array(alle.length); let naechster = 0;
async function arbeiter() {
  for (;;) {
    const i = naechster++; if (i >= alle.length) return;
    const a = alle[i], mut = anwenden(a.von, a.zu);
    if (mut === null) { erg[i] = { ...a, status: 'nicht anwendbar' }; continue; }
    if (mut === SKRIPT) { erg[i] = { ...a, status: 'nicht anwendbar (keine Änderung)' }; continue; }
    const baum = bauen(mut), r = await laufen(baum); fs.rmSync(baum, { recursive: true, force: true });
    const erster = (r.aus.split('\n').find((z) => z.includes('✗')) || r.aus.trim().split('\n').slice(-1)[0] || '').trim();
    erg[i] = { ...a, status: r.code !== 0 ? 'erkannt' : 'ÜBERLEBT', erster };
  }
}
await Promise.all([arbeiter(), arbeiter(), arbeiter(), arbeiter()]);

let erkannt = 0, ueberlebt = 0, nichtAnwendbar = 0, gleichUeberlebt = 0, gleichErkannt = 0;
for (const e of erg) {
  if (e.status === 'erkannt') { if (e.gleichwertig) gleichErkannt++; else erkannt++; }
  else if (e.status === 'ÜBERLEBT') { if (e.gleichwertig) gleichUeberlebt++; else ueberlebt++; }
  else nichtAnwendbar++;
  const marke = e.status === 'erkannt' ? 'erkannt  ' : e.status === 'ÜBERLEBT' ? (e.gleichwertig ? 'gleichwertig' : 'ÜBERLEBT ') : e.status;
  console.log(`${marke.padEnd(10)} ${e.name}${e.status === 'erkannt' ? '   <- ' + (e.erster || '').slice(0, 110) : e.gleichwertig && e.status === 'ÜBERLEBT' ? '   (' + e.grund + ')' : ''}`);
}
console.log(`\n${M.length} Mutanten: ${erkannt} erkannt, ${ueberlebt} überlebt, ${nichtAnwendbar} nicht anwendbar · gleichwertige/nicht erzwingbare: ${G.length} (überlebt ${gleichUeberlebt}, überraschend erkannt ${gleichErkannt})`);
process.exit(ueberlebt || nichtAnwendbar ? 1 : 0);
