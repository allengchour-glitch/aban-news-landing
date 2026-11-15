/**
 * Menü: GENAU EINEN Collection-Eintrag von einem Elterneintrag zu einem anderen verschieben. Reine Logik, ohne Netz (getestet in menu_verschieben_test.mjs).
 *
 * WARUM SO VORSICHTIG: `menuUpdate` ERSETZT den ganzen Baum. Ein Eintrag, den die Eingabe vergisst, ist danach weg; ein Eintrag ohne seine id wird neu
 * angelegt und verliert seine Übersetzungen. Darum wird die Eingabe AUS dem gelesenen Baum gebaut (eingabeAus, wie in menu_eintrag_einfuegen.mjs),
 * der Plan vor dem Schreiben unabhängig nachgeprüft (pruefePlan) und das Menü nach dem Schreiben streng mit dem Plan verglichen (vergleicheNachlesen).
 *
 * Pfade sind Titelpfade: ['Wohnen & Garten', 'Putzen & Haushalt']. Die oberste Ebene ist der Titel des obersten Eintrags. Ein Pfad gilt nur, wenn er
 * genau EINMAL im Menü vorkommt (gleiche Titel auf derselben Ebene machen ihn mehrdeutig).
 *
 * Ein Eintrag «zeigt auf» die Collection, wenn er
 *   - Typ COLLECTION hat und (resourceId = Collection-ID ODER seine Adresse /collections/<handle> ist), oder
 *   - Typ HTTP hat und seine Adresse genau /collections/<handle> ist (ohne Abfrage, ohne weiteren Pfadteil; eigener Host und Sprachpräfix zählen nicht).
 * Den HTTP-Fall braucht es, weil das Hauptmenü viele Collections als HTTP-Link führt (GEMESSEN 11.11.2026: 142 von 784 Einträgen sind HTTP, darunter
 * «Ersatzteile & Zubehör»). Der Eintrag wird beim Verschieben NICHT umgeschrieben: Typ, Adresse, resourceId, Tags, id und Kinder bleiben, wie sie sind.
 */
import { ziel as zielVon, tiefe } from './menue_plan.mjs';

