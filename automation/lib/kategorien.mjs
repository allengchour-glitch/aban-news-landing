/**
 * Kategorie-Regeln: welches aktive Produkt gehört in welche Kategorie? Rein, ohne Netz, getestet (kategorien_test.mjs).
 *
 * WARUM NACH GOOGLE-KATEGORIE UND NICHT NACH WORTTEILEN (25.10.2026): Smart-Collections kennen bei «Titel enthält» keine Wortgrenze.
 * «SSD» steckt in «StoSSDämpfend» → Hundeleinen, Sneaker und Surfbrett-Dämpfer standen unter «PC-Komponenten»; «Tasse» steckt in
 * «Tassel»; `title:*Armatur*` findet «Küchenarmatur» nicht. Die Google-Kategorie (Metafeld mm-google-shopping.google_product_category,
 * bei ~97 % der Produkte gesetzt) kommt aus der echten CJ-Kategorie und trifft die Ware, nicht das Wort.
 *
 * ABER — GEMESSEN: wo die Kategorie nur der Oberbegriff ist (`Hardware > Tools` ohne Zusatz, 245 Artikel), ist sie die Auffang-Einstellung
 * des Imports: Holzbürste, Nagelfräser, Pantoffeln, Harzfarbe und ein Glock-Holster tragen alle genau diese. Dort entscheidet der Titel
 * (`werkzeugArt`). Eine Kategorie ist nur so gut wie ihre Genauigkeit — nie am Oberbegriff messen.
 *
 * Mindestgrösse: eine Kategorie lohnt erst ab MIN Produkten. Darunter wird sie nicht angelegt.
 */
import { istTasseOderBecher, TASSEN_TAG } from './tassen_regel.mjs';
import { VERENGT } from './kategorien_verengt.mjs';

const BUCH = 'a-zäöüß';
/** Eigenes Wort: links und rechts kein Buchstabe (ein Bindestrich trennt). */
export const wort = (s, f = 'i') => new RegExp(`(^|[^${BUCH}])(${s})(?![${BUCH}])`, f);
/** Wortanfang, rechts offen (für Zusammensetzungen: «Wand» → «Wandbild»). */
/** Wortende: rechts kein Buchstabe, links offen — für Zusammensetzungen («Küchenwaage»). */
export const ende_ = (s, f = 'i') => new RegExp(`(${s})(?![${BUCH}])`, f);
export const anfang = (s, f = 'i') => new RegExp(`(^|[^${BUCH}])(${s})`, f);
const ende = '(?![a-zäöüß])';

const gp = (p, ...pre) => { const g = p.g || ''; return pre.some(x => g.startsWith(x)); };
const HG = 'Home & Garden > ';
const KD = HG + 'Kitchen & Dining > ';
const AC = 'Arts & Entertainment > Hobbies & Creative Arts > ';

/** Feuerwaffen-Zubehör: nie bewerben, nie verkaufen. «Pistole» allein trifft Wasser- und Heissklebepistolen → bewusst nicht im Muster. */
export const WAFFEN = /(^|[^a-zäöüß])glock([^a-zäöüß]|$)|1911|(^|[^a-z0-9])ak-?74([^a-z0-9]|$)|zielfernrohr|zielklammer|zielvorrichtung|schalldämpfer|gewehr|airsoft|armbrust|springmesser|butterfly-?messer|wurfstern|schlagring|schlagstock|pfefferspray|elektroschock|taser/i;
/** Kostüm-Requisiten tragen dieselben Wörter (Holster der Lara Croft) — aus Fortura-Ware mit Anlass Fasnacht, keine Waffen. */
export const istWaffenzubehoer = p => WAFFEN.test(p.title || '') && !(p.tags || []).includes('fortura') && !gp(p, 'Apparel & Accessories > Jewelry')
  && !/(^|[^a-zäöüß])(butterfly|glock(en|e|turm)|glocke)/i.test(p.title || '') || /glock-holster|zielfernrohr|1911-pistole|ak-?74|gewehrriemen|zielvorrichtung|zielklammer/i.test(p.title || '');

// ───────────────────────────── Werkzeug-Welt ─────────────────────────────
const FREMD = [
  ['waffe', WAFFEN],
  ['sonst', anfang('zauberstab|zauberkunst|schwebeprop|stimmgerät|gitarrenbund|alkoholmeter|notizbuch|tagebuch|büroklammer|pinnwand|nachtlicht')],
  ['basteln', anfang('harz|pigment|glitzer|pailletten|epoxy|schmuck-?bastel|schmuckform|kugel-anhänger-form|prägewalze|papierwickler|rubbelbuch|diamant-malerei|monopoly|perlen|polierpaste|polierpulver|leder-(reparatur|werkzeug)|lederwerkzeug|lederwaren|schmuckwerkzeug|goldschmied|rollenpapier')],
  ['beauty', anfang('nagelfräs|nagelclipper|nagelfeile|nagellack|augenbrauen|haartrocken|zopfring|haarmesser|hornhaut|maniküre|jade-?roller|holzbürste|haarbürste|hufeisen-hakenkamm|kammreiniger|beauty-nase|armband-anziehhilfe|nagel-?(schleif|fräs)')],
  ['haushalt', anfang('pantoffel|toilette|urinal|handtuchhalter|fusselrasierer|daunenjacken|reinigungsmittel|kaminbürste|dessertlöffel|weinkühler|kuchenrotation|mausefalle|lederhandschuh|handschuhe|badezimmerschrank|türgriff-puffer|türstopper')],
  ['deko', anfang('blumentopf|vase|wandaufkleber|poster|leinwandposter|sticker|windsack|sonnenblumen-muster|3d-door|wandsticker|aufkleber|dekorationsständer|schmuck-objektständer')],
];
/** Für Artikel, deren Google-Kategorie nur «Hardware > Tools» lautet: Titel entscheidet. */
const TITEL_ART = [
  ['mess', ende_('messgerät|prüfstift|prüfer|detektor|tiefenmessgerät|winkelmesser|handzähler|kalibrator|nivellier\\w*|wasserwaage|thermometer|multimeter|spannungsprüfer|messschieber|linsenmessgerät')],
  ['elektro', ende_('akkuschrauber|schleifer|schleifgerät|bohrstaubsauger|luftpumpe|lötkolben|heissklebepistole|bohrmaschine|kettensäge|vakuumversiegelungsmaschine|reparaturmaschine|heizwendel|lötmatte|sprühpistole|spritzpistole')],
  ['zubehoer', ende_('bohrer|bohrausfräser|fräser|fräsersatz|schleifscheibe|sägeblatt|wendeplatten|bohrfutter|schleifkopf|hobelmesser|trennscheibe|klinge|klingen|bit-?set|schaftdreh\\w*|bohrlehre|bohrkorkenzieher|zapfenschneider|wellenscheibe|düse')],
  ['hand', ende_('zange|zangen|schlüssel|schraubendreher|schraubenzieher|schraubenausdreher|hammer|meissel|feile|säge|schere|cutter|spanner|schraubstock|abisolierer|nieten|gehrmass|winkelklemmen|klemmen|steinspalter|rostlöser|hebel|schaber|reparaturwerkzeug|werkzeug')],
  ['beschlaege', ende_('schrauben|dübel|eckverbinder|griff|schloss|riegel|scharnier|haken|schiene|schubladenschiene|rohr|ventil|kupplung|dichtung|kabelverbinder|spleissverbinder|verbinder|klebeband|kleber|schlauch|armatur|kabelschraube|handtuchhalter|halterung|möbelgriff|schalhalter|sicherungsbox')],
];

/**
 * Welche Werkzeug-Gruppe? → { art, nach }. art: hand | elektro | mess | sets | zubehoer | beschlaege | fahrzeug | allgemein | fremd
 * (fremd = kein Werkzeug, `nach` nennt wohin: basteln | beauty | haushalt | deko | waffe | kleidung | null).
 * Nur für Artikel mit Tag `werkzeug` oder Google-Kategorie unter «Hardware».
 */
