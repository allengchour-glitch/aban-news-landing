// node automation/lib/kundenstimmen_test.mjs — Auswahl der Startseiten-Kundenstimmen (lib/kundenstimmen.mjs). Fälle aus echten Judge.me-Texten (27.10.2026).
import assert from 'node:assert/strict';
import { maskiereName, textAblehnung, bewertungOk, waehle } from './kundenstimmen.mjs';
let n = 0;
const ist = (name, ist_, soll) => { n++; try { assert.deepEqual(ist_, soll); } catch (e) { console.error('✗', name, '\n  ist :', JSON.stringify(ist_), '\n  soll:', JSON.stringify(soll)); process.exitCode = 1; } };

// ── Name maskieren
ist('Name: Vor- und Nachname', maskiereName('Maria Muster'), 'M***r');
ist('Name: schon maskiert bleibt gleich', maskiereName('R***v'), 'R***v');
ist('Name: CJ-Sammelname fällt weg', maskiereName('CJ-Kundenbewertung'), null);
ist('Name: Customer fällt weg', maskiereName('Customer'), null);
ist('Name: leer', maskiereName(''), null);
ist('Name: nur Ziffer und Stern', maskiereName('4***r'), null);
ist('Name: Umlaut am Anfang', maskiereName('Özlem'), 'Ö***m');

// ── Text: Annahme und jeder Ablehnungsgrund
const T = 'Schnelle Lieferung. Gute Verarbeitung. Funktioniert einwandfrei. Super, empfehlenswert!';
ist('Text: guter Text', textAblehnung(T), null);
ist('Text: «Alltag» ist kein «Tag»', textAblehnung('Super für den Alltag, wirklich schön verarbeitet und bequem.'), null);
ist('Text: «Wochenende» ist keine «Woche»', textAblehnung('Wunderschönes Kleid fürs Wochenende, tolle Qualität!'), null);
ist('Text: zu kurz', textAblehnung('Alles super!'), 'zu kurz');
ist('Text: zu lang', textAblehnung('Sehr schön und gut verarbeitet. '.repeat(8)), 'zu lang');
ist('Text: Einschränkung «aber»', textAblehnung('Sehr gut, aber es kam eine andere Farbe als bestellt.'), 'Einschränkung');
ist('Text: Einschränkung «leider»', textAblehnung('Leider ist die Verarbeitung nicht so gut wie erwartet hier.'), 'Einschränkung');
ist('Text: Einschränkung «musste»', textAblehnung('Schnell geliefert und schön, ich musste den Pony kürzen, riesig.'), 'Einschränkung');
ist('Text: «Betrug» fliegt raus', textAblehnung('Eine Schrottuhr wurde geliefert und niemand antwortet, Betrug.'), 'Einschränkung');
ist('Text: englisch', textAblehnung('Very good quality and fast shipping, the product works great.'), 'englisch');
ist('Text: chinesisch', textAblehnung('质量很好，物流很快，非常满意，推荐购买这个产品给大家'), 'asiatische Schrift');
ist('Text: Hersteller-Hinweis', textAblehnung('Sehr gute Qualität, direkt vom Hersteller, kann ich empfehlen.'), 'Hersteller-Hinweis');
ist('Text: CJ-Hinweis', textAblehnung('Danke an CJ Dropshipping, alles ist gut angekommen und schön.'), 'Hersteller-Hinweis');
ist('Text: Link', textAblehnung('Tolle Qualität, mehr Bilder unter www.beispiel.ch zu sehen, top.'), 'Link oder Zahlenkette');
ist('Text: Lieferdauer «1 Monat»', textAblehnung('Kam ziemlich schnell an (1 Monat). Gute Qualität, Beschreibung passt.'), 'Lieferdauer oder Herkunft');
ist('Text: Lieferdauer «Wochen»', textAblehnung('Versand aus Polen, kam in zwei Wochen an. Alles ok und schön.'), 'Lieferdauer oder Herkunft');
ist('Text: «ersten Tag» zählt als Dauer', textAblehnung('Am ersten Tag blockieren und lösen sie gut, sehr praktisch.'), 'Lieferdauer oder Herkunft');

