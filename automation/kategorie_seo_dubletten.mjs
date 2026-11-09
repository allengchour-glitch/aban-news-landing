#!/usr/bin/env node
/**
 * Doppelte Seitentitel bei Sammlungen auflösen (Sichtbarkeit bei Google). Regeln und Begründung: lib/seo_dubletten.mjs (getestet, seo_dubletten_test.mjs).
 *
 * MODUS (Umgebungsvariable, Vorgabe «beide»):
 *   geschlecht  Gruppen gleicher Titel, deren Mitglieder damen-/herren-/kinder- im Handle tragen: SEO-Titel wird «<Titel> für Damen|Herren|Kinder». Nur `seo.title`; Überschrift, Handle, Regel bleiben.
 *   chips       Rucksack-Chips (Bereichsdatei rucksaecke.json, ids r-…): Titel, Beschreibung, SEO-Titel und SEO-Beschreibung aus der Datei, wenn der Shop davon abweicht.
 *   beide       geschlecht und chips (nicht beschreibung).
 *   beschreibung  (09.11.2026, nur ausdrücklich) Gruppen gleicher SEO-BESCHREIBUNG, deren Mitglieder damen-/herren-/kinder- im Handle tragen und die Vorlage «<Gegenstand> online kaufen. …» haben:
 *               die Beschreibung wird «<Gegenstand> für Damen|Herren|Kinder online kaufen. …». Der SEO-Titel geht unverändert mit (seo wird ersetzt). Sicherung dropship/seo-beschreibung-0911/sicherung.json.
 *               ZURUECK=1 setzt die alten Beschreibungen zurück, aber nur bei Sammlungen, deren Beschreibung noch genau dem geschriebenen Wert entspricht (sonst Exit 3, nichts angefasst).
 * TROCKENLAUF IST VORGABE (liest nur, zeigt jede Änderung und die offenen Gruppen). LIVE=1 schreibt:
 *   Sicherung der alten Werte nach dropship/seo-sicherung-2810/<modus>.json (nie überschrieben, spätere Chargen werden ergänzt), collectionUpdate je Sammlung, danach FRISCH zurücklesen und vergleichen (Exit 3 bei Abweichung),
 *   Ledger dropship/seo_dubletten_ledger.txt. `seo` wird von Shopify ERSETZT: es gehen immer Titel UND Beschreibung mit (Skill shop-messen-nicht-raten, Abschnitt 5).
 * Exit 0 = in Ordnung, 1 = Aufruffehler, 3 = nach dem Schreiben frisch gelesen nicht wie geplant.
 */
