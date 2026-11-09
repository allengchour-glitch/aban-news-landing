// Tests für doppelte Seitentitel bei Sammlungen (lib/seo_dubletten.mjs und kategorie_seo_dubletten.mjs). Ohne Netz: die Läufe sprechen mit einer Attrappe der Shopify-Abfrage.
// Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { grundTitel, geschlechtVon, wirksamerTitel, norm, dublettenGruppen, geschlechtsPlan, chipPlan, beschreibungsPlan, BESCHR_VORLAGE, MAX_BESCHR, entschaerfe, MANUELL } from './seo_dubletten.mjs';
import { RUCKSAECKE } from './rucksaecke_menue.mjs';
import { seoDublettenLauf, alleSammlungen } from '../kategorie_seo_dubletten.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const kopie = x => JSON.parse(JSON.stringify(x));

// ── Bausteine ──
ist('grundTitel: «online kaufen | LuxeStyle CH» fällt weg', grundTitel('Jeans online kaufen | LuxeStyle CH'), 'Jeans');
ist('grundTitel: auch ohne Marke und mit «Schweiz»', [grundTitel('Westen online kaufen'), grundTitel('Gant kaufen | LuxeStyle Schweiz'), grundTitel('Hosen')], ['Westen', 'Gant kaufen', 'Hosen']);
ist('grundTitel: Gegenprobe, «online kaufen» mitten im Titel bleibt', grundTitel('Online kaufen leicht gemacht | LuxeStyle CH'), 'Online kaufen leicht gemacht');
ist('geschlechtVon: damen-, herren-, kinder- (auch kinder-baby-), sonst null', ['damen-jeans', 'herren-jeans', 'kinder-hausschuhe', 'kinder-baby-overalls', 'jeans', 'damenuhren', 'marke-damen-x'].map(geschlechtVon), ['Damen', 'Herren', 'Kinder', 'Kinder', null, null, null]);
ist('wirksamerTitel: SEO-Titel gewinnt, sonst Sammlungstitel', [wirksamerTitel({ title: 'A', seo: { title: 'B' } }), wirksamerTitel({ title: 'A', seo: { title: null } }), wirksamerTitel({ title: ' A ' })], ['B', 'A', 'A']);
ist('norm: Emoji, Satzzeichen, Gross-/Kleinschreibung und Marke fallen weg', [norm('🔥 Hoodies & Sweatshirts online kaufen | LuxeStyle CH'), norm('Hoodies & Sweatshirts')], ['hoodies sweatshirts', 'hoodies sweatshirts']);
ist('entschaerfe: &amp; und Anführungszeichen', entschaerfe('A &amp; B &quot;c&quot; &#39;d&#39; &lt;p&gt;'), 'A & B "c" \'d\' <p>');

