/* LuxeStyle — chf_preis.mjs
 * Liest Schweizer Franken-Preise aus dem Text einer Haendlerseite.
 * Reine Funktionen, kein Netz. Wird vom Preisvergleich gegen Galaxus/Toppreise genutzt.
 *
 * Vorsicht ist der ganze Sinn dieses Moduls: eine Suchseite enthaelt auch Versandkosten,
 * Streichpreise, Ersparnisse und Zahlen in Produktnamen. Wer die groesste oder die erste
 * Zahl nimmt, bekommt einen Preis, der aussieht wie ein Ergebnis und keiner ist.
 */

/** Alle plausiblen CHF-Preise aus einem Text, aufsteigend, ohne Dubletten. */
export function chfPreise(text, opt = {}) {
  if (typeof text !== 'string' || !text) return [];
  const min = opt.min ?? 1;      // unter CHF 1 ist kein Artikelpreis
  const max = opt.max ?? 5000;   // darueber kein Kostuemartikel
  const treffer = new Set();
  // CHF 14.90 / 14.90 CHF / Fr. 14.90 / CHF 1'249.00 (Schweizer Tausendertrennung)
  // Die Zahl: entweder mit Schweizer Hochkomma gruppiert (1'249) oder eine zusammen-
  // haengende Ziffernfolge (1249). Die Zifferngrenze HINTEN ist zwingend, sonst
  // zerfaellt "9999.00" in "999" und "9.00" (von einem Test gefunden).
  // Die Grenze VORNE ist nachweislich gleichwertig (Mutationsprobe M6, 24.10.2026):
  // `\\d+` ist gierig, der Treffer beginnt also ohnehin am Anfang der Ziffernfolge.
  // Sie bleibt als erklaerte Absicht stehen und kostet nichts - kein Test dazu,
  // weil es keinen Fall gibt, der sie von ihrem Fehlen unterscheidet.
  const ZAHL = "(?<!\\d)(?:\\d{1,3}(?:['’]\\d{3})+|\\d+)(?:[.,]\\d{2})?(?!\\d)";
  const re = new RegExp(`(?:CHF|Fr\\.?)\\s*(${ZAHL})|(${ZAHL})\\s*(?:CHF|Fr\\.)`, 'gi');
  let m;
  while ((m = re.exec(text)) !== null) {
    const roh = (m[1] ?? m[2]).replace(/['’]/g, '').replace(',', '.');
    const z = Number(roh);
    if (!Number.isFinite(z) || z < min || z > max) continue;
    treffer.add(Math.round(z * 100) / 100);
  }
  return [...treffer].sort((a, b) => a - b);
}

/**
 * Der niedrigste glaubwuerdige Haendlerpreis, oder null.
 * `versand` nennt Betraege, die als Versandkosten gelten und darum NICHT der Preis sind
 * (Standard: die Schweizer Pauschalen, die auf fast jeder Seite stehen).
 */
export function tiefsterPreis(text, opt = {}) {
  const versand = new Set(opt.versand ?? [7, 6.9, 7.9, 8.9, 9.9]);
  const alle = chfPreise(text, opt);
  const echte = alle.filter(p => !versand.has(p));
  return echte.length ? echte[0] : null;
}

/**
 * Vergleich eigener Preis gegen Markt.
 * Gibt { faktor, differenz, urteil } zurueck; urteil ist bewusst grob:
 *   'teurer' ab 1.25x · 'im_rahmen' 0.9-1.25x · 'guenstiger' unter 0.9x · 'unbekannt' ohne Marktpreis.
 * UNBEKANNT ist ein eigenes Ergebnis und NICHT 'im Rahmen' - sonst gilt eine
 * fehlgeschlagene Messung als Freigabe (dieselbe Falle wie der stumme Skip).
 */
export function vergleich(eigen, markt, opt = {}) {
  const e = Number(eigen);
  if (!Number.isFinite(e) || e <= 0) return { faktor: null, differenz: null, urteil: 'unbekannt' };
  if (markt == null || !Number.isFinite(Number(markt)) || Number(markt) <= 0)
    return { faktor: null, differenz: null, urteil: 'unbekannt' };
  const m = Number(markt);
  const faktor = Math.round((e / m) * 100) / 100;
  const differenz = Math.round((e - m) * 100) / 100;
  const obenRaus = opt.obenRaus ?? 1.25;
  const untenRaus = opt.untenRaus ?? 0.9;
  const urteil = faktor >= obenRaus ? 'teurer' : faktor < untenRaus ? 'guenstiger' : 'im_rahmen';
  return { faktor, differenz, urteil };
}
