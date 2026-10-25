/**
 * Welche CJ-Produkte haben ein Video — und was kostet so eines geliefert?
 *
 * WARUM DIESES MODUL: am 24.10.2026 zeigte der Besitzer eine CJ-Produktseite mit Videogalerie,
 * während das Gedächtnis („cj-medien-gemessen", 24.10.) festhielt: 0 Videos in 82 geprüften
 * Produkten. Beides stimmt. Neu gemessen über 1413 Katalogtreffer aus 15 Suchwörtern:
 *
 *   - Die Katalogliste `product/list` trägt `isVideo`. Sie ist bei **28** Treffern `1`,
 *     bei 36 `false` und bei 1349 `null`. Bei 2 % Trefferquote war die alte Stichprobe von
 *     82 Produkten erwartbar leer — die alte Zahl war richtig und trotzdem irreführend.
 *   - Das Detail `product/query` trägt `productVideo`. Es ist bei **allen 28** `null`.
 *     Im ganzen Rohtext der Antwort steht keine einzige mp4/mov/webm-Adresse.
 *   - Es gibt keinen zweiten Weg: `product/getProductVideo`, `product/video`,
 *     `product/productVideo`, `product/media`, `product/queryByVid` antworten alle
 *     `1600101 Interface not found`. `product/productComments` enthält keine Videoadresse.
 *
 * DARAUS FOLGT DIE EINZIGE EHRLICHE LESART: `isVideo` sagt, DASS ein Video existiert, und die
 * API gibt es nicht heraus. Die Datei liegt allein in CJs eingeloggter Weboberfläche (Firecrawl
 * bekommt die Produktseite nicht, sie braucht eine Anmeldung). Dieses Modul findet also die
 * Produkte, bei denen sich ein Griff in die Weboberfläche lohnt — es lädt kein Video.
 *
 * NICHT ANGEFASST: `/storehouseCenterWeb/syncStorehouseVideoRequests` ist POST-only und heisst
 * „VideoRequests". Ein blinder POST könnte eine Anfrage auslösen, die ein Mensch bearbeitet.
 */

/**
 * Trägt dieser Katalogtreffer ein Video? CJ schreibt 1, true, "1" — oder null.
 * `null` heisst UNBEKANNT, nicht „kein Video": ein fehlendes Feld ist keine Aussage.
 * @returns {true|false|null}
 */
export function hatVideo(p = {}) {
  const v = p.isVideo;
  if (v === 1 || v === true || v === '1') return true;
  if (v === 0 || v === false || v === '0') return false;
  return null;
}

/**
 * CJs `sellPrice` kann eine Spanne sein ("1.83 -- 3.69"). `Number()` gibt dort NaN und ein
 * Produkt gilt als preislos (die Falle vom 24.10., 32 von 240 Treffern). Wir nehmen den
 * HÖCHSTEN Wert: wer mit dem billigsten rechnet, verspricht eine Marge, die die teure
 * Variante nicht hält.
 * @returns {number|null}
 */
export function preisHoch(wert) {
  const treffer = String(wert ?? '').match(/\d+(?:\.\d+)?/g);
  if (!treffer) return null;
  const zahlen = treffer.map(Number).filter(n => Number.isFinite(n) && n > 0);
  return zahlen.length ? Math.max(...zahlen) : null;
}

/**
 * Landekosten und Marge. Fracht ist GEMESSEN (logistic/freightCalculate CN→CH), nicht geraten —
 * der Grund steht in `lieferbarkeit.mjs`: elf von elf Erstattungen des Shops hiessen
 * „nicht lieferbar".
 * @param {{ekUsd:number, frachtUsd:number, kurs:number, faktor?:number}} e
 * @returns {{landenChf:number, vkVorschlag:number, margeChf:number}|null}
 */
export function kosten(e = {}) {
  const { ekUsd, frachtUsd, kurs } = e;
  const faktor = e.faktor ?? 2;
  if (![ekUsd, frachtUsd, kurs].every(n => Number.isFinite(n) && n > 0)) return null;
  if (!Number.isFinite(faktor) || faktor <= 1) return null;
  const landenChf = Math.round((ekUsd + frachtUsd) * kurs * 100) / 100;
  // Der Shop preist auf x.90 auf (siehe die Fortura-Regel im Projektgedächtnis).
  const vkVorschlag = Math.round((Math.ceil(landenChf * faktor) - 0.1) * 100) / 100;
  return { landenChf, vkVorschlag, margeChf: Math.round((vkVorschlag - landenChf) * 100) / 100 };
}

/**
 * Warengruppe aus dem englischen CJ-Titel. Das SPEZIFISCHE zuerst — die Lehre vom 24.10.:
 * „Reptile … Fogger" landete unter Luftbefeuchter und verdeckte den einzigen brauchbaren Fund.
 * Ein schwebender Luftbefeuchter gehört darum zu den Luftbefeuchtern (150 im Shop), nicht zu
 * den Schwebe-Produkten (12) — sonst sieht eine Dublette wie eine neue Nische aus.
 * @returns {string}
 */
export function warengruppe(titel) {
  const t = String(titel ?? '').toLowerCase();
  const schwebt = /levitat|floating|anti[- ]?gravity|suspension|magnetic float/.test(t);
  if (/holograph|holografisch|hologramm/.test(t)) return 'hologramm';
  if (schwebt && /humidifier|luftbefeuchter/.test(t)) return 'luftbefeuchter';
  if (schwebt) return 'schwebend';
  if (/\bhud\b|speedometer|head[- ]?up/.test(t)) return 'hud';
  if (/watch strap|iwatch|watch band/.test(t)) return 'uhrenarmband';
  if (/\bdj\b|disco|party light|laser/.test(t)) return 'partylicht';
  if (/humidifier|luftbefeuchter/.test(t)) return 'luftbefeuchter';
  if (/yoga/.test(t)) return 'yoga';
  if (/projector|projektor/.test(t)) return 'projektor';
  return 'sonstiges';
}
