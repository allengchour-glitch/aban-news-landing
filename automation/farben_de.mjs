/* farben_de.mjs — Zugriff auf die EINE Farbtabelle (automation/farben_de.json).
 *
 * ANLASS 2026-08-21: Dieselbe Tabelle lag VIERMAL im Repo — cj_category_fill.mjs und
 * cj_trending_import.mjs mit je 54 Eintraegen, cj_variant_backfill.mjs mit 27,
 * farbwerte_uebersetzen.py mit 78. Jede kannte Farben, die den anderen fehlten.
 * Sichtbar wurde es im Farbwaehler: Der Importer legte «Schwarz · Blau · Braun» an, der
 * Varianten-Nachruester haengte «Dark Gray» daneben — seine kleine Tabelle kannte
 * «dark gray» nicht. 51 Produkte sahen so aus.
 *
 * ⚠️ Zwei Tabellen fuer dieselbe Aufgabe laufen ZWANGSLAEUFIG auseinander: Wer eine Farbe
 * ergaenzt, ergaenzt sie in der, die er gerade offen hat. Die Tabelle liegt deshalb als
 * JSON vor — Node UND Python lesen dieselbe Datei. Neue Farben NUR dort nachtragen.
 *
 * Bei Konflikten gewann die Tabelle des grossen Importers; sie bepreist den taeglichen
 * Grind und ihre Schreibweise ist im Shop bereits verbreitet.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const hier = path.dirname(fileURLToPath(import.meta.url));
export const FARBEN = JSON.parse(fs.readFileSync(path.join(hier, 'farben_de.json'), 'utf8'));

/* Uebersetzt einen einzelnen Farbwert. Unbekanntes bleibt UNVERAENDERT — ein geratener
 * deutscher Name waere schlimmer als ein englischer, der wenigstens stimmt
 * («Lotus Root Color» ist keine Farbe, die man erraten sollte). */
export const deColor = c => { const t = (c || '').trim(); return FARBEN[t.toLowerCase()] || t; };
