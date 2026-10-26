// Baut /tmp/mode_taxonomie/herren-bekleidung.json aus herren_regeln.mjs + herren_unterfilter.mjs und misst am Datensatz.
//   node herren-bekleidung_bauen.mjs --stichproben   -> schreibt herren-bekleidung_stichproben.json (30 Zufallstreffer je Kategorie, fester Seed) zum Durchlesen
//   node herren-bekleidung_bauen.mjs                 -> schreibt herren-bekleidung.json (Urteile aus herren-bekleidung_urteile.json)
import fs from 'fs';
import { d, isCl, geschlecht, tagGeschlecht, titelGeschlecht, RX, hasTag } from './herren_gen.mjs';
import { KATEGORIEN } from './herren_regeln.mjs';
import { UNTERFILTER } from './herren_unterfilter.mjs';
import { bauKategorien } from './herren_bauen_lib.mjs';
import { alle, pool, zuordnen, stichprobe, passt, unterfilterPasst } from './herren_lib.mjs';

const SEED = 20261026, N = 30;
const kats = bauKategorien(KATEGORIEN);
const { m, mehr } = zuordnen(kats);
const members = h => pool.filter(x => m.get(x.p.handle).includes(h));
const kurz = g => (g || '(leer)').replace('Apparel & Accessories > Clothing', 'C');

// ---- Stichproben
const proben = {};
kats.forEach((k, i) => {
  const t = members(k.handle);
  const s = t.length <= N ? t : stichprobe(t, N, SEED + i);
  proben[k.handle] = { treffer: t.length, stichprobe: s.map(x => ({ handle: x.p.handle, titel: x.p.title, g: kurz(x.p.g), gen: x.gen })) };
});
if (process.argv.includes('--stichproben')) {
  fs.writeFileSync('herren-bekleidung_stichproben.json', JSON.stringify(proben, null, 1));
  for (const [h, v] of Object.entries(proben)) { console.log('\n##', h, v.treffer); v.stichprobe.forEach((x, i) => console.log(String(i + 1).padStart(2), x.handle.slice(-8), '|', x.titel, '|', x.g, '|', x.gen)); }
  process.exit(0);
}
const urteile = fs.existsSync('herren-bekleidung_urteile.json') ? JSON.parse(fs.readFileSync('herren-bekleidung_urteile.json', 'utf8')) : {};

// ---- Geschlecht: Zahlen
const cl = alle.map(x => x.p);
const gz = {}; for (const x of alle) gz[x.gen] = (gz[x.gen] || 0) + 1;
const tagGen = p => tagGeschlecht(p);
let tagAbw = 0; const abw = {};
for (const x of alle) { const t = tagGen(x.p); if (t !== 'keins' && t !== x.gen) { tagAbw++; const k = t + '->' + x.gen; abw[k] = (abw[k] || 0) + 1; } }
const tagMit = alle.filter(x => tagGen(x.p) !== 'keins').length;
// ausdrückliche Widersprüche Tag <-> Titel
const widersp = [];
for (const x of alle) {
  const t = tagGen(x.p), ti = titelGeschlecht(x.p);
  if (['damen', 'herren'].includes(t) && ['damen', 'herren', 'kinder'].includes(ti) && t !== ti) widersp.push({ p: x.p, t, ti, gen: x.gen });
}
const wk = {}; for (const w of widersp) { const k = `Tag ${w.t} / Titel ${w.ti}`; wk[k] = (wk[k] || 0) + 1; }
const tagH = alle.filter(x => tagGen(x.p) === 'herren' || tagGen(x.p) === 'beide').length;

