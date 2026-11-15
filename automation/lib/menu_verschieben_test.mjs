// Tests für das Verschieben eines Menü-Eintrags (lib/menu_verschieben.mjs und menu_eintrag_verschieben.mjs).
// Kein Netz: die Läufe sprechen mit einer Attrappe von shopifyGql, die menus, collectionByHandle und menuUpdate beantwortet und den Baum nach
// menuUpdate so zurückgibt, wie er geschrieben wurde (COLLECTION-Adressen wie Shopify mit /en/). Die Attrappe ist EHRLICH zur Abfrage: sie liefert
// beim Lesen nur die Felder und Ebenen, die die Abfrage wirklich verlangt (so wie Shopify; ohne items{ auf einer Ebene keine Kinder, ohne tags keine
// Tags), und wirft bei unbekannten Feldern. Grund: Gegenprüfung 11.11.2026 (W1), drei Ein-Wort-Fehler in MENU_Q/FELDER überlebten die alte Attrappe,
// die immer alles lieferte, und hätten im Shop still Einträge, ids oder Tags gelöscht. Varianten: neue id,
// fehlender Eintrag, vertauschte Reihenfolge, zwischenzeitlich geändertes Menü, userErrors, Fehler beim Schreiben und Nachlesen.
// Jede Pflicht mit Gegenprobe in beide Richtungen. Optional: MENU_ECHT=<gelesenes Hauptmenü als JSON> prüft dazu den echten Baum (nur Attrappe, kein Netz).
// Lauf: /opt/node22/bin/node automation/lib/menu_verschieben_test.mjs   (Exit 0 = alles grün)
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eingabeAus, teilePfad, shopPfad, zeigtAuf, findePfad, planeVerschiebung, pruefePlan, vergleicheNachlesen, gleichesMenue, shellWort,
  ruecknahmeBefehl, sicherungsName, zaehle, MAX_TIEFE, MENU_Q, LESE_PFLICHT, pruefeLeseform } from './menu_verschieben.mjs';
import { verschiebenLauf, optionenAusEnv, SICHERUNG_DIR } from '../menu_eintrag_verschieben.mjs';
import { linkGid, uebQ, fehlendeUebersetzungen, LOC_Q } from './menu_uebersetzung.mjs';

