/**
 * Preisformel für ALLE «Selbst gestalten»-Modelle (Printful). Rein: kein Netz, keine Dateien. Aufgabe B (05.11.2026).
 *
 * Ziel: nie Verlust, runde X.90-Preise wie im Shop, Aufpreis je Platzierung/Technik 1:1 weitergeben.
 *
 * Eingabe (alles USD, direkt aus Printful):
 *   ekUsd       Einkauf für den Kostenboden: das GRÖSSERE von Katalogpreis (GET /products/variant/<id> → variant.price) und Rechnung für CH (POST /orders/estimate-costs → subtotal), siehe abrechnungsEk()
 *   ekRichtwertUsd (optional) Einkauf für die Marktlage (Richtwert): der Katalogpreis wie bisher; fehlt er, gilt ekUsd
 *   versandUsd  Versand nach CH 8001, Versandart STANDARD, 1 Stück (POST /shipping/rates), je Variante gemessen
 *   aufpreisUsd Summe der Zusatzplatzierungen/Techniken und Einmalgebühren (GET /products/<id> → files[].additional_price, z. B. Rückseite 5.95, Ärmel 2.49–5.95, Stickerei 2.95; Stickerei-Digitalisierung 6.50 einmalig je Motiv), Vorgabe 0
 *
 * Rechnung (in Rappen, ganze Zahlen):
 *   Kosten      K = round((ek + versand + aufpreis) × kurs)                         Printful-Ware, Printful-Versand, Aufpreis
 *   Netto(P)    = P / (1 + MWST) − Gebühr(P) − K                                    P = Endpreis inkl. MWST, Gebühr = 3.4 % × P + 0.30
 *   Kostenpreis = kleinstes P mit Netto(P) ≥ nettoMin                                (Kunde zahlt KEINEN Versand eingerechnet: Worst Case)
 *   Richtwert   = max(ek × kurs × faktor, ek × kurs + aufschlagFix) + aufpreis 1:1   (Marktlage wie bisher: 2.3 × Einkauf, mindestens +12; ek = ekRichtwertUsd, Vorgabe ekUsd)
 *   Endpreis    = kleinster Wert X.90 mit P ≥ max(Kostenpreis, Richtwert)
 *
 * Aufpreise werden NICHT mit dem Faktor multipliziert: sie gehen nur mit Umrechnung, MWST und Zahlungsgebühr ein (1:1).
 *
 * SETZUNGEN (vom Besitzer zu bestätigen, keine Messwerte): kurs 0.90 (Praxis von pod_preise.mjs/printful_reprice.mjs; der Messkurs des Repos ist 0.82435, der Abstand von 9.2 % ist
 * der Sicherheitspuffer für Kursbewegung, Kartenaufschlag und Abweichung der Rechnung; getestet: auch bei 11 % höherer Rechnung bleibt nach Gebühr Gewinn), nettoMin 4.00, faktor 2.3, aufschlagFix 12.
 * MESSWERTE (05.11.2026): MWST 8.1 % (Shop: Preise sind Endpreise, taxesIncluded = true), Gebühr 3.4 % + 0.30 (Repo: pod_preise.mjs). Printful berechnet bei Lieferung nach CH 8.1 % Steuer («tax») auf
 * Ware + Versand (40 Schätzungen: 8.07–8.12 %, zwei echte Aufträge: 8.06 % und 8.10 %), keinen Zoll, vat = 0. Diese Steuer ist in `kosten` NICHT enthalten, weil sie bei einem MWST-pflichtigen Shop als Vorsteuer neutral wäre;
 * ist der Shop nicht MWST-pflichtig, entfällt dafür die MWST auf den Verkauf (dann ist das Netto sogar höher). MWST-Status des Shops: UNBEKANNT (Entscheid des Besitzers, siehe messung_0511.json).
 * Katalogpreis und Rechnung für CH weichen je Produkt um −24 % bis +26 % ab (Median 1.01): ekUsd nimmt darum das Grössere von beiden (abrechnungsEk), der Richtwert bleibt auf dem Katalogpreis.
 *
 * Grundsatz des Repos: Unbekanntes bleibt UNBEKANNT. Fehlender Versand, negative oder nicht endliche Zahlen werfen einen Fehler, es gibt nie einen geratenen Preis.
 */

