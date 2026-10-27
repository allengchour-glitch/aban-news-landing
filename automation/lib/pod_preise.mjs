/**
 * Preisregel für NEUE «Selbst gestalten»-Varianten (Druckpartner PRINTFUL). Rein: kein Netz, keine Dateien.
 *
 * Herkunft: automation/printful_reprice.mjs (USD→CHF 0.90, Richtwert max(Einkauf×2.3, Einkauf+12)), erweitert um die
 * Frage, die dort fehlt: bleibt nach Printful-Versand (CH) und Zahlungsgebühr überhaupt etwas übrig?
 *
 *   Richtwert  = max(Einkauf_CHF × 2.3, Einkauf_CHF + 12)
 *   Erlös      = Preis + (Preis < 50 ? 7 : 0)            // der Kunde zahlt CHF 7 Versand, wenn der Warenwert unter 50 liegt
 *   Gebühr     = 3.4 % × Erlös + 0.30
 *   Netto      = Erlös − Gebühr − Einkauf_CHF − Versand_CHF(Printful, CH, je Variante)
 *   Endpreis   = kleinster Wert X.90, für den Preis ≥ Richtwert UND Netto ≥ 12 gilt; über 149.90 → keine Variante.
 *
 * ANNAHME (vom Besitzer so vorgegeben): Netto ≥ 12 gilt bei Preisen unter CHF 50 nur, solange der Kunde die CHF 7 Versand zahlt, also wenn die Variante
 * allein im Warenkorb liegt. Liegt sie zusammen mit anderer Ware im Warenkorb ab CHF 50, entfällt der Versandbeitrag und das Netto sinkt (siehe
 * nettoOhneKundenversand); der Plan weist diese Zahl in einer eigenen Spalte aus.
 *
 * Gerechnet wird in Rappen (ganze Zahlen). Jeder Posten wird einzeln auf Rappen gerundet (Einkauf, Versand, Gebühr), damit
 * die Rechnung von Hand nachvollziehbar bleibt: die Gebühr ist round(Erlös_Rp × 0.034) + 30.
 *
 * Abweichung zu printful_reprice.priced(): dort ist der Preis ceil(Richtwert) − 0.10. Das liegt UNTER dem Richtwert, wenn dessen
 * Nachkommateil über .90 liegt (Richtwert 20.95 → 20.90; Richtwert 21.00 → 20.90). Hier gilt «kleinster X.90, der ≥ Richtwert ist».
 * Außerdem: Der Erlös ist NICHT monoton im Preis (bei 49.90 kommen 7 Versand dazu, bei 50.90 nicht), darum wird jeder X.90 der
 * Reihe nach geprüft, statt eine Formel umzukehren.
 */

export const REGEL = Object.freeze({
  usdChf: 0.90,            // Kurs für Einkauf und Versand (wie printful_reprice.mjs)
  faktor: 2.3,             // Richtwert: Einkauf × Faktor …
  aufschlagFix: 12,        // … oder Einkauf + Aufschlag (CHF), je nachdem, was höher ist
  nettoMin: 12,            // Mindest-Nettogewinn je Verkauf (CHF)
  gebuehrProzent: 0.034,   // Zahlungsgebühr, Anteil vom Erlös
  gebuehrFix: 0.30,        // Zahlungsgebühr, fest (CHF)
  kundenVersand: 7,        // der Kunde zahlt diesen Versand, wenn der Warenwert unter der Schwelle liegt (CHF)
  gratisAb: 50,            // Warenwert, ab dem der Versand gratis ist (CHF)
  maxPreis: 149.90,        // darüber wird keine Variante angelegt
});

const EPS = 1e-9;
const rp = (chf) => Math.round(chf * 100 + EPS);           // CHF → Rappen (Gleichstand .5 rundet auf)
export const chfVonRp = (r) => Math.round(r) / 100;        // Rappen → CHF (auf 2 Stellen)

function zahl(name, x, erlaubtNull = false) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || (!erlaubtNull && x === 0)) {
    throw new TypeError(`pod_preise: ${name} muss eine positive Zahl sein (war: ${JSON.stringify(x)})`);
  }
  return x;
}

/** Einkauf bzw. Versand in USD → Rappen (CHF). */
export function usdZuRp(usd, regel = REGEL) {
  zahl('USD-Betrag', usd, true);
  return Math.round(usd * 100 * regel.usdChf + EPS);
}

/** Richtwert in Rappen als Dezimalzahl (nicht gerundet: der Endpreis muss ihn ERREICHEN, nicht nur nahe kommen). */
export function richtwertRp(einkaufRp, regel = REGEL) {
  return Math.max(einkaufRp * regel.faktor, einkaufRp + regel.aufschlagFix * 100);
}

