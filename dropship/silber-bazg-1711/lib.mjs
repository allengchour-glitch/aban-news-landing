// Silber «925» vorläufig auf ENTWURF (Besitzer 17.11.2026 «2 ja»): reine Bausteine, kein Netz, kein Shop-Zugriff.
// Anlass: Schweizer Edelmetallkontrolle (BAZG-FAQ): Silberwaren im Handel brauchen Feingehaltsangabe + registrierte Verantwortlichkeitsmarke.
// Ob das für Direktversand ab Lieferant den Shop trifft, ist offen (Anfrage an das Zentralamt, ANFRAGE-EDELMETALLKONTROLLE.md). Bis zur Antwort: Entwurf, nicht löschen.

/**
 * Arbeits-Tag: macht die gehaltenen Produkte im Admin filterbar und zeigt der Rücknahme, welche Entwürfe von diesem Werkzeug stammen.
 * BEWUSST KEIN Sperr-Tag (kein «nicht-live-…», kein «compliance-…»): die Kategorie-Engine und `sperr_sort_tags_entfernen.mjs` entfernen von Produkten mit Sperr-Tag
 * die `sort-`-Tags; nach der Rücknahme fehlten die Produkte dann in allen Sammlungen. Die Sperre ist der Status ENTWURF.
 * Die Rücknahme braucht die Sicherung (sicherung.json, im Repo), nicht allein den Tag.
 */
export const MARKER = 'bazg-gehalten-1711';

/** «925» als eigene Zahl im Titel («925 Silber», «S925», «Sterling 925»), nicht Teil einer längeren Zahl («19250», «Baujahr 1925»). Gemessen 17.11.: 207 aktive Titel, 0 mit längerer Zahl. */
const MUSTER = /(?<![0-9])925(?![0-9])/;
export const hat925 = (titel) => MUSTER.test(String(titel ?? ''));

