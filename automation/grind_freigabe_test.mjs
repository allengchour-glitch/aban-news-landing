// Test für grind_freigabe.mjs — Attrappe des Shops, kein Netz, keine Geheimnisse (09.11.2026).
// Geprüft: Trockenlauf schreibt NICHTS · Aufbereiten mit Sicherung und Rücklesen · idempotent · Tore blockieren · Freigeben nur mit Freigabedatei ·
// jeder Fehler nach ACTIVE nimmt das Produkt zurück · höchstens 5 je Lauf · «halten» ändert nur die Tags · Rücknahme aus der Sicherung.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lauf, tore, planPruefen, seoFuer, seoGleich, htmlErsetzen, ohneOffen, mitGehalten, EXIT, MARKER_TEXT, MARKER_FAKTEN, TAG_OFFEN, TAG_GEHALTEN } from './grind_freigabe.mjs';

let n = 0, bad = 0;
const t = async (name, f) => { try { await f(); n++; } catch (e) { bad++; console.error('✗', name, '\n  ', e.message.split('\n').slice(0, 4).join('\n   ')); } };
const sortiert = l => [...l].sort();
const KAN = ['gid://shopify/Publication/1', 'gid://shopify/Publication/2', 'gid://shopify/Publication/3', 'gid://shopify/Publication/4'];

// ── Attrappe ───────────────────────────────────────────────────────────────
const bild = (id, url, w = 800, h = 800, status = 'READY') => ({ id, status, image: { url, width: w, height: h } });
const produkt = (handle, extra = {}) => ({
  id: `gid://shopify/Product/${handle}`, handle, title: `Titel ${handle}`, status: 'DRAFT',
  tags: ['cj-real', 'dropship', 'grind2', 'grind2-20261108', 'sort-x', TAG_OFFEN],
  descriptionHtml: `<!-- ls-var-v1 -->${MARKER_TEXT}<p>Text</p><!-- /ls-text-v2 -->\n${MARKER_FAKTEN}<td>zipper</td><!-- /ls-fakten-v1 -->`,
  seo: { title: `Titel ${handle} | LuxeStyle CH`, description: 'alt' },
  options: [{ id: `o-${handle}`, name: 'Grösse', optionValues: [{ id: `v1-${handle}`, name: '16MM' }, { id: `v2-${handle}`, name: '10MM' }] }],
  media: { nodes: [bild(`m1-${handle}`, 'https://cdn/files/collage.jpg?v=1'), bild(`m2-${handle}`, 'https://cdn/files/sauber.jpg?v=1'), bild(`m3-${handle}`, 'https://cdn/files/drei.jpg?v=1')] },
  variants: { nodes: [{ id: `x1-${handle}`, sku: `SKU-${handle}-1`, price: '14.90' }, { id: `x2-${handle}`, sku: `SKU-${handle}-2`, price: '16.90' }] },
  gpc: { value: 'Luggage & Bags > Briefcases' }, pubs: [], ...extra });

