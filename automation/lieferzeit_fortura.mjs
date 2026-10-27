#!/usr/bin/env node
/**
 * Falsche Lieferzeit «Lieferung in nur 1–2 Werktagen (DPD)» auf Fortura-Produkten ausserhalb des Versandprofils «CH-Lager».
 *
 * BEFUND (27.10.2026, gemessen): 734 aktive Produkte (Tag `ch-lager`, OHNE `profil-ch-lager`) tragen im Textblock «Warum bei LuxeStyle kaufen?»
 * den alten Importer-Satz «Versand aus der Schweiz – Lieferung in nur 1–2 Werktagen (DPD)». Dieselbe Seite zeigt beim Kaufen-Knopf
 * «Lieferung voraussichtlich 11. Nov. – 25. Nov.» (Produktseite und Kasse rechnen für Ware ausserhalb des Profils 7–17 Tage Transit),
 * und der Satz steht auch in der strukturierten Beschreibung (JSON-LD `description`), die Google liest.
 * Der Wächter der anderen Sitzung (kassen_lieferdatum_wache.py, `zusage_produkte`) schreibt NUR Produkte mit `profil-ch-lager` um, und dort
 * «meist in 2–3 Werktagen» — für diese 734 wäre auch das falsch. Darum hier eine Zeile OHNE Zahl, die auf das Datum verweist, das die Seite
 * und die Kasse selbst nennen. Wandert ein Produkt später ins Profil, bleibt die Zeile wahr.
 *
 * Schreibt NUR diesen einen Satz (exakte Zeichenkette, genau einmal); alles andere am Text bleibt Byte für Byte gleich.
 * Ersetzt werden zwei bekannte Sätze: der alte Importer-Satz «1–2 Werktagen (DPD)» (734 Produkte) und der neue «meist in 2–3 Werktagen bei dir»
 * (13 neuere Artikel ausserhalb des Profils). Produkte MIT `profil-ch-lager` fasst das Werkzeug nie an.
 * Findet ein Text noch eine andere Kurz-Zusage, einen zweiten Treffer oder einen abweichenden Wortlaut, wird NICHTS geschrieben und der Fall gemeldet.
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Vor jedem Schreiben wird das Produkt frisch gelesen (Tags + Text), nach dem Schreiben die Antwort geprüft.
 * Schalter: LIVE=1 · LIMIT=n (höchstens n schreiben) · STATUS=active|draft (Vorgabe active) · PARALLEL=n (Vorgabe 3)
 * Ledger: dropship/lieferzeit_fortura_ledger.tsv (Zeit, Produkt-ID, Handle). Alt- und Neu-Satz stehen unten als ALT/NEU.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';

export const ALT = '<strong>Versand aus der Schweiz</strong> – Lieferung in nur 1–2 Werktagen (DPD)';
// Der Satz, den die Fortura-Importer seit 13.10.2026 schreiben (stimmt nur für Ware IM Profil «CH-Lager»; 13 neuere Artikel ausserhalb tragen ihn trotzdem)
export const ALT_PROFIL = '<strong>Versand ab Schweizer Lager</strong> mit DPD, meist in 2–3 Werktagen bei dir';
export const NEU = '<strong>Versand ab Schweizer Lager</strong> mit DPD – das voraussichtliche Lieferdatum steht beim Artikel und in der Kasse';
const BEKANNT = [ALT, ALT_PROFIL];
// Jede andere Kurz-Zusage («1–2 Werktage», «in 1–2 Tagen», «ein bis zwei Werktage», «1-2 business days») blockiert das Schreiben.
const KURZ = /(?<![\d.,])1\s*(?:–|-|&ndash;|&#8211;|bis)\s*2\s*(?:Werk)?tag|ein\s+bis\s+zwei\s+(?:Werk)?tag|(?<![\d.,])1\s*(?:–|-|&ndash;)\s*2\s*(?:business\s+)?(?:days|jours)/i;
const ORT = /Versand aus der Schweiz/;

/** Reiner Plan für EINEN Produkttext → { art: 'ersetzen', neu } | { art: 'sauber' } | { art: 'sonderfall', grund }. Getestet in lieferzeit_fortura_test.mjs.
 *  Nur für Ware OHNE Marke `profil-ch-lager` aufrufen — im Profil stimmt «meist in 2–3 Werktagen» (die Kasse rechnet dort 2–3). */
export function planeText(html) {
  const t = String(html ?? '');
  const n = BEKANNT.reduce((s, a) => s + t.split(a).length - 1, 0);
  if (n === 0) {
    if (KURZ.test(t)) return { art: 'sonderfall', grund: 'andere Kurz-Zusage' };
    if (ORT.test(t)) return { art: 'sonderfall', grund: 'abweichender Wortlaut «Versand aus der Schweiz»' };
    return { art: 'sauber' };
  }
  if (n > 1) return { art: 'sonderfall', grund: `${n}× ein bekannter Satz` };
  const alt = BEKANNT.find(a => t.includes(a));
  const neu = t.replace(alt, () => NEU);          // Funktion: «$» im Ersatz darf nicht als Muster gelten
  if (KURZ.test(neu)) return { art: 'sonderfall', grund: 'weitere Kurz-Zusage im Text' };
  return { art: 'ersetzen', neu };
}

