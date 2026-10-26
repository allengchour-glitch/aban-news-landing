/**
 * Regeln der Abteilung «Schuhe & Accessoires» (Datensatz /tmp/mode_daten.json).
 * Alles hier ist DATEN (Regex-Strings) plus drei kleine Funktionen:
 *   geschlecht(p)            -> [damen|herren|kinder|unisex, quelle]
 *   istMitglied(kat, p, g)   -> Boolean   (genau die Ausfuehrungsvorschrift aus der Aufgabe)
 *   gruppeVon(p)             -> Warengruppe aus der Google-Kategorie (nur fuer Messberichte)
 * Die Kategorien selbst werden in schuhe-accessoires_bauen.mjs aus ARTEN zusammengesetzt und als JSON geschrieben;
 * schuhe-accessoires_messen.mjs liest NUR das JSON und wertet es aus (so ist das JSON selbst das geprueft Ding).
 */
export const L = '(^|[^a-zäöüß])';
export const R = '(?![a-zäöüß])';
export const wortS = s => `${L}(${s})${R}`;   // eigenes Wort
export const anfS = s => `${L}(${s})`;        // Wortanfang, rechts offen
export const endS = s => `(${s})${R}`;        // Wortende, links offen (Zusammensetzungen)

export const SPERR_TAGS = ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'google-gesperrt-adult', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'lizenz-nicht-bewerben'];
/** Kostueme (Fortura) haben eigene Kategorien: nie in Schuhe & Accessoires. */
export const FREMD_TAGS = ['fortura'];

// ───────────────────────────── Geschlecht ─────────────────────────────
const re = (s) => new RegExp(s, 'i');
export const KID_RE = re(`${L}(kinder|kids?|kleinkind|mädchen|maedchen|jungs|jungen|teenager|teens?|säugling|neugeboren|baby|lauflern|krabbel|krippen|junioren|jugendliche|buben?)`);
export const KID_AUSNAHME = re(`${L}(baby-?(blau|rosa|pink|doll|schriftzug|aufdruck|slogan|tee|haut)|kinder-?(sicher|wagen)|im jungen|am jungen|vom jungen|zum jungen|mit jungen|in jungen|den jungen|dem jungen|einem jungen|der jungen)`);
export const HER_RE = re(`${L}(herren(?!los)|männer|maenner|männlich|gentleman|boyfriend)|${L}(mann)${R}`);
export const DAM_RE = re(`${L}(damen|frauen|weiblich|girlfriend|studentin\\w*|schülerin\\w*)|${L}(ladies|lady|frau|mama|mami)${R}`);
export const UNI_RE = re(`${L}(unisex|damen und herren|herren und damen|damen & herren|herren & damen|damen/herren|herren/damen|männer und frauen|frauen und männer|für paare|pärchen|paarlook|partnerlook)`);
export const FAMILIE_RE = re(`${L}(famili\\w*|eltern\\w*|mutter|mama|papa|vater|mommy|daddy)${R}|kinder (und|&) erwachsene|erwachsene[n]? (und|&) kinder`);
/** Nur wenn Titel UND Tags schweigen: Stilwoerter. Weiblich-typisch (Schuhe) */
export const WEIBL_SCHUH = re(`${L}(pumps|high-? ?heels?|stilettos?|heels?|ballerina\\w*|peep-?toe\\w*|slingback\\w*|mary-? ?janes?|keilabsatz|keilsandal\\w*|keile|blockabsatz|riemchen\\w*|römersandal\\w*|zehensteg\\w*|strass\\w*|perlen\\w*|schleife\\w*|blumen\\w*|satin\\w*|overknee\\w*|mules?|knöchelriemen|kreuzriemen|flats?)`);
export const MAENNL_SCHUH = re(`${L}(business\\w*|oxford\\w*|derby\\w*|brogues?|anzugschuh\\w*|smoking\\w*|herrenschuh\\w*)`);
/** Warengruppe nach Google-Kategorie */
export function gruppeVon(p) {
  const g = p.g || '';
  if (g.startsWith('Apparel & Accessories > Shoes')) return 'schuh';
  if (g.startsWith('Apparel & Accessories > Handbags, Wallets & Cases > Wallets') || g.startsWith('Apparel & Accessories > Handbags, Wallets & Cases > Badge')) return 'geldboerse';
  if (g.startsWith('Apparel & Accessories > Handbags, Wallets & Cases') || g.startsWith('Luggage & Bags')) return 'tasche';
  if (g.startsWith('Apparel & Accessories > Clothing Accessories > Belts') || g.startsWith('Apparel & Accessories > Clothing Accessories > Belt Buckles')) return 'guertel';
  if (/^Apparel & Accessories > Clothing Accessories > (Hats|Balaclavas|Headwear|Neck Gaiters|Bandanas)/.test(g)) return 'kopf';
  if (g.startsWith('Apparel & Accessories > Clothing Accessories > Scarves')) return 'schal';
  if (g.startsWith('Apparel & Accessories > Clothing Accessories > Gloves')) return 'handschuh';
  if (g.startsWith('Apparel & Accessories > Clothing Accessories > Sunglasses')) return 'brille';
  if (g.startsWith('Apparel & Accessories > Clothing Accessories > Hair Accessories')) return 'haar';
  return null;
}
/** In diesen Warengruppen ist das Tag «damen» nur der Sammel-Tag des Imports (gemessen, siehe geschlecht_regel). */
const TAG_DAMEN_SCHWACH = new Set(['kopf', 'handschuh', 'brille']);

