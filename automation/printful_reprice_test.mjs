// Verhaltenstest für automation/printful_reprice.mjs (Phase 1, 09.11.2026): das Skript läuft in einem KINDPROZESS gegen ein gefälschtes fetch (kein Shopify, kein Printful, kein Netz).
// Geprüft wird, was an Shopify GESCHRIEBEN wird (Preise je Variante, in Stücken zu höchstens 100), dass Produkte mit mehr als 100 Varianten vollständig gelesen werden und dass jeder Fehler beim
// Lesen oder Schreiben (userErrors, GraphQL-Fehler, HTTP 5xx, Drosselung, fehlende Antwort) zu Exit 1 führt und nie als «angepasst» zählt.
// Lauf: /opt/node22/bin/node automation/printful_reprice_test.mjs
import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

// ═════════════════════════════════════════════════════════════ KINDPROZESS: ein Szenario
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.RP_SZENARIO);
  // Die Fixtures setzen die Preise von 25.00 auf 20.90 (eine SENKUNG): damit sie überhaupt geschrieben werden, gilt hier SENKEN=1; die Szenarien «senken: false» prüfen die Vorgabe (nur Erhöhungen).
  Object.assign(process.env, { PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', REPRICE_PAUSE_MS: '0', DRY_RUN: sz.dry ? '1' : '0', TAG: 'wunschdesign', SENKEN: '1' });
  for (const k of ['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'PRINTFUL_STORE_ID', 'AUCH_AUSWAHL', 'MAX']) delete process.env[k];
  if (sz.senken === false) delete process.env.SENKEN;
  if (sz.dryLoeschen) delete process.env.DRY_RUN;
  Object.assign(process.env, sz.env || {});
  const prot = { produktAbfragen: 0, produktVars: [], knotenAbfragen: [], schreib: [], log: [], err: [], printful: [], exitCode: null, mutationVersuche: 0, api: [] };
  const mk = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new Error('kein JSON'); return body; } });
  const node = (id, sku, price) => ({ id, sku, price });
  // Produkte des Szenarios: [{id, handle, title, varianten:[{id, sku, price}]}], die ersten 100 Varianten kommen mit dem Produkt, der Rest über die Knotenabfrage
  const produkte = sz.produkte || [];
  const seite = (liste, n, cursor) => { const von = cursor ? parseInt(String(cursor).slice(1), 10) : 0; const teil = liste.slice(von, von + n); return { pageInfo: { hasNextPage: von + n < liste.length, endCursor: 'c' + (von + n) }, edges: teil.map((node) => ({ node })) }; };
  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.includes('myshopify.com') && url.includes('graphql')) {
      const b = JSON.parse(o.body), q = b.query;
      prot.api.push((/\/admin\/api\/([^/]+)\//.exec(url) || [])[1]);   // die Shopify-API-Version jedes Aufrufs
      if (q.includes('shop {')) return sz.authFehler ? mk(401, {}) : mk(200, { data: { shop: { name: 'x' } } });
      if (q.includes('products(first')) {
        prot.produktAbfragen++; prot.produktVars.push(b.variables);
        if (sz.produktListeFehler === 'errors') return mk(200, { errors: [{ message: 'Access denied' }] });
        if (sz.produktListeFehler === 'leer') return mk(200, { data: { products: null } });
        if (sz.produktListeFehler === 'http500') return mk(500, {});
        const cur = b.variables.cursor; const von = cur ? parseInt(String(cur).slice(1), 10) : 0; const n = sz.produktSeite || 50;
        const teil = produkte.slice(von, von + n);
        // Wie bei Shopify: der Seitenkopf der Varianten kommt nur, wenn die Abfrage ihn verlangt (sonst weiss das Skript nicht, dass es weiterblättern muss)
        const mitSeitenkopf = /variants\(first:100\)\{\s*pageInfo/.test(q);
        return mk(200, { data: { products: { pageInfo: { hasNextPage: von + n < produkte.length, endCursor: 'c' + (von + n) }, edges: teil.map((p) => { const v = seite(p.varianten.map((x) => node(x.id, x.sku, x.price)), 100, null); if (!mitSeitenkopf) delete v.pageInfo; return { node: { id: p.id, handle: p.handle, title: p.title, variants: v } }; }) } } });
      }
      if (q.includes('node(id')) {
        prot.knotenAbfragen.push(b.variables);
        if (sz.knotenFehler === 'errors') return mk(200, { errors: [{ message: 'boom' }] });
        if (sz.knotenFehler === 'leer') return mk(200, { data: { node: null } });
        const p = produkte.find((x) => x.id === b.variables.id);
        return mk(200, { data: { node: { variants: seite(p.varianten.map((v) => node(v.id, v.sku, v.price)), 100, b.variables.cursor) } } });
      }
      if (q.includes('productVariantsBulkUpdate')) {
        prot.mutationVersuche++;
        const f = sz.schreibFehler || {};
        if (f.http && (f.immer || prot.mutationVersuche <= f.http)) return mk(f.status || 500, {});
        if (f.throttled && (f.immer || prot.mutationVersuche <= f.throttled)) return mk(200, { errors: [{ message: 'Throttled' }] });
        if (f.errors) return mk(200, { errors: [{ message: 'Access denied for productVariantsBulkUpdate' }] });
        if (f.leer) return mk(200, { data: {} });
        if (f.user && b.variables.pid === f.user) return mk(200, { data: { productVariantsBulkUpdate: { userErrors: [{ field: ['variants'], message: 'Preis ungültig' }] } } });
        prot.schreib.push({ pid: b.variables.pid, variants: b.variables.variants });
        return mk(200, { data: { productVariantsBulkUpdate: { userErrors: [] } } });
      }
      return mk(200, { data: {} });
    }
    if (url.startsWith('https://api.printful.com/products/variant/')) {
      const vid = url.split('/').pop(); prot.printful.push(vid);
      const preis = sz.kosten && sz.kosten[vid] !== undefined ? sz.kosten[vid] : (sz.kostenStandard === undefined ? '10.00' : sz.kostenStandard);
      if (preis === null) return mk(404, { error: { message: 'nicht da' } });
      return mk(200, { result: { variant: { id: Number(vid), price: preis } } });
    }
    return mk(200, {});
  };
  console.log = (...a) => { prot.log.push(a.join(' ')); };
  console.error = (...a) => { prot.err.push(a.join(' ')); };
  let gesendet = false;
  const melde = () => { if (gesendet) return; gesendet = true; try { writeSync(1, '\nRP_ERGEBNIS ' + JSON.stringify({ ...prot, ausstieg: process.exitCode ?? null }) + '\n'); } catch { /* egal */ } };
  process.on('exit', melde);
  const fertig = new Promise((r) => { const alt = console.log; console.log = (...a) => { alt(...a); if (/^\s*Fertig:/.test(a.join(' '))) r(); }; });
  await import('./printful_reprice.mjs');
  await Promise.race([fertig, new Promise((r) => setTimeout(r, 15000))]);
  await new Promise((r) => setTimeout(r, 30));
  melde();
  process.exit(process.exitCode ?? 0);
}

// ═════════════════════════════════════════════════════════════ PRÜFER
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 700)}\n   soll: ${JSON.stringify(b).slice(0, 700)}`); } };
const lauf = (sz, env = {}) => {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, RP_SZENARIO: JSON.stringify(sz), ...env }, encoding: 'utf8', timeout: 60000 });
  const m = String(r.stdout).match(/RP_ERGEBNIS (.*)\n/);
  if (!m) throw new Error('Kindprozess ohne Ergebnis (Exit ' + r.status + '): ' + String(r.stderr).slice(0, 600) + String(r.stdout).slice(-300));
  return { status: r.status, prot: JSON.parse(m[1]) };
};
/** Produkt mit n Varianten «<Sync>_<Printful-Variante>», alle zu 25.00 CHF (die Kosten 10 USD ergeben den Zielpreis 20.90). */
const produkt = (nr, n, o = {}) => ({ id: `gid://shopify/Product/${nr}`, handle: `p${nr}`, title: `Produkt ${nr}`, varianten: Array.from({ length: n }, (_, i) => ({ id: `gid://shopify/ProductVariant/${nr}${String(i).padStart(4, '0')}`, sku: `111_${1000 + i}`, price: '25.00', ...(o.variante ? o.variante(i) : {}) })) });
const preise = (e) => e.prot.schreib.flatMap((s) => s.variants.map((v) => v.price));
const ids = (e) => e.prot.schreib.flatMap((s) => s.variants.map((v) => v.id));
const zusammenfassung = (e) => e.prot.log.find((l) => /Fertig:/.test(l)) || '';

