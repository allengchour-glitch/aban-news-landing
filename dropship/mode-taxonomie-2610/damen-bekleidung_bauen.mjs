/**
 * Baut /tmp/mode_taxonomie/damen-bekleidung.json aus den Regeln (damen-bekleidung_regeln.mjs), dem Datensatz und den
 * gelesenen Stichproben (damen-bekleidung_urteile.json). Prueft danach, dass die JSON-Regeln genau die gleichen Mitglieder liefern.
 *   node damen-bekleidung_bauen.mjs            -> schreibt die JSON
 *   node damen-bekleidung_bauen.mjs --vorschau -> nur Zahlen, ohne Urteile
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KATEGORIEN, SPERR, GESCHLECHT_RE, NUR_WEIBLICH_G, geschlecht, geschlechtQuelle, istMitglied, istInUnterfilter } from './damen-bekleidung_regeln.mjs';
import { stichprobe } from './damen-bekleidung_messen_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const vorschau = process.argv.includes('--vorschau');
const urteile = fs.existsSync(path.join(HERE, 'damen-bekleidung_urteile.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'damen-bekleidung_urteile.json'), 'utf8')) : {};
const C = 'Apparel & Accessories > Clothing > ';
const byHandle = new Map(daten.map(p => [p.handle, p]));
const kurz = t => (t || '').replace(/\s+/g, ' ').slice(0, 80);

const gesch = new Map(daten.map(p => [p.handle, geschlechtQuelle(p)]));
const mit = Object.fromEntries(KATEGORIEN.map(k => [k.handle, daten.filter(p => istMitglied(k, p, gesch.get(p.handle)[0]))]));
const inKat = new Set(Object.values(mit).flat().map(p => p.handle));

/* ---------- Geschlecht: Zahlen ---------- */
const kl = daten.filter(p => (p.g || '').startsWith(C));
const dist = {}, quelle = {};
for (const p of kl) { const [g, q] = gesch.get(p.handle); dist[g] = (dist[g] || 0) + 1; quelle[q] = (quelle[q] || 0) + 1; }
const tagG = p => { const t = p.tags; const td = t.includes('damen'), th = t.includes('herren') || t.includes('maenner'), tk = t.includes('kinder'); return td && th ? 'unisex' : td ? 'damen' : th ? 'herren' : tk ? 'kinder' : null; };
let widerspruch = 0, titelUndTag = 0; const widArt = {};
for (const p of kl) { const [g, q] = gesch.get(p.handle); const tg = tagG(p); if (q === 'titel' && tg) { titelUndTag++; if (tg !== g) { widerspruch++; const k = `Tag ${tg} -> ${g}`; widArt[k] = (widArt[k] || 0) + 1; } } }
let tagFaelle = 0, tagTypGleich = 0;
for (const p of kl) if (gesch.get(p.handle)[1] === 'tag') { tagFaelle++; const t = p.type === 'Damenmode' ? 'damen' : p.type === 'Herrenmode' ? 'herren' : (p.type === 'Baby & Kinder' || p.type === 'Kinder') ? 'kinder' : null; if (t === gesch.get(p.handle)[0]) tagTypGleich++; }
const pct = (a, b) => (100 * a / b).toFixed(1).replace('.', ',') + ' %';

