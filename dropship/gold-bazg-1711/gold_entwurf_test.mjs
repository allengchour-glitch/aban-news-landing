// Test für gold_entwurf.mjs: strenge Attrappe des Shops (Variablen deklariert und benutzt, Lesen mit Verzögerung, Kanalverlust beim Reaktivieren, Fehler einspeisen).
//   node dropship/gold-bazg-1711/gold_entwurf_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lauf, pruefeListe, entscheide, belegDa, textVon, schreibMutation, MARKER_GOLD } from './gold_entwurf.mjs';
import { LESEN, PUBLIZIEREN } from '../silber-bazg-1711/lib.mjs';

let ok = 0, bad = 0;
const pruefe = (name, bedingung, info = '') => { if (bedingung) ok++; else { bad++; console.log('FEHLER:', name, info); } };
const HIER = dirname(fileURLToPath(import.meta.url));
const echte = JSON.parse(readFileSync(join(HIER, 'gold-liste.json'), 'utf8'));

const gid = (n) => `gid://shopify/Product/${n}`;
const eintrag = (n, beleg = ['14K-Gold-Kette']) => ({ handle: `gold-${n}`, id: gid(n), urteil: 'massiv', beleg });
const liste = (n = 6) => ({ eintraege: Array.from({ length: n }, (_, i) => eintrag(i + 1)) });

