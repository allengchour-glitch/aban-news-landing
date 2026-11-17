#!/usr/bin/env node
/**
 * Gold-Feingehalt (Besitzer 17.11.2026, gezielte Antwort «8 Gold-Produkte auf Entwurf»): Produkte, deren Text Gold mit Feingehalt oder Karat als Material behauptet
 * («999er Feingold», «14K-Gold-Kette», «14 Karat Gold» …), gehen vorläufig auf ENTWURF. Nur der Status ändert sich (dazu der Arbeits-Tag `bazg-gold-1711`), nichts wird gelöscht.
 * Begründung: echtes Gold braucht Feingehalt UND registrierte Verantwortlichkeitsmarke (EMKG Art. 7, 9); eine falsche Angabe ist eine täuschende Bezeichnung (Art. 6, 44). README im selben Ordner.
 *   node dropship/gold-bazg-1711/gold_entwurf.mjs                  Trockenlauf (Vorgabe): liest die Produkte und zeigt, was geschehen würde
 *   SICHERN=1 node …/gold_entwurf.mjs                              schreibt NUR die Sicherung (Status, Tags, Kanäle); der Shop wird nicht verändert. Danach ins Repo committen und pushen.
 *   LIVE=1 node …/gold_entwurf.mjs                                 setzt die Produkte der Liste auf ENTWURF (je 4, zurückgelesen, beim ersten Fehler Halt); verlangt die Sicherung
 *   ZURUECK=1 [LIVE=1] node …/gold_entwurf.mjs                     Rücknahme: ENTWURF mit Arbeits-Tag → Status wie gesichert, Tag weg; danach Kanäle gegen die Sicherung prüfen und fehlende einzeln neu veröffentlichen
 * Schalter: ONLY=a,b · LISTE= · SICHERUNG= · LEDGER=
 * Tor je Produkt (vor jedem Schreiben frisch gelesen): Handle und ID stimmen mit der Liste, Status ACTIVE, und ein Beleg-Satz der Liste steht noch im Text (hat jemand den Text berichtigt, bleibt das Produkt aktiv).
 * Exit 0 in Ordnung, 1 Fehler/Zugang, 2 Eingabe unplausibel (Liste, Sicherung), 6 Rücklesen weicht ab oder Mutation meldet Fehler.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LESEN, flach, PUBLIZIEREN, publikationsLuecken } from '../silber-bazg-1711/lib.mjs';

export const MARKER_GOLD = 'bazg-gold-1711';
const STAPEL = 4;

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ');
/** Titel, Beschreibung und Optionen eines flachen Produkts als ein kleingeschriebener Text. */
export const textVon = (p) => norm([p.title, p.description, (p.options || []).map((o) => `${o.name}: ${(o.values || []).join(' / ')}`).join(' | ')].join(' ¦ '));
/** Steht mindestens ein Beleg-Satz noch im Text? */
export const belegDa = (p, belege) => (belege || []).some((b) => b && textVon(p).includes(norm(b)));

/** Tore für die Liste: Rückgabe null (in Ordnung) oder ein Fehlertext. */
export function pruefeListe(liste) {
  const e = liste?.eintraege;
  if (!Array.isArray(e) || e.length < 1 || e.length > 20) return 'Liste fehlt, ist leer oder hat mehr als 20 Einträge';
  const seen = new Set();
  for (const x of e) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(x?.handle || '')) return `Eintrag ohne gültigen Handle: ${JSON.stringify(x)?.slice(0, 80)}`;
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(x.id || '')) return `Eintrag ${x.handle} ohne Produkt-ID`;
    if (!Array.isArray(x.beleg) || !x.beleg.some((b) => String(b || '').trim().length >= 6)) return `Eintrag ${x.handle} ohne Beleg-Satz (mindestens 6 Zeichen)`;
    if (seen.has(x.handle) || seen.has(x.id)) return `Eintrag doppelt: ${x.handle}`;
    seen.add(x.handle); seen.add(x.id);
  }
  return null;
}

