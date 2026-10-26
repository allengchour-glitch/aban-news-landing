/**
 * Baut ALLES.json (alle Kategorien der vier Abteilungen in EINEM Format, plus Menuebaum) und ZUORDNUNG.json (Produkt -> Kategorien).
 *   node alles_bauen.mjs           (oder: node pruefen.mjs --alles)
 * Liest nur die vier Abteilungs-JSON, g_korrekturen.json, /tmp/mode_daten.json, /tmp/vorhandene_collections.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { passt, imUnterfilter, altMitglieder, imUniversum } from './pruef_kern.mjs';
import { GEN_JE_DATEI } from './geschlecht_gemeinsam.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATEIEN = ['damen-bekleidung', 'herren-bekleidung', 'kinder-baby-bekleidung', 'schuhe-accessoires'];
const daten0 = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const vorhandene = JSON.parse(fs.readFileSync('/tmp/vorhandene_collections.json', 'utf8'));
const gKorr = JSON.parse(fs.readFileSync(path.join(HERE, 'g_korrekturen.json'), 'utf8'));
const J = Object.fromEntries(DATEIEN.map(f => [f, JSON.parse(fs.readFileSync(path.join(HERE, f + '.json'), 'utf8'))]));
const kats = []; for (const f of DATEIEN) for (const k of J[f].kategorien) kats.push({ ...k, datei: f });
const katVon = Object.fromEntries(kats.map(k => [k.handle, k]));
const daten1 = daten0.map(p => gKorr[p.handle] ? { ...p, g: gKorr[p.handle].g } : p);   // mit Korrektur

function auswerten(daten) {
  const gen = {}; for (const f of DATEIEN) gen[f] = daten.map(p => GEN_JE_DATEI[f](p));
  const mem = new Map(); const proProdukt = daten.map(() => []);
  for (const k of kats) { const l = []; for (let i = 0; i < daten.length; i++) if (passt(k, daten[i], gen[k.datei][i])) { l.push(i); proProdukt[i].push(k.handle); } mem.set(k.handle, l); }
  return { mem, proProdukt, gen };
}
const roh = auswerten(daten0), kor = auswerten(daten1);

const bereichVon = k => k.datei !== 'schuhe-accessoires' ? 'bekleidung' : k.handle === 'kinder-accessoires' ? 'accessoires' : k.g_prefix[0].startsWith('Apparel & Accessories > Shoes') ? 'schuhe' : /Handbags, Wallets/.test(k.g_prefix[0]) ? 'taschen' : 'accessoires';

// ───────── Kategorien im gemeinsamen Format ─────────
const kategorien = kats.map(k => {
  const ufListe = (k.unterfilter || []).map(u => ({ handle: u.handle, titel: u.titel, titel_muss: u.titel_muss, titel_nicht: u.titel_nicht || [], treffer: kor.mem.get(k.handle).filter(i => imUnterfilter(u, daten1[i])).length }));
  return {
    handle: k.handle, titel: k.titel, abteilung: k.eltern, bereich: bereichVon(k), quelle_datei: k.datei + '.json', geschlecht: k.geschlecht,
    g_prefix: k.g_prefix, g_nicht: k.g_nicht, titel_muss: k.titel_muss, titel_nicht: k.titel_nicht, tags_muss_eines: k.tags_muss_eines, tags_nicht: k.tags_nicht,
    beschreibung: k.beschreibung, unterfilter: ufListe, unterfilter_vorgemerkt: (k.unterfilter_vorgemerkt || []).map(u => ({ handle: u.handle, titel: u.titel, treffer: u.treffer })),
    treffer: kor.mem.get(k.handle).length, treffer_ohne_g_korrekturen: roh.mem.get(k.handle).length,
    ...(k.ersetzt_collection ? { ersetzt_collection: k.ersetzt_collection } : {}),
  };
});

// ───────── Menuebaum ─────────
const L = (handle, titel) => ({ handle, ...(titel ? { titel } : {}) });
const G = (titel, ...unter) => ({ titel, unterpunkte: unter });
const V = (handle, titel) => ({ ...L(handle, titel), verweis: true });          // Querverweis auf eine Kategorie, die an anderer Stelle ihren Hauptplatz hat
const BESTEHEND = (handle, titel) => ({ handle, titel, vorhanden: true });       // bereits live, nicht Teil dieser Taxonomie
const MENUE_SPEC = [
  { titel: 'Damen', unterpunkte: [
    L('damen-kleider'),
    G('Oberteile', L('damen-t-shirts'), L('damen-tops'), L('damen-blusen-hemden'), L('damen-pullover'), L('damen-strickjacken'), L('damen-hoodies-sweatshirts')),
    G('Hosen & Röcke', L('damen-hosen'), L('damen-jeans'), L('damen-shorts'), L('damen-roecke'), L('damen-jumpsuits')),
    L('damen-jacken-maentel'),
    L('damen-sets'),
    G('Sport & Bademode', L('damen-sportbekleidung'), L('damen-bademode')),
    G('Wäsche & Nachtwäsche', L('damen-dessous'), L('damen-nachtwaesche'), L('damen-umstandsmode')),
    L('partnerlook-paare'),
  ] },
  { titel: 'Herren', unterpunkte: [
    G('Oberteile', L('herren-hemden'), L('herren-t-shirts'), L('herren-poloshirts'), L('herren-pullover-strick'), L('herren-hoodies-sweatshirts')),
    G('Jacken & Westen', L('herren-jacken-maentel'), L('herren-westen')),
    L('herren-anzuege-sakkos'),
    G('Hosen & Shorts', L('herren-hosen'), L('herren-jeans'), L('herren-shorts'), L('herren-overalls')),
    L('herren-sets'),
    L('herren-sportbekleidung'),
    V('partnerlook-paare'),
  ] },
  { titel: 'Kinder', unterpunkte: [
    G('Baby', L('kinder-baby-sets'), L('kinder-baby-strampler-bodys'), L('kinder-baby-kleider-oberteile')),
    G('Kinderkleidung', L('kinder-sets-outfits'), L('kinder-oberteile-kleider-hosen'), L('kinder-nachtwaesche-bademode')),
    L('kinder-familien-looks'),
    G('Kinderschuhe', V('kinder-lauflernschuhe'), V('kinder-sneaker'), V('kinder-stiefel'), V('kinder-sandalen'), V('kinder-ballerinas'), V('kinder-hausschuhe'), V('kinder-freizeitschuhe')),
    V('kinder-accessoires'),
  ] },
  { titel: 'Schuhe', unterpunkte: [
    G('Damenschuhe', L('damen-sneaker', 'Sneaker'), L('damen-sportschuhe', 'Sport-, Lauf- & Tanzschuhe'), L('damen-pumps', 'Pumps & Absatzschuhe'), L('damen-ballerinas', 'Ballerinas, Loafer & Flache'), L('damen-sandalen', 'Sandalen'),
      L('damen-keilsandalen', 'Keil- & Plateausandalen'), L('damen-pantoletten', 'Pantoletten, Mules & Clogs'), L('damen-flip-flops', 'Flip-Flops & Badeschuhe'), L('damen-stiefel', 'Stiefel & Stiefeletten'),
      L('damen-winterschuhe', 'Winterschuhe'), L('damen-wanderschuhe', 'Wanderschuhe'), L('damen-hausschuhe', 'Hausschuhe & Pantoffeln'), L('damen-freizeitschuhe', 'Freizeit- & Alltagsschuhe')),
    G('Herrenschuhe', L('herren-sneaker', 'Sneaker'), L('herren-sportschuhe', 'Sport-, Lauf- & Tanzschuhe'), L('herren-businessschuhe', 'Business- & Halbschuhe'), L('herren-freizeitschuhe', 'Freizeitschuhe'),
      L('herren-stiefel', 'Stiefel & Stiefeletten'), L('herren-sandalen', 'Sandalen & Pantoletten'), L('herren-winterschuhe', 'Winterschuhe'), L('herren-wanderschuhe', 'Wanderschuhe'), L('herren-hausschuhe', 'Hausschuhe & Pantoffeln')),
    G('Kinderschuhe', L('kinder-lauflernschuhe'), L('kinder-sneaker'), L('kinder-stiefel'), L('kinder-sandalen'), L('kinder-ballerinas'), L('kinder-hausschuhe'), L('kinder-freizeitschuhe')),
    G('Arbeits- & Spezialschuhe (bereits live, nicht Teil der Taxonomie)', BESTEHEND('arbeitsschuhe', 'Arbeits- & Sicherheitsschuhe')),
  ] },
  { titel: 'Accessoires', unterpunkte: [
    G('Damen-Taschen', L('damen-handtaschen', 'Handtaschen'), L('damen-umhaengetaschen', 'Umhänge- & Schultertaschen'), L('damen-shopper', 'Shopper & Tragetaschen'), L('damen-reisetaschen', 'Reise- & Sporttaschen'), L('damen-weitere-taschen', 'Weitere Taschen & Rucksäcke')),
    G('Damen-Geldbörsen', L('damen-geldboersen', 'Geldbörsen & Portemonnaies'), L('damen-kartenetuis', 'Kartenetuis & Kartenhalter')),
    G('Herren-Taschen', L('herren-umhaengetaschen', 'Umhänge- & Schultertaschen'), L('herren-brusttaschen', 'Brust- & Gürteltaschen'), L('herren-aktentaschen', 'Aktentaschen & Laptoptaschen'), L('herren-handtaschen', 'Handtaschen'),
      L('herren-clutches', 'Clutches & Abendtaschen'), L('herren-shopper', 'Shopper & Tragetaschen'), L('herren-reisetaschen', 'Reise- & Sporttaschen'), L('herren-weitere-taschen', 'Weitere Taschen & Rucksäcke')),
    G('Herren-Geldbörsen', L('herren-geldboersen', 'Geldbörsen & Portemonnaies'), L('herren-kartenetuis', 'Kartenetuis & Kartenhalter')),
    G('Gürtel', L('damen-guertel', 'Damen-Gürtel'), L('herren-guertel', 'Herren-Gürtel')),
    G('Mützen, Hüte & Masken', L('damen-kopfbedeckung', 'Damen: Mützen, Hüte & Caps'), L('herren-kopfbedeckung', 'Herren: Mützen, Hüte & Caps'), L('damen-sturmhauben-gesichtsmasken', 'Damen: Sturmhauben & Gesichtsmasken'), L('herren-sturmhauben-gesichtsmasken', 'Herren: Sturmhauben & Gesichtsmasken')),
    G('Schals & Handschuhe', L('damen-schals-tuecher', 'Schals & Tücher'), L('damen-handschuhe', 'Damen-Handschuhe'), L('herren-handschuhe', 'Herren-Handschuhe')),
    G('Sonnenbrillen', L('damen-sonnenbrillen', 'Damen-Sonnenbrillen'), L('herren-sonnenbrillen', 'Herren-Sonnenbrillen')),
    L('damen-haarschmuck'),
    L('kinder-accessoires'),
  ] },
];
const menueAnzahl = {};
const bauKnoten = n => {
  if (n.unterpunkte) return { titel: n.titel, unterpunkte: n.unterpunkte.map(bauKnoten) };
  const k = katVon[n.handle];
  if (!n.vorhanden && !k) throw new Error('Menue: unbekanntes Handle ' + n.handle);
  if (!n.verweis && !n.vorhanden) menueAnzahl[n.handle] = (menueAnzahl[n.handle] || 0) + 1;
  if (n.vorhanden) return { titel: n.titel, handle: n.handle, vorhanden: true, n_laut_vorhandene_collections: (vorhandene.find(c => c.handle === n.handle) || {}).n ?? null };
  return { titel: n.titel || k.titel, handle: k.handle, treffer: kor.mem.get(k.handle).length, ...(n.verweis ? { verweis: true } : {}), ...(k.unterfilter.length ? { unterfilter: k.unterfilter.map(u => ({ handle: u.handle, titel: u.titel, treffer: kor.mem.get(k.handle).filter(i => imUnterfilter(u, daten1[i])).length })).filter(u => u.treffer >= 15) } : {}) };
};
const menue = MENUE_SPEC.map(bauKnoten);
// Der Partnerlook steht in Damen als Hauptplatz; in Herren Querverweis. Pruefung: jede Kategorie genau einmal als Hauptplatz.
const ohneHauptplatz = kats.filter(k => menueAnzahl[k.handle] !== 1).map(k => `${k.handle}:${menueAnzahl[k.handle] || 0}`);
if (ohneHauptplatz.length) throw new Error('Menue: Kategorien ohne genau einen Hauptplatz: ' + ohneHauptplatz.join(', '));

// ───────── Kollisionen mit vorhandenen Collections ─────────
const vh = new Map(vorhandene.map(c => [c.handle, c]));
const stich = (arr, n) => { const s = []; const step = Math.max(1, Math.floor(arr.length / n)); for (let i = 0; i < arr.length && s.length < n; i += step) s.push(arr[i]); return s; };
const kollisionen = [];
for (const k of kats) {
  const c = vh.get(k.handle); if (!c) continue;
  const alt = altMitglieder(c, daten0); const neu = new Set(kor.mem.get(k.handle));
  const sAlt = alt ? new Set(alt) : null;
  const gem = alt ? alt.filter(i => neu.has(i)) : null, nurAlt = alt ? alt.filter(i => !neu.has(i)) : null, nurNeu = alt ? [...neu].filter(i => !sAlt.has(i)) : null;
  kollisionen.push({
    handle: k.handle, neu_titel: k.titel, neu_treffer: neu.size, alt_titel: c.titel, alt_n_live: c.n, alt_regel: String(c.regeln),
    alt_im_datensatz: alt ? alt.length : null, gemeinsam: gem ? gem.length : null, nur_alt: nurAlt ? nurAlt.length : null, nur_neu: nurNeu ? nurNeu.length : null,
    beispiele_faellt_weg: nurAlt ? stich(nurAlt, 6).map(i => daten0[i].title.slice(0, 80)) : [], beispiele_kommt_dazu: nurNeu ? stich(nurNeu, 6).map(i => daten0[i].title.slice(0, 80)) : [],
    empfehlung: 'Handle behalten (URL, Verlinkung und Suchmaschinen-Stand bleiben), Regel auf den neuen Tag umstellen. Die wegfallenden Produkte sind nach Stichprobe Fremdware in der alten Regel (Bikini-Sets, Gürtel, Strumpfhosen, Spielfiguren) oder haben jetzt eine eigene, passendere Kategorie (Polohemden, Cardigans, Westen).',
  });
}

// ───────── Themengleiche alte Collections mit anderem Handle ─────────
const AEQ = {
  damenschuhe: kats.filter(k => k.eltern === 'damen' && bereichVon(k) === 'schuhe').map(k => k.handle),
  herrenschuhe: kats.filter(k => k.eltern === 'herren' && bereichVon(k) === 'schuhe').map(k => k.handle),
  kinderschuhe: kats.filter(k => k.eltern === 'kinder' && bereichVon(k) === 'schuhe').map(k => k.handle),
  'sub-kleider': ['damen-kleider'], 'sonnenbrillen-damen': ['damen-sonnenbrillen'], 'sonnenbrillen-herren': ['herren-sonnenbrillen'], guertel: ['damen-guertel', 'herren-guertel'],
  handschuhe: ['damen-handschuhe', 'herren-handschuhe'], 'muetzen-schals': ['damen-kopfbedeckung', 'herren-kopfbedeckung', 'damen-schals-tuecher'],
  'portemonnaies-geldboersen': ['damen-geldboersen', 'herren-geldboersen'], 'kartenhalter-kartenetuis': ['damen-kartenetuis', 'herren-kartenetuis'], 'sub-bademode': ['damen-bademode'],
  babykleidung: ['kinder-baby-sets', 'kinder-baby-strampler-bodys', 'kinder-baby-kleider-oberteile', 'kinder-sets-outfits', 'kinder-oberteile-kleider-hosen', 'kinder-nachtwaesche-bademode'],
  'damen-uhren': [],
};
const themengleich = [];
for (const [h, neuHandles] of Object.entries(AEQ)) {
  const c = vh.get(h); if (!c || !neuHandles.length) continue;
  const alt = altMitglieder(c, daten0); const neu = new Set(neuHandles.flatMap(x => kor.mem.get(x)));
  themengleich.push({ alt_handle: h, alt_titel: c.titel, alt_n_live: c.n, neu_kategorien: neuHandles.length, neu_treffer: neu.size, alt_im_datensatz: alt ? alt.length : null, gemeinsam: alt ? alt.filter(i => neu.has(i)).length : null });
}

// ───────── Ausserhalb der Taxonomie ─────────
const SPERR = new Set(['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'google-gesperrt-adult', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'lizenz-nicht-bewerben']);
const ziele = {};
for (const f of DATEIEN) for (const e of J[f].fremdkoerper) { const z = (e.gehoert_nach || '?').replace(/\s*\(.*$/, '').slice(0, 60); ziele[z] = (ziele[z] || 0) + 1; }
const ohneKor = daten1.map((p, i) => i).filter(i => imUniversum(daten1[i]) && !kor.proProdukt[i].length);
const gruppen = {};
for (const i of ohneKor) { const p = daten1[i]; const tg = p.tags || []; const gr = (tg.includes('fortura') || /^Apparel & Accessories > Costumes/.test(p.g || '')) ? 'Kostüme (eigene Fortura-Kategorien)' : tg.some(t => SPERR.has(t)) ? 'Sperr-Tag (bewusst ohne Themenkategorie)' : 'keine Regel trifft (Fremdware oder Gruppen unter 15)'; gruppen[gr] = (gruppen[gr] || 0) + 1; }

const alles = {
  titel: 'Mode-Taxonomie LuxeStyle: Damen, Herren, Kinder, Schuhe, Accessoires',
  stand: '2026-10-26',
  zusammengefuehrt_aus: DATEIEN.map(f => f + '.json'),
  datensatz: { datei: '/tmp/mode_daten.json', produkte: daten0.length, felder: ['handle', 'title', 'tags', 'g (Google-Kategorie)', 'type'] },
  semantik: 'Ein Produkt gehört zur Kategorie k, wenn (g beginnt mit einem Eintrag von g_prefix ODER, falls g_prefix leer, mindestens ein titel_muss passt) UND (titel_muss leer ODER mindestens ein Treffer) UND kein titel_nicht-Treffer UND kein g_nicht-Präfix UND kein Tag aus tags_nicht UND (tags_muss_eines leer ODER mindestens eines vorhanden) UND Geschlecht(Produkt) passt zu k.geschlecht. Muster sind JavaScript-Regex-Strings (Flag i) auf dem Produkttitel. Geschlecht passt: damen/herren nehmen auch «unisex» auf; kinder, unisex und partner nur den eigenen Wert; «alle» hat keinen Geschlechtsfilter. Die Referenz-Implementierung ist pruef_kern.mjs (passt).',
  geschlecht: {
    modul: 'geschlecht_gemeinsam.mjs (geschlechtKleidung für Kleidung, geschlechtSA für Schuhe/Taschen/Accessoires)',
    werte: ['damen', 'herren', 'kinder', 'unisex', 'partner', 'unbekannt', 'konflikt'],
    regel_kleidung: [
      '1 Kinder-Regel sagt kinder (Familien-, Baby-, Kinderware; kennt die Ausnahmen Mädchenstil, Babydoll, «im jungen Stil») -> kinder',
      '2 Herren-Regel sagt partner (Paar-Looks) -> partner',
      '3 Damen- oder Herren-Regel sagt kinder, Kinder-Regel andere (Ausnahmewörter wie Mädchenstil) -> Damen-Regel ohne diese Wörter',
      '4 Damen-Regel und Herren-Regel stimmen überein -> dieses Ergebnis',
      '5 Herren-Regel sagt damen (weiblicher Schnitt mit Herren-Etikett: Halterneck, Off-Shoulder, High-Waist) und Damen-Regel herren oder unisex -> damen',
      '6 Damen-Regel unisex, Herren-Regel unbekannt (Produkttyp T-Shirt) -> unisex',
      '7 sonst konflikt (wird von pruefen.mjs gemeldet; im Datensatz 0)',
      'Nur bei unbekannt: weiblich kodiertes Titelwort (Spitze, Rüschen, Cape, Poncho, Umhang, Schleier, Chiffon, Boho, hohe Taille, Ballett …) -> damen; geschlechtsneutrale Kleidungsart (Hoodie, Sweatshirt, Pullover, Jacke, Weste, Hemd, Hose, Shorts, Socken, Pyjama, Bademantel, Trainingsanzug …) ohne Fremdwort (taktisch, Tarn, Warn, Kostüm …) -> unisex; sonst bleibt unbekannt (keine Zielgruppen-Kategorie).',
    ],
    regel_andere_waren: 'Titel (Kinder, Unisex, Herren, Damen) vor Tags vor Produkttyp vor Stilwörtern; ohne jeden Beleg gilt unisex (das Produkt steht in Damen UND Herren). Zusatz der gemeinsamen Prüfung: in der Gruppe Tasche/Geldbörse gilt ein eindeutig weiblich kodiertes Wort (Stroh, Rattan, Korbtasche, Baguette, Bow, Schalenhandtasche, Henkeltasche, Top-Handle, Kettenriemen, Plüsch) als damen (11 Taschen).',
    unisex_in_beiden: 'Unisex-Produkte stehen bewusst in der Damen- UND der Herren-Kategorie (Zählung in PRUEFBERICHT.md); innerhalb einer Zielgruppe nie in zwei Blatt-Kategorien.',
  },
  sperr_tags: [...SPERR, 'fortura (Kostüme: eigene Kategorien)'],
  g_korrekturen: { datei: 'g_korrekturen.json', anzahl: Object.keys(gKorr).length, anwendung: 'Vor der Auswertung g\' = g_korrekturen[handle].g setzen (Daten, keine Regeln). Besser: die Google-Kategorie im Shop selbst korrigieren; dann entfällt der Schritt. Die Zahlen `treffer` rechnen MIT, `treffer_ohne_g_korrekturen` ohne Korrektur.' },
  kategorien,
  menue,
  menue_regeln: 'Hauptplatz genau einmal je Kategorie; `verweis: true` ist ein Querverweis auf eine Kategorie mit Hauptplatz an anderer Stelle (Partnerlook in Herren, Kinderschuhe und Kinder-Accessoires in Kinder). `vorhanden: true` = bereits live, nicht Teil dieser Taxonomie. Unterfilter mit weniger als 15 Treffern sind nicht aktiv (`unterfilter_vorgemerkt`).',
  kollisionen_mit_vorhandenen_collections: kollisionen,
  themengleiche_vorhandene_collections: themengleich,
  ausserhalb_der_taxonomie: { mode_universum: daten1.filter(imUniversum).length, ohne_kategorie_mit_g_korrekturen: ohneKor.length, nach_grund: gruppen, fremdkoerper_ziele_laut_abteilungen: ziele, hinweis: 'Fremdware mit Mode-Google-Kategorie (Arbeitsschuhe, Rollschuhe, Einlegesohlen, Rad-/Kamera-/Werkzeugtaschen, Schlüsseletuis, Perücken, Fächer) gehört in andere Themen; Listen je Abteilung in `fremdkoerper` der Abteilungsdateien.' },
};
fs.writeFileSync(path.join(HERE, 'ALLES.json'), JSON.stringify(alles, null, 1));

// ZUORDNUNG.json: Produkt -> Kategorien (mit g_korrekturen), kompakt
const zu = { _meta: { stand: '2026-10-26', hinweis: 'Abgeleitet aus ALLES.json (mit g_korrekturen). Nur Produkte mit mindestens einer Kategorie. Schluessel = Produkt-Handle, Wert = Kategorie-Handles.', produkte: 0 } };
daten1.forEach((p, i) => { if (kor.proProdukt[i].length) zu[p.handle] = kor.proProdukt[i]; });
zu._meta.produkte = Object.keys(zu).length - 1;
fs.writeFileSync(path.join(HERE, 'ZUORDNUNG.json'), JSON.stringify(zu));
console.log(`ALLES.json: ${kategorien.length} Kategorien, ${kategorien.reduce((s, k) => s + k.unterfilter.length, 0)} aktive Unterfilter, Menü ${menue.length} Wurzeln, ${kollisionen.length} Kollisionen; ZUORDNUNG.json: ${zu._meta.produkte} Produkte`);
export { alles };
