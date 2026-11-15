/**
 * Übersetzungen eines Menü-Eintrags sichern und nach menuUpdate wieder eintragen (rein bis auf die eingespeiste Abfrage `q`).
 *
 * WARUM (GEMESSEN 12.11.2026, «Ersatzteile & Zubehör» von «Putzen & Haushalt» unter «Elektronik»): menuUpdate behielt die id des
 * verschobenen Eintrags, warf aber seine französische Übersetzung weg (translations(locale:"fr") danach leer); die Übersetzungen aller
 * anderen Einträge blieben. Das Werkzeug liest darum die Übersetzungen des Eintrags VOR dem Schreiben und trägt fehlende danach mit
 * frischem Digest wieder ein. Die Übersetzung hängt an gid://shopify/Link/<Nummer der MenuItem-id>.
 */
export const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
export const LOC_Q = 'query{ shopLocales{ locale primary } }';
export const REG_M = 'mutation($id:ID!,$t:[TranslationInput!]!){ translationsRegister(resourceId:$id, translations:$t){ translations{ key locale value } userErrors{ field message } } }';

/** gid://shopify/MenuItem/123 → gid://shopify/Link/123 (null bei anderer Form). */
export function linkGid(menuItemId) {
  const m = /^gid:\/\/shopify\/MenuItem\/(\d+)$/.exec(String(menuItemId || ''));
  return m ? `gid://shopify/Link/${m[1]}` : null;
}

/** Abfrage der Übersetzungen für die gegebenen Sprachen (eine Abfrage mit Aliasen t0, t1 …). Wirft bei ungültigem Sprachcode. */
export function uebQ(locales) {
  for (const l of locales) if (!LOCALE_RE.test(l)) throw new Error(`ungültiger Sprachcode «${l}»`);
  const t = locales.map((l, n) => `t${n}: translations(locale:"${l}"){ key value }`).join(' ');
  return `query($id:ID!){ translatableResource(resourceId:$id){ translatableContent{ key digest } ${t} } }`;
}

/** Lesen: { locales, werte:[{locale,key,value}], digest:{key:digest} }. Wirft, wenn die Antwort nicht die erwartete Form hat. */
export async function uebersetzungenLesen(q, menuItemId) {
  const rid = linkGid(menuItemId);
  if (!rid) throw new Error(`keine MenuItem-id: «${menuItemId}»`);
  const sl = (await q(LOC_Q, {}))?.shopLocales;
  if (!Array.isArray(sl)) throw new Error('shopLocales nicht lesbar');
  const locales = sl.filter(x => x && !x.primary).map(x => x.locale);
  if (!locales.length) return { rid, locales, werte: [], digest: {} };
  const tr = (await q(uebQ(locales), { id: rid }))?.translatableResource;
  if (!tr || !Array.isArray(tr.translatableContent)) throw new Error(`translatableResource ${rid} nicht lesbar`);
  const digest = Object.fromEntries(tr.translatableContent.map(c => [c.key, c.digest]));
  const werte = [];
  locales.forEach((l, n) => { const t = tr[`t${n}`]; if (!Array.isArray(t)) throw new Error(`Übersetzungen ${l} nicht lesbar`); for (const x of t) if (x?.value) werte.push({ locale: l, key: x.key, value: x.value }); });
  return { rid, locales, werte, digest };
}

/** Welche Übersetzungen von vorher fehlen nachher oder haben einen anderen Wert? */
export function fehlendeUebersetzungen(vorher, nachher) {
  const da = new Map((nachher || []).map(w => [`${w.locale}\u0000${w.key}`, w.value]));
  return (vorher || []).filter(w => da.get(`${w.locale}\u0000${w.key}`) !== w.value);
}

/** Fehlende wieder eintragen (je Sprache ein Aufruf), danach frisch lesen. @returns {{eingetragen:number, fehler:string[]}} */
export async function uebersetzungenWiederherstellen(q, menuItemId, vorher) {
  const jetzt = await uebersetzungenLesen(q, menuItemId);
  const fehlt = fehlendeUebersetzungen(vorher, jetzt.werte);
  if (!fehlt.length) return { eingetragen: 0, fehler: [] };
  const fehler = [];
  for (const l of [...new Set(fehlt.map(w => w.locale))]) {
    const t = fehlt.filter(w => w.locale === l).map(w => ({ key: w.key, locale: l, value: w.value, translatableContentDigest: jetzt.digest[w.key] }));
    const ohne = t.filter(x => !x.translatableContentDigest);
    if (ohne.length) { fehler.push(`${l}: kein Digest für ${ohne.map(x => x.key).join(', ')}`); continue; }
    const r = (await q(REG_M, { id: jetzt.rid, t }))?.translationsRegister;
    if (!r || (r.userErrors || []).length) fehler.push(`${l}: translationsRegister ${JSON.stringify(r?.userErrors ?? r)}`);
  }
  const danach = await uebersetzungenLesen(q, menuItemId);
  const rest = fehlendeUebersetzungen(vorher, danach.werte);
  for (const w of rest) fehler.push(`${w.locale} ${w.key} fehlt nach dem Eintragen noch`);
  return { eingetragen: fehlt.length - rest.length, fehler };
}
