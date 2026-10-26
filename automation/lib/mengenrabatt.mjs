/**
 * Mengenrabatt für passende Produkte: reine Regeln (ohne Netz), damit jede Zahl ein Test hat.
 *
 * WARUM NUR EIN TEIL DER PRODUKTE (gemessen 26.10.2026, Bulk-Abfrage aller 56 620 aktiven Produkte, 505 971 Varianten, 99,9 % mit Kosten):
 * die Marge (Preis − Kosten) / Preis liegt bei 57 % der Produkte nur zwischen 19 und 23 % (Preisregel «Kosten × 1,25»). Dort frisst schon
 * ein Rabatt von 5 % den Gewinn. Rund 13 300 Produkte haben 40 % und mehr; nur sie tragen einen Mengenrabatt.
 *
 * Zwei Stufen, beide über Tags und Sammlungen (ein automatischer Rabatt je Schritt, nie je Produkt):
 *   A  Marge ab 45 %:  ab 2 Stück −5 %, ab 3 Stück −10 %
 *   B  Marge ab 37 %:  ab 3 Stück −5 %
 * Sicherheitsnetz (`sicherheitspruefung`): nach dem tiefsten Rabatt bleibt mindestens 30 % Marge (A: 38,9 %, B: 33,7 %), und der tiefste Rabatt
 * ist höchstens 10 %: der Warenkorb von CHF 50 fällt dann nie unter CHF 45, die Schwelle für kostenlosen Versand (Lieferprofil «Allgemeines Profil»:
 * TOTAL_PRICE ab 45 nach Rabatt; das Versprechen auf der Seite ist «gratis ab CHF 50»; 50 × 0,9 = 45).
 *
 * Die Kosten sind die im Shop gepflegten Kosten je Variante (`inventoryItem.unitCost`). Unbekannte Kosten = nicht geeignet (nie raten).
 */
import { SPERR_TAGS } from './kategorien.mjs';

export const STUFEN = {
  a: { tag: 'mengenrabatt-a', margeMin: 0.45, schritte: [{ ab: 2, prozent: 5 }, { ab: 3, prozent: 10 }] },
  b: { tag: 'mengenrabatt-b', margeMin: 0.37, schritte: [{ ab: 3, prozent: 5 }] },
};
export const MARGE_ZIEL_MIN = 0.30;
export const PREIS_MIN = 3;
export const PREIS_MAX = 60;
export const VERSAND_VERSPRECHEN = 50;
export const VERSAND_SCHWELLE_EFFEKTIV = 45;
/** Gleitkomma-Toleranz an den Grenzen: (20−11)/20 soll genau 45 % sein, nicht 44,999…. */
const EPS = 1e-9;
export const RABATT_TAGS = Object.values(STUFEN).map(s => s.tag);
/** Alle von diesem Werkzeug angelegten Rabatte tragen diesen Titelanfang; fremde («Mengenrabatt — 10% ab 3 Artikeln», «Bundle: …») nie anfassen. */
export const RABATT_TITEL_PREFIX = 'Mengenrabatt:';

/** Wer so markiert ist (Erwachsene, Waffen, kein CH-Stecker, Kostüm-Lizenzware …), bekommt nie einen Rabatt-Tag. */
export const AUSSCHLUSS_TAGS = [...SPERR_TAGS, 'google-gesperrt-adult', 'lizenz-nicht-bewerben', 'fortura', 'kostuem',
  // offene Prüf-/Sperr-Tags des Katalogs (GEMESSEN 26.10.: 35 der 7 846 geplanten Produkte tragen einen davon); sie stehen bewusst NICHT in kategorien.SPERR_TAGS (kategorien_test.mjs:200 prüft, dass waffe-pruefen dort nicht sperrt)
  'stecker-unklar', 'marken-pruefen', 'waffe-pruefen', 'versand-pruefen', 'nicht-google-bewerben', 'google-policy-flag', 'google-policy-waffen', 'medizinprodukt-pruefen', 'heilversprechen-risiko',
  'google-kanal-markenware-unklar', 'lieferumfang-unklar', 'preis-pruefen-cj-spanne', 'niedrig-bewertet-nicht-bewerben', 'cj-nicht-versendbar-ch', 'cj-ausgelistet', 'us-netzteil-110v', 'social-pause-halloween', 'bild-zu-klein'];
