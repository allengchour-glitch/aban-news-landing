#!/usr/bin/env node
/**
 * Seiten und Artikel ohne Silber-Angebotsstellen (Besitzer 17.11.2026 «3. entscheide du»): Texte, die ein Produkt, ein Set oder einen Preis aus unserem Shop mit einer
 * Silber-Feingehaltsangabe («925», «Sterling» …) anbieten, bekommen den bereinigten Text. Titel, Adresse und Veröffentlichung ändern sich nie.
 * Allgemeine Erklärungen und Kaufräte («achte auf 925er Silber», «Was ist Sterlingsilber?») bleiben stehen (kein Angebot einer Ware).
 *   node dropship/silber-bazg-1711/seitentexte.mjs                 Trockenlauf (Vorgabe): prüft alle Einträge und zeigt, was geschrieben würde
 *   LIVE=1 node …/seitentexte.mjs                                  schreibt (je Eintrag: lesen, mit `alt` vergleichen, schreiben, zurücklesen)
 *   ZURUECK=1 [LIVE=1] node …/seitentexte.mjs                      Rücknahme auf `alt` (Trockenlauf Vorgabe)
 * Felder: body (Text, HTML), summary (nur Artikel, HTML), seoTitle und seoDescription (Metafelder global.title_tag und global.description_tag, öffentlich als Meta-Tags sichtbar).
 * Ein Eintrag nennt in alt und neu dieselben Felder; nur diese werden gelesen, verglichen und geschrieben.
 * Eingabe: seitentexte.json = {eintraege:[{art:'Seite'|'Artikel', blog (nur Artikel), handle, rest, alt:{body,…}, neu:{body,…}}]}; `rest` = erwartete Zahl der Treffer der Silber-Regel in den
 * neuen Feldern zusammen (die bewusst stehenden Erklärungen und Kaufräte); alt = Stand VOR der Änderung, im Repo gesichert, bevor geschrieben wird.
 * Schutz: ein Feld, das inzwischen von jemand anderem geändert wurde (weder `alt` noch `neu`), wird NICHT überschrieben (FREMD_UEBERSCHREIBEN=1 hebt das auf). Ein Teilstand aus einem abgebrochenen Lauf (einige Felder schon neu) wird fortgesetzt.
 * Exit 0 in Ordnung · 1 Fehler/Zugang · 2 Eingabe unplausibel (Tor) · 6 Rücklesen weicht ab oder fremde Änderung gefunden.
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { silberFeingehalt } from '../../automation/lib/silber_feingehalt.mjs';

const MF = 'metafields(first:20){nodes{namespace key value}}';
export const LESEN_SEITE = `query($q:String!){pages(first:5, query:$q){nodes{id handle title body ${MF}}}}`;
export const LESEN_ARTIKEL = `query($q:String!){articles(first:10, query:$q){nodes{id handle title body summary blog{handle} ${MF}}}}`;
export const SCHREIBEN_SEITE = `mutation($id:ID!,$in:PageUpdateInput!){pageUpdate(id:$id, page:$in){page{id} userErrors{field message}}}`;
export const SCHREIBEN_ARTIKEL = `mutation($id:ID!,$in:ArticleUpdateInput!){articleUpdate(id:$id, article:$in){article{id} userErrors{field message}}}`;
export const SCHREIBEN_SEO = `mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{id} userErrors{field message}}}`;

export const FELDER = ['body', 'summary', 'seoTitle', 'seoDescription'];
const SEO_SCHLUESSEL = { seoTitle: 'title_tag', seoDescription: 'description_tag' };
const HTML_FELDER = ['body', 'summary'];

/** Zeilenenden und Endleerraum vereinheitlichen: Shopify liefert den Text mit \n, eine Datei kann \r\n tragen. */
export const norm = (s) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
export const schluessel = (e) => `${e.art}:${e.art === 'Artikel' ? e.blog || '' : ''}:${e.handle}`;
/** Die Felder, die ein Eintrag anfasst (in alt oder neu genannt), in fester Reihenfolge. */
export const felderVon = (e) => FELDER.filter((f) => e?.alt?.[f] !== undefined || e?.neu?.[f] !== undefined);
const kommentare = (h) => String(h).match(/<!--[\s\S]*?-->/g) || [];
const tags = (h) => (String(h).replace(/<!--[\s\S]*?-->/g, '').match(/<[a-zA-Z][^>]*>/g) || []);
const zaehle = (l) => l.reduce((m, x) => (m.set(x, (m.get(x) || 0) + 1), m), new Map());
const klar = (h) => String(h).replace(/<[^>]*>/g, '').trim();
/** Treffer der Silber-Regel in einem Feldwert (body und summary sind HTML, die SEO-Felder Klartext; die Regel liest beides gleich). */
export const trefferFeld = (f, v) => (v == null ? 0 : silberFeingehalt({ descriptionHtml: String(v) }).belege.length);
/** Treffer in den genannten Feldern eines Standes zusammen. */
export const trefferZahl = (stand, felder = FELDER) => (typeof stand === 'string' ? trefferFeld('body', stand) : felder.reduce((n, f) => n + trefferFeld(f, stand?.[f]), 0));
const gleichStand = (a, b, felder) => felder.every((f) => norm(a?.[f]) === norm(b?.[f]));