function shop(produkte, { fehler = {}, beiPublish = null, ignoriere = [], teilweise = false, beiSku = null, seoWieShopify = false } = {}) {
  const S = { p: Object.fromEntries(produkte.map(x => [x.handle, structuredClone(x)])), schreib: [], fehler, ref: KAN };
  const wie = p => ({ ...structuredClone(p), resourcePublicationsV2: { nodes: p.pubs.map(id => ({ isPublished: true, publication: { id } })) } });
  S.gql = async (q, v = {}) => {
    if (q.includes('status:active tag:cj-real')) return { products: { nodes: Array.from({ length: 8 }, (_, i) => ({ id: `ref${i}`, resourcePublicationsV2: { nodes: S.ref.map(id => ({ isPublished: true, publication: { id } })) } })) } };
    if (q.includes('mutation($p:ProductUpdateInput!)')) {
      S.schreib.push(['productUpdate', v.p]);
      if (S.fehler.produkt?.(v.p)) return { productUpdate: { userErrors: [{ message: 'Attrappe: abgelehnt' }] } };
      const p = Object.values(S.p).find(x => x.id === v.p.id);
      for (const [k, w] of Object.entries(v.p)) { if (k === 'id' || ignoriere.includes(k)) continue; p[k === 'seo' ? 'seo' : k] = structuredClone(w); }
      if (seoWieShopify && p.seo && p.seo.title === p.title) p.seo.title = null;   // Shopify speichert SEO-Titel = Produkttitel als leer
      return { productUpdate: { product: { id: p.id }, userErrors: [] } };
    }
    if (q.includes('productOptionUpdate')) {
      S.schreib.push(['option', v]);
      const p = Object.values(S.p).find(x => x.id === v.pid); const o = p.options.find(x => x.id === v.o.id);
      for (const u of v.v) o.optionValues.find(x => x.id === u.id).name = u.name;
      return { productOptionUpdate: { product: { id: p.id }, userErrors: [] } };
    }
    if (q.includes('productReorderMedia')) {
      S.schreib.push(['medien', v]);
      const p = Object.values(S.p).find(x => x.id === v.id); const i = p.media.nodes.findIndex(m => m.id === v.m[0].id);
      const [m] = p.media.nodes.splice(i, 1); p.media.nodes.splice(Number(v.m[0].newPosition), 0, m);
      return { productReorderMedia: { job: { id: 'j', done: true }, mediaUserErrors: [] } };
    }
    if (q.includes('publishablePublish')) {
      S.schreib.push(['publish', v]);
      if (beiPublish) beiPublish(S);
      if (S.fehler.publish) return { publishablePublish: { userErrors: [{ message: 'Attrappe: Kanal gesperrt' }] } };
      const p = Object.values(S.p).find(x => x.id === v.id); p.pubs = v.p.map(x => x.publicationId).slice(0, teilweise ? 2 : 99);
      return { publishablePublish: { userErrors: [] } };
    }
    if (q.includes('sku:"') || q.includes('first:3')) { if (beiSku) beiSku(S); const sku = v.q.match(/sku:"([^"]*)"/)[1]; return { products: { nodes: Object.values(S.p).filter(x => x.variants.nodes.some(y => y.sku === sku)).map(x => ({ id: x.id, handle: x.handle, status: x.status })) } }; }
    if (q.includes('products(first:2, query:$q)')) { const h = v.q.replace('handle:', ''); return { products: { nodes: S.p[h] ? [wie(S.p[h])] : [] } }; }
    throw new Error('Attrappe kennt die Abfrage nicht: ' + q.slice(0, 60));
  };
  return S;
}

function umgebung({ produkte, plan, live = false, freigeben = false, zurueck = false, frei = true, fehler = {}, beiPublish = null, status = 200, max, ignoriere = [], teilweise = false, beiSkuDatei = false, seoWieShopify = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'gf-'));
  let datei = null;
  const S = shop(produkte, { fehler, beiPublish, ignoriere, teilweise, seoWieShopify, beiSku: beiSkuDatei ? () => { if (datei && existsSync(datei)) unlinkSync(datei); } : null });
  const cfg = { plan, live, freigeben, zurueck, sicherung: join(dir, 'sicherung.json'), ledger: join(dir, 'ledger.txt'), freigabeDatei: join(dir, 'FREI.txt'), shopDomain: 'shop.test', max };
  if (frei) writeFileSync(cfg.freigabeDatei, 'frei');
  datei = cfg.freigabeDatei;
  const zeilen = [], aufrufe = [];
  const io = { gql: S.gql, log: z => zeilen.push(z), warte: async () => {}, jetzt: () => 1700000000000,
    fetchFn: async url => { aufrufe.push(url); return { status: typeof status === 'function' ? status(url) : status, body: { cancel: async () => {} } }; } };
  return { S, cfg, io, zeilen, aufrufe, dir, aus: () => rmSync(dir, { recursive: true, force: true }), ledger: () => (existsSync(cfg.ledger) ? readFileSync(cfg.ledger, 'utf8') : '') };
}
const PLAN1 = h => ({ freigeben: [{ handle: h, titel: 'Neuer Titel', optionen: { Grösse: { '16MM': '16 mm', '10MM': '10 mm' } }, medienNachVorn: 'sauber.jpg', html: [['>zipper<', '>Reissverschluss<']] }], halten: [] });