/** Eigene Katalog-Tags für Technik: Haustier-Technik (GPS-, LED-Halsbänder, Futterautomaten, Smart-Bälle), Smart Rings, Küchen-/Haushaltsgeräte. */
export const TECHNIK_TAGS = ['sort-tier-technik', 'sort-smart-home-gadgets', 'sort-haushaltsgeraete', 'sort-kuechengeraete'];

/** Produktfamilien, bei denen zwei oder drei Stück im Warenkorb üblich sind (Google-Kategorie-Präfix). */
export const FAMILIEN = [
  'Apparel & Accessories > Jewelry', 'Apparel & Accessories > Clothing Accessories', 'Health & Beauty > Personal Care', 'Health & Beauty > Jewelry Cleaning & Care',
  'Animals & Pet Supplies > Pet Supplies', 'Electronics > Electronics Accessories', 'Arts & Entertainment > Hobbies & Creative Arts', 'Arts & Entertainment > Party & Celebration',
  'Home & Garden > Kitchen & Dining', 'Home & Garden > Household Supplies', 'Home & Garden > Decor', 'Home & Garden > Linens & Bedding', 'Home & Garden > Bathroom Accessories',
  'Toys & Games', 'Hardware > Tool Accessories', 'Hardware > Building Consumables',
];
/** Innerhalb der Familien nie: Uhren (ein Stück), Geräte, Möbel, Grosses. Lange, unverwechselbare Wörter ohne Wortgrenze (fangen auch Zusammensetzungen). */
export const AUSSCHLUSS_G = ['Apparel & Accessories > Jewelry > Watches'];
/**
 * Geräte, Akku-/Netzware, Medizin- und Lizenzklassen, in denen niemand zwei Stück braucht oder die ein Rabatt nicht bewerben soll (Google-Kategorie-Präfix).
 * GEMESSEN 26.10.2026 an den 7 846 geplanten Produkten: 955 Treffer (Power 237, Eingabegeräte 147, Bausätze 95, Beauty-Geräte 70, Haarstyling 104 …).
 */
