import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const datei = fileURLToPath(new URL('./create_pod_line.mjs', import.meta.url));
const quelle = readFileSync(datei, 'utf8');

const pruefungen = [];
function pruefe(name, fn) {
  try { fn(); pruefungen.push(name); console.log(`ok   ${name}`); }
  catch (fehler) { console.error(`FAIL ${name}: ${fehler.message}`); process.exitCode = 1; }
}

pruefe('Tassenwerte verwenden belegte Schweizer Volumenangaben bei unveränderten Printful-IDs und Preisen', () => {
  assert.match(quelle, /sizes:\[\['325 ml \(Standard\)','1320','16\.90'\],\['444 ml \(Gross\)','4830','19\.90'\]\]/);
  assert.match(quelle, /'325 ml oder 444 ml'/);
});

pruefe('sichtbare Generator-Copy enthält keine alten oz-, On-demand- oder All-Over-Texte', () => {
  assert.doesNotMatch(quelle, /\b(?:11|15) oz\b|On-demand|All-Over/);
  assert.match(quelle, /Auf Bestellung in Europa gedruckt/);
  assert.match(quelle, /Rundumdruck/);
});

pruefe('neue SEO-Copy verwendet die bewusste öffentliche Gratisversand-Schwelle CHF 50', () => {
  assert.doesNotMatch(quelle, /Gratis-Versand ab CHF 65/);
  assert.match(quelle, /Gratis-Versand ab CHF 50/);
});

pruefe('deutsche Kunden-Copy nennt das Gestaltungswerkzeug statt Editor', () => {
  assert.match(quelle, /direkt hier im Gestaltungswerkzeug/);
  assert.match(quelle, /Gestaltungswerkzeug inklusive/);
});

if (!process.exitCode) console.log(`\n${pruefungen.length} Prüfungen bestanden`);
