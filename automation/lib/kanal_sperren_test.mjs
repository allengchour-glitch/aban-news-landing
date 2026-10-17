/** Test fuer die Kanal-Sperren. Die Tag-Saetze unten sind ECHT, am 2026-10-17 aus dem
 *  Live-Katalog gelesen (Produkte, die auf Social/Shop absichtlich fehlen).
 *  Lauf: /opt/node22/bin/node automation/lib/kanal_sperren_test.mjs   */
import { erlaubteKanaele, sperrTags } from './kanal_sperren.mjs';

const K = [
  { id: 'p1', name: 'Online Store' }, { id: 'p2', name: 'Shop' }, { id: 'p3', name: 'TikTok' },
  { id: 'p4', name: 'Facebook & Instagram' }, { id: 'p5', name: 'Pinterest' },
  { id: 'p6', name: 'Google & YouTube' },
];
let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
  else console.log(`ok   ${name}`);
};

// ── 1. Echte Sperrfälle: nur der Onlineshop darf nachgezogen werden ──
const ECHT = {
  'Sommerkleid (schwach bewertet)': ['aermellos','cj-real','damen','niedrig-bewertet-nicht-bewerben'],
  'Date-Night-Brettspiel (18plus)': ['18plus','adult-nicht-bewerben','cj-real','gaming'],
  'LED-Laser-Scheinwerfer':         ['cj-real','compliance-pruefen','nicht-bewerben','rueckhol-0907'],
  'Halloween-Umhang':               ['cj-real','halloween','rueckhol-0907','social-pause-halloween'],
  'Lederriemen mit Kette':          ['cj-real','harness-google-raus-2026-08-21','nicht-bewerben'],
  'Spitzen-Body':                   ['adult-nicht-bewerben','cj-real','damen','mode'],
  'Aschenbecher (Tabak)':           ['18plus','becher','cj-real','raucher','raucher-rueckhol-0809'],
  'Mesh-Minikleid (GMC)':           ['adult-nicht-bewerben','gmc-adult-pull','kleid'],
};
for (const [name, tags] of Object.entries(ECHT)) {
  const r = erlaubteKanaele(tags, K);
  pruef(`gesperrt: ${name}`, r.erlaubt.map(k => k.name), ['Online Store']);
  if (r.blockiert.length !== 5) { fehler++; console.log(`FAIL ${name}: ${r.blockiert.length} blockiert statt 5`); }
}

// ── 2. GEGENPROBE: ein sauberes Produkt darf ALLE fehlenden Kanäle bekommen ──
//     (sonst wuerde die Sperre den Waechter nutzlos machen statt ihn sicher zu machen)
const SAUBER = [
  ['Rizinusöl-Roll-on', ['beauty','cj-real','hautpflege','pflege','bild-ok']],
  ['Fortura-Sombrero',  ['fortura','ch-lager','kostuem-hut','schweiz-versand','bild-ok','neu']],
  ['Herren-Tasche',     ['accessoires','taschen','cj-real','bild-ok','bildmass-ok-0907']],
];
for (const [name, tags] of SAUBER) {
  pruef(`frei: ${name}`, erlaubteKanaele(tags, K).erlaubt.map(k => k.name), K.map(k => k.name));
  pruef(`frei: ${name} — keine Sperrtags`, sperrTags(tags), []);
}

// ── 3. Randfälle ──
pruef('ohne Tags → alles erlaubt', erlaubteKanaele([], K).erlaubt.length, 6);
pruef('ohne fehlende Kanäle → nichts', erlaubteKanaele(['18plus'], []).erlaubt, []);
pruef('Gross-/Kleinschreibung egal', sperrTags(['NICHT-BEWERBEN']), ['NICHT-BEWERBEN']);
// „bild-ok" enthaelt kein Sperrwort — eine zu breite Regel waere hier sofort sichtbar
pruef('harmlose Tags loesen nichts aus', sperrTags(['bild-ok','neu','damen','kleider','beauty','sommer-2026']), []);

// ── 4. Nachtrag 17.10.: die Google-eigenen Sperrtags (vorher NICHT erkannt) ──
pruef('nicht-google-bewerben sperrt', sperrTags(['damen', 'nicht-google-bewerben']), ['nicht-google-bewerben']);
pruef('google-policy-flag sperrt', sperrTags(['mode', 'google-policy-flag']), ['google-policy-flag']);
pruef('Strumpfhose: nur Google-Kanal weg, Onlineshop bleibt',
  erlaubteKanaele(['google-policy-flag', 'nicht-google-bewerben', 'damen'], K).erlaubt.map(k => k.name), ['Online Store']);
// Gegenprobe: das erweiterte Muster darf harmlose „google"-Tags NICHT fangen.
pruef('„google-ok"/„gfeed-anstupsen" sperren nicht', sperrTags(['google-ok', 'gfeed-anstupsen-261004', 'bewerben-ok']), []);

// ── 5. Nachtrag 17.10.: `rueckhol` war zu breit (gemessen am Live-Katalog) ──
// `raucher-rueckhol-0809`: 64 aktive Artikel, 0 davon auf dem Google-Kanal → echte Sperre.
// `rueckhol-0907`: > 10 000 aktive Artikel, auf Google UND TikTok publiziert → Chargen-Markierung.
pruef('Tabak-Rueckholung sperrt', sperrTags(['becher', 'raucher', 'raucher-rueckhol-0809']), ['raucher-rueckhol-0809']);
pruef('Chargen-Markierung rueckhol-0907 sperrt NICHT', sperrTags(['bild-ok', 'damen', 'rueckhol-0907']), []);
pruef('menue-/verkehr-rueckhol-0907 sperren NICHT',
  sperrTags(['menue-rueckhol-0907', 'verkehr-rueckhol-0907']), []);
pruef('Artikel nur mit Chargen-Tag behaelt alle Kanaele',
  erlaubteKanaele(['rueckhol-0907', 'damen', 'kleider'], K).erlaubt.length, 6);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