const EEA = 'Electronics > Electronics Accessories > ', PC = 'Health & Beauty > Personal Care > ';
export const GERAET_G = [
  EEA + 'Power', EEA + 'Computer Components > Input Devices', EEA + 'Computer Components > Storage Devices > Hard Drive', EEA + 'Computer Components > Storage Devices > Optical',
  EEA + 'Computer Components > USB & FireWire Hubs', EEA + 'Computer Components > I/O Cards', EEA + 'Remote Controls', EEA + 'Adapters', EEA + 'Computer Accessories', EEA + 'Memory > RAM',
  EEA + 'Signal Boosters', EEA + 'Audio & Video',
  PC + 'Hair Care > Hair Styling Tools > Hair Straighteners', PC + 'Hair Care > Hair Styling Tools > Curling Irons', PC + 'Hair Care > Hair Styling Tools > Hair Styling Tool Sets', PC + 'Hair Care > Hair Styling Tools > Hair Dryers',
  PC + 'Cosmetics > Cosmetic Tools > Skin Care Tools', PC + 'Cosmetics > Cosmetic Tools > Nail Tools > Nail Dryers', PC + 'Cosmetics > Cosmetic Tools > Nail Tools > Nail Drills',
  PC + 'Shaving & Grooming > Hair Clippers & Trimmers', PC + 'Shaving & Grooming > Hair Removal', PC + 'Massage & Relaxation > Massagers',
  PC + 'Vision Care > Eyeglasses', PC + 'Ear Care > Ear Wax', PC + 'Foot Care > Bunion', PC + 'Sleeping Aids > Snoring', PC + 'Sleeping Aids > White Noise',
  PC + 'Oral Care > Teeth Whiteners', PC + 'Oral Care > Toothbrushes', PC + 'Oral Care > Dental Water Jets', PC + 'Oral Care > Denture', PC + 'Oral Care > Toothbrush Accessories', PC + 'Feminine Sanitary',
  'Home & Garden > Kitchen & Dining > Kitchen Appliances', 'Home & Garden > Decor > Clocks', 'Home & Garden > Household Supplies > Pest Control',
  'Toys & Games > Toys > Remote Control Toys', 'Toys & Games > Toys > Remote Control Toy Accessories', 'Toys & Games > Toys > Robotic Toys', 'Toys & Games > Toys > Flying Toys', 'Toys & Games > Toys > Building Toys',
  'Animals & Pet Supplies > Pet Supplies > Pet Medical', 'Animals & Pet Supplies > Pet Supplies > Pet Vitamins', 'Animals & Pet Supplies > Pet Supplies > Pet Carriers',
  'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Furniture', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Litter Boxes',
  'Apparel & Accessories > Clothing Accessories > Maternity', 'Hardware > Building Consumables > Chemicals', 'Hardware > Building Consumables > Solvents', 'Hardware > Building Consumables > Lubricants',
  'Hardware > Building Consumables > Solder', 'Hardware > Tool Accessories > Power Tool Batteries',
];
/** Ausnahme: Gua-Sha-/Jade-Roller sind kein Gerät. */
export const GERAET_G_AUSNAHME = [PC + 'Cosmetics > Cosmetic Tools > Skin Care Tools > Skin Care Rollers'];
/** Genau diese Kategorie (ohne Unterebene) sind Geräte (Mini-Drehschleuder, Haarstyling-Gerät …); Kämme/Wickler liegen eine Ebene tiefer. */
export const GERAET_G_EXAKT = [PC + 'Hair Care > Hair Styling Tools'];
/** Nachfang im Titel für Geräte ausserhalb dieser Kategorien (Wortanfang, damit «Satin-Lockenwickler» und «Kissenbezug» nicht treffen). Sticker-Titel werden nicht geprüft. */
export const AUSSCHLUSS_TITEL_2 = /(^|[^a-zäöüß])(lockenstab|lockenstäbe|glätteisen|haarglätter|glättbürste|glättkamm|glättungs-?kamm|haarstyler|haarstyling-gerät|haarschneider|bartschneider|trimmer|rasierer|epilierer|bedampfer|entsafter|toaster|reiskocher|gaskocher|fritür|powerbank|power bank|netzteil|ladestation(?!-kabel)|ladegerät|lade-?dock|lade-?pad|lade-?mauspad|wireless[- ]charger|schnelllader|rapid-lader|gamepad|game-? ?controller|gaming-controller|joystick|gaming-maus|fernbedienung|drohne|quadcopter|uav|ferngesteuert\w*|akku\w*|lithium-\w+|diffusor|diffuser|massagegerät|nagellampe|lichthärt\w+|beauty-gerät|schönheitsgerät|wecker|duftspender|blutstill\w*|uvc|desinfektions\w*|sterilisations\w*|gps|ortungs?\w*|tierortung\w*|tracker|futterautomat\w*|trinkbrunnen|wasserautomat\w*|ladefunktion|(wieder)?aufladbar\w*|usb-?(ladung|lade\w*|aufladbar)|elektro(?!platt|stat|schrauber|fahrzeug)\w*|elektronisch\w*|smart[- ]ring|smart[- ]bracelet|sport-smartwatch|lutschhemm\w*|halskrause|leckschutz|schutzkragen|(?:[1-9][0-9])er[- ]?pack|[a-zäöüß-]*gerät(?!e))|(?<!für )luftbefeuchter/i;
/** Markenware, die nur im Titel steht (belegt am 26.10. in A/B): Kosmetik «Better Than Sex», WRC-Modellauto, Nintendo-Tastenkappe, Dyson-Aufsatz, Suunto-Kabel. */
export const MARKE_TITEL = /better than sex|animal crossing|ford fiesta|(^|[^a-zäöüß])(dyson|suunto)([^a-zäöüß]|$)/i;
export const AUSSCHLUSS_TITEL = new RegExp([
  'kratzbaum', 'aquarium', 'transportbox', 'hundehütte', 'hundehuette', 'staubsauger', 'haartrockner', 'luftreiniger', 'massagepistole', 'massagegerät', 'smartwatch', 'armbanduhr',
  'ladegerät', 'ladegeraet', 'kamera', 'lautsprecher', 'drohne', 'kühlschrank', 'fritteuse', 'ventilator', 'matratze', 'schreibtisch', 'gartenhaus',
  '(^|[^a-zäöüß])(käfig|zelt|sofa|schrank|regal|tisch|stuhl|teppich|vorhang|vorhänge|föhn|rasierer|trimmer|epilierer|mixer|laptop|tablet|akku|uhr|elektrisch\\w*)([^a-zäöüß]|$)',
  // Zusammensetzungen AM WORTENDE (gemessen im Plan 26.10.: Katzenregal, Gewürzregal, Nasenhaartrimmer, Stabmixer, Katzenzelt); hinten bleibt die Wortgrenze («Mixerzubehör», «Zeltplane» erlaubt)
  '(regal|zelt|trimmer|mixer)([^a-zäöüß]|$)',
].join('|'), 'i');

