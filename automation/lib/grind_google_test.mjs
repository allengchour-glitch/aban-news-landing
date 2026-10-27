// Tests für grind_google.mjs (Google-Kategorie und Taxonomie-Tags für neue Produkte). Gegenproben in BEIDE Richtungen; die Zusammenfassung steht am ENDE.
// Lauf: node automation/lib/grind_google_test.mjs   (Exit 1 bei einem Fehler)
// Die Titel sind echte Titel aus dem Shop (Katalog vom 27.10.2026) bzw. der Lückenanalyse; die Entscheidungsmatrix läuft gegen eigene, kleine Daten.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REIN_MIN, REIN_MIN_N, LEXIKON_MIN_N, LEXIKON_REIN, GELESEN_MIN_N, GELESEN_MIN_REIN, GENERISCH, STRATEGIEN,
  DATEN, TAXONOMIE, TAXONOMIE_GEPRUEFT_GEGEN, INDEX, istGooglePfad, taxonomieAusText, taxonomieHash, pruefeDaten,
  kernPhrase, kopfwort, kopfKandidaten, liegtUnter, familie, einigePfade, normiereKategorieName, blattSchluessel, blattTabelle,
  lexikonBauen, lexikonErgaenzen, indexiere, regelTreffer, lexikonTreffer, titelUrteil, blattUrteil, googlePfad, taxTags, bereichKategorien, kategorieFuer,
} from './grind_google.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};
const wirft = (name, fn, muster) => {
  try { fn(); } catch (e) {
    if (!muster || muster.test(String(e?.message))) ok++; else { fehl++; console.log('FEHLER', name, '— falsche Meldung:', String(e?.message).slice(0, 300)); }
    return;
  }
  fehl++; console.log('FEHLER', name, '— wirft nicht');
};
const letzte = p => (p ? p.split(' > ').slice(-1)[0] : p);
const pf = (titel, extra = {}, opt = {}) => googlePfad({ titel, ...extra }, opt);
/** Google-Pfade, die in den Tests vorkommen (alle in der Taxonomie; das prüft der Test «Pfade der Tests»). */
const G = {
  napf: 'Animals & Pet Supplies > Pet Supplies > Pet Bowls, Feeders & Waterers',
  leine: 'Animals & Pet Supplies > Pet Supplies > Pet Leashes',
  geschirr: 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses',
  hundebett: 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Beds',
  hundekleidung: 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Apparel',
  webcam: 'Cameras & Optics > Cameras > Webcams',
  zangen: 'Hardware > Tools > Pliers',
  werkzeug: 'Hardware > Tools',
  kuchenform: 'Home & Garden > Kitchen & Dining > Cookware & Bakeware > Bakeware > Cake Pans & Molds',
  ringe: 'Apparel & Accessories > Jewelry > Rings',
  uhren: 'Apparel & Accessories > Jewelry > Watches',
  schuhe: 'Apparel & Accessories > Shoes',
  kleider: 'Apparel & Accessories > Clothing > Dresses',
  lader: 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers',
  tassen: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
};
for (const [k, p] of Object.entries(G)) ist(`Pfade der Tests: ${k} steht in der Taxonomie`, istGooglePfad(p), true);

// ─────────────────────────── Konstanten (Zahlen der Setzungen stehen fest) ───────────────────────────
ist('Reinheit 90 %', REIN_MIN, 0.9);
ist('Reinheit gilt ab 5 Produkten', REIN_MIN_N, 5);
ist('Lexikon: 3 Beispiele, 90 %', [LEXIKON_MIN_N, LEXIKON_REIN], [3, 0.9]);
ist('von Hand gelesene Einträge: 4 Beispiele, 50 %', [GELESEN_MIN_N, GELESEN_MIN_REIN], [4, 0.5]);
ist('Vorgabe-Strategie sucht nur am Kopfwort', STRATEGIEN, ['kopf']);
ist('generische Wörter enthalten «set»', GENERISCH.has('set') && GENERISCH.has('kit') && !GENERISCH.has('napf'), true);

// ─────────────────────────── Taxonomie und Datendatei ───────────────────────────
ist('Taxonomie: 5 595 Pfade (Google 2021-09-21)', TAXONOMIE.size, 5595);
ist('Taxonomie wurde beim Laden geprüft gegen', ['original', 'eingebettet'].includes(TAXONOMIE_GEPRUEFT_GEGEN), true);
ist('istGooglePfad: echter Pfad', istGooglePfad('Cameras & Optics > Cameras > Webcams'), true);
ist('istGooglePfad: erfundener Pfad', istGooglePfad('Cameras & Optics > Cameras > Dashcams'), false);
ist('istGooglePfad: Tippfehler', istGooglePfad('Cameras & Optics > Camera > Webcams'), false);
ist('istGooglePfad: Leerzeichen am Rand', istGooglePfad(' Cameras & Optics > Cameras > Webcams'), false);
{
  const falsche = [];
  const pruefe = (pfad, wo) => { if (!TAXONOMIE.has(pfad)) falsche.push(`${wo}: ${pfad}`); };
  for (const [cid, b] of Object.entries(DATEN.blaetter)) { pruefe(b.pfad, `blatt ${cid}`); for (const [p] of b.kand) pruefe(p, `blatt ${cid} kand`); }
  for (const r of DATEN.regeln) pruefe(r.pfad, `regel ${r.id}`);
  for (const e of DATEN.lexikon) pruefe(e.pfad, `lexikon ${e.k}`);
  ist('JEDER Pfad der Datendatei steht in Googles Taxonomie', falsche, []);
  ist('keine Regel und kein Lexikon-Eintrag trägt nur die oberste Ebene', [...DATEN.regeln, ...DATEN.lexikon].filter(x => !x.pfad.includes(' > ')).length, 0);
}
ist('Datendatei besteht die eigene Prüfung', (() => { pruefeDaten(DATEN, TAXONOMIE); return true; })(), true);
ist('Hash der eingebetteten Taxonomie stimmt', taxonomieHash(new Set(DATEN.taxonomie.pfade)), DATEN.taxonomie.sha256);
ist('Hash ändert sich, wenn ein Pfad fehlt', taxonomieHash(new Set(DATEN.taxonomie.pfade.slice(1))) !== DATEN.taxonomie.sha256, true);
ist('Hash hängt nicht von der Reihenfolge ab', taxonomieHash(new Set([...DATEN.taxonomie.pfade].reverse())), DATEN.taxonomie.sha256);
ist('taxonomieAusText liest «ID - Pfad», überspringt Kopf und Leerzeilen', [...taxonomieAusText('# Version\n1 - A\n\n3237 - A > B\nkaputt\n')], ['A', 'A > B']);
ist('Datendatei: 17 reine Blätter (Audit M15: 17 von 79 beurteilbaren)', Object.values(DATEN.blaetter).filter(b => b.tabelle).length, 17);
ist('Datendatei: jedes reine Blatt hat n ≥ 5 und Anteil ≥ 0,9', Object.values(DATEN.blaetter).filter(b => b.tabelle).every(b => b.n >= 5 && b.anteil >= 0.9), true);
ist('Datendatei: kein unreines Blatt erfüllt die Reinheits-Schwelle', Object.values(DATEN.blaetter).filter(b => !b.tabelle).every(b => !(b.n >= 5 && b.anteil >= 0.9 && b.pfad.includes(' > '))), true);
ist('Datendatei: kein verworfener Schlüssel steht im Lexikon (ausser mit Bedingung neu aufgenommen)',
  DATEN.lexikon_verworfen.filter(v => DATEN.lexikon.some(e => e.k === v.k && !(e.muss?.length || e.nicht?.length))).map(v => v.k), []);
ist('Datendatei: jeder verworfene Schlüssel nennt einen Grund', DATEN.lexikon_verworfen.every(v => typeof v.grund === 'string' && v.grund.length > 20), true);
ist('Datendatei: jede Regel hat einen Beleg (Treffer im Shop, davon passend)', DATEN.regeln.every(r => Number.isInteger(r.beleg?.n) && Number.isInteger(r.beleg?.gleich) && r.beleg.gleich <= r.beleg.n), true);
ist('Datendatei: jede Regel trägt das Zielblatt oder den Grund', DATEN.regeln.every(r => typeof r.ziel === 'string' && r.ziel.length > 2), true);
ist('Datendatei: gelesene Einträge ≥ 4 Beispiele und ≥ 50 %', DATEN.lexikon.filter(e => e.quelle === 'gelesen').every(e => e.n >= 4 && e.rein >= 0.5), true);
ist('Datendatei: gemessene Einträge ≥ 3 Beispiele und ≥ 90 %', DATEN.lexikon.filter(e => !e.quelle).every(e => e.n >= 3 && e.rein >= 0.9), true);
ist('Datendatei: die Messung steht in meta', DATEN.meta.messung?.stichprobe300?.n, 300);

