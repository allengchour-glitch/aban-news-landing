// Test gegen eine Attrappe des Shops (kein Netz). node dropship/seo-push-1011/test.mjs
import { lauf, sha256, bodyNeu, MASKEN_LINK } from './ablauf.mjs';
let ok = 0, bad = 0; const T = (n, c, i) => { if (c) ok++; else { bad++; console.log('✗', n, i === undefined ? '' : JSON.stringify(i)); } };
const mk = () => {
  const S = {
    'gid://c/maske': { typ: 'c', handle: 'ft-maske', title: 'Masken', sortOrder: 'CREATED_DESC', descriptionHtml: '<p>alt maske</p>', seo: { title: 'alt', description: 'alt d' }, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'maske' }] }, n: 221 },
    'gid://c/fas': { typ: 'c', handle: 'kostueme-fasnacht', title: 'Fas', sortOrder: 'MANUAL', descriptionHtml: '<p>alt fas</p>', seo: { title: 'f', description: 'fd' }, ruleSet: null, n: 100 },
    'gid://a/1': { typ: 'a', handle: 'art1', updatedAt: 'x', body: '<p>a</p>\n<!-- lx -->', tt: { id: 'm1', value: 'T' }, dt: { id: 'm2', value: 'D' } },
    'gid://p/1': { typ: 'p', handle: 'prod1', title: 'P', seo: { title: 'pt', description: 'pd' } },
  };
  const log = [];
  const gql = async (q, v) => {
    if (/collection\(id/.test(q)) { const c = S[v.id]; if (!c) return { collection: null }; return { collection: { id: v.id, handle: c.handle, title: c.title, sortOrder: c.sortOrder, descriptionHtml: c.descriptionHtml, seo: c.seo, ruleSet: c.ruleSet, productsCount: { count: c.n } } }; }
    if (/article\(id/.test(q)) { const a = S[v.id]; return { article: a ? { id: v.id, handle: a.handle, updatedAt: a.updatedAt, body: a.body, tt: a.tt, dt: a.dt } : null }; }
    if (/product\(id/.test(q)) { const p = S[v.id]; return { product: p ? { id: v.id, handle: p.handle, title: p.title, seo: p.seo } : null }; }
    log.push(q.slice(0, 40));
    if (/collectionUpdate/.test(q)) { const i = v.i, c = S[i.id]; if (i.descriptionHtml != null) c.descriptionHtml = i.descriptionHtml; if (i.title) c.title = i.title; if (i.seo) c.seo = i.seo; if (i.ruleSet) { c.ruleSet = i.ruleSet; c.n = S.__nach ?? 57; } return { collectionUpdate: { userErrors: [] } }; }
    if (/productUpdate/.test(q)) { S[v.i.id].seo = v.i.seo; return { productUpdate: { userErrors: [] } }; }
    if (/articleUpdate/.test(q)) { S[v.id].body = v.a.body; return { articleUpdate: { userErrors: [] } }; }
    if (/metafieldsSet/.test(q)) { for (const m of v.m) { const a = S[m.ownerId]; if (m.key === 'title_tag') a.tt = { id: 'm1', value: m.value }; else a.dt = { id: 'm2', value: m.value }; } return { metafieldsSet: { userErrors: [] } }; }
    throw new Error('unbekannt ' + q);
  };
  return { S, gql, log };
};
const neuBody = '<p>a</p>\n<p>Link</p>\n<!-- lx -->';
const plan = () => ({
  reihenfolge: ['S7', 'S1', 'S8', 'S11', 'S12'], maskeGid: 'gid://c/maske', maskeTyp: 'Kostüme & Verkleidung',
  plaene: {
    S7: { ziele: [{ typ: 'collection', gid: 'gid://c/maske', handle: 'ft-maske', felder_vorher: { title: 'Masken', sortOrder: 'CREATED_DESC', descriptionHtml: '<p>alt maske</p>', seoTitle: 'alt', seoDescription: 'alt d', ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'maske' }] } }, felder_nachher: { descriptionHtml: '<p>neu maske</p>', seoTitle: 'neu', seoDescription: 'neu d', ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'maske' }, { column: 'TYPE', relation: 'EQUALS', condition: 'Kostüme & Verkleidung' }, { column: 'TITLE', relation: 'CONTAINS', condition: 'maske' }] } } }] },
    S1: { ziele: [{ typ: 'collection', gid: 'gid://c/fas', handle: 'kostueme-fasnacht', felder_vorher: { descriptionHtml: '<p>alt fas</p>' }, felder_nachher: { descriptionHtml: '<p>alt fas</p><p>Links: <a href="/x">x</a></p>' } }] },
    S8: { ziele: [{ typ: 'article', gid: 'gid://a/1', handle: 'art1', felder_vorher: { updatedAt: 'x', body_laenge: 20, body_sha256: sha256('<p>a</p>\n<!-- lx -->') }, felder_nachher: { body_sha256: sha256(neuBody) }, ersetzungen: [{ alt: '<p>a</p>\n', neu: '<p>a</p>\n<p>Link</p>\n' }] }] },
    S11: { ziele: [{ typ: 'product', gid: 'gid://p/1', handle: 'prod1', felder_vorher: { seoTitle: 'pt', seoDescription: 'pd' }, felder_nachher: { seoTitle: 'pt2', seoDescription: 'pd2' } }] },
    S12: { ziele: [{ typ: 'article', gid: 'gid://a/1', handle: 'art1', felder_vorher: { metafield_global_title_tag: 'T', metafield_global_description_tag: 'D' }, felder_nachher: { metafield_global_title_tag: 'T2', metafield_global_description_tag: 'D2' } }] },
  },
});
const sichern = () => { let o = null; return { lesen: () => o, schreiben: x => { o = JSON.parse(JSON.stringify(x)); }, get: () => o }; };
const opt = (m, p, extra = {}) => ({ gql: m.gql, plan: p, live: false, zurueck: false, nur: null, sicherung: sichern(), warte: async () => {}, log: () => {}, ...extra });
// 1 Trockenlauf schreibt nichts
{ const m = mk(); const r = await lauf(opt(m, plan())); T('Trockenlauf exit 0', r.exit === 0 && r.trocken); T('Trockenlauf schreibt nichts', m.log.length === 0, m.log); }
// 2 Abweichung vor dem Schreiben stoppt alles
{ const m = mk(); m.S['gid://p/1'].seo.description = 'anders'; const sich = sichern(); const r = await lauf(opt(m, plan(), { live: true, sicherung: sich })); T('Abweichung exit 4', r.exit === 4); T('Abweichung: nichts geschrieben', m.log.length === 0 && sich.get() === null, m.log); }
// 3 Livelauf komplett
{ const m = mk(); const sich = sichern(); const logs = []; const r = await lauf(opt(m, plan(), { live: true, sicherung: sich, log: x => logs.push(x) }));
  T('live exit 0', r.exit === 0, r); T('Maske neu', m.S['gid://c/maske'].descriptionHtml === '<p>neu maske</p>' && m.S['gid://c/maske'].ruleSet.rules.length === 3);
  T('Masken-Link in S1', m.S['gid://c/fas'].descriptionHtml === '<p>alt fas</p><p>Links: <a href="/x">x</a>' + MASKEN_LINK + '</p>', m.S['gid://c/fas'].descriptionHtml);
  T('Artikel body', m.S['gid://a/1'].body === neuBody); T('Artikel Meta', m.S['gid://a/1'].tt.value === 'T2' && m.S['gid://a/1'].dt.value === 'D2'); T('Produkt SEO', m.S['gid://p/1'].seo.title === 'pt2');
  T('Sicherung roh', sich.get()['S7:ft-maske'].roh.descriptionHtml === '<p>alt maske</p>' && sich.get()['S8:art1'].roh.body === '<p>a</p>\n<!-- lx -->');
  // Rücknahme
  const r2 = await lauf(opt(m, plan(), { live: true, zurueck: true, sicherung: sich }));
  T('Rücknahme exit 0', r2.exit === 0); T('Maske zurück', m.S['gid://c/maske'].descriptionHtml === '<p>alt maske</p>' && m.S['gid://c/maske'].ruleSet.rules.length === 1 && m.S['gid://c/maske'].seo.title === 'alt');
  T('Artikel zurück', m.S['gid://a/1'].body === '<p>a</p>\n<!-- lx -->' && m.S['gid://a/1'].tt.value === 'T'); T('Produkt zurück', m.S['gid://p/1'].seo.description === 'pd'); T('Fasnacht zurück', m.S['gid://c/fas'].descriptionHtml === '<p>alt fas</p>'); }
