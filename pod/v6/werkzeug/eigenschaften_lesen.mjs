/**
 * Liest die Warenkorb-Eigenschaften einer Bestellposition, die der Editor v6 (und der alte v5) schreibt: welche Druckdatei gehört zu welcher
 * Printful-Platzierung. VORSCHLAG als Ersatz für pickFiles() in automation/printful_sync.mjs; dort ändert sich nichts, bevor ein Mensch es einspielt.
 *
 * Warum nötig: pickFiles() kennt nur «vorne» und «hinten» (Schlüssel mit «Hinten»/«Back» → back, alles andere → front). Der Editor v6 schreibt je Platzierung
 * einen Schlüssel «🖼️ Druckdatei (<Platzierungs-ID>)»; «sleeve_left» würde dort als Vorderseite gedruckt.
 *
 * Schlüssel:
 *   v6  «🖼️ Druckdatei (front)», «🖼️ Druckdatei (sleeve_left)» …   Wert: https-Adresse der Druckdatei (Cloudinary)
 *   v6  «🎨 Design (front)»                                          Beschreibung für Menschen
 *   v6  «_pod_karte»   JSON {v:6, s:1, m:<Printful-Produkt>, pv:<Printful-Variante>|null, sv:"<Shopify-Variante>", pl:[Platzierungen], dt:{<ID>:<Dateityp>}, px:["BxH"], ap:<Aufpreis CHF>}
 *   v5  «Vorne · 🖼️ Druckdatei», «Hinten · 🖼️ Druckdatei», «🖼️ Druckdatei» (eine Seite)
 * Dateityp (files[].type im Printful-Auftrag): dt[ID], sonst die Platzierungs-ID (die Vorderseite heisst im Katalog «default», dt sagt es).
 */
const SCHLUESSEL_V6 = /^\u{1F5BC}️? ?Druckdatei \(([a-z0-9_]+)\)$/u;
const SCHLUESSEL_V5 = /Druckdatei|Print file/i;

/** @param {Array<{key:string,value:string}>|Record<string,string>} eigenschaften  Shopify customAttributes oder Objekt */
export function dateienAusEigenschaften(eigenschaften) {
  const paare = Array.isArray(eigenschaften) ? eigenschaften.map((a) => [a.key ?? '', a.value ?? '']) : Object.entries(eigenschaften ?? {});
  const probleme = [];
  let karte = null;
  const roh = paare.find(([k]) => k === '_pod_karte');
  if (roh) {
    try {
      const o = JSON.parse(roh[1]);
      if (o && o.v === 6 && Array.isArray(o.pl)) karte = o; else probleme.push('_pod_karte: Version oder Platzierungsliste unbekannt');
    } catch { probleme.push('_pod_karte: kein gültiges JSON'); }
  }
  const dateien = [];
  const gesehen = new Set();
  const istUrl = (w) => /^https:\/\/\S+$/.test(w);
  for (const [k, w] of paare) {
    const m = k.match(SCHLUESSEL_V6);
    if (m) {
      const id = m[1];
      if (!istUrl(w)) { probleme.push(`${id}: keine https-Adresse`); continue; }
      if (gesehen.has(id)) { probleme.push(`${id}: doppelt`); continue; }
      gesehen.add(id);
      if (karte && !karte.pl.includes(id)) probleme.push(`${id}: nicht in _pod_karte.pl`);
      dateien.push({ platzierung: id, dateiTyp: (karte && karte.dt && karte.dt[id]) || id, url: w, quelle: 'v6' });
    } else if (SCHLUESSEL_V5.test(k) && istUrl(w)) {
      const id = /Hinten|Back/i.test(k) ? 'back' : 'front';
      dateien.push({ platzierung: id, dateiTyp: id, url: w, quelle: 'v5' });
    }
  }
  if (karte) for (const id of karte.pl) if (!gesehen.has(id)) probleme.push(`${id}: in _pod_karte, aber ohne Druckdatei`);
  return { dateien, karte, probleme };
}
