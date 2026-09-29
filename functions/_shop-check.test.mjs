// Test der oeffentlichen Katalog-Pruefung: node functions/_shop-check.test.mjs
//
// Zwei Dinge werden geprueft, und beide koennen echten Schaden anrichten:
//  1. `saubereDomain` — hier gibt ein FREMDER die Zieladresse vor. Wer sie nicht
//     einengt, baut sich eine Maschine, die auf Zuruf fremde und interne Adressen
//     abruft. Darum steht zu jeder Zurueckweisung auch eine Gegenprobe, dass eine
//     normale Shop-Adresse durchkommt.
//  2. Die Antworten der Funktion bei nicht erreichbaren oder fremden Adressen —
//     ein Stacktrace waere dort ein Fehler, kein Ergebnis (gemessen 29.09.2026 an
//     `de.mrmarvis.com`, das den Kommandozeilen-Lauf abriss).

import { saubereDomain, onRequestGet } from './api/shop-check.js';

let gut = 0; const schlecht = [];
const p = (name, bedingung) => { if (bedingung) gut++; else schlecht.push(name); };

// --- erlaubt
p('normale Adresse', saubereDomain('luxestyle.ch') === 'luxestyle.ch');
p('mit https', saubereDomain('https://luxestyle.ch') === 'luxestyle.ch');
p('mit Pfad', saubereDomain('https://luxestyle.ch/collections/alle') === 'luxestyle.ch');
p('mit www', saubereDomain('www.waterdrop.de') === 'www.waterdrop.de');
p('Grossschreibung wird klein', saubereDomain('LuxeStyle.CH') === 'luxestyle.ch');
p('Leerzeichen aussen', saubereDomain('  luxestyle.ch  ') === 'luxestyle.ch');
p('myshopify-Adresse', saubereDomain('au3j0y-hq.myshopify.com') === 'au3j0y-hq.myshopify.com');

// --- abgewiesen: die Faelle, die eine Abruf-Maschine aus dem Dienst machen wuerden
p('leer', saubereDomain('') === null);
p('ohne Punkt', saubereDomain('localhost') === null);
p('localhost mit Punkt', saubereDomain('foo.localhost') === null);
p('IPv4', saubereDomain('127.0.0.1') === null);
p('IPv4 oeffentlich sieht aus wie IP', saubereDomain('8.8.8.8') === null);
p('privater Bereich 10er', saubereDomain('10.0.0.5') === null);
p('privater Bereich 192er', saubereDomain('192.168.1.1') === null);
p('interne Endung', saubereDomain('kasse.internal') === null);
// Ein Pfad wird ABGESCHNITTEN, nicht abgewiesen — das ist das sichere Verhalten,
// weil nur der Hostname uebrig bleibt und der Pfad nie in den Abruf geraet.
p('Pfad-Trick wird auf den Hostnamen gekuerzt', saubereDomain('shop.ch/../etc') === 'shop.ch');
p('Pfad-Trick mit Backslash wird abgewiesen', saubereDomain('shop.ch\\..\\etc') === null);
p('At-Zeichen', saubereDomain('nutzer@shop.ch') === null);
p('Unicode-Trick', saubereDomain('shop.ch\u0000evil.com') === null);
p('zu lang', saubereDomain('a'.repeat(300) + '.ch') === null);
p('keine Zeichenkette', saubereDomain(null) === null);
p('Port wird entfernt statt durchgelassen', saubereDomain('shop.ch:8080') === 'shop.ch');

// GEGENPROBE zur Gegenprobe: die Sperre darf nicht ALLES abweisen
p('GEGENPROBE eine echte Adresse kommt durch', saubereDomain('gymshark.com') === 'gymshark.com');
p('GEGENPROBE Bindestrich-Domain kommt durch', saubereDomain('mein-shop.ch') === 'mein-shop.ch');

// --- Antworten der Funktion (ohne Netz: nur die Wege, die vor dem Abruf entscheiden)
const anfrage = (shop) => new Request(`https://example.test/api/shop-check?shop=${encodeURIComponent(shop)}`);
const ergebnisse = await Promise.all([
  onRequestGet({ request: anfrage('') }),
  onRequestGet({ request: anfrage('127.0.0.1') }),
]);
p('leere Adresse ergibt 400', ergebnisse[0].status === 400);
p('IP-Adresse ergibt 400', ergebnisse[1].status === 400);
const koerper = await ergebnisse[0].json();
p('Antwort ist JSON mit Klartext', koerper.ok === false && typeof koerper.text === 'string');

console.log(`${gut}/${gut + schlecht.length} Pruefungen bestanden`);
for (const s of schlecht) console.log('  GESCHEITERT: ' + s);
process.exit(schlecht.length === 0 ? 0 : 1);
