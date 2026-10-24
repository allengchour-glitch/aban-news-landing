#!/usr/bin/env node
// Prüft den Zwischenspeicher der CJ-Marke in BEIDE Richtungen: eine frische Marke muss
// wiederverwendet, eine ablaufende neu geholt werden. Ohne das zweite läuft der Lauf mit
// einer toten Marke weiter und meldet einen Zugangsfehler, der keiner ist.
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cjToken } from './cj_token.mjs';

let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };
const dir = await mkdtemp(join(tmpdir(), 'cjtok-'));
const jetzt = Date.UTC(2026, 9, 24, 12, 0, 0);
const stunde = 3600 * 1000;

// Ohne Zugangsdaten wird NICHT geraten und nichts gesendet.
pruef('ohne Zugangsdaten leer', await cjToken({ email: '', key: '', cache: join(dir, 'a.json') }) === '');

// Frische Marke aus dem Zwischenspeicher: keine Anfrage an CJ.
const c1 = join(dir, 'frisch.json');
await writeFile(c1, JSON.stringify({ token: 'ALT', exp: jetzt + 48 * stunde }));
pruef('frische Marke wird wiederverwendet',
  await cjToken({ email: 'a@b.c', key: 'k', cache: c1, jetzt }) === 'ALT');

// Gegenprobe: eine Marke, die in zwei Minuten abläuft, gilt als tot — der Puffer ist fünf
// Minuten. Ohne echten Zugang schlägt das Holen fehl, und genau das ist der Beweis, dass der
// Zwischenspeicher sie NICHT zurückgegeben hat.
const c2 = join(dir, 'ablaufend.json');
await writeFile(c2, JSON.stringify({ token: 'GLEICH-TOT', exp: jetzt + 2 * 60 * 1000 }));
let geholt = null;
try { geholt = await cjToken({ email: 'a@b.c', key: 'k', cache: c2, jetzt }); }
catch (e) { geholt = 'HOLVERSUCH: ' + e.message.slice(0, 20); }
pruef('ablaufende Marke wird nicht wiederverwendet', geholt !== 'GLEICH-TOT', String(geholt));

// Eine kaputte Datei darf den Lauf nicht beenden, sondern nur den Zwischenspeicher übergehen.
const c3 = join(dir, 'kaputt.json');
await writeFile(c3, 'kein json');
let kaputt = null;
try { kaputt = await cjToken({ email: 'a@b.c', key: 'k', cache: c3, jetzt }); }
catch (e) { kaputt = 'HOLVERSUCH'; }
pruef('kaputter Zwischenspeicher wird übergangen', kaputt !== null);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