const geschlecht_regel =
`Das Geschlecht eines Produkts (Kleidung = Google-Kategorie beginnt mit "Apparel & Accessories > Clothing" oder ist leer) wird in dieser Reihenfolge bestimmt, die erste zutreffende Stufe entscheidet; Titelwörter gelten am Wortanfang, ohne Beachtung von Gross-/Kleinschreibung:
1. Titel enthält Familie/Familien (jedes Wort, das mit "famili" beginnt), Eltern-Kind, "Eltern und Kind(er)", Mama, Papa, Mutter (nicht Mutterschutz/-schaft), Vater, Mommy, Daddy, Geschwister, "für Paare", Pärchen, Paarlook, Paar-T-Shirt/-Shirt/-Hoodie/-Pullover, Partnerlook/-shirt/-outfit/-hoodie, Couple oder "Paare" -> partner (Querschnitt "Partnerlook & Paare", in keiner Herren- und in keiner Damen-Kategorie).
2. Google-Kategorie beginnt mit "Apparel & Accessories > Clothing > Baby & Toddler Clothing" ODER Titel enthält Kinder, Mädchen, Jungs, Baby, Kleinkind, Teenager, Teen, Kids, Säugling, Neugeboren, Strampler oder "Jungen" (nur gross geschrieben als Substantiv; das kleine Adjektiv "jungen" wie in "im jungen Stil" zählt nicht) -> kinder. Englisch Boy/Girl zählt nicht (Stilnamen wie "Mori Girl").
3. Titel enthält Unisex, "Damen und Herren" (auch & und /, beide Reihenfolgen) oder "Männer und Frauen" -> unisex.
4. Titel nennt Herren/Männer/männlich/Mann/Gentleman (nicht "herrenlos") UND Damen/Frauen/weiblich/Ladies/Lady -> unisex.
5. Titel nennt Herren/Männer/männlich/Mann/Gentleman -> damen, wenn (a) das Stück ein reines Damenstück ist (Titel: Kleid, Rock, BH, Bikini, Tanga, Dessous, Negligé, Babydoll, Bustier, Korsett, Umstandsmode, Stillen; oder Google-Kategorie Dresses, Skirts, Skorts, Bras, Lingerie, Nightgowns) oder (b) ein eindeutig weiblicher Schnitt genannt wird (Off-Shoulder, Halterneck, Neckholder, schulterfrei, trägerlos, bauchfrei, High-Waist, High-Rise, hohe Taille, Tüll, Schwangerschaft, Hollow-out) oder (c) Bluse/Blusen/Camisole im Titel steht und das Produkt KEIN Herren-Tag trägt; sonst -> herren.
6. Titel nennt Damen/Frauen/weiblich/Ladies/Lady -> damen.
7. Tag kinder -> kinder.
8. Tag herren (oder maenner/männer): Trifft 5(a), 5(b) oder Bluse/Camisole zu -> damen. Sonst: Tag herren UND damen, oder Tag unisex -> unisex; nur herren -> herren. Tag damen allein -> damen.
9. Produkttyp: Herrenmode -> herren (bei 5(a) damen), Damenmode -> damen, Baby & Kinder / Kinder -> kinder.
10. Google-Kategorie Dresses, Skirts, Skorts, Bras, Lingerie oder Nightgowns, oder Titel mit Yoga, Legging, Umstandsmode, Schwangerschaft, Stillshirt oder Stillen -> damen.
11. Tag fertig-shirt, pod-shirt oder printful_personalized_product, oder Titel mit "selbst gestalten" (Schweizer Edition und Selbst-gestalten-Artikel) -> unisex.
12. Sonst unbekannt: kommt in KEINER Abteilung vor (siehe rest.vorschlag).
Referenz-Implementierung (ausführbar, identisch zu dieser Beschreibung): /tmp/mode_taxonomie/herren_gen.mjs, Funktion geschlecht(p).
Ein Produkt mit Geschlecht unisex gehört in Herren- UND Damen-Kategorien (eine Herren-Kategorie nimmt also herren ODER unisex). Alle Herren-Kategorien hier haben geschlecht "herren" in diesem Sinn.
GEMESSEN an ${cl.length} Kleidungsprodukten: damen ${gz.damen}, herren ${gz.herren}, unisex ${gz.unisex}, kinder ${gz.kinder}, partner ${gz.partner}, unbekannt ${gz.unbekannt}. Ein Damen-, Herren- oder Kinder-Tag tragen ${tagMit} Produkte; in ${tagAbw} (${(100 * tagAbw / tagMit).toFixed(1)} %) weicht das Ergebnis vom Tag ab (${Object.entries(abw).map(([k, v]) => k.replace('->', ' -> ') + ' ' + v).join(', ')}). Der Tag stammt aus der CJ-Kategorie des Imports und ist daher meist richtig; er verliert nur gegen eine ausdrückliche Titelangabe oder ein reines Damenstück.`;

