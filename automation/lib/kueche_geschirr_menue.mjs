/**
 * Menü-Umbau 03.11.2026 («kochen geschirr trennen»): «Wohnen & Garten» trug 18 Gruppen in einem Mega-Menü (unten abgeschnitten), Kochen, Küchenhelfer, Küchengeräte,
 * Geschirr und Trinken standen zwischen Putzen, Bad und Deko. Jetzt:
 *   «Küche»            → Kochen, Grillen & Backen · Küchenhelfer & Vorrat · Küchengeräte (mit Wasserkocher & Kaffeemaschinen)
 *   «Geschirr»         → Geschirr, Besteck & Tisch · Kaffee, Tee & Trinken
 *   «Wohnen & Garten»  → die 13 übrigen Gruppen, in ihrer bisherigen Reihenfolge
 * Jede der fünf Gruppen bekommt eine eigene Sammlung (vorher zeigte der Gruppenkopf nur seine erste Kind-Sammlung, z. B. «Kochen, Grillen & Backen» nur Pfannen), die zwei
 * neuen Köpfe die Vereinigung ihrer Gruppen. Der bisherige Ziel-Link des Gruppenkopfes steht danach als ERSTES Kind der Gruppe (nichts geht verloren); nur «Wasserkocher & Kaffeemaschinen»
 * (bisher Kopf-Ziel von «Kaffee, Tee & Trinken», laut Google-Kategorie zu 100 % Küchengeräte) wandert als Kind in «Küchengeräte».
 *
 * MENÜTITEL «Küche» und «Geschirr» (nicht «Küche & Kochen» / «Geschirr & Tisch»): GEMESSEN am 03.11. im Browser (Playwright, Titel im Live-Menü ausgetauscht): mit den langen Titeln rutschten bei 1440 px
 * «Wohnen & Garten» und «Elektronik» in «Mehr» (bei 1920 px Elektronik und Auto), mit den kurzen blieb die Kopfzeile fast wie vorher (1440 px: Wohnen sichtbar, nur Elektronik in «Mehr»).
 * Der erste Umbau lief mit den langen Titeln; `kopfTitelNeu` benennt sie um (ALTE_KOPFTITEL).
 *
 * Rein (kein Netz). `pruefeUmbau`: jedes Ziel, das vorher im Ast stand, steht danach noch genau so oft im Menü; neu sind nur die sieben Sammlungen; Tiefe höchstens 3; die drei Köpfe stehen an
 * der Stelle von «Wohnen & Garten»; alles ausserhalb des Astes unverändert, die behaltenen Einträge mit ihren Ids (Übersetzungen hängen an der Id). `rueckgaengigEingabe`: Rücknahme aus der Sicherung.
 * Die Sammlungen legt kueche_geschirr_gruppen.mjs mit dem Lauf aus schmuck_gruppen.mjs an (Regel: ein Produkt trägt mindestens eines der Tags sort-<kind>).
 */

export const ELTERN = 'Wohnen & Garten';
export const MAX_TITEL = 34;
export const FUSS = 'Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.';

/**
 * Die fünf Gruppen. `ausser` = Kind-Sammlungen, die im Menü bleiben, aber NICHT in die Vereinigung gehören (Fremdkörper, am 03.11.2026 im Katalog gemessen: waagen = Körper-, Haustier-, Kranwaagen,
 * haushaltsgeraete = 28 % Staubsauger/Bügeleisen). `beschreibung` steht auf der Seite, `kurz` im Meta-Text (SEO). Beide nennen nur, was in mindestens zwei Titeln der Mitglieder steht.
 */
