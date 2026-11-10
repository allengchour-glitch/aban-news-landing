// Mutationsprobe für ablauf.mjs: jede Änderung muss den Test (test.mjs) rot machen. node dropship/seo-push-1011/mutation.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const hier = path.dirname(fileURLToPath(import.meta.url));
const orig = fs.readFileSync(path.join(hier, 'ablauf.mjs'), 'utf8');
const test = fs.readFileSync(path.join(hier, 'test.mjs'), 'utf8');
const M = [
  ['Vorbedingung ignoriert', "if (bad) return", "if (false) return"],
  ['Sicherung nicht geschrieben', "opts.sicherung.schreiben(sich);", ""],
  ['Rücklesen ignoriert', "if (diff.length) return { exit: 6", "if (false) return { exit: 6"],
  ['Produktzahl-Untergrenze weg', "q.productsCount >= 45 &&", ""],
  ['Produktzahl-Obergrenze weg', "&& q.productsCount <= 60", ""],
  ['Masken-Link immer', "maskenLink = ok;", "maskenLink = true;"],
  ['ruleSet-Vorbedingung weg', "kanon(live.ruleSet) !== kanon(v)) ab.push('ruleSet weicht ab')", "false) ab.push('ruleSet weicht ab')"],
  ['Body nicht ersetzt', "n.body = bodyNeu(z, live.body);", "n.body = live.body;"],
  ['Rücknahme ohne ruleSet', "if ('ruleSet' in z.felder_nachher) soll.ruleSet = r.ruleSet;", ""],
  ['Trockenlauf schreibt', "if (!opts.live) { log('Trockenlauf: nichts geschrieben.')", "if (false) { log('Trockenlauf: nichts geschrieben.')"],
  ['Anker-Zählung locker', "if (n !== 1) throw", "if (n < 1) throw"],
  ['SEO-Titel ohne Live-Rückfall (Produkt)', "return { id: z.gid, seo: { title: 'seoTitle' in soll ? soll.seoTitle : live.seoTitle", "return { id: z.gid, seo: { title: soll.seoTitle"],
  ['Handle-Prüfung weg', "if (live.handle !== z.handle) ab.push", "if (false) ab.push"],
  ['Hash-Prüfung weg', "if (sha256(nb) !== z.felder_nachher.body_sha256) ab.push", "if (false) ab.push"],
  ['Sicherung überschrieben', "if (!sich[k]) {", "if (true) {"],
  ['S7 nicht zurückgenommen', "await rueckwaerts(opts, [{ ...z, schritt: s }], sich);", ""],
  ['Maske ohne UND-Prüfung', "m.ruleSet.appliedDisjunctively === false &&", ""],
  ['Maske ohne Typ-Regel', "m.ruleSet.rules.some(r => r.column === 'TYPE' && r.condition === plan.maskeTyp) &&", ""],
  ['Entity-Normalisierung weg', "if (q[k] !== v && norm(q[k]) !== norm(v)) ab.push(k);", "if (q[k] !== v) ab.push(k);"],
];
let erkannt = 0, ueber = [];
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'seo-mut-'));
try {
  fs.writeFileSync(path.join(tmp, 'test.mjs'), test);
  for (const [name, a, b] of M) {
    if (orig.split(a).length - 1 !== 1) { console.log('NICHT ANWENDBAR', name); ueber.push(name + ' (nicht anwendbar)'); continue; }
    fs.writeFileSync(path.join(tmp, 'ablauf.mjs'), orig.replace(a, b));
    let rot = false; try { execFileSync(process.execPath, [path.join(tmp, 'test.mjs')], { stdio: 'pipe', timeout: 60000 }); } catch { rot = true; }
    if (rot) erkannt++; else { ueber.push(name); console.log('ÜBERLEBT', name); }
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(erkannt + ' von ' + M.length + ' Mutanten erkannt' + (ueber.length ? ', überlebt/nicht anwendbar: ' + ueber.join(' | ') : ''));
process.exit(ueber.length ? 1 : 0);
