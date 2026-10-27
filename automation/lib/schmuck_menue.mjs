/**
 * Menü-Umbau «Schmuck»: ersetzt NUR die Kinder des obersten Menüpunkts «Schmuck» (Link /collections/schmuck) durch die Schmuck-Taxonomie
 * (dropship/taxonomie-2610-b/bereiche/schmuck-uhren.json, gebaut in lib/bereich_taxonomie.mjs). Alles andere im Hauptmenü bleibt unverändert
 * (auch «Uhren», das ein eigener oberster Punkt ist und diesen Auftrag nicht betrifft).
 *
 * Rein, ohne Netz (getestet in schmuck_menue_test.mjs). Die Sammlungen der sechs Gruppen-Köpfe plant `gruppenPlan()` aus denselben Daten:
 * ein Kopf, der keine eigene Kategorie ist («Für Herren», «Motive» …), zeigt eine Smart-Collection mit den Tags seiner Kinder.
 *
 * Aufbau (höchstens 3 Ebenen): Schmuck (Ebene 1, bleibt) → Kopf (Ebene 2, mit Link) → Kind (Ebene 3).
 */
import { suche, tiefe } from './menue_plan.mjs';
import { KATEGORIEN } from './kategorien.mjs';
import { SCHMUCK } from './bereich_taxonomie.mjs';
import { seo } from './mode_taxonomie.mjs';

const kopie = x => JSON.parse(JSON.stringify(x));

/** Der oberste Menüpunkt, dessen Kinder ersetzt werden. */
export const PFAD = ['Schmuck'];
/** Menütitel dürfen nicht umbrechen: längere Collection-Titel werden unten in KURZ gekürzt. */
export const MAX_TITEL = 34;

/**
 * Die Äste unter «Schmuck» in der Reihenfolge des Besitzer-Auftrags (27.10.2026).
 * `kopf` = Handle der Collection, auf die der Menü-Kopf zeigt; `kinder` = Handles der Ebene 3.
 * `gruppe` (nur bei Köpfen, die KEINE eigene Kategorie sind) = Daten der Sammlung, die schmuck_gruppen.mjs anlegt (Titel wie in der Bereichsdatei).
 */