export const MAX_TIEFE = 3;
export const HANDLE_RE = /^[a-z0-9-]+$/;
export const TRENNER = ' > ';
const FELDER = 'id title type resourceId url tags';
/** Menü lesen (3 Ebenen). Gesucht wird über `handle:<menü>`; das Ergebnis wird danach noch einmal genau auf den Handle gefiltert. */
export const MENU_Q = `query($h:String!){menus(first:5,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
export const COLL_Q = 'query($h:String!){collectionByHandle(handle:$h){id title handle}}';
export const UPDATE_M = 'mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}';

/**
 * Pflichtschlüssel jedes gelesenen Eintrags. Bewusst EIGENE Liste und nicht aus FELDER abgeleitet: fehlt in FELDER ein Feld, soll diese Prüfung es finden.
 * WARUM (Gegenprüfung 11.11.2026, W1): Fragt MENU_Q zu wenige Ebenen oder Felder ab, arbeiten Plan, Nachprüfung und Nachlesen alle auf derselben
 * verkürzten Sicht. menuUpdate löscht dann still, was fehlt (Ebene 3: 520 Einträge; ohne id: alle Einträge neu, Übersetzungen weg; ohne tags: alle Tags weg),
 * und der Lauf meldet trotzdem «OK». Darum wird die Form des ersten Lesens vor dem Planen geprüft.
 */
export const LESE_PFLICHT = ['id', 'title', 'type', 'resourceId', 'url', 'tags'];

/**
 * Hat das gelesene Menü die volle Form? Menü mit id, title, handle; jeder Eintrag mit allen LESE_PFLICHT-Schlüsseln (Wert darf null sein, ausser id),
 * id ein nicht leerer Text, tags eine Liste; jeder Eintrag auf Ebene 1 bis MAX_TIEFE-1 mit einer Liste `items` (sonst fehlen Ebenen).
 * @returns {string[]} Befunde (leer = in Ordnung)
 */
export function pruefeLeseform(menu) {
  if (!menu || typeof menu !== 'object') return ['Menü fehlt'];
  const f = [];
  for (const k of ['id', 'title', 'handle']) if (typeof menu[k] !== 'string' || !menu[k]) f.push(`Menü ohne ${k}`);
  if (!Array.isArray(menu.items)) return [...f, 'Menü ohne items'];
  (function lauf(liste, ebene, pfad) {
    for (const e of liste) {
      if (!e || typeof e !== 'object') { f.push(`Ebene ${ebene} unter «${pfadText(pfad) || '(oben)'}»: kein Eintrag`); continue; }
      const wo = `Ebene ${ebene} «${pfadText([...pfad, String(e.title ?? '?')])}»`;
      const fehlt = LESE_PFLICHT.filter(k => !(k in e));
      if (fehlt.length) f.push(`${wo}: ohne ${fehlt.join(', ')}`);
      if ('id' in e && (typeof e.id !== 'string' || !e.id)) f.push(`${wo}: id leer`);
      if ('tags' in e && !Array.isArray(e.tags)) f.push(`${wo}: tags ist keine Liste`);
      if (ebene < MAX_TIEFE) {
        if (!Array.isArray(e.items)) f.push(`${wo}: ohne items (die Abfrage liest zu wenige Ebenen)`);
        else lauf(e.items, ebene + 1, [...pfad, String(e.title ?? '?')]);
      }
    }
  })(menu.items, 1, []);
  return f;
}

const kopie = x => JSON.parse(JSON.stringify(x));

/** Aus dem gelesenen Baum die Eingabe für menuUpdate (ids bleiben, damit nichts neu angelegt wird). Gleich wie eingabeAus() in menu_eintrag_einfuegen.mjs. */
export function eingabeAus(items) {
  return (items || []).map(i => ({ id: i.id, title: i.title, type: i.type, ...(i.resourceId ? { resourceId: i.resourceId } : {}), ...(i.url ? { url: i.url } : {}),
    ...(i.tags?.length ? { tags: i.tags } : {}), items: eingabeAus(i.items || []) }));
}

/** "A > B" → ['A', 'B']; null bei leerem Text oder leerem Pfadteil. Die Teile werden NICHT gekürzt (ein Titel mit Leerzeichen am Rand soll nicht still auf einen anderen passen). */
export function teilePfad(s) {
  if (typeof s !== 'string' || !s.trim()) return null;
  const teile = s.split(TRENNER);
  if (teile.some(t => !t.trim())) return null;
  teile[0] = teile[0].trimStart(); teile[teile.length - 1] = teile[teile.length - 1].trimEnd();
  return teile;
}
export const pfadText = teile => teile.join(TRENNER);

/** Alle Einträge zu einem Titelpfad (bei gleichen Titeln mehrere). @returns {{eintrag:object, idx:number[]}[]} */
export function findePfad(baum, teile) {
  const treffer = [];
  (function lauf(liste, rest, idx) {
    (liste || []).forEach((e, n) => {
      if (e.title !== rest[0]) return;
      if (rest.length === 1) treffer.push({ eintrag: e, idx: [...idx, n] });
      else lauf(e.items, rest.slice(1), [...idx, n]);
    });
  })(baum, teile, []);
  return treffer;
}

/** Shop-Pfad einer Adresse: ohne eigenen Host (luxestyle.ch, *.myshopify.com), ohne Sprachpräfix, ohne Schrägstrich am Ende. Fremde Hosts bleiben stehen. */
export function shopPfad(url) {
  if (typeof url !== 'string' || !url) return '';
  const p = zielVon({ url });
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/** Zeigt der Eintrag auf die Collection? (siehe Kopf der Datei) */
export function zeigtAuf(e, { handle, colId }) {
  if (!e || !handle) return false;
  const pfadGleich = shopPfad(e.url) === `/collections/${handle}`;
  if (e.type === 'COLLECTION') return (!!colId && e.resourceId === colId) || pfadGleich;
  if (e.type === 'HTTP') return pfadGleich;
  return false;
}

/** Anzahl Einträge im ganzen Baum. */
export function zaehle(baum) {
  return (baum || []).reduce((n, i) => n + 1 + zaehle(i.items), 0);
}

/** Alle Stellen im Menü, an denen die Collection vorkommt (Titelpfade), zur Auskunft. */
export function fundstellen(baum, ziel) {
  const aus = [];
  (function lauf(liste, pfad) { for (const e of liste || []) { if (zeigtAuf(e, ziel)) aus.push([...pfad, e.title]); lauf(e.items, [...pfad, e.title]); } })(baum, []);
  return aus;
}

const enthaelt = (e, gesucht) => (e.items || []).some(k => k === gesucht || enthaelt(k, gesucht));

/**
 * Plant die Verschiebung auf einer KOPIE von `alt` (Eingabe-Baum). Prüft dabei alle Regeln; jede verletzte Regel ist ein Fehler (Exit 2, nichts geschrieben).
 * @param alt     Eingabe-Baum (eingabeAus)
 * @param p       { handle, colId, von:string[], ziel:string[], nach?:string, vor?:string }
 * @returns {{fehler:string[]}|{fehler:[], plan:object[], info:object}}
 */
export function planeVerschiebung(alt, { handle, colId, von, ziel, nach = null, vor = null }) {
  const fehler = [];
  const b = kopie(alt);
  if (nach && vor) return { fehler: ['NACH und VOR zugleich gesetzt'] };
  const vT = findePfad(b, von), zT = findePfad(b, ziel);
  if (vT.length !== 1) fehler.push(vT.length ? `VON «${pfadText(von)}» ist mehrdeutig (${vT.length} Treffer)` : `VON «${pfadText(von)}» nicht gefunden`);
  if (zT.length !== 1) fehler.push(zT.length ? `ZIEL «${pfadText(ziel)}» ist mehrdeutig (${zT.length} Treffer)` : `ZIEL «${pfadText(ziel)}» nicht gefunden`);
  if (fehler.length) return { fehler };
  const vonE = vT[0].eintrag, zielE = zT[0].eintrag;
  const kinder = vonE.items || [];
  const idx = kinder.map((e, n) => (zeigtAuf(e, { handle, colId }) ? n : -1)).filter(n => n >= 0);
  if (idx.length !== 1) {
    const sonst = fundstellen(b, { handle, colId }).map(pfadText);
    fehler.push(`${idx.length ? `${idx.length} Einträge` : 'kein Eintrag'} für /collections/${handle} direkt unter VON «${pfadText(von)}» (verlangt: genau 1)` +
      (sonst.length ? `; im Menü steht die Collection hier: ${sonst.join(' | ')}` : '; die Collection steht nirgends im Menü'));
    return { fehler };
  }
  const n = idx[0], eintrag = kinder[n];
  if (zielE === vonE) fehler.push('ZIEL ist derselbe Eintrag wie VON');
  if (zielE === eintrag || enthaelt(eintrag, zielE)) fehler.push(`ZIEL «${pfadText(ziel)}» ist der Eintrag selbst oder liegt in ihm`);
  const zk = zielE.items || [];
  const doppelt = zk.filter(k => k.title === eintrag.title || zeigtAuf(k, { handle, colId }) || (!!eintrag.resourceId && k.resourceId === eintrag.resourceId));
  if (doppelt.length) fehler.push(`unter ZIEL «${pfadText(ziel)}» steht schon ein Eintrag mit demselben Titel oder Ziel: ${doppelt.map(k => `«${k.title}»`).join(', ')}`);
  const neueTiefe = ziel.length + 1 + tiefe(eintrag.items || []);
  if (neueTiefe > MAX_TIEFE) fehler.push(`zu tief: ZIEL auf Ebene ${ziel.length}, Eintrag mit ${tiefe(eintrag.items || [])} Ebenen darunter ergibt ${neueTiefe} Ebenen (Shopify erlaubt ${MAX_TIEFE})`);
  for (const [name, wert] of [['NACH', nach], ['VOR', vor]]) {
    if (!wert) continue;
    const c = zk.filter(k => k.title === wert).length;
    if (c !== 1) fehler.push(c ? `${name} «${wert}» kommt unter ZIEL ${c}-mal vor` : `${name} «${wert}» steht nicht unter ZIEL «${pfadText(ziel)}»`);
  }
  if (fehler.length) return { fehler };

  const vorgaenger = n > 0 ? kinder[n - 1].title : null;
  const nachfolger = n + 1 < kinder.length ? kinder[n + 1].title : null;
  kinder.splice(n, 1);
  zielE.items = zk;
  const pos = nach ? zk.findIndex(k => k.title === nach) + 1 : vor ? zk.findIndex(k => k.title === vor) : zk.length;
  zk.splice(pos, 0, eintrag);
  const restTitel = kinder.map(k => k.title);
  return { fehler: [], plan: b, info: {
    eintrag: kopie(eintrag), typ: eintrag.type, id: eintrag.id, altIndex: n, neuIndex: pos, vorgaenger, nachfolger,
    // Für die Rücknahme: ein Vorgänger-/Nachfolgertitel, der unter VON mehrfach steht, wäre als NACH/VOR mehrdeutig.
    vorgaengerEindeutig: vorgaenger === null || restTitel.filter(t => t === vorgaenger).length === 1,
    nachfolgerEindeutig: nachfolger === null || restTitel.filter(t => t === nachfolger).length === 1,
    vonKinder: restTitel, zielKinder: zk.map(k => k.title), tiefe: neueTiefe, gesamt: zaehle(b) } };
}

/**
 * Unabhängige Nachprüfung des Plans vor dem Schreiben (sucht VON und ZIEL selbst neu und vergleicht die Bäume ohne den verschobenen Eintrag).
 * @returns {string[]} Fehler (leer = in Ordnung)
 */
export function pruefePlan(alt, plan, { handle, colId, von, ziel, nach = null, vor = null }) {
  const fehler = [], z = { handle, colId };
  if (tiefe(plan) > MAX_TIEFE) fehler.push(`Plan hätte ${tiefe(plan)} Ebenen`);
  if (zaehle(plan) !== zaehle(alt)) fehler.push(`Anzahl Einträge: vorher ${zaehle(alt)}, Plan ${zaehle(plan)}`);
  const altK = kopie(alt), planK = kopie(plan);
  const va = findePfad(altK, von), zp = findePfad(planK, ziel), vp = findePfad(planK, von);
  if (va.length !== 1 || zp.length !== 1 || vp.length !== 1) { fehler.push('VON oder ZIEL im Plan nicht eindeutig auffindbar'); return fehler; }
  const ia = (va[0].eintrag.items || []).map((e, n) => (zeigtAuf(e, z) ? n : -1)).filter(n => n >= 0);
  const ip = (zp[0].eintrag.items || []).map((e, n) => (zeigtAuf(e, z) ? n : -1)).filter(n => n >= 0);
  if (ia.length !== 1) fehler.push('im alten Menü nicht genau ein Eintrag unter VON');
  if (ip.length !== 1) fehler.push(`im Plan ${ip.length} statt genau 1 Eintrag unter ZIEL`);
  if ((vp[0].eintrag.items || []).some(e => zeigtAuf(e, z))) fehler.push('im Plan steht der Eintrag noch unter VON');
  if (fehler.length) return fehler;
  const [altE] = va[0].eintrag.items.splice(ia[0], 1);
  const zk = zp[0].eintrag.items, j = ip[0];
  const [planE] = zk.splice(j, 1);
  if (JSON.stringify(altE) !== JSON.stringify(planE)) fehler.push('der verschobene Eintrag ist im Plan nicht derselbe (id, Titel, Typ, Ziel, Tags oder Kinder verändert)');
  if (JSON.stringify(altK) !== JSON.stringify(planK)) fehler.push('ausserhalb des verschobenen Eintrags weicht der Plan vom alten Menü ab');
  // Stelle unter ZIEL (zk ist jetzt ohne den Eintrag: Vorgänger = zk[j-1], Nachfolger = zk[j])
  if (nach && zk[j - 1]?.title !== nach) fehler.push(`Eintrag steht im Plan nicht direkt nach «${nach}»`);
  if (vor && zk[j]?.title !== vor) fehler.push(`Eintrag steht im Plan nicht direkt vor «${vor}»`);
  if (!nach && !vor && j !== zk.length) fehler.push('Eintrag steht im Plan nicht am Ende von ZIEL');
  return fehler;
}

/** Flache Liste in Reihenfolge, je Eintrag Pfad, Titel, Typ, Ziel (normalisiert), Tags und id; `markiert` = Eintrag oder Nachfahre von `marke`. */
export function flachMitId(baum, marke = null) {
  const aus = [];
  (function lauf(liste, pfad, unter) {
    for (const e of liste || []) {
      const m = unter || e === marke;
      aus.push({ pfad: pfadText([...pfad, e.title]), title: e.title, type: e.type, ziel: e.type === 'HTTP' ? shopPfad(e.url) : zielVon(e), tags: JSON.stringify(e.tags || []), id: e.id ?? null, markiert: m });
      lauf(e.items, [...pfad, e.title], m);
    }
  })(baum, [], false);
  return aus;
}

/**
 * Nach dem Schreiben: zurückgelesenes Menü streng gegen den Plan. Jeder andere Eintrag mit gleichem Pfad, Titel, Typ, Ziel, Tags, Reihenfolge und id;
 * der verschobene Eintrag genau einmal unter ZIEL an der geplanten Stelle, nicht mehr unter VON; Gesamtzahl gleich.
 * Eine NEUE id des verschobenen Eintrags (oder seiner Kinder) ist KEIN Fehler, wird aber gemeldet (Übersetzungen hängen an der id).
 * @returns {{fehler:string[], idGleich:boolean|null, idAlt:string|null, idNeu:string|null, neueKinderIds:number}}
 */
export function vergleicheNachlesen(plan, zurueck, { handle, colId, von, ziel, info }) {
  const fehler = [], z = { handle, colId };
  const zp = findePfad(plan, ziel);
  const marke = zp.length === 1 ? (zp[0].eintrag.items || []).find(e => zeigtAuf(e, z)) : null;
  if (!marke) return { fehler: ['Plan: verschobener Eintrag unter ZIEL nicht auffindbar'], idGleich: null, idAlt: null, idNeu: null, neueKinderIds: 0 };
  const a = flachMitId(plan, marke), r = flachMitId(zurueck);
  if (a.length !== r.length) fehler.push(`Anzahl Einträge: geplant ${a.length}, zurückgelesen ${r.length}`);
  let neueKinderIds = 0;
  const pos = a.findIndex(x => x.markiert);
  for (let n = 0; n < Math.max(a.length, r.length); n++) {
    const s = a[n], i = r[n];
    if (!s || !i) { fehler.push(`Eintrag ${n + 1}: ${s ? `geplant ${s.pfad}, zurück fehlt` : `zurück ${i.pfad}, nicht geplant`}`); continue; }
    for (const f of ['pfad', 'title', 'type', 'ziel', 'tags']) if (s[f] !== i[f]) fehler.push(`Eintrag ${n + 1} (${s.pfad}): ${f} geplant ${s[f]} ↔ zurück ${i[f]}`);
    if (s.id !== i.id) {
      if (!s.markiert) fehler.push(`Eintrag ${n + 1} (${s.pfad}): id geplant ${s.id} ↔ zurück ${i.id}`);
      else if (n !== pos) neueKinderIds++;
    }
  }
  const vz = findePfad(zurueck, ziel), vv = findePfad(zurueck, von);
  const unterZiel = vz.length === 1 ? (vz[0].eintrag.items || []).filter(e => zeigtAuf(e, z)).length : -1;
  if (unterZiel !== 1) fehler.push(`zurückgelesen: ${unterZiel < 0 ? 'ZIEL nicht eindeutig' : `${unterZiel} statt 1 Eintrag`} unter ZIEL`);
  if (vv.length === 1 && (vv[0].eintrag.items || []).some(e => zeigtAuf(e, z))) fehler.push('zurückgelesen: Eintrag steht noch unter VON');
  if (vv.length !== 1) fehler.push('zurückgelesen: VON nicht eindeutig');
  if (info && vz.length === 1 && (vz[0].eintrag.items || [])[info.neuIndex] && !zeigtAuf(vz[0].eintrag.items[info.neuIndex], z)) fehler.push(`zurückgelesen: an Stelle ${info.neuIndex + 1} unter ZIEL steht nicht der Eintrag`);
  const idAlt = a[pos].id, idNeu = r[pos] ? r[pos].id : null;
  return { fehler, idGleich: r[pos] ? idNeu === idAlt : null, idAlt, idNeu, neueKinderIds };
}

/** Zwei gelesene Menüs gleich? (Menü-id, Titel, Handle und der ganze Eingabe-Baum: Titel, Typ, Ziel, Tags, Reihenfolge, ids) */
export function gleichesMenue(m1, m2) {
  if (!m1 || !m2) return { gleich: false, grund: 'Menü fehlt' };
  for (const f of ['id', 'title', 'handle']) if (m1[f] !== m2[f]) return { gleich: false, grund: `Menü-${f}: ${m1[f]} ↔ ${m2[f]}` };
  const a = flachMitId(eingabeAus(m1.items)), b = flachMitId(eingabeAus(m2.items));
  for (let n = 0; n < Math.max(a.length, b.length); n++) {
    const s = JSON.stringify(a[n] ?? null), t = JSON.stringify(b[n] ?? null);
    if (s !== t) return { gleich: false, grund: `Eintrag ${n + 1}: ${a[n] ? `${a[n].pfad} (${a[n].id})` : 'fehlt'} ↔ ${b[n] ? `${b[n].pfad} (${b[n].id})` : 'fehlt'}` };
  }
  // Rohvergleich der Eingabe (fängt auch Felder, die die flache Form nicht kennt)
  if (JSON.stringify(eingabeAus(m1.items)) !== JSON.stringify(eingabeAus(m2.items))) return { gleich: false, grund: 'Eingabe-Baum verschieden' };
  return { gleich: true, grund: '' };
}

/** Einfache Anführungszeichen für die Shell (Titel mit &, >, $, ' bleiben ein Wort). */
export const shellWort = s => `'${String(s).replace(/'/g, `'\\''`)}'`;