// 1. Normalfall: ein kleines Produkt, Kosten 10 USD × 0.90 = 9 CHF → max(9×2.3, 9+12) = 21 → 20.90
{
  const e = lauf({ produkte: [produkt(1, 3)] });
  ist('Normalfall: drei Varianten von 25.00 auf 20.90 gesetzt, ein Schreibaufruf, Exit 0, die Schlusszeile nennt 3 Preise und keinen Fehler', [preise(e), e.prot.schreib.length, e.status, /3 Variantenpreise angepasst/.test(zusammenfassung(e)), /0 Fehler/.test(zusammenfassung(e))], [['20.90', '20.90', '20.90'], 1, 0, true, true]);
  ist('Normalfall: Preis schon richtig (20.90) → nichts geschrieben', [lauf({ produkte: [produkt(1, 2, { variante: () => ({ price: '20.90' }) })] }).prot.schreib.length], [0]);
}
// 2. Mehr als 100 Varianten: früher fehlte alles ab der 101. (Abfrage first:100 ohne Weiterblättern)
{
  const e = lauf({ produkte: [produkt(2, 250)] });
  ist('250 Varianten: ALLE 250 werden gelesen (zwei weitere Seiten über die Knotenabfrage) und mit einer Preisänderung geschrieben', [new Set(ids(e)).size, e.prot.knotenAbfragen.length, e.prot.knotenAbfragen.map((v) => v.cursor)], [250, 2, [ 'c100', 'c200' ]]);
  ist('250 Varianten: geschrieben wird in Stücken zu höchstens 100 (100, 100, 50), jede Variante genau einmal', [e.prot.schreib.map((s) => s.variants.length), e.prot.schreib.length, e.status, /250 Variantenpreise angepasst/.test(zusammenfassung(e))], [[100, 100, 50], 3, 0, true]);
  const genau = lauf({ produkte: [produkt(3, 100)] });
  ist('Genau 100 Varianten: keine Knotenabfrage nötig', [genau.prot.knotenAbfragen.length, new Set(ids(genau)).size], [0, 100]);
  const x101 = lauf({ produkte: [produkt(4, 101)] });
  ist('101 Varianten: die 101. wird über die Knotenabfrage gelesen und geschrieben', [x101.prot.knotenAbfragen.length, new Set(ids(x101)).size, ids(x101).includes('gid://shopify/ProductVariant/40100')], [1, 101, true]);
  const trocken = lauf({ dry: true, produkte: [produkt(2, 250)] });
  ist('Trockenlauf mit 250 Varianten: alle werden geprüft (250 Printful-Abfragen, Preise je Variantennummer einmal gemerkt), nichts geschrieben, Exit 0', [trocken.prot.schreib.length, trocken.prot.printful.length, trocken.status, /250 Variantenpreise WÜRDEN angepasst/.test(zusammenfassung(trocken))], [0, 250, 0, true]);
}
// 3. Fehler beim Weiterblättern: das Produkt bleibt unberührt, Exit 1, die anderen Produkte laufen weiter
{
  const e = lauf({ produkte: [produkt(5, 150), produkt(6, 2)], knotenFehler: 'errors' });
  ist('Weiterblättern scheitert (GraphQL-Fehler): Produkt 5 wird NICHT angefasst (auch nicht seine ersten 100), Produkt 6 wird angepasst, Exit 1, Fehlerzeile', [e.prot.schreib.map((s) => s.pid), e.status, e.prot.err.some((l) => /Produkt 5/.test(l) && /weitere Varianten nicht lesbar/.test(l)), /1 Produkte mit Fehler/.test(zusammenfassung(e))], [['gid://shopify/Product/6'], 1, true, true]);
  const leer = lauf({ produkte: [produkt(5, 150)], knotenFehler: 'leer' });
  ist('Weiterblättern: Knoten ohne Varianten (Produkt gelöscht) → ebenfalls Fehler und nichts geschrieben', [leer.prot.schreib.length, leer.status], [0, 1]);
}
// 4. Fehler beim Schreiben
{
  const u = lauf({ produkte: [produkt(7, 2), produkt(8, 2)], schreibFehler: { user: 'gid://shopify/Product/7' } });
  ist('userErrors bei Produkt 7: Exit 1, die Fehlermeldung steht auf stderr, Produkt 7 zählt NICHT als angepasst, Produkt 8 wird trotzdem geschrieben', [u.status, u.prot.err.some((l) => /Produkt 7/.test(l) && /userErrors/.test(l) && /Preis ungültig/.test(l)), /2 Variantenpreise angepasst/.test(zusammenfassung(u)), /1 Produkte mit Fehler/.test(zusammenfassung(u)), u.prot.schreib.map((s) => s.pid)], [1, true, true, true, ['gid://shopify/Product/8']]);
  ist('userErrors: die Schlusszeile behauptet nicht, alles sei angepasst', /4 Variantenpreise angepasst/.test(zusammenfassung(u)), false);
  const g = lauf({ produkte: [produkt(7, 2)], schreibFehler: { errors: true } });
  ist('GraphQL-Fehler beim Schreiben (kein data): Exit 1, kein Erfolg gezählt', [g.status, g.prot.err.some((l) => /Access denied/.test(l)), /0 Variantenpreise angepasst/.test(zusammenfassung(g))], [1, true, true]);
  const l = lauf({ produkte: [produkt(7, 2)], schreibFehler: { leer: true } });
  ist('Antwort ohne productVariantsBulkUpdate (früher: stillschweigend Erfolg): Exit 1', [l.status, l.prot.err.some((x) => /ohne Antwort/.test(x))], [1, true]);
  const h = lauf({ produkte: [produkt(7, 2)], schreibFehler: { http: 9, immer: true } });
  ist('HTTP 500 bei jedem Versuch: dreimal versucht, dann Exit 1', [h.status, h.prot.mutationVersuche], [1, 3]);
  const h1 = lauf({ produkte: [produkt(7, 2)], schreibFehler: { http: 1 } });
  ist('HTTP 500 nur beim ersten Versuch: wiederholt, danach geschrieben, Exit 0', [h1.status, h1.prot.mutationVersuche, preise(h1)], [0, 2, ['20.90', '20.90']]);
  const t = lauf({ produkte: [produkt(7, 2)], schreibFehler: { throttled: 2 } });
  ist('Throttled bei den ersten zwei Versuchen: wiederholt, beim dritten geschrieben, Exit 0', [t.status, t.prot.mutationVersuche, preise(t).length], [0, 3, 2]);
  const t3 = lauf({ produkte: [produkt(7, 2)], schreibFehler: { throttled: 9, immer: true } });
  ist('Throttled bei jedem Versuch: Exit 1', [t3.status, t3.prot.mutationVersuche], [1, 3]);
  const mitte = lauf({ produkte: [produkt(9, 150)], schreibFehler: { user: 'gid://shopify/Product/9' } });
  ist('userErrors im ersten Stück eines grossen Produkts (150 Varianten = zwei Stücke): das zweite Stück wird nicht mehr gesendet (ein einziger Schreibversuch), Exit 1', [mitte.status, mitte.prot.schreib.length, mitte.prot.mutationVersuche], [1, 0, 1]);
}
// 5. Fehler beim Lesen der Produktliste: früher «Query-Fehler», weiter mit einer unvollständigen Liste und Exit 0
{
  for (const f of ['errors', 'leer', 'http500']) {
    const e = lauf({ produkte: [produkt(1, 2)], produktListeFehler: f });
    ist(`Produktliste nicht lesbar (${f}): Exit 1, nichts geschrieben`, [e.status, e.prot.schreib.length, e.prot.err.some((l) => /Produktliste/.test(l))], [1, 0, true]);
  }
  const seiten = lauf({ produkte: [produkt(1, 1), produkt(2, 1), produkt(3, 1)], produktSeite: 2 });
  ist('Produktliste über mehrere Seiten (2 je Seite): alle drei Produkte angepasst', [new Set(seiten.prot.schreib.map((s) => s.pid)).size, seiten.prot.produktAbfragen], [3, 2]);
}
// 6. Zugangsdaten
{
  const ohneKey = lauf({ produkte: [produkt(1, 1)], env: { PRINTFUL_API_KEY: '' } });
  ist('Ohne PRINTFUL_API_KEY: dokumentierter No-op mit Exit 0, nichts gelesen', [ohneKey.status, ohneKey.prot.produktAbfragen, ohneKey.prot.log.some((l) => /No-op/.test(l))], [0, 0, true]);
}
// 6b. Anmeldung bei Shopify scheitert: früher Exit 0 mit einer Zeile auf stderr, jetzt Exit 1
{
  const e = lauf({ produkte: [produkt(1, 2)], authFehler: true });
  ist('Shopify-Anmeldung scheitert (HTTP 401): Exit 1, nichts gelesen, nichts geschrieben', [e.status, e.prot.produktAbfragen, e.prot.schreib.length, e.prot.err.some((l) => /Shopify-Auth fehlgeschlagen/.test(l))], [1, 0, 0, true]);
}
// 7. Unverändert: «Selbst gestalten»-Produkte werden übersprungen, unbekannte Kosten lassen die Variante aus
{
  const spec = await import('./lib/pod_auswahl_spec.mjs');
  const handle = spec.SPEC[0].handle;
  const e = lauf({ produkte: [{ ...produkt(1, 2), handle }, produkt(2, 1)] });
  ist('Ein «Selbst gestalten»-Produkt aus pod_auswahl_spec wird übersprungen (Schutz bleibt), das andere angepasst', [e.prot.schreib.map((s) => s.pid), e.prot.log.some((l) => l.includes('übersprungen'))], [['gid://shopify/Product/2'], true]);
  const mit = lauf({ produkte: [{ ...produkt(1, 2), handle }], env: { AUCH_AUSWAHL: '1' } });
  ist('AUCH_AUSWAHL=1 hebt die Sperre auf', mit.prot.schreib.length, 1);
  const unb = lauf({ produkte: [produkt(1, 2)], kostenStandard: null });
  ist('Printful kennt die Variante nicht (404): Variante ausgelassen, zwei «ohne Printful-Kosten», kein Fehler, Exit 0', [unb.prot.schreib.length, /2 ohne Printful-Kosten/.test(zusammenfassung(unb)), unb.status], [0, true, 0]);
}