export const AESTE = [
  { titel: 'Ringe', kopf: 'sub-ringe', kinder: ['silberringe', 'edelstahl-titanringe', 'moissanit-ringe', 'edelstein-geburtsstein-ringe', 'zirkonia-strassringe', 'ringsets-stapelringe', 'verstellbare-offene-ringe'] },
  { titel: 'Ohrringe', kopf: 'sub-ohrringe', kinder: ['ohrstecker', 'ohrhaenger-tropfenohrringe', 'creolen-ohrclips', 'silber-ohrringe', 'perlen-ohrringe', 'zirkonia-strass-ohrringe'] },
  { titel: 'Halsketten & Anhänger', kopf: 'halsketten-alle', kinder: ['perlenketten', 'choker-layering-ketten', 'glieder-hiphop-ketten', 'ketten-mit-anhaenger', 'silberketten', 'edelstahl-titanketten', 'zirkonia-moissanit-ketten'] },
  { titel: 'Armbänder & Armreifen', kopf: 'sub-armbaender', kinder: ['armreifen-bangles', 'lederarmbaender', 'perlen-edelsteinarmbaender', 'gliederarmbaender', 'kupfer-magnetarmbaender', 'geflochtene-wickelarmbaender', 'silberarmbaender', 'edelstahl-titanarmbaender', 'vergoldete-armbaender', 'zirkonia-strassarmbaender'] },
  { titel: 'Für Herren', kopf: 'schmuck-herren-gruppe', kinder: ['herrenringe', 'herrenarmbaender'],
    gruppe: { titel: 'Schmuck für Herren', beschreibung: 'Herren- und Unisex-Ringe aus Edelstahl, Titan, Wolfram und Silber sowie Armbänder für Herren aus Leder, Stahl, Kupfer und Naturstein.' } },
  { titel: 'Gravur & Namen', kopf: 'schmuck-personalisiert-gruppe', kinder: ['personalisierte-ringe', 'personalisierte-armbaender', 'personalisierte-ketten'],
    gruppe: { titel: 'Personalisierter Schmuck', beschreibung: 'Ringe, Armbänder und Halsketten mit Gravur, Namen oder Buchstaben als persönliches Geschenk.' } },
  { titel: 'Motive', kopf: 'schmuck-motiv-gruppe', kinder: ['herz-schmuck', 'blumen-schmetterlingsschmuck', 'stern-mond-schmuck', 'tier-schmuck', 'gluecks-schutzschmuck', 'kreuz-schmuck'],
    gruppe: { titel: 'Schmuck nach Motiv', beschreibung: 'Schmuck mit Herz, Blumen, Schmetterling, Stern, Mond und Sonne, Tiermotiven, Kreuz sowie Glücks- und Schutzsymbolen.' } },
  { titel: 'Stile', kopf: 'schmuck-stil-gruppe', kinder: ['minimalistischer-schmuck', 'vintage-retro-schmuck', 'boho-ethno-schmuck', 'punk-gothic-schmuck', 'geometrischer-schmuck', 'korea-frankreich-oldmoney-schmuck'],
    gruppe: { titel: 'Schmuck nach Stil', beschreibung: 'Schmuck im minimalistischen, Vintage-, Retro-, Boho-, Ethno-, Punk- und Gothic-Stil, mit geometrischen Formen sowie im Korea-, Frankreich- und Old-Money-Stil.' } },
  { titel: 'Sets & Besonderes', kopf: 'schmuck-sets-gruppe', kinder: ['schmuck-sets', 'kombisets-kette-armband-ohrringe', 'broschen-pins', 'koerper-fussschmuck', 'premium-schmuck'],
    gruppe: { titel: 'Sets, Broschen & Körperschmuck', beschreibung: 'Schmuck-Sets und Kombi-Sets, Broschen und Pins sowie Körper- und Fussschmuck.' } },
  { titel: 'Zubehör', kopf: 'schmuck-zubehoer-gruppe', kinder: ['schmuck-selbermachen', 'schluessel-taschenanhaenger', 'schmuckaufbewahrung', 'sonnenbrillen-alle'],
    gruppe: { titel: 'Zubehör & Aufbewahrung', beschreibung: 'Schmuck selber machen, Schlüssel- und Taschenanhänger, Schmuckaufbewahrung und Displays sowie Sonnenbrillen.' } },
];

/** Gekürzte Menütitel (Collection-Titel über MAX_TITEL Zeichen, oder ein kürzerer Name als der Seitentitel). */
export const KURZ = {
  'korea-frankreich-oldmoney-schmuck': 'Korea, Frankreich & Old Money',
  'kombisets-kette-armband-ohrringe': 'Kette-Armband-Ohrring-Sets',
  'sonnenbrillen-alle': 'Sonnenbrillen',
};

/** Titel der vorhandenen Collections (Stand 26./27.10.2026), falls der Shop keinen liefert (Tests, Vorschau). */
export const BEKANNTE_TITEL = {
  'sub-ringe': 'Ringe', 'sub-ohrringe': 'Ohrringe', 'sub-armbaender': 'Armbänder', 'schmuck-sets': 'Schmuck-Sets', 'broschen-pins': 'Broschen & Pins',
  'koerper-fussschmuck': 'Körper- & Fussschmuck', 'schmuckaufbewahrung': 'Schmuckaufbewahrung & Displays', 'premium-schmuck': 'Premium Schmuck', 'sonnenbrillen-alle': 'Sonnenbrillen (alle)',
};

const TAXONOMIE_TITEL = Object.fromEntries(SCHMUCK.filter(k => !k.filter).map(k => [k.handle, k.titel]));
const ALLE_KATEGORIEN = [...KATEGORIEN, ...SCHMUCK];