/** Attrappe des Shops. opts: lag (Lesungen bis zur Sicht), verliert (Kanäle weg beim Reaktivieren), ignoriert (Schreiben wirkt nicht), updateFehler (Alias → Fehlertext), publFehler. */
function shop(n = 6, opts = {}) {
  // opts bleibt veränderlich: Tests schalten Fehlerarten nach einem Lauf um
  const P = new Map(), sicht = new Map(), wartend = [];
  const kanaele = ['gid://shopify/Publication/1', 'gid://shopify/Publication/2', 'gid://shopify/Publication/3'];
  for (let i = 1; i <= n + 2; i++) P.set(gid(i), { id: gid(i), handle: `gold-${i}`, title: `Armband ${i}`, status: 'ACTIVE', tags: ['cj-real'], productType: 'Schmuck', description: i <= n ? 'Armband mit 14K-Gold-Kette und Perlen' : 'Armband aus Edelstahl', options: [{ name: 'Farbe', values: ['Gold'] }], pubs: new Set(kanaele) });
  const kopie = (p) => ({ ...p, tags: [...p.tags], pubs: new Set(p.pubs) });
  const sichtbar = (id) => (opts.lag ? sicht.get(id) : P.get(id));
  for (const [id, p] of P) sicht.set(id, kopie(p));
  const stat = { mutationen: 0, lesungen: 0, publizierungen: 0, anfragen: [] };
  const tick = () => { for (let i = wartend.length - 1; i >= 0; i--) if (--wartend[i].n < 0) { sicht.set(wartend[i].id, kopie(P.get(wartend[i].id))); wartend.splice(i, 1); } };
  const q = async (query, vars) => {
    stat.anfragen.push(query.slice(0, 40));
    if (query === LESEN) {
      stat.lesungen++; tick();
      return { nodes: vars.ids.map((id) => { const p = sichtbar(id); if (!p) return null; return { id: p.id, handle: p.handle, title: p.title, status: p.status, tags: p.tags, productType: p.productType, description: p.description, options: p.options, pub: { nodes: [...p.pubs].map((x) => ({ publication: { id: x } })) }, alle: { nodes: [...p.pubs].map((x) => ({ isPublished: true, publication: { id: x } })) } }; }) };
    }
    if (query === PUBLIZIEREN) {
      stat.publizierungen++;
      if (opts.publFehler) return { publishablePublish: { userErrors: [{ field: ['id'], message: 'nicht erlaubt' }] } };
      const p = P.get(vars.id); for (const x of vars.in) p.pubs.add(x.publicationId); sicht.set(p.id, kopie(p));
      return { publishablePublish: { userErrors: [] } };
    }
    if (query.startsWith('mutation(')) {
      stat.mutationen++;
      // strenge Prüfung: jede deklarierte Variable wird benutzt, jede benutzte ist deklariert
      const kopf = query.slice(query.indexOf('(') + 1, query.indexOf('){'));
      const deklariert = [...kopf.matchAll(/\$(\w+):/g)].map((m) => m[1]);
      const rumpf = query.slice(query.indexOf('){') + 2);
      const benutzt = [...rumpf.matchAll(/\$(\w+)/g)].map((m) => m[1]);
      for (const d of deklariert) if (!benutzt.includes(d)) throw new Error('variableNotUsed: ' + d);
      for (const b of benutzt) if (!deklariert.includes(b)) throw new Error('variableNotDefined: ' + b);
      const antwort = {};
      for (const m of rumpf.matchAll(/(s|t)(\d+):(productUpdate|tagsAdd|tagsRemove)/g)) {
        const alias = m[1] + m[2];
        if (opts.updateFehler?.[alias] || opts.updateFehlerNr === stat.mutationen) { antwort[alias] = { userErrors: [{ field: ['x'], message: opts.updateFehler?.[alias] || 'abgelehnt' }] }; continue; }
        if (!opts.ignoriert) {
          if (m[3] === 'productUpdate') { const v = vars['p' + m[2]]; const p = P.get(v.id); if (!opts.statusIgnoriert) { if (p.status === 'DRAFT' && v.status === 'ACTIVE' && opts.verliert) p.pubs = new Set(); p.status = v.status; } wartend.push({ id: p.id, n: opts.lag || 0 }); }
          else { const id = vars['i' + m[2]]; const p = P.get(id); if (!opts.tagIgnoriert) { if (m[3] === 'tagsAdd') { for (const g of vars.g) { if (!p.tags.includes(g)) p.tags.push(g); } } else p.tags = p.tags.filter((x) => !vars.g.includes(x)); } wartend.push({ id: p.id, n: opts.lag || 0 }); }
        }
        antwort[alias] = { userErrors: [] };
      }
      if (!opts.lag) for (const [id, p] of P) sicht.set(id, kopie(p));
      return antwort;
    }
    throw new Error('unbekannte Anfrage: ' + query.slice(0, 60));
  };
  return { q, P, stat, kanaele, opts };
}
const speicher = (start = null) => { let s = start; return { lesen: () => (s ? JSON.parse(JSON.stringify(s)) : null), schreiben: (a) => { s = JSON.parse(JSON.stringify(a)); }, get: () => s }; };
const basis = (sh, extra = {}) => ({ q: sh.q, pause: async () => {}, log: () => {}, liste: liste(6), sicherung: speicher(), ledger: () => {}, ...extra });
const mitSicherung = async (sh, extra = {}) => { const si = speicher(); const o = basis(sh, { sicherung: si, ...extra }); await lauf({ ...o, sichern: true }); return { o, si }; };