// ── reine Bausteine ────────────────────────────────────────────────────────
await t('Plan: gültig', () => assert.deepEqual(planPruefen(PLAN1('a')), []));
await t('Plan: doppelter handle', () => assert.ok(planPruefen({ freigeben: [{ handle: 'a' }], halten: [{ handle: 'a', grund: 'x' }] }).some(x => /doppelt/.test(x))));
await t('Plan: halten ohne Grund', () => assert.ok(planPruefen({ freigeben: [], halten: [{ handle: 'a' }] }).some(x => /Grund/.test(x))));
await t('Plan: unbekanntes Feld und fehlender handle', () => { assert.ok(planPruefen({ freigeben: [{ handle: 'a', status: 'ACTIVE' }], halten: [] }).some(x => /unbekanntes Feld/.test(x))); assert.ok(planPruefen({ freigeben: [{}], halten: [] }).some(x => /handle/.test(x))); });
await t('Plan: Müll', () => { assert.ok(planPruefen(null).length); assert.ok(planPruefen({ freigeben: 'a', halten: [] }).length); });
await t('Tags: text-offen weg, gehalten dazu, ohne Doppelte', () => { assert.deepEqual(ohneOffen(['a', TAG_OFFEN]), ['a']); assert.deepEqual(mitGehalten(['a', TAG_OFFEN, TAG_GEHALTEN]), ['a', TAG_GEHALTEN]); });
await t('SEO: Vorlage, Titel höchstens 60, Beschreibung höchstens 160', () => {
  const s = seoFuer('Laptop-Hülle aus mattem PU, 12 bis 14 Zoll');
  assert.equal(s.title, 'Laptop-Hülle aus mattem PU, 12 bis 14 Zoll | LuxeStyle CH');
  assert.match(s.description, /^Laptop-Hülle aus mattem PU, 12 bis 14 Zoll bei LuxeStyle – Schweizer Online-Shop\./); assert.ok(s.description.length <= 160);
});
await t('SEO: langer Titel wird gekürzt (Titel ohne Zusatz, sehr lang mit Auslassung)', () => {
  assert.equal(seoFuer('x'.repeat(58)).title, 'x'.repeat(58));
  const l = seoFuer('Wort '.repeat(30)); assert.ok(l.title.length <= 50 && l.title.endsWith('…')); assert.ok(l.description.length <= 160 && l.description.endsWith('…'));
});
await t('HTML: ein Treffer wird ersetzt, zweimal nicht erlaubt, fehlend nicht erlaubt, schon erledigt ist ok', () => {
  assert.equal(htmlErsetzen('a>zipper<b', [['>zipper<', '>Reissverschluss<']]), 'a>Reissverschluss<b');
  assert.throws(() => htmlErsetzen('>zipper<>zipper<', [['>zipper<', 'x']]), /2×/);
  assert.throws(() => htmlErsetzen('nichts', [['>zipper<', 'x']]), /0×/);
  assert.equal(htmlErsetzen('a>Reissverschluss<b', [['>zipper<', '>Reissverschluss<']]), 'a>Reissverschluss<b');
});
const gut = () => { const p = produkt('p1'); p.tags = p.tags.filter(x => x !== TAG_OFFEN); return p; };
await t('Tore: ein gutes Produkt besteht alle', () => { const r = tore(gut(), { kanaele: KAN }); assert.ok(r.every(x => x.ok === true), JSON.stringify(r.filter(x => !x.ok))); });
const rot = (mod, soll) => { const p = gut(); mod(p); const r = tore(p, { kanaele: mod.kan ?? KAN }).filter(x => x.ok !== true).map(x => x.name); assert.ok(r.some(x => x.includes(soll)), `${soll}: ${JSON.stringify(r)}`); };
await t('Tor: Status ACTIVE blockiert', () => rot(p => { p.status = 'ACTIVE'; }, 'Status'));
await t('Tor: ohne grind2 oder cj-real blockiert', () => { rot(p => { p.tags = p.tags.filter(x => x !== 'grind2'); }, 'Marken'); rot(p => { p.tags = p.tags.filter(x => x !== 'cj-real'); }, 'Marken'); });
await t('Tor: Sperr-Tag blockiert', () => rot(p => { p.tags.push('compliance-pruefen'); }, 'Sperr'));
await t('Tor: ohne Fliesstext oder ohne Datenblatt-Kasten blockiert', () => { rot(p => { p.descriptionHtml = p.descriptionHtml.replace(MARKER_TEXT, ''); }, 'Fliesstext'); rot(p => { p.descriptionHtml = p.descriptionHtml.replace(MARKER_FAKTEN, ''); }, 'Fliesstext'); });
await t('Tor: zu wenige Bilder, Bild nicht READY, Hauptbild zu klein', () => {
  rot(p => { p.media.nodes = p.media.nodes.slice(0, 2); }, 'Bilder');
  rot(p => { p.media.nodes[1].status = 'PROCESSING'; }, 'Bilder');
  rot(p => { p.media.nodes[0].image.width = 699; }, 'Hauptbild');
  rot(p => { p.media.nodes[0].image.height = 400; }, 'Hauptbild');
});
await t('Tor: Hauptbild genau 700 px besteht (Grenze)', () => { const p = gut(); p.media.nodes[0].image.width = 700; p.media.nodes[0].image.height = 700; assert.ok(tore(p, { kanaele: KAN }).every(x => x.ok === true)); });
await t('Tor: SKU fehlt, SKU doppelt, keine Variante', () => {
  rot(p => { p.variants.nodes[0].sku = ''; }, 'SKU');
  rot(p => { p.variants.nodes[1].sku = p.variants.nodes[0].sku; }, 'SKU');
  rot(p => { p.variants.nodes = []; }, 'SKU');
});
await t('Tor: Preis unter 14.90 blockiert, genau 14.90 nicht', () => { rot(p => { p.variants.nodes[0].price = '14.89'; }, 'Preis'); const p = gut(); p.variants.nodes[0].price = '14.90'; assert.ok(tore(p, { kanaele: KAN }).every(x => x.ok === true)); });
await t('Tor: Google-Kategorie fehlt', () => { rot(p => { p.gpc = null; }, 'Google'); rot(p => { p.gpc = { value: '  ' }; }, 'Google'); });
await t('Tor: Kanalliste fehlt oder zu kurz', () => { const p = gut(); for (const k of [null, [], ['a', 'b']]) assert.ok(tore(p, { kanaele: k }).some(x => x.name.includes('Kanalliste') && !x.ok)); });
await t('Tor: Tag text-offen blockiert', () => rot(p => { p.tags.push(TAG_OFFEN); }, 'text-offen'));