export function werkzeugArt(p) {
  const t = p.title || '', g = p.g || '';
  if (WAFFEN.test(t) && !(p.tags || []).includes('fortura') && /glock-holster|zielfernrohr|1911-pistole|ak-?74|gewehr|zielvorrichtung|zielklammer|schalldämpfer|airsoft|armbrust/i.test(t)) return { art: 'fremd', nach: 'waffe' };
  // 1) Eindeutige Google-Unterkategorie
  if (g.startsWith('Hardware > Tools > Measuring')) return { art: 'mess' };
  if (/^Hardware > Tools > (Soldering Irons|Grinders|Power Tools|Heat Guns|Drills|Welding)/.test(g)) return { art: 'elektro' };
  if (g.startsWith('Hardware > Tools > Tool Sets')) return { art: 'sets' };
  if (g.startsWith('Hardware > Tool Accessories')) return { art: 'zubehoer' };
  if (/^Hardware > (Plumbing|Hardware Accessories|Locks & Keys|Building Materials|Power & Electrical Supplies|Hardware Pumps|Fencing|Hardware > Plumbing)/.test(g)) return { art: 'beschlaege' };
  if (g.startsWith('Hardware > Tools') && g !== 'Hardware > Tools') return { art: 'hand' };
  if (g.startsWith('Sporting Goods > Outdoor Recreation > Cycling')) return { art: 'fahrzeug' };
  if (g.startsWith('Vehicles & Parts')) return { art: 'fahrzeug' };
  // 2) Eindeutig kein Werkzeug (nach Google)
  if (gp(p, AC + 'Arts & Crafts', AC + 'Model Making', AC + 'Collectibles')) return { art: 'fremd', nach: 'basteln' };
  if (gp(p, AC)) return { art: 'fremd', nach: 'sonst' };
  if (gp(p, 'Health & Beauty > Personal Care')) return { art: 'fremd', nach: 'beauty' };
  if (gp(p, 'Apparel & Accessories > Clothing', 'Apparel & Accessories > Shoe', 'Luggage & Bags')) return { art: 'fremd', nach: 'kleidung' };
  if (gp(p, HG + 'Decor', 'Furniture')) return { art: 'fremd', nach: 'deko' };
  if (gp(p, KD, HG + 'Household Supplies', HG + 'Bathroom', HG + 'Smoking')) return { art: 'fremd', nach: 'haushalt' };
  // 3) Auffang-Kategorie «Hardware > Tools» (oder keine): der Titel entscheidet
  if (g === 'Hardware > Tools' || g === '') {
    for (const [nach, re] of FREMD) if (re.test(t)) return { art: 'fremd', nach };
    for (const [art, re] of TITEL_ART) if (re.test(t)) return { art };
    return { art: 'allgemein' };
  }
  // Alles, was nicht im Werkzeug-/Technik-/Garten-Umfeld liegt (Büro, Spielzeug, Tier, Baby …), gehört nicht unter «Werkzeug & Maschinen»
  if (g && !gp(p, 'Hardware', 'Business & Industrial', 'Electronics', 'Cameras & Optics', HG + 'Lawn & Garden', HG + 'Business & Home Security', HG + 'Pool & Spa', 'Health & Beauty > Jewelry Cleaning', 'Sporting Goods')) return { art: 'fremd', nach: 'sonst' };
  return { art: 'allgemein' };
}
const istWerkzeugWelt = p => (p.tags || []).includes('werkzeug') || gp(p, 'Hardware');
const werk = art => p => istWerkzeugWelt(p) && werkzeugArt(p).art === art;

// ───────────────────────────── Basteln ─────────────────────────────
export const STICKER_RE = anfang('sticker|aufkleber');
export const istSticker = p => (gp(p, AC + 'Arts & Crafts > Art & Crafting Materials > Embellishments & Trims') && STICKER_RE.test(p.title)) || /> Decorative Stickers/.test(p.g || '');
/** Gehört zum Basteln: Kreativ-Material, -Sets, Modellbau — nicht Wandbilder, Kissen, Instrumente. */
export function istBastelWare(p) {
  if (istSticker(p)) return false;
  if (gp(p, AC + 'Arts & Crafts', AC + 'Model Making')) return true;
  if (gp(p, AC + 'Collectibles > Scale Models')) return true;
  if (istWerkzeugWelt(p) && werkzeugArt(p).nach === 'basteln') return true;
  return false;
}

const KIND_RE = /(^|[^a-zäöüß])(kinder|mädchen|jungen|jungs|kleinkind(er)?|baby|babys|kids?|teenager)([^a-zäöüß]|$)|(kinder|mädchen|baby)-/i;
const SCHULE_RE = anfang('schulrucksack|schulranzen|schultasche|federmäppchen|federtasche|etui für stifte|stiftebox|stifthalter|schreibhilfe|schreiblern|radiergummi|bleistiftspitzer|anspitzer|schulheft|schulbedarf|schuleinführung|einschulung|zuckertüte|znünibox|brotdose|kindergartentasche|kindergartenrucksack|lernuhr|lerntafel|malblock');
const TIER_TECH_RE = /(^|[^a-zäöüß])(elektrisch\w*|smart\w*|intelligent\w*|automatisch\w*|gps|tracker\w*|kamera\w*|usb\w*|wiederaufladbar\w*|led|ultraschall\w*|fernbedien\w*|futterautomat\w*|trinkbrunnen|katzenbrunnen|wasserspender|bluetooth)([^a-zäöüß]|$)|app-steuerung|katzentoilette/i;
const KARTEN_RE = anfang('kartenhalter|kartenetui|kartentasche|kartenhülle|card ?holder|ausweishülle|ausweisetui|visitenkartenetui|kartenportemonnaie|kreditkartenetui|kartenbörse');
const istGeldbeutel = p => gp(p, 'Apparel & Accessories > Handbags, Wallets & Cases > Wallets', 'Apparel & Accessories > Handbags, Wallets & Cases > Badge');
const istKartenhalter = p => istGeldbeutel(p) && KARTEN_RE.test(p.title) || gp(p, 'Apparel & Accessories > Handbags, Wallets & Cases > Badge');
const istSchuh = p => gp(p, 'Apparel & Accessories > Shoes') || (p.productType || '').toLowerCase().includes('schuh');
const WANDER_RE = ende_('wanderschuh\\w*|wanderstiefel|trekking\\w*|hiking\\w*|bergschuh\\w*|bergstiefel|outdoor-?schuh\\w*|outdoor-?stiefel|wander-');
const ARBEIT_RE = ende_('arbeitsschuh\\w*|arbeitsstiefel|sicherheitsschuh\\w*|stahlkappe\\w*|schutzschuh\\w*|arbeits-');
const VR_RE = /(^|[^a-zäöüß])(vr|virtual)[- ]?(brille|headset|reality|controller|zubehör|gamepad)|vr-?brille|vr-headset|3d-?brille/i;
const SMART_BRILLE_RE = /smart(e|en)? ?brille|ar-brille|ki-brille|audio-brille|bluetooth-brille|mt5 ultra ai brille/i;
const BUERO_LAMPE_RE = ende_('schreibtischlampe|schreibtischleuchte|bürolampe|leselampe|monitor-?lichtleiste|buchlampe|klemmlampe|arbeitsplatzleuchte|desk');
const NACHT_LAMPE_RE = ende_('nachttisch\\w*|nachtlampe|bettlampe|bett-?leuchte|schlafzimmer\\w*');
const SOLAR_RE = /(^|[^a-zäöüß])solar(?!e([^a-zäöüß]|$))/i;
const BEZUG_RE = anfang('kissenbezug|kissenbezüge|kissenhülle|kissenüberzug|bezug|bezüge|hülle|überzug|ueberzug');
const WANDBILD_RE = anfang('wandbild|leinwandbild|poster|gemälde|ölgemälde|kunstdruck|wandtattoo|wandsticker|wandaufkleber|bilderrahmen|fotowand|diamantmalerei-bild|leinwand');

