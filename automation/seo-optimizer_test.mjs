// seo-optimizer_test.mjs — Tests für seo-optimizer.mjs v2 (19.10.2026), offline: Fake-Shop im Speicher + Fake-fetch per --import, env nur mit PATH.
// Lauf: /opt/node22/bin/node automation/seo-optimizer_test.mjs        (node:test; Exit 1 bei einem Fehler)
// Idee aus Codex-PR #2694 (Fake-fetch-Tests, 22/22 grün), dort ohne die Fehler-Kanarien: der Fake-Shop unten NULLT wie Shopify — ein Teil-seo-Objekt
// setzt das ausgelassene Feld auf null —, damit ein Mock-Test den Fehler sieht (Codex' Mocks sahen ihn nicht). Prozess-Tests: lib/fake_fetch_preload.mjs.
// Alle Schlüssel, Token und Produkte sind ERFUNDEN. Jeder Lauf prüft nebenbei: kein Schlüssel in der Ausgabe, Schlüssel nur an den Shop-Host.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { wegwerfOrdner, lauf as prozess } from './lib/fake_fetch_lauf.mjs';
import { main, konfig, mkSeo, seoBasis, bewerte, ergaenze, sperreLaden, clientSecret, hostOk, meldung, zeilenText,
  EXPECTED_SHOP, Q_SCAN, Q_SCAN_ZEILE, Q_EIN, M_UPDATE, LIMIT_STANDARD } from './seo-optimizer.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url)), SKRIPT = path.join(HIER, 'seo-optimizer.mjs');
const GEHEIM = 'shpss_ERFUNDEN_0123456789abcdef', TOKEN = 'tok_ERFUNDEN_zzz', TG = 'tg_ERFUNDEN_bot123', CID = 'cid-ERFUNDEN';
const SHOP = { name: 'LuxeStyle', myshopifyDomain: EXPECTED_SHOP, currencyCode: 'CHF', primaryDomain: { host: 'luxestyle.ch' } };
const BESCHR = ' Eigene Beschreibung «Kuschel-Hoodie» – mit Fell & Kordel…  ';       // Leerraum an beiden Enden + Sonderzeichen: muss BYTEGLEICH bleiben
const TITEL = ' Eigener SEO-Titel «Cosy» | Marke\t';
const nr = n => `gid://shopify/Product/${15000000000000 + n}`;
const pr = (n, st = null, sd = null, extra = {}) => ({ id: nr(n), handle: `produkt-${n}`, title: `Relaxed-Fit Hoodie «Modell ${n}» – mit Fell-Panel`, status: 'ACTIVE',
  seo: { title: st, description: sd }, media: { nodes: [{ status: 'READY' }] }, ...extra });
const viele = (k, ab = 1) => Array.from({ length: k }, (_, i) => pr(ab + i, null, BESCHR));
const res = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const frei = () => ({ ok: true, aktiv: false, ids: new Set(), handles: new Set() });
const gesperrtMit = (ids = [], handles = []) => () => ({ ok: true, aktiv: true, ende: '2026-10-24', ids: new Set(ids.map(x => String(x).split('/').pop())), handles: new Set(handles) });

/** Fake-Shop im Speicher. haken({art,nr,vars,store}) darf eine Response liefern / werfen / den Speicher ändern (undefined = Standardantwort). */
function shopFake(produkte, { shop = SHOP, haken } = {}) {
  const store = new Map(produkte.map(p => [p.id, structuredClone(p)])), calls = [], zaehl = {};
  async function fetchFn(url, o = {}) {
    const u = new URL(url), body = o.body ? JSON.parse(o.body) : {};
    if (u.hostname === 'api.telegram.org') { calls.push({ art: 'telegram', url, body }); return res({ ok: true }); }
    if (u.host !== EXPECTED_SHOP) throw new Error('FAKE: Anfrage an fremden Host ' + u.host);
    if (u.pathname === '/admin/oauth/access_token') {
      calls.push({ art: 'oauth', body });
      const h = haken?.({ art: 'oauth', nr: 1, vars: body, store }); if (h !== undefined) return h;
      return res({ access_token: TOKEN });
    }
    assert.equal(o.headers['X-Shopify-Access-Token'], TOKEN, 'GraphQL-Anfrage ohne den erwarteten Token');
    assert.ok(!JSON.stringify(body).includes(GEHEIM) && !JSON.stringify(body).includes(TOKEN), 'Schlüssel im GraphQL-Body');
    const q = body.query, art = q === Q_SCAN || q === Q_SCAN_ZEILE ? 'scan' : q === Q_EIN ? 'ein' : q === M_UPDATE ? 'mutation' : 'unbekannt';
    zaehl[art] = (zaehl[art] ?? 0) + 1;
    calls.push({ art, nr: zaehl[art], vars: structuredClone(body.variables), zeile: q === Q_SCAN_ZEILE });
    const h = haken?.({ art, nr: zaehl[art], vars: body.variables, store }); if (h !== undefined) return h;
    if (art === 'scan') {
      const liste = [...store.values()].filter(p => p.status === 'ACTIVE'), start = body.variables.after ? Number(body.variables.after) : 0, n = body.variables.n;
      const nodes = liste.slice(start, start + n).map(p => { const c = structuredClone(p); if (q === Q_SCAN_ZEILE) delete c.media; return c; });
      return res({ data: { shop: structuredClone(shop), products: { pageInfo: { hasNextPage: start + n < liste.length, endCursor: String(start + n) }, nodes } } });
    }
    if (art === 'ein') return res({ data: { shop: structuredClone(shop), nodes: body.variables.ids.map(i => structuredClone(store.get(i) ?? null)) } });
    if (art === 'mutation') {
      const { id, seo } = body.variables.product, p = store.get(id);
      // Shopify-Semantik (GEMESSEN 19.10.): ein Teil-seo-Objekt setzt das ausgelassene Feld auf null
      p.seo = { title: Object.hasOwn(seo, 'title') ? seo.title : null, description: Object.hasOwn(seo, 'description') ? seo.description : null };
      return res({ data: { productUpdate: { product: { id }, userErrors: [] } } });
    }
    throw new Error('FAKE: unbekannte Anfrage');
  }
  return { fetchFn, store, calls, art: a => calls.filter(c => c.art === a), mutationen: () => calls.filter(c => c.art === 'mutation') };
}
const ENV = { SHOPIFY_SHOP: EXPECTED_SHOP, SHOPIFY_CLIENT_ID: CID, SHOPIFY_CLIENT_SECRET: GEHEIM };
/** Führt main() im Prozess aus; prüft in JEDEM Lauf, dass kein Schlüssel in Ausgabe oder Fehlerausgabe steht. */
async function fahre(env, fake, { argv = [], sperre = frei } = {}) {
  const out = [], err = [];
  const code = await main(argv, { ...ENV, ...env }, { fetchFn: fake.fetchFn, warte: async () => {}, log: s => out.push(String(s)), err: s => err.push(String(s)), sperre });
  const alles = out.join('\n') + '\n' + err.join('\n');
  for (const g of [GEHEIM, TOKEN, TG]) assert.ok(!alles.includes(g), 'Schlüssel in der Ausgabe: ' + g.slice(0, 6));
  return { code, out: out.join('\n'), err: err.join('\n'), alles };
}
const seoVon = (fake, n) => fake.store.get(nr(n)).seo;

