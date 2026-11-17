// Test für automation/lib/gold_feingehalt.mjs (Gold-/Platin-Feingehalt als Material einer Ware). Lauf: node automation/lib/gold_feingehalt_test.mjs
// Die «massiv»-Fälle sind echte Sätze der 8 Produkte, die der Besitzer am 17.11.2026 auf Entwurf gesetzt hat (dropship/gold-bazg-1711/gold-liste.json), dazu
// Sätze aus dem Katalog; die Gegenfälle sind die Fehlalarme der ersten Zählung («24 künstliche Nägel», «8K-Drohne», «Platine», Farblisten, Kosmetik, Steingewicht).
import { goldBefund, waehleGold, GOLD_MARKER } from './gold_feingehalt.mjs';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };
const p = (title, description = '', o = {}) => ({ title, description, options: [], productType: '', ...o });
const art = (x) => goldBefund(x).art;

// ───────────────────────── massiv: Behauptung, keine Plattierung
const MASSIV = [
  ['Perlen Ohrhänger 14k Gold', ''], ['Armband', 'Hergestellt aus 999er Feingold'], ['Perlenarmband', 'Die Kette ist eine 14K-Gold-Kette'], ['Hanf Armband', 'Material: 14 Karat Gold'],
  ['Halskette mit Perlen', 'Edles Material: 18K Gold'], ['Armband mit Akoya Perlen', 'Gefertigt aus 18 Kaltgold'], ['Armband', 'Hergestellt in 3D-Hartgold-Technik'], ['Regenbogenring', 'Inlay: Platinum/K-Gold'],
  ['Halskette', 'Sie besteht aus Edelstahl und 18k Gold, was sie robust macht'], ['Ring 750er Gold', ''], ['Anhänger', 'Gold 585 mit Zirkonia'], ['Ring', 'Aus 18K Roségold gefertigt'], ['Ring', '18-karätiges Gold, handgefertigt'],
  ['Ohrringe', 'Material: 14 carat gold'], ['Ring', 'Au750 Stempel innen'], ['Ring', 'Pt950 Platin, 4 g'], ['Ring', 'Palladium 500 Fassung'], ['Ring', 'Aus echtem Platin gefertigt'],
  ['Kette', 'Aus echtem Gold gefertigt'], ['Kette', 'Das Armband besteht aus reinem Gold'], ['Kette', 'Echtgold Kette für Damen'], ['Ring', 'Massivgold Ring'], ['Uhr', 'Gehäuse aus Feingold'],
  ['Ring', 'Karat: 18K, Gold'], ['Ring', 'Weissgold 18K'], ['Ring', 'Ring aus Gold 18 K, handgefertigt'], ['Ring', 'Gold (18-K) Ring'], ['Ring', 'gold 585er Kette'],
  ['Ring', 'Besteht aus Edelstahl und 14K Gold. Mit Zirkonia.'], ['Ring', 'Er zeigt sich in 750 Gold'],
];
for (const [t, d] of MASSIV) pruefe(`massiv: «${t} / ${d}»`, art(p(t, d)) === 'massiv', JSON.stringify(goldBefund(p(t, d))));

// ───────────────────────── plattiert-mit-zahl: dieselbe Zahl, aber der Text nennt eine Plattierung (Hinweis, kein Entwurf)
const PLATT = [
  ['18K vergoldeter Ring', ''], ['Ring', '18K Gold plated Ring'], ['Ring', '14K Gold gefüllt'], ['Ring', '18K Goldauflage'], ['Ring', 'Mit 18K Gold galvanisiert'], ['Ring', '18K Gold, PVD-beschichtet'],
  ['Ring', 'Mit 18K Gold überzogen'], ['Ring 18K Gold', 'Edelstahl, goldplattiert'], ['Ring', 'Aus 750er Gold-Filled-Material'], ['Ring', '14K Gold vermeil'], ['Ring', '18k Gold, echt vergoldet'],
];
for (const [t, d] of PLATT) pruefe(`plattiert-mit-zahl: «${t} / ${d}»`, art(p(t, d)) === 'plattiert-mit-zahl', JSON.stringify(goldBefund(p(t, d))));
pruefe('Karat im Titel ohne Goldwort in der Nähe zählt nicht (Titel und Beschreibung sind durch ein Satzende getrennt)', art(p('Ring 18K', 'Edelstahl, goldplattiert')) === null);
pruefe('Plattierung nur in den Optionen reicht für «plattiert»', art(p('Ring 18K Gold', 'Edelstahl', { options: [{ name: 'Material', values: ['vergoldet', 'Silber'] }] })) === 'plattiert-mit-zahl');

