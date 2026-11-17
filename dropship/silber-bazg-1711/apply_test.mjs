// Test für lib.mjs und apply.mjs gegen eine strenge Attrappe des Shops (kein Netz). Lauf: node dropship/silber-bazg-1711/apply_test.mjs
import { MARKER, hat925, waehleAusKatalog, entscheide, flach, publikationsLuecken, schreibMutation, anweisungEntwurf, anweisungZurueck, mutationsFehler, probeBestanden, LESEN, PUBLIZIEREN } from './lib.mjs';
import { lauf } from './apply.mjs';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };
const gleich = (name, a, b) => pruefe(name, JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const ALLE_KANAELE = ['P1', 'P2', 'P3'];

/**
 * Attrappe des Shops. Strenger als die erste Fassung: prüft Variablentypen und Argumentnamen, die Obergrenze von `first`, führt Felder in Dokumentreihenfolge aus,
 * kann Lesen verzögern, Kanäle verlieren und später zurückgeben, Fehler nur beim Status oder nur beim Tag melden, mitten im Lauf werfen und ein Produkt wieder aktivieren.
 */
class Shop {
  constructor(opt = {}) { this.p = new Map(); this.opt = opt; this.ereignisse = []; this.mutationen = 0; this.publizierAufrufe = []; this.lesungen = 0; this.alt = null; this.lagBis = 0; this.rueckkehr = []; }
  add(id, handle, title, extra = {}) {
    this.p.set(id, { id, handle, title, status: 'ACTIVE', tags: ['sort-schmuck'], productType: 'Schmuck', pubs: [...ALLE_KANAELE], unveroeff: [], ...extra });
    return this;
  }
  kopie() { return new Map([...this.p].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])); }
  markiereSchreiben() { if (this.opt.leseVerzoegerung) { this.alt = this.kopie(); this.lagBis = this.lesungen + this.opt.leseVerzoegerung; } }
  async q(query, vars = {}) {
    const kopf = (query.match(/^\s*(?:query|mutation)\(([^)]*)\)/) || [])[1] || '';
    const typen = Object.fromEntries([...kopf.matchAll(/\$(\w+):\s*([^,)]+(?:\([^)]*\))?)/g)].map((m) => [m[1], m[2].trim()]));
    const sollTyp = (n) => (/^p\d+$/.test(n) ? 'ProductUpdateInput!' : /^i\d+$/.test(n) || n === 'id' ? 'ID!' : n === 'g' ? '[String!]!' : n === 'in' ? '[PublicationInput!]!' : n === 'ids' ? '[ID!]!' : null);
    for (const [n, t] of Object.entries(typen)) { const s = sollTyp(n); if (!s) throw new Error('GraphQL: unbekannte Variable $' + n); if (s.replace(/\s/g, '') !== t.replace(/\s/g, '')) throw new Error(`GraphQL: Variable $${n} hat Typ ${t}, erwartet ${s}`); }
    const body = query.slice(query.indexOf('{'));
    for (const v of new Set([...body.matchAll(/\$(\w+)/g)].map((m) => m[1]))) { if (!(v in typen)) throw new Error('GraphQL: Variable $' + v + ' nicht deklariert'); }
    for (const v of Object.keys(typen)) if (!(v in vars)) throw new Error('GraphQL: Variable $' + v + ' ohne Wert');

    if (/^\s*query/.test(query) && query.includes('nodes(ids')) {
      if (vars.ids.length > 250) throw new Error('GraphQL: zu viele IDs');
      for (const m of query.matchAll(/first:\s*(\d+)/g)) if (Number(m[1]) > 250) throw new Error('GraphQL: first über 250');
      if (!/onlyPublished:\s*(true|false)/.test(query)) throw new Error('GraphQL: onlyPublished fehlt');
      this.lesungen++; this.ereignisse.push('lesen');
      for (const x of this.rueckkehr) if (!x.fertig && this.lesungen >= x.bei) { const p = this.p.get(x.id); p.pubs = [...x.pubs]; x.fertig = true; }
      if (this.opt.reaktiviere && this.lesungen === this.opt.reaktiviere.beiLesung) { for (const p of this.p.values()) if (p.handle === this.opt.reaktiviere.handle) p.status = 'ACTIVE'; }
      const quelle = this.alt && this.lesungen <= this.lagBis ? this.alt : this.p;
      const hat = (f) => new RegExp('\\b' + f + '\\b').test(query);
      return { nodes: vars.ids.map((id) => {
        const p = quelle.get(id); if (!p) return null;
        const n = { id: p.id };
        if (hat('handle')) n.handle = p.handle; if (hat('title')) n.title = p.title; if (hat('status')) n.status = p.status; if (hat('tags')) n.tags = [...p.tags]; if (hat('productType')) n.productType = p.productType;
        const nurVer = /pub:resourcePublicationsV2\(first:\s*\d+,\s*onlyPublished:\s*true/.test(query);   // onlyPublished:false liefert auch die nur vorgemerkten
        const grenzePub = Number((/pub:resourcePublicationsV2\(first:\s*(\d+)/.exec(query) || [])[1] || 0);
        if (query.includes('pub:resourcePublicationsV2')) n.pub = { nodes: [...p.pubs, ...(nurVer ? [] : p.unveroeff)].slice(0, grenzePub).map((x) => ({ publication: { id: x } })) };
        const grenzeAlle = Number((/alle:resourcePublicationsV2\(first:\s*(\d+)/.exec(query) || [])[1] || 0);
        if (query.includes('alle:resourcePublicationsV2')) n.alle = { nodes: [...p.pubs.map((x) => ({ isPublished: true, publication: { id: x } })), ...p.unveroeff.map((x) => ({ isPublished: false, publication: { id: x } }))] };
        return n;
      }) };
    }
    if (query.includes('publishablePublish')) {
      this.ereignisse.push('publizieren'); this.publizierAufrufe.push({ id: vars.id, kanaele: vars.in.map((x) => x.publicationId) });
      const p = this.p.get(vars.id); const fehler = [];
      for (const x of vars.in) {
        if (this.opt.publizierenFehler || this.opt.publizierenFehlerFuer === x.publicationId) { fehler.push({ field: ['input'], message: 'nicht erlaubt (Attrappe)' }); continue; }
        if (!p.pubs.includes(x.publicationId)) p.pubs.push(x.publicationId);
      }
      return { publishablePublish: { userErrors: fehler } };
    }
    // Mutation mit Aliasen
    this.mutationen++;
    if (this.opt.wirftBeiMutation === this.mutationen) throw new Error('GraphQL: fetch: Netzwerk (Attrappe)');
    const felder = [...body.matchAll(/(\w+):(\w+)\(([^)]*)\)/g)];
    for (const m of felder) {
      if (!['productUpdate', 'tagsAdd', 'tagsRemove'].includes(m[2])) throw new Error('GraphQL: unbekanntes Feld ' + m[2]);
      if (m[2] === 'productUpdate' && !/^product:\$p\d+$/.test(m[3])) throw new Error('GraphQL: productUpdate verlangt das Argument product');
      if (m[2] !== 'productUpdate' && !/^id:\$i\d+,tags:\$g$/.test(m[3])) throw new Error('GraphQL: tagsAdd/tagsRemove verlangen id und tags: ' + m[3]);
    }
    this.markiereSchreiben();
    const antwort = {};
    for (const m of felder) {                                  // in Dokumentreihenfolge
      const [, alias, feld, args] = m;
      if (feld === 'productUpdate') {
        const eingabe = vars[/\$(p\d+)/.exec(args)[1]]; const p = this.p.get(eingabe.id); this.ereignisse.push('status ' + p.handle + ' ' + eingabe.status);
        if (this.opt.fehlerBei === p.handle) { antwort[alias] = { userErrors: [{ field: ['id'], message: 'Fehler (Attrappe)' }] }; continue; }
        if (this.opt.ignoriereStatus !== p.handle) {
          const war = p.status; p.status = eingabe.status;
          if (eingabe.status === 'ACTIVE' && war === 'DRAFT' && this.opt.kanaeleKommenMitAktiv) { p.pubs = [...p.pubs, ...p.unveroeff]; p.unveroeff = []; }
          if (eingabe.status === 'DRAFT' && this.opt.verliertKanaeleImEntwurf) { p.unveroeff = [...p.pubs]; p.pubs = []; }
          if (eingabe.status === 'ACTIVE' && war === 'DRAFT' && this.opt.verliertKanaeleBeiAktiv) {
            const verloren = p.pubs.slice(1); p.pubs = p.pubs.slice(0, 1);
            if (this.opt.kanaeleKommenNach) this.rueckkehr.push({ id: p.id, bei: this.lesungen + this.opt.kanaeleKommenNach, pubs: [...verloren, ...p.pubs], fertig: false });
          }
        }
        antwort[alias] = this.opt.meldetFehlerTrotzdem === p.handle ? { userErrors: [{ field: ['id'], message: 'Warnung trotz Anwendung (Attrappe)' }] } : { userErrors: [] };
      } else {
        const p = this.p.get(vars[/\$(i\d+)/.exec(args)[1]]); const tags = vars.g;
        if (this.opt.fehlerBeiTag === p.handle) { antwort[alias] = { userErrors: [{ field: ['tags'], message: 'Tag-Fehler (Attrappe)' }] }; continue; }
        if (this.opt.ignoriereTag === p.handle) { antwort[alias] = { userErrors: [] }; continue; }
        if (feld === 'tagsAdd') for (const t of tags) { if (!p.tags.includes(t)) p.tags.push(t); } else p.tags = p.tags.filter((t) => !tags.includes(t));
        antwort[alias] = { userErrors: [] };
      }
    }
    return antwort;
  }
}
const mk = (n, opt) => { const s = new Shop(opt); for (let i = 1; i <= n; i++) s.add('gid://p/' + i, 'silber-' + i, `Ring 925 Silber Nr. ${i}`); return s; };
const listeVon = (s, erzeugt = '2026-11-17T08:00:00Z') => ({ erzeugt, eintraege: [...s.p.values()].filter((p) => /925/.test(p.title)).map((p) => ({ id: p.id, handle: p.handle, title: p.title, productType: p.productType })) });
const JETZT = () => new Date('2026-11-17T09:00:00Z');
function io(anfang = null) {
  const st = { sich: anfang, erledigt: [], ledger: [], log: [], sichSchreibungen: 0 };
  return { st, sicherung: {
    lesen: () => (st.sich ? JSON.parse(JSON.stringify(st.sich)) : null),
    schreiben: (a) => { st.sich = JSON.parse(JSON.stringify(a)); st.sichSchreibungen++; },
    entfernen: (ids) => { st.erledigt.push(...(st.sich || []).filter((e) => ids.includes(e.id))); st.sich = (st.sich || []).filter((e) => !ids.includes(e.id)); },
  }, ledger: (z) => st.ledger.push(z), log: (z) => st.log.push(z) };
}
const lade = (s, extra = {}) => { const i = extra.io || io(extra.sicherung); const schr = i.sicherung.schreiben; i.sicherung.schreiben = (a) => { s.ereignisse.push('sicherung'); schr(a); }; return { i, o: { q: (a, b) => s.q(a, b), liste: listeVon(s), live: false, zurueck: false, probe: false, sichern: false, nur: [], pause: async () => {}, jetzt: JETZT, sicherung: i.sicherung, ledger: i.ledger, log: i.log, ...extra.o } }; };
const art = (i, a) => i.st.ledger.filter((z) => z.split('|')[1] === a);