// ── Gruppen und Geschlechts-Plan ──
const S = (handle, seoTitle, n = 10, extra = {}) => ({ id: 'gid://shopify/Collection/' + handle, handle, title: grundTitel(seoTitle) || handle, seo: { title: seoTitle, description: 'Beschreibung ' + handle }, productsCount: { count: n }, ...extra });
const PAAR = [S('damen-jeans', 'Jeans online kaufen | LuxeStyle CH'), S('herren-jeans', 'Jeans online kaufen | LuxeStyle CH'), S('hosen-alle', 'Alle Hosen online kaufen | LuxeStyle CH')];
{
  ist('dublettenGruppen: genau das Paar, nicht die einzelne Sammlung', [...dublettenGruppen(PAAR)].map(([k, l]) => [k, l.map(c => c.handle)]), [['jeans', ['damen-jeans', 'herren-jeans']]]);
  ist('dublettenGruppen: Sammlungen ohne Produkte zählen nicht (Gegenprobe)', dublettenGruppen([S('damen-jeans', 'Jeans online kaufen', 10), S('herren-jeans', 'Jeans online kaufen', 0)]).size, 0);
  const p = geschlechtsPlan(PAAR);
  ist('Paar: beide bekommen «für Damen» / «für Herren», die Beschreibung geht mit', p.aenderungen.map(a => [a.handle, a.neu, a.beschreibung]), [['damen-jeans', 'Jeans für Damen online kaufen | LuxeStyle CH', 'Beschreibung damen-jeans'], ['herren-jeans', 'Jeans für Herren online kaufen | LuxeStyle CH', 'Beschreibung herren-jeans']]);
  ist('Paar: nichts offen, die einzelne Sammlung bleibt unberührt', [p.offen, p.aenderungen.some(a => a.handle === 'hosen-alle')], [[], false]);
  // Wiederholbarkeit: auf dem Ergebnis ergibt ein zweiter Lauf nichts mehr
  const nach = PAAR.map(c => { const a = p.aenderungen.find(x => x.handle === c.handle); return a ? { ...c, seo: { ...c.seo, title: a.neu } } : c; });
  ist('Wiederholung auf dem Ergebnis: 0 Änderungen, keine offenen Gruppen', [geschlechtsPlan(nach).aenderungen.length, geschlechtsPlan(nach).offen.length], [0, 0]);
}
{
  const drei = [S('hoodies-sweatshirts', 'Hoodies & Sweatshirts online kaufen | LuxeStyle CH'), S('damen-hoodies-sweatshirts', 'Hoodies & Sweatshirts online kaufen | LuxeStyle CH'), S('herren-hoodies-sweatshirts', 'Hoodies & Sweatshirts online kaufen | LuxeStyle CH')];
  const p = geschlechtsPlan(drei);
  ist('Dreiergruppe mit einer allgemeinen Sammlung: nur die zwei mit Geschlecht ändern sich, die allgemeine behält den Titel', p.aenderungen.map(a => a.handle), ['damen-hoodies-sweatshirts', 'herren-hoodies-sweatshirts']);
  const hs = [S('damen-hausschuhe', 'Hausschuhe & Pantoffeln online kaufen | LuxeStyle CH'), S('herren-hausschuhe', 'Hausschuhe & Pantoffeln online kaufen | LuxeStyle CH'), S('kinder-hausschuhe', 'Hausschuhe & Pantoffeln online kaufen | LuxeStyle CH')];
  ist('Dreier damen/herren/kinder: drei verschiedene Titel; über 60 Zeichen entfällt erst die Marke', geschlechtsPlan(hs).aenderungen.map(a => a.neu), ['Hausschuhe & Pantoffeln für Damen online kaufen', 'Hausschuhe & Pantoffeln für Herren online kaufen', 'Hausschuhe & Pantoffeln für Kinder online kaufen']);
  ist('…und jeder neue Titel hat höchstens 60 Zeichen', geschlechtsPlan(hs).aenderungen.every(a => a.neu.length <= 60), true);
}
{
  const gleich = [S('herren-poloshirts-kurzarm', 'Kurzarm online kaufen | LuxeStyle CH'), S('herren-t-shirts-kurzarm', 'Kurzarm online kaufen | LuxeStyle CH')];
  ist('MANUELL löst gleiches Geschlecht auf (Poloshirts / T-Shirts kurzarm)', geschlechtsPlan(gleich).aenderungen.map(a => a.neu), ['Poloshirts kurzarm für Herren online kaufen | LuxeStyle CH', 'T-Shirts kurzarm für Herren online kaufen | LuxeStyle CH']);
  const ohneManuell = [S('herren-jacken-a', 'Mäntel online kaufen'), S('herren-jacken-b', 'Mäntel online kaufen')];
  const p = geschlechtsPlan(ohneManuell);
  ist('Gegenprobe: gleiches Geschlecht ohne Handarbeit bleibt offen und unverändert', [p.aenderungen.length, p.offen.map(o => o.handles)], [0, [['herren-jacken-a', 'herren-jacken-b']]]);
  ist('MANUELL nennt nur Handles mit Geschlecht und ein Ergebnis mit «für Herren»', Object.entries(MANUELL).every(([h, t]) => geschlechtVon(h) === 'Herren' && /für Herren$/.test(t)), true);
  const ohneG = [S('beleuchtung-lampen', 'Lampen online kaufen'), S('sub-beleuchtung', 'Lampen online kaufen')];
  ist('Gruppe ganz ohne Geschlecht: offen, nichts geändert', [geschlechtsPlan(ohneG).aenderungen.length, geschlechtsPlan(ohneG).offen[0].handles], [0, ['beleuchtung-lampen', 'sub-beleuchtung']]);
  const wort = [S('herren-uhren', 'Herrenuhren online kaufen | LuxeStyle Schweiz'), S('uhren-herren', 'Herrenuhren online kaufen | LuxeStyle Schweiz')];
  ist('Titel nennt das Geschlecht schon als Wortteil («Herrenuhren»): kein «Herrenuhren für Herren»', geschlechtsPlan(wort).aenderungen.map(a => a.neu), []);
  const schonGenannt = [S('damen-schuhe', 'Damen Schuhe online kaufen'), S('herren-schuhe', 'Damen Schuhe online kaufen')];
  ist('Gegenprobe: nennt der Titel «Damen» schon, bekommt nur die Herren-Sammlung den Zusatz', geschlechtsPlan(schonGenannt).aenderungen.map(a => [a.handle, a.neu]), [['herren-schuhe', 'Damen Schuhe für Herren online kaufen | LuxeStyle CH']]);
  const fremd = [S('damen-x', 'Gürtel online kaufen'), S('herren-x', 'Gürtel online kaufen'), S('guertel-damen-alt', 'Gürtel für Damen online kaufen')];
  ist('der neue Titel gäbe es schon bei einer fremden Sammlung → Gruppe offen (nichts doppelt machen)', [geschlechtsPlan(fremd).aenderungen.length, geschlechtsPlan(fremd).offen.length], [0, 1]);
  const ohneBeschr = [{ ...S('damen-a', 'Hüte online kaufen'), seo: { title: 'Hüte online kaufen', description: null } }, S('herren-a', 'Hüte online kaufen')];
  ist('SEO-Beschreibung leer: wird als null durchgereicht (der Lauf lässt den Schlüssel dann weg)', geschlechtsPlan(ohneBeschr).aenderungen.map(a => a.beschreibung), [null, 'Beschreibung herren-a']);
  ist('Sammlung ohne eigenen SEO-Titel: der Sammlungstitel zählt', geschlechtsPlan([{ id: 'x1', handle: 'damen-gurte', title: 'Gurte', seo: { title: null, description: null }, productsCount: { count: 3 } }, { id: 'x2', handle: 'herren-gurte', title: 'Gurte', seo: {}, productsCount: { count: 3 } }]).aenderungen.map(a => a.neu), ['Gurte für Damen online kaufen | LuxeStyle CH', 'Gurte für Herren online kaufen | LuxeStyle CH']);
}

