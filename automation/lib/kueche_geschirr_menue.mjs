/**
 * Menü-Umbau 03.11.2026 («kochen geschirr trennen»): «Wohnen & Garten» trug 18 Gruppen in einem Mega-Menü (unten abgeschnitten), Kochen, Küchenhelfer, Küchengeräte,
 * Geschirr und Trinken standen zwischen Putzen, Bad und Deko. Jetzt:
 *   «Küche & Kochen»   → Kochen, Grillen & Backen · Küchenhelfer & Vorrat · Küchengeräte
 *   «Geschirr & Tisch» → Geschirr, Besteck & Tisch · Kaffee, Tee & Trinken
 *   «Wohnen & Garten»  → der Rest, in sinnvoller Reihenfolge (Wohnen/Deko · Haus · Garten/Werkzeug/Bau)
 * Jede der fünf Gruppen bekommt eine eigene Sammlung (vorher zeigte der Gruppenkopf nur seine erste Kind-Sammlung, z. B. «Kochen, Grillen & Backen» nur Pfannen), die zwei
 * neuen Köpfe die Vereinigung ihrer Gruppen. Der bisherige Ziel-Link des Gruppenkopfes steht danach als ERSTES Kind der Gruppe (nichts geht verloren).
 *
 * Rein (kein Netz). Prüfregel `pruefeUmbau`: jedes Ziel, das vorher im Ast stand, steht danach noch genau so oft im Menü; neu sind nur die sieben Sammlungen; Tiefe höchstens 3;
 * die drei Köpfe stehen an der Stelle von «Wohnen & Garten»; alles ausserhalb dieses Astes ist unverändert.
 * Die Sammlungen legt kueche_geschirr_gruppen.mjs mit dem Lauf aus schmuck_gruppen.mjs an (Regel: ein Produkt trägt mindestens eines der Tags sort-<kind>).
 */

export const ELTERN = 'Wohnen & Garten';
export const MAX_TITEL = 34;
export const NEU_BESCHREIBUNG_ENDE = 'Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.';

/** Die fünf Gruppen: `ausser` = Kind-Sammlungen, die im Menü bleiben, aber NICHT in die Vereinigung gehören (Fremdkörper, in der Gegenprobe gemessen 03.11.2026). */
export const GRUPPEN = [
  { titel: 'Kochen, Grillen & Backen', handle: 'kochen-grillen-backen', ober: 'kueche', ausser: [],
    beschreibung: 'Pfannen und Woks, Töpfe und Kochgeschirr-Sets, Backformen und Backbleche, Grillpfannen und Elektrogrills.' },
  { titel: 'Küchenhelfer & Vorrat', handle: 'kuechenhelfer-vorrat', ober: 'kueche', ausser: ['waagen'],
    beschreibung: 'Schneidebretter, Gemüseschneider und Reiben, Kochlöffel und Zangen, Siebe, Küchenwaagen, Organizer und Vorratsdosen.' },
  { titel: 'Küchengeräte', handle: 'kuechengeraete-alle', ober: 'kueche', ausser: ['haushaltsgeraete'],
    beschreibung: 'Mixer, Entsafter und Zerkleinerer, Fritteusen, Reiskocher, Waffeleisen und Toaster, Vakuumiergeräte und weiteres Zubehör für die Küche.' },
  { titel: 'Geschirr, Besteck & Tisch', handle: 'geschirr-besteck-tisch', ober: 'geschirr', ausser: [],
    beschreibung: 'Teller, Schalen und Geschirrsets, Servierplatten, Besteck und Essstäbchen, Tischdecken und Platzsets, Lunchboxen und Kühltaschen.' },
  { titel: 'Kaffee, Tee & Trinken', handle: 'kaffee-tee-trinken', ober: 'geschirr', ausser: [],
    beschreibung: 'Wasserkocher, Kaffeemaschinen und Mühlen, Teekannen und Kaffeeservice, Tassen, Thermobecher, Trinkflaschen sowie Bar- und Weinzubehör.' },
];
export const KUECHE = { titel: 'Küche & Kochen', handle: 'kueche-kochen', ober: 'kueche',
  beschreibung: 'Alles zum Kochen: Pfannen, Töpfe und Backformen, Küchenhelfer wie Schneidebretter, Reiben und Vorratsdosen sowie Küchengeräte von Mixer bis Fritteuse.' };
