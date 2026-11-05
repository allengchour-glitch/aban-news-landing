// Baut für ALLE Katalogprodukte die Modellkarte, klassifiziert sie und schreibt unterstuetzung.json (Aufgabe C, 05.11.2026). Nur lesen und rechnen, kein Netz.
// Lauf: KATALOG_DIR=<…/katalog> OUT=<…/unterstuetzung.json> [KARTEN_DIR=<Ordner für alle Modellkarten>] /opt/node22/bin/node unterstuetzung_bauen.mjs
// Ohne Angaben: Katalog und Ausgabe im Scratch der Sitzung (sg/katalog, sg/unterstuetzung.json); Karten werden nur mit KARTEN_DIR geschrieben (rund 20 MB).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { modellkarteBauen, unterstuetzungEintrag, KLASSEN } from './modellkarte.mjs';

const SG = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg';
const KATALOG_DIR = process.env.KATALOG_DIR || join(SG, 'katalog');
const OUT = process.env.OUT || join(SG, 'unterstuetzung.json');
const KARTEN_DIR = process.env.KARTEN_DIR || '';
if (KARTEN_DIR) mkdirSync(KARTEN_DIR, { recursive: true });

const dateien = readdirSync(KATALOG_DIR).filter((f) => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const produkte = [];
const unbekannteTitel = new Set();
for (const f of dateien) {
  const karte = modellkarteBauen(JSON.parse(readFileSync(join(KATALOG_DIR, f), 'utf8')));
  produkte.push(unterstuetzungEintrag(karte));
  for (const pl of karte.platzierungen) if (pl.titelDe === null) unbekannteTitel.add(pl.id);
  if (KARTEN_DIR) writeFileSync(join(KARTEN_DIR, `${karte.printfulProductId}.json`), JSON.stringify(karte));
}
const zaehle = (liste, feld) => Object.fromEntries(KLASSEN.map((k) => [k, liste.filter((p) => p[feld] === k).length]));
const nachCode = {};
for (const p of produkte) nachCode[p.grundCode] = (nachCode[p.grundCode] ?? 0) + 1;
const beispiele = {};
for (const k of KLASSEN) beispiele[k] = produkte.filter((p) => p.klasse === k).slice(0, 3).map((p) => `${p.id} ${p.titel}`);
const ausgabe = {
  erstellt: new Date().toISOString(), schema: 1, quelle: KATALOG_DIR,
  hinweis: 'klasse = endgültig (inkl. Lieferbarkeit EU), technischeKlasse = nur nach Druckgeometrie. nurUs: keine Variante in der EU bestellbar (in_stock/stocked_on_demand), aber in den USA «in_stock».',
  anzahl: produkte.length, verteilung: zaehle(produkte, 'klasse'), verteilungTechnisch: zaehle(produkte, 'technischeKlasse'),
  nachGrundCode: Object.fromEntries(Object.entries(nachCode).sort((a, b) => b[1] - a[1])),
  nurUs: produkte.filter((p) => p.nurUs).length, keinEu: produkte.filter((p) => p.keinEu).length,
  platzierungenOhneDeutschenTitel: [...unbekannteTitel].sort(), produkte,
};
writeFileSync(OUT, JSON.stringify(ausgabe, null, 1));
console.log(JSON.stringify({ anzahl: ausgabe.anzahl, verteilung: ausgabe.verteilung, verteilungTechnisch: ausgabe.verteilungTechnisch, nurUs: ausgabe.nurUs, keinEu: ausgabe.keinEu }, null, 1));
console.log('Gründe:', JSON.stringify(ausgabe.nachGrundCode, null, 1));
console.log('Beispiele:', JSON.stringify(beispiele, null, 1));
console.log('Platzierungen ohne deutschen Titel:', ausgabe.platzierungenOhneDeutschenTitel.length, ausgabe.platzierungenOhneDeutschenTitel.slice(0, 40).join(', '));
console.log('geschrieben:', OUT);