// ---------------------------------------------------------------- pruefeListe
pruefe('echte Liste: in Ordnung', pruefeListe(echte) === null, pruefeListe(echte));
pruefe('echte Liste: 8 Einträge', echte.eintraege.length === 8);
pruefe('Liste fehlt', typeof pruefeListe(null) === 'string');
pruefe('Liste leer', typeof pruefeListe({ eintraege: [] }) === 'string');
pruefe('Liste zu gross (21)', typeof pruefeListe(liste(21)) === 'string');
pruefe('Liste mit 20 ist erlaubt', pruefeListe(liste(20)) === null);
pruefe('ungültiger Handle', /Handle/.test(pruefeListe({ eintraege: [{ ...eintrag(1), handle: 'Gold 1' }] })));
pruefe('ungültige ID', /Produkt-ID/.test(pruefeListe({ eintraege: [{ ...eintrag(1), id: 'gid://shopify/Product/abc' }] })));
pruefe('ID einer Variante abgelehnt', /Produkt-ID/.test(pruefeListe({ eintraege: [{ ...eintrag(1), id: 'gid://shopify/ProductVariant/5' }] })));
pruefe('ohne Beleg', /Beleg/.test(pruefeListe({ eintraege: [{ ...eintrag(1), beleg: [] }] })));
pruefe('Beleg zu kurz', /Beleg/.test(pruefeListe({ eintraege: [{ ...eintrag(1), beleg: ['Gold'] }] })));
pruefe('Beleg leere Zeichenkette', /Beleg/.test(pruefeListe({ eintraege: [{ ...eintrag(1), beleg: ['      '] }] })));
pruefe('doppelter Handle', /doppelt/.test(pruefeListe({ eintraege: [eintrag(1), { ...eintrag(1), id: gid(9) }] })));
pruefe('doppelte ID', /doppelt/.test(pruefeListe({ eintraege: [eintrag(1), { ...eintrag(2), id: gid(1) }] })));

// ---------------------------------------------------------------- Beleg und Entscheid
const roh = { id: gid(1), handle: 'gold-1', title: 'Armband', status: 'ACTIVE', tags: [], description: 'Mit 14K-Gold-Kette  und\nPerlen', options: [{ name: 'Farbe', values: ['Gold'] }] };
pruefe('belegDa: Gross/Klein und Leerraum egal', belegDa(roh, ['14k-GOLD-kette UND perlen']));
pruefe('belegDa: fehlt', !belegDa(roh, ['18K Gold']));
pruefe('belegDa: ein Satz von mehreren genügt', belegDa(roh, ['18K Gold', '14K-Gold-Kette']));
pruefe('belegDa: leere Liste', !belegDa(roh, []));
pruefe('belegDa: leerer Satz zählt nicht', !belegDa(roh, ['']));
pruefe('belegDa: Titel zählt', belegDa({ ...roh, title: 'Super 999er Feingold Perle' }, ['999er Feingold']));
pruefe('belegDa: Option zählt', belegDa({ ...roh, options: [{ name: 'Material', values: ['14 Karat Gold'] }] }, ['14 karat gold']));
pruefe('textVon ohne Felder wirft nicht', typeof textVon({}) === 'string');
const E1 = eintrag(1);
pruefe('entscheide: ACTIVE mit Beleg → tun', entscheide(roh, E1).tun === true);
pruefe('entscheide: nicht lesbar ist ein Fehler', entscheide(null, E1).fehler === true);
pruefe('entscheide: anderer Handle ist ein Fehler', entscheide({ ...roh, handle: 'x' }, E1).fehler === true);
pruefe('entscheide: andere ID ist ein Fehler', entscheide({ ...roh, id: gid(2) }, E1).fehler === true);
pruefe('entscheide: schon Entwurf mit Tag → nichts', entscheide({ ...roh, status: 'DRAFT', tags: [MARKER_GOLD] }, E1).tun === false);
pruefe('entscheide: Entwurf ohne Tag → nicht angefasst', entscheide({ ...roh, status: 'DRAFT' }, E1).tun === false);
pruefe('entscheide: Entwurf ohne Tag ist kein Fehler', !entscheide({ ...roh, status: 'DRAFT' }, E1).fehler);
pruefe('entscheide: ARCHIVED nicht angefasst', entscheide({ ...roh, status: 'ARCHIVED' }, E1).tun === false);
pruefe('entscheide: ACTIVE mit Tag (Rest) → tun', entscheide({ ...roh, tags: [MARKER_GOLD] }, E1).tun === true);
pruefe('entscheide: Beleg weg → nichts', entscheide({ ...roh, description: 'Armband aus Edelstahl' }, E1).tun === false);
pruefe('entscheide: Beleg weg ist kein Fehler', !entscheide({ ...roh, description: 'x' }, E1).fehler);