// ================================================================ lib
for (const t of ['925 Silber Ring', 'Ring S925 Sterling', 'Halskette Sterling Silber 925er Stempel', 'Armband (925)', '925']) pruefe('hat925 ja: ' + t, hat925(t));
for (const t of ['Ring 19250 Stück', 'A9251 Modell', 'Baujahr 1925 Ring', 'Silberring 92.5', 'Edelstahl Ring', '', null, undefined]) pruefe('hat925 nein: ' + t, !hat925(t));
{
  const kat = [{ id: 'b', handle: 'b-ring', title: 'Ring 925', tags: [], productType: 'Ring' }, { id: 'a', handle: 'a-ring', title: 'S925 Kette', tags: ['x'] },
    { id: 'c', handle: 'c', title: 'Edelstahl', tags: [] }, { id: 'd', handle: 'd', title: 'Ring 925', tags: [MARKER] }, { handle: 'e', title: '925' }, null];
  gleich('waehle: nur 925 ohne Marker, sortiert', waehleAusKatalog(kat).map((x) => x.handle), ['a-ring', 'b-ring']);
  gleich('waehle: leere Eingabe', waehleAusKatalog(undefined), []);
}
{
  const basis = { id: 'x', handle: 'h', title: 'Ring 925', status: 'ACTIVE', tags: [], productType: '', pubs: [], pubsAlle: [] };
  const e = (abw, opt) => entscheide({ ...basis, ...abw }, opt);
  gleich('entscheide: aktiv → voll', [e({}).tun, e({}).art], [true, 'voll']);
  gleich('entscheide: aktiv MIT Tag → voll (Rest eines Abbruchs)', [e({ tags: [MARKER] }).tun, e({ tags: [MARKER] }).art], [true, 'voll']);
  gleich('entscheide: Entwurf mit Tag → nichts', e({ status: 'DRAFT', tags: [MARKER] }).tun, false);
  gleich('entscheide: Entwurf ohne Tag, in Sicherung → nurTag', [e({ status: 'DRAFT' }, { inSicherung: true }).tun, e({ status: 'DRAFT' }, { inSicherung: true }).art], [true, 'nurTag']);
  gleich('entscheide: Entwurf ohne Tag, nicht in Sicherung → nichts (nicht von uns)', e({ status: 'DRAFT' }).tun, false);
  gleich('entscheide: ARCHIVED → nichts', e({ status: 'ARCHIVED' }, { inSicherung: true }).tun, false);
  gleich('entscheide: Titel ohne 925 → nichts', e({ title: 'Ring Edelstahl' }).tun, false);
  gleich('entscheide: null → nichts', entscheide(null).tun, false);
  gleich('flach: Kanäle sortiert', flach({ id: 'i', handle: 'h', title: 't', status: 'ACTIVE', tags: ['a'], pub: { nodes: [{ publication: { id: 'B' } }, { publication: { id: 'A' } }] } }).pubs, ['A', 'B']);
  pruefe('flach: ohne id → null', flach({}) === null && flach(null) === null);
  gleich('Lücken', publikationsLuecken(['A', 'B', 'C'], ['B']), ['A', 'C']);
  gleich('Lücken: nachher unbekannt', publikationsLuecken(['A'], undefined), ['A']);
  gleich('Lücken: nichts fehlt', publikationsLuecken(['A'], ['A', 'Z']), []);
}
{
  const d = schreibMutation([{ id: 'gid://p/1', status: 'DRAFT', tag: 'add' }, { id: 'gid://p/2', tag: 'add' }, { id: 'gid://p/3', status: 'ACTIVE', tag: 'remove' }, { id: 'gid://p/4', tag: 'remove' }]);
  pruefe('Mutation: Aliase und Felder', /s0:productUpdate/.test(d.query) && /t0:tagsAdd/.test(d.query) && !/s1:/.test(d.query) && /t1:tagsAdd/.test(d.query) && /s2:productUpdate/.test(d.query) && /t2:tagsRemove/.test(d.query) && /t3:tagsRemove/.test(d.query) && !/s3:/.test(d.query));
  pruefe('Mutation: Status vor Tag je Produkt', d.query.indexOf('s0:') < d.query.indexOf('t0:'));
  gleich('Mutation: Variablen', [d.variables.p0, d.variables.i1, d.variables.p2, d.variables.i3, d.variables.g], [{ id: 'gid://p/1', status: 'DRAFT' }, 'gid://p/2', { id: 'gid://p/3', status: 'ACTIVE' }, 'gid://p/4', [MARKER]]);
  for (const [n, e] of [['Status ARCHIVED', { id: 'x', status: 'ARCHIVED' }], ['Tag-Art unbekannt', { id: 'x', tag: 'loeschen' }], ['leerer Auftrag', { id: 'x' }]]) { let w = null; try { schreibMutation([e]); } catch (x) { w = x; } pruefe('Mutation wirft: ' + n, !!w); }
  gleich('Entwurf-Anweisung voll', anweisungEntwurf({ id: 'a' }, 'voll'), { id: 'a', status: 'DRAFT', tag: 'add' });
  gleich('Entwurf-Anweisung nurTag', anweisungEntwurf({ id: 'a' }, 'nurTag'), { id: 'a', tag: 'add' });
  gleich('Rücknahme-Anweisung: Entwurf mit Tag', anweisungZurueck({ id: 'a', status: 'ACTIVE' }, { status: 'DRAFT', tags: [MARKER] }), { id: 'a', status: 'ACTIVE', tag: 'remove' });
  gleich('Rücknahme-Anweisung: aktiv mit Tag', anweisungZurueck({ id: 'a', status: 'ACTIVE' }, { status: 'ACTIVE', tags: [MARKER] }), { id: 'a', tag: 'remove' });
  gleich('Rücknahme-Anweisung: Entwurf ohne Tag', anweisungZurueck({ id: 'a', status: 'ACTIVE' }, { status: 'DRAFT', tags: [] }), { id: 'a', status: 'ACTIVE' });
  gleich('Mutationsfehler: Alias und Index', mutationsFehler({ s3: { userErrors: [{ field: ['a', 'b'], message: 'bad' }] }, t0: { userErrors: [] }, x: null, t7: { userErrors: [{ field: null, message: 'x' }] } }).map((f) => [f.alias, f.index]), [['s3', 3], ['t7', 7]]);
  pruefe('LESEN verlangt Status, Tags, Titel, beide Kanal-Listen', ['status', 'tags', 'title', 'pub:resourcePublicationsV2', 'alle:resourcePublicationsV2'].every((f) => LESEN.includes(f)));
  pruefe('PUBLIZIEREN deklariert beide Variablen', /\$id:ID!/.test(PUBLIZIEREN) && /\$in:\[PublicationInput!\]!/.test(PUBLIZIEREN));
}
{
  const t = '2026-11-17T09:00:00.000Z', j = new Date('2026-11-17T12:00:00Z');
  const gut = `${t}|PROBE|h|vorher 8 | im Entwurf 0/8 | zurück 8 | fehlend am Ende 0 | Endstatus DRAFT`;
  gleich('Probe-Tor: bestanden', probeBestanden(['x|ENTWURF|a|b', gut], j), true);
  pruefe('Probe-Tor: keine Probe', probeBestanden(['x|ENTWURF|a|b'], j) !== true);
  pruefe('Probe-Tor: leer/undefined', probeBestanden([], j) !== true && probeBestanden(undefined, j) !== true);
  pruefe('Probe-Tor: 25 Stunden alt', probeBestanden([gut], new Date('2026-11-18T10:00:00Z')) !== true);
  gleich('Probe-Tor: genau 24 Stunden', probeBestanden([gut], new Date('2026-11-18T09:00:00Z')), true);
  pruefe('Probe-Tor: aus der Zukunft', probeBestanden([gut], new Date('2026-11-17T08:00:00Z')) !== true);
  pruefe('Probe-Tor: fehlende Kanäle', probeBestanden([gut.replace('fehlend am Ende 0', 'fehlend am Ende 2')], j) !== true);
  pruefe('Probe-Tor: «fehlend am Ende 05» zählt nicht als 0', probeBestanden([gut.replace('fehlend am Ende 0', 'fehlend am Ende 05')], j) !== true);
  pruefe('Probe-Tor: falscher Endstatus', probeBestanden([gut.replace('Endstatus DRAFT', 'Endstatus ACTIVE')], j) !== true);
  pruefe('Probe-Tor: Fehler im Text', probeBestanden([gut + ' | FEHLER Netz'], j) !== true);
  pruefe('Probe-Tor: nur die LETZTE Probe zählt', probeBestanden([gut, `${t}|PROBE|h|fehlend am Ende 3 | Endstatus DRAFT`], j) !== true);
}

