// Hauptmenü: die zwei Einträge «Modellbau & Sammelfiguren» heissen «Modellbau & Bausätze» wie die Sammlung (S4 des SEO-Push 10.11.2026).
// Nur diese zwei Titel ändern sich; alle Ids, Typen, Ziele und die Reihenfolge bleiben (Übersetzungen hängen an der Id).
// Trockenlauf ist Vorgabe. LIVE=1 schreibt (Sicherung vorher, Nachlesen streng). ZURUECK=1 LIVE=1 schreibt die zwei Titel zurück.
import fs from 'node:fs'; import path from 'node:path';
import { eingabeAus } from '../../automation/menu_eintrag_einfuegen.mjs';
import { gleicherBaum, gleicheZiele } from '../../automation/lib/menue_plan.mjs';
export const ALT = 'Modellbau & Sammelfiguren', NEU = 'Modellbau & Bausätze', HANDLE = 'modellbau';
const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const zeigtAufModellbau = i => /\/collections\/modellbau(?:[/?#]|$)/.test(i.url || '');
export function umbenennen(baum, von, nach) {
  const treffer = []; const kopie = JSON.parse(JSON.stringify(baum));
  const geh = (items, pfad) => items.forEach(i => { if (i.title === von && zeigtAufModellbau(i)) { i.title = nach; treffer.push(pfad + ' > ' + von); } geh(i.items || [], pfad + ' > ' + i.title); });
  geh(kopie, '');
  return { baum: kopie, treffer };
}
export async function lauf(q, { live = false, zurueck = false, sicherung, log = console.log, err = console.error } = {}) {
  const von = zurueck ? NEU : ALT, nach = zurueck ? ALT : NEU;
  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!m || m.handle !== 'main-menu') { err('ABBRUCH: Hauptmenü nicht gefunden'); return { code: 1 }; }
  const alt = eingabeAus(m.items); const u = umbenennen(alt, von, nach);
  log('Treffer:', u.treffer.join(' | ') || '-');
  if (u.treffer.length !== 2) { err('ABBRUCH, nichts geschrieben: erwartet genau 2 Einträge «' + von + '» mit Ziel /collections/modellbau, gefunden ' + u.treffer.length); return { code: 2 }; }
  if (!live) { log('Trockenlauf - nichts geschrieben.'); return { code: 0, baum: u.baum }; }
  const frisch = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!frisch || frisch.id !== m.id || JSON.stringify(eingabeAus(frisch.items)) !== JSON.stringify(alt)) { err('ABBRUCH, nichts geschrieben: das Menü hat sich seit dem Lesen verändert'); return { code: 4 }; }
  fs.mkdirSync(path.dirname(sicherung), { recursive: true });
  const datei = fs.existsSync(sicherung) ? sicherung.replace(/\.json$/, '-' + Date.now() + '.json') : sicherung;
  fs.writeFileSync(datei, JSON.stringify(frisch, null, 1)); log('Sicherung:', datei);
  const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: frisch.id, t: frisch.title, h: frisch.handle, i: u.baum });
  if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
  const z = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0]; const ze = eingabeAus(z.items);
  const v = gleicherBaum(u.baum, ze), g = gleicheZiele(u.baum, ze), rest = umbenennen(ze, nach, '___').treffer.length; // beide Treffer tragen jetzt den neuen Titel
  const ids = JSON.stringify(ze.map(function f(i) { return [i.id, (i.items || []).map(f)]; })) === JSON.stringify(alt.map(function f(i) { return [i.id, (i.items || []).map(f)]; }));
  log('Nachlesen:', JSON.stringify({ gleich: v.gleich && g.gleich, ids, neueTitel: rest }));
  if (!v.gleich || !g.gleich || !ids || rest !== 2) { err('ABWEICHUNG nach dem Schreiben! Sicherung:', datei); return { code: 3 }; }
  log('OK: zwei Menü-Titel geändert, Baum, Ziele und Ids unverändert.'); return { code: 0 };
}
if (process.argv[1] && /menue_modellbau(_run)?\.mjs$/.test(process.argv[1])) {
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const tr = await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json();
  const q = async (query, variables) => { const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tr.access_token }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
  const res = await lauf(q, { live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1', sicherung: path.join(path.dirname(new URL(import.meta.url).pathname), 'menu-sicherung-modellbau.json') });
  process.exit(res.code);
}