// ---- Kategorien -> Ausgabeformat
const BESCHR = {
  'herren-anzuege-sakkos': 'Anzüge, Sakkos und Blazer für Herren in Business-, Casual- und Sommerschnitten. Filterbar nach Anzug und Sakko.',
  'herren-hoodies-sweatshirts': 'Hoodies, Kapuzenpullover und Sweatshirts für Herren, auch mit Reissverschluss oder Fleecefutter. Filterbar nach Hoodie, Sweatshirt und Zip-Variante.',
  'herren-poloshirts': 'Poloshirts und Polohemden für Herren in Kurzarm und Langarm. Filterbar nach Ärmellänge und Business- oder Golf-Look.',
  'herren-pullover-strick': 'Pullover, Strickpullover, Cardigans, Strickjacken und Rollkragenpullover für Herren. Filterbar nach Form, Ausschnitt und Futter.',
  'herren-hemden': 'Herrenhemden in Kurzarm und Langarm: Freizeit-, Leinen-, Business-, Karo-, Hawaii- und Cordhemden. Filterbar nach Ärmellänge, Material und Muster.',
  'herren-t-shirts': 'T-Shirts, Langarmshirts, Tanktops und weitere Shirts für Herren. Filterbar nach Ärmellänge, Tanktop, Henley und Print.',
  'herren-jacken-maentel': 'Jacken und Mäntel für Herren: Jeans-, Leder-, Bomber-, Übergangs-, Winter-, Outdoor- und Kapuzenjacken sowie Mäntel und Trenchcoats. Filterbar nach Jackenart.',
  'herren-westen': 'Westen für Herren: Strick-, Anzug-, Daunen-, Steppwesten sowie Outdoor- und Sportwesten. Filterbar nach Art.',
  'herren-jeans': 'Jeans für Herren in Straight, Loose, Slim, Bootcut und Destroyed. Filterbar nach Schnitt und Waschung.',
  'herren-hosen': 'Hosen für Herren ohne Jeans: Cargo-, Freizeit-, Jogger-, Outdoor-, Chino- und Stoffhosen sowie Workwear-Hosen. Filterbar nach Hosenart.',
  'herren-shorts': 'Shorts für Herren: Jeans-, Cargo-, Chino- und Strandshorts. Filterbar nach Jeansshorts.',
  'herren-overalls': 'Overalls und Jumpsuits für Herren, vom Denim-Overall bis zum Cargo-Jumpsuit. Einteiler mit Hosenträgern, Polokragen oder Taschen.',
  'herren-sets': 'Zweiteilige Sets und Outfits für Herren, etwa Hemd mit Hose oder Hoodie mit Jogger. Teile, die zusammen gekauft und kombiniert getragen werden.',
  'herren-sportbekleidung': 'Sportbekleidung für Herren: Fitness- und Laufshirts, Baselayer, Trainingsanzüge, Westen und Hosen. Für Training, Golf und Radfahren.',
};
const ausgabe = kats.map((k, i) => {
  const t = members(k.handle);
  const u = urteile[k.handle] || {};
  const falsch = Object.entries(u.falsch || {});
  const s = proben[k.handle].stichprobe.length;
  return {
    handle: k.handle, titel: k.titel, eltern: 'herren', geschlecht: 'herren',
    g_prefix: k.g_prefix, g_nicht: k.g_nicht, titel_muss: k.titel_muss, titel_nicht: k.titel_nicht,
    tags_muss_eines: k.tags_muss_eines, tags_nicht: k.tags_nicht, beschreibung: BESCHR[k.handle] || '',
    unterfilter: (UNTERFILTER[k.handle] || []).map(f => ({ handle: f.handle, titel: f.titel, titel_muss: f.muss, titel_nicht: f.nicht })),
    gemessen: { treffer: t.length, stichprobe: s, falsch: falsch.length, falsche_beispiele: falsch.map(([h, g]) => `${h}: ${g}`) },
  };
});

