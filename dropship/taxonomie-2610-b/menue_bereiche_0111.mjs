import { g } from './sh.mjs';
import { eingabeAus, unterschiede } from '/home/user/aban-news-landing/automation/menu_eintrag_einfuegen.mjs';
import fs from 'node:fs';
const LIVE = process.env.LIVE === '1';
const MAXT = 34;
const FELDER = 'id title type resourceId url tags';
const ABFRAGE = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const m = (await g(ABFRAGE, { h: 'handle:main-menu' })).menus.nodes[0];
fs.writeFileSync('/home/user/aban-news-landing/dropship/menu-sicherung/main-menu-vor-bereiche-0111.json', JSON.stringify(m, null, 1));
let eingabe = eingabeAus(m.items);

const hand = u => (u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/[a-z]{2}\/collections/, '/collections').match(/^\/collections\/([^/?#]+)/)?.[1];
const alle = [];
(function w(items) { for (const i of items) { alle.push(i); w(i.items || []); } })(eingabe);
const vorh = h => alle.find(i => hand(i.url) === h);
const ids = {};
async function coll(h) {
  if (ids[h]) return ids[h];
  const c = (await g(`query($h:String!){collectionByHandle(handle:$h){id title}}`, { h })).collectionByHandle;
  if (!c) return (ids[h] = null);
  return (ids[h] = c);
}
const bereich = n => JSON.parse(fs.readFileSync(`/home/user/aban-news-landing/dropship/taxonomie-2610-b/bereiche/${n}.json`, 'utf8'));
const KURZ = {};
function titelFuer(datei, h, c) {
  const k = (datei.kategorien || []).find(x => x.handle === h);
  let t = KURZ[h] || (k && k.titel) || c.title;
  return t;
}
const FEHLT = [];
async function kind(datei, h) {
  const c = await coll(h);
  if (!c) { FEHLT.push(h); return null; }
  const alt = vorh(h);
  const t = alt && alt.title.length <= MAXT ? alt.title : titelFuer(datei, h, c);
  return { title: t, type: 'COLLECTION', resourceId: c.id, items: [] };
}
const gruppeKinder = (datei, titel) => {
  const gr = datei.gruppen.find(x => x.titel === titel);
  if (!gr) throw new Error('Gruppe fehlt: ' + titel);
  return (gr.kinder || []).map(k => (typeof k === 'string' ? k : k.handle));
};
/** Kopf: bestehender Eintrag (Titel neu) oder erstes Kind als Kopf; Kinder aus Gruppe. */
async function kopf(datei, { titel, kopfEintrag, kopfHandle, gruppe, vorn = [], ohne = [], nurKinder }) {
  const hs = (nurKinder || gruppeKinder(datei, gruppe)).filter(h => !ohne.includes(h));
  let k;
  if (kopfEintrag) {
    const a = alle.find(i => i.title === kopfEintrag && (i.items || []) !== undefined);
    if (!a) throw new Error('Kopf-Eintrag fehlt: ' + kopfEintrag);
    k = { id: a.id, title: titel, type: a.type, ...(a.resourceId ? { resourceId: a.resourceId } : { url: a.url }), items: [] };
  } else {
    while (!kopfHandle && hs.length && !(await coll(hs[0]))) { FEHLT.push(hs.shift()); }
    const h0 = kopfHandle || hs[0];
    const c = await coll(h0);
    k = { title: titel, type: 'COLLECTION', resourceId: c.id, items: [] };
    if (!kopfHandle) hs.shift();
  }
  for (const h of vorn) { const x = await kind(datei, h); if (x) k.items.push(x); }
  for (const h of hs) { if (hand(k.url) === h || (k.resourceId && ids[h]?.id === k.resourceId)) continue; const x = await kind(datei, h); if (x) k.items.push(x); }
  return k;
}
const behalte = t => { const a = eingabe.find(x => x.title === t) || alle.find(x => x.title === t); if (!a) throw new Error('Eintrag fehlt: ' + t); return eingabeAus([a])[0]; };
const behalteKind = (ast, t) => { const a = eingabe.find(x => x.title === ast).items.find(x => x.title === t); if (!a) throw new Error('Eintrag fehlt: ' + t); return eingabeAus([a])[0]; };

const sp = bereich('spielzeug'), hb = bereich('haus-bau'), au = bereich('auto');
const aeste = {};

// --- Kinder & Baby ---
{
  const A = 'Kinder & Baby';
  const neu = [];
  neu.push(behalteKind(A, '👶 Babykleidung & Kindermode'));
  neu.push(behalteKind(A, 'Spielzeug & Plüsch'));
  neu.push(await kopf(sp, { titel: 'Bausteine & Bausätze', kopfEintrag: 'Bausteine & Konstruktion', gruppe: 'Bausteine & Bausätze', vorn: ['klemmbausteine-bausaetze'] }));
  neu.push(await kopf(sp, { titel: 'Plüsch, Puppen & Spielwelten', kopfEintrag: 'Puppen & Spielfiguren', gruppe: 'Plüsch, Puppen & Spielwelten' }));
  neu.push(await kopf(sp, { titel: 'Fahrzeuge & Ferngesteuertes', kopfEintrag: 'Fahrzeuge & RC', gruppe: 'Fahrzeuge & Ferngesteuertes' }));
  neu.push(await kopf(sp, { titel: 'Lernen, Puzzles & Spiele', kopfEintrag: 'Puzzles & Spiele', gruppe: 'Lernen, Puzzles & Spiele' }));
  neu.push(await kopf(sp, { titel: 'Baby & Kleinkind', kopfEintrag: 'Baby-Ausstattung & Zubehör', gruppe: 'Baby & Kleinkind' }));
  neu.push(await kopf(sp, { titel: 'Schule, Kinderzimmer & Draussen', kopfEintrag: 'Schule & Kindergarten', gruppe: 'Schule, Kinderzimmer & Draussen', ohne: ['schule-kindergarten'] }));
  for (const t of ['Kinderschuhe', 'Kinder-Accessoires', 'Spielzeug ab CH-Lager 🇨🇭', 'Geschenke für Kinder']) neu.push(behalteKind(A, t));
  aeste[A] = neu;
}
// --- Wohnen & Garten: Werkzeug, Garten, Sanitär, Bau ---
{
  const A = 'Wohnen & Garten';
  const alt = eingabe.find(x => x.title === A).items;
  const idx = alt.findIndex(x => x.title === 'Werkzeug & Maschinen');
  const ersetzt = new Map();
  ersetzt.set('Werkzeug & Maschinen', await kopf(hb, { titel: 'Werkzeug & Maschinen', kopfEintrag: 'Werkzeug & Maschinen', gruppe: 'Werkzeug & Maschinen' }));
  ersetzt.set('Garten & Outdoor', await kopf(hb, { titel: 'Garten & Outdoor', kopfEintrag: 'Garten & Outdoor', nurKinder: [...gruppeKinder(hb, 'Garten & Pflanzen'), ...gruppeKinder(hb, 'Outdoor & Sommer')].filter(h => h !== 'haengematten') }));
  const nach = [await kopf(hb, { titel: 'Sanitär & Wasser', gruppe: 'Sanitär & Wasser' }), await kopf(hb, { titel: 'Bau, Türen & Befestigung', gruppe: 'Bau, Türen & Befestigung', ohne: ['schloesser-safes', 'tuerklingeln-tuerspione'] })];
  const neu = [];
  for (const x of alt) {
    neu.push(ersetzt.has(x.title) ? ersetzt.get(x.title) : eingabeAus([x])[0]);
    if (x.title === 'Werkzeug & Maschinen') neu.push(...nach);
  }
  aeste[A] = neu;
}
// --- Auto & Motorrad: neuer Ast auf oberster Ebene ---
let autoAst;
{
  const k = [];
  const gr = [['Innenraum', 'Innenraum & Komfort'], ['Aussen, Schlüssel & Sicherheit', 'Aussen, Schlüssel & Sicherheit'], ['Elektronik & Laden', 'Auto-Elektronik & Laden'], ['Pflege & Werkzeug', 'Pflege & Werkzeug'], ['Motorrad, E-Scooter & Velo', 'Motorrad, E-Scooter & Velo']];
  for (const [g_, t] of gr) k.push(await kopf(au, { titel: t, gruppe: g_ }));
  const c = await coll('auto-kfz-zubehoer');
  autoAst = { title: 'Auto & Motorrad', type: 'COLLECTION', resourceId: c.id, items: k };
}

// zusammensetzen
let gesamt = JSON.parse(JSON.stringify(eingabe));
for (const [a, items] of Object.entries(aeste)) gesamt.find(x => x.title === a).items = items;
const elek = gesamt.find(x => x.title === 'Elektronik');
elek.items = elek.items.filter(x => x.title !== 'Auto & KFZ-Zubehör');
const pos = gesamt.findIndex(x => x.title === 'Elektronik');
gesamt.splice(pos + 1, 0, autoAst);

const KURZMAP = {"Armlehnen, Schaltknäufe & Zierteile":"Armlehnen & Zierteile","Auto-Multimedia, CarPlay & Navigation":"Multimedia & Navigation","Auto-Sitzkissen, Nacken- & Lendenstützen":"Sitzkissen & Nackenstützen","Autoduft, Luftreiniger & Luftbefeuchter":"Autoduft & Luftreiniger","Autoschlüssel, Etuis & Schutzhüllen":"Autoschlüssel & Etuis","Baby-Zubehör, Erinnerungen & Geschenke":"Baby-Zubehör & Geschenke","Bauklötze, Magnet- & Grossbausteine":"Magnet- & Grossbausteine","Bausteine für Kinder & Mikrobausteine":"Kinder- & Mikrobausteine","Diebstahlschutz, Gurte & Sicherheit":"Diebstahlschutz & Sicherheit","Gartendeko, Windspiele & Vogelhäuser":"Gartendeko & Windspiele","Gesellschafts-, Karten- & Geschicklichkeitsspiele":"Spiele & Kartenspiele","Holzspielzeug & weitere Spielsachen":"Holzspielzeug & Spielsachen","Karosserie, Ersatzteile & Wetterschutz":"Karosserie & Wetterschutz","Karosserie-, Motor- & Spezialwerkzeug":"Auto-Werkzeug & Reparatur","Kinder- & Babygeschirr, Trinkflaschen":"Kindergeschirr & Trinkflaschen","Kinderzimmer: Textilien, Deko & Aufbewahrung":"Kinderzimmer: Textilien & Deko","Kleber, Klebebänder & Reparaturmasse":"Kleber & Klebebänder","Lern-, Musik- & Experimentierspielzeug":"Lern- & Musikspielzeug","Malen, Basteln & Kreatives für Kinder":"Malen & Basteln für Kinder","RC-Helikopter, Flugzeuge & Flugspielzeug":"RC-Helikopter & Flugzeuge","Roboter, RC-Tiere & interaktive Spielzeuge":"Roboter & interaktive Spielzeuge","Spielmatten, Beissringe & Baby-Spielzeug":"Spielmatten & Baby-Spielzeug","Starthilfe, Batterieladegeräte & Spannungswandler":"Starthilfe & Batterieladegeräte"};
(function r(items){for(const i of items){if(KURZMAP[i.title])i.title=KURZMAP[i.title];r(i.items||[]);}})(gesamt);
const tiefe = (items, d = 1) => Math.max(0, ...items.map(i => (i.items?.length ? tiefe(i.items, d + 1) : d)));
console.log('Collections im Plan, aber im Shop nicht vorhanden (übersprungen):', [...new Set(FEHLT)].join(', ') || 'keine');
console.log('Tiefe', tiefe(gesamt), '| oberste Einträge', gesamt.length);
const zeige = (it, d = 0) => { console.log(' '.repeat(d * 2) + it.title + (it.items?.length ? ` (${it.items.length})` : '')); if (d < 1) for (const c of it.items || []) zeige(c, d + 1); };
for (const a of ['Kinder & Baby']) { console.log('##', a); for (const c of gesamt.find(x => x.title === a).items) { console.log('  ', c.title, `(${c.items.length})`, c.items.map(i => i.title).join(' · ').slice(0, 170)); } }
{ const a = gesamt.find(x => x.title === 'Wohnen & Garten'); console.log('## Wohnen & Garten: Köpfe mit Kindern'); for (const c of a.items.filter(x => x.items.length)) console.log('  ', c.title, `(${c.items.length})`, c.items.map(i => i.title).join(' · ').slice(0, 170)); }
console.log('## Auto & Motorrad'); for (const c of autoAst.items) console.log('  ', c.title, `(${c.items.length})`, c.items.map(i => i.title).join(' · ').slice(0, 170));
const lang = []; (function w(items, p) { for (const i of items) { if (i.title.length > MAXT) lang.push(i.title); w(i.items || [], p); } })(gesamt, '');
console.log('Titel > ' + MAXT + ' Zeichen:', lang.length, lang.join(' | '));
if (!LIVE) { console.log('Trockenlauf — nichts geschrieben.'); process.exit(0); }
const w = await g(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: m.id, t: m.title, h: m.handle, i: gesamt });
if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
const nach = (await g(ABFRAGE, { h: 'handle:main-menu' })).menus.nodes[0];
const u = unterschiede(m.items, nach.items);
const betroffen = x => /^\/(Kinder & Baby|Wohnen & Garten|Elektronik|Auto & Motorrad)/.test(x);
console.log('Ausserhalb der vier Äste: fehlend', u.fehlend.filter(x => !betroffen(x)).length, '| neu', u.neu.filter(x => !betroffen(x)).length);
console.log('In den Ästen: fehlend', u.fehlend.filter(betroffen).length, '| neu', u.neu.filter(betroffen).length);
console.log('Oberste Ebene jetzt:', nach.items.map(i => i.title).join(' | '));
