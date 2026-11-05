// Tests für glossar.mjs (kein Netz). Lauf: /opt/node22/bin/node automation/pod_modell/glossar_test.mjs
import { titelDe, titelVoll, titelSchluessel, fremdmarkenIn, slug, handleAus, farbeDe, farbRang, HANDLE_MAX, SUFFIX, TITEL_FEST } from './glossar.mjs';
import { neuerTest } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('glossar');
const t = (id, en, marke, typ) => titelDe({ printfulProductId: id, titelEn: en, marke, typ });

// ── Titel: Regel (Beispiele der Katalogdateien vom 05.11.2026)
ist('T-Shirt: Handelsname «Staple» und Marke weg, Eco bleibt', t(760, 'Unisex Staple Eco T-Shirt', 'Bella + Canvas', 'T-SHIRT').titel, 'Unisex Eco T-Shirt');
ist('Hoodie: «Heavy Blend» (Handelsname) fällt weg', t(146, 'Unisex Heavy Blend Hoodie', 'Gildan', 'T-SHIRT').titel, 'Unisex Hoodie');
ist('Tragetasche: Adjektiv nach Geschlecht (f: -e)', t(378, 'Large Eco Tote', 'Econscious', 'T-SHIRT').titel, 'Grosse Eco Tragetasche');
ist('Leinwand: «(in)» ist eine Einheit des Herstellers und entfällt', t(616, 'Thin Canvas (in)', null, 'CANVAS').titel, 'Dünne Leinwand');
ist('Aufkleberbogen: Phrase «sticker sheet», Fremdwort bleibt', t(505, 'Kiss-Cut Sticker Sheet', null, 'STICKER').titel, 'Kiss-Cut Aufkleberbogen');
ist('Aufkleber im Plural: Adjektiv auf -e', t(673, 'Kiss-Cut Holographic Stickers', null, 'STICKER').titel, 'Kiss-Cut holografische Aufkleber');
ist('Sherpa-Decke: «sublimated» ist Technik und entfällt', t(711, 'Sublimated Sherpa Blanket', null, 'SUBLIMATION').titel, 'Sherpa-Decke');
ist('Sweatshirt: Premium unverändert', t(411, 'Unisex Premium Sweatshirt', 'Cotton Heritage', 'T-SHIRT').titel, 'Unisex Premium Sweatshirt');
ist('Typographischer Apostroph (Women’s) wird erkannt', t(997, 'Women’s Cropped Hoodie', 'Bella + Canvas', 'T-SHIRT').titel, 'Damen Cropped Hoodie');
ist('Edelstahl als Präfix', t(996, 'Stainless Steel Tumbler', null, 'DRINKWARE').titel, 'Edelstahl-Trinkbecher');
ist('Kapuzen-Hoodie: Langarm-Phrase', t(990, 'Unisex Long Sleeve Tee', 'Bella + Canvas', 'T-SHIRT').titel, 'Unisex Langarmshirt');
ist('Phrase vor Einzelwort: «crew neck sweater»', t(991, 'Unisex Crew Neck Sweater', null, 'T-SHIRT').titel, 'Unisex Rundhals Pullover');
ist('Mass im Titel wird umgerechnet: 9 oz Kerze = Gramm', t(994, 'Soy Candle, 9oz', null, 'CANDLE').masse, '255 g');

// ── Titel: fest und unbekannt
ist('TITEL_FEST hat Vorrang (403)', t(403, 'White Ceramic Mug with Color Inside', null, 'MUG').titel, 'Keramik-Tasse mit farbiger Innenseite');
ist('TITEL_FEST kann einen eigenen Handle-Slug tragen', t(403, 'x', null, 'MUG').slugFest, 'keramik-tasse-farbige-innenseite');
ist('TITEL_FEST ohne Slug → null', t(1, 'x', null, 'POSTER').slugFest, null);
ist('Unbekannte Wörter werden gemeldet, nie geraten', t(995, 'Scented Soy Candle', null, 'CANDLE').unbekannt, ['Scented', 'Soy']);
ist('Ein Titel ohne Nomen hat keinen Titel', t(993, 'Fancy Thing', null, 'DECOR').titel, null);
ist('zweites Nomen wird gemeldet', t(992, 'Tee Hoodie', null, 'T-SHIRT').unbekannt.some((u) => /zweites Nomen/.test(u)), true);
ist('Marke vor «|» und nach der Marke: nur der Handelsname zählt', t(989, 'Unisex Premium Sweatshirt | Cotton Heritage M2480', 'Cotton Heritage', 'T-SHIRT').titel, 'Unisex Premium Sweatshirt');
ist('Fremdmarke im Titel wird entfernt und gemeldet', t(988, 'Adidas Dad Hat', null, 'EMBROIDERY').entferntMarken, ['adidas']);
ist('«for iPhone» bei Handyhüllen erlaubt', t(987, 'Snap Case for iPhone', null, 'PHONE-CASE').titel, 'Snap Hülle für iPhone');
ist('«for iPhone» bei anderen Typen: unbekannt (iPhone ist dort eine Fremdmarke)', t(986, 'Snap Case for iPhone', null, 'T-SHIRT').unbekannt.length > 0, true);
ist('Titel mit Zusatz', titelVoll('Unisex Eco T-Shirt'), 'Unisex Eco T-Shirt selbst gestalten');
ist('Titelschlüssel: Strich, Gross-/Kleinschreibung gleich', titelSchluessel('Unisex T-Shirt – Selbst gestalten'), titelSchluessel('unisex t shirt selbst gestalten'));

