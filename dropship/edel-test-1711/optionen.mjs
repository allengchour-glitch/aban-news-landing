// Hilfsfunktion des Edel-Tests, getrennt von anlegen.mjs, damit der Test (anlegen_test.mjs) ohne CJ- und Shop-Bausteine läuft.
/**
 * Optionsnamen und -werte nach der Planung von Hand ersetzen (planeNeu kennt «Farbe» und «Grösse», aber nicht «Länge», und übersetzt Farben nach einer festen Tabelle).
 * `regeln`: { "<alter Optionsname>": { "name": "<neuer Name>", "werte": { "<alter Wert>": "<neuer Wert>" } } }. Jede Regel muss treffen und die Werte müssen eindeutig bleiben, sonst Fehler.
 * Rein: ändert eine Kopie der Eingabe.
 */
export function optionenErsetzen(eingabe, regeln) {
  const e = JSON.parse(JSON.stringify(eingabe));
  for (const [alt, r] of Object.entries(regeln || {})) {
    const o = (e.productOptions || []).find(x => x.name === alt);
    if (!o) throw new Error(`Option «${alt}» gibt es im Plan nicht`);
    const neuName = r.name || alt;
    if (neuName !== alt && e.productOptions.some(x => x !== o && x.name === neuName)) throw new Error(`Option «${neuName}» gibt es schon`);
    const werte = r.werte || {};
    for (const k of Object.keys(werte)) if (!o.values.some(v => v.name === k)) throw new Error(`Wert «${k}» gibt es in «${alt}» nicht`);
    for (const v of o.values) if (werte[v.name] !== undefined) v.name = werte[v.name];
    if (new Set(o.values.map(v => v.name)).size !== o.values.length) throw new Error(`Werte von «${alt}» wären nicht mehr eindeutig`);
    for (const va of e.variants) for (const ov of va.optionValues) {
      if (ov.optionName !== alt) continue;
      ov.optionName = neuName;
      if (werte[ov.name] !== undefined) ov.name = werte[ov.name];
    }
    o.name = neuName;
  }
  return e;
}
