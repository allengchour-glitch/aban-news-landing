/**
 * Menü bereinigen: eine kleine, benannte Liste von Änderungen am Hauptmenü (Einträge entfernen, die Adresse eines Eintrags ändern, einen Eintrag einfügen).
 * Reine Logik, ohne Netz (getestet in menu_bereinigen_test.mjs).
 *
 * WARUM SO VORSICHTIG: `menuUpdate` ERSETZT den ganzen Baum (siehe lib/menu_verschieben.mjs). Darum wie dort: Eingabe AUS dem gelesenen Baum, Plan unabhängig
 * nachgeprüft (id-basiert: GENAU die benannten Einträge fehlen, GENAU die benannten Adressen sind anders, alles andere ist gleich, auch die Reihenfolge),
 * Menü nach dem Schreiben streng mit dem Plan verglichen.
 *
 * Änderungen (Feld `op`):
 *   { op:'entfernen', pfad:['Eltern','Eintrag'], handle:'x' }                    Eintrag muss auf /collections/<handle> zeigen und darf keine Kinder haben.
 *   { op:'url', pfad:[…], von:'/collections/a', nach:'/collections/b' }          nur Typ HTTP; Adresse muss genau `von` sein; Ziel-Collection muss es geben.
 *   { op:'einfuegen', eltern:[…], pos:0, titel:'T', handle:'x', fr:'Titel fr' }  neuer Eintrag Typ COLLECTION; kein Geschwister mit gleichem Titel oder Ziel.
 * Verwaist: eine Collection, die nach den Änderungen nirgends mehr im Menü steht, ist ein Fehler, ausser sie steht in `verwaistOk`.
 */
import { eingabeAus, flachMitId, findePfad, pfadText, shopPfad, zeigtAuf, zaehle, MAX_TIEFE, HANDLE_RE } from './menu_verschieben.mjs';
import { tiefe } from './menue_plan.mjs';

const kopie = x => JSON.parse(JSON.stringify(x));
const PFAD_RE = /^\/collections\/[a-z0-9-]+$/;
const OPS = ['entfernen', 'url', 'einfuegen'];

/**
 * Alle Handles, auf die das Menü zeigt (HTTP-Adresse oder COLLECTION-Adresse /collections/<handle>).
 * Neue Einträge tragen nur eine resourceId (die Adresse setzt Shopify erst beim Speichern): `ridZuHandle` ordnet sie zu.
 */
export function menueHandles(baum, ridZuHandle = {}) {
  const s = new Set();
  (function lauf(l) {
    for (const e of l || []) {
      const p = shopPfad(e.url);
      if (PFAD_RE.test(p) && (e.type === 'HTTP' || e.type === 'COLLECTION')) s.add(p.slice('/collections/'.length));
      if (e.type === 'COLLECTION' && e.resourceId && ridZuHandle[e.resourceId]) s.add(ridZuHandle[e.resourceId]);
      lauf(e.items);
    }
  })(baum);
  return s;
}

/** Aufruf der Änderungen prüfen (ohne Netz). @returns {string[]} Fehler */
export function pruefeOps(ops) {
  const f = [];
  if (!Array.isArray(ops) || !ops.length) return ['keine Änderungen angegeben'];
  const pfadOk = p => Array.isArray(p) && p.length > 0 && p.every(t => typeof t === 'string' && t.trim() && t === t.trim());
  ops.forEach((o, n) => {
    const w = `Änderung ${n + 1}`;
    if (!o || !OPS.includes(o.op)) { f.push(`${w}: unbekannte Art «${o?.op}»`); return; }
    if (o.op === 'entfernen') { if (!pfadOk(o.pfad)) f.push(`${w}: pfad ungültig`); if (!HANDLE_RE.test(o.handle || '')) f.push(`${w}: handle ungültig`); }
    if (o.op === 'url') {
      if (!pfadOk(o.pfad)) f.push(`${w}: pfad ungültig`);
      if (!PFAD_RE.test(o.von || '') || !PFAD_RE.test(o.nach || '')) f.push(`${w}: von/nach müssen /collections/<handle> sein`);
      if (o.von === o.nach) f.push(`${w}: von und nach sind gleich`);
    }
    if (o.op === 'einfuegen') {
      if (!pfadOk(o.eltern)) f.push(`${w}: eltern ungültig`);
      if (!Number.isInteger(o.pos) || o.pos < 0) f.push(`${w}: pos ungültig`);
      if (typeof o.titel !== 'string' || !o.titel.trim()) f.push(`${w}: titel fehlt`);
      if (!HANDLE_RE.test(o.handle || '')) f.push(`${w}: handle ungültig`);
      if (o.fr !== undefined && o.fr !== null && (typeof o.fr !== 'string' || !o.fr.trim() || o.fr.length > 255 || /[\u0000-\u001f\u007f]/.test(o.fr))) f.push(`${w}: fr ungültig (Text bis 255 Zeichen, keine Steuerzeichen)`);
    }
  });
  // Mehrere Einfügungen unter demselben Eltern: pos bezieht sich dann auf einen Zwischenzustand, den die Nachprüfung nicht nachbildet → nicht zulassen
  const eltern = ops.filter(o => o?.op === 'einfuegen' && Array.isArray(o.eltern)).map(o => o.eltern.join('\u0001'));
  if (new Set(eltern).size !== eltern.length) f.push('zwei Einfügungen unter demselben Eltern-Eintrag (Position unklar): bitte in getrennten Läufen');
  return f;
}