export const REGEL = Object.freeze({
  kurs: 0.90,              // USD → CHF für die KOSTEN (Setzung, Puffer über dem Messkurs)
  kursMess: 0.82435,       // USD → CHF laut Repo (grind_preis.mjs, cj_fracht.mjs); nur für Prüfungen «was bleibt beim Messkurs»
  mwst: 0.081,             // Schweizer MWST, im Endpreis enthalten
  gebuehrProzent: 0.034,   // Zahlungsgebühr, Anteil vom Endpreis
  gebuehrFix: 0.30,        // Zahlungsgebühr fest (CHF)
  nettoMin: 4.00,          // Mindestgewinn je Verkauf (CHF) nach MWST, Gebühr, Printful-Ware und -Versand, OHNE Kundenversand
  faktor: 2.3,             // Richtwert: Einkauf × Faktor …
  aufschlagFix: 12,        // … oder Einkauf + Aufschlag (CHF), je nachdem, was höher ist
  kundenVersand: 7,        // der Shop erhebt CHF 7 unter CHF 50 Warenwert (nach Rabatt) (Messwert, nur Information)
  kundenVersandAnrechnen: 0, // so viel Versandbeitrag (CHF) rechnet der Endpreis unter `gratisAb` ein; 0 = gar nichts (Worst Case: Warenkorb ab CHF 50, Mehrfachkauf). 7 rechnet wie pod_preise.mjs.
  gratisAb: 50,             // Warenwert (CHF), ab dem der Shop keinen Versand erhebt
  maxPreis: null,          // null = keine Obergrenze; sonst `ueberMax: true` in der Antwort (nie ein gekappter, zu tiefer Preis)
});

const EPS = 1e-9;
const rp = (chf) => Math.round(chf * 100 + EPS);
export const chfVonRp = (r) => Math.round(r) / 100;

function zahl(name, x, erlaubtNull = false) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || (!erlaubtNull && x === 0)) {
    throw new TypeError(`preisformel: ${name} muss eine ${erlaubtNull ? 'nicht negative' : 'positive'} Zahl sein (war: ${JSON.stringify(x)})`);
  }
  return x;
}

/** USD → Rappen (CHF) mit dem Kurs der Regel. */
export function usdZuRp(usd, kurs = REGEL.kurs) { return Math.round(zahl('USD-Betrag', usd, true) * 100 * kurs + EPS); }

/** Zahlungsgebühr in Rappen auf einen Endpreis in Rappen. */
export function gebuehrRp(preisRp, regel = REGEL) { return Math.round(preisRp * regel.gebuehrProzent + EPS) + Math.round(regel.gebuehrFix * 100); }

/** Kosten in Rappen: Printful-Ware + Versand + Aufpreis (je Posten einzeln auf Rappen gerundet, damit die Rechnung von Hand nachvollziehbar bleibt). */
export function kostenRp({ ekUsd, versandUsd, aufpreisUsd = 0 }, kurs = REGEL.kurs) {
  zahl('ekUsd', ekUsd); zahl('versandUsd', versandUsd, true); zahl('aufpreisUsd', aufpreisUsd, true);
  return usdZuRp(ekUsd, kurs) + usdZuRp(versandUsd, kurs) + usdZuRp(aufpreisUsd, kurs);
}

/** Netto in Rappen (Dezimalzahl, nicht gerundet) bei Endpreis P (Rappen): (P + Versandbeitrag)/(1+MWST) − Gebühr − Kosten. Der Versandbeitrag ist in der Vorgabe 0 (Kunde zahlt keinen Versand). */
export function nettoRp(preisRp, kostenRpWert, regel = REGEL) {
  const erloes = preisRp + (preisRp < regel.gratisAb * 100 ? Math.round(regel.kundenVersandAnrechnen * 100) : 0);
  return erloes / (1 + regel.mwst) - gebuehrRp(erloes, regel) - kostenRpWert;
}