// ---- Rest, Fremdkörper
const restListe = pool.filter(x => !m.get(x.p.handle).length);
const grp = x => {
  const t = x.p.title, g = x.p.g || '';
  if (!g) return ['Kostüm/Perücke/Maske (Google-Kategorie leer)', 'kostueme-fasnacht'];
  if (/Underwear|Shapewear/.test(g)) return ['Unterwäsche', 'unterwaesche'];
  if (/Swimwear/.test(g)) return ['Bademode', 'sub-bademode'];
  if (/Sleepwear/.test(g)) return ['Nachtwäsche/Bademantel/Homewear', 'nachtwaesche-pyjamas'];
  if (/Snow Pants|Rain Suits/.test(g) || /ski-?overall/i.test(t)) return ['Ski-/Regenanzug', 'sport-outdoor'];
  if (/Jumpsuits/.test(g) && /ringer|einteiler/i.test(t)) return ['Sport-Einteiler', 'herren-sportbekleidung'];
  if (/Vests/.test(g)) return ['Warn-/Heiz-/Kühl-/Angel-/Reiseweste (Schutz- und Funktionsweste)', 'arbeitskleidung'];
  if (/Dresses|Skirts/.test(g)) return ['Partnerlook-Kleid', 'partnerlook (Querschnitt)'];
  return ['Gewand/Tunika/Kimono/unspezifische Google-Kategorie "Clothing"', 'offen (manuell)'];
};
const rg = {}; for (const x of restListe) { const [n] = grp(x); rg[n] = (rg[n] || 0) + 1; }
const fremd = [];
for (const x of restListe) { const [n, ziel] = grp(x); fremd.push({ handle: x.p.handle, grund: n + ' (' + kurz(x.p.g) + ')', gehoert_nach: ziel }); }
// Tag/Titel-Widersprüche -> Fremdkörper
const herrenKat = p => { const t = kats.filter(k => passt(k, p, 'herren')).map(k => k.handle); return t[0] || 'offen'; };
for (const w of widersp) {
  if (w.ti === 'herren' && w.t === 'damen') fremd.push({ handle: w.p.handle, grund: 'Damen-Tag, aber der Titel sagt ausdrücklich Herren: "' + w.p.title + '"', gehoert_nach: herrenKat(w.p) });
  else if (w.ti === 'kinder') fremd.push({ handle: w.p.handle, grund: `${w.t === 'herren' ? 'Herren' : 'Damen'}-Tag, aber der Titel nennt Kinder/Jungen/Teenager/Baby: "${w.p.title}"`, gehoert_nach: 'kinder' });
  else if (w.ti === 'damen' && w.t === 'herren') fremd.push({ handle: w.p.handle, grund: 'Herren-Tag, aber der Titel sagt ausdrücklich Damen: "' + w.p.title + '"', gehoert_nach: 'damen' });
}
for (const x of alle) {
  const p = x.p, t = tagGen(p);
  if ((t === 'herren' || t === 'beide') && x.gen === 'damen' && !widersp.some(w => w.p === p)) fremd.push({ handle: p.handle, grund: 'Herren-Tag, aber reines Damenstück oder weiblicher Schnitt: "' + p.title + '"', gehoert_nach: 'damen' });
  if (x.gen === 'partner') fremd.push({ handle: p.handle, grund: 'Partnerlook/Paar-/Familien-Set (Querschnitt, weder Damen noch Herren): "' + p.title + '"', gehoert_nach: 'partnerlook (Querschnitt)' });
}
const fremdKurz = []; const gesehen = new Set();
for (const f of fremd) if (!gesehen.has(f.handle + f.gehoert_nach)) { gesehen.add(f.handle + f.gehoert_nach); fremdKurz.push(f); }

