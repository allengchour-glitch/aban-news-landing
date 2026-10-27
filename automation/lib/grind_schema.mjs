/**
 * Vergleich der eingebetteten Eingabetypen (lib/grind_plan.mjs → SCHEMA, SCHEMA_ENUMS) mit der Introspektion der ECHTEN Admin-API. Rein: die Introspektion wird übergeben
 * (Werkzeug: automation/grind_schema_pruefen.mjs, nur lesen). Anlass (27.10.2026): die erste Fassung der Tabelle stammte aus dem MCP-Schemaleser (Admin 2026-10) und wich im Typ
 * ProductVariantSetInput von der gefahrenen Version 2026-01 ab.
 */

/** GraphQL-Typ aus der Introspektion → Text wie in SCHEMA («[FileSetInput!]», «String», «Boolean!»). */
export function typText(t) {
  if (!t) return '?';
  if (t.kind === 'NON_NULL') return typText(t.ofType) + '!';
  if (t.kind === 'LIST') return '[' + typText(t.ofType) + ']';
  return t.name;
}

/**
 * @param {string} name  Typname  @param {Record<string,string>} felder  Felder in SCHEMA  @param {Record<string,string>} echt  Felder der Introspektion (Name → Typtext)
 * @returns {{fehlt:string[], neu:string[], typ:string[], pflicht:string[], ok:boolean}}
 *   fehlt = im SCHEMA, aber nicht in der API · neu = in der API, aber nicht im SCHEMA · typ = anderer Typ · pflicht = anderes Pflicht-Ausrufezeichen. 'offen' wird nicht verglichen.
 */
export function vergleicheTyp(name, felder, echt) {
  const fehlt = Object.keys(felder).filter(k => !(k in echt));
  const neu = Object.keys(echt).filter(k => !(k in felder));
  const beide = Object.keys(felder).filter(k => k in echt && felder[k] !== 'offen');
  const typ = beide.filter(k => felder[k].replace(/!$/, '') !== echt[k].replace(/!$/, '')).map(k => `${k}: ${felder[k]} ≠ ${echt[k]}`);
  const pflicht = beide.filter(k => felder[k].replace(/!$/, '') === echt[k].replace(/!$/, '') && felder[k].endsWith('!') !== echt[k].endsWith('!'));
  return { name, fehlt, neu, typ, pflicht, ok: !fehlt.length && !neu.length && !typ.length && !pflicht.length };
}

/** Enum-Werte im SCHEMA gegen die API: {fehlt (im SCHEMA, nicht in der API), neu (in der API, nicht im SCHEMA)}. */
export function vergleicheEnum(werte, echt) {
  const fehlt = werte.filter(x => !echt.includes(x)), neu = echt.filter(x => !werte.includes(x));
  return { fehlt, neu, ok: !fehlt.length && !neu.length };
}