export const GESCHIRR = { titel: 'Geschirr & Tisch', handle: 'geschirr-tisch', ober: 'geschirr',
  beschreibung: 'Alles für den gedeckten Tisch: Teller, Besteck und Servierplatten, Tischdecken und Lunchboxen, dazu Tassen, Teekannen, Trinkflaschen und Bar-Zubehör.' };
export const OBER = [KUECHE, GESCHIRR];
/** Kürzere Menütitel für die Sammlungen, die als erstes Kind der Gruppe neu im Menü erscheinen (Shop-Titel sind teils zu lang). */
export const KURZ = { 'pfannen-woks': 'Pfannen & Woks', 'schneidebretter-bretter': 'Schneidebretter', 'mixer-entsafter-zerkleinerer': 'Mixer, Entsafter & Zerkleinerer',
  'teller-schalen-geschirrsets': 'Teller, Schalen & Geschirrsets', 'wasserkocher-kaffeemaschinen': 'Wasserkocher & Kaffeemaschinen' };
/** Reihenfolge der übrigen Gruppen in «Wohnen & Garten». Unbekannte Gruppen hängen am Ende (nichts geht verloren). */
export const REST_REIHENFOLGE = ['Kissen, Decken & Bettwäsche', 'Fenster, Wand & Uhren', 'Deko & Kerzen', 'Raumluft & Klima', 'Beleuchtung',
  'Aufbewahrung & Möbel', 'Bad', 'Putzen & Haushalt', 'Basteln & DIY', 'Garten & Outdoor', 'Werkzeug & Maschinen', 'Sanitär & Wasser', 'Bau, Türen & Befestigung'];

export const SEO = text => `${text} ${NEU_BESCHREIBUNG_ENDE}`;
export const neueHandles = () => [...GRUPPEN.map(g => g.handle), ...OBER.map(o => o.handle)];

