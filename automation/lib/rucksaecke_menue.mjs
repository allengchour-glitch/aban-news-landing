/**
 * Menü-Umbau «Rucksäcke»: ersetzt im Ast «Taschen & Rucksäcke» die drei Rucksack-Einträge «Sport- & Wanderrucksäcke», «Schulrucksäcke» und «Rucksäcke» durch drei Köpfe mit der neuen
 * Rucksack-Taxonomie (dropship/taxonomie-2610-b/bereiche/rucksaecke.json, gebaut in lib/bereich_taxonomie.mjs):
 *   Rucksäcke (rucksaecke, alle) > die 7 Kategorien «Nach Einsatz» · Spezial-Rucksäcke (Gruppen-Sammlung) > 3 · Material & Ausstattung (Gruppen-Sammlung) > 4.
 * Dazu zeigt der Eintrag «Laptop- & Business-Rucksäcke» unter «Elektronik > Büro & Home Office» (heute rucksaecke-laptop, 194 Produkte) auf die neue Kategorie
 * laptop-business-rucksaecke (640). Alles andere im Hauptmenü bleibt unverändert, auch «Sport & Party > Rucksäcke» und die Damen-/Herren-Taschen.
 *
 * Höchstens 3 Ebenen: Taschen & Rucksäcke (Ebene 1, bleibt) > Kopf (2) > Kind (3). Darum ist «Nach Einsatz» kein eigener Kopf mit Kindern darunter,
 * sondern der Kopf «Rucksäcke» selbst trägt die sieben Einsatz-Kategorien (die Gruppen-Sammlung rucksaecke-einsatz-gruppe wird nicht gebraucht und nicht angelegt).
 * Die alten Collections rucksaecke-sport, rucksaecke-schule und rucksaecke-laptop bleiben im Shop bestehen (Adressen laufen weiter), nur ihr Menüplatz entfällt.
 *
 * Rein, ohne Netz (getestet in rucksaecke_menue_test.mjs).
 */
import { suche, tiefe, gleicheZiele, ziel } from './menue_plan.mjs';
import { baueBereich } from './bereich_taxonomie.mjs';
import { seo } from './mode_taxonomie.mjs';

const kopie = x => JSON.parse(JSON.stringify(x));

/** Der Ast, dessen Kinder umgebaut werden. */
export const PFAD = ['Taschen & Rucksäcke'];
/** Menütitel dürfen nicht umbrechen: längere Collection-Titel werden unten in KURZ gekürzt. */
export const MAX_TITEL = 34;
/** Die drei Gruppen der Bereichsdatei (Präfix der Engine-ids: r-). */
export const RUCKSACK_GRUPPEN = ['rucksaecke-einsatz-gruppe', 'rucksaecke-spezial-gruppe', 'rucksaecke-material-gruppe'];
export const PRAEFIX = 'r-';

/** Die Köpfe unter «Taschen & Rucksäcke», in dieser Reihenfolge. `gruppe` (nur bei Köpfen ohne eigene Kategorie) = Daten der Sammlung, die rucksaecke_gruppen.mjs anlegt. */
export const AESTE = [
  { titel: 'Rucksäcke', kopf: 'rucksaecke', kinder: ['laptop-business-rucksaecke', 'schul-studentenrucksaecke', 'wander-outdoor-rucksaecke', 'reise-rucksaecke', 'velo-lauf-trinkrucksaecke', 'freizeit-sportrucksaecke', 'kinder-wickelrucksaecke'] },
  { titel: 'Spezial-Rucksäcke', kopf: 'rucksaecke-spezial-gruppe', kinder: ['taktische-tarn-rucksaecke', 'foto-drohnen-rucksaecke', 'rucksaecke-motorrad'],
    gruppe: { titel: 'Spezial-Rucksäcke', beschreibung: 'Taktische und Tarn-Rucksäcke, Foto- und Drohnenrucksäcke sowie Motorrad-Rucksäcke.' } },
  { titel: 'Material & Ausstattung', kopf: 'rucksaecke-material-gruppe', kinder: ['leder-kunstleder-rucksaecke', 'canvas-vintage-rucksaecke', 'usb-lade-rucksaecke', 'wasserdichte-rucksaecke'],
    gruppe: { titel: 'Rucksäcke nach Material & Ausstattung', beschreibung: 'Rucksäcke aus Leder und Kunstleder, Canvas-Rucksäcke im Retro- und Vintage-Stil, Rucksäcke mit USB-Ladefunktion sowie wasserdichte Rucksäcke.' } },
];