/** Alle Handles, die der Umbau braucht (Köpfe und Kinder). */
export const alleHandles = () => [...new Set(AESTE.flatMap(a => [a.kopf, ...a.kinder]))];
/** Handles, die die Taxonomie NEU anlegt (Kategorien, nicht Unterfilter) und die im Menü vorkommen. */
export const neueHandles = () => alleHandles().filter(h => TAXONOMIE_TITEL[h]);
/** Titel für die Vorschau/Annahme, wenn die Collection im Shop (noch) fehlt. */
export const planTitel = h => AESTE.find(a => a.kopf === h)?.gruppe?.titel ?? TAXONOMIE_TITEL[h] ?? BEKANNTE_TITEL[h] ?? h;
/** Menütitel eines Kindes: gekürzte Fassung, sonst der Titel der Collection (Shop), sonst der Plan-Titel. */
export const menueTitel = (handle, shopTitel) => KURZ[handle] ?? shopTitel ?? planTitel(handle);

/** Engine-Kategorie zu einem Collection-Handle (Basis, verengt, Mode oder Schmuck); undefined bei manuellen Collections ohne Regel (premium-schmuck). */
export const kategorieVon = handle => ALLE_KATEGORIEN.find(x => x.handle === handle && !x.filter);
/** Tag, den die Mitglieder einer Collection tragen (Engine-Regel `TAG EQUALS`); null bei manuellen Collections ohne Tag (premium-schmuck). */
export const tagVon = handle => kategorieVon(handle)?.tag ?? null;

/**
 * Sammlungen der Gruppen-Köpfe: «ein Produkt trägt mindestens eines der Tags sort-<kind>» (ODER-Regel, je Kind TAG EQUALS).
 * Kinder ohne Tag (manuelle Collection premium-schmuck) können keine Regel stellen und stehen unter `ohneTag`.
 */
export function gruppenPlan() {
  return AESTE.filter(a => a.gruppe).map(a => {
    const kinder = a.kinder.map(h => ({ handle: h, tag: tagVon(h) }));
    return { handle: a.kopf, titel: a.gruppe.titel, beschreibung: a.gruppe.beschreibung, seoBeschreibung: seo(a.gruppe.titel, a.gruppe.beschreibung),
      kinder, ohneTag: kinder.filter(k => !k.tag).map(k => k.handle),
      regel: { appliedDisjunctively: true, rules: kinder.filter(k => k.tag).map(k => ({ column: 'TAG', relation: 'EQUALS', condition: k.tag })) } };
  });
}

/** Ist die Regel einer vorhandenen Collection (`ruleSet` aus Shopify) dieselbe wie die geplante (Reihenfolge egal)? */
export function gleicheRegel(ruleSet, regel) {
  if (!ruleSet || !ruleSet.rules) return false;
  const norm = rs => JSON.stringify([...rs.rules.map(r => `${r.column}|${r.relation}|${r.condition}`)].sort());
  return !!ruleSet.appliedDisjunctively === !!regel.appliedDisjunctively && norm(ruleSet) === norm(regel);
}

/**
 * @param baum   Menü-Eingabe (wie eingabeAus liefert)
 * @param gids   { handle: GID | null } der im Shop vorhandenen Collections; fehlende Kinder werden übersprungen, ein Kopf ohne Ziel entfällt samt Kindern
 * @param titel  { handle: Collection-Titel im Shop } (optional)
 * @returns {{baum: object[], log: string[], fehlend: string[]}}
 */
export function schmuckMenue(baum, gids, titel = {}) {
  const b = kopie(baum), log = [];
  const eltern = suche(b, PFAD);
  if (!eltern) { log.push(`ÜBERSPRUNGEN: oberster Punkt «${PFAD.join(' > ')}» nicht gefunden - nichts geändert`); return { baum: b, log, fehlend: [] }; }
  const neu = [];
  for (const a of AESTE) {
    const kopfId = gids[a.kopf];
    if (!kopfId) { log.push(`fehlt     ${a.kopf}: Kopf-Collection existiert nicht - Ast «${a.titel}» entfällt samt ${a.kinder.length} Kindern`); continue; }
    const kinder = [];
    for (const h of a.kinder) {
      const id = gids[h];
      if (!id) { log.push(`fehlt     ${h}: Collection existiert nicht - Eintrag übersprungen`); continue; }
      kinder.push({ title: menueTitel(h, titel[h]), type: 'COLLECTION', resourceId: id, items: [] });
    }
    neu.push({ title: a.titel, type: 'COLLECTION', resourceId: kopfId, items: kinder });
    log.push(`neu       Schmuck > ${a.titel} (${kinder.length} von ${a.kinder.length} Kindern)`);
  }
  for (const i of eltern.items) log.push(`entfernt  Schmuck > ${i.title}`);
  eltern.items = neu;
  // Gemeldet wird JEDE geplante Collection ohne Ziel, auch die Kinder eines entfallenen Astes (sie fehlen ja ebenfalls).
  return { baum: b, log, fehlend: alleHandles().filter(h => !gids[h]) };
}

