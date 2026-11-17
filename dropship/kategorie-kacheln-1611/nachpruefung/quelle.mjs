// Für jede der 742 Menü-Sammlungen: aus welchem Menü-Knoten kommen die Kacheln (Regel des Live-Snippets), und passt die Beschriftung dieses Knotens zum Sammlungstitel? Nur lesen.
import { readFileSync, writeFileSync } from 'node:fs';
const SHOP = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (q, v) => { const r = await fetch(`https://${SHOP}/admin/api/2025-10/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const m = (await gql(`{ menus(first:3, query:"handle:main-menu"){ nodes{ handle items{ title url items{ title url items{ title url } } } } } }`)).menus.nodes.find(n => n.handle === 'main-menu');
writeFileSync('menu_jetzt.json', JSON.stringify(m, null, 1));
const AUS = new Set(['smoke-zubehoer']);
const hdl = u => { if (!(u || '').includes('/collections/')) return ''; const s = u.split('/collections/'); const r = s[s.length - 1].split('?')[0].split('#')[0]; if (r.includes('/')) return ''; try { return decodeURIComponent(r).toLowerCase(); } catch { return ''; } };
const kids = (items, z) => (items || []).map(i => [hdl(i.url), i.title]).filter(([h]) => h && h !== z && !AUS.has(h));
function quelle(z) {
  const k1 = [], k2 = [], q1 = [], q2 = [];
  for (const a of m.items) {
    const ah = hdl(a.url);
    if (ah && ah === z) { const k = kids(a.items, z); if (k.length) { k1.push(...k); q1.push(a.title); } }
    for (const b of a.items) { const bh = hdl(b.url); if (bh && bh === z) { const k = kids(b.items, z); if (k.length) { k2.push(...k); q2.push(a.title + ' > ' + b.title); } } }
  }
  return k2.length ? { ebene: 2, quelle: q2, kinder: k2 } : k1.length ? { ebene: 1, quelle: q1, kinder: k1 } : { ebene: 0, quelle: [], kinder: [] };
}
const handles = JSON.parse(readFileSync('../handles.json', 'utf8')).map(x => x[0]);
const titel = {};
for (let i = 0; i < handles.length; i += 50) {
  const teil = handles.slice(i, i + 50);
  const q = '{' + teil.map((h, j) => `c${j}: collectionByIdentifier(identifier:{handle:${JSON.stringify(h)}}){ title handle metafield(namespace:"lux", key:"unterfilter"){ value } }`).join(' ') + '}';
  const d = await gql(q);
  teil.forEach((h, j) => { titel[h] = d['c' + j] ? { t: d['c' + j].title, uf: !!d['c' + j].metafield?.value } : null; });
}
const erg = handles.map(h => ({ h, titel: titel[h]?.t, unterfilter: titel[h]?.uf, ...quelle(h) }));
writeFileSync('quelle.json', JSON.stringify(erg, null, 1));
const mit = erg.filter(e => e.kinder.length && !e.unterfilter);
console.log('Seiten mit Menü-Kacheln (ohne Metafeld-Vorrang):', mit.length, ' davon Ebene 1:', mit.filter(e => e.ebene === 1).length, ' Ebene 2:', mit.filter(e => e.ebene === 2).length);
const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9äöü ]/g, ' ').replace(/\s+/g, ' ').trim();
for (const e of mit) {
  const lab = e.quelle.map(q => q.split(' > ').pop());
  const anders = lab.some(l => norm(l) !== norm(e.titel));
  const dup = e.kinder.map(k => norm(k[1])).filter((t, i, a) => a.indexOf(t) !== i);
  const duph = e.kinder.map(k => k[0]).filter((t, i, a) => a.indexOf(t) !== i);
  if (anders || dup.length || duph.length || e.quelle.length > 1) console.log(e.h, '|', e.titel, '| Quelle:', e.quelle.join(' + '), '|', e.kinder.length, 'Kacheln', dup.length ? '| DOPPELTITEL ' + dup.join(',') : '', duph.length ? '| DOPPELHANDLE ' + duph.join(',') : '');
}
