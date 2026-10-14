// review_doppel_test.mjs — prüft das Importer-Tor (automation/lib/review_doppel.mjs) ohne Netz und ohne den Importer zu starten.
// Teil A: 6 Entscheid-Fälle (Pflicht). Teil B: Lauf-Sperre (O_EXCL, lebende/verwaiste/fremde PID).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { aehnlichkeit, torEntscheid, AEHNLICH, laufSperre, prozessLaeuft }
  from './review_doppel.mjs';

let fehler = 0;
const pruefe = (name, ok, info = '') => { if (!ok) fehler++; console.log(`  ${ok ? 'OK ' : 'XX '} ${name}${info ? ' — ' + info : ''}`); };

console.log(`A. Entscheid (AEHNLICH = ${AEHNLICH})`);
const vorhanden = [
  { id: 101, rating: 5, body: 'Sehr einfach zu installieren und stabil.', curated: 'ok', published: true },
  { id: 102, rating: 4, body: 'Die Farbe ist etwas heller als auf dem Bild.', curated: 'ok', published: true },
  { id: 103, rating: 5, body: 'Great quality, my dog loves it!', curated: 'ok', published: true },   // früher unübersetzt gepostet
];
const sim1 = aehnlichkeit('Super einfach zu montieren und stabil.', 'Sehr einfach zu installieren und stabil.');

// 1. Neu übersetzte Kopie (gleiche Sterne) → überspringen
let t = torEntscheid([{ rating: 5, texte: ['Very easy to install and stable.', 'Super einfach zu montieren und stabil.'] }], vorhanden);
pruefe('1 neu übersetzte Kopie → überspringen', t.lesbar && t.posten.length === 0 && t.doppel[0]?.vorlage.id === 101,
  `Ähnlichkeit ${sim1.toFixed(3)} ≥ ${AEHNLICH}`);

// 2. Anderer Text (gleiche Sterne) → posten
t = torEntscheid([{ rating: 5, texte: ['The zipper broke after a week.', 'Der Reissverschluss ist nach einer Woche kaputtgegangen.'] }], vorhanden);
pruefe('2 anderer Text → posten', t.lesbar && t.posten.length === 1 && t.doppel.length === 0,
  `beste Ähnlichkeit ${Math.max(...vorhanden.map(v => aehnlichkeit('Der Reissverschluss ist nach einer Woche kaputtgegangen.', v.body))).toFixed(3)}`);

// 3. Gleicher Text, andere Sterne → posten
t = torEntscheid([{ rating: 3, texte: ['Very easy to install and stable.', 'Sehr einfach zu installieren und stabil.'] }], vorhanden);
pruefe('3 gleicher Text, andere Sterne (3 statt 5) → posten', t.lesbar && t.posten.length === 1 && t.doppel.length === 0);

// 4. Leere Liste (Judge.me hat noch nichts) → posten
t = torEntscheid([{ rating: 5, texte: ['Nice.', 'Schön.'] }, { rating: 2, texte: ['Bad.', 'Schlecht.'] }], []);
pruefe('4 leere Liste → beide posten', t.lesbar && t.posten.length === 2 && t.doppel.length === 0);

// 5. Lesefehler (null) → NICHTS posten
t = torEntscheid([{ rating: 5, texte: ['Neu und anders.', 'Neu und anders.'] }], null);
pruefe('5 Lesefehler → nichts posten', !t.lesbar && t.posten.length === 0);

// 6. Vorhandene Bewertung ist der unübersetzte ORIGINALTEXT, die neue Übersetzung weicht ab → über das Original erkannt
t = torEntscheid([{ rating: 5, texte: ['Great quality, my dog loves it!', 'Tolle Qualität, mein Hund liebt es!'] }], vorhanden);
pruefe('6 Original statt Übersetzung bei Judge.me → überspringen', t.lesbar && t.posten.length === 0 && t.doppel[0]?.vorlage.id === 103,
  `Übersetzung allein ${aehnlichkeit('Tolle Qualität, mein Hund liebt es!', vorhanden[2].body).toFixed(3)}, Original ${aehnlichkeit('Great quality, my dog loves it!', vorhanden[2].body).toFixed(3)}`);

// Zusatz: echte Paare aus dem Lese-Dump (Hunde-Winterjacke, Kopie ↔ Vorlage) und ein ausgeblendetes Original zählt mit
t = torEntscheid([{ rating: 5, texte: ['x', 'Warm, gut verarbeitet, mein Hund mag sie.'] }],
  [{ id: 41, rating: 5, body: 'Warm und gut verarbeitet, Hund mag sie.', curated: 'spam', published: false }]);
