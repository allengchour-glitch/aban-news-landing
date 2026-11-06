// Mutationsprobe für apply.mjs: verändert je EINE Stelle des Skripts und prüft, ob apply_test.mjs rot wird. Überlebt ein Mutant, ist ein Test zu schwach
// (oder der Mutant gleichwertig: dann steht er unten in GLEICHWERTIG mit Begründung). Ein Muster, das nicht genau einmal vorkommt, ist ein Fehler der Probe selbst («nicht anwendbar»).
// Die Ausgangslage (unverändertes Skript) muss vorher grün sein.
//   node dropship/wp6-0611/theme/apply_mutation.mjs [--pruefen]        (läuft auf Kopien im Wegwerfordner, das Repo bleibt unberührt; 4 Läufe gleichzeitig)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '../../..');
const SKRIPT = fs.readFileSync(path.join(HIER, 'apply.mjs'), 'utf8');
const PAKET = 'dropship/wp6-0611/theme';
const KOPIE = ['automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs', PAKET + '/patches.mjs', PAKET + '/apply_test.mjs', PAKET + '/sicherung/snippets__cart-products.liquid.vor'];

// [Name, von (muss genau einmal vorkommen), zu]
const M = [
  // --- Eingaben ---
  ['A01 FREMD_UEBERSCHREIBEN beim Einspielen erlaubt', 'if (FREMD_OK && !ZURUECK) fail(1,', 'if (false) fail(1,'],
  ['A02 Cloud-Name nicht geprüft', 'cloud = pruefeCloud(E.VORSCHAU_CLOUD);', "cloud = E.VORSCHAU_CLOUD || '';"],
  ['A03 Merkliste: Ausgangsstand nicht geprüft', '|| merk.md5_vor !== MD5_VOR ||', '|| false ||'],
  ['A04 Merkliste: Datei nicht geprüft', 'merk.datei !== DATEI ||', 'false ||'],
  ['A05 Merkliste: Prüfsumme nicht geprüft', "!/^[0-9a-f]{32}$/.test(merk.md5_soll || '') ||", 'false ||'],
  ['A06 Sicherung im Repo fehlt: weiter', 'if (!existsSync(SICH_PFAD)) fail(4,', 'if (false) fail(4,'],
  ['A07 Sicherung nicht gegen MD5_VOR geprüft', 'if (md5(sicherung) !== MD5_VOR) fail(4,', 'if (false) fail(4,'],
  ['A08 mehrere MAIN-Themes hingenommen', 'if (themen.length !== 1) fail(1,', 'if (themen.length < 1) fail(1,'],
  ['A09 Zugangsdaten nicht geprüft', "if (!SHOP || !E.SHOPIFY_CLIENT_ID || !E.SHOPIFY_CLIENT_SECRET) fail(1,", 'if (false) fail(1,'],
  ['A10 Prüfsumme fehlt: weiter', 'if (!jetzt.md5) fail(4,', 'if (false) fail(4,'],
  ['A11 Datei fehlt: weiter', 'if (!jetzt) fail(4, DATEI', 'if (false) fail(4, DATEI'],
  // --- Ausgangsstand ---
  ['B01 «schon eingespielt» nicht erkannt', 'if (jetzt.md5 === md5Soll) fail(3,', 'if (false) fail(3,'],
  ['B02 Ausgangsstand nicht geprüft', 'if (jetzt.md5 !== MD5_VOR) {\n    const spur', 'if (false) {\n    const spur'],
  ['B03 Marke ohne Soll als Ausgangsstand-Abweichung (4 statt 3)', "fail(jetzt.content.includes(MARKE) ? 3 : 4,", 'fail(4,'],
  ['B04 Trockenlauf misst die Seiten ohne Aufforderung', 'if (!LIVE && !PRUEFEN && !WARENKORB) {', 'if (false) {'],
  ['B05 Seiten vorher nicht ausgewertet', 'if (!vorOk && LIVE) fail(4,', 'if (false) fail(4,'],
  ['B06 Warenkorb-Probe vorher nicht ausgewertet', 'if (!vorWk.ok && LIVE) fail(4,', 'if (false) fail(4,'],
  ['B07 Trockenlauf-Exit immer 0', 'process.exit(vorOk && vorWk.ok ? 0 : 4);', 'process.exit(0);'],
  ['B08 Datei vor dem Schreiben nicht nochmal gelesen', 'if (!nochmal || nochmal.md5 !== jetzt.md5) fail(4,', 'if (false) fail(4,'],
  ['B09 Merkliste nicht geschrieben', 'writeFileSync(MERKLISTE, JSON.stringify({ erstellt', 'void (JSON.stringify({ erstellt'],
  ['B10 Merkliste ohne Cloud', 'md5_soll: md5Soll, cloud, hinweis', "md5_soll: md5Soll, cloud: '', hinweis"],
  // --- Schreiben und Rücklesen ---
  ['C01 geschrieben-Flag fehlt (Signal ohne Rückweg)', 'zustand.geschrieben = true;   // vor dem Aufruf', 'zustand.geschrieben = false;   // vor dem Aufruf'],
  ['C02 userErrors ignoriert', "if (u.userErrors?.length) await abbruch(5,", 'if (false) await abbruch(5,'],
  ['C03 Rücklesen: erste Antwort genügt', 'if (letzter === soll) return { ok: true, md5: letzter };', 'return { ok: true, md5: letzter };'],
  ['C04 Rücklesen: keine Geduld', 'if (Date.now() - t0 > maxMs * ZEIT) return { ok: false, md5: letzter };', 'if (Date.now() - t0 >= 0) return { ok: false, md5: letzter };'],
  ['C05 Rücklesen weicht ab: kein Rückweg', "if (!w.ok) await abbruch(6,", 'if (false) await abbruch(6,'],
  ['C06 nur eine Prüfrunde nach dem Einspielen', 'for (let runde = 1; runde <= RUNDEN; runde++)', 'for (let runde = 1; runde <= 1; runde++)'],
  ['C07 Seitenprüfung nachher ohne Folge', "if (!ok) await abbruch(7, 'Seitenprüfung nach dem Einspielen fehlgeschlagen');", ''],
  ['C08 Warenkorb-Probe nachher ohne Folge', "if (!nachWk.ok) await abbruch(7,", 'if (false) await abbruch(7,'],
  ['C09 Ausnahme nach dem Schreiben ohne Rückweg', "await abbruch(8, 'Ausnahme: ' + (e && e.message ? e.message : e));", 'process.exit(8);'],
  ['C10 Seiten nachher gegen nichts verglichen', "ok = auswerten(await messen(pfade), vorMessung, {}) && ok;", "ok = auswerten(await messen(pfade), null, {}) && ok;"],
  ['C11 Rücklesen ohne Wartezeit-Skalierung unbrauchbar (Geduld 0)', 'const w = await warteBis(md5Soll, 150000);', 'const w = await warteBis(md5Soll, 0);'],
  // --- Rückweg ---
  ['D01 Rückweg nur ein Versuch', 'for (let v = 1; v <= 3 && !bestaetigt; v++) {', 'for (let v = 1; v <= 1 && !bestaetigt; v++) {'],
  ['D02 Rückweg gilt ohne Rücklesen als bestätigt', 'bestaetigt = w.ok;', 'bestaetigt = true;'],
  ['D03 Rückweg ignoriert die Seiten', 'const gut = bestaetigt && seitenOk !== false;', 'const gut = bestaetigt;'],
  ['D04 Rückweg: Exit-Code immer der Fehlercode', 'process.exit(gut ? code : 9);', 'process.exit(code);'],
  ['D05 Rückweg schreibt immer (auch im Ausgangsstand)', 'if (!cur || cur.md5 !== MD5_VOR) {\n          // Eine Datei', 'if (true) {\n          // Eine Datei'],
  ['D06 Rückweg hält den Fremdstand nicht fest', 'if (cur && cur.content != null && cur.md5 !== md5Soll) {', 'if (false) {'],
  ['D07 Rückweg schreibt nicht', 'const u = await schreibe(sicherung);\n          if (u.userErrors?.length) console.error(', 'const u = { userErrors: [] };\n          if (u.userErrors?.length) console.error('],
  ['D08 Signal ohne Rückweg', "if (!zustand.geschrieben || zustand.fertig || zustand.imRueckweg) {", 'if (true) {'],
  ['D09 Signal: Exit-Code 0', "abbruch(130, 'Signal '", "abbruch(0, 'Signal '"],
  ['D10 Rückweg nicht bestätigt: Meldung fehlt', "if (!bestaetigt) console.error(`RÜCKWEG NICHT BESTÄTIGT.", "if (false) console.error(`RÜCKWEG NICHT BESTÄTIGT."],
  // --- Seiten ---
  ['E01 HTTP-Status nicht geprüft', "if (m.status !== 200) p.push(m.netz || `HTTP ${m.status}`);\n  const bekannt", "const bekannt"],
  ['E02 neue Liquid-Fehler ignoriert', 'if (neue.length) p.push(', 'if (false) p.push('],
  ['E03 Bekannte Fehler gelten als neu', 'const bekannt = vor ? vor.fehler : (opt.vorfehlerOk ? m.fehler : []);', 'const bekannt = [];'],
  ['E04 Zahl der Hüllen nicht verglichen', 'if (vor && m.status === 200 && m.huellen !== vor.huellen) p.push(', 'if (false) p.push('],
  ['E05 Hülle auf der Startseite nicht erwartet', "if (!vor && m.status === 200 && opt.huellenErwartet && m.huellen < 1) p.push(", 'if (false) p.push('],
  ['E06 sichtbarer Unterstrich-Name nicht gemeldet (Seiten)', "if (m.verraet) p.push('ein Name einer Unterstrich-Eigenschaft steht im sichtbaren Text');\n  return p;\n}\n// Warenkorb-Probe", "return p;\n}\n// Warenkorb-Probe"],
  ['E07 Miniaturzahl der Warenkorb-Probe nicht geprüft', 'if (m.miniaturen !== erwartet) p.push(', 'if (false) p.push('],
  ['E08 Adresse im sichtbaren Text nicht gemeldet', "if (m.adresseSichtbar) p.push(", 'if (false) p.push('],
  ['E09 Design-Zeile nicht geprüft', "if (!m.designZeile) p.push(", 'if (false) p.push('],
  ['E10 Wegwerf-Zeile nicht geprüft', "if (!m.zeileDa) p.push(", 'if (false) p.push('],
  ['E11 Skript und Stil zählen als sichtbarer Text', "replace(/<(script|style)\\b[\\s\\S]*?<\\/\\1>/gi, ' ').", ''],
  ['E12 Attribute zählen als sichtbarer Text', ".replace(/<[^>]*>/g, ' ')", ".replace(/<\\/?[a-z]+/gi, ' ')"],
  ['E13 Liquid-Syntaxfehler nicht erkannt', 'Liquid (?:syntax )?error', 'Liquid error'],
  // --- Warenkorb-Probe ---
  ['F01 Probe läuft ohne Aufforderung', "if (!WARENKORB) return { ok: true, uebersprungen: true };", ''],
  ['F02 Wegwerf-Warenkorb wird nicht geleert', "try { await post('/cart/clear.js', {}); }", "try { await 0; }"],
  ['F03 nur das erste Cookie', "if (i > 0) jar.set(", "if (i > 0 && !jar.size) jar.set("],
  ['F04 Standard-Vorschau auch mit fester Cloud', "(cloud ? '' : 'https://res.cloudinary.com/demo/image/upload/sample.jpg')", "'https://res.cloudinary.com/demo/image/upload/sample.jpg'"],
  ['F05 Varianten-ID nicht geprüft', "if (!/^\\d{5,20}$/.test(E.PRUEF_VARIANTE || '')) fail(1,", 'if (false) fail(1,'],
  ['F06 Add-Fehler nicht erkannt', 'if (!add.ok) return', 'if (false) return'],
  ['F07 Warenkorb-Eigenschaft _vorschau fehlt', "_pod_karte: '{\"v\":6}', _vorschau: PRUEF_URL }", "_pod_karte: '{\"v\":6}' }"],
  ['F08 Probe ohne Cookie-Glas (Wegwerf-Warenkorb nicht isoliert)', "...(extra.cookie ? { Cookie: extra.cookie } : {}) }", " }"],
  // --- Rücknahme ---
  ['G01 Rücknahme im Ausgangsstand schreibt trotzdem', "if (z === 'alt') {", 'if (false) {'],
  ['G02 Rücknahme: Fremdstand wird überschrieben', "if (z === 'fremd' && !FREMD_OK) {", 'if (false) {'],
  ['G03 Rücknahme: Fremdstand nicht festgehalten', "if (z === 'fremd') { mkdirSync(", 'if (false) { mkdirSync('],
  ['G04 Rücknahme: Soll nicht aus der Merkliste', 'const sollJetzt = merk ? merk.md5_soll : md5Soll;', 'const sollJetzt = md5Soll;'],
  ['G05 Rücknahme: userErrors ignoriert', "if (u.userErrors?.length) fail(5, 'userErrors: '", "if (false) fail(5, 'userErrors: '"],
  ['G06 Rücknahme: Rücklesen nicht ausgewertet', "if (!w.ok) fail(6, 'Die API meldet", "if (false) fail(6, 'Die API meldet"],
  ['G07 Rücknahme: Seiten nicht ausgewertet', 'process.exit(ok ? 0 : 7);\n  }\n\n  // ---------- Einspielen', 'process.exit(0);\n  }\n\n  // ---------- Einspielen'],
  ['G08 Rücknahme schreibt im Trockenlauf', "if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }\n    if (z === 'fremd')", "if (false) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }\n    if (z === 'fremd')"],
  ['G09 Rücknahme: Cloud nicht aus der Merkliste', 'if (ZURUECK && merk) cloud = merk.cloud;', ''],
  ['G10 Einspielen schreibt im Trockenlauf', "if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(vorOk", "if (false) { console.log('Trockenlauf, nichts geschrieben'); process.exit(vorOk"],
];

