#!/usr/bin/env node
/**
 * Zählt den Arbeitsstand aus den Ledgern (nur lesen) und schreibt ihn als JSON-Zeilen für die Fortschrittsseite.
 * Aufruf: node automation/fortschritt_daten.mjs [OUT=/tmp/fortschritt.json]
 * Jede Zahl nennt ihre Quelle (Ledger-Datei). «gesamt» ist null, wo der Umfang nicht gemessen ist — nie geschätzt.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const OUT = process.env.OUT || '/tmp/fortschritt.json';
const lies = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean) : [];
const zeitpunkt = new Date().toISOString();

const geschrieben = ledger => new Set(lies(ledger).map(z => z.split('·').map(s => s.trim())).filter(([h, , e]) => h && e === 'GESCHRIEBEN').map(([h]) => h));
const art = k => new Set(lies('dropship/kategorien_ledger.txt').map(z => z.split(' · ')).filter(t => (t[1] || '').split(' ')[0] === k).map(t => (t[1] || '').split(' ')[1]).filter(Boolean));

const ausw = geschrieben('dropship/cj_varianten_ledger.txt');
const kand = new Set(lies('/tmp/auswahl_kandidaten.csv').map(z => z.split(';')[0]));
const pool = new Set([...kand, ...ausw]);

const zeilen = [
  { id: 'auswahl', bereich: 'Farbe/Grösse nachgezogen', einheit: 'Produkte', fertig: ausw.size, gesamt: pool.size, quelle: 'cj_varianten_ledger.txt + Kandidatenliste vom Katalog-Scan', anmerkung: 'Einzelvarianten-Produkte mit CJ-Kennung; ein Teil führt bei CJ wirklich nur eine Variante und wird übersprungen' },
  { id: 'varbilder', bereich: 'Variantenbilder verknüpft', einheit: 'Produkte', fertig: geschrieben('dropship/cj_variantenbilder_ledger.txt').size, gesamt: 890, quelle: 'cj_variantenbilder_ledger.txt', anmerkung: 'Umfang gemessen am 25.10. an den neuesten 2010 CJ-Produkten' },
  { id: 'texte', bereich: 'Ausführliche Produkttexte', einheit: 'Produkte', fertig: art('text-v2').size, gesamt: null, quelle: 'kategorien_ledger.txt (text-v2)', anmerkung: 'nur Produkte mit lesbarem CJ-Datenblatt; Umfang nicht gemessen' },
  { id: 'fakten', bereich: 'Technische Daten, Lieferumfang', einheit: 'Produkte', fertig: art('fakten').size, gesamt: null, quelle: 'kategorien_ledger.txt (fakten)', anmerkung: 'nur belegte Angaben aus dem Datenblatt' },
  { id: 'labels', bereich: 'Kategorie-Bilder', einheit: 'Kategorien', fertig: art('bild').size, gesamt: 88, quelle: 'kategorien_ledger.txt (bild)', anmerkung: '88 Kategorien in lib/kategorien.mjs' },
  { id: 'bewertung', bereich: 'Gut bewertete zuerst', einheit: 'Kategorien', fertig: art('bewertung-zuerst').size, gesamt: null, quelle: 'kategorien_ledger.txt (bewertung-zuerst)', anmerkung: 'Kategorien im Menü mit mindestens 10 Produkten' },
  { id: 'titel', bereich: 'Titel korrigiert', einheit: 'Produkte', fertig: art('titel').size, gesamt: null, quelle: 'kategorien_ledger.txt (titel)', anmerkung: 'Titel, die dem Datenblatt widersprachen' },
].map(z => ({ ...z, stand: zeitpunkt }));
writeFileSync(OUT, JSON.stringify(zeilen, null, 1));
console.log(zeilen.map(z => `${z.bereich}: ${z.fertig}${z.gesamt ? ' / ' + z.gesamt : ''}`).join('\n'));
