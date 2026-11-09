#!/usr/bin/env node
/**
 * Misst EXAKTE Dubletten (Zeichenkette gleich) bei SEO-Titel und SEO-Beschreibung der Sammlungen, die in der deutschen Sitemap stehen. Nur lesend.
 * Warum: `kategorie_seo_dubletten.mjs` normalisiert stark (Gross-/Kleinschreibung, Satzzeichen, Markenzusatz) und zeigt darum Gruppen, die ein Audit
 * nicht als doppelt zählt (09.11.2026: 28 Gruppen im Werkzeug, 19 echte). Dieses Skript zählt, was ein Audit zählt.
 *
 *   node automation/seo_exakt_dubletten.mjs            Bericht (Exit 0 = keine Dubletten und keine leeren Felder, 2 = es gibt welche, 1 = Abruf fehlgeschlagen)
 *   node automation/seo_exakt_dubletten.mjs --selbsttest
 *
 * Wirksamer SEO-Titel einer Sammlung = `seo.title`, sonst ihr Titel. Die Sitemap wird mit Browser-Kopf geholt (sonst 403), mit Pausen (sonst 429).
 * Umgebung: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET; Vorgabe der Adresse: https://luxestyle.ch (SITE=… übersteuert).
 */
import { fileURLToPath } from 'node:url';

export const norm = (s) => String(s ?? '').trim();

// sammlungen: [{handle, title, seo:{title, description}}]; handlesInSitemap: Set der deutschen Sammlungs-Handles aus der Sitemap
export function exakteDubletten(sammlungen, handlesInSitemap) {
  const sichtbar = sammlungen.filter((c) => handlesInSitemap.has(c.handle));
  const wirksamerTitel = (c) => norm(c.seo?.title) || norm(c.title);
  const beschreibung = (c) => norm(c.seo?.description);
  const gruppen = (f) => {
    const m = new Map();
    for (const c of sichtbar) { const k = f(c); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(c.handle); }
    return [...m.entries()].filter(([, l]) => l.length > 1).map(([wert, handles]) => ({ wert, handles }));
  };
  return {
    sichtbar: sichtbar.length,
    titel: gruppen(wirksamerTitel),
    beschreibung: gruppen(beschreibung),
    leereTitel: sichtbar.filter((c) => !wirksamerTitel(c)).map((c) => c.handle),
    leereBeschreibungen: sichtbar.filter((c) => !beschreibung(c)).map((c) => c.handle),
  };
}

// Handles der deutschen Sammlungen aus den Teil-Sitemaps (`/fr/` und andere Sprachen werden nicht gezählt)
export function handlesAusSitemapXml(xml, basis = 'https://luxestyle.ch') {
  const raus = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (u.startsWith(basis + '/collections/')) raus.add(decodeURIComponent(u.slice((basis + '/collections/').length)));
  }
  return raus;
}

