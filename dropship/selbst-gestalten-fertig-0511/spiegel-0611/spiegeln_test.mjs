// Test des Spiegelwerkzeugs gegen eine Attrappe (kein Netz, kein Shop). Aufruf: node spiegeln_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planPruefen, auswahl, lauf, zuruecknehmen, vorhandene, gqlSicher, NAME_RE, sha, masse } from './spiegeln.mjs';

let ok = 0, schlecht = 0;
const pruef = (name, bed, detail = '') => { if (bed) ok++; else { schlecht++; console.log('✗', name, detail); } };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'spiegel-'));
const pngMit = (b, h, n = 0) => { const k = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(k, 0); k.writeUInt32BE(13, 8); k.write('IHDR', 12, 'latin1'); k.writeUInt32BE(b, 16); k.writeUInt32BE(h, 20); return Buffer.concat([k, Buffer.from(String(n).padEnd(20, 'x'))]); };
const png = (n) => pngMit(100, 80, n);
const q = (n) => `https://files.cdn.printful.com/m/Test/medium/front/${n}.png?v=1`;
const name = (n) => `luxe-vorschau-${String(n).padStart(10, '0').replace(/[^0-9a-f]/g, 'a')}.png`;
const mkPlan = (ns) => ({ dateien: ns.map((n) => ({ quelle: q(n), dateiname: name(n), art: 'vorlage', modelle: [n % 2 ? 403 : 71] })) });