/** Erlös in Rappen für einen Warenpreis in Rappen (Versandbeitrag des Kunden eingerechnet). */
export function erloesRp(preisRp, regel = REGEL) {
  return preisRp + (preisRp < regel.gratisAb * 100 ? regel.kundenVersand * 100 : 0);
}

/** Zahlungsgebühr in Rappen auf einen Erlös in Rappen. */
export function gebuehrRp(erloes, regel = REGEL) {
  return Math.round(erloes * regel.gebuehrProzent + EPS) + Math.round(regel.gebuehrFix * 100);
}

/** Nettogewinn in Rappen bei gegebenem Preis (alles in Rappen). */
export function nettoRp(preisRp, einkaufRp, versandRp, regel = REGEL) {
  const e = erloesRp(preisRp, regel);
  return e - gebuehrRp(e, regel) - einkaufRp - versandRp;
}

/**
 * Endpreis einer Variante.
 * @param {{einkaufUsd:number, versandUsd:number}} p  Printful-Katalogpreis und Printful-Versand (CH), beide USD
 * @returns {{ok:boolean, preisChf:number|null, grund:string, richtwertChf:number, einkaufChf:number, versandChf:number,
 *            erloesChf:number|null, gebuehrChf:number|null, nettoChf:number|null, bindend:string}}
 *   bindend: 'richtwert' (der Richtwert bestimmt den Preis), 'netto' (erst der Mindest-Nettogewinn hebt ihn an), 'keiner' (über maxPreis)
 */
export function endpreis({ einkaufUsd, versandUsd }, regel = REGEL) {
  zahl('einkaufUsd', einkaufUsd);
  zahl('versandUsd', versandUsd, true);
  const ek = usdZuRp(einkaufUsd, regel), vs = usdZuRp(versandUsd, regel);
  const rw = richtwertRp(ek, regel);
  const basis = {
    richtwertChf: Math.round(rw) / 100, einkaufChf: chfVonRp(ek), versandChf: chfVonRp(vs),
  };
  const max = rp(regel.maxPreis);
  // erster X.90 in Rappen, der den Richtwert erreicht: k·100 + 90 ≥ rw
  let k = Math.max(0, Math.ceil((rw - 90) / 100 - EPS));
  for (let preis = k * 100 + 90; preis <= max; preis += 100) {
    if (preis + EPS < rw) continue;
    const e = erloesRp(preis, regel), g = gebuehrRp(e, regel), n = e - g - ek - vs;
    if (n >= regel.nettoMin * 100) {
      return { ok: true, preisChf: chfVonRp(preis), grund: '', ...basis, erloesChf: chfVonRp(e), gebuehrChf: chfVonRp(g), nettoChf: chfVonRp(n),
        bindend: preis === k * 100 + 90 ? 'richtwert' : 'netto' };
    }
  }
  return { ok: false, preisChf: null, grund: `Endpreis läge über CHF ${regel.maxPreis.toFixed(2)}`, ...basis,
    erloesChf: null, gebuehrChf: null, nettoChf: null, bindend: 'keiner' };
}

/**
 * Netto in Rappen, wenn der Kunde KEINEN Versand zahlt (Warenkorb ab CHF 50 mit anderer Ware): Erlös = Preis.
 * Die Regel «Netto ≥ 12» gilt für Preise unter CHF 50 nur MIT dem Versandbeitrag des Kunden (CHF 7); ohne ihn sinkt das Netto um 7 CHF
 * minus die Gebühr auf diese 7 CHF. Ab CHF 50 ist der Wert gleich dem normalen Netto.
 */
export function nettoOhneKundenversandRp(preisRp, einkaufRp, versandRp, regel = REGEL) {
  return preisRp - gebuehrRp(preisRp, regel) - einkaufRp - versandRp;
}

/** Wie nettoBeiPreis, aber ohne Versandbeitrag des Kunden (CHF). */
export function nettoOhneKundenversand({ preisChf, einkaufUsd, versandUsd }, regel = REGEL) {
  zahl('preisChf', preisChf);
  return chfVonRp(nettoOhneKundenversandRp(rp(preisChf), usdZuRp(zahl('einkaufUsd', einkaufUsd), regel), usdZuRp(zahl('versandUsd', versandUsd, true), regel), regel));
}

/** Prüft einen vorhandenen Preis (CHF) gegen die Regel, ohne ihn zu ändern: Netto bei diesem Preis. */
export function nettoBeiPreis({ preisChf, einkaufUsd, versandUsd }, regel = REGEL) {
  zahl('preisChf', preisChf);
  const p = rp(preisChf), ek = usdZuRp(zahl('einkaufUsd', einkaufUsd), regel), vs = usdZuRp(zahl('versandUsd', versandUsd, true), regel);
  return chfVonRp(nettoRp(p, ek, vs, regel));
}