ist('Text: «in Ordnung» ist kein Lob', textAblehnung('Kam pünktlich an. Scheint echte Seide, die Qualität ist für den Preis in Ordnung.'), 'Einschränkung');
ist('Text: Marktschreier «AAA++»', textAblehnung('Super Gerät, tolle Qualität und schnell da. Top Shop AAA++ immer wieder.'), 'Marktschreier');
ist('Text: ohne Lobwort', textAblehnung('Ringbuch. Einfach zu nutzen, gut gedruckt. Kommt bald zum Einsatz.'), 'ohne Lobwort');
ist('Text: «empfehle» zählt als Lob', textAblehnung('Funktioniert gut und ich empfehle es dir wirklich sehr.'), null);

// ── Bewertung grundsätzlich zulässig?
const R = (o = {}) => ({ rating: 5, published: true, hidden: false, curated: 'ok', product_external_id: 111, product_handle: 'p-1', body: T, reviewer: { name: 'Maria Muster' }, created_at: '2026-10-12T10:00:00Z', ...o });
ist('Bewertung: ok', bewertungOk(R()), true);
ist('Bewertung: 4 Sterne', bewertungOk(R({ rating: 4 })), false);
ist('Bewertung: versteckt', bewertungOk(R({ hidden: true })), false);
ist('Bewertung: nicht veröffentlicht', bewertungOk(R({ published: false })), false);
ist('Bewertung: nicht kuratiert', bewertungOk(R({ curated: 'spam' })), false);
ist('Bewertung: Shop-Bewertung ohne Produkt', bewertungOk(R({ product_external_id: 0 })), false);
ist('Bewertung: ohne Handle', bewertungOk(R({ product_handle: '' })), false);
ist('Bewertung: null', bewertungOk(null), false);

// ── Auswahl: eine Karte je Produkt, Vielfalt, nur aktive Produkte mit Bild
const P = (id, handle, type, extra = {}) => [String(id), { handle, title: 'Titel ' + handle, type, bild: `https://cdn.example/${handle}.jpg?width=240`, aktiv: true, ...extra }];
const produkte = new Map([P(1, 'lader', 'Elektronik'), P(2, 'schild', 'Wohnen'), P(3, 'rucksack', 'Taschen'), P(4, 'inaktiv', 'Taschen', { aktiv: false }), P(5, 'ohne-bild', 'Taschen', { bild: '' }),
  P(6, 'tasche-a', 'Taschen'), P(7, 'tasche-b', 'Taschen'), P(8, 'tasche-c', 'Taschen'), P(9, 'tasche-d', 'Taschen')]);
// je Produkt ein eigener Text (gleiche Texte bei verschiedenen Produkten sortiert die Auswahl bewusst aus)
const rev = (id, handle, body, name, t = '2026-10-12T10:00:00Z') => R({ product_external_id: id, product_handle: handle, body: body + ` Modell ${id}.`, reviewer: { name }, created_at: t });
const roh = (id, handle, body, name) => R({ product_external_id: id, product_handle: handle, body, reviewer: { name } });
const B1 = 'Gute Verarbeitung, funktioniert einwandfrei und sieht top aus.';
const B2 = 'Gute Verarbeitung, funktioniert einwandfrei und sieht top aus, sehr empfehlenswert!';
const alle = [rev(1, 'lader', B1, 'Anna Beispiel'), rev(1, 'lader', B2, 'Berta Test'), rev(1, 'lader', B1, 'Carla Probe'), rev(2, 'schild', B1, 'Dora Muster'), rev(3, 'rucksack', B1, 'Emma Muster'),
  rev(4, 'inaktiv', B1, 'Fritz Muster'), rev(5, 'ohne-bild', B1, 'Gerda Muster'), rev(99, 'unbekannt', B1, 'Hans Muster'),
  rev(6, 'tasche-a', B1, 'Ida Muster'), rev(7, 'tasche-b', B1, 'Jan Muster'), rev(8, 'tasche-c', B1, 'Kai Muster'), rev(9, 'tasche-d', B1, 'Lea Muster')];