/** Alle Handles, für die der Lauf die Collection frisch lesen muss. */
export const benoetigteHandles = ops => [...new Set(ops.flatMap(o => (o.op === 'entfernen' ? [o.handle] : o.op === 'url' ? [o.nach.slice('/collections/'.length)] : [o.handle])))];

const elternListe = (baum, idx) => { let l = baum; for (const i of idx.slice(0, -1)) l = l[i].items; return l; };

/**
 * Treffer für einen Entfernen-Pfad. Mehrere Einträge mit gleichem Titel am gleichen Ort (z. B. «Wecker» einmal als Sammlung, einmal als Adresse) werden
 * über den Handle auseinandergehalten: es zählt nur, was auf /collections/<handle> zeigt. Bleibt nicht genau einer übrig, ist es ein Fehler.
 * @returns {{treffer:object[], gefiltert:boolean}} gefiltert = true, wenn der Pfad allein mehrdeutig war und der Handle entschieden hat
 */
export function trefferFuer(baum, pfad, handle, colId) {
  const t = findePfad(baum, pfad);
  if (t.length <= 1) return { treffer: t, gefiltert: false };
  return { treffer: t.filter(x => zeigtAuf(x.eintrag, { handle, colId })), gefiltert: true };
}

/**
 * Plant die Änderungen auf einer KOPIE von `alt` (Eingabe-Baum). Jede verletzte Regel ist ein Fehler (nichts wird geschrieben).
 * @param alt  Eingabe-Baum (eingabeAus)
 * @param ops  Änderungen
 * @param o    { colIds: {handle: gid|undefined}, verwaistOk: string[] }
 * @returns {{fehler:string[], plan?:object[], info?:object}}
 */