const BASIS_KATEGORIEN = [
  // ── Küche & Tisch ──
  { id: 'tassen', handle: 'tassen-becher', titel: 'Tassen & Becher', tag: TASSEN_TAG, min: 15, passt: p => istTasseOderBecher(p.title) },
  { id: 'geschirr', handle: 'geschirr-teller', titel: 'Geschirr & Teller', tag: 'sort-geschirr', min: 15,
    beschreibung: 'Teller, Schalen, Platten und Servierzubehör für den gedeckten Tisch — vom Alltagsgeschirr bis zum Servierteller.',
    seoBeschreibung: 'Geschirr & Teller: Speiseteller, Schalen, Platten und Servierzubehör. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: null,
    passt: p => gp(p, KD + 'Tableware > Dinnerware', KD + 'Tableware > Serveware') && !istTasseOderBecher(p.title) },
  { id: 'besteck', handle: 'besteck', titel: 'Besteck & Essstäbchen', tag: 'sort-besteck', min: 15,
    beschreibung: 'Besteck-Sets, Löffel, Gabeln, Messer und Essstäbchen — für den Alltag, die Reise und das Fest.',
    seoBeschreibung: 'Besteck & Essstäbchen: Besteck-Sets, Löffel, Gabeln und Messer. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Geschirr & Teller',
    passt: p => gp(p, KD + 'Tableware > Flatware') || ende_('besteck|besteck-set|essstäbchen|dessertlöffel|löffel-set|esslöffel').test(p.title) },
  { id: 'kochgeschirr', handle: 'toepfe-pfannen-backen', titel: 'Töpfe, Pfannen & Backen', tag: 'sort-kochgeschirr', min: 15,
    beschreibung: 'Töpfe, Pfannen, Woks, Backformen und Backbleche — Kochgeschirr und Backzubehör für die Küche.',
    seoBeschreibung: 'Töpfe, Pfannen & Backen: Kochgeschirr, Backformen und Backzubehör. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Besteck & Essstäbchen',
    passt: p => gp(p, KD + 'Cookware & Bakeware') },
  { id: 'kuechengeraete', handle: 'kuechenmaschinen-geraete', titel: 'Küchenmaschinen & Elektrogeräte', tag: 'sort-kuechengeraete', min: 15,
    beschreibung: 'Mixer, Entsafter, Reiskocher, Toaster, Grills und weitere elektrische Küchengeräte.',
    seoBeschreibung: 'Küchenmaschinen & Elektrogeräte: Mixer, Entsafter, Reiskocher, Toaster und Grills. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Töpfe, Pfannen & Backen',
    passt: p => gp(p, KD + 'Kitchen Appliances') && !gp(p, KD + 'Kitchen Appliances > Knife Sharpeners', KD + 'Kitchen Appliances > Portable Cooking Stoves') },
  { id: 'kuechenhelfer', handle: 'kuechenhelfer', titel: 'Küchenhelfer & Gadgets', tag: 'sort-kuechenhelfer', min: 15, bestehend: true,
    passt: p => gp(p, KD + 'Kitchen Tools & Utensils') && !gp(p, KD + 'Kitchen Tools & Utensils > Cutting Boards', KD + 'Kitchen Tools & Utensils > Kitchen Organizers', KD + 'Kitchen Tools & Utensils > Dish Racks', KD + 'Kitchen Tools & Utensils > Aprons') },
  { id: 'kuechenorganizer', handle: 'kuechen-organizer', titel: 'Küchen-Organizer & Abtropfgestelle', tag: 'sort-kuechenorganizer', min: 15,
    beschreibung: 'Organizer für Schrank und Arbeitsplatte, Abtropfgestelle, Gewürzregale und Ablagen — Ordnung in der Küche.',
    seoBeschreibung: 'Küchen-Organizer & Abtropfgestelle: Ablagen, Gewürzregale und Organizer für die Küche. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Küchenhelfer & Gadgets',
    passt: p => gp(p, KD + 'Kitchen Tools & Utensils > Kitchen Organizers', KD + 'Kitchen Tools & Utensils > Dish Racks') },
  { id: 'vorratsdosen', handle: 'vorratsdosen', titel: 'Vorratsdosen & Frischhaltedosen', tag: 'sort-vorratsdosen', min: 15,
    beschreibung: 'Vorratsdosen, Frischhaltedosen und Behälter für Küche und Kühlschrank.',
    seoBeschreibung: 'Vorratsdosen & Frischhaltedosen für Küche und Kühlschrank. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Küchen-Organizer & Abtropfgestelle',
    passt: p => gp(p, KD + 'Food Storage') },
  { id: 'waagen', handle: 'waagen', titel: 'Waagen', tag: 'sort-waagen', min: 15,
    beschreibung: 'Küchenwaagen, Löffelwaagen, Taschenwaagen und Personenwaagen — digital, genau, für Küche, Reise und Bad.',
    seoBeschreibung: 'Waagen: digitale Küchenwaagen, Löffelwaagen, Taschenwaagen und Personenwaagen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Vorratsdosen & Frischhaltedosen',
    passt: p => ende_('waage|waagen').test(p.title) && !/wasserwaage|libelle|waagerecht|waagrecht|mixer|badewaage-?bad/i.test(p.title) },
  { id: 'koerbe', handle: 'koerbe-behaelter', titel: 'Körbe & Behälter', tag: 'sort-koerbe', min: 15,
    beschreibung: 'Körbe, Boxen und Behälter für Wohnung, Bad und Kinderzimmer — mit Angabe der Grösse, damit sie passen.',
    seoBeschreibung: 'Körbe & Behälter: Aufbewahrungskörbe, Boxen und Behälter für Wohnung und Bad. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Aufbewahrung'], nach: null,
    passt: p => gp(p, HG + 'Household Supplies > Storage & Organization > Household Storage Containers', HG + 'Decor > Baskets') },
  { id: 'armaturen', handle: 'armaturen-duschen', titel: 'Armaturen & Duschen', tag: 'sort-armaturen', min: 15,
    beschreibung: 'Wasserhähne, Küchen- und Badarmaturen, Duschköpfe und Handbrausen sowie passendes Zubehör — für Küche und Bad.',
    seoBeschreibung: 'Armaturen & Duschen: Wasserhähne für Küche und Bad, ausziehbare Armaturen, Duschköpfe und Handbrausen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Küche & Kochen'], nach: 'Waagen',
    passt: p => ende_('armatur|armaturen|wasserhahn|mischbatterie|duschkopf|brausekopf|handbrause|küchenbrause|wasserkran|bidet-brause').test(p.title)
      && !/armaturenbrett|katze|hund|bausteine|brausetabletten|schraubenauszieher|rohrschlauch|thermometer|duschgel|spielzeug|handyhalter|auto|schutz|spritzschutz|sitzauflage/i.test(p.title) },
  { id: 'notizbuecher', handle: 'notizbuecher-journaling', titel: 'Notizbücher & Journaling', tag: 'sort-notizbuecher', min: 12,
    beschreibung: 'Notizbücher, Tagebücher, Skizzenbücher und Planer — zum Schreiben, Zeichnen und Planen, mit Zubehör fürs Journaling.',
    seoBeschreibung: 'Notizbücher & Journaling: Notizbücher, Skizzenbücher, Wochenplaner und Zubehör für Journal und Tagebuch. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Basteln & DIY'], nach: null,
    passt: p => wort('notizbuch|notizbücher|notizbuecher|tagebuch|journal|skizzenbuch|sketchbook|notizblock|wochenplan|planer').test(p.title)
      && !/notebook|laptop|rucksack|3d notizblock|3d-aufkleber|stempel/i.test(p.title) },

  // ── Wohnen ──
  { id: 'kissen', handle: 'kissen', titel: 'Kissen', tag: 'sort-kissen', min: 15,
    beschreibung: 'Zierkissen und Sofakissen — mit Schweizer Motiven, Mustern und in Uni — für Sofa, Bett und Sessel.',
    seoBeschreibung: 'Kissen: Zierkissen und Sofakissen mit Schweizer Motiven und Mustern. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Kissen & Wohntextilien'], nach: null,
    passt: p => gp(p, HG + 'Decor > Throw Pillows') && !BEZUG_RE.test(p.title) },
  { id: 'kissenbezuege', handle: 'kissenbezuege', titel: 'Kissenbezüge & Kissenhüllen', tag: 'sort-kissenbezuege', min: 15,
    beschreibung: 'Kissenbezüge und Kissenhüllen in vielen Farben, Mustern und Grössen — zum Wechseln der Dekoration, ohne neue Kissen zu kaufen.',
    seoBeschreibung: 'Kissenbezüge & Kissenhüllen: Bezüge für Sofakissen in Farben, Mustern und Grössen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Kissen & Wohntextilien'], nach: 'Kissen',
    passt: p => gp(p, HG + 'Decor > Throw Pillows') && BEZUG_RE.test(p.title) },
  { id: 'sitzkissen', handle: 'sitz-rueckenkissen', titel: 'Sitz- & Rückenkissen', tag: 'sort-sitzkissen', min: 15,
    beschreibung: 'Sitzkissen, Stuhlauflagen und Rückenkissen für Stuhl, Sofa und Auto — für bequemes Sitzen.',
    seoBeschreibung: 'Sitz- & Rückenkissen: Stuhlauflagen, Sitzkissen und Rückenkissen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Kissen & Wohntextilien'], nach: 'Kissenbezüge & Kissenhüllen',
    passt: p => gp(p, HG + 'Decor > Chair & Sofa Cushions', HG + 'Decor > Backrest Pillows') },
  { id: 'sofaueberzuege', handle: 'sofa-moebelueberzuege', titel: 'Sofa- & Möbelüberzüge', tag: 'sort-sofaueberzuege', min: 15,
    beschreibung: 'Überzüge für Sofa, Sessel und Stühle — elastisch, waschbar und in vielen Farben, damit alte Möbel wieder frisch aussehen.',
    seoBeschreibung: 'Sofa- & Möbelüberzüge: elastische Überzüge für Sofa, Sessel und Stühle. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Kissen & Wohntextilien'], nach: 'Sitz- & Rückenkissen',
    passt: p => gp(p, HG + 'Decor > Slipcovers') },
  { id: 'wandbilder', handle: 'wandbilder-poster', titel: 'Wandbilder & Poster', tag: 'sort-wandbilder', min: 15,
    beschreibung: 'Wandbilder, Poster, Leinwandbilder und Kunstdrucke — Bilder für Wohnzimmer, Schlafzimmer und Flur.',
    seoBeschreibung: 'Wandbilder & Poster: Leinwandbilder, Kunstdrucke und Poster für die Wand. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten'], nach: 'Wanddeko',
    passt: p => gp(p, HG + 'Decor > Artwork > Posters, Prints', HG + 'Decor > Home Decor Decals', HG + 'Decor > Picture Frames') || (WANDBILD_RE.test(p.title) && !gp(p, 'Apparel', 'Electronics', 'Hardware')) },
  { id: 'vasen', handle: 'vasen-blumentoepfe', titel: 'Vasen & Blumentöpfe', tag: 'sort-vasen', min: 15,
    beschreibung: 'Vasen, Blumentöpfe und Pflanzgefässe aus Keramik, Glas und Metall — für Schnittblumen, Trockenblumen und Zimmerpflanzen.',
    seoBeschreibung: 'Vasen & Blumentöpfe: Vasen aus Keramik und Glas, Blumentöpfe und Pflanzgefässe. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten'], nach: 'Dekoration',
    passt: p => gp(p, HG + 'Decor > Vases') || (ende_('vase|vasen|blumentopf|blumentöpfe|pflanztopf|übertopf|pflanzgefäss|blumenampel').test(p.title) && !gp(p, 'Apparel', 'Electronics', 'Hardware', 'Health & Beauty')) },

  // ── Beleuchtung ──
  { id: 'lampen', handle: 'tisch-nachttischlampen', titel: 'Tisch- & Stehlampen', tag: 'sort-lampen', min: 15,
    beschreibung: 'Dekorative Tischlampen, Stehleuchten und Akku-Lampen für Wohnzimmer, Regal und Kommode.',
    seoBeschreibung: 'Tisch- & Stehlampen: dekorative LED-Lampen und Stehleuchten für Wohnzimmer und Regal. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Beleuchtung'], nach: null,
    passt: p => gp(p, HG + 'Lighting > Lamps') && !BUERO_LAMPE_RE.test(p.title) && !NACHT_LAMPE_RE.test(p.title) },
  { id: 'nachttischlampen', handle: 'nachttischlampen', titel: 'Nachttischlampen', tag: 'sort-nachttischlampen', min: 10,
    beschreibung: 'Nachttischlampen und Bettlampen mit Touch-Dimmer, warmem Licht und Akku — für ruhige Abende im Schlafzimmer.',
    seoBeschreibung: 'Nachttischlampen & Bettlampen mit Touch-Dimmer und warmem Licht. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Beleuchtung'], nach: 'Tisch- & Stehlampen',
    passt: p => gp(p, HG + 'Lighting') && NACHT_LAMPE_RE.test(p.title) && !BUERO_LAMPE_RE.test(p.title) },
  { id: 'wandleuchten', handle: 'wandleuchten', titel: 'Wandleuchten', tag: 'sort-wandleuchten', min: 15,
    beschreibung: 'Wandlampen und Wandleuchten für Flur, Schlafzimmer und Wohnzimmer — mit Kabel, Akku oder Steckdose.',
    seoBeschreibung: 'Wandleuchten & Wandlampen für Flur, Schlafzimmer und Wohnzimmer. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Beleuchtung'], nach: 'Tisch- & Nachttischlampen',
    passt: p => gp(p, HG + 'Lighting > Lighting Fixtures > Wall Light Fixtures') || wort('wandlampe|wandleuchte|wandleuchten|wandlampen').test(p.title) },
  { id: 'deckenleuchten', handle: 'deckenleuchten', titel: 'Decken- & Pendelleuchten', tag: 'sort-deckenleuchten', min: 15,
    beschreibung: 'Deckenleuchten, Pendelleuchten und Kronleuchter für Wohnzimmer, Küche und Esstisch.',
    seoBeschreibung: 'Decken- & Pendelleuchten: Deckenlampen, Pendelleuchten und Kronleuchter. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Beleuchtung'], nach: 'Wandleuchten',
    passt: p => gp(p, HG + 'Lighting > Lighting Fixtures > Ceiling', HG + 'Lighting > Lighting Fixtures > Chandeliers', HG + 'Lighting > Lighting Fixtures > Cabinet') || wort('deckenlampe|deckenleuchte|pendelleuchte|hängeleuchte|kronleuchter').test(p.title) },
  { id: 'nachtlichter', handle: 'nachtlichter-ambiente', titel: 'Nachtlichter & Ambiente-Licht', tag: 'sort-nachtlichter', min: 15,
    beschreibung: 'Nachtlichter, Sternenhimmel-Projektoren und Stimmungslicht für Kinderzimmer, Schlafzimmer und Wohnzimmer.',
    seoBeschreibung: 'Nachtlichter & Ambiente-Licht: Projektoren, Stimmungslicht und Nachtlichter. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Beleuchtung'], nach: 'Decken- & Pendelleuchten',
    passt: p => gp(p, HG + 'Lighting > Night Lights & Ambient Lighting') },

  // ── Beauty & Schmuck ──
  { id: 'makeuptools', handle: 'make-up-pinsel-tools', titel: 'Make-up Pinsel & Tools', tag: 'sort-makeuptools', min: 15,
    beschreibung: 'Make-up-Pinsel, Schwämmchen, Wimpernzangen, Spitzer und Zubehör zum Auftragen von Make-up.',
    seoBeschreibung: 'Make-up Pinsel & Tools: Pinsel-Sets, Schwämmchen und Zubehör zum Schminken. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Beauty & Pflege'], nach: 'Make-up & Kosmetik',
    passt: p => gp(p, 'Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Makeup Tools') },
  { id: 'kunstnaegel', handle: 'kunstnaegel-press-on', titel: 'Kunstnägel & Press-on', tag: 'sort-kunstnaegel', min: 15,
    beschreibung: 'Press-on-Nägel und Kunstnägel zum Aufkleben — in Farben, Mustern und Längen, ohne Studio, ohne Wartezeit.',
    seoBeschreibung: 'Kunstnägel & Press-on-Nägel zum Aufkleben in vielen Farben und Mustern. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Beauty & Pflege', 'Nägel & Maniküre'], nach: null,
    passt: p => gp(p, 'Health & Beauty > Personal Care > Cosmetics > Nail Care > False Nails') },
  { id: 'haarbuersten', handle: 'haarbuersten-kaemme', titel: 'Haarbürsten & Kämme', tag: 'sort-haarbuersten', min: 15,
    beschreibung: 'Haarbürsten, Kämme und Entwirrbürsten — aus Holz, Borsten und Kunststoff, für jedes Haar.',
    seoBeschreibung: 'Haarbürsten & Kämme: Entwirrbürsten, Holzbürsten und Kämme. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Beauty & Pflege'], nach: 'Haarpflege & Styling',
    passt: p => gp(p, 'Health & Beauty > Personal Care > Hair Care > Hair Styling Tools > Combs & Brushes') || (anfang('haarbürste|holzbürste|entwirrbürste|haarkamm|massagekamm|wildschwein').test(p.title) && !gp(p, 'Home & Garden', 'Vehicles', 'Hardware > Tool Accessories')) },
  { id: 'mundpflege', handle: 'mundpflege', titel: 'Mundpflege & Zähne', tag: 'sort-mundpflege', min: 15,
    beschreibung: 'Zahnbürsten, Zahnaufheller, Mundduschen und Zubehör für gepflegte Zähne.',
    seoBeschreibung: 'Mundpflege & Zähne: Zahnbürsten, Mundduschen und Zahnpflege-Zubehör. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Beauty & Pflege'], nach: 'Hautpflege & Skincare',
    passt: p => gp(p, 'Health & Beauty > Personal Care > Oral Care') },
  { id: 'schmuckaufbewahrung', handle: 'schmuckaufbewahrung', titel: 'Schmuckaufbewahrung & Displays', tag: 'sort-schmuckaufbewahrung', min: 15,
    beschreibung: 'Schmuckkästchen, Schmuckständer, Ringhalter und Reise-Etuis — damit Ketten, Ringe und Ohrringe geordnet bleiben.',
    seoBeschreibung: 'Schmuckaufbewahrung & Displays: Schmuckkästchen, Ständer und Reise-Etuis. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Schmuck'], nach: 'Sets',
    passt: p => gp(p, 'Health & Beauty > Jewelry Cleaning & Care > Jewelry Holders') || anfang('schmuckkästchen|schmuckkasten|schmuckständer|ringhalter|schmuckbox|schmuckaufbewahrung').test(p.title) },

  // ── Basteln & DIY ──
  { id: 'naehen', handle: 'naehen-sticken-stricken', titel: 'Nähen, Sticken & Stricken', tag: 'sort-naehen', min: 15,
    beschreibung: 'Stickpackungen, Kreuzstich-Sets, Nadeln, Garne, Stoffe und Zubehör fürs Nähen, Sticken, Häkeln und Stricken.',
    seoBeschreibung: 'Nähen, Sticken & Stricken: Stickpackungen, Nadeln, Garne und Stoffe. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Basteln & DIY'], nach: null,
    passt: p => gp(p, AC + 'Arts & Crafts > Art & Craft Kits > Needlecraft Kits', AC + 'Arts & Crafts > Art & Crafting Materials > Textiles', AC + 'Arts & Crafts > Art & Crafting Materials > Crafting Fibers',
      AC + 'Arts & Crafts > Art & Crafting Tools > Needles & Hooks', AC + 'Arts & Crafts > Art & Crafting Tools > Textile Craft Machines', AC + 'Arts & Crafts > Craft Organization') },
  { id: 'harz', handle: 'harz-giessformen', titel: 'Harz & Giessformen', tag: 'sort-harz', min: 15,
    beschreibung: 'Epoxidharz, Pigmente, Silikonformen und Zubehör zum Giessen von Schmuck, Deko und Geschenken.',
    seoBeschreibung: 'Harz & Giessformen: Epoxidharz, Pigmente und Silikonformen zum Basteln von Schmuck und Deko. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Basteln & DIY'], nach: 'Nähen, Sticken & Stricken',
    passt: p => gp(p, AC + 'Arts & Crafts > Crafting Patterns & Molds') || (anfang('harz|epoxy|pigment|giessform|gussform|silikonform|silikon-form|uv-harz').test(p.title) && !gp(p, 'Apparel', 'Home & Garden > Kitchen', 'Health & Beauty')) },
  { id: 'modellbau', handle: 'modellbau', titel: 'Modellbau & Sammelfiguren', tag: 'sort-modellbau', min: 15,
    beschreibung: 'Modellbausätze, Steckmodelle und Sammelfiguren zum Bauen, Bemalen und Ausstellen.',
    seoBeschreibung: 'Modellbau & Sammelfiguren: Bausätze, Steckmodelle und Sammelfiguren. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Basteln & DIY'], nach: 'Harz & Giessformen',
    passt: p => gp(p, AC + 'Model Making', AC + 'Collectibles > Scale Models') },

  // ── Werkzeug & Maschinen ──
  { id: 'wz-hand', handle: 'handwerkzeug', titel: 'Handwerkzeug', tag: 'sort-werkzeug-hand', min: 15, bestehend: true, eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: null, passt: werk('hand') },
  { id: 'wz-elektro', handle: 'elektrowerkzeug', titel: 'Elektrowerkzeug & Löten', tag: 'sort-werkzeug-elektro', min: 15, bestehend: true, eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: 'Handwerkzeug', passt: werk('elektro') },
  { id: 'wz-mess', handle: 'messwerkzeug', titel: 'Messen & Prüfen', tag: 'sort-werkzeug-mess', min: 15, bestehend: true, eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: 'Elektrowerkzeug & Löten', passt: werk('mess') },
  { id: 'wz-zubehoer', handle: 'bohrer-saegen-zubehoer', titel: 'Bohrer, Fräser & Zubehör', tag: 'sort-werkzeug-zubehoer', min: 15, bestehend: true, eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: 'Messen & Prüfen', passt: werk('zubehoer') },
  { id: 'wz-sets', handle: 'werkzeugkoffer-sets', titel: 'Werkzeugsets & Koffer', tag: 'sort-werkzeug-sets', min: 8, bestehend: true, eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: 'Bohrer, Fräser & Zubehör', passt: werk('sets') },
  { id: 'wz-beschlaege', handle: 'sanitaer-schrauben-beschlaege', titel: 'Sanitär, Schrauben & Beschläge', tag: 'sort-werkzeug-beschlaege', min: 15,
    beschreibung: 'Schrauben, Dübel, Griffe, Schlösser, Rohrverbinder und Sanitär-Zubehör für Reparatur und Umbau.',
    seoBeschreibung: 'Sanitär, Schrauben & Beschläge: Schrauben, Griffe, Schlösser und Rohrverbinder. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: 'Werkzeugsets & Koffer', passt: werk('beschlaege') },
  { id: 'wz-fahrzeug', handle: 'fahrrad-auto-werkzeug', titel: 'Fahrrad- & Autowerkzeug', tag: 'sort-werkzeug-fahrzeug', min: 15,
    beschreibung: 'Werkzeug für Fahrrad und Auto: Kettenwerkzeug, Reifenheber, Spezialschlüssel und Reparatursets.',
    seoBeschreibung: 'Fahrrad- & Autowerkzeug: Kettenwerkzeug, Reifenheber und Spezialschlüssel. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Wohnen & Garten', 'Werkzeug & Maschinen'], nach: 'Sanitär, Schrauben & Beschläge', passt: p => istWerkzeugWelt(p) && werkzeugArt(p).art === 'fahrzeug' },

  // ── Technik ──
  { id: 'pc-komponenten', handle: 'pc-komponenten', titel: 'PC-Komponenten & Speicher', tag: 'sort-pc-komponenten', min: 15, bestehend: true,
    passt: p => gp(p, 'Electronics > Computers', 'Electronics > Electronics Accessories > Computer Components', 'Electronics > Electronics Accessories > Memory') || wort('ssd|nvme|ddr4|ddr5|mainboard|motherboard|grafikkarte|arbeitsspeicher|festplatte|festplatten|festplattengehäuse|usb-stick|speicherkarte|micro-atx|cpu-kühler').test(p.title) },


  // ── Technik: Netzwerk (die Titelregel «WLAN» holte Steckdosen, Fernbedienungen und Crimpzangen) ──
  { id: 'netzwerk', handle: 'netzwerk-router', titel: 'Netzwerk & WLAN', tag: 'sort-netzwerk', min: 15, bestehend: true,
    passt: p => gp(p, 'Electronics > Networking') || (wort('router|repeater|access point|wlan-router|lte-router|hotspot|netzwerkkabel|ethernet|lan-kabel|powerline').test(p.title) && !/steckdose|fernbedienung|crimp|zange|tester|smart|kamera|lampe|glühbirne/i.test(p.title)) },
  { id: 'konsolen', handle: 'konsolen-zubehoer', titel: 'Konsolen & Zubehör', tag: 'sort-konsolen', min: 15,
    beschreibung: 'Spielkonsolen, Handhelds und Zubehör: Ständer, Ladestationen, Hüllen, Controller-Aufsätze und Ersatzteile.',
    seoBeschreibung: 'Konsolen & Zubehör: Spielkonsolen, Handhelds, Ladestationen und Hüllen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Gaming & Gadgets'], nach: 'Retro & Handheld-Gaming',
    passt: p => gp(p, 'Electronics > Video Game Console Accessories', 'Electronics > Video Game Consoles') },
  { id: 'drucker3d', handle: '3d-drucker-zubehoer', titel: '3D-Drucker & Zubehör', tag: 'sort-3d-drucker', min: 15,
    beschreibung: '3D-Drucker, Düsen, Filament-Zubehör, Druckbetten und Ersatzteile für den Druck zu Hause.',
    seoBeschreibung: '3D-Drucker & Zubehör: Düsen, Druckbetten und Ersatzteile. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik'], nach: 'Beamer & Heimkino',
    passt: p => gp(p, 'Electronics > Print, Copy, Scan & Fax > 3D Printer') },
  { id: 'schmuck', handle: 'schmuck', titel: 'Schmuck', tag: 'sort-schmuck', min: 15,
    beschreibung: 'Halsketten, Ohrringe, Armbänder, Ringe und Schmuck-Sets — Schmuck für jeden Tag und für besondere Anlässe.',
    seoBeschreibung: 'Schmuck: Halsketten, Ohrringe, Armbänder, Ringe und Schmuck-Sets. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: [], nach: null,
    passt: p => gp(p, 'Apparel & Accessories > Jewelry') && !gp(p, 'Apparel & Accessories > Jewelry > Watches', 'Apparel & Accessories > Jewelry > Watch Accessories') },

  // ── Taschen (die Laptop-Seite zeigte Rucksäcke und Aktentaschen, weil «laptop» im Titel steht) ──
  { id: 'portemonnaies', handle: 'portemonnaies-geldboersen', titel: 'Portemonnaies & Geldbörsen', tag: 'sort-portemonnaies', min: 15,
    beschreibung: 'Portemonnaies, Geldbörsen, Münzbörsen und Clutches für Damen und Herren — aus Leder, Kunstleder und Carbon, mit RFID-Schutz oder AirTag-Fach.',
    seoBeschreibung: 'Portemonnaies & Geldbörsen für Damen und Herren aus Leder und Kunstleder. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Taschen & Rucksäcke'], nach: null,
    passt: p => istGeldbeutel(p) && !istKartenhalter(p) },
  { id: 'kartenhalter', handle: 'kartenhalter-kartenetuis', titel: 'Kartenhalter & Kartenetuis', tag: 'sort-kartenhalter', min: 15,
    beschreibung: 'Kartenhalter, Kartenetuis und Ausweishüllen — schlank, mit RFID-Schutz, magnetisch oder mit Ortungschip.',
    seoBeschreibung: 'Kartenhalter & Kartenetuis: schlanke Etuis für Kredit- und Ausweiskarten mit RFID-Schutz. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Taschen & Rucksäcke'], nach: 'Portemonnaies & Geldbörsen',
    passt: p => istKartenhalter(p) },
  { id: 'aktentaschen', handle: 'aktentaschen-messenger', titel: 'Aktentaschen & Messenger Bags', tag: 'sort-aktentaschen', min: 15,
    beschreibung: 'Aktentaschen, Laptoptaschen und Messenger Bags für Büro, Uni und Pendeln.',
    seoBeschreibung: 'Aktentaschen & Messenger Bags: Laptoptaschen für Büro, Uni und Pendeln. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Taschen & Rucksäcke'], nach: 'Laptop- & Business-Rucksäcke',
    passt: p => gp(p, 'Luggage & Bags > Briefcases', 'Luggage & Bags > Messenger Bags') },
  { id: 'kulturbeutel', handle: 'kulturbeutel-organizer', titel: 'Kulturbeutel & Packorganizer', tag: 'sort-kulturbeutel', min: 15,
    beschreibung: 'Kulturbeutel, Kosmetiktaschen, Packwürfel und Reise-Organizer — damit der Koffer geordnet bleibt.',
    seoBeschreibung: 'Kulturbeutel & Packorganizer: Kosmetiktaschen, Packwürfel und Reise-Organizer. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Taschen & Rucksäcke'], nach: 'Reisegepäck',
    passt: p => gp(p, 'Luggage & Bags > Cosmetic & Toiletry Bags', 'Luggage & Bags > Luggage Accessories') },
  { id: 'laptopzubehoer', handle: 'laptop-tablet-zubehoer', titel: 'Laptop- & Tablet-Zubehör', tag: 'sort-laptopzubehoer', min: 15, bestehend: true,
    passt: p => !gp(p, 'Luggage & Bags', 'Apparel', 'Home & Garden') && (gp(p, 'Electronics > Electronics Accessories > Computer Accessories', 'Electronics > Computers') || wort('laptop|macbook|tablet|ipad|notebook').test(p.title) && gp(p, 'Electronics')) },

  // ── Kinder & Baby (eigene Welt, getrennt von Haustieren) ──
  { id: 'baby', handle: 'baby-ausstattung', titel: 'Baby-Ausstattung & Zubehör', tag: 'sort-baby', min: 15,
    beschreibung: 'Stillkissen, Kinderwagen-Zubehör, Babybadewannen, Flaschenwärmer, Babyphones und Sicherheitszubehör — praktisch für die ersten Jahre.',
    seoBeschreibung: 'Baby-Ausstattung & Zubehör: Stillkissen, Kinderwagen-Zubehör, Badewannen und Babyphones. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Kinder & Baby'], nach: 'Baby- & Kinder-Sets',
    passt: p => gp(p, 'Baby & Toddler') },
  { id: 'bausteine', handle: 'bausteine-konstruktion', titel: 'Bausteine & Konstruktion', tag: 'sort-bausteine', min: 15,
    beschreibung: 'Bausteine, Klemmbausteine und Konstruktionsspielzeug zum Bauen, Tüfteln und Spielen — für Kinder und Sammler.',
    seoBeschreibung: 'Bausteine & Konstruktionsspielzeug: Klemmbausteine und Bausets für Kinder. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Kinder & Baby'], nach: 'Spielzeug & Plüsch',
    passt: p => gp(p, 'Toys & Games > Toys > Building Toys') },
  { id: 'puppen', handle: 'puppen-spielfiguren', titel: 'Puppen & Spielfiguren', tag: 'sort-puppen', min: 15,
    beschreibung: 'Puppen, Spielfiguren, Spielsets und Sammelfiguren für fantasievolles Spielen.',
    seoBeschreibung: 'Puppen & Spielfiguren: Puppen, Spielsets und Sammelfiguren. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Kinder & Baby'], nach: 'Bausteine & Konstruktion',
    passt: p => gp(p, 'Toys & Games > Toys > Dolls, Playsets & Toy Figures') },
  { id: 'spielfahrzeuge', handle: 'spielzeug-fahrzeuge', titel: 'Fahrzeuge & RC', tag: 'sort-spielfahrzeuge', min: 15, bestehend: true,
    passt: p => gp(p, 'Toys & Games > Toys > Play Vehicle', 'Toys & Games > Toys > Remote Control Toy', 'Toys & Games > Toys > Robotic Toys') },
  { id: 'puzzles', handle: 'puzzles-spiele', titel: 'Puzzles & Spiele', tag: 'sort-puzzles', min: 15,
    beschreibung: 'Puzzles, Holzpuzzles, Knobelspiele und Gesellschaftsspiele für Kinder und Erwachsene.',
    seoBeschreibung: 'Puzzles & Spiele: Holzpuzzles, Knobelspiele und Gesellschaftsspiele. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Kinder & Baby'], nach: 'Puppen & Spielfiguren',
    passt: p => gp(p, 'Toys & Games > Puzzles', 'Toys & Games > Games') },

  { id: 'kinder-baby', handle: 'sub-baby-kids', titel: 'Kinder & Baby', tag: 'sort-kinder-baby', min: 15, bestehend: true,
    passt: p => gp(p, 'Baby & Toddler', 'Toys & Games', 'Apparel & Accessories > Clothing > Baby') || KIND_RE.test(p.title) || ['kinderschuhe', 'kinderkostuem', 'spielzeug', 'spielzeug-ch-front'].some(t => (p.tags || []).includes(t)) },

  { id: 'schule', handle: 'schule-kindergarten', titel: 'Schule & Kindergarten', tag: 'sort-schule', min: 15,
    beschreibung: 'Schulrucksäcke, Etuis, Stifte, Schreibhilfen, Znünibox und Trinkflaschen für den Schulweg und den Kindergarten.',
    seoBeschreibung: 'Schule & Kindergarten: Schulrucksäcke, Etuis, Schreibhilfen, Znünibox und Trinkflaschen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Kinder & Baby'], nach: 'Puzzles & Spiele',
    passt: p => !gp(p, 'Hardware', 'Apparel & Accessories > Jewelry') && (SCHULE_RE.test(p.title) || (gp(p, 'Office Supplies') && KIND_RE.test(p.title))) },
  // ── Haustiere ──

  { id: 'haustier', handle: 'sub-haustier', titel: 'Haustierwelt', tag: 'sort-haustier', min: 15, bestehend: true,
    passt: p => gp(p, 'Animals & Pet Supplies') || anfang('haustier|hundebett|katzenbett|hundeleine|katzenklo|kratzbaum|hundenapf|katzennapf').test(p.title) },
  { id: 'hunde', handle: 'haustier-hunde', titel: 'Hunde', tag: 'sort-hunde', min: 15, bestehend: true,
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Dog Supplies') || (gp(p, 'Animals & Pet Supplies') && ende_('hund|hunde|hunden|welpe|welpen').test(p.title) && !/katze|katzen/i.test(p.title)) },
  { id: 'katzen', handle: 'haustier-katzen', titel: 'Katzen', tag: 'sort-katzen', min: 15, bestehend: true,
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Cat Supplies') || (gp(p, 'Animals & Pet Supplies') && ende_('katze|katzen|kater|kitten').test(p.title) && !/hund/i.test(p.title)) },
  { id: 'tier-spielzeug', handle: 'tierspielzeug', titel: 'Tierspielzeug', tag: 'sort-tier-spielzeug', min: 15, bestehend: true,
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Toys', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Toys') },
  { id: 'tier-naepfe', handle: 'tier-naepfe-fuettern', titel: 'Näpfe & Füttern', tag: 'sort-tier-naepfe', min: 15, bestehend: true,
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Pet Bowls, Feeders & Waterers', 'Animals & Pet Supplies > Pet Supplies > Pet Food Containers') },
  { id: 'tier-pflege', handle: 'tier-pflege-unterwegs', titel: 'Pflege & Unterwegs', tag: 'sort-tier-pflege', min: 15, bestehend: true,
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Pet Carriers & Crates', 'Animals & Pet Supplies > Pet Supplies > Pet Grooming Supplies', 'Animals & Pet Supplies > Pet Supplies > Pet Oral Care Supplies', 'Animals & Pet Supplies > Pet Supplies > Pet Waste Disposal', 'Animals & Pet Supplies > Pet Supplies > Pet Medical') },
  { id: 'tier-betten', handle: 'tierbetten-kratzbaeume', titel: 'Betten, Kratzbäume & Möbel', tag: 'sort-tier-betten', min: 15,
    beschreibung: 'Hundebetten, Katzenbetten, Kratzbäume und Tiermöbel — gemütliche Plätze zum Schlafen, Klettern und Kratzen.',
    seoBeschreibung: 'Betten, Kratzbäume & Möbel für Hunde und Katzen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Haustiere'], nach: 'Hunde- & Katzenkleidung',
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Beds', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Beds', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Furniture') },
  { id: 'tier-aquarium', handle: 'aquarium-fische', titel: 'Aquarium & Fische', tag: 'sort-tier-aquarium', min: 15,
    beschreibung: 'Aquarien, Filter, Dekoration und Zubehör für Fische und Zierfische.',
    seoBeschreibung: 'Aquarium & Fische: Aquarien, Filter und Dekoration. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Haustiere'], nach: 'Betten, Kratzbäume & Möbel',
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Fish Supplies') },

  { id: 'tier-technik', handle: 'haustier-tech', titel: 'Smarte Geräte & Technik', tag: 'sort-tier-technik', min: 15, bestehend: true,
    eltern: ['Haustiere'], nach: 'Tierspielzeug',
    passt: p => gp(p, 'Animals & Pet Supplies') && TIER_TECH_RE.test(p.title) && !/(^|[^a-zäöüß])(leine|rückzugsleine|schleppleine)([^a-zäöüß]|$)|saugnapf-futterspender|futterspender-spielzeug|gegen stress/i.test(p.title) },
  { id: 'tier-leinen', handle: 'leinen-halsbaender-geschirre', titel: 'Leinen, Halsbänder & Geschirre', tag: 'sort-tier-leinen', min: 15,
    beschreibung: 'Hundeleinen, Halsbänder und Geschirre — stossdämpfend, reflektierend, verstellbar, für kleine und grosse Hunde und für Katzen.',
    seoBeschreibung: 'Leinen, Halsbänder & Geschirre für Hunde und Katzen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Haustiere'], nach: 'Katzen',
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Pet Leashes', 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses') },
  { id: 'tier-kleidung', handle: 'hunde-katzen-kleidung', titel: 'Hunde- & Katzenkleidung', tag: 'sort-tier-kleidung', min: 15,
    beschreibung: 'Mäntel, Pullover, Regenjacken und Kostüme für Hunde und Katzen — warm, wasserdicht oder zum Feiern.',
    seoBeschreibung: 'Hunde- & Katzenkleidung: Mäntel, Pullover, Regenjacken und Kostüme. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Haustiere'], nach: 'Leinen, Halsbänder & Geschirre',
    passt: p => gp(p, 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Apparel', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Apparel') },


  // ── Schmuck: die bestehenden Unterseiten waren zu 90–99 % sauber, aber 5–10 % fremd und 7 % fehlten ──
  { id: 'ketten', handle: 'sub-halsketten', titel: 'Halsketten', tag: 'sort-halsketten', min: 15, bestehend: true, passt: p => gp(p, 'Apparel & Accessories > Jewelry > Necklaces', 'Apparel & Accessories > Jewelry > Charms & Pendants') },
  { id: 'ohrringe', handle: 'sub-ohrringe', titel: 'Ohrringe', tag: 'sort-ohrringe', min: 15, bestehend: true, passt: p => gp(p, 'Apparel & Accessories > Jewelry > Earrings') },
  { id: 'armbaender', handle: 'sub-armbaender', titel: 'Armbänder', tag: 'sort-armbaender', min: 15, bestehend: true, passt: p => gp(p, 'Apparel & Accessories > Jewelry > Bracelets') },
  { id: 'ringe', handle: 'sub-ringe', titel: 'Ringe', tag: 'sort-ringe', min: 15, bestehend: true, passt: p => gp(p, 'Apparel & Accessories > Jewelry > Rings') },
  { id: 'schmucksets', handle: 'schmuck-sets', titel: 'Sets', tag: 'sort-schmucksets', min: 15, bestehend: true, passt: p => gp(p, 'Apparel & Accessories > Jewelry > Jewelry Sets') },
  { id: 'broschen', handle: 'broschen-pins', titel: 'Broschen & Pins', tag: 'sort-broschen', min: 15,
    beschreibung: 'Broschen, Anstecknadeln und Revers-Pins aus Metall, Emaille und Strass — für Mantel, Blazer, Hut und Tasche.',
    seoBeschreibung: 'Broschen & Pins: Anstecknadeln und Revers-Pins aus Metall und Emaille. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Schmuck'], nach: 'Ringe', passt: p => gp(p, 'Apparel & Accessories > Jewelry > Brooches') },
  { id: 'koerperschmuck', handle: 'koerper-fussschmuck', titel: 'Körper- & Fussschmuck', tag: 'sort-koerperschmuck', min: 15,
    beschreibung: 'Fussketten, Taillenketten und Körperschmuck für Strand, Sommer und Festival.',
    seoBeschreibung: 'Körper- & Fussschmuck: Fussketten, Taillenketten und Körperschmuck. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Schmuck'], nach: 'Broschen & Pins', passt: p => gp(p, 'Apparel & Accessories > Jewelry > Anklets', 'Apparel & Accessories > Jewelry > Body Jewelry') },
  { id: 'uhrenarmbaender', handle: 'uhrenarmbaender', titel: 'Uhrenarmbänder & Smartwatch-Armbänder', tag: 'sort-uhrenarmbaender', min: 15, bestehend: true, passt: p => gp(p, 'Apparel & Accessories > Jewelry > Watch Accessories') },


  // ── Schuhe: die Google-Kategorie ist bei allen 6199 Schuhen nur «Shoes» → der Titel entscheidet ──
  { id: 'wanderschuhe', handle: 'wanderschuhe-trekking', titel: 'Wanderschuhe & Trekking', tag: 'sort-wanderschuhe', min: 15,
    beschreibung: 'Wanderschuhe, Trekkingstiefel und Outdoor-Schuhe mit griffiger Sohle — für Wege, Berge und nasse Wiesen.',
    seoBeschreibung: 'Wanderschuhe & Trekkingstiefel: Outdoor-Schuhe mit rutschfester Sohle für Damen und Herren. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Schuhe'], nach: 'Winterschuhe & Winterstiefel',
    passt: p => istSchuh(p) && WANDER_RE.test(p.title) && !ARBEIT_RE.test(p.title) },
  { id: 'arbeitsschuhe', handle: 'arbeitsschuhe', titel: 'Arbeits- & Sicherheitsschuhe', tag: 'sort-arbeitsschuhe', min: 15,
    beschreibung: 'Arbeitsschuhe, Sicherheitsschuhe mit Stahlkappe und Arbeitsstiefel — rutschfest, robust und für lange Tage auf den Beinen.',
    seoBeschreibung: 'Arbeits- & Sicherheitsschuhe: Arbeitsstiefel mit Stahlkappe, rutschfest und robust. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Schuhe'], nach: 'Wanderschuhe & Trekking',
    passt: p => istSchuh(p) && ARBEIT_RE.test(p.title) },


  { id: 'vr', handle: 'vr-brillen-headsets', titel: 'VR-Brillen & Headsets', tag: 'sort-vr', min: 10,
    beschreibung: 'VR-Brillen für das Smartphone, Standalone-VR-Headsets und Controller für Virtual Reality — zum Spielen, Filme schauen und Ausprobieren.',
    seoBeschreibung: 'VR-Brillen & Headsets: Virtual Reality für Smartphone und Standalone, mit Controller. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik'], nach: 'Beamer & Heimkino',
    passt: p => !gp(p, 'Apparel') && VR_RE.test(p.title) },
  { id: 'smartebrillen', handle: 'smarte-brillen-ki', titel: 'Smarte Brillen & KI-Gadgets', tag: 'sort-smartebrillen', min: 10,
    beschreibung: 'Smarte Brillen mit Kamera, Audio-Brillen und KI-Brillen — Technik, die man trägt.',
    seoBeschreibung: 'Smarte Brillen & KI-Gadgets: Brillen mit Kamera, Audio und KI-Assistent. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik'], nach: 'VR-Brillen & Headsets',
    passt: p => !VR_RE.test(p.title) && (gp(p, 'Electronics > Computers > Smart Glasses') || SMART_BRILLE_RE.test(p.title)) },


  // ── Büro & Home Office ──
  { id: 'buero', handle: 'buro-home-office', titel: 'Büro & Home Office', tag: 'sort-buero', min: 15, bestehend: true,
    passt: p => gp(p, 'Office Supplies', 'Furniture > Office Furniture', 'Electronics > Print, Copy, Scan & Fax > Printers', 'Electronics > Print, Copy, Scan & Fax > Scanners', 'Electronics > Print, Copy, Scan & Fax > Printer, Copier') || (BUERO_LAMPE_RE.test(p.title) && gp(p, HG + 'Lighting')) },
  { id: 'buero-organizer', handle: 'buero-organizer-ablage', titel: 'Büro-Organizer & Ablage', tag: 'sort-buero-organizer', min: 15,
    beschreibung: 'Schreibtisch-Organizer, Stiftehalter, Etuis und Ablagen — Ordnung auf dem Schreibtisch.',
    seoBeschreibung: 'Büro-Organizer & Ablage: Schreibtisch-Organizer, Stiftehalter und Etuis. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik', 'Büro & Home Office'], nach: null,
    passt: p => gp(p, 'Office Supplies > Filing & Organization') && !gp(p, 'Office Supplies > Filing & Organization > Calendars') },
  { id: 'kalender', handle: 'kalender-planer', titel: 'Kalender & Planer', tag: 'sort-kalender', min: 15,
    beschreibung: 'Tischkalender, Wandkalender, Wochenplaner und Organizer für Büro, Küche und Schreibtisch.',
    seoBeschreibung: 'Kalender & Planer: Tischkalender, Wandkalender und Wochenplaner. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik', 'Büro & Home Office'], nach: 'Büro-Organizer & Ablage',
    passt: p => gp(p, 'Office Supplies > Filing & Organization > Calendars') },
  { id: 'schreibwaren', handle: 'schreibwaren-stifte', titel: 'Schreibwaren & Stifte', tag: 'sort-schreibwaren', min: 15,
    beschreibung: 'Stifte, Marker, Notizblöcke, Haftnotizen, Büroklammern und Zubehör zum Schreiben und Zeichnen.',
    seoBeschreibung: 'Schreibwaren & Stifte: Stifte, Marker, Notizblöcke und Büroklammern. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik', 'Büro & Home Office'], nach: 'Kalender & Planer',
    passt: p => gp(p, 'Office Supplies > Office Instruments', 'Office Supplies > General Office Supplies', 'Office Supplies > Book Accessories', 'Office Supplies > Presentation Supplies') },
  { id: 'bueroelektronik', handle: 'bueroelektronik', titel: 'Büroelektronik', tag: 'sort-bueroelektronik', min: 15,
    beschreibung: 'Taschenrechner, Übersetzer, Etikettendrucker, Drucker, Scanner, Aktenvernichter und Webcams für Büro und Home Office.',
    seoBeschreibung: 'Büroelektronik: Taschenrechner, Übersetzer, Etikettendrucker, Scanner und Webcams. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik', 'Büro & Home Office'], nach: 'Schreibwaren & Stifte',
    passt: p => gp(p, 'Office Supplies > Office Equipment', 'Electronics > Print, Copy, Scan & Fax > Printers', 'Electronics > Print, Copy, Scan & Fax > Scanners', 'Electronics > Print, Copy, Scan & Fax > Printer, Copier', 'Cameras & Optics > Cameras > Webcams') },
  { id: 'schreibtischlampen', handle: 'schreibtischlampen', titel: 'Schreibtisch- & Leselampen', tag: 'sort-schreibtischlampen', min: 10,
    beschreibung: 'Schreibtischlampen, Leselampen und Monitor-Lichtleisten — blendfrei, dimmbar und mit Akku für Büro und Studium.',
    seoBeschreibung: 'Schreibtisch- & Leselampen: dimmbare LED-Lampen und Monitor-Lichtleisten. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik', 'Büro & Home Office'], nach: 'Büroelektronik',
    passt: p => BUERO_LAMPE_RE.test(p.title) && gp(p, HG + 'Lighting') },

  { id: 'klima', handle: 'luftreiniger-klimageraete', titel: 'Luftreiniger & Klimageräte', tag: 'sort-klima', min: 15, bestehend: true,
    eltern: ['Wohnen & Garten'], nach: 'Haushaltsgeräte',
    passt: p => gp(p, 'Home & Garden > Household Appliances > Climate Control Appliances > Air Purifiers', 'Home & Garden > Household Appliances > Climate Control Appliances > Space Heaters', 'Home & Garden > Household Appliances > Climate Control Appliances > Dehumidifiers', 'Home & Garden > Household Appliances > Climate Control Appliances > Air Conditioners') || (ende_('luftreiniger|luftreinigung|ionisator').test(p.title) && gp(p, 'Home & Garden', 'Vehicles & Parts', 'Electronics')) },

  { id: 'mauspads', handle: 'mauspads-unterlagen', titel: 'Mauspads & Schreibtischunterlagen', tag: 'sort-mauspads', min: 15,
    beschreibung: 'Mauspads, Gaming-Unterlagen und Schreibtischmatten in vielen Motiven und Grössen — mit Handgelenkauflage, Ladefunktion oder Heizung.',
    seoBeschreibung: 'Mauspads & Schreibtischunterlagen: Gaming-Pads in vielen Motiven und Grössen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik', 'PC & Homeoffice'], nach: 'Tastaturen & Mäuse',
    passt: p => gp(p, 'Electronics > Electronics Accessories > Computer Accessories > Mouse Pads') || (ende_('mauspad|mousepad|mouse pad|schreibtischunterlage|handgelenkauflage').test(p.title) && gp(p, 'Electronics', 'Office Supplies', 'Home & Garden')) },

  { id: 'solar', handle: 'solar-energie', titel: 'Solar & Outdoor-Energie', tag: 'sort-solar', min: 15,
    beschreibung: 'Solar-Powerbanks, faltbare Solarpanels, Solar-Lichterketten, Gartenleuchten, Notfallradios mit Kurbel und weitere Geräte mit Sonnenenergie — Strom ohne Steckdose.',
    seoBeschreibung: 'Solar & Outdoor-Energie: Solar-Powerbanks, Solarpanels, Solar-Lichterketten und Notfallradios. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: ['Elektronik'], nach: 'Ladegeräte & Powerbanks',
    passt: p => SOLAR_RE.test(p.title) },

  // ── Stil ──
  { id: 'retro', handle: 'retro-vintage', titel: 'Retro & Vintage', tag: 'sort-retro', min: 15,
    beschreibung: 'Retro und Vintage: Kleider, Schuhe, Taschen, Schmuck, Uhren und Deko im Stil vergangener Jahrzehnte.',
    seoBeschreibung: 'Retro & Vintage: Mode, Taschen, Schmuck, Uhren und Deko im Stil vergangener Jahrzehnte. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.',
    eltern: [], nach: null,
    passt: p => wort('retro|vintage').test(p.title) },
];
/** Basis + die auf Tags umgestellten, verengten Alt-Collections (Daten: kategorien_verengt_daten.json). */
export const KATEGORIEN = [...BASIS_KATEGORIEN, ...VERENGT];