/** Entscheid je Produkt. `ist` = flach(). Rückgabe {tun, grund}. */
export function entscheide(ist, e) {
  if (!ist) return { tun: false, fehler: true, grund: 'Produkt nicht lesbar' };
  if (ist.handle !== e.handle || ist.id !== e.id) return { tun: false, fehler: true, grund: `Handle oder ID weicht von der Liste ab (${ist.handle})` };
  if (ist.status === 'DRAFT' && ist.tags.includes(MARKER_GOLD)) return { tun: false, grund: 'schon Entwurf mit Arbeits-Tag' };
  if (ist.status !== 'ACTIVE') return { tun: false, grund: `Status ${ist.status}, nicht angefasst` };
  if (!belegDa(ist, e.beleg)) return { tun: false, grund: 'Beleg steht nicht mehr im Text (berichtigt?), nicht angefasst' };
  return { tun: true, grund: '' };
}

const FEHLER = '{userErrors{field message}}';
/** Eine Mutation für mehrere Produkte: Status zuerst (s{i}), Tag danach (t{i}). Einträge: {id, status?, tag?: 'add'|'remove'}. */
export function schreibMutation(eintraege) {
  const vars = {}, kopf = [], teile = [];
  let tag = false;
  eintraege.forEach((e, i) => {
    if (e.status !== undefined) {
      if (!['DRAFT', 'ACTIVE'].includes(e.status)) throw new Error('Zielstatus nicht erlaubt: ' + e.status);
      vars[`p${i}`] = { id: e.id, status: e.status }; kopf.push(`$p${i}:ProductUpdateInput!`); teile.push(`s${i}:productUpdate(product:$p${i})${FEHLER}`);
    }
    if (e.tag !== undefined) {
      if (!['add', 'remove'].includes(e.tag)) throw new Error('Tag-Art nicht erlaubt: ' + e.tag);
      tag = true; vars[`i${i}`] = e.id; kopf.push(`$i${i}:ID!`); teile.push(`t${i}:${e.tag === 'add' ? 'tagsAdd' : 'tagsRemove'}(id:$i${i},tags:$g)${FEHLER}`);
    }
    if (e.status === undefined && e.tag === undefined) throw new Error('Eintrag ohne Auftrag: ' + e.id);
  });
  if (tag) { vars.g = [MARKER_GOLD]; kopf.unshift('$g:[String!]!'); }
  return { query: `mutation(${kopf.join(',')}){${teile.join(' ')}}`, variables: vars };
}
const fehlerVon = (antwort) => Object.entries(antwort || {}).flatMap(([k, v]) => (v?.userErrors || []).map((e) => `${k}: ${e.message}`));