const geschlecht_regel = [
  'Ergebnis je Produkt: damen | herren | kinder | unisex | unbekannt. Alle Muster sind Regex-Strings (JavaScript, Flag i) und werden auf den Produkttitel angewendet; der erste zutreffende Schritt gilt.',
  `1. Titel trifft KINDER (${GESCHLECHT_RE.kinder.join('  ODER  ')}) -> kinder.`,
  `2. Titel trifft UNISEX (${GESCHLECHT_RE.unisex.join('  ODER  ')}) oder trifft DAMEN UND HERREN zugleich -> unisex.`,
  `3. Titel trifft HERREN (${GESCHLECHT_RE.herren.join('  ODER  ')}) -> herren.`,
  `4. Titel trifft DAMEN (${GESCHLECHT_RE.damen.join('  ODER  ')}) -> damen.`,
  '5. Tags: Tag unisex -> unisex; Tags damen UND (herren oder maenner) -> unisex; damen -> damen; herren oder maenner -> herren; kinder -> kinder.',
  '6. Feld type: Damenmode -> damen; Herrenmode -> herren; «Baby & Kinder» oder «Kinder» -> kinder; «T-Shirt» oder «Shirt», oder Titel enthält «selbst gestalten» -> unisex.',
  `7. Google-Kategorie beginnt mit ${NUR_WEIBLICH_G.map(x => x.replace(C, '')).join(' | ')} -> damen.`,
  `8. Titel trifft EINDEUTIG (${GESCHLECHT_RE.eindeutig.join('  ODER  ')}) -> damen (in den Daten mit bekanntem Geschlecht kommen diese Wörter nie bei Herren vor: yoga 147:0, leggings 106:0).`,
  '9. Sonst unbekannt (das Produkt kommt in keine Kategorie).',
  `Nachkorrektur: Ergibt Schritt 1-9 «herren» (oder «unisex» allein aus Tags) und beginnt g mit einem Anfangsstück aus Schritt 7, so gilt damen (Kleider, Röcke, BHs und Nachthemden sind nie Herren; so fängt die Regel Übersetzungsfehler wie «Herren-Rock» ab).`,
  'Ein Produkt mit Geschlecht unisex gehört zu Damen UND zu Herren (je einmal in genau einer Blatt-Kategorie jeder Abteilung); Kategorie-Geschlecht damen akzeptiert damen und unisex.',
  `GEMESSEN (${kl.length} Produkte mit g unter «Apparel & Accessories > Clothing > »): damen ${dist.damen}, herren ${dist.herren}, kinder ${dist.kinder}, unisex ${dist.unisex}, unbekannt ${dist.unbekannt}. Entscheidung durch Titel ${quelle.titel}, Tag ${quelle.tag}, type ${quelle.typ}, Google-Kategorie ${quelle.google}, Schritt 8 ${quelle.eindeutig}.`,
  `Titel gegen Tag: nennt der Titel eine Zielgruppe UND ist ein Tag vorhanden (${titelUndTag} Produkte), widersprechen sie sich in ${widerspruch} Fällen (${pct(widerspruch, titelUndTag)}): ${Object.entries(widArt).map(([k, v]) => `${k} ${v}`).join(', ')}. Der Titel gewinnt, weil er die Zielgruppe wörtlich nennt, während der Tag ein Sammel-Tag des Imports ist und Familien-, Paar- und Unisex-Ware nur grob als «damen» führt. Wo der Titel schweigt, gilt der Tag: das Feld type stimmt in ${tagTypGleich} von ${tagFaelle} dieser Fälle (${pct(tagTypGleich, tagFaelle)}) mit dem Tag überein.`,
].join('\n');

