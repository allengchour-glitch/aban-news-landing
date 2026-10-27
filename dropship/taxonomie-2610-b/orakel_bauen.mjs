#!/usr/bin/env node
/**
 * Baut die Orakel-Dateien für die Tests der Schmuck-Taxonomie (NUR LOKAL, liest /tmp; schreibt unter dropship/taxonomie-2610-b/orakel/):
 *   schmuck-orakel.json     Trefferzahl und Hash der Mitglieder je Kategorie (aus den Mitgliederlisten des Messwerkzeugs messen.mjs, NICHT aus dem Adapter),
 *                           Trefferzahl je Unterfilter (aus der Messausgabe)
 *   schmuck-katalog.json.gz schlanker Katalogauszug: alle Produkte der Google-Klasse «Jewelry» plus alle Mitglieder des Orakels
 *                           ([handle, titel, google, sperr-tags]); damit läuft der Orakel-Vergleich auch in der CI, wo /tmp leer ist
 *
 * GRENZE (Gegenlesung 27.10.2026): die Mitgliederlisten stammen aus messen.mjs, das dieselbe Funktion kern.passt() aufruft wie der Adapter - das Orakel prüft die Verdrahtung, nicht die Regeln.
 * Voraussetzung: node dropship/taxonomie-2610-b/messen.mjs dropship/taxonomie-2610-b/bereiche/schmuck-uhren.json lief frisch auf demselben Katalog
 *                (Mitgliederlisten /tmp/taxo_b/schmuck-uhren/<handle>.txt) und die Messausgabe liegt in einer Datei (MESSUNG=…, Vorgabe _messen_gl2_final.txt).
 * Aufruf: node dropship/taxonomie-2610-b/orakel_bauen.mjs        (ENV: KATALOG, LISTEN, MESSUNG)
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { SPERR_TAGS } from './kern.mjs';
import { SCHMUCK_GRUPPEN } from '../../automation/lib/bereich_taxonomie.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const KATALOG = process.env.KATALOG || '/tmp/katalog_taxo.json';
const LISTEN = process.env.LISTEN || '/tmp/taxo_b/schmuck-uhren';
const MESSUNG = process.env.MESSUNG || `${LISTEN}/_messen_gl2_final.txt`;
const B = JSON.parse(readFileSync(`${HIER}/bereiche/schmuck-uhren.json`, 'utf8'));
const katalog = JSON.parse(readFileSync(KATALOG, 'utf8'));

const handles = [...new Set(B.gruppen.filter(g => SCHMUCK_GRUPPEN.includes(g.handle)).flatMap(g => g.kinder))].filter(h => B.kategorien.some(k => k.handle === h));
const kategorien = {}, alleMitglieder = new Set();
const alter = statSync(`${LISTEN}/_luecke.txt`).mtimeMs;
for (const h of handles) {
  const datei = `${LISTEN}/${h}.txt`;
  if (statSync(datei).mtimeMs < alter - 60000) throw new Error(`${datei} ist älter als die letzte Messung (_luecke.txt) - Messung wiederholen`);
  const hs = readFileSync(datei, 'utf8').split('\n').filter(Boolean).map(l => l.split(' | ')[0]).sort();
  hs.forEach(x => alleMitglieder.add(x));
  kategorien[h] = { n: hs.length, sha1: createHash('sha1').update(hs.join('\n')).digest('hex') };
}
const unterfilter = {};
for (const z of readFileSync(MESSUNG, 'utf8').split('\n')) { const m = z.match(/^\s+└ (\S+)\s+(\d+)/); if (m) unterfilter[m[1]] = Number(m[2]); }
for (const k of B.kategorien.filter(k => handles.includes(k.handle))) for (const u of k.unterfilter || []) if (!(u.handle in unterfilter)) throw new Error(`Unterfilter ${u.handle} fehlt in ${MESSUNG}`);

const sperr = new Set(SPERR_TAGS);
const schlank = p => [p.handle, p.title, p.g || '', (p.tags || []).filter(t => sperr.has(t))];
const auszug = katalog.produkte.filter(p => (p.g || '').startsWith('Apparel & Accessories > Jewelry') || alleMitglieder.has(p.handle)).map(schlank);
mkdirSync(`${HIER}/orakel`, { recursive: true });
writeFileSync(`${HIER}/orakel/schmuck-orakel.json`, JSON.stringify({
  stand: 'Katalog /tmp/katalog_taxo.json, gelesen 26.10.2026 20:14', katalogProdukte: katalog.produkte.length,
  quelle: 'Mitgliederlisten und Messausgabe von dropship/taxonomie-2610-b/messen.mjs (bereiche/schmuck-uhren.json), Stand 27.10.2026 05:48',
  hinweis: 'sha1 = SHA-1 der sortierten Mitglieder-Handles, durch Zeilenumbruch verbunden. Neu bauen: node dropship/taxonomie-2610-b/orakel_bauen.mjs (nach jeder Regeländerung: erst messen.mjs, dann dieses Skript). Das Orakel ist NICHT unabhängig von den Regeln: messen.mjs und der Adapter rufen dieselbe Funktion kern.passt() auf, es fängt Verdrahtungsfehler im Adapter, keine Regelfehler, und es ist ein Schnappschuss des Katalogs: vor jedem LIVE-Lauf den Katalog frisch lesen und die Zahlen von kategorien_anlegen.mjs (SCHMUCK=1) gegen das Orakel halten (Abschnitt «Schmuck gegen das Orakel»).',
  kategorien, unterfilter }, null, 1) + '\n');
writeFileSync(`${HIER}/orakel/schmuck-katalog.json.gz`, gzipSync(JSON.stringify({ stand: 'Auszug aus /tmp/katalog_taxo.json (26.10.2026 20:14): Google-Klasse Jewelry plus alle Orakel-Mitglieder', felder: ['handle', 'title', 'g', 'sperrTags'], produkte: auszug }), { level: 9 }));
console.log(`Orakel: ${handles.length} Kategorien, ${Object.keys(unterfilter).length} Unterfilter, ${alleMitglieder.size} Mitglieder; Katalogauszug ${auszug.length} von ${katalog.produkte.length} Produkten`);
