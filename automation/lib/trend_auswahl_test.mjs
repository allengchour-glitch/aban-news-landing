/** Test für die Auswahl der Trend-Zeile „Neu entdeckt" — reine Funktionen, keine Netzaufrufe.
 *  Lauf: /opt/node22/bin/node automation/lib/trend_auswahl_test.mjs
 *
 *  Zwei Richtungen, wie bei der Lieferbarkeit: Ware, die NICHT in die Zeile darf, muss draussen
 *  bleiben (gekauft, Sperrtag, Lizenz, dünne Marge) — und gesunde Ware darf nicht zu Unrecht
 *  fliegen (sonst ist die Zeile leer und sieht aus wie „keine Kandidaten"). */
import { trendScore, pruefeKandidat, waehleVielfalt, typSchluessel, nettoMarge, TAG_GEWICHT } from './trend_auswahl.mjs';
let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };

const gut = (o = {}) => ({ id: 'gid://shopify/Product/1', handle: 'led-nachtlicht-projektor', title: 'LED Sternenhimmel Projektor',
  tags: ['hype-jetzt', 'video-hit', 'cj-real'], preis: 34.9, ekChf: 9.5, sku: 'CJ-CJJT170059101AZ', bild: 'ja',
  beschreibung: 'Projektor mit Fernbedienung und Nachtlicht.', productType: '', ...o });

// ── Reihenfolge ──────────────────────────────────────────────────────────────────
pruef('kunden-liebling schlägt video-hit', trendScore(['kunden-liebling']) > trendScore(['video-hit']));
pruef('Marge ist gedeckelt (100 zählt wie 40)', trendScore(['trend'], 100) === trendScore(['trend'], 40));
pruef('negative Marge zählt nicht negativ', trendScore(['trend'], -50) === trendScore(['trend'], 0));
pruef('unbekannte Tags zählen 0', trendScore(['cj-real', 'dropship', 'irgendwas']) === 0);
pruef('Gewichte sind nicht verrutscht (Mutationsprobe)', TAG_GEWICHT['kunden-liebling'] === 3 && TAG_GEWICHT['viral'] === 1);

// ── Richtung 1: das darf NICHT in die Zeile ─────────────────────────────────────
{ const g = new Set(['led-nachtlicht-projektor']);
  const r = pruefeKandidat(gut(), { gekauft: g });
  pruef('schon gekauft → draussen', !r.ok && r.grund === 'schon gekauft', JSON.stringify(r)); }
pruef('cj-nicht-versendbar-ch → draussen', !pruefeKandidat(gut({ tags: ['hype-jetzt', 'cj-nicht-versendbar-ch'] })).ok);
pruef('cj-ausgelistet → draussen', !pruefeKandidat(gut({ tags: ['hype-jetzt', 'cj-ausgelistet'] })).ok);
pruef('adult-nicht-bewerben (Kanal-Sperrtag) → draussen', !pruefeKandidat(gut({ tags: ['hype-jetzt', 'adult-nicht-bewerben'] })).ok);
pruef('Lizenzname in der Beschreibung → draussen', !pruefeKandidat(gut({ beschreibung: 'Wie bei Harry Potter lässt grüssen.' })).ok);
pruef('Markenname im Titel → draussen', !pruefeKandidat(gut({ title: 'Nike Sneaker Style' })).ok);
pruef('Rohmarge 8 CHF → draussen', !pruefeKandidat(gut({ preis: 17.9, ekChf: 9.9 })).ok);
pruef('Einkaufspreis unbekannt → draussen', !pruefeKandidat(gut({ ekChf: NaN })).ok);
pruef('Preis 9.90 → draussen', !pruefeKandidat(gut({ preis: 9.9, ekChf: 1 })).ok);
pruef('Preis 400 → draussen', !pruefeKandidat(gut({ preis: 400, ekChf: 100 })).ok);
pruef('ohne CJ-Nummer (Fracht nicht messbar) → draussen', !pruefeKandidat(gut({ sku: 'LX-23-KRISTALL' })).ok);
pruef('ohne Titelbild → draussen', !pruefeKandidat(gut({ bild: '' })).ok);

// ── Richtung 2: GEGENPROBE — gesunde Ware darf nicht zu Unrecht fliegen ─────────
{ const r = pruefeKandidat(gut());
  pruef('gesunde Ware → Kandidat', r.ok, JSON.stringify(r)); }
pruef('Rohmarge genau 12 → Kandidat (Grenze zählt mit)', pruefeKandidat(gut({ preis: 21.9, ekChf: 9.9 })).ok);
pruef('Preis genau 14.90 mit guter Marge → Kandidat', pruefeKandidat(gut({ preis: 14.9, ekChf: 2 })).ok);
pruef('`chargen-tag rueckhol-0907` sperrt NICHT (zu breites Muster)', pruefeKandidat(gut({ tags: ['hype-jetzt', 'rueckhol-0907'] })).ok);
pruef('Beschreibung mit Fremdwort „Superheld" sperrt nicht', pruefeKandidat(gut({ beschreibung: 'Ein Superheld für die Nacht.' })).ok);
pruef('fehlende Beschreibung stürzt nicht ab', pruefeKandidat(gut({ beschreibung: undefined })).ok);