/**
 * Ausnahmen zu AUSSCHLUSS_TITEL: Zubehör und Textilien, die ein Gerät/Möbel nur im Titel NENNEN («Sofa-Kissenbezug», «Armband für Smartwatches», «Kühlschrankmagnet»,
 * «Vorhang-Raffhalter»). Schlüssel ist die Google-Kategorie (Kissen, Uhrenarmbänder, Magnete, Vorhang-Zubehör), nicht ein Wort im Titel: «Smartwatch Armband» in
 * «Electronics Accessories» bleibt ausgeschlossen (Test). GEMESSEN 26.10.2026: 64 von 531 durch den Titel ausgeschlossenen Produkten mit genug Marge waren solche
 * Fehlausschlüsse (Sofa 17, Smartwatch 27, Kühlschrank 6, Kamera 4 …).
 */
export const TITEL_AUSNAHME_G = ['Home & Garden > Decor > Throw Pillows', 'Home & Garden > Decor > Backrest Pillows', 'Home & Garden > Decor > Chair & Sofa Cushions',
  'Home & Garden > Linens & Bedding > Bedding > Pillowcases', 'Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands', 'Home & Garden > Decor > Refrigerator Magnets',
  'Home & Garden > Decor > Window Treatment Accessories'];
export const TITEL_AUSNAHME = /kühlschrankmagnet|magnete? für kühlschrank|spielkamerad|hundekamera|charm-anhänger|holzleim|kabel-organizer|kabelmanagement|vorhang-raffhalter|anhänger für vorhang/i;
const titelAusnahme = (title, g) => TITEL_AUSNAHME.test(title) || TITEL_AUSNAHME_G.some(x => g.startsWith(x));

/** Marge nach einem Rabatt: p·(1−d) − k, geteilt durch p·(1−d)  =  1 − (1−m)/(1−d). */
export const margeNachRabatt = (marge, prozent) => 1 - (1 - marge) / (1 - prozent / 100);

/** Kleinste Marge über alle Varianten; null, sobald EINE Variante keine Kosten oder keinen Preis hat. */
export function produktMarge(varianten) {
  if (!Array.isArray(varianten) || !varianten.length) return null;
  let min = Infinity;
  for (const v of varianten) {
    const preis = Number(v.price), kosten = v.cost == null || v.cost === '' ? NaN : Number(v.cost);
    if (!(preis > 0) || !(kosten > 0)) return null;
    min = Math.min(min, (preis - kosten) / preis);
  }
  return min;
}