/** Aus dem Bulk-Katalog (nur aktive Produkte): alle mit 925 im Titel, die nicht schon vom Arbeits-Tag erfasst sind. Sortiert nach Handle (stabile Liste). */
export function waehleAusKatalog(produkte) {
  return (produkte || [])
    .filter((p) => p && p.id && p.handle && hat925(p.title) && !(p.tags || []).includes(MARKER))
    .map((p) => ({ id: p.id, handle: p.handle, title: p.title, productType: p.productType || '' }))
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

export const LESEN = `query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle title status tags productType
  pub:resourcePublicationsV2(first:50, onlyPublished:true){nodes{publication{id}}}
  alle:resourcePublicationsV2(first:50, onlyPublished:false){nodes{isPublished publication{id}}}}}}`;

/** Gelesenes Produkt (Antwort von LESEN) in eine flache Form bringen. */
export function flach(n) {
  if (!n || !n.id) return null;
  return {
    id: n.id, handle: n.handle, title: n.title, status: n.status, tags: n.tags || [], productType: n.productType || '',
    pubs: (n.pub?.nodes || []).map((x) => x.publication.id).sort(),
    pubsAlle: (n.alle?.nodes || []).map((x) => ({ id: x.publication.id, an: !!x.isPublished })),
  };
}

/**
 * Entscheid je Produkt vor dem Schreiben. `ist` = flach(), `inSicherung` = es gibt einen Sicherungseintrag zu dieser ID.
 * Rückgabe {tun, art, grund}; art 'voll' = Status ENTWURF + Arbeits-Tag, 'nurTag' = nur der Arbeits-Tag fehlt (Rest eines abgebrochenen Laufs).
 * ACTIVE (mit oder ohne Tag) wird (wieder) auf ENTWURF gesetzt; ENTWURF ohne Tag nur dann nachgetaggt, wenn WIR es laut Sicherung entworfen haben.
 */
export function entscheide(ist, { inSicherung = false } = {}) {
  if (!ist) return { tun: false, grund: 'Produkt nicht lesbar' };
  if (!hat925(ist.title)) return { tun: false, grund: 'Titel enthält kein 925 mehr, nicht angefasst' };
  const tag = ist.tags.includes(MARKER);
  if (ist.status === 'ACTIVE') return { tun: true, art: 'voll', grund: tag ? 'aktiv trotz Arbeits-Tag (Rest eines abgebrochenen Laufs)' : '' };
  if (ist.status === 'DRAFT') {
    if (tag) return { tun: false, grund: 'schon Entwurf mit Arbeits-Tag' };
    if (inSicherung) return { tun: true, art: 'nurTag', grund: 'Entwurf von uns, Arbeits-Tag fehlt (Rest eines abgebrochenen Laufs)' };
    return { tun: false, grund: 'Entwurf ohne Arbeits-Tag und ohne Sicherungseintrag, nicht von uns, nicht angefasst' };
  }
  return { tun: false, grund: `Status ${ist.status}, nicht angefasst` };
}

/** Kanäle, die vorher veröffentlicht waren und nachher fehlen. */
export const publikationsLuecken = (vorher, nachher) => (vorher || []).filter((id) => !(nachher || []).includes(id));

const FEHLER = '{userErrors{field message}}';

/**
 * Eine Mutation mit mehreren Produkten (Aliase s0, t0, s1, …). Je Eintrag: {id, status?: 'DRAFT'|'ACTIVE' (fehlt = Status unverändert), tag?: 'add'|'remove' (fehlt = Tags unverändert)}.
 * Status zuerst, Tag danach: fällt der Tag aus, bleibt das Produkt auf der sicheren Seite (offline).
 */
export function schreibMutation(eintraege) {
  const vars = { g: [MARKER] };
  const kopf = ['$g:[String!]!'];
  const teile = [];
  eintraege.forEach((e, i) => {
    if (e.status !== undefined) {
      if (!['DRAFT', 'ACTIVE'].includes(e.status)) throw new Error('Zielstatus nicht erlaubt: ' + e.status);
      vars[`p${i}`] = { id: e.id, status: e.status };
      kopf.push(`$p${i}:ProductUpdateInput!`);
      teile.push(`s${i}:productUpdate(product:$p${i})${FEHLER}`);
    }
    if (e.tag !== undefined) {
      if (!['add', 'remove'].includes(e.tag)) throw new Error('Tag-Art nicht erlaubt: ' + e.tag);
      vars[`i${i}`] = e.id;
      kopf.push(`$i${i}:ID!`);
      teile.push(`t${i}:${e.tag === 'add' ? 'tagsAdd' : 'tagsRemove'}(id:$i${i},tags:$g)${FEHLER}`);
    }
    if (e.status === undefined && e.tag === undefined) throw new Error('Eintrag ohne Auftrag: ' + e.id);
  });
  return { query: `mutation(${kopf.join(',')}){${teile.join(' ')}}`, variables: vars };
}

/** Anweisung je Entscheid: 'voll' → Status ENTWURF + Tag setzen; 'nurTag' → nur Tag setzen. */
export const anweisungEntwurf = (e, art) => ({ id: e.id, ...(art === 'voll' ? { status: 'DRAFT' } : {}), tag: 'add' });
/** Anweisung der Rücknahme: je nach heutigem Zustand (DRAFT mit Tag → Status zurück + Tag weg; ACTIVE mit Tag → nur Tag weg). */
export const anweisungZurueck = (e, ist) => ({ id: e.id, ...(ist.status === 'DRAFT' ? { status: e.status } : {}), ...(ist.tags.includes(MARKER) ? { tag: 'remove' } : {}) });

export const PUBLIZIEREN = `mutation($id:ID!,$in:[PublicationInput!]!){publishablePublish(id:$id,input:$in){userErrors{field message}}}`;

/** Fehler aus einer Mutationsantwort sammeln: [{alias, index, text}] (index = Stelle im Paket, aus s0/t3 …). */
export function mutationsFehler(antwort) {
  const f = [];
  for (const [k, v] of Object.entries(antwort || {})) {
    for (const e of v?.userErrors || []) {
      const m = /^[st](\d+)$/.exec(k);
      f.push({ alias: k, index: m ? Number(m[1]) : -1, text: `${k}: ${e.message} (${(e.field || []).join('.')})` });
    }
  }
  return f;
}

/**
 * Tor für den Massenlauf: die letzte PROBE-Zeile im Ledger muss höchstens `maxH` Stunden alt sein, ohne Fehler enden und «fehlend am Ende 0» und «Endstatus DRAFT» melden.
 * Ledger-Zeilen: `ISO|ART|handle|text`. Rückgabe true oder ein Grund-Text.
 */
export function probeBestanden(zeilen, jetzt, maxH = 24) {
  for (let i = (zeilen || []).length - 1; i >= 0; i--) {
    const t = String(zeilen[i]).split('|');
    if (t[1] !== 'PROBE') continue;
    const alterH = (jetzt - new Date(t[0])) / 3600000;
    if (!(alterH >= 0 && alterH <= maxH)) return `letzte Probe ist ${Number.isFinite(alterH) ? alterH.toFixed(1) : '?'} Stunden alt (Grenze ${maxH})`;
    const text = t.slice(3).join('|');
    if (/FEHLER/.test(text)) return 'letzte Probe endete mit einem Fehler';
    if (!/fehlend am Ende 0\b/.test(text) || !/Endstatus DRAFT/.test(text)) return 'letzte Probe meldet fehlende Kanäle oder falschen Endstatus';
    return true;
  }
  return 'keine Probe im Ledger';
}