export function plane(alt, ops, { colIds = {}, verwaistOk = [] } = {}) {
  const fehler = pruefeOps(ops);
  if (fehler.length) return { fehler };
  const b = kopie(alt), info = { entfernt: [], url: [], eingefuegt: [], verwaist: [] };
  ops.forEach((o, n) => {
    const w = `Änderung ${n + 1} (${o.op})`;
    if (o.op === 'entfernen') {
      const { treffer: t, gefiltert } = trefferFuer(b, o.pfad, o.handle, colIds[o.handle]);
      if (t.length !== 1) { fehler.push(`${w}: «${pfadText(o.pfad)}» ${t.length ? `ist mehrdeutig (${t.length} Treffer)` : (gefiltert ? `hat mehrere Treffer, keiner zeigt auf /collections/${o.handle}` : 'nicht gefunden')}`); return; }
      const e = t[0].eintrag;
      if (!zeigtAuf(e, { handle: o.handle, colId: colIds[o.handle] })) { fehler.push(`${w}: «${pfadText(o.pfad)}» zeigt nicht auf /collections/${o.handle} (Typ ${e.type}, Adresse ${e.url ?? '-'})`); return; }
      if ((e.items || []).length) { fehler.push(`${w}: «${pfadText(o.pfad)}» hat ${e.items.length} Kinder`); return; }
      elternListe(b, t[0].idx).splice(t[0].idx[t[0].idx.length - 1], 1);
      info.entfernt.push({ id: e.id, title: e.title, type: e.type, url: e.url ?? null, handle: o.handle, pfad: pfadText(o.pfad) });
    } else if (o.op === 'url') {
      const t = findePfad(b, o.pfad);
      if (t.length !== 1) { fehler.push(`${w}: «${pfadText(o.pfad)}» ${t.length ? `ist mehrdeutig (${t.length} Treffer)` : 'nicht gefunden'}`); return; }
      const e = t[0].eintrag, ziel = o.nach.slice('/collections/'.length);
      if (e.type !== 'HTTP') { fehler.push(`${w}: «${pfadText(o.pfad)}» ist Typ ${e.type}, nur HTTP-Einträge bekommen eine neue Adresse`); return; }
      if (shopPfad(e.url) !== o.von) { fehler.push(`${w}: Adresse ist ${e.url}, erwartet ${o.von}`); return; }
      if (!colIds[ziel]) { fehler.push(`${w}: Collection «${ziel}» gibt es im Shop nicht`); return; }
      info.url.push({ id: e.id, title: e.title, alt: e.url, neu: o.nach, pfad: pfadText(o.pfad) });
      e.url = o.nach;
    } else {
      const t = findePfad(b, o.eltern);
      if (t.length !== 1) { fehler.push(`${w}: Eltern «${pfadText(o.eltern)}» ${t.length ? `mehrdeutig (${t.length} Treffer)` : 'nicht gefunden'}`); return; }
      const e = t[0].eintrag, rid = colIds[o.handle];
      if (!rid) { fehler.push(`${w}: Collection «${o.handle}» gibt es im Shop nicht`); return; }
      const kinder = e.items || (e.items = []);
      if (kinder.some(k => k.title === o.titel || k.resourceId === rid || zeigtAuf(k, { handle: o.handle, colId: rid }))) { fehler.push(`${w}: unter «${pfadText(o.eltern)}» steht schon «${o.titel}» oder ein Eintrag auf /collections/${o.handle}`); return; }
      if (o.pos > kinder.length) { fehler.push(`${w}: pos ${o.pos} liegt hinter dem Ende (${kinder.length} Kinder)`); return; }
      if (o.eltern.length + 1 > MAX_TIEFE) { fehler.push(`${w}: zu tief (Eltern auf Ebene ${o.eltern.length}, Shopify erlaubt ${MAX_TIEFE})`); return; }
      kinder.splice(o.pos, 0, { title: o.titel, type: 'COLLECTION', resourceId: rid, items: [] });
      info.eingefuegt.push({ title: o.titel, handle: o.handle, resourceId: rid, eltern: pfadText(o.eltern), pos: o.pos, fr: o.fr ?? null });
    }
  });
  if (fehler.length) return { fehler };
  if (tiefe(b) > MAX_TIEFE) fehler.push(`Plan hätte ${tiefe(b)} Ebenen`);
  const ridZuHandle = Object.fromEntries(Object.entries(colIds).filter(([, id]) => id).map(([h, id]) => [id, h]));
  const vorher = menueHandles(alt, ridZuHandle), nachher = menueHandles(b, ridZuHandle);
  info.verwaist = [...vorher].filter(h => !nachher.has(h)).sort();
  const unerlaubt = info.verwaist.filter(h => !verwaistOk.includes(h));
  if (unerlaubt.length) fehler.push(`danach steht nirgends mehr im Menü: ${unerlaubt.join(', ')} (erlaubt nur mit verwaistOk)`);
  info.gesamt = zaehle(b); info.vorher = zaehle(alt);
  return { fehler, plan: b, info };
}

/** id → id des Eltern-Eintrags (null = oberste Ebene), in Reihenfolge der Einträge; Einträge ohne id (neu) bekommen den Schlüssel «neu:<Nr>». */
function elternKarte(baum) {
  const m = new Map(); let neu = 0;
  (function lauf(l, el) { for (const e of l || []) { const k = e.id ?? `neu:${neu++}`; m.set(k, { eltern: el, e }); lauf(e.items, k); } })(baum, null);
  return m;
}

/**
 * Unabhängige Nachprüfung des Plans (id-basiert, ohne `plane` zu benutzen): genau die erwarteten ids fehlen, genau die erwarteten Adressen sind anders,
 * die neuen Einträge stehen unter dem richtigen Eltern an der richtigen Stelle, alle anderen Einträge haben gleichen Titel, Typ, Ziel, Tags, Eltern und Reihenfolge.
 * @returns {string[]} Fehler (leer = in Ordnung)
 */