// ---------------------------------------------------------------- schreibMutation
{
  const m = schreibMutation([{ id: gid(1), status: 'DRAFT', tag: 'add' }, { id: gid(2), status: 'DRAFT', tag: 'add' }]);
  pruefe('Mutation: Aliase s0 t0 s1 t1', /s0:productUpdate/.test(m.query) && /t0:tagsAdd/.test(m.query) && /s1:productUpdate/.test(m.query) && /t1:tagsAdd/.test(m.query));
  pruefe('Mutation: Status vor Tag', m.query.indexOf('s0:') < m.query.indexOf('t0:'));
  pruefe('Mutation: Tag-Variable $g mit dem Arbeits-Tag', JSON.stringify(m.variables.g) === JSON.stringify([MARKER_GOLD]) && /\$g:\[String!\]!/.test(m.query));
  const nurStatus = schreibMutation([{ id: gid(1), status: 'ACTIVE' }]);
  pruefe('Mutation: ohne Tag keine Variable $g (variableNotUsed)', !/\$g/.test(nurStatus.query) && nurStatus.variables.g === undefined);
  const nurTag = schreibMutation([{ id: gid(1), tag: 'remove' }]);
  pruefe('Mutation: tagsRemove', /t0:tagsRemove/.test(nurTag.query) && !/productUpdate/.test(nurTag.query));
  pruefe('Mutation: verbotener Status wirft', (() => { try { schreibMutation([{ id: gid(1), status: 'ARCHIVED' }]); return false; } catch { return true; } })());
  pruefe('Mutation: verbotene Tag-Art wirft', (() => { try { schreibMutation([{ id: gid(1), tag: 'set' }]); return false; } catch { return true; } })());
  pruefe('Mutation: Eintrag ohne Auftrag wirft', (() => { try { schreibMutation([{ id: gid(1) }]); return false; } catch { return true; } })());
}

// ---------------------------------------------------------------- Trockenlauf, Sichern
{
  const sh = shop(6); const o = basis(sh);
  const code = await lauf(o);
  pruefe('Trockenlauf: Exit 0', code === 0);
  pruefe('Trockenlauf: keine Mutation', sh.stat.mutationen === 0);
  pruefe('Trockenlauf: alle noch aktiv', [...sh.P.values()].every((p) => p.status === 'ACTIVE'));
}
{
  const sh = shop(6); const si = speicher(); const o = basis(sh, { sicherung: si });
  const code = await lauf({ ...o, sichern: true });
  pruefe('Sichern: Exit 0', code === 0);
  pruefe('Sichern: keine Mutation, der Shop bleibt', sh.stat.mutationen === 0 && [...sh.P.values()].every((p) => p.status === 'ACTIVE' && !p.tags.includes(MARKER_GOLD)));
  const s = si.get();
  pruefe('Sichern: 6 Einträge mit Status, Tags, Kanälen', s?.length === 6 && s.every((e) => e.status === 'ACTIVE' && e.tags.includes('cj-real') && e.pubs.length === 3 && e.handle && e.title));
  await lauf({ ...o, sichern: true });
  pruefe('Sichern zweimal: keine Doppel', si.get().length === 6);
  // eine bestehende Sicherung wird nie überschrieben
  const alt = JSON.stringify(si.get()); sh.P.get(gid(1)).tags.push('neu'); sh.P.get(gid(1)).pubs = new Set(); 
  const sh2 = sh; await lauf({ ...o, sichern: true, q: sh2.q });
  pruefe('Sichern: vorhandene Einträge bleiben unverändert', JSON.stringify(si.get()) === alt);
}
{
  const sh = shop(6); const si = speicher(); const o = basis(sh, { sicherung: si, liste: { eintraege: [eintrag(1), { ...eintrag(2), beleg: ['gibt es nicht'] }] } });
  await lauf({ ...o, sichern: true });
  pruefe('Sichern: nur Produkte, die geschrieben würden', si.get().length === 1 && si.get()[0].handle === 'gold-1');
}