export function geschlecht(p) {
  const t = p.title || '', tags = p.tags || [], gr = gruppeVon(p);
  const tt = t.replace(new RegExp(KID_AUSNAHME.source, 'ig'), ' ');
  // 1 Titel nennt Kinder
  const h = HER_RE.test(t), d = DAM_RE.test(t);
  if (KID_RE.test(tt) && !h && !d && !/kinder-? (und|&) erwachsene|erwachsene[n]?-? (und|&) kinder/i.test(t)) return ['kinder', 'titel'];
  // 2 unisex / beide Zielgruppen (Kinder UND Erwachsene gleichzeitig; «Kinder und Damen» ist Damen, «Teens und Herren» ist Herren)
  if (UNI_RE.test(t) || (h && d) || /kinder-? (und|&) erwachsene|erwachsene[n]?-? (und|&) kinder/i.test(t)) return ['unisex', 'titel'];
  // 3 Herren (keine Nachkorrektur «Herren-Rock = Damen»: gemessen sind Herren-Titel mit Damen-Woertern echte Herrenware)
  if (h) return ['herren', 'titel'];
  // 4 Damen
  if (d) return ['damen', 'titel'];
  // 5 Tags
  const tk = tags.includes('kinderschuhe') || tags.includes('kinder');
  const td = tags.includes('damenschuhe') || tags.includes('damen');
  const th = tags.includes('herrenschuhe') || tags.includes('herren') || tags.includes('maenner');
  if (tk) return ['kinder', 'tag'];
  if (td && th) return ['unisex', 'tag'];
  if (tags.includes('unisex')) return ['unisex', 'tag'];
  if (th) return ['herren', 'tag'];
  if (td && !TAG_DAMEN_SCHWACH.has(gr)) return ['damen', 'tag'];
  // 6 Produkttyp
  if (p.type === 'Damenschuhe') return ['damen', 'type'];
  if (p.type === 'Herrenschuhe') return ['herren', 'type'];
  if (p.type === 'Kinderschuhe' || p.type === 'Baby & Kinder' || p.type === 'Kinder') return ['kinder', 'type'];
  // 7 Stilwoerter, nur ohne Beleg
  if (gr === 'schuh') { if (WEIBL_SCHUH.test(t)) return ['damen', 'stil']; if (MAENNL_SCHUH.test(t)) return ['herren', 'stil']; }
  if (gr === 'haar' || gr === 'schal') return ['damen', 'warengruppe'];
  if (gr === 'guertel' && (/taillen|wickel/i.test(t) || WEIBL_STIL.test(t))) return ['damen', 'stil'];
  if (td && TAG_DAMEN_SCHWACH.has(gr) && WEIBL_STIL.test(t)) return ['damen', 'stil'];
  if (gr === 'tasche' || gr === 'geldboerse') { if (MAENNL_TASCHE.test(t) && !WEIBL_STIL.test(t)) return ['herren', 'stil']; if (WEIBL_STIL.test(t)) return ['damen', 'stil']; }
  // 8 sonst unisex
  return ['unisex', 'unbekannt'];
}
export const WEIBL_STIL = re(`${L}(spitze|schmetterling\\w*|perlen\\w*|strass\\w*|schleife\\w*|rüschen|blumen\\w*|blüten\\w*|lolita|häkel\\w*|glitzer\\w*|prinzessin\\w*|herz\\w*|turban\\w*|kopftuch\\w*|cat-?eye\\w*|oversize\\w*|süss\\w*|niedlich\\w*|abendtasche\\w*|floral\\w*|quasten?|lippenstift\\w*|y2k|leopard\\w*|leo-?look|schmuck-?clutch|ketten-?clutch|für kleider|für kleid)`);

// ───────────────────────────── Ausfuehrung ─────────────────────────────
/** @param {object} kat Kategorie-Objekt aus dem JSON  @param {object} p Produkt  @param {string} g Geschlecht des Produkts */
export function istMitglied(kat, p, g) {
  const t = p.title || '', gg = p.g || '';
  if (!kat.g_prefix.some(x => gg.startsWith(x))) return false;
  if (kat.g_nicht.some(x => gg.startsWith(x))) return false;
  if (kat.titel_muss.length && !kat.titel_muss.some(x => new RegExp(x, 'i').test(t))) return false;
  if (kat.titel_nicht.some(x => new RegExp(x, 'i').test(t))) return false;
  const tags = p.tags || [];
  if (kat.tags_nicht.some(x => tags.includes(x))) return false;
  if (kat.tags_muss_eines.length && !kat.tags_muss_eines.some(x => tags.includes(x))) return false;
  if (kat.geschlecht === 'kinder') return g === 'kinder';
  if (kat.geschlecht === 'unisex') return g === 'unisex';
  return g === kat.geschlecht || g === 'unisex';
}
export function istInUnterfilter(u, p) {
  const t = p.title || '';
  if (u.titel_muss.length && !u.titel_muss.some(x => new RegExp(x, 'i').test(t))) return false;
  return !u.titel_nicht.some(x => new RegExp(x, 'i').test(t));
}

/** Taschen-Woerter, die in den Titeln MIT Zielgruppe zu 100 % bei Herren stehen (brusttasche 54:0, business 21:0, clutch 17:0, aktentasche 11:0, crazy horse 10:0; Damen:Herren) */
export const MAENNL_TASCHE = re('(brusttasche\\w*|brustbeutel|brust-?bag\\w*|sling-?(bag|tasche)\\w*|slingbag)|' + `${L}(sling|business\\w*|clutch\\w*|aktentasche\\w*|messenger\\w*|crazy-? ?horse)`);