/** Die Menü-Einträge, die durch die Köpfe ersetzt werden (Collection-Handles; das erste Vorkommen bestimmt die Stelle). */
export const ERSETZT = ['rucksaecke-sport', 'rucksaecke-schule', 'rucksaecke'];
/** Ersetzt wird auch ein früher schon eingesetzter Kopf (Wiederholbarkeit: ein zweiter Lauf auf dem umgebauten Menü ergibt denselben Baum, keine doppelten Köpfe). */
export const ERSETZT_ALLE = [...new Set([...ERSETZT, ...AESTE.map(a => a.kopf)])];
const istErsetzt = i => ERSETZT_ALLE.includes(handleVon(i));
/** Der Eintrag ausserhalb des Astes, der auf die neue Kategorie umgehängt wird: alter Handle → neuer Handle (Titel, Platz und Geschwister bleiben). */
export const UMHAENGEN = { 'rucksaecke-laptop': 'laptop-business-rucksaecke' };

/** Gekürzte Menütitel (Collection-Titel über MAX_TITEL Zeichen). */
export const KURZ = { 'canvas-vintage-rucksaecke': 'Canvas, Retro & Vintage' };
/** Titel der Plan-Collections, falls der Shop keinen liefert (Tests, Vorschau): der Titel aus der Bereichsdatei, für vorhandene Collections der bekannte. */
export const BEKANNTE_TITEL = { rucksaecke: 'Rucksäcke' };

export const RUCKSAECKE = baueBereich({ datei: 'rucksaecke', gruppen: RUCKSACK_GRUPPEN, praefix: PRAEFIX });
const TAXONOMIE_TITEL = Object.fromEntries(RUCKSAECKE.filter(k => !k.filter).map(k => [k.handle, k.titel]));

/** Alle Handles, die der Umbau als Ziel braucht (Köpfe und Kinder). */
export const alleHandles = () => [...new Set(AESTE.flatMap(a => [a.kopf, ...a.kinder]))];
/** Handles, die die Taxonomie NEU anlegt (Kategorien, nicht Unterfilter) und die im Menü vorkommen. */
export const neueHandles = () => alleHandles().filter(h => TAXONOMIE_TITEL[h]);
export const planTitel = h => AESTE.find(a => a.kopf === h)?.gruppe?.titel ?? TAXONOMIE_TITEL[h] ?? BEKANNTE_TITEL[h] ?? h;
/** Menütitel eines Kindes: gekürzte Fassung, sonst der Titel der Collection (Shop), sonst der Plan-Titel. */
export const menueTitel = (handle, shopTitel) => KURZ[handle] ?? shopTitel ?? planTitel(handle);

/** Engine-Kategorie zu einem Collection-Handle (nur die neuen Rucksack-Kategorien); undefined bei vorhandenen Collections wie rucksaecke. */
export const kategorieVon = handle => RUCKSAECKE.find(x => x.handle === handle && !x.filter);
/** Tag, den die Mitglieder einer Collection tragen (`TAG EQUALS`); null, wenn die Collection nicht aus der Taxonomie stammt. */
export const tagVon = handle => kategorieVon(handle)?.tag ?? null;

/**
 * Sammlungen der Gruppen-Köpfe: «ein Produkt trägt mindestens eines der Tags sort-<kind>» (ODER-Regel, je Kind TAG EQUALS).
 * Wie schmuck_menue.gruppenPlan(); Form: { handle, titel, beschreibung, seoBeschreibung, kinder:[{handle,tag}], ohneTag, regel }.
 */
export function gruppenPlan() {
  return AESTE.filter(a => a.gruppe).map(a => {
    const kinder = a.kinder.map(h => ({ handle: h, tag: tagVon(h) }));
    return { handle: a.kopf, titel: a.gruppe.titel, beschreibung: a.gruppe.beschreibung, seoBeschreibung: seo(a.gruppe.titel, a.gruppe.beschreibung),
      kinder, ohneTag: kinder.filter(k => !k.tag).map(k => k.handle),
      regel: { appliedDisjunctively: true, rules: kinder.filter(k => k.tag).map(k => ({ column: 'TAG', relation: 'EQUALS', condition: k.tag })) } };
  });
}

