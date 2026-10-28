// Tests für die Platzierung der Druckdatei im Printful-Auftrag (kein Netz). Lauf: /opt/node22/bin/node automation/lib/printful_platzierung_test.mjs
// Prüfdaten: ECHTE Printful-Antworten (dropship/pod-auswahl/platzierung_mitschnitte.json, lesend gemessen 27.10.2026) und der Katalog (katalog.json). Das Verhalten des Bestellwegs
// (printful_sync.mjs mit gefälschtem fetch) prüft automation/printful_sync_test.mjs.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { platzierungFuer, entscheide, alteZuordnung, produktInfoAusAntwort, neuerPlatzierungsCache, platzierungenFuerDateien, druckbare, EINZEL_TYPEN, MEHRLAGEN_TYPEN } from './printful_platzierung.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
const lade = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));

// ── Echte Mitschnitte (GET /products/variant/<id> → result): Produkt-Nummer → {variante, produkt:{id,type,title,files:[{id,type,title}]}}
const MIT = lade('../../dropship/pod-auswahl/platzierung_mitschnitte.json').mitschnitte;
const echt = (pid) => ({ variant: { id: MIT[pid].variante }, product: MIT[pid].produkt });
const info = (pid) => produktInfoAusAntwort(echt(pid));
const vorne = (pid, shopTyp = '') => entscheide({ produkt: info(pid), seite: 'front', shopTyp });
const hinten = (pid, shopTyp = '') => entscheide({ produkt: info(pid), seite: 'back', shopTyp });
const kurz = (e) => [e.platzierung, e.gesichert];

// Orakel AUS DER DATEILISTE (nicht aus dem Typ): genau eine druckbare Platzierung → diese; mehrere → vorne «front» (wenn «default»/«front» existiert), hinten «back» (wenn «back» existiert), sonst ungesichert
const orakel = (ids, seite) => {
  const dr = ids.filter((id) => !['preview', 'mockup'].includes(id));
  if (dr.length === 1) return [dr[0], true];
  return seite === 'back' ? ['back', dr.includes('back')] : ['front', dr.includes('default') || dr.includes('front')];
};