/**
 * Tag-Bereinigungen: entfernen/setzen unabhängig von einer Collection. Jede Regel hat einen Grund (gemessen) und eine Gegenprobe im Test.
 * `wenn` bekommt das Produkt; `entfernt`/`setzt` sind Tag-Listen.
 */
export const BEREINIGUNG = [
  { id: 'werkzeug-fremd', grund: 'Der Tag «werkzeug» hängt an Harzfarbe, Bürsten, Pantoffeln, Nagelfräsern — die Seite «Werkzeug & Maschinen» war ein Sammelbecken.',
    wenn: p => (p.tags || []).includes('werkzeug') && werkzeugArt(p).art === 'fremd', entfernt: p => ['werkzeug', 'heimwerken'],
    setzt: p => ({ basteln: ['basteln'], beauty: ['beauty'], deko: [], haushalt: [], kleidung: [], waffe: [] })[werkzeugArt(p).nach] || [] },
  { id: 'basteln-fremd', grund: '«basteln» hängt an Wandbildern, Bettwäsche, Vasen, Schals (282 von 1100) und fehlt an 524 echten Bastel-Artikeln; Sticker haben eine eigene Kategorie.',
    wenn: p => (p.tags || []).includes('basteln') && !istBastelWare(p), entfernt: () => ['basteln'], setzt: () => [] },
  { id: 'basteln-fehlt', grund: 'Echte Bastel-Ware ohne den Tag «basteln» steht nicht in «Basteln & DIY».',
    wenn: p => !(p.tags || []).includes('basteln') && istBastelWare(p), entfernt: () => [], setzt: () => ['basteln'] },
  { id: 'geschenk-eignung', grund: '«Geschenke für Ihn» zeigte eine Camping-Luftmatratze und eine Hecktasche; die vier Geschenk-Sammlungen (je 400, vom Tag geschenkwelt-*) enthielten Küchenmaschinen, Gartengeräte, Fitnessgeräte.',
    wenn: p => GESCHENK_TAGS.some(t => (p.tags || []).includes(t)) && istGeschenkUngeeignet(p), entfernt: p => GESCHENK_TAGS.filter(t => (p.tags || []).includes(t)), setzt: () => [] },
  { id: 'deko-vasen', grund: 'Vasen & Deko trennen: Vasen verlassen «Dekoration» (Tag kat-deko).',
    wenn: p => (p.tags || []).includes('kat-deko') && KATEGORIEN.find(k => k.id === 'vasen').passt(p), entfernt: () => ['kat-deko'], setzt: () => [] },
];