// Gleichwertige Mutanten (kein sichtbarer Unterschied im Verhalten, das der Test mit einer Attrappe sehen kann): keine
const GLEICHWERTIG = {};

function ersetze(text, von, zu) {
  const teile = text.split(von);
  if (teile.length !== 2) return { fehler: `Muster kommt ${teile.length - 1}× vor (erwartet 1×)` };
  return { text: teile.join(zu) };
}
function lauf(dir) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(dir, PAKET, 'apply_test.mjs')], { env: { PATH: process.env.PATH, HOME: process.env.HOME }, stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = ''; p.stdout.on('data', (d) => { aus += d; }); p.stderr.on('data', (d) => { aus += d; });
    const t = setTimeout(() => p.kill('SIGKILL'), 280000);
    p.on('exit', (code) => { clearTimeout(t); resolve({ code, aus }); });
  });
}
function kopie(skriptText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lxwp6mut-'));
  for (const f of KOPIE) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.copyFileSync(path.join(WURZEL, f), path.join(dir, f)); }
  fs.writeFileSync(path.join(dir, PAKET, 'apply.mjs'), skriptText);
  return dir;
}

// --pruefen: nur prüfen, dass jedes Muster noch genau einmal im Quelltext vorkommt (schnell, für die CI); die volle Probe läuft von Hand
if (process.argv.includes('--pruefen')) {
  const schlecht = M.map(([name, von, zu]) => [name, ersetze(SKRIPT, von, zu)]).filter(([, m]) => m.fehler || m.text === SKRIPT);
  for (const [name, m] of schlecht) console.log('nicht anwendbar', name, m.fehler || 'Mutant gleich Original');
  console.log(`${M.length} Mutanten, ${M.length - schlecht.length} anwendbar, ${schlecht.length} nicht anwendbar`);
  process.exit(schlecht.length ? 1 : 0);
}