/** Der Befehl, der die Verschiebung zurücknimmt: VON und ZIEL vertauscht, NACH = früherer Vorgänger (war der Eintrag der erste, VOR = früherer Nachfolger). */
export function ruecknahmeBefehl({ handle, von, ziel, info, menue = 'main-menu' }) {
  const teile = [`HANDLE=${handle}`, `VON=${shellWort(pfadText(ziel))}`, `ZIEL=${shellWort(pfadText(von))}`];
  if (info.vorgaenger !== null) teile.push(`NACH=${shellWort(info.vorgaenger)}`);
  else if (info.nachfolger !== null) teile.push(`VOR=${shellWort(info.nachfolger)}`);
  if (menue !== 'main-menu') teile.push(`MENUE=${menue}`);
  const warn = (info.vorgaenger !== null && !info.vorgaengerEindeutig) || (info.vorgaenger === null && info.nachfolger !== null && !info.nachfolgerEindeutig);
  return { befehl: `${teile.join(' ')} LIVE=1 node automation/menu_eintrag_verschieben.mjs`, warnung: warn ? 'Der frühere Nachbar-Titel steht unter VON mehrfach: die Rücknahme bricht mit Exit 2 ab und muss von Hand gesetzt werden.' : '' };
}

/** Name der Sicherungsdatei: <dir>/<menü>-vor-verschieben-<handle>-<UTC-Zeitstempel>[-n].json */
export function sicherungsName(dir, menue, handle, jetzt, n = 1) {
  const stempel = jetzt.toISOString().replace(/[:.]/g, '-');
  return `${String(dir).replace(/\/+$/, '')}/${menue}-vor-verschieben-${handle}-${stempel}${n > 1 ? `-${n}` : ''}.json`;
}