/** Geschenk-Sammlungen: Ware, die als Geschenk nicht taugt (Luftmatratze, Küchenmaschine, Gartengerät, Fitnessgerät). */
export const GESCHENK_TAGS = ['geschenkwelt-ihn', 'geschenkwelt-sie', 'geschenkwelt-kinder', 'geschenkwelt-alle'];
const GESCHENK_NEIN_G = ['Sporting Goods > Outdoor Recreation > Camping', 'Sporting Goods > Exercise & Fitness', 'Vehicles & Parts', 'Hardware', 'Business & Industrial',
  KD + 'Kitchen Appliances', KD + 'Kitchen Appliance Accessories', KD + 'Cookware & Bakeware', KD + 'Kitchen Tools & Utensils', KD + 'Food & Beverage Carriers',
  HG + 'Household Supplies', HG + 'Lawn & Garden', HG + 'Household Appliances', HG + 'Plumbing', 'Animals & Pet Supplies'];
export const istGeschenkUngeeignet = p => gp(p, ...GESCHENK_NEIN_G) || /(^|[^a-zäöüß])(camping|zelt|schlafsack|airbett|isomatte|ersatzteil|hecktasche)/i.test(p.title || '');

/** Wer als nicht zu bewerben markiert ist (Erwachsene, Tabak, Waffen, kein CH-Stecker …), wird in KEINE Themenkategorie einsortiert:
 *  eine «Muskelmann»-Lampe mit Tag adult-nicht-bewerben stand sonst im Büro-Bereich (User-Seite, 25.10.). Über die Suche bleibt das Produkt erreichbar. */
