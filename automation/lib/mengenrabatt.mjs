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

/** Wer so markiert ist (Erwachsene, Waffen, kein CH-Stecker, Kostüm-Lizenzware …), bekommt nie einen Rabatt-Tag. */
export const AUSSCHLUSS_TAGS = [...SPERR_TAGS, 'google-gesperrt-adult', 'lizenz-nicht-bewerben', 'fortura', 'kostuem'];

/** Produktfamilien, bei denen zwei oder drei Stück im Warenkorb üblich sind (Google-Kategorie-Präfix). */
export const FAMILIEN = [
  'Apparel & Accessories > Jewelry', 'Apparel & Accessories > Clothing Accessories', 'Health & Beauty > Personal Care', 'Health & Beauty > Jewelry Cleaning & Care',
  'Animals & Pet Supplies > Pet Supplies', 'Electronics > Electronics Accessories', 'Arts & Entertainment > Hobbies & Creative Arts', 'Arts & Entertainment > Party & Celebration',
  'Home & Garden > Kitchen & Dining', 'Home & Garden > Household Supplies', 'Home & Garden > Decor', 'Home & Garden > Linens & Bedding', 'Home & Garden > Bathroom Accessories',
  'Toys & Games', 'Hardware > Tool Accessories', 'Hardware > Building Consumables',
];
/** Innerhalb der Familien nie: Uhren (ein Stück), Geräte, Möbel, Grosses. Lange, unverwechselbare Wörter ohne Wortgrenze (fangen auch Zusammensetzungen). */
export const AUSSCHLUSS_G = ['Apparel & Accessories > Jewelry > Watches'];
export const AUSSCHLUSS_TITEL = new RegExp([
  'kratzbaum', 'aquarium', 'transportbox', 'hundehütte', 'hundehuette', 'staubsauger', 'haartrockner', 'luftreiniger', 'massagepistole', 'massagegerät', 'smartwatch', 'armbanduhr',
  'ladegerät', 'ladegeraet', 'kamera', 'lautsprecher', 'drohne', 'kühlschrank', 'fritteuse', 'ventilator', 'matratze', 'schreibtisch', 'gartenhaus',
  '(^|[^a-zäöüß])(käfig|zelt|sofa|schrank|regal|tisch|stuhl|teppich|vorhang|vorhänge|föhn|rasierer|trimmer|epilierer|mixer|laptop|tablet|akku|uhr|elektrisch\\w*)([^a-zäöüß]|$)',
].join('|'), 'i');

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
  if (AUSSCHLUSS_TITEL.test(title)) return aus('titel');
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
        title: `Mengenrabatt: ab ${schritt.ab} Stück ${schritt.prozent} % Rabatt`,
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