export function pruefePlan(alt, plan, ops, { colIds = {} } = {}) {
  const f = [];
  if (tiefe(plan) > MAX_TIEFE) f.push(`Plan hätte ${tiefe(plan)} Ebenen`);
  const A = elternKarte(alt), P = elternKarte(plan);
  const erwEntfernt = new Set(), erwUrl = new Map(), erwNeu = [];
  for (const o of ops) {
    if (o.op === 'entfernen') { const t = trefferFuer(alt, o.pfad, o.handle, colIds[o.handle]).treffer; if (t.length !== 1) { f.push(`alt: «${pfadText(o.pfad)}» nicht eindeutig`); continue; } erwEntfernt.add(t[0].eintrag.id); }
    if (o.op === 'url') { const t = findePfad(alt, o.pfad); if (t.length !== 1) { f.push(`alt: «${pfadText(o.pfad)}» nicht eindeutig`); continue; } erwUrl.set(t[0].eintrag.id, o.nach); }
    if (o.op === 'einfuegen') erwNeu.push(o);
  }
  const fehlend = [...A.keys()].filter(k => !P.has(k)), zuviel = [...P.keys()].filter(k => !A.has(k) && !k.startsWith('neu:'));
  if (JSON.stringify(fehlend.sort()) !== JSON.stringify([...erwEntfernt].sort())) f.push(`fehlende Einträge im Plan: ${fehlend.join(',') || '-'} (erwartet: ${[...erwEntfernt].join(',') || '-'})`);
  if (zuviel.length) f.push(`Plan enthält unbekannte ids: ${zuviel.join(',')}`);
  const neue = [...P.keys()].filter(k => k.startsWith('neu:'));
  if (neue.length !== erwNeu.length) f.push(`neue Einträge im Plan: ${neue.length}, erwartet ${erwNeu.length}`);
  for (const [k, a] of A) {
    if (erwEntfernt.has(k)) continue;
    const p = P.get(k); if (!p) continue;
    for (const fl of ['title', 'type', 'resourceId', 'tags']) if (JSON.stringify(a.e[fl] ?? null) !== JSON.stringify(p.e[fl] ?? null)) f.push(`Eintrag ${k} «${a.e.title}»: ${fl} geändert`);
    const urlA = a.e.url ?? null, urlP = p.e.url ?? null;
    if (erwUrl.has(k)) { if (urlP !== erwUrl.get(k)) f.push(`Eintrag ${k} «${a.e.title}»: Adresse ${urlP} statt ${erwUrl.get(k)}`); }
    else if (urlA !== urlP) f.push(`Eintrag ${k} «${a.e.title}»: Adresse unerwartet geändert (${urlA} → ${urlP})`);
    // Eltern: gleich, ausser der alte Eltern wurde entfernt (kann nicht sein: nur Einträge ohne Kinder werden entfernt)
    if (a.eltern !== p.eltern) f.push(`Eintrag ${k} «${a.e.title}»: anderer Eltern-Eintrag`);
  }
  // Reihenfolge der unveränderten Einträge je Eltern
  const reihe = (K, eltern, ohne) => [...K].filter(([k, v]) => v.eltern === eltern && !ohne.has(k) && !k.startsWith('neu:')).map(([k]) => k);
  const eltern = new Set([null, ...A.keys()]);
  for (const e of eltern) if (e === null || !erwEntfernt.has(e)) { const x = reihe(A, e, erwEntfernt), y = reihe(P, e, new Set()); if (JSON.stringify(x) !== JSON.stringify(y)) f.push(`Reihenfolge unter ${e ?? 'oberster Ebene'} verändert`); }
  // neue Einträge: unter dem Eltern, an der Stelle
  for (const o of erwNeu) {
    const t = findePfad(plan, o.eltern);
    if (t.length !== 1) { f.push(`Plan: Eltern «${pfadText(o.eltern)}» nicht eindeutig`); continue; }
    const k = t[0].eintrag.items?.[o.pos];
    if (!k || k.id || k.title !== o.titel || k.type !== 'COLLECTION' || !k.resourceId || k.resourceId !== colIds[o.handle] || k.url || (k.tags || []).length || (k.items || []).length) f.push(`Plan: an Stelle ${o.pos + 1} unter «${pfadText(o.eltern)}» steht nicht der neue Eintrag «${o.titel}»`);
  }
  if (zaehle(plan) !== zaehle(alt) - erwEntfernt.size + erwNeu.length) f.push(`Anzahl Einträge: Plan ${zaehle(plan)}, erwartet ${zaehle(alt) - erwEntfernt.size + erwNeu.length}`);
  return f;
}