export const SPERR_TAGS = ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch'];
export const istGesperrt = p => (p.tags || []).some(t => SPERR_TAGS.includes(t));

/** @returns {boolean} gehört das Produkt (Objekt oder nur Titel-String) in die Kategorie? */
export function gehoertIn(kat, p) {
  const prod = typeof p === 'string' ? { title: p, g: '', tags: [] } : p;
  if (istGesperrt(prod)) return false;
  if (kat.passt) return !!kat.passt(prod);
  if (!kat.einschluss.test(prod.title || '')) return false;
  return !(kat.ausschluss && kat.ausschluss.test(prod.title || ''));
}

/** Bestehende, gut passende Collections, die nur im Menü fehlen (nichts an Tags/Regeln ändern). Wird eingefügt, wenn live HTTP 200 und noch nicht verlinkt. */
export const MENUE_NUR = [
  { handle: 'schreibtischlampen', titel: 'Schreibtisch- & Leselampen', eltern: ['Wohnen & Garten', 'Beleuchtung'], nach: 'Nachttischlampen', doppelt: true },
  { handle: 'rucksaecke-laptop', titel: 'Laptop- & Business-Rucksäcke', eltern: ['Elektronik', 'Büro & Home Office'], nach: 'Büroelektronik', doppelt: true },
  { handle: 'aktentaschen-messenger', titel: 'Aktentaschen & Messenger Bags', eltern: ['Elektronik', 'Büro & Home Office'], nach: 'Laptop- & Business-Rucksäcke', doppelt: true },
  { handle: 'sticker-aufkleber', titel: 'Sticker & Aufkleber', eltern: ['Wohnen & Garten'], nach: 'Basteln & DIY' },
  { handle: 'rucksaecke', titel: 'Rucksäcke', eltern: ['Taschen & Rucksäcke'], nach: null },
  { handle: 'rucksaecke-laptop', titel: 'Laptop- & Business-Rucksäcke', eltern: ['Taschen & Rucksäcke'], nach: 'Rucksäcke' },
  { handle: 'rucksaecke-sport', titel: 'Sport- & Wanderrucksäcke', eltern: ['Taschen & Rucksäcke'], nach: 'Aktentaschen & Messenger Bags' },
  { handle: 'rucksaecke-schule', titel: 'Schulrucksäcke', eltern: ['Taschen & Rucksäcke'], nach: 'Sport- & Wanderrucksäcke' },
  { handle: 'handtaschen-umhaengetaschen', titel: 'Handtaschen & Umhängetaschen', eltern: ['Taschen & Rucksäcke'], nach: 'Schulrucksäcke' },
  { handle: 'reisegepaeck', titel: 'Reisegepäck', eltern: ['Taschen & Rucksäcke'], nach: 'Geldbörsen & Etuis' },
  { handle: 'bauchtaschen', titel: 'Bauchtaschen & Gürteltaschen', eltern: ['Taschen & Rucksäcke'], nach: 'Handtaschen & Umhängetaschen' },
];