/**
 * Tore je Eintrag (rein). Rückgabe: Liste der Probleme (leer = in Ordnung).
 * - art ist Seite oder Artikel (Artikel mit blog, nur Artikel dürfen summary tragen); alt und neu nennen dieselben Felder, alle als Text
 * - die neuen Felder haben zusammen genau `rest` Treffer der Silber-Regel und weniger als die alten (die Änderung entfernt wirklich Angaben; folgt daraus: alt ≠ neu)
 * - in body und summary: alle HTML-Kommentare bleiben, keine neuen; keine neuen oder veränderten Tags (Text darf wegfallen, Tags nur verschwinden), keine neuen Links
 * - body wird nicht leer und nicht kürzer als 40 % des alten Textes (grobe Bremse gegen versehentliches Löschen)
 * - seoTitle höchstens 70, seoDescription höchstens 160 Zeichen, nicht leer
 */
export function pruefeEintrag(e) {
  const p = [];
  if (!e || !e.handle || !['Seite', 'Artikel'].includes(e.art) || !e.alt || !e.neu) return ['Eintrag unvollständig (art, handle, alt, neu)'];
  if (e.art === 'Artikel' && !e.blog) p.push('Artikel ohne blog');
  const felder = felderVon(e);
  if (!felder.length) return [...p, 'keine Felder (body, summary, seoTitle, seoDescription)'];
  for (const f of felder) {
    if (typeof e.alt[f] !== 'string' || typeof e.neu[f] !== 'string') return [...p, `alt.${f} und neu.${f} müssen Texte sein`];
  }
  if (e.art === 'Seite' && felder.includes('summary')) p.push('Seiten haben keine summary');
  if (!Number.isInteger(e.rest) || e.rest < 0) p.push('rest (erwartete Restzahl) fehlt');
  const tA = trefferZahl(e.alt, felder), tN = trefferZahl(e.neu, felder);
  if (tN >= tA) p.push(`neu hat ${tN} Treffer, alt ${tA}: die Änderung entfernt nichts`);
  if (Number.isInteger(e.rest) && tN !== e.rest) p.push(`neu hat ${tN} Treffer der Silber-Regel, erwartet ${e.rest}`);
  for (const f of felder.filter((x) => HTML_FELDER.includes(x))) {
    if (JSON.stringify(kommentare(e.alt[f])) !== JSON.stringify(kommentare(e.neu[f]))) p.push(`${f}: HTML-Kommentare verändert`);
    const zA = zaehle(tags(e.alt[f])), zN = zaehle(tags(e.neu[f]));
    for (const [t, c] of zN) if ((zA.get(t) || 0) < c) { p.push(`${f}: neues oder verändertes Tag: ` + t.slice(0, 80)); break; }
  }
  if (felder.includes('body')) {
    if (!klar(e.neu.body)) p.push('Text würde leer');
    else if (klar(e.neu.body).length < klar(e.alt.body).length * 0.4) p.push('Text würde auf weniger als 40 % schrumpfen');
  }
  if (felder.includes('seoTitle')) { if (!e.neu.seoTitle.trim()) p.push('SEO-Titel würde leer'); if (e.neu.seoTitle.length > 70) p.push('SEO-Titel länger als 70 Zeichen'); }
  if (felder.includes('seoDescription')) { if (!e.neu.seoDescription.trim()) p.push('SEO-Beschreibung würde leer'); if (e.neu.seoDescription.length > 160) p.push('SEO-Beschreibung länger als 160 Zeichen'); }
  return p;
}

