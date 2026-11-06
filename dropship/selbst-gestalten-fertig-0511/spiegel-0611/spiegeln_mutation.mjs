// Mutationsprobe des Spiegelwerkzeugs: baut je Mutant eine Kopie von spiegeln.mjs, lässt spiegeln_test.mjs dagegen laufen und erwartet Rot. Exit 0 nur, wenn alle erkannt werden und keiner «nicht anwendbar» ist.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(dir + '/spiegeln.mjs', 'utf8'); const test = fs.readFileSync(dir + '/spiegeln_test.mjs', 'utf8');
const M = [
  ['Namensprüfung weg', "if (!NAME_RE.test(String(e.dateiname))) fehler.push", "if (false) fehler.push"],
  ['Quellenprüfung weg', "if (!QUELLE_RE.test(String(e.quelle))) fehler.push", "if (false) fehler.push"],
  ['Doppelte Namen erlaubt', "if (namen.has(e.dateiname)) fehler.push", "if (false) fehler.push"],
  ['Vorhandene werden neu hochgeladen', "if (schon[e.dateiname] && schon[e.dateiname].url) hochgeladen", "if (false) hochgeladen"],
  ['Trockenlauf schreibt', "if (!live) { fs.writeFileSync(path.join(out, 'hochgeladen.json')", "if (false) { fs.writeFileSync(path.join(out, 'hochgeladen.json')"],
  ['Typprüfung weg', "if (!/^image\\/(png|jpeg|webp|gif)$/.test(ct)) throw", "if (false) throw"],
  ['Grössenprüfung weg', "if (buf.length > MAX_BYTES) throw", "if (false) throw"],
  ['HTTP-Status ignoriert', "if (!r.ok) throw new Error(`Quelle HTTP", "if (false) throw new Error(`Quelle HTTP"],
  ['Rücknahme löscht auch Nicht-OK', "z[2] === 'OK' && NAME_RE", "NAME_RE"],
  ['Rücknahme ohne Namensmuster', "z[2] === 'OK' && NAME_RE.test(z[1]) &&", "z[2] === 'OK' &&"],
  ['Throttle ohne Wiederholung', "if (!/THROTTLED|Throttled|429|502|503|504|ECONNRESET|fetch failed/.test(String(e && e.message))) throw e;", "throw e;"],
  ['Throttle unbegrenzt wiederholen', "for (let v = 1; v <= versuche; v++)", "for (let v = 1; v <= 100000; v++)"],
  ['Stichprobe weg', "if (!m0 || !m1 || m0.b !== m1.b || m0.h !== m1.h) {", "if (false) {"],
  ['Bytes statt Abmessungen', "if (!m0 || !m1 || m0.b !== m1.b || m0.h !== m1.h) {", "if (sha(b) !== sha(probe.g.buf)) {"],
  ['Hinweis recodiert nicht gezählt', "res.recodiert = (res.recodiert || 0) + 1;", ""],
  ['PNG-Breite falsch gelesen', "b: buf.readUInt32BE(16), h: buf.readUInt32BE(20)", "b: buf.readUInt32BE(20), h: buf.readUInt32BE(16)"],
  ['JPEG-Maße vertauscht', "{ h: buf.readUInt16BE(i + 5), b: buf.readUInt16BE(i + 7) }", "{ b: buf.readUInt16BE(i + 5), h: buf.readUInt16BE(i + 7) }"],
  ['Doppelpunkt nicht erlaubt', "[A-Za-z0-9._~:\\/%+-]", "[A-Za-z0-9._~\\/%+-]"],
  ['Exit Abweichung ignoriert', "res.exit = res.abweichung.length ? 3 : res.fehlgeschlagen.length ? 4 : 0;", "res.exit = res.fehlgeschlagen.length ? 4 : 0;"],
  ['MAX_DATEIEN ignoriert', "if (eintraege.length > maxDateien) return", "if (false) return"],
  ['Fehler bei staged ignoriert', "if (ue.length || ziele.length !== gut.length) {", "if (false) {"],
  ['hochgeladen.json mit fehlgeschlagenen', "hochgeladen[g.e.dateiname] = s.url; res.neu++;", "hochgeladen[g.e.dateiname] = s.url; res.neu++; hochgeladen['x'+g.e.dateiname]=1;"],
  ['Auswahl nach Modell ignoriert', "return m.size ? plan.dateien.filter", "return false ? plan.dateien.filter"],
];
let erkannt = 0;
for (const [n, von, zu] of M) {
  if (!src.includes(von)) { console.log('? nicht anwendbar:', n); process.exit(1); }
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'spmut-')); fs.writeFileSync(d + '/spiegeln.mjs', src.replace(von, zu)); fs.writeFileSync(d + '/spiegeln_test.mjs', test);
  const r = spawnSync(process.execPath, [d + '/spiegeln_test.mjs'], { encoding: 'utf8', timeout: 60000 });
  const rot = r.status !== 0; if (rot) erkannt++; console.log(rot ? '✓ erkannt' : '✗ ÜBERLEBT', n);
}
console.log(erkannt + ' von ' + M.length + ' Mutanten erkannt');
process.exit(erkannt === M.length ? 0 : 1);
