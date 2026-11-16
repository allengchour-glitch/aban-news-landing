// Prüfwerkzeug (16.11.2026, Claude): rechnet aus dem Admin-Hauptmenü unabhängig Kinder und Nachbarn je Sammlung (Orakel)
// und vergleicht sie mit der gerenderten Seite. Vorgabe: Testansicht ?view=lxtest gegen live (Pfad und JSON-LD müssen gleich sein).
// NUR_LIVE=1: nur die Live-Seite gegen das Orakel (nach dem Einspielen). Nur lesen.
// Aufruf: node orakel_pruefen.mjs damen-mode,fur-ihn,/fr/collections/damen-mode  (Ergebnis: orakel_erg.json im Arbeitsordner)
import { writeFileSync } from 'node:fs';
const SHOP = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (q, v) => { const r = await fetch(`https://${SHOP}/admin/api/2025-10/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const m = (await gql(`{ menus(first:3, query:"handle:main-menu"){ nodes{ handle items{ title url items{ title url items{ title url } } } } } }`)).menus.nodes.find(n => n.handle === 'main-menu');
const AUS = new Set(['smoke-zubehoer']);
const hdl = u => { const s = (u || '').split('/collections/'); if (s.length < 2) return ''; const r = s[s.length - 1].split('?')[0].split('#')[0]; if (r.includes('/')) return ''; try { return decodeURIComponent(r).toLowerCase(); } catch { return ''; } };
function liste(items, ohne) { const o = []; for (const i of items || []) { const h = hdl(i.url); if (h && !ohne.has(h) && !AUS.has(h)) o.push([h, i.title]); } return o; }
function orakel(z) {
  let k1 = [], k2 = [], e = '', g = [], gef = false;
  for (const a of m.items) {
    const ah = hdl(a.url);
    if (ah && ah === z) k1.push(...liste(a.items, new Set([z])));
    for (const b of a.items) {
      const bh = hdl(b.url);
      if (bh && bh === z) {
        k2.push(...liste(b.items, new Set([z])));
        if (!gef && ah && ah !== z) { gef = true; e = ah; g = liste(a.items, new Set([z, ah])); }
      }
      if (!gef && bh && bh !== z) for (const c of b.items) if (hdl(c.url) === z && !gef) { gef = true; e = bh; g = liste(b.items, new Set([z, bh])); }
    }
  }
  const k = k2.length ? k2 : k1;
  const uniq = arr => { const s = new Set(); return arr.filter(([h]) => (s.has(h) ? false : (s.add(h), true))); };
  return { kinder: uniq(k), eltern: e, geschw: uniq(g) };
}
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36', Accept: 'text/html', 'Accept-Language': 'de-CH,de;q=0.9' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function holen(url) { let r, t = ''; for (let v = 0; v < 4; v++) { r = await fetch(url, { headers: H }); t = await r.text(); if (r.status !== 429) break; await sleep(60000); } return { st: r.status, t, timing: r.headers.get('server-timing') || '' }; }
function lesen(t) {
  const f = t.replace(/\s+/g, ' ');
  const kacheln = [...f.matchAll(/class="lx-welten__card[^"]*" href="([^"]+)"[^>]*>.*?<span class="lx-welten__card-title">(.*?)<\/span>/g)].map(x => [decodeURIComponent(x[1].replace(/^\/fr/, '').replace('/collections/', '')).toLowerCase(), x[2]]);
  const sib = (f.match(/lx-collection-details__siblings.*?<\/ul>/) || [''])[0];
  const geschw = [...sib.matchAll(/href="([^"]+)">(.*?)<\/a>/g)].map(x => [decodeURIComponent(x[1].replace(/^\/fr/, '').replace('/collections/', '')).toLowerCase(), x[2]]);
  const pfad = ((f.match(/<nav class="lx-kp__pfad"[^>]*>.*?<\/nav>/) || [''])[0]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const ld = (f.match(/"@type":\s*"BreadcrumbList".*?\]/) || [''])[0];
  const knopf = ((f.match(/<button[^>]*class="lx-welten__mehr[^"]*"[^>]*>(.*?)<\/button>/) || ['', ''])[1]).trim();
  const kurz = /lx-welten__grid--kurz/.test(f);
  return { kacheln, geschw, pfad, ld, knopf, kurz, liquid: (t.match(/Liquid error/g) || []).length, bytes: t.length };
}
const SEITEN = (process.argv[2] || '').split(',').filter(Boolean);
await sleep(Number(process.env.VORLAUF_MS || 0));
const erg = [];
for (const s of SEITEN) {
  const basis = `https://luxestyle.ch${s.startsWith('/') ? s : '/collections/' + s}`;
  const ziel = decodeURIComponent(s.split('?')[0].split('/').filter(Boolean).pop()).toLowerCase();
  const test = process.env.NUR_LIVE === '1' ? null : await holen(basis + (basis.includes('?') ? '&' : '?') + 'view=lxtest'); if (test) await sleep(6500);
  const live = await holen(basis); await sleep(6500);
  const L = lesen(live.t), T = test ? lesen(test.t) : L, o = orakel(ziel);
  const zeile = { s, st: [test ? test.st : null, live.st], liquid: T.liquid, bytes: [T.bytes, L.bytes], kacheln_test: T.kacheln, kacheln_live: L.kacheln, geschw_test: T.geschw, geschw_live: L.geschw,
    pfad_gleich: T.pfad === L.pfad, pfad_test: T.pfad, pfad_live: L.pfad, ld_gleich: T.ld === L.ld, ld_test: T.ld, ld_live: L.ld, knopf: T.knopf, kurz: T.kurz, timing: [test ? test.timing : null, live.timing], orakel: o };
  erg.push(zeile);
  const okK = o.kinder.every(([h]) => T.kacheln.some(([k]) => k === h)) ? 'K⊆' : 'K-FEHLT';
  console.log(s, test ? test.st : '-', live.st, 'liquid', T.liquid, 'kacheln', L.kacheln.length, '→', T.kacheln.length, '(orakel', o.kinder.length, okK + ')', 'nachbarn', L.geschw.length, '→', T.geschw.length, '(orakel', o.geschw.length + ')', 'pfad', zeile.pfad_gleich ? 'GLEICH' : 'ANDERS', 'ld', zeile.ld_gleich ? 'GLEICH' : 'ANDERS', 'knopf', JSON.stringify(T.knopf), 'kurz', T.kurz, 'bytes', T.bytes);
}
writeFileSync(process.cwd() + '/orakel_erg.json', JSON.stringify(erg, null, 1));