// ───────────────────────── kein Befund
const NEIN = [
  ['Ring', ''], ['Vergoldeter Ring', 'Edelstahl, vergoldet'], ['Ring', 'Farbe: Gold'], ['Goldene Ohrringe', 'mit 18 Perlen'], ['Armband', 'Echtleder, echter Hingucker'], ['Armband', 'Echtvergoldung für lange Haltbarkeit'],
  ['Serum', '24K Gold Anti-Aging Serum für das Gesicht'], ['24K Gold Gesichtsmaske', 'Peeling mit Goldpartikeln'], ['Ring', 'Erhältlich in Platin, Roségold und 18K Gold'], ['Ring', 'Farben: Silber, 18K Gold'], ['Ring', 'Farbe: Pure Gold'],
  ['Ring', 'Kein echtes Gold, sondern Edelstahl'], ['Ring', 'Nicht aus echtem Gold gefertigt'], ['Ring', 'Ohne 18K Gold, mit Edelstahl'], ['Ring', '3 Karat Moissanit Ring mit Goldfassung'], ['Ring', '10 Karat Diamant, Gold Fassung'],
  ['Ring', 'Moissanit 10 Karat, Weissgold-Fassung'], ['Ring', 'Gold 750 ml Flasche'], ['Drohne', '8K Video Drohne mit goldener Lackierung'], ['Platine', 'Leiterplatte für Gold-Anwendungen'], ['Künstliche Nägel', '24 künstliche Nägel in Gold'],
  ['Ring', 'Gold 999 Bewertungen'.replace('999 Bewertungen', 'Größe 6')], ['Goldfisch Aquarium', '14K Beleuchtung Goldfisch'], ['Ring', 'Goldfarbener Ring mit 18 Steinen'], ['Ring', 'Ring Größe 118K Gold'], ['Ring', 'Preis 1,18K Gold'],
  ['Hammer', 'Messinggriff, 18K Beleuchtung'], ['Ring', 'Platin als Farbe: Platin, Silber'], ['Ring', 'Silber 925, mit Zirkonia'], [undefined, undefined], ['', ''], [null, null],
];
for (const [t, d] of NEIN) pruefe(`kein Befund: «${t} / ${d}»`, art(p(t, d)) === null, JSON.stringify(goldBefund(p(t, d))));
pruefe('Behauptung nur in den Optionen zählt nicht (Farbname «18K Gold»)', art(p('Ring Edelstahl', 'Schlichter Ring', { options: [{ name: 'Farbe', values: ['18K Gold', 'Silber'] }] })) === null);
pruefe('Gesichtspflege mit Schmuckwort im Titel ist keine Kosmetik', art(p('Halskette mit 18K Gold', 'Creme-weisse Perlen')) === 'massiv');
pruefe('Plattierung ohne Zahl und ohne Echtgold-Wort bleibt ohne Befund', art(p('Echtgold Ring', 'Echtgold vergoldet')) === null);
pruefe('Roségold und Weissgold als Wörter mit Karat zählen', art(p('Ring', '14K Weissgold')) === 'massiv' && art(p('Ring', '14K Rosegold')) === 'massiv');

