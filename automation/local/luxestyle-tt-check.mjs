/**
 * luxestyle-tt-check.mjs — «Jetzt posten»-Bruecke (31.08.2026).
 * Laeuft alle 10 Minuten per geplanter Aufgabe (befehl.cmd laedt dieses Skript
 * vorher frisch vom CDN — Aenderungen kommen also ohne Zutun des Betreibers an).
 *
 * Es holt tiktok_befehl.json vom Shopify-CDN. Steht dort ein NEUER Befehl
 * (id noch nicht in befehl_done.txt), startet es den Poster mit SOFORT=1 und
 * ONLY=<slug>. Bremsen: jeder Befehl laeuft hoechstens 3-mal an (danach
 * «aufgegeben»), ein Befehl aelter als 6 h verfaellt (PC war aus — Stunden
 * spaeter zu posten waere nicht mehr «jetzt»), STOPP.txt und die Slug-Dedup
 * des Posters gelten unveraendert.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BEFEHL_URL = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/tiktok_befehl.json';
const MARKER = path.join(DIR, 'befehl_done.txt');
const LEDGER = path.join(DIR, 'tiktok_done.txt');
const POSTER = path.join(DIR, 'luxestyle-tt-post.mjs');
const START_BROWSER = path.join(DIR, 'start-browser.cmd');
const log = (...a) => console.log(new Date().toISOString().slice(0, 19), ...a);

let b;
try {
  const r = await fetch(BEFEHL_URL + '?v=' + Date.now() /* nur ?v= bustet den Shopify-CDN-Cache */);
  if (!r.ok) process.exit(0);
  b = await r.json();
} catch { process.exit(0); }
if (!b || !b.id || !b.slug) process.exit(0);

const marker = fs.existsSync(MARKER) ? fs.readFileSync(MARKER, 'utf8') : '';
const zeilen = marker.split('\n').filter(Boolean);
const eintrag = zeilen.filter(z => z.startsWith(b.id + '\t')).pop();
const status = eintrag ? eintrag.split('\t')[1] : '';
if (status === 'ok' || status === 'aufgegeben' || status === 'verfallen') process.exit(0);
const versuche = zeilen.filter(z => z.startsWith(b.id + '\t')).length;

if (Date.now() - Date.parse(b.id) > 6 * 3600 * 1000) {
  fs.appendFileSync(MARKER, `${b.id}\tverfallen\n`);
  log('Befehl', b.id, 'ist aelter als 6 h — verfallen (PC war wohl aus).');
  process.exit(0);
}
if (versuche >= 3) {
  fs.appendFileSync(MARKER, `${b.id}\taufgegeben\n`);
  log('Befehl', b.id, 'nach 3 Versuchen aufgegeben — log.txt lesen.');
  process.exit(0);
}
fs.appendFileSync(MARKER, `${b.id}\tversuch${versuche + 1}\n`);
log('Neuer Befehl:', b.id, '→', b.slug, `(Versuch ${versuche + 1}/3)`);

// Browser sicherstellen (der 17:28-Task laeuft nur einmal taeglich).
let offen = false;
try { offen = (await fetch('http://127.0.0.1:9222/json/version')).ok; } catch {}
if (!offen && fs.existsSync(START_BROWSER)) {
  log('Browser laeuft nicht — starte Bot-Browser …');
  spawn('cmd', ['/c', START_BROWSER], { detached: true, stdio: 'ignore' }).unref();
  await new Promise(r => setTimeout(r, 15000));
}

try {
  execFileSync(process.execPath, [POSTER],
    { env: { ...process.env, SOFORT: '1', ONLY: b.slug }, stdio: 'inherit' });
} catch { /* Erfolg entscheidet das Ledger, nicht der Exit-Code */ }

const ledger = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8') : '';
if (ledger.split('\n').some(z => z.split('\t')[1] === b.slug)) {
  fs.appendFileSync(MARKER, `${b.id}\tok\n`);
  log('✅ Befehl ausgefuehrt:', b.slug);
} else {
  log('Noch nicht gepostet — naechster Versuch in ~10 Minuten.');
}