pruefe('7 ausgeblendete Vorlage (curated=spam) sperrt trotzdem', t.posten.length === 0);
// Gegenprobe: die Schwelle trägt — bei 0,70 rutschte Fall 1 (0,684) durch und würde gepostet
t = torEntscheid([{ rating: 5, texte: ['Very easy to install and stable.', 'Super einfach zu montieren und stabil.'] }], vorhanden, 0.7);
pruefe('Gegenprobe: mit Schwelle 0,70 würde Fall 1 gepostet (Test kann scheitern)', t.posten.length === 1);

console.log('\nB. Lauf-Sperre');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tor_test_'));
const lp = path.join(dir, 'x.lock');
let a = laufSperre(lp, { skript: 'cj_reviews_import.mjs' });
pruefe('8 freie Sperre wird genommen (O_EXCL)', a.ok && fs.readFileSync(lp, 'utf8').startsWith(String(process.pid)));
// eine zweite Instanz: Besitzer lebt und führt das Skript aus (Prüfung injiziert, eigene PID wäre sonst «verwaist»)
fs.writeFileSync(lp, '999999 jetzt\n');
let b = laufSperre(lp, { skript: 'cj_reviews_import.mjs', istAktiv: () => true });
pruefe('9 lebende andere Instanz → nicht starten', !b.ok && b.pid === 999999, b.grund);
fs.writeFileSync(lp, `${process.pid} jetzt\n`);
a.freigeben();
pruefe('10 freigeben löscht die EIGENE Sperre', !fs.existsSync(lp));
const c = laufSperre(lp, { skript: 'cj_reviews_import.mjs' });
fs.writeFileSync(lp, '999999 fremd\n');   // inzwischen von einer anderen Instanz übernommen
c.freigeben();
pruefe('10b freigeben lässt eine FREMDE Sperre liegen', c.ok && fs.readFileSync(lp, 'utf8').startsWith('999999'));
fs.unlinkSync(lp);
// verwaist: PID eines beendeten Prozesses
const tot = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout.trim();
fs.writeFileSync(lp, `${tot} früher\n`);
b = laufSperre(lp, { skript: 'cj_reviews_import.mjs' });
pruefe('11 verwaiste Sperre (PID tot) → entfernt und genommen', b.ok && fs.readFileSync(lp, 'utf8').startsWith(String(process.pid)), `tote PID ${tot}`);
b.freigeben();
// lebender Prozess, der das Skript ausführt (argv), und lebender FREMDER Prozess (PID neu vergeben)
const skriptDatei = path.join(dir, 'cj_reviews_import.mjs');
fs.writeFileSync(skriptDatei, 'setTimeout(() => {}, 20000);\n');
const echt = spawn(process.execPath, [skriptDatei], { stdio: 'ignore' });
const fremd = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 400));
pruefe('12 argv-Prüfung: node …/cj_reviews_import.mjs lebt → aktiv', prozessLaeuft(echt.pid, 'cj_reviews_import.mjs'));
pruefe('13 argv-Prüfung: fremder node-Prozess mit wiederverwendeter PID → nicht aktiv', !prozessLaeuft(fremd.pid, 'cj_reviews_import.mjs'));
fs.writeFileSync(lp, `${echt.pid} jetzt\n`);
b = laufSperre(lp, { skript: 'cj_reviews_import.mjs' });
pruefe('14 echte zweite Instanz hält die Sperre → nicht starten', !b.ok && b.pid === echt.pid, b.grund);
fs.writeFileSync(lp, `${fremd.pid} jetzt\n`);
b = laufSperre(lp, { skript: 'cj_reviews_import.mjs' });
pruefe('15 Sperre eines fremden Prozesses → verwaist, genommen', b.ok);
b.ok && b.freigeben();
fs.writeFileSync(lp, '');
b = laufSperre(lp, { skript: 'cj_reviews_import.mjs' });
pruefe('16 leere, frische Sperre (wird gerade angelegt) → nicht starten', !b.ok, b.grund);
echt.kill(); fremd.kill();
fs.rmSync(dir, { recursive: true, force: true });

console.log(`\nTOR-TEST: ${fehler ? fehler + ' Fehler' : 'ok'}`);
process.exit(fehler ? 1 : 0);