const pool = waehle(alle, produkte, { max: 24, proTyp: 3 });
ist('Auswahl: je Produkt höchstens eine Karte', new Set(pool.map(k => k.h)).size, pool.length);
ist('Auswahl: Lader nur einmal, mit dem ausführlicheren Text', pool.filter(k => k.h === 'lader').map(k => k.b), [B2 + ' Modell 1.']);
ist('Auswahl: inaktives Produkt fehlt', pool.some(k => k.h === 'inaktiv'), false);
ist('Auswahl: Produkt ohne Bild fehlt', pool.some(k => k.h === 'ohne-bild'), false);
ist('Auswahl: unbekanntes Produkt fehlt', pool.some(k => k.h === 'unbekannt'), false);
ist('Auswahl: höchstens 3 je Produktart (Taschen)', pool.filter(k => ['rucksack', 'tasche-a', 'tasche-b', 'tasche-c', 'tasche-d'].includes(k.h)).length, 3);
ist('Auswahl: Felder', Object.keys(pool[0]).sort(), ['b', 'h', 'i', 'n', 'r', 't']);
ist('Auswahl: Bild-URL unverändert', pool.find(k => k.h === 'schild').i, 'https://cdn.example/schild.jpg?width=240');
ist('Auswahl: Namen maskiert, nie Klarnamen', pool.every(k => !k.n || /^\p{L}\*\*\*\p{L}$/u.test(k.n)), true);
ist('Auswahl: kein Klarname im Pool', JSON.stringify(pool).includes('Muster'), false);
ist('Auswahl: max begrenzt', waehle(alle, produkte, { max: 2, proTyp: 3 }).length, 2);
ist('Auswahl: handle passt nicht zur Produkt-ID → verworfen', waehle([rev(1, 'falsches-handle', B1, 'Anna Beispiel')], produkte).length, 0);
ist('Auswahl: deterministisch', JSON.stringify(waehle(alle, produkte)), JSON.stringify(waehle(alle, produkte)));
// derselbe maskierte Name mehrfach → ohne Namen
const gleich = [rev(1, 'lader', B1, 'C***t'), rev(2, 'schild', B1, 'C***t'), rev(3, 'rucksack', B1, 'R***v')];
const pg = waehle(gleich, produkte);
ist('Name: identischer Name auf mehreren Karten fällt weg', pg.filter(k => k.h !== 'rucksack').every(k => k.n === null), true);
ist('Name: einmaliger Name bleibt', pg.find(k => k.h === 'rucksack').n, 'R***v');
// Randsortiment: höchstens eine Karte je Art, Kerngeschäft bis proTyp
const prod2 = new Map([P(21, 'werkzeug-1', 'Werkzeug & Heimwerken'), P(22, 'werkzeug-2', 'Werkzeug & Heimwerken'), P(23, 'kleid-1', 'Damenmode'), P(24, 'kleid-2', 'Damenmode')]);
const pr = waehle([rev(21, 'werkzeug-1', B1, 'A B'), rev(22, 'werkzeug-2', B1, 'C D'), rev(23, 'kleid-1', B1, 'E F'), rev(24, 'kleid-2', B1, 'G H')], prod2, { proTyp: 3 });
ist('Auswahl: Randsortiment nur eine Karte je Art', pr.filter(k => k.h.startsWith('werkzeug')).length, 1);
ist('Auswahl: Kerngeschäft bis proTyp', pr.filter(k => k.h.startsWith('kleid')).length, 2);
const quer = waehle([roh(1, 'lader', B1, 'A B'), roh(2, 'schild', B1, 'C D'), roh(3, 'rucksack', B2, 'E F')], produkte);
ist('Auswahl: derselbe Text bei zwei Produkten → beide weg', quer.map(k => k.h), ['rucksack']);
ist('Auswahl: derselbe Text zweimal beim SELBEN Produkt bleibt', waehle([roh(1, 'lader', B1, 'A B'), roh(1, 'lader', B1, 'C D')], produkte).length, 1);
ist('Auswahl: leere Liste', waehle([], produkte), []);

console.log(`kundenstimmen_test: ${n} Prüfungen${process.exitCode ? ' — FEHLER' : ' ok'}`);
