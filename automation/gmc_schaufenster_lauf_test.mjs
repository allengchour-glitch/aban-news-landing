/**
 * Lauf-Test des Google-Schaufensters: startet automation/gmc_schaufenster.mjs als Kindprozess gegen einen FAKE-SHOP (fetch wird ersetzt;
 * kein Netz, kein Shopify). Geprüft wird, was die reine Auswahl (lib/gmc_schaufenster_test.mjs) nicht sehen kann: Freigabe, Trockenlauf,
 * Kanal-ID in der Mutation, Manifest vor dem Aufruf, Absturz mitten im Stück, Rücknahme, Fehlerliste, Exit-Codes, Schutzregeln.
 * Lauf: /opt/node22/bin/node automation/gmc_schaufenster_lauf_test.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest } from './lib/gmc_schaufenster.mjs';

const CLI = fileURLToPath(new URL('./gmc_schaufenster.mjs', import.meta.url));
const GOOGLE = 'gid://shopify/Publication/302872297857';   // das Literal, nicht die Konstante der Bibliothek (sonst prüft der Test sich selbst)
const ONLINESTORE = 'gid://shopify/Publication/301970915713';
const dir = mkdtempSync(join(tmpdir(), 'gmc-lauf-'));
let ok = 0, fehler = 0;
const pruef = (name, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
};

// --- Der Fake-Shop: eine Vorladedatei, die fetch ersetzt. Zustand liegt in einer JSON-Datei (überlebt einen abgebrochenen Kindprozess).
const VORLADEN = join(dir, 'fake_shop.mjs');
writeFileSync(VORLADEN, `
import { readFileSync, writeFileSync } from 'node:fs';
const ZUSTAND = process.env.FAKE_STATE, GOOGLE = '${GOOGLE}';
const echt = globalThis.setTimeout;
globalThis.setTimeout = (f, ms, ...a) => echt(f, Math.min(ms || 0, 2), ...a);   // keine echten Wartezeiten
const lies = () => JSON.parse(readFileSync(ZUSTAND, 'utf8'));
const schreibe = z => writeFileSync(ZUSTAND, JSON.stringify(z));
const antwort = d => new Response(JSON.stringify({ data: d }), { status: 200, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (u.includes('/admin/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'fake' }), { status: 200 });
  if (u === 'https://fake.local/bulk.jsonl') {
    const z = lies();
    // Ein Fake ist ein Messgerät: ein Feld kommt NUR, wenn die Bulk-Abfrage des Werkzeugs es verlangt (sonst bliebe eine kaputte Abfrage unbemerkt).
    const bq = z.bulkQuery || '', hat = t => bq.includes(t);
    return new Response(z.produkte.map(p => JSON.stringify({ id: p.id, handle: p.handle, title: hat(' title ') ? (p.titel || ('Produkt ' + p.handle)) : undefined,
      tags: hat(' tags ') ? p.tags : undefined, variantsCount: hat('variantsCount{count}') ? (p.varianten === null ? null : { count: p.varianten }) : undefined,
      gp: hat('gp:publishedOnPublication(publicationId:"' + GOOGLE + '")') ? p.gp : undefined,
      ex: hat('ex:metafield(namespace:"mm-google-shopping", key:"excluded_destination")') ? (p.ex ? { value: p.ex } : null) : undefined,
      cat: hat('cat:metafield(namespace:"mm-google-shopping", key:"google_product_category")') ? (p.cat ? { value: p.cat } : null) : undefined,
      rt: hat('rt:metafield(namespace:"reviews", key:"rating")') ? (p.rating == null ? null : { value: JSON.stringify({ value: String(p.rating), scale_min: '1.0', scale_max: '5.0' }) }) : undefined,
      rc: hat('rc:metafield(namespace:"reviews", key:"rating_count")') ? (p.stimmen == null ? null : { value: String(p.stimmen) }) : undefined })).join('\\n'), { status: 200 });
  }
  if (u.includes('/graphql.json')) {
    const q = JSON.parse(opt.body).query;
    const z = lies();
    if (q.includes('currentBulkOperation(type:QUERY){status errorCode objectCount url}')) return antwort({ currentBulkOperation: { status: 'COMPLETED', errorCode: null, objectCount: String(z.produkte.length), url: 'https://fake.local/bulk.jsonl' } });
    if (q.includes('currentBulkOperation(type:QUERY){status}')) return antwort({ currentBulkOperation: z.bulkBelegt ? { status: 'RUNNING' } : null });
    if (q.includes('bulkOperationRunQuery')) {
      z.bulkQuery = String((JSON.parse(opt.body).variables || {}).q || ''); schreibe(z);
      return antwort({ bulkOperationRunQuery: { bulkOperation: { id: 'gid://shopify/BulkOperation/1' }, userErrors: [] } });
    }
    if (q.includes('orders(first')) {
      if (z.bestellungenFehler) throw new Error('Access denied for orders field. Required access: read_orders');
      const hat = t => q.includes(t);
      const alleB = z.bestellungen || [], start = Number((JSON.parse(opt.body).variables || {}).c || 0), seite = alleB.slice(start, start + 100);
      const nodes = seite.map(o => {
        const n = {};
        if (hat(' test ')) n.test = o.test;
        if (hat(' cancelledAt ')) n.cancelledAt = o.cancelledAt;
        if (hat(' displayFinancialStatus ')) n.displayFinancialStatus = o.displayFinancialStatus;
        if (hat('lineItems(first:100)')) {
          n.lineItems = { nodes: o.lineItems.nodes.map(x => hat('product{ id }') ? x : { product: {} }) };
          if (hat('lineItems(first:100){ pageInfo{ hasNextPage }')) n.lineItems.pageInfo = o.lineItems.pageInfo;
        }
        return n;
      });
      const aus = { orders: { nodes } };
      if (hat('pageInfo{ hasNextPage endCursor }')) aus.orders.pageInfo = { hasNextPage: start + 100 < alleB.length, endCursor: String(start + 100) };
      if (hat('ordersCount(limit:null){ count }')) aus.ordersCount = z.bestellungenOhneZaehler ? null : { count: z.bestellungenZaehlt ?? alleB.length, precision: 'EXACT' };
      return antwort(aus);
    }
    if (q.includes('publishableUnpublish') || q.includes('publishablePublish')) {
      const aus = {};
      const re = /a(\\d+): (publishableUnpublish|publishablePublish)\\(id:"([^"]+)", input:\\[\\{publicationId:"([^"]+)"\\}\\]\\)/g;
      let m;
      while ((m = re.exec(q))) {
        const [, i, art, id, pub] = m;
        z.log.push({ art, id, pub });
        const p = z.produkte.find(x => x.id === id);
        if ((z.scheitern || []).includes(id)) { aus['a' + i] = { userErrors: [{ field: ['id'], message: 'fake fehler' }] }; continue; }
        if (p && pub === GOOGLE) p.gp = art === 'publishablePublish';
        aus['a' + i] = { userErrors: [] };
      }
      z.mutationen = (z.mutationen || 0) + 1;
      schreibe(z);
      if (z.absturzNach && z.mutationen >= z.absturzNach) process.exit(137);   // wie SIGKILL: Shopify hat gebucht, die Antwort kommt nie an
      return antwort(aus);
    }
    throw new Error('FAKE: unbekannte Abfrage ' + q.slice(0, 80));
  }
  throw new Error('FAKE fetch: ' + u);
};
`);

let nr = 0;
const P = (o = {}) => ({ id: `gid://shopify/Product/${100000 + nr++}`, handle: `p-${nr}`, tags: [], varianten: 1, gp: true, ex: null, cat: 'Home & Garden > Decor', rating: 4.5, stimmen: 1, ...o });   // 4,5 Sterne bei 1 Stimme: lesbar, aber nicht bewährt
const viele = (n, o) => Array.from({ length: n }, () => P(o));
const AUS = '["Shopping_ads"]';

/** Eine Welt: 1200 normale Produkte, 300 mit Ausschlussfeld (gehen), 20 Fortura. */
function welt() {
  return { produkte: [...viele(1200), ...viele(300, { ex: AUS }), ...viele(20, { tags: ['fortura'] })], log: [], mutationen: 0 };
}
let lauf = 0;
function los(zustand, env = {}, mitFreigabe = true) {
  lauf++;
  const o = join(dir, `l${lauf}`);
  const state = env.FAKE_STATE || join(o + '_state.json');
  if (!env.FAKE_STATE) writeFileSync(state, JSON.stringify(zustand));
  const frei = join(dir, 'FREI.txt');
  if (mitFreigabe) writeFileSync(frei, 'ok'); else rmSync(frei, { force: true });
  const r = spawnSync(process.execPath, ['--import', VORLADEN, CLI], {
    env: { PATH: process.env.PATH, HOME: dir, SHOPIFY_SHOP: 'fake-shop.myshopify.com', SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'geheim',
      FAKE_STATE: state, MANIFEST: join(dir, 'manifest.jsonl'), FEHLERDATEI: join(dir, 'fehler.txt'), FREIGABE: frei, PLAN_AUS: join(dir, 'plan.json'), ...env },
    encoding: 'utf8', timeout: 60000,
  });
  return { code: r.status, aus: (r.stdout || '') + (r.stderr || ''), state, lies: () => JSON.parse(readFileSync(state, 'utf8')) };
}
const neu = () => { for (const f of ['manifest.jsonl', 'fehler.txt']) rmSync(join(dir, f), { force: true }); };
const manifest = () => parseManifest(existsSync(join(dir, 'manifest.jsonl')) ? readFileSync(join(dir, 'manifest.jsonl'), 'utf8') : '');