// ── Gleiche SEO-Beschreibung (beschreibungsPlan) ──
const REST = ' Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.';
const VL = (x, rest = REST) => `${x} online kaufen.${rest}`;
const B = (handle, beschreibung, n = 10, seoTitle = 'Titel ' + handle) => ({ id: 'gid://shopify/Collection/' + handle, handle, title: handle, seo: { title: seoTitle, description: beschreibung }, productsCount: { count: n } });
const neuVon = p => Object.fromEntries(p.aenderungen.map(a => [a.handle, a.neu]));
{
  ist('Vorlage: «<Gegenstand> online kaufen. <Rest>» wird erkannt, der Gegenstand ist der Teil davor', [BESCHR_VORLAGE.exec(VL('Hosen'))?.[1], BESCHR_VORLAGE.exec(VL('Jacken & Mäntel'))?.[1]], ['Hosen', 'Jacken & Mäntel']);
  ist('Vorlage: ohne Rest nach «online kaufen.», ohne Vorlage oder in Grossbuchstaben passt sie nicht (Gegenprobe)', [BESCHR_VORLAGE.test('Hosen online kaufen.'), BESCHR_VORLAGE.test('Hosen online kaufen. '), BESCHR_VORLAGE.test('Ausgewählte Produkte aus dem Sortiment.'), BESCHR_VORLAGE.test('HOSEN ONLINE KAUFEN. X')], [false, false, false, false]);
  ist('Vorlage: der Rest darf Zeilenumbrüche enthalten', BESCHR_VORLAGE.test('Hosen online kaufen. Lieferung\nin die Schweiz.'), true);
  const p = beschreibungsPlan([B('damen-hosen', VL('Hosen')), B('herren-hosen', VL('Hosen')), B('hosen-alle', VL('Alle Hosen'))]);
  ist('Paar: beide bekommen «für Damen» / «für Herren», der Rest bleibt wörtlich; die einzelne Sammlung bleibt unberührt', neuVon(p), { 'damen-hosen': VL('Hosen für Damen'), 'herren-hosen': VL('Hosen für Herren') });
  ist('Paar: der eigene SEO-Titel geht mit, nichts offen, die alte Beschreibung steht in «alt»', [p.aenderungen.map(a => a.titel), p.offen, p.aenderungen.map(a => a.alt)], [['Titel damen-hosen', 'Titel herren-hosen'], [], [VL('Hosen'), VL('Hosen')]]);
  const nach = [B('damen-hosen', VL('Hosen für Damen')), B('herren-hosen', VL('Hosen für Herren')), B('hosen-alle', VL('Alle Hosen'))];
  ist('Wiederholung auf dem Ergebnis: 0 Änderungen, keine offenen Gruppen', [beschreibungsPlan(nach).aenderungen.length, beschreibungsPlan(nach).offen.length], [0, 0]);
}
{
  const hs = ['damen', 'herren', 'kinder'].map(g => B(g + '-hausschuhe', VL('Hausschuhe & Pantoffeln')));
  const p = beschreibungsPlan(hs);
  ist('Dreier damen/herren/kinder: drei verschiedene Beschreibungen, alle höchstens 160 Zeichen', [Object.values(neuVon(p)), p.aenderungen.every(a => a.neu.length <= MAX_BESCHR)], [['Damen', 'Herren', 'Kinder'].map(g => VL(`Hausschuhe & Pantoffeln für ${g}`)), true]);
  const mitAllg = beschreibungsPlan([B('hoodies-allgemein', VL('Hoodies')), B('damen-hoodies', VL('Hoodies')), B('herren-hoodies', VL('Hoodies'))]);
  ist('Dreiergruppe mit EINER allgemeinen Sammlung: nur die zwei mit Geschlecht ändern sich, die allgemeine behält die Vorlage', [mitAllg.aenderungen.map(a => a.handle), mitAllg.offen.length], [['damen-hoodies', 'herren-hoodies'], 0]);
  const zweiAllg = beschreibungsPlan([B('a-hoodies', VL('Hoodies')), B('b-hoodies', VL('Hoodies')), B('damen-hoodies', VL('Hoodies'))]);
  ist('Gegenprobe: zwei Sammlungen ohne Geschlecht blieben gleich → Gruppe offen, nichts geändert', [zweiAllg.aenderungen.length, zweiAllg.offen.map(o => o.grund)], [0, ['mehrere Mitglieder ohne Geschlecht blieben gleich']]);
}
{
  const ohneG = beschreibungsPlan([B('lampen-a', VL('Lampen')), B('lampen-b', VL('Lampen'))]);
  ist('Gruppe ganz ohne Geschlecht: offen, nichts geändert', [ohneG.aenderungen.length, ohneG.offen[0].handles, ohneG.offen[0].grund], [0, ['lampen-a', 'lampen-b'], 'kein Mitglied trägt ein Geschlecht im Handle']);
  // Nach dem Zusatz darf nichts doppelt bleiben: nennt der Gegenstand BEIDE Geschlechter, bliebe alles gleich; nennt er eines, bliebe die allgemeine Sammlung gleich der unveränderten
  const beide = beschreibungsPlan([B('damen-s', VL('Damen & Herren Schuhe')), B('herren-s', VL('Damen & Herren Schuhe'))]);
  ist('Gegenstand nennt beide Geschlechter: es bliebe alles gleich → offen, nichts geändert', [beide.aenderungen.length, beide.offen.map(o => o.grund)], [0, ['nach dem Zusatz bliebe eine Beschreibung doppelt']]);
  const allgGleich = beschreibungsPlan([B('damen-t', VL('Damen Schuhe')), B('herren-t', VL('Damen Schuhe')), B('schuhe-allgemein', VL('Damen Schuhe'))]);
  ist('Gegenstand nennt «Damen», eine allgemeine Sammlung bliebe der unveränderten Damen-Sammlung gleich → offen', [allgGleich.aenderungen.length, allgGleich.offen.map(o => o.grund)], [0, ['nach dem Zusatz bliebe eine Beschreibung doppelt']]);
  const gleichG = beschreibungsPlan([B('herren-polo-kurz', VL('Kurzarm für Herren')), B('herren-tshirt-kurz', VL('Kurzarm für Herren'))]);
  ist('gleiches Geschlecht mehrfach: offen und unverändert (das lösen nur Menschen)', [gleichG.aenderungen.length, gleichG.offen.map(o => o.grund)], [0, ['gleiches Geschlecht mehrfach']]);
  const fremdText = beschreibungsPlan([B('damen-x', 'Ausgewählte Produkte aus dem Sortiment. Details ansehen.'), B('herren-x', 'Ausgewählte Produkte aus dem Sortiment. Details ansehen.')]);
  ist('Beschreibung nicht nach der Vorlage: offen, nichts geändert (nie einen fremden Text umschreiben)', [fremdText.aenderungen.length, fremdText.offen.map(o => o.grund)], [0, ['Beschreibung nicht nach der Vorlage «… online kaufen. …»']]);
  const schon = beschreibungsPlan([B('damen-schuhe', VL('Damen Schuhe')), B('herren-schuhe', VL('Damen Schuhe'))]);
  ist('Gegenprobe: nennt der Gegenstand «Damen» schon, bekommt nur die Herren-Sammlung den Zusatz', neuVon(schon), { 'herren-schuhe': VL('Damen Schuhe für Herren') });
  const fremd = beschreibungsPlan([B('damen-gurte', VL('Gürtel')), B('herren-gurte', VL('Gürtel')), B('guertel-damen-alt', VL('Gürtel für Damen'))]);
  ist('die neue Beschreibung gäbe es schon bei einer fremden Sammlung → Gruppe offen (nichts doppelt machen)', [fremd.aenderungen.length, fremd.offen.map(o => o.grund)], [0, ['die neue Beschreibung gibt es schon bei einer anderen Sammlung']]);
  const lang = 'Sturmhauben & Gesichtsmasken & Schals & Tücher & Mützen & Stirnbänder & Ohrenwärmer & Handschuhe & Gamaschen & Kragenschals';
  const zuLang = beschreibungsPlan([B('damen-l', VL(lang)), B('herren-l', VL(lang))]);
  ist('über 160 Zeichen nach dem Zusatz: offen, nichts geändert', [VL(lang + ' für Damen').length > MAX_BESCHR, zuLang.aenderungen.length, zuLang.offen.map(o => o.grund)], [true, 0, [`eine neue Beschreibung hätte über ${MAX_BESCHR} Zeichen`]]);
  // Grenze genau: die längere der beiden neuen Beschreibungen («für Herren») hat 160 Zeichen (erlaubt) bzw. 161 (offen)
  const zusatz = ` für Herren online kaufen.${REST}`.length, auf160 = 'X'.repeat(MAX_BESCHR - zusatz), auf161 = 'X'.repeat(MAX_BESCHR - zusatz + 1);
  const g160 = beschreibungsPlan([B('damen-g', VL(auf160)), B('herren-g', VL(auf160))]), g161 = beschreibungsPlan([B('damen-g', VL(auf161)), B('herren-g', VL(auf161))]);
  ist('Grenze: 160 Zeichen sind erlaubt, 161 nicht (und die Grenze ist wirklich 160)', [MAX_BESCHR, g160.aenderungen.map(a => a.neu.length), g161.aenderungen.length, g161.offen.length], [160, [159, 160], 0, 1]);
}
{
  ist('Sammlung ohne Produkte zählt nicht (Gegenprobe): keine Gruppe, nichts offen', [beschreibungsPlan([B('damen-x', VL('X'), 10), B('herren-x', VL('X'), 0)]).aenderungen.length, beschreibungsPlan([B('damen-x', VL('X'), 10), B('herren-x', VL('X'), 0)]).offen.length], [0, 0]);
  ist('leere oder fehlende Beschreibung zählt nicht (kein Schlüssel «null»)', [beschreibungsPlan([B('damen-x', ''), B('herren-x', ''), { ...B('damen-y', ''), seo: null }, { ...B('herren-y', ''), seo: {} }]).offen.length, beschreibungsPlan([{ ...B('a', ''), seo: null }, { ...B('b', ''), seo: null }]).aenderungen.length], [0, 0]);
  const ohneTitel = beschreibungsPlan([{ ...B('damen-x', VL('X')), seo: { title: null, description: VL('X') } }, B('herren-x', VL('X'))]);
  ist('kein eigener SEO-Titel: «titel» ist null (der Lauf lässt den Schlüssel dann weg)', ohneTitel.aenderungen.map(a => a.titel), [null, 'Titel herren-x']);
  const gemischt = beschreibungsPlan([B('damen-x', VL('X')), B('herren-x', '  ' + VL('X').toUpperCase() + ' ')]);
  ist('Gross-/Kleinschreibung und Leerraum machen aus der gleichen Beschreibung keine verschiedene (Gruppe wird erkannt)', [gemischt.aenderungen.length + gemischt.offen.length > 0], [true]);
}

