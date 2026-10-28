#!/usr/bin/env node
/**
 * Doppelte Seitentitel bei Sammlungen auflösen (Sichtbarkeit bei Google). Regeln und Begründung: lib/seo_dubletten.mjs (getestet, seo_dubletten_test.mjs).
 *
 * MODUS (Umgebungsvariable, Vorgabe «beide»):
 *   geschlecht  Gruppen gleicher Titel, deren Mitglieder damen-/herren-/kinder- im Handle tragen: SEO-Titel wird «<Titel> für Damen|Herren|Kinder». Nur `seo.title`; Überschrift, Handle, Regel bleiben.
 *   chips       Rucksack-Chips (Bereichsdatei rucksaecke.json, ids r-…): Titel, Beschreibung, SEO-Titel und SEO-Beschreibung aus der Datei, wenn der Shop davon abweicht.
 *   beide       beides.
 * TROCKENLAUF IST VORGABE (liest nur, zeigt jede Änderung und die offenen Gruppen). LIVE=1 schreibt:
 *   Sicherung der alten Werte nach dropship/seo-sicherung-2810/<modus>.json (nie überschrieben), collectionUpdate je Sammlung, danach FRISCH zurücklesen und vergleichen (Exit 3 bei Abweichung),
 *   Ledger dropship/seo_dubletten_ledger.txt. `seo` wird von Shopify ERSETZT: es gehen immer Titel UND Beschreibung mit (Skill shop-messen-nicht-raten, Abschnitt 5).
 * Exit 0 = in Ordnung, 1 = Aufruffehler, 3 = nach dem Schreiben frisch gelesen nicht wie geplant.
 */
import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { geschlechtsPlan, chipPlan, entschaerfe } from './lib/seo_dubletten.mjs';
import { RUCKSAECKE } from './lib/rucksaecke_menue.mjs';

const ALLE_Q = `query($a:String){collections(first:250, after:$a){pageInfo{hasNextPage endCursor} nodes{id handle title descriptionHtml seo{title description} productsCount{count}}}}`;
const EINE_Q = `query($id:ID!){collection(id:$id){title descriptionHtml seo{title description}}}`;
const UPD = `mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{id} userErrors{field message}}}`;

export async function alleSammlungen(q) {
  const alle = []; let after = null;
  do {
    const d = await q(ALLE_Q, { a: after });
    alle.push(...d.collections.nodes); after = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null;
  } while (after);
  return alle;
}

/**
 * Der ganze Lauf mit eingespeister Abfrage `q(query, variables)` (Tests spielen eine Attrappe ein).
 * @returns {Promise<{code:number, geschlecht?:object, chips?:object, geschrieben:number}>}
 */
export async function seoDublettenLauf(q, { modus = 'beide', live = false, sicherung = (m) => `dropship/seo-sicherung-2810/${m}.json`, ledger = 'dropship/seo_dubletten_ledger.txt', jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  if (!['geschlecht', 'chips', 'beide'].includes(modus)) { err(`MODUS «${modus}» unbekannt (geschlecht, chips, beide)`); return { code: 1, geschrieben: 0 }; }
  const sammlungen = await alleSammlungen(q);
  out(`Sammlungen gelesen: ${sammlungen.length} (mit Produkten: ${sammlungen.filter(c => (c.productsCount?.count ?? 0) > 0).length})`);
  const ergebnis = { code: 0, geschrieben: 0 };
  const schreibe = async (name, liste, eingabe) => {
    if (!liste.length) return;
    const datei = sicherung(name);
    if (live) {
      mkdirSync(dirname(datei), { recursive: true });
      if (!existsSync(datei)) writeFileSync(datei, JSON.stringify({ gesichertAm: jetzt().toISOString(), aenderungen: liste.map(a => ({ handle: a.handle, id: a.id, alt: a.alt })) }, null, 1) + '\n', { flag: 'wx' });
    }
    for (const a of liste) {
      const neuWert = eingabe(a);
      if (!live) continue;
      const d = await q(UPD, { i: { id: a.id, ...neuWert } });
      if (d.collectionUpdate.userErrors.length) throw new Error(`collectionUpdate ${a.handle} ${JSON.stringify(d.collectionUpdate.userErrors)}`);
      // FRISCH lesen, nie dem Rückgabewert glauben
      const f = (await q(EINE_Q, { id: a.id })).collection;
      // Shopify gibt «&» im HTML der Beschreibung als «&amp;» zurück: Entities angleichen (28.10.2026: sonst meldete der Rücklese-Vergleich 35 korrekt geschriebene Chips als abweichend).
      const stimmt = Object.entries(neuWert).every(([k, v]) => k === 'seo' ? (f.seo?.title ?? null) === (v.title ?? null) && (v.description === undefined || entschaerfe(f.seo?.description ?? null) === entschaerfe(v.description)) : entschaerfe(f[k]) === entschaerfe(v));
      if (!stimmt) { err(`  ✗ ${a.handle}: nach dem Schreiben frisch gelesen NICHT wie geplant: ${JSON.stringify({ title: f.title, seo: f.seo })}`); ergebnis.code = 3; continue; }
      ergebnis.geschrieben++;
      appendFileSync(ledger, `${jetzt().toISOString()} · ${name} ${a.handle}\n`);
    }
  };
  if (modus === 'geschlecht' || modus === 'beide') {
    const p = geschlechtsPlan(sammlungen);
    out(`\nGESCHLECHT: ${p.aenderungen.length} SEO-Titel würden geändert, ${p.offen.length} Gruppen bleiben offen`);
    for (const a of p.aenderungen) out(`  ${a.handle.padEnd(40)} «${a.alt}» → «${a.neu}»`);
    for (const o of p.offen) out(`  OFFEN «${o.titel}» (${o.handles.join(', ')}): ${o.grund}`);
    ergebnis.geschlecht = p;
    await schreibe('geschlecht', p.aenderungen, a => ({ seo: { title: a.neu, ...(a.beschreibung != null ? { description: a.beschreibung } : {}) } }));
  }
  if (modus === 'chips' || modus === 'beide') {
    const p = chipPlan(RUCKSAECKE.filter(k => k.filter), sammlungen);
    out(`\nCHIPS: ${p.aenderungen.length} Rucksack-Chips weichen von der Bereichsdatei ab, ${p.fehlt.length} fehlen im Shop${p.fehlt.length ? ' (' + p.fehlt.join(', ') + ')' : ''}`);
    for (const a of p.aenderungen) out(`  ${a.handle.padEnd(26)} ${a.felder.join('+').padEnd(40)} «${a.alt.title}» → «${a.neu.title}»`);
    ergebnis.chips = p;
    await schreibe('chips', p.aenderungen, a => ({ title: a.neu.title, descriptionHtml: a.neu.descriptionHtml, seo: { title: a.neu.seoTitle, description: a.neu.seoDescription } }));
  }
  out(live ? `\nLIVE: ${ergebnis.geschrieben} Sammlungen geschrieben und frisch zurückgelesen${ergebnis.code ? ' - ABWEICHUNGEN, siehe oben' : ''}` : '\nTrockenlauf - nichts geschrieben.');
  return ergebnis;
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await seoDublettenLauf(q, { modus: process.env.MODUS || 'beide', live: process.env.LIVE === '1' });
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