/* ---------- Rest / Fremdkoerper ---------- */
const universe = daten.filter(p => ['damen', 'unisex'].includes(gesch.get(p.handle)[0]) && (p.g || '').startsWith(C));
const rest = universe.filter(p => !inKat.has(p.handle));
const FREMD_RE = { kostuem: /(kostüm|cosplay|verkleid|maskenball)/i, maske: /(^|[^a-zäöüß])(stoffmasken?|mundschutz|gesichtsmaske)/i, taktik: /(^|[^a-zäöüß])(tactical|taktisch)/i, chain: /(^|[^a-zäöüß])body[- ]?chain/i };
const grund = {};
for (const p of rest) {
  const r = (p.tags || []).some(t => SPERR.includes(t)) ? 'sperr' : FREMD_RE.kostuem.test(p.title) ? 'kostuem' : FREMD_RE.maske.test(p.title) ? 'maske' : FREMD_RE.taktik.test(p.title) ? 'taktik' : FREMD_RE.chain.test(p.title) ? 'chain' : (p.g.includes('Shirts & Tops') && /jacke|mantel|cape/i.test(p.title)) ? 'g-jacke' : p.g.includes('Outfit Sets') || p.g.includes('Suits') ? 'set-wort' : 'sonst';
  (grund[r] = grund[r] || []).push(p);
}
const gl = daten.filter(p => !p.g && geschlecht(p) !== 'kinder' && /(jacke|bluse|set|hose|kleid|rock|pullover|shirt|mantel|hoodie)/i.test(p.title));
const unbekannt = kl.filter(p => gesch.get(p.handle)[0] === 'unbekannt');
const unbSport = unbekannt.filter(p => p.type === 'Sport & Outdoor' || /(^|[^a-zäöüß])(taktisch|tactical)/i.test(p.title) || /Vests|Motorcycle|Bicycle|Hunting/.test(p.g)).length;
const restBeispiele = stichprobe(rest.filter(p => !(p.tags || []).some(t => SPERR.includes(t))), 20, 'rest').map(p => kurz(p.title));
const nz = a => (a || []).length;
const restVorschlag = `Aufschlüsselung der ${rest.length}: ${nz(grund.sperr)} durch Sperr-Tag (adult, 18plus, Lizenz u. a.) bewusst ohne Themenkategorie; ${nz(grund.kostuem)} Kostüme/Kostümkleider und ${nz(grund.maske)} Stoffmasken, ${nz(grund.taktik)} taktische Ware, ${nz(grund.chain)} Körperschmuck (siehe fremdkoerper); ${nz(grund['g-jacke'])} Jacken/Mäntel mit Google-Kategorie «Shirts & Tops» (g auf «Outerwear > Coats & Jackets» setzen, dann greift damen-jacken-maentel); ${nz(grund['set-wort'])} Outfit-Sets ohne Set-Wort im Titel (Titel um «Set» oder «Zweiteiler» ergänzen); ${nz(grund.sonst)} Einzelfälle (${(grund.sonst || []).map(p => '«' + kurz(p.title) + '»').join(', ')}). Zusätzlich ${unbekannt.length} Kleidungsprodukte ohne erkennbares Geschlecht (kein Tag, kein type, kein Zielgruppen-Wort; davon ${unbSport} Sport-/Outdoor-/Taktik-Ware) und ${gl.length} Produkte ohne Google-Kategorie (g leer) mit Kleidungstitel: dort Tag damen/herren bzw. Google-Kategorie nachtragen, dann sortieren sie sich selbst ein.`;