await t('SEO-Abgleich: leerer SEO-Titel zählt wie der Produkttitel, sonst genau', () => {
  const soll = { title: 'Langer Titel', description: 'd' };
  assert.equal(seoGleich({ title: 'Langer Titel', seo: { title: null, description: 'd' } }, soll), true);
  assert.equal(seoGleich({ title: 'Langer Titel', seo: { title: '', description: 'd' } }, soll), true);
  assert.equal(seoGleich({ title: 'Anders', seo: { title: null, description: 'd' } }, soll), false);
  assert.equal(seoGleich({ title: 'Langer Titel', seo: { title: 'Langer Titel', description: 'x' } }, soll), false);
  assert.equal(seoGleich({ title: 'Langer Titel', seo: { title: null, description: null } }, soll), false);
  assert.equal(seoGleich({ title: 'X', seo: { title: 'Langer Titel', description: 'd' } }, soll), true);
});
// ── der Lauf ───────────────────────────────────────────────────────────────
await t('Trockenlauf schreibt NICHTS (kein Shop-Schreibzugriff, keine Sicherung, kein Ledger)', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a') });
  const r = await lauf(U.cfg, U.io);
  assert.equal(r.exit, EXIT.OK); assert.equal(U.S.schreib.length, 0); assert.equal(existsSync(U.cfg.sicherung), false); assert.equal(U.ledger(), '');
  assert.ok(U.zeilen.some(z => /würde aufbereiten a: Felder .*Optionen .*Hauptbild tauschen/.test(z)), U.zeilen.join('|')); assert.equal(r.zaehl.WUERDE_AUFBEREITEN, 1); U.aus();
});
await t('Trockenlauf mit FREIGEBEN ohne LIVE wird abgelehnt', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), freigeben: true }); const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.PLAN); assert.equal(U.S.schreib.length, 0); U.aus();
});
await t('Aufbereiten: alles geschrieben, zurückgelesen, gesichert, NICHT veröffentlicht', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true });
  const r = await lauf(U.cfg, U.io); const p = U.S.p.a;
  assert.equal(r.exit, EXIT.OK, U.zeilen.join('|'));
  assert.equal(p.title, 'Neuer Titel'); assert.equal(p.seo.title, 'Neuer Titel | LuxeStyle CH'); assert.ok(!p.tags.includes(TAG_OFFEN)); assert.ok(p.descriptionHtml.includes('>Reissverschluss<'));
  assert.deepEqual(p.options[0].optionValues.map(v => v.name), ['16 mm', '10 mm']); assert.equal(p.media.nodes[0].id, 'm2-a');
  assert.equal(p.status, 'DRAFT'); assert.deepEqual(p.pubs, []); assert.ok(!U.S.schreib.some(s => s[0] === 'publish'));
  const s = JSON.parse(readFileSync(U.cfg.sicherung, 'utf8')).a; assert.equal(s.title, 'Titel a'); assert.ok(s.tags.includes(TAG_OFFEN)); assert.deepEqual(s.mediaIds, ['m1-a', 'm2-a', 'm3-a']); assert.equal(s.options[0].werte[0].name, '16MM');
  assert.equal(r.zaehl.AUFBEREITET, 1); assert.equal(r.zaehl.BEREIT, 1); U.aus();
});
await t('Aufbereiten ist idempotent: zweiter Lauf schreibt nichts mehr', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true });
  await lauf(U.cfg, U.io); const vorher = U.S.schreib.length; const r = await lauf(U.cfg, U.io);
  assert.equal(r.exit, EXIT.OK); assert.equal(U.S.schreib.length, vorher); assert.ok(U.zeilen.some(z => /nichts zu tun/.test(z))); U.aus();
});
await t('Die Sicherung behält den ERSTEN Stand (zweiter Lauf überschreibt sie nicht)', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true });
  await lauf(U.cfg, U.io); const plan2 = PLAN1('a'); plan2.freigeben[0].titel = 'Noch ein Titel'; U.cfg.plan = plan2; await lauf(U.cfg, U.io);
  assert.equal(JSON.parse(readFileSync(U.cfg.sicherung, 'utf8')).a.title, 'Titel a'); assert.equal(U.S.p.a.title, 'Noch ein Titel'); U.aus();
});
await t('Freigeben: ACTIVE, alle Kanäle, Seite HTTP 200, Ledger FREI', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); const p = U.S.p.a;
  assert.equal(r.exit, EXIT.OK, U.zeilen.join('|')); assert.equal(p.status, 'ACTIVE'); assert.deepEqual([...p.pubs].sort(), [...KAN].sort());
  assert.equal(U.aufrufe.length, 1); assert.match(U.aufrufe[0], /^https:\/\/shop\.test\/products\/a\?cb=/);
  assert.match(U.ledger(), /^a · .* · FREI · veröffentlicht in 4 Kanälen, Seite HTTP 200/m); assert.equal(r.zaehl.VEROEFFENTLICHT, 1); U.aus();
});
await t('Freigeben ohne Freigabedatei: Exit 5, nichts geschrieben', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, frei: false });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.FREIGABE); assert.equal(U.S.schreib.length, 0); assert.equal(U.S.p.a.status, 'DRAFT'); U.aus();
});
await t('Notbremse: Datei verschwindet beim Veröffentlichen → Produkt zurück auf ENTWURF', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, beiPublish: () => unlinkSync(U.cfg.freigabeDatei) });
  const r = await lauf(U.cfg, U.io); assert.equal(U.S.p.a.status, 'DRAFT'); assert.equal(r.exit, EXIT.SCHREIBEN); assert.match(U.ledger(), /ZURUECK · Freigabe gescheitert: Freigabedatei verschwunden/); assert.equal(r.zaehl.ZURUECKGENOMMEN, 1); U.aus();
});
await t('Seite nicht erreichbar (HTTP 500) → zurück auf ENTWURF, Ledger ZURUECK', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, status: 500 });
  const r = await lauf(U.cfg, U.io); assert.equal(U.S.p.a.status, 'DRAFT'); assert.equal(r.exit, EXIT.SCHREIBEN); assert.match(U.ledger(), /ZURUECK · Freigabe gescheitert: Produktseite HTTP 500/); assert.equal(U.aufrufe.length, 3); assert.ok(!/ FREI /.test(U.ledger())); U.aus();
});
await t('Seite erst beim zweiten Versuch erreichbar → veröffentlicht', async () => {
  let k = 0; const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, status: () => (++k < 2 ? 503 : 200) });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.OK); assert.equal(U.S.p.a.status, 'ACTIVE'); U.aus();
});
await t('publishablePublish mit Fehler → zurück auf ENTWURF, keine Kanäle', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, fehler: { publish: true } });
  const r = await lauf(U.cfg, U.io); assert.equal(U.S.p.a.status, 'DRAFT'); assert.deepEqual(U.S.p.a.pubs, []); assert.equal(r.exit, EXIT.SCHREIBEN); U.aus();
});
await t('Rücknahme scheitert → Exit 6, Lauf endet (kein weiteres Produkt)', async () => {
  const U = umgebung({ produkte: [produkt('a'), produkt('b')], plan: { freigeben: [{ handle: 'a' }, { handle: 'b' }], halten: [] }, live: true, freigeben: true, status: 500,
    fehler: { produkt: p => p.status === 'DRAFT' } });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.ZURUECK); assert.equal(U.S.p.b.status, 'DRAFT'); assert.equal(r.zaehl.ZURUECK_FEHLGESCHLAGEN, 1); assert.match(U.ledger(), /ZURUECK_FEHLGESCHLAGEN/); U.aus();
});
await t('Tor blockiert → Exit 3, nichts geschrieben, nichts veröffentlicht', async () => {
  const p = produkt('a'); p.descriptionHtml = '<p>ohne Marker</p>';
  const U = umgebung({ produkte: [p], plan: { freigeben: [{ handle: 'a' }], halten: [] }, live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.TOR); assert.equal(U.S.schreib.length, 0); assert.ok(U.zeilen.some(z => /BLOCKIERT a: .*Fliesstext/.test(z))); U.aus();
});
await t('Tor nach dem Aufbereiten blockiert (Bild zu klein) → nichts veröffentlicht, Aufbereitung bleibt', async () => {
  const p = produkt('a'); p.media.nodes[1].image.width = 300;
  const U = umgebung({ produkte: [p], plan: PLAN1('a'), live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.TOR); assert.equal(U.S.p.a.status, 'DRAFT'); assert.ok(!U.S.schreib.some(s => s[0] === 'publish')); U.aus();
});
await t('SKU gehört auch einem anderen Produkt → blockiert', async () => {
  const a = produkt('a'), b = produkt('b'); b.variants.nodes[0].sku = a.variants.nodes[0].sku;
  const U = umgebung({ produkte: [a, b], plan: { freigeben: [{ handle: 'a' }], halten: [] }, live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.TOR); assert.equal(U.S.p.a.status, 'DRAFT'); assert.ok(U.zeilen.some(z => /SKU gehört auch b/.test(z))); U.aus();
});
await t('Höchstens FREIGEBEN_MAX je Lauf: das sechste Produkt wird zurückgestellt', async () => {
  const ps = ['a', 'b', 'c', 'd', 'e', 'f'].map(h => produkt(h));
  const U = umgebung({ produkte: ps, plan: { freigeben: ps.map(p => ({ handle: p.handle })), halten: [] }, live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.OK); assert.equal(r.zaehl.VEROEFFENTLICHT, 5); assert.equal(r.zaehl.ZURUECKGESTELLT, 1); assert.equal(U.S.p.f.status, 'DRAFT');
  assert.equal(Object.values(U.S.p).filter(p => p.status === 'ACTIVE').length, 5); U.aus();
});
await t('halten: nur die Tags ändern sich (text-offen → grind-gehalten-0911), Status bleibt ENTWURF, Sicherung da', async () => {
  const U = umgebung({ produkte: [produkt('h')], plan: { freigeben: [], halten: [{ handle: 'h', grund: 'Bilder mit Fremdlogo' }] }, live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); const p = U.S.p.h;
  assert.equal(r.exit, EXIT.OK); assert.ok(!p.tags.includes(TAG_OFFEN)); assert.ok(p.tags.includes(TAG_GEHALTEN)); assert.equal(p.status, 'DRAFT'); assert.equal(p.title, 'Titel h'); assert.deepEqual(p.pubs, []);
  assert.equal(U.S.schreib.length, 1); assert.deepEqual(Object.keys(U.S.schreib[0][1]).sort(), ['id', 'tags']); assert.ok(JSON.parse(readFileSync(U.cfg.sicherung, 'utf8')).h); U.aus();
});
await t('halten im Trockenlauf schreibt nichts', async () => {
  const U = umgebung({ produkte: [produkt('h')], plan: { freigeben: [], halten: [{ handle: 'h', grund: 'x' }] } }); const r = await lauf(U.cfg, U.io);
  assert.equal(r.exit, EXIT.OK); assert.equal(U.S.schreib.length, 0); assert.equal(r.zaehl.WUERDE_HALTEN, 1); U.aus();
});
await t('halten fasst ein bereits aktives Produkt nie an', async () => {
  const U = umgebung({ produkte: [produkt('h', { status: 'ACTIVE' })], plan: { freigeben: [], halten: [{ handle: 'h', grund: 'x' }] }, live: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.TOR); assert.equal(U.S.schreib.length, 0); U.aus();
});
await t('Schreibfehler bei productUpdate → Exit 4, Produkt bleibt ENTWURF', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, fehler: { produkt: () => true } });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.SCHREIBEN); assert.equal(U.S.p.a.status, 'DRAFT'); assert.ok(!U.S.schreib.some(s => s[0] === 'publish')); U.aus();
});
await t('Unbekannter Optionswert im Plan → Fehler dieses Produkts, nichts geschrieben', async () => {
  const pl = PLAN1('a'); pl.freigeben[0].optionen = { Grösse: { '99MM': '99 mm' } };
  const U = umgebung({ produkte: [produkt('a')], plan: pl, live: true }); const r = await lauf(U.cfg, U.io);
  assert.equal(r.exit, EXIT.SCHREIBEN); assert.equal(U.S.schreib.length, 0); U.aus();
});
await t('Ein Fehler bei einem Produkt hält die übrigen nicht auf', async () => {
  const pl = { freigeben: [{ handle: 'a', optionen: { Grösse: { '99MM': 'x' } } }, { handle: 'b' }], halten: [] };
  const U = umgebung({ produkte: [produkt('a'), produkt('b')], plan: pl, live: true, freigeben: true }); const r = await lauf(U.cfg, U.io);
  assert.equal(r.exit, EXIT.SCHREIBEN); assert.equal(U.S.p.b.status, 'ACTIVE'); assert.equal(U.S.p.a.status, 'DRAFT'); U.aus();
});
await t('Rücknahme stellt Titel, SEO, Tags, Beschreibung, Optionswerte, Bildreihenfolge wieder her und setzt auf ENTWURF', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true });
  await lauf(U.cfg, U.io); assert.equal(U.S.p.a.status, 'ACTIVE');
  const orig = produkt('a'); U.cfg.zurueck = true; U.cfg.freigeben = false;
  const r = await lauf(U.cfg, U.io); const p = U.S.p.a;
  assert.equal(r.exit, EXIT.OK, U.zeilen.join('|')); assert.equal(p.status, 'DRAFT'); assert.equal(p.title, orig.title); assert.deepEqual(sortiert(p.tags), sortiert(orig.tags)); assert.equal(p.descriptionHtml, orig.descriptionHtml);
  assert.deepEqual(p.seo, orig.seo); assert.deepEqual(p.options[0].optionValues.map(v => v.name), ['16MM', '10MM']); assert.equal(p.media.nodes[0].id, 'm1-a'); U.aus();
});
await t('Rücknahme im Trockenlauf schreibt nichts', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true }); await lauf(U.cfg, U.io); const vorher = U.S.schreib.length;
  U.cfg.zurueck = true; U.cfg.live = false; const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.OK); assert.equal(U.S.schreib.length, vorher); assert.equal(U.S.p.a.title, 'Neuer Titel'); U.aus();
});
await t('Ohne Plan-Fehler, aber kaputter Plan: Exit 2 und nichts geschrieben', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: { freigeben: [{ handle: 'a' }], halten: [{ handle: 'a', grund: 'x' }] }, live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.PLAN); assert.equal(U.S.schreib.length, 0); U.aus();
});
await t('Produkt nicht gefunden → Fehler dieses Produkts, Lauf geht weiter', async () => {
  const U = umgebung({ produkte: [produkt('b')], plan: { freigeben: [{ handle: 'gibtsnicht' }, { handle: 'b' }], halten: [] }, live: true, freigeben: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.SCHREIBEN); assert.equal(U.S.p.b.status, 'ACTIVE'); U.aus();
});

await t('Notbremse: Datei verschwindet VOR dem Aktivieren → Exit 5, Produkt bleibt ENTWURF, nichts veröffentlicht', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, beiSkuDatei: true });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.FREIGABE, U.zeilen.join('|')); assert.equal(U.S.p.a.status, 'DRAFT');
  assert.ok(!U.S.schreib.some(s => s[0] === 'publish' || (s[0] === 'productUpdate' && s[1].status === 'ACTIVE'))); assert.equal(U.aufrufe.length, 0); U.aus();
});
await t('Kanäle nur teilweise veröffentlicht (Rücklesen) → zurück auf ENTWURF', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, teilweise: true });
  const r = await lauf(U.cfg, U.io); assert.equal(U.S.p.a.status, 'DRAFT'); assert.equal(r.exit, EXIT.SCHREIBEN); assert.match(U.ledger(), /ZURUECK · Freigabe gescheitert: 2 Kanäle nicht veröffentlicht/); assert.equal(U.aufrufe.length, 0); U.aus();
});
await t('Rücklesen nach dem Aufbereiten: ein still ignoriertes Feld wird als ABWEICHUNG gemeldet (Exit 4)', async () => {
  const U = umgebung({ produkte: [produkt('a')], plan: PLAN1('a'), live: true, freigeben: true, ignoriere: ['title'] });
  const r = await lauf(U.cfg, U.io); assert.equal(r.exit, EXIT.SCHREIBEN); assert.ok(U.zeilen.some(z => /ABWEICHUNG beim Rücklesen: .*Titel/.test(z)), U.zeilen.join('|')); assert.equal(U.S.p.a.status, 'DRAFT'); assert.ok(!U.S.schreib.some(s => s[0] === 'publish')); U.aus();
});