// ---------------------------------------------------------------- LIVE
{
  const sh = shop(6); const { o, si } = await mitSicherung(sh); const zeilen = [];
  const code = await lauf({ ...o, live: true, ledger: (z) => zeilen.push(z) });
  pruefe('Live: Exit 0', code === 0);
  pruefe('Live: alle 6 Entwurf mit Arbeits-Tag', [1, 2, 3, 4, 5, 6].every((i) => sh.P.get(gid(i)).status === 'DRAFT' && sh.P.get(gid(i)).tags.includes(MARKER_GOLD)));
  pruefe('Live: Fremdprodukte unberührt', [7, 8].every((i) => sh.P.get(gid(i)).status === 'ACTIVE' && !sh.P.get(gid(i)).tags.includes(MARKER_GOLD)));
  pruefe('Live: andere Tags bleiben', sh.P.get(gid(1)).tags.includes('cj-real'));
  pruefe('Live: 2 Pakete zu je 4 (6 Produkte)', sh.stat.mutationen === 2);
  pruefe('Live: Ledger je Produkt', zeilen.length === 6 && zeilen.every((z) => /\|ENTWURF\|gold-\d\|/.test(z)));
  const nach = sh.stat.mutationen;
  const code2 = await lauf({ ...o, live: true });
  pruefe('Live zweimal: nichts mehr zu tun, Exit 0', code2 === 0 && sh.stat.mutationen === nach);
}
{
  const sh = shop(6); const o = basis(sh);
  const code = await lauf({ ...o, live: true });
  pruefe('Live ohne Sicherung: Exit 2', code === 2);
  pruefe('Live ohne Sicherung: keine Mutation', sh.stat.mutationen === 0);
}
{
  const sh = shop(6); const si = speicher(); const o = basis(sh, { sicherung: si });
  await lauf({ ...o, sichern: true });
  si.schreiben(si.get().filter((e) => e.handle !== 'gold-3'));
  const code = await lauf({ ...o, live: true });
  pruefe('Live mit unvollständiger Sicherung: Exit 2, nichts geschrieben', code === 2 && sh.stat.mutationen === 0);
}
{
  const sh = shop(6); const si = speicher(); const o = basis(sh, { sicherung: si });
  await lauf({ ...o, sichern: true });
  si.schreiben(si.get().map((e) => ({ ...e, pubs: undefined })));
  pruefe('Live: Sicherung ohne Kanalliste gilt als unvollständig', (await lauf({ ...o, live: true })) === 2 && sh.stat.mutationen === 0);
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  sh.P.get(gid(2)).description = 'Armband aus Edelstahl, berichtigt'; for (const [id, p] of sh.P) void id;
  const code = await lauf({ ...o, live: true });
  pruefe('Live: berichtigter Text bleibt aktiv, Rest geht', code === 0 && sh.P.get(gid(2)).status === 'ACTIVE' && sh.P.get(gid(1)).status === 'DRAFT' && sh.P.get(gid(6)).status === 'DRAFT');
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  sh.P.get(gid(3)).status = 'DRAFT';
  const code = await lauf({ ...o, live: true });
  pruefe('Live: fremder Entwurf (ohne Tag) wird nicht angefasst und bekommt keinen Tag', code === 0 && sh.P.get(gid(3)).status === 'DRAFT' && !sh.P.get(gid(3)).tags.includes(MARKER_GOLD));
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  sh.P.get(gid(4)).handle = 'umbenannt';
  const code = await lauf({ ...o, live: true });
  pruefe('Live: Handle weicht ab → Exit 2 vor jedem Schreiben', code === 2 && sh.stat.mutationen === 0);
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  sh.P.delete(gid(5));
  const code = await lauf({ ...o, live: true });
  pruefe('Live: Produkt gelöscht (nicht lesbar) → Exit 2 vor jedem Schreiben', code === 2 && sh.stat.mutationen === 0);
}
{
  const sh = shop(6, { lag: 2 }); const { o } = await mitSicherung(sh);
  const code = await lauf({ ...o, live: true });
  pruefe('Live: Lesen mit Verzögerung wird abgewartet', code === 0 && sh.stat.lesungen > 4 && [1, 2, 3, 4, 5, 6].every((i) => sh.P.get(gid(i)).status === 'DRAFT'));
}
{
  const sh = shop(6, { lag: 99 }); const { o } = await mitSicherung(sh);
  const code = await lauf({ ...o, live: true, leseVersuche: 3 });
  pruefe('Live: Rücklesen weicht dauerhaft ab → Exit 6, kein zweites Paket', code === 6 && sh.stat.mutationen === 1);
}
{
  const sh = shop(6, { ignoriert: true }); const { o } = await mitSicherung(sh);
  const code = await lauf({ ...o, live: true, leseVersuche: 2 });
  pruefe('Live: Schreiben ohne Wirkung → Exit 6', code === 6);
}
{
  const sh = shop(6, { updateFehler: { s1: 'Zugriff verweigert' } }); const { o } = await mitSicherung(sh); const logs = [];
  const code = await lauf({ ...o, live: true, log: (z) => logs.push(z) });
  pruefe('Live: Fehler der Mutation → Exit 6 und Halt (zweites Paket nicht geschrieben)', code === 6 && sh.stat.mutationen === 1 && sh.P.get(gid(5)).status === 'ACTIVE' && sh.P.get(gid(6)).status === 'ACTIVE');
  pruefe('Live: Fehlertext im Log', logs.some((z) => /Zugriff verweigert/.test(z)));
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  const code = await lauf({ ...o, live: true, nur: ['gold-2', 'gold-3'] });
  pruefe('ONLY: nur die genannten', code === 0 && sh.P.get(gid(2)).status === 'DRAFT' && sh.P.get(gid(3)).status === 'DRAFT' && sh.P.get(gid(1)).status === 'ACTIVE' && sh.P.get(gid(4)).status === 'ACTIVE');
  const code2 = await lauf({ ...o, live: true, nur: ['gibt-es-nicht'] });
  pruefe('ONLY ohne Treffer: Exit 2', code2 === 2);
}
{
  const sh = shop(6); const o = basis(sh, { liste: { eintraege: [] } });
  pruefe('leere Liste: Exit 2 ohne Schreiben', (await lauf({ ...o, live: true })) === 2 && sh.stat.mutationen === 0);
}

