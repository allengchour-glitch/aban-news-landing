// Gemeinsame Hilfen der Tests der Modell-Fabrik (kein Netz). Echte Katalogdateien liegen in dropship/selbst-gestalten-fertig-0511/werkzeuge/testdaten/katalog/.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modellkarteBauen } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { planeModell as planeEcht } from './plan.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
export const lade = (id) => JSON.parse(readFileSync(join(HIER, '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/testdaten/katalog', `${id}.json`), 'utf8'));
export const tief = (o) => JSON.parse(JSON.stringify(o));

export function neuerTest(titel) {
  const z = { ok: 0, fehl: 0 };
  const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) z.ok++; else { z.fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)?.slice(0, 500)}\n   soll: ${JSON.stringify(b)?.slice(0, 500)}`); } };
  const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
  const wirft = async (n, f, teil) => { let m = ''; try { await f(); } catch (e) { m = String(e.message); } ist(`${n} (wirft «${teil}»)`, m.includes(teil), true); };
  const ende = () => { console.log(`${titel}: ${z.ok} bestanden, ${z.fehl} fehlgeschlagen`); if (z.fehl) process.exit(1); };
  return { ist, wahr, wirft, ende, z };
}
/**
 * Versandeintrag wie in versand_alle.json. `variante: 'AUSWAHL'` heisst: die Rate gilt für die erste Variante der Auswahl des Plans (das Tor `rate_variante` verlangt eine Variante, die im Produkt steckt);
 * `planeModell` aus dieser Datei löst das auf. Mit einer Zahl bleibt es, wie es ist.
 */
export const versand = (usd = '10.39', min = 3, max = 6, variante = 'AUSWAHL') => ({ variante, http: 200, raten: [{ id: 'STANDARD', rateUsd: usd, tageMin: min, tageMax: max }], fehler: null });
/** Wie plan.planeModell, löst aber `versand.variante === 'AUSWAHL'` auf die erste Variante der Auswahl auf (Auswahl zuerst ohne Rate berechnen). */
export function planeModell(eingabe, opt) {
  const v = eingabe.versand;
  if (v && v.variante === 'AUSWAHL') {
    const vor = planeEcht({ ...eingabe, versand: null }, opt);
    return planeEcht({ ...eingabe, versand: { ...v, variante: vor.varianten?.[0]?.printfulVariantId ?? null } }, opt);
  }
  return planeEcht(eingabe, opt);
}
/** Der Versandeintrag mit der aufgelösten Variante für ein Modell (für Tests, die eine Versanddatei schreiben). */
export function versandAufgeloest(katalog, v = versand(), opt = { jetzt: 'x', stufen: [1, 2] }) {
  const vor = planeEcht({ katalog, versand: null }, opt);
  return { ...v, variante: v.variante === 'AUSWAHL' ? (vor.varianten?.[0]?.printfulVariantId ?? null) : v.variante };
}
/** Test-Übersetzung: erster Absatz der Printful-Beschreibung als «deutscher» Satz mit sich selbst als Beleg (prüft die Mechanik, nicht die Sprache). */
export function testUebersetzung(katalog) {
  const k = modellkarteBauen(katalog);
  const absatz = k.beschreibung.original.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('•'))[0];
  return { u: { intro: [{ de: absatz.replace(/[–—]/g, ','), beleg: absatz }], punkte: [] }, fehler: null };
}
/** Bildgrössen für alle Bild-Adressen eines Katalogs (700×1000). */
export function bilderFuer(katalog, w = 700, h = 1000) {
  const m = {}; if (katalog.produkt?.image) m[katalog.produkt.image] = { w, h };
  for (const v of katalog.varianten ?? []) if (v.image) m[v.image] = { w, h };
  return m;
}