const unbek = alle.filter(x => x.gen === 'unbekannt');
const ug = {}; for (const x of unbek) { const k = kurz(x.p.g); ug[k] = (ug[k] || 0) + 1; }
const rest = {
  anzahl: restListe.length,
  beispiele: restListe.slice(0, 20).map(x => x.p.title + ' [' + grp(x)[0] + ']'),
  vorschlag: `Von ${pool.length} Herren-/Unisex-Produkten in Kleidung nehmen die ${kats.length} Kategorien ${pool.length - restListe.length} (${(100 * (pool.length - restListe.length) / pool.length).toFixed(1)} %). Die ${restListe.length} ohne Kategorie sind Fremdkörper mit eigenem Ziel (siehe fremdkoerper): ${Object.entries(rg).map(([k, v]) => k + ' ' + v).join('; ')}. Dazu kommen ${unbek.length} Kleidungsprodukte ganz ohne Geschlechtsangabe (Tag, Titel, Typ; meist taktische Westen, Yoga-Hosen, Capes, Ponchos, Bademäntel, einzelne Hoodies/Winterjacken): sie stehen in keiner Abteilung und brauchen entweder eine Abteilung "Unisex & Outdoor" oder Handarbeit; ${gz.partner} Partnerlook-, Paar- und Familien-Produkte (meist mit Damen-Tag) gehören in eine Querschnitt-Sammlung "Partnerlook & Paare".`,
};
const out = {
  abteilung: 'herren-bekleidung', geschlecht_regel,
  kategorien: ausgabe, rest, fremdkoerper: fremdKurz,
  widersprueche_tag_titel: {
    anzahl: widersp.length,
    regel: `Gemessen an ${cl.length} Kleidungsprodukten: ${widersp.length} Produkte tragen ein Damen- oder Herren-Tag, das einer ausdrücklichen Titelangabe widerspricht (${Object.entries(wk).map(([k, v]) => k + ': ' + v).join('; ')}). Entscheidung: Der ausdrückliche Titel gewinnt gegen den Tag, weil der Titel das einzelne Produkt beschreibt und der Tag aus der Sammel-Kategorie des Imports stammt. Ausnahme (häufiger Übersetzungsfehler): nennt der Titel Herren, das Stück ist aber ein reines Damenstück (Kleid, Rock, BH ...) oder hat einen eindeutig weiblichen Schnitt (Off-Shoulder, High-Waist ...), gewinnt Damen. Zusätzlich ${Object.entries(abw).filter(([k]) => /->(unisex|partner)/.test(k)).reduce((a, [, v]) => a + v, 0)} Produkte wechseln wegen ausdrücklicher Unisex-/Paar-/Familien-Angabe im Titel. Die Herren-Kategorien nehmen dadurch ${widersp.filter(w => w.ti === 'herren' && w.t === 'damen').length} Produkte mit Damen-Tag auf und geben ${fremdKurz.filter(f => /Herren-Tag, aber/.test(f.grund)).length} Produkte mit Herren-Tag ab.`,
  },
  offene_fragen: [],
};