// ── Einzel-Produkte (echt): immer ihre einzige Platzierung «default», für beide Seiten, gesichert
for (const [pid, n] of [[268, 'Poster'], [3, 'Leinwand'], [304, 'gerahmtes Poster'], [19, 'Tasse (MUG)'], [798, 'Handyhülle MagSafe'], [686, 'Handyhülle Samsung'], [181, 'Handyhülle klar'],
  [656, 'Magnet (Printful-Typ STICKER)'], [583, 'Mauspad (SUBLIMATION, nur «default»)'], [84, 'Stoffbeutel (CUT-SEW, nur «default»)']]) {
  ist(`${n} (Printful ${pid}) → vorne default, gesichert`, kurz(vorne(pid)), ['default', true]);
  ist(`${n} (Printful ${pid}) → hinten wird nicht zu «back»: default, gesichert`, kurz(hinten(pid)), ['default', true]);
}
// ── Bekleidung (echt): vorne «front», hinten «back», gesichert, weil die Dateiliste «default» (type front) und «back» führt
for (const [pid, n] of [[71, 'T-Shirt Bella 3001'], [146, 'Hoodie Gildan 18500'], [380, 'Premium-Hoodie'], [83, 'Kissen (CUT-SEW mit default+back)']]) {
  ist(`${n} (Printful ${pid}) → vorne front, gesichert`, kurz(vorne(pid)), ['front', true]);
  ist(`${n} (Printful ${pid}) → hinten back, gesichert`, kurz(hinten(pid)), ['back', true]);
}
// ── Produkte, deren Dateiliste die Seite NICHT kennt: dieselbe Antwort wie früher, aber ungesichert (→ Auftrag bleibt Entwurf)
ist('Jogginghose (Printful 400: right_leg, left_leg, label_inside) → front/back geraten, ungesichert', [kurz(vorne(400)), kurz(hinten(400))], [['front', false], ['back', false]]);
ist('Rucksack (Printful 279: default, top, bottom, pocket) → vorne front gesichert, «back» gibt es nicht → ungesichert', [kurz(vorne(279)), kurz(hinten(279))], [['front', true], ['back', false]]);
ist('Baumwolltasche (Printful 1553: embroidery_apparel_front/back, kein default/front/back) → ungesichert', [kurz(vorne(1553)), kurz(hinten(1553))], [['front', false], ['back', false]]);
wahr('Grund nennt die Dateiliste', /steht nicht in der Dateiliste des Printful-Produkts \(right_leg, left_leg, label_inside\)/.test(vorne(400).grund), vorne(400).grund);
// ── Orakel gegen ALLE echten Mitschnitte (aus der Dateiliste abgeleitet, nicht aus dem Typ)
for (const [pid, m] of Object.entries(MIT)) {
  const ids = m.produkt.files.filter((f) => f.type !== 'mockup').map((f) => f.id ?? f.type);
  ist(`Mitschnitt ${pid} (${m.produkt.type}) vorne = Orakel aus der Dateiliste`, kurz(vorne(Number(pid))), orakel(ids, 'front'));
  ist(`Mitschnitt ${pid} (${m.produkt.type}) hinten = Orakel aus der Dateiliste`, kurz(hinten(Number(pid))), orakel(ids, 'back'));
}
ist('die Mitschnitte decken die Typen ab, die sich ändern (CUT-SEW mit nur «default», SUBLIMATION, Magnet=STICKER, MUG, Bekleidung mit id≠type, DTFILM)',
  ['CUT-SEW', 'SUBLIMATION', 'STICKER', 'MUG', 'T-SHIRT', 'DTFILM', 'PHONE-CASE', 'POSTER', 'CANVAS', 'FRAMED-POSTER'].every((t) => Object.values(MIT).some((m) => m.produkt.type === t)), true);
ist('echtes Muster: beim T-Shirt ist die Vorderseite id «default», type «front»', MIT[71].produkt.files.find((f) => f.id === 'default').type, 'front');