/** Alle Eingaben kommen über `o` (Test mit Attrappe). */
export async function lauf(o) {
  const log = o.log || ((z) => console.log(z));
  const pause = o.pause || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const jetzt = o.jetzt || (() => new Date());
  const ledger = (art, handle, text = '') => o.ledger?.(`${jetzt().toISOString()}|${art}|${handle}|${text}`);
  const SCHREIBPAUSE = o.pauseMs ?? 1500, LESEPAUSE = o.lesePauseMs ?? 3000, LESEVERSUCHE = o.leseVersuche ?? 6, KANALPAUSE = o.kanalPauseMs ?? 5000, KANALVERSUCHE = o.kanalVersuche ?? 12;
  const q = o.q;

  const fehler = pruefeListe(o.liste);
  if (!o.zurueck && fehler) { log('EINGABE: ' + fehler); return 2; }
  const nurWahl = (arr) => (o.nur && o.nur.length ? arr.filter((e) => o.nur.includes(e.handle)) : arr);
  const lese = async (ids) => {
    const aus = new Map();
    for (let i = 0; i < ids.length; i += 50) { const j = await q(LESEN, { ids: ids.slice(i, i + 50) }); for (const n of j.nodes || []) { const f = flach(n); if (f) aus.set(f.id, f); } }
    return aus;
  };
  const warteBis = async (ids, ok, versuche, pauseMs) => {
    let m = null;
    for (let n = 1; n <= versuche; n++) { m = await lese(ids); if (ok(m)) return { m, ok: true }; if (n < versuche) await pause(pauseMs); }
    return { m, ok: false };
  };
  const schreibe = async (anweisungen) => { const m = schreibMutation(anweisungen); return fehlerVon(await q(m.query, m.variables)); };

  // ---------------------------------------------------------------- Rücknahme
  if (o.zurueck) {
    const sich = (o.sicherung.lesen() || []);
    const wahl = nurWahl(sich);
    if (!wahl.length) { log('Rücknahme: keine Sicherung (oder ONLY trifft nichts)'); return 2; }
    const ist = await lese(wahl.map((e) => e.id));
    const plan = [];
    for (const e of wahl) {
      const i = ist.get(e.id);
      if (!i) { log(`  ${e.handle}: nicht lesbar, ausgelassen`); continue; }
      if (!i.tags.includes(MARKER_GOLD)) { log(`  ${e.handle}: ohne Arbeits-Tag, nicht angefasst`); continue; }
      plan.push({ e, i, a: { id: e.id, ...(i.status === 'DRAFT' ? { status: e.status } : {}), tag: 'remove' } });
    }
    log(`Rücknahme: ${plan.length} von ${wahl.length} Produkten${o.live ? '' : ' (Trockenlauf)'}`);
    if (!o.live || !plan.length) return 0;
    const fe = await schreibe(plan.map((p) => p.a));
    if (fe.length) { log('FEHLER beim Zurücksetzen: ' + fe.join(' | ')); return 6; }
    const w = await warteBis(plan.map((p) => p.e.id), (m) => plan.every((p) => { const x = m.get(p.e.id); return x && x.status === p.e.status && !x.tags.includes(MARKER_GOLD); }), LESEVERSUCHE, LESEPAUSE);
    if (!w.ok) { log('FEHLER: Rücklesen nach der Rücknahme weicht ab'); return 6; }
    // Kanäle: was vorher veröffentlicht war und jetzt fehlt, erst abwarten (Shopify stellt sie oft selbst wieder her), dann einzeln neu veröffentlichen
    let fehlendAmEnde = 0, code = 0;
    const luecken = async (p) => publikationsLuecken(p.e.pubs, (await lese([p.e.id])).get(p.e.id).pubs);
    for (const p of plan) {
      let l = await luecken(p);
      if (l.length) { await pause(KANALPAUSE); l = await luecken(p); }
      for (let n = 1; l.length && n <= KANALVERSUCHE; n++) {
        for (const publicationId of l) { try { const j = await q(PUBLIZIEREN, { id: p.e.id, in: [{ publicationId }] }); for (const e of j?.publishablePublish?.userErrors || []) log(`  ${p.e.handle}: Veröffentlichen ${publicationId}: ${e.message}`); } catch (err) { log(`  ${p.e.handle}: Veröffentlichen ${publicationId}: ${err.message}`); } }
        await pause(KANALPAUSE);
        l = await luecken(p);
      }
      fehlendAmEnde += l.length; if (l.length) code = 6;
      ledger('ZURUECK', p.e.handle, `Status ${p.e.status}, Kanäle fehlend am Ende ${l.length}`);
      log(`  ${p.e.handle}: zurück auf ${p.e.status}, Kanäle fehlend am Ende ${l.length}`);
    }
    if (code) log(`FEHLER: ${fehlendAmEnde} Kanäle fehlen nach der Rücknahme`);
    return code;
  }

  // ---------------------------------------------------------------- Sichern, Trockenlauf, Live
  const wahl = nurWahl(o.liste.eintraege);
  if (!wahl.length) { log('ONLY trifft keinen Eintrag'); return 2; }
  const ist = await lese(wahl.map((e) => e.id));
  const urteile = wahl.map((e) => ({ e, i: ist.get(e.id), d: entscheide(ist.get(e.id), e) }));
  let hartFehler = 0;
  for (const u of urteile) { log(`  ${u.e.handle}: ${u.d.tun ? 'wird ENTWURF' : u.d.grund}`); if (u.d.fehler) hartFehler++; }
  if (hartFehler) { log(`EINGABE: ${hartFehler} Einträge sind nicht lesbar oder weichen von der Liste ab`); return 2; }
  const zuTun = urteile.filter((u) => u.d.tun);

  if (o.sichern) {
    const alt = o.sicherung.lesen() || [];
    const neu = zuTun.filter((u) => !alt.some((a) => a.id === u.e.id)).map((u) => ({ id: u.i.id, handle: u.i.handle, title: u.i.title, status: u.i.status, tags: u.i.tags, pubs: u.i.pubs, pubsAlle: u.i.pubsAlle }));
    o.sicherung.schreiben([...alt, ...neu]);
    log(`Sicherung: ${neu.length} neue Einträge (insgesamt ${alt.length + neu.length}). Jetzt ins Repo committen und pushen, dann LIVE.`);
    return 0;
  }
  log(`${zuTun.length} von ${wahl.length} Produkten ${o.live ? 'werden jetzt auf ENTWURF gesetzt' : 'würden auf ENTWURF gesetzt (Trockenlauf)'}`);
  if (!o.live || !zuTun.length) return 0;

  const sich = o.sicherung.lesen() || [];
  const fehlt = zuTun.filter((u) => { const s = sich.find((x) => x.id === u.e.id); return !s || s.status !== 'ACTIVE' || !Array.isArray(s.pubs); });
  if (fehlt.length) { log('EINGABE: Sicherung fehlt oder ist unvollständig für ' + fehlt.map((u) => u.e.handle).join(', ')); return 2; }

  for (let i = 0; i < zuTun.length; i += STAPEL) {
    const paket = zuTun.slice(i, i + STAPEL);
    const fe = await schreibe(paket.map((u) => ({ id: u.e.id, status: 'DRAFT', tag: 'add' })));
    if (fe.length) { log('FEHLER beim Schreiben: ' + fe.join(' | ')); return 6; }
    const w = await warteBis(paket.map((u) => u.e.id), (m) => paket.every((u) => { const x = m.get(u.e.id); return x && x.status === 'DRAFT' && x.tags.includes(MARKER_GOLD); }), LESEVERSUCHE, LESEPAUSE);
    if (!w.ok) { log('FEHLER: Rücklesen weicht ab (Status oder Arbeits-Tag fehlt): ' + paket.map((u) => u.e.handle).join(', ')); return 6; }
    for (const u of paket) { ledger('ENTWURF', u.e.handle, `vorher ${u.i.status}, Kanäle ${u.i.pubs.length}`); log(`  ${u.e.handle}: ENTWURF, zurückgelesen`); }
    await pause(SCHREIBPAUSE);
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [{ shopifyGql }, { shopifyClientSecret }] = await Promise.all([import('../../automation/lib/shopify_gql.mjs'), import('../../automation/lib/shopify_secret.mjs')]);
  const HIER = dirname(fileURLToPath(import.meta.url));
  const LISTE = process.env.LISTE || join(HIER, 'gold-liste.json'), SICH = process.env.SICHERUNG || join(HIER, 'gold-sicherung.json'), LEDGER = process.env.LEDGER || join(HIER, 'gold-ledger.txt');
  const SHOP = process.env.SHOPIFY_SHOP;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const lies = (pfad) => (existsSync(pfad) ? JSON.parse(readFileSync(pfad, 'utf8')) : null);
  const atomar = (pfad, inhalt) => { writeFileSync(pfad + '.tmp', inhalt); renameSync(pfad + '.tmp', pfad); };
  try {
    const code = await lauf({
      q: (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b),
      liste: lies(LISTE), live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1', sichern: process.env.SICHERN === '1',
      nur: (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean),
      sicherung: { lesen: () => lies(SICH), schreiben: (a) => atomar(SICH, JSON.stringify(a, null, 1)) },
      ledger: (z) => appendFileSync(LEDGER, z + '\n'),
    });
    process.exit(code);
  } catch (e) { console.error('FEHLER:', e.message); process.exit(1); }
}