// Ausgangslage grün?
{
  const dir = kopie(SKRIPT); const r = await lauf(dir); fs.rmSync(dir, { recursive: true, force: true });
  if (r.code !== 0) { console.error('Ausgangslage ist NICHT grün: Mutationsprobe abgebrochen\n' + r.aus.split('\n').slice(-12).join('\n')); process.exit(2); }
  console.log('Ausgangslage grün:', (r.aus.match(/\d+ Prüfungen, 0 Fehler/) || ['?'])[0]);
}

const ergebnis = [];
let naechster = 0;
async function arbeiter() {
  for (;;) {
    const i = naechster++; if (i >= M.length) return;
    const [name, von, zu] = M[i];
    const m = ersetze(SKRIPT, von, zu);
    if (m.fehler) { ergebnis.push({ name, status: 'nicht anwendbar', info: m.fehler }); continue; }
    if (m.text === SKRIPT) { ergebnis.push({ name, status: 'nicht anwendbar', info: 'Mutant gleich Original' }); continue; }
    const dir = kopie(m.text); let r = await lauf(dir);
    // «erkannt» zählt nur mit einer fehlgeschlagenen Prüfung (✗). Ein Lauf ohne ✗ (Absturz, Zeitlimit) wird wiederholt: scheitert er wieder, ist es ein Absturz des Mutanten (deterministisch), sonst war es ein Zufallsfehler
    let abs = false;
    if (r.code !== 0 && !r.aus.includes('✗')) { const r2 = await lauf(dir); abs = r2.code !== 0 && !r2.aus.includes('✗'); r = r2; if (!abs && r.code === 0) { ergebnis.push({ name, status: 'unklar', info: 'erster Lauf ohne Prüfungsfehler gescheitert, zweiter grün (Zufallsfehler?)' }); fs.rmSync(dir, { recursive: true, force: true }); continue; } }
    fs.rmSync(dir, { recursive: true, force: true });
    const rot = r.code !== 0;
    const grund = rot ? (abs ? 'Absturz: ' : '') + (r.aus.split('\n').find((z) => z.includes('✗')) || r.aus.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 150) : '';
    ergebnis.push({ name, status: rot ? 'erkannt' : (GLEICHWERTIG[name] ? 'gleichwertig' : 'ÜBERLEBT'), info: rot ? grund : (GLEICHWERTIG[name] || '') });
  }
}
await Promise.all(Array.from({ length: 4 }, arbeiter));
ergebnis.sort((a, b) => a.name.localeCompare(b.name));
for (const e of ergebnis) console.log(`${e.status.padEnd(15)} ${e.name}${e.info ? '  ← ' + e.info : ''}`);
const zaehl = (s) => ergebnis.filter((e) => e.status === s).length;
console.log(`\n${M.length} Mutanten: ${zaehl('erkannt')} erkannt, ${zaehl('gleichwertig')} gleichwertig, ${zaehl('ÜBERLEBT')} überlebt, ${zaehl('unklar')} unklar, ${zaehl('nicht anwendbar')} nicht anwendbar`);
process.exit(zaehl('ÜBERLEBT') || zaehl('nicht anwendbar') || zaehl('unklar') ? 1 : 0);