// Mutationen der Daten: pruefeDaten muss jeden Fehler fangen
const kopie = () => JSON.parse(JSON.stringify({ ...DATEN, taxonomie: undefined }));
{
  const d = kopie(); d.regeln[0].pfad = 'Cameras & Optics > Cameras > Dashcams';
  wirft('pruefeDaten: erfundener Pfad in einer Regel', () => pruefeDaten(d, TAXONOMIE), /steht nicht in Googles Taxonomie/);
}
{
  const d = kopie(); d.lexikon[0].pfad = 'Electronics';
  wirft('pruefeDaten: nur die oberste Ebene im Lexikon', () => pruefeDaten(d, TAXONOMIE), /oberste Ebene/);
}
{
  const d = kopie(); d.lexikon.push({ ...d.lexikon[0] });
  wirft('pruefeDaten: doppelter Schlüssel ohne Bedingung', () => pruefeDaten(d, TAXONOMIE), /doppelter Schlüssel/);
}
{
  const d = kopie(); d.lexikon.push({ ...d.lexikon[0], muss: ['hund'] });
  wirft('pruefeDaten: derselbe Schlüssel mit Bedingung neben einem ohne Bedingung', () => pruefeDaten(d, TAXONOMIE), /doppelter Schlüssel/);
}
{
  const d = kopie(); const e = d.lexikon.find(x => !x.muss && !x.nicht); d.lexikon.push({ ...e, muss: ['a'] }, { ...e, muss: ['b'] }, { ...e, pfad: e.pfad });
  wirft('pruefeDaten: dritter Eintrag ohne Bedingung', () => pruefeDaten(d, TAXONOMIE), /doppelter Schlüssel/);
}
{
  const d = kopie(); d.regeln[0].titel_muss = ['(unklammert'];
  wirft('pruefeDaten: ungültige Regex', () => pruefeDaten(d, TAXONOMIE), /ungültig/);
}
{
  const d = kopie(); d.regeln[0].titel_muss = [];
  wirft('pruefeDaten: Regel ohne titel_muss', () => pruefeDaten(d, TAXONOMIE), /titel_muss fehlt/);
}
{
  const d = kopie(); d.regeln[1].id = d.regeln[0].id;
  wirft('pruefeDaten: doppelte Regel-Kennung', () => pruefeDaten(d, TAXONOMIE), /doppelte Kennung/);
}
{
  const d = kopie(); d.regeln[0].bereich = 'zeile';
  wirft('pruefeDaten: unbekannter Bereich', () => pruefeDaten(d, TAXONOMIE), /bereich muss/);
}
{
  const d = kopie(); const cid = Object.keys(d.blaetter).find(c => !d.blaetter[c].tabelle && d.blaetter[c].n >= 5); d.blaetter[cid].tabelle = true;
  wirft('pruefeDaten: unreines Blatt als rein markiert', () => pruefeDaten(d, TAXONOMIE), /als rein markiert/);
}
{
  const d = kopie(); const cid = Object.keys(d.blaetter).find(c => d.blaetter[c].tabelle); d.blaetter[cid].tabelle = false;
  wirft('pruefeDaten: reines Blatt nicht als rein markiert', () => pruefeDaten(d, TAXONOMIE), /nicht als Tabelle markiert/);
}
{
  const d = kopie(); const cid = Object.keys(d.blaetter).find(c => d.blaetter[c].tabelle); d.blaetter[cid].n = 4;
  wirft('pruefeDaten: reines Blatt mit nur 4 Produkten', () => pruefeDaten(d, TAXONOMIE), /als rein markiert/);
}
{
  const d = kopie(); d.lexikon[0].rein = 0.89;
  wirft('pruefeDaten: gemessener Eintrag mit 89 %', () => pruefeDaten(d, TAXONOMIE), /unter der Schwelle/);
}
{
  const d = kopie(); d.lexikon[0].n = 2;
  wirft('pruefeDaten: gemessener Eintrag mit 2 Beispielen', () => pruefeDaten(d, TAXONOMIE), /unter der Schwelle/);
}
{
  const d = kopie(); d.lexikon[0].k = 'Napf';
  wirft('pruefeDaten: Schlüssel mit Grossbuchstaben', () => pruefeDaten(d, TAXONOMIE), /kleingeschriebenes Wort/);
}
{
  const d = kopie(); d.lexikon[0].k = 'ab';
  wirft('pruefeDaten: Schlüssel unter 3 Buchstaben', () => pruefeDaten(d, TAXONOMIE), /kleingeschriebenes Wort/);
}
{
  const d = kopie(); d.lexikon[0].k = '10000mah';
  wirft('pruefeDaten: Schlüssel mit Ziffern (Zahlenfetzen)', () => pruefeDaten(d, TAXONOMIE), /kleingeschriebenes Wort/);
}
{
  const d = kopie(); d.lexikon[0].quelle = 'ki';
  wirft('pruefeDaten: unbekannte Quelle', () => pruefeDaten(d, TAXONOMIE), /unbekannte quelle/);
}
{
  const d = kopie(); const e = d.lexikon.find(x => x.quelle === 'gelesen'); e.rein = 0.49;
  wirft('pruefeDaten: gelesener Eintrag mit 49 %', () => pruefeDaten(d, TAXONOMIE), /unter der Schwelle/);
}
{
  const d = kopie(); const cid = Object.keys(d.blaetter)[0]; d.blaetter[cid].kand.push(['Nicht > Echt', 1]);
  wirft('pruefeDaten: erfundener Pfad unter den beobachteten Pfaden eines Blatts', () => pruefeDaten(d, TAXONOMIE), /steht nicht in Googles Taxonomie/);
}