// ================================================================ Trockenlauf
{
  const s = mk(5); const { i, o } = lade(s);
  gleich('Trockenlauf: Exit 0', await lauf(o), 0);
  pruefe('Trockenlauf: keine Mutation, nichts veröffentlicht, Sicherung und Ledger unberührt', s.mutationen === 0 && s.publizierAufrufe.length === 0 && i.st.sich === null && i.st.ledger.length === 0);
  pruefe('Trockenlauf: Meldung', i.st.log.some((z) => /zu ändern: 5 von 5/.test(z)) && i.st.log.some((z) => /Trockenlauf, nichts geschrieben/.test(z)));
  pruefe('Trockenlauf: alle bleiben ACTIVE', [...s.p.values()].every((p) => p.status === 'ACTIVE'));
}
// ================================================================ Live, 23 Produkte in drei Paketen, Idempotenz, Rücknahme
{
  const s = mk(23); s.add('gid://p/fremd', 'fremd', 'Edelstahl Ring'); const { i, o } = lade(s, { o: { live: true } });
  gleich('Live: Exit 0', await lauf(o), 0);
  const silber = () => [...s.p.values()].filter((p) => /925/.test(p.title));
  pruefe('Live: alle 23 DRAFT mit Arbeits-Tag, ursprüngliche Tags bleiben', silber().every((p) => p.status === 'DRAFT' && p.tags.includes(MARKER) && p.tags.includes('sort-schmuck')));
  pruefe('Live: Fremdprodukt unberührt', s.p.get('gid://p/fremd').status === 'ACTIVE' && !s.p.get('gid://p/fremd').tags.includes(MARKER));
  gleich('Live: 3 Pakete (10+10+3)', s.mutationen, 3);
  gleich('Live: Sicherung 23 Einträge', i.st.sich.length, 23);
  pruefe('Live: Sicherung trägt Status, Tags OHNE Arbeits-Tag und Kanäle vom Zustand VOR dem Schreiben', i.st.sich.every((e) => e.status === 'ACTIVE' && e.tags.join() === 'sort-schmuck' && e.pubs.length === 3));
  pruefe('Live: Sicherung wurde VOR dem ersten Statuswechsel geschrieben, und nur einmal', s.ereignisse.indexOf('sicherung') > -1 && s.ereignisse.indexOf('sicherung') < s.ereignisse.findIndex((e) => e.startsWith('status')) && i.st.sichSchreibungen === 1);
  gleich('Live: Ledger 23 ENTWURF', art(i, 'ENTWURF').length, 23);
  const vorher = s.mutationen, sichVorher = JSON.stringify(i.st.sich);
  gleich('Zweiter Lauf: Exit 0', await lauf({ ...o }), 0);
  gleich('Zweiter Lauf: keine neue Mutation (idempotent)', s.mutationen, vorher);
  gleich('Zweiter Lauf: Sicherung unverändert', JSON.stringify(i.st.sich), sichVorher);
  // Rücknahme: Trockenlauf, dann live
  const z0 = lade(s, { io: i, o: { zurueck: true, liste: null } });
  gleich('Rücknahme Trockenlauf: Exit 0', await lauf(z0.o), 0);
  pruefe('Rücknahme Trockenlauf: nichts geschrieben, Sicherung bleibt', silber().every((p) => p.status === 'DRAFT') && i.st.sich.length === 23);
  const z1 = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme live: Exit 0', await lauf(z1.o), 0);
  pruefe('Rücknahme: alle wieder ACTIVE, Arbeits-Tag weg, andere Tags bleiben', silber().every((p) => p.status === 'ACTIVE' && !p.tags.includes(MARKER) && p.tags.includes('sort-schmuck')));
  pruefe('Rücknahme: Kanäle unverändert, nichts neu veröffentlicht', s.publizierAufrufe.length === 0 && [...s.p.values()].every((p) => p.pubs.length === 3));
  pruefe('Rücknahme: Sicherung geleert, 23 Einträge ins Erledigt-Archiv', i.st.sich.length === 0 && i.st.erledigt.length === 23);
  gleich('Rücknahme: 23 ZURUECK im Ledger', art(i, 'ZURUECK').length, 23);
  const z2 = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme nach vollständiger Rücknahme: Exit 2 (keine Sicherung mehr)', await lauf(z2.o), 2);
}
{
  // Echte Produkte haben bis zu 8 Kanäle (Online Store, Shop, Google, Meta, TikTok, Pinterest, Inbox, Headless)
  const acht = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
  const s = mk(2); for (const p of s.p.values()) p.pubs = [...acht];
  const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe mit 8 Kanälen: Exit 0', await lauf(o), 0);
  pruefe('Probe mit 8 Kanälen: alle 8 in der Sicherung und im Ledger', i.st.sich[0].pubs.length === 8 && /vorher 8 \|/.test(art(i, 'PROBE')[0]));
  const s2 = mk(2); for (const p of s2.p.values()) p.pubs = [...acht];
  const b = lade(s2, { o: { live: true } });
  gleich('Massenlauf mit 8 Kanälen: Exit 0', await lauf(b.o), 0);
  pruefe('Massenlauf mit 8 Kanälen: Sicherung hat überall 8', b.i.st.sich.every((e) => e.pubs.length === 8));
}
// ================================================================ 120 Produkte: mehrere Lese-Blöcke (50) und 12 Pakete
{
  const s = mk(120); const { i, o } = lade(s, { o: { live: true } });
  gleich('120 Produkte: Exit 0', await lauf(o), 0);
  pruefe('120 Produkte: alle DRAFT mit Tag (auch die Positionen 50 bis 59 jedes Lese-Blocks)', [...s.p.values()].every((p) => p.status === 'DRAFT' && p.tags.includes(MARKER)));
  gleich('120 Produkte: 12 Pakete', s.mutationen, 12);
}
// ================================================================ Überspringen
{
  const s = mk(7);
  s.p.get('gid://p/1').status = 'DRAFT'; s.p.get('gid://p/2').status = 'ARCHIVED'; s.p.get('gid://p/3').title = 'Ring Edelstahl'; s.p.get('gid://p/4').status = 'DRAFT'; s.p.get('gid://p/4').tags.push(MARKER);
  const { i, o } = lade(s, { o: { live: true } });
  o.liste = { erzeugt: '2026-11-17T08:00:00Z', eintraege: [...s.p.values()].map((p) => ({ id: p.id, handle: p.handle, title: /Edelstahl/.test(p.title) ? 'Ring 925 Silber alt' : p.title, productType: 'Schmuck' })) };
  gleich('Überspringen: Exit 0', await lauf(o), 0);
  pruefe('Überspringen: fremder Entwurf, ARCHIVED, geänderter Titel, Entwurf mit Tag bleiben wie sie waren', s.p.get('gid://p/1').status === 'DRAFT' && !s.p.get('gid://p/1').tags.includes(MARKER) && s.p.get('gid://p/2').status === 'ARCHIVED' && s.p.get('gid://p/3').status === 'ACTIVE' && !s.p.get('gid://p/3').tags.includes(MARKER));
  pruefe('Überspringen: 5, 6, 7 geschrieben', ['5', '6', '7'].every((n) => s.p.get('gid://p/' + n).status === 'DRAFT'));
  gleich('Überspringen: Sicherung nur die 3 geänderten', i.st.sich.map((e) => e.handle), ['silber-5', 'silber-6', 'silber-7']);
  pruefe('Überspringen: Gründe im Protokoll', i.st.log.filter((z) => /ÜBERSPRUNGEN/.test(z)).length === 4);
}
// ================================================================ Halt bei Fehlern und Fortsetzen
{
  const s = mk(25, { fehlerBei: 'silber-12' }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Statusfehler: Exit 6', await lauf(o), 6);
  pruefe('Statusfehler: Paket 3 (21 bis 25) nicht angefasst', ['21', '22', '23', '24', '25'].every((n) => s.p.get('gid://p/' + n).status === 'ACTIVE'));
  gleich('Statusfehler: Sicherung enthält alle 25 (vor dem Schreiben)', i.st.sich.length, 25);
  pruefe('Statusfehler: FEHLER im Ledger MIT dem Handle des Produkts', art(i, 'FEHLER').some((z) => z.split('|')[2] === 'silber-12'));
  gleich('Statusfehler: Paket 2 vollständig zurückgelesen (10 + 9 ENTWURF, 1 ABWEICHUNG)', [art(i, 'ENTWURF').length, art(i, 'ABWEICHUNG').length], [19, 1]);
  // Fortsetzen: Ursache behoben, derselbe Lauf holt den Rest
  const s2 = new Shop(); s2.p = s.p; const o2 = lade(s2, { io: i, o: { live: true } }).o;
  gleich('Fortsetzen nach Statusfehler: Exit 0', await lauf(o2), 0);
  pruefe('Fortsetzen: alle 25 DRAFT mit Tag', [...s.p.values()].every((p) => p.status === 'DRAFT' && p.tags.includes(MARKER)));
}
{
  // Tag-Fehler: Status ist schon ENTWURF, der Tag fehlt → Sackgasse der ersten Fassung
  const s = mk(12, { fehlerBeiTag: 'silber-4' }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Tag-Fehler: Exit 6', await lauf(o), 6);
  pruefe('Tag-Fehler: Produkt 4 ist ENTWURF ohne Tag', s.p.get('gid://p/4').status === 'DRAFT' && !s.p.get('gid://p/4').tags.includes(MARKER));
  pruefe('Tag-Fehler: Paket 2 (11, 12) nicht angefasst', s.p.get('gid://p/11').status === 'ACTIVE' && s.p.get('gid://p/12').status === 'ACTIVE');
  s.opt.fehlerBeiTag = null;
  const o2 = lade(s, { io: i, o: { live: true } }).o;
  gleich('Tag-Fehler: Fortsetzen Exit 0', await lauf(o2), 0);
  pruefe('Tag-Fehler: Produkt 4 jetzt mit Tag, Rest erledigt', s.p.get('gid://p/4').tags.includes(MARKER) && [...s.p.values()].every((p) => p.status === 'DRAFT' && p.tags.includes(MARKER)));
}
{
  // Status-Fehler bei vorhandenem Tag: Produkt bleibt AKTIV mit Tag (die zweite Sackgasse)
  const s = mk(3, { fehlerBei: 'silber-2' }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Aktiv-mit-Tag: Exit 6', await lauf(o), 6);
  pruefe('Aktiv-mit-Tag: Produkt 2 ist ACTIVE mit Tag', s.p.get('gid://p/2').status === 'ACTIVE' && s.p.get('gid://p/2').tags.includes(MARKER));
  s.opt.fehlerBei = null;
  const o2 = lade(s, { io: i, o: { live: true } }).o;
  gleich('Aktiv-mit-Tag: Fortsetzen Exit 0', await lauf(o2), 0);
  pruefe('Aktiv-mit-Tag: danach ENTWURF mit Tag', s.p.get('gid://p/2').status === 'DRAFT');
}
{
  // Ausnahme (Netz) mitten im Lauf
  const s = mk(25, { wirftBeiMutation: 2 }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Ausnahme im 2. Paket: Exit 6', await lauf(o), 6);
  pruefe('Ausnahme: Paket 1 geschrieben, Paket 2 und 3 nicht', s.p.get('gid://p/10').status === 'DRAFT' && s.p.get('gid://p/11').status === 'ACTIVE' && s.p.get('gid://p/25').status === 'ACTIVE');
  pruefe('Ausnahme: im Ledger als FEHLER mit Text', art(i, 'FEHLER').some((z) => /Ausnahme/.test(z)));
  const o2 = lade(s, { io: i, o: { live: true } }).o;
  gleich('Ausnahme: Fortsetzen Exit 0', await lauf(o2), 0);
  pruefe('Ausnahme: danach alle 25 DRAFT', [...s.p.values()].every((p) => p.status === 'DRAFT' && p.tags.includes(MARKER)));
}
{
  // Rücklesen hinkt nach (Shopify liest verzögert)
  const s = mk(10, { leseVerzoegerung: 2 }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Verzögertes Lesen: Exit 0 dank Wiederholung', await lauf(o), 0);
  const s2 = mk(10, { leseVerzoegerung: 2 }); const b = lade(s2, { o: { live: true, leseVersuche: 1 } });
  gleich('Verzögertes Lesen mit nur einem Versuch: Exit 6 (die Wiederholung ist nötig)', await lauf(b.o), 6);
}
{
  // Ein anderes Programm aktiviert ein Produkt wieder, NACHDEM das Paket geprüft wurde → Gegenprobe über alle
  const s = mk(5, { reaktiviere: { handle: 'silber-3', beiLesung: 3 } }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Gegenprobe: Produkt wird nach der Prüfung wieder aktiv → Exit 6', await lauf(o), 6);
  pruefe('Gegenprobe: Meldung nennt das Produkt', i.st.log.some((z) => /Gegenprobe/.test(z) && /silber-3/.test(z)));
}
{
  const s = mk(12, { ignoriereStatus: 'silber-3' }); const { i, o } = lade(s, { o: { live: true } });
  gleich('Rücklese-Abweichung (Status): Exit 6', await lauf(o), 6);
  pruefe('Rücklese-Abweichung: nächstes Paket nicht angefasst, ABWEICHUNG im Ledger', s.p.get('gid://p/11').status === 'ACTIVE' && art(i, 'ABWEICHUNG').some((z) => z.includes('silber-3')));
  const s2 = mk(12, { ignoriereTag: 'silber-4' }); const b = lade(s2, { o: { live: true } });
  gleich('Rücklese-Abweichung (Tag): Exit 6', await lauf(b.o), 6);
  pruefe('Rücklese-Abweichung (Tag): zweites Paket nicht angefasst', s2.p.get('gid://p/12').status === 'ACTIVE');
}
{
  // Shopify meldet einen Fehler, obwohl die Änderung angewendet wurde: trotzdem Halt (wir vertrauen keiner halben Antwort)
  const s = mk(12, { meldetFehlerTrotzdem: 'silber-4' }); const { i, o } = lade(s, { o: { live: true } });
  gleich('userError trotz Anwendung: Exit 6', await lauf(o), 6);
  pruefe('userError trotz Anwendung: Paket 2 nicht angefasst, Fehler im Ledger mit Handle', s.p.get('gid://p/11').status === 'ACTIVE' && art(i, 'FEHLER').some((z) => z.split('|')[2] === 'silber-4'));
}
// ================================================================ Liste unplausibel
{
  const s = mk(3);
  const fall = async (name, aendere, extra = {}) => { const { i, o } = lade(s, { o: { live: true, ...extra } }); aendere(o); const c = await lauf(o); pruefe(name + ': Exit 2', c === 2, 'Exit ' + c); pruefe(name + ': nichts geschrieben', s.mutationen === 0 && i.st.sich === null); };
  await fall('leere Liste', (o) => { o.liste.eintraege = []; });
  await fall('doppelte ID', (o) => { o.liste.eintraege.push({ ...o.liste.eintraege[0] }); });
  await fall('Titel ohne 925', (o) => { o.liste.eintraege[1].title = 'Edelstahl'; });
  await fall('über der Obergrenze', () => {}, { maxAnzahl: 2 });
  await fall('Liste zu alt (live)', (o) => { o.liste.erzeugt = '2026-11-16T02:00:00Z'; });
  await fall('Liste aus der Zukunft (live)', (o) => { o.liste.erzeugt = '2026-11-18T09:00:00Z'; });
  await fall('Liste knapp über 6 Stunden (live)', (o) => { o.liste.erzeugt = '2026-11-17T02:59:00Z'; });
  await fall('ONLY trifft nichts', () => {}, { nur: ['gibt-es-nicht'] });
  const g = lade(s, { o: { live: true } }); g.o.liste.erzeugt = '2026-11-17T03:01:00Z';
  gleich('Liste knapp unter 6 Stunden (live): erlaubt', await lauf(g.o), 0);
  const t = lade(mk(3), { o: { live: false } }); t.o.liste.erzeugt = '2026-11-01T00:00:00Z';
  gleich('alte Liste im Trockenlauf erlaubt', await lauf(t.o), 0);
}
{
  const s = mk(5); const { i, o } = lade(s, { o: { live: true, nur: ['silber-2', 'silber-4'] } });
  gleich('ONLY: Exit 0', await lauf(o), 0);
  gleich('ONLY: nur diese zwei im Entwurf', [...s.p.values()].filter((p) => p.status === 'DRAFT').map((p) => p.handle), ['silber-2', 'silber-4']);
}
// ================================================================ Sicherung allein, Probe-Tor
{
  const s = mk(14); const { i, o } = lade(s, { o: { sichern: true } });
  gleich('Sicherung allein: Exit 0', await lauf(o), 0);
  pruefe('Sicherung allein: 14 Einträge, der Shop unverändert', i.st.sich.length === 14 && s.mutationen === 0 && [...s.p.values()].every((p) => p.status === 'ACTIVE'));
  gleich('Sicherung allein, zweiter Aufruf: keine Doppel', (await lauf({ ...o }), i.st.sich.length), 14);
  const alt = JSON.stringify(i.st.sich);
  const l = lade(s, { io: i, o: { live: true } });
  gleich('Live nach Sicherung: Exit 0', await lauf(l.o), 0);
  gleich('Live nach Sicherung: Sicherung bleibt bytegleich (sie ist die im Repo geprüfte)', JSON.stringify(i.st.sich), alt);
  const s2 = mk(2); const b = lade(s2, { o: { sichern: true } }); b.o.liste.erzeugt = '2026-11-01T00:00:00Z';
  gleich('Sicherung allein mit alter Liste: Exit 2', await lauf(b.o), 2);
}
{
  const s = mk(3); const a = lade(s, { o: { live: true, probeGate: () => 'keine Probe im Ledger' } });
  gleich('Probe-Tor zu: Exit 2', await lauf(a.o), 2);
  pruefe('Probe-Tor zu: nichts geschrieben', s.mutationen === 0 && a.i.st.sich === null);
  const b = lade(s, { o: { live: true, probeGate: () => true } });
  gleich('Probe-Tor offen: Exit 0', await lauf(b.o), 0);
  const s2 = mk(3); const c = lade(s2, { o: { live: false, probeGate: () => 'zu' } });
  gleich('Probe-Tor gilt nur für LIVE (Trockenlauf Exit 0)', await lauf(c.o), 0);
}
// ================================================================ Probe an einem Produkt
{
  const s = mk(3); const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-2'] } });
  gleich('Probe: Exit 0', await lauf(o), 0);
  pruefe('Probe: Endzustand ENTWURF mit Arbeits-Tag, andere unberührt', s.p.get('gid://p/2').status === 'DRAFT' && s.p.get('gid://p/2').tags.includes(MARKER) && s.p.get('gid://p/1').status === 'ACTIVE' && s.p.get('gid://p/3').status === 'ACTIVE');
  pruefe('Probe: Sicherung mit den Kanälen von vorher', i.st.sich.length === 1 && i.st.sich[0].pubs.length === 3 && i.st.sich[0].status === 'ACTIVE' && i.st.sich[0].tags.join() === 'sort-schmuck');
  pruefe('Probe: Ledger PROBE, keine Neu-Veröffentlichung nötig', art(i, 'PROBE').length === 1 && /Neu-Veröffentlichen nötig false/.test(art(i, 'PROBE')[0]) && /von selbst true/.test(art(i, 'PROBE')[0]));
  pruefe('Probe: drei Statuswechsel, keine Veröffentlichung', s.ereignisse.filter((e) => e.startsWith('status')).length === 3 && s.publizierAufrufe.length === 0);
  pruefe('Probe: das Ledger besteht das Probe-Tor', probeBestanden(i.st.ledger, JETZT()) === true);
  gleich('nach Probe: Massenlauf Exit 0', await lauf({ ...o, probe: false, nur: [], probeGate: (j) => probeBestanden(i.st.ledger, j) }), 0);
  gleich('nach Probe: Sicherung 3 Einträge, keiner doppelt', new Set(i.st.sich.map((e) => e.id)).size, 3);
}
{
  // Im Entwurf nur «vorgemerkt» (staged), beim Aktivieren wieder veröffentlicht: onlyPublished:true darf die vorgemerkten nicht als veröffentlicht zählen
  const s = mk(2, { verliertKanaeleImEntwurf: true, kanaeleKommenMitAktiv: true }); const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe mit vorgemerkten Kanälen: Exit 0', await lauf(o), 0);
  pruefe('Probe mit vorgemerkten Kanälen: im Entwurf 0 veröffentlicht von 3 Einträgen, Rückkehr von selbst', /im Entwurf 0\/3/.test(art(i, 'PROBE')[0]) && /von selbst true/.test(art(i, 'PROBE')[0]) && s.publizierAufrufe.length === 0);
}
{
  // Kanäle gehen beim Zurücksetzen verloren und kommen NICHT von selbst: einzeln neu veröffentlichen
  const s = mk(2, { verliertKanaeleBeiAktiv: true }); const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe mit Kanalverlust: Exit 0', await lauf(o), 0);
  gleich('Probe mit Kanalverlust: zwei fehlende Kanäle, zwei einzelne Aufrufe', s.publizierAufrufe.map((a) => a.kanaele.length), [1, 1]);
  pruefe('Probe mit Kanalverlust: Ledger meldet Neu-Veröffentlichen nötig true, am Ende fehlt nichts', /Neu-Veröffentlichen nötig true/.test(art(i, 'PROBE')[0]) && /fehlend am Ende 0/.test(art(i, 'PROBE')[0]));
}
{
  // Kanäle kommen verspätet von selbst: nicht neu veröffentlichen
  const s = mk(2, { verliertKanaeleBeiAktiv: true, kanaeleKommenNach: 3 }); const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe mit später Rückkehr: Exit 0', await lauf(o), 0);
  gleich('Probe mit später Rückkehr: nichts veröffentlicht', s.publizierAufrufe.length, 0);
  pruefe('Probe mit später Rückkehr: Ledger «von selbst true» mit Wartezeit', /von selbst true nach [1-9]\d* s/.test(art(i, 'PROBE')[0]));
}
{
  // Veröffentlichen scheitert: Probe endet mit Fehler, das Produkt wird trotzdem wieder ENTWURF
  const s = mk(2, { verliertKanaeleBeiAktiv: true, publizierenFehler: true }); const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe, Veröffentlichen scheitert: Exit 6', await lauf(o), 6);
  pruefe('Probe, Veröffentlichen scheitert: Produkt trotzdem ENTWURF mit Tag (nie aktiv ohne Kanäle)', s.p.get('gid://p/1').status === 'DRAFT' && s.p.get('gid://p/1').tags.includes(MARKER));
  pruefe('Probe, Veröffentlichen scheitert: das Ledger besteht das Tor NICHT', probeBestanden(i.st.ledger, JETZT()) !== true);
  // einzelner Kanal verweigert, der andere geht
  const s2 = mk(2, { verliertKanaeleBeiAktiv: true, publizierenFehlerFuer: 'P2' }); const b = lade(s2, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe, ein Kanal verweigert: Exit 6 (fehlt am Ende)', await lauf(b.o), 6);
  gleich('Probe, ein Kanal verweigert: der andere Kanal wurde trotzdem veröffentlicht', s2.p.get('gid://p/1').pubs.sort(), ['P1', 'P3']);
}
{
  // Ausnahme beim Zurücksetzen auf aktiv (2. Schreiben): am Ende trotzdem ENTWURF
  const s = mk(2, { wirftBeiMutation: 2 }); const { i, o } = lade(s, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe, Ausnahme beim Zurücksetzen: Exit 6', await lauf(o), 6);
  pruefe('Probe, Ausnahme: Produkt ENTWURF mit Tag, FEHLER im Ledger', s.p.get('gid://p/1').status === 'DRAFT' && s.p.get('gid://p/1').tags.includes(MARKER) && /FEHLER/.test(art(i, 'PROBE')[0]));
  const s3 = mk(3); const c = lade(s3, { o: { live: true, probe: true, nur: [] } });
  gleich('Probe ohne ONLY (3 Produkte): Exit 2', await lauf(c.o), 2); pruefe('Probe ohne ONLY: nichts geschrieben', s3.mutationen === 0);
  const s4 = mk(2); const d = lade(s4, { o: { live: false, probe: true, nur: ['silber-1'] } });
  gleich('Probe Trockenlauf: Exit 0', await lauf(d.o), 0); pruefe('Probe Trockenlauf: nichts geschrieben', s4.mutationen === 0 && d.i.st.sich === null);
  const s5 = mk(2); s5.p.get('gid://p/1').status = 'DRAFT'; const e = lade(s5, { o: { live: true, probe: true, nur: ['silber-1'] } });
  gleich('Probe an einem Entwurf: Exit 2', await lauf(e.o), 2);
}
// ================================================================ Rücknahme: Sonderfälle und Reparatur
{
  const s = mk(5); const { i, o } = lade(s, { o: { live: true } }); await lauf(o);
  s.p.get('gid://p/1').status = 'ACTIVE';                                   // von Hand aktiviert, Tag blieb
  s.p.get('gid://p/2').tags = s.p.get('gid://p/2').tags.filter((t) => t !== MARKER);   // Tag von Hand entfernt, Entwurf
  s.p.get('gid://p/3').status = 'ACTIVE'; s.p.get('gid://p/3').tags = s.p.get('gid://p/3').tags.filter((t) => t !== MARKER); s.p.get('gid://p/3').pubs = ['P1'];  // aktiv ohne Tag, Kanäle fehlen
  s.p.get('gid://p/5').status = 'ARCHIVED';
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme-Sonderfälle: Exit 0', await lauf(z.o), 0);
  pruefe('Rücknahme: aktiv mit Tag → nur der Tag wird entfernt', s.p.get('gid://p/1').status === 'ACTIVE' && !s.p.get('gid://p/1').tags.includes(MARKER));
  pruefe('Rücknahme: Entwurf OHNE Tag bleibt Entwurf (nicht sicher von uns)', s.p.get('gid://p/2').status === 'DRAFT');
  pruefe('Rücknahme: aktiv ohne Tag, Kanäle fehlen → einzeln neu veröffentlicht', s.p.get('gid://p/3').pubs.sort().join() === 'P1,P2,P3' && s.publizierAufrufe.filter((a) => a.id === 'gid://p/3').length === 2);
  pruefe('Rücknahme: ARCHIVED bleibt ARCHIVED', s.p.get('gid://p/5').status === 'ARCHIVED');
  pruefe('Rücknahme: Produkt 4 normal zurück; nicht erledigte (2 und 5) bleiben in der Sicherung', s.p.get('gid://p/4').status === 'ACTIVE' && i.st.sich.map((e) => e.handle).sort().join() === 'silber-2,silber-5');
  const z2 = lade(s, { io: i, o: { zurueck: true, live: true, liste: null, ohneTagOk: true } });
  gleich('Rücknahme mit OHNE_TAG_OK: Exit 0', await lauf(z2.o), 0);
  pruefe('Rücknahme mit OHNE_TAG_OK: Produkt 2 jetzt aktiv', s.p.get('gid://p/2').status === 'ACTIVE');
}
{
  // Kanalverlust bei der Rücknahme, Veröffentlichen scheitert, dann behoben und fortgesetzt
  const s = mk(3, { verliertKanaeleBeiAktiv: true, publizierenFehler: true }); const { i, o } = lade(s, { o: { live: true } }); await lauf(o);
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme, Veröffentlichen scheitert: Exit 6', await lauf(z.o), 6);
  pruefe('Rücknahme, Veröffentlichen scheitert: nichts als erledigt archiviert, Sicherung bleibt', i.st.sich.length === 3 && i.st.erledigt.length === 0);
  pruefe('Rücknahme, Veröffentlichen scheitert: ABWEICHUNG-ZURUECK im Ledger', art(i, 'ABWEICHUNG-ZURUECK').length >= 1);
  s.opt.publizierenFehler = false;
  const z2 = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme fortsetzen (Produkte schon aktiv, Kanäle fehlen): Exit 0', await lauf(z2.o), 0);
  pruefe('Rücknahme fortsetzen: alle aktiv mit allen Kanälen, Sicherung leer', [...s.p.values()].every((p) => p.status === 'ACTIVE' && p.pubs.length === 3) && i.st.sich.length === 0);
}
{
  const s = mk(4, { kanaeleKommenNach: 3, verliertKanaeleBeiAktiv: true }); const { i, o } = lade(s, { o: { live: true } }); await lauf(o);
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme mit später Kanal-Rückkehr: Exit 0', await lauf(z.o), 0);
  gleich('Rücknahme mit später Rückkehr: nichts veröffentlicht (sie kamen von selbst)', s.publizierAufrufe.length, 0);
}
{
  const s = mk(12, { fehlerBei: 'silber-3' }); const { i, o } = lade(s, { o: { live: true } }); s.opt.fehlerBei = null; await lauf(o);
  s.opt.fehlerBei = 'silber-3';
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme, Statusfehler: Exit 6', await lauf(z.o), 6);
  pruefe('Rücknahme, Statusfehler: FEHLER-ZURUECK mit Handle, zweites Paket nicht angefasst', art(i, 'FEHLER-ZURUECK').some((l) => l.split('|')[2] === 'silber-3') && s.p.get('gid://p/12').status === 'DRAFT');
  const z0 = lade(s, { o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme ohne Sicherung: Exit 2', await lauf(z0.o), 2);
  const z1 = lade(s, { io: i, o: { zurueck: true, live: true, liste: null, nur: ['gibt-es-nicht'] } });
  gleich('Rücknahme mit unbekanntem ONLY: Exit 2', await lauf(z1.o), 2);
  const z3 = lade(s, { io: io([]), o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme mit leerer Sicherung: Exit 2', await lauf(z3.o), 2);
}
{
  // Rücknahme: Shopify meldet einen Fehler, obwohl die Änderung angewendet wurde: Halt, Paket 2 bleibt unberührt
  const s = mk(12); const { i, o } = lade(s, { o: { live: true } }); await lauf(o);
  s.opt.meldetFehlerTrotzdem = 'silber-3';
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Rücknahme, userError trotz Anwendung: Exit 6', await lauf(z.o), 6);
  pruefe('Rücknahme, userError trotz Anwendung: Paket 2 (11, 12) unberührt', s.p.get('gid://p/11').status === 'DRAFT' && s.p.get('gid://p/12').status === 'DRAFT');
}
{
  // ONLY gilt auch in der Rücknahme
  const s = mk(4); const { i, o } = lade(s, { o: { live: true } }); await lauf(o);
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null, nur: ['silber-2'] } });
  gleich('Rücknahme mit ONLY: Exit 0', await lauf(z.o), 0);
  gleich('Rücknahme mit ONLY: nur Produkt 2 zurück', [...s.p.values()].filter((p) => p.status === 'ACTIVE').map((p) => p.handle), ['silber-2']);
}
// ================================================================ Zweiter Zyklus: die Sicherung wird nicht veraltet wiederverwendet
{
  const s = mk(3); const { i, o } = lade(s, { o: { live: true } }); await lauf(o);
  const z = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } }); await lauf(z.o);
  s.p.get('gid://p/1').pubs = ['P1'];                                       // jemand nimmt zwei Kanäle bewusst weg
  const o2 = lade(s, { io: i, o: { live: true } }).o; await lauf(o2);
  pruefe('Zweiter Zyklus: neuer Sicherungseintrag mit dem heutigen Kanalstand (1 Kanal)', i.st.sich.find((e) => e.handle === 'silber-1').pubs.join() === 'P1');
  const z2 = lade(s, { io: i, o: { zurueck: true, live: true, liste: null } });
  gleich('Zweiter Zyklus: Rücknahme Exit 0', await lauf(z2.o), 0);
  gleich('Zweiter Zyklus: bewusst entfernte Kanäle werden NICHT wieder veröffentlicht', s.p.get('gid://p/1').pubs.join(), 'P1');
}
console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