export const tiefsterRabatt = stufe => Math.max(...STUFEN[stufe].schritte.map(s => s.prozent));

/** Passen Marge und Versandschwelle zu den Stufen? (Test und Lauf rufen es; wirft bei einem Fehler.) */
export function sicherheitspruefung(stufen = STUFEN) {
  for (const [name, s] of Object.entries(stufen)) {
    const tief = Math.max(...s.schritte.map(x => x.prozent));
    const nach = margeNachRabatt(s.margeMin, tief);
    if (nach < MARGE_ZIEL_MIN) throw new Error(`Stufe ${name}: nach ${tief} % Rabatt nur ${(nach * 100).toFixed(1)} % Marge (Ziel ${MARGE_ZIEL_MIN * 100} %)`);
    if (VERSAND_VERSPRECHEN * (1 - tief / 100) < VERSAND_SCHWELLE_EFFEKTIV) throw new Error(`Stufe ${name}: ${tief} % Rabatt drückt CHF ${VERSAND_VERSPRECHEN} unter die Versandschwelle ${VERSAND_SCHWELLE_EFFEKTIV}`);
    const ab = s.schritte.map(x => x.ab), pr = s.schritte.map(x => x.prozent);
    if (ab.some((x, i) => i && x <= ab[i - 1]) || pr.some((x, i) => i && x <= pr[i - 1])) throw new Error(`Stufe ${name}: Schritte müssen mit der Menge steigen`);
  }
  return true;
}

/**
 * Stufe eines Produkts: { stufe: 'a'|'b'|null, grund, marge, preis }.
 * `p` = { title, g, tags, variants: [{ price, cost }] } (g = Google-Kategorie, wie im Katalog).
 */
export function stufeFuer(p) {
  const tags = p.tags || [], g = p.g || '', title = p.title || '';
  const aus = grund => ({ stufe: null, grund, marge: null, preis: null });
  if (tags.some(t => AUSSCHLUSS_TAGS.includes(t))) return aus('gesperrt');
  if (!FAMILIEN.some(f => g.startsWith(f))) return aus('familie');
  if (AUSSCHLUSS_G.some(x => g.startsWith(x))) return aus('familie');
  if (AUSSCHLUSS_TITEL.test(title) && !titelAusnahme(title, g)) return aus('titel');
  if (TECHNIK_TAGS.some(t => tags.includes(t)) || GERAET_G_EXAKT.includes(g) || (GERAET_G.some(x => g.startsWith(x)) && !GERAET_G_AUSNAHME.some(x => g.startsWith(x)))) return aus('geraet');
  if (!/^sticker/i.test(title) && AUSSCHLUSS_TITEL_2.test(title)) return aus('geraet');
  if (MARKE_TITEL.test(title)) return aus('marke');
  const marge = produktMarge(p.variants);
  if (marge == null) return aus('kosten');
  const preis = Math.min(...p.variants.map(v => Number(v.price)));
  if (preis < PREIS_MIN || preis > PREIS_MAX) return { stufe: null, grund: 'preis', marge, preis };
  const stufe = marge >= STUFEN.a.margeMin - EPS ? 'a' : marge >= STUFEN.b.margeMin - EPS ? 'b' : null;
  return { stufe, grund: stufe ? 'ok' : 'marge', marge, preis };
}

/** Soll-Tag je Produkt gegen den Ist-Stand: welche Rabatt-Tags kommen dazu, welche gehen weg? Fremde Tags bleiben unberührt. */
export function tagDiff(tagsIst, stufe) {
  const soll = stufe ? STUFEN[stufe].tag : null;
  const ist = (tagsIst || []).filter(t => RABATT_TAGS.includes(t));
  return { add: soll && !ist.includes(soll) ? [soll] : [], remove: ist.filter(t => t !== soll) };
}