// ---------------------------------------------------------------- Rücknahme
{
  const sh = shop(6, { verliert: true }); const { o, si } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  const vor = sh.stat.mutationen;
  const trocken = await lauf({ ...o, zurueck: true });
  pruefe('Rücknahme Trockenlauf: Exit 0, nichts geschrieben', trocken === 0 && sh.stat.mutationen === vor && sh.P.get(gid(1)).status === 'DRAFT');
  const zeilen = [];
  const code = await lauf({ ...o, zurueck: true, live: true, ledger: (z) => zeilen.push(z) });
  pruefe('Rücknahme: Exit 0', code === 0);
  pruefe('Rücknahme: alle wieder ACTIVE ohne Arbeits-Tag', [1, 2, 3, 4, 5, 6].every((i) => sh.P.get(gid(i)).status === 'ACTIVE' && !sh.P.get(gid(i)).tags.includes(MARKER_GOLD)));
  pruefe('Rücknahme: andere Tags bleiben', sh.P.get(gid(1)).tags.includes('cj-real'));
  pruefe('Rücknahme: verlorene Kanäle sind wieder da (3 von 3)', [1, 2, 3, 4, 5, 6].every((i) => sh.P.get(gid(i)).pubs.size === 3));
  pruefe('Rücknahme: Kanäle einzeln veröffentlicht', sh.stat.publizierungen === 18);
  pruefe('Rücknahme: Ledger ohne fehlende Kanäle', zeilen.length === 6 && zeilen.every((z) => /fehlend am Ende 0/.test(z)));
  pruefe('Rücknahme: Fremdprodukte unberührt', [7, 8].every((i) => sh.P.get(gid(i)).status === 'ACTIVE'));
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  const code = await lauf({ ...o, zurueck: true, live: true });
  pruefe('Rücknahme ohne Kanalverlust: keine Veröffentlichung nötig', code === 0 && sh.stat.publizierungen === 0);
}
{
  const sh = shop(6, { verliert: true, publFehler: true }); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  const code = await lauf({ ...o, zurueck: true, live: true, kanalVersuche: 2 });
  pruefe('Rücknahme: Kanäle nicht wiederherstellbar → Exit 6', code === 6);
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  sh.P.get(gid(2)).tags = sh.P.get(gid(2)).tags.filter((t) => t !== MARKER_GOLD);
  const code = await lauf({ ...o, zurueck: true, live: true });
  pruefe('Rücknahme: Produkt ohne Arbeits-Tag bleibt wie es ist', code === 0 && sh.P.get(gid(2)).status === 'DRAFT' && sh.P.get(gid(1)).status === 'ACTIVE');
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  const code = await lauf({ ...o, zurueck: true, live: true, nur: ['gold-4'] });
  pruefe('Rücknahme: ONLY nimmt nur eines zurück', code === 0 && sh.P.get(gid(4)).status === 'ACTIVE' && sh.P.get(gid(1)).status === 'DRAFT');
}
{
  const sh = shop(6); const o = basis(sh);
  pruefe('Rücknahme ohne Sicherung: Exit 2', (await lauf({ ...o, zurueck: true, live: true })) === 2);
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  const code = await lauf({ ...o, zurueck: true, live: true, liste: null });
  pruefe('Rücknahme braucht die Liste nicht', code === 0 && sh.P.get(gid(1)).status === 'ACTIVE');
}
{
  // Rücknahme: ein inzwischen von jemand anderem aktiviertes Produkt mit Tag verliert nur den Tag
  const sh = shop(6); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  sh.P.get(gid(1)).status = 'ACTIVE';
  const code = await lauf({ ...o, zurueck: true, live: true });
  pruefe('Rücknahme: aktives Produkt mit Tag verliert nur den Tag', code === 0 && sh.P.get(gid(1)).status === 'ACTIVE' && !sh.P.get(gid(1)).tags.includes(MARKER_GOLD));
}