// 1) Trockenlauf (Vorgabe) schreibt nichts
{
  neu();
  const r = los(welt(), { PHASE: 'plan' });
  pruef('Plan: Exit 0, 300 abzuwählen, kein Aufruf an Shopify', [r.code, /ABWÄHLEN 300 /.test(r.aus), r.lies().log.length], [0, true, 0]);
  const t = los(welt(), { PHASE: 'abwaehlen' });
  pruef('abwaehlen ohne LIVE=1 ist Trockenlauf: Exit 0, nichts geschrieben', [t.code, t.aus.includes('TROCKENLAUF'), t.lies().log.length, existsSync(join(dir, 'manifest.jsonl'))], [0, true, 0, false]);
}
// 2) Freigabe und KATALOG-Sperre
{
  neu();
  const r = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' }, false);
  pruef('LIVE ohne Freigabedatei: Exit 1, nichts geschrieben', [r.code, r.lies().log.length], [1, 0]);
  writeFileSync(join(dir, 'katalog.jsonl'), '');
  const k = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', KATALOG: join(dir, 'katalog.jsonl') });
  pruef('KATALOG mit LIVE=1: Exit 1', [k.code, k.aus.includes('KATALOG')], [1, true]);
  const b = los(welt(), { PHASE: 'plan', BUDGET: '9000' });
  pruef('BUDGET unter dem Mindestbudget: Exit 1', [b.code, b.aus.includes('BUDGET')], [1, true]);
  const f = los(welt(), { PHASE: 'unsinn' });
  pruef('unbekannte PHASE: Exit 1', f.code, 1);
}
// 3) Abwählen, Kanal-ID, Manifest, Idempotenz, Prüfen
{
  neu();
  const r = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const z = r.lies();
  const weg = z.produkte.filter(p => p.gp === false), bleibt = z.produkte.filter(p => p.gp === true);
  pruef('abwaehlen: Exit 0, genau die 300 mit Ausschlussfeld sind weg', [r.code, weg.length, weg.every(p => p.ex === AUS), bleibt.length], [0, 300, true, 1220]);
  pruef('jede Mutation nennt den Kanal «Google & YouTube», nie den Onlineshop', [z.log.length, z.log.every(l => l.pub === GOOGLE && l.art === 'publishableUnpublish'), z.log.some(l => l.pub === ONLINESTORE)], [300, true, false]);
  pruef('Manifest: 300 Produkte (Absicht vor dem Aufruf)', [manifest().ids.size, manifest().kaputt], [300, 0]);
  const wieder = los(z, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle', FAKE_STATE: r.state });
  pruef('zweiter Lauf: nichts zu tun, kein weiterer Aufruf', [wieder.code, wieder.aus.includes('Nichts zu tun'), wieder.lies().log.length], [0, true, 300]);
  const pr = los(z, { PHASE: 'pruefen', FAKE_STATE: r.state });
  pruef('pruefen nach dem Lauf: Exit 0, Varianten auf Google genannt', [pr.code, /Varianten auf Google jetzt 1220 /.test(pr.aus)], [0, true]);
}
// 4) MAX begrenzt, der Rest folgt
{
  neu();
  const r = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', MAX: '50' });
  pruef('MAX=50: genau 50 abgewählt', [r.code, r.lies().produkte.filter(p => p.gp === false).length, manifest().ids.size], [0, 50, 50]);
}
// 5) Absturz mitten im Lauf: nichts geht verloren, die volle Rücknahme stellt alles zurück
{
  neu();
  const w = welt(); w.absturzNach = 2;
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const z = r.lies();
  const weg = z.produkte.filter(p => p.gp === false);
  pruef('Absturz nach der 2. Mutation: Exit 137, 20 abgewählt, alle 20 im Manifest', [r.code, weg.length, weg.every(p => manifest().ids.has(p.id))], [137, 20, true]);
  z.absturzNach = 0; writeFileSync(r.state, JSON.stringify(z));
  const ruck = los(z, { PHASE: 'zuruecksetzen', LIVE: '1', MAX: 'alle', FAKE_STATE: r.state });
  const nach = ruck.lies();
  pruef('zuruecksetzen: alle 20 wieder auf Google, Manifest sagt «auf»', [ruck.code, nach.produkte.filter(p => p.gp === false).length, manifest().ids.size], [0, 0, 0]);
  pruef('Rücknahme veröffentlicht nur auf dem Google-Kanal', nach.log.filter(l => l.art === 'publishablePublish').every(l => l.pub === GOOGLE), true);
}
// 6) Rücknahme: aufnehmen nimmt Ausschluss-Produkte NICHT zurück, zuruecksetzen schon
{
  neu();
  const r = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const a = los(r.lies(), { PHASE: 'aufnehmen', LIVE: '1', MAX: 'alle', FAKE_STATE: r.state });
  pruef('aufnehmen: Produkte mit Ausschlussfeld bleiben draussen', [a.code, a.lies().produkte.filter(p => p.gp === false).length], [0, 300]);
  const z = los(a.lies(), { PHASE: 'zuruecksetzen', LIVE: '1', MAX: 'alle', FAKE_STATE: r.state });
  pruef('zuruecksetzen: alle 300 zurück', [z.code, z.lies().produkte.filter(p => p.gp === false).length], [0, 0]);
}
// 7) Fehlschläge: Fehlerliste, dreimal, dann übersprungen
{
  neu();
  const w = welt(); const gift = w.produkte.filter(p => p.ex).slice(0, 3).map(p => p.id); w.scheitern = gift;
  const SF = join(dir, 'zustand7.json'); writeFileSync(SF, JSON.stringify(w));
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push(los(null, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle', FAKE_STATE: SF }).code);
  pruef('3 dauerhaft fehlschlagende Produkte: dreimal Exit 3', codes, [3, 3, 3]);
  const lines = readFileSync(join(dir, 'fehler.txt'), 'utf8').trim().split('\n');
  pruef('Fehlerliste: 9 Zeilen (3 Produkte × 3 Läufe), mit Meldung', [lines.length, lines[0].split('\t')[2]], [9, 'fake fehler']);
  const vierter = los(null, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle', FAKE_STATE: SF });
  pruef('vierter Lauf überspringt sie und nennt sie: Exit 0', [vierter.code, vierter.aus.includes('schlugen schon dreimal fehl')], [0, true]);
}
// 8) ONLY
{
  neu();
  const w = welt();
  const ziel = w.produkte.find(p => p.ex);
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle', ONLY: ziel.handle });
  pruef('ONLY mit bekanntem Handle: genau dieses Produkt', [r.code, r.lies().produkte.filter(p => p.gp === false).map(p => p.handle)], [0, [ziel.handle]]);
  neu();
  const u = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', ONLY: 'gibt-es-nicht' });
  pruef('ONLY ohne Treffer: Exit 1, nichts geschrieben', [u.code, u.lies().log.length], [1, 0]);
}
// 9) Manifest: Pfad nicht schreibbar, Datei ohne Zeilenumbruch und mit BOM
{
  neu();
  writeFileSync(join(dir, 'datei.txt'), 'x');   // ein Pfad UNTER einer normalen Datei lässt sich nie anlegen (ENOTDIR)
  const r = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle', MANIFEST: join(dir, 'datei.txt', 'unter', 'm.jsonl') });
  pruef('Manifest nicht schreibbar: Exit 1, KEIN Produkt angefasst', [r.code, r.lies().log.length], [1, 0]);
  neu();
  writeFileSync(join(dir, 'manifest.jsonl'), '﻿' + JSON.stringify({ id: 'gid://shopify/Product/1', aktion: 'ab-versucht' }));   // BOM, kein Zeilenumbruch am Ende
  const a = los(welt(), { PHASE: 'abwaehlen', LIVE: '1', MAX: '20' });
  const m = manifest();
  pruef('Manifest ohne Umbruch am Ende und mit BOM: alter Eintrag bleibt, 20 neue dazu, keine Verschmelzung', [a.code, m.ids.has('gid://shopify/Product/1'), m.ids.size, m.kaputt], [0, true, 21, 0]);
}
// 10) Plan-Wächter: verdächtiger Plan schreibt nichts
{
  neu();
  const w = { produkte: [...viele(600), ...viele(1500, { ex: AUS })], log: [], mutationen: 0 };   // 71 % abzuwählen
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  pruef('über 70 % abzuwählen: Exit 2, nichts geschrieben', [r.code, r.aus.includes('zu-viele-abwaehlen'), r.lies().log.length], [2, true, 0]);
  const ohne = { produkte: viele(1500, { cat: null }), log: [], mutationen: 0 };
  const k = los(ohne, { PHASE: 'plan' });
  pruef('fehlende Google-Kategorie bei fast allen Zeilen (Lesefehler): Plan abgelehnt', [k.code, k.aus.includes('zu-viele-ohne-kategorie')], [2, true]);
  const rueck = los({ produkte: [...viele(600), ...viele(1500, { ex: AUS, gp: false })], log: [], mutationen: 0 }, { PHASE: 'zuruecksetzen', LIVE: '1', MAX: 'alle' });
  pruef('volle Rücknahme ohne Manifest: nichts zu tun, Exit 0 (stellt nur Eigenes zurück)', [rueck.code], [0]);
}
// 11) Bulk-Wettlauf und Prüfen mit Defekt
{
  neu();
  const w = welt(); w.bulkBelegt = true;
  const r = los(w, { PHASE: 'plan' });
  pruef('läuft schon eine Bulk-Abfrage: Exit 4', [r.code, r.aus.includes('Bulk-Abfrage')], [4, true]);
  neu();
  const x = welt();
  const abgewaehlt = x.produkte.filter(p => p.ex).slice(0, 5);
  writeFileSync(join(dir, 'manifest.jsonl'), abgewaehlt.map(p => JSON.stringify({ id: p.id, aktion: 'ab-versucht' })).join('\n') + '\n');   // laut Manifest abgewählt, liegt aber noch auf Google
  const pr = los(x, { PHASE: 'pruefen' });
  pruef('pruefen: Defekt (abgewählt, aber noch auf Google) = Exit 3', [pr.code, /davon noch auf Google 5 /.test(pr.aus)], [3, true]);
  neu();
  const vor = los(welt(), { PHASE: 'pruefen' });
  pruef('pruefen vor dem Lauf: Google trägt noch Produkte ausserhalb des Schaufensters = Exit 5', vor.code, 5);
}
// 12) Stufe 0 «bewährt»: bestellte und gut bewertete Produkte bleiben, auch mit Ausschlussfeld
{
  neu();
  const bestellung = (...ids) => ({ test: false, cancelledAt: null, displayFinancialStatus: 'PAID', lineItems: { pageInfo: { hasNextPage: false }, nodes: ids.map(id => ({ product: { id } })) } });
  const w = welt();
  const verkauft = P({ ex: AUS, handle: 'verkauft' }), erstattet = P({ ex: AUS, handle: 'erstattet' }), gut = P({ ex: AUS, handle: 'gut', rating: 4.6, stimmen: 12 }), schwach = P({ ex: AUS, handle: 'schwach', rating: 3.9, stimmen: 40 }), wenige = P({ ex: AUS, handle: 'wenige', rating: 5, stimmen: 2 });
  w.produkte.push(verkauft, erstattet, gut, schwach, wenige);
  w.bestellungen = [bestellung(verkauft.id), { ...bestellung(erstattet.id), displayFinancialStatus: 'REFUNDED' }];
  const pl = los(w, { PHASE: 'plan' });
  pruef('Plan nennt «BEWÄHRT: 1 Produkte» und 1 mit guter Bewertung', [pl.code, /BEWÄHRT: 1 Produkte aus bezahlten Bestellungen/.test(pl.aus), /dazu 1 mit guter Bewertung/.test(pl.aus)], [0, true, true]);
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const z = r.lies();
  const weg = z.produkte.filter(p => p.gp === false).map(p => p.handle);
  pruef('bestellt und gut bewertet bleiben; erstattet, schwach bewertet, zu wenige Stimmen gehen', [r.code, weg.includes('verkauft'), weg.includes('gut'), weg.includes('erstattet'), weg.includes('schwach'), weg.includes('wenige')], [0, false, false, true, true, true]);
  pruef('die 300 Ausschluss-Produkte der Welt gehen weiter (300 + 3 = 303)', weg.length, 303);
}
// 13) Bestellungen nicht (vollständig) lesbar: Plan warnt, ein Schreiblauf bricht ab und fasst nichts an
{
  neu();
  const a = welt(); a.bestellungenFehler = true;
  const p1 = los(a, { PHASE: 'plan' });
  pruef('Bestellungen nicht lesbar: Plan läuft (nur lesen), warnt aber', [p1.code, /WARNUNG: Bestellungen unvollständig gelesen/.test(p1.aus)], [0, true]);
  const l1 = los(a, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  pruef('Bestellungen nicht lesbar + LIVE abwaehlen: Exit 1, nichts angefasst, kein Manifest', [l1.code, l1.aus.includes('Bestellungen sind unvollständig'), l1.lies().log.length, existsSync(join(dir, 'manifest.jsonl'))], [1, true, 0, false]);
  neu();
  const b = welt(); b.bestellungen = [{ test: false, cancelledAt: null, displayFinancialStatus: 'PAID', lineItems: { pageInfo: { hasNextPage: false }, nodes: [] } }]; b.bestellungenZaehlt = 29;   // Shopify zählt 29, geliefert wird 1 (älter als 60 Tage ohne read_all_orders)
  const l2 = los(b, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  pruef('ordersCount 29, gelesen 1: unvollständig, Exit 1, nichts angefasst', [l2.code, /Shopify zählt 29/.test(l2.aus), l2.lies().log.length], [1, true, 0]);
  neu();
  const c = welt(); c.bestellungenFehler = true;
  const rueck = los(c, { PHASE: 'zuruecksetzen', LIVE: '1', MAX: 'alle' });
  pruef('die volle Rücknahme braucht die Bestellungen nicht', rueck.code, 0);
}
// 14) Lizenznamen und Prüf-Tags gehen vom Kanal
{
  neu();
  const w = welt();
  w.produkte.push(P({ handle: 'maus', titel: 'Mickey Mouse Folienballon', tags: ['fortura'] }), P({ handle: 'stecker', tags: ['stecker-unklar'] }), P({ handle: 'harmlos', titel: 'Ultraschall Zahnbürste' }));
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const weg = r.lies().produkte.filter(p => p.gp === false).map(p => p.handle);
  pruef('Lizenzname (auch Fortura) und Prüf-Tag gehen, das harmlose Produkt bleibt', [r.code, weg.includes('maus'), weg.includes('stecker'), weg.includes('harmlos')], [0, true, true, false]);
}
// 15) Bestellungen auf mehreren Seiten (Seitenblättern), ordersCount fehlt (fail-closed)
{
  neu();
  const pos = id => ({ test: false, cancelledAt: null, displayFinancialStatus: 'PAID', lineItems: { pageInfo: { hasNextPage: false }, nodes: id ? [{ product: { id } }] : [] } });
  const w = welt();
  const spaet = P({ ex: AUS, handle: 'spaet-verkauft' });
  w.produkte.push(spaet);
  w.bestellungen = [...Array.from({ length: 249 }, () => pos(null)), pos(spaet.id)];   // 250 Bestellungen, das geschützte Produkt steht erst auf Seite 3
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const weg = r.lies().produkte.filter(p => p.gp === false).map(p => p.handle);
  pruef('250 Bestellungen auf 3 Seiten: das Produkt von Seite 3 bleibt', [r.code, weg.includes('spaet-verkauft'), /250 Bestellungen gelesen, Shopify zählt 250/.test(r.aus)], [0, false, true]);
  neu();
  const o = welt(); o.bestellungenOhneZaehler = true;
  const k = los(o, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  pruef('ordersCount fehlt: fail-closed, Exit 1, nichts angefasst', [k.code, k.aus.includes('ordersCount fehlt'), k.lies().log.length], [1, true, 0]);
}
// 16) Bewertungsfelder fehlen oder sind zu wenige: ein Schreiblauf bricht ab (alte Datei, falscher Schlüssel)
{
  neu();
  const w = { produkte: [...viele(1200, { rating: null, stimmen: null }), ...viele(300, { ex: AUS, rating: null, stimmen: null })], log: [], mutationen: 0 };
  const p1 = los(w, { PHASE: 'plan' });
  pruef('ohne Bewertungsfelder: Plan läuft, nennt es', [p1.code, /BEWERTUNGSFELDER: bei 0 Produkten gelesen \(unter 200/.test(p1.aus)], [0, true]);
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  pruef('ohne Bewertungsfelder + LIVE abwaehlen: Exit 1, nichts angefasst', [r.code, r.aus.includes('Bewertungsfeld gelesen'), r.lies().log.length], [1, true, 0]);
}
// 17) Schwach bewertete Produkte und Lizenzfiguren (auch ausserhalb der Wortliste des Feeds) gehen
{
  neu();
  const w = welt();
  w.produkte.push(P({ handle: 'schwach', rating: 3.0, stimmen: 6 }), P({ handle: 'schwach-wenige', rating: 2.0, stimmen: 2 }), P({ handle: 'pika', titel: 'Plüsch Pikachu 30 cm', tags: ['fortura'] }), P({ handle: 'hund', titel: 'Hundeleine Pingufrei' }));
  const r = los(w, { PHASE: 'abwaehlen', LIVE: '1', MAX: 'alle' });
  const weg = r.lies().produkte.filter(p => p.gp === false).map(p => p.handle);
  pruef('schwach bewertet (3,0 bei 6 Stimmen) geht, bei 2 Stimmen bleibt es; Pikachu (Fortura) geht; harmloser Titel bleibt', [r.code, weg.includes('schwach'), weg.includes('schwach-wenige'), weg.includes('pika'), weg.includes('hund')], [0, true, false, true, false]);
}
// 18) Die Abfragen des Werkzeugs nennen jedes Feld, das die Regeln brauchen (der Fake liefert nur, was verlangt wird)
{
  neu();
  const r = los(welt(), { PHASE: 'plan' });
  const z = r.lies();
  const q = z.bulkQuery || '';
  pruef('Bulk-Abfrage nennt Titel, Tags, Varianten, Kanal, Ausschlussfeld, Kategorie, Rating und Anzahl',
    [' title ', ' tags ', 'variantsCount{count}', 'publishedOnPublication', 'excluded_destination', 'google_product_category', 'key:"rating")', 'key:"rating_count")'].map(t => q.includes(t)), [true, true, true, true, true, true, true, true]);
}

rmSync(dir, { recursive: true, force: true });
console.log(`${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
