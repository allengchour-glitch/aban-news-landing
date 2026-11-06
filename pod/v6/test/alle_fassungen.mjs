/**
 * Lässt jede Fassung des Editors durch dieselben drei Prüfreihen laufen (unit_test.mjs, editor_test.mjs, vorschau_test.mjs), nacheinander, und fasst die Zahlen zusammen.
 * Vorgabe: die Rücknahme 6.2.0 und die neue Fassung 6.2.1 (lib.mjs: FASSUNGEN). Nur die Prüfungen des Schlüssels der Druckdatei unterscheiden sich (6.2.1: «_Druckdatei (…)», 6.2.0: «🖼️ Druckdatei (…)»).
 *
 * Aufruf:  node alle_fassungen.mjs                         beide Fassungen, alle drei Reihen
 *          node alle_fassungen.mjs --ohne-browser          nur unit_test.mjs (ohne Chromium)
 *          node alle_fassungen.mjs <Datei> [<Datei> …]     genau diese Dateien (zum Beispiel die vom CDN ausgelieferte, minifizierte Fassung; dann V6_VERSION=<x.y.z> setzen,
 *                                                          wenn Dateiname und Inhalt die Version nicht verraten)
 * Umgebung: NODE_PATH muss auf die globalen Module zeigen (Playwright), V6_BILDCACHE und V6_PARSER werden an die Läufe weitergegeben. Es läuft immer nur EIN Chromium zugleich.
 */
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { hier, FASSUNGEN, v6VersionVon } from './lib.mjs';

const args = process.argv.slice(2);
const ohneBrowser = args.includes('--ohne-browser');
const dateien = args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));
const fassungen = dateien.length ? dateien : FASSUNGEN;
const reihen = ohneBrowser ? ['unit_test.mjs'] : ['unit_test.mjs', 'editor_test.mjs', 'vorschau_test.mjs'];

function lauf(skript, datei) {
  return new Promise((ok) => {
    const t0 = Date.now();
    const k = spawn(process.execPath, [join(hier, skript)], { env: { ...process.env, V6_DATEI: datei }, stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = '';
    k.stdout.on('data', (d) => { aus += d; }); k.stderr.on('data', (d) => { aus += d; });
    k.on('close', (code) => {
      const m = aus.match(/(\d+) Prüfungen bestanden/), f = aus.match(/(\d+) von (\d+) Prüfungen FEHLGESCHLAGEN/);
      const uebersprungen = (aus.match(/(\d+) Prüfungen gegen den Parser der Bestellstrecke übersprungen/) || [])[1] || '0';
      ok({ code, bestanden: m ? Number(m[1]) : null, fehl: f ? `${f[1]} von ${f[2]}` : null, uebersprungen: Number(uebersprungen), sekunden: Math.round((Date.now() - t0) / 1000), aus });
    });
  });
}

let schlecht = 0;
const zeilen = [];
for (const datei of fassungen) {
  let version = process.env.V6_VERSION || '?';
  try { version = process.env.V6_VERSION || v6VersionVon(datei); } catch { /* bleibt «?» */ }
  for (const skript of reihen) {
    const r = await lauf(skript, datei);
    const ok = r.code === 0 && r.bestanden !== null;
    if (!ok) { schlecht++; console.log(r.aus.split('\n').filter((z) => /✗|Error|FEHLGESCHLAGEN/.test(z)).slice(0, 12).join('\n')); }
    zeilen.push(`${ok ? 'ok ' : 'ROT'}  ${String(version).padEnd(6)} ${skript.padEnd(18)} ${ok ? String(r.bestanden).padStart(4) + ' Prüfungen' : (r.fehl || 'Exit ' + r.code).padStart(14)}${r.uebersprungen ? ` (+${r.uebersprungen} übersprungen: Parser kennt die Schlüssel nicht)` : ''}   ${r.sekunden} s   ${datei.split('/').pop()}`);
    console.log(zeilen[zeilen.length - 1]);
  }
}
console.log(`\n${schlecht ? schlecht + ' Reihe(n) ROT' : 'Alle Reihen grün'}  (${fassungen.length} Fassung(en) × ${reihen.length} Reihe(n))`);
process.exit(schlecht ? 1 : 0);