/** Der Collection-Handle hinter einem Menüeintrag (aus der Adresse `/collections/<handle>`, mit oder ohne Sprachpräfix), sonst null. */
export function handleVon(eintrag) {
  const m = /\/collections\/([a-z0-9-]+)(?:[/?#]|$)/i.exec(String(eintrag?.url || ''));
  return m ? m[1].toLowerCase() : null;
}

/**
 * @param baum   Menü-Eingabe (wie eingabeAus liefert)
 * @param gids   { handle: GID | null } der im Shop vorhandenen Collections; ein fehlendes Kind wird übersprungen, ein Kopf ohne Ziel entfällt samt Kindern
 * @param titel  { handle: Collection-Titel im Shop } (optional)
 * @returns {{baum: object[], log: string[], fehlend: string[]}}
 */
export function rucksackMenue(baum, gids, titel = {}) {
  const b = kopie(baum), log = [];
  const eltern = suche(b, PFAD);
  if (!eltern) { log.push(`ÜBERSPRUNGEN: oberster Punkt «${PFAD.join(' > ')}» nicht gefunden - nichts geändert`); return { baum: b, log, fehlend: [] }; }
  // Köpfe bauen
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
    log.push(`neu       ${PFAD.join(' > ')} > ${a.titel} (${kinder.length} von ${a.kinder.length} Kindern)`);
  }
  // Die drei alten Einträge entfernen, die Köpfe an die Stelle des ersten setzen
  const weg = eltern.items.map((i, n) => ({ i, n })).filter(({ i }) => istErsetzt(i));
  if (weg.length !== ERSETZT.length) log.push(`HINWEIS: ${weg.length} von ${ERSETZT.length} zu ersetzenden Einträgen gefunden (${weg.map(({ i }) => handleVon(i)).join(', ') || 'keiner'})`);
  const stelle = weg.length ? weg[0].n : eltern.items.length;
  for (const { i } of weg) log.push(`entfernt  ${PFAD.join(' > ')} > ${i.title} (${handleVon(i)})`);
  const rest = eltern.items.filter(i => !istErsetzt(i));
  const davor = rest.filter(i => eltern.items.indexOf(i) < stelle).length;
  eltern.items = [...rest.slice(0, davor), ...neu, ...rest.slice(davor)];
  umhaengenAn(b, gids, log);
  return { baum: b, log, fehlend: alleHandles().filter(h => !gids[h]) };
}

/** Hängt Einträge an jeder Stelle des Menüs um (UMHAENGEN): Ziel wird die GID des neuen Handles, die Adresse entfällt, Titel und Platz bleiben. Ändert `b` an Ort und Stelle. */
export function umhaengenAn(b, gids, log = []) {
  (function lauf(liste, pfad) { for (const i of liste) {
    const h = handleVon(i), neuH = UMHAENGEN[h];
    if (neuH && gids[neuH]) { i.resourceId = gids[neuH]; delete i.url; log.push(`umgehängt ${[...pfad, i.title].join(' > ')}: ${h} -> ${neuH}`); }
    else if (neuH) log.push(`fehlt     ${neuH}: Eintrag ${[...pfad, i.title].join(' > ')} bleibt auf ${h}`);
    lauf(i.items || [], [...pfad, i.title]);
  } })(b, []);
  return b;
}

/** Die Kinder von «Taschen & Rucksäcke» ohne die Köpfe und ohne die ersetzten Einträge (zum Vergleich: alles andere muss vorher und nachher gleich sein). */
export function ohneRucksackEintraege(baum) {
  const b = kopie(baum), e = suche(b, PFAD), kopfTitel = AESTE.map(a => a.titel);
  if (e) e.items = e.items.filter(i => !kopfTitel.includes(i.title) && !istErsetzt(i));
  return b;
}

/** Alle Einträge unter «Taschen & Rucksäcke» als flache Liste { pfad, eintrag }. */
function eintraege(baum) {
  const s = suche(baum, PFAD), aus = [];
  (function lauf(l, pfad) { for (const i of l || []) { aus.push({ pfad: [...pfad, i.title], eintrag: i }); lauf(i.items, [...pfad, i.title]); } })(s?.items, PFAD);
  return aus;
}

/**
 * Prüfungen vor dem Schreiben UND nach dem Nachlesen: Tiefe, nur Collections, keine Dopplung, nichts anderes verändert.
 * `alt` = Menü vor dem Umbau, `neu` = Baum, der geschrieben wird (bzw. zurückgelesen wurde). Mit `nachlesen: true` dürfen Ids und Adress-Format abweichen
 * (ein Eintrag zählt über Titel, Typ und Ziel). `gids` (handle → GID) braucht die Prüfung, um den umgehängten Eintrag und die Köpfe zu erkennen.
 * @returns {string[]} Fehler (leer = in Ordnung)
 */
export function pruefeRucksack(alt, neu, gids, { nachlesen = false } = {}) {
  const fehler = [];
  if (tiefe(neu) > 3) fehler.push(`Menü hätte ${tiefe(neu)} Ebenen (Shopify erlaubt 3)`);
  if (JSON.stringify(alt.map(x => x.title)) !== JSON.stringify(neu.map(x => x.title))) fehler.push('oberste Ebene verändert (Titel oder Reihenfolge)');
  const sa = suche(alt, PFAD), sn = suche(neu, PFAD);
  if (!sa || !sn) { fehler.push(`oberster Punkt «${PFAD.join(' > ')}» fehlt`); return fehler; }
  const kopf = x => JSON.stringify(nachlesen ? { title: x.title, type: x.type, ziel: ziel(x), tags: x.tags || [] } : { id: x.id, title: x.title, type: x.type, resourceId: x.resourceId, url: x.url, tags: x.tags });
  if (kopf(sa) !== kopf(sn)) fehler.push(`der Punkt «${PFAD.join(' > ')}» selbst wurde verändert (Titel, Typ oder Ziel)`);

  // Was ersetzt wird, muss dem Plan entsprechen (Prüfung 28.10.2026): je Handle höchstens ein Eintrag, und nur die Kinder des Plans dürfen unter einem ersetzten Eintrag hängen.
  // Sonst würde ein zusätzlicher Link auf /collections/rucksaecke oder ein von Hand ergänzter Unterpunkt ohne Meldung verschwinden.
  const weg = sa.items.filter(istErsetzt);
  for (const h of ERSETZT_ALLE) {
    const l = weg.filter(i => handleVon(i) === h);
    if (l.length > 1) fehler.push(`mehrere Einträge für ${h} im Ast (${l.map(i => `«${i.title}»`).join(', ')}): nichts geändert, bitte von Hand klären`);
  }
  for (const i of weg) {
    const plan = AESTE.find(x => x.kopf === handleVon(i));
    const erlaubt = new Set(plan ? plan.kinder.map(h => gids[h]).filter(Boolean) : []);
    const fremde = (i.items || []).filter(k => !erlaubt.has(ziel(k)));
    if (fremde.length) fehler.push(`«${i.title}» hat Unterpunkte, die der Umbau entfernen würde: ${fremde.map(k => `«${k.title}»`).join(', ')}`);
  }

  // Erwartung für alles ausserhalb der Köpfe: das alte Menü, nur mit dem umgehängten Eintrag
  const erwartet = umhaengenAn(kopie(alt), gids);
  const vgl = (a, b) => nachlesen ? gleicheZiele(a, b) : { gleich: JSON.stringify(a) === JSON.stringify(b), abweichungen: [] };
  const aussen = vgl(ohneRucksackEintraege(erwartet), ohneRucksackEintraege(neu));
  if (!aussen.gleich) fehler.push('Einträge ausserhalb der Rucksack-Köpfe verändert' + (aussen.abweichungen.length ? `: ${aussen.abweichungen.slice(0, 3).map(a => `${a.pfad} (${a.gesendet ?? 'fehlt'} ↔ ${a.zurueck ?? 'fehlt'})`).join('; ')}` : ''));

  // Die Köpfe selbst: Titel, Ziel und Kinder wie geplant
  const kopfTitel = AESTE.map(a => a.titel);
  // Ein alter Eintrag (Sport-/Schulrucksäcke …) darf nach dem Umbau nicht mehr im Ast stehen; der Vergleich «ausserhalb» lässt ihn bewusst aus, darum hier eigens.
  const altGeblieben = sn.items.filter(i => istErsetzt(i) && !kopfTitel.includes(i.title));
  if (altGeblieben.length) fehler.push(`alter Eintrag steht noch im Ast: ${altGeblieben.map(i => `«${i.title}» (${handleVon(i)})`).join(', ')}`);
  const vorhanden = sn.items.filter(i => kopfTitel.includes(i.title));
  if (JSON.stringify(vorhanden.map(i => i.title)) !== JSON.stringify(kopfTitel.filter(t => vorhanden.some(i => i.title === t)))) fehler.push('Reihenfolge der Rucksack-Köpfe weicht vom Plan ab');
  for (const a of AESTE) {
    const k = vorhanden.find(i => i.title === a.titel);
    if (!k) { if (gids[a.kopf]) fehler.push(`Kopf «${a.titel}» fehlt im Ast, obwohl seine Collection da ist`); continue; } // fehlt auch die Collection, meldet das `fehlend` des Umbaus
    if (gids[a.kopf] && ziel(k) !== gids[a.kopf]) fehler.push(`Kopf «${a.titel}» zeigt nicht auf ${a.kopf}`);
    const soll = a.kinder.filter(h => gids[h]).map(h => gids[h]);
    if (JSON.stringify((k.items || []).map(ziel)) !== JSON.stringify(soll)) fehler.push(`Kinder von «${a.titel}» weichen vom Plan ab`);
  }
  // Nur die Köpfe und ihre Kinder müssen Collections sein; ein vorhandener Link im Ast (z. B. ein HTTP-Eintrag) ist nicht Sache dieses Umbaus.
  for (const k of vorhanden) for (const eintrag of [k, ...(k.items || [])]) {
    if (eintrag.type !== 'COLLECTION' || !eintrag.resourceId) fehler.push(`Ziel ist keine Collection: ${PFAD.join(' > ')} > ${k.title}${eintrag === k ? '' : ' > ' + eintrag.title} (${eintrag.type}${eintrag.resourceId ? '' : ', ohne resourceId'})`);
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
