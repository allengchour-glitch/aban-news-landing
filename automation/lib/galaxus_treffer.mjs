/* Liest aus einer Galaxus-SUCHSEITE (Abruf ueber ?q=<Barcode>) den einen Treffer heraus.
 *
 * Warum die Suchadresse und nicht die Produktadresse: Galaxus beantwortet einen direkten
 * Produkt-Link mit einer Captcha-Seite ("Are you a robot?"), die Suchadresse nicht.
 * Gemessen am 24.10.2026.
 *
 * Woran die Identitaet haengt: Galaxus leitet eine Suche nach einem Barcode nur dann auf
 * eine PRODUKTSEITE um, wenn der Code genau passt; sonst bleibt die Adresse auf /search.
 * Die EAN selbst steht NICHT im Seitentext (nur in Links, als Teil der eigenen Abfrage) —
 * sie taugt darum nicht als Gegenprobe. Die Umleitung ist der Beleg.
 *
 * Der Preis ist die erste **CHF…**-Zeile NACH der Hauptueberschrift. Die Farb-/Variantenliste
 * weiter unten nennt fremde Varianten mit eigenem Preis (im Messfall CHF 8 statt CHF 22) —
 * wer einfach den tiefsten Preis der Seite nimmt, misst eine andere Variante.
 */

const ZAHL = "(?:\\d{1,3}(?:['’]\\d{3})+|\\d+)";

/** Wandelt eine Galaxus-Preisangabe in eine Zahl. `CHF22.–` ist 22, `CHF1'234.50` ist 1234.5. */
export function preisZahl(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(new RegExp(`^(${ZAHL})(?:[.,](\\d{2}|[–\\-]))?$`));
  if (!m) return null;
  const ganz = Number(m[1].replace(/['’]/g, ''));
  if (!Number.isFinite(ganz)) return null;
  const rest = m[2];
  if (!rest || rest === '–' || rest === '-') return ganz;
  return ganz + Number(rest) / 100;
}

/** true, wenn die Suche auf eine Produktseite umgeleitet hat (= Barcode genau getroffen). */
export function istProduktseite(url) {
  return typeof url === 'string' && /galaxus\.(ch|com)\/[^?]*\/product\//i.test(url);
}

/**
 * Liest Marke, Titel und Preis.
 * @returns {{art:'treffer',marke:string|null,titel:string,preis:number}}
 *        | {{art:'kein_treffer'}}
 *        | {{art:'unbekannt',grund:string}}
 * `unbekannt` ist ein eigenes Ergebnis: eine misslungene Messung darf nie als Preis gelten.
 */
export function galaxusTreffer({ url, markdown } = {}) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return { art: 'unbekannt', grund: 'kein-text' };
  }
  if (/Are you a robot|\/captcha/i.test(markdown) || /\/captcha/i.test(url || '')) {
    return { art: 'unbekannt', grund: 'captcha' };
  }
  if (!istProduktseite(url)) return { art: 'kein_treffer' };

  const zeilen = markdown.split('\n');
  const kopf = zeilen.findIndex((z) => /^#\s+\S/.test(z));
  if (kopf < 0) return { art: 'unbekannt', grund: 'keine-ueberschrift' };

  const h = zeilen[kopf].replace(/^#\s+/, '').trim();
  const mm = h.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  const marke = mm ? mm[1].trim() : null;
  const titel = (mm ? mm[2] : h).replace(/\*\*/g, '').trim();

  const re = new RegExp(`^\\*\\*CHF\\s*(${ZAHL}(?:[.,](?:\\d{2}|[–\\-]))?)\\*\\*$`);
  for (let i = kopf + 1; i < zeilen.length; i++) {
    const m = zeilen[i].trim().match(re);
    if (!m) continue;
    const preis = preisZahl(m[1]);
    if (preis == null || preis <= 0) return { art: 'unbekannt', grund: 'preis-unlesbar' };
    return { art: 'treffer', marke, titel, preis };
  }
  return { art: 'unbekannt', grund: 'kein-preis' };
}
