/**
 * Shop-SKU auf die echte CJ-Variantennummer setzen, wenn nach dem Stecker-Filter GENAU EINE CJ-Variante übrig bleibt.
 *
 * WARUM (27.10.2026, Bestellung #1029 «Heizbare Kuscheldecke»): Das Produkt hat bei CJ vier Varianten, die sich nur im Stecker unterscheiden
 * (US 110 V / EU 230 V / UK / AU). Der Shop führt eine Standardvariante mit der SKU `CJ-<pid>`. cj_varianten_nachziehen.mjs verwarf US/UK/AU
 * (Schweizer Steckdose), hielt die eine übrige Variante für «kein Auswahlproblem» und liess die SKU, wie sie war. Die Bestell-Engine
 * (cj_order_engine.py) löst `CJ-<pid>` bei mehreren CJ-Varianten über den Variantentitel auf, findet nichts Eindeutiges und hält an — zu Recht:
 * sie darf nicht raten, ob die 110-V-Version gemeint ist. Die Bestellung musste von Hand bei CJ angelegt werden.
 *
 * Die SKU `CJ-<pid>` passt auf ALLE CJ-Varianten eines Produkts; nur die CJ-Variantennummer (`CJYD…`) benennt genau eine. Bleibt nach dem Filter eine
 * einzige Variante, ist sie die einzige, die der Shop verkaufen darf — dann gehört ihre Nummer in die SKU.
 *
 * Geschrieben wird NUR, wenn alles Folgende stimmt (Prüfung 27.10.2026, zwei unabhängige Prüfer):
 *   1. Die Shop-SKU ist eine PID (`strategien()` liefert genau [['pid', …]]): eine SKU, die schon eine Variante nennt (`CJYD…`), bleibt unberührt.
 *   2. CJ führt mehr als eine Variante, nach dem Filter bleibt genau eine (sonst ist die pid eindeutig bzw. der Fall gehört dem Auswahl-Bau).
 *   3. Die Nummer der übrigen Variante hat die FORM, die die Bestell-Engine als CJ-Variante erkennt (cj_sku.py, Form A oder B, auch mit Anhang wie
 *      `CJXFLPCD00334-Photo Color-EU`) und ist bei CJ eindeutig. Sonst hielte die Engine die Bestellung für «anderer Lieferant» und legte bei CJ NICHTS an.
 *   4. Die übrige Variante nennt den EURO-Stecker ausdrücklich im CJ-Schlüssel (`Black-EU`). Erkennt der Filter eine Variante nur nicht als Fremdstecker
 *      («Black-CN», «Black-CH», neutraler Schlüssel), wäre sie sonst ungeprüft zur einzigen bestellbaren geworden.
 *   5. Der Einkaufspreis der übrigen Variante liegt höchstens 5 % über dem billigsten CJ-Preis (sonst stimmt der Shop-Preis, der an der Ausgangsvariante
 *      hängt, nicht mehr; Beispiel faszien-massagegerat-219264: EU-Version 66.17 USD gegen 54.90 USD der US-Versionen, +21 %).
 *   6. Die verworfenen Varianten unterscheiden sich von der übrigen NUR im Stecker/in der Spannung (Prüfung 27.10.2026, echte Daten): bei «Black-US, Gray-US, Black-EU» bliebe sonst
 *      «Black-EU», obwohl der Shop das graue Gerät führt. Verglichen wird die «Basis» des Schlüssels (ohne Steckerwörter) — steckerBasis().
 * Ist die Lage mehrdeutig, aber nicht sicher zu beheben, kommt `{ unklar: 'Grund' }` zurück: das Werkzeug merkt sich das als «zurückgestellt» (zählbar), nicht als
 * «kein Auswahlproblem». `null` heisst: nichts zu tun, kein Problem.
 *
 * Rein, ohne Netz, getestet in sku_nachziehen_test.mjs.
 */
import { euroSteckerKey } from './stecker_cj.mjs';

// Die beiden Formen der CJ-Variantennummer, die die Bestell-Engine kennt (automation/cj_sku.py auf Branch claude/luxestyle-status-tztnn1, Stand 20.10.2026):
//   Form A  Stamm + Varianten-Anhang aus 2 Ziffern + 2 Buchstaben     CJYD301744802BY, CJSJ244325301AZ
//   Form B  Stamm, optional mit «-Option»                              CJXFLPCD00334-Photo Color-EU, CJJJJTJT22925
const FORM_A = /^CJ[A-Z]{2,8}\d{5,9}\d{2}[A-Z]{2}$/i;
const FORM_B = /^CJ[A-Z]{2,8}\d{5,9}(?:-[\s\S]*)?$/i;
const PREIS_TOLERANZ = 1.05;
// Zeichensatz und Länge, die die Bestell-Engine für eine Varianten-SKU akzeptiert (cj_order_engine.py SKU_FORM_B). «CJJJJTYS00557-Pink+Blue-2pc» erfüllt die Form, aber nicht den Zeichensatz.
const ENGINE_ZEICHEN = /^[A-Za-z0-9._ -]{6,80}$/;