await t('Langer Titel: Shopify speichert den SEO-Titel leer → keine ABWEICHUNG, zweiter Lauf schreibt kein SEO', async () => {
  const lang = 'Katzentunnel aus Filz, verformbar und zusammenrollbar';
  const plan = { freigeben: [{ handle: 'a', titel: lang }], halten: [] };
  const U = umgebung({ produkte: [produkt('a')], plan, live: true, seoWieShopify: true });
  const r = await lauf(U.cfg, U.io); const p = U.S.p.a;
  assert.equal(r.exit, EXIT.OK, U.zeilen.join('|')); assert.equal(p.title, lang); assert.equal(p.seo.title, null);
  assert.ok(!U.zeilen.some(z => /ABWEICHUNG/.test(z)), U.zeilen.join('|')); assert.equal(r.zaehl.AUFBEREITET, 1);
  const vorher = U.S.schreib.length; const r2 = await lauf(U.cfg, U.io);
  assert.equal(r2.exit, EXIT.OK, U.zeilen.join('|')); assert.ok(!U.S.schreib.slice(vorher).some(s => s[0] === 'productUpdate'), JSON.stringify(U.S.schreib.slice(vorher))); U.aus();
});

console.log(`grind_freigabe_test: ${n} ok${bad ? `, ${bad} FEHLER` : ''}`);
process.exit(bad ? 1 : 0);