/** Menübaum ohne die Kinder von «Schmuck» (zum Vergleich: alles andere muss vorher und nachher gleich sein). */
export function ohneSchmuckKinder(baum) {
  const b = kopie(baum);
  const s = suche(b, PFAD);
  if (s) s.items = [];
  return b;
}

/** Alle Einträge unter «Schmuck» als flache Liste { pfad, eintrag }. */
function eintraege(baum) {
  const s = suche(baum, PFAD), aus = [];
  (function lauf(l, pfad) { for (const i of l || []) { aus.push({ pfad: [...pfad, i.title], eintrag: i }); lauf(i.items, [...pfad, i.title]); } })(s?.items, PFAD);
  return aus;
}

/**
 * Prüfungen vor dem Schreiben (und nach dem Nachlesen): Tiefe, nur Collections, keine Dopplung, nichts anderes verändert.
 * @returns {string[]} Fehler (leer = in Ordnung)
 */
export function pruefeSchmuck(alt, neu) {
  const fehler = [];
  if (tiefe(neu) > 3) fehler.push(`Menü hätte ${tiefe(neu)} Ebenen (Shopify erlaubt 3)`);
  if (JSON.stringify(alt.map(x => x.title)) !== JSON.stringify(neu.map(x => x.title))) fehler.push('oberste Ebene verändert (Titel oder Reihenfolge)');
  const sa = suche(alt, PFAD), sn = suche(neu, PFAD);
  if (!sa || !sn) { fehler.push(`oberster Punkt «${PFAD.join(' > ')}» fehlt`); return fehler; }
  const kopf = x => JSON.stringify({ id: x.id, title: x.title, type: x.type, resourceId: x.resourceId, url: x.url, tags: x.tags });
  if (kopf(sa) !== kopf(sn)) fehler.push('der Punkt «Schmuck» selbst wurde verändert (Titel, Typ oder Ziel)');
  if (JSON.stringify(ohneSchmuckKinder(alt)) !== JSON.stringify(ohneSchmuckKinder(neu))) fehler.push('Äste ausserhalb von «Schmuck > …» verändert');
  for (const { pfad, eintrag } of eintraege(neu)) {
    if (eintrag.type !== 'COLLECTION' || !eintrag.resourceId) fehler.push(`Ziel ist keine Collection: ${pfad.join(' > ')} (${eintrag.type}${eintrag.resourceId ? '' : ', ohne resourceId'})`);
  }
  const pruefeGeschwister = (liste, pfad) => {
    const ziele = new Map(), titel = new Set();
    for (const i of liste || []) {
      if (i.resourceId) { if (ziele.has(i.resourceId)) fehler.push(`doppeltes Ziel unter «${pfad}»: ${i.title} = ${ziele.get(i.resourceId)}`); ziele.set(i.resourceId, i.title); }
      if (titel.has(i.title)) fehler.push(`doppelter Titel unter «${pfad}»: ${i.title}`); titel.add(i.title);
      if (i.resourceId && (i.items || []).some(k => k.resourceId === i.resourceId)) fehler.push(`Kopf «${i.title}» ist zugleich sein eigenes Kind`);
      pruefeGeschwister(i.items, `${pfad} > ${i.title}`);
    }
  };
  pruefeGeschwister(sn.items, PFAD.join(' > '));
  return fehler;
}

/** Menütitel, die länger als MAX_TITEL sind (Hinweis, kein Abbruch: der Titel kommt aus dem Shop). */
export const titelWarnungen = baum => eintraege(baum).filter(({ eintrag }) => eintrag.title.length > MAX_TITEL).map(({ pfad, eintrag }) => `${pfad.join(' > ')} (${eintrag.title.length} Zeichen)`);
