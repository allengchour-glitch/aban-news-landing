// SEO-Push 10.11.2026: Schreibweg mit Vorbedingungen, Sicherung, Rücklesen und Rücknahme. Rein (Abhängigkeiten werden eingespeist), damit der Test ihn gegen eine Attrappe fahren kann.
import crypto from 'node:crypto';

export const sha256 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const norm = s => (typeof s === 'string' ? s.replace(/&amp;/g, '&') : s);
const kanon = r => JSON.stringify({ d: !!r.appliedDisjunctively, r: (r.rules || []).map(x => [x.column, x.relation, x.condition]) });
export const MASKEN_LINK = ' · <a href="/collections/ft-maske">Masken</a>';

const Q_COLL = `query($id:ID!){collection(id:$id){id handle title sortOrder descriptionHtml seo{title description} ruleSet{appliedDisjunctively rules{column relation condition}} productsCount{count}}}`;
const Q_ART = `query($id:ID!){article(id:$id){id handle updatedAt body tt:metafield(namespace:"global",key:"title_tag"){id value} dt:metafield(namespace:"global",key:"description_tag"){id value}}}`;
const Q_PROD = `query($id:ID!){product(id:$id){id handle title seo{title description}}}`;

export async function lies(gql, z) {
  if (z.typ === 'collection') {
    const c = (await gql(Q_COLL, { id: z.gid })).collection;
    if (!c) throw new Error('Sammlung nicht gefunden ' + z.gid);
    return { handle: c.handle, title: c.title, sortOrder: c.sortOrder, descriptionHtml: c.descriptionHtml, seoTitle: c.seo.title, seoDescription: c.seo.description, ruleSet: c.ruleSet || null, productsCount: c.productsCount && c.productsCount.count };
  }
  if (z.typ === 'article') {
    const a = (await gql(Q_ART, { id: z.gid })).article;
    if (!a) throw new Error('Artikel nicht gefunden ' + z.gid);
    return { handle: a.handle, updatedAt: a.updatedAt, body: a.body, body_laenge: a.body.length, body_sha256: sha256(a.body), metafield_global_title_tag: a.tt && a.tt.value, metafield_global_description_tag: a.dt && a.dt.value, _tt: a.tt, _dt: a.dt };
  }
  const p = (await gql(Q_PROD, { id: z.gid })).product;
  if (!p) throw new Error('Produkt nicht gefunden ' + z.gid);
  return { handle: p.handle, title: p.title, seoTitle: p.seo.title, seoDescription: p.seo.description };
}

// Vergleich "vorher" gegen Live; liefert Liste der Abweichungen. Artikel (S8): Gleichheit über Hash des body.
export function abweichungen(z, live) {
  const ab = [];
  if (live.handle !== z.handle) ab.push('handle ' + live.handle + ' != ' + z.handle);
  for (const [k, v] of Object.entries(z.felder_vorher)) {
    if (k === 'updatedAt' || k === 'body_laenge') continue; // Zeitstempel allein ist kein Grund; der Hash des Textes entscheidet
    if (k === 'ruleSet') { if (!live.ruleSet || kanon(live.ruleSet) !== kanon(v)) ab.push('ruleSet weicht ab'); continue; }
    if (live[k] !== v) ab.push(k + ' weicht ab');
  }
  return ab;
}

export function bodyNeu(z, body) {
  let b = body;
  for (const e of z.ersetzungen || []) {
    const n = b.split(e.alt).length - 1;
    if (n !== 1) throw new Error('Anker kommt ' + n + ' mal vor: ' + e.alt.slice(0, 60));
    b = b.split(e.alt).join(e.neu);
  }
  return b;
}

export function sollWerte(z, live, opts = {}) {
  // liefert die Felder, die nach dem Schreiben gelten sollen
  const n = { ...z.felder_nachher };
  if (z.typ === 'collection' && opts.maskenLink && /^S1/.test(z.schritt) && !/ft-maske/.test(n.descriptionHtml)) n.descriptionHtml = n.descriptionHtml.replace(/<\/p>\s*$/, MASKEN_LINK + '</p>');
  if (z.typ === 'article' && z.ersetzungen) { n.body = bodyNeu(z, live.body); n.body_sha256 = sha256(n.body); }
  return n;
}

