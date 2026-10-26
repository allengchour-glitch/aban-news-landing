/**
 * «Verengte» Kategorien: bestehende Titel-Regel-Collections (Menü-Seiten), die Fremdkörper enthielten, werden auf Tags umgestellt —
 * mit der alten Titel-Regel ALS Grundlage und gezielten Ausschlüssen (Google-Kategorie-Präfixe, Titelmuster).
 *
 * WARUM (26.10.2026): «Handyhüllen & Cases» zeigte Hundehalsbänder und Spielkonsolen-Zubehör («Schutzhülle für …»), «Velo & Radsport» eine
 * Hundeleine, «Reise & Outdoor» Lautsprecher. Die alte Regel «Titel enthält …» kennt weder Wortgrenzen noch Themen. Die Ausschlüsse sind
 * DATEN (kategorien_verengt_daten.json), von Agenten je Collection vorgeschlagen und mit `kategorie_regel_probe.mjs` gemessen — nicht geraten.
 *
 * Eintrag: { handle, titel, ruleSet, ausschlussG: [Google-Präfixe], ausschlussTitel: 'Regex-Quelltext (i)', nurG: [Google-Präfixe], min }
 * Die Kategorie-Objekte passen zum Format von kategorien.mjs (`bestehend: true`: Collection-Handle bleibt, Menü bleibt).
 */
import { readFileSync, existsSync } from 'node:fs';
import { passtRegelmenge } from './regel_auswerten.mjs';

const DATEI = new URL('./kategorien_verengt_daten.json', import.meta.url);

/** Reiner Kern: passt dieses Produkt in den Eintrag? */
export function verengtPasst(d, p) {
  if (passtRegelmenge(d.ruleSet, p) !== true) return false;
  const g = p.g || '';
  if ((d.ausschlussG || []).some(x => g.startsWith(x))) return false;
  if ((d.nurG || []).length && !d.nurG.some(x => g.startsWith(x))) return false;
  if (d.ausschlussTitel && new RegExp(d.ausschlussTitel, 'i').test(p.title || '')) return false;
  return true;
}

export function baueVerengt(daten) {
  return (daten || []).map(d => ({
    id: `v-${d.handle}`, handle: d.handle, titel: d.titel, tag: `sort-${d.handle}`, min: d.min ?? 5, bestehend: true, verengt: true,
    passt: p => verengtPasst(d, p),
  }));
}

export const VERENGT_DATEN = existsSync(DATEI) ? JSON.parse(readFileSync(DATEI, 'utf8')) : [];
export const VERENGT = baueVerengt(VERENGT_DATEN);
