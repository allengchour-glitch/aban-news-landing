// Mutationsprobe für patch.mjs + ablauf.mjs: jede Änderung muss einen der Tests (test.mjs, ablauf_test.mjs) rot machen.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const hier = path.dirname(fileURLToPath(import.meta.url));
const lies = f => fs.readFileSync(path.join(hier, f), 'utf8');
const M = [
  ['patch.mjs', 'T3 ohne Zustimmungs-Prüfung', "if(s||banner.style.display", "if(banner.style.display"],
  ['patch.mjs', 'T1 Mindestbreite weg', ".lsp6-chip{min-width:44px!important}\\n", ""],
  ['patch.mjs', 'T1 auch auf Desktop', "@media (max-width:600px)", "@media (max-width:6000px)"],
  ['patch.mjs', 'T2 alter Knopfname bleibt', "prüfst es mit «Druckvorschau prüfen» und legst es dort mit «Druckvorschau bestätigen und in den Warenkorb» ab", "legst es dort mit «🛒 Mit meinem Design in den Warenkorb» ab"],
  ['patch.mjs', 'T2 ohne Sperrseiten-Weiche', "product.description contains 'data-lspod-blocked'", "false"],
  ['patch.mjs', 'Anker-Prüfung </head> weg', "if (zaehle(text, '</head>') !== 1) throw", "if (false) throw"],
  ['patch.mjs', 'Rücknahme T1 lässt Block stehen', "return s.block ? text.split(s.block).join('') :", "return s.block ? text :"],
  ['patch.mjs', 'zustand ignoriert Doppelfund', "return a === 1 && n === 0 ? 'alt'", "return a >= 1 && n === 0 ? 'alt'"],
  ['ablauf.mjs', 'Sicherung nicht geschrieben', "try { sicherungSchreiben(jetzt); }", "try { 0; }"],
  ['ablauf.mjs', 'Rückweg bei Seitenfehler weg', "return rueckweg(sf === 'unmessbar' ? 9 : 7);", "return 0;"],
  ['ablauf.mjs', 'Änderung zwischen Lesen und Schreiben ignoriert', "if (!gleich(nochmal, jetzt)) {", "if (false) {"],
  ['ablauf.mjs', 'Rücklesen ignoriert', "if (!(await lesenBis(x => gleich(x, neu)))) {", "if (false) {"],
  ['ablauf.mjs', 'Theme-Id-Prüfung weg', "if (o.erwartetThemeId && o.themeId !== o.erwartetThemeId) {", "if (false) {"],
  ['ablauf.mjs', 'Liquid-Fehler nicht erkannt', "const liq = [e, g, s].some(x => /Liquid (syntax )?error/i.test(x.text));", "const liq = false;"],
  ['ablauf.mjs', 'Schreibfehler ohne Rückweg', "return rueckweg(5); }", "return 5; }"],
  ['ablauf.mjs', 'Trockenlauf schreibt', "if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }", ""],
];
let erkannt = 0; const uebrig = []; const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edth-mut-'));
try {
  for (const [datei, name, a, b] of M) {
    const o = lies(datei); if (o.split(a).length - 1 !== 1) { uebrig.push(name + ' (nicht anwendbar)'); console.log('NICHT ANWENDBAR', name); continue; }
    for (const f of ['patch.mjs', 'ablauf.mjs', 'test.mjs', 'ablauf_test.mjs']) fs.writeFileSync(path.join(tmp, f), f === datei ? o.replace(a, b) : lies(f));
    fs.mkdirSync(path.join(tmp, 'sicherung'), { recursive: true }); for (const f of fs.existsSync(path.join(hier, 'sicherung')) ? fs.readdirSync(path.join(hier, 'sicherung')) : []) fs.copyFileSync(path.join(hier, 'sicherung', f), path.join(tmp, 'sicherung', f));
    let rot = false; for (const t of ['test.mjs', 'ablauf_test.mjs']) { try { execFileSync(process.execPath, [path.join(tmp, t), ...(t === 'test.mjs' && process.env.LIQUIDJS ? [process.env.LIQUIDJS] : [])], { stdio: 'pipe', timeout: 60000 }); } catch { rot = true; } }
    if (rot) erkannt++; else { uebrig.push(name); console.log('ÜBERLEBT', name); }
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(erkannt + ' von ' + M.length + ' Mutanten erkannt' + (uebrig.length ? ', überlebt: ' + uebrig.join(' | ') : '')); process.exit(uebrig.length ? 1 : 0);