const LESEN = `query($a:String,$q:String!){products(first:100,after:$a,query:$q){pageInfo{hasNextPage endCursor} nodes{id handle tags descriptionHtml seo{description}}}}`;
const FRISCH = `query($id:ID!){product(id:$id){id handle status tags descriptionHtml}}`;
const SCHREIBEN = `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id descriptionHtml} userErrors{field message}}}`;

async function main() {
  const LIVE = process.env.LIVE === '1', LIMIT = Number(process.env.LIMIT || 1e9), PARALLEL = Math.max(1, Number(process.env.PARALLEL || 3));
  const STATUS = (process.env.STATUS || 'active').toLowerCase();
  if (!['active', 'draft'].includes(STATUS)) { console.error('STATUS muss active oder draft sein'); process.exit(1); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  const FILTER = `status:${STATUS} tag:ch-lager -tag:profil-ch-lager`;
  const alle = []; let after = null;
  for (;;) {
    const d = (await q(LESEN, { a: after, q: FILTER })).products;
    alle.push(...d.nodes);
    if (!d.pageInfo.hasNextPage) break;
    after = d.pageInfo.endCursor;
  }
  const klassen = { ersetzen: [], sauber: [], sonderfall: [] }, seoKurz = [];
  for (const p of alle) {
    // Gegenprobe: die Abfrage darf nur Produkte liefern, die wirklich im Bereich liegen (Tag-Suche ist unscharf bei Gross/Klein)
    if (!p.tags.includes('ch-lager') || p.tags.includes('profil-ch-lager')) { klassen.sonderfall.push({ ...p, grund: 'Tags passen nicht zum Filter' }); continue; }
    const pl = planeText(p.descriptionHtml);
    klassen[pl.art].push({ id: p.id, handle: p.handle, grund: pl.grund, neu: pl.neu });
    if (KURZ.test(p.seo?.description || '')) seoKurz.push(p.handle);
  }
  console.log(`Filter «${FILTER}»: ${alle.length} Produkte gelesen`);
  console.log(`  zu ersetzen: ${klassen.ersetzen.length} · schon sauber: ${klassen.sauber.length} · Sonderfälle (nichts geschrieben): ${klassen.sonderfall.length} · SEO-Beschreibung mit Kurz-Zusage: ${seoKurz.length}`);
  for (const s of klassen.sonderfall.slice(0, 15)) console.log(`  ⚠ ${s.handle} — ${s.grund}`);
  for (const h of seoKurz.slice(0, 10)) console.log(`  ⚠ SEO-Beschreibung: ${h}`);
  writeFileSync('/tmp/lieferzeit_fortura_plan.json', JSON.stringify({ filter: FILTER, ersetzen: klassen.ersetzen.map(x => x.handle), sonderfall: klassen.sonderfall.map(x => ({ handle: x.handle, grund: x.grund })), seoKurz }, null, 1));
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben. Plan: /tmp/lieferzeit_fortura_plan.json'); return; }

  const ziel = klassen.ersetzen.slice(0, LIMIT);
  let ok = 0, fehler = 0, uebersprungen = 0, i = 0;
  const einer = async a => {
    try {
      const f = (await q(FRISCH, { id: a.id })).product;
      if (!f || !f.tags.includes('ch-lager') || f.tags.includes('profil-ch-lager')) { uebersprungen++; return; }   // Marke inzwischen geändert → nicht anfassen
      const pl = planeText(f.descriptionHtml); if (pl.art !== 'ersetzen') { uebersprungen++; return; }
      const m = (await q(SCHREIBEN, { p: { id: a.id, descriptionHtml: pl.neu } })).productUpdate;
      const ist = m.product?.descriptionHtml || '';
      if (m.userErrors?.length || !ist.includes(NEU) || BEKANNT.some(a => ist.includes(a))) { fehler++; console.log('  ✗', a.handle, JSON.stringify(m.userErrors).slice(0, 160)); return; }
      appendFileSync('dropship/lieferzeit_fortura_ledger.tsv', `${new Date().toISOString()}\t${a.id}\t${a.handle}\n`);
      ok++;
    } catch (e) { fehler++; console.log('  ✗', a.handle, String(e.message).slice(0, 120)); }
  };
  await Promise.all(Array.from({ length: PARALLEL }, async () => { for (;;) { const a = ziel[i++]; if (!a) return; await einer(a); } }));
  console.log(`\nGESCHRIEBEN: ${ok} · übersprungen (inzwischen anders): ${uebersprungen} · Fehler ${fehler}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
