// Tests für das Bereinigen des Hauptmenüs (lib/menu_bereinigen.mjs und menu_bereinigen.mjs).
// Kein Netz. Zwei Teile: (1) reine Logik gegen den ECHTEN Menübaum vom 17.11.2026 (dropship/menu-bereinigung-1711/menu_vorher.json, 784 Einträge) mit den
// echten Änderungen (aenderungen.json), (2) Läufe gegen eine ehrliche Attrappe von shopifyGql (liefert beim Lesen nur, was die Abfrage verlangt, wirft bei
// Unbekanntem; speichert wie Shopify: COLLECTION-Adresse aus resourceId, neue ids). Jede Pflicht mit Gegenprobe in beide Richtungen.
// Lauf: /opt/node22/bin/node automation/lib/menu_bereinigen_test.mjs   (Exit 0 = alles grün)
import { readFileSync, mkdtempSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eingabeAus, findePfad, zaehle, MAX_TIEFE, MENU_Q, flachMitId } from './menu_verschieben.mjs';
import { plane, pruefePlan, trefferFuer, pruefeOps, vergleicheNachlesen, menueHandles, benoetigteHandles, verlorene, alleIds } from './menu_bereinigen.mjs';
import { bereinigenLauf, uebersetzungenSnapshot } from '../menu_bereinigen.mjs';
import { LOC_Q } from './menu_uebersetzung.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const FIX = process.env.MENU_FIXTURE || join(HIER, '../../dropship/menu-bereinigung-1711/menu_vorher.json');
const CFG = JSON.parse(readFileSync(process.env.AENDERUNGEN || join(HIER, '../../dropship/menu-bereinigung-1711/aenderungen.json'), 'utf8'));
const MENU = JSON.parse(readFileSync(FIX, 'utf8'));
let ok = 0, fehl = 0;
const kopie = x => JSON.parse(JSON.stringify(x));
const kanon = x => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(s => [s, v[s]])) : v));
const ist = (name, wert, soll) => { const a = kanon(wert), b = kanon(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', String(a).slice(0, 500), '\n  soll ', String(b).slice(0, 500)); } };
const wahr = (name, b) => { if (b) ok++; else { fehl++; console.log('FEHLER', name); } };
const enthaelt = (name, text, teil) => wahr(`${name} (enthält «${teil}»)`, String(text).includes(teil));

const ALT = eingabeAus(MENU.items);
const OPS_DATEI = CFG.ops, VOK = CFG.verwaistOk || [];
// Das Werkzeug kann auch die Adresse eines HTTP-Eintrags ändern; die echte Änderungsliste braucht das nicht mehr (Plan-Prüfer: die Gruppe soll auf der grossen Parfum-Seite bleiben).
// Getestet wird beides: OPS = echte Liste plus eine Adressänderung, OPS_DATEI = nur die echte Liste.
const URL_OP = { op: 'url', pfad: ['Beauty & Pflege', 'Körper, Mund & Düfte'], von: '/collections/parfum-duefte', nach: '/collections/koerperpflege-bad' };
const OPS = [...OPS_DATEI, URL_OP];
// Collection-IDs für die Attrappe und für plane()
const COLLS = {};
for (const h of benoetigteHandles(OPS)) COLLS[h] = { id: `gid://shopify/Collection/${900000 + Object.keys(COLLS).length}`, title: h, handle: h };
const colIds = Object.fromEntries(Object.entries(COLLS).map(([h, c]) => [h, c.id]));

// ════════ Teil 1: reine Logik gegen den echten Baum ════════
ist('Ausgangslage: 784 Einträge', zaehle(ALT), 784);
ist('pruefeOps: die echten Änderungen sind gültig', pruefeOps(OPS), []);
const P = plane(ALT, OPS, { colIds, verwaistOk: VOK });
ist('plane: kein Fehler', P.fehler, []);
ist('plane: nachher = vorher - Entfernte + Eingefügte', P.info.gesamt, zaehle(ALT) - OPS.filter(o => o.op === 'entfernen').length + OPS.filter(o => o.op === 'einfuegen').length);
ist('plane: Ebenen höchstens 3', P.plan ? Math.max(...(function t(l, d) { return l.flatMap(e => [d, ...t(e.items || [], d + 1)]); })(P.plan, 1)) <= MAX_TIEFE : false, true);
ist('pruefePlan: der echte Plan besteht die unabhängige Nachprüfung', pruefePlan(ALT, P.plan, OPS, { colIds }), []);
ist('Verwaist ist genau die erwartete Menge', P.info.verwaist, [...VOK].sort());
// Plan darf das alte Menü nicht verändern (Kopie)
ist('plane ändert den Eingabe-Baum nicht', zaehle(ALT), 784);

// Gegenproben von plane
const f = (ops, extra = {}) => plane(ALT, ops, { colIds, verwaistOk: VOK, ...extra }).fehler.join(' | ');
const O = o => ({ ...o });
const erstes = OPS.find(o => o.op === 'entfernen');
enthaelt('plane: Pfad fehlt', f([{ ...erstes, pfad: ['Gibt es nicht', 'x'] }]), 'nicht gefunden');
enthaelt('plane: falscher Handle', f([{ ...erstes, handle: 'ein-anderer-handle' }]), 'zeigt nicht auf');
enthaelt('plane: Eintrag mit Kindern wird nicht entfernt', f([{ op: 'entfernen', pfad: ['Sport & Party', 'Fitness & Training'], handle: 'fitness-training' }]), 'hat 8 Kinder');
{
  const mehr = kopie(MENU); const sp = mehr.items.find(e => e.title === 'Sport & Party'); sp.items.push(kopie(sp.items.find(e => e.title === 'Partydeko & Ballone')));
  enthaelt('plane: mehrdeutiger Pfad', plane(eingabeAus(mehr.items), [erstes], { colIds, verwaistOk: VOK }).fehler.join('|'), 'mehrdeutig');
}
enthaelt('plane: verwaist ohne Erlaubnis', f(OPS, { verwaistOk: [] }), 'nirgends mehr im Menü');
{
  const eing = OPS.find(o => o.op === 'einfuegen');
  enthaelt('plane: Dublette unter Eltern', f([{ ...eing, titel: 'Körperpflege & Bad' }]), 'steht schon');
  enthaelt('plane: pos hinter dem Ende', f([{ ...eing, pos: 99 }]), 'hinter dem Ende');
  enthaelt('plane: Eltern fehlt', f([{ ...eing, eltern: ['Nirgends', 'Weg'] }]), 'nicht gefunden');
  enthaelt('plane: zu tief (Eltern auf Ebene 3)', f([{ ...eing, eltern: ['Wohnen & Garten', 'Fenster, Wand & Uhren', 'Wanduhren & Tischuhren'] }]), 'zu tief');
  enthaelt('plane: Collection unbekannt', plane(ALT, [eing], { colIds: {}, verwaistOk: VOK }).fehler.join('|'), 'gibt es im Shop nicht');
  const u = OPS.find(o => o.op === 'url');
  enthaelt('plane url: erwartete Adresse stimmt nicht', f([{ ...u, von: '/collections/falsch' }]), 'erwartet');
  enthaelt('plane url: nur HTTP', f([{ ...u, pfad: ['Beauty & Pflege', 'Körper, Mund & Düfte', 'Körperpflege & Bad'], von: '/collections/koerperpflege-bad', nach: '/collections/parfum-duefte' }]), 'nur HTTP');
}
// Zwei Einträge «Wecker» am selben Ort (Sammlung wecker-radiowecker und Adresse /collections/wecker): der Handle entscheidet
{
  const pf = ['Wohnen & Garten', 'Fenster, Wand & Uhren', 'Wecker'];
  ist('Pfad allein ist mehrdeutig (2 Treffer)', findePfad(ALT, pf).length, 2);
  const zwei = trefferFuer(ALT, pf, 'wecker', colIds.wecker);
  ist('trefferFuer: Handle wecker findet genau den HTTP-Eintrag', [zwei.treffer.length, zwei.gefiltert, zwei.treffer[0]?.eintrag.type], [1, true, 'HTTP']);
  ist('trefferFuer: eindeutiger Pfad wird nicht gefiltert', trefferFuer(ALT, ['Sport & Party', 'Partydeko & Ballone'], 'egal', undefined).gefiltert, false);
  // anderer Handle: der COLLECTION-Eintrag (resourceId) wird über colId gefunden, nicht der HTTP-Eintrag
  const rid = findePfad(ALT, pf).find(x => x.eintrag.type === 'COLLECTION').eintrag.resourceId;
  const andere = trefferFuer(ALT, pf, 'wecker-radiowecker', rid);
  ist('trefferFuer: Handle der Sammlung findet den COLLECTION-Eintrag', [andere.treffer.length, andere.treffer[0]?.eintrag.type], [1, 'COLLECTION']);
  enthaelt('plane: Handle passt auf keinen der Einträge', plane(ALT, [{ op: 'entfernen', pfad: pf, handle: 'taschenlampen' }], { colIds, verwaistOk: VOK }).fehler.join('|'), 'keiner zeigt auf /collections/taschenlampen');
  const dazu = kopie(MENU); const sp = dazu.items.find(e => e.title === 'Wohnen & Garten').items.find(e => e.title === 'Fenster, Wand & Uhren'); sp.items.push(kopie(sp.items.find(e => e.title === 'Wecker' && e.type === 'HTTP')));
  enthaelt('plane: auch nach Handle noch zwei Treffer bleibt mehrdeutig', plane(eingabeAus(dazu.items), [{ op: 'entfernen', pfad: pf, handle: 'wecker' }], { colIds, verwaistOk: VOK }).fehler.join('|'), 'mehrdeutig (2 Treffer)');
  // Die Nachprüfung rechnet mit demselben Handle und wählt den richtigen Eintrag
  ist('pruefePlan: richtiger Wecker (HTTP) fehlt im Plan', pruefePlan(ALT, P.plan, OPS, { colIds }), []);
  const falsch = kopie(P.plan); const g = findePfad(falsch, pf.slice(0, 2))[0].eintrag;
  const i = g.items.findIndex(e => e.title === 'Wecker' && e.type === 'COLLECTION'); const raus = g.items.splice(i, 1)[0];
  g.items.push({ ...kopie(ALT.find(e => e.title === 'Wohnen & Garten').items.find(e => e.title === 'Fenster, Wand & Uhren').items.find(e => e.title === 'Wecker' && e.type === 'HTTP')) });
  wahr('pruefePlan fängt: statt des HTTP-Weckers die Sammlung entfernt', pruefePlan(ALT, falsch, OPS, { colIds }).length > 0);
  void raus;
}
// Lücken aus der Mutationsprobe
{
  const u = OPS.find(o => o.op === 'url');
  enthaelt('plane url: Ziel-Collection gibt es nicht', f([{ ...u, nach: '/collections/gibt-es-nicht-im-shop' }]), 'gibt es im Shop nicht');
  const tief = kopie(ALT); findePfad(tief, ['Wohnen & Garten', 'Fenster, Wand & Uhren', 'Wanduhren & Tischuhren'])[0].eintrag.items = [{ title: 'x', type: 'HTTP', url: '/collections/x', items: [] }];
  enthaelt('plane: Plan mit vier Ebenen wird abgelehnt', plane(tief, OPS, { colIds, verwaistOk: VOK }).fehler.join('|'), 'Ebenen');
  // COLLECTION-Eintrag, dessen Adresse nicht zum Handle passt, wird über die resourceId gefunden
  const pf = ['Wohnen & Garten', 'Fenster, Wand & Uhren', 'Wecker'];
  const k = kopie(ALT); const c = findePfad(k, pf).find(x => x.eintrag.type === 'COLLECTION').eintrag; const rid = c.resourceId; c.url = '/en/collections/ganz-anderer-handle';
  const via = trefferFuer(k, pf, 'wecker-radiowecker', rid);
  ist('trefferFuer: findet den COLLECTION-Eintrag über colId, auch wenn die Adresse nicht passt', [via.treffer.length, via.treffer[0]?.eintrag.resourceId], [1, rid]);
  ist('trefferFuer: ohne colId bleibt dieser Eintrag unauffindbar', trefferFuer(k, pf, 'wecker-radiowecker', undefined).treffer.length, 0);
}
{
  const eing = OPS_DATEI.find(o => o.op === 'einfuegen');
  enthaelt('pruefeOps: zwei Einfügungen unter demselben Eltern', pruefeOps([eing, { ...eing, titel: 'Zweites', handle: 'koerperpflege-bad', pos: 1 }]).join('|'), 'zwei Einfügungen unter demselben Eltern');
  ist('pruefeOps: zwei Einfügungen unter verschiedenen Eltern sind erlaubt', pruefeOps([eing, { ...eing, eltern: ['Beauty & Pflege', 'Haare, Rasur & Haarentfernung'] }]), []);
  for (const fr of ['', '   ', 5, 'x'.repeat(256), 'Zeile\nzwei']) enthaelt(`pruefeOps: fr ungültig (${JSON.stringify(fr).slice(0, 12)})`, pruefeOps([{ ...eing, fr }]).join('|'), 'fr ungültig');
  ist('pruefeOps: fr fehlt oder null ist erlaubt', [pruefeOps([{ ...eing, fr: undefined }]), pruefeOps([{ ...eing, fr: null }])], [[], []]);
}
ist('pruefeOps: unbekannte Art, leere Liste, Handle ungültig', [pruefeOps([{ op: 'x' }]).length > 0, pruefeOps([]).length > 0, pruefeOps([{ op: 'entfernen', pfad: ['a'], handle: 'A B' }]).length > 0], [true, true, true]);
ist('benoetigteHandles: entfernen, url (Ziel), einfuegen', benoetigteHandles(OPS).sort(), [...new Set(OPS.flatMap(o => (o.op === 'url' ? [o.nach.split('/').pop()] : [o.handle])))].sort());
ist('menueHandles: findet HTTP und COLLECTION', menueHandles(ALT).has('party-deko-ch') && menueHandles(ALT).has('fitness-training'), true);
ist('menueHandles: neuer Eintrag nur mit resourceId zählt über ridZuHandle', [menueHandles([{ type: 'COLLECTION', resourceId: 'gid://x/1', items: [] }]).size, menueHandles([{ type: 'COLLECTION', resourceId: 'gid://x/1', items: [] }], { 'gid://x/1': 'abc' }).has('abc')], [0, true]);

// Unabhängige Nachprüfung fängt falsche Pläne (Mutanten des Plans)
const mut = (name, fn, teil) => { const p = kopie(P.plan); fn(p); const r = pruefePlan(ALT, p, OPS, { colIds }); wahr(`pruefePlan fängt: ${name} (Meldung «${teil}»)`, r.some(x => x.includes(teil))); };
mut('zusätzlicher Eintrag entfernt', p => { const e = p.find(x => x.title === 'Uhren'); e.items.shift(); }, 'fehlende Einträge im Plan');
mut('erwarteter Eintrag steht noch', p => { const sp = p.find(x => x.title === 'Sport & Party'); sp.items.splice(4, 0, { id: ALT.find(x => x.title === 'Sport & Party').items.find(e => e.title === 'Partydeko & Ballone').id, title: 'Partydeko & Ballone', type: 'HTTP', url: '/collections/party-deko-ch', items: [] }); }, 'fehlende Einträge im Plan');
mut('Adresse eines fremden Eintrags geändert', p => { p.find(x => x.title === 'Uhren').url = '/collections/anders'; }, 'Adresse unerwartet geändert');
mut('Titel geändert', p => { p.find(x => x.title === 'Uhren').title = 'Zeiger'; }, 'title geändert');
mut('Typ geändert', p => { p.find(x => x.title === 'Uhren').type = 'COLLECTION'; }, 'type geändert');
mut('Reihenfolge der oberen Ebene vertauscht', p => { const t = p[0]; p[0] = p[1]; p[1] = t; }, 'Reihenfolge unter oberster Ebene');
mut('Eintrag unter anderen Eltern', p => { const x = p.find(e => e.title === 'Uhren').items.pop(); p.find(e => e.title === 'Haustiere').items.push(x); }, 'anderer Eltern-Eintrag');
mut('neuer Eintrag fehlt', p => { const g = findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag; g.items.shift(); }, 'neue Einträge im Plan: 0');
mut('neuer Eintrag an falscher Stelle', p => { const g = findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag; g.items.push(g.items.shift()); }, 'steht nicht der neue Eintrag');
mut('neuer Eintrag mit id (wäre Fälschung eines alten)', p => { const g = findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag; g.items[0].id = 'gid://shopify/MenuItem/1'; }, 'unbekannte ids');
mut('Adresse nicht wie geplant', p => { findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.url = '/collections/mundpflege'; }, 'statt /collections/koerperpflege-bad');
mut('Tags verändert', p => { p.find(x => x.title === 'Uhren').tags = ['x']; }, 'tags geändert');
mut('Eintrag verdoppelt (Anzahl)', p => { p.push(kopie(p[0])); }, 'Anzahl Einträge');
mut('Zielsammlung eines unveränderten Eintrags ersetzt', p => { findePfad(p, ['Beauty & Pflege', 'Make-up & Wimpern', 'Augen-Make-up'])[0].eintrag.resourceId = 'gid://shopify/Collection/1'; }, 'resourceId geändert');
mut('vier Ebenen', p => { findePfad(p, ['Wohnen & Garten', 'Fenster, Wand & Uhren', 'Wanduhren & Tischuhren'])[0].eintrag.items = [{ id: 'gid://shopify/MenuItem/12', title: 'x', type: 'HTTP', url: '/collections/x', items: [] }]; }, 'Plan hätte 4 Ebenen');
mut('neuer Eintrag mit falscher resourceId', p => { findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.items[0].resourceId = 'gid://shopify/Collection/1'; }, 'steht nicht der neue Eintrag');
mut('neuer Eintrag mit Adresse', p => { findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.items[0].url = '/collections/x'; }, 'steht nicht der neue Eintrag');
mut('neuer Eintrag mit Tags', p => { findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.items[0].tags = ['x']; }, 'steht nicht der neue Eintrag');
mut('neuer Eintrag mit Kindern', p => { findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.items[0].items = [{ title: 'k', type: 'HTTP', url: '/collections/k', items: [] }]; }, 'steht nicht der neue Eintrag');
mut('zwei neue Einträge statt einem', p => { findePfad(p, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.items.push({ title: 'Doppelt', type: 'COLLECTION', resourceId: 'gid://shopify/Collection/5', items: [] }); }, 'neue Einträge im Plan: 2, erwartet 1');
ist('pruefePlan: Plan = Altbaum ohne Änderungen wird abgelehnt', pruefePlan(ALT, kopie(ALT), OPS, { colIds }).length > 0, true);

// vergleicheNachlesen
{
  const alte = alleIds(ALT);
  // so wie Shopify es zurückgäbe: neuer Eintrag mit neuer id
  const z = kopie(P.plan); const g = findePfad(z, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag; g.items[0].id = 'gid://shopify/MenuItem/999001'; g.items[0].url = '/en/collections/parfum-duefte';
  const r = vergleicheNachlesen(P.plan, z, alte);
  // die Adresse des neuen Eintrags unterscheidet sich (Shopify setzt /en/…): erlaubt ist nur der Vergleich über shopPfad; Ergebnis muss leer sein
  ist('vergleicheNachlesen: gleich bis auf die neue id', r.fehler, []);
  ist('vergleicheNachlesen: meldet die neue id', r.neueIds, ['gid://shopify/MenuItem/999001']);
  const z2 = kopie(z); z2[1].items.reverse();
  wahr('vergleicheNachlesen fängt vertauschte Kinder (title)', vergleicheNachlesen(P.plan, z2, alte).fehler.some(x => x.includes('title geplant')));
  const z3 = kopie(z); z3[0].id = 'gid://shopify/MenuItem/5';
  wahr('vergleicheNachlesen fängt neue id bei bestehendem Eintrag', vergleicheNachlesen(P.plan, z3, alte).fehler.length > 0);
  const z4 = kopie(P.plan); findePfad(z4, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.items[0].id = [...alte][0];
  wahr('vergleicheNachlesen fängt neuen Eintrag mit alter id', vergleicheNachlesen(P.plan, z4, alte).fehler.length > 0);
  const z5 = kopie(z); z5.pop();
  wahr('vergleicheNachlesen fängt fehlende Einträge (Anzahl)', vergleicheNachlesen(P.plan, z5, alte).fehler.some(x => x.startsWith('Anzahl Einträge: geplant')));
  const z6 = kopie(z); const top = z6.find(e => (e.items || []).length); const lift = top.items.pop(); z6.splice(z6.indexOf(top) + 1, 0, lift);
  const v6 = vergleicheNachlesen(P.plan, z6, alte).fehler;
  wahr('vergleicheNachlesen fängt einen auf die obere Ebene gehobenen Eintrag (nur pfad ändert sich)', v6.length > 0 && v6.every(x => x.includes('pfad geplant')));
  for (const u of ['/fr/collections/koerperpflege-bad', 'https://luxestyle.ch/collections/koerperpflege-bad', '/collections/koerperpflege-bad/']) {
    const zz = kopie(z); findePfad(zz, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag.url = u;
    wahr(`vergleicheNachlesen fängt eine verschobene rohe HTTP-Adresse (${u})`, vergleicheNachlesen(P.plan, zz, alte).fehler.some(x => x.includes('rohe Adresse')));
  }
  const z7 = kopie(z); findePfad(z7, ['Sport & Party', 'Fitness & Training'])[0].eintrag.url = '/collections/anderer-handle';
  wahr('vergleicheNachlesen fängt eine geänderte Adresse (ziel)', vergleicheNachlesen(P.plan, z7, alte).fehler.some(x => x.includes('ziel geplant')));
}
ist('verlorene: fehlend und abweichend, nur gewünschte ids', verlorene({ a: { fr: { title: 'A' } }, b: { fr: { title: 'B' } }, c: { fr: { title: 'C' } } }, { a: { fr: { title: 'A' } }, b: { fr: { title: 'X' } } }, new Set(['a', 'b', 'c'])).map(x => x.gid), ['b', 'c']);
ist('verlorene: ohne Einschränkung zählt alles, mit Einschränkung nur die Auswahl', [verlorene({ a: { fr: { title: 'A' } } }, {}).length, verlorene({ a: { fr: { title: 'A' } } }, {}, new Set(['b'])).length], [1, 0]);

// ════════ Teil 2: Läufe gegen die Attrappe ════════
const I = n => `gid://shopify/MenuItem/${n}`;
const FELDER_MENU = ['id', 'title', 'handle', 'items'], FELDER_EINTRAG = ['id', 'title', 'type', 'resourceId', 'url', 'tags', 'items'];
function auswahlAus(query) {
  const ohneArg = query.replace(/\([^)]*\)/g, ' ');
  if ((ohneArg.match(/\{/g) || []).length !== (ohneArg.match(/\}/g) || []).length) throw new Error('GraphQL: Parse error (Klammern)');
  const tok = ohneArg.match(/[A-Za-z_][A-Za-z0-9_]*|[{}]/g) || [];
  let i = 0;
  const sel = () => { const o = {}; while (i < tok.length && tok[i] !== '}') { const name = tok[i++]; if (tok[i] === '{') { i++; o[name] = sel(); i++; } else o[name] = true; } return o; };
  const w = sel(); const nodes = (w.query || w)?.menus?.nodes;
  if (!nodes || nodes === true) throw new Error('GraphQL: Abfrage ohne menus{nodes{…}}');
  return nodes;
}
function antwortKnoten(obj, sel, typ) {
  const o = {}, erlaubt = typ === 'Menu' ? FELDER_MENU : FELDER_EINTRAG;
  for (const [fl, sub] of Object.entries(sel)) {
    if (!erlaubt.includes(fl)) throw new Error(`GraphQL: Field '${fl}' doesn't exist on type '${typ}'`);
    if (fl === 'items') { if (sub === true) throw new Error(`GraphQL: Field 'items' must have selections`); o.items = (obj.items || []).map(k => antwortKnoten(k, sub, 'MenuItem')); continue; }
    if (sub !== true) throw new Error(`GraphQL: Field '${fl}' must not have selections`);
    o[fl] = fl === 'tags' ? [...(obj.tags || [])] : (obj[fl] ?? null);
  }
  return o;
}
const antwortAuf = (query, menu) => antwortKnoten(menu, auswahlAus(query), 'Menu');
const linkGid = id => `gid://shopify/Link/${String(id).split('/').pop()}`;
function ersteUeb(menu) { const u = {}; (function l(x) { for (const e of x || []) { u[linkGid(e.id)] = { fr: { title: `FR ${e.title}` } }; l(e.items); } })(menu.items); return u; }

function attrappe(roh = MENU, { updateWirft = false, userErrors = null, vorLesen = null, nachSchreiben = null, uebWegNachUpdate = [], lesenWirft = null, regFehler = false, uebWirft = false, nachlesenLeer = false, uebEinzelWirft = false } = {}) {
  const st = { menu: kopie(roh), lesen: 0, aufrufe: [], eingaben: [], naechste: 9000, ueb: ersteUeb(roh), regs: [] };
  const handleVonGid = Object.fromEntries(Object.values(COLLS).map(c => [c.id, c.handle]));
  const speichern = items => (items || []).map(i => ({ id: i.id || I(st.naechste++), title: i.title, type: i.type, resourceId: i.type === 'COLLECTION' ? i.resourceId : null,
    url: i.type === 'COLLECTION' ? (handleVonGid[i.resourceId] ? `/en/collections/${handleVonGid[i.resourceId]}` : (i.url ?? null)) : i.url, tags: i.tags || [], items: speichern(i.items) }));
  const ids = () => { const s = new Set(); (function l(x) { for (const i of x || []) { s.add(i.id); l(i.items); } })(st.menu.items); return s; };
  const q = async (query, v) => {
    if (query.includes('menuUpdate')) {
      st.aufrufe.push('update'); st.eingaben.push(kopie(v));
      if (updateWirft) throw new Error('GraphQL: fetch: socket hang up');
      for (const k of ['id', 't', 'h']) if (typeof v[k] !== 'string') throw new Error(`GraphQL: Variable $${k} of required type was not provided`);
      if (userErrors) return { menuUpdate: { menu: null, userErrors } };
      const bekannt = ids(), fe = [];
      if (v.id !== st.menu.id) fe.push({ message: 'Menu does not exist', code: 'NOT_FOUND' });
      (function pr(l, t) { for (const i of l || []) {
        if (i.id && !bekannt.has(i.id)) fe.push({ message: `Menu item ${i.id} does not exist`, code: 'NOT_FOUND' });
        if (i.type === 'HTTP' && !i.url) fe.push({ message: 'url fehlt', code: 'INVALID' });
        if (i.type === 'COLLECTION' && !i.resourceId) fe.push({ message: 'resourceId fehlt', code: 'INVALID' });
        if (t > 3) fe.push({ message: 'zu tief', code: 'INVALID' });
        pr(i.items, t + 1);
      } })(v.i, 1);
      if (fe.length) return { menuUpdate: { menu: null, userErrors: fe } };
      st.menu = { ...st.menu, title: v.t, handle: v.h, items: speichern(v.i) };
      if (nachSchreiben) nachSchreiben(st.menu, st);
      for (const rid of uebWegNachUpdate) delete st.ueb[rid];
      return { menuUpdate: { menu: { id: st.menu.id }, userErrors: [] } };
    }
    if (query.includes('menus(')) {
      st.lesen++; st.aufrufe.push('menus');
      if (nachlesenLeer && st.aufrufe.includes('update')) return { menus: { nodes: [] } };
      if (lesenWirft && lesenWirft(st.lesen)) throw new Error('GraphQL: HTTP 503');
      if (vorLesen) vorLesen(st.menu, st.lesen);
      return { menus: { nodes: [st.menu].filter(m => v.h === `handle:${m.handle}`).map(m => antwortAuf(query, m)) } };
    }
    if (query.includes('collectionByHandle')) { st.aufrufe.push('coll'); return { collectionByHandle: COLLS[v.h] ? kopie(COLLS[v.h]) : null }; }
    if (query === LOC_Q) { st.aufrufe.push('loc'); return { shopLocales: [{ locale: 'de', primary: true }, { locale: 'fr', primary: false }, { locale: 'en', primary: false }] }; }
    if (query.includes('translatableResources(')) {
      st.aufrufe.push('uebAlle');
      if (uebWirft) throw new Error('GraphQL: HTTP 502');
      const nodes = []; (function l(x) { for (const e of x || []) { nodes.push(linkGid(e.id)); l(e.items); } })(st.menu.items);
      const al = [...query.matchAll(/(t\d+): translations\(locale:"([^"]+)"\)/g)];
      return { translatableResources: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: nodes.map(rid => { const o = { resourceId: rid }; for (const [, a, l] of al) o[a] = Object.entries(st.ueb[rid]?.[l] || {}).map(([key, value]) => ({ key, value })); return o; }) } };
    }
    if (query.includes('translatableResource(')) {
      st.aufrufe.push('ueb');
      if (uebEinzelWirft && st.aufrufe.includes('update')) throw new Error('GraphQL: HTTP 502');
      const r = { translatableContent: [{ key: 'title', digest: 'd-' + v.id }] };
      for (const [, al, l] of query.matchAll(/(t\d+): translations\(locale:"([^"]+)"\)/g)) r[al] = Object.entries(st.ueb[v.id]?.[l] || {}).map(([key, value]) => ({ key, value }));
      return { translatableResource: r };
    }
    if (query.includes('translationsRegister')) {
      st.aufrufe.push('reg'); st.regs.push(kopie(v));
      if (regFehler) return { translationsRegister: { translations: null, userErrors: [{ field: ['x'], message: 'Digest veraltet' }] } };
      for (const t of v.t) { if (t.translatableContentDigest !== 'd-' + v.id) return { translationsRegister: { translations: null, userErrors: [{ field: ['digest'], message: 'Digest falsch' }] } }; ((st.ueb[v.id] ??= {})[t.locale] ??= {})[t.key] = t.value; }
      return { translationsRegister: { translations: v.t.map(t => ({ key: t.key, locale: t.locale, value: t.value })), userErrors: [] } };
    }
    throw new Error('Attrappe: unbekannte Abfrage');
  };
  return { q, st };
}
const tmp = mkdtempSync(join(tmpdir(), 'menubereinigen-test-')); let nr = 0;
const JETZT = new Date('2026-11-17T06:00:00.000Z');
async function lauf(opt = {}, att = {}, roh = MENU) {
  const { q, st } = attrappe(roh, att); const dir = join(tmp, `s${++nr}`); const zeilen = [];
  const r = await bereinigenLauf(q, { ops: OPS, verwaistOk: VOK, jetzt: () => JETZT, out: (...a) => zeilen.push(a.join(' ')), err: (...a) => zeilen.push('ERR ' + a.join(' ')), sicherungDir: dir, ...opt });
  return { r, st, text: zeilen.join('\n'), dir };
}
const dateien = dir => (existsSync(dir) ? readdirSync(dir).sort() : []);
const kinderTitel = (m, pfad) => findePfad(m.items, pfad)[0]?.eintrag.items.map(x => x.title);

// Messgerät: die Attrappe liefert nur, was die Abfrage verlangt
{
  const { q } = attrappe();
  const voll = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  ist('Attrappe/MENU_Q liefert alle drei Ebenen mit allen Feldern', JSON.stringify(eingabeAus(voll.items)) === JSON.stringify(eingabeAus(MENU.items)), true);
  let wirft = false; try { await q('query($h:String!){menus(first:1,query:$h){nodes{id title handle items{id foo}}}}', { h: 'handle:main-menu' }); } catch { wirft = true; }
  ist('Attrappe wirft bei unbekanntem Feld', wirft, true);
}
const snap0 = await uebersetzungenSnapshot(attrappe().q);
ist('uebersetzungenSnapshot: alle 784 Links mit fr-Titel', [Object.keys(snap0).length, Object.values(snap0).every(o => o.fr?.title)], [784, true]);

// Trockenlauf: schreibt nichts, legt Sicherung (Menü + Übersetzungen) an
{
  const t = await lauf({});
  ist('Trockenlauf: Exit 0', t.r.code, 0);
  ist('Trockenlauf: kein menuUpdate', t.st.aufrufe.includes('update'), false);
  ist('Trockenlauf: Menü unverändert', zaehle(eingabeAus(t.st.menu.items)), 784);
  ist('Trockenlauf: zwei Sicherungsdateien', dateien(t.dir).length, 2);
  enthaelt('Trockenlauf: Text nennt die Änderungen', t.text, 'ENTFERNEN');
  enthaelt('Trockenlauf: Text nennt das Ende', t.text, 'Trockenlauf: nichts geschrieben');
  const s = JSON.parse(readFileSync(join(t.dir, dateien(t.dir).find(x => !x.includes('uebersetzungen'))), 'utf8'));
  ist('Sicherung ist der gelesene Baum', zaehle(eingabeAus(s.items)), 784);
}
// LIVE: gut
{
  const t = await lauf({ live: true });
  ist('LIVE: Exit 0', t.r.code, 0); if (t.r.code !== 0) console.log(t.text);
  ist('LIVE: ein menuUpdate', t.st.aufrufe.filter(x => x === 'update').length, 1);
  ist('LIVE: Einträge nachher', zaehle(eingabeAus(t.st.menu.items)), t.r.info.gesamt);
  ist('LIVE: Partydeko-Eintrag unter Sport & Party weg', kinderTitel(t.st.menu, ['Sport & Party']).includes('Partydeko & Ballone'), false);
  ist('LIVE: Partydeko bleibt unter Party, Deko & Geschenk', kinderTitel(t.st.menu, ['Sport & Party', 'Party, Deko & Geschenk']).includes('Partydeko & Ballone'), true);
  const g = findePfad(t.st.menu.items, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag;
  ist('LIVE: Gruppe Körper, Mund & Düfte: neue Adresse und Parfum zuerst', [g.url, g.items[0].title, g.items.length], ['/collections/koerperpflege-bad', 'Parfum & Düfte', 4]);
  ist('LIVE: ids der übrigen Einträge bleiben', JSON.stringify(flachMitId(eingabeAus(t.st.menu.items)).filter(x => x.id).map(x => x.id).filter(i => alleIds(ALT).has(i)).sort()) === JSON.stringify([...alleIds(ALT)].filter(i => !P.info.entfernt.some(e => e.id === i)).sort()), true);
  const neuId = g.items[0].id;
  ist('LIVE: fr-Titel des neuen Eintrags eingetragen', t.st.ueb[linkGid(neuId)]?.fr?.title, OPS.find(o => o.op === 'einfuegen').fr);
  ist('LIVE: Übersetzung der geänderten Gruppe bleibt', t.st.ueb[linkGid(g.id)]?.fr?.title, 'FR Körper, Mund & Düfte');
}
// LIVE: Übersetzung der Gruppe geht beim Schreiben verloren (wie Shopify am 12.11.), wird wiederhergestellt
{
  const gid = ALT.find(e => e.title === 'Beauty & Pflege').items.find(e => e.title === 'Körper, Mund & Düfte').id;
  const t = await lauf({ live: true }, { uebWegNachUpdate: [linkGid(gid)] });
  ist('Übersetzung verloren: Exit 0 nach Wiederherstellen', t.r.code, 0); if (t.r.code !== 0) console.log(t.text);
  ist('Übersetzung verloren: wieder da', t.st.ueb[linkGid(gid)]?.fr?.title, 'FR Körper, Mund & Düfte');
  enthaelt('Übersetzung verloren: Text meldet es', t.text, 'wieder eingetragen');
}
// Fehlerfälle
{
  const t = await lauf({ live: true }, { vorLesen: (m, n) => { if (n === 2) m.items.push({ id: I(77777), title: 'Neu von jemand', type: 'HTTP', url: '/x', tags: [], items: [] }); } });
  ist('Menü zwischenzeitlich geändert: Exit 4, nichts geschrieben', [t.r.code, t.st.aufrufe.includes('update')], [4, false]);
}
{
  const t = await lauf({ live: true }, { userErrors: [{ field: ['items'], message: 'kaputt', code: 'INVALID' }] });
  ist('userErrors: Exit 3', t.r.code, 3); enthaelt('userErrors: Text nennt die Sicherung', t.text, 'Sicherung'); enthaelt('userErrors: Meldung', t.text, 'menuUpdate meldet Fehler');
}
{ const t = await lauf({ live: true }, { updateWirft: true }); ist('menuUpdate wirft: Exit 3', t.r.code, 3); }
{
  const t = await lauf({ live: true }, { nachSchreiben: m => { m.items.pop(); } });
  ist('Nachlesen weicht ab (Eintrag fehlt): Exit 3', t.r.code, 3);
}
{
  const t = await lauf({ live: true }, { nachSchreiben: m => { m.items[1].items.reverse(); } });
  ist('Nachlesen weicht ab (Reihenfolge): Exit 3', t.r.code, 3);
}
{
  const t = await lauf({ live: true }, { nachSchreiben: m => { m.items[2].id = I(5555); } });
  ist('Nachlesen: bestehender Eintrag mit neuer id: Exit 3', t.r.code, 3);
}
{
  const { q, st } = attrappe(MENU, { lesenWirft: n => n === 1 }); let wirft = '';
  try { await bereinigenLauf(q, { ops: OPS, verwaistOk: VOK, live: true, jetzt: () => JETZT, sicherungDir: join(tmp, 'lw'), out: () => {}, err: () => {} }); } catch (e) { wirft = String(e.message); }
  ist('Lesen wirft: Fehler geht nach aussen, nichts geschrieben, keine Sicherung', [wirft.includes('503'), st.aufrufe.includes('update'), dateien(join(tmp, 'lw')).length], [true, false, 0]);
}
{
  const t = await lauf({ ops: [{ op: 'entfernen', pfad: ['Gibt es nicht'], handle: 'x' }], live: true });
  ist('Plan-Fehler: Exit 2, nichts geschrieben', [t.r.code, t.st.aufrufe.includes('update')], [2, false]);
}
{
  const t = await lauf({ ops: [] , live: true });
  ist('Aufruffehler (keine Änderungen): Exit 1', t.r.code, 1);
}
{
  const t = await lauf({ verwaistOk: [], live: true });
  ist('verwaist ohne Erlaubnis: Exit 2, nichts geschrieben', [t.r.code, t.st.aufrufe.includes('update')], [2, false]);
}
{
  const { q } = attrappe(MENU, { }); // Menü mit fehlender Ebene: Leseform
  const q2 = async (query, v) => { const d = await q(query, v); if (d?.menus) d.menus.nodes[0].items[0].items = undefined; return d; };
  const zeilen = []; const r = await bereinigenLauf(q2, { ops: OPS, verwaistOk: VOK, sicherungDir: join(tmp, 'x1'), out: () => {}, err: (...a) => zeilen.push(a.join(' ')) });
  ist('Unvollständig gelesenes Menü: Exit 1', r.code, 1);
}
{
  const t = await lauf({ live: true }, { regFehler: true });
  ist('Übersetzung eintragen scheitert: Exit 3, Menü trotzdem geschrieben, Text nennt es', [t.r.code, t.st.aufrufe.includes('update')], [3, true]);
  enthaelt('Übersetzung eintragen scheitert: Hinweis auf offene Übersetzung', t.text, 'ÜBERSETZUNG offen');
}
{
  const t = await lauf({ live: true }, { nachlesenLeer: true });
  ist('Menü nach dem Schreiben nicht lesbar: Exit 3', t.r.code, 3); enthaelt('Menü nach dem Schreiben nicht lesbar: Meldung', t.text, 'nicht lesbar');
}
{
  const t = await lauf({ live: true }, { uebWirft: true });
  ist('Übersetzungen nicht lesbar: Exit 1, nichts geschrieben, keine Sicherung', [t.r.code, t.st.aufrufe.includes('update'), dateien(t.dir).length], [1, false, 0]);
  enthaelt('Übersetzungen nicht lesbar: Meldung', t.text, 'Übersetzungen nicht lesbar');
}
{
  // die echte Änderungsliste (ohne Adressänderung): Gruppe behält ihre Adresse, Parfum wird erstes Kind
  const t = await lauf({ live: true, ops: OPS_DATEI });
  ist('echte Liste LIVE: Exit 0', t.r.code, 0); if (t.r.code !== 0) console.log(t.text);
  const g = findePfad(t.st.menu.items, ['Beauty & Pflege', 'Körper, Mund & Düfte'])[0].eintrag;
  ist('echte Liste: Gruppe zeigt weiter auf parfum-duefte, Parfum ist erstes Kind (insgesamt 4)', [g.url, g.items[0].title, g.items.length], ['/collections/parfum-duefte', 'Parfum & Düfte', 4]);
  ist('echte Liste: 784 - 4 Einträge entfernt + 1 neu = 781', zaehle(eingabeAus(t.st.menu.items)), 781);
  ist('echte Liste: fr-Titel des neuen Eintrags', t.st.ueb[linkGid(g.items[0].id)]?.fr?.title, 'Parfums & fragrances');
}
{
  const gid = ALT.find(e => e.title === 'Beauty & Pflege').items.find(e => e.title === 'Körper, Mund & Düfte').id;
  const t = await lauf({ live: true }, { uebWegNachUpdate: [linkGid(gid)], uebEinzelWirft: true });
  ist('Wiederherstellen und fr-Eintrag werfen je einzeln: Exit 3', t.r.code, 3);
  enthaelt('Meldung nennt den verlorenen Link', t.text, linkGid(gid));
  enthaelt('Meldung nennt den neuen Eintrag, der Rest wurde trotzdem versucht', t.text, 'Parfum & Düfte: fr eintragen');
}
{
  const t = await lauf({ verwaistOk: ['Kein Handle!'], live: true });
  ist('verwaistOk ungültig: Exit 1, nichts geschrieben', [t.r.code, t.st.aufrufe.includes('update')], [1, false]);
  const t2 = await lauf({ verwaistOk: 'wecker', live: true });
  ist('verwaistOk kein Array: Exit 1', t2.r.code, 1);
}
{
  // das zurückgelesene Menü hat einen kaputten Eintrag (null): der Vergleich wirft, das Ergebnis ist Exit 3 mit Hinweis, nicht Exit 1 oder ein Absturz
  const { q, st } = attrappe(); const z = [];
  const q2 = async (query, v) => { const d = await q(query, v); if (d?.menus && st.aufrufe.includes('update') && d.menus.nodes[0]) d.menus.nodes[0].items[0] = null; return d; };
  const r = await bereinigenLauf(q2, { ops: OPS, verwaistOk: VOK, live: true, jetzt: () => JETZT, sicherungDir: join(tmp, 'vg'), out: (...a) => z.push(a.join(' ')), err: (...a) => z.push(a.join(' ')) });
  ist('Vergleich wirft nach dem Schreiben: Exit 3, Meldung nennt die Sicherung', [r.code, z.join('\n').includes('ließ sich nicht vergleichen'), z.join('\n').includes('Sicherung')], [3, true, true]);
}
// zweiter LIVE-Lauf auf dem Ergebnis: Änderungen sind schon da → Plan-Fehler, nichts geschrieben (Idempotenz = Abbruch statt Doppelarbeit)
{
  const { q, st } = attrappe(); const z = []; const o = { ops: OPS, verwaistOk: VOK, live: true, jetzt: () => JETZT, sicherungDir: join(tmp, 'zw'), out: (...a) => z.push(a.join(' ')), err: (...a) => z.push(a.join(' ')) };
  const r1 = await bereinigenLauf(q, o); const n1 = st.aufrufe.filter(x => x === 'update').length;
  const r2 = await bereinigenLauf(q, { ...o, sicherungDir: join(tmp, 'zw2') });
  ist('zweiter Lauf: erster Exit 0, zweiter Exit 2, kein weiteres menuUpdate', [r1.code, r2.code, st.aufrufe.filter(x => x === 'update').length - n1], [0, 2, 0]);
}

try { rmSync(tmp, { recursive: true, force: true }); } catch { /* Aufräumen ist nur Komfort */ }
console.log(`\n${ok} bestanden, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