// ── Fremdmarken
ist('Marken: «Bella + Canvas» nur als eine Marke', fremdmarkenIn('Bella + Canvas 3001', 'T-SHIRT'), ['bella + canvas']);
ist('«Canvas» allein ist eine Leinwand, keine Marke', fremdmarkenIn('Thin Canvas', 'CANVAS'), []);
ist('iPhone bei Handyhüllen nötig, nicht bei Shirts', [fremdmarkenIn('iPhone Case', 'PHONE-CASE'), fremdmarkenIn('iPhone Case', 'T-SHIRT')], [[], ['iphone']]);
ist('Marken nur als ganze Wörter («ottoman» ist kein Otto)', fremdmarkenIn('Ottoman Cushion', 'DECOR'), []);

// ── Handle
ist('slug: Umlaute und ß', slug('Grüne Tasse für Süsse Träume ß'), 'gruene-tasse-fuer-suesse-traeume-ss');
ist('slug: nur a-z 0-9 und Bindestrich', /^[a-z0-9-]+$/.test(slug('Hoodie 271 g/m² (Premium)!')), true);
ist('Handle-Muster', handleAus('Unisex Eco T-Shirt').handle, 'unisex-eco-t-shirt-selbst-gestalten');
ist('Handle höchstens 50 Zeichen, gekürzt an einer Wortgrenze', handleAus('Strukturierte Cap mit geschlossener Rückseite und einem sehr langen Namen').handle.length <= HANDLE_MAX, true);
ist('gekürzter Handle endet auf den Zusatz, nie mitten im Wort und nie auf einem Füllwort («mit»)', handleAus('Strukturierte Cap mit geschlossener Rückseite und einem sehr langen Namen').handle, 'strukturierte-cap-selbst-gestalten');
ist('Handle: fester Slug', handleAus('egal', { slugFest: 'keramik-tasse-farbige-innenseite' }).handle, 'keramik-tasse-farbige-innenseite-selbst-gestalten');
ist('Handle: Kollision → Modellnummer', handleAus('Unisex Hoodie', { nummer: 146, schonVergeben: new Set(['unisex-hoodie-selbst-gestalten']) }), { handle: 'unisex-hoodie-146-selbst-gestalten', kollision: true });
ist('Handle: Kollision ohne Nummer → kein Handle (nie ein vorhandener)', handleAus('Unisex Hoodie', { schonVergeben: new Set(['unisex-hoodie-selbst-gestalten']) }).handle, null);
ist('Handle: auch mit Modellnummer vergeben → kein Handle', handleAus('A', { nummer: 5, schonVergeben: new Set(['a-selbst-gestalten', 'a-5-selbst-gestalten']) }).handle, null);
ist('Handle mit langem Slug und Nummer bleibt ≤ 50', handleAus('Strukturierte Cap mit geschlossener Rückseite und einem sehr langen Namen', { nummer: 140, schonVergeben: new Set(['strukturierte-cap-mit-geschlossener-selbst-gestalten']) }).handle.length <= HANDLE_MAX, true);
ist('Zusatz im Handle ist slug(SUFFIX)', SUFFIX, 'selbst gestalten');
for (const [id, v] of Object.entries(TITEL_FEST)) { const ti = typeof v === 'string' ? v : v.titel; const sl = typeof v === 'string' ? null : v.slug; ist(`TITEL_FEST ${id}: Handle ≤ ${HANDLE_MAX} Zeichen`, handleAus(ti, { slugFest: sl }).handle?.length <= HANDLE_MAX, true); }

// ── Farben
ist('Grundfarben', ['White', 'Black', 'Navy', 'Red'].map((x) => farbeDe(x).de), ['Weiss', 'Schwarz', 'Marineblau', 'Rot']);
ist('Zusatz + Farbe zusammengeschrieben', [farbeDe('Dark Blue').de, farbeDe('Light Pink').de], ['Dunkelblau', 'Hellrosa']);
ist('Heather = meliert', farbeDe('Heather Grey').de, 'Grau meliert');
ist('Zwei Farben mit Schrägstrich', farbeDe('Black/White').de, 'Schwarz/Weiss');
ist('Ganzer Name hat Vorrang (Navy Blazer)', farbeDe('Navy Blazer').de, 'Marineblau');
ist('Glossy/Matte für Handyhüllen', [farbeDe('Glossy').de, farbeDe('Matte').de], ['Glänzend', 'Matt']);
ist('Unbekanntes Farbwort: kein Name, Wörter gemeldet', farbeDe('Mystic Foo'), { de: null, unbekannt: ['mystic', 'foo'] });
ist('Zwei Grundfarben ohne Schrägstrich: nicht raten', farbeDe('Red Blue').de, null);
ist('keine Farbe', farbeDe(null), { de: null, unbekannt: [] });
ist('Farbrang: Weiss vor Schwarz vor Marineblau vor Rot', ['White', 'Black', 'Navy', 'Red'].map(farbRang), [0, 1, 2, 7]);
ist('Farbrang: «Dark Heather» zählt als Grau, aber nach den reinen Grundfarben', farbRang('Dark Heather'), 100 + farbRang('Grey'));
ist('Farbrang: reine Grundfarbe vor veränderter derselben Familie', farbRang('Black') < farbRang('Black Heather') && farbRang('Navy') < farbRang('Black Heather'), true);
ist('Farbrang: unbekannt = 99', farbRang('Tangerine'), 99);
ist('Farbrang: erstes Farbwort entscheidet («Heather Navy» = Marine, verändert)', farbRang('Heather Navy'), 100 + farbRang('Navy'));

ende();
