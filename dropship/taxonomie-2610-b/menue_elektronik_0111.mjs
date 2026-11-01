import { g } from './sh.mjs';
import { eingabeAus, unterschiede } from '/home/user/aban-news-landing/automation/menu_eintrag_einfuegen.mjs';
import fs from 'node:fs';
const LIVE = process.env.LIVE === '1';
const FELDER = 'id title type resourceId url tags';
const ABFRAGE = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const m = (await g(ABFRAGE, { h: 'handle:main-menu' })).menus.nodes[0];
fs.mkdirSync('/home/user/aban-news-landing/dropship/menu-sicherung', { recursive: true });
fs.writeFileSync('/home/user/aban-news-landing/dropship/menu-sicherung/main-menu-vor-elektronik-0111.json', JSON.stringify(m, null, 1));
const eingabe = eingabeAus(m.items);
const elek = eingabe.find(x => x.title === 'Elektronik');
if (!elek) throw new Error('Elektronik fehlt');

const hand = u => (u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/[a-z]{2}\/collections/, '/collections').match(/^\/collections\/([^/?#]+)/)?.[1];
const flach = [];
(function w(items) { for (const i of items) { flach.push(i); w(i.items || []); } })(elek.items);
const vorhanden = h => flach.find(i => hand(i.url) === h);

const ids = {};
async function coll(h) {
  if (ids[h]) return ids[h];
  const c = (await g(`query($h:String!){collectionByHandle(handle:$h){id title}}`, { h })).collectionByHandle;
  if (!c) throw new Error('Collection fehlt: ' + h);
  return (ids[h] = c);
}
async function kind(h, titel) {
  const alt = vorhanden(h);
  if (alt && !titel) return { id: alt.id, title: alt.title, type: alt.type, ...(alt.resourceId ? { resourceId: alt.resourceId } : { url: alt.url }), items: [] };
  const c = await coll(h);
  return { title: titel || c.title.replace(/\s*&\s*/g, ' & '), type: 'COLLECTION', resourceId: c.id, items: [] };
}
async function kopf(titelNeu, kopfHandle, kinder, behalteKinder) {
  const alt = vorhanden(kopfHandle);
  let k;
  if (alt) k = { id: alt.id, title: titelNeu, type: alt.type, ...(alt.resourceId ? { resourceId: alt.resourceId } : { url: alt.url }), items: [] };
  else { const c = await coll(kopfHandle); k = { title: titelNeu, type: 'COLLECTION', resourceId: c.id, items: [] }; }
  for (const x of kinder) k.items.push(Array.isArray(x) ? await kind(x[0], x[1]) : await kind(x));
  if (behalteKinder && alt) k.items.push(...alt.items.map(i => eingabeAus([i])[0]));
  return k;
}
const KURZ = {
  'powerbanks': 'Powerbanks', 'ladegeraete-netzteile': 'Ladegeräte & Netzteile', 'kabellos-laden': 'Kabelloses Laden', 'auto-ladegeraete': 'Auto-Ladegeräte',
  'ladekabel-datenkabel': 'Ladekabel & Datenkabel', 'handyhalter-staender': 'Handyhalter & Ständer', 'handyhuellen-displayschutz': 'Hüllen & Displayschutz',
  'selfie-stative-foto': 'Selfie, Stative & Foto',
};
const k = (h, t) => [h, t || KURZ[h]];

const neu = [];
const erster = elek.items.find(i => hand(i.url) === 'elektronik-technik');
neu.push(erster ? eingabeAus([erster])[0] : await kind('elektronik-technik', 'Elektronik & Technik'));
neu.push(await kopf('Handy & Laden', 'handy-zubehoer', ['powerbanks', 'ladegeraete-netzteile', 'kabellos-laden', 'auto-ladegeraete', 'ladekabel-datenkabel', 'handyhalter-staender', 'handyhuellen-displayschutz', 'selfie-stative-foto'].map(h => k(h))));
neu.push(await kopf('Kopfhörer & Audio', 'kopfhoerer-audio', [k('kopfhoerer-ohrhoerer', 'Kopfhörer & Ohrhörer'), k('gaming-kopfhoerer-headsets', 'Gaming-Headsets'), k('bluetooth-lautsprecher-boxen', 'Bluetooth-Lautsprecher'), k('mikrofone-zubehoer', 'Mikrofone & Zubehör'), k('radios-audioplayer-diktiergeraete', 'Radios & MP3-Player'), k('audio-zubehoer-adapter', 'Audio-Zubehör & Adapter'), k('funkgeraete-megaphone', 'Funkgeräte & Megaphone')]));
neu.push(await kopf('Smartwatches & Wearables', 'smartwatches-wearables', [k('smartwatches', 'Smartwatches'), k('fitness-tracker-smartbands', 'Fitness-Tracker'), k('uhrenarmbaender-smartwatch', 'Smartwatch-Armbänder'), k('smartwatch-zubehoer', 'Smartwatch-Zubehör'), 'smarte-brillen-ki']));
neu.push(await kopf('Kamera, Foto & Drohnen', 'drohnen-kameras', [k('kameradrohnen-quadrocopter', 'Drohnen mit Kamera'), k('drohnen-zubehoer-fpv', 'Drohnen-Zubehör & FPV'), k('action-sport-wildkameras', 'Action- & Wildkameras'), k('kamerataschen-foto-zubehoer', 'Kamerataschen & Foto-Zubehör'), k('fernglaeser-nachtsicht', 'Ferngläser & Nachtsicht')]));
neu.push(await kopf('TV, Beamer & Streaming', 'beamer-heimkino', [k('beamer-heimprojektoren', 'Beamer & Heimprojektoren'), k('streaming-hdmi-adapter', 'TV-Boxen, Streaming & HDMI'), k('fernbedienungen-universal', 'Fernbedienungen')]));
neu.push(await kopf('Gaming & VR', 'gaming', [k('gamepads-controller', 'Gamepads & Controller'), k('spielkonsolen-retro-handhelds', 'Konsolen & Retro-Handhelds'), k('konsolen-zubehoer-ladestationen', 'Konsolen-Zubehör'), k('vr-brillen-zubehoer', 'VR-Zubehör'), 'vr-brillen-headsets']));
neu.push(await kopf('PC & Computer', 'pc-homeoffice', [k('tastaturen', 'Tastaturen'), k('computer-maeuse', 'Computer-Mäuse'), k('usb-flash-sticks', 'USB-Sticks'), k('ssd-festplatten', 'SSD & Festplatten'), k('speicherkarten-kartenleser', 'Speicherkarten & Kartenleser'), k('laptop-tablet-staender', 'Laptop- & Tablet-Ständer'), k('laptop-taschen-huellen', 'Laptop-Taschen & Hüllen'), k('usb-hubs-docks', 'USB-Hubs & Docking'), k('pc-bauteile', 'PC-Bauteile'), 'netzwerk-router']));
{ const b = await kopf('Büro & Drucker', 'buro-home-office', [k('drucker-scanner-bueromaschinen', 'Drucker & Scanner'), k('webcams-uebersetzer-rechner', 'Webcams & Rechner')], true); neu.push(b); }
neu.push(await kopf('Sicherheit & Überwachung', 'ueberwachungskameras', [k('tuerklingeln-tuerspione', 'Türklingeln & Türspione'), k('alarm-sensoren-melder', 'Alarm & Sensoren'), k('schloesser-safes', 'Schlösser & Safes'), k('gps-tracker-ortung', 'GPS-Tracker'), k('arbeitsschutz-masken', 'Arbeitsschutz & Masken')]));
neu.push(await kopf('Strom, Batterien & Solar', 'solar-energie', [k('batterien-akkus', 'Batterien & Akkus'), k('akku-ladegeraete', 'Akku-Ladegeräte'), k('solar-panels-ladegeraete', 'Solar-Panels & Ladegeräte')]));
for (const h of ['smart-home-gadgets', '3d-drucker-zubehoer', 'kabel-adapter', 'elektronik-kleinteile', 'auto-kfz-zubehoer']) {
  const a = vorhanden(h); if (a && !neu.some(n => n.title === a.title || hand(n.url) === h)) neu.push(eingabeAus([a])[0]);
}
// 3 Ebenen prüfen
const tiefe = (items, d = 1) => Math.max(0, ...items.map(i => (i.items?.length ? tiefe(i.items, d + 1) : d)));
const gesamt = JSON.parse(JSON.stringify(eingabe)); gesamt.find(x => x.title === 'Elektronik').items = neu;
console.log('Tiefe', tiefe(gesamt), '| Köpfe unter Elektronik', neu.length, '| Einträge gesamt Elektronik', (function c(a) { return a.reduce((s, i) => s + 1 + c(i.items || []), 0) })(neu));
for (const n of neu) console.log(' ', n.title, '(' + (n.items?.length || 0) + ')', (n.items || []).map(i => i.title).join(' · ').slice(0, 150));
const alt = elek.items.map(i => i.title), nz = neu.map(i => i.title);
console.log('Aus Elektronik-Ebene 2 entfallen:', alt.filter(t => !nz.includes(t)).join(' | '));
if (!LIVE) { console.log('Trockenlauf — nichts geschrieben.'); process.exit(0); }
const w = await g(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: m.id, t: m.title, h: m.handle, i: gesamt });
if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
const nach = (await g(ABFRAGE, { h: 'handle:main-menu' })).menus.nodes[0];
const u = unterschiede(m.items, nach.items);
const ausserElek = (list) => list.filter(x => !x.startsWith('/Elektronik'));
console.log('Ausserhalb Elektronik: fehlend', ausserElek(u.fehlend).length, '| neu', ausserElek(u.neu).length, '| Reihenfolge gleich:', u.reihenfolgeGleich);
console.log('Elektronik: fehlend', u.fehlend.filter(x => x.startsWith('/Elektronik')).length, '| neu', u.neu.filter(x => x.startsWith('/Elektronik')).length);
