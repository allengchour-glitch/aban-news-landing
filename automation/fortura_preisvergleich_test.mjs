#!/usr/bin/env node
/* Prueft die KETTE von fortura_preisvergleich.mjs ohne Netz und ohne Credits:
 * CSV lesen -> Haendlerseiten messen -> urteilen -> CSV schreiben.
 * Statt Firecrawl antwortet ein oertlicher Nachbau (FIRECRAWL_BASIS).
 *
 * Die Faelle sind so gewaehlt, dass die Mutationsprobe sie unterscheiden kann:
 * ZWEI Haendler mit verschiedenen Preisen (sonst ist "tiefster" nicht pruefbar) und
 * eine echte FEHLERANTWORT (sonst ist das Zaehlen der Credits nicht pruefbar).
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fpv-'));
const EIN = path.join(tmp, 'ein.csv');

fs.writeFileSync(EIN, [
  'handle,titel,preis,sku,schluesselArt,schluessel,lager,politik',
  'zauberstab,"Zauberstab 122 cm",33.90,fortura-52815,artikelnummer,52815,5,DENY',
  'ohne-treffer,"Artikel ohne Markt",48.00,fortura-90654-2,barcode,8003558065424,0,DENY',
  'fehler,"Artikel mit Haendlerfehler",29.90,fortura-77777,artikelnummer,77777,1,DENY',
].join('\n') + '\n');

let anfragen = 0;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', d => body += d);
  req.on('end', () => {
    anfragen++;
    const { url } = JSON.parse(body || '{}');
    // Firecrawl selbst antwortet mit einem Fehler - ein Credit ist trotzdem weg.
    if (/77777/.test(url)) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'scrape failed' }));
    }
    let markdown = 'Keine Treffer gefunden';
    if (/52815/.test(url)) {
      // Toppreise teurer als Galaxus -> der TIEFSTE muss gewinnen, nicht der erste.
      markdown = /toppreise/.test(url)
        ? 'Zauberstab 122 cm\nVersand CHF 7.00\nStatt CHF 39.00 nur CHF 24.90'
        : 'Zauberstab 122 cm\nCHF 14.90';
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { markdown } }));
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const basis = `http://127.0.0.1:${server.address().port}`;

// WICHTIG: spawn, nicht spawnSync - spawnSync blockiert den Event-Loop, dann kann der
// oertliche Server im selben Prozess die Anfragen des Kindes nie beantworten (Deadlock).
function lauf(env) {
  return new Promise((fertig) => {
    const k = spawn(process.execPath, ['automation/fortura_preisvergleich.mjs'],
      { env: { ...process.env, ...env } });
    let stdout = '', stderr = '';
    k.stdout.on('data', d => stdout += d);
    k.stderr.on('data', d => stderr += d);
    const frist = setTimeout(() => k.kill('SIGKILL'), 30000);
    k.on('close', (status) => { clearTimeout(frist); fertig({ status, stdout, stderr }); });
  });
}

// --- Lauf 1: beide Haendler, Deckel gross genug ---
const AUS = path.join(tmp, 'aus.csv');
const r = await lauf({ FIRECRAWL_API_KEY: 'test', FIRECRAWL_BASIS: basis,
                       EIN, AUS, NUR: '0', MAX_CREDITS: '20', HAENDLER: 'toppreise,galaxus' });
assert.equal(r.status, 0, `Lauf fehlgeschlagen:\n${r.stdout}\n${r.stderr}`);

const zeilen = fs.readFileSync(AUS, 'utf8').trim().split('\n');
assert.equal(zeilen.length, 4, `Kopf + 3 Zeilen erwartet, waren ${zeilen.length}`);

const zs = zeilen.find(z => z.startsWith('zauberstab,'));
// M3: der TIEFSTE der beiden Haendlerpreise (14.90 bei galaxus), nicht 24.90.
assert.ok(/,14\.9,galaxus,/.test(zs), `tiefster Preis 14.90 von galaxus erwartet: ${zs}`);
assert.ok(/,2\.28,teurer,/.test(zs), `Faktor 2.28 und "teurer" erwartet: ${zs}`);
// Die Versandpauschale CHF 7.00 stand auf derselben Seite und darf NICHT der Preis sein.
assert.ok(!/,7,/.test(zs), `Versandkosten als Preis genommen: ${zs}`);

const ot = zeilen.find(z => z.startsWith('ohne-treffer,'));
assert.ok(/unbekannt/.test(ot), `"unbekannt" erwartet: ${ot}`);
assert.ok(!/im_rahmen/.test(ot), `fehlgeschlagene Messung gilt als Freigabe: ${ot}`);

const fe = zeilen.find(z => z.startsWith('fehler,'));
assert.ok(/unbekannt/.test(fe), `Haendlerfehler muss "unbekannt" ergeben: ${fe}`);
assert.ok(/HTTP 500/.test(fe), `der Grund muss im Hinweis stehen: ${fe}`);

// 3 Artikel x 2 Haendler = 6 Abrufe (auch der fehlerhafte wird bei beiden versucht).
assert.equal(anfragen, 6, `6 Abrufe erwartet, waren ${anfragen}`);
// M1: Firecrawl verbraucht auch bei Fehlerseiten - alle 6 muessen gezaehlt sein.
assert.ok(/verbrauchte Credits: 6/.test(r.stdout),
  `alle 6 Abrufe muessen zaehlen, auch die Fehlerantwort:\n${r.stdout}`);
assert.ok(/teurer: 1/.test(r.stdout) && /unbekannt: 2/.test(r.stdout),
  `Zusammenfassung falsch:\n${r.stdout}`);

// --- Lauf 2: M2 - der Credit-Deckel muss WIRKLICH bremsen (Server antwortet normal) ---
anfragen = 0;
const r2 = await lauf({ FIRECRAWL_API_KEY: 'test', FIRECRAWL_BASIS: basis,
                        EIN, AUS: path.join(tmp, 'a2.csv'), NUR: '0', MAX_CREDITS: '2',
                        HAENDLER: 'toppreise,galaxus' });
assert.equal(r2.status, 0, `Lauf 2 fehlgeschlagen:\n${r2.stdout}\n${r2.stderr}`);
assert.ok(anfragen <= 2, `Deckel 2 nicht eingehalten: ${anfragen} Abrufe`);
const c = r2.stdout.match(/verbrauchte Credits: (\d+)/);
assert.ok(c && Number(c[1]) <= 2, `Deckel 2 nicht eingehalten: ${c && c[1]}\n${r2.stdout}`);

// --- Lauf 3: ohne Schluessel ein No-op, der den GRUND nennt ---
const r3 = await lauf({ FIRECRAWL_API_KEY: '', FIRECRAWL_BASIS: basis,
                        EIN, AUS: path.join(tmp, 'a3.csv'), NUR: '0' });
assert.equal(r3.status, 0);
assert.ok(/No-op/.test(r3.stdout) && /Grund/.test(r3.stdout), `No-op muss den Grund nennen:\n${r3.stdout}`);
assert.ok(!fs.existsSync(path.join(tmp, 'a3.csv')), 'No-op darf keine CSV schreiben');

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('fortura_preisvergleich: 17 Prüfungen gruen (Kette, tiefster Preis, Fehlerantwort, Credit-Deckel, No-op)');
