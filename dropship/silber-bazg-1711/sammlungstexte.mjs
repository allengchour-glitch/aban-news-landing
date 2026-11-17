#!/usr/bin/env node
/**
 * Sammlungstexte ohne Silber-Feingehaltsangabe (Besitzer 17.11.2026 «3 … mach das alles fix und live»): die Sammlungen, deren Text («925er Sterlingsilber», Produktnamen …)
 * eine Feingehaltsangabe nennt, bekommen den bereinigten Text. Nur Beschreibung (HTML), SEO-Titel und SEO-Beschreibung ändern sich, der Sammlungstitel nie.
 *   node dropship/silber-bazg-1711/sammlungstexte.mjs                 Trockenlauf (Vorgabe): prüft alle Einträge und zeigt, was geschrieben würde
 *   LIVE=1 node …/sammlungstexte.mjs                                  schreibt (je Sammlung: lesen, mit `alt` vergleichen, schreiben, zurücklesen)
 *   ZURUECK=1 [LIVE=1] node …/sammlungstexte.mjs                      Rücknahme auf `alt` (Trockenlauf Vorgabe)
 * Eingabe: sammlungstexte.json = Liste {handle, alt:{descriptionHtml, seoTitle, seoDescription}, neu:{…}} (alt = Stand VOR der Änderung, im Repo gesichert, bevor geschrieben wird).
 * Schutz: eine Sammlung, die inzwischen von jemand anderem geändert wurde (weder `alt` noch `neu`), wird NICHT überschrieben (FREMD_UEBERSCHREIBEN=1 hebt das auf).
 * Exit 0 in Ordnung · 1 Fehler/Zugang · 2 Eingabe unplausibel (Tor) · 6 Rücklesen weicht ab oder fremde Änderung gefunden.
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { silberFeingehalt } from '../../automation/lib/silber_feingehalt.mjs';

export const LESEN = `query($q:String!){collections(first:5, query:$q){nodes{id handle title descriptionHtml seo{title description}}}}`;
export const SCHREIBEN = `mutation($in:CollectionInput!){collectionUpdate(input:$in){collection{id} userErrors{field message}}}`;
const FELDER = ['descriptionHtml', 'seoTitle', 'seoDescription'];

/** Gelesene Sammlung in die Form {descriptionHtml, seoTitle, seoDescription}. Leere Werte zählen als null (Shopify liefert null oder ''). */
export const flach = (n) => ({ id: n.id, handle: n.handle, descriptionHtml: n.descriptionHtml || '', seoTitle: n.seo?.title || null, seoDescription: n.seo?.description || null });
const gleichFelder = (a, b) => FELDER.every((f) => (a?.[f] || null) === (b?.[f] || null));      // null und '' zählen als gleich (Shopify liefert beides)

const kommentare = (h) => String(h).match(/<!--[\s\S]*?-->/g) || [];            // in der Reihenfolge des Textes
const tags = (h) => (String(h).replace(/<!--[\s\S]*?-->/g, '').match(/<[a-zA-Z][^>]*>/g) || []);
const zaehle = (l) => l.reduce((m, x) => (m.set(x, (m.get(x) || 0) + 1), m), new Map());

/**
 * Tore je Eintrag (rein). Rückgabe: Liste der Probleme (leer = in Ordnung).
 * - `neu` nennt in keinem Feld eine Silber-Feingehaltsangabe
 * - alle HTML-Kommentare (Markierungen wie <!-- ls-verwandt -->) bleiben, keine neuen
 * - keine neuen oder veränderten Tags (nur Text darf wegfallen oder sich ändern); keine neuen Links
 * - SEO-Titel höchstens 70, SEO-Beschreibung höchstens 160 Zeichen; die Beschreibung wird nicht leer
 * - `alt` und `neu` sind nicht gleich (sonst gäbe es nichts zu tun)
 */
export function pruefeEintrag(e) {
  const p = [];
  if (!e || !e.handle || !e.alt || !e.neu) return ['Eintrag unvollständig (handle, alt, neu)'];
  for (const f of FELDER) if (typeof e.alt[f] !== 'string' && e.alt[f] != null) p.push(`alt.${f} ist kein Text`);
  const n = e.neu;
  const r = silberFeingehalt({ title: n.seoTitle || '', description: `${n.descriptionHtml || ''} ${n.seoDescription || ''}` });
  if (r.treffer) p.push('neu nennt noch eine Silber-Feingehaltsangabe: ' + r.belege.slice(0, 2).map((b) => b.text).join(' | '));
  const kA = kommentare(e.alt.descriptionHtml), kN = kommentare(n.descriptionHtml);
  if (JSON.stringify(kA) !== JSON.stringify(kN)) p.push('HTML-Kommentare (Markierungen) verändert');
  const tA = zaehle(tags(e.alt.descriptionHtml)), tN = zaehle(tags(n.descriptionHtml));
  for (const [t, c] of tN) if ((tA.get(t) || 0) < c) { p.push('neues oder verändertes Tag: ' + t.slice(0, 80)); break; }
  if ((n.seoTitle || '').length > 70) p.push('SEO-Titel länger als 70 Zeichen');
  if ((n.seoDescription || '').length > 160) p.push('SEO-Beschreibung länger als 160 Zeichen');
  if (String(e.alt.descriptionHtml || '').trim() && !String(n.descriptionHtml || '').replace(/<[^>]*>/g, '').trim()) p.push('Beschreibung würde leer');
  if (gleichFelder(e.alt, e.neu)) p.push('alt und neu sind gleich (nichts zu tun)');
  return p;
}

