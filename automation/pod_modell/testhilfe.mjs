// Gemeinsame Hilfen der Tests der Modell-Fabrik (kein Netz). Echte Katalogdateien liegen in dropship/selbst-gestalten-fertig-0511/werkzeuge/testdaten/katalog/.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modellkarteBauen } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';

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
/** Versandeintrag wie in versand_alle.json. */
export const versand = (usd = '10.39', min = 3, max = 6, variante = 1) => ({ variante, http: 200, raten: [{ id: 'STANDARD', rateUsd: usd, tageMin: min, tageMax: max }], fehler: null });
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