// ── Chips der Bereichsdatei ──
const CHIPS = RUCKSAECKE.filter(k => k.filter);
const shopChip = k => ({ id: 'gid://shopify/Collection/' + k.handle, handle: k.handle, title: k.titel, descriptionHtml: `<p>${k.beschreibung.replace(/&/g, '&amp;')}</p>`, seo: { title: k.seoTitel, description: k.seoBeschreibung } });
{
  ist('46 Rucksack-Chips mit Titel, Beschreibung und SEO-Feldern', [CHIPS.length, CHIPS.every(k => k.titel && k.beschreibung && k.seoTitel && k.seoBeschreibung)], [46, true]);
  const titelKeys = CHIPS.map(k => norm(k.seoTitel)).concat(RUCKSAECKE.filter(k => !k.filter).map(k => norm(k.seoTitel)));
  ist('kein Chip- oder Kategorie-Titel doppelt (das war der Fund: «Wasserdicht» fünfmal)', titelKeys.length - new Set(titelKeys).size, 0);
  ist('jeder Chip-Titel nennt den Gegenstand (…rucksack/…rucksäcke), damit die Seite für sich allein verständlich ist', CHIPS.filter(k => !/rucks/i.test(k.titel)).map(k => k.titel), []);
  ist('SEO-Titel höchstens 60 Zeichen', CHIPS.filter(k => k.seoTitel.length > 60).map(k => k.seoTitel), []);
  const alles = CHIPS.map(shopChip);
  ist('Shop = Datei (Beschreibung mit &amp; wie von Shopify geliefert): keine Abweichung', chipPlan(CHIPS, alles).aenderungen.length, 0);
  const alt = alles.map(c => c.handle === 'wd-business' ? { ...c, title: 'Business & Laptop', seo: { ...c.seo, title: 'Business & Laptop online kaufen | LuxeStyle CH' } } : c);
  const p = chipPlan(CHIPS, alt);
  ist('alter Titel im Shop: genau diese Sammlung, Felder title und seoTitle', [p.aenderungen.map(a => a.handle), p.aenderungen[0].felder], [['wd-business'], ['title', 'seoTitle']]);
  ist('Chip fehlt im Shop: gemeldet, nicht geändert', chipPlan(CHIPS, alles.slice(1)).fehlt, [CHIPS[0].handle]);
  const beschr = alles.map(c => c.handle === 'takt-takt' ? { ...c, descriptionHtml: '<p>Anderer Text.</p>' } : c);
  ist('anderer Beschreibungstext: erkannt', chipPlan(CHIPS, beschr).aenderungen.map(a => [a.handle, a.felder]), [['takt-takt', ['descriptionHtml']]]);
}