const kopie = x => JSON.parse(JSON.stringify(x));
const ohneIds = items => items.map(i => { const { id, ...r } = i; return { ...r, items: ohneIds(i.items || []) }; });
export const ziel = e => `${e.type}|${e.resourceId || e.url || ''}`;
/** Alle Ziele eines Baums, in Reihenfolge (Knoten vor Kindern). */
export const ziele = items => items.flatMap(i => [ziel(i), ...ziele(i.items || [])]);
/** Handle einer Collection aus der Menü-Adresse (/collections/<handle>, mit oder ohne /en/-Präfix, mit oder ohne Domain). */
export const handleVon = e => { const m = /\/collections\/([a-z0-9-]+)(?:[/?#]|$)/i.exec(String(e?.url || '')); return m ? m[1].toLowerCase() : null; };
const gruppeNach = (baum, titel) => [ELTERN, KUECHE.titel, GESCHIRR.titel].flatMap(t => baum.find(x => x.title === t)?.items || []).find(g => g.title === titel);
/** Kinder-Handles einer Gruppe: erst der Kopf (sein Ziel), dann die Kinder, ohne Wiederholung. */
const gruppenHandles = g => { const hs = []; for (const e of [g, ...(g?.items || [])]) { const h = handleVon(e); if (h && !hs.includes(h)) hs.push(h); } return hs; };

/**
 * Baut den neuen Baum. `gids`: Handle → GID (die sieben neuen Sammlungen UND die Ziele der Gruppenköpfe), `titel`: Handle → Shop-Titel.
 * Gibt `fehler` zurück (nichts umgebaut), wenn ein Teil fehlt oder der Umbau schon gelaufen ist.
 * @returns {{baum: object[], log: string[], fehler: string[]}}
 */
export function kuecheGeschirrMenue(baum, gids, titel = {}) {
  const b = kopie(baum), log = [], fehler = [];
  const i = b.findIndex(x => x.title === ELTERN);
  if (i < 0) return { baum: b, log, fehler: [`oberster Punkt «${ELTERN}» nicht gefunden`] };
  for (const o of OBER) if (b.some(x => x.title === o.titel)) return { baum: b, log: [`ÜBERSPRUNGEN: «${o.titel}» steht schon im Menü`], fehler: ['schon umgebaut'] };
  for (const h of neueHandles()) if (!gids[h]) fehler.push(`Sammlung ${h} fehlt im Shop (oder ist im Onlineshop nicht erreichbar)`);
  const alt = b[i], gruppen = alt.items || [];
  const neueGruppen = {};
  for (const g of GRUPPEN) {
    const x = gruppen.find(y => y.title === g.titel);
    if (!x) { fehler.push(`Gruppe fehlt im Menü: ${g.titel}`); continue; }
    const kopfH = handleVon(x), kopfZiel = x.resourceId || x.url;
    if (!kopfH || !kopfZiel) { fehler.push(`Gruppenkopf «${g.titel}» hat kein Sammlungs-Ziel`); continue; }
    if ((x.items || []).some(c => handleVon(c) === kopfH)) { fehler.push(`Gruppe «${g.titel}»: das Ziel des Kopfes (${kopfH}) steht schon unter den Kindern`); continue; }
    if (!gids[kopfH]) fehler.push(`Ziel des Gruppenkopfes «${g.titel}» (${kopfH}) fehlt im Shop`);
    const erstes = { title: KURZ[kopfH] || titel[kopfH] || x.title, type: x.type, ...(x.resourceId ? { resourceId: x.resourceId } : {}), ...(x.url ? { url: x.url } : {}),
      ...(x.tags?.length ? { tags: x.tags } : {}), items: [] };
    neueGruppen[g.titel] = { title: g.titel, type: 'COLLECTION', resourceId: gids[g.handle], items: ohneIds([erstes, ...(x.items || [])]) };
  }
  if (fehler.length) return { baum: b, log, fehler };
  const genommen = new Set(GRUPPEN.map(g => g.titel));
  const rest = gruppen.filter(g => !genommen.has(g.title));
  const rang = t => { const p = REST_REIHENFOLGE.indexOf(t); return p < 0 ? 1000 : p; };
  const unbekannt = rest.filter(g => rang(g.title) === 1000).map(g => g.title);
  if (unbekannt.length) log.push(`Gruppen ausserhalb der Reihenfolge (hängen am Ende, bleiben erhalten): ${unbekannt.join(' ; ')}`);
  const restSortiert = rest.map((g, n) => ({ g, n })).sort((a, c) => rang(a.g.title) - rang(c.g.title) || a.n - c.n).map(x => x.g);
  const kopf = o => ({ title: o.titel, type: 'COLLECTION', resourceId: gids[o.handle], items: GRUPPEN.filter(g => g.ober === o.ober).map(g => neueGruppen[g.titel]) });
  b.splice(i, 1, kopf(KUECHE), kopf(GESCHIRR), { ...alt, items: restSortiert });
  log.push(`«${ELTERN}»: ${gruppen.length} Gruppen → «${KUECHE.titel}» ${GRUPPEN.filter(g => g.ober === 'kueche').length} · «${GESCHIRR.titel}» ${GRUPPEN.filter(g => g.ober === 'geschirr').length} · «${ELTERN}» ${restSortiert.length}`);
  return { baum: b, log, fehler };
}

/**
 * Prüft den Umbau gegen den alten Baum. Gibt die Fehler zurück (leer = in Ordnung). `nachlesen`: der Baum kommt aus Shopify zurück (gleiche Prüfung, Ids dürfen anders sein).
 * Verlangt: Tiefe ≤ 3, nichts verloren, nichts zusätzlich ausser den sieben neuen Sammlungen (genau je einmal als Kopf), die drei Köpfe an der Stelle von «Wohnen & Garten»,
 * alles ausserhalb unverändert, die erste Kind-Sammlung jeder Gruppe ist das alte Kopf-Ziel.
 */
export function pruefeUmbau(alt, neu, gids = {}) {
  const f = [];
  const tiefe = (items, d = 1) => items.length ? Math.max(...items.map(x => (x.items?.length ? tiefe(x.items, d + 1) : d))) : 0;
  if (tiefe(neu) > 3) f.push(`Tiefe ${tiefe(neu)} > 3`);
  const zaehle = z => z.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const za = zaehle(ziele(alt)), zn = zaehle(ziele(neu));
  const erlaubt = new Set(neueHandles().map(h => `COLLECTION|${gids[h]}`));
  for (const [z, n] of Object.entries(za)) if ((zn[z] || 0) < n) f.push(`verloren: ${z} (${n} → ${zn[z] || 0})`);
  for (const [z, n] of Object.entries(zn)) if (n > (za[z] || 0) && !erlaubt.has(z)) f.push(`zusätzlich: ${z}`);
  for (const h of neueHandles()) { const n = zn[`COLLECTION|${gids[h]}`] || 0; if (gids[h] && n !== 1) f.push(`neue Sammlung ${h} steht ${n}× im Menü (erwartet 1×)`); }
  const pos = alt.findIndex(x => x.title === ELTERN);
  if (pos < 0) f.push(`«${ELTERN}» fehlt im alten Baum`);
  if (neu.map(x => x.title).slice(pos, pos + 3).join('|') !== [KUECHE.titel, GESCHIRR.titel, ELTERN].join('|')) f.push('die drei Köpfe stehen nicht an der Stelle von «Wohnen & Garten»');
  if (neu.length !== alt.length + 2) f.push(`oberste Einträge ${alt.length} → ${neu.length} (erwartet +2)`);
  const eigene = [KUECHE.titel, GESCHIRR.titel, ELTERN];
  if (JSON.stringify(ohneIdsBaum(alt.filter(x => x.title !== ELTERN))) !== JSON.stringify(ohneIdsBaum(neu.filter(x => !eigene.includes(x.title))))) f.push('Einträge ausserhalb von «Wohnen & Garten» haben sich verändert');
  const eltern = neu.find(x => x.title === ELTERN), altEltern = alt.find(x => x.title === ELTERN);
  if (eltern && altEltern) {
    const rest = new Set(GRUPPEN.map(g => g.titel));
    const soll = altEltern.items.filter(g => !rest.has(g.title)).map(g => g.title).sort(), ist = eltern.items.map(g => g.title).sort();
    if (JSON.stringify(soll) !== JSON.stringify(ist)) f.push(`«${ELTERN}» enthält andere Gruppen als erwartet: ${ist.join(' ; ')}`);
    for (const t of soll) { const a1 = altEltern.items.find(g => g.title === t), n1 = eltern.items.find(g => g.title === t); if (!n1 || JSON.stringify(ohneIdsBaum([a1])) !== JSON.stringify(ohneIdsBaum([n1]))) f.push(`Gruppe «${t}» wurde verändert oder fehlt`); }
  }
  for (const o of OBER) {
    const k = neu.find(x => x.title === o.titel);
    if (!k) { f.push(`Kopf «${o.titel}» fehlt`); continue; }
    if (gids[o.handle] && k.resourceId !== gids[o.handle]) f.push(`Kopf «${o.titel}» zeigt auf das falsche Ziel`);
    const soll = GRUPPEN.filter(g => g.ober === o.ober).map(g => g.titel);
    if (JSON.stringify((k.items || []).map(x => x.title)) !== JSON.stringify(soll)) f.push(`Kopf «${o.titel}»: Gruppen ${(k.items || []).map(x => x.title).join(' ; ')} statt ${soll.join(' ; ')}`);
    for (const g of k.items || []) {
      const def = GRUPPEN.find(x => x.titel === g.title), a = altEltern?.items.find(x => x.title === g.title);
      if (!def || !a) continue;
      if (gids[def.handle] && g.resourceId !== gids[def.handle]) f.push(`Gruppe «${g.title}» zeigt auf das falsche Ziel`);
      const erst = (g.items || [])[0];
      if (!erst || ziel(erst) !== ziel({ type: a.type, resourceId: a.resourceId, url: a.url })) f.push(`Gruppe «${g.title}»: das alte Kopf-Ziel steht nicht als erstes Kind`);
      const rest = (g.items || []).slice(1);
      if (JSON.stringify(ohneIdsBaum(rest)) !== JSON.stringify(ohneIdsBaum(a.items || []))) f.push(`Gruppe «${g.title}»: die übrigen Kinder haben sich verändert`);
    }
  }
  return f;
}
const ohneIdsBaum = items => (items || []).filter(Boolean).map(i => ({ title: i.title, type: i.type, z: i.resourceId || i.url || '', items: ohneIdsBaum(i.items || []) }));

/** Menütitel über 34 Zeichen (Hinweis, Kopfzeile bricht um). */
export const titelWarnungen = baum => {
  const w = [], geh = (items, pfad = []) => items.forEach(i => { if (i.title.length > MAX_TITEL) w.push(`${[...pfad, i.title].join(' > ')} (${i.title.length})`); geh(i.items || [], [...pfad, i.title]); });
  geh(baum); return w;
};

/**
 * Plan der sieben Sammlungen für gruppenLauf (schmuck_gruppen.mjs): Tag-ODER-Regel über die Tags der Kinder.
 * `tagVon(handle)` liefert das Tag `sort-…` einer vorhandenen Kind-Sammlung (nur wenn ihre Regel genau `TAG EQUALS <tag>` ist) oder null (Titel-Regel, manuell: kommt nicht in die Vereinigung).
 * Gruppe: alle Kinder des Menüs inkl. Kopf-Ziel minus `ausser`; Kopf: die Vereinigung seiner Gruppen.
 * Form wie rucksaecke_menue.gruppenPlan(): { handle, titel, beschreibung, seoBeschreibung, kinder:[{handle,tag}], ohneTag, regel }.
 */
export function gruppenPlan(baum, tagVon) {
  const eintrag = (handle, titelX, text, handles) => {
    const kinder = handles.map(h => ({ handle: h, tag: tagVon(h) || null }));
    const mit = kinder.filter(c => c.tag), tags = [...new Set(mit.map(c => c.tag))];
    return { handle, titel: titelX, beschreibung: text, seoBeschreibung: SEO(text), kinder, ohneTag: kinder.filter(c => !c.tag).map(c => c.handle),
      regel: { appliedDisjunctively: true, rules: tags.map(t => ({ column: 'TAG', relation: 'EQUALS', condition: t })) } };
  };
  const proGruppe = GRUPPEN.map(g => ({ g, handles: gruppenHandles(gruppeNach(baum, g.titel)).filter(h => !g.ausser.includes(h)) }));
  return [
    ...proGruppe.map(({ g, handles }) => eintrag(g.handle, g.titel, g.beschreibung, handles)),
    ...OBER.map(o => eintrag(o.handle, o.titel, o.beschreibung, [...new Set(proGruppe.filter(x => x.g.ober === o.ober).flatMap(x => x.handles))])),
  ];
}

/** Erwartete Mitglieder je Sammlung aus einem Katalog (Produkte mit `tags`): Vereinigung der Tags der Regel. */
export const erwartetAus = (produkte, plan) => Object.fromEntries(plan.map(p => {
  const tags = new Set(p.regel.rules.map(r => r.condition));
  return [p.handle, produkte.filter(x => (x.tags || []).some(t => tags.has(t))).length];
}));