/** Attrappe von Shopify + CDN. opt: { vorhandenNamen, fehlerQuelle:Set, typ:Map, gross:Set, throttleErst:n, abweichung:bool, userErrorsStaged } */
function welt(opt = {}) {
  const dateien = new Map(); // id -> { name, url }
  let nr = 1000; const aufrufe = { staged: 0, create: 0, delete: 0, nodes: 0, files: 0, post: 0 }; let drossel = opt.throttleErst || 0;
  for (const n of opt.vorhandenNamen || []) { const id = `gid://shopify/GenericFile/${nr++}`; dateien.set(id, { name: n, url: `https://cdn.shopify.com/s/files/1/0/0/files/${n}?v=1` }); }
  const bytes = new Map();
  const fetchFn = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://files.cdn.printful.com/')) {
      const n = parseInt(u.match(/\/(\d+)\.png/)[1], 10);
      if (opt.fehlerQuelle && opt.fehlerQuelle.has(n)) return { ok: false, status: 404, headers: new Map(), arrayBuffer: async () => Buffer.alloc(0) };
      const ct = (opt.typ && opt.typ.get(n)) || 'image/png';
      const buf = opt.gross && opt.gross.has(n) ? Buffer.alloc(7 * 1024 * 1024, 1) : png(n);
      return { ok: true, status: 200, headers: { get: (k) => ({ 'content-type': ct, 'content-length': String(buf.length) })[k.toLowerCase()] }, arrayBuffer: async () => buf };
    }
    if (u.startsWith('https://stage.test/')) { aufrufe.post++; const f = init.body.get('file'); bytes.set(u, Buffer.from(await f.arrayBuffer())); return { ok: true, status: 201, headers: { get: () => null }, arrayBuffer: async () => Buffer.alloc(0) }; }
    if (u.startsWith('https://cdn.shopify.com/')) { const e = [...dateien.values()].find((d) => d.url === u); const b = e && e.bytes ? e.bytes : Buffer.from('x'); return { ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => (opt.abweichung ? Buffer.from('anders') : opt.recodiert ? pngMit(100, 80, 'neu-kodiert') : opt.andereMasse ? pngMit(50, 40, 1) : b) }; }
    throw new Error('unerwartet ' + u);
  };
  const gqlFn = async (query, v) => {
    if (drossel > 0 && /stagedUploadsCreate|fileCreate/.test(query)) { drossel--; throw new Error('Throttled'); }
    if (/files\(first/.test(query)) { aufrufe.files++; return { files: { pageInfo: { hasNextPage: false }, nodes: [...dateien.entries()].map(([id, d]) => ({ id, fileStatus: 'READY', url: d.url })) } }; }
    if (/stagedUploadsCreate/.test(query)) { aufrufe.staged++; if (opt.userErrorsMitZielen) return { stagedUploadsCreate: { userErrors: [{ message: 'teilweise' }], stagedTargets: v.i.map((x) => ({ url: `https://stage.test/${x.filename}`, resourceUrl: `https://stage.test/res/${x.filename}`, parameters: [] })) } };
    if (opt.userErrorsStaged) return { stagedUploadsCreate: { stagedTargets: [], userErrors: [{ message: 'nein' }] } }; return { stagedUploadsCreate: { userErrors: [], stagedTargets: v.i.map((x, k) => ({ url: `https://stage.test/${x.filename}`, resourceUrl: `https://stage.test/res/${x.filename}`, parameters: [{ name: 'k', value: String(k) }] })) } }; }
    if (/fileCreate/.test(query)) { aufrufe.create++; const files = v.f.map((f) => { const id = `gid://shopify/GenericFile/${nr++}`; const b = bytes.get(f.originalSource.replace('/res/', '/')); dateien.set(id, { name: f.filename, url: `https://cdn.shopify.com/s/files/1/0/0/files/${f.filename}?v=2`, bytes: b }); return { id, fileStatus: 'UPLOADED' }; }); return { fileCreate: { files, userErrors: [] } }; }
    if (/nodes\(ids/.test(query)) { aufrufe.nodes++; return { nodes: v.ids.map((id) => ({ id, fileStatus: 'READY', url: dateien.get(id).url })) }; }
    if (/fileDelete/.test(query)) { aufrufe.delete++; const weg = []; for (const id of v.ids) if (dateien.delete(id)) weg.push(id); return { fileDelete: { deletedFileIds: weg, userErrors: [] } }; }
    throw new Error('unbekannte Abfrage ' + query.slice(0, 40));
  };
  return { fetchFn, gqlFn, dateien, aufrufe };
}
const still = () => {};
const warte = async () => {};

// 1 Planprüfung
pruef('Plan gültig', planPruefen(mkPlan([1, 2])).fehler.length === 0);
pruef('Name muss dem Muster folgen', planPruefen({ dateien: [{ quelle: q(1), dateiname: 'boese.png', modelle: [] }] }).fehler.length > 0);
pruef('Quelle muss von Printful sein', planPruefen({ dateien: [{ quelle: 'https://evil.example/a.png', dateiname: name(1), modelle: [] }] }).fehler.length > 0);
pruef('Quelle mit http abgelehnt', planPruefen({ dateien: [{ quelle: 'http://files.cdn.printful.com/m/a.png', dateiname: name(1), modelle: [] }] }).fehler.length > 0);
pruef('Quelle mit Pfadtrick abgelehnt', planPruefen({ dateien: [{ quelle: 'https://files.cdn.printful.com.evil.example/a.png', dateiname: name(1), modelle: [] }] }).fehler.length > 0);
pruef('doppelter Name abgelehnt', planPruefen({ dateien: [{ quelle: q(1), dateiname: name(1), modelle: [] }, { quelle: q(2), dateiname: name(1), modelle: [] }] }).fehler.length > 0);
pruef('Endung Name gegen Quelle', planPruefen({ dateien: [{ quelle: 'https://files.cdn.printful.com/m/a.jpg?v=1', dateiname: name(1), modelle: [] }] }).fehler.length > 0);
pruef('Doppelpunkt im Dateinamen der Quelle erlaubt (echter Fall: ivory:bay_mesh)', planPruefen({ dateien: [{ quelle: 'https://files.cdn.printful.com/m/X/medium/flat/front/02_Cap_ivory:bay_mesh.png?v=1790233576', dateiname: name(1), modelle: [] }] }).fehler.length === 0);
pruef('Plan ohne Liste', planPruefen({}).fehler.length > 0 && planPruefen(null).fehler.length > 0);
pruef('NAME_RE streng', !NAME_RE.test('luxe-vorschau-00222a66f0.png.exe') && !NAME_RE.test('../luxe-vorschau-00222a66f0.png') && NAME_RE.test('luxe-vorschau-00222a66f0.png'));
pruef('Auswahl nach Modell', auswahl(mkPlan([1, 2, 3]), [403]).length === 2 && auswahl(mkPlan([1, 2, 3]), []).length === 3);

// 2 Trockenlauf schreibt nichts
{
  const w = welt(); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2, 3]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: false, log: still, warte });
  pruef('Trockenlauf: nichts angelegt', w.aufrufe.staged === 0 && w.aufrufe.create === 0 && w.aufrufe.post === 0 && w.dateien.size === 0);
  pruef('Trockenlauf: Plan gezählt', r.plan === 3 && r.vorhanden === 0 && r.neu === 0 && r.exit === 0);
  const r2 = await lauf({ plan: mkPlan([1, 2, 3]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: false, pruefen: true, log: still, warte });
  pruef('Trockenlauf mit HEAD meldet Quellen', r2.quellen && r2.quellen.bytes > 0);
}