// Wörter, die nur den Stecker oder die Netzspannung nennen. Alles andere am CJ-Schlüssel (Farbe, Modell, Leistung, Fassungsvermögen) ist die «Basis».
const STECKER_WORT = /^(us|usa|eu|eur|uk|au|jp|cn|plug|plugs|stecker|american|america|european|europe|euro|british|britain|australian|australia|japanese|japan|ac|socket|outlet|voltage|schuko)$/;
// «Standard» ist nur hinter einem Länderwort ein Steckerwort («American Standard», «US/Japanese Standard»); allein steht es für eine Ausführung («Black Standard-US» ≠ «Black-EU»).
const LAND_WORT = /^(us|usa|eu|eur|uk|au|jp|cn|american|america|european|europe|euro|british|britain|australian|australia|japanese|japan|chinese)$/;
/**
 * Der CJ-Schlüssel ohne Steckerwörter und Netzspannung (100–250 V), kleingeschrieben und sortiert: «Silver Gray-800W EU» und «Silver Gray-800W  AU» haben dieselbe Basis,
 * «Black-EU» und «Gray-US» nicht. 12 V / 18 V (Akku) bleiben Teil der Basis.
 */
export function steckerBasis(key) {
  let k = String(key ?? '').toLowerCase();
  k = k.replace(/\b(1[0-2]\d|2[0-4]\d|250)\s*-\s*(1[0-2]\d|2[0-4]\d|250)\s*v(?:olt)?\b/g, ' ').replace(/\b(1[0-2]\d|2[0-4]\d|250)\s*v(?:olt)?\b/g, ' ');
  const w = k.split(/[^a-z0-9äöüß.+]+/).filter(Boolean), aus = [];
  // «Type A/C/G» wird NICHT gestrichen: es kann einen Stecker oder einen Anschluss meinen (USB-A/USB-C). Im Zweifel bleibt es Teil der Basis → «unklar», sichtbar und ohne Schaden.
  for (let i = 0; i < w.length; i++) {
    if (STECKER_WORT.test(w[i])) continue;
    if (w[i] === 'standard' && LAND_WORT.test(w[i - 1] || '')) continue;
    aus.push(w[i]);
  }
  return aus.sort().join(' ');
}

/** true, wenn die Nummer eine Form hat, die die Bestell-Engine als CJ-Variante erkennt. */
export const istCjVariantennummer = sku => { const s = String(sku ?? '').trim(); return ENGINE_ZEICHEN.test(s) && (FORM_A.test(s) || FORM_B.test(s)); };

/**
 * @param {{wege:Array<[string,string]>, vsRoh:Array<{vid:string,sku:string,key?:string,ek?:number}>, vs:Array<{vid:string,sku:string,key?:string,ek?:number}>}} a
 *   wege  = Ergebnis von strategien(shopSku); vsRoh = alle CJ-Varianten; vs = Varianten NACH dem Stecker-Filter
 * @returns {null | {unklar:string} | {neueSku:string, vid:string, anzahlCj:number}}
 */
export function skuNachziehen({ wege, vsRoh, vs }) {
  if (!Array.isArray(wege) || wege.length !== 1 || wege[0][0] !== 'pid') return null;   // die SKU nennt schon eine Variante (oder ist unbekannt)
  if (!Array.isArray(vsRoh) || !Array.isArray(vs)) return null;
  if (vsRoh.length <= 1 || vs.length !== 1) return null;                                // wirklich nur eine CJ-Variante: pid ist eindeutig
  const rest = vs[0] || {};
  const sku = String(rest.sku || '').trim();
  if (!sku || !istCjVariantennummer(sku)) return { unklar: `übrige Variante ohne brauchbare CJ-Nummer («${sku.slice(0, 40)}»)` };
  if (!rest.vid) return { unklar: 'übrige Variante ohne CJ-Variantenkennung' };
  if (vsRoh.filter(v => String(v.sku || '').trim().toUpperCase() === sku.toUpperCase()).length !== 1) return { unklar: 'CJ-Nummer der übrigen Variante nicht eindeutig' };
  if (!euroSteckerKey(rest.key)) return { unklar: `übrige Variante nennt den Euro-Stecker nicht ausdrücklich («${String(rest.key ?? '').slice(0, 40)}»)` };
  const basis = steckerBasis(rest.key);
  const andere = vsRoh.find(v => v.vid !== rest.vid && steckerBasis(v.key) !== basis);
  if (andere) return { unklar: `verworfene Variante «${String(andere.key ?? '').slice(0, 30)}» unterscheidet sich nicht nur im Stecker von «${String(rest.key ?? '').slice(0, 30)}»` };
  const ek = Number(rest.ek);
  if (!(ek > 0)) return { unklar: 'Einkaufspreis der übrigen Variante unbekannt' };
  const preise = vsRoh.map(v => Number(v.ek)).filter(x => x > 0);
  const billigste = Math.min(...preise);
  // Kurz halten: der Grund landet auf 100 Zeichen gekürzt im Ledger, das Wichtige (die Prozentzahl) steht vorn.
  if (ek > billigste * PREIS_TOLERANZ) return { unklar: `Einkaufspreis +${Math.round((ek / billigste - 1) * 100)} % (${ek} gegen ${billigste} USD)` };
  return { neueSku: sku, vid: String(rest.vid), anzahlCj: vsRoh.length };
}