const alt = JSON.parse(fs.readFileSync('herren-bekleidung_altbestand.json', 'utf8'));
const av = h => (alt.find(x => x.handle === h) || { verteilung: {} });
const nv = (h, k) => av(h).verteilung[k] || 0;
const nichtKl = h => Object.entries(av(h).verteilung).filter(([k]) => k.startsWith('Nicht-Kleidung')).reduce((a, [, v]) => a + v, 0);
const titelVon = Object.fromEntries(d.map(p => [p.handle, p.title]));
const cnt = (h, re) => members(h).filter(x => re.test(x.p.title)).length;
const nHemdShirt = members('herren-hemden').filter(x => !/hemd|blus|overshirt|button|guayabera|kimono/i.test(x.p.title)).length;
const nStrickTop = members('herren-pullover-strick').filter(x => !/pullover|pulli|cardigan|kardigan|kardigen|sweater|jacke|rollkragen|troyer|turtle|weste/i.test(x.p.title)).length;
const urteileGrenz = Object.values(urteile).flatMap(u => Object.entries(u.grenzfaelle || {}));
const nStich = ausgabe.reduce((a, k) => a + k.gemessen.stichprobe, 0);
out.offene_fragen = [
  'UMSETZUNG: Shopify-Smart-Collections kennen weder Wortgrenzen noch Lookbehind/Lookahead. Die Regeln werden darum lokal ausgewertet (herren-bekleidung_messen.mjs, Funktion passt() in herren_lib.mjs) und als Tag sort-<kategorie-handle> bzw. f:<unterfilter-handle> auf die Produkte geschrieben; die Collection hängt nur am Tag und muss nach jedem Import neu laufen. Unterfilter sind optional und dürfen sich überschneiden (ein Hemd kann Kurzarm UND Leinen sein).',
  'GESCHLECHT UNBEKANNT: ' + unbek.length + ' Kleidungsprodukte tragen weder Tag noch Titelwort noch Typ für Damen/Herren/Kinder (' + Object.entries(ug).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => v + ' ' + (k === 'C' ? 'Clothing ohne Unterkategorie' : k.split(' > ').pop())).join(', ') + ' ...; meist taktische Westen, Yoga-/Fitnesshosen, Capes, Ponchos, Bademäntel, einzelne Hoodies/Winterjacken). Sie stehen in keiner Abteilung. Liste: herren-bekleidung_unbekannt.json. Entscheid Besitzer: eigene Abteilung "Unisex & Outdoor" oder je Warenart von Hand; ich habe nicht geraten.',
  'PARTNERLOOK: ' + gz.partner + ' Produkte (Paare, Couple, Partnerlook, Familie, Eltern-Kind; ' + (abw['damen->partner'] || 0) + ' mit Damen-Tag, ' + (abw['herren->partner'] || 0) + ' mit Herren-Tag) sind weder Herren noch Damen. Vorschlag: Querschnitt-Sammlung "Partnerlook & Paare" (Tag sort-partnerlook), nicht in Herren- oder Damen-Kategorien.',
  'SORTIMENTSLÜCKE: Herren-Basics fehlen fast ganz: Unterwäsche/Shapewear ' + (rg['Unterwäsche'] || 0) + ', Socken 0, Nachtwäsche/Bademäntel ' + (rg['Nachtwäsche/Bademantel/Homewear'] || 0) + ', Bademode ' + (rg['Bademode'] || 0) + ' (zusammen ' + ((rg['Unterwäsche'] || 0) + (rg['Nachtwäsche/Bademantel/Homewear'] || 0) + (rg['Bademode'] || 0)) + ' Produkte). Das liegt unter der Mindestgrösse 15, also keine Kategorie; die Herrenabteilung wirkt ohne diese Warenarten unvollständig. Das ist eine Sourcing-Frage, keine Sortierfrage.',
  'KLEINE KATEGORIEN: Shorts ' + ausgabe.find(k => k.handle === 'herren-shorts').gemessen.treffer + ', Sportbekleidung ' + ausgabe.find(k => k.handle === 'herren-sportbekleidung').gemessen.treffer + ', Sets ' + ausgabe.find(k => k.handle === 'herren-sets').gemessen.treffer + ', Overalls ' + ausgabe.find(k => k.handle === 'herren-overalls').gemessen.treffer + ' liegen knapp über der Mindestgrösse 15. Alternative, falls das Menü schlanker sein soll: Shorts als Unterfilter von Hosen, Overalls und Sets unter "Weitere".',
  'ARBEITSKLEIDUNG: Kein Kleidungsprodukt trägt das Tag arbeitskleidung oder den Typ Arbeitskleidung (nachgemessen). Die Titel "Arbeitshose/Workpants/Arbeitsjacke" (' + cnt('herren-hosen', /arbeits|work/i) + ' Hosen, ' + cnt('herren-jacken-maentel', /arbeits/i) + ' Jacken) sind Mode im Arbeitsstil (Cargo, Retro); sie stehen darum in Hosen und Jacken, die Hosen mit eigenem Unterfilter "Workwear- & Arbeitshosen". Nur Warn-, Sicherheits-, Heiz-, Kühl- und Angelwesten (' + (rg['Warn-/Heiz-/Kühl-/Angel-/Reiseweste (Schutz- und Funktionsweste)'] || 0) + ') sind Fremdkörper und gehen nach arbeitskleidung. Skihose/Schneehose (' + cnt('herren-hosen', /ski|schnee/i) + ') bleiben in Hosen (Unterfilter Outdoor).',
  'RANDFÄLLE (nicht falsch, aber auch in der Nachbarkategorie plausibel): ' + nHemdShirt + ' Titel "Langarmshirt/Shirt" mit Kragen-, Revers- oder Knopfleistenwort stehen in Hemden; ' + nStrickTop + ' "Strick-Shirt/-T-Shirt/-Top" stehen in Pullover & Strick (das Material Strick gewinnt); ' + cnt('herren-jacken-maentel', /hemd-?jacke|jeanshemd|hemdenjacke/i) + ' Hemdjacken und ' + cnt('herren-jacken-maentel', /hoodie|sweat/i) + ' Hoodie-/Sweatjacken stehen in Jacken & Mäntel, weil die Google-Kategorie Coats & Jackets lautet; ' + cnt('herren-jacken-maentel', /strick|cardigan/i) + ' Strickjacken ebenso.',
  'WEIBLICHE SCHNITTE: ' + (abw['herren->damen'] || 0) + ' Produkte mit Herren-Tag (Off-Shoulder, Halterneck, High-Waist-Jeans, Bluse mit Blumenmuster u. a.) gelten als Damen (Fremdkörper, gehoert_nach damen). Ungeprüft und bei Herren belassen: Herren-Jeans mit Perlenstickerei, "Cropped"-Hosen und -Hoodies, weil weder Tag noch Titel Damen sagen; nur ein Blick auf die Produktfotos könnte das entscheiden.',
  'GOOGLE-KATEGORIE LEER ODER NUR "Clothing": ' + pool.filter(x => !x.p.g || x.p.g === 'Apparel & Accessories > Clothing').length + ' Herren-Produkte haben keine Unterkategorie (' + pool.filter(x => !x.p.g).length + ' Kostüme/Perücken/Masken ganz ohne g, ' + pool.filter(x => x.p.g === 'Apparel & Accessories > Clothing').length + ' mit dem blanken Oberbegriff Clothing). Sie lassen sich nicht nach g einordnen und stehen in rest/fremdkoerper (Kostüme -> kostueme-fasnacht).',
  'ELTERN: "herren" ist die Abteilung und kein eigener Eintrag (Summe der 14 Blätter). Heutige Handles, die ersetzt oder umgeleitet werden müssen: herren-hemden, herren-hosen, herren-jeans, herren-pullover, herren-jacken, herren-shirts, herren-sets-sub, herren-mode-sub, fur-ihn ("Herren-Mode" mit Schmuck, Uhren, Vatertag). Messung heutiger Tag+Titel-Collections gegen die neue Einteilung (herren-bekleidung_altbestand.json): herren-hemden (Titel "Hemd", ' + av('herren-hemden').n_daten + ' Treffer) enthält ' + nv('herren-hemden', 'poloshirts') + ' Polohemden, ' + nv('herren-hemden', 'jacken-maentel') + ' Hemdjacken und ' + nv('herren-hemden', 'pullover-strick') + ' Pullover neben ' + nv('herren-hemden', 'hemden') + ' Hemden; herren-sets-sub (Titel "Set", ' + av('herren-sets-sub').n_daten + ' Treffer) besteht zu ' + nichtKl('herren-sets-sub') + ' aus Uhren-, Ring- und Pflege-Geschenksets; herren-hosen enthält ' + nichtKl('herren-hosen') + ' Spielzeuge; herren-shirts (' + av('herren-shirts').n_daten + ') mischt T-Shirts (' + nv('herren-shirts', 't-shirts') + '), Polos (' + nv('herren-shirts', 'poloshirts') + '), Hoodies/Sweatshirts (' + nv('herren-shirts', 'hoodies-sweatshirts') + ') und Hemden (' + nv('herren-shirts', 'hemden') + ').',
  'STICHPROBE: je Kategorie 30 Treffer (bei weniger alle) mit festem Seed ' + SEED + '+Kategorie-Nummer gezogen, ' + nStich + ' Titel vollständig gelesen, 0 als falsch gezählt. Das heisst statistisch nur, dass die Fehlerrate pro Kategorie wahrscheinlich unter etwa 10 % liegt (95 %-Konfidenz bei 0 von 30), nicht dass sie 0 ist. Beim Schärfen der Regeln wurden zuvor mehr als 800 weitere Titel aus mehreren anderen Stichproben (andere Seeds) gelesen; die dabei gefundenen Fehlerklassen sind behoben: Polo-Kragen an Pullover/Strickjacke, "Fleece-Futter" als Pullover, T-Shirt/Henley mit Revers als Hemd, Material Strick statt Kleidungsstück ("Hemd Strick"), Rollkragen/Half-Zip an T-Shirt, Kurzjeans unter Jeans, Sets unter Hosen/Shirts/Jacken, Denim-Jackett als Sakko, Arbeitsjacke/-hose zunächst fälschlich ausgeschlossen.',
  'GRENZFÄLLE DER STICHPROBE (' + urteileGrenz.length + ', nicht als falsch gezählt, Titel lässt beide Lesarten zu): ' + urteileGrenz.map(([h, g]) => '"' + titelVon[h] + '": ' + g).join('; '),
  'MESSGERÄT: herren-bekleidung_messen.mjs prüft Struktur, ungültige Regex, Doppelzuordnung (0), Treffer ausserhalb Herren-Kleidung im GANZEN Datensatz (0), Mindestgrössen (Kategorie >= 15, Unterfilter >= 10), Verteilung (keine Kategorie > 60 %, grösste ist Hemden mit ' + (100 * ausgabe.find(k => k.handle === 'herren-hemden').gemessen.treffer / pool.length).toFixed(1) + ' %), reproduziert die Stichprobe und vergleicht sie mit den Urteilen. Gegenprobe: ändert man eine Regel nach dem Lesen, schlägt der Stichproben-Vergleich an.',
];
fs.writeFileSync('herren-bekleidung.json', JSON.stringify(out, null, 1));
fs.writeFileSync('herren-bekleidung_messung.json', JSON.stringify({ gz, tagAbw, tagMit, abw, wk, unbekannt: ug, restGruppen: rg, mehrfach: mehr.length, pool: pool.length, filterZaehlung: ausgabe.map(k => ({ k: k.handle, treffer: k.gemessen.treffer, filter: k.unterfilter.map(f => [f.handle, members(k.handle).filter(x => unterfilterPasst(f, x.p)).length]) })) }, null, 1));
console.log('geschrieben: herren-bekleidung.json', JSON.stringify({ kategorien: out.kategorien.length, rest: rest.anzahl, fremd: fremdKurz.length, widersp: widersp.length, mehrfach: mehr.length }));
console.log(geschlecht_regel.split('\n').slice(-1)[0]);
console.log(out.widersprueche_tag_titel.regel);
console.log(rest.vorschlag);