/** Gelesenen Knoten in die Form {id, body, summary, seoTitle, seoDescription}. */
export const flach = (n) => {
  const mf = (k) => (n.metafields?.nodes || []).find((m) => m.namespace === 'global' && m.key === k)?.value ?? null;
  return { id: n.id, body: n.body || '', summary: n.summary ?? null, seoTitle: mf('title_tag'), seoDescription: mf('description_tag') };
};

/** Eingaben über `o`, damit der Test eine Attrappe einspeisen kann. */
export async function lauf(o) {
  const log = o.log || ((z) => console.log(z));
  const pause = o.pause || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const jetzt = o.jetzt || (() => new Date());
  const ledger = (art, k, text = '') => o.ledger?.(`${jetzt().toISOString()}|${art}|${k}|${text}`);
  const versuche = o.leseVersuche ?? 5, lesePause = o.lesePauseMs ?? 3000, schreibPause = o.pauseMs ?? 1500;
  const eintraege = (o.eintraege || []).filter((e) => !o.nur?.length || o.nur.includes(e.handle));
  if (!eintraege.length) { log('Keine Einträge (oder ONLY trifft nichts)'); return 2; }
  if (new Set(eintraege.map(schluessel)).size !== eintraege.length) { log('Doppelte Einträge in der Eingabe'); return 2; }
  if (!o.zurueck) {
    let rot = 0;
    for (const e of eintraege) { const p = pruefeEintrag(e); if (p.length) { rot++; log(`TOR ${schluessel(e)}: ${p.join(' · ')}`); } }
    if (rot) { log(`${rot} Einträge bestehen die Tore nicht, nichts geschrieben`); return 2; }
  }
  const lese = async (e) => {
    if (e.art === 'Seite') {
      const j = await o.q(LESEN_SEITE, { q: `handle:${e.handle}` });
      const n = (j.pages?.nodes || []).find((x) => x.handle === e.handle);
      return n ? flach(n) : null;
    }
    const j = await o.q(LESEN_ARTIKEL, { q: `handle:${e.handle}` });
    const n = (j.articles?.nodes || []).find((x) => x.handle === e.handle && x.blog?.handle === e.blog);
    return n ? flach(n) : null;
  };
  const soll = (e) => (o.zurueck ? e.alt : e.neu);
  // fremd = ein Feld hat weder den alten noch den neuen Wert; ein Teilstand (Text schon neu, Metafeld noch alt) bleibt fortsetzbar
  const fremdFelder = (e, ist) => felderVon(e).filter((f) => norm(ist[f]) !== norm(e.alt[f]) && norm(ist[f]) !== norm(e.neu[f]));
  let schlecht = 0, geschrieben = 0, schon = 0;
  for (const e of eintraege) {
    const k = schluessel(e), felder = felderVon(e), z = soll(e);
    const ist = await lese(e);
    if (!ist) { log(`FEHLT ${k}: nicht lesbar`); ledger('FEHLER', k, 'nicht lesbar'); schlecht++; continue; }
    if (gleichStand(ist, z, felder)) { log(`schon erledigt: ${k}`); schon++; continue; }
    const fremd = fremdFelder(e, ist);
    if (fremd.length && !o.fremdUeberschreiben) { log(`FREMD VERÄNDERT ${k}: ${fremd.join(', ')} weder alt noch neu, nicht überschrieben`); ledger('FREMD', k, fremd.join(',')); schlecht++; continue; }
    log(`${o.live ? 'SCHREIBE' : 'würde schreiben'} ${k} [${felder.join(', ')}]: Treffer ${trefferZahl(ist, felder)} → ${trefferZahl(z, felder)}`);
    if (!o.live) continue;
    const eingabe = {};
    for (const f of felder.filter((x) => HTML_FELDER.includes(x) && norm(ist[x]) !== norm(z[x]))) eingabe[f] = z[f];
    const seoGeaendert = felder.filter((f) => SEO_SCHLUESSEL[f] && norm(ist[f]) !== norm(z[f]));
    let fehler = [];
    try {
      if (Object.keys(eingabe).length) {
        const j = e.art === 'Seite' ? await o.q(SCHREIBEN_SEITE, { id: ist.id, in: eingabe }) : await o.q(SCHREIBEN_ARTIKEL, { id: ist.id, in: eingabe });
        fehler = (e.art === 'Seite' ? j.pageUpdate : j.articleUpdate)?.userErrors || [];
      }
      if (!fehler.length && seoGeaendert.length) {
        const j = await o.q(SCHREIBEN_SEO, { m: seoGeaendert.map((f) => ({ ownerId: ist.id, namespace: 'global', key: SEO_SCHLUESSEL[f], type: 'single_line_text_field', value: z[f] })) });
        fehler = j.metafieldsSet?.userErrors || [];
      }
    } catch (x) { fehler = [{ message: 'Ausnahme: ' + x.message }]; }
    if (fehler.length) { log(`FEHLER ${k}: ${fehler.map((f) => f.message).join(' | ')}`); ledger('FEHLER', k, fehler.map((f) => f.message).join(' | ')); return 6; }
    await pause(schreibPause);
    let ok = false;
    for (let i = 1; i <= versuche; i++) {
      const jetztIst = await lese(e);
      if (jetztIst && gleichStand(jetztIst, z, felder)) { ok = true; break; }
      if (i < versuche) await pause(lesePause);
    }
    ledger(ok ? (o.zurueck ? 'ZURUECK' : 'GESCHRIEBEN') : 'ABWEICHUNG', k, ok ? '' : 'zurückgelesener Text weicht ab');
    if (!ok) { log(`ABWEICHUNG ${k}: zurückgelesener Text weicht vom geschriebenen ab, Halt`); return 6; }
    geschrieben++;
  }
  if (!o.live) { log(`Trockenlauf: ${eintraege.length - schon - schlecht} würden geschrieben, ${schon} schon erledigt, ${schlecht} Probleme`); return schlecht ? 6 : 0; }
  log(`Geschrieben und zurückgelesen: ${geschrieben}, schon erledigt: ${schon}, Probleme: ${schlecht}`);
  return schlecht ? 6 : 0;
}

// ------------------------------------------------------------------ Aufruf von der Kommandozeile
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [{ shopifyGql }, { shopifyClientSecret }] = await Promise.all([import('../../automation/lib/shopify_gql.mjs'), import('../../automation/lib/shopify_secret.mjs')]);
  const HIER = dirname(fileURLToPath(import.meta.url));
  const EIN = process.env.EINGABE || join(HIER, 'seitentexte.json'), LEDGER = process.env.LEDGER || join(HIER, 'ledger-seiten.txt');
  if (!existsSync(EIN)) { console.error('seitentexte.json fehlt'); process.exit(2); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  try {
    const code = await lauf({
      q: (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b), eintraege: JSON.parse(readFileSync(EIN, 'utf8')).eintraege,
      live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1', fremdUeberschreiben: process.env.FREMD_UEBERSCHREIBEN === '1',
      nur: (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean), ledger: (z) => appendFileSync(LEDGER, z + '\n'),
    });
    process.exit(code);
  } catch (e) { console.error('FEHLER:', e.message); process.exit(1); }
}
