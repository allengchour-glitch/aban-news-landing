/**
 * Optionswerte umbenennen (z. B. «Gold black skin white» → «Gold, schwarzes Band, weisses Zifferblatt»): reiner Plan mit Sicherungen.
 * Rein, getestet (option_umbenennen_test.mjs). Der Plan nennt je Wert die Änderung ODER den Grund, warum er nicht gilt.
 *
 * Regeln: der alte Wert muss exakt existieren; der neue ist nicht leer, höchstens 60 Zeichen, ohne ß, ohne Marke, ohne Zahl, die nicht schon im alten Wert stand;
 * zwei Werte derselben Option dürfen nicht denselben neuen Namen bekommen (auch nicht einen schon vorhandenen) — sonst verschmelzen Varianten.
 */
import { zahlen, VERBOTEN } from './fakten_block.mjs';

/** @param {{id:string,name:string,optionValues:{id:string,name:string}[]}[]} optionen  Optionen des Produkts
 *  @param {Record<string,Record<string,string>>} wunsch  { Optionsname: { alt: neu } } */
export function plane(optionen, wunsch) {
  const aenderungen = [], abgelehnt = [];
  for (const [oname, map] of Object.entries(wunsch || {})) {
    const o = optionen.find(x => x.name === oname);
    if (!o) { abgelehnt.push(`Option «${oname}» gibt es nicht`); continue; }
    const vorhanden = new Map(o.optionValues.map(v => [v.name, v.id]));
    const danach = new Set(o.optionValues.map(v => v.name));
    const gewaehlt = [];
    for (const [alt, neuRoh] of Object.entries(map || {})) {
      const neu = String(neuRoh ?? '').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
      if (!vorhanden.has(alt)) { abgelehnt.push(`${oname}: Wert «${alt}» gibt es nicht`); continue; }
      if (!neu || neu === alt) continue;
      if (neu.length > 60) { abgelehnt.push(`${oname}: «${neu.slice(0, 30)}…» zu lang`); continue; }
      if (VERBOTEN.test(neu)) { abgelehnt.push(`${oname}: «${neu}» enthält ein verbotenes Wort`); continue; }
      const fremdeZahl = zahlen(neu).filter(z => !zahlen(alt).includes(z));
      if (fremdeZahl.length) { abgelehnt.push(`${oname}: «${neu}» führt Zahl ${fremdeZahl[0]} ein`); continue; }
      gewaehlt.push({ alt, neu, id: vorhanden.get(alt) });
    }
    // Kollisionen: nach dem Umbenennen muss jeder Name einmalig sein
    const ziel = new Map(); for (const v of o.optionValues) ziel.set(v.name, v.name);
    for (const g of gewaehlt) ziel.set(g.alt, g.neu);
    const zaehler = new Map(); for (const n of ziel.values()) zaehler.set(n, (zaehler.get(n) || 0) + 1);
    for (const g of gewaehlt) { if (zaehler.get(g.neu) > 1) abgelehnt.push(`${oname}: «${g.neu}» würde Werte verschmelzen`); else aenderungen.push({ option: o.name, optionId: o.id, valueId: g.id, alt: g.alt, neu: g.neu }); }
    void danach;
  }
  return { aenderungen, abgelehnt };
}