/** Eingaben für `discountAutomaticBasicCreate`: ein automatischer Rabatt je Schritt und Stufe, an die Sammlung der Stufe gebunden. */
export function rabattEingaben(sammlungen, startsAt) {
  const out = [];
  for (const [name, s] of Object.entries(STUFEN)) {
    const sammlung = sammlungen[name]; if (!sammlung) continue;
    for (const schritt of s.schritte) {
      out.push({ stufe: name, ab: schritt.ab, prozent: schritt.prozent, eingabe: {
        title: `${RABATT_TITEL_PREFIX} ab ${schritt.ab} Stück ${schritt.prozent} % Rabatt`,
        startsAt,
        // nie mit anderen Produkt- oder Bestellrabatten stapeln (Codes wie WELCOME10): die Marge ist nur für EINEN Rabatt gerechnet; Versandrabatte bleiben erlaubt
        combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: true },
        minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: String(schritt.ab) } },
        customerGets: { value: { percentage: schritt.prozent / 100 }, items: { collections: { add: [sammlung] } } },
      } });
    }
  }
  return out;
}

/** Plan aus Produkten: { a: [handle], b: [handle], gruende: {grund: n}, ohneStufe: n }. */
export function planen(produkte) {
  const plan = { a: [], b: [], gruende: {}, summe: 0 };
  for (const p of produkte) {
    const r = stufeFuer(p); plan.summe++;
    if (r.stufe) plan[r.stufe].push(p.handle); else plan.gruende[r.grund] = (plan.gruende[r.grund] || 0) + 1;
  }
  return plan;
}

// ───────────────────────── Ergänzungen der Code-Prüfung (26.10.2026) ─────────────────────────

/**
 * Bulk-JSONL → Produkte. Zwei Durchgänge: eine Variantenzeile VOR ihrer Elternzeile geht nicht still verloren, sondern wird erst am Ende zugeordnet;
 * was dann noch keinen Elternteil hat, zählt als Waise (der Aufrufer bricht ab: ein Produkt mit fehlender schlechtester Variante bekäme sonst eine zu gute Marge).
 */
export function parseBulk(text) {
  const map = new Map(), offen = []; let varianten = 0, waisen = 0;
  const kind = o => ({ price: o.price, cost: o.inventoryItem?.unitCost?.amount ?? null });
  for (const z of text.split('\n')) {
    if (!z) continue; const o = JSON.parse(z);
    if (o.__parentId) { const p = map.get(o.__parentId); if (p) { p.variants.push(kind(o)); varianten++; } else offen.push(o); }
    else map.set(o.id, { id: o.id, handle: o.handle, title: o.title, tags: o.tags || [], g: o.g?.value || '', variants: [] });
  }
  for (const o of offen) { const p = map.get(o.__parentId); if (p) { p.variants.push(kind(o)); varianten++; } else waisen++; }
  return { produkte: [...map.values()], varianten, waisen };
}

/** STARTS für LIVE: echtes UTC-Datum (Rundreise gegen «2026-13-45T99:99:99Z») und mindestens `minMin` Minuten in der Zukunft. null = in Ordnung. */
export function pruefeStarts(s, jetzt = Date.now(), minMin = 10) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s || '')) return 'STARTS=2026-10-27T08:00:00Z (UTC) ist für LIVE Pflicht';
  const t = Date.parse(s);
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 19) + 'Z' !== s) return `STARTS ${s} ist kein gültiges Datum`;
  if (t < jetzt + minMin * 60000) return `STARTS ${s} liegt nicht mindestens ${minMin} Min. in der Zukunft: der Rabatt wäre sofort aktiv`;
  return null;
}

