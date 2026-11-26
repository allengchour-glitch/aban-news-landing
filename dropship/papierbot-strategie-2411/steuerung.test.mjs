import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { antwort, botName, BOTS } from './steuerung.mjs';
import { verarbeite } from './telegram_steuerung.mjs';
const mk = () => fs.mkdtempSync(os.tmpdir() + '/steu-');
const led = (d, k, eq) => fs.writeFileSync(`${d}/ledger-${k}.json`, JSON.stringify({ start: 1000, cash: eq, btc: 0, hold: {}, trades: 3, fees: 4, history: [{ date: '2026-11-25', equity: eq }] }));
const st = d => JSON.parse(fs.readFileSync(d + '/steuerung.json'));
let d = mk(); led(d, 'korb', 1100); led(d, 'donchian', 900);
assert.equal(botName('/Korb'), 'korb'); assert.equal(botName('btc'), 'btc-trend'); assert.equal(botName('x'), null); assert.equal(botName(''), null);
let t = antwort('/status', d); assert.match(t, /Korb: 1\D100\.00 \(\+10\.0 %\)/); assert.match(t, /Ausbruch: 900\.00 \(-10\.0 %\)/); assert.match(t, /Bitcoin-Trend: noch kein Ledger/);
t = antwort('/pause korb', d); assert.deepEqual(st(d).pausiert, ['korb']); assert.match(t, /Pausiert: Korb/);
assert.match(antwort('/status', d), /Korb \[PAUSE\]/);
antwort('/pause korb', d); assert.deepEqual(st(d).pausiert, ['korb'], 'doppelt pausieren aendert nichts');
antwort('/pause alle', d); assert.equal(st(d).pausiert.length, BOTS.length);
antwort('/weiter momentum', d); assert.ok(!st(d).pausiert.includes('momentum'));
antwort('/weiter alle', d); assert.deepEqual(st(d).pausiert, []);
assert.match(antwort('/pause', d), /Welcher Bot/); assert.match(antwort('/pause quatsch', d), /Unbekannter Bot/);
assert.deepEqual(st(d).pausiert, [], 'unbekannter Bot aendert nichts');
const t0 = Date.parse('2026-11-25T12:00:00Z');
antwort('/reset korb', d, t0); assert.ok(fs.existsSync(d + '/ledger-korb.json'), 'ohne /ja bleibt das Ledger');
t = antwort('/ja', d, t0 + 6 * 60000); assert.match(t, /Keine offene Rueckfrage/); assert.ok(fs.existsSync(d + '/ledger-korb.json'), 'abgelaufen: nichts passiert');
antwort('/reset korb', d, t0); t = antwort('/ja', d, t0 + 60000); assert.match(t, /zurueckgesetzt/);
assert.ok(!fs.existsSync(d + '/ledger-korb.json')); assert.ok(fs.readdirSync(d).some(f => f.startsWith('ledger-korb.json.alt-')), 'Sicherung da');
assert.ok(fs.existsSync(d + '/ledger-donchian.json'), 'andere Ledger unberuehrt');
assert.match(antwort('/ja', d, t0 + 61000), /Keine offene Rueckfrage/, 'Rueckfrage nur einmal gueltig');
antwort('/reset donchian', d, t0); antwort('/nein', d); assert.match(antwort('/ja', d, t0 + 1000), /Keine offene/); assert.ok(fs.existsSync(d + '/ledger-donchian.json'));
assert.match(antwort('/hilfe', d), /Befehle/); assert.match(antwort('/status@mein_bot', d), /Papier-Bots/);
d = mk(); const sent = [];
const send = async x => sent.push(x);
let off = await verarbeite([
  { update_id: 5, message: { chat: { id: 111 }, from: { id: 999 }, text: '/pause alle' } },
  { update_id: 6, message: { chat: { id: -100 }, from: { id: 111 }, text: '/pause alle' } },
  { update_id: 7, message: { chat: { id: 111 }, from: { id: 111 }, text: '/pause korb' } },
  { update_id: 8, message: { chat: { id: 111 }, from: { id: 111 } } }], 111, d, send);
assert.equal(off, 9); assert.equal(sent.length, 1); assert.deepEqual(st(d).pausiert, ['korb']);
assert.equal(await verarbeite([], 111, d, send), null);
console.log('ok Pruefungen Steuerung');