const fremd = [];
// RAUS 1: Tag damen/herren, aber Titel nennt eine andere Zielgruppe
for (const p of kl) {
  const [g, q] = gesch.get(p.handle); const tg = tagG(p);
  if (q === 'titel' && tg && tg !== g && (g === 'kinder' || g === 'herren') && (tg === 'damen')) {
    const nenn = g === 'kinder' ? 'Kinder/Familie/Eltern/Mädchen' : 'Herren';
    fremd.push({ handle: p.handle, grund: `[RAUS] Tag damen, aber der Titel nennt ${nenn}: «${kurz(p.title)}»`, gehoert_nach: g === 'kinder' ? 'Kinder-/Familienbekleidung (Abteilung Kinder)' : 'Herren-Bekleidung' });
  }
}
// RAUS 2: keine Mode / Kostuem
const raus2 = [['kostuem', 'Kostüm/Verkleidung, keine Alltagsmode', 'Kostüme & Fasnacht (kostueme-fasnacht, Handles ft-*)'], ['maske', 'Gesichtsmasken-Set, keine Bekleidung', 'Gesundheit/Hygiene (nicht Mode)'], ['taktik', 'taktische Ausrüstung (Outdoor/Einsatz), keine Damenmode', 'Sport & Outdoor'], ['chain', 'Körperschmuck, kein Oberteil', 'Schmuck']];
for (const [k, text, ziel] of raus2) for (const p of grund[k] || []) fremd.push({ handle: p.handle, grund: `[RAUS] ${text}: «${kurz(p.title)}»`, gehoert_nach: ziel });
// RAUS 3: keine Kleidung in Kleidungs-Kategorie (Geschlecht unbekannt, daher in keiner Kategorie)
const manuell = [
  ['Verstellbarer Laptop-Ständer für den Schreibtisch', 'Laptop-Ständer mit Google-Kategorie «Shirts & Tops»', 'Büro/Computerzubehör'],
  ['Desktop-Pulley-Trainer für Armkraft', 'Fitnessgerät mit Google-Kategorie «Shirts & Tops»', 'Sport & Fitnessgeräte'],
  ['Jeans-Schürze für Erwachsene', 'Schürze (Haushalt/Küche) mit Google-Kategorie «Pants»', 'Küche/Schürzen'],
  ['Tauchgurt aus Silikon', 'Tauchzubehör mit Google-Kategorie «Clothing»', 'Sport & Outdoor'],
  ['Thermo-Nackenwärmer', 'Accessoire mit Google-Kategorie «Clothing»', 'Accessoires (Schals & Wärmer)'],
  ['Ohrwärmer aus Fell – Wärme & Frostschutz', 'Accessoire mit Google-Kategorie «Clothing»', 'Accessoires (Mützen & Ohrwärmer)'],
  ['Kopfbedeckung aus Mercerisiertem Baumwollgarn', 'Kopfbedeckung mit Google-Kategorie «Clothing»', 'Accessoires (Mützen & Hüte)'],
  ['Irideszierender Laser-Muster PVC-Bündelband', 'Band/Zubehör mit Google-Kategorie «Clothing»', 'Accessoires'],
  ['Schutzhose für Basketball & Rugby', 'Sport-Schutzausrüstung', 'Sport & Outdoor'],
  ['Reflektierende LED-Weste mit USB-Ladegerät', 'Sicherheitsweste mit Warnlicht, keine Modeware', 'Arbeits-/Sicherheitskleidung'],
  ['Sicherheitsweste mit Warnlicht', 'Sicherheitsweste, keine Modeware', 'Arbeits-/Sicherheitskleidung'],
];
for (const [t, g, ziel] of manuell) { const p = daten.find(x => x.title === t); if (p) fremd.push({ handle: p.handle, grund: `[RAUS] ${g}`, gehoert_nach: ziel }); }
// REIN: echte Damenmode mit falscher Google-Kategorie
const rein = [
  ['sommerkleid-fleur-noir-blumen-print-midi-mit-bindegurtel', 'Kleid, g «Belts» wegen «Bindegürtel» im Titel', 'damen-kleider'],
  ['blazer-roma-tailliert-mit-bindegurtel-revers', 'Blazer, g «Belts» wegen «Bindegürtel» im Titel', 'damen-jacken-maentel'],
  ['damen-overall-mit-pailletten-und-gurtel-608900', 'Overall, g «Belts» wegen «Gürtel» im Titel', 'damen-jumpsuits'],
  ['kurze-wattierte-jacke-mit-gurtel-und-kapuze-628800', 'Jacke, g «Belts» wegen «Gürtel» im Titel', 'damen-jacken-maentel'],
  ['kurze-baumwolljacke-mit-gurtel-605000', 'Jacke, g «Belts» wegen «Gürtel» im Titel', 'damen-jacken-maentel'],
  ['yoga-sport-maxirock-mit-taschen-613000', 'Rock, g «Handbags» wegen «Taschen» im Titel', 'damen-roecke'],
  ['midirock-mit-tunnelzug-und-grossen-taschen-634000', 'Rock, g «Handbags» wegen «Taschen» im Titel', 'damen-roecke'],
  ['damen-maxirock-mit-print-und-taschen-610400', 'Rock, g «Handbags» wegen «Taschen» im Titel', 'damen-roecke'],
  ['luftige-caprihose-mit-taschen-fur-den-sommer-627200', 'Hose, g «Handbags» wegen «Taschen» im Titel', 'damen-hosen'],
  ['loose-fit-stoffhose-mit-taschen-629200', 'Hose, g «Handbags» wegen «Taschen» im Titel', 'damen-hosen'],
  ['bootcut-fitnesshose-mit-huft-push-up-621200', 'Fitnesshose, g «Push Up & Pull Up Bars» wegen «Push-up» im Titel', 'damen-sportbekleidung'],
  ['kapuzenpullover-aus-plusch-610500', 'Kapuzenpullover, g «Dolls, Playsets & Toy Figures» wegen «Plüsch»', 'damen-hoodies-sweatshirts'],
  ['gothic-stil-pluschmantel-mit-fell-bustier-630200', 'Mantel, g «Dolls, Playsets & Toy Figures» wegen «Plüsch»', 'damen-jacken-maentel'],
  ['damen-nachthemd-aus-plusch-mit-gurtel-600900', 'Nachthemd, g «Dolls, Playsets & Toy Figures» wegen «Plüsch»', 'damen-nachtwaesche'],
  ['damen-jacke-silbrig-mit-glitzer-fgssck4675', 'Jacke ohne Google-Kategorie', 'damen-jacken-maentel'],
  ['damen-jacke-rosa-mit-glitzer-fgssck4677', 'Jacke ohne Google-Kategorie', 'damen-jacken-maentel'],
  ['damen-jacke-gold-mit-glitzer-fgssck4676', 'Jacke ohne Google-Kategorie', 'damen-jacken-maentel'],
  ['damen-strickjacke-schwarz-fgsshb3800', 'Strickjacke ohne Google-Kategorie', 'damen-strickjacken'],
  ['strickjacke-damen-dunkelblau-fgsshb3805', 'Strickjacke ohne Google-Kategorie', 'damen-strickjacken'],
  ['strickjacke-damen-naturfarben-fgsshb3810', 'Strickjacke ohne Google-Kategorie', 'damen-strickjacken'],
  ['trachtenbluse-damen-fgsshb2610', 'Bluse ohne Google-Kategorie', 'damen-blusen-hemden'],
  ['raver-set-damen-hose-shirt-fgssor9991', 'Set ohne Google-Kategorie', 'damen-sets'],
];
for (const [h, g, ziel] of rein) if (byHandle.has(h)) fremd.push({ handle: h, grund: `[REIN] gehört in Damen-Bekleidung: ${g}`, gehoert_nach: ziel });