// 8. Härtung 10.11.2026 (Gegenprüfung P1, Fund 10): ohne SENKEN=1 werden nur Erhöhungen geschrieben; Schreiben nur bei ausdrücklichem DRY_RUN=0
{
  const alt = (preis) => ({ variante: () => ({ price: preis }) });
  const ohne = lauf({ senken: false, produkte: [produkt(1, 3)] });
  ist('Vorgabe (ohne SENKEN): die Senkung 25.00 → 20.90 wird NICHT geschrieben, die Schlusszeile zählt 3 übersprungene Senkungen, Exit 0', [ohne.prot.schreib.length, /3 Senkungen übersprungen/.test(zusammenfassung(ohne)), /0 Variantenpreise angepasst/.test(zusammenfassung(ohne)), ohne.status], [0, true, true, 0]);
  const hoch = lauf({ senken: false, produkte: [produkt(2, 2, alt('15.00'))] });
  ist('Vorgabe: eine ERHÖHUNG 15.00 → 20.90 wird geschrieben', [preise(hoch), hoch.status], [['20.90', '20.90'], 0]);
  const misch = lauf({ senken: false, produkte: [produkt(3, 2, { variante: (i) => ({ price: i === 0 ? '15.00' : '25.00' }) })] });
  ist('Gemischtes Produkt (eine Variante teurer zu machen, eine zu senken): nur die Erhöhung geht raus', [preise(misch), misch.prot.schreib.length], [['20.90'], 1]);
  const mitSenken = lauf({ senken: true, produkte: [produkt(1, 3)] });
  ist('SENKEN=1 erlaubt die Senkung ausdrücklich', preise(mitSenken), ['20.90', '20.90', '20.90']);
  const leer = lauf({ senken: true, dryLoeschen: true, produkte: [produkt(1, 3)] });
  ist('DRY_RUN nicht gesetzt: nur Vorschau, nichts geschrieben (früher schrieb jeder Wert ausser «1»)', [leer.prot.schreib.length, /WÜRDEN angepasst/.test(zusammenfassung(leer))], [0, true]);
  for (const v of ['', 'x', 'ja']) { const e = lauf({ senken: true, produkte: [produkt(1, 1)], env: { DRY_RUN: v } }); ist(`DRY_RUN=«${v}»: Vorschau, nichts geschrieben`, e.prot.schreib.length, 0); }
  for (const v of ['0', 'false', 'nein']) { const e = lauf({ senken: true, produkte: [produkt(1, 1)], env: { DRY_RUN: v } }); ist(`DRY_RUN=«${v}»: es wird geschrieben`, e.prot.schreib.length, 1); }
  for (const v of ['1', 'true', 'ja']) { const e = lauf({ senken: false, produkte: [produkt(1, 1)], env: { SENKEN: v } }); ist(`SENKEN=«${v}» erlaubt die Senkung`, e.prot.schreib.length, 1); }
  for (const v of ['0', '', 'nein', 'x']) { const e = lauf({ senken: false, produkte: [produkt(1, 1)], env: { SENKEN: v } }); ist(`SENKEN=«${v}» erlaubt die Senkung NICHT`, e.prot.schreib.length, 0); }
}
// 9. Die Preisformel selbst (Fund 18, Mutant V7): der Zielpreis ist das HÖHERE von Kosten×Aufschlag und Kosten+Mindestmarge, nie das niedrigere. Kosten in CHF = USD × 0.90.
{
  // 20 USD = 18 CHF: Aufschlag 18×2.3 = 41.4 gegen Marge 18+12 = 30 → 41.4 → 42 − 0.10 = 41.90 (das niedrigere, 30, ergäbe 29.90)
  const hoch = lauf({ senken: false, kostenStandard: '20.00', produkte: [produkt(1, 2)] });
  ist('Formel: bei hohen Kosten gilt Kosten×Aufschlag (41.90), nicht Kosten+Marge (29.90)', preise(hoch), ['41.90', '41.90']);
  // 5 USD = 4.5 CHF: Aufschlag 10.35 gegen Marge 16.5 → 16.5 → 17 − 0.10 = 16.90 (das niedrigere, 10.35, ergäbe 10.90)
  const niedrig = lauf({ senken: true, kostenStandard: '5.00', produkte: [produkt(1, 2)] });
  ist('Formel: bei niedrigen Kosten gilt Kosten+Mindestmarge (16.90), nicht Kosten×Aufschlag (10.90)', preise(niedrig), ['16.90', '16.90']);
  const markup = lauf({ senken: false, env: { MARKUP: '3' }, kostenStandard: '20.00', produkte: [produkt(1, 1)] });
  ist('Formel: der Aufschlag MARKUP=3 wirkt (18×3 = 54 → 53.90)', preise(markup), ['53.90']);
}

