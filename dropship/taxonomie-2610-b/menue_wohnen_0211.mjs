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
const SICH='/home/user/aban-news-landing/dropship/menu-sicherung/main-menu-vor-wohnen-0211.json';
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
  'Kochlöffel, Zangen & Utensilien-Sets': 'Kochlöffel, Zangen & Sets',
  'Reiskocher, Dampfgarer & Eierkocher': 'Reiskocher & Dampfgarer',
  'Waffeleisen, Sandwichmaker & Toaster': 'Waffeleisen & Toaster',
  'Servierplatten, Tabletts & Etageren': 'Servierplatten & Etageren',
  'Kleiderbügel, Kleiderständer & Schuhregale': 'Kleiderbügel & Schuhregale',
  'Bilderrahmen, Wandtattoos & Klebefolien': 'Bilderrahmen & Wandtattoos',
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
D.wohnen = bereich('wohnen');
const wo = D.wohnen;
AKTIV = 'Wohnen & Garten';
const ast = eingabe.find(x => x.title === 'Wohnen & Garten');
const gruppen = [];
for (const gr of wo.gruppen) {
  const alt = (ast.items || []).find(i => i.title === gr.titel);
  gruppen.push(await kopf(wo, { titel: gr.titel, ...(alt ? { kopfEintrag: gr.titel } : {}), gruppe: gr.titel }));
}
const ABGELOEST = ['Küche & Kochen', 'Kissen & Wohntextilien', 'Aufbewahrung', 'Wohnen & Deko', 'Dekoration'];
const abgedeckt = new Set();
for (const k of gruppen) { abgedeckt.add(k.resourceId); for (const c of k.items) abgedeckt.add(c.resourceId); }
const behalten = [], entfallen = [], unabgedeckt = [];
for (const x of ast.items) {
  if (gruppen.some(k => k.id && k.id === x.id)) continue;
  const weg = ABGELOEST.includes(x.title) || ((x.items || []).length === 0 && x.resourceId && abgedeckt.has(x.resourceId));
  if (!weg) { behalten.push(eingabeAus([x])[0]); continue; }
  entfallen.push(x.title);
  for (const c of [x, ...(x.items || [])]) if (c.resourceId && !abgedeckt.has(c.resourceId)) unabgedeckt.push(x.title + ' > ' + c.title + ' (' + (hand(c.url) || '?') + ')');
}
console.log('Alte Köpfe, die entfallen:', entfallen.length, '|', entfallen.join(' ; '));
console.log('Davon nicht in den neuen Gruppen enthalten (müssten sonst verloren gehen):', unabgedeckt.length);
unabgedeckt.forEach(u => console.log('   ', u));
// Alte Einzel-Köpfe (ohne Kinder) wandern als Unterpunkt in die passende Gruppe; so bleibt alles erreichbar und der Ast hat ~18 statt 32 Köpfe.
const MERGE = { 'Wäschekörbe': 'Aufbewahrung & Möbel', 'Wandregale': 'Aufbewahrung & Möbel', 'Sticker & Aufkleber': 'Basteln & DIY', 'Hängematten': 'Garten & Outdoor', 'Aroma & Diffuser': 'Raumluft & Klima', 'Vasen & Blumentöpfe': 'Deko & Kerzen', 'Wandbilder & Poster': 'Fenster, Wand & Uhren', 'Wecker': 'Fenster, Wand & Uhren', 'Geschenkverpackung': 'Deko & Kerzen', 'Haushaltsgeräte': 'Küchengeräte', 'Ersatzteile & Zubehör': 'Putzen & Haushalt' };
// Doppelte alte Sammlungen, die die neuen engeren Kategorien ersetzen (bleiben als Seite erreichbar, nur nicht mehr im Menü)
const DUBLETTEN = ['Wanddeko', 'Wandteppiche & Wandbehänge', 'Wanduhren'];
const ALTKINDER = { 'Waagen': 'Küchenhelfer & Vorrat', 'Armaturen & Duschen': 'Bad' };
const ziele = [...gruppen, ...behalten];
const kindVon = (x) => x.resourceId ? { title: x.title, type: 'COLLECTION', resourceId: x.resourceId, items: [] } : { title: x.title, type: x.type, url: x.url, items: [] };
const rest = [];
for (const k of behalten) {
  if (DUBLETTEN.includes(k.title)) { console.log('Dublette nicht mehr im Menü:', k.title); continue; }
  const z = MERGE[k.title];
  if (z) { const t = ziele.find(g => g.title === z); if (!t) throw new Error('Ziel fehlt: ' + z + ' für ' + k.title); t.items.push(kindVon(k)); continue; }
  rest.push(k);
}
for (const x of ast.items.filter(i => i.title === 'Küche & Kochen')) for (const c of x.items) { const z = ALTKINDER[c.title]; if (z) ziele.find(g => g.title === z).items.push(kindVon(c)); }
aeste['Wohnen & Garten'] = [...gruppen, ...rest];
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
const betroffen = x => /^\/Wohnen & Garten/.test(x);
console.log('Ausserhalb Wohnen & Garten: fehlend', u.fehlend.filter(x => !betroffen(x)).length, '| neu', u.neu.filter(x => !betroffen(x)).length);
console.log('In den Ästen: fehlend', u.fehlend.filter(betroffen).length, '| neu', u.neu.filter(betroffen).length);
console.log('Fehlend in den Ästen:', u.fehlend.filter(betroffen).slice(0, 15).join(' ; '));