// ── 1 Der Kern: beide Felder, vorhandenes bytegleich ───────────────────────────────────────────────────────────
test('KANARIE Teilschreiben: Titel leer + Beschreibung vorhanden → Mutation trägt BEIDE Felder, Beschreibung bytegleich, im Shop nichts genullt', async () => {
  const fake = shopFake([pr(1, null, BESCHR), pr(2, TITEL, ''), pr(3, null, null), pr(4, '   ', BESCHR)]);
  const r = await fahre({}, fake);
  assert.equal(r.code, 0, r.alles);
  assert.equal(fake.mutationen().length, 4);
  for (const m of fake.mutationen()) assert.deepEqual(Object.keys(m.vars.product.seo).sort(), ['description', 'title'], 'Teil-seo-Objekt gesendet');
  assert.equal(seoVon(fake, 1).description, BESCHR);                                         // vorhanden → bytegleich (auch mit Leerraum)
  assert.match(seoVon(fake, 1).title, /^Relaxed-Fit Hoodie «Modell 1» – mit Fell-Panel \| LuxeStyle( CH)?$/);
  assert.equal(seoVon(fake, 2).title, TITEL);                                                // Titel vorhanden → bytegleich
  assert.ok(seoVon(fake, 2).description.length > 0 && seoVon(fake, 2).description !== '');   // war leer → ergänzt
  assert.ok(seoVon(fake, 3).title && seoVon(fake, 3).description);                           // beide leer → beide aus der Vorlage
  assert.equal(seoVon(fake, 4).description, BESCHR);                                         // Leerraum-Titel gilt als leer
  assert.match(r.out, /4 SEO gefüllt/);
});
test('Gegenprobe des Kanarienvogels: der Fake-Shop nullt wie Shopify — ein Teil-seo-Objekt würde den Test brechen', async () => {
  const fake = shopFake([pr(1, null, BESCHR)]);
  await fake.fetchFn(`https://${EXPECTED_SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query: M_UPDATE, variables: { product: { id: nr(1), seo: { title: 'Nur Titel' } } } }) });
  assert.equal(seoVon(fake, 1).description, null);
});
test('Produkte mit bekannter SEO werden nicht angefasst und nicht als Lücke gezählt', async () => {
  const fake = shopFake([pr(1, 'Titel A', 'Beschreibung A'), pr(2, null, BESCHR), pr(3, 'Titel C', 'Beschreibung C')]);
  const r = await fahre({}, fake, { argv: ['--zeile'] });
  assert.match(r.out, /^SEO-LÜCKEN: 3 aktive gelesen · Titel leer 1 · Beschreibung leer 0 \(beide 0\) · davon Werbetest-gesperrt 0$/);
  assert.equal(fake.mutationen().length, 0);
});

// ── 2 LIMIT bleibt der Massen-Schalter ──────────────────────────────────────────────────────────────────────────
test('LIMIT=5000 füllt mehr als 120 (und mehr als 6) Produkte über mehrere Seiten; Standard 120; LIMIT=7 genau 7', async () => {
  let fake = shopFake(viele(130));
  assert.equal((await fahre({ LIMIT: '5000' }, fake)).code, 0);
  assert.equal(fake.mutationen().length, 130); assert.ok(fake.art('scan').length >= 2, 'Seitenwechsel');
  fake = shopFake(viele(130));
  assert.equal((await fahre({}, fake)).code, 0);
  assert.equal(fake.mutationen().length, LIMIT_STANDARD);
  fake = shopFake(viele(30));
  assert.equal((await fahre({ LIMIT: '7' }, fake)).code, 0);
  assert.equal(fake.mutationen().length, 7);
});
test('LIMIT ungültig (abc, 0, 3oops, -5, 1.5) → Exit 2 ohne eine Netzanfrage (früher: NaN = unbegrenzt)', async () => {
  for (const l of ['abc', '0', '3oops', '-5', '1.5', '9999999999']) {
    const fake = shopFake(viele(3)), r = await fahre({ LIMIT: l }, fake);
    assert.equal(r.code, 2, l); assert.equal(fake.calls.length, 0, l);
  }
});
test('Übersprungenes (gesperrt, geändert) verbraucht das LIMIT nicht', async () => {
  const fake = shopFake(viele(5));
  const r = await fahre({ LIMIT: '2' }, fake, { sperre: gesperrtMit([nr(1), nr(2)]) });
  assert.equal(r.code, 0); assert.equal(fake.mutationen().length, 2);
  assert.deepEqual(fake.mutationen().map(m => m.vars.product.id), [nr(3), nr(4)]);
});

// ── 2b Reihenfolge/Filter (SORT, REVERSE, PQUERY — der dokumentierte Massenlauf von main) ───────────────────────────────────
test('SORT/REVERSE/PQUERY: Standard = älteste zuerst (gemessen 11× schneller zu den Lücken); der dokumentierte Aufruf `SORT=CREATED_AT REVERSE=0` ist identisch', async () => {
  let fake = shopFake(viele(2)); await fahre({}, fake);
  assert.deepEqual([fake.art('scan')[0].vars.s, fake.art('scan')[0].vars.r, fake.art('scan')[0].vars.q], ['CREATED_AT', false, 'status:active']);
  fake = shopFake(viele(2)); await fahre({ LIMIT: '5000', SORT: 'CREATED_AT', REVERSE: '0' }, fake);
  assert.deepEqual([fake.art('scan')[0].vars.s, fake.art('scan')[0].vars.r], ['CREATED_AT', false]); assert.equal(fake.mutationen().length, 2);
  fake = shopFake(viele(2)); const r = await fahre({ SORT: 'updated_at', REVERSE: '1', PQUERY: 'tag:gadgets' }, fake);
  assert.deepEqual([fake.art('scan')[0].vars.s, fake.art('scan')[0].vars.r, fake.art('scan')[0].vars.q], ['UPDATED_AT', true, 'status:active AND (tag:gadgets)']);
  assert.match(r.out, /\(status:active AND \(tag:gadgets\), UPDATED_AT\)/);
  fake = shopFake(viele(1)); await fahre({ PQUERY: 'status:active AND tag:gadgets' }, fake);
  assert.equal(fake.art('scan')[0].vars.q, 'status:active AND tag:gadgets');
});
test('SORT/REVERSE/PQUERY ungültig → Exit 2 ohne Netzanfrage; ein Nicht-ACTIVE-Treffer (z. B. wegen eigener PQUERY) wird nie geschrieben', async () => {
  for (const env of [{ SORT: 'PRICE' }, { REVERSE: 'vielleicht' }, { PQUERY: 'x'.repeat(301) }, { PQUERY: 'tag:a\nb' }]) {
    const fake = shopFake(viele(1)), r = await fahre(env, fake);
    assert.equal(r.code, 2, JSON.stringify(env)); assert.equal(fake.calls.length, 0);
  }
  const fake = shopFake([pr(1, null, BESCHR)], { haken: ({ art, store }) => { if (art === 'scan') return res({ data: { shop: SHOP, products: { pageInfo: { hasNextPage: false, endCursor: null },
    nodes: [pr(8, null, BESCHR, { status: 'DRAFT' }), pr(9, null, BESCHR, { status: 'ARCHIVED' }), structuredClone(store.get(nr(1)))] } } }); } });
  const r = await fahre({}, fake);
  assert.equal(r.code, 0); assert.deepEqual(fake.mutationen().map(m => m.vars.product.id), [nr(1)]);
  const r2 = await fahre({ DRY_RUN: '1' }, fake);                                               // auch der Trockenlauf zählt nur ACTIVE
  assert.match(r2.out, /\(DRY\)/); assert.doesNotMatch(r2.out, /würde SEO setzen: .*Modell [89]/);
});

// ── 3 DRY_RUN ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('DRY_RUN=1 / true → 0 Mutationen, 0 Gegenproben, Meldung «(DRY)», Exit 0; unbekannter Wert → Exit 2 ohne Netz', async () => {
  for (const v of ['1', 'true', 'JA']) {
    const fake = shopFake(viele(3)), r = await fahre({ DRY_RUN: v }, fake);
    assert.equal(r.code, 0, v); assert.equal(fake.mutationen().length, 0); assert.equal(fake.art('ein').length, 0);
    assert.match(r.out, /würde SEO setzen/); assert.match(r.out, /3 SEO \(DRY\)/);
    for (const p of fake.store.values()) assert.equal(p.seo.title, null);
  }
  const fake = shopFake(viele(1)), r = await fahre({ DRY_RUN: 'yes' }, fake);
  assert.equal(r.code, 2); assert.equal(fake.calls.length, 0);
  for (const v of ['0', 'false', '']) { const f = shopFake(viele(1)); assert.equal((await fahre({ DRY_RUN: v }, f)).code, 0); assert.equal(f.mutationen().length, 1, 'DRY_RUN=' + v + ' = live'); }
});

// ── 4 Host + Identität ────────────────────────────────────────────────────────────────────────────────────────────────
test('Host: kein *.myshopify.com-Host, fremder Shop-Host, Anhang/Zeilenumbruch → Exit 2, 0 Netzanfragen, Wert nie in der Ausgabe', async () => {
  for (const h of ['evil.example.com', 'evil.myshopify.com.evil.com', 'other-shop.myshopify.com', 'https://au3j0y-hq.myshopify.com', `${EXPECTED_SHOP}/`, `${EXPECTED_SHOP}\n x`,
    'user@au3j0y-hq.myshopify.com', 'AU3J0Y-HQ.myshopify.com', `${GEHEIM}`, 'x'.repeat(300)]) {
    const fake = shopFake(viele(1)), r = await fahre({ SHOPIFY_SHOP: h }, fake);
    assert.equal(r.code, 2, JSON.stringify(h)); assert.equal(fake.calls.length, 0, 'Netzanfrage trotz falschem Host: ' + JSON.stringify(h));
    assert.ok(!r.alles.includes(h.trim()) || h.trim() === '', 'Host-Wert in der Ausgabe: ' + h);
  }
  assert.equal(hostOk(EXPECTED_SHOP), true); assert.equal(hostOk(`${EXPECTED_SHOP}\n`), false);
});
test('Identität falsch (Name, Domain, primäre Domain, Währung) → 0 Mutationen, Exit 1, Meldung nennt die Identität', async () => {
  for (const abw of [{ name: 'AndererShop' }, { myshopifyDomain: 'anders.myshopify.com' }, { primaryDomain: { host: 'anders.example' } }, { currencyCode: 'EUR' }, { primaryDomain: null }]) {
    const fake = shopFake(viele(2), { shop: { ...SHOP, ...abw } }), r = await fahre({}, fake);
    assert.equal(r.code, 1, JSON.stringify(abw)); assert.equal(fake.mutationen().length, 0); assert.match(r.out, /Shop-Identität nicht bestätigt/);
    assert.equal(fake.art('ein').length, 0, 'es wurde nicht einmal gegengeprüft');
  }
});
test('Identität kippt mitten im Lauf (zweite Gegenprobe) → Stopp, nur das erste Produkt geschrieben', async () => {
  const fake = shopFake(viele(3), { haken: ({ art, nr: n }) => art === 'ein' && n === 3 ? res({ data: { shop: { ...SHOP, currencyCode: 'USD' }, nodes: [null] } }) : undefined });
  const r = await fahre({}, fake);
  assert.equal(r.code, 1); assert.equal(fake.mutationen().length, 1);                        // Ein-Aufrufe: 1 Gegenprobe, 2 Rücklesen, 3 Gegenprobe des 2. Produkts
  assert.match(r.out, /Gegenprobe: Shop-Identität nicht bestätigt/);
});

// ── 5 Gegenprobe pro Schreibvorgang ───────────────────────────────────────────────────────────────────────────────────
test('Produkt zwischen Lesen und Schreiben geändert (Titel, SEO, Status, gelöscht) → übersprungen ohne Mutation, die anderen laufen weiter', async () => {
  const aender = {
    Titel: p => { p.title = 'Jemand hat umbenannt'; }, SEO: p => { p.seo.title = 'Jemand war schneller'; }, Beschreibung: p => { p.seo.description = 'Anders'; },
    Status: p => { p.status = 'DRAFT'; }, gelöscht: (p, store) => { store.delete(p.id); },
  };
  for (const [name, f] of Object.entries(aender)) {
    const fake = shopFake(viele(3), { haken: ({ art, nr: n, store }) => { if (art === 'ein' && n === 1) f(store.get(nr(1)), store); } });
    const r = await fahre({}, fake);
    assert.equal(r.code, 0, name + r.alles);
    assert.ok(!fake.mutationen().some(m => m.vars.product.id === nr(1)), name + ': trotz Änderung geschrieben');
    assert.equal(fake.mutationen().length, 2, name); assert.match(r.out, /1 geändert übersprungen/, name);
  }
});

// ── 6 Werbetest-Sperre ───────────────────────────────────────────────────────────────────────────────────────────────
test('Werbetest-Sperre: gesperrte Produkte (ID und Handle) werden nicht geschrieben, Zähler stimmt, Rest läuft', async () => {
  const fake = shopFake([pr(1, null, BESCHR), pr(2, null, BESCHR), pr(3, null, BESCHR)]);
  const r = await fahre({}, fake, { sperre: gesperrtMit([15000000000001], ['produkt-2']) });
  assert.equal(r.code, 0); assert.deepEqual(fake.mutationen().map(m => m.vars.product.id), [nr(3)]);
  assert.match(r.out, /2 Werbetest-gesperrt/);
  assert.equal(seoVon(fake, 1).title, null); assert.equal(seoVon(fake, 2).title, null);      // unberührt
});
test('Werbetest-Sperre wird auch bei der Gegenprobe geprüft (Handle ändert sich zwischen Lesen und Schreiben)', async () => {
  const fake = shopFake(viele(2), { haken: ({ art, nr: n, store }) => { if (art === 'ein' && n === 1) store.get(nr(1)).handle = 'sperr-handle'; } });
  const r = await fahre({}, fake, { sperre: gesperrtMit([], ['sperr-handle']) });
  assert.equal(r.code, 0); assert.deepEqual(fake.mutationen().map(m => m.vars.product.id), [nr(2)]);
});
test('Werbetest-Sperre fail-closed: Datei fehlt / Kopf kaputt / Sperre aktiv ohne IDs → scharf: Exit 1, 0 Mutationen und kein Scan; DRY: Exit 1, aber gelesen', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sperre-'));
  try {
    const kaputt = path.join(dir, 'kaputt.txt'), leerAktiv = path.join(dir, 'leer.txt');
    fs.writeFileSync(kaputt, '15453601890689 irgendwas\n'); fs.writeFileSync(leerAktiv, '# ende: 2099-12-31\nkein-id-zeile\n');
    for (const datei of [path.join(dir, 'fehlt.txt'), kaputt, leerAktiv]) {
      const sp = () => sperreLaden({ datei, heute: '2026-10-20' });
      assert.equal(sp().ok, false, datei);
      let fake = shopFake(viele(3)), r = await fahre({}, fake, { sperre: sp });
      assert.equal(r.code, 1, datei); assert.equal(fake.mutationen().length, 0); assert.equal(fake.art('scan').length, 0, 'nicht einmal gescannt');
      assert.match(r.out, /nichts wird geschrieben/);
      fake = shopFake(viele(3)); r = await fahre({ DRY_RUN: '1' }, fake, { sperre: sp });
      assert.equal(r.code, 1); assert.equal(fake.mutationen().length, 0); assert.ok(fake.art('scan').length >= 1);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('sperreLaden: aktive Sperre trifft ID/GID/Handle; nach dem Ende frei; abgelaufenes bis:-Datum frei; echte Repo-Datei ist lesbar', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sperre-')), datei = path.join(dir, 's.txt');
  try {
    fs.writeFileSync(datei, '# ende: 2026-10-24\n15453601890689  silberarmband-614500   # Armband\ngid://shopify/Product/15454414111105 uhr-x bis:2026-10-15\n');
    const a = sperreLaden({ datei, heute: '2026-10-14' }), b = sperreLaden({ datei, heute: '2026-10-20' }), c = sperreLaden({ datei, heute: '2026-10-25' });
    assert.ok(a.ok && a.aktiv && a.ids.has('15453601890689') && a.ids.has('15454414111105') && a.handles.has('uhr-x'));
    assert.ok(b.ok && !b.ids.has('15454414111105'), 'bis:-Datum abgelaufen');
    assert.ok(c.ok && !c.aktiv && c.ids.size === 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const echt = sperreLaden();                                  // dropship/_werbetest_sperre.txt: lesbar, mit Kopf (bis 24.10. aktiv mit 13 IDs, danach ok:true/aktiv:false)
  assert.equal(echt.ok, true, echt.grund); if (echt.aktiv) assert.equal(echt.ids.size, 13);
});

// ── 7 Unklares stoppt ──────────────────────────────────────────────────────────────────────────────────────────────────
const unklarFaelle = {
  'GraphQL-Fehler (Scope fehlt)': () => res({ errors: [{ message: 'Access denied for productUpdate field.' }] }),
  'leeres Objekt': () => res({}), 'data ohne userErrors': () => res({ data: { productUpdate: { product: { id: nr(1) } } } }), 'data.productUpdate null': () => res({ data: { productUpdate: null } }),
  'falsche Produkt-ID': () => res({ data: { productUpdate: { product: { id: nr(99) }, userErrors: [] } } }), 'product null': () => res({ data: { productUpdate: { product: null, userErrors: [] } } }),
  'HTTP 500': () => res({ error: 'x' }, 500), 'HTTP 429': () => res({}, 429), 'HTTP 401': () => res({}, 401), 'kein JSON': () => new Response('<html>', { status: 200 }),
  'Netzfehler': () => { throw new TypeError('fetch failed'); },
  'Teilerfolg MIT errors': () => res({ errors: [{ message: 'partial' }], data: { productUpdate: { product: { id: nr(1) }, userErrors: [] } } }),
};
const unklarMeldung = { 'GraphQL-Fehler (Scope fehlt)': /GraphQL-Fehler \(Access denied/, 'Teilerfolg MIT errors': /GraphQL-Fehler \(partial/, 'data ohne userErrors': /ohne productUpdate\/userErrors/,
  'data.productUpdate null': /ohne productUpdate\/userErrors/, 'falsche Produkt-ID': /passender Produkt-ID/, 'product null': /passender Produkt-ID/, 'HTTP 500': /HTTP 500/, 'HTTP 429': /HTTP 429/, 'kein JSON': /kein JSON/, 'Netzfehler': /Netzfehler/ };
test('Unklare Mutationsantwort → Stopp nach GENAU einem Schreibversuch, Exit 1, ::error, kein Retry, die übrigen unberührt', async () => {
  for (const [name, antwort] of Object.entries(unklarFaelle)) {
    const fake = shopFake(viele(3), { haken: ({ art }) => art === 'mutation' ? antwort() : undefined });
    const r = await fahre({}, fake);
    assert.equal(r.code, 1, name); assert.equal(fake.mutationen().length, 1, `${name}: ${fake.mutationen().length} Mutationen`);
    assert.match(r.out, /UNKLAR — Lauf gestoppt \(schreiben/, name); assert.match(r.out, /::error title=seo-optimizer::/);
    assert.doesNotMatch(r.out, /✓ SEO/, name + ': unklar darf nie als ✓ erscheinen');
    if (unklarMeldung[name]) assert.match(r.out, unklarMeldung[name], name + ': Grund fehlt in der Meldung');
    assert.equal(seoVon(fake, 2).title, null, 'zweites Produkt wurde angefasst'); assert.equal(seoVon(fake, 3).title, null);
  }
});
test('Rücklesen bestätigt nicht (Beschreibung weicht ab / Titel / Produkt weg / Lesefehler) → Stopp, Exit 1', async () => {
  const abw = {
    Beschreibung: p => { p.seo.description = 'Jemand anders'; }, Titel: p => { p.title = 'Umbenannt'; }, Status: p => { p.status = 'DRAFT'; },
  };
  for (const [name, f] of Object.entries(abw)) {
    const fake = shopFake(viele(3), { haken: ({ art, nr: n, store }) => { if (art === 'ein' && n === 2) f(store.get(nr(1))); } });
    const r = await fahre({}, fake);
    assert.equal(r.code, 1, name); assert.equal(fake.mutationen().length, 1, name); assert.match(r.out, /Rücklesen bestätigt die Änderung nicht/, name);
  }
  for (const [name, antwort] of Object.entries({ 'HTTP 500 (nach Retries)': () => res({}, 500), 'GraphQL-Fehler': () => res({ errors: [{ message: 'x' }] }), 'Netzfehler': () => { throw new TypeError('fetch failed'); },
    'Produkt null': () => res({ data: { shop: SHOP, nodes: [null] } }) })) {
    const fake = shopFake(viele(3), { haken: ({ art, nr: n }) => art === 'ein' && n >= 2 ? antwort() : undefined });
    const r = await fahre({}, fake);
    assert.equal(r.code, 1, name); assert.equal(fake.mutationen().length, 1, name);
  }
});
test('userErrors = bekannte Ablehnung: zählen, weiter, Exit 1; 5 in Folge → Stopp', async () => {
  let fake = shopFake(viele(3), { haken: ({ art, nr: n, vars }) => art === 'mutation' && n === 1 ? res({ data: { productUpdate: { product: null, userErrors: [{ field: ['seo', 'title'], message: 'Titel zu lang' }] } } }) : undefined });
  let r = await fahre({}, fake);
  assert.equal(r.code, 1); assert.equal(fake.mutationen().length, 3); assert.match(r.out, /1 abgelehnt/); assert.match(r.out, /abgelehnt: .* — Titel zu lang/);
  assert.equal(seoVon(fake, 2).title !== null, true);
  fake = shopFake(viele(9), { haken: ({ art }) => art === 'mutation' ? res({ data: { productUpdate: { product: null, userErrors: [{ message: 'nein' }] } } }) : undefined });
  r = await fahre({}, fake);
  assert.equal(r.code, 1); assert.equal(fake.mutationen().length, 5); assert.match(r.out, /5 Ablehnungen in Folge/);
});
test('GraphQL-THROTTLED bei der Mutation wird (nur dann) wiederholt — Shopify lehnt VOR der Ausführung ab', async () => {
  const fake = shopFake(viele(1), { haken: ({ art, nr: n }) => art === 'mutation' && n === 1 ? res({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] }) : undefined });
  const r = await fahre({}, fake);
  assert.equal(r.code, 0, r.alles); assert.equal(fake.mutationen().length, 2); assert.match(r.out, /1 SEO gefüllt/);
  assert.ok(seoVon(fake, 1).title);
});

// ── 8 Lesefehler sind «unklar», nie «nichts zu tun» ──────────────────────────────────────────────────────────────────────────
test('Scan scheitert (HTTP 500 dauerhaft, GraphQL-Fehler, ohne data, Netz) → Exit 1 «UNKLAR», nie «0 gefüllt» mit Exit 0', async () => {
  for (const [name, antwort] of Object.entries({ 'HTTP 500': () => res({}, 500), 'HTTP 403': () => res({}, 403), 'errors': () => res({ errors: [{ message: 'Unauthorized' }] }),
    'ohne data': () => res({}), 'products null': () => res({ data: { shop: SHOP, products: null } }), 'Netz': () => { throw new TypeError('fetch failed'); } })) {
    const fake = shopFake(viele(3), { haken: ({ art }) => art === 'scan' ? antwort() : undefined });
    const r = await fahre({}, fake);
    assert.equal(r.code, 1, name); assert.match(r.out, /UNKLAR — Lauf gestoppt \(scan/, name); assert.equal(fake.mutationen().length, 0, name);
  }
});
test('Lesen wird bei Netz-/5xx-/THROTTLED-Aussetzern wiederholt (nur Lesen) und gelingt dann', async () => {
  const fake = shopFake(viele(2), { haken: ({ art, nr: n }) => art === 'scan' && n === 1 ? res({}, 503) : art === 'scan' && n === 2 ? res({ errors: [{ message: 'T', extensions: { code: 'THROTTLED' } }] }) : undefined });
  const r = await fahre({}, fake);
  assert.equal(r.code, 0, r.alles); assert.equal(fake.mutationen().length, 2);
});
test('Positiv-Kanarienvogel für «0 Lücken»: ein sauberer Katalog ist Exit 0 und vollständig gelesen; Medien-FAILED und nicht-aktive Treffer werden gemeldet/gezählt', async () => {
  const fake = shopFake([pr(1, 'A', 'B'), pr(2, 'C', 'D', { media: { nodes: [{ status: 'FAILED' }, { status: 'READY' }] } }), pr(3, 'E', 'F', { media: { nodes: [{ status: 'PROCESSING' }] } })]);
  const r = await fahre({}, fake);
  assert.equal(r.code, 0); assert.equal(fake.mutationen().length, 0); assert.match(r.out, /1 Produkt\(e\) mit FAILED-Bild: Relaxed-Fit Hoodie «Modell 2»/);
  const f2 = shopFake([pr(1, null, 'B')], { haken: ({ art, store }) => { if (art === 'scan') { const x = structuredClone(pr(7, 'A', 'B', { status: 'DRAFT' })); return res({ data: { shop: SHOP, products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [x, structuredClone(store.get(nr(1)))] } } }); } } });
  const r2 = await fahre({ DRY_RUN: '1' }, f2);
  assert.equal(r2.code, 0); assert.match(r2.out, /1 SEO \(DRY\)/);
});
test('Produkte mit nicht lesbaren seo-Feldern werden übersprungen und gemeldet (Exit 1), nie als «leer» überschrieben', async () => {
  const komisch = [{ ...pr(1), seo: { title: 5, description: null } }, { ...pr(2), seo: undefined }, { ...pr(3), seo: { title: null } }, pr(4, null, BESCHR)];
  const fake = shopFake(komisch);
  const r = await fahre({}, fake);
  assert.equal(r.code, 1); assert.deepEqual(fake.mutationen().map(m => m.vars.product.id), [nr(4)]); assert.match(r.out, /3 Produkt\(e\) mit nicht lesbaren seo-Feldern/);
});

// ── 9 Zugang, Schalter, Schlüssel ───────────────────────────────────────────────────────────────────────────────────────────
test('Kein Zugang: ohne SHOPIFY_SHOP oder ohne Credentials → No-op (Exit 0, als «UNKLAR» gemeldet), 0 Netzanfragen', async () => {
  for (const env of [{ SHOPIFY_SHOP: '' }, { SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' }, { SHOPIFY_CLIENT_ID: '' }]) {
    const fake = shopFake(viele(1)), r = await fahre(env, fake);
    assert.equal(r.code, 0); assert.equal(fake.calls.length, 0); assert.match(r.out, /UNKLAR: keine Prüfung erfolgt/);
  }
});
test('OAuth abgelehnt (HTTP 401 mit Schlüssel im Antworttext) → Exit 1, nichts gelesen/geschrieben, Schlüssel nie in der Ausgabe; mit statischem Token Rückfall wie früher', async () => {
  let fake = shopFake(viele(1), { haken: ({ art }) => art === 'oauth' ? res({ error: 'invalid_client', echo: GEHEIM }, 401) : undefined });
  let r = await fahre({}, fake);
  assert.equal(r.code, 1); assert.match(r.out, /Auth: OAuth: HTTP 401/); assert.equal(fake.art('scan').length, 0);
  fake = shopFake(viele(1), { haken: ({ art }) => art === 'oauth' ? res({ error: 'x' }, 401) : undefined });
  r = await fahre({ SHOPIFY_ADMIN_TOKEN: TOKEN }, fake);
  assert.equal(r.code, 0, r.alles); assert.equal(fake.mutationen().length, 1); assert.match(r.out, /statischer Token als Rückfall/);
  fake = shopFake(viele(1));
  r = await fahre({ SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '', SHOPIFY_ADMIN_TOKEN: TOKEN }, fake);
  assert.equal(r.code, 0); assert.equal(fake.art('oauth').length, 0); assert.equal(fake.mutationen().length, 1);
});
test('Der Schlüssel geht nur im OAuth-Aufruf an den Shop-Host; der verdorbene Einfügefehler «…=SHOPIFY_CLIENT_SECRET» wird vor dem Senden geheilt', async () => {
  const echt = 'shpss_' + 'ab12cd34'.repeat(4), fake = shopFake(viele(1));
  await fahre({ SHOPIFY_CLIENT_SECRET: echt + '=SHOPIFY_CLIENT_SECRET' }, fake);
  assert.equal(fake.art('oauth')[0].body.client_secret, echt);
  assert.equal(clientSecret(echt + '=SHOPIFY_CLIENT_SECRET'), echt); assert.equal(clientSecret('shpss_kurz=SHOPIFY_CLIENT_SECRET'), 'shpss_kurz=SHOPIFY_CLIENT_SECRET');
  assert.equal(clientSecret('  ' + echt + '\n'), echt); assert.equal(clientSecret(undefined), '');
});
test('Unbekannter Schalter → Exit 2 ohne Lauf (auch --dry, --live, --selbsttets); --help → Exit 0 ohne Lauf', async () => {
  for (const a of [['--dry'], ['--live'], ['--selbsttets'], ['--zeile', '--force'], ['5000']]) {
    const fake = shopFake(viele(1)), r = await fahre({}, fake, { argv: a });
    assert.equal(r.code, 2, a.join(' ')); assert.equal(fake.calls.length, 0); assert.match(r.err, /es wurde nichts ausgeführt/);
  }
  const fake = shopFake(viele(1)), r = await fahre({}, fake, { argv: ['--help'] });
  assert.equal(r.code, 0); assert.equal(fake.calls.length, 0);
});

// ── 10 --zeile ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('--zeile: EINE Zeile, schreibt nie (auch mit DRY_RUN=0), liest ohne Medien, zählt Werbetest-Gesperrte; bei Lesefehler «⚠️ … unklar» und trotzdem Exit 0', async () => {
  const fake = shopFake([pr(1, null, BESCHR), pr(2, 'T', null), pr(3, null, null), pr(4, 'X', 'Y')]);
  const r = await fahre({ DRY_RUN: '0', LIMIT: '1' }, fake, { argv: ['--zeile'], sperre: gesperrtMit([nr(3).split('/').pop()]) });
  assert.equal(r.code, 0); assert.equal(r.out.split('\n').length, 1);
  assert.equal(r.out, 'SEO-LÜCKEN: 4 aktive gelesen · Titel leer 2 · Beschreibung leer 2 (beide 1) · davon Werbetest-gesperrt 1');
  assert.equal(fake.mutationen().length, 0); assert.ok(fake.art('scan').every(c => c.zeile === true && c.vars.n === 250));
  const kaputt = shopFake(viele(2), { haken: ({ art }) => art === 'scan' ? res({}, 500) : undefined });
  const k = await fahre({}, kaputt, { argv: ['--zeile'] });
  assert.equal(k.code, 0); assert.match(k.out, /^⚠️ SEO-LÜCKEN: unklar \(/);
});

// ── 11 Telegram ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('Telegram: Meldung bei Änderungen/Befund wie früher (Schlüssel nur in der URL, nie im Text); ein Zustellfehler ändert das Ergebnis nicht; --zeile sendet nie', async () => {
  let fake = shopFake(viele(2));
  let r = await fahre({ TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: 'chat-1' }, fake);
  const t = fake.art('telegram'); assert.equal(t.length, 1); assert.match(t[0].url, new RegExp(`/bot${TG}/sendMessage$`)); assert.equal(t[0].body.chat_id, 'chat-1');
  assert.match(t[0].body.text, /2 SEO gefüllt/); assert.ok(!t[0].body.text.includes(TG));
  fake = shopFake([pr(1, 'A', 'B')]);
  await fahre({ TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: 'chat-1' }, fake); assert.equal(fake.art('telegram').length, 0, 'nichts zu melden');
  fake = shopFake(viele(1));
  const echtFetch = fake.fetchFn; fake.fetchFn = async (u, o) => { if (String(u).includes('telegram')) throw new TypeError('fetch failed'); return echtFetch(u, o); };
  r = await fahre({ TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: 'chat-1' }, fake); assert.equal(r.code, 0); assert.match(r.out, /Telegram-Meldung nicht zugestellt/);
  fake = shopFake(viele(1)); await fahre({ TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: 'chat-1' }, fake, { argv: ['--zeile'] }); assert.equal(fake.art('telegram').length, 0);
  fake = shopFake(viele(2), { haken: ({ art }) => art === 'mutation' ? res({}) : undefined });
  await fahre({ TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: 'chat-1' }, fake); assert.match(fake.art('telegram')[0].body.text, /UNKLAR — Lauf gestoppt/);
});

// ── 12 Text ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('Text: Bindestrich im Wort bleibt, Trennzeichen werden « – », Marke bleibt erhalten, Grenzen 60/155 gelten für jede Länge', () => {
  assert.equal(seoBasis('Relaxed-Fit Hoodie «Cosy» - mit Fell-Panel · 100 Stück'), 'Relaxed-Fit Hoodie «Cosy» – mit Fell-Panel – 100 Stück');
  assert.equal(seoBasis('T-Shirt—Set'), 'T-Shirt – Set');
  assert.equal(mkSeo('Press-on-Nägel').title, 'Press-on-Nägel | LuxeStyle CH');
  assert.equal(mkSeo('Press-on-Nägel').description, 'Press-on-Nägel bei LuxeStyle – Schweizer Online-Shop, Lieferung in die ganze Schweiz. Jetzt –10% mit Code WELCOME10.');
  for (let n = 1; n <= 260; n += 3) {
    const t = Array.from({ length: Math.ceil(n / 6) }, (_, i) => ['Hoodie', 'mit', 'Fell-Panel', 'für', 'Damen', 'und'][i % 6]).join(' ').slice(0, n), s = mkSeo(t);
    assert.ok(s.title.length <= 60 && s.title.length > 0, `Titel ${n}: ${s.title.length}`); assert.ok(s.description.length <= 155 && s.description.length > 0, `Beschreibung ${n}: ${s.description.length}`);
    if (seoBasis(t).length > 60) assert.doesNotMatch(s.title, /\s(mit|für|und)(?: \| LuxeStyle)?$/i, 'hängendes Bindewort nach dem Kürzen: ' + s.title);   // nur dort wird gekürzt
  }
  const lang = mkSeo('Schwarze Stiefeletten mit Wild-Kunstleder-Oberfläche und Blockabsatz für Damen');
  assert.equal(lang.title, 'Schwarze Stiefeletten | LuxeStyle'); assert.ok(!lang.title.includes('…'));
  assert.equal(mkSeo('Low-Top Herren Sneaker aus synthetischem Kunstleder').title, 'Low-Top Herren Sneaker aus synthetischem Kunstleder');   // 51 Zeichen: ganzer Titel statt abgeschnitten
  const mittel = mkSeo('Mechanische Skelett-Herrenuhr mit Silikonband und Leuchtzeigern für Männer im Retro-Stil');
  assert.ok(mittel.description.endsWith('Lieferung in die ganze Schweiz.') || mittel.description.endsWith('Online-Shop.'), mittel.description);   // Rabattsatz fällt zuerst weg
  assert.equal(mkSeo('').title.length > 0, true);
});
test('bewerte/ergaenze: leer = null oder nur Leerraum; unklar bei falschem Typ; nie ein Teil-Objekt', () => {
  const p = (st, sd) => ({ id: nr(1), title: 'Hoodie', seo: { title: st, description: sd } });
  assert.deepEqual(bewerte(p(null, 'x')), { art: 'luecke', titelLeer: true, beschrLeer: false });
  assert.deepEqual(bewerte(p('\n ', 'x')), { art: 'luecke', titelLeer: true, beschrLeer: false });
  assert.equal(bewerte(p('a', 'b')).art, 'fertig'); assert.equal(bewerte(p(1, 'b')).art, 'unklar'); assert.equal(bewerte({ title: 'x' }).art, 'unklar');
  assert.equal(bewerte({ ...p('a', 'b'), title: '  ' }).art, 'unklar');
  for (const [st, sd] of [[null, 'Beschr'], ['Titel', null], [null, null], ['', ' x ']]) assert.deepEqual(Object.keys(ergaenze(p(st, sd))), ['title', 'description']);
  assert.equal(ergaenze(p('a', 'b')), null);
});
test('Meldungen: erste Zeile wie früher («🔎 SEO-Optimizer: N Produkte gescannt · M SEO gefüllt|(DRY)»), Befund-Zeilen nur bei Befund', () => {
  const rb = { modus: 'live', gescannt: 10, geschrieben: 3, wuerde: 0, gesperrt: 0, geaendert: 0, abgelehnt: 0, gestoppt: null, unklar: [], unklarProdukte: 0, failedBilder: [] };
  assert.equal(meldung(rb).split('\n')[0], '🔎 SEO-Optimizer: 10 Produkte gescannt · 3 SEO gefüllt');
  assert.equal(meldung({ ...rb, modus: 'dry', wuerde: 4 }).split('\n')[0], '🔎 SEO-Optimizer: 10 Produkte gescannt · 4 SEO (DRY)');
  assert.match(zeilenText({ vollstaendig: false, gestoppt: null }, 1), /^⚠️ SEO-LÜCKEN: unklar/);
  assert.match(konfig({}).limit.toString(), /^120$/);
});

// ── 13 Prozess-Tests: das echte Skript, Fake-fetch per --import, env nur mit PATH ───────────────────────────────────────
const PROZ_ENV = { SHOPIFY_SHOP: EXPECTED_SHOP, SHOPIFY_CLIENT_ID: CID, SHOPIFY_CLIENT_SECRET: GEHEIM };
function sperrDatei(dir) { const f = path.join(dir, 'sperre.txt'); fs.writeFileSync(f, '# ende: 2099-12-31\n15999999999999 sperr-handle-x # Test\n'); return f; }
function szenario({ scan, ein, mutation, extra = [] }) {
  const antwort = j => ({ json: j }), seite = nodes => ({ data: { shop: SHOP, products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } });
  const ein2 = nodes => ({ data: { shop: SHOP, nodes } });
  return { hosts: [EXPECTED_SHOP], routes: [
    { name: 'oauth', match: { method: 'POST', path: '/admin/oauth/access_token' }, respond: antwort({ access_token: TOKEN }) },
    { name: 'scan', match: { queryRegex: 'query SeoScan' }, respond: antwort(seite(scan)) },
    { name: 'ein', match: { queryRegex: 'query SeoEin' }, respond: { sequence: ein.map(n => antwort(ein2(n))) } },
    { name: 'mutation', match: { queryRegex: 'mutation SeoUpdate' }, respond: mutation ?? antwort({ data: { productUpdate: { product: { id: nr(1) }, userErrors: [] } } }) }, ...extra ] };
}
const aufruf = (t, sz, env = {}, args = []) => { const dir = wegwerfOrdner(t); return prozess({ dir, skript: SKRIPT, szenario: sz, args, env: { ...PROZ_ENV, WERBETEST_SPERRE: sperrDatei(dir), ...env } }); };

test('Prozess: scharfer Lauf über Fake-fetch — die Mutation auf dem Draht trägt beide Felder, Beschreibung bytegleich, kein Schlüssel in Ausgabe/Protokoll', t => {
  const vorher = pr(1, null, BESCHR), nachher = structuredClone(vorher);
  nachher.seo = { title: mkSeo(vorher.title).title, description: BESCHR };
  const r = aufruf(t, szenario({ scan: [vorher], ein: [[vorher], [nachher]] }));
  assert.equal(r.status, 0, r.roh);
  const m = r.aufrufe.filter(a => a.route === 'mutation'); assert.equal(m.length, 1);
  assert.deepEqual(Object.keys(m[0].variables.product.seo).sort(), ['description', 'title']); assert.equal(m[0].variables.product.seo.description, BESCHR);
  assert.equal(m[0].variables.product.id, nr(1)); assert.match(r.stdout, /✓ SEO Relaxed-Fit Hoodie/); assert.match(r.stdout, /1 SEO gefüllt/);
  assert.deepEqual(r.aufrufe.map(a => a.route), ['oauth', 'scan', 'ein', 'mutation', 'ein']);
  for (const g of [GEHEIM, TOKEN]) assert.ok(!r.roh.includes(g), 'Schlüssel im Protokoll');
  assert.ok(r.aufrufe.every(a => a.host === EXPECTED_SHOP), 'Anfrage an fremden Host');
});
test('Prozess: DRY_RUN=1 → keine Gegenprobe, keine Mutation, Exit 0', t => {
  const r = aufruf(t, szenario({ scan: [pr(1, null, BESCHR)], ein: [[]] }), { DRY_RUN: '1' });
  assert.equal(r.status, 0, r.roh); assert.deepEqual(r.aufrufe.map(a => a.route), ['oauth', 'scan']); assert.match(r.stdout, /1 SEO \(DRY\)/);
});
test('Prozess: unklare Mutationsantwort (Top-Level-Fehler, wie früher als ✓ gezählt) → Exit 1, ein Schreibversuch, kein ✓', t => {
  const v = pr(1, null, BESCHR);
  const r = aufruf(t, szenario({ scan: [v], ein: [[v]], mutation: { json: { errors: [{ message: 'Access denied for productUpdate field.' }] } } }));
  assert.equal(r.status, 1, r.roh); assert.equal(r.aufrufe.filter(a => a.route === 'mutation').length, 1); assert.doesNotMatch(r.stdout, /✓ SEO/); assert.match(r.stdout, /UNKLAR/);
});
test('Prozess: Werbetest-Sperre aus der Datei (WERBETEST_SPERRE) hält das Produkt zurück — 0 Mutationen', t => {
  const v = pr(1, null, BESCHR, { id: 'gid://shopify/Product/15999999999999' });
  const r = aufruf(t, szenario({ scan: [v], ein: [[v]] }));
  assert.equal(r.status, 0, r.roh); assert.equal(r.aufrufe.filter(a => a.route === 'mutation').length, 0); assert.match(r.stdout, /1 Werbetest-gesperrt/);
});
test('Prozess: falscher Host / unbekannter Schalter / LIMIT=abc → Exit 2 und KEINE einzige Netzanfrage; Wert des Hosts nie in der Ausgabe', t => {
  const sz = szenario({ scan: [], ein: [[]] });
  for (const [env, args] of [[{ SHOPIFY_SHOP: 'evil.example.com' }, []], [{}, ['--selbsttets']], [{ LIMIT: 'abc' }, []], [{ DRY_RUN: 'vielleicht' }, []]]) {
    const r = aufruf(t, sz, env, args);
    assert.equal(r.status, 2, JSON.stringify([env, args]) + r.roh); assert.equal(r.aufrufe.length, 0); assert.ok(!r.roh.includes('evil.example.com'));
  }
});
test('Prozess: --selbsttest läuft offline ohne Schlüssel und ohne eine Netzanfrage', t => {
  const r = aufruf(t, { routes: [] }, { SHOPIFY_SHOP: '', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' }, ['--selbsttest']);
  assert.equal(r.status, 0, r.roh); assert.equal(r.aufrufe.length, 0); assert.match(r.stdout, /Selbsttest seo-optimizer\.mjs: (\d+)\/\1\n$/);
  assert.doesNotMatch(r.stdout, /FEHLER/);
});
test('Prozess ohne Fake-fetch-Umgebung: --selbsttest und --help brauchen weder Netz noch Schlüssel (env -i)', () => {
  for (const a of [['--selbsttest'], ['--help']]) {
    const r = spawnSync(process.execPath, [SKRIPT, ...a], { encoding: 'utf8', env: { PATH: process.env.PATH }, timeout: 20000 });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
  const r = spawnSync(process.execPath, [SKRIPT, '--unbekannt'], { encoding: 'utf8', env: { PATH: process.env.PATH }, timeout: 20000 });
  assert.equal(r.status, 2); assert.doesNotMatch(r.stdout, /Selbsttest/);
});