/** Kleinster Endpreis in Rappen (beliebig, nicht gerundet auf X.90) mit Netto ≥ nettoMin. Die Gebühr ist treppenförmig, darum wird der Anfangswert erst nach unten gesichert und dann geprüft. */
export function kostenpreisRp(kostenRpWert, regel = REGEL) {
  const f = 1 / (1 + regel.mwst) - regel.gebuehrProzent, beitrag = Math.round(regel.kundenVersandAnrechnen * 100);
  const ziel = kostenRpWert + Math.round(regel.nettoMin * 100);
  let p = Math.floor((ziel + Math.round(regel.gebuehrFix * 100) - beitrag * f - 1) / f) - 3;   // sicher unter dem Ergebnis beginnen, dann nach oben prüfen (die Gebühr ist treppenförmig)
  if (p < 0) p = 0;
  while (nettoRp(p, kostenRpWert, regel) + EPS < Math.round(regel.nettoMin * 100)) p++;
  return p;
}

/** Richtwert in Rappen (Dezimalzahl): max(Einkauf × Faktor, Einkauf + Aufschlag), dazu der Aufpreis 1:1 (mit MWST und Gebühr aufgerechnet, nicht mit dem Faktor multipliziert). */
export function richtwertRp({ ekUsd, aufpreisUsd = 0 }, regel = REGEL) {   // ekUsd: der Einkaufspreis, auf dem die Marktlage beruht (Katalogpreis, wie bisher)
  const ek = usdZuRp(ekUsd, regel.kurs);
  const basis = Math.max(ek * regel.faktor, ek + regel.aufschlagFix * 100);
  return basis + aufpreisAufgerechnetRp(aufpreisUsd, regel);
}

/** Der Aufpreis (USD) als Endpreis-Anteil in Rappen: Kosten in CHF, durch (1/(1+MWST) − Gebühr%) geteilt, damit MWST und Zahlungsgebühr den Aufpreis nicht auffressen. Dezimalzahl. */
export function aufpreisAufgerechnetRp(aufpreisUsd, regel = REGEL) {
  const k = usdZuRp(zahl('aufpreisUsd', aufpreisUsd, true), regel.kurs);
  return k / (1 / (1 + regel.mwst) - regel.gebuehrProzent);
}

/** Aufpreis für den Kunden in CHF, aufgerundet auf 10 Rappen: das, was eine Platzierung/Technik mindestens kosten muss (1:1). Für die Anzeige («Rückseite +CHF 6.10»). */
export function aufpreisChf(aufpreisUsd, regel = REGEL) {
  return Math.ceil(aufpreisAufgerechnetRp(aufpreisUsd, regel) / 10 - EPS) / 10;
}

/** Kleinster Wert X.90 (in Rappen), der `soll` (Rappen, auch Dezimal) erreicht oder übersteigt: 2737 → 2790, 2790 → 2790, 2791 → 2890. */
export function aufX90Rp(soll) { return Math.max(0, Math.ceil((soll - 90) / 100 - EPS)) * 100 + 90; }

/** Erster X.90 ≥ soll, bei dem das Netto wirklich ≥ nettoMin ist (nur mit angerechnetem Versandbeitrag kann ein höherer Preis unter `gratisAb` → darüber springen und wieder darunter fallen). */
function ersterX90(sollRp, kostenRpWert, regel) {
  let p = aufX90Rp(sollRp);
  while (nettoRp(p, kostenRpWert, regel) + EPS < Math.round(regel.nettoMin * 100)) p += 100;
  return p;
}