// ───────────────────────── Befund: Inhalt
{
  const b = goldBefund(p('Halskette', 'Besteht aus Edelstahl und 18k Gold, was sie robust macht'));
  pruefe('Befund nennt Art, Treffer und eine Stelle', b.art === 'massiv' && b.treffer.length >= 1 && b.treffer[0].kern === '18k' && /18k gold/.test(b.treffer[0].text) && b.treffer[0].text.length <= 110, JSON.stringify(b));
  pruefe('Befund: höchstens drei Treffer', goldBefund(p('Ring 14k Gold', '14k Gold. '.repeat(20))).treffer.length <= 3);
  const c = goldBefund(p('Ring', '18K Gold plated Ring'));
  pruefe('Befund plattiert nennt das Plattierungswort', /plated/.test(c.grund), c.grund);
}

// ───────────────────────── Grenzfälle der Schreibweise
pruefe('«18k» im Satzanfang nach Punkt zählt', art(p('Ring', 'Er ist schön. 18K Gold, handgefertigt')) === 'massiv');
pruefe('Zahl und Gold durch Satzende getrennt zählt nicht', art(p('Ring', 'Er hat 18K. Das Gold der Sonne glänzt über dem Meer')) === null);
pruefe('Zahl und Gold weiter als 28 Zeichen auseinander zählt nicht', art(p('Ring', '18K ' + 'x'.repeat(40) + ' Gold')) === null);
pruefe('Zahl und Gold 20 Zeichen auseinander zählt', art(p('Ring', '18K ' + 'x'.repeat(15) + ' Gold')) === 'massiv');
pruefe('Gold vor der Zahl zählt', art(p('Ring', 'Gold in 18K Qualität')) === 'massiv');
pruefe('HTML wird ignoriert, Text im Tag nicht', art(p('Ring', '<p>Aus <b>18K</b> Gold</p>')) === 'massiv' && art(p('Ring', '<p data-x="18K Gold">Edelstahl</p>')) === null);
pruefe('HTML-Kommentar zählt nicht', art(p('Ring', '<!-- 18K Gold --><p>Edelstahl</p>')) === null);
pruefe('Verneinung gilt nur für die Fundstelle direkt dahinter', art(p('Ring', 'Ohne Nickel. 18K Gold')) === 'massiv');
pruefe('Absatzgrenze beendet die Verneinung', art(p('Ring', '<li>Ohne Nickel</li><li>18K Gold</li>')) === 'massiv');
pruefe('Feingehalt als Teil einer Zahl zählt nicht', art(p('Ring', 'Gold Art. 17501')) === null && art(p('Ring', 'Gold 1,750')) === null);
pruefe('mAh-Zahl neben Gold zählt nicht', art(p('Powerbank', '999 mAh, Gold Gehäuse')) === null);

// ───────────────────────── jede Zahl, jede Schreibweise, jedes Wort einzeln (die Mutationsprobe verlangt es)
for (const n of [8, 9, 10, 14, 18, 21, 22, 24]) pruefe(`Karat ${n}K Gold`, art(p('Ring', `${n}K Gold Ring`)) === 'massiv');
for (const f of [333, 375, 417, 585, 750, 916, 999]) pruefe(`Feingehalt ${f} Gold`, art(p('Ring', `Gold ${f} Ring`)) === 'massiv');
for (const w of ['18kt Gold', '18 Karat Gold', '18 carat gold', '18-karätig Gold', '18 K Gold', '18-K Gold', '18K-Gold']) pruefe(`Schreibweise «${w}»`, art(p('Ring', w)) === 'massiv');
for (const w of ['Au750', 'Au 585', 'Pt950', 'Pt-900', 'Pd500', 'Pd 950']) pruefe(`Stempel «${w}» ohne Goldwort`, art(p('Ring', `Ring ${w} innen`)) === 'massiv');
for (const w of ['Echtgold', 'Echt-Gold', 'echtes Gold', 'echtem Gold', 'echter Gold', 'real gold', 'solid gold', 'massives Gold', 'massivem Gold', 'Massivgold', 'reines Gold', 'reinem Gold', 'pure gold', 'Feingold', 'Reingold', 'K-Gold', 'Hartgold', 'Kaltgold'])
  pruefe(`Echt-Wort «${w}»`, art(p('Armband', `Armband aus ${w} gefertigt`)) === 'massiv', w);
