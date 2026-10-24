/**
 * Darf das Metafeld `mm-google-shopping.excluded_destination` weg?
 *
 * WARUM ES DIESE ENTSCHEIDUNG BRAUCHT (gemessen 2026-10-24):
 * Der Bericht vom 17.10. nannte „70,3 % der Stichprobe von Google Shopping ausgeschlossen" und
 * liess die Ursache offen. Nachgemessen ist es KEIN bewusster Ausschluss, sondern EINE Charge:
 *   - Alle 1368 Fortura-Metafelder und 123 von 124 CJ-Metafeldern wurden am **17.08.2026**
 *     angelegt — ein einziges Datum, quer über Produkte aus Mai, Juni und Juli.
 *   - Der Wert ist IMMER genau `["Shopping_ads"]`, nie etwas anderes.
 *   - Kein Skript im Repo schreibt das Feld (nur `gmc_audit.mjs` liest es).
 *   - **Die Gegenprobe, die es entscheidet:** das Feld deckt sich nicht mit der Wirklichkeit.
 *     Fortura 884 ausgeschlossen/nicht auf Google, aber 484 ausgeschlossen/**doch** auf Google
 *     und 709 ohne Feld/nicht auf Google. Bei der CJ-Ware sind **124 von 124** „ausgeschlossenen"
 *     Produkte auf dem Google-Kanal. Ein Ausschluss, der für kein Produkt gilt, ist kein Entscheid.
 *
 * EHRLICHE GRENZE: WER die Charge geschrieben hat, sagt die API nicht (kein Audit-Log). Belegt
 * ist nur, dass es eine Charge war und dass sie nichts bewirkt.
 *
 * DARUM IST DIE REGEL ENG: nur der eine bekannte Chargen-Wert darf weg. Steht etwas anderes
 * drin, hat jemand wirklich entschieden — dann bleibt es stehen und der Lauf sagt es.
 */

export const NAMESPACE = 'mm-google-shopping';
export const KEY = 'excluded_destination';

/** Der Wert, den die Charge vom 17.08.2026 geschrieben hat — und nur dieser. */
export const CHARGEN_WERT = ['Shopping_ads'];

/**
 * @param {{namespace?:string, key?:string, value?:string}|null|undefined} mf
 * @returns {{weg: boolean, grund: string}} — `grund` ist immer gefüllt, auch bei weg:false
 *   (ein stummer Skip sieht aus wie „keine Daten").
 */
export function darfWeg(mf) {
  if (!mf) return { weg: false, grund: 'kein Metafeld' };
  if (mf.namespace !== undefined && mf.namespace !== NAMESPACE)
    return { weg: false, grund: `fremder Namensraum: ${mf.namespace}` };
  if (mf.key !== undefined && mf.key !== KEY)
    return { weg: false, grund: `fremder Schlüssel: ${mf.key}` };
  let liste;
  try { liste = JSON.parse(String(mf.value)); } catch { return { weg: false, grund: 'kein JSON' }; }
  if (!Array.isArray(liste)) return { weg: false, grund: 'kein JSON-Array' };
  if (liste.length !== CHARGEN_WERT.length || liste.some((x, i) => x !== CHARGEN_WERT[i]))
    return { weg: false, grund: `anderer Wert: ${JSON.stringify(liste)}` };
  return { weg: true, grund: 'Charge vom 17.08.2026' };
}