export const GRUPPEN = [
  { titel: 'Kochen, Grillen & Backen', handle: 'kochen-grillen-backen', ober: 'kueche', ausser: [],
    beschreibung: 'Pfannen und Woks, Töpfe und Kochgeschirr-Sets, Backformen und Backbleche, Grillpfannen und Elektrogrills.',
    kurz: 'Pfannen, Töpfe, Backformen und Grillpfannen.' },
  { titel: 'Küchenhelfer & Vorrat', handle: 'kuechenhelfer-vorrat', ober: 'kueche', ausser: ['waagen'],
    beschreibung: 'Schneidebretter, Gemüseschneider und Reiben, Spatel und Kochutensilien, Siebe, Küchenwaagen, Organizer und Vorratsdosen.',
    kurz: 'Schneidebretter, Reiben, Siebe, Organizer und Vorratsdosen.' },
  { titel: 'Küchengeräte', handle: 'kuechengeraete-alle', ober: 'kueche', ausser: ['haushaltsgeraete'],
    beschreibung: 'Mixer, Entsafter und Zerkleinerer, Wasserkocher, Kaffeemaschinen und Kaffeemühlen, Fritteusen, Reiskocher, Waffeleisen und Toaster, Vakuumiergeräte und Zubehör.',
    kurz: 'Mixer, Wasserkocher, Kaffeemaschinen, Fritteusen und Toaster.' },
  { titel: 'Geschirr, Besteck & Tisch', handle: 'geschirr-besteck-tisch', ober: 'geschirr', ausser: [],
    beschreibung: 'Teller, Schalen und Geschirrsets, Servierplatten, Besteck und Essstäbchen, Tischdecken, Tischsets und Schürzen, Lunchboxen und Kühltaschen.',
    kurz: 'Teller, Besteck, Servierplatten und Tischdecken.' },
  { titel: 'Kaffee, Tee & Trinken', handle: 'kaffee-tee-trinken', ober: 'geschirr', ausser: [],
    beschreibung: 'Teekannen und Kaffeeservice, Tassen und Kaffeebecher, Thermobecher, Trinkflaschen sowie Bar- und Weinzubehör.',
    kurz: 'Teekannen, Tassen, Thermobecher und Trinkflaschen.' },
];
/** `sammlung` = Titel der Sammlung (H1 und Titel-Tag der Seite), wenn er vom Menütitel abweichen muss: «Küche & Kochen» tragen schon sub-kueche (indexiert, 3 966 Produkte) und kuche-kochen (301). */
export const KUECHE = { titel: 'Küche', sammlung: 'Küchenbedarf & Kochzubehör', handle: 'kueche-kochen', ober: 'kueche',
  beschreibung: 'Alles zum Kochen: Pfannen, Töpfe und Backformen, Küchenhelfer wie Schneidebretter, Reiben und Vorratsdosen sowie Küchengeräte von Mixer bis Fritteuse.',
  kurz: 'Pfannen, Küchenhelfer und Küchengeräte.' };
export const GESCHIRR = { titel: 'Geschirr', sammlung: 'Geschirr & Tisch', handle: 'geschirr-tisch', ober: 'geschirr',
  beschreibung: 'Geschirr und Besteck, Servierplatten und Tischdecken, dazu Tassen, Teekannen und Bar-Zubehör; für unterwegs Trinkflaschen und Lunchboxen.',
  kurz: 'Geschirr, Besteck, Tassen und Trinkflaschen.' };
export const OBER = [KUECHE, GESCHIRR];
/** Die Menütitel des ersten Umbaus (03.11. 22:11 UTC): `kopfTitelNeu` benennt sie in die kurzen um. */
export const ALTE_KOPFTITEL = { 'Küche & Kochen': 'Küche', 'Geschirr & Tisch': 'Geschirr' };
const alleKopfTitel = o => [o.titel, ...Object.entries(ALTE_KOPFTITEL).filter(([, neu]) => neu === o.titel).map(([alt]) => alt)];
/** Kurztitel für Sammlungen, die als erstes Kind der Gruppe oder als verschobenes Kind neu im Menü erscheinen (Shop-Titel sind teils zu lang). */
export const KURZ = { 'pfannen-woks': 'Pfannen & Woks', 'schneidebretter-bretter': 'Schneidebretter', 'mixer-entsafter-zerkleinerer': 'Mixer, Entsafter & Zerkleinerer',
  'teller-schalen-geschirrsets': 'Teller, Schalen & Geschirrsets', 'wasserkocher-kaffeemaschinen': 'Wasserkocher & Kaffeemaschinen' };
/** Das Kopf-Ziel einer Gruppe, das als Kind in eine andere Gruppe wandert, dort hinter dem Kind mit dem Menütitel `hinter`. */
export const VERSCHOBEN = [{ handle: 'wasserkocher-kaffeemaschinen', von: 'Kaffee, Tee & Trinken', nach: 'Küchengeräte', hinter: 'Mixer, Entsafter & Zerkleinerer' }];