let ok = 0, fehl = 0;
const kopie = x => JSON.parse(JSON.stringify(x));
const kanon = x => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(s => [s, v[s]])) : v));
const ist = (name, wert, soll) => { const a = kanon(wert), b = kanon(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', String(a).slice(0, 600), '\n  soll ', String(b).slice(0, 600)); } };
const enthaelt = (name, text, teil) => { if (String(text).includes(teil)) ok++; else { fehl++; console.log('FEHLER', name, '\n  Text enthält nicht:', teil, '\n  Text:', String(text).slice(0, 900)); } };
const enthaeltNicht = (name, text, teil) => { if (!String(text).includes(teil)) ok++; else { fehl++; console.log('FEHLER', name, '\n  Text enthält:', teil); } };

// ── Testmenü (Form wie gelesen: COLLECTION mit resourceId UND /en/-Adresse, HTTP nur mit Adresse, dritte Ebene ohne items)
const C = n => `gid://shopify/Collection/${n}`, I = n => `gid://shopify/MenuItem/${n}`;
const COLLS = Object.fromEntries([
  ['ersatzteile-zubehoer', 900, 'Ersatzteile & Zubehör'], ['reinigungsmittel-buersten-mopps', 101, 'Putzen'], ['staubsauger-zubehoer', 102, 'Staubsauger'], ['muelleimer-abfall', 103, 'Mülleimer'],
  ['koerbe-behaelter', 104, 'Aufbewahrung'], ['schubladen-organizer', 105, 'Organizer'], ['handy-zubehoer', 201, 'Handy'], ['powerbanks', 202, 'Powerbanks'], ['ladekabel-datenkabel', 203, 'Ladekabel'],
  ['schuhe', 301, 'Schuhe'], ['damen-schuhe', 302, 'Damen-Schuhe'], ['sneaker', 303, 'Sneaker'], ['uhren', 701, 'Uhren'], ['uhrenarmbaender-smartwatch', 702, 'Uhrenarmbänder'],
  ['kabel-adapter', 210, 'Kabel'], ['elektronik-kleinteile', 211, 'Kleinteile'],
].map(([h, n, t]) => [h, { id: C(n), title: t, handle: h }]));
const col = (id, title, handle, items, tags = []) => ({ id: I(id), title, type: 'COLLECTION', resourceId: COLLS[handle].id, url: `/en/collections/${handle}`, tags, ...(items ? { items } : {}) });
const http = (id, title, handle, items) => ({ id: I(id), title, type: 'HTTP', resourceId: null, url: `/collections/${handle}`, tags: [], ...(items ? { items } : {}) });
const MENU = { id: 'gid://shopify/Menu/1', title: 'Main menu', handle: 'main-menu', items: [
  http(1, 'Wohnen & Garten', 'wohnen-dekoration', [
    col(11, 'Putzen & Haushalt', 'reinigungsmittel-buersten-mopps', [col(111, 'Staubsauger & Zubehör', 'staubsauger-zubehoer'), col(112, 'Mülleimer & Abfall', 'muelleimer-abfall'), http(113, 'Ersatzteile & Zubehör', 'ersatzteile-zubehoer')]),
    col(12, 'Aufbewahrung & Möbel', 'koerbe-behaelter', [col(121, 'Organizer & Schubladenboxen', 'schubladen-organizer')]),
    http(13, 'Dekoration', 'deko', [])]),
  http(2, 'Elektronik', 'elektronik-technik', [
    http(21, 'Elektronik & Technik', 'elektronik-technik', []),
    col(22, 'Handy & Laden', 'handy-zubehoer', [col(221, 'Powerbanks', 'powerbanks'), col(222, 'Ladekabel & Datenkabel', 'ladekabel-datenkabel')]),
    http(23, 'Kabel & Adapter', 'kabel-adapter', []),
    http(24, 'Elektronik-Kleinteile', 'elektronik-kleinteile', [])]),
  col(3, 'Schuhe', 'schuhe', [col(31, 'Damen', 'damen-schuhe', [col(311, 'Sneaker', 'sneaker')], ['f-leder'])]),
  http(4, 'Highlights', 'bestseller', [http(41, 'Neu', 'neu', [])]),
  http(5, 'Highlights', 'highlights-2', []),
  col(6, 'Uhren', 'uhren', [col(61, 'Uhrenarmbänder', 'uhrenarmbaender-smartwatch', [])]),
] };
const PUTZEN = 'Wohnen & Garten > Putzen & Haushalt';
const JETZT = new Date('2026-11-11T23:00:00.000Z');

// Unabhängig gebaute Eingabe (NICHT eingabeAus der Bibliothek): was menuUpdate bekommen muss.
const eingabeSoll = items => (items || []).map(i => { const o = { id: i.id, title: i.title, type: i.type }; if (i.resourceId) o.resourceId = i.resourceId; if (i.url) o.url = i.url; if (i.tags && i.tags.length) o.tags = [...i.tags]; o.items = eingabeSoll(i.items); return o; });

// ── Ehrliche Antwort auf eine Menü-Abfrage: die Auswahl wird aus dem Abfragetext gelesen (Argumente in Klammern fallen weg), geliefert wird nur, was
//    sie verlangt. Unbekanntes Feld, Feld ohne nötige Unterauswahl oder unausgeglichene Klammern: Fehler wie bei Shopify (shopifyGql wirft).
const FELDER_MENU = ['id', 'title', 'handle', 'items'], FELDER_EINTRAG = ['id', 'title', 'type', 'resourceId', 'url', 'tags', 'items'];
function auswahlAus(query) {
  const ohneArg = query.replace(/\([^)]*\)/g, ' ');
  if ((ohneArg.match(/\{/g) || []).length !== (ohneArg.match(/\}/g) || []).length) throw new Error('GraphQL: Parse error (Klammern)');
  const tok = ohneArg.match(/[A-Za-z_][A-Za-z0-9_]*|[{}]/g) || [];
  let i = 0;
  const sel = () => { const o = {}; while (i < tok.length && tok[i] !== '}') { const name = tok[i++]; if (tok[i] === '{') { i++; o[name] = sel(); i++; } else o[name] = true; } return o; };
  const w = sel();
  const nodes = (w.query || w)?.menus?.nodes;
  if (!nodes || nodes === true) throw new Error('GraphQL: Abfrage ohne menus{nodes{…}}');
  return nodes;
}
function antwortKnoten(obj, sel, typ) {
  const o = {}, erlaubt = typ === 'Menu' ? FELDER_MENU : FELDER_EINTRAG;
  for (const [f, sub] of Object.entries(sel)) {
    if (!erlaubt.includes(f)) throw new Error(`GraphQL: Field '${f}' doesn't exist on type '${typ}'`);
    if (f === 'items') { if (sub === true) throw new Error(`GraphQL: Field 'items' must have selections`); o.items = (obj.items || []).map(k => antwortKnoten(k, sub, 'MenuItem')); continue; }
    if (sub !== true) throw new Error(`GraphQL: Field '${f}' must not have selections`);
    o[f] = f === 'tags' ? [...(obj.tags || [])] : (obj[f] ?? null);
  }
  return o;
}
const antwortAuf = (query, menu) => antwortKnoten(menu, auswahlAus(query), 'Menu');
// Bezugsform für Vergleiche: EIGENE Abfrage mit allen Feldern und 3 Ebenen, bewusst nicht MENU_Q (ein Fehler in MENU_Q soll hier auffallen).
const VOLL_Q = 'query{menus{nodes{id title handle items{id title type resourceId url tags items{id title type resourceId url tags items{id title type resourceId url tags}}}}}}';

/** Attrappe von shopifyGql. Zustand in st.menu (gespeicherte Form), Aufrufe in st.aufrufe, Eingaben von menuUpdate in st.eingaben.
 *  `lesenStoerung(nodes, n)` verändert die Antwort des n-ten Lesens (für Prüfungen der Leseform). */
function attrappe(roh = MENU, { collections = COLLS, menues = null, vorLesen = null, nachSchreiben = null, updateWirft = false, userErrors = null, lesenWirft = null, lesenStoerung = null,
  ueb = {}, uebWegNachUpdate = [], regFehler = null, uebWirft = false } = {}) {
  const st = { menu: kopie(roh), lesen: 0, aufrufe: [], eingaben: [], naechste: 9000, ueb: kopie(ueb), regs: [] };
  const handleVonGid = Object.fromEntries(Object.values(collections).filter(Boolean).map(c => [c.id, c.handle]));
  const speichern = items => (items || []).map(i => ({ id: i.id || I(st.naechste++), title: i.title, type: i.type, resourceId: i.type === 'COLLECTION' ? i.resourceId : null,
    url: i.type === 'COLLECTION' ? (handleVonGid[i.resourceId] ? `/en/collections/${handleVonGid[i.resourceId]}` : (i.url ?? null)) : i.url, tags: i.tags || [], items: speichern(i.items) }));
  const ids = () => { const s = new Set(); (function l(x) { for (const i of x || []) { s.add(i.id); l(i.items); } })(st.menu.items); return s; };
  const lese = m => antwortAuf(VOLL_Q, m);
  const q = async (query, v) => {
    if (query.includes('menuUpdate')) {
      st.aufrufe.push('update'); st.eingaben.push(kopie(v));
      if (updateWirft) throw new Error('GraphQL: fetch: socket hang up');
      // Pflicht-Variablen (ID!, String!) wie Shopify: fehlt eine, wirft die Abfrage, bevor etwas gespeichert wird
      for (const k of ['id', 't', 'h']) if (typeof v[k] !== 'string') throw new Error(`GraphQL: Variable $${k} of required type was not provided`);
      if (userErrors) return { menuUpdate: { menu: null, userErrors } };
      const bekannt = ids(), f = [];
      if (v.id !== st.menu.id) f.push({ message: 'Menu does not exist', code: 'NOT_FOUND' });
      (function pr(l, t) { for (const i of l || []) {
        if (i.id && !bekannt.has(i.id)) f.push({ message: `Menu item ${i.id} does not exist`, code: 'NOT_FOUND' });
        if (i.type === 'HTTP' && !i.url) f.push({ message: 'url fehlt', code: 'INVALID' });
        if (i.type === 'COLLECTION' && !i.resourceId) f.push({ message: 'resourceId fehlt', code: 'INVALID' });
        if (t > 3) f.push({ message: 'zu tief', code: 'INVALID' });
        pr(i.items, t + 1);
      } })(v.i, 1);
      if (f.length) return { menuUpdate: { menu: null, userErrors: f } };
      st.menu = { ...st.menu, title: v.t, handle: v.h, items: speichern(v.i) };
      if (nachSchreiben) nachSchreiben(st.menu, st);
      for (const rid of uebWegNachUpdate) delete st.ueb[rid]; // wie Shopify am 12.11.: Übersetzung des verschobenen Eintrags weg
      return { menuUpdate: { menu: { id: st.menu.id }, userErrors: [] } };
    }
    if (query.includes('menus(')) {
      st.lesen++; st.aufrufe.push('menus'); st.letzteSuche = v.h;
      if (lesenWirft && lesenWirft(st.lesen)) throw new Error('GraphQL: HTTP 503');
      if (vorLesen) vorLesen(st.menu, st.lesen);
      const alle = menues ? menues(st) : [st.menu].filter(m => v.h === `handle:${m.handle}`);
      const nodes = alle.map(m => antwortAuf(query, m));
      if (lesenStoerung) lesenStoerung(nodes, st.lesen);
      return { menus: { nodes } };
    }
    if (query.includes('collectionByHandle')) { st.aufrufe.push('coll'); return { collectionByHandle: collections[v.h] ? kopie(collections[v.h]) : null }; }
    if (query === LOC_Q) { st.aufrufe.push('loc'); return { shopLocales: [{ locale: 'de', primary: true }, { locale: 'fr', primary: false }, { locale: 'en', primary: false }] }; }
    if (query.includes('translatableResource(')) {
      st.aufrufe.push('ueb'); if (uebWirft) throw new Error('GraphQL: HTTP 503');
      if (!/^gid:\/\/shopify\/Link\/\d+$/.test(v.id)) throw new Error('GraphQL: invalid id');
      const r = { translatableContent: [{ key: 'title', digest: 'd-' + v.id }] };
      for (const [, al, l] of query.matchAll(/(t\d+): translations\(locale:"([^"]+)"\)/g)) r[al] = Object.entries(st.ueb[v.id]?.[l] || {}).map(([key, value]) => ({ key, value }));
      return { translatableResource: r };
    }
    if (query.includes('translationsRegister')) {
      st.aufrufe.push('reg'); st.regs.push(kopie(v));
      if (regFehler) return { translationsRegister: { translations: null, userErrors: regFehler } };
      for (const t of v.t) { if (t.translatableContentDigest !== 'd-' + v.id) return { translationsRegister: { translations: null, userErrors: [{ field: ['digest'], message: 'Digest falsch' }] } };
        ((st.ueb[v.id] ??= {})[t.locale] ??= {})[t.key] = t.value; }
      return { translationsRegister: { translations: v.t.map(t => ({ key: t.key, locale: t.locale, value: t.value })), userErrors: [] } };
    }
    throw new Error('Attrappe: unbekannte Abfrage');
  };
  return { q, st, lese };
}

const tmp = mkdtempSync(join(tmpdir(), 'menuverschieben-test-'));
let nr = 0;
/** Ein Lauf gegen die Attrappe. @returns {{r, st, text, dir}} */
async function lauf(opt, att = {}, roh = MENU) {
  const { q, st, lese } = attrappe(roh, att);
  const dir = opt.sicherungDir ?? join(tmp, `s${++nr}`);
  const zeilen = [];
  const r = await verschiebenLauf(q, { handle: 'ersatzteile-zubehoer', von: PUTZEN, ziel: 'Elektronik', jetzt: () => JETZT, out: (...a) => zeilen.push(a.join(' ')), err: (...a) => zeilen.push('ERR ' + a.join(' ')), ...opt, sicherungDir: dir });
  return { r, st, text: zeilen.join('\n'), dir, lese };
}
const kinderTitel = (menu, pfad) => findePfad(menu.items, pfad.split(' > '))[0]?.eintrag.items.map(x => x.title);
const sicherungen = dir => (existsSync(dir) ? readdirSync(dir).sort() : []);

// ════════ Bausteine (rein) ════════
ist('teilePfad: Trenner, äusserer Rand, leere Teile', [teilePfad('A > B'), teilePfad(' A > B '), teilePfad(''), teilePfad('A >  > B'), teilePfad('A>B'), teilePfad(undefined)], [['A', 'B'], ['A', 'B'], null, null, ['A>B'], null]);
ist('shopPfad: eigener Host und Sprachpräfix weg, fremder Host und Abfrage bleiben', [shopPfad('https://luxestyle.ch/collections/x'), shopPfad('/en/collections/x/'), shopPfad('https://fremd.ch/collections/x'), shopPfad('/collections/x?f=1'), shopPfad(null)],
  ['/collections/x', '/collections/x', 'https://fremd.ch/collections/x', '/collections/x?f=1', '']);
{
  const z = { handle: 'ersatzteile-zubehoer', colId: C(900) };
  const t = (type, url, resourceId = null) => zeigtAuf({ type, url, resourceId }, z);
  ist('zeigtAuf: HTTP-Link genau auf /collections/<handle> (relativ, mit eigenem Host, mit /en/)', [t('HTTP', '/collections/ersatzteile-zubehoer'), t('HTTP', 'https://luxestyle.ch/collections/ersatzteile-zubehoer'), t('HTTP', '/en/collections/ersatzteile-zubehoer')], [true, true, true]);
  ist('zeigtAuf Gegenprobe: Abfrage, weiterer Pfadteil, längerer Handle, fremder Host, anderer Typ', [t('HTTP', '/collections/ersatzteile-zubehoer?filter=x'), t('HTTP', '/collections/ersatzteile-zubehoer/tag'),
    t('HTTP', '/collections/ersatzteile-zubehoer-alt'), t('HTTP', 'https://fremd.ch/collections/ersatzteile-zubehoer'), t('PAGE', '/collections/ersatzteile-zubehoer'), t('HTTP', '/collections/ersatzteile')], [false, false, false, false, false, false]);
  ist('zeigtAuf: COLLECTION über resourceId (Adresse egal) ODER über die Adresse (resourceId anders)', [t('COLLECTION', '/en/collections/anders', C(900)), t('COLLECTION', '/en/collections/ersatzteile-zubehoer', C(1)), t('COLLECTION', '/en/collections/anders', C(1))], [true, true, false]);
  ist('zeigtAuf: ohne Collection-ID zählt bei COLLECTION nur die Adresse', [zeigtAuf({ type: 'COLLECTION', resourceId: null, url: '/x' }, { handle: 'x', colId: null }), zeigtAuf({ type: 'COLLECTION', resourceId: undefined, url: '/collections/x' }, { handle: 'x', colId: undefined })], [false, true]);
}
ist('eingabeAus: ids bleiben, leere Felder fallen weg, dritte Ebene bekommt items:[], Tags bleiben', eingabeAus(MENU.items), eingabeSoll(MENU.items));
ist('findePfad: eindeutig, mehrdeutig, fehlend', [findePfad(MENU.items, ['Wohnen & Garten', 'Putzen & Haushalt']).length, findePfad(MENU.items, ['Highlights']).length, findePfad(MENU.items, ['Gibt es nicht']).length], [1, 2, 0]);
ist('zaehle: alle Einträge aller Ebenen', zaehle(MENU.items), 23);
ist('shellWort: Apostroph, &, > und $ bleiben ein Wort', [shellWort("Kid's & Co > $HOME")], [`'Kid'\\''s & Co > $HOME'`]);
ist('sicherungsName: Menü, Handle, UTC-Zeitstempel, Zusatznummer', [sicherungsName('d/x/', 'main-menu', 'h', JETZT), sicherungsName('d', 'footer', 'h', JETZT, 3)],
  ['d/x/main-menu-vor-verschieben-h-2026-11-11T23-00-00-000Z.json', 'd/footer-vor-verschieben-h-2026-11-11T23-00-00-000Z-3.json']);
ist('MAX_TIEFE ist 3 (Shopify)', MAX_TIEFE, 3);

// ════════ Pflicht 10: Leseform (Gegenprüfung 11.11.2026, W1) ════════
// Zuerst das Messgerät: die Attrappe liefert nur, was die Abfrage verlangt, und wirft bei Unbekanntem (sonst bewiesen die Läufe nichts über MENU_Q).
{
  const Q2 = 'query{menus{nodes{id title handle items{id title type resourceId url tags items{id title type resourceId url tags}}}}}';
  const a2 = antwortAuf(Q2, MENU);
  ist('Attrappe: 2-Ebenen-Abfrage liefert keine dritte Ebene (Ebene 2 ohne items)', [a2.items[0].items[0].items, zaehle(a2.items)], [undefined, 16]);
  const aT = antwortAuf('query{menus{nodes{id title handle items{id title type resourceId url items{id title items{title}}}}}}', MENU);
  ist('Attrappe: ohne tags keine Tags, ohne id keine id, nur verlangte Felder', [Object.keys(aT.items[2].items[0]).sort(), 'tags' in aT.items[2], Object.keys(aT.items[0].items[0].items[0])], [['id', 'items', 'title'], false, ['title']]);
  const wirft = f => { try { f(); return 'kein Fehler'; } catch (x) { return x.message.startsWith('GraphQL:'); } };
  ist('Attrappe: unbekanntes Feld, items ohne Auswahl, Feld mit Auswahl, Klammern falsch, ohne menus → GraphQL-Fehler',
    [wirft(() => antwortAuf('query{menus{nodes{id titel items{id}}}}', MENU)), wirft(() => antwortAuf('query{menus{nodes{id items}}}', MENU)),
      wirft(() => antwortAuf('query{menus{nodes{id{x} items{id}}}}', MENU)), wirft(() => antwortAuf('query{menus{nodes{id items{id}}}', MENU)), wirft(() => antwortAuf('query{shop{id}}', MENU))],
    [true, true, true, true, true]);
  // Auch der Lesepfad der Attrappe selbst (q) folgt der Abfrage, nicht nur antwortAuf
  const viaQ = await attrappe(MENU).q('query($h:String!){menus(first:5,query:$h){nodes{id title handle items{id title items{title}}}}}', { h: 'handle:main-menu' });
  ist('Attrappe-Lesepfad q(): liefert nur verlangte Felder und Ebenen', [Object.keys(viaQ.menus.nodes[0]).sort(), Object.keys(viaQ.menus.nodes[0].items[0]).sort(), Object.keys(viaQ.menus.nodes[0].items[0].items[0]).sort()],
    [['handle', 'id', 'items', 'title'], ['id', 'items', 'title'], ['title']]);
  ist('Attrappe: Argumente in Klammern stören die Auswahl nicht', antwortAuf('query($h:String!){menus(first:5,query:$h){nodes{id handle}}}', MENU), { id: MENU.id, handle: MENU.handle });
  // Die Abfrage des Werkzeugs selbst: alle Felder, drei Ebenen (Bezug VOLL_Q ist eine eigene Zeichenkette, nicht MENU_Q)
  ist('P10 MENU_Q fragt alle Felder und genau drei Ebenen ab (Antwort gleich der Bezugsform)', antwortAuf(MENU_Q, MENU), antwortAuf(VOLL_Q, MENU));
  ist('P10 MENU_Q: Ebene 3 hat alle Pflichtfelder, Ebene 1 und 2 haben items', [Object.keys(antwortAuf(MENU_Q, MENU).items[0]?.items?.[0]?.items?.[0] ?? {}).sort(), 'items' in (antwortAuf(MENU_Q, MENU).items[0]?.items?.[0] ?? {})],
    [['id', 'resourceId', 'tags', 'title', 'type', 'url'], true]);
  ist('P10 Pflichtschlüssel genau id, title, type, resourceId, url, tags', [...LESE_PFLICHT].sort(), ['id', 'resourceId', 'tags', 'title', 'type', 'url']);
}
// Wirkung im Shop (unabhängig von pruefeLeseform): ein LIVE-Lauf mit einem Eintrag auf Ebene 2, der Tags und ein Kind auf Ebene 3 hat.
// Danach müssen im Shop alle Einträge, alle ids und alle Tags erhalten sein. Genau hier löschten die W1-Fehler still (Ebene 3, ids, Tags).
{
  const alleIds = l => { const a = []; (function w(x) { for (const e of x || []) { a.push(e.id); w(e.items); } })(l); return a.sort(); };
  const tagZahl = l => { let n = 0; (function w(x) { for (const e of x || []) { n += (e.tags || []).length; w(e.items); } })(l); return n; };
  const { r, st } = await lauf({ live: true, handle: 'damen-schuhe', von: 'Schuhe', ziel: 'Wohnen & Garten' });
  ist('P10 Wirkung: Eintrag auf Ebene 2 verschoben, im Shop danach alle Einträge, ids und Tags erhalten',
    [r.code, zaehle(st.menu.items), alleIds(st.menu.items), tagZahl(st.menu.items)], [0, zaehle(MENU.items), alleIds(MENU.items), tagZahl(MENU.items)]);
}
// pruefeLeseform: jede Lücke an jeder Ebene wird gefunden, die volle Form nicht
{
  const voll = antwortAuf(VOLL_Q, MENU);
  ist('P10 pruefeLeseform: volle Form ohne Befund (auch Ebene 3 ohne items, resourceId/url null)', pruefeLeseform(voll), []);
  const ohne = (ebene, k) => { const m = kopie(voll); const e = ebene === 1 ? m.items[0] : ebene === 2 ? m.items[0].items[0] : m.items[0].items[0].items[0]; delete e[k]; return pruefeLeseform(m); };
  for (const k of ['id', 'title', 'type', 'resourceId', 'url', 'tags']) for (const eb of [1, 2, 3]) {
    const f = ohne(eb, k);
    ist(`P10 pruefeLeseform: Ebene ${eb} ohne ${k} → genau ein Befund mit Ebene und Schlüssel`, [f.length, new RegExp(`^Ebene ${eb} .*ohne ${k}$`).test(f[0] || '')], [1, true]);
  }
  const f1 = (() => { const m = kopie(voll); delete m.items[1].items; return pruefeLeseform(m); })();
  const f2 = (() => { const m = kopie(voll); delete m.items[0].items[0].items; return pruefeLeseform(m); })();
  ist('P10 pruefeLeseform: Ebene 1 bzw. 2 ohne items → Befund «zu wenige Ebenen»', [f1.length, /^Ebene 1 «Elektronik»: ohne items/.test(f1[0]), f2.length, /^Ebene 2 «Wohnen & Garten > Putzen & Haushalt»: ohne items/.test(f2[0])], [1, true, 1, true]);
  const zweiEbenen = antwortAuf('query{menus{nodes{id title handle items{id title type resourceId url tags items{id title type resourceId url tags}}}}}', MENU);
  ist('P10 pruefeLeseform: ganze Antwort einer 2-Ebenen-Abfrage → je Eintrag auf Ebene 2 ein Befund', pruefeLeseform(zweiEbenen).length, 10);
  const leer = (() => { const m = kopie(voll); m.items[2].id = ''; return pruefeLeseform(m); })(), nul = (() => { const m = kopie(voll); m.items[2].items[0].id = null; return pruefeLeseform(m); })();
  ist('P10 pruefeLeseform: id leer oder null → Befund', [leer, nul.length, /id leer/.test(nul[0])], [['Ebene 1 «Schuhe»: id leer'], 1, true]);
  const tg = (() => { const m = kopie(voll); m.items[2].items[0].tags = 'f-leder'; return pruefeLeseform(m); })();
  ist('P10 pruefeLeseform: tags keine Liste → Befund', tg, ['Ebene 2 «Schuhe > Damen»: tags ist keine Liste']);
  const mk = k => { const m = kopie(voll); delete m[k]; return pruefeLeseform(m); };
  ist('P10 pruefeLeseform: Menü ohne id, title, handle oder items; kein Menü; Eintrag kein Objekt',
    [mk('id'), mk('title'), mk('handle'), mk('items'), pruefeLeseform(null), pruefeLeseform({ ...voll, items: [null] })],
    [['Menü ohne id'], ['Menü ohne title'], ['Menü ohne handle'], ['Menü ohne items'], ['Menü fehlt'], ['Ebene 1 unter «(oben)»: kein Eintrag']]);
}

// ════════ Pflicht 1: Eintrag unter VON finden, Collection frisch lesen ════════
{
  const { r, st, text, dir } = await lauf({});
  ist('P1 Trockenlauf: Exit 0, nur gelesen (Menü, Collection), nichts geschrieben', [r.code, st.aufrufe], [0, ['menus', 'coll', 'loc', 'ueb']]);
  enthaelt('P1 Trockenlauf: Eintrag als HTTP erkannt', text, 'Eintrag: «Ersatzteile & Zubehör» Typ HTTP url /collections/ersatzteile-zubehoer');
  enthaelt('P1 Trockenlauf: sagt, dass nichts geschrieben wurde', text, 'Trockenlauf: nichts geschrieben.');
  ist('P1 Trockenlauf: Plan VON und ZIEL', [r.info.vonKinder, r.info.zielKinder, r.info.neuIndex], [['Staubsauger & Zubehör', 'Mülleimer & Abfall'], ['Elektronik & Technik', 'Handy & Laden', 'Kabel & Adapter', 'Elektronik-Kleinteile', 'Ersatzteile & Zubehör'], 4]);
  ist('P1 Trockenlauf: Sicherung liegt auch ohne LIVE', sicherungen(dir).length, 1);
  ist('P1 Suche nach dem Menü mit seinem Handle', st.letzteSuche, 'handle:main-menu');
}
{
  const { r, st } = await lauf({ von: 'Elektronik' });
  ist('P1 Gegenprobe: Collection steht nicht unter VON → Exit 2, kein Schreiben', [r.code, st.aufrufe.includes('update')], [2, false]);
  enthaelt('P1 nennt die echte Fundstelle', r.fehler.join(' '), 'im Menü steht die Collection hier: Wohnen & Garten > Putzen & Haushalt > Ersatzteile & Zubehör');
}
{
  const m = kopie(MENU); findePfad(m.items, PUTZEN.split(' > '))[0].eintrag.items.push(col(114, 'Ersatzteile', 'ersatzteile-zubehoer'));
  const { r, st } = await lauf({ live: true }, {}, m);
  ist('P1 zwei Einträge für die Collection unter VON → Exit 2, kein Schreiben', [r.code, st.aufrufe.includes('update'), /2 Einträge/.test(r.fehler.join(' '))], [2, false, true]);
}
{
  const { r, st } = await lauf({ live: true }, { collections: { ...COLLS, 'ersatzteile-zubehoer': undefined } });
  ist('P1 Collection fehlt im Shop (collectionByHandle leer) → Exit 2, kein Schreiben', [r.code, st.aufrufe.includes('update')], [2, false]);
}
ist('P1 nur direkte Kinder von VON zählen (Enkel unter «Wohnen & Garten» nicht)', (await lauf({ von: 'Wohnen & Garten' })).r.code, 2);
{
  const m = kopie(MENU); findePfad(m.items, PUTZEN.split(' > '))[0].eintrag.items[2].url = '/collections/ersatzteile-zubehoer?filter.p.tag=x';
  ist('P1 Link mit Abfrage ist nicht die Collection → Exit 2', (await lauf({}, {}, m)).r.code, 2);
  const m2 = kopie(MENU); findePfad(m2.items, PUTZEN.split(' > '))[0].eintrag.items[2].url = '/collections/ersatzteile-zubehoer-alt';
  ist('P1 längerer Handle ist nicht die Collection → Exit 2', (await lauf({}, {}, m2)).r.code, 2);
  const m3 = kopie(MENU); Object.assign(findePfad(m3.items, PUTZEN.split(' > '))[0].eintrag.items[2], { type: 'PAGE' });
  ist('P1 anderer Typ (PAGE) mit gleicher Adresse zählt nicht → Exit 2', (await lauf({}, {}, m3)).r.code, 2);
  const m4 = kopie(MENU); Object.assign(findePfad(m4.items, PUTZEN.split(' > '))[0].eintrag.items[2], { type: 'COLLECTION', resourceId: C(900), url: '/en/collections/umbenannt' });
  ist('P1 Gegenprobe: COLLECTION über resourceId gefunden (Adresse anders) → Exit 0', (await lauf({}, {}, m4)).r.code, 0);
  const m5 = kopie(MENU); Object.assign(findePfad(m5.items, PUTZEN.split(' > '))[0].eintrag.items[2], { type: 'COLLECTION', resourceId: C(42), url: '/en/collections/ersatzteile-zubehoer' });
  ist('P1 Gegenprobe: COLLECTION über die Adresse gefunden (resourceId anders) → Exit 0', (await lauf({}, {}, m5)).r.code, 0);
}
{
  const a = await lauf({ von: 'Gibt es nicht > Putzen & Haushalt' }), b = await lauf({ von: 'Highlights' });
  ist('P1 VON fehlt bzw. ist mehrdeutig → Exit 2', [a.r.code, b.r.code, /nicht gefunden/.test(a.r.fehler.join()), /mehrdeutig/.test(b.r.fehler.join())], [2, 2, true, true]);
}

// ════════ Pflicht 2: ZIEL eindeutig, nicht der Eintrag selbst, keine Dublette, NACH/VOR ════════
{
  const a = await lauf({ ziel: 'Gibt es nicht' }), b = await lauf({ ziel: 'Highlights' });
  ist('P2 ZIEL fehlt bzw. ist mehrdeutig → Exit 2', [a.r.code, b.r.code, /ZIEL «Gibt es nicht» nicht gefunden/.test(a.r.fehler.join()), /ZIEL «Highlights» ist mehrdeutig/.test(b.r.fehler.join())], [2, 2, true, true]);
  const c = await lauf({ ziel: PUTZEN });
  ist('P2 ZIEL gleich VON → Exit 2 mit eigener Meldung', [c.r.code, /derselbe Eintrag wie VON/.test(c.r.fehler.join())], [2, true]);
  const d = await lauf({ handle: 'kabel-adapter', von: 'Elektronik', ziel: 'Elektronik > Kabel & Adapter' });
  ist('P2 ZIEL ist der Eintrag selbst → Exit 2', [d.r.code, d.r.fehler], [2, ['ZIEL «Elektronik > Kabel & Adapter» ist der Eintrag selbst oder liegt in ihm']]);
  const e = await lauf({ handle: 'handy-zubehoer', von: 'Elektronik', ziel: 'Elektronik > Handy & Laden > Powerbanks' });
  ist('P2 ZIEL liegt im Eintrag (Nachfahre) → Exit 2 mit Meldung', [e.r.code, /liegt in ihm/.test(e.r.fehler.join())], [2, true]);
  const g = await lauf({ handle: 'handy-zubehoer', von: 'Elektronik', ziel: 'Wohnen & Garten' });
  ist('P2 Gegenprobe: Eintrag mit Kindern unter einen fremden Ast → Exit 0', g.r.code, 0);
}
{
  const m = kopie(MENU); findePfad(m.items, ['Elektronik'])[0].eintrag.items.push(http(25, 'Ersatzteile & Zubehör', 'andere-ersatzteile', []));
  const a = await lauf({ live: true }, {}, m);
  ist('P2 gleicher Titel unter ZIEL → Exit 2, kein Schreiben', [a.r.code, a.st.aufrufe.includes('update'), /schon ein Eintrag/.test(a.r.fehler.join())], [2, false, true]);
  const m2 = kopie(MENU); findePfad(m2.items, ['Elektronik'])[0].eintrag.items.push(http(25, 'Ersatzteile', 'ersatzteile-zubehoer', []));
  ist('P2 gleiches Ziel (Adresse) unter ZIEL, anderer Titel → Exit 2', (await lauf({}, {}, m2)).r.code, 2);
  const m3 = kopie(MENU); findePfad(m3.items, ['Wohnen & Garten'])[0].eintrag.items.push({ ...col(14, 'Handy', 'handy-zubehoer', []), url: '/en/collections/umbenannt' });
  // Eintrag über die Adresse gefunden (seine resourceId ist eine andere): unter ZIEL steht ein Eintrag mit genau dieser resourceId, sonst nichts Gleiches
  const m6 = kopie(MENU); Object.assign(findePfad(m6.items, PUTZEN.split(' > '))[0].eintrag.items[2], { type: 'COLLECTION', resourceId: C(42), url: '/en/collections/ersatzteile-zubehoer' });
  findePfad(m6.items, ['Elektronik'])[0].eintrag.items.push({ ...col(27, 'Anders', 'kabel-adapter', []), resourceId: C(42), url: '/en/collections/anders' });
  const r6 = await lauf({}, {}, m6);
  ist('P2 gleiche resourceId wie der Eintrag (nicht die der Collection) unter ZIEL → Exit 2', [r6.r.code, /«Anders»/.test(r6.r.fehler.join())], [2, true]);
  ist('P2 gleiche resourceId unter ZIEL → Exit 2', (await lauf({ handle: 'handy-zubehoer', von: 'Elektronik', ziel: 'Wohnen & Garten' }, {}, m3)).r.code, 2);
}
{
  const a = await lauf({ nach: 'Gibt es nicht' });
  ist('P2 NACH steht nicht unter ZIEL → Exit 2', [a.r.code, /NACH «Gibt es nicht» steht nicht unter ZIEL/.test(a.r.fehler.join())], [2, true]);
  const m = kopie(MENU); findePfad(m.items, ['Elektronik'])[0].eintrag.items.push(http(26, 'Kabel & Adapter', 'kabel-2', []));
  const b = await lauf({ nach: 'Kabel & Adapter' }, {}, m);
  ist('P2 NACH steht unter ZIEL zweimal → Exit 2', [b.r.code, /2-mal/.test(b.r.fehler.join())], [2, true]);
  const c = await lauf({ nach: 'Handy & Laden' });
  ist('P2 Gegenprobe NACH: direkt hinter dem Geschwister', [c.r.code, c.r.info.zielKinder, c.r.info.neuIndex], [0, ['Elektronik & Technik', 'Handy & Laden', 'Ersatzteile & Zubehör', 'Kabel & Adapter', 'Elektronik-Kleinteile'], 2]);
  const d = await lauf({ vor: 'Elektronik & Technik' });
  ist('P2 VOR: direkt vor dem Geschwister (auch an erster Stelle)', [d.r.code, d.r.info.zielKinder[0], d.r.info.neuIndex], [0, 'Ersatzteile & Zubehör', 0]);
  const e = await lauf({ vor: 'Gibt es nicht' }), f = await lauf({ nach: 'Handy & Laden', vor: 'Kabel & Adapter' });
  ist('P2 VOR fehlt → Exit 2; NACH und VOR zugleich → Exit 1 ohne Netz', [e.r.code, f.r.code, f.st.aufrufe], [2, 1, []]);
  const g = await lauf({});
  ist('P2 ohne NACH/VOR: ans Ende von ZIEL', [g.r.info.neuIndex, g.r.info.zielKinder.at(-1)], [4, 'Ersatzteile & Zubehör']);
}

// ════════ Pflicht 3: Tiefe ════════
{
  const a = await lauf({ handle: 'handy-zubehoer', von: 'Elektronik', ziel: PUTZEN });
  ist('P3 Eintrag mit Kindern unter Ebene 2 ergäbe 4 Ebenen → Exit 2 «zu tief»', [a.r.code, /zu tief: ZIEL auf Ebene 2, Eintrag mit 1 Ebenen darunter ergibt 4 Ebenen/.test(a.r.fehler.join())], [2, true]);
  const b = await lauf({ ziel: 'Elektronik > Handy & Laden > Powerbanks' });
  ist('P3 Blatt unter Ebene 3 ergäbe 4 Ebenen → Exit 2 «zu tief»', [b.r.code, /ergibt 4 Ebenen/.test(b.r.fehler.join())], [2, true]);
  const c = await lauf({ ziel: 'Elektronik > Handy & Laden' }), d = await lauf({ handle: 'handy-zubehoer', von: 'Elektronik', ziel: 'Wohnen & Garten' });
  ist('P3 Gegenprobe: genau 3 Ebenen sind erlaubt (Blatt unter Ebene 2, Eintrag mit Kindern unter Ebene 1)', [c.r.code, c.r.info.tiefe, d.r.code, d.r.info.tiefe], [0, 3, 0, 3]);
}

// ════════ Pflicht 4 + 7: Eingabe aus dem gelesenen Baum, schreiben, streng nachlesen ════════
{
  const { r, st, text, lese } = await lauf({ live: true });
  ist('P4/P7 LIVE: Exit 0, Ablauf lesen, Collection, erneut lesen, schreiben, nachlesen', [r.code, st.aufrufe], [0, ['menus', 'coll', 'loc', 'ueb', 'menus', 'update', 'menus']]);
  const soll = eingabeSoll(MENU.items);
  const putzen = soll[0].items[0].items, [weg] = putzen.splice(2, 1); soll[1].items.push(weg);
  ist('P4 menuUpdate-Eingabe = gelesener Baum mit genau dieser einen Verschiebung (ids, Typ, Adresse, Tags, Kinder erhalten)', st.eingaben[0].i, soll);
  ist('P4 menuUpdate mit id, Titel und Handle des gelesenen Menüs', [st.eingaben[0].id, st.eingaben[0].t, st.eingaben[0].h], [MENU.id, MENU.title, MENU.handle]);
  const e = findePfad(st.menu.items, ['Elektronik'])[0].eintrag.items.at(-1);
  ist('P7 im Shop danach: verschobener Eintrag am neuen Ort mit gleicher id, Typ, Adresse', [e.title, e.id, e.type, e.url], ['Ersatzteile & Zubehör', I(113), 'HTTP', '/collections/ersatzteile-zubehoer']);
  ist('P7 im Shop danach: alter Ort ohne den Eintrag, Gesamtzahl gleich', [kinderTitel(st.menu, PUTZEN), zaehle(st.menu.items)], [['Staubsauger & Zubehör', 'Mülleimer & Abfall'], 23]);
  enthaelt('P7 meldet «id gleich»', text, `id gleich (${I(113)})`);
  enthaelt('P7 meldet OK', text, 'OK: genau ein Eintrag verschoben, alles andere unverändert.');
  ist('P7 Ergebnis idGleich', r.idGleich, true);
}
{
  // Eintrag mit Tags und Kind verschieben: alles bleibt am Eintrag
  const { r, st } = await lauf({ live: true, handle: 'damen-schuhe', von: 'Schuhe', ziel: 'Wohnen & Garten', nach: 'Putzen & Haushalt' });
  const e = findePfad(st.menu.items, ['Wohnen & Garten', 'Damen'])[0]?.eintrag;
  ist('P4 Eintrag mit Tags und Kind: id, Tags, Kind mit id bleiben', [r.code, e?.id, e?.tags, e?.items.map(k => [k.id, k.title])], [0, I(31), ['f-leder'], [[I(311), 'Sneaker']]]);
  ist('P4 Eintrag mit Tags: Eingabe trägt die Tags', findePfad(st.eingaben[0].i, ['Wohnen & Garten', 'Damen'])[0]?.eintrag.tags, ['f-leder']);
}
{
  const neu = await lauf({ live: true }, { nachSchreiben: m => { findePfad(m.items, ['Elektronik', 'Ersatzteile & Zubehör'])[0].eintrag.id = I(77777); } });
  ist('P7 neue id des verschobenen Eintrags ist KEIN Fehler (Exit 0, idGleich false)', [neu.r.code, neu.r.idGleich], [0, false]);
  enthaelt('P7 neue id wird ausdrücklich gemeldet', neu.text, `id NEU (${I(113)} -> ${I(77777)}): Übersetzungen dieses Eintrags prüfen`);
  const kind = await lauf({ live: true, handle: 'damen-schuhe', von: 'Schuhe', ziel: 'Wohnen & Garten' }, { nachSchreiben: m => { findePfad(m.items, ['Wohnen & Garten', 'Damen', 'Sneaker'])[0].eintrag.id = I(88888); } });
  ist('P7 neue id eines Kindes des verschobenen Eintrags ist KEIN Fehler, wird gemeldet', [kind.r.code, /1 Kinder des Eintrags haben eine neue id/.test(kind.text)], [0, true]);
}
const abweichung = async (name, nachSchreiben, opt = {}) => {
  const { r, text } = await lauf({ live: true, ...opt }, { nachSchreiben });
  ist(`P7 ${name} → Exit 3`, r.code, 3);
  enthaelt(`P7 ${name}: Hinweis auf die Sicherung`, text, 'Sicherung: ');
};
await abweichung('fremder Eintrag fehlt nach dem Schreiben', m => { m.items.pop(); });
await abweichung('letzter Eintrag fehlt nach dem Schreiben (Ende der Liste)', m => { findePfad(m.items, ['Uhren'])[0].eintrag.items = []; });
await abweichung('zwei Geschwister vertauscht', m => { const l = findePfad(m.items, ['Elektronik'])[0].eintrag.items; [l[0], l[1]] = [l[1], l[0]]; });
await abweichung('Titel eines anderen Eintrags geändert', m => { m.items[2].title = 'Schuhe!'; });
await abweichung('id eines anderen Eintrags geändert', m => { m.items[2].items[0].id = I(55555); });
await abweichung('Adresse eines anderen HTTP-Eintrags geändert', m => { m.items[3].url = '/collections/anders'; });
await abweichung('resourceId eines anderen Eintrags geändert', m => { m.items[5].resourceId = C(1); });
await abweichung('Tags eines anderen Eintrags geändert', m => { m.items[2].items[0].tags = []; });
await abweichung('Typ eines anderen Eintrags geändert', m => { m.items[3].type = 'PAGE'; });
await abweichung('verschobener Eintrag steht zusätzlich noch am alten Ort', m => { findePfad(m.items, PUTZEN.split(' > '))[0].eintrag.items.push({ ...http(113, 'Ersatzteile & Zubehör', 'ersatzteile-zubehoer', []), id: I(9999) }); });
await abweichung('verschobener Eintrag an anderer Stelle unter ZIEL', m => { const l = findePfad(m.items, ['Elektronik'])[0].eintrag.items; l.unshift(l.pop()); });
await abweichung('verschobener Eintrag fehlt ganz', m => { findePfad(m.items, ['Elektronik'])[0].eintrag.items.pop(); });
{
  const ok1 = await lauf({ live: true }, { nachSchreiben: m => { m.items[1].url = 'https://luxestyle.ch/collections/elektronik-technik'; } });
  ist('P7 Gegenprobe: gleiche Adresse mit eigenem Host zählt als gleich (Exit 0)', ok1.r.code, 0);
}
{
  const a = await lauf({ live: true }, { userErrors: [{ field: ['items'], message: 'Too many items', code: 'INVALID' }] });
  ist('P8 userErrors von menuUpdate → Exit 3', [a.r.code, a.r.fehler, a.st.aufrufe.at(-1)], [3, ['userErrors'], 'update']);
  enthaelt('P8 userErrors werden gezeigt', a.text, 'Too many items');
  const b = await lauf({ live: true }, { updateWirft: true });
  ist('P7 menuUpdate wirft (Netz) → Exit 3 «Zustand unklar»', [b.r.code, b.r.fehler], [3, ['menuUpdate unklar']]);
  const c = await lauf({ live: true }, { lesenWirft: n => n === 3 });
  ist('P7 Nachlesen nach dem Schreiben wirft → Exit 3', [c.r.code, c.st.aufrufe.includes('update')], [3, true]);
}

// ════════ Pflicht 5: Sicherung ════════
{
  const dir = join(tmp, 'sich-a');
  const { r, st } = await lauf({ live: true, sicherungDir: dir });
  const datei = join(dir, 'main-menu-vor-verschieben-ersatzteile-zubehoer-2026-11-11T23-00-00-000Z.json');
  ist('P5 Sicherung: Name mit Menü, Handle und UTC-Zeitstempel im SICHERUNG_DIR', [r.code, r.sicherung, existsSync(datei)], [0, datei, true]);
  const inhalt = JSON.parse(readFileSync(datei, 'utf8'));
  ist('P5 Sicherung = das ganze gelesene Menü (id, Titel, Handle, alle Einträge vor dem Verschieben)', inhalt, attrappe(MENU).lese(MENU));
  ist('P5 Sicherung entstand VOR dem Schreiben (Menü darin noch alt)', kinderTitel(inhalt, PUTZEN).includes('Ersatzteile & Zubehör'), true);
  // Gleicher Name: nie überschreiben
  const dir2 = join(tmp, 'sich-b'); mkdirSync(dir2, { recursive: true });
  const alt = join(dir2, 'main-menu-vor-verschieben-ersatzteile-zubehoer-2026-11-11T23-00-00-000Z.json'); writeFileSync(alt, 'ALT');
  const b = await lauf({ sicherungDir: dir2 });
  ist('P5 vorhandene Sicherung wird nie überschrieben (neue bekommt -2)', [b.r.code, readFileSync(alt, 'utf8'), sicherungen(dir2)],
    [0, 'ALT', ['main-menu-vor-verschieben-ersatzteile-zubehoer-2026-11-11T23-00-00-000Z-2.json', 'main-menu-vor-verschieben-ersatzteile-zubehoer-2026-11-11T23-00-00-000Z.json']]);
  // Sicherung unmöglich: kein Schreiben
  const datei3 = join(tmp, 'ist-eine-datei'); writeFileSync(datei3, 'x');
  const c = await lauf({ live: true, sicherungDir: join(datei3, 'unter') });
  ist('P5 Sicherung geht nicht → Exit 1, menuUpdate nie aufgerufen', [c.r.code, c.st.aufrufe.includes('update')], [1, false]);
  ist('P5 Gegenprobe: Prüffehler (Exit 2) legen keine Sicherung an', sicherungen((await lauf({ ziel: 'Gibt es nicht' })).dir).length, 0);
}

// ════════ Pflicht 6: Menü direkt vor dem Schreiben noch einmal lesen ════════
const zwischendurch = async (name, aendern) => {
  const { r, st } = await lauf({ live: true }, { vorLesen: (m, n) => { if (n === 2) aendern(m); } });
  ist(`P6 ${name} → Exit 4, nichts geschrieben`, [r.code, st.aufrufe.includes('update')], [4, false]);
};
await zwischendurch('Titel geändert', m => { m.items[3].title = 'Highlights neu'; });
await zwischendurch('Reihenfolge geändert', m => { [m.items[0], m.items[1]] = [m.items[1], m.items[0]]; });
await zwischendurch('id geändert', m => { m.items[5].items[0].id = I(4242); });
await zwischendurch('Eintrag dazugekommen', m => { m.items[5].items.push(http(62, 'Neu', 'neu-x', [])); });
await zwischendurch('nur die Adresse eines COLLECTION-Eintrags geändert', m => { m.items[5].url = '/en/collections/uhren-neu'; });
await zwischendurch('Tags geändert', m => { m.items[2].items[0].tags = ['f-anders']; });
await zwischendurch('Menü-Titel geändert', m => { m.title = 'Hauptmenü'; });
{
  const { r } = await lauf({ live: true }, { vorLesen: () => {} });
  ist('P6 Gegenprobe: unverändertes Menü → geschrieben (Exit 0)', r.code, 0);
}

// ════════ Pflicht 8: Handle, Menü-Handle ════════
for (const h of ['Ersatzteile-Zubehoer', 'ersatzteile zubehoer', 'ersatzteile-zubehoer?x=1', '../x', '']) {
  const { r, st } = await lauf({ handle: h });
  ist(`P8 HANDLE «${h}» ungültig → Exit 1 ohne Netz`, [r.code, st.aufrufe], [1, []]);
}
{
  const a = await lauf({ menue: 'main menu' });
  ist('P8 MENUE ungültig → Exit 1 ohne Netz', [a.r.code, a.st.aufrufe], [1, []]);
  const fuss = { ...kopie(MENU), id: 'gid://shopify/Menu/2', handle: 'footer' };
  const b = await lauf({ menue: 'footer', live: true }, {}, fuss);
  ist('P8 MENUE übersteuert: Suche, Sicherungsname, Schreiben', [b.r.code, b.st.letzteSuche, b.r.sicherung.endsWith('/footer-vor-verschieben-ersatzteile-zubehoer-2026-11-11T23-00-00-000Z.json'), b.st.eingaben[0].h], [0, 'handle:footer', true, 'footer']);
  const fremd = { ...kopie(MENU), id: 'gid://shopify/Menu/3', handle: 'main-menu-alt' };
  const c = await lauf({ live: true }, { menues: () => [fremd] });
  ist('P8 Suche liefert nur ein Menü mit anderem Handle → Exit 1, nichts geschrieben', [c.r.code, c.st.aufrufe.includes('update')], [1, false]);
  const d = await lauf({ live: true }, { menues: st => [fremd, st.menu] });
  ist('P8 Gegenprobe: das Menü mit genau dem Handle wird genommen, auch wenn ein anderes zuerst kommt', [d.r.code, d.st.eingaben[0]?.id], [0, MENU.id]);
  const e = await lauf({ von: '', ziel: 'Elektronik' }), f = await lauf({ von: PUTZEN, ziel: 'Elektronik > ' });
  ist('P8 VON leer oder ZIEL mit leerem Teil → Exit 1 ohne Netz', [e.r.code, e.st.aufrufe, f.r.code], [1, [], 1]);
}
{
  const o = optionenAusEnv({ HANDLE: 'x', VON: 'A', ZIEL: 'B' });
  ist('optionenAusEnv: Vorgaben (Trockenlauf, main-menu, dropship/menu-sicherung)', [o.live, o.menue, o.sicherungDir, SICHERUNG_DIR, o.nach, o.vor], [false, 'main-menu', 'dropship/menu-sicherung', 'dropship/menu-sicherung', '', '']);
  ist('optionenAusEnv: nur LIVE=1 schreibt; SICHERUNG_DIR und MENUE übersteuern', [optionenAusEnv({ LIVE: 'true' }).live, optionenAusEnv({ LIVE: '1' }).live, optionenAusEnv({ SICHERUNG_DIR: '/s' }).sicherungDir, optionenAusEnv({ MENUE: 'footer' }).menue, optionenAusEnv({ NACH: 'n', VOR: 'v' }).vor], [false, true, '/s', 'footer', 'v']);
}

// ════════ Pflicht 10 im Lauf: unvollständig gelesenes Menü → Exit 1, nichts geplant, nichts gesichert, nichts geschrieben ════════
{
  const stoer = (name, f) => async () => {
    const { r, st, text, dir } = await lauf({ live: true }, { lesenStoerung: (nodes, n) => { if (n === 1) f(nodes[0]); } });
    ist(`P10 Lauf: ${name} → Exit 1, nur das Menü gelesen, keine Sicherung, kein menuUpdate`, [r.code, st.aufrufe, sicherungen(dir).length], [1, ['menus'], 0]);
    enthaelt(`P10 Lauf: ${name}: Meldung nennt die Ursache`, text, 'das gelesene Menü ist unvollständig');
    return r;
  };
  const r1 = await stoer('Ebene 3 ohne tags', m => { delete m.items[0].items[0].items[1].tags; })();
  enthaelt('P10 Lauf: Befund nennt Ebene, Pfad und Schlüssel', (r1.fehler || []).join('\n'), 'Ebene 3 «Wohnen & Garten > Putzen & Haushalt > Mülleimer & Abfall»: ohne tags');
  await stoer('Ebene 2 ohne items (nur 2 Ebenen gelesen)', m => { for (const e of m.items) for (const k of e.items) delete k.items; })();
  await stoer('alle Einträge ohne id', m => { (function l(x) { for (const e of x || []) { delete e.id; l(e.items); } })(m.items); })();
  await stoer('ein einziger Eintrag ohne url', m => { delete m.items[5].url; })();
  const g = await lauf({ live: true }, { lesenStoerung: () => {} });
  ist('P10 Lauf Gegenprobe: ungestörte Antwort → geschrieben (Exit 0)', [g.r.code, g.st.aufrufe], [0, ['menus', 'coll', 'loc', 'ueb', 'menus', 'update', 'menus']]);
  // Nur das zweite Lesen (direkt vor dem Schreiben) ohne Tags: der Plan stammt aus dem vollständigen ersten Lesen, gleichesMenue entscheidet
  const z = await lauf({ live: true }, { lesenStoerung: (nodes, n) => { if (n === 2) delete nodes[0].items[2].items[0].tags; } });
  ist('P10 Lauf: zweites Lesen ohne Tags bei einem Eintrag MIT Tags → Exit 4, nichts geschrieben', [z.r.code, z.st.aufrufe.includes('update')], [4, false]);
}

// ════════ Pflicht 9: Rücknahme ════════
/** Befehl «A='x' B=y LIVE=1 node …» in Umgebungsvariablen zerlegen (wie die Shell). */
const zerlege = befehl => {
  const env = {};
  for (const [, k, v] of befehl.matchAll(/([A-Z_]+)=('(?:[^']|'\\'')*'|\S+)/g)) env[k] = v.startsWith("'") ? v.slice(1, -1).replace(/'\\''/g, "'") : v;
  return env;
};
const rundlauf = async (name, opt, roh = MENU) => {
  const a = attrappe(roh);
  const zeilen = [];
  const r1 = await verschiebenLauf(a.q, { handle: 'ersatzteile-zubehoer', von: PUTZEN, ziel: 'Elektronik', live: true, jetzt: () => JETZT, sicherungDir: join(tmp, `r${++nr}`), out: x => zeilen.push(x), err: x => zeilen.push(x), ...opt });
  const env = zerlege(r1.ruecknahme || '');
  const r2 = await verschiebenLauf(a.q, { ...optionenAusEnv(env), jetzt: () => JETZT, sicherungDir: join(tmp, `r${++nr}`), out: () => {}, err: x => zeilen.push(x) });
  ist(`P9 ${name}: hin Exit 0, Rücknahme Exit 0, Menü danach exakt wie vorher (Titel, Ziele, Reihenfolge, ids)`, [r1.code, r2.code, a.lese(a.st.menu)], [0, 0, a.lese(roh)]);
  return { r1, env };
};
{
  const { r1, env } = await rundlauf('Rundlauf mit NACH', {});
  ist('P9 Rücknahmebefehl genau', r1.ruecknahme, "HANDLE=ersatzteile-zubehoer VON='Elektronik' ZIEL='Wohnen & Garten > Putzen & Haushalt' NACH='Mülleimer & Abfall' LIVE=1 node automation/menu_eintrag_verschieben.mjs");
  ist('P9 Rücknahme: VON und ZIEL vertauscht, NACH = früherer Vorgänger, LIVE=1', [env.VON, env.ZIEL, env.NACH, env.VOR, env.LIVE], ['Elektronik', PUTZEN, 'Mülleimer & Abfall', undefined, '1']);
  const { env: e2 } = await rundlauf('erster Eintrag (Rücknahme mit VOR)', { handle: 'staubsauger-zubehoer' });
  ist('P9 war der Eintrag der erste: VOR = früherer Nachfolger', [e2.NACH, e2.VOR], [undefined, 'Mülleimer & Abfall']);
  const { env: e3 } = await rundlauf('einziges Kind (Rücknahme ohne NACH/VOR)', { handle: 'schubladen-organizer', von: 'Wohnen & Garten > Aufbewahrung & Möbel' });
  ist('P9 einziges Kind: weder NACH noch VOR', [e3.NACH, e3.VOR], [undefined, undefined]);
  await rundlauf('Eintrag mit Kindern und Tags, Ziel mit NACH in der Mitte', { handle: 'damen-schuhe', von: 'Schuhe', ziel: 'Wohnen & Garten', nach: 'Putzen & Haushalt' });
  const m = kopie(MENU); findePfad(m.items, PUTZEN.split(' > '))[0].eintrag.items[1].title = "Kid's > Abfall & $HOME";
  const { env: e4 } = await rundlauf('Titel mit Apostroph, >, & und $', {}, m);
  ist('P9 Titel mit Sonderzeichen kommt in der Rücknahme unverändert an', e4.NACH, "Kid's > Abfall & $HOME");
  const fuss = { ...kopie(MENU), handle: 'footer' };
  const { env: e5 } = await rundlauf('anderes Menü (MENUE in der Rücknahme)', { menue: 'footer' }, fuss);
  ist('P9 Rücknahme nennt MENUE, wenn es nicht main-menu ist', e5.MENUE, 'footer');
}
{
  const info = { vorgaenger: 'X', nachfolger: null, vorgaengerEindeutig: false, nachfolgerEindeutig: true };
  ist('P9 mehrdeutiger Vorgänger: Rücknahme mit Warnung', ruecknahmeBefehl({ handle: 'h', von: ['A'], ziel: ['B'], info }).warnung.includes('von Hand'), true);
  ist('P9 Gegenprobe: eindeutiger Vorgänger ohne Warnung', ruecknahmeBefehl({ handle: 'h', von: ['A'], ziel: ['B'], info: { ...info, vorgaengerEindeutig: true } }).warnung, '');
  const m = kopie(MENU); findePfad(m.items, PUTZEN.split(' > '))[0].eintrag.items.splice(1, 0, col(115, 'Mülleimer & Abfall', 'muelleimer-abfall', []));
  const r = planeVerschiebung(eingabeAus(m.items), { handle: 'ersatzteile-zubehoer', colId: C(900), von: PUTZEN.split(' > '), ziel: ['Elektronik'] });
  ist('P9 Plan erkennt doppelten Vorgängertitel unter VON', [r.info.vorgaenger, r.info.vorgaengerEindeutig], ['Mülleimer & Abfall', false]);
}

// ════════ Nachprüfung des Plans (pruefePlan) und Nachlese-Vergleich mit absichtlich falschen Bäumen ════════
{
  const alt = eingabeAus(MENU.items), p = { handle: 'ersatzteile-zubehoer', colId: C(900), von: PUTZEN.split(' > '), ziel: ['Elektronik'] };
  const gut = planeVerschiebung(alt, p).plan;
  ist('pruefePlan: richtiger Plan ohne Fehler', pruefePlan(alt, gut, p), []);
  const kaputt = f => { const b = kopie(gut); f(b); return pruefePlan(alt, b, p); };
  ist('pruefePlan: anderer Eintrag verändert', kaputt(b => { b[2].title = 'X'; }).some(x => x.includes('ausserhalb')), true);
  ist('pruefePlan: verschobener Eintrag verändert (Tags)', kaputt(b => { b[1].items.at(-1).tags = ['t']; }).some(x => x.includes('nicht derselbe')), true);
  ist('pruefePlan: verschobener Eintrag nicht am Ende', kaputt(b => { b[1].items.unshift(b[1].items.pop()); }).some(x => x.includes('nicht am Ende')), true);
  ist('pruefePlan: Eintrag zusätzlich noch unter VON', kaputt(b => { b[0].items[0].items.push(kopie(b[1].items.at(-1))); }).some(x => x.includes('noch unter VON')), true);
  ist('pruefePlan: Eintrag doppelt unter ZIEL', kaputt(b => { b[1].items.push({ ...kopie(b[1].items.at(-1)), title: 'Doppelt' }); }).some(x => x.includes('2 statt genau 1')), true);
  ist('pruefePlan: Eintrag verloren (Anzahl)', kaputt(b => { b[1].items.pop(); }).some(x => x.includes('Anzahl')), true);
  ist('pruefePlan: zu tief', kaputt(b => { b[1].items.at(-1).items = [{ id: 'x', title: 'a', type: 'HTTP', url: '/a', items: [{ id: 'y', title: 'b', type: 'HTTP', url: '/b', items: [] }] }]; }).some(x => x.includes('Ebenen')), true);
  const pn = { ...p, nach: 'Handy & Laden' }, gutN = planeVerschiebung(alt, pn).plan;
  ist('pruefePlan: NACH an falscher Stelle', pruefePlan(alt, (b => { const l = b[1].items; l.push(l.splice(2, 1)[0]); return b; })(kopie(gutN)), pn).some(x => x.includes('nicht direkt nach')), true);
  const pv = { ...p, vor: 'Kabel & Adapter' }, gutV = planeVerschiebung(alt, pv).plan;
  ist('pruefePlan: VOR richtig, dann an falscher Stelle', [pruefePlan(alt, gutV, pv), pruefePlan(alt, (b => { const l = b[1].items; l.push(l.splice(2, 1)[0]); return b; })(kopie(gutV)), pv).some(x => x.includes('nicht direkt vor'))], [[], true]);
  const v = vergleicheNachlesen(gut, kopie(gut), { ...p });
  ist('vergleicheNachlesen: gleicher Baum ohne Fehler, id gleich', [v.fehler, v.idGleich], [[], true]);
  const v2 = vergleicheNachlesen(gut, (b => { b[1].items.at(-1).id = 'neu'; return b; })(kopie(gut)), { ...p });
  ist('vergleicheNachlesen: neue id nur des verschobenen Eintrags ist kein Fehler', [v2.fehler, v2.idGleich, v2.idNeu], [[], false, 'neu']);
  ist('gleichesMenue: gleich und Gegenprobe (Menü-Handle)', [gleichesMenue(MENU, kopie(MENU)).gleich, gleichesMenue(MENU, { ...kopie(MENU), handle: 'x' }).gleich, gleichesMenue(MENU, null).gleich], [true, false, false]);
}

// ════════ Der Lauf benutzt die Nachprüfung: ein falscher Plan wird vor dem Schreiben abgefangen ════════
{
  const falsch = (alt, p) => { const r = planeVerschiebung(alt, p); if (r.plan) r.plan[2].title = 'Schuhe (versehentlich umbenannt)'; return r; };
  const a = await lauf({ live: true, plane: falsch });
  ist('Lauf: Plan mit Nebenwirkung → Exit 2, menuUpdate nie aufgerufen', [a.r.code, a.st.aufrufe.includes('update'), /Nachprüfung des Plans/.test(a.text)], [2, false, true]);
  const verloren = (alt, p) => { const r = planeVerschiebung(alt, p); if (r.plan) r.plan[0].items.at(-1).items = []; return r; };
  const b = await lauf({ live: true, handle: 'handy-zubehoer', von: 'Elektronik', ziel: 'Wohnen & Garten', plane: verloren });
  ist('Lauf: Plan verliert die Kinder des Eintrags → Exit 2, menuUpdate nie aufgerufen', [b.r.code, b.st.aufrufe.includes('update')], [2, false]);
}

// ════════ Optional: echtes Hauptmenü (MENU_ECHT=<datei>), nur Attrappe ════════
if (process.env.MENU_ECHT) {
  const echt = JSON.parse(readFileSync(process.env.MENU_ECHT, 'utf8'));
  const n = zaehle(echt.items);
  const opt = { handle: 'ersatzteile-zubehoer', von: PUTZEN, ziel: 'Elektronik', nach: 'Elektronik-Kleinteile' };
  const ecol = { ...COLLS, 'ersatzteile-zubehoer': { id: 'gid://shopify/Collection/echt-ersatzteile', title: 'Ersatzteile & Zubehör', handle: 'ersatzteile-zubehoer' } };
  const tr = await lauf(opt, { collections: ecol }, echt);
  ist('ECHT Trockenlauf: Exit 0, Eintrag als HTTP gefunden, Gesamtzahl gleich', [tr.r.code, tr.r.info?.typ, tr.r.info?.gesamt], [0, 'HTTP', n]);
  ist('ECHT: unter Elektronik zuletzt «Ersatzteile & Zubehör» hinter «Elektronik-Kleinteile»', tr.r.info?.zielKinder.slice(-2), ['Elektronik-Kleinteile', 'Ersatzteile & Zubehör']);
  const a = attrappe(echt, { collections: ecol });
  const r1 = await verschiebenLauf(a.q, { ...opt, live: true, jetzt: () => JETZT, sicherungDir: join(tmp, 'echt1'), out: () => {}, err: x => console.log(x) });
  ist('ECHT LIVE gegen Attrappe: Exit 0, Gesamtzahl gleich, id gleich', [r1.code, zaehle(a.st.menu.items), r1.idGleich], [0, n, true]);
  const r2 = await verschiebenLauf(a.q, { ...optionenAusEnv(zerlege(r1.ruecknahme)), jetzt: () => JETZT, sicherungDir: join(tmp, 'echt2'), out: () => {}, err: x => console.log(x) });
  // Die Attrappe gibt COLLECTION-Adressen als /en/… zurück; das echte Menü hat sie schon so. Rundlauf muss exakt zurückführen.
  ist('ECHT Rücknahme: Exit 0, Menü wieder exakt wie gelesen', [r2.code, a.lese(a.st.menu)], [0, a.lese(echt)]);
  ist('ECHT: das gelesene Hauptmenü hat die volle Leseform (pruefeLeseform ohne Befund)', pruefeLeseform(echt), []);
  console.log(`(echtes Menü geprüft: ${n} Einträge)`);
}

// ════════ Pflicht 8: Übersetzungen des verschobenen Eintrags (GEMESSEN 12.11.2026: menuUpdate warf fr weg, id blieb) ════════
{
  const EZ = (function f(l) { for (const i of l || []) { if (i.resourceId === C(900) || /ersatzteile-zubehoer/.test(i.url || '')) return i.id; const r = f(i.items); if (r) return r; } return null; })(MENU.items);
  const RID = linkGid(EZ), FR = { [RID]: { fr: { title: 'Pièces de rechange & accessoires' } } };
  ist('P8U linkGid: MenuItem → Link, andere Form → null', [linkGid('gid://shopify/MenuItem/42'), linkGid('gid://shopify/Collection/42'), linkGid(null)], ['gid://shopify/Link/42', null, null]);
  let wirft = false; try { uebQ(['fr"){x}']); } catch { wirft = true; }
  ist('P8U uebQ: ungültiger Sprachcode wirft (keine Einschleusung in die Abfrage)', wirft, true);
  ist('P8U fehlendeUebersetzungen: fehlt, anderer Wert, gleich', [fehlendeUebersetzungen([{ locale: 'fr', key: 'title', value: 'A' }], []).length,
    fehlendeUebersetzungen([{ locale: 'fr', key: 'title', value: 'A' }], [{ locale: 'fr', key: 'title', value: 'B' }]).length,
    fehlendeUebersetzungen([{ locale: 'fr', key: 'title', value: 'A' }], [{ locale: 'fr', key: 'title', value: 'A' }]).length], [1, 1, 0]);
  const a = await lauf({ live: true }, { ueb: FR, uebWegNachUpdate: [RID] });
  ist('P8U LIVE: Shopify wirft fr weg → wieder eingetragen, Exit 0, frisch gelesen da', [a.r.code, a.st.ueb[RID]?.fr?.title, a.st.regs.length, a.st.aufrufe.slice(-4)], [0, 'Pièces de rechange & accessoires', 1, ['ueb', 'reg', 'loc', 'ueb']]);
  enthaelt('P8U LIVE: meldet die Wiederherstellung', a.text, 'Übersetzungen: 1 wieder eingetragen, alle vorhanden');
  enthaelt('P8U LIVE: nennt die gelesene Übersetzung', a.text, 'fr:title=«Pièces de rechange & accessoires»');
  const b = await lauf({ live: true }, { ueb: FR });
  ist('P8U Gegenprobe: Übersetzung bleibt erhalten → kein translationsRegister, Exit 0', [b.r.code, b.st.regs.length, b.st.ueb[RID].fr.title], [0, 0, 'Pièces de rechange & accessoires']);
  const c = await lauf({ live: true }, { ueb: FR, uebWegNachUpdate: [RID], regFehler: [{ field: ['x'], message: 'nein' }] });
  ist('P8U translationsRegister mit userErrors → Exit 3 (Menü richtig, Übersetzung offen)', [c.r.code, c.st.aufrufe.includes('update'), /fehlt nach dem Eintragen noch/.test(c.r.fehler.join())], [3, true, true]);
  const d = await lauf({ live: true }, { ueb: FR, uebWirft: true });
  ist('P8U Übersetzungen vor dem Schreiben nicht lesbar → Exit 1, menuUpdate nie aufgerufen', [d.r.code, d.st.aufrufe.includes('update')], [1, false]);
  const e = await lauf({}, { ueb: FR, uebWegNachUpdate: [RID] });
  ist('P8U Trockenlauf: liest Übersetzungen, schreibt nichts', [e.r.code, e.st.regs.length, e.st.aufrufe.includes('update')], [0, 0, false]);
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\nmenu_verschieben_test: ${ok + fehl} Prüfungen, ${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
