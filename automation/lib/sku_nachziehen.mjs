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

/** true, wenn die Nummer eine Form hat, die die Bestell-Engine als CJ-Variante erkennt. */
export const istCjVariantennummer = sku => { const s = String(sku ?? '').trim(); return FORM_A.test(s) || FORM_B.test(s); };

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
  const ek = Number(rest.ek);
  if (!(ek > 0)) return { unklar: 'Einkaufspreis der übrigen Variante unbekannt' };
  const preise = vsRoh.map(v => Number(v.ek)).filter(x => x > 0);
  const billigste = Math.min(...preise);
  if (ek > billigste * PREIS_TOLERANZ) return { unklar: `Einkaufspreis der übrigen Variante ${ek} USD liegt über dem billigsten CJ-Preis ${billigste} USD (+${Math.round((ek / billigste - 1) * 100)} %)` };
  return { neueSku: sku, vid: String(rest.vid), anzahlCj: vsRoh.length };
}