import { writeFileSync, mkdirSync, existsSync, appendFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { geschlechtsPlan, chipPlan, beschreibungsPlan, entschaerfe } from './lib/seo_dubletten.mjs';
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
 * Rücknahme des Modus «beschreibung»: setzt die alten Beschreibungen aus der Sicherung zurück, aber NUR bei Sammlungen, deren Beschreibung noch genau dem geschriebenen Wert entspricht
 * (hat seither jemand anders etwas geändert, bleibt sie unberührt und der Lauf endet mit Exit 3). Trockenlauf ist Vorgabe. Der SEO-Titel geht unverändert mit (seo wird ersetzt).
 */
async function beschreibungZurueck(q, { live, sicherung, ledger, jetzt, out, err }) {
  const datei = sicherung('beschreibung');
  if (!existsSync(datei)) { err(`Keine Sicherung gefunden: ${datei}`); return { code: 1, geschrieben: 0 }; }
  const liste = JSON.parse(readFileSync(datei, 'utf8')).aenderungen;
  const erg = { code: 0, geschrieben: 0, schonZurueck: 0 };
  for (const a of liste) {
    const f = (await q(EINE_Q, { id: a.id })).collection;
    if (!f) { err(`  ✗ ${a.handle}: Sammlung nicht mehr vorhanden`); erg.code = 3; continue; }
    const jetztWert = entschaerfe(f.seo?.description ?? '');
    if (jetztWert === entschaerfe(a.alt)) { erg.schonZurueck++; continue; }
    if (jetztWert !== entschaerfe(a.neu)) { err(`  ✗ ${a.handle}: Beschreibung wurde seither anders geändert, nicht angefasst: «${f.seo?.description ?? ''}»`); erg.code = 3; continue; }
    out(`  ${a.handle.padEnd(40)} «${a.neu}» → «${a.alt}»`);
    if (!live) continue;
    const d = await q(UPD, { i: { id: a.id, seo: { ...(f.seo?.title != null ? { title: f.seo.title } : {}), description: a.alt } } });
    if (d.collectionUpdate.userErrors.length) throw new Error(`collectionUpdate ${a.handle} ${JSON.stringify(d.collectionUpdate.userErrors)}`);
    const g = (await q(EINE_Q, { id: a.id })).collection;
    if (entschaerfe(g.seo?.description ?? '') !== entschaerfe(a.alt) || (g.seo?.title ?? null) !== (f.seo?.title ?? null)) { err(`  ✗ ${a.handle}: nach der Rücknahme frisch gelesen NICHT wie geplant: ${JSON.stringify(g.seo)}`); erg.code = 3; continue; }
    erg.geschrieben++;
    appendFileSync(ledger, `${jetzt().toISOString()} · beschreibung-zurueck ${a.handle}\n`);
  }
  out(live ? `\nRÜCKNAHME LIVE: ${erg.geschrieben} Sammlungen zurückgesetzt, ${erg.schonZurueck} waren schon zurück${erg.code ? ' - ABWEICHUNGEN, siehe oben' : ''}` : `\nRücknahme Trockenlauf - nichts geschrieben (${erg.schonZurueck} schon zurück).`);
  return erg;
}

/**
 * Der ganze Lauf mit eingespeister Abfrage `q(query, variables)` (Tests spielen eine Attrappe ein).
 * @returns {Promise<{code:number, geschlecht?:object, chips?:object, beschreibung?:object, geschrieben:number}>}
 */
export async function seoDublettenLauf(q, { modus = 'beide', live = false, zurueck = false, sicherung = (m) => m === 'beschreibung' ? 'dropship/seo-beschreibung-0911/sicherung.json' : `dropship/seo-sicherung-2810/${m}.json`, ledger = 'dropship/seo_dubletten_ledger.txt', jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  if (!['geschlecht', 'chips', 'beide', 'beschreibung'].includes(modus)) { err(`MODUS «${modus}» unbekannt (geschlecht, chips, beide, beschreibung)`); return { code: 1, geschrieben: 0 }; }
  if (zurueck) {
    if (modus !== 'beschreibung') { err('ZURUECK gibt es nur mit MODUS=beschreibung'); return { code: 1, geschrieben: 0 }; }
    return beschreibungZurueck(q, { live, sicherung, ledger, jetzt, out, err });
  }
  const sammlungen = await alleSammlungen(q);
  out(`Sammlungen gelesen: ${sammlungen.length} (mit Produkten: ${sammlungen.filter(c => (c.productsCount?.count ?? 0) > 0).length})`);
  const ergebnis = { code: 0, geschrieben: 0 };
  const schreibe = async (name, liste, eingabe) => {
    if (!liste.length) return;
    const datei = sicherung(name);
    if (live) {
      mkdirSync(dirname(datei), { recursive: true });
      const eintraege = liste.map(a => ({ handle: a.handle, id: a.id, alt: a.alt, neu: a.neu }));
      if (!existsSync(datei)) writeFileSync(datei, JSON.stringify({ gesichertAm: jetzt().toISOString(), aenderungen: eintraege }, null, 1) + '\n', { flag: 'wx' });
      else {
        // Spätere Charge: neue Sammlungen ergänzen, schon gesicherte Einträge (mit dem ERSTEN alten Wert) bleiben unberührt.
        const s = JSON.parse(readFileSync(datei, 'utf8')), bekannt = new Set(s.aenderungen.map(x => x.handle)), neue = eintraege.filter(x => !bekannt.has(x.handle));
        if (neue.length) writeFileSync(datei, JSON.stringify({ ...s, aenderungen: [...s.aenderungen, ...neue] }, null, 1) + '\n');
      }
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
  if (modus === 'beschreibung') {
    const p = beschreibungsPlan(sammlungen);
    out(`\nBESCHREIBUNG: ${p.aenderungen.length} SEO-Beschreibungen würden geändert, ${p.offen.length} Gruppen bleiben offen`);
    for (const a of p.aenderungen) out(`  ${a.handle.padEnd(40)} «${a.alt}» → «${a.neu}»`);
    for (const o of p.offen) out(`  OFFEN «${o.beschreibung.slice(0, 70)}» (${o.handles.join(', ')}): ${o.grund}`);
    ergebnis.beschreibung = p;
    // `seo` wird ersetzt: der eigene SEO-Titel geht unverändert mit (fehlt er, bleibt er weg).
    await schreibe('beschreibung', p.aenderungen, a => ({ seo: { ...(a.titel != null ? { title: a.titel } : {}), description: a.neu } }));
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
  const res = await seoDublettenLauf(q, { modus: process.env.MODUS || 'beide', live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1' });
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