/**
 * Ab welchem Warenwert gibt die AKTIVE Gratis-Versandregel der Zone Schweiz im Standardprofil Gratisversand? Zahl (CHF) oder null (keine/unbekannt).
 * `profiles` = deliveryProfiles.nodes mit profileLocationGroups.locationGroupZones.nodes.{zone.countries, methodDefinitions.nodes.{active, rateProvider, methodConditions}}.
 */
export function freiesVersandAb(profiles) {
  const std = (profiles || []).find(p => p.default); if (!std) return null;
  let best = null;
  for (const g of std.profileLocationGroups || []) for (const z of g.locationGroupZones?.nodes || []) {
    if (!(z.zone?.countries || []).some(c => /^(switzerland|schweiz)$/i.test(c.name))) continue;
    for (const m of z.methodDefinitions?.nodes || []) {
      if (!m.active || Number(m.rateProvider?.price?.amount) !== 0) continue;
      const bed = m.methodConditions || []; let ab = 0;
      if (bed.length) {
        const c = bed[0];
        if (bed.length > 1 || c.field !== 'TOTAL_PRICE' || c.operator !== 'GREATER_THAN_OR_EQUAL_TO') continue; // andere Bedingung (Gewicht, Bereich): nicht bewertbar
        ab = Number(c.conditionCriteria?.amount); if (!(ab >= 0)) continue;
      }
      best = best == null ? ab : Math.min(best, ab);
    }
  }
  return best;
}

/** Hält die Sicherheitsrechnung (VERSAND_VERSPRECHEN × (1 − tiefster Rabatt) ≥ VERSAND_SCHWELLE_EFFEKTIV) gegen die LIVE-Versandregel? null = ja, sonst der Grund. */
export function versandProblem(freiAb) {
  if (freiAb == null) return 'Versand: keine aktive Gratis-Regel für die Schweiz gefunden (unbekannt)';
  if (freiAb > VERSAND_SCHWELLE_EFFEKTIV) {
    const tief = Math.max(tiefsterRabatt('a'), tiefsterRabatt('b'));
    return `Versand: die aktive Gratis-Regel gilt erst ab CHF ${freiAb}, die Sicherheitsrechnung (${VERSAND_VERSPRECHEN} × ${1 - tief / 100} = ${VERSAND_SCHWELLE_EFFEKTIV}) setzt ≤ ${VERSAND_SCHWELLE_EFFEKTIV} voraus: Körbe von CHF ${VERSAND_VERSPRECHEN} bis ${(freiAb / (1 - tief / 100)).toFixed(2)} zahlen nach ${tief} % Rabatt CHF 7 Versand, obwohl «gratis ab ${VERSAND_VERSPRECHEN}» versprochen ist`;
  }
  return null;
}

/** Eigene und fremde automatische Rabatte trennen (nodes = discountNodes mit __typename, title, status, minimumRequirement). */
export function eigeneRabatte(nodes) {
  return (nodes || []).map(n => ({ id: n.id, ...n.discount })).filter(d => d.__typename === 'DiscountAutomaticBasic' && String(d.title || '').startsWith(RABATT_TITEL_PREFIX));
}
/** Aktive oder geplante automatische Mengenrabatte FREMDER Herkunft: sie konkurrieren mit den neuen (bei Gleichstand/Mehrwert gewinnt Shopify den besseren für den Kunden). */
export function fremdeMengenrabatte(nodes) {
  return (nodes || []).map(n => ({ id: n.id, ...n.discount })).filter(d => d.__typename === 'DiscountAutomaticBasic' && ['ACTIVE', 'SCHEDULED'].includes(d.status)
    && !String(d.title || '').startsWith(RABATT_TITEL_PREFIX) && d.minimumRequirement?.__typename === 'DiscountMinimumQuantity');
}

/** Texte der Sammlungen aus STUFEN ableiten, damit Titel und Rabatte nie auseinanderlaufen. */
export function stufenText(name, zusatz = '') {
  return STUFEN[name].schritte.map(x => `ab ${x.ab} Stück ${x.prozent} %${zusatz}`).join(', ');
}