/**
 * Nach dem Schreiben: zurückgelesenes Menü streng gegen den Plan, Eintrag für Eintrag in Reihenfolge (Pfad, Titel, Typ, Ziel, Tags). Einträge mit id im Plan
 * müssen dieselbe id haben; neue Einträge müssen eine id bekommen haben, die vorher nicht vorkam.
 * @returns {{fehler:string[], neueIds:string[]}}
 */
export function vergleicheNachlesen(plan, zurueck, altIds = new Set()) {
  const fehler = [], a = flachMitId(plan), r = flachMitId(zurueck), neueIds = [];
  if (a.length !== r.length) fehler.push(`Anzahl Einträge: geplant ${a.length}, zurückgelesen ${r.length}`);
  // Bei HTTP-Einträgen sendet das Werkzeug die Adresse unverändert und Shopify gibt sie unverändert zurück (Live-Menü 17.11.: 142 von 142 ohne Präfix, Host, Schrägstrich):
  // die Normalisierung von flachMitId (Host, Sprachpräfix, Schrägstrich) würde eine echte Änderung verdecken, darum hier die rohe Adresse vergleichen.
  const rohUrls = baum => { const l = []; (function w(x) { for (const e of x || []) { l.push(e.type === 'HTTP' ? (e.url ?? null) : undefined); w(e.items); } })(baum); return l; };
  const ra = rohUrls(plan), rr = rohUrls(zurueck);
  if (ra.length === rr.length) ra.forEach((u, n) => { if (u !== undefined && rr[n] !== u) fehler.push(`Eintrag ${n + 1} (${a[n]?.pfad ?? '?'}): rohe Adresse geplant ${u} ↔ zurück ${rr[n]}`); });
  for (let n = 0; n < Math.max(a.length, r.length); n++) {
    const s = a[n], i = r[n];
    if (!s || !i) { fehler.push(`Eintrag ${n + 1}: ${s ? `geplant ${s.pfad}, zurück fehlt` : `zurück ${i.pfad}, nicht geplant`}`); continue; }
    for (const fl of ['pfad', 'title', 'type', 'ziel', 'tags']) if (s[fl] !== i[fl]) fehler.push(`Eintrag ${n + 1} (${s.pfad}): ${fl} geplant ${s[fl]} ↔ zurück ${i[fl]}`);
    if (s.id) { if (s.id !== i.id) fehler.push(`Eintrag ${n + 1} (${s.pfad}): id geplant ${s.id} ↔ zurück ${i.id}`); }
    else if (!i.id || altIds.has(i.id)) fehler.push(`Eintrag ${n + 1} (${s.pfad}): neuer Eintrag ohne neue id (${i.id})`);
    else neueIds.push(i.id);
  }
  return { fehler, neueIds };
}

/** Menü-Eintrag-id → Link-gid der Übersetzungen. */
export const linkGidVon = id => { const m = /^gid:\/\/shopify\/MenuItem\/(\d+)$/.exec(String(id || '')); return m ? `gid://shopify/Link/${m[1]}` : null; };

/** Alle Einträge als flache Liste von ids (alle Ebenen). */
export const alleIds = baum => { const s = new Set(); (function l(x) { for (const e of x || []) { if (e.id) s.add(e.id); l(e.items); } })(baum); return s; };

/** Übersetzungen vorher/nachher (Map link-gid → {locale: {key: wert}}): welche von vorher fehlen oder weichen ab? */
export function verlorene(vorher, nachher, nurIds = null) {
  const aus = [];
  for (const [gid, loc] of Object.entries(vorher)) {
    if (nurIds && !nurIds.has(gid)) continue;
    for (const [l, kv] of Object.entries(loc)) for (const [k, v] of Object.entries(kv)) if ((nachher[gid]?.[l]?.[k]) !== v) aus.push({ gid, locale: l, key: k, value: v });
  }
  return aus;
}
