/**
 * Qualitäts-Tore der Modell-Fabrik. Jedes Tor ist eine reine Funktion des Plans. BLOCKER-Tore sperren das Anlegen; HINWEIS-Tore melden nur (Ergebnis «durchgefallen» heisst dort: bitte ansehen).
 * Ergebnis je Tor: 'bestanden' | 'durchgefallen' | 'ungeprueft' (z. B. Bildgrössen nicht gemessen). Ein ungeprüftes Blocker-Tor zählt NICHT als bestanden.
 */
import { htmlText, spanneText, BEHAUPTUNGEN } from './beschreibung.mjs';
import { fremdmarkenIn, HANDLE_MAX, SUFFIX, slug } from './glossar.mjs';

/** Nicht-metrische Einheiten in Kundentexten (Zoll, oz, lb, Fuss …). «dpi» ist keine Länge und bleibt erlaubt. */
export const NICHT_METRISCH = /(\bzoll\b|\binch(es)?\b|″|\boz\b|\bounces?\b|\bunzen?\b|\blbs?\b|\bpounds?\b|\bpfund\b|\bfeet\b|\bfoot\b|\bft\b|\bfuss\b|\bfuß\b|\byards?\b|\bgallons?\b)/i;
const STRICH = /[–—]/;

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
  B('modell_neu', 'Modell wird noch von keinem Shop-Produkt verkauft', !(ctx.verwendeteModelle ?? new Set()).has(plan.printfulProductId), 'Das Printful-Modell steckt schon in einem der heutigen Produkte (doppelt verkaufen vermeiden)');

  // Versand und Lieferangabe
  B('ch_rate', 'Printful-Versandrate nach CH vorhanden', plan.lieferung != null, 'keine Versandrate nach CH (Printful lieferte keine oder einen Fehler)');
  B('lieferangabe', 'Lieferangabe aus der CH-Rate mit Tagen', plan.lieferung != null && spanneText(plan.lieferung.tageMin, plan.lieferung.tageMax) != null, 'die Rate nennt keine gültige Spanne in Werktagen');

  // Varianten
  const v = plan.varianten ?? [];
  const skus = v.map((x) => x.sku);
  const kombi = v.map((x) => JSON.stringify(x.optionen));
  B('varianten', `1 bis ${maxV} Varianten, alle mit Preis, Optionskombination eindeutig`, v.length >= 1 && v.length <= maxV && (plan.preis?.fehler ?? []).length === 0 && new Set(kombi).size === kombi.length,
    v.length === 0 ? 'keine bestellbare Variante' : v.length > maxV ? `${v.length} Varianten (Grenze ${maxV})` : (plan.preis?.fehler ?? []).length ? `Preis nicht berechenbar: ${plan.preis.fehler[0]}` : 'zwei Varianten mit gleicher Optionskombination');
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
  const orig = `${ctx.originalText ?? ''} ${plan.titelEn ?? ''}`;
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
  const max = ctx.kartenMaxBytes ?? 10240;
  B('karte', `Editor-Karte höchstens ${max} Byte und mit mindestens einer bestellbaren Fläche samt Vorlage`, hatFlaeche && (plan.kompaktBytes ?? 0) <= max && plan.basisPlatzierung != null,
    !hatFlaeche ? 'keine bestellbare Fläche mit Vorlage' : (plan.kompaktBytes ?? 0) > max ? `${plan.kompaktBytes} Byte` : 'keine Basisfläche');

  // Hinweise (blockieren nicht)
  H('bestellweg', 'Bestellweg (printful_sync) bestimmt die Platzierung sicher', plan.bestellweg?.gesichert === true, `printful_sync bestimmt «${plan.bestellweg?.platzierung}» nicht gesichert (${plan.bestellweg?.grund ?? 'unbekannt'}): Aufträge blieben Entwurf bei Printful`);
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