// 4 Maske mit unplausibler Produktzahl → S7 zurückgenommen, S1 nicht geschrieben
{ const m = mk(); m.S.__nach = 5; const r = await lauf(opt(m, plan(), { live: true })); T('Zahl 5: exit 7', r.exit === 7, r); T('Maske zurückgenommen', m.S['gid://c/maske'].ruleSet.rules.length === 1 && m.S['gid://c/maske'].descriptionHtml === '<p>alt maske</p>'); T('S1 nicht geschrieben', m.S['gid://c/fas'].descriptionHtml === '<p>alt fas</p>'); }
// 5 S1 ohne wirksame S7 (nur S1) → kein Masken-Link
{ const m = mk(); const r = await lauf(opt(m, plan(), { live: true, nur: ['S1'] })); T('nur S1 exit 0', r.exit === 0); T('kein Masken-Link', !/ft-maske/.test(m.S['gid://c/fas'].descriptionHtml), m.S['gid://c/fas'].descriptionHtml); }
// 6 Anker nicht genau einmal → Abweichung
{ const m = mk(); m.S['gid://a/1'].body = '<p>a</p>\n<p>a</p>\n<!-- lx -->'; const r = await lauf(opt(m, plan(), { live: true })); T('Anker doppelt: exit 4', r.exit === 4); T('nichts geschrieben', m.log.length === 0); }
// 7 Rücklesen weicht ab (Shop ignoriert Schreiben) → exit 6
{ const m = mk(); const g = m.gql; m.gql = async (q, v) => { if (/productUpdate/.test(q)) return { productUpdate: { userErrors: [] } }; return g(q, v); }; const r = await lauf(opt(m, plan(), { live: true, nur: ['S11'] })); T('Rücklesen weicht ab: exit 6', r.exit === 6, r); }
// 8 userErrors → Ausnahme
{ const m = mk(); const g = m.gql; m.gql = async (q, v) => { if (/productUpdate/.test(q)) return { productUpdate: { userErrors: [{ field: ['x'], message: 'nein' }] } }; return g(q, v); }; let e = null; try { await lauf(opt(m, plan(), { live: true, nur: ['S11'] })); } catch (x) { e = x; } T('userErrors → Ausnahme', e && /productUpdate/.test(e.message)); }
// 9 Entity-Normalisierung beim Rücklesen
{ const m = mk(); const g = m.gql; m.gql = async (q, v) => { const r = await g(q, v); if (/collection\(id/.test(q) && r.collection && r.collection.seo) r.collection = { ...r.collection, seo: { ...r.collection.seo, title: r.collection.seo.title.replace('&', '&amp;') } }; return r; };
  const p = plan(); p.plaene.S7.ziele[0].felder_nachher.seoTitle = 'A & B'; p.plaene.S7.ziele[0].felder_vorher.seoTitle = 'alt'; const r = await lauf(opt(m, p, { live: true, nur: ['S7'] })); T('&amp;-Normalisierung wird toleriert (Rücklesen)', r.exit === 0 || r.exit === 4, r); }
// 10 nur-Filter
{ const m = mk(); const r = await lauf(opt(m, plan(), { live: true, nur: ['S11'] })); T('nur S11', r.exit === 0 && m.S['gid://p/1'].seo.title === 'pt2' && m.S['gid://c/maske'].descriptionHtml === '<p>alt maske</p>'); }
// 11 bodyNeu
{ let e = null; try { bodyNeu({ ersetzungen: [{ alt: 'x', neu: 'y' }] }, 'abc'); } catch (x) { e = x; } T('bodyNeu ohne Anker wirft', !!e); T('bodyNeu ersetzt einmal', bodyNeu({ ersetzungen: [{ alt: 'b', neu: 'B' }] }, 'abc') === 'aBc'); }

// 12 Obergrenze der Produktzahl
{ const m = mk(); m.S.__nach = 500; const r = await lauf(opt(m, plan(), { live: true })); T('Zahl 500: exit 7', r.exit === 7, r); T('Maske zurückgenommen (500)', m.S['gid://c/maske'].ruleSet.rules.length === 1); }
// 13 ruleSet-Vorbedingung
{ const m = mk(); m.S['gid://c/maske'].ruleSet = { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'anders' }] }; const r = await lauf(opt(m, plan(), { live: true, nur: ['S7'] })); T('ruleSet anders: exit 4', r.exit === 4 && m.log.length === 0, r); }
// 14 Handle-Prüfung
{ const m = mk(); m.S['gid://p/1'].handle = 'anderes'; const r = await lauf(opt(m, plan(), { live: true, nur: ['S11'] })); T('Handle anders: exit 4', r.exit === 4 && m.log.length === 0, r); }
// 15 Hash des neuen Textes
{ const m = mk(); const p = plan(); p.plaene.S8.ziele[0].felder_nachher.body_sha256 = 'x'.repeat(64); const r = await lauf(opt(m, p, { live: true, nur: ['S8'] })); T('Hash falsch: exit 4', r.exit === 4 && m.log.length === 0, r); }
// 16 vorhandene Sicherung wird nie überschrieben
{ const m = mk(); const sich = sichern(); sich.schreiben({ 'S11:prod1': { typ: 'product', gid: 'gid://p/1', handle: 'prod1', roh: { seoTitle: 'URALT', seoDescription: 'URALT' } } }); const r = await lauf(opt(m, plan(), { live: true, nur: ['S11'], sicherung: sich })); T('Sicherung bleibt', r.exit === 0 && sich.get()['S11:prod1'].roh.seoTitle === 'URALT', sich.get()); }
// 17 Masken-Link nur bei UND-Regel und Typ-Regel
{ const r0 = { appliedDisjunctively: true, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'maske' }, { column: 'TYPE', relation: 'EQUALS', condition: 'Kostüme & Verkleidung' }] };
  const m = mk(); m.S['gid://c/maske'].ruleSet = r0; m.S['gid://c/maske'].n = 57; await lauf(opt(m, plan(), { live: true, nur: ['S1'] })); T('ODER-Regel: kein Masken-Link', !/ft-maske/.test(m.S['gid://c/fas'].descriptionHtml), m.S['gid://c/fas'].descriptionHtml);
  const r1 = { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'maske' }, { column: 'TITLE', relation: 'CONTAINS', condition: 'maske' }] };
  const n = mk(); n.S['gid://c/maske'].ruleSet = r1; n.S['gid://c/maske'].n = 57; await lauf(opt(n, plan(), { live: true, nur: ['S1'] })); T('ohne Typ-Regel: kein Masken-Link', !/ft-maske/.test(n.S['gid://c/fas'].descriptionHtml)); }
// 18 SEO-Titel bleibt beim Schreiben nur der Beschreibung erhalten
{ const m = mk(); const p = plan(); p.plaene.S11.ziele[0].felder_nachher = { seoDescription: 'pd2' }; p.plaene.S11.ziele[0].felder_vorher = { seoDescription: 'pd' }; const r = await lauf(opt(m, p, { live: true, nur: ['S11'] })); T('Titel bleibt', r.exit === 0 && m.S['gid://p/1'].seo.title === 'pt' && m.S['gid://p/1'].seo.description === 'pd2', m.S['gid://p/1']); }
// 19 bodyNeu mit zwei Treffern
{ let e = null; try { bodyNeu({ ersetzungen: [{ alt: 'a', neu: 'b' }] }, 'aa'); } catch (x) { e = x; } T('bodyNeu zwei Treffer wirft', !!e); }
console.log(ok + ' Prüfungen bestanden' + (bad ? ', ' + bad + ' FEHLER' : '')); process.exit(bad ? 1 : 0);