pruefe('«gefertigt aus feinem Gold» (nur über die Aus-Echt-Regel)', art(p('Armband', 'Gefertigt aus feinem Gold')) === 'massiv');
for (const w of ['Massivplatin', 'massives Platin', 'Platin 950', 'Platinum 900', 'Palladium 500', 'echtes Palladium']) pruefe(`Platin-Wort «${w}»`, art(p('Ring', `Ring aus ${w}`)) === 'massiv', w);
for (const w of ['vergoldet', 'goldplattiert', 'Goldplatierung', 'gold plated', 'gold plating', 'verplattet', 'galvanisiert', 'beschichtet', 'überzogen', 'Überzug', 'PVD', 'vermeil', 'plaqué', 'doublé', 'coated', 'coating', 'Goldauflage', 'Gold-Schicht', 'Gold-Füllung', 'gold gefüllt', 'gold filled', 'filled gold', 'veredelt'])
  pruefe(`Plattierungswort «${w}»`, art(p('Ring', `14K Gold, ${w}`)) === 'plattiert-mit-zahl', w);
pruefe('«mit Wasser gefüllt» und «2. Auflage» sind keine Plattierung', art(p('Ring', '14K Gold. Mit Wasser gefüllt, 2. Auflage')) === 'massiv');
pruefe('Rhodinieren und Platinieren sind keine Plattierung (echtes Weissgold wird rhodiniert)', art(p('Ring', '14K Weissgold, rhodiniert')) === 'massiv' && art(p('Ring', '14K Weissgold platiniert')) === 'massiv');
pruefe('Karat nach einem Buchstaben oder Ziffern zählt nicht', art(p('Ring', 'CJ18K Gold')) === null && art(p('Ring', 'A18K Gold')) === null && art(p('Ring', 'Gold 18Kg Paket')) === null);
pruefe('Kamera mit 8K und Gold zählt nicht', art(p('Kamera', '8K Video Kamera, Gold')) === null && art(p('Kamera', '8K Drohne Gold')) === null && art(p('Monitor', '24K Hz Gold')) === null);
pruefe('goldfarben und goldene zählen nicht als Material', art(p('Ring', '18K goldfarben')) === null && art(p('Ring', 'In 18K, goldene Farbe')) === null);
pruefe('«Unechtes Gold» und «Feingoldfarben» zählen nicht', art(p('Ring', 'Unechtes Gold Imitat')) === null && art(p('Ring', 'Feingoldfarben Ring')) === null);
pruefe('Eine Farbangabe weiter als 24 Zeichen vor der Fundstelle gilt nicht mehr als Farbliste', art(p('Ring', 'Farbe Silber Grösse M Material Edelstahl und 18K Gold')) === 'massiv');
pruefe('Eine Verneinung reicht nur über drei Wörter', art(p('Ring', 'Ohne Nickel Blei Kadmium Zink 18K Gold')) === 'massiv' && art(p('Ring', 'Ohne Nickel Blei 18K Gold')) === null);