// ── Die Typ-Listen sind nur das, was belegt ist ('MAGNET' und 'DIRECT-TO-FABRIC' kamen in keinem der 491 Live-Produkte und in keinem Mitschnitt vor)
ist('EINZEL_TYPEN: nur belegte Typen', [...EINZEL_TYPEN], ['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'FRAMED-POSTER', 'CANVAS']);
ist('MEHRLAGEN_TYPEN: nur belegte Typen', [...MEHRLAGEN_TYPEN], ['T-SHIRT', 'CUT-SEW']);
ist('jeder Typ der Listen kommt in den echten Mitschnitten oder im Katalog vor', [...EINZEL_TYPEN, ...MEHRLAGEN_TYPEN].every((t) => Object.values(MIT).some((m) => m.produkt.type === t)
  || Object.values(lade('../../dropship/pod-auswahl/katalog.json').produkte).some((p) => p.type === t)), true);

// ── Ohne Dateiliste entscheidet der Typ
ist('Typ MUG ohne Dateiliste → default', platzierungFuer({ produkt: { typ: 'MUG', dateien: null } }), 'default');
ist('Typ PHONE-CASE ohne Dateiliste → default', platzierungFuer({ produkt: { typ: 'PHONE-CASE', dateien: null } }), 'default');
ist('Typ FRAMED-POSTER ohne Dateiliste → default', platzierungFuer({ produkt: { typ: 'FRAMED-POSTER', dateien: [] } }), 'default');
ist('Typ T-SHIRT ohne Dateiliste → front, gesichert (der Typ genügt)', kurz(entscheide({ produkt: { typ: 'T-SHIRT', dateien: null } })), ['front', true]);
ist('Typ T-SHIRT ohne Dateiliste, hinten → back', platzierungFuer({ produkt: { typ: 'T-SHIRT', dateien: null }, seite: 'back' }), 'back');
ist('Seite fehlt → front', platzierungFuer({ produkt: info(71) }), 'front');
ist('Seite unsinnig → front', platzierungFuer({ produkt: info(71), seite: 'links' }), 'front');

// ── DER Fehler: Shop-Produktart «Handy-Zubehör» / «Tassen & Becher» / «Accessoires» (alte Zuordnung → 'front'); mit Printful-Typ jetzt 'default'
for (const [shop, pid] of [['Handy-Zubehör', 798], ['Tassen & Becher', 19], ['Accessoires', 84], ['Poster', 268], ['Wohnen', 3]]) {
  ist(`Alt (Shop-Art «${shop}»): front, also falsch (ausser «Poster»)`, alteZuordnung(shop, 'front'), shop === 'Poster' ? 'default' : 'front');
  ist(`Neu (Shop-Art «${shop}» + Printful-Typ): default`, platzierungFuer({ produkt: info(pid), seite: 'front', shopTyp: shop }), 'default');
}
ist('Shop-Art «T-SHIRT» + Printful-Typ T-SHIRT → front', platzierungFuer({ produkt: info(71), shopTyp: 'T-SHIRT' }), 'front');
ist('Der Printful-Typ gewinnt gegen eine falsche Shop-Art («MUG» am T-Shirt)', platzierungFuer({ produkt: info(71), shopTyp: 'MUG' }), 'front');

// ── Rückfall: Variante nicht ermittelbar → alte Zuordnung über die Shop-Produktart; gesichert NUR, wenn die Shop-Art in der alten Liste steht
for (const t of ['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'CANVAS', 'MAGNET']) ist(`Rückfall: Shop-Art ${t} → default, gesichert`, kurz(entscheide({ produkt: null, shopTyp: t })), ['default', true]);
ist('Rückfall: Shop-Art «Magnet» (echte Shop-Produktart, 7 Produkte, Gross-/Kleinschreibung egal) → default, gesichert', [kurz(entscheide({ shopTyp: 'Magnet' })), kurz(entscheide({ shopTyp: 'magnet' }))], [['default', true], ['default', true]]);
ist('Rückfall: Shop-Art «CANVAS» und «Canvas» → default, gesichert', [kurz(entscheide({ shopTyp: 'CANVAS' })), kurz(entscheide({ shopTyp: 'Canvas' }))], [['default', true], ['default', true]]);
ist('alteZuordnung: Magnet und Canvas (auch hinten) → default', [alteZuordnung('Magnet', 'back'), alteZuordnung('Canvas', 'front'), alteZuordnung('CANVAS', 'back')], ['default', 'default', 'default']);
ist('Rückfall: kein Produkt, Shop-Art phone-case (klein) → default', platzierungFuer({ produkt: null, shopTyp: 'phone-case' }), 'default');
ist('Rückfall: «Tassen & Becher» → front wie bisher, aber UNGESICHERT (geraten)', kurz(entscheide({ produkt: null, shopTyp: 'Tassen & Becher' })), ['front', false]);
ist('Rückfall: «Handy-Zubehör» → front, ungesichert, Grund nennt die Shop-Art', [kurz(entscheide({ shopTyp: 'Handy-Zubehör' })), /Handy-Zubehör/.test(entscheide({ shopTyp: 'Handy-Zubehör' }).grund)], [['front', false], true]);
ist('Rückfall: Shop-Art leer, hinten → back, ungesichert', kurz(entscheide({ produkt: null, shopTyp: '', seite: 'back' })), ['back', false]);
ist('Rückfall: nichts übergeben → front', platzierungFuer(), 'front');
ist('Rückfall: unbekannter Typ ohne Dateiliste, Shop-Art POSTER → default', platzierungFuer({ produkt: { typ: 'UNBEKANNT', dateien: null }, shopTyp: 'POSTER' }), 'default');
ist('Rückfall: unbekannter Typ ohne Dateiliste, Shop-Art unbekannt → front', platzierungFuer({ produkt: { typ: 'UNBEKANNT', dateien: null }, shopTyp: 'Zeug' }), 'front');
ist('Rückfall: leeres Produkt-Objekt', platzierungFuer({ produkt: { typ: '', dateien: [] }, shopTyp: 'STICKER' }), 'default');

// ── produktInfoAusAntwort / druckbare
ist('Antwort ohne product → null', [produktInfoAusAntwort(null), produktInfoAusAntwort({}), produktInfoAusAntwort({ product: 5 }), produktInfoAusAntwort({ product: {} })], [null, null, null, null]);
ist('Typ wird in Grossbuchstaben gelesen', produktInfoAusAntwort({ product: { id: 1, type: ' mug ', files: [{ id: 'default', type: 'default' }, { id: 'preview', type: 'mockup' }] } }), { id: 1, typ: 'MUG', dateien: ['default'] });
ist('Mockup-Dateien zählen nicht als Platzierung (echtes Poster)', info(268).dateien, ['default']);
ist('Textil (echt): alle Platzierungs-IDs ausser Mockup, id statt type («default», nicht «front»)', [info(71).dateien.includes('back'), info(71).dateien.includes('default'), info(71).dateien.includes('preview'), info(71).dateien.includes('front')], [true, true, false, false]);
ist('Hose (echt): id «right_leg», nicht type «leg_right»', info(400).dateien, ['right_leg', 'left_leg', 'label_inside']);
ist('druckbare() lässt Vorschau/Mockup weg', druckbare(['default', 'preview', 'mockup', 'back']), ['default', 'back']);

// ── Zwischenspeicher: ein Aufruf je Variante, Fehler werfen nie, vorübergehende Fehler werden wiederholt und NICHT gemerkt
{
  const gespraeche = [];
  const pause = async (ms) => { gespraeche.push(ms); };
  const ok200 = () => ({ status: 200, result: echt(19) });
  {
    let n = 0; const c = neuerPlatzierungsCache(async () => { n++; return ok200(); }, { pause });
    const a = await c(1), b = await c(1), c2 = await c('1');
    ist('Cache: drei Fragen nach derselben Variante → ein Aufruf', [n, a.art, a.info?.typ, b.info?.typ, c2.info?.typ], [1, 'ok', 'MUG', 'MUG', 'MUG']);
  }
  {
    let n = 0; const c = neuerPlatzierungsCache(async () => { n++; return { status: 404, result: null }; }, { pause });
    const a = await c(404), b = await c(404);
    ist('Cache: 404 ist endgültig → «unbekannt», nur ein Aufruf, keine Wiederholung, gemerkt', [a.art, a.info, a.status, n, b.art], ['unbekannt', null, 404, 1, 'unbekannt']);
  }
  {
    let n = 0; const c = neuerPlatzierungsCache(async () => { n++; return { status: 200, result: { product: {} } }; }, { pause });
    ist('Cache: Antwort 200 ohne Produktangaben → «unbekannt», gemerkt', [(await c(1)).art, (await c(1)).art, n], ['unbekannt', 'unbekannt', 1]);
  }
  for (const [name, antwort] of [['Netzfehler (wirft)', async () => { throw new Error('ECONNRESET'); }], ['HTTP 429', async () => ({ status: 429, result: null })], ['HTTP 502', async () => ({ status: 502, result: null })], ['HTTP 503', async () => ({ status: 503, result: null })], ['HTTP 408', async () => ({ status: 408, result: null })]]) {
    let n = 0; gespraeche.length = 0;
    const c = neuerPlatzierungsCache(async (v) => { n++; return antwort(v); }, { pause, pauseMs: 100, versuche: 3 });
    const a = await c(7);
    ist(`Cache: ${name} → dreimal versucht, mit wachsender Pause (100, 200 ms), dann «nicht-lesbar»`, [a.art, a.info, n, gespraeche], ['nicht-lesbar', null, 3, [100, 200]]);
    await c(7);
    ist(`Cache: ${name} wird NICHT dauerhaft gemerkt (der nächste Auftrag fragt neu)`, n, 6);
  }
  {
    let n = 0; gespraeche.length = 0;
    const c = neuerPlatzierungsCache(async () => (++n < 3 ? { status: 503, result: null } : ok200()), { pause, pauseMs: 50 });
    const a = await c(5);
    ist('Cache: zwei Fehler, dann Erfolg → «ok» nach drei Versuchen, jetzt gemerkt', [a.art, a.info?.typ, n, (await c(5)).art, n], ['ok', 'MUG', 3, 'ok', 3]);
  }
  {
    let n = 0; gespraeche.length = 0;
    const c = neuerPlatzierungsCache(async () => (++n < 2 ? { status: 429, result: null, retryAfter: 9 } : ok200()), { pause, pauseMs: 100 });
    await c(6);
    ist('Cache: bei 429 gilt «Retry-After» (9 s), wenn grösser als die Pause', gespraeche, [9000]);
    n = 0; gespraeche.length = 0;
    const c2 = neuerPlatzierungsCache(async () => (++n < 2 ? { status: 429, result: null, retryAfter: 999 } : ok200()), { pause, pauseMs: 100 });
    await c2(6);
    ist('Cache: «Retry-After» wird auf 30 s begrenzt', gespraeche, [30000]);
  }
  {
    let n = 0; const c = neuerPlatzierungsCache(async () => { n++; return { status: 401, result: null }; }, { pause });
    const a = await c(8);
    ist('Cache: HTTP 401 (kein vorübergehender Fehler) → keine Wiederholung, «nicht-lesbar», nicht gemerkt', [a.art, a.status, n], ['nicht-lesbar', 401, 1]);
  }
}

// ── Der Kleber des Bestellwegs als Funktion (Befund 22/23): Verhalten, nicht Quelltext
{
  const von = (erg) => async () => erg;
  const D = [{ side: 'front', url: 'https://x/v.png' }, { side: 'back', url: 'https://x/h.png' }];
  const mitInfo = (pid) => ({ info: info(pid), art: 'ok', status: 200 });
  const r1 = await platzierungenFuerDateien({ vid: 20688, dateien: [D[0]], shopTyp: 'Handy-Zubehör', holeProdukt: von(mitInfo(798)) });
  ist('Hülle (Shop-Art «Handy-Zubehör»): default, kein Review', [r1.files, r1.needReview, r1.hinweise], [[{ type: 'default', url: 'https://x/v.png' }], false, []]);
  const r2 = await platzierungenFuerDateien({ vid: 4025, dateien: D, shopTyp: 'T-Shirts', holeProdukt: von(mitInfo(71)) });
  ist('Shirt vorne+hinten: front und back, URLs bleiben ihrer Seite zugeordnet, kein Review', [r2.files, r2.needReview], [[{ type: 'front', url: 'https://x/v.png' }, { type: 'back', url: 'https://x/h.png' }], false]);
  const r3 = await platzierungenFuerDateien({ vid: 20688, dateien: [D[0]], shopTyp: 'Handy-Zubehör', holeProdukt: von({ info: null, art: 'nicht-lesbar', status: 0 }) });
  ist('Variante nicht lesbar (Netzfehler), Shop-Art «Handy-Zubehör» (nicht in der alten Liste): front geraten → needReview mit Hinweis', [r3.files[0].type, r3.needReview, r3.hinweise.length, /derzeit nicht lesbar \(Netzfehler\)/.test(r3.hinweise[0]), /Handy-Zubehör/.test(r3.hinweise[0])], ['front', true, 1, true, true]);
  const r4 = await platzierungenFuerDateien({ vid: 1, dateien: [D[0]], shopTyp: 'Magnet', holeProdukt: von({ info: null, art: 'nicht-lesbar', status: 503 }) });
  ist('Variante nicht lesbar (HTTP 503), Shop-Art «Magnet» (alte Liste): default, KEIN Review (Rückfall belegt)', [r4.files[0].type, r4.needReview], ['default', false]);
  const r5 = await platzierungenFuerDateien({ vid: 1, dateien: D, shopTyp: 'Tassen & Becher', holeProdukt: von({ info: null, art: 'unbekannt', status: 404 }) });
  ist('Variante 404, Shop-Art «Tassen & Becher»: front/back geraten → Review, ein Hinweis je Seite', [r5.files.map((f) => f.type), r5.needReview, r5.hinweise.length, /ohne Produktangaben \(HTTP 404\)/.test(r5.hinweise[0])], [['front', 'back'], true, 2, true]);
  const r6 = await platzierungenFuerDateien({ vid: 11038, dateien: [D[0]], shopTyp: 'Hosen', holeProdukt: von(mitInfo(400)) });
  ist('Jogginghose (Dateiliste ohne front/back): bisherige Antwort front, aber Review', [r6.files[0].type, r6.needReview, /nicht gesichert/.test(r6.hinweise[0])], ['front', true, true]);
  const r7 = await platzierungenFuerDateien({ vid: 1, dateien: [], shopTyp: '', holeProdukt: von(mitInfo(798)) });
  ist('keine Dateien → nichts zu bestimmen, kein Review', [r7.files, r7.needReview], [[], false]);
  let gefragt = []; await platzierungenFuerDateien({ vid: 777, dateien: D, shopTyp: '', holeProdukt: async (v) => { gefragt.push(v); return mitInfo(71); } });
  ist('die Variantennummer geht unverändert an die Abfrage, genau einmal je Variante', gefragt, [777]);
}

// ── Gegen den echten Katalog (Datenpaket katalog.json): Orakel AUS DER DATEILISTE, nicht aus dem Typ
{
  const pfad = fileURLToPath(new URL('../../dropship/pod-auswahl/katalog.json', import.meta.url));
  if (!existsSync(pfad)) { console.log('(Katalog-Datenpaket fehlt → übersprungen)'); }
  else {
    const k = JSON.parse(readFileSync(pfad, 'utf8')).produkte;
    let n = 0;
    for (const p of Object.values(k)) {
      const dateien = p.files.map(x => x.split(':')[0]).filter(id => id !== 'preview');
      const prod = { typ: p.type, dateien };
      const erwartet = [orakel(dateien, 'front'), orakel(dateien, 'back')];
      ist(`Katalog ${p.id} (${p.type}) → ${erwartet.map((e) => e[0]).join('/')}, gesichert`, [kurz(entscheide({ produkt: prod, seite: 'front' })), kurz(entscheide({ produkt: prod, seite: 'back' }))], erwartet); n++;
      // ohne Dateiliste (nur Typ): Einzel-Typen default, Bekleidung front/back
      const nurTyp = [platzierungFuer({ produkt: { typ: p.type, dateien: null }, seite: 'front' }), platzierungFuer({ produkt: { typ: p.type, dateien: null }, seite: 'back' })];
      ist(`Katalog ${p.id} (${p.type}) nur nach Typ`, nurTyp, p.type === 'T-SHIRT' ? ['front', 'back'] : ['default', 'default']);
    }
    ist('Katalog enthielt Produkte', n > 10, true);
  }
}

// ── printful_sync.mjs nutzt die Bibliothek (Quelltext ohne Kommentare); das VERHALTEN prüft automation/printful_sync_test.mjs
{
  const q = readFileSync(fileURLToPath(new URL('../printful_sync.mjs', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ist('printful_sync importiert platzierungenFuerDateien + neuerPlatzierungsCache', /import \{[^}]*platzierungenFuerDateien[^}]*\} from '\.\/lib\/printful_platzierung\.mjs'/.test(q) && /neuerPlatzierungsCache/.test(q), true);
  ist('die alte Funktion placementFor ist weg', /function placementFor/.test(q), false);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
