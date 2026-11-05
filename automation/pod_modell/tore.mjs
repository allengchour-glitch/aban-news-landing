/**
 * Qualitäts-Tore der Modell-Fabrik. Jedes Tor ist eine reine Funktion des Plans. BLOCKER-Tore sperren das Anlegen; HINWEIS-Tore melden nur (Ergebnis «durchgefallen» heisst dort: bitte ansehen).
 * Ergebnis je Tor: 'bestanden' | 'durchgefallen' | 'ungeprueft' (z. B. Bildgrössen nicht gemessen). Ein ungeprüftes Blocker-Tor zählt NICHT als bestanden.
 */
import { htmlText, spanneText, BEHAUPTUNGEN } from './beschreibung.mjs';
import { fremdmarkenIn, HANDLE_MAX, SUFFIX, slug } from './glossar.mjs';

/** Nicht-metrische Einheiten in Kundentexten (Zoll, oz, lb, Fuss …). «dpi» ist keine Länge und bleibt erlaubt. */
export const NICHT_METRISCH = /(\bzoll\b|\binch(es)?\b|″|\d\s*["”]|\boz\b|\bounces?\b|\bunzen?\b|\blbs?\b|\bpounds?\b|\bpfund\b|\bfeet\b|\bfoot\b|\bft\b|\bfuss(?![a-zäöüß])|\bfuß(?![a-zäöüß])|\byards?\b|\bgallons?\b|°\s?f\b|\bfahrenheit\b|\d\s*in\b(?!\s*(?:\d|[a-zäöüß]{2,})))/i;
/** Gedankenstriche und Verwandte: Halbgeviert, Geviert, Minuszeichen, Ziffernstrich, Querstrich und der Bindestrich mit Leerzeichen davor und danach. */
const STRICH = /[–—−‒―]|\s-\s/;

const verglichenAlsText = (plan) => {
  const teile = [['Titel', plan.titel], ['Beschreibung', htmlText(plan.beschreibungHtml)], ['SEO-Titel', plan.seo?.title], ['SEO-Text', plan.seo?.description]];
  for (const o of plan.optionen ?? []) { teile.push([`Option ${o.name}`, o.name]); for (const w of o.werte) teile.push([`Wert ${o.name}`, w]); }
  for (const m of plan.medien ?? []) teile.push(['Bild-Alt-Text', m.alt]);
  return teile.filter(([, t]) => t != null && t !== '');
};

export function pruefeTore(plan, ctx = {}) {
  const tore = [];
  const add = (code, name, art, ergebnis, grund = '') => tore.push({ code, name, art, ergebnis, grund });
  const B = (code, name, ok, grund) => add(code, name, 'blocker', ok ? 'bestanden' : 'durchgefallen', ok ? '' : grund);
  const H = (code, name, ok, grund) => add(code, name, 'hinweis', ok ? 'bestanden' : 'durchgefallen', ok ? '' : grund);
  const regel = ctx.regel ?? {};
  const stufen = ctx.stufen ?? [1];
  const maxV = regel.maxVarianten ?? 100;
  const nettoMin = regel.preis?.nettoMin ?? ctx.nettoMin ?? 4;

  // Klasse und Stufe
  if (plan.stufe == null) B('klasse', 'Modell ist gestaltbar (FLACH, FLACH_MIT_HINWEIS, PANEL)', false, `Klasse ${plan.klasse}: in dieser Fabrik nicht gestaltbar`);
  else B('klasse', 'Modell ist gestaltbar (FLACH, FLACH_MIT_HINWEIS, PANEL)', stufen.includes(plan.stufe), `Klasse ${plan.klasse} gehört zu Stufe ${plan.stufe}, freigegeben ist Stufe ${stufen.join(' und ')}`);
  const selbstVerwendet = (ctx.verwendeteModelle ?? new Set()).has(plan.printfulProductId);
  const geschwisterVerwendet = Boolean(plan.familie) && (ctx.verwendeteFamilien ?? new Set()).has(plan.familie);
  B('modell_neu', 'Modell (auch in der anderen Masseinheit) wird noch von keinem Shop-Produkt verkauft', !selbstVerwendet && !geschwisterVerwendet,
    selbstVerwendet ? 'Das Printful-Modell steckt schon in einem der heutigen Produkte (doppelt verkaufen vermeiden)' : 'Dasselbe Modell in der anderen Masseinheit ((in) gegen (cm)) steckt schon in einem der heutigen Produkte: für Kunden ein doppeltes Angebot');

  // Versand und Lieferangabe
  B('ch_rate', 'Printful-Versandrate nach CH vorhanden', plan.lieferung != null, 'keine Versandrate nach CH (Printful lieferte keine oder einen Fehler)');
  const vids = new Set((plan.varianten ?? []).map((x) => x.printfulVariantId));
  B('rate_variante', 'Die Versandrate wurde für eine Variante gemessen, die im Produkt steckt', plan.lieferung == null || vids.has(plan.lieferung.ratenVariante),
    `Rate für Variante ${plan.lieferung?.ratenVariante} gemessen, die nicht zur Auswahl gehört: Preis und Lieferzeit stützen sich auf eine fremde Variante (versand_messen.mjs misst eine Variante der Auswahl)`);
  B('lieferangabe', 'Lieferzeit bestimmbar: Versandtage der CH-Rate plus Fertigung, mindestens die Shop-Angabe 7 bis 14 Werktage', plan.lieferzeit != null && spanneText(plan.lieferzeit.min, plan.lieferzeit.max) != null, 'die Rate nennt keine gültige Spanne in Werktagen');

  // Varianten
  const v = plan.varianten ?? [];
  const skus = v.map((x) => x.sku);
  const kombi = v.map((x) => JSON.stringify(x.optionen));
  const a0 = plan.auswahl ?? {};
  const grundLeer = a0.vorAuswahl > 0 && a0.bestellbar === 0 ? 'in keiner Region auf Lager (Printful)'
    : a0.bestellbar > 0 && (a0.farbenAusgelassen ?? []).length ? `alle Farben ausgelassen (${a0.farbenAusgelassen.slice(0, 3).map((x) => `${x.name}: ${x.grund}`).join('; ')}): Farbnamen im Glossar ergänzen`
    : 'keine Variante gewählt';
  B('varianten', `1 bis ${maxV} Varianten, alle mit Preis, Optionskombination eindeutig`, v.length >= 1 && v.length <= maxV && (plan.preis?.fehler ?? []).length === 0 && new Set(kombi).size === kombi.length,
    v.length === 0 ? grundLeer : v.length > maxV ? `${v.length} Varianten (Grenze ${maxV})` : (plan.preis?.fehler ?? []).length ? `Preis nicht berechenbar: ${plan.preis.fehler[0]}` : 'zwei Varianten mit gleicher Optionskombination');
  B('sku_eindeutig', 'SKUs eindeutig und im Shop noch frei', new Set(skus).size === skus.length && !skus.some((s) => (ctx.schonSkus ?? new Set()).has(s)),
    new Set(skus).size !== skus.length ? 'doppelte SKU im Plan' : `SKU schon im Shop: ${skus.find((s) => (ctx.schonSkus ?? new Set()).has(s))}`);
  const optFehler = [];
  if ((plan.optionen ?? []).length === 0 || plan.optionen.length > 3) optFehler.push(`${(plan.optionen ?? []).length} Optionen (erlaubt 1 bis 3)`);
  for (const o of plan.optionen ?? []) {
    if (new Set(o.werte).size !== o.werte.length) optFehler.push(`Option ${o.name}: doppelte Werte`);
    for (const w of o.werte) if (!String(w).trim() || String(w).length > 255) optFehler.push(`Option ${o.name}: leerer oder zu langer Wert`);
  }
  B('option_namen', 'Optionen: 1 bis 3, Werte einmalig und nicht leer', optFehler.length === 0, optFehler.join('; '));

  // Marge
  const schlecht = v.filter((x) => x.preisChf == null || x.nettoChf == null || x.nettoChf + 1e-9 < nettoMin || (x.nettoBeiMesskursChf != null && x.nettoBeiMesskursChf + 1e-9 < nettoMin) || Math.round(x.preisChf * 100) % 100 !== 90);
  B('marge', `Gewinn nach MWST, Gebühr, Ware und Versand mindestens CHF ${nettoMin.toFixed(2)} in jeder Variante, Preis auf X.90`, v.length > 0 && schlecht.length === 0,
    v.length === 0 ? 'keine Varianten' : `${schlecht.length} Variante(n) unter CHF ${nettoMin.toFixed(2)} oder ohne X.90-Preis (erste: ${schlecht[0]?.sku}, Preis ${schlecht[0]?.preisChf}, netto ${schlecht[0]?.nettoChf})`);

  // Bilder
  const minBilder = regel.bilderMin ?? 3;
  if (!ctx.bilder) add('bilder', `mindestens ${minBilder} verschiedene Bilder in lesbarer Grösse`, 'blocker', 'ungeprueft', 'Bildgrössen nicht gemessen (bilder_messen.mjs)');
  else if ((plan.bilder?.ungemessen ?? []).length) add('bilder', `mindestens ${minBilder} verschiedene Bilder in lesbarer Grösse`, 'blocker', 'ungeprueft', `${plan.bilder.ungemessen.length} Bild(er) ohne Messung`);
  else B('bilder', `mindestens ${minBilder} verschiedene Bilder in lesbarer Grösse (kürzere Seite ≥ ${regel.bildMinPx ?? 600} px)`, (plan.medien ?? []).length >= minBilder, `nur ${(plan.medien ?? []).length} lesbare Bilder (unlesbar: ${(plan.bilder?.unlesbar ?? []).length})`);

  // Titel
  const fm = plan.titel ? fremdmarkenIn(plan.titel, plan.typ) : [];
  B('titel_uebersetzt', 'Titel deutsch, ohne unbekannte Wörter und ohne Fremdmarke', plan.titel != null && (plan.titelUnbekannt ?? []).length === 0 && fm.length === 0,
    plan.titel == null ? 'kein Titel erzeugt' : (plan.titelUnbekannt ?? []).length ? `Wörter nicht im Glossar: ${plan.titelUnbekannt.join(', ')} (Glossar oder TITEL_FEST ergänzen)` : `Fremdmarke im Titel: ${fm.join(', ')}`);
  // NUR die Printful-Beschreibung zählt als Beleg, nicht der englische Katalogtitel: der enthält das Wort («Eco», «Organic») ohnehin und belegte jede Behauptung von selbst
  const orig = String(ctx.originalText ?? '');
  const unbelegt = plan.titel ? BEHAUPTUNGEN.filter((b) => b.de.test(plan.titel) && !b.en.test(orig)).map((b) => b.name) : [];
  B('titel_belegt', 'Behauptungen im Titel (Bio, Eco, recycelt …) stehen in der Printful-Beschreibung', unbelegt.length === 0, `unbelegt: ${unbelegt.join(', ')}`);
  const hOk = plan.handle != null && plan.handle.length <= HANDLE_MAX && /^[a-z0-9-]+$/.test(plan.handle) && plan.handle.endsWith(`-${slug(SUFFIX)}`) && !(ctx.schonHandles ?? new Set()).has(plan.handle);
  B('handle_frei', `Handle <slug>-selbst-gestalten, höchstens ${HANDLE_MAX} Zeichen, nur a-z 0-9 Bindestrich, im Shop frei`, hOk,
    plan.handle == null ? 'kein freier Handle (auch nicht mit Modellnummer)' : plan.handle.length > HANDLE_MAX ? `${plan.handle.length} Zeichen` : (ctx.schonHandles ?? new Set()).has(plan.handle) ? 'Handle schon vergeben' : 'Handle hat nicht das Muster');

  // Kundentexte: Einheiten und Striche
  const texte = verglichenAlsText(plan);
  const nm = texte.filter(([, t]) => NICHT_METRISCH.test(t)).map(([w, t]) => `${w}: «${(t.match(NICHT_METRISCH) || [''])[0]}»`);
  B('masse_einheiten', 'Titel, Beschreibung, Optionen und SEO ohne Zoll, oz, lb', nm.length === 0, nm.slice(0, 3).join('; '));
  const gs = texte.filter(([, t]) => STRICH.test(t)).map(([w]) => w);
  B('gedankenstrich', 'Kundentexte ohne Gedankenstriche', gs.length === 0, `Gedankenstrich in: ${[...new Set(gs)].join(', ')}`);

  // Beschreibung
  const u = plan.uebersetzung ?? { ok: false, fehler: ['keine Übersetzung'] };
  B('beschreibung_belegt', 'Beschreibung: jeder Satz mit Beleg aus der Printful-Beschreibung, keine erfundene Zahl, keine Zusage', u.ok === true, `${(u.fehler ?? []).length} Fehler, erster: ${(u.fehler ?? ['?'])[0]}`);

  // Editor-Karte
  const kp = plan.kompakt ?? { platzierungen: [] };
  const hatFlaeche = kp.platzierungen.some((p) => p.art === 'flaeche' && p.inklusive && (p.flaeche?.breite ?? 0) > 0 && (p.druck?.px?.[0] ?? 0) > 0);
  const max = ctx.kartenMaxBytes ?? 10240, maxEd = ctx.editorKartenMaxBytes ?? 24576;
  const mfGross = (plan.kompaktBytes ?? 0) > max, edGross = (plan.karteBytes ?? 0) > maxEd;
  B('karte', `Metafeld-Karte höchstens ${max} Byte, Editor-Karte samt Variantenabbildung höchstens ${maxEd} Byte, mindestens eine bestellbare Fläche samt Vorlage`, hatFlaeche && !mfGross && !edGross && plan.basisPlatzierung != null,
    !hatFlaeche ? 'keine bestellbare Fläche mit Vorlage' : mfGross ? `Metafeld-Karte ${plan.kompaktBytes} Byte` : edGross ? `Editor-Karte ${plan.karteBytes} Byte` : 'keine Basisfläche');

  // Hinweise (blockieren nicht)
  H('bestellweg', 'Bestellweg (printful_sync) bestimmt die Platzierung sicher', plan.bestellweg?.gesichert === true, `printful_sync bestimmt «${plan.bestellweg?.platzierung}» nicht gesichert (${plan.bestellweg?.grund ?? 'unbekannt'}): Aufträge blieben Entwurf bei Printful`);
  H('lieferzeit_laenger', 'Lieferzeit liegt innerhalb der Shop-Angabe 7 bis 14 Werktage', plan.lieferzeit?.quelle !== 'berechnet', `Versandtage ${plan.lieferzeit?.versandTage?.join(' bis ')} plus Fertigung ${plan.lieferzeit?.fertigung?.join(' bis ')} Werktage: die Seite nennt ${plan.lieferzeit?.min} bis ${plan.lieferzeit?.max} Werktage, länger als bei den übrigen «Selbst gestalten»-Produkten (Besitzer bestätigt)`);
  H('versand_je_groesse', 'Versand je Grösse gemessen', !((plan.kompakt?.gruppen?.length ?? 1) > 1) || ctx.versandJeVariante === true, 'verschiedene Druckdateien (Grössen) mit EINER Versandrate gerechnet: grosse Grössen können mehr kosten (Marge CHF 4 gilt für die gemessene Rate)');
  H('kategorie', 'Google- und Shopify-Kategorie bekannt', plan.kategorie != null, 'für diesen Produkttyp fehlt der Eintrag in kategorien.mjs: ohne Kategorie nimmt das Google-Schaufenster das Produkt nicht auf (vor dem Veröffentlichen ergänzen)');
  H('titel_automatisch', 'Titel von Hand geprüft (fest) statt nur nach Glossar erzeugt', plan.titelQuelle === 'fest', `Titel «${plan.titel}» nach Glossar-Regel erzeugt${plan.titelUnterscheidung ? ` (Zusatz: ${plan.titelUnterscheidung})` : ''}: lesen, bei Bedarf TITEL_FEST eintragen`);
  const ue = v.filter((x) => x.herkunft === 'ausserhalb').length;
  H('lieferherkunft', 'Alle Varianten kommen aus der EU', ue === 0, `${ue} Variante(n) nur ausserhalb der EU lieferbar: Zoll und Einfuhr-MWST für die Schweiz ungemessen`);
  add('bildinhalt', 'Printful-Bilder zeigen keine Fremdmarken oder Logos', 'hinweis', 'ungeprueft', 'nur per Sicht prüfbar: vor dem Aktivieren die Galerie ansehen');
  const fa = (plan.auswahl?.farbenAusgelassen ?? []).filter((x) => !/^Obergrenze/.test(x.grund));
  H('farben', 'Alle bestellbaren Farben übernommen', fa.length === 0, `${fa.length} Farbe(n) ausgelassen: ${fa.slice(0, 3).map((x) => `${x.name} (${x.grund})`).join('; ')}`);
  H('kostenschaetzung', 'Einkauf aus Printful-Kostenschätzung (nicht nur Katalogpreis)', v.every((x) => x.ekQuelle === 'schaetzung'), 'ohne Schätzung: Kostenboden mit Katalogpreis +26 % (Sicherheit)');
  H('groessentabelle', 'Grössentabelle vollständig übernommen', (plan.beschreibungWeggelassen ?? []).length === 0, (plan.beschreibungWeggelassen ?? []).join('; '));
  H('uebersetzung_luecken', 'Alle Aufzählungspunkte der Printful-Beschreibung übernommen', (u.nichtUebernommen ?? []).length === 0, `${(u.nichtUebernommen ?? []).length} Punkt(e) nicht übernommen: ${(u.nichtUebernommen ?? []).slice(0, 2).join(' | ')}`);
  return tore;
}
