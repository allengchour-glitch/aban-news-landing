#!/usr/bin/env node
/**
 * Abgleich Shop ↔ CJ, Teil 2: Auswertung der Rohdaten (auswahl_abgleich_sammeln.mjs). KEIN Netz, schreibt nur eine CSV.
 * Aufruf: ROH=/tmp/auswahl_abgleich_roh.jsonl AUS=/tmp/auswahl_abgleich.csv node automation/auswahl_abgleich.mjs
 * Ausgabe: Zusammenfassung je Befund (Zahl der Produkte, Schwere), Beispiele je Befund, CSV mit allen Produkten mit Befund ≥ mittel.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pruefeAbgleich, fasseZusammen, schwereRang } from './lib/auswahl_abgleich.mjs';

const ROH = process.env.ROH || '/tmp/auswahl_abgleich_roh.jsonl', AUS = process.env.AUS || '/tmp/auswahl_abgleich.csv';
const zeilen = readFileSync(ROH, 'utf8').split('\n').filter(Boolean).map((z) => JSON.parse(z));
const ergebnisse = zeilen.map((z) => {
  if (z.fehler) return { handle: z.handle, flags: [{ code: 'ABRUFFEHLER', schwere: 'info', text: z.fehler }] };
  if (z.shop === null) return { handle: z.handle, flags: [{ code: 'PRODUKT_FEHLT_IM_SHOP', schwere: 'hoch', text: 'Handle nicht gefunden' }] };
  const flags = pruefeAbgleich({ shop: z.shop, cj: z.cj, stock: z.stock || null });
  if (z.status && z.status !== 'ACTIVE') flags.push({ code: 'NICHT_AKTIV', schwere: 'info', text: z.status });
  return { handle: z.handle, titel: z.titel, flags, mitLager: !!z.stock };
});
const z = fasseZusammen(ergebnisse);
const mitLager = ergebnisse.filter((e) => e.mitLager).length;
console.log(JSON.stringify({ produkte: z.produkte, mitBefundMittelOderHoch: z.mitBefund, mitLagerdaten: mitLager }));
for (const [code, v] of Object.entries(z.je).sort((a, b) => schwereRang(b[1].schwere) - schwereRang(a[1].schwere) || b[1].n - a[1].n)) {
  const bsp = ergebnisse.filter((e) => e.flags.some((f) => f.code === code)).slice(0, 2).map((e) => `${e.handle}: ${e.flags.find((f) => f.code === code).text}`);
  console.log(`${v.schwere.padEnd(7)} ${String(v.n).padStart(5)}  ${code}\n          ${bsp.join('\n          ')}`);
}
const csv = ['handle;schwere;codes;texte', ...ergebnisse.filter((e) => e.flags.some((f) => schwereRang(f.schwere) >= 2)).map((e) =>
  [e.handle, e.flags.map((f) => f.schwere).sort((a, b) => schwereRang(b) - schwereRang(a))[0], e.flags.filter((f) => f.schwere !== 'info').map((f) => f.code).join('+'), e.flags.filter((f) => f.schwere !== 'info').map((f) => f.text.replace(/[;\n]/g, ' ')).join(' | ')].join(';'))];
writeFileSync(AUS, csv.join('\n') + '\n');
console.log(`CSV: ${AUS} (${csv.length - 1} Produkte mit Befund ≥ mittel)`);
