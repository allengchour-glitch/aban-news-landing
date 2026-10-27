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
 * Nur wenn die SKU eine PID ist (`strategien()` liefert genau [['pid', …]]): eine SKU, die schon eine Variante nennt (`CJYD…`), bleibt unberührt.
 * Rein, ohne Netz, getestet in sku_nachziehen_test.mjs.
 */

/**
 * @param {{wege:Array<[string,string]>, vsRoh:Array<{vid:string,sku:string}>, vs:Array<{vid:string,sku:string}>}} a
 *   wege  = Ergebnis von strategien(shopSku); vsRoh = alle CJ-Varianten; vs = Varianten NACH dem Stecker-Filter
 * @returns {null | {neueSku:string, vid:string, anzahlCj:number}}  null = nichts zu tun
 */
export function skuNachziehen({ wege, vsRoh, vs }) {
  if (!Array.isArray(wege) || wege.length !== 1 || wege[0][0] !== 'pid') return null;   // die SKU nennt schon eine Variante (oder ist unbekannt)
  if (!Array.isArray(vsRoh) || !Array.isArray(vs)) return null;
  if (vsRoh.length <= 1 || vs.length !== 1) return null;                                // wirklich nur eine CJ-Variante: pid ist eindeutig
  const sku = String(vs[0]?.sku || '').trim();
  if (!/^CJ[A-Z0-9]{5,}$/i.test(sku)) return null;                                      // keine brauchbare CJ-Variantennummer: nicht raten
  if (!vs[0]?.vid) return null;
  // Zwei CJ-Varianten mit derselben Nummer wären nicht eindeutig
  if (vsRoh.filter(v => String(v.sku || '').trim().toUpperCase() === sku.toUpperCase()).length !== 1) return null;
  return { neueSku: sku, vid: String(vs[0].vid), anzahlCj: vsRoh.length };
}