/* ---------- Kategorien ---------- */
const out = [];
for (const k of KATEGORIEN) {
  const l = mit[k.handle]; const u = urteile[k.handle];
  if (!u && !vorschau) throw new Error('Urteil fehlt: ' + k.handle);
  out.push({
    handle: k.handle, titel: k.titel, eltern: k.eltern, geschlecht: k.geschlecht, g_prefix: k.g_prefix, g_nicht: k.g_nicht,
    titel_muss: k.titel_muss, titel_nicht: k.titel_nicht, tags_muss_eines: k.tags_muss_eines, tags_nicht: k.tags_nicht,
    beschreibung: k.beschreibung,
    unterfilter: k.unterfilter.map(x => ({ handle: x.handle, titel: x.titel, titel_muss: x.titel_muss, titel_nicht: x.titel_nicht || [] })),
    gemessen: { treffer: l.length, stichprobe: u ? u.gelesen : Math.min(30, l.length), falsch: u ? u.falsch : 0, falsche_beispiele: u ? u.beispiele : [] },
  });
}

const MESSPROTOKOLL = 'Messprotokoll (alles mit damen-bekleidung_messen.mjs und damen-bekleidung_bauen.mjs wiederholbar): je Kategorie 30 zufällige Treffer (fester Seed) einzeln gelesen, bei Umstandsmode, Bademode, Nachtwäsche und Dessous alle Treffer; zusätzlich Vollscans über jede Kategorie nach Fremdwörtern (Maske, Schürze, Gürtel, Tasche, Schal … 221 Treffer durchgesehen, fast alles «mit Gürtel/Stickerei/Halter» im Titel eines echten Kleidungsstücks) und nach Titeln ohne Warenart-Wort (62 Titel; davon ein Körperschmuck-Band «Farbenfrohes Körperkreuz» und ein Unterrock ohne Kleidungsstück-Wort, der Rest echte Kleidung). Beim Lesen gefundene und danach per Regel behobene Fehltreffer: «Pailletten Body Chain Top» in Dessous, Stoffmasken-Set in Sets, 5 Kostümkleider in Kleidern, taktische Cargo-Hose in Hosen, «Casual Badetop» in Tops, «Samt-Hotpants» in Hosen, «Kurzarmhemd mit ärmelloser Weste» in Jacken, «Faux-Jeans-Oberteil»/«Jeans-Top» in Jeans und 5 Top-&-Hose-Zweiteiler in Hosen/Shorts/Strickjacken (jetzt in Zweiteiler & Sets), «Rosenrotes» Kleid im Blumenfilter, «Spitzer Ausschnitt» im Spitzenfilter. Grenzfälle, die als richtig gezählt sind: «Cardigan-Bluse» (2 in Strickjacken), «Sport-Top» in Tops, «Shapewear-Kleid» in Dessous. Eine Stichprobe von 30 beweist keine 97 %; sie schliesst grobe Fehler aus.';
const offene = [
  'Unterfilter sind Facetten (Chips/Filter): ein Produkt kann in mehreren Unterfiltern derselben Kategorie stehen (z. B. «Maxikleider» und «Blumenkleider»), aber immer nur in einer Blatt-Kategorie. Jede Unterfilter-Regel gilt nur innerhalb ihrer Kategorie; alle Unterfilter haben mindestens 15 Treffer.',
  `Hochzeitsgäste: nur ${daten.filter(p => mitgl('damen-kleider', p) && /hochzeit|brautjungfer|trauzeugin|ballkleid|ball-kleid|abschlussball/i.test(p.title)).length} Kleider-Titel nennen Hochzeit oder Ball (alle «Ballkleid»); ein eigener Unterfilter wäre mit unter 15 Treffern zu klein. Sie stecken im Unterfilter «Abendkleider & festliche Kleider». Mehr geht nur mit neuen Daten (Titel/Tag «Hochzeitsgast» bei der Anlage vergeben).`,
  `Kleinste Unterfilter: «Cocktail- & Partykleider» mit ${mit['damen-kleider'].filter(p => istInUnterfilter(KATEGORIEN.find(k => k.handle === 'damen-kleider').unterfilter.find(u => u.handle === 'damen-kleider-cocktail'), p)).length} Treffern (Grenze 15). Fällt er unter 15, mit «Abendkleider & festliche Kleider» zusammenlegen.`,
  `Kleider machen ${pct(mit['damen-kleider'].length, [...inKat].length)} der Damen-Bekleidung aus (${mit['damen-kleider'].length} von ${[...inKat].length}): kein Fehler der Regel (Google-Kategorie «Dresses» hat im Katalog 3208 Produkte), aber die Seite braucht die Unterfilter, sonst ist sie zu lang.`,
  'Leggings: in der Google-Kategorie «Pants» gibt es keine einzige Leggings, alle liegen in «Activewear». Sie stehen deshalb in Sportbekleidung (Unterfilter «Sport-Leggings», 100+ Treffer) und nicht in Hosen. Wer «Leggings» auch als eigene Hauptkategorie will, braucht eine Querschnitt-Sammlung (Titel «Leggings|Jeggings|Tights», Abteilung Damen), die Sport und Alltag mischt.',
  'Vorhandene Collections mit gleichem Handle: damen-hosen (299, Tag-Regel), damen-jacken-maentel (900, Tag kat-damen-jacke), damen-sets (191, Titel «Set»). Diese Handles sollten auf die neuen Regeln umgestellt werden (gleiche URL, sauberer Inhalt), nicht doppelt angelegt.',
  `Partner-/Couple-Shirts, Unisex-Hoodies und die «T-Shirt «…»»-Motive aus der Schweizer Reihe (${universe.filter(p => gesch.get(p.handle)[0] === 'unisex').length} Produkte) sind unisex und erscheinen in Damen UND Herren.`,
  `Familien-/Eltern-Kind-Sets mit Tag damen (${fremd.filter(f => /Kinder\/Familie/.test(f.grund)).length} Produkte) gelten als kinder: sie gehören nicht in Damen. Das ist eine Entscheidung nach dem Titel; wer sie in Damen behalten will, nimmt «famili|eltern» und die Wörter mutter/tochter/mama/kind aus der Kinder-Regel.`,
  `Das Wort «Kostüm» wird im Schweizer Hochdeutsch auch für das Damenkostüm (Jupe + Jacke) benutzt; in diesem Katalog (maschinell übersetzt) heisst es durchgehend Verkleidung. Darum sperrt die Regel «kostüm» in allen Damen-Bekleidungs-Kategorien (${nz(grund.kostuem)} Produkte).`,
  `4 Titel heissen «Herren-Bluse»/«Herrenbluse» (g Shirts & Tops, Tag herren). Sie bleiben bei Herren (vermutlich Übersetzungsfehler für Herrenhemd); ein Herren-Rock oder Herren-Kleid kommt in den Daten nicht vor, die Nachkorrektur der Geschlechtsregel fängt es aber ab.`,
  `${unbekannt.length} Kleidungsprodukte haben kein erkennbares Geschlecht und kommen in keine Abteilung (siehe rest). Entscheid beim Besitzer: Tag nachtragen (${unbSport} davon sind Sport-/Outdoor-/Taktik-Ware, die ohnehin zu Sport & Outdoor gehört).`,
  'Mit den Sperr-Tags (adult-nicht-bewerben, 18plus, gmc-adult-pull, google-gesperrt-adult, lizenz-nicht-bewerben u. a.) kommt ein Produkt in keine Kategorie, wie in automation/lib/kategorien.mjs (SPERR_TAGS) für alle Themenkategorien festgelegt. Betroffen sind ' + universe.filter(p => (p.tags || []).some(t => SPERR.includes(t))).length + ' Damen-Produkte (davon ' + universe.filter(p => (p.tags || []).some(t => SPERR.includes(t)) && p.g.includes('Underwear')).length + ' Dessous, der Rest Kleider, Oberteile und Hosen mit Adult-Tag).',
  MESSPROTOKOLL,
  'Die Titel enthalten viel Füllwort («Elegantes …» steht in rund 640 Kleidertiteln): als Unterfilter taugt es nicht und wurde nicht verwendet. Hinweis für die Titelpflege: «Elegant» ersetzt oft die Warenart (z. B. «Eleganter Jumpsuit» ist gut, «Elegantes Oberteil» ist leer).',
];
function mitgl(h, p) { return istMitglied(KATEGORIEN.find(k => k.handle === h), p, gesch.get(p.handle)[0]); }
offene[1] = offene[1];