export function teilSitemaps(indexXml) {
  return [...indexXml.matchAll(/<loc>([^<]*sitemap_collections_[^<]*)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}

function selbsttest() {
  let n = 0; const ok = (b, t) => { n++; if (!b) { console.error('FEHLER:', t); process.exitCode = 1; } };
  const c = (handle, t, d, titel = 'T ' + handle) => ({ handle, title: titel, seo: { title: t, description: d } });
  const alle = [c('a', 'Gleich', 'D1'), c('b', 'Gleich', 'D2'), c('c', 'Anders', 'D1'), c('d', null, 'D3', 'Eigener Titel'), c('e', '', '', 'T e'), c('versteckt1', 'Gleich', 'D1'), c('versteckt2', 'Gleich', 'D1')];
  const r = exakteDubletten(alle, new Set(['a', 'b', 'c', 'd', 'e']));
  ok(r.sichtbar === 5, 'nur Sammlungen der Sitemap zählen');
  ok(r.titel.length === 1 && r.titel[0].wert === 'Gleich' && r.titel[0].handles.join() === 'a,b', 'doppelter SEO-Titel gefunden, nicht sitemap-fremde');
  ok(r.beschreibung.length === 1 && r.beschreibung[0].wert === 'D1' && r.beschreibung[0].handles.join() === 'a,c', 'doppelte Beschreibung gefunden');
  ok(r.leereBeschreibungen.join() === 'e', 'leere Beschreibung gefunden');
  ok(r.leereTitel.length === 0, 'Titel fällt auf den Sammlungstitel zurück');
  ok(exakteDubletten([c('x', 'Gross', 'd'), c('y', 'gross', 'd2')], new Set(['x', 'y'])).titel.length === 0, 'Gross-/Kleinschreibung unterscheidet (exakt)');
  ok(exakteDubletten([c('x', ' Gleich ', 'd'), c('y', 'Gleich', 'd2')], new Set(['x', 'y'])).titel.length === 1, 'Leerraum am Rand zählt nicht');
  const zwei = exakteDubletten([c('x', 'A', ''), c('y', 'B', '')], new Set(['x', 'y']));
  ok(zwei.beschreibung.length === 0 && zwei.leereBeschreibungen.length === 2, 'zwei leere Beschreibungen sind leer, keine Dubletten');
  ok(exakteDubletten([c('x', null, 'd', 'Titel'), c('y', null, 'd2', 'Titel')], new Set(['x', 'y'])).titel.length === 1, 'zwei Sammlungen ohne SEO-Titel mit gleichem Titel sind Dubletten');
  const xml = '<urlset><url><loc>https://luxestyle.ch/collections/a</loc></url><url><loc>https://luxestyle.ch/fr/collections/a</loc></url><url><loc>https://luxestyle.ch/collections/%F0%9F%8E%81-geschenke</loc></url></urlset>';
  const h = handlesAusSitemapXml(xml);
  ok(h.size === 2 && h.has('a') && h.has('🎁-geschenke'), 'Sitemap: nur deutsch, Emoji-Handle dekodiert');
  const idx = '<sitemapindex><sitemap><loc>https://luxestyle.ch/sitemap_products_1.xml?from=1&amp;to=2</loc></sitemap><sitemap><loc>https://luxestyle.ch/sitemap_collections_1.xml?from=3&amp;to=4</loc></sitemap></sitemapindex>';
  ok(teilSitemaps(idx).length === 1 && teilSitemaps(idx)[0].endsWith('from=3&to=4'), 'Teil-Sitemaps der Sammlungen erkannt, &amp; aufgelöst');
  console.log(n + ' Prüfungen' + (process.exitCode ? ' MIT FEHLERN' : ' ok'));
}

async function main() {
  const { shopifyGql } = await import('./lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('./lib/shopify_secret.mjs');
  const SITE = (process.env.SITE || 'https://luxestyle.ch').replace(/\/$/, '');
  const KOPF = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'de-CH,de;q=0.9' };
  const warte = (ms) => new Promise((s) => setTimeout(s, ms));
  const hole = async (url) => {
    for (let versuch = 0; versuch < 5; versuch++) {
      const r = await fetch(url, { headers: KOPF });
      if (r.status === 429) { await warte(10000); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status} bei ${url}`);
      return r.text();
    }
    throw new Error('429 nach fünf Versuchen: ' + url);
  };
  const teile = teilSitemaps(await hole(SITE + '/sitemap.xml'));
  if (!teile.length) { console.error('Keine Sammlungs-Sitemap im Index gefunden'); process.exit(1); }
  const handles = new Set();
  for (const u of teile) { await warte(5000); for (const h of handlesAusSitemapXml(await hole(u), SITE)) handles.add(h); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const t = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await t.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const alle = []; let after = null;
  do { const d = await q(`query($a:String){collections(first:250, after:$a){pageInfo{hasNextPage endCursor} nodes{handle title seo{title description}}}}`, { a: after }); alle.push(...d.collections.nodes); after = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null; } while (after);
  const r = exakteDubletten(alle, handles);
  console.log(`Sammlungen im Shop: ${alle.length} | deutsche Sitemap: ${handles.size} | davon im Shop gefunden: ${r.sichtbar}`);
  console.log(`SEO-Titel: ${r.titel.length} Dubletten-Gruppen | leer: ${r.leereTitel.length}`);
  for (const g of r.titel.slice(0, 20)) console.log(`  - ${JSON.stringify(g.wert.slice(0, 80))} → ${g.handles.join(', ')}`);
  console.log(`SEO-Beschreibung: ${r.beschreibung.length} Dubletten-Gruppen | leer: ${r.leereBeschreibungen.length}`);
  for (const g of r.beschreibung.slice(0, 20)) console.log(`  - ${JSON.stringify(g.wert.slice(0, 80))} → ${g.handles.join(', ')}`);
  if (r.leereBeschreibungen.length) console.log('  leere Beschreibung bei: ' + r.leereBeschreibungen.slice(0, 20).join(', '));
  process.exit(r.titel.length || r.beschreibung.length || r.leereTitel.length || r.leereBeschreibungen.length ? 2 : 0);
}

if (process.argv.includes('--selbsttest')) selbsttest();
else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error('FEHLER', e.message); process.exit(1); });