// ── Der Lauf mit einer Attrappe ──
const TMP = mkdtempSync(join(tmpdir(), 'seo-dubletten-test-'));
function attrappe(sammlungen, { userErrors = [], verfaelsche = false, seite = 2, normalisiere = true } = {}) {
  const z = { c: kopie(sammlungen) }, aufrufe = [];
  const q = async (query, v = {}) => {
    aufrufe.push({ query, v: kopie(v) });
    if (/collections\(first/.test(query)) { const von = v.a ? Number(v.a) : 0, bis = von + seite; return { collections: { pageInfo: { hasNextPage: bis < z.c.length, endCursor: String(bis) }, nodes: z.c.slice(von, bis).map(kopie) } }; }
    if (/collectionUpdate/.test(query)) {
      if (userErrors.length) return { collectionUpdate: { collection: null, userErrors } };
      const c = z.c.find(x => x.id === v.i.id);
      if (v.i.title !== undefined) c.title = v.i.title;
      if (v.i.descriptionHtml !== undefined) c.descriptionHtml = normalisiere ? v.i.descriptionHtml.replace(/&(?!amp;)/g, '&amp;') : v.i.descriptionHtml;
      if (v.i.seo) c.seo = verfaelsche ? { ...v.i.seo, title: v.i.seo.title + ' (verändert)' } : { title: v.i.seo.title ?? null, description: v.i.seo.description ?? null };
      return { collectionUpdate: { collection: { id: c.id }, userErrors: [] } };
    }
    if (/collection\(id:\$id\)/.test(query)) { const c = z.c.find(x => x.id === v.id); return { collection: c ? { title: c.title, descriptionHtml: c.descriptionHtml ?? '', seo: c.seo } : null }; }
    throw new Error('unerwartete Abfrage: ' + query.slice(0, 80));
  };
  return { q, z, aufrufe, schreibend: () => aufrufe.filter(a => /mutation/.test(a.query)) };
}
const still = () => { const zeilen = []; return { zeilen, out: (...a) => zeilen.push(a.join(' ')), err: (...a) => zeilen.push('ERR ' + a.join(' ')) }; };
const dateien = n => ({ sicherung: m => join(TMP, n, m + '.json'), ledger: join(TMP, n, 'ledger.txt') });
const MIX = [...PAAR, S('damen-hosen', 'Hosen online kaufen | LuxeStyle CH'), S('herren-hosen', 'Hosen online kaufen | LuxeStyle CH'), ...CHIPS.slice(0, 3).map(k => ({ ...shopChip(k), title: 'Alt ' + k.handle, productsCount: { count: 20 } }))];
{
  const a = attrappe(MIX), s = still(), d = dateien('t1');
  const r = await seoDublettenLauf(a.q, { modus: 'geschlecht', live: false, ...d, out: s.out, err: s.err });
  ist('Trockenlauf: Exit 0, nichts geschrieben, keine Sicherung, kein Ledger; 4 Änderungen gezeigt; Seiten über mehrere Abrufe gelesen', [r.code, a.schreibend().length, existsSync(d.sicherung('geschlecht')), existsSync(d.ledger), r.geschlecht.aenderungen.length, a.aufrufe.filter(x => /collections\(first/.test(x.query)).length > 1], [0, 0, false, false, 4, true]);
  ist('Trockenlauf: die Ausgabe nennt «Trockenlauf» und die neuen Titel', [s.zeilen.some(z => z.includes('Trockenlauf')), s.zeilen.some(z => z.includes('Jeans für Damen online kaufen'))], [true, true]);
}
{
  const a = attrappe(MIX), s = still(), d = dateien('t2');
  const r = await seoDublettenLauf(a.q, { modus: 'geschlecht', live: true, ...d, jetzt: () => new Date('2026-10-28T09:00:00Z'), out: s.out, err: s.err });
  ist('LIVE: Exit 0, 4 Sammlungen geschrieben und frisch zurückgelesen', [r.code, r.geschrieben, a.schreibend().length], [0, 4, 4]);
  ist('LIVE: nur der SEO-Titel ändert sich, Titel der Sammlung und Beschreibung bleiben', [a.z.c.find(c => c.handle === 'damen-jeans').seo, a.z.c.find(c => c.handle === 'damen-jeans').title], [{ title: 'Jeans für Damen online kaufen | LuxeStyle CH', description: 'Beschreibung damen-jeans' }, 'Jeans']);
  ist('LIVE: jeder Aufruf sendet Titel UND Beschreibung (seo wird ersetzt)', a.schreibend().every(x => x.v.i.seo.title && x.v.i.seo.description), true);
  const sich = JSON.parse(readFileSync(d.sicherung('geschlecht'), 'utf8'));
  ist('Sicherung: alte Werte aller geänderten Sammlungen', [sich.aenderungen.length, sich.aenderungen[0].alt], [4, 'Jeans online kaufen | LuxeStyle CH']);
  ist('Ledger: eine Zeile je Sammlung', readFileSync(d.ledger, 'utf8').split('\n').filter(Boolean).length, 4);
  const r2 = await seoDublettenLauf(a.q, { modus: 'geschlecht', live: true, ...d, out: s.out, err: s.err });
  ist('zweiter LIVE-Lauf: nichts mehr zu tun, nichts geschrieben, Sicherung unverändert', [r2.code, r2.geschrieben, a.schreibend().length, JSON.parse(readFileSync(d.sicherung('geschlecht'), 'utf8')).aenderungen.length], [0, 0, 4, 4]);
}
{
  const a = attrappe(MIX), s = still(), d = dateien('t3');
  const r = await seoDublettenLauf(a.q, { modus: 'chips', live: true, ...d, out: s.out, err: s.err });
  const c = a.z.c.find(x => x.handle === CHIPS[0].handle);
  ist('Chips LIVE: 3 Chips mit neuem Titel, Beschreibung und SEO geschrieben', [r.code, r.geschrieben, c.title, c.seo.title, c.descriptionHtml.includes(CHIPS[0].titel.replace(/&/g, '&'))], [0, 3, CHIPS[0].titel, CHIPS[0].seoTitel, true]);
  ist('Chips LIVE: Shopify speichert «&» als «&amp;» in der Beschreibung, der Rücklese-Vergleich meldet das NICHT als Abweichung (Exit 0)', [r.code, a.z.c.filter(x => /&amp;/.test(x.descriptionHtml || '')).length > 0], [0, true]);
  ist('Chips: die Paare (Modus chips) bleiben unberührt', a.z.c.find(x => x.handle === 'damen-jeans').seo.title, 'Jeans online kaufen | LuxeStyle CH');
}
{
  const a = attrappe(MIX, { verfaelsche: true }), s = still(), d = dateien('t4');
  const r = await seoDublettenLauf(a.q, { modus: 'geschlecht', live: true, ...d, out: s.out, err: s.err });
  ist('Shopify speichert etwas anderes → frisch gelesen abweichend: Exit 3, nichts als geschrieben gezählt, kein Ledger', [r.code, r.geschrieben, existsSync(d.ledger)], [3, 0, false]);
}
{
  const a = attrappe(MIX, { userErrors: [{ field: ['seo'], message: 'zu lang' }] }), s = still(), d = dateien('t5');
  let msg = null; try { await seoDublettenLauf(a.q, { modus: 'geschlecht', live: true, ...d, out: s.out, err: s.err }); } catch (e) { msg = e.message; }
  ist('userError von Shopify → der Lauf wirft; die Sicherung liegt vor, kein Ledger', [typeof msg === 'string' && msg.includes('zu lang'), existsSync(d.sicherung('geschlecht')), existsSync(d.ledger)], [true, true, false]);
  const r = await seoDublettenLauf(attrappe(MIX).q, { modus: 'quatsch', ...d, out: s.out, err: s.err });
  ist('unbekannter Modus → Exit 1', r.code, 1);
  const ohneBeschr = attrappe([{ ...S('damen-a', 'Hüte online kaufen'), seo: { title: 'Hüte online kaufen', description: null } }, { ...S('herren-a', 'Hüte online kaufen'), seo: { title: 'Hüte online kaufen', description: null } }]);
  const r3 = await seoDublettenLauf(ohneBeschr.q, { modus: 'geschlecht', live: true, ...dateien('t6'), out: s.out, err: s.err });
  ist('SEO-Beschreibung leer: der Schlüssel «description» wird nicht mitgeschickt, der Titel kommt an', [r3.code, ohneBeschr.schreibend().every(x => !('description' in x.v.i.seo)), ohneBeschr.z.c[0].seo.title], [0, true, 'Hüte für Damen online kaufen | LuxeStyle CH']);
}
{
  const gross = attrappe(Array.from({ length: 7 }, (_, n) => S('x-' + n, 'T ' + n)), { seite: 3 });
  ist('alleSammlungen: liest alle Seiten (7 Sammlungen in 3 Abrufen)', [(await alleSammlungen(gross.q)).length, gross.aufrufe.length], [7, 3]);
}

// ── Modus «beschreibung» mit Attrappe: Trockenlauf, LIVE, Sicherung, Rücklesen, Rücknahme ──
const BD = [B('damen-hosen', VL('Hosen')), B('herren-hosen', VL('Hosen')), B('damen-sneaker', VL('Sneaker')), B('herren-sneaker', VL('Sneaker')), B('hosen-alle', VL('Alle Hosen')), B('lampen-a', VL('Lampen')), B('lampen-b', VL('Lampen'))];
const beschrVon = (a, h) => a.z.c.find(c => c.handle === h).seo;
{
  const a = attrappe(BD), s = still(), d = dateien('b1');
  const r = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: false, ...d, out: s.out, err: s.err });
  ist('Beschreibung Trockenlauf: Exit 0, nichts geschrieben, keine Sicherung, kein Ledger; 4 Änderungen, 1 offene Gruppe', [r.code, a.schreibend().length, existsSync(d.sicherung('beschreibung')), existsSync(d.ledger), r.beschreibung.aenderungen.length, r.beschreibung.offen.length], [0, 0, false, false, 4, 1]);
  ist('Beschreibung Trockenlauf: die Ausgabe nennt «Trockenlauf», die neue Beschreibung und die offene Gruppe', [s.zeilen.some(z => z.includes('Trockenlauf')), s.zeilen.some(z => z.includes('Hosen für Damen online kaufen.')), s.zeilen.some(z => z.includes('OFFEN') && z.includes('lampen-a'))], [true, true, true]);
}
{
  const a = attrappe(BD), s = still(), d = dateien('b2');
  const r = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, ...d, jetzt: () => new Date('2026-11-09T12:00:00Z'), out: s.out, err: s.err });
  ist('Beschreibung LIVE: Exit 0, 4 Sammlungen geschrieben und frisch zurückgelesen', [r.code, r.geschrieben, a.schreibend().length], [0, 4, 4]);
  ist('LIVE: nur die Beschreibung ändert sich, SEO-Titel und Sammlungstitel bleiben; Unbeteiligte unberührt', [beschrVon(a, 'damen-hosen'), a.z.c.find(c => c.handle === 'damen-hosen').title, beschrVon(a, 'hosen-alle'), beschrVon(a, 'lampen-a').description], [{ title: 'Titel damen-hosen', description: VL('Hosen für Damen') }, 'damen-hosen', { title: 'Titel hosen-alle', description: VL('Alle Hosen') }, VL('Lampen')]);
  ist('LIVE: jeder Aufruf sendet Titel UND Beschreibung (seo wird ersetzt)', a.schreibend().every(x => x.v.i.seo.title && x.v.i.seo.description), true);
  const sich = JSON.parse(readFileSync(d.sicherung('beschreibung'), 'utf8'));
  ist('Sicherung: alter und neuer Wert je Sammlung (Grundlage der Rücknahme)', [sich.aenderungen.length, sich.aenderungen[0]], [4, { handle: 'damen-hosen', id: 'gid://shopify/Collection/damen-hosen', alt: VL('Hosen'), neu: VL('Hosen für Damen') }]);
  ist('Ledger: eine Zeile je Sammlung mit Zeitstempel und Modus', readFileSync(d.ledger, 'utf8').split('\n').filter(Boolean).map(z => z.replace(/^\S+ · /, '')).slice(0, 2), ['beschreibung damen-hosen', 'beschreibung herren-hosen']);
  const r2 = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, ...d, out: s.out, err: s.err });
  ist('zweiter LIVE-Lauf: nichts mehr zu tun, nichts geschrieben, Sicherung unverändert', [r2.code, r2.geschrieben, a.schreibend().length, JSON.parse(readFileSync(d.sicherung('beschreibung'), 'utf8')).aenderungen.length], [0, 0, 4, 4]);
  // zweite Charge: neue Sammlungen mit gleicher Beschreibung kommen dazu; die erste Sicherung bleibt mit dem ERSTEN alten Wert
  a.z.c.push(B('damen-guertel', VL('Gürtel')), B('herren-guertel', VL('Gürtel')));
  const r3 = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, ...d, out: s.out, err: s.err });
  const sich2 = JSON.parse(readFileSync(d.sicherung('beschreibung'), 'utf8'));
  ist('zweite Charge: 2 neue Sammlungen geschrieben, die Sicherung wird ergänzt (6 Einträge), die ersten vier bleiben gleich', [r3.code, r3.geschrieben, sich2.aenderungen.length, JSON.stringify(sich2.aenderungen.slice(0, 4)) === JSON.stringify(sich.aenderungen), sich2.aenderungen[4].handle], [0, 2, 6, true, 'damen-guertel']);
}
{
  const a = attrappe(BD), s = still(), d = dateien('b3');
  const r = await seoDublettenLauf(a.q, { modus: 'beide', live: true, ...d, out: s.out, err: s.err });
  ist('Modus «beide» fasst Beschreibungen NICHT an (nur ausdrücklich «beschreibung»): nichts geschrieben, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung('beschreibung')), r.beschreibung === undefined], [0, 0, false, true]);
  const f = attrappe(BD, { verfaelsche: true }), d2 = dateien('b4');
  const rf = await seoDublettenLauf(f.q, { modus: 'beschreibung', live: true, ...d2, out: s.out, err: s.err });
  ist('Shopify speichert etwas anderes → frisch gelesen abweichend: Exit 3, nichts als geschrieben gezählt, kein Ledger', [rf.code, rf.geschrieben, existsSync(d2.ledger)], [3, 0, false]);
  const u = attrappe(BD, { userErrors: [{ field: ['seo'], message: 'zu lang' }] }), d3 = dateien('b5');
  let msg = null; try { await seoDublettenLauf(u.q, { modus: 'beschreibung', live: true, ...d3, out: s.out, err: s.err }); } catch (e) { msg = e.message; }
  ist('userError von Shopify → der Lauf wirft; die Sicherung liegt vor, kein Ledger', [typeof msg === 'string' && msg.includes('zu lang'), existsSync(d3.sicherung('beschreibung')), existsSync(d3.ledger)], [true, true, false]);
  const ohneTitel = attrappe([{ ...B('damen-x', VL('X')), seo: { title: null, description: VL('X') } }, { ...B('herren-x', VL('X')), seo: { title: null, description: VL('X') } }]), d4 = dateien('b6');
  const ro = await seoDublettenLauf(ohneTitel.q, { modus: 'beschreibung', live: true, ...d4, out: s.out, err: s.err });
  ist('kein eigener SEO-Titel: der Schlüssel «title» wird nicht mitgeschickt, die Beschreibung kommt an, Exit 0', [ro.code, ohneTitel.schreibend().every(x => !('title' in x.v.i.seo)), ohneTitel.z.c[0].seo], [0, true, { title: null, description: VL('X für Damen') }]);
}
{
  // Rücknahme
  const a = attrappe(BD), s = still(), d = dateien('r1');
  await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, ...d, out: s.out, err: s.err });
  const vorher = a.schreibend().length;
  const t = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: false, zurueck: true, ...d, out: s.out, err: s.err });
  ist('Rücknahme Trockenlauf: Exit 0, nichts geschrieben, die neuen Beschreibungen stehen weiter', [t.code, a.schreibend().length - vorher, beschrVon(a, 'damen-hosen').description], [0, 0, VL('Hosen für Damen')]);
  const z = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, zurueck: true, ...d, jetzt: () => new Date('2026-11-09T13:00:00Z'), out: s.out, err: s.err });
  ist('Rücknahme LIVE: 4 Sammlungen zurück, Beschreibungen wie vorher, SEO-Titel unverändert', [z.code, z.geschrieben, ['damen-hosen', 'herren-hosen', 'damen-sneaker', 'herren-sneaker'].map(h => beschrVon(a, h).description), beschrVon(a, 'damen-hosen').title], [0, 4, [VL('Hosen'), VL('Hosen'), VL('Sneaker'), VL('Sneaker')], 'Titel damen-hosen']);
  ist('Rücknahme: eine Ledger-Zeile je Sammlung', readFileSync(d.ledger, 'utf8').split('\n').filter(l => l.includes('beschreibung-zurueck')).length, 4);
  const z2 = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, zurueck: true, ...d, out: s.out, err: s.err });
  ist('zweite Rücknahme: nichts mehr zu tun (4 waren schon zurück), nichts geschrieben', [z2.code, z2.geschrieben, z2.schonZurueck], [0, 0, 4]);
}
{
  const a = attrappe(BD), s = still(), d = dateien('r2');
  await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, ...d, out: s.out, err: s.err });
  a.z.c.find(c => c.handle === 'damen-sneaker').seo.description = 'Fremd geändert';
  a.z.c.splice(a.z.c.findIndex(c => c.handle === 'herren-sneaker'), 1);
  const z = await seoDublettenLauf(a.q, { modus: 'beschreibung', live: true, zurueck: true, ...d, out: s.out, err: s.err });
  ist('Rücknahme: eine seither von anderer Seite geänderte Beschreibung bleibt unberührt (Exit 3), eine gelöschte Sammlung wird gemeldet, die übrigen zwei gehen zurück', [z.code, z.geschrieben, beschrVon(a, 'damen-sneaker').description, beschrVon(a, 'damen-hosen').description], [3, 2, 'Fremd geändert', VL('Hosen')]);
  ist('Rücknahme: beide Fälle stehen in der Fehlerausgabe', [s.zeilen.some(x => x.startsWith('ERR') && x.includes('damen-sneaker') && x.includes('anders geändert')), s.zeilen.some(x => x.startsWith('ERR') && x.includes('herren-sneaker') && x.includes('nicht mehr vorhanden'))], [true, true]);
  // Shopify speichert bei der Rücknahme etwas anderes: frisch gelesen abweichend → Exit 3, nichts als zurückgesetzt gezählt, keine Ledger-Zeile
  const fa = attrappe(BD, { verfaelsche: true }), dfa = dateien('r6');
  await seoDublettenLauf(fa.q, { modus: 'beschreibung', live: true, ...dfa, out: s.out, err: s.err });
  const zf = await seoDublettenLauf(fa.q, { modus: 'beschreibung', live: true, zurueck: true, ...dfa, out: s.out, err: s.err });
  ist('Rücknahme: speichert Shopify etwas anderes → frisch gelesen abweichend: Exit 3, nichts als zurückgesetzt gezählt, keine Ledger-Zeile', [zf.code, zf.geschrieben, existsSync(dfa.ledger) && readFileSync(dfa.ledger, 'utf8').includes('beschreibung-zurueck')], [3, 0, false]);
  const ohne = await seoDublettenLauf(attrappe(BD).q, { modus: 'beschreibung', live: true, zurueck: true, ...dateien('r3'), out: s.out, err: s.err });
  ist('Rücknahme ohne Sicherung → Exit 1, nichts geschrieben', ohne.code, 1);
  const a5 = attrappe(BD), d5 = dateien('r5');
  await seoDublettenLauf(a5.q, { modus: 'beschreibung', live: true, ...d5, out: s.out, err: s.err });
  const vorher5 = a5.schreibend().length;
  const andere = await seoDublettenLauf(a5.q, { modus: 'geschlecht', live: true, zurueck: true, ...d5, out: s.out, err: s.err });
  ist('ZURUECK gibt es nur mit MODUS=beschreibung → Exit 1, auch bei vorhandener Sicherung wird nichts zurückgeschrieben', [andere.code, a5.schreibend().length - vorher5, beschrVon(a5, 'damen-hosen').description], [1, 0, VL('Hosen für Damen')]);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