function eingabe(z, soll, live) {
  if (z.typ === 'collection') {
    const i = { id: z.gid };
    if ('title' in soll) i.title = soll.title;
    if ('descriptionHtml' in soll) i.descriptionHtml = soll.descriptionHtml;
    if ('seoTitle' in soll || 'seoDescription' in soll) i.seo = { title: 'seoTitle' in soll ? soll.seoTitle : live.seoTitle, description: 'seoDescription' in soll ? soll.seoDescription : live.seoDescription };
    if ('ruleSet' in soll) i.ruleSet = { appliedDisjunctively: !!soll.ruleSet.appliedDisjunctively, rules: soll.ruleSet.rules.map(r => ({ column: r.column, relation: r.relation, condition: r.condition })) };
    return i;
  }
  if (z.typ === 'product') return { id: z.gid, seo: { title: 'seoTitle' in soll ? soll.seoTitle : live.seoTitle, description: 'seoDescription' in soll ? soll.seoDescription : live.seoDescription } };
  return null;
}

export async function schreibe(gql, z, soll, live) {
  if (z.typ === 'collection') {
    const r = (await gql(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`, { i: eingabe(z, soll, live) })).collectionUpdate;
    if (r.userErrors.length) throw new Error('collectionUpdate ' + JSON.stringify(r.userErrors));
  } else if (z.typ === 'product') {
    const r = (await gql(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{field message}}}`, { i: eingabe(z, soll, live) })).productUpdate;
    if (r.userErrors.length) throw new Error('productUpdate ' + JSON.stringify(r.userErrors));
  } else if (z.ersetzungen) {
    const r = (await gql(`mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){userErrors{field message}}}`, { id: z.gid, a: { body: soll.body } })).articleUpdate;
    if (r.userErrors.length) throw new Error('articleUpdate ' + JSON.stringify(r.userErrors));
  } else {
    const mf = [];
    if ('metafield_global_title_tag' in soll) mf.push({ ownerId: z.gid, namespace: 'global', key: 'title_tag', type: 'single_line_text_field', value: soll.metafield_global_title_tag });
    if ('metafield_global_description_tag' in soll) mf.push({ ownerId: z.gid, namespace: 'global', key: 'description_tag', type: 'single_line_text_field', value: soll.metafield_global_description_tag });
    const r = (await gql(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}`, { m: mf })).metafieldsSet;
    if (r.userErrors.length) throw new Error('metafieldsSet ' + JSON.stringify(r.userErrors));
  }
}

export function gleichNachSchreiben(z, soll, q) {
  const ab = [];
  for (const [k, v] of Object.entries(soll)) {
    if (k === 'body_laenge') continue;
    if (k === 'ruleSet') { if (!q.ruleSet || kanon(q.ruleSet) !== kanon(v)) ab.push('ruleSet'); continue; }
    if (k === 'body') { if (q.body !== v) ab.push('body'); continue; }
    if (q[k] !== v && norm(q[k]) !== norm(v)) ab.push(k);
  }
  return ab;
}

// Hauptablauf. opts: { gql, plan, live:boolean, zurueck:boolean, nur:string[]|null, sicherung:{lesen(),schreiben(obj)}, warte(ms), log(...) }
export async function lauf(opts) {
  const { gql, plan, log = () => {}, warte = () => Promise.resolve() } = opts;
  const schritte = plan.reihenfolge.filter(s => !opts.nur || opts.nur.includes(s));
  const ziele = [];
  for (const s of schritte) for (const z of plan.plaene[s].ziele) ziele.push({ ...z, schritt: s });
  // 1) Vorbedingungen für ALLE Ziele, bevor irgendetwas geschrieben wird
  const livePre = new Map();
  let bad = 0;
  for (const z of ziele) {
    const live = await lies(gql, z);
    livePre.set(z.schritt + ':' + z.handle, live);
    if (opts.zurueck) continue;
    const ab = abweichungen(z, live);
    if (z.ersetzungen) { try { const nb = bodyNeu(z, live.body); if (sha256(nb) !== z.felder_nachher.body_sha256) ab.push('Hash des neuen Textes weicht vom Plan ab'); } catch (e) { ab.push(e.message); } }
    log((ab.length ? 'ABWEICHUNG ' : 'ok         ') + z.schritt + ' ' + z.typ + ' ' + z.handle + (ab.length ? ' → ' + ab.join('; ') : ''));
    if (ab.length) bad++;
  }
  if (opts.zurueck) return await zurueck(opts, ziele, livePre);
  if (bad) return { exit: 4, grund: bad + ' Ziel(e) weichen vom erwarteten Stand ab; nichts geschrieben' };
  if (!opts.live) { log('Trockenlauf: nichts geschrieben.'); return { exit: 0, trocken: true }; }
  // 2) Sicherung (roh, vollständig) vor dem ersten Schreiben; eine vorhandene Sicherung wird nie überschrieben
  const sich = opts.sicherung.lesen() || {};
  for (const z of ziele) {
    const k = z.schritt + ':' + z.handle;
    if (!sich[k]) { const l = livePre.get(k); sich[k] = { typ: z.typ, gid: z.gid, handle: z.handle, roh: l }; }
  }
  opts.sicherung.schreiben(sich);
  // 3) Schreiben, Schritt für Schritt; erste Abweichung stoppt
  const ergebnis = [];
  let maskenLink = false;
  for (const s of schritte) {
    if (s === 'S1') {
      const m = await lies(gql, { typ: 'collection', gid: plan.maskeGid });
      const ok = m.ruleSet && m.ruleSet.appliedDisjunctively === false && m.ruleSet.rules.some(r => r.column === 'TYPE' && r.condition === plan.maskeTyp) && m.ruleSet.rules.some(r => r.column === 'TAG' && r.condition === 'maske') && m.productsCount >= 30 && m.productsCount <= 80;
      maskenLink = ok; log('Masken-Link in S1: ' + (ok ? 'ja (ft-maske hat die neue Regel, ' + m.productsCount + ' Produkte)' : 'nein (S7 nicht wirksam)'));
    }
    for (const z0 of plan.plaene[s].ziele) {
      const z = { ...z0, schritt: s };
      const live = await lies(gql, z);
      const ab = abweichungen(z, live);
      if (ab.length) return { exit: 4, grund: 'Stand hat sich verändert vor ' + s + ' ' + z.handle + ': ' + ab.join('; '), ergebnis };
      const soll = sollWerte(z, live, { maskenLink });
      await schreibe(gql, z, soll, live);
      await warte(4000);
      const q = await lies(gql, z);
      const diff = gleichNachSchreiben(z, soll, q);
      ergebnis.push({ schritt: s, handle: z.handle, gleich: diff.length === 0, diff });
      log((diff.length ? 'WEICHT AB   ' : 'GLEICH      ') + s + ' ' + z.handle + (diff.length ? ' → ' + diff.join(',') : ''));
      if (diff.length) return { exit: 6, grund: 'Rücklesen weicht ab bei ' + s + ' ' + z.handle, ergebnis };
      if (s === 'S7' && z.handle === 'ft-maske') {
        if (!(q.productsCount >= 45 && q.productsCount <= 60)) {
          await rueckwaerts(opts, [{ ...z, schritt: s }], sich);
          return { exit: 7, grund: 'ft-maske hat nach der neuen Regel ' + q.productsCount + ' Produkte (erwartet 45 bis 60); S7 zurückgenommen', ergebnis };
        }
        log('ft-maske: ' + q.productsCount + ' Produkte (erwartet 45 bis 60)');
      }
    }
  }
  return { exit: 0, ergebnis };
}

async function rueckwaerts(opts, ziele, sich) {
  const { gql, warte = () => Promise.resolve(), log = () => {} } = opts;
  for (const z of ziele) {
    const s = sich[z.schritt + ':' + z.handle];
    if (!s) { log('keine Sicherung für ' + z.schritt + ' ' + z.handle); continue; }
    const r = s.roh;
    let soll;
    if (z.typ === 'collection') { soll = { descriptionHtml: r.descriptionHtml, seoTitle: r.seoTitle, seoDescription: r.seoDescription }; if ('title' in z.felder_nachher) soll.title = r.title; if ('ruleSet' in z.felder_nachher) soll.ruleSet = r.ruleSet; }
    else if (z.typ === 'product') soll = { seoTitle: r.seoTitle, seoDescription: r.seoDescription };
    else if (z.ersetzungen) soll = { body: r.body };
    else soll = { metafield_global_title_tag: r.metafield_global_title_tag, metafield_global_description_tag: r.metafield_global_description_tag };
    const live = await lies(gql, z);
    await schreibe(gql, { ...z, ersetzungen: z.ersetzungen }, soll, live);
    await warte(4000);
    const q = await lies(gql, z);
    const diff = gleichNachSchreiben(z, soll, q);
    log((diff.length ? 'RÜCKNAHME WEICHT AB ' : 'zurückgenommen ') + z.schritt + ' ' + z.handle + (diff.length ? ' → ' + diff.join(',') : ''));
  }
}

async function zurueck(opts, ziele, livePre) {
  const sich = opts.sicherung.lesen();
  if (!sich) return { exit: 4, grund: 'keine Sicherung vorhanden' };
  if (!opts.live) { for (const z of ziele) opts.log('Trockenlauf Rücknahme: ' + z.schritt + ' ' + z.handle + (sich[z.schritt + ':' + z.handle] ? ' (Sicherung da)' : ' (KEINE Sicherung)')); return { exit: 0, trocken: true }; }
  await rueckwaerts(opts, [...ziele].reverse(), sich);
  return { exit: 0 };
}
