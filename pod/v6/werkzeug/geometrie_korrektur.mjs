/**
 * Gemessene Korrektur der Druckfläche je Modell und Platzierung (Vorlagenpixel).
 *
 * Printfuls Mockup-Generator rechnet bei einzelnen Modellen mit einer leicht anderen Druckfläche als GET /mockup-generator/templates
 * (T-Shirt 71: Design 6 bis 8 mm höher; 586: 2 bis 5 mm tiefer und rund 1,4 % grösser; 456: gleich). Die Tabelle geometrie_korrektur.json
 * hält die gemessene wirksame Fläche fest; hier wird sie auf die Modellkarte angewendet. Es ändert sich NUR die Ansicht
 * (Bühne und «Auf dem Produkt»); die Druckdatei bleibt auf die Druckfläche normiert, ihre Pixel und das 3:4 bleiben gleich.
 *
 * Schutz: weicht die Fläche im Katalog von der gemessenen Ausgangsfläche ab, wird NICHT korrigiert und nicht still weitergebaut,
 * sondern abgebrochen (GEOMETRIE_KORREKTUR_VERALTET): die Messung gilt dann nicht mehr.
 */
import { readFileSync } from 'node:fs';

const TABELLE = JSON.parse(readFileSync(new URL('./geometrie_korrektur.json', import.meta.url), 'utf8'));
const FELDER = [['links', 'flaecheLinks'], ['oben', 'flaecheOben'], ['breite', 'flaecheBreite'], ['hoehe', 'flaecheHoehe']];

export function korrekturTabelle() { return TABELLE; }

/** Korrektur für Modell und Platzierung oder null. */
export function korrekturFuer(modellId, platzierungId, tabelle = TABELLE) {
  return tabelle?.modelle?.[String(modellId)]?.[String(platzierungId)] ?? null;
}

/** Eine Vorlage korrigieren (Kopie). Bricht ab, wenn die Ausgangsfläche nicht der Messung entspricht. */
export function korrigiereVorlage(modellId, platzierungId, vorlage, tabelle = TABELLE) {
  const k = korrekturFuer(modellId, platzierungId, tabelle);
  if (!k || !vorlage) return vorlage;
  for (const [kurz, lang] of FELDER) {
    if (Number(vorlage[lang]) !== Number(k.katalog[kurz])) {
      throw new Error(`GEOMETRIE_KORREKTUR_VERALTET: Modell ${modellId} ${platzierungId}: ${lang} ist ${vorlage[lang]}, gemessen wurde mit ${k.katalog[kurz]}; neu messen (dropship/tshirt-nachmessung-0811)`);
    }
  }
  const neu = { ...vorlage };
  for (const [kurz, lang] of FELDER) neu[lang] = k.wirksam[kurz];
  const tw = Number(neu.vorlageBreite), th = Number(neu.vorlageHoehe);
  if (!(neu.flaecheLinks >= 0 && neu.flaecheOben >= 0 && neu.flaecheLinks + neu.flaecheBreite <= tw && neu.flaecheOben + neu.flaecheHoehe <= th)) {
    throw new Error(`GEOMETRIE_KORREKTUR_UNGUELTIG: Modell ${modellId} ${platzierungId}: die korrigierte Fläche liegt ausserhalb der Vorlage`);
  }
  return neu;
}

function korrigiereEineKarteJson(id, m, tabelle) {
  if (!tabelle?.modelle?.[String(id)] || !Array.isArray(m?.platzierungen)) return m;
  return { ...m, platzierungen: m.platzierungen.map((p) => (korrekturFuer(id, p.id, tabelle) ? { ...p, vorlage: korrigiereVorlage(id, p.id, p.vorlage, tabelle) } : p)) };
}

/** Eine fertige Karte (Einzelkarte oder Kartenbündel mit modelle{}) korrigieren, z. B. nach dem Zuschneiden im Rollout-Bau (Kopie). */
export function korrigiereKartenJson(karte, tabelle = TABELLE) {
  if (karte?.modelle && typeof karte.modelle === 'object') {
    const modelle = {};
    for (const [id, m] of Object.entries(karte.modelle)) modelle[id] = korrigiereEineKarteJson(id, m, tabelle);
    return { ...karte, modelle };
  }
  return korrigiereEineKarteJson(karte?.printfulProductId, karte, tabelle);
}

/** Fertige Vorschaudaten (modelle{id:{vorlagen:{platzierung:{fl,fo,fb,fh}}}}) korrigieren (Kopie). Gleiche Schutzprüfung wie bei der Karte. */
export function korrigiereVorschauJson(vorschau, tabelle = TABELLE) {
  if (!vorschau?.modelle) return vorschau;
  const modelle = {};
  for (const [id, m] of Object.entries(vorschau.modelle)) {
    if (!tabelle?.modelle?.[String(id)] || !m?.vorlagen) { modelle[id] = m; continue; }
    const vorlagen = { ...m.vorlagen };
    for (const [pid, v] of Object.entries(m.vorlagen)) {
      const k = korrekturFuer(id, pid, tabelle);
      if (!k || !v) continue;
      for (const [kurz, lang] of [['links', 'fl'], ['oben', 'fo'], ['breite', 'fb'], ['hoehe', 'fh']]) {
        if (Number(v[lang]) !== Number(k.katalog[kurz])) throw new Error(`GEOMETRIE_KORREKTUR_VERALTET: Vorschau Modell ${id} ${pid}: ${lang} ist ${v[lang]}, gemessen wurde mit ${k.katalog[kurz]}; neu messen`);
      }
      const neu = { ...v, fl: k.wirksam.links, fo: k.wirksam.oben, fb: k.wirksam.breite, fh: k.wirksam.hoehe };
      if (!(neu.fl >= 0 && neu.fo >= 0 && neu.fl + neu.fb <= Number(v.tw) && neu.fo + neu.fh <= Number(v.th))) throw new Error(`GEOMETRIE_KORREKTUR_UNGUELTIG: Vorschau Modell ${id} ${pid}: ausserhalb der Vorlage`);
      vorlagen[pid] = neu;
    }
    modelle[id] = { ...m, vorlagen };
  }
  return { ...vorschau, modelle };
}

/** Die Modellkarte (modellkarteBauen) mit korrigierten Flächen zurückgeben (Kopie; ohne Eintrag in der Tabelle dieselbe Karte). */
export function korrigiereModellkarte(karte, tabelle = TABELLE) {
  const id = karte?.printfulProductId;
  if (!tabelle?.modelle?.[String(id)]) return karte;
  const platzierungen = karte.platzierungen.map((p) => {
    if (!korrekturFuer(id, p.id, tabelle)) return p;
    if ((p.geometrien?.length ?? 0) > 1) throw new Error(`GEOMETRIE_KORREKTUR_UNGUELTIG: Modell ${id} ${p.id}: mehrere Geometrien, nicht gemessen`);
    return { ...p, vorlage: korrigiereVorlage(id, p.id, p.vorlage, tabelle) };
  });
  return { ...karte, platzierungen };
}