export const sammlungsTitel = o => o.sammlung || o.titel;
/** Meta-Text höchstens 160 Zeichen (Google schneidet dahinter ab): «<Titel> online kaufen. <kurz> <Versandsatz>», sonst ohne den Kurztext. */
export const seoText = (titel, kurz) => { const t = `${titel} online kaufen.`, voll = `${t} ${kurz} ${FUSS}`; return voll.length <= 160 ? voll : `${t} ${FUSS}`; };
export const neueHandles = () => [...GRUPPEN.map(g => g.handle), ...OBER.map(o => o.handle)];

const kopie = x => JSON.parse(JSON.stringify(x));
const ohneIds = items => items.map(i => { const { id, ...r } = i; return { ...r, items: ohneIds(i.items || []) }; });
export const ziel = e => `${e.type}|${e.resourceId || e.url || ''}`;
/** Alle Ziele eines Baums, in Reihenfolge (Knoten vor Kindern). */
export const ziele = items => items.flatMap(i => [ziel(i), ...ziele(i.items || [])]);
/** Handle einer Collection aus der Menü-Adresse (/collections/<handle>, mit oder ohne /en/-Präfix, mit oder ohne Domain). */
export const handleVon = e => { const m = /\/collections\/([a-z0-9-]+)(?:[/?#]|$)/i.exec(String(e?.url || '')); return m ? m[1].toLowerCase() : null; };
const gruppeNach = (baum, titel) => [ELTERN, ...OBER.flatMap(alleKopfTitel)].flatMap(t => baum.find(x => x.title === t)?.items || []).find(g => g.title === titel);
/** Kinder-Handles einer Gruppe: erst der Kopf (sein Ziel), dann die Kinder, ohne Wiederholung. */
const gruppenHandles = g => { const hs = []; for (const e of [g, ...(g?.items || [])]) { const h = handleVon(e); if (h && !hs.includes(h)) hs.push(h); } return hs; };
const verschobenAus = g => VERSCHOBEN.filter(v => v.von === g.titel).map(v => v.handle);
const verschobenIn = g => VERSCHOBEN.filter(v => v.nach === g.titel).map(v => v.handle);

/**
 * Baut den neuen Baum. `gids`: Handle → GID (die sieben neuen Sammlungen UND die Ziele der Gruppenköpfe), `titel`: Handle → Shop-Titel.
 * Gibt `fehler` zurück (nichts umgebaut), wenn ein Teil fehlt oder der Umbau schon gelaufen ist (`schon umgebaut` = beide Köpfe stehen, `halb umgebaut` = nur einer).
 * @returns {{baum: object[], log: string[], fehler: string[]}}
 */
export function kuecheGeschirrMenue(baum, gids, titel = {}) {
  const b = kopie(baum), log = [], fehler = [];
  const da = OBER.filter(o => b.some(x => alleKopfTitel(o).includes(x.title)));
  if (da.length === OBER.length) return { baum: b, log: [`ÜBERSPRUNGEN: «${KUECHE.titel}» und «${GESCHIRR.titel}» stehen schon im Menü`], fehler: ['schon umgebaut'] };
  if (da.length) return { baum: b, log, fehler: [`halb umgebaut: «${da[0].titel}» steht im Menü, «${OBER.find(o => !da.includes(o)).titel}» fehlt (von Hand im Admin klären)`] };
  const i = b.findIndex(x => x.title === ELTERN);
  if (i < 0) return { baum: b, log, fehler: [`oberster Punkt «${ELTERN}» nicht gefunden`] };
  for (const h of neueHandles()) if (!gids[h]) fehler.push(`Sammlung ${h} fehlt im Shop (oder ist im Onlineshop nicht erreichbar)`);
  const alt = b[i], gruppen = alt.items || [];
  const kinder = {};      // Gruppentitel → Kinder-Einträge (ohne Ids)
  const wandernde = {};   // handle → Eintrag, der in eine andere Gruppe wandert
  for (const g of GRUPPEN) {
    const x = gruppen.find(y => y.title === g.titel);
    if (!x) { fehler.push(`Gruppe fehlt im Menü: ${g.titel}`); continue; }
    const kopfH = handleVon(x), kopfZiel = x.resourceId || x.url;
    if (!kopfH || !kopfZiel) { fehler.push(`Gruppenkopf «${g.titel}» hat kein Sammlungs-Ziel`); continue; }
    if ((x.items || []).some(c => handleVon(c) === kopfH)) { fehler.push(`Gruppe «${g.titel}»: das Ziel des Kopfes (${kopfH}) steht schon unter den Kindern`); continue; }
    if (!gids[kopfH]) fehler.push(`Ziel des Gruppenkopfes «${g.titel}» (${kopfH}) fehlt im Shop`);
    const erstes = { title: KURZ[kopfH] || titel[kopfH] || x.title, type: x.type, ...(x.resourceId ? { resourceId: x.resourceId } : {}), ...(x.url ? { url: x.url } : {}),
      ...(x.tags?.length ? { tags: x.tags } : {}), items: [] };
    if (verschobenAus(g).includes(kopfH)) { wandernde[kopfH] = erstes; kinder[g.titel] = ohneIds(x.items || []); }
    else kinder[g.titel] = ohneIds([erstes, ...(x.items || [])]);
  }
  if (fehler.length) return { baum: b, log, fehler };
  for (const v of VERSCHOBEN) {
    const zielListe = kinder[v.nach], e = wandernde[v.handle], pos = zielListe ? zielListe.findIndex(c => c.title === v.hinter) : -1;
    if (!e) { fehler.push(`verschobenes Ziel ${v.handle} ist nicht der Kopf von «${v.von}»`); continue; }
    if (pos < 0) { fehler.push(`«${v.nach}»: kein Kind «${v.hinter}», hinter das «${e.title}» gehört`); continue; }
    zielListe.splice(pos + 1, 0, e);
  }
  if (fehler.length) return { baum: b, log, fehler };
  const genommen = new Set(GRUPPEN.map(g => g.titel));
  const rest = gruppen.filter(g => !genommen.has(g.title));
  const kopf = o => ({ title: o.titel, type: 'COLLECTION', resourceId: gids[o.handle], items: GRUPPEN.filter(g => g.ober === o.ober).map(g => ({ title: g.titel, type: 'COLLECTION', resourceId: gids[g.handle], items: kinder[g.titel] })) });
  b.splice(i, 1, kopf(KUECHE), kopf(GESCHIRR), { ...alt, items: rest });
  log.push(`«${ELTERN}»: ${gruppen.length} Gruppen → «${KUECHE.titel}» ${GRUPPEN.filter(g => g.ober === 'kueche').length} · «${GESCHIRR.titel}» ${GRUPPEN.filter(g => g.ober === 'geschirr').length} · «${ELTERN}» ${rest.length} (Reihenfolge unverändert)`);
  return { baum: b, log, fehler };
}

const ohneIdsBaum = items => (items || []).filter(Boolean).map(i => ({ title: i.title, type: i.type, z: i.resourceId || i.url || '', t: (i.tags || []).join(','), items: ohneIdsBaum(i.items || []) }));
const idsBaum = items => (items || []).filter(Boolean).map(i => ({ id: i.id ?? null, items: idsBaum(i.items || []) }));

/**
 * Prüft den Umbau gegen den alten Baum. Gibt die Fehler zurück (leer = in Ordnung). Gilt für den geplanten Baum und für den zurückgelesenen (Ids der neuen Einträge dürfen dann anders sein).
 * Verlangt: Tiefe ≤ 3, nichts verloren, nichts zusätzlich ausser den sieben neuen Sammlungen (je genau einmal), die drei Köpfe an der Stelle von «Wohnen & Garten», alles ausserhalb
 * unverändert, auch Ids und Tags der behaltenen Einträge, in jeder Gruppe das alte Kopf-Ziel als erstes Kind (ausser dem verschobenen) und die übrigen Kinder unverändert.
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
  const aussenAlt = alt.filter(x => x.title !== ELTERN), aussenNeu = neu.filter(x => !eigene.includes(x.title));
  if (JSON.stringify(ohneIdsBaum(aussenAlt)) !== JSON.stringify(ohneIdsBaum(aussenNeu))) f.push('Einträge ausserhalb von «Wohnen & Garten» haben sich verändert');
  if (JSON.stringify(idsBaum(aussenAlt)) !== JSON.stringify(idsBaum(aussenNeu))) f.push('Einträge ausserhalb von «Wohnen & Garten» haben andere Ids (Übersetzungen hängen an der Id)');
  const eltern = neu.find(x => x.title === ELTERN), altEltern = alt.find(x => x.title === ELTERN);
  if (eltern && altEltern) {
    if (eltern.id !== altEltern.id) f.push(`«${ELTERN}» hat eine andere Id`);
    const gruppenTitel = new Set(GRUPPEN.map(g => g.titel));
    const soll = altEltern.items.filter(g => !gruppenTitel.has(g.title)).map(g => g.title), ist = eltern.items.map(g => g.title);
    if (JSON.stringify(soll) !== JSON.stringify(ist)) f.push(`«${ELTERN}» enthält andere Gruppen oder eine andere Reihenfolge als erwartet: ${ist.join(' ; ')}`);
    for (const t of soll) {
      const a1 = altEltern.items.find(g => g.title === t), n1 = eltern.items.find(g => g.title === t);
      if (!n1 || JSON.stringify(ohneIdsBaum([a1])) !== JSON.stringify(ohneIdsBaum([n1]))) f.push(`Gruppe «${t}» wurde verändert oder fehlt`);
      else if (JSON.stringify(idsBaum([a1])) !== JSON.stringify(idsBaum([n1]))) f.push(`Gruppe «${t}» hat andere Ids`);
    }
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
      const kopfAlt = ziel({ type: a.type, resourceId: a.resourceId, url: a.url }), wandert = VERSCHOBEN.find(v => v.von === g.title && handleVon(a) === v.handle);
      let kinderNeu = g.items || [];
      for (const v of VERSCHOBEN.filter(x => x.nach === g.title)) {
        const vAlt = altEltern.items.find(x => x.title === v.von), voll = kinderNeu, j = voll.findIndex(c => handleVon(c) === v.handle);
        if (j < 0 || voll.filter(c => handleVon(c) === v.handle).length !== 1) { f.push(`Gruppe «${g.title}»: «${v.handle}» steht nicht genau einmal unter den Kindern`); continue; }
        if (!vAlt || ziel(voll[j]) !== ziel({ type: vAlt.type, resourceId: vAlt.resourceId, url: vAlt.url })) f.push(`Gruppe «${g.title}»: das verschobene Kind «${v.handle}» zeigt auf ein anderes Ziel`);
        if (j < 1 || voll[j - 1].title !== v.hinter) f.push(`Gruppe «${g.title}»: «${voll[j].title}» steht nicht hinter «${v.hinter}»`);
        kinderNeu = voll.filter((_, n) => n !== j);
      }
      if (!wandert) {
        if (!kinderNeu[0] || ziel(kinderNeu[0]) !== kopfAlt) f.push(`Gruppe «${g.title}»: das alte Kopf-Ziel steht nicht als erstes Kind`);
        kinderNeu = kinderNeu.slice(1);
      }
      if (JSON.stringify(ohneIdsBaum(kinderNeu)) !== JSON.stringify(ohneIdsBaum(a.items || []))) f.push(`Gruppe «${g.title}»: die übrigen Kinder haben sich verändert`);
    }
  }
  return f;
}

/**
 * Benennt die zwei obersten Köpfe des ersten Umbaus um («Küche & Kochen» → «Küche», «Geschirr & Tisch» → «Geschirr»). Nur diese Titel ändern sich, alles andere bleibt (auch Ids).
 * `treffer` = Zahl der umbenannten Köpfe (0 = nichts zu tun; 1 = halber Zustand, `fehler` gesetzt).
 * @returns {{baum: object[], treffer: number, log: string[], fehler: string[]}}
 */
export function kopfTitelNeu(baum) {
  const b = kopie(baum), log = [], fehler = [];
  const alte = b.filter(x => ALTE_KOPFTITEL[x.title]);
  for (const x of alte) { log.push(`«${x.title}» → «${ALTE_KOPFTITEL[x.title]}»`); x.title = ALTE_KOPFTITEL[x.title]; }
  if (alte.length && alte.length !== OBER.length) fehler.push(`nur ${alte.length} von ${OBER.length} Köpfen tragen noch den alten Titel (von Hand im Admin klären)`);
  return { baum: b, treffer: alte.length, log, fehler };
}
/** Prüft die Umbenennung: gleiche Einträge, gleiche Ids, gleiche Ziele, nur die zwei Köpfe tragen neue Titel. */
export function pruefeKopfTitel(alt, neu) {
  const f = [], soll = kopfTitelNeu(alt).baum;
  if (JSON.stringify(ohneIdsBaum(soll)) !== JSON.stringify(ohneIdsBaum(neu))) f.push('es hat sich mehr geändert als die zwei Kopftitel');
  if (JSON.stringify(idsBaum(soll)) !== JSON.stringify(idsBaum(neu))) f.push('Ids haben sich geändert (Übersetzungen hängen an der Id)');
  return f;
}

/** Menütitel über 34 Zeichen (Hinweis, Kopfzeile bricht um). */
export const titelWarnungen = baum => {
  const w = [], geh = (items, pfad = []) => items.forEach(i => { if (i.title.length > MAX_TITEL) w.push(`${[...pfad, i.title].join(' > ')} (${i.title.length})`); geh(i.items || [], [...pfad, i.title]); });
  geh(baum); return w;
};

/**
 * Rücknahme: die Eingabe für menuUpdate aus der Sicherung (Rohlesung des Menüs VOR dem Umbau). Ids, die im aktuellen Menü nicht mehr existieren (die fünf Gruppen und ihre Kinder wurden neu
 * angelegt), werden gestrichen; alle anderen Ids bleiben (Übersetzungen). Die zwei neuen Köpfe fehlen in der Sicherung und fallen damit weg.
 */
export function rueckgaengigEingabe(sicherungItems, aktuelleItems) {
  const aktiv = new Set(); (function lauf(l) { for (const i of l) { aktiv.add(i.id); lauf(i.items || []); } })(aktuelleItems || []);
  const umformen = items => items.map(i => ({ ...(i.id && aktiv.has(i.id) ? { id: i.id } : {}), title: i.title, type: i.type, ...(i.resourceId ? { resourceId: i.resourceId } : {}), ...(i.url ? { url: i.url } : {}),
    ...(i.tags?.length ? { tags: i.tags } : {}), items: umformen(i.items || []) }));
  return umformen(sicherungItems);
}

/**
 * Plan der sieben Sammlungen für gruppenLauf (schmuck_gruppen.mjs): Tag-ODER-Regel über die Tags der Kinder.
 * `tagVon(handle)` liefert das Tag `sort-…` einer vorhandenen Kind-Sammlung (nur wenn ihre Regel genau `TAG EQUALS <tag>` ist) oder null (Titel-Regel, manuell: kommt nicht in die Vereinigung).
 * Gruppe: alle Kinder des Menüs inkl. Kopf-Ziel, ohne `ausser`, mit den verschobenen Kindern in der neuen Gruppe; Kopf: die Vereinigung seiner Gruppen. Gilt vor und nach dem Umbau gleich.
 * Form wie rucksaecke_menue.gruppenPlan(): { handle, titel, beschreibung, seoBeschreibung, kinder:[{handle,tag}], ohneTag, regel }.
 */
export function gruppenPlan(baum, tagVon) {
  const eintrag = (handle, sTitel, text, kurz, handles) => {
    const kinder = handles.map(h => ({ handle: h, tag: tagVon(h) || null }));
    const tags = [...new Set(kinder.filter(c => c.tag).map(c => c.tag))];
    return { handle, titel: sTitel, beschreibung: text, seoBeschreibung: seoText(sTitel, kurz), kinder, ohneTag: kinder.filter(c => !c.tag).map(c => c.handle),
      regel: { appliedDisjunctively: true, rules: tags.map(t => ({ column: 'TAG', relation: 'EQUALS', condition: t })) } };
  };
  const proGruppe = GRUPPEN.map(g => {
    const eigen = gruppenHandles(gruppeNach(baum, g.titel)).filter(h => !g.ausser.includes(h) && !verschobenAus(g).includes(h) && !neueHandles().includes(h));
    return { g, handles: [...new Set([...eigen, ...verschobenIn(g)])] };
  });
  return [
    ...proGruppe.map(({ g, handles }) => eintrag(g.handle, g.titel, g.beschreibung, g.kurz, handles)),
    ...OBER.map(o => eintrag(o.handle, sammlungsTitel(o), o.beschreibung, o.kurz, [...new Set(proGruppe.filter(x => x.g.ober === o.ober).flatMap(x => x.handles))])),
  ];
}

/** Erwartete Mitglieder je Sammlung aus einem Katalog (Produkte mit `tags`): Vereinigung der Tags der Regel. */
export const erwartetAus = (produkte, plan) => Object.fromEntries(plan.map(p => {
  const tags = new Set(p.regel.rules.map(r => r.condition));
  return [p.handle, produkte.filter(x => (x.tags || []).some(t => tags.has(t))).length];
}));
