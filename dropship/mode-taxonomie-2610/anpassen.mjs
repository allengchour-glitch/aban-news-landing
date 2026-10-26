/**
 * Korrekturen an den vier Abteilungsdateien, reproduzierbar: liest die Sicherungen <abteilung>.json.vorher und schreibt <abteilung>.json.
 *   node anpassen.mjs            -> schreibt die vier JSON (idempotent, immer ab .vorher)
 *   node anpassen.mjs --trocken  -> zeigt nur die Aenderungen
 * Jede Aenderung steht hier im Code UND als Eintrag in `nachtrag_pruefung.aenderungen` der jeweiligen Datei.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { passt, imUnterfilter } from './pruef_kern.mjs';
import { GEN_JE_DATEI } from './geschlecht_gemeinsam.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TROCKEN = process.argv.includes('--trocken');
const DATEIEN = ['damen-bekleidung', 'herren-bekleidung', 'kinder-baby-bekleidung', 'schuhe-accessoires'];
const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const J = Object.fromEntries(DATEIEN.map(f => [f, JSON.parse(fs.readFileSync(path.join(HERE, f + '.json.vorher'), 'utf8'))]));
const aend = Object.fromEntries(DATEIEN.map(f => [f, []]));
const log = (f, t) => { aend[f].push(t); console.log(`[${f}] ${t}`); };

const B = 'a-zäöüß';
const find = (f, h) => { const k = J[f].kategorien.find(x => x.handle === h); if (!k) throw new Error('Kategorie fehlt: ' + h); return k; };
const SPERR = ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'google-gesperrt-adult', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'lizenz-nicht-bewerben'];

const GESCHLECHT_VERWEIS = 'Seit der gemeinsamen Pruefung gilt fuer ALLE Abteilungen EINE Geschlechtsregel (geschlecht_gemeinsam.mjs, beschrieben in ALLES.json -> geschlecht). Die urspruengliche Regel dieser Abteilung steht unveraendert in `geschlecht_regel_abteilung`; sie ist in der gemeinsamen Regel als Eingabe enthalten.';

// ───────── 1. Damen-Bekleidung ─────────
{
  const f = 'damen-bekleidung';
  const sets = find(f, 'damen-sets');
  const neu = [
    `(top|shirt|bluse|hemd|oberteil|pullover|hoodie|cardigan|bodysuit|crop|tank[${B}]*|cami[${B}]*)[${B}-]*[^&+]{0,30} mit [${B} -]{0,25}(rock|hose|shorts|jupe)`,
    `(rock|minirock|maxirock|midirock|hose|shorts|jupe)[${B}-]* mit [${B} -]{0,25}(top|shirt|bluse|oberteil|hemd)`,
  ];
  const altMuster = sets.titel_muss.slice();
  // «mit …rock/hose» nur als eigenes Wort/Wortende, nie mitten im Wort («Schnelltrocknung» enthaelt «rock»)
  neu[0] = neu[0].replace('(rock|hose|shorts|jupe)', `[${B}-]*(rock|hose|hosen|shorts|jupe)(?![${B}])`);
  neu[1] = neu[1].replace('(top|shirt|bluse|oberteil|hemd)', `[${B}-]*(top|shirt|bluse|oberteil|hemd)(?![${B}])`);
  sets.titel_muss.push(...neu);
  // Die Vorrangregel der Abteilung: jede spaetere Kategorie mit ueberlappender Google-Kategorie schliesst die Set-Muster aus.
  const PRAEFIX = '^(?!.*(?:(^|[^a-zäöüß])(fake|mock|faux|tang-?anzug)|(zweiteiler-?(look|optik))(?![a-zäöüß])|(^|[^a-zäöüß])((im|in) zweiteiler)|zweiteiler-?look))';
  const ausschluss = muster => PRAEFIX + '(?=.*(?:' + muster.join('|') + '))';
  let betroffen = [];
  for (const c of J[f].kategorien) {
    if (c.handle === 'damen-sets' || c.handle === 'damen-umstandsmode') continue;
    if (!c.g_prefix.some(a => sets.g_prefix.some(b => a.startsWith(b) || b.startsWith(a)))) continue;
    const hatAlt = c.titel_nicht.some(x => x.includes('(?=.*(?:(sets?|zweiteiler'));
    c.titel_nicht.push(ausschluss(hatAlt ? neu : [...altMuster, ...neu])); betroffen.push(c.handle);
  }
  log(f, 'damen-sets: 2 Titelmuster ergaenzt («Top mit Satin-Midirock», «Wickel-Minirock mit Kurzarm-Top»): Set-Teile ohne Set-Wort fielen durch. Gemaess Vorrangregel der Abteilung auch als Ausschluss in ' + betroffen.length + ' Kategorien mit gleicher Google-Kategorie (' + betroffen.join(', ') + ').');
}

// ───────── 2. Herren-Bekleidung ─────────
{
  const f = 'herren-bekleidung';
  // Die Damen-Regel schliesst «taktisch/tactical» in ALLEN Bekleidungs-Kategorien aus (FREMD); die Herren-Regel tat es nirgends (2 von 25 Westen im Gegenlesen waren Einsatzwesten).
  let n = 0;
  for (const k of J[f].kategorien) { k.titel_nicht.push(`(^|[^${B}])(taktisch|tactical)`); n++; }
  log(f, `«taktisch/tactical» in allen ${n} Herren-Kategorien ausgeschlossen, gleiche Linie wie die Damen-Regel (Einsatzware gehört zu Arbeitskleidung/Sport & Outdoor, nicht in die Mode-Taxonomie). Betrifft im Datensatz 13 Produkte: 4 Westen, 4 Hosen, 3 Jacken, 1 Overall, 1 T-Shirt.`);
}

// ───────── 3. Kinder-Baby-Bekleidung: Partnerlook ─────────
{
  const f = 'kinder-baby-bekleidung';
  const fam = find(f, 'kinder-familien-looks');
  J[f].kategorien.push({
    handle: 'partnerlook-paare', titel: 'Partnerlook & Paar-Outfits', eltern: 'partner', geschlecht: 'partner',
    g_prefix: ['Apparel & Accessories > Clothing > '], g_nicht: [], titel_muss: [],
    titel_nicht: ['(kostüm|cosplay|verkleid|maskenball)'], tags_muss_eines: [], tags_nicht: [...fam.tags_nicht],
    beschreibung: 'Passende Outfits für zwei: Partner-Shirts, Couple-Hoodies und Paar-Pullover zum Verschenken oder Selbertragen. Outfits für die ganze Familie stehen unter «Familien-Looks».',
    unterfilter: [
      { handle: 'partnerlook-paare-shirts', titel: 'Shirts & T-Shirts', titel_muss: ['shirt|tee(?![a-zäöüß])'], titel_nicht: [] },
      { handle: 'partnerlook-paare-pullover', titel: 'Pullover & Hoodies', titel_muss: ['pullover|hoodie|sweatshirt|pulli|sweater'], titel_nicht: [] },
      { handle: 'partnerlook-paare-winter', titel: 'Weihnacht & Winter', titel_muss: ['weihnacht|winter|xmas'], titel_nicht: [] },
    ],
    gemessen: {},
  });
  log(f, 'NEU partnerlook-paare «Partnerlook & Paar-Outfits» (Geschlecht «partner»): Paar-Looks standen bei Damen (Damen-Regel: unisex) aber nicht bei Herren (Herren-Regel: partner) und in keiner Paar-Kategorie. Ein Eintrag im Menue unter Damen UND Herren.');
}

// ───────── 4. Schuhe & Accessoires: Kinder-Accessoires ─────────
{
  const f = 'schuhe-accessoires';
  const ref = find(f, 'kinder-lauflernschuhe');
  J[f].kategorien.push({
    handle: 'kinder-accessoires', titel: 'Kinder-Accessoires', eltern: 'kinder', geschlecht: 'kinder',
    g_prefix: ['Apparel & Accessories > Clothing Accessories', 'Apparel & Accessories > Handbags, Wallets & Cases', 'Luggage & Bags'], g_nicht: [],
    titel_muss: [], titel_nicht: ['(kostüm|cosplay|verkleid|maskenball)', `(^|[^${B}])(puppe[${B}]*)`, 'desinfektion|flaschen'],
    tags_muss_eines: [], tags_nicht: [...ref.tags_nicht],
    beschreibung: 'Mützen, Handschuhe, Haarschmuck und Taschen für Kinder und Babys. Schuhe und Kleidung stehen in den eigenen Kinder-Kategorien.',
    unterfilter: [
      { handle: 'kinder-accessoires-muetzen', titel: 'Mützen & Hüte', titel_muss: ['mütze|hut(?![a-zäöüß])|cap(?![a-zäöüß])|visier|haube|kappe'], titel_nicht: [] },
      { handle: 'kinder-accessoires-handschuhe', titel: 'Handschuhe & Schals', titel_muss: ['handschuh|fäustling|schal(?![a-zäöüß])|halswärmer|geschenkset'], titel_nicht: [] },
      { handle: 'kinder-accessoires-haarschmuck', titel: 'Haarschmuck', titel_muss: ['haar'], titel_nicht: [] },
      { handle: 'kinder-accessoires-taschen', titel: 'Taschen', titel_muss: ['tasche|rucksack|beutel'], titel_nicht: [] },
    ],
    gemessen: {},
  });
  log(f, 'NEU kinder-accessoires «Kinder-Accessoires»: Kinder-Mützen, -Handschuhe, -Haarschmuck und -Taschen hatten keine Kategorie (die Kinder-Abteilung der Bekleidung nimmt nur Google «Clothing > …», diese Abteilung hatte nur Kinder-Schuhe). Der Schuh-Analyst hatte 14 gezaehlt und auf «zu wenig» verzichtet; mit der gemeinsamen Geschlechtsregel sind es mehr.');
}

// ───────── 4a. Tag «fortura» (Kostuem-Lieferant) auch in Damen und Herren ausschliessen ─────────
// Kinder- und Schuh-Abteilung sperren «fortura» (Kostueme haben eigene ft-*-Kategorien), Damen und Herren nicht. Bisher schuetzte nur das unbekannte
// Geschlecht; mit der gemeinsamen Regel (neutrale Kleidungsart -> unisex) kaemen «T-Shirt England/Algerien» (Fanartikel) in Damen UND Herren.
for (const f of ['damen-bekleidung', 'herren-bekleidung']) {
  let n = 0;
  for (const k of J[f].kategorien) if (!k.tags_nicht.includes('fortura')) { k.tags_nicht.push('fortura'); n++; }
  // Tag «kostuem» (Verkleidung): dasselbe wie das Titelwort «Kostüm/Verkleidung» in FREMD; im Datensatz trifft er genau ein Produkt («Göttinnen-Kleid für Mottopartys und Halloween» in Damen-Kleider)
  for (const k of J[f].kategorien) if (!k.tags_nicht.includes('kostuem')) k.tags_nicht.push('kostuem');
  log(f, `Tags «fortura» und «kostuem» in tags_nicht von ${n} Kategorien ergaenzt (Kinder- und Schuh-Abteilung sperrten «fortura» schon); verhindert, dass Fasnachts-Kostüme und Fanartikel von Fortura durch die gemeinsame Geschlechtsregel in die Alltagsmode rutschen.`);
}

for (const k of J['kinder-baby-bekleidung'].kategorien) if (!k.tags_nicht.includes('kostuem')) k.tags_nicht.push('kostuem');

// ───────── 4b. Teilwort-Falle «verkleid» in allen Ausschluss-Mustern ─────────
// «(kostüm|cosplay|verkleid|maskenball)» traf mitten im Wort: «Pailletten-Pulloverkleid», «Locken-Pulloverkleid» (Pullo-VERKLEID) fielen aus Damen-Kleider.
// Gemessen am Datensatz: genau 2 Produkte betroffen. Jetzt nur am Wortanfang.
{
  const NEU = '(^|[^a-zäöüß])verkleid';
  const fix = a => (a || []).map(x => (typeof x === 'string' && /[|(]verkleid/.test(x)) ? x.replace(/([|(])verkleid/g, `$1${NEU}`) : x);
  for (const f of DATEIEN) {
    let n = 0;
    for (const k of J[f].kategorien) {
      for (const feld of ['titel_muss', 'titel_nicht']) { const alt = JSON.stringify(k[feld]); k[feld] = fix(k[feld]); if (JSON.stringify(k[feld]) !== alt) n++; }
      for (const u of k.unterfilter || []) for (const feld of ['titel_muss', 'titel_nicht']) u[feld] = fix(u[feld]);
    }
    if (n) log(f, `Ausschluss «verkleid» nur noch am Wortanfang (${n} Kategorien)` + (f === 'damen-bekleidung' ? '; «Pailletten-Pulloverkleid» und «Locken-Pulloverkleid» (Pullo-VERKLEID) wurden faelschlich als Verkleidung ausgeschlossen und stehen jetzt in Kleider.' : '; dieselbe Teilwort-Falle vorsorglich geschlossen (am Datensatz kein weiterer Treffer).'));
  }
}

// ───────── 5. Messen, Unterfilter-Schwelle, Texte, Kollisionen ─────────
const vorhandene = JSON.parse(fs.readFileSync('/tmp/vorhandene_collections.json', 'utf8'));
const vh = new Map(vorhandene.map(c => [c.handle, c]));
for (const f of DATEIEN) {
  const j = J[f];
  const gen = daten.map(p => GEN_JE_DATEI[f](p));
  j.geschlecht_regel_abteilung = j.geschlecht_regel;
  j.geschlecht_regel = GESCHLECHT_VERWEIS;
  for (const k of j.kategorien) {
    const idx = []; for (let i = 0; i < daten.length; i++) if (passt(k, daten[i], gen[i])) idx.push(i);
    k.gemessen = { ...(k.gemessen || {}) };
    if (k.gemessen.treffer != null && k.gemessen.treffer !== idx.length) k.gemessen.treffer_abteilung = k.gemessen.treffer;
    k.gemessen.treffer = idx.length;
    const behalten = [], vorgemerkt = [];
    for (const u of k.unterfilter || []) { const n = idx.filter(i => imUnterfilter(u, daten[i])).length; (n >= 15 ? behalten : vorgemerkt).push({ ...u, treffer: n }); }
    k.unterfilter = behalten.map(u => { const { treffer, ...r } = u; return { ...r, treffer }; });
    if (vorgemerkt.length) {
      k.unterfilter_vorgemerkt = vorgemerkt;
      log(f, `${k.handle}: ${vorgemerkt.length} Unterfilter unter 15 Treffern nicht aktiv, aber vorgemerkt: ${vorgemerkt.map(u => `${u.handle} (${u.treffer})`).join(', ')}.`);
    }
    const c = vh.get(k.handle);
    if (c) {
      k.ersetzt_collection = { handle: c.handle, titel: c.titel, n_alt: c.n, regel_alt: String(c.regeln), hinweis: 'Gleiches Handle, neuer Inhalt: Der URL bleibt erhalten, die Regel wird ersetzt (Details in PRUEFBERICHT.md, Abschnitt Handle-Kollisionen).' };
    }
  }
  j.nachtrag_pruefung = { datum: '2026-10-26', werkzeug: 'pruefen.mjs / anpassen.mjs', aenderungen: aend[f] };
  if (!aend[f].length) aend[f].push('Regeln unveraendert; nur gemeinsame Geschlechtsregel, gemessene Trefferzahlen und Hinweise ergaenzt.');
}
if (!TROCKEN) {
  for (const f of DATEIEN) fs.writeFileSync(path.join(HERE, f + '.json'), JSON.stringify(J[f], null, 1));
  console.log('geschrieben: ' + DATEIEN.map(f => f + '.json').join(', '));
}