// 3 Live: legt alles an, hochgeladen.json vollständig, Bytes gleich
{
  const w = welt(); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2, 3, 4, 5]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, stapel: 2, parallel: 2, log: still, warte });
  pruef('Live: 5 neu, Exit 0', r.neu === 5 && r.exit === 0 && r.fehlgeschlagen.length === 0, JSON.stringify(r).slice(0, 200));
  const h = JSON.parse(fs.readFileSync(path.join(out, 'hochgeladen.json'), 'utf8'));
  pruef('hochgeladen.json enthält alle 5 Namen mit https-Adresse', Object.keys(h).length === 5 && Object.values(h).every((u) => /^https:\/\/cdn\.shopify\.com\//.test(u)));
  pruef('Stapel: 3 Anforderungen für 5 Dateien bei Stapel 2', w.aufrufe.staged === 3 && w.aufrufe.create === 3, JSON.stringify(w.aufrufe));
  pruef('Ledger hat 5 OK-Zeilen', fs.readFileSync(path.join(out, 'ledger.tsv'), 'utf8').split('\n').filter((z) => /\tOK\t/.test(z)).length === 5);
  // Wiederholung: nichts neu
  const r2 = await lauf({ plan: mkPlan([1, 2, 3, 4, 5]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('Wiederholung legt nichts neu an', r2.neu === 0 && r2.vorhanden === 5 && w.dateien.size === 5);
  // Rücknahme
  const t = await zuruecknehmen({ gqlFn: w.gqlFn, ledgerPfad: path.join(out, 'ledger.tsv'), live: false, log: still });
  pruef('Rücknahme Trockenlauf löscht nichts', t.geloescht === 0 && t.plan === 5 && w.dateien.size === 5);
  const t2 = await zuruecknehmen({ gqlFn: w.gqlFn, ledgerPfad: path.join(out, 'ledger.tsv'), live: true, log: still, warte });
  pruef('Rücknahme löscht genau die 5 Ledger-Dateien', t2.geloescht === 5 && w.dateien.size === 0);
}

// 4 fremde Dateien bleiben bei der Rücknahme
{
  const w = welt({ vorhandenNamen: [name(9)] }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 9]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('vorhandener Name wird nie überschrieben, nur der fehlende angelegt', r.neu === 1 && r.vorhanden === 1 && w.dateien.size === 2);
  const t = await zuruecknehmen({ gqlFn: w.gqlFn, ledgerPfad: path.join(out, 'ledger.tsv'), live: true, log: still, warte });
  pruef('Rücknahme lässt die schon vorhandene Datei stehen', t.geloescht === 1 && w.dateien.size === 1);
}

// 5 Fehlerfälle
{
  const w = welt({ fehlerQuelle: new Set([2]), typ: new Map([[3, 'text/html']]), gross: new Set([4]) }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2, 3, 4]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('404, falscher Typ und zu gross werden nicht hochgeladen', r.neu === 1 && r.fehlgeschlagen.length === 3 && r.exit === 4, JSON.stringify(r.fehlgeschlagen));
  pruef('Gründe genannt', r.fehlgeschlagen.some((f) => /404/.test(f.grund)) && r.fehlgeschlagen.some((f) => /kein Bild/.test(f.grund)) && r.fehlgeschlagen.some((f) => /zu gross/.test(f.grund)));
  pruef('hochgeladen.json hat nur die gelungene Datei', Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'hochgeladen.json'), 'utf8'))).length === 1);
}
{
  const w = welt({ abweichung: true }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('CDN liefert unlesbare Daten statt Bild: Exit 3', r.exit === 3 && r.abweichung.length >= 1);
}
{
  const w = welt({ recodiert: true }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('neu kodiertes Bild mit gleichen Abmessungen ist KEINE Abweichung (nur Hinweis)', r.exit === 0 && r.abweichung.length === 0 && r.recodiert >= 1, JSON.stringify([r.exit, r.abweichung, r.recodiert]));
}
{
  const w = welt({ andereMasse: true }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('andere Abmessungen als die Quelle: Exit 3', r.exit === 3 && r.abweichung.length >= 1);
}
{
  const w = welt({ userErrorsStaged: true }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('Fehler bei stagedUploadsCreate: nichts angelegt, Exit 4', r.neu === 0 && r.exit === 4 && w.aufrufe.create === 0);
}
{
  const w = welt({ throttleErst: 2 }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('THROTTLED wird wiederholt', r.neu === 2 && r.exit === 0);
}
{
  let n = 0; const sofort = async () => { n++; if (n < 100) throw new Error('GraphQL: nicht wiederholbar'); };
  let gefangen = false; try { await gqlSicher(sofort, 'x', {}, { warte }); } catch { gefangen = true; }
  pruef('andere Fehler werden nicht wiederholt', gefangen && n === 1);
  let m = 0; const immer = async () => { m++; throw new Error('Throttled'); };
  let g2 = false; try { await gqlSicher(immer, 'x', {}, { warte, versuche: 3 }); } catch { g2 = true; }
  pruef('Wiederholung ist begrenzt', g2 && m === 3);
}
{
  const out = tmp(); const w = welt();
  const r = await lauf({ plan: mkPlan([1, 2, 3]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, maxDateien: 2, log: still, warte });
  pruef('MAX_DATEIEN bremst vor dem ersten Schreiben', r.exit === 2 && w.aufrufe.staged === 0);
  const r2 = await lauf({ plan: mkPlan([1, 2, 3]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, modelle: [403], log: still, warte });
  pruef('Auswahl nach Modell legt nur diese an', r2.neu === 2 && w.dateien.size === 2);
}
{
  const out = tmp(); const w = welt();
  const r = await lauf({ plan: { dateien: [{ quelle: 'https://evil.example/a.png', dateiname: name(1), modelle: [] }] }, gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('ungültiger Plan: Exit 2 und kein Netzaufruf', r.exit === 2 && w.aufrufe.files === 0 && w.aufrufe.staged === 0);
}

// 6 Rücknahme: nur OK-Zeilen mit gültigem Namen und gültiger ID
{
  const w = welt(); const out = tmp();
  const a = 'gid://shopify/GenericFile/777'; const b = 'gid://shopify/GenericFile/778'; const c = 'gid://shopify/GenericFile/779';
  for (const [id, n] of [[a, name(1)], [b, 'fremd-datei.png'], [c, name(3)]]) w.dateien.set(id, { name: n, url: 'https://cdn.shopify.com/s/files/1/0/0/files/' + n });
  fs.writeFileSync(path.join(out, 'ledger.tsv'), ['# kopf',
    ['t', name(1), 'OK', a, 'x'].join('\t'),
    ['t', 'fremd-datei.png', 'OK', b, 'x'].join('\t'),
    ['t', name(3), 'FEHLER', c, 'x'].join('\t'),
    ['t', name(4), 'OK', 'gid://shopify/Product/1', 'x'].join('\t')].join('\n') + '\n');
  const t1 = await zuruecknehmen({ gqlFn: w.gqlFn, ledgerPfad: path.join(out, 'ledger.tsv'), live: true, log: still, warte });
  pruef('Rücknahme löscht nur OK-Zeile mit gültigem Namen und gültiger Datei-ID', t1.geloescht === 1 && w.dateien.has(b) && w.dateien.has(c) && !w.dateien.has(a), JSON.stringify(t1));
}
{
  const w = welt({ userErrorsMitZielen: true }); const out = tmp();
  const r = await lauf({ plan: mkPlan([1, 2]), gqlFn: w.gqlFn, fetchFn: w.fetchFn, out, live: true, log: still, warte });
  pruef('stagedUploadsCreate mit Fehlern UND Zielen: es wird nichts gesendet und nichts angelegt', r.neu === 0 && w.aufrufe.post === 0 && w.aufrufe.create === 0 && r.exit === 4, JSON.stringify(w.aufrufe));
}
pruef('masse liest PNG, JPEG, GIF und meldet null bei Unsinn', (() => { const m = masse(pngMit(640, 480)); const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0x00, 0x11, 8, 0x01, 0xe0, 0x02, 0x80, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]); const g = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.from([0x20, 0x01, 0x10, 0x00]), Buffer.alloc(8)]); const mj = masse(jpg), mg = masse(g); return m.b === 640 && m.h === 480 && mj && mj.b === 640 && mj.h === 480 && mg && mg.b === 288 && mg.h === 16 && masse(Buffer.from('kein Bild')) === null && masse(Buffer.alloc(0)) === null; })());
pruef('sha ist stabil', sha(Buffer.from('a')) === sha(Buffer.from('a')) && sha(Buffer.from('a')) !== sha(Buffer.from('b')));

console.log(`${ok} Prüfungen bestanden${schlecht ? `, ${schlecht} FEHLGESCHLAGEN` : ''}`);
process.exit(schlecht ? 1 : 0);