/**
 * Welcher Einkaufspreis geht in die Formel? Der Katalogpreis (GET /products/variant, US-Katalog) und die Rechnung für CH (POST /orders/estimate-costs → subtotal)
 * weichen je Produkt um −24 % bis +26 % ab (GEMESSEN 05.11.2026, 40 Produkte); sicher ist das Grössere von beiden. Fehlt die Schätzung, gilt der Katalogpreis und `quelle` sagt es.
 * @returns {{ekUsd:number, quelle:'schaetzung'|'katalog'}}
 */
export function abrechnungsEk({ katalogUsd, schaetzungUsd = null }) {
  zahl('katalogUsd', katalogUsd);
  if (schaetzungUsd == null) return { ekUsd: katalogUsd, quelle: 'katalog' };
  zahl('schaetzungUsd', schaetzungUsd);
  return { ekUsd: Math.max(katalogUsd, schaetzungUsd), quelle: schaetzungUsd >= katalogUsd ? 'schaetzung' : 'katalog' };
}

/**
 * Endpreis einer Variante (CHF, X.90).
 *   preisChf        = Empfehlung: kleinster X.90 ≥ max(Kostenpreis, Richtwert)
 *   mindestpreisChf = harte Untergrenze: kleinster X.90 ≥ Kostenpreis (darunter wäre der Gewinn kleiner als nettoMin, beim Messkurs meist noch ≥ 0)
 * @returns {{preisChf:number, mindestpreisChf:number, bindend:'richtwert'|'kosten', kostenChf:number, nettoChf:number, nettoBeiMesskursChf:number, richtwertChf:number, kostenpreisChf:number, ueberMax:boolean}}
 */
export function endpreis({ ekUsd, versandUsd, aufpreisUsd = 0, ekRichtwertUsd = ekUsd }, regel = REGEL) {
  const K = kostenRp({ ekUsd, versandUsd, aufpreisUsd }, regel.kurs);
  const kp = kostenpreisRp(K, regel);
  const rw = richtwertRp({ ekUsd: zahl('ekRichtwertUsd', ekRichtwertUsd), aufpreisUsd }, regel);
  const preis = ersterX90(Math.max(kp, rw), K, regel);
  const nettoMess = nettoRp(preis, kostenRp({ ekUsd, versandUsd, aufpreisUsd }, regel.kursMess), regel);
  return {
    preisChf: chfVonRp(preis), mindestpreisChf: chfVonRp(ersterX90(kp, K, regel)), bindend: rw >= kp ? 'richtwert' : 'kosten', kostenChf: chfVonRp(K), nettoChf: chfVonRp(nettoRp(preis, K, regel)), nettoBeiMesskursChf: chfVonRp(nettoMess),
    richtwertChf: chfVonRp(rw), kostenpreisChf: chfVonRp(kp), ueberMax: regel.maxPreis != null && preis > rp(regel.maxPreis),
  };
}

/**
 * Prüft einen vorhandenen Preis (CHF, inkl. MWST) gegen die Kosten, ohne ihn zu ändern. `kurs` wählbar (Vorgabe: Messkurs des Repos).
 * marge  = Aufgabenvorgabe: Preis ohne MWST − Printful-Ware − Printful-Versand (CHF; Kunde zahlt keinen Versand, keine Zahlungsgebühr)
 * netto  = marge − Zahlungsgebühr
 * urteil: 'verlust' (marge < 0) · 'unter4' (marge < 4) · 'ok'
 */
export function pruefePreis({ preisChf, ekUsd, versandUsd, aufpreisUsd = 0 }, kurs = REGEL.kursMess, regel = REGEL) {
  zahl('preisChf', preisChf);
  const p = rp(preisChf), K = kostenRp({ ekUsd, versandUsd, aufpreisUsd }, kurs);
  const marge = p / (1 + regel.mwst) - K, netto = marge - gebuehrRp(p, regel);
  return { margeChf: chfVonRp(marge), nettoChf: chfVonRp(netto), urteil: marge < 0 ? 'verlust' : marge < 400 ? 'unter4' : 'ok' };
}