// ───────────────────────── Nachträge aus der Mutationsprobe
pruefe('Feingehalt als Teil einer längeren Zahl oder eines Preises zählt nicht', art(p('Ring', 'Gold 7501 Ring')) === null && art(p('Ring', 'Gold 750.50 CHF')) === null && art(p('Ring', 'Gold 750,50 CHF')) === null);
pruefe('Stempel mitten im Wort zählt nicht', art(p('Ring', 'Typ Kapt900')) === null && art(p('Ring', 'Modell Haubau750')) === null);
pruefe('«18K-goldfarben» und «24k-goldton» sind Farbangaben', art(p('Ring', '18K-goldfarben')) === null && art(p('Ring', 'In 24k-goldton lackiert')) === null);
pruefe('Gold-Farb-Wörter mit Bindestrich zählen nicht', art(p('Ring', '18K gold-farbe')) === null);
pruefe('Kosmetik: allein das Wort «Serum» genügt', art(p('Serum', '24K Gold Flakes Flasche')) === null);
pruefe('Steinwort neben einem Feingehalt ist kein Steingewicht', art(p('Ring', 'Gold 750 Diamant Ring')) === 'massiv');
pruefe('Gold weit vor der Zahl zählt nicht', art(p('Ring', 'Gold ' + 'x'.repeat(40) + ' 18K')) === null);
pruefe('Semikolon beendet den Satz', art(p('Ring', 'Er hat 18K; Das Gold der Sonne')) === null);
pruefe('Die Fundstelle im Befund ist höchstens 100 Zeichen lang, auch in langen Texten', goldBefund(p('Ring', 'viel Text '.repeat(40) + '18K Gold' + ' noch mehr Text'.repeat(40))).treffer.every((x) => x.text.length <= 100));

// ───────────────────────── waehleGold
{
  const lst = [
    { id: 'gid://shopify/Product/1', handle: 'a-massiv', title: 'Ring 14K Gold', description: '', tags: [] },
    { id: 'gid://shopify/Product/2', handle: 'b-platt', title: 'Ring 18K vergoldet', description: '', tags: [] },
    { id: 'gid://shopify/Product/3', handle: 'c-nichts', title: 'Ring', description: 'Edelstahl', tags: [] },
    { id: 'gid://shopify/Product/4', handle: 'd-ausnahme', title: 'Ring 14K Gold', description: '', tags: [] },
    { id: 'gid://shopify/Product/5', handle: 'e-marker', title: 'Ring 14K Gold', description: '', tags: [GOLD_MARKER] },
    { id: 'gid://shopify/Product/6', title: 'Ring 14K Gold', description: '' },
    { handle: 'g-ohne-id', title: 'Ring 14K Gold', description: '' },
    null,
  ];
  const r = waehleGold(lst, { ausnahmen: new Set(['d-ausnahme']) });
  pruefe('waehleGold: nur das massive Produkt wird entworfen', r.eintraege.length === 1 && r.eintraege[0].handle === 'a-massiv' && r.eintraege[0].id === 'gid://shopify/Product/1' && r.eintraege[0].art === 'massiv', JSON.stringify(r));
  pruefe('waehleGold: plattierte Ware mit Karat nur als Hinweis', r.hinweise.length === 1 && r.hinweise[0].handle === 'b-platt', JSON.stringify(r.hinweise));
  pruefe('waehleGold: Ausnahme, Arbeits-Tag, fehlende ID/Handle und null werden übersprungen', !r.eintraege.some((e) => /^[defg]/.test(e.handle)));
  pruefe('waehleGold: ohne Eingabe leer', waehleGold(undefined).eintraege.length === 0 && waehleGold([]).hinweise.length === 0);
  pruefe('GOLD_MARKER passt zum Entwurf-Werkzeug', GOLD_MARKER === 'bazg-gold-1711');
}

// ───────────────────────── Laufzeit (kein Hängen bei langen oder gemeinen Texten)
{
  const t0 = Date.now();
  const lang = ('18K gold ').repeat(6000), nurZahlen = '18K '.repeat(12000), nurGold = 'gold '.repeat(12000), bindestrich = '-'.repeat(30000) + 'gold', ziffern = '9'.repeat(30000);
  for (const d of [lang, nurZahlen, nurGold, bindestrich, ziffern, ('ohne ').repeat(8000) + '18K Gold']) goldBefund(p('Ring', d));
  pruefe('lange und gemeine Eingaben laufen in unter 3 Sekunden', Date.now() - t0 < 3000, `${Date.now() - t0} ms`);
}

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