// Laden: die Prüfung läuft beim Import und wirft (Kindprozess mit veränderter Datei)
{
  const verz = mkdtempSync(join(tmpdir(), 'grind-google-'));
  const modul = fileURLToPath(new URL('./grind_google.mjs', import.meta.url));
  const lauf = (daten, env = {}) => {
    const datei = join(verz, `daten-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(datei, JSON.stringify(daten));
    return spawnSync(process.execPath, ['--input-type=module', '-e', `import(${JSON.stringify(modul)}).then(m => console.log('GELADEN ' + m.TAXONOMIE_GEPRUEFT_GEGEN))`],
      { env: { ...process.env, GRIND_GOOGLE_DATEN: datei, ...env }, encoding: 'utf8' });
  };
  const echt = JSON.parse(readFileSync(fileURLToPath(new URL('./grind_google_daten.json', import.meta.url)), 'utf8'));
  const okLauf = lauf(echt, { GOOGLE_TAXONOMIE_DATEI: join(verz, 'gibt-es-nicht.txt') });
  ist('Laden: unveränderte Datei ohne Originaltaxonomie → geprüft gegen die eingebettete Kopie', [okLauf.status, /GELADEN eingebettet/.test(okLauf.stdout)], [0, true]);
  const falscherPfad = JSON.parse(JSON.stringify(echt)); falscherPfad.regeln[0].pfad = 'Cameras & Optics > Cameras > Dashcams';
  const r1 = lauf(falscherPfad, { GOOGLE_TAXONOMIE_DATEI: join(verz, 'gibt-es-nicht.txt') });
  ist('Laden: erfundener Pfad → der Import wirft', [r1.status !== 0, /steht nicht in Googles Taxonomie/.test(r1.stderr)], [true, true]);
  const kaputteTax = JSON.parse(JSON.stringify(echt)); kaputteTax.taxonomie.pfade = kaputteTax.taxonomie.pfade.filter(p => p !== 'Cameras & Optics > Cameras > Webcams');
  const r2 = lauf(kaputteTax, { GOOGLE_TAXONOMIE_DATEI: join(verz, 'gibt-es-nicht.txt') });
  ist('Laden: veränderte eingebettete Taxonomie → der Hash schlägt an', [r2.status !== 0, /sha256/.test(r2.stderr)], [true, true]);
  // Originaldatei vorhanden, aber ohne die Webcam-Kategorie: gilt SIE, nicht die eingebettete Kopie
  const kleineTax = join(verz, 'klein.txt');
  writeFileSync(kleineTax, echt.taxonomie.pfade.filter(p => p !== 'Cameras & Optics > Cameras > Webcams').map((p, i) => `${i + 1} - ${p}`).join('\n'));
  const r3 = lauf(echt, { GOOGLE_TAXONOMIE_DATEI: kleineTax });
  ist('Laden: Originaltaxonomie ohne einen benutzten Pfad → der Import wirft', [r3.status !== 0, /Cameras & Optics > Cameras > Webcams/.test(r3.stderr)], [true, true]);
  const vollTax = join(verz, 'voll.txt');
  writeFileSync(vollTax, echt.taxonomie.pfade.map((p, i) => `${i + 1} - ${p}`).join('\n'));
  const r4 = lauf(echt, { GOOGLE_TAXONOMIE_DATEI: vollTax });
  ist('Laden: vollständige Originaltaxonomie → geprüft gegen das Original', [r4.status, /GELADEN original/.test(r4.stdout)], [0, true]);
  rmSync(verz, { recursive: true, force: true });
}

// ─────────────────────────── Kernphrase und Kopfwort ───────────────────────────
ist('kern: «für» beendet die Ware', kernPhrase('Langleine für grosse Hunde'), 'Langleine');
ist('kern: «mit» beendet die Ware', kernPhrase('Hundebett mit Kissen'), 'Hundebett');
ist('kern: «aus» beendet die Ware', kernPhrase('Fressnapf aus Edelstahl'), 'Fressnapf');
ist('kern: Doppelpunkt', kernPhrase('Nagel-Ornamente: 20er-Set 3mm'), 'Nagel-Ornamente');
ist('kern: Gedankenstrich', kernPhrase('Wasserflasche – 750 ml, dicht'), 'Wasserflasche');
ist('kern: Komma', kernPhrase('Kleid, schwarz, Grösse M'), 'Kleid');
ist('kern: Klammer', kernPhrase('Hundeleine (3 m)'), 'Hundeleine');
ist('kern: «und» trennt', kernPhrase('Bürste und Kamm'), 'Bürste');
ist('kern: «Futter- und Wasserspender» — der Bindestrich heisst «rechts geht es weiter»', kernPhrase('Futter- und Wasserspender 3.8l'), 'Futter Wasserspender 3.8l');
ist('kern: «Hunde- & Katzenbett»', kernPhrase('Hunde- & Katzenbett'), 'Hunde Katzenbett');
ist('kern: Trenner am Anfang → ganzer Titel', kernPhrase('Für Hunde: Leine'), 'Für Hunde: Leine');
ist('kern: Bindestrich im Wort trennt NICHT', kernPhrase('Anti-Rutsch-Matte'), 'Anti-Rutsch-Matte');
ist('kern: «in» als Wort trennt, «in» in «3-in-1» nicht', [kernPhrase('3-in-1 Ladegerät'), kernPhrase('Ladegerät in Schwarz')], ['3-in-1 Ladegerät', 'Ladegerät']);
ist('kern: «Mini» (enthält «in») trennt nicht', kernPhrase('Mini Vortex Mischer für Nagellack'), 'Mini Vortex Mischer');
ist('kern: Gross/Klein egal', kernPhrase('Taschenlampe FÜR Camping'), 'Taschenlampe');
ist('kern: leerer Titel', kernPhrase(''), '');
ist('kern: kein String', kernPhrase(null), '');
ist('kopf: letztes Wort der Kernphrase', kopfwort('Freizeitjacke für Business und Pendeln'), 'freizeitjacke');
ist('kopf: Bindestrich teilt in Wörter, das letzte zählt', kopfwort('Wasserdichter Quartz-Uhr'), 'uhr');
ist('kopf: generisches «Set» wird übersprungen', kopfwort('10-teiliges Make-up Pinsel-Set'), 'pinsel');
ist('kopf: Zahlen und Grössen werden übersprungen', kopfwort('Kleid XL 2024'), 'kleid');
ist('kopf: Umlaute bleiben', kopfwort('Edelstahl Küchenschäler'), 'küchenschäler');
ist('kopf: nur generische Wörter → null', kopfwort('Set'), null);
ist('kopf: leer → null', kopfwort(''), null);
ist('kopf: Beschreibung nach «mit» zählt nicht', kopfwort('Hundebett mit Kissen'), 'hundebett');
ist('kandidaten: Strategie «erstes» (Ware steht vorn)', kopfKandidaten('Computermaus kabellos', ['kopf', 'erstes']), [{ wort: 'kabellos', strategie: 'kopf' }, { wort: 'computermaus', strategie: 'erstes' }]);
ist('kandidaten: gleiche Wörter nur einmal', kopfKandidaten('Hundebett', ['kopf', 'erstes', 'ende']), [{ wort: 'hundebett', strategie: 'kopf' }]);
ist('kandidaten: Strategie «ende» liest den ganzen Titel (Komma trennt Adjektive)', kopfKandidaten('Verstellbare, rutschfeste Hunde-Outdoorschuhe', ['ende'])[0].wort, 'outdoorschuhe');
ist('kandidaten: Vorgabe ist nur das Kopfwort', kopfKandidaten('Computermaus kabellos').map(k => k.wort), ['kabellos']);

// ─────────────────────────── Pfade ───────────────────────────
ist('liegtUnter: gleicher Pfad', liegtUnter(G.zangen, G.zangen), true);
ist('liegtUnter: Kind unter Elternteil', liegtUnter(G.zangen, G.werkzeug), true);
ist('liegtUnter: Elternteil nicht unter Kind', liegtUnter(G.werkzeug, G.zangen), false);
ist('liegtUnter: Namensvetter ist kein Kind («Hardware > Tools» vs. «Hardware > Toolsets»)', liegtUnter('Hardware > Toolsets', 'Hardware > Tools'), false);
ist('familie: erste zwei Ebenen', familie(G.zangen), 'Hardware > Tools');
ist('familie: drei Ebenen', familie(G.napf, 3), 'Animals & Pet Supplies > Pet Supplies > Pet Bowls, Feeders & Waterers');
ist('einigePfade: Kette → der tiefste', einigePfade([G.werkzeug, G.zangen]), G.zangen);
ist('einigePfade: gleich → einer', einigePfade([G.napf, G.napf]), G.napf);
ist('einigePfade: Widerspruch → null', einigePfade([G.napf, G.leine]), null);
ist('einigePfade: leer → null', einigePfade([]), null);

// ─────────────────────────── CJ-Blattname ───────────────────────────
ist('Name: Trenner « / » und «/»', normiereKategorieName('Jewelry & Watches/Fashion Jewelry / Rings'), 'Jewelry & Watches > Fashion Jewelry > Rings');
ist('Name: Voll-Komma wird normalisiert', normiereKategorieName('Home & Garden， Furniture'), 'Home & Garden, Furniture');
ist('Name: Leerzeichen zusammengezogen', normiereKategorieName('  Pet   Supplies >  Pet Beds '), 'Pet Supplies > Pet Beds');
ist('Schlüssel: nur das letzte Segment', blattSchluessel('Pet Supplies > Pet Bedding > Pet Beds'), blattSchluessel('Pet Beds'));
ist('Schlüssel: Mehrzahl = Einzahl (Bag/Bags)', blattSchluessel('Bag & Shoes') === blattSchluessel('Bags & Shoes'), true);
ist('Schlüssel: Men\'s = Mens', blattSchluessel("Men's Backpacks"), blattSchluessel('Mens Backpacks'));
ist('Schlüssel: Wortreihenfolge egal', blattSchluessel('Home, Garden & Furniture') === blattSchluessel('Home & Garden, Furniture'), true);
ist('Schlüssel: Babies = Baby', blattSchluessel('Toys, Kids & Babies') === blattSchluessel('Toys， Kids & Baby'), true);
ist('Schlüssel: verschiedene Blätter bleiben verschieden', blattSchluessel('Pet Beds') !== blattSchluessel('Pet Bowls'), true);
ist('Schlüssel: leer', blattSchluessel(''), '');

// ─────────────────────────── blattTabelle: Grenzen der Reinheit ───────────────────────────
const paare = (cid, pfade) => pfade.flatMap(([p, n]) => Array.from({ length: n }, () => ({ cid, name: 'Blatt ' + cid, pfad: p })));
{
  const t = blattTabelle([...paare('A', [[G.napf, 9], [G.leine, 1]]), ...paare('B', [[G.napf, 4], [G.leine, 1]]), ...paare('C', [[G.napf, 4]]), ...paare('D', [[G.napf, 8], [G.leine, 2]]),
    ...paare('E', [['Electronics', 6]]), ...paare('F', [[G.napf, 5]])]);
  ist('Tabelle: 9 von 10 = 90 % und n=10 → rein', [t.A.tabelle, t.A.anteil, t.A.n], [true, 0.9, 10]);
  ist('Tabelle: 4 von 5 = 80 % → nicht rein', [t.B.tabelle, t.B.anteil], [false, 0.8]);
  ist('Tabelle: 100 % aber nur 4 Produkte → nicht beurteilbar', [t.C.tabelle, t.C.n], [false, 4]);
  ist('Tabelle: 8 von 10 = 80 % → nicht rein', t.D.tabelle, false);
  ist('Tabelle: nur die oberste Ebene ist nie rein', t.E.tabelle, false);
  ist('Tabelle: genau 5 von 5 → rein', [t.F.tabelle, t.F.n], [true, 5]);
  ist('Tabelle: der häufigste Pfad steht vorn, die anderen als Kandidaten', t.A.kand, [[G.napf, 9], [G.leine, 1]]);
  ist('Tabelle: Name wird übernommen', t.A.name, 'Blatt A');
  ist('Tabelle: Schwelle ist einstellbar', blattTabelle(paare('B', [[G.napf, 4], [G.leine, 1]]), { reinMin: 0.8 }).B.tabelle, true);
  ist('Tabelle: Mindestzahl ist einstellbar', blattTabelle(paare('C', [[G.napf, 4]]), { minN: 4 }).C.tabelle, true);
  ist('Tabelle: Paare ohne Blatt oder Pfad werden übergangen', blattTabelle([{ cid: '', pfad: G.napf }, { cid: 'X' }, null, ...paare('A', [[G.napf, 5]])]).A.n, 5);
  ist('Tabelle: gleichauf → alphabetisch stabil', blattTabelle(paare('G', [[G.napf, 3], [G.leine, 3]])).G.pfad, G.leine < G.napf ? G.leine : G.napf);
}

// ─────────────────────────── Lexikon bauen ───────────────────────────
const bsp = (titel, pfad, n = 1) => Array.from({ length: n }, (_, i) => ({ titel: n > 1 ? `${titel} ${i + 1}` : titel, pfad }));
{
  const beispiele = [...bsp('Edelstahl Fressnapf', G.napf, 3), ...bsp('Napf', G.napf, 2), ...bsp('Keramiknapf', G.napf, 2), ...bsp('Hundeleine', G.leine, 4), ...bsp('Leine', G.leine, 2)];
  const lex = lexikonBauen(beispiele);
  ist('Lexikon: «napf» entsteht aus Napf/Fressnapf/Keramiknapf (7 Beispiele)', lex.find(e => e.k === 'napf') && [lex.find(e => e.k === 'napf').n, lex.find(e => e.k === 'napf').pfad], [7, G.napf]);
  ist('Lexikon: die längeren Schlüssel mit gleichem Pfad entfallen (fressnapf, keramiknapf)', lex.filter(e => e.pfad === G.napf).map(e => e.k), ['napf']);
  ist('Lexikon: «leine» (6 Beispiele)', lex.find(e => e.k === 'leine')?.n, 6);
  ist('Lexikon: Beispieltitel werden mitgeführt (höchstens 2)', lex.find(e => e.k === 'napf').bsp.length <= 2 && lex.find(e => e.k === 'napf').bsp.length > 0, true);
}
{
  const beispiele = [...bsp('Powerbank', G.lader, 4), ...bsp('Solar Powerbank', G.lader, 2), ...bsp('Sitzbank', 'Furniture > Benches', 1), ...bsp('Gartenbank', 'Furniture > Benches', 1), ...bsp('Bank', G.lader, 3)];
  const mit = lexikonBauen(beispiele);
  ist('Lexikon: «bank» schluckt «powerbank», solange es gilt (5 von 11 sind Sitzbänke? nein: 9 von 11 = 82 % → unter 90 %)', mit.some(e => e.k === 'bank'), false);
  const ohne = lexikonBauen([...beispiele.filter(b => !/Sitzbank|Gartenbank/.test(b.titel)), ...bsp('Parkbank', G.lader, 0)]);
  ist('Lexikon: ohne die Sitzbänke wäre «bank» ein Schlüssel', ohne.some(e => e.k === 'bank'), true);
  const verworfen = lexikonBauen([...beispiele.filter(b => !/Sitzbank|Gartenbank/.test(b.titel))], { verworfen: ['bank'] });
  ist('Lexikon: wer «bank» verwirft, bekommt «powerbank» zurück (verworfen wirkt VOR dem Zusammenfassen)', verworfen.map(e => e.k).sort(), ['powerbank']);
}
{
  const unter = lexikonBauen([...bsp('Hundeleine', G.leine, 2), ...bsp('Hundeball', G.hundekleidung, 1)]);
  ist('Lexikon: 2 Beispiele reichen nicht (Schwelle 3)', unter.length, 0);
  const genau = lexikonBauen(bsp('Hundeleine', G.leine, 3));
  ist('Lexikon: genau 3 Beispiele reichen', genau.length > 0, true);
  const neun = lexikonBauen([...bsp('Kleid', G.kleider, 9), ...bsp('Kleid X', G.schuhe, 1)]);
  ist('Lexikon: 9 von 10 = 90 % → Schlüssel', neun.some(e => e.k === 'kleid'), true);
  const acht = lexikonBauen([...bsp('Kleid', G.kleider, 8), ...bsp('Kleid X', G.schuhe, 2)]);
  ist('Lexikon: 8 von 10 = 80 % → kein Schlüssel', acht.some(e => e.k === 'kleid'), false);
  ist('Lexikon: Schwelle einstellbar', lexikonBauen([...bsp('Kleid', G.kleider, 8), ...bsp('Kleid X', G.schuhe, 2)], { rein: 0.8 }).some(e => e.k === 'kleid'), true);
  const kurz = lexikonBauen([...bsp('Gemüse-Wok', G.napf, 3), ...bsp('Wok', G.napf, 3)]);
  ist('Lexikon: 3-Buchstaben-Schlüssel gilt nur als ganzes Wort («wok»)', kurz.map(e => e.k), ['wok']);
  const drohne = lexikonBauen([...bsp('Drohne', 'Toys & Games > Toys > Remote Control Toys', 4), ...bsp('Krone', 'Apparel & Accessories > Clothing Accessories > Hair Accessories > Tiaras', 1)]);
  ist('Lexikon: kein Wortfetzen «ohne»/«rohne» aus «Drohne»', drohne.map(e => e.k), ['drohne']);
  const oberste = lexikonBauen(bsp('Wandertasche', 'Luggage & Bags', 5));
  ist('Lexikon: ein Pfad nur aus der obersten Ebene wird nie Schlüssel', oberste.length, 0);
  const schutz = lexikonBauen(bsp('Pinselset', 'Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Makeup Tools > Makeup Brushes', 4), { schutz: { pinselset: { muss: ['make-?up'] } } });
  ist('Lexikon: Schutzbedingung wird dem Schlüssel angehängt', schutz.find(e => e.k === 'pinselset')?.muss, ['make-?up']);
  ist('Lexikon: Zahlen und Grössen zählen nicht als Kopfwort', lexikonBauen(bsp('Kleid 10000 mAh', G.kleider, 4)).map(e => e.k), ['kleid']);
  // Grenze des Zusammenfassens: nur Endungen ab 4 Buchstaben schlucken einen längeren Schlüssel («tasche» schluckt «handtasche», «uhr» NICHT «armbanduhr»)
  const UHR = 'Apparel & Accessories > Jewelry > Watches';
  const uhren = lexikonBauen([...bsp('Uhr', UHR, 3), ...bsp('Armbanduhr', UHR, 3)]);
  ist('Lexikon: ein 3-Buchstaben-Schlüssel («uhr») schluckt «armbanduhr» nicht', uhren.map(e => e.k).sort(), ['armbanduhr', 'uhr']);
  const taschen = lexikonBauen([...bsp('Tasche', G.napf, 3), ...bsp('Handtasche', G.napf, 3)]);
  ist('Lexikon: dagegen schluckt eine Endung ab 4 Buchstaben («tasche») die längere («handtasche») bei gleichem Pfad', taschen.map(e => e.k), ['tasche']);
  const andere = lexikonBauen([...bsp('Tasche', G.napf, 27), ...bsp('Handtasche', G.leine, 3)]);   // «tasche»: 27 von 30 = 90 % → bleibt; «handtasche»: 3 von 3 mit anderem Pfad
  ist('Lexikon: bei verschiedenem Pfad bleiben beide', andere.map(e => e.k).sort(), ['handtasche', 'tasche']);
}
// Endungen des Kopfworts im Treffer: kurze Endungen sind Zufall, der längste Schlüssel gewinnt
{
  const lx = indexiere({ lexikon: [{ k: 'uhr', pfad: 'Apparel & Accessories > Jewelry > Watches', n: 9, rein: 1 }] }).lex;
  ist('Treffer: «uhr» gilt für das ganze Wort «Uhr»', lexikonTreffer('Damen Uhr', lx)?.schluessel, 'uhr');
  ist('Treffer: «uhr» gilt NICHT als Endung von «Wanduhr» (3 Buchstaben nur als ganzes Wort)', lexikonTreffer('Wanduhr', lx), null);
  const lang = indexiere({ lexikon: [{ k: 'tasche', pfad: G.napf, n: 9, rein: 1 }, { k: 'handtasche', pfad: G.leine, n: 9, rein: 1 }] }).lex;
  const t = lexikonTreffer('Damen Handtasche', lang);
  ist('Treffer: der LÄNGSTE passende Schlüssel gewinnt («handtasche» vor «tasche»)', [t?.schluessel, t?.pfad], ['handtasche', G.leine]);
  ist('Treffer: ohne den langen Schlüssel greift der kurze', lexikonTreffer('Reisetasche', lang)?.schluessel, 'tasche');
}

// ─────────────────────────── Lexikon ergänzen (von Hand gelesen) ───────────────────────────
{
  const gesamt = [...bsp('Hundehalsband', G.geschirr, 8), ...bsp('Hundehalsband X', G.leine, 2), ...bsp('Katzenhalsband', G.geschirr, 3)];
  const e = lexikonErgaenzen([], gesamt, [{ k: 'hundehalsband' }]);
  const h = e.lexikon[0];
  ist('Ergänzen: Pfad aus der Shop-Mehrheit, Anteil gemessen, Quelle «gelesen»', [h.k, h.pfad, h.n, h.rein, h.quelle], ['hundehalsband', G.geschirr, 10, 0.8, 'gelesen']);
  ist('Ergänzen: eigener Pfad statt Mehrheit', lexikonErgaenzen([], gesamt, [{ k: 'hundehalsband', pfad: G.leine }]).uebersprungen.map(u => u.k), ['hundehalsband']);
  ist('Ergänzen: zu wenig Beispiele (n=3) werden übersprungen', lexikonErgaenzen([], gesamt, [{ k: 'katzenhalsband' }]).uebersprungen[0].grund.startsWith('zu wenig Beleg'), true);
  ist('Ergänzen: unter 50 % wird übersprungen', lexikonErgaenzen([], [...bsp('Tasche', G.napf, 4), ...bsp('Tasche X', G.leine, 3), ...bsp('Tasche Y', G.geschirr, 3)], [{ k: 'tasche' }]).lexikon.length, 0);
  ist('Ergänzen: Schlüssel ohne Beispiele', lexikonErgaenzen([], gesamt, [{ k: 'nichtda' }]).uebersprungen[0].grund, 'keine Beispiele');
  ist('Ergänzen: steht schon im Lexikon → übersprungen', lexikonErgaenzen([{ k: 'hundehalsband', pfad: G.geschirr, n: 5, rein: 1 }], gesamt, [{ k: 'hundehalsband' }]).uebersprungen[0].grund, 'steht schon im Lexikon');
  const zwei = lexikonErgaenzen([], [...bsp('Hundejacke', G.hundekleidung, 5), ...bsp('Katzenjacke', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Apparel', 5)],
    [{ k: 'jacke', pfad: G.hundekleidung, muss: ['hund'] }, { k: 'jacke', pfad: 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Apparel', muss: ['katze'] }]);
  ist('Ergänzen: derselbe Schlüssel mit zwei Bedingungen ist erlaubt', zwei.lexikon.length, 2);
  ist('Ergänzen: derselbe Schlüssel ohne Bedingung zweimal ist nicht erlaubt', lexikonErgaenzen([], gesamt, [{ k: 'hundehalsband' }, { k: 'hundehalsband' }]).uebersprungen.length, 1);
  // Längere Schlüssel nehmen dem kürzeren die Beispiele weg: «teppich» soll nicht vom «wandteppich» seinen Pfad bekommen
  const tepp = [...bsp('Wandteppich', 'Home & Garden > Decor > Artwork > Decorative Tapestries', 6), ...bsp('Teppich', 'Home & Garden > Decor > Rugs', 5)];
  const lexT = lexikonBauen(tepp);
  const t2 = lexikonErgaenzen(lexT, tepp, [{ k: 'teppich' }]);
  ist('Ergänzen: «teppich» zählt die «wandteppich»-Beispiele nicht mit (sie treffen den längeren Schlüssel)', t2.lexikon.find(e => e.k === 'teppich')?.pfad, 'Home & Garden > Decor > Rugs');
}

// ─────────────────────────── regelTreffer: Kernphrase und ganzer Titel ───────────────────────────
{
  const regeln = [
    { id: 'taschenlampe', pfad: 'Hardware > Tools > Flashlights & Headlamps > Flashlights', titel_muss: ['taschenlampe'], titel_nicht: ['ersatz'] },
    { id: 'huelle', pfad: G.lader, bereich: 'titel', titel_muss: ['^(?=.*h[üu]lle)(?=.*iphone)'], titel_nicht: [] },
  ];
  ist('Regel: die Ware steht in der Kernphrase', regelTreffer('LED Taschenlampe mit Zoom', regeln).map(r => r.id), ['taschenlampe']);
  ist('Regel: Beschreibung nach «mit» zählt NICHT («Smartwatch mit Taschenlampe»)', regelTreffer('Smartwatch mit Taschenlampe', regeln).length, 0);
  ist('Regel: titel_nicht prüft den ganzen Titel', regelTreffer('Taschenlampe, Ersatzakku', regeln).length, 0);
  ist('Regel: bereich «titel» sieht auch nach dem Trenner («Hülle für iPhone»)', regelTreffer('Silikonhülle für iPhone 15', regeln).map(r => r.id), ['huelle']);
  ist('Regel: bereich «titel» braucht beide Teile', regelTreffer('Silikonhülle für Samsung', regeln).length, 0);
  ist('Regel: Gross/Klein egal', regelTreffer('TASCHENLAMPE', regeln).length, 1);
  ist('Regel: keine Regeln / kein Titel', [regelTreffer('x', []).length, regelTreffer(null, regeln).length], [0, 0]);
}

// ─────────────────────────── Titel gegen die echten Daten: gefundene Warenarten ───────────────────────────
// [Titel, Ende des erwarteten Pfads]. Jeder Titel ist ein echter Shop-Titel oder ein Beispiel der Lückenanalyse.
const POSITIV = [
  // die Zielblätter der Lückenanalyse (Handregeln)
  ['USB Webcam mit LED-Ringlicht', 'Webcams'], ['Full-HD Webcam mit Ringlicht und Mikrofon', 'Webcams'], ['Maulkorb aus Nylon für Hunde', 'Pet Muzzles'], ['Luxus-Kronleuchter', 'Chandeliers'],
  ['Wickelunterlage aus Baumwolle', 'Changing Mats & Trays'], ['Hundeschuhe wasserdicht', 'Dog Apparel'], ['Verstellbare, rutschfeste Hunde-Outdoorschuhe', 'Dog Apparel'],
  ['Moissanit-Verlobungsring 2 Karat, 3 Steine', 'Rings'], ['Manschettenknöpfe aus Edelstahl mit Alphabet', 'Cufflinks'], ['Handy-Lanyard mit abnehmbarer Handschlaufe', 'Mobile Phone Charms & Straps'],
  ['Panzerglas Schutzfolie für iPhone · 4er-Pack', 'Screen Protectors'], ['Schutzfolie aus gehärtetem Glas für iPhone', 'Screen Protectors'], ['Hardcase iPhone®-Hülle mit MagSafe® – Selbst gestalten', 'Mobile Phone Cases'],
  ['Tablet-Hülle mit Stiftschlitz und Drehgriff', 'Computer Covers & Skins'], ['Canvas Laptop-Schutzhülle', 'Computer Covers & Skins'], ['Laptop-Tasche für Herren', 'Briefcases'],
  ['LED Solar-Lichterkette XL – 8 Leuchtmodi', 'Light Ropes & Strings'], ['1080P Dashcam mit 4 Kameras und Nachtsicht', 'Motor Vehicle Electronics'], ['HD Rückfahrkamera mit Infrarot-Nachtsicht', 'Motor Vehicle Parking Cameras'],
  ['Mini 2-in-1 CarPlay USB Interface Wireless', 'Motor Vehicle Electronics'], ['Beamer-Leinwand 100 Zoll faltbar', 'Projection Screens'], ['Baby-Overall mit Rüschen', 'Baby One-Pieces'], ['Baby Plüsch-Overall mit Kapuze', 'Baby One-Pieces'],
  ['Sommer-Schlafsack für Baby & Kleinkind', 'Baby & Toddler Sleepwear'], ['Mumienschlafsack für Camping', 'Sleeping Bags'], ['Auto Windschutzscheibenabdeckung für Schnee', 'Motor Vehicle Windshield Covers'],
  ['Skibrille Anti-Beschlag mit Magnetlinse', 'Ski & Snowboard Goggles'], ['Taschenlampe LED aufladbar', 'Flashlights'], ['LED-Stirnlampe zum Laufen', 'Headlamps'], ['Werkzeugkoffer 108-teilig', 'Hand Tool Sets'],
  ['Werkzeugtasche aus Segeltuch', 'Tool Bags'], ['Kleiner Aquarium-Filter mit Wasserpumpe', 'Aquarium Filters'], ['Kunststoff-Korallenbaum für Aquarien', 'Aquarium Decor'], ['Augenbrauengel', 'Eyebrow Enhancers'],
  ['Kinderuhr mit Lernfunktion', 'Watches'], ['Fusskettchen aus Silber', 'Anklets'], ['Arcade Joystick USB', 'Joystick Controllers'], ['Lötkolben 60 W einstellbar', 'Soldering Irons'],
  ['Angelrute Teleskop 2,4 m', 'Fishing Rods'], ['Angelschnur geflochten 275 m', 'Fishing Lines & Leaders'], ['HDMI-Kabel 2 m 4K', 'Audio & Video Cables'], ['AirPods Hülle aus Silikon', 'Headphone & Headset Accessories'],
  ['Perücke Aya blau mit schwarz', 'Wigs'], ['Fahrradhandschuhe Halbfinger', 'Bicycle Gloves'], ['Atmungsaktive Anti-Rutsch Velo-Handschuhe', 'Bicycle Gloves'], ['Solar-Gartenleuchte «Lumio» · Aluminium, automatisch', 'Landscape Pathway Lighting'],
  ['Katzen Tunnel zum Spielen', 'Cat Toys'], ['Niedliches Halstuch für Haustiere im Schottenmuster', 'Dog Apparel'], ['Dicker Strickpullover für kleine Hunde und Katzen', 'Dog Apparel'],
  ['Wintermantel für Sphynx-Katzen', 'Cat Apparel'], ['Hunde-Trinkflasche mit Napf – 800ml', 'Pet Bowls, Feeders & Waterers'],
  // Lexikon: gemessene Schlüssel
  ['Hundebett mit Kissen', 'Dog Beds'], ['Fressnapf aus Edelstahl', 'Pet Bowls, Feeders & Waterers'], ['Langleine für grosse Hunde', 'Pet Leashes'], ['Kabellose Powerbank 10000mAh', 'Power Adapters & Chargers'],
  ['Press-on Nägel mit 3D Blumen', 'False Nails'], ['Malen nach Zahlen – Landschaft, Tier oder Blume', 'Drawing & Painting Kits'], ['Klemmbausteine Set 500 Teile', 'Interlocking Blocks'], ['Holzbausteine für Kinder', 'Wooden Blocks'],
  ['Polarisierte Sonnenbrille mit UV400', 'Sunglasses'], ['Edelstahl-Bratpfanne mit Wabenstruktur', 'Skillets & Frying Pans'], ['Retro-Spielkonsole mit 2 Controllern', 'Video Game Consoles'],
  ['Gesichtsdampfer', 'Facial Saunas'], ['Mini-Lockenstab mit zwei Thermostaten', 'Curling Irons'], ['Verdunkelungsvorhang 140x245', 'Curtains & Drapes'], ['Rattan Vintage Wandlampe', 'Wall Light Fixtures'],
  ['Elegantes Sommerkleid aus Baumwolle', 'Dresses'], ['Casual Muffin Stiefel mit dicker Sohle', 'Shoes'], ['Wasserdichter Quartz-Uhr', 'Watches'], ['Plissee-Midirock', 'Skirts'], ['Herren-Smartwatch mit Anruffunktion', 'Watches'],
  // von Hand gelesene Einträge
  ['Hundehalsband für mittlere und grosse Hunde', 'Pet Collars & Harnesses'], ['Tischlampe mit Touch-Funktion', 'Lamps'], ['Aroma-Diffuser in Holzoptik', 'Home Fragrance Accessories'], ['Teppich in Beige, unregelmässige Form', 'Rugs'],
];
for (const [titel, ende] of POSITIV) {
  const u = titelUrteil(titel);
  ist(`Titel «${titel}»`, u && !u.konflikt ? letzte(u.pfad) : u, ende);
}
// Gegenproben: dieselben Wörter in anderer Bedeutung dürfen NICHT zum selben Pfad führen
const NEGATIV = [
  ['Webcam-Abdeckung zum Schieben', 'Webcams'], ['Smartwatch mit Bluetooth-Telefonie und Taschenlampe', 'Flashlights'], ['Business Schultertasche mit Laptopfach', 'Briefcases'],
  ['Sitzbank aus Holz', 'Power Adapters & Chargers'], ['Gartenbank mit Lehne', 'Power Adapters & Chargers'], ['Wäscheleine zum Aufhängen', 'Pet Leashes'], ['Kleiderleine ausziehbar', 'Pet Leashes'],
  ['Stahlnägel 100 Stück', 'False Nails'], ['Klebstoff für Holz und Metall', 'Fabric'], ['Edelsteine zum Basteln', 'Interlocking Blocks'], ['Pflastersteine grau', 'Interlocking Blocks'],
  ['Winter-Handschuhe für Damen', 'Shoes'], ['Lederhandschuhe', 'Shoes'], ['Party Skibrille Galaxy schwarz', 'Ski & Snowboard Goggles'], ['Haar-Diffusor für Föhn', 'Home Fragrance Accessories'],
  ['Plüschmaus für Katzen', 'Mice & Trackballs'], ['Fledermaus Kostüm', 'Mice & Trackballs'], ['Dachpfannen aus Ton', 'Skillets & Frying Pans'], ['Handschlaufe für Hundeleine', 'Mobile Phone Charms & Straps'],
  ['Hundeleine mit Handschlaufe', 'Mobile Phone Charms & Straps'], ['Teleskoplader 1:14 RC', 'Power Adapters & Chargers'], ['Bluetooth-Sonnenbrille mit Stereo-Headset', 'Sunglasses'], ['Schweisszange 800A aus Rotkupfer', 'Pliers'],
  ['Handtuchhalter für Papier', 'Towel Racks & Holders'], ['Kleiner Aquarium-Dekostein mit Kissen', 'Throw Pillows'],
];
for (const [titel, nicht] of NEGATIV) {
  const u = titelUrteil(titel);
  ist(`Gegenprobe «${titel}» ist NICHT «${nicht}»`, !(u && !u.konflikt && letzte(u.pfad) === nicht), true);
}
ist('Powerbank-Schlüsselanhänger: die Regel «schluesselanhaenger» ist gestrichen (9 von 57), die Powerbank-Regel entscheidet allein', titelUrteil('Mini Powerbank Schlüsselanhänger 1200 mAh'), { pfad: 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers', quelle: 'regel', regel: ['powerbank'] });
ist('Konflikt: leerer Titel ist kein Konflikt, nur unbekannt', titelUrteil('   '), null);
ist('Titel ohne Warenart → null', titelUrteil('Neu 2024 Bestseller'), null);
ist('Titel: Pfad der Regel gewinnt vor dem Lexikon («Hundeschuhe» endet auf «schuhe» = Shoes)', letzte(titelUrteil('Hundeschuhe wasserdicht').pfad), 'Dog Apparel');
ist('Titel: Quelle «regel» trägt die Kennung', titelUrteil('Hundeschuhe wasserdicht').regel, ['hundeschuhe']);
ist('Titel: Quelle «lexikon» trägt Schlüssel, Kopfwort und Anteil', (({ quelle, schluessel, kopfwort, rein, strategie }) => ({ quelle, schluessel, kopfwort, strategie, reinOk: rein >= 0.9 }))(titelUrteil('Fressnapf aus Edelstahl')),
  { quelle: 'lexikon', schluessel: 'napf', kopfwort: 'fressnapf', strategie: 'kopf', reinOk: true });
ist('Lexikon: Schutz «muss» — Pinselset nur mit Make-up-Hinweis', [lexikonTreffer('Make-up Pinselset 12-teilig') !== null, lexikonTreffer('Aquarell Pinselset für Künstler') === null], [true, true]);
ist('Lexikon: Strategie «erstes» findet die Ware vorn («Computermaus kabellos»)', [titelUrteil('Computermaus kabellos'), letzte(titelUrteil('Computermaus kabellos', INDEX, ['kopf', 'erstes'])?.pfad)], [null, 'Mice & Trackballs']);

// ─────────────────────────── blattUrteil ───────────────────────────
const REIN_ID = Object.keys(DATEN.blaetter).find(c => DATEN.blaetter[c].name === 'Rings');
const UNREIN_ID = Object.keys(DATEN.blaetter).find(c => DATEN.blaetter[c].name === 'Hand Tools');
const BOWLS_ID = Object.keys(DATEN.blaetter).find(c => DATEN.blaetter[c].name === 'Pet Bowls');
ist('Blatt: «Rings» ist rein', (({ bekannt, rein, pfad, n }) => ({ bekannt, rein, pfad, n }))(blattUrteil(REIN_ID, 'Rings')), { bekannt: true, rein: true, pfad: G.ringe, n: 249 });
ist('Blatt: «Hand Tools» ist unrein', (({ bekannt, rein }) => ({ bekannt, rein }))(blattUrteil(UNREIN_ID, 'Hand Tools')), { bekannt: true, rein: false });
ist('Blatt: unbekannte id → unbekannt', blattUrteil('GIBTS-NICHT', 'Rings'), { bekannt: false, id: 'GIBTS-NICHT' });
ist('Blatt: ohne id findet der Name genau ein Blatt', (({ bekannt, id, ueber }) => ({ bekannt, id, ueber }))(blattUrteil(undefined, 'Jewelry & Watches/Fashion Jewelry/Rings')), { bekannt: true, id: REIN_ID, ueber: 'name' });
ist('Blatt: Zahl als id wird zu Text', blattUrteil(Number(BOWLS_ID) || BOWLS_ID, '').bekannt, true);
ist('Blatt: unbekannte id UND bekannter Name → unbekannt (eine fremde id wird nicht überstimmt)', blattUrteil('GIBTS-NICHT', 'Rings').bekannt, false);
ist('Blatt: ohne id und ohne Namen', blattUrteil(undefined, undefined), { bekannt: false, id: null });
ist('Blatt: mehrdeutiger Name (zwei Blätter, gleicher Schlüssel) → unbekannt', (() => {
  const ix = indexiere({ blaetter: { A: { name: 'Pet Bags', n: 5, pfad: G.napf, anteil: 1, kand: [[G.napf, 5]], tabelle: true }, B: { name: 'Pet Bags', n: 5, pfad: G.leine, anteil: 1, kand: [[G.leine, 5]], tabelle: true } } });
  return blattUrteil(undefined, 'Pet Supplies > Pet Bags', ix).bekannt;
})(), false);

// ─────────────────────────── googlePfad: die Entscheidungsmatrix (eigene Daten) ───────────────────────────
const DEMO = {
  blaetter: {
    REIN: { name: 'Pet Bowls', n: 25, pfad: G.napf, anteil: 1, kand: [[G.napf, 25]], tabelle: true },
    UNREIN: { name: 'Hand Tools', n: 100, pfad: G.werkzeug, anteil: 0.5, kand: [[G.werkzeug, 50], [G.kuchenform, 30], ['Hardware > Tools > Screwdrivers', 20]], tabelle: false },
  },
  regeln: [{ id: 'r-webcam', pfad: G.webcam, titel_muss: ['webcam'], titel_nicht: [], beleg: { n: 10, gleich: 9 } }, { id: 'r-neu', pfad: G.zangen, titel_muss: ['zangenset'], titel_nicht: [], beleg: { n: 0, gleich: 0 } },
    { id: 'r-vier', pfad: G.webcam, titel_muss: ['viertreffer'], titel_nicht: [], beleg: { n: 4, gleich: 4 } }, { id: 'r-fuenf', pfad: G.webcam, titel_muss: ['fuenftreffer'], titel_nicht: [], beleg: { n: 5, gleich: 4 } }],
  lexikon: [{ k: 'napf', pfad: G.napf, n: 265, rein: 1 }, { k: 'zange', pfad: G.zangen, n: 9, rein: 0.78, quelle: 'gelesen' }, { k: 'leine', pfad: G.leine, n: 403, rein: 0.99 }, { k: 'kuchenform', pfad: G.kuchenform, n: 9, rein: 1 }],
};
const ix = indexiere(DEMO);
const dm = (titel, cid, opt) => googlePfad({ categoryId: cid, categoryName: undefined, titel }, { index: ix, ...opt });
{
  const a = dm('', 'REIN');
  ist('Matrix: reines Blatt, kein Titel → tabelle', [a.sicherheit, a.pfad, a.quelle, a.vertrauen], ['tabelle', G.napf, 'blatt', 1]);
  const b = dm('Futternapf aus Keramik', 'REIN');
  ist('Matrix: reines Blatt, Titel bestätigt → tabelle', [b.sicherheit, b.pfad], ['tabelle', G.napf]);
  const c = dm('Hundeleine mit Handschlaufe', 'REIN');
  ist('Matrix: reines Blatt, Titel widerspricht → unklar', [c.sicherheit, c.pfad, /widerspricht dem reinen Blatt/.test(c.grund)], ['unklar', null, true]);
  const d = dm('Futternapf aus Keramik', 'UNREIN');
  ist('Matrix: unreines Blatt, Titel passt NICHT zur Familie der Blattpfade → unklar (Familienprüfung)', [d.sicherheit, /passt zu keinem der beobachteten Pfade/.test(d.grund)], ['unklar', true]);
  const d2 = dm('Futternapf aus Keramik', 'UNREIN', { blattPruefung: false });
  ist('Matrix: dasselbe ohne Familienprüfung → titel', [d2.sicherheit, d2.pfad], ['titel', G.napf]);
  const e = dm('Kuchenform aus Silikon', 'UNREIN');
  ist('Matrix: unreines Blatt, Titel in der Familie eines Blattpfads → titel', [e.sicherheit, e.pfad, e.vertrauen, e.quelle], ['titel', G.kuchenform, 1, 'lexikon']);
  const f = dm('Futternapf aus Keramik', 'UNBEKANNT');
  ist('Matrix: unbekanntes Blatt, Titel trägt → titel (keine Familienprüfung möglich)', [f.sicherheit, f.pfad, f.blatt], ['titel', G.napf, null]);
  const g = dm('Neu 2024 Bestseller', 'UNBEKANNT');
  ist('Matrix: unbekanntes Blatt, Titel ohne Warenart → unklar', [g.sicherheit, g.pfad, /Blatt unbekannt/.test(g.grund)], ['unklar', null, true]);
  const h = dm('Neu 2024 Bestseller', 'UNREIN');
  ist('Matrix: unreines Blatt, Titel ohne Warenart → unklar, Grund nennt die Unreinheit', [h.sicherheit, /unrein/.test(h.grund)], ['unklar', true]);
  const i = dm('Webcam mit Zangenset', 'UNBEKANNT');
  ist('Matrix: zwei Handregeln mit verschiedenen Pfaden → unklar (Kernphrase «Webcam» gewinnt, «Zangenset» steht hinter «mit»)', [i.sicherheit, i.pfad], ['titel', G.webcam]);
  const j = dm('Webcam Zangenset', 'UNBEKANNT');
  ist('Matrix: beide Regeln in der Kernphrase → Widerspruch → unklar', [j.sicherheit, /widersprechen sich/.test(j.grund)], ['unklar', true]);
  const k = dm('Webcam 1080p', 'UNBEKANNT');
  ist('Matrix: Regel mit 10 Shop-Treffern → vertrauen 0,9', k.vertrauen, 0.9);
  const l = dm('Zangenset 24-teilig', 'UNBEKANNT');
  ist('Matrix: Regel ohne Shop-Beleg (n=0) → vertrauen null', [l.sicherheit, l.vertrauen], ['titel', null]);
  ist('Matrix: Regel mit 4 Shop-Treffern (alle gleich) → noch kein Beleg → vertrauen null', [dm('Viertreffer Kamera', 'UNBEKANNT').sicherheit, dm('Viertreffer Kamera', 'UNBEKANNT').vertrauen], ['titel', null]);
  ist('Matrix: Regel mit genau 5 Shop-Treffern (4 gleich) → vertrauen 0,8', dm('Fuenftreffer Kamera', 'UNBEKANNT').vertrauen, 0.8);
  const m = dm('Edelstahl Zange', 'UNBEKANNT');
  ist('Matrix: gelesener Eintrag → vertrauen = gemessener Anteil', [m.sicherheit, m.vertrauen, m.pfad], ['titel', 0.78, G.zangen]);
  const n = googlePfad({ categoryId: undefined, categoryName: 'Pet Supplies > Pet Bowls', titel: '' }, { index: ix });
  ist('Matrix: ohne id findet der Blattname das reine Blatt', [n.sicherheit, n.pfad, n.blatt?.ueber], ['tabelle', G.napf, 'name']);
  ist('Matrix: Grund ist Klartext und nennt Zahl und Blatt', /Pet Bowls/.test(a.grund) && /25/.test(a.grund) && /100 %/.test(a.grund), true);
  ist('Matrix: Ergebnisform ist vollständig', Object.keys(a).sort(), ['blatt', 'grund', 'pfad', 'quelle', 'sicherheit', 'titel', 'vertrauen']);
  ist('Matrix: unklar hat pfad null und vertrauen null', (({ pfad, vertrauen, quelle }) => ({ pfad, vertrauen, quelle }))(g), { pfad: null, vertrauen: null, quelle: null });
}
ist('Eingabe: kein Objekt', googlePfad(undefined).sicherheit, 'unklar');
ist('Eingabe: Titel ist keine Zeichenkette', googlePfad({ titel: 42, categoryId: 'X' }).sicherheit, 'unklar');
ist('Eingabe: leeres Objekt', googlePfad({}).sicherheit, 'unklar');
ist('Eingabe: nur Titel genügt', pf('Hundebett mit Kissen').sicherheit, 'titel');
wirft('googlePfad wirft nie bei Müll', () => { googlePfad(null); googlePfad(7); googlePfad({ titel: {}, categoryId: [] }); throw new Error('ok'); }, /^ok$/);

// ─────────────────────────── googlePfad gegen die echten Daten ───────────────────────────
{
  const rein = Object.entries(DATEN.blaetter).filter(([, b]) => b.tabelle);
  const falsch = rein.filter(([cid, b]) => { const r = googlePfad({ categoryId: cid, titel: '' }); return !(r.sicherheit === 'tabelle' && r.pfad === b.pfad); });
  ist('Echt: jedes der 17 reinen Blätter liefert ohne Titel seinen Pfad als «tabelle»', falsch.map(([c, b]) => b.name), []);
  const unrein = Object.entries(DATEN.blaetter).filter(([, b]) => !b.tabelle);
  const durch = unrein.filter(([cid]) => googlePfad({ categoryId: cid, titel: '' }).sicherheit !== 'unklar');
  ist('Echt: kein unreines Blatt liefert ohne Titel einen Pfad', durch.map(([c, b]) => b.name), []);
}
ist('Echt: Ring im Blatt «Rings» (bestätigt)', (({ sicherheit, pfad }) => ({ sicherheit, pfad }))(pf('Moissanit-Ring Sterlingsilber', { categoryId: REIN_ID })), { sicherheit: 'tabelle', pfad: G.ringe });
ist('Echt: Fremdkörper im reinen Blatt → unklar («Hundeleine» im Blatt «Rings»)', pf('Hundeleine mit Handschlaufe', { categoryId: REIN_ID }).sicherheit, 'unklar');
ist('Echt: Titel wird ohne Blatt entschieden (neues CJ-Blatt)', (({ sicherheit, pfad }) => ({ sicherheit, pfad }))(pf('Edelstahl-Bratpfanne mit Wabenstruktur', { categoryId: 'NEU-BLATT-0001' })), { sicherheit: 'titel', pfad: 'Home & Garden > Kitchen & Dining > Cookware & Bakeware > Cookware > Skillets & Frying Pans' });
ist('Echt: Staubsauger-Titel im Blatt «Pet Bowls» → unklar (CJ ordnet selbst falsch ein)', pf('Handstaubsauger für Tierhaare', { categoryId: BOWLS_ID }).sicherheit, 'unklar');
ist('Echt: Blattname allein aus dem CJ-Pfad (ohne id)', pf('', { categoryName: 'Jewelry & Watches/Fashion Jewelry/Rings' }).pfad, G.ringe);

// ─────────────────────────── taxTags und kategorieFuer ───────────────────────────
{
  const t1 = taxTags({ title: 'Hunde Fressnapf aus Edelstahl', g: G.napf });
  ist('Tags: Hundenapf liegt in Haustier, Hunde, Näpfe', ['sort-haustier', 'sort-hunde', 'sort-tier-naepfe'].every(t => t1.includes(t)), true);
  ist('Tags: sortiert und ohne Doppelte', t1, [...new Set(t1)].sort());
  ist('Tags: Tasse liegt in der Tassen-Kategorie (Tag der Kategorie, nicht immer «sort-»)', taxTags({ title: 'Keramiktasse mit Schmetterlingsmuster', g: G.tassen }), ['tassen-becher']);
  ist('Tags: ohne Pfad entscheidet allein der Titel (Tasse)', taxTags({ title: 'Keramiktasse mit Schmetterlingsmuster' }).includes('tassen-becher'), true);
  ist('Tags: `pfad` statt `g` und `titel` statt `title` werden verstanden', taxTags({ titel: 'Keramiktasse mit Schmetterlingsmuster', pfad: G.tassen }), ['tassen-becher']);
  ist('Tags: Sperr-Tag am Produkt schliesst jede Kategorie aus', taxTags({ title: 'Hunde Fressnapf aus Edelstahl', g: G.napf, tags: ['nicht-bewerben'] }), []);
  ist('Tags: Waffen-Sperr-Tag ebenso', taxTags({ title: 'Hunde Fressnapf aus Edelstahl', g: G.napf, tags: ['waffenzubehoer-nicht-verkaufen'] }), []);
  ist('Tags: nichts Passendes → leer', taxTags({ title: 'Neu 2024 Bestseller', g: '' }), []);
  ist('Tags: kein Produkt → leer', taxTags(undefined), []);
  const kat = [{ tag: 'sort-demo', passt: p => /demo/.test(p.title) }, { tag: 'sort-nie', passt: () => false }, { handle: 'ohne-tag', passt: () => true }];
  ist('Tags: eigene Kategorien (Bereichsdateien) werden ausgewertet; ohne Tag zählt nichts', taxTags({ title: 'demo' }, { kategorien: kat }), ['sort-demo']);
  // Mode-Regeln merken sich das Geschlecht je Handle: ohne Handle darf die Reihenfolge der Aufrufe nichts ändern
  const kleid = { title: 'Elegantes Abendkleid für Damen', g: G.kleider };
  const vorher = taxTags(kleid);
  taxTags({ title: 'Herren Anzughose', g: 'Apparel & Accessories > Clothing > Pants' }); taxTags({ title: 'Hunde Fressnapf', g: G.napf }); taxTags({ title: 'Baby Strampler', g: 'Apparel & Accessories > Clothing > Baby & Toddler Clothing > Baby One-Pieces' });
  ist('Tags: gleiches Produkt ohne Handle → gleiches Ergebnis, egal was davor ausgewertet wurde', taxTags(kleid), vorher);
  ist('Tags: Damenkleid bekommt Damen-Kategorien', vorher.includes('sort-damen-kleider'), true);
  ist('Tags: dasselbe Kleid für Herren bekommt keine Damen-Kategorie', taxTags({ title: 'Herren Kleid Kostüm', g: G.kleider }).includes('sort-damen-kleider'), false);
}
{
  const ber = { kategorien: [{ handle: 'a', titel: 'A', unterfilter: [{ handle: 'a-x', titel: 'AX' }] }, { handle: 'b', titel: 'B' }] };
  const aufrufe = [];
  const k = bereichKategorien(ber, { passt: (kat, p) => { aufrufe.push(kat.handle); return kat.handle === 'a' && /demo/.test(p.title); }, imUnterfilter: (u, p) => /xx/.test(p.title) });
  ist('Bereich: Kategorie und Unterfilter werden zu Tags sort-<handle>', k.map(x => x.tag), ['sort-a', 'sort-a-x', 'sort-b']);
  ist('Bereich: Unterfilter wirkt nur, wenn die Kategorie passt', [taxTags({ title: 'demo xx' }, { kategorien: k }), taxTags({ title: 'demo' }, { kategorien: k }), taxTags({ title: 'xx' }, { kategorien: k })], [['sort-a', 'sort-a-x'], ['sort-a'], []]);
  ist('Bereich: normiere wird vor der Auswertung angewendet', bereichKategorien(ber, { passt: (kat, p) => p.g === 'X', imUnterfilter: () => true, normiere: p => ({ ...p, g: 'X' }) })[0].passt({ title: 't' }), true);
}
{
  const a = kategorieFuer({ titel: 'Hunde Fressnapf aus Edelstahl' });
  ist('kategorieFuer: Pfad, Sicherheit und Tags in einem Aufruf; anlegen = ja', [a.pfad, a.sicherheit, a.tags.includes('sort-hunde'), a.anlegen], [G.napf, 'titel', true, true]);
  const b = kategorieFuer({ titel: 'Neu 2024 Bestseller' });
  ist('kategorieFuer: unklar → keine Tags, nicht anlegen', [b.sicherheit, b.tags, b.anlegen], ['unklar', [], false]);
  const c = kategorieFuer({ titel: 'Handy-Lanyard mit abnehmbarer Handschlaufe' });
  ist('kategorieFuer: Pfad sicher, aber keine passende sort-Kategorie → nicht anlegen (Kriterium des Besitzers: «in die passende Kategorie»)', [c.sicherheit, c.tags, c.anlegen], ['titel', [], false]);
  const d = kategorieFuer({ titel: 'Hunde Fressnapf aus Edelstahl', tags: ['nicht-bewerben'] });
  ist('kategorieFuer: Sperr-Tag → keine Tags → nicht anlegen', [d.sicherheit, d.tags, d.anlegen], ['titel', [], false]);
  const e = kategorieFuer({ titel: 'Elegantes Abendkleid für Damen', handle: 'abendkleid-test-123456', tags: ['damen'], productType: 'Damenmode' });
  ist('kategorieFuer: Handle, Tags und Typ des geplanten Produkts werden an die Mode-Regeln weitergegeben', [e.pfad, e.tags.includes('sort-damen-kleider-abend')], [G.kleider, true]);
}

// ─────────────────────────── Prüfung 27.10.2026: schwache Handregeln, Guards, hundekleidung-titel ───────────────────────────
{
  const regelIds = new Set(DATEN.regeln.map(r => r.id));
  // Streichung statt Raten: Regeln, die im Shop-Abgleich unter 70 % lagen und deren Fehlgriff ein falsches Zielblatt wäre
  for (const id of ['3d-stift', 'kopfkissenbezug', 'schnueffelmatte', 'fensterfolie', 'schluesselanhaenger', 'kranz']) ist(`gestrichene Handregel «${id}» steht nicht mehr in den Daten`, regelIds.has(id), false);
  for (const t of ['Schnüffelteppich für Hunde', 'Kopfkissenbezug Satin 80x80', 'Schlüsselanhänger Leder', 'Kranz Tür Weihnachten']) ist(`gestrichene Regel: «${t}» bleibt ohne Pfad (unklar statt geraten)`, titelUrteil(t), null);
  // Richtlinie: eine Handregel mit `n >= 5`, die unter 70 % beim Shop liegt, trägt eine bewusste Begründung (sonst streichen oder schärfen)
  const schwach = DATEN.regeln.filter(r => r.beleg.n >= 5 && r.beleg.gleich / r.beleg.n < 0.7);
  ist('jede Handregel unter 70 % Übereinstimmung (n >= 5) trägt «bewusst» mit Begründung', schwach.filter(r => !(typeof r.bewusst === 'string' && r.bewusst.length > 30)).map(r => r.id), []);
  ist('«bewusst» steht nur bei Regeln, die wirklich unter 70 % liegen', DATEN.regeln.filter(r => r.bewusst && !(r.beleg.n >= 5 && r.beleg.gleich / r.beleg.n < 0.7)).map(r => r.id), []);
  // hundekleidung-titel: Wasserschale ist keine Hundekleidung, Pullover und Schal bleiben es
  for (const t of ['Hunde Wasserschale faltbar', 'Hunde-Trinkschale Silikon', 'Zuggeschirr Hund Weste', 'Hunde Zugweste']) ist(`hundekleidung-titel: «${t}» ist keine Hundekleidung`, titelUrteil(t)?.pfad === G.hundekleidung, false);
  for (const t of ['Hundepullover warm', 'Hundeschal Winter', 'Dicker Strickpullover für kleine Hunde und Katzen']) ist(`hundekleidung-titel: «${t}» bleibt Hundekleidung`, titelUrteil(t)?.pfad, G.hundekleidung);
  // Guards an Lexikon-Einträgen und Regeln: gleiche Wörter, andere Bedeutung → kein Pfad
  for (const t of ['Grillzange aus Edelstahl', 'Futterteller für Katzen', 'Futterteller aus Keramik', 'Fressteller aus Keramik', 'Schallplatten-Uhr Wanduhr Vinyl', 'Uhr aus Vinyl-Schallplatte', 'Fahrrad Transporttasche', 'VR-Transporttasche', 'Manschettenknopf Uhr Box']) ist(`Guard: «${t}» bleibt unklar`, titelUrteil(t), null);
  // Titel, bei denen genau EIN Guard den Unterschied macht (gemessen: ohne den Guard liefert das Lexikon bzw. die Regel hier einen falschen Pfad)
  ist('Guard «uhr»: «Uhr aus Vinyl-Schallplatte» ist keine Armbanduhr', titelUrteil('Uhr aus Vinyl-Schallplatte'), null);
  ist('Guard «teller»: «Futterteller aus Keramik» ist kein Essgeschirr', titelUrteil('Futterteller aus Keramik'), null);
  ist('Guard «essteller»: «Fressteller aus Keramik» (Haustier) ist kein Essteller; echte Essteller bleiben', [titelUrteil('Fressteller aus Keramik'), letzte(titelUrteil('Keramik-Essteller mit Doppelraster')?.pfad)], [null, 'Plates']);
  ist('hundekleidung-titel: «Schallschutz»/«Schallplatte» enthalten «schal» und sind trotzdem keine Hundekleidung (Wortende nach «schal»)', ['Hunde Schallplatte', 'Hunde Schallschutz Ohrenschützer'].map(t => titelUrteil(t)?.pfad === G.hundekleidung), [false, false]);
  // ...und die Fälle, für die der Eintrag gedacht ist, laufen weiter
  ist('Guard: «Herren Business Uhr» bleibt Uhr', letzte(titelUrteil('Herren Business Uhr – Multifunktional')?.pfad), 'Watches');
  ist('Guard: «Sporttasche für Männer» bleibt Sporttasche', letzte(titelUrteil('Sporttasche für Männer')?.pfad), 'Duffel Bags');
  ist('Guard: «Manschettenknöpfe aus Edelstahl» bleiben Manschettenknöpfe', letzte(titelUrteil('Manschettenknöpfe aus Edelstahl mit Alphabet')?.pfad), 'Cufflinks');
  // der Beleg einer geänderten Regel ist neu gemessen (nicht mehr der alte, unlesbar grosse Wert)
  const beleg = id => DATEN.regeln.find(r => r.id === id)?.beleg;
  ist('Beleg manschettenknopf neu gemessen (3 von 3)', beleg('manschettenknopf'), { n: 3, gleich: 3 });
  ist('Beleg katzenkleidung neu gemessen (26 von 26)', beleg('katzenkleidung'), { n: 26, gleich: 26 });
  ist('Beleg haustier-transport neu gemessen (18 von 24)', beleg('haustier-transport'), { n: 24, gleich: 18 });
  ist('Beleg tablet-halter neu gemessen (3 von 3)', beleg('tablet-halter'), { n: 3, gleich: 3 });
  ist('Beleg hundeschuhe neu gemessen (4 von 4)', beleg('hundeschuhe'), { n: 4, gleich: 4 });
  // Lexikon: der Guard steht im Eintrag (nicht in einer Nebenliste)
  const lex = k => DATEN.lexikon.find(e => e.k === k);
  for (const k of ['uhr', 'zange', 'teller', 'sporttasche']) ist(`Lexikon «${k}» trägt einen Ausschluss (nicht)`, Array.isArray(lex(k)?.nicht) && lex(k).nicht.length > 0, true);
}

// ─────────────────────────── Zusammenfassung ───────────────────────────
console.log(`\n${fehl === 0 ? 'OK' : 'FEHLER'}: ${ok} bestanden, ${fehl} fehlgeschlagen`);
if (fehl) process.exit(1);