/** Eingaben über `o`, damit der Test eine Attrappe einspeisen kann. */
export async function lauf(o) {
  const log = o.log || ((z) => console.log(z));
  const pause = o.pause || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const jetzt = o.jetzt || (() => new Date());
  const ledger = (art, handle, text = '') => o.ledger?.(`${jetzt().toISOString()}|${art}|${handle}|${text}`);
  const versuche = o.leseVersuche ?? 5, lesePause = o.lesePauseMs ?? 3000, schreibPause = o.pauseMs ?? 1500;
  const eintraege = (o.eintraege || []).filter((e) => !o.nur?.length || o.nur.includes(e.handle));
  if (!eintraege.length) { log('Keine Einträge (oder ONLY trifft nichts)'); return 2; }
  if (new Set(eintraege.map((e) => e.handle)).size !== eintraege.length) { log('Doppelte Handles in der Eingabe'); return 2; }

  // Tore (nur beim Vorwärts-Schreiben; die Rücknahme stellt den gesicherten Stand her)
  if (!o.zurueck) {
    let rot = 0;
    for (const e of eintraege) { const p = pruefeEintrag(e); if (p.length) { rot++; log(`TOR ${e.handle}: ${p.join(' · ')}`); } }
    if (rot) { log(`${rot} Einträge bestehen die Tore nicht, nichts geschrieben`); return 2; }
  }

  const lese = async (handle) => {
    const j = await o.q(LESEN, { q: `handle:${handle}` });
    const n = (j.collections?.nodes || []).find((x) => x.handle === handle);
    return n ? flach(n) : null;
  };
  const soll = (e) => (o.zurueck ? e.alt : e.neu);
  const andere = (e) => (o.zurueck ? e.neu : e.alt);        // der Stand, von dem aus wir ändern
  let schlecht = 0, geschrieben = 0, schon = 0;
  for (const e of eintraege) {
    const ist = await lese(e.handle);
    if (!ist) { log(`FEHLT ${e.handle}: Sammlung nicht lesbar`); ledger('FEHLER', e.handle, 'nicht lesbar'); schlecht++; continue; }
    if (gleichFelder(ist, soll(e))) { log(`schon erledigt: ${e.handle}`); schon++; continue; }
    if (!gleichFelder(ist, andere(e)) && !o.fremdUeberschreiben) { log(`FREMD VERÄNDERT ${e.handle}: weder alt noch neu, nicht überschrieben`); ledger('FREMD', e.handle, ''); schlecht++; continue; }
    const z = soll(e);
    log(`${o.live ? 'SCHREIBE' : 'würde schreiben'} ${e.handle}: Beschreibung ${String(ist.descriptionHtml).length} → ${String(z.descriptionHtml || '').length} Zeichen, SEO-Titel ${ist.seoTitle === (z.seoTitle ?? ist.seoTitle) ? 'gleich' : 'neu'}, SEO-Beschreibung ${ist.seoDescription === (z.seoDescription ?? ist.seoDescription) ? 'gleich' : 'neu'}`);
    if (!o.live) continue;
    const eingabe = { id: ist.id, descriptionHtml: z.descriptionHtml ?? ist.descriptionHtml, seo: { title: z.seoTitle !== undefined && z.seoTitle !== null ? z.seoTitle : ist.seoTitle, description: z.seoDescription !== undefined && z.seoDescription !== null ? z.seoDescription : ist.seoDescription } };
    let fehler = [];
    try { const j = await o.q(SCHREIBEN, { in: eingabe }); fehler = j.collectionUpdate?.userErrors || []; } catch (x) { fehler = [{ message: 'Ausnahme: ' + x.message }]; }
    if (fehler.length) { log(`FEHLER ${e.handle}: ${fehler.map((f) => f.message).join(' | ')}`); ledger('FEHLER', e.handle, fehler.map((f) => f.message).join(' | ')); return 6; }
    await pause(schreibPause);
    let ok = false, jetztIst = null;
    for (let i = 1; i <= versuche; i++) {
      jetztIst = await lese(e.handle);
      const erwartet = { descriptionHtml: z.descriptionHtml ?? ist.descriptionHtml, seoTitle: eingabe.seo.title, seoDescription: eingabe.seo.description };
      if (jetztIst && gleichFelder(jetztIst, erwartet)) { ok = true; break; }
      if (i < versuche) await pause(lesePause);
    }
    ledger(ok ? (o.zurueck ? 'ZURUECK' : 'GESCHRIEBEN') : 'ABWEICHUNG', e.handle, ok ? '' : 'zurückgelesener Text weicht ab');
    if (!ok) { log(`ABWEICHUNG ${e.handle}: zurückgelesener Text weicht vom geschriebenen ab, Halt`); return 6; }
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
  const EIN = process.env.EINGABE || join(HIER, 'sammlungstexte.json'), LEDGER = process.env.LEDGER || join(HIER, 'ledger-sammlungen.txt');
  if (!existsSync(EIN)) { console.error('sammlungstexte.json fehlt'); process.exit(2); }
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