// ── Jahreszeit, Preisgrenze, Besuch ohne Warenkorb ──────────────────────────────
// Trockenlauf 25.10.: Sommerhut und Sommermütze standen unter den ersten sechzehn.
pruef('Oktober + Sommerhut → draussen', !pruefeKandidat(gut({ title: 'Sommer Sonnenhut' }), { monat: 10 }).ok);
pruef('Oktober + Tag sommer-2026 → draussen', !pruefeKandidat(gut({ tags: ['hype-jetzt', 'sommer-2026'] }), { monat: 10 }).ok);
pruef('Juli + Sommerhut → Kandidat (GEGENPROBE: im Sommer ist er richtig)', pruefeKandidat(gut({ title: 'Sommer Sonnenhut' }), { monat: 7 }).ok);
pruef('Juli + Winterjacke → draussen', !pruefeKandidat(gut({ title: 'Winterjacke Thermo' }), { monat: 7 }).ok);
pruef('Oktober + Winterjacke → Kandidat', pruefeKandidat(gut({ title: 'Winterjacke Thermo' }), { monat: 10 }).ok);
pruef('April (Übergang) sperrt weder Sommer noch Winter', pruefeKandidat(gut({ title: 'Sommer Sonnenhut' }), { monat: 4 }).ok && pruefeKandidat(gut({ title: 'Winterjacke' }), { monat: 4 }).ok);
pruef('ohne Monat wird die Jahreszeit nicht geprüft', pruefeKandidat(gut({ title: 'Sommer Sonnenhut' })).ok);
pruef('Oktober + „Sommelier-Set" ist KEIN Sommer (zu breites Muster?)', pruefeKandidat(gut({ title: 'Sommelier Weinset' }), { monat: 10 }).ok);
pruef('Standard-Höchstpreis 100: CHF 139.90 draussen', !pruefeKandidat(gut({ preis: 139.9, ekChf: 40 })).ok);
pruef('CHF 99.90 drin', pruefeKandidat(gut({ preis: 99.9, ekChf: 40 })).ok);
pruef('Höchstpreis ist einstellbar', pruefeKandidat(gut({ preis: 139.9, ekChf: 40 }), { maxPreis: 150 }).ok);
{ const r = pruefeKandidat(gut({ handle: 'abendkleid-aurora' }), { ausschluss: new Set(['abendkleid-aurora']) });
  pruef('Besuch ohne Warenkorb → draussen', !r.ok && r.grund === 'Besuch ohne Warenkorb', JSON.stringify(r)); }
pruef('anderes Produkt bleibt trotz Ausschlussliste drin', pruefeKandidat(gut(), { ausschluss: new Set(['abendkleid-aurora']) }).ok);

// ── Fracht ──────────────────────────────────────────────────────────────────────
pruef('Netto-Marge Projektor: 34.90 − 9.50 − 11.46 USD', nettoMarge({ preis: 34.9, ekChf: 9.5, frachtUsd: 11.46 }) === 15.95,
  String(nettoMarge({ preis: 34.9, ekChf: 9.5, frachtUsd: 11.46 })));
pruef('Netto-Marge ohne Fracht-Messung → null (nichts erfinden)', nettoMarge({ preis: 34.9, ekChf: 9.5, frachtUsd: NaN }) === null);
pruef('Netto-Marge kann negativ sein (Verlustfall sichtbar)', nettoMarge({ preis: 14.9, ekChf: 9, frachtUsd: 11 }) < 0);

// ── Vielfalt ────────────────────────────────────────────────────────────────────
const kabel = i => gut({ id: `k${i}`, handle: `kabel-${i}`, productType: 'Ladekabel' });
{ const liste = [1, 2, 3, 4, 5, 6].map(kabel);
  const r = waehleVielfalt(liste, { ziel: 4, maxJeTyp: 2 });
  pruef('sechs Kabel → höchstens zwei', r.gewaehlt.length === 2 && r.uebersprungen.length === 4, JSON.stringify(r.gewaehlt.length)); }
{ const liste = [kabel(1), kabel(2), kabel(3), gut({ id: 'm', handle: 'mixer', productType: 'Mixer' }), gut({ id: 'p', handle: 'projektor', productType: 'Projektor' })];
  const r = waehleVielfalt(liste, { ziel: 4, maxJeTyp: 2 });
  pruef('gemischte Liste: Reihenfolge bleibt, Kabel gedeckelt', r.gewaehlt.map(x => x.handle).join() === 'kabel-1,kabel-2,mixer,projektor', r.gewaehlt.map(x => x.handle).join()); }
{ const liste = [1, 2, 3, 4, 5].map(i => gut({ id: `e${i}`, handle: `einzel-${i}`, productType: '', tags: ['cj-real'] }));
  const r = waehleVielfalt(liste, { ziel: 5, maxJeTyp: 1 });
  pruef('Ware ohne erkennbare Gruppe teilt sich KEINEN Platz', r.gewaehlt.length === 5, String(r.gewaehlt.length)); }
{ const r = waehleVielfalt([1, 2, 3].map(kabel), { ziel: 0 });
  pruef('ziel 0 → leer', r.gewaehlt.length === 0); }
pruef('Gruppe aus kategorie-Tag', typSchluessel({ handle: 'a', tags: ['kategorie-kleid'] }) === 'kleid');
pruef('Gruppe aus bekanntem Tag', typSchluessel({ handle: 'a', tags: ['cj-real', 'elektronik'] }) === 'elektronik');
pruef('productType hat Vorrang vor Tags', typSchluessel({ handle: 'a', productType: 'Mixer', tags: ['elektronik'] }) === 'mixer');

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle gruen');
process.exit(fehler ? 1 : 0);
