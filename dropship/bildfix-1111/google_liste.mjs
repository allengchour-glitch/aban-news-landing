// google_liste.mjs: liest die Produkte aus Googles Liste der Bildprobleme (Merchant API, product_view item_issues)
// nur lesend und ordnet jedem beanstandeten Angebot das Bild zu, das Google als image_link bekommt
// (Variantenbild, sonst Hauptbild). Gibt keine Merchant-Nummer aus.
// Eingabe: JSON { "<produktId>": { "<code>": anzahl } } und eine Liste der Angebote (Zeilen "code|angebot").
// Aufruf: NODE_USE_ENV_PROXY=1 node dropship/bildfix-1111/google_liste.mjs <angebote.txt> <ausgabe.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [angDatei, aus] = process.argv.slice(2);
if (!angDatei || !aus) { console.log('Aufruf: google_liste.mjs <angebote.txt> <ausgabe.json>'); process.exit(2); }
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
});
const tok = (await tr.json().catch(() => null))?.access_token;
if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status); process.exit(2); }
async function gql(q, v) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok },
      body: JSON.stringify({ query: q, variables: v }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await new Promise(s => setTimeout(s, 3000)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  }
  throw new Error('gedrosselt');
}

// Angebote lesen: shopify_ZZ_<produkt>_<variante> (Google-App) oder <produkt>_<sku> (zweite Quelle)
const angebote = {};
for (const z of readFileSync(angDatei, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)) {
  const [code, off] = z.split('|');
  let m = /^shopify_ZZ_(\d+)_(\d+)$/.exec(off);
  let pid, art, wert;
  if (m) { pid = m[1]; art = 'variante'; wert = m[2]; }
  else if ((m = /^(\d{13,15})_(.+)$/.exec(off))) { pid = m[1]; art = 'sku'; wert = m[2]; }
  else continue;
  (angebote[pid] ||= []).push({ code, art, wert });
}
const ids = Object.keys(angebote);
const Q = `query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id handle title status tags productType vendor
  featuredMedia{ id ... on MediaImage{ image{ url width height } } }
  media(first:60){ nodes{ id ... on MediaImage{ image{ url width height } } } }
  variants(first:100){ nodes{ id title sku media(first:1){ nodes{ id ... on MediaImage{ image{ url width height } } } } } } } } }`;
const ergebnis = [];
for (let i = 0; i < ids.length; i += 25) {
  const teil = ids.slice(i, i + 25);
  const d = await gql(Q, { ids: teil.map(x => `gid://shopify/Product/${x}`) });
  for (let k = 0; k < teil.length; k++) {
    const p = d.nodes[k];
    const pid = teil[k];
    if (!p) { ergebnis.push({ pid, fehlt: true, angebote: angebote[pid] }); continue; }
    const bilder = new Map(); // mediaId -> {url,b,h,codes,angebote}
    const nutze = (mid, img, a) => {
      if (!mid) return;
      const e = bilder.get(mid) || { id: mid, url: img?.url, b: img?.width, h: img?.height, codes: new Set(), angebote: 0 };
      e.codes.add(a.code); e.angebote++; bilder.set(mid, e);
    };
    const haupt = p.featuredMedia?.id;
    for (const a of angebote[pid]) {
      let v = null;
      if (a.art === 'variante') v = p.variants.nodes.find(x => x.id.endsWith('/' + a.wert));
      else v = p.variants.nodes.find(x => (x.sku || '').toLowerCase() === a.wert.toLowerCase());
      const vm = v?.media?.nodes?.[0];
      if (vm) nutze(vm.id, vm.image, a); else nutze(haupt, p.featuredMedia?.image, a);
    }
    const pos = new Map(p.media.nodes.map((m, i) => [m.id, i + 1]));
    ergebnis.push({
      pid, id: p.id, handle: p.handle, title: p.title, status: p.status, tags: p.tags, typ: p.productType, vendor: p.vendor,
      bilderGesamt: p.media.nodes.length, varianten: p.variants.nodes.length, hauptbild: haupt,
      beanstandet: [...bilder.values()].map(e => ({ ...e, codes: [...e.codes], pos: pos.get(e.id), haupt: e.id === haupt })),
    });
  }
}
writeFileSync(aus, JSON.stringify(ergebnis, null, 1));
const akt = ergebnis.filter(e => e.status === 'ACTIVE');
console.log(`Produkte ${ergebnis.length}, aktiv ${akt.length}, Entwurf/archiviert ${ergebnis.filter(e => e.status && e.status !== 'ACTIVE').length}, fehlt ${ergebnis.filter(e => e.fehlt).length}`);
console.log(`beanstandete Bilder (eindeutig, aktive Produkte): ${akt.reduce((s, e) => s + e.beanstandet.length, 0)}`);
