/**
 * Chargenplan (Wochenplan) der Modell-Fabrik. Rein: kein Netz, keine Uhr (das Startdatum kommt hinein).
 *
 * Shopify begrenzt NEUE Varianten für den GANZEN Shop auf rund 9 500 je 24 Stunden (beobachteter Höchstwert, siehe automation/grind2.mjs: «unter dem beobachteten Höchstwert ~9 500»).
 * Der nächtliche Auswahl-Lauf braucht davon viel (GEMESSEN am 27.10.2026: 11 449 Varianten in 24 h im Ledger gezählt). Darum plant die Fabrik bewusst klein: höchstens `proLauf`
 * (Vorgabe 3 000) neue Varianten je Lauf und Tag, und nur so viel, wie nach der Grundlast der anderen Läufe (`grundlast`, Vorgabe 6 500, SETZUNG) unter `tagesLimit` bleibt.
 * Wer den Verbrauch der letzten 24 Stunden kennt (`verbraucht24h`, aus den Ledgern), gibt ihn für Tag 1 an.
 * Ein Produkt wird nie geteilt (höchstens 100 Varianten, immer ganz oder gar nicht).
 */
export const CHARGE = Object.freeze({ proLauf: 3000, tagesLimit: 9500, grundlast: 6500 });
/** Reihenfolge nach Printful-Typ: gängige Alltagsprodukte zuerst (Setzung). */
export const TYP_REIHENFOLGE = Object.freeze(['T-SHIRT', 'MUG', 'POSTER', 'PHONE-CASE', 'CANVAS', 'FRAMED-POSTER', 'DRINKWARE', 'EMBROIDERY', 'STICKER', 'SUBLIMATION', 'DECOR', 'CANDLE', 'PUZZLE', 'DTFILM', 'KNITWEAR', 'CUT-SEW', 'DIRECT-TO-FABRIC', 'POSTCARD']);
const rang = (t) => { const i = TYP_REIHENFOLGE.indexOf(String(t).toUpperCase()); return i < 0 ? 99 : i; };
const addTage = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/**
 * @param {{handle:string, printfulProductId:number, typ:string, stufe:number, anlegbar:boolean, varianten:{length:number}}[]} plaene
 * @param {{proLauf?:number, tagesLimit?:number, grundlast?:number, verbraucht24h?:number|null, start:string, maxTage?:number}} o  start = Datum «JJJJ-MM-TT» des ersten Laufs
 * @returns {{kapazitaetProTag:number, tage:{tag:string, lauf:number, handles:string[], varianten:number, kapazitaet:number}[], nichtEingeplant:{handle:string, grund:string}[], gesamtVarianten:number, hinweis:string[]}}
 */
export function chargenPlan(plaene, o) {
  const proLauf = o.proLauf ?? CHARGE.proLauf, tagesLimit = o.tagesLimit ?? CHARGE.tagesLimit, grundlast = o.grundlast ?? CHARGE.grundlast, maxTage = o.maxTage ?? 60;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.start ?? '')) throw new TypeError('chargenPlan: start muss «JJJJ-MM-TT» sein');
  const hinweis = [];
  const kap = Math.max(0, Math.min(proLauf, tagesLimit - grundlast));
  const kapTag1 = o.verbraucht24h != null ? Math.max(0, Math.min(proLauf, tagesLimit - o.verbraucht24h)) : kap;
  if (kap === 0) hinweis.push(`Keine Kapazität: Tageslimit ${tagesLimit} minus Grundlast ${grundlast} lässt nichts übrig.`);
  const nichtEingeplant = [];
  const gut = [];
  for (const p of plaene) {
    if (!p.anlegbar) { nichtEingeplant.push({ handle: p.handle ?? String(p.printfulProductId), grund: 'Tore nicht bestanden' }); continue; }
    if (p.varianten.length > kap) { nichtEingeplant.push({ handle: p.handle, grund: `${p.varianten.length} Varianten passen nicht in einen Lauf (Kapazität ${kap})` }); continue; }
    gut.push(p);
  }
  gut.sort((a, b) => (a.stufe - b.stufe) || (rang(a.typ) - rang(b.typ)) || (a.printfulProductId - b.printfulProductId));
  const tage = [];
  let rest = [...gut], t = 0;
  while (rest.length && t < maxTage) {
    const cap = t === 0 ? kapTag1 : kap;
    const tag = { tag: addTage(o.start, t), lauf: t + 1, handles: [], varianten: 0, kapazitaet: cap };
    const uebrig = [];
    for (const p of rest) { if (tag.varianten + p.varianten.length <= cap) { tag.handles.push(p.handle); tag.varianten += p.varianten.length; } else uebrig.push(p); }   // Lücken füllen: ein kleineres Produkt darf vor ein grösseres rutschen
    if (tag.handles.length) tage.push(tag);
    else if (t === 0) hinweis.push(`Tag 1: Kapazität ${cap} Varianten, kein Produkt passt hinein.`);
    rest = uebrig; t++;
    if (cap === 0 && t > 1) break;
  }
  for (const p of rest) nichtEingeplant.push({ handle: p.handle, grund: `nicht innerhalb von ${maxTage} Tagen einplanbar` });
  return { kapazitaetProTag: kap, tage, nichtEingeplant, gesamtVarianten: gut.reduce((s, p) => s + p.varianten.length, 0), hinweis };
}
