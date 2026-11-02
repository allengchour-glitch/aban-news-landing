import { g } from './sh.mjs';
import { eingabeAus, unterschiede } from '/home/user/aban-news-landing/automation/menu_eintrag_einfuegen.mjs';
import fs from 'node:fs';
const LIVE = process.env.LIVE === '1';
const NUR = process.env.NUR ? process.env.NUR.split(',') : null;
const inkl = a => !NUR || NUR.includes(a);
const MAXT = 34;
const FELDER = 'id title type resourceId url tags';
const ABFRAGE = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const m = (await g(ABFRAGE, { h: 'handle:main-menu' })).menus.nodes[0];
fs.mkdirSync('/home/user/aban-news-landing/dropship/menu-sicherung', { recursive: true });
const SICH='/home/user/aban-news-landing/dropship/menu-sicherung/main-menu-vor-bereiche2-0211.json';
if (!fs.existsSync(SICH)) fs.writeFileSync(SICH, JSON.stringify(m, null, 1));
const eingabe = eingabeAus(m.items);
const hand = u => (u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/[a-z]{2}\/collections/, '/collections').match(/^\/collections\/([^/?#]+)/)?.[1];
const alle = [];
(function w(items) { for (const i of items) { alle.push(i); w(i.items || []); } })(eingabe);
const vorh = h => alle.find(i => hand(i.url) === h);
const ids = {}; const FEHLT = [];
async function coll(h) {
  if (h in ids) return ids[h];
  const c = (await g(`query($h:String!){collectionByHandle(handle:$h){id title}}`, { h })).collectionByHandle;
  return (ids[h] = c || null);
}
const bereich = n => JSON.parse(fs.readFileSync(`/home/user/aban-news-landing/dropship/taxonomie-2610-b/bereiche/${n}.json`, 'utf8'));
const D = {};
for (const n of ['tiere', 'beauty', 'sport', 'sportschuhe', 'hobby-party']) D[n] = bereich(n);
const KURZMAP = {
  'Tragetaschen, Rucksäcke & Transport': 'Tragetaschen & Transport',
  'Interaktives & elektrisches Spielzeug': 'Interaktives Spielzeug',
  'Kratzbäume, Kratzbretter & Kletterwände': 'Kratzbäume & Kletterwände',
  'Gesichtsreinigungsgeräte & -bürsten': 'Reinigungsbürsten & -geräte',
  'Mikrostrom-, EMS- & Ultraschallgeräte': 'Mikrostrom & Ultraschall',
  'Massagepistolen, Faszienbälle & Roller': 'Massagepistolen & Faszienroller',
  'Schlafmasken, Reisekissen & Schlafhilfen': 'Schlafmasken & Reisekissen',
  'Bauchtrainer, Liegestütz- & Klimmzuggeräte': 'Bauch- & Klimmzugtrainer',
  'Balance Boards, Gymnastikbälle & Steps': 'Balance Boards & Gymnastikbälle',
  'Kraftsport-Handschuhe, Gürtel & Bandagen': 'Kraftsport-Handschuhe & Gürtel',
  'Trainingsgeräte für Arme, Beine & Ganzkörper': 'Arm-, Bein- & Ganzkörpertrainer',
  'Wanderstöcke, Kletter- & Survival-Ausrüstung': 'Wandern, Klettern & Survival',
  'Schlafsäcke, Isomatten & Luftbetten': 'Schlafsäcke & Isomatten',
  'Camping-Geschirr, Kochsets & Grills': 'Camping-Geschirr & Grills',
  'Fussball-, Basketball- & Golfschuhe': 'Ball- & Golfschuhe',
};
const katTitel = (datei, h, c) => (datei.kategorien || []).find(x => x.handle === h)?.titel || c.title;
async function kind(datei, h) {
  const c = await coll(h);
  if (!c) { FEHLT.push(h); return null; }
  const alt = vorh(h);
  let t = alt && alt.title.length <= MAXT ? alt.title : katTitel(datei, h, c);
  t = KURZMAP[t] || t;
  return { title: t, type: 'COLLECTION', resourceId: c.id, items: [] };
}
const gruppeKinder = (datei, titel) => {
  const gr = datei.gruppen.find(x => x.titel === titel);
  if (!gr) throw new Error('Gruppe fehlt: ' + titel);
  return (gr.kinder || []).map(k => (typeof k === 'string' ? k : k.handle));
};
let AKTIV = '';
async function kopf(datei, { titel, kopfEintrag, gruppe, nurKinder, ohne = [] }) {
  const hs = (nurKinder || gruppeKinder(datei, gruppe)).filter(h => !ohne.includes(h));
  let k;
  if (kopfEintrag) {
    const a = (function f(items) { const o = []; (function w(it) { for (const i of it) { o.push(i); w(i.items || []); } })(items); return o; })(eingabe.find(x => x.title === AKTIV)?.items || []).find(i => i.title === kopfEintrag);
    if (!a) return null;
    k = { id: a.id, title: titel, type: a.type, ...(a.resourceId ? { resourceId: a.resourceId } : { url: a.url }), items: [] };
  } else {
    while (hs.length && !(await coll(hs[0]))) FEHLT.push(hs.shift());
    const c = await coll(hs[0]);
    k = { title: titel, type: 'COLLECTION', resourceId: c.id, items: [] };
    hs.shift();
  }
  for (const h of hs) {
    if (hand(k.url) === h || (k.resourceId && ids[h]?.id === k.resourceId)) continue;
    const x = await kind(datei, h); if (x) k.items.push(x);
  }
  return k;
}
/** Ersetzt im Ast die Köpfe laut `ersetze` (alter Titel → neuer Kopf), hängt `neu` am Ende an; alles andere bleibt. */
const ENTFALLEN = [];
function umbauen(ast, ersetze, neu, vorne = false) {
  const ERS = process.env.ERS ? process.env.ERS.split('|') : null;
  ersetze = Object.fromEntries(Object.entries(ersetze).filter(([k, v]) => v && (!ERS || ERS.includes(k))));
  neu = neu.filter(Boolean);
  const a = eingabe.find(x => x.title === ast);
  if (!a) throw new Error('Ast fehlt: ' + ast);
  const neueKoepfe = [...Object.values(ersetze), ...neu];
  const gesehen = new Set();
  for (const k of neueKoepfe) for (const c of (k.items || [])) { if (gesehen.has(c.resourceId)) c.__dup = true; gesehen.add(c.resourceId); }
  for (const k of neueKoepfe) k.items = (k.items || []).filter(c => !c.__dup);
  const items = a.items.filter(x => ersetze[x.title] || !((x.items || []).length === 0 && x.resourceId && gesehen.has(x.resourceId)) || (ENTFALLEN.push(ast + ' > ' + x.title), false)).map(x => ersetze[x.title] || eingabeAus([x])[0]);
  return vorne ? [...neu, ...items] : [...items, ...neu];
}
const aeste = {};
const tr = D.tiere, be = D.beauty, sp = D.sport, ss = D.sportschuhe, hp = D['hobby-party'];

AKTIV = 'Haustiere';
if (inkl('Haustiere')) aeste['Haustiere'] = umbauen('Haustiere', {
  'Leinen, Halsbänder & Geschirre': await kopf(tr, { titel: 'Spazieren & Unterwegs', kopfEintrag: 'Leinen, Halsbänder & Geschirre', gruppe: 'Spazieren & Unterwegs', ohne: ['leinen-halsbaender-geschirre'] }),
  'Näpfe & Füttern': await kopf(tr, { titel: 'Futter & Trinken', kopfEintrag: 'Näpfe & Füttern', gruppe: 'Futter & Trinken', ohne: ['tier-naepfe-fuettern'] }),
  'Tierspielzeug': await kopf(tr, { titel: 'Spielzeug', kopfEintrag: 'Tierspielzeug', gruppe: 'Spielzeug', ohne: ['tierspielzeug'] }),
  'Hunde- & Katzenkleidung': await kopf(tr, { titel: 'Kleidung & Accessoires', kopfEintrag: 'Hunde- & Katzenkleidung', gruppe: 'Kleidung & Accessoires', ohne: ['hunde-katzen-kleidung'] }),
  'Betten, Kratzbäume & Möbel': await kopf(tr, { titel: 'Schlafen, Möbel & Pflege', kopfEintrag: 'Betten, Kratzbäume & Möbel', gruppe: 'Schlafen, Möbel & Pflege', ohne: ['tierbetten-kratzbaeume'] }),
}, [await kopf(tr, { titel: 'Kleintiere & Vögel', nurKinder: ['tier-kleintiere-voegel'] })]);

AKTIV = 'Beauty & Pflege';
if (inkl('Beauty & Pflege')) aeste['Beauty & Pflege'] = umbauen('Beauty & Pflege', {
  'Hautpflege & Skincare': await kopf(be, { titel: 'Gesicht & Haut', kopfEintrag: 'Hautpflege & Skincare', gruppe: 'Gesicht & Haut' }),
  'Make-up & Kosmetik': await kopf(be, { titel: 'Make-up & Wimpern', kopfEintrag: 'Make-up & Kosmetik', gruppe: 'Make-up & Wimpern' }),
  'Nägel & Maniküre': await kopf(be, { titel: 'Nägel & Maniküre', kopfEintrag: 'Nägel & Maniküre', gruppe: 'Nägel & Maniküre' }),
  'Haarpflege & Styling': await kopf(be, { titel: 'Haare, Rasur & Haarentfernung', kopfEintrag: 'Haarpflege & Styling', gruppe: 'Haare, Rasur & Haarentfernung' }),
  'Gesichtspflege-Geräte': await kopf(be, { titel: 'Beauty-Geräte fürs Gesicht', kopfEintrag: 'Gesichtspflege-Geräte', gruppe: 'Beauty-Geräte fürs Gesicht' }),
  'Parfum & Düfte': await kopf(be, { titel: 'Körper, Mund & Düfte', kopfEintrag: 'Parfum & Düfte', gruppe: 'Körper, Mund & Düfte' }),
}, [await kopf(be, { titel: 'Massage & Entspannung', gruppe: 'Massage & Entspannung' }), await kopf(be, { titel: 'Rücken, Gelenke & Alltagshilfen', gruppe: 'Rücken, Gelenke & Alltagshilfen' })]);

const TEIL = process.env.TEIL || 'alles';
AKTIV = 'Sport & Party';
if (inkl('Sport & Party')) aeste['Sport & Party'] = umbauen('Sport & Party', TEIL === 'neu' ? {} : {
  'Sport & Fitness': await kopf(sp, { titel: 'Fitness & Training', kopfEintrag: 'Sport & Fitness', gruppe: 'Fitness & Training' }),
  'Yoga & Fitness': await kopf(sp, { titel: 'Yoga, Pilates & Dehnen', kopfEintrag: 'Yoga & Fitness', gruppe: 'Yoga, Pilates & Dehnen' }),
  'Camping & Outdoor': await kopf(sp, { titel: 'Camping', kopfEintrag: 'Camping & Outdoor', gruppe: 'Camping' }),
  'Wandern & Trekking': await kopf(sp, { titel: 'Wandern, Angeln & Wasser', kopfEintrag: 'Wandern & Trekking', gruppe: 'Wandern, Angeln & Wasser' }),
  'Velo & Radsport': await kopf(sp, { titel: 'Rad & Velo', kopfEintrag: 'Velo & Radsport', gruppe: 'Rad & Velo' }),
}, TEIL === 'ersetzen' ? [] : [
  await kopf(sp, { titel: 'Ballsport, Kampfsport & Schutz', gruppe: 'Ballsport, Kampfsport & Schutz' }),
  await kopf(hp, { titel: 'Malen, Zeichnen & Mosaik', gruppe: 'Malen, Zeichnen & Mosaik' }),
  await kopf(hp, { titel: 'Basteln & Verzieren', gruppe: 'Basteln & Verzieren' }),
  await kopf(hp, { titel: 'Nähen, Sticken & Stricken', gruppe: 'Nähen, Sticken & Stricken' }),
  await kopf(hp, { titel: 'Sticker, Journaling & Modelle', gruppe: 'Sticker, Journaling & Modelle' }),
  await kopf(hp, { titel: 'Party, Deko & Geschenk', gruppe: 'Party, Deko & Geschenk' }),
]);

AKTIV = 'Schuhe';
if (inkl('Schuhe')) {
  const alleSchuh = [...gruppeKinder(ss, 'Laufen, Training, Ball- & Kampfsport'), ...gruppeKinder(ss, 'Tanz, Skate & Rollen'), ...gruppeKinder(ss, 'Outdoor, Wasser & Rad')];
  const k = await kopf(ss, { titel: 'Sportschuhe', nurKinder: ['sneaker-sportschuhe', ...alleSchuh] });
  aeste['Schuhe'] = umbauen('Schuhe', {}, [k]);
}

const KURZ = {};
let gesamt = JSON.parse(JSON.stringify(eingabe));
for (const [a, items] of Object.entries(aeste)) if (!NUR || NUR.includes(a)) gesamt.find(x => x.title === a).items = items;
if (process.env.KAPPE) { const K = +process.env.KAPPE; const z = a => a.reduce((n, i) => n + 1 + z(i.items || []), 0); const sp2 = gesamt.find(x => x.title === 'Sport & Party'); while (z(gesamt) > K) { const k = [...sp2.items].reverse().find(h => (h.items || []).length > 2); k.items.pop(); console.log('gekappt:', k.title); } }
const tiefe = (items, d = 1) => Math.max(0, ...items.map(i => (i.items?.length ? tiefe(i.items, d + 1) : d)));
console.log('Collections im Plan, im Shop nicht vorhanden (übersprungen):', [...new Set(FEHLT)].join(', ') || 'keine');
console.log('Alte Einzel-Köpfe, die jetzt als Untereintrag stehen (entfallen als Kopf, bleiben erreichbar):', ENTFALLEN.length, '|', ENTFALLEN.join(' ; '));
console.log('Tiefe', tiefe(gesamt), '| oberste Einträge', gesamt.length);
for (const a of Object.keys(aeste)) {
  console.log('##', a, `(${aeste[a].length} Köpfe)`);
  for (const c of aeste[a]) console.log('  ', c.title, `(${c.items.length})`, c.items.map(i => i.title).join(' · ').slice(0, 130));
}
const lang = []; (function w(items) { for (const i of items) { if (i.title.length > MAXT) lang.push(i.title); w(i.items || []); } })(Object.values(aeste).flat());
console.log('Neue/geänderte Titel > ' + MAXT + ' Zeichen:', lang.length, [...new Set(lang)].join(' | '));
if (process.env.ZEIGE) console.log(JSON.stringify(aeste['Sport & Party'].find(h => h.title === process.env.ZEIGE), null, 1));
console.log('Einträge neu:', (function c(a){return a.reduce((s,i)=>s+1+c(i.items||[]),0)})(gesamt));
if (!LIVE) { console.log('Trockenlauf — nichts geschrieben.'); process.exit(0); }
const w = await g(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: m.id, t: m.title, h: m.handle, i: gesamt });
if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
const nach = (await g(ABFRAGE, { h: 'handle:main-menu' })).menus.nodes[0];
const u = unterschiede(m.items, nach.items);
const betroffen = x => /^\/(Haustiere|Beauty & Pflege|Sport & Party|Schuhe)/.test(x);
console.log('Ausserhalb der vier Äste: fehlend', u.fehlend.filter(x => !betroffen(x)).length, '| neu', u.neu.filter(x => !betroffen(x)).length);
console.log('In den Ästen: fehlend', u.fehlend.filter(betroffen).length, '| neu', u.neu.filter(betroffen).length);
console.log('Fehlend in den Ästen:', u.fehlend.filter(betroffen).slice(0, 15).join(' ; '));