const json = {
  abteilung: 'damen-bekleidung',
  geschlecht_regel,
  kategorien: out,
  rest: { anzahl: rest.length, beispiele: restBeispiele, vorschlag: restVorschlag },
  fremdkoerper: fremd,
  widersprueche_tag_titel: { anzahl: widerspruch, regel: `Der Titel gewinnt, sobald er eine Zielgruppe nennt (Schritte 1-4 der geschlecht_regel); der Tag zählt nur, wenn der Titel schweigt (Schritt 5). Gemessen ${widerspruch} Widersprüche bei ${titelUndTag} Produkten mit Zielgruppe im Titel und Tag (${pct(widerspruch, titelUndTag)}): ${Object.entries(widArt).map(([k, v]) => `${k} ${v}`).join(', ')}. Kleider, Röcke, BHs und Nachthemden werden nie Herren (Nachkorrektur).` },
  offene_fragen: offene,
};
// Selbstpruefung: JSON-Regeln neu laden und gegen das Modul vergleichen
const txt = JSON.stringify(json, null, 1);
const rt = JSON.parse(txt);
let fehler = 0;
for (const k of rt.kategorien) {
  for (const s of [...k.titel_muss, ...k.titel_nicht, ...k.unterfilter.flatMap(u => [...u.titel_muss, ...u.titel_nicht])]) { try { new RegExp(s, 'i'); } catch (e) { console.log('REGEX KAPUTT', k.handle, s); fehler++; } }
  const l = daten.filter(p => istMitglied(k, p, gesch.get(p.handle)[0]));
  if (l.length !== mit[k.handle].length || l.some((p, i) => p !== mit[k.handle][i])) { console.log('ABWEICHUNG', k.handle); fehler++; }
  for (const u of k.unterfilter) { const n = l.filter(p => istInUnterfilter(u, p)).length; if (n < 15) { console.log('Unterfilter <15', u.handle, n); fehler++; } }
}
const doppelt = daten.filter(p => rt.kategorien.filter(k => istMitglied(k, p, gesch.get(p.handle)[0])).length > 1);
if (doppelt.length) { console.log('DOPPELT', doppelt.length); fehler++; }
console.log(`Kategorien ${rt.kategorien.length}, Unterfilter ${rt.kategorien.reduce((a, k) => a + k.unterfilter.length, 0)}, in Kategorien ${inKat.size}, Rest ${rest.length}, Fremdkörper ${fremd.length}, Fehler ${fehler}`);
if (!vorschau) { fs.writeFileSync(path.join(HERE, 'damen-bekleidung.json'), txt); console.log('geschrieben: /tmp/mode_taxonomie/damen-bekleidung.json', (txt.length / 1024).toFixed(0) + ' KB'); }
else { console.log(restVorschlag); console.log(geschlecht_regel); }