// ---------------------------------------------------------------- Lücken aus der Mutationsprobe
pruefe('entscheide: schon Entwurf mit Tag meldet das ausdrücklich', /schon Entwurf mit Arbeits-Tag/.test(entscheide({ ...roh, status: 'DRAFT', tags: [MARKER_GOLD] }, E1).grund));
{
  // ungültige Liste, aber alle Produkte vorhanden: darf nichts schreiben
  const sh = shop(6); const si = speicher(); const o = basis(sh, { sicherung: si, liste: { eintraege: [eintrag(1), { ...eintrag(2), beleg: ['Gold'] }] } });
  await lauf({ ...o, liste: liste(6), sichern: true });
  const logs = [];
  const code = await lauf({ ...o, live: true, log: (z) => logs.push(z) });
  pruefe('Live mit ungültiger Liste (Beleg zu kurz): Exit 2, nichts geschrieben', code === 2 && sh.stat.mutationen === 0 && logs.some((z) => /Beleg/.test(z)));
  const sh21 = shop(21); const si21 = speicher(); const o21 = basis(sh21, { sicherung: si21, liste: liste(21) });
  pruefe('Live mit 21 Einträgen: Exit 2, nichts geschrieben', (await lauf({ ...o21, live: true })) === 2 && sh21.stat.mutationen === 0);
  pruefe('Trockenlauf mit ungültiger Liste: Exit 2', (await lauf({ ...o21 })) === 2);
}
{
  const sh = shop(6); const si = speicher(); const o = basis(sh, { sicherung: si });
  await lauf({ ...o, sichern: true });
  si.schreiben(si.get().map((e) => (e.handle === 'gold-2' ? { ...e, status: 'DRAFT' } : e)));
  const code = await lauf({ ...o, live: true });
  pruefe('Live: Sicherung mit anderem Status als ACTIVE ist unvollständig', code === 2 && sh.stat.mutationen === 0);
}
{
  const sh = shop(6, { statusIgnoriert: true }); const { o } = await mitSicherung(sh);
  const code = await lauf({ ...o, live: true, leseVersuche: 2 });
  pruefe('Live: Tag gesetzt, Status nicht → Exit 6', code === 6);
}
{
  const sh = shop(6, { tagIgnoriert: true }); const { o } = await mitSicherung(sh);
  const code = await lauf({ ...o, live: true, leseVersuche: 2 });
  pruefe('Live: Status gesetzt, Tag nicht → Exit 6', code === 6);
}
{
  const sh = shop(6); const { o, si } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  sh.opts.statusIgnoriert = true;
  const code = await lauf({ ...o, zurueck: true, live: true, leseVersuche: 2 });
  pruefe('Rücknahme: Tag weg, Status nicht zurück → Exit 6', code === 6 && sh.P.get(gid(1)).status === 'DRAFT');
}
{
  const sh = shop(6); const { o } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  sh.opts.lag = 99;
  const code = await lauf({ ...o, zurueck: true, live: true, leseVersuche: 2 });
  pruefe('Rücknahme: Rücklesen weicht dauerhaft ab → Exit 6', code === 6);
}
{
  // Rücknahme stellt den gesicherten Status wieder her (hier absichtlich ein von Hand angepasster Eintrag)
  const sh = shop(6); const { o, si } = await mitSicherung(sh);
  await lauf({ ...o, live: true });
  si.schreiben(si.get().map((e) => (e.handle === 'gold-1' ? { ...e, status: 'DRAFT' } : e)));
  const code = await lauf({ ...o, zurueck: true, live: true });
  pruefe('Rücknahme: Status wie gesichert (nicht fest ACTIVE)', code === 0 && sh.P.get(gid(1)).status === 'DRAFT' && !sh.P.get(gid(1)).tags.includes(MARKER_GOLD) && sh.P.get(gid(2)).status === 'ACTIVE');
}
{
  const sh = shop(6, { verliert: true, publFehler: true }); const { o } = await mitSicherung(sh); const zeilen = [];
  await lauf({ ...o, live: true });
  await lauf({ ...o, zurueck: true, live: true, kanalVersuche: 2, ledger: (z) => zeilen.push(z) });
  pruefe('Rücknahme: Ledger nennt die fehlenden Kanäle (3 je Produkt)', zeilen.length === 6 && zeilen.every((z) => /fehlend am Ende 3/.test(z)));
}

// ---------------------------------------------------------------- Echte Eingabe
{
  const export_ = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/edel/produkte_voll.jsonl';
  if (existsSync(export_)) {
    const wanted = new Map(echte.eintraege.map((e) => [e.handle, e])); let gefunden = 0;
    for (const z of readFileSync(export_, 'utf8').split('\n')) {
      if (!z.trim()) continue; const p = JSON.parse(z); const e = wanted.get(p.handle); if (!e) continue; gefunden++;
      pruefe(`Eingabedatei ${p.handle}: ID gleich`, p.id === e.id);
      pruefe(`Eingabedatei ${p.handle}: Beleg steht im echten Text`, belegDa({ title: p.title, description: p.description, options: p.options }, e.beleg));
    }
    pruefe('Eingabedatei: alle 8 im Export gefunden', gefunden === 8);
  }
}

console.log(`${ok} Prüfungen bestanden, ${bad} Fehler`);
process.exit(bad ? 1 : 0);