// 10. Zweite Runde 10.11.2026 (Gegenleser Linse 1 und 2): unbrauchbare Printful-Kosten sind «unbekannt», die API-Version ist die des Syncs
{
  for (const [n, kosten] of [['leer', ''], ['Text', 'abc'], ['0', '0'], ['0.00', '0.00'], ['negativ', '-5'], ['NaN', 'NaN']]) {
    const e = lauf({ senken: true, kosten: { 1000: kosten, 1001: kosten }, produkte: [produkt(1, 2)] });
    ist(`Kosten «${n}» sind UNBEKANNT: nichts geschrieben (früher: Preis «NaN» bzw. 11.90 bei 0), beide Varianten zählen als «ohne Printful-Kosten», Exit 0`, [e.prot.schreib.length, /2 ohne Printful-Kosten/.test(zusammenfassung(e)), e.status], [0, true, 0]);
  }
  const gemischt = lauf({ senken: true, kosten: { 1000: '', 1001: '10.00' }, produkte: [produkt(1, 2)] });
  ist('Eine Variante mit unbrauchbaren Kosten, eine mit 10.00: nur die zweite wird geschrieben', [ids(gemischt), preise(gemischt), /1 ohne Printful-Kosten/.test(zusammenfassung(gemischt))], [['gid://shopify/ProductVariant/10001'], ['20.90'], true]);
  const e1 = lauf({ senken: true, produkte: [produkt(1, 3)] });
  ist('Shopify-API: jeder Aufruf geht an 2026-01, dieselbe Version wie der Sync (die alte Fassung lief auf dem abgelaufenen 2025-01)', [[...new Set(e1.prot.api)], e1.prot.api.length >= 3], [['2026-01'], true]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
