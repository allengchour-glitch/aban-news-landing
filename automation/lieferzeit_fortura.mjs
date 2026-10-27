#!/usr/bin/env node
/**
 * Falsche Lieferzeit «Lieferung in nur 1–2 Werktagen (DPD)» auf Fortura-Produkten ausserhalb des Versandprofils «CH-Lager».
 *
 * BEFUND (27.10.2026, gemessen): 734 aktive Produkte (Tag `ch-lager`, OHNE `profil-ch-lager`) tragen im Textblock «Warum bei LuxeStyle kaufen?»
 * den alten Importer-Satz «Versand aus der Schweiz – Lieferung in nur 1–2 Werktagen (DPD)». Dieselbe Seite zeigt beim Kaufen-Knopf
 * «Lieferung voraussichtlich 11. Nov. – 25. Nov.» (Produktseite und Kasse rechnen für Ware ausserhalb des Profils 7–17 Tage Transit),
 * und der Satz steht auch in der strukturierten Beschreibung (JSON-LD `description`), die Google liest (der Block selbst ist auf der Seite ausgeblendet).
 * Der Wächter der anderen Sitzung (kassen_lieferdatum_wache.py, `zusage_produkte`) schreibt NUR Produkte mit `profil-ch-lager` um, und dort
 * «meist in 2–3 Werktagen» — für diese 734 wäre auch das falsch. Darum hier eine Zeile OHNE Zahl, die auf den Lieferzeitraum verweist, den die Seite
 * und die Kasse selbst nennen. Wandert ein Produkt später ins Profil, bleibt die Zeile wahr.
 *
 * GRENZE (Prüfung 27.10.): behoben wird der PRODUKTTEXT. Auf denselben Seiten stehen weiter, mit «meist/Richtwerte» abgesichert, «ab Schweizer Lager
 * meist 2–3 Werktage» (Akkordeon in templates/product.json, FAQ-Assistent, Versand-Seiten, Kollektion blitzversand-schweiz). Die wahre Heilung ist die
 * Profilzuordnung (ch_lager_profil.py, Stufe 3, Entscheid der anderen Sitzung) — bis dahin ist der Widerspruch Seite/Kaufen-Knopf OFFEN, nicht erledigt.
 *
 * Schreibt NUR diesen einen Satz (exakte Zeichenkette, genau einmal); alles andere am Text soll Byte für Byte gleich bleiben (das Zurücklesen vergleicht es).
 * Ersetzt werden zwei bekannte Sätze: der alte Importer-Satz «1–2 Werktagen (DPD)» («A», 734 Produkte) und der neue «meist in 2–3 Werktagen bei dir»
 * («P», 13 neuere Artikel ausserhalb des Profils). Produkte MIT `profil-ch-lager` fasst das Werkzeug nie an.
 * Findet ein Text noch eine andere Kurz-Zusage, einen zweiten Treffer oder einen abweichenden Wortlaut, wird NICHTS geschrieben und der Fall gemeldet.
 *
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Vor jedem Schreiben wird das Produkt frisch gelesen (Tags, Status, Text), nach dem Schreiben die Antwort
 * mit dem Plan verglichen. Shopify kennt kein Vergleichen-und-Setzen: ein fremder Schreiber im selben Millisekundenfenster würde überschrieben.
 * Darum: nicht im Auswahl-Nachtlauf (ca. 00:53–06:08 UTC) laufen lassen, PARALLEL klein halten, danach mit dem Trockenlauf gegenprüfen.
 * Schalter: LIVE=1 · LIMIT=n (höchstens n schreiben; ZUERST LIMIT=3 und die Texte vergleichen) · STATUS=active|draft (Vorgabe active) · PARALLEL=1..6 (Vorgabe 2)
 * Ledger: dropship/lieferzeit_fortura_ledger.tsv (Zeit, Produkt-ID, Handle, alt=A|P). Alt- und Neu-Satz stehen unten als ALT/ALT_PROFIL/NEU.
 * Rückweg (nur wenn je nötig): NEU durch ALT (alt=A) bzw. ALT_PROFIL (alt=P) ersetzen — absichtlich nicht automatisiert, er würde die falsche Zusage zurückbringen.
 * Nach neuen Fortura-Importen oder einer Änderung der Profil-Stufe wieder laufen lassen (Trockenlauf zeigt «zu ersetzen»); ein Produkt, das das Profil
 * verlässt, behält sonst «meist in 2–3 Werktagen».
 */
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';

export const ALT = '<strong>Versand aus der Schweiz</strong> – Lieferung in nur 1–2 Werktagen (DPD)';
// Der Satz, den die Fortura-Importer seit 13.10.2026 schreiben (stimmt nur für Ware IM Profil «CH-Lager»; 13 neuere Artikel ausserhalb tragen ihn trotzdem)
export const ALT_PROFIL = '<strong>Versand ab Schweizer Lager</strong> mit DPD, meist in 2–3 Werktagen bei dir';
export const NEU = '<strong>Versand ab Schweizer Lager</strong> mit DPD – der voraussichtliche Lieferzeitraum steht beim Artikel und in der Kasse';
const BEKANNT = [{ satz: ALT, kennung: 'A' }, { satz: ALT_PROFIL, kennung: 'P' }];

// Jede andere Kurz-Zusage («1–2 Werktage», «in 1–2 Tagen», «ein bis zwei Werktage», «1—2 Arbeitstage», «1 to 2 days», «1-2 working days») blockiert das Schreiben.
const STRICH = '(?:–|—|‑|−|-|&ndash;|&mdash;|&#8211;|&#8212;|&#x2013;|&#x2014;|\\bto\\b|bis)';
const KURZ = new RegExp(
  `(?<![\\d.,])1\\s*${STRICH}\\s*2\\s*(?:Werk|Arbeits)?tag` +
  `|ein\\s+bis\\s+zwei\\s+(?:Werk|Arbeits)?tag` +
  `|(?<![\\d.,])1\\s*${STRICH}\\s*2\\s*(?:business\\s+|working\\s+)?(?:days|jours)`, 'i');
const ORT = /Versand aus der Schweiz/;
// Der Importer-Satz in unbekannter Form (z. B. mit geschütztem Leerzeichen oder anderer Zahl) wird gemeldet, nicht still als «sauber» durchgelassen
const MEIST = /meist\s+in\s+\d+\s*(?:–|—|-)\s*\d+\s+Werktag/i;

/** Reiner Plan für EINEN Produkttext → { art: 'ersetzen', neu, alt: 'A'|'P' } | { art: 'sauber' } | { art: 'sonderfall', grund }. Getestet in lieferzeit_fortura_test.mjs.
 *  Nur für Ware OHNE Marke `profil-ch-lager` aufrufen — im Profil stimmt «meist in 2–3 Werktagen» (die Kasse rechnet dort 2–3). */
export function planeText(html) {
  const t = String(html ?? '');
  const treffer = BEKANNT.filter(b => t.includes(b.satz));
  const n = BEKANNT.reduce((s, b) => s + t.split(b.satz).length - 1, 0);
  if (n === 0) {
    if (KURZ.test(t)) return { art: 'sonderfall', grund: 'andere Kurz-Zusage' };
    if (ORT.test(t)) return { art: 'sonderfall', grund: 'abweichender Wortlaut «Versand aus der Schweiz»' };
    if (MEIST.test(t)) return { art: 'sonderfall', grund: 'Satz «meist in N–M Werktagen» in unbekannter Form' };
    return { art: 'sauber' };
  }
  if (n > 1) return { art: 'sonderfall', grund: `${n}× ein bekannter Satz` };
  const neu = t.replace(treffer[0].satz, () => NEU);   // Funktion: «$» im Ersatz darf nicht als Muster gelten
  if (KURZ.test(neu) || ORT.test(neu) || MEIST.test(neu)) return { art: 'sonderfall', grund: 'weitere Zusage im Text' };
  return { art: 'ersetzen', neu, alt: treffer[0].kennung };
}

const LESEN = `query($a:String,$q:String!){products(first:100,after:$a,query:$q){pageInfo{hasNextPage endCursor} nodes{id handle status tags descriptionHtml seo{description}}}}`;
const FRISCH = `query($id:ID!){product(id:$id){id handle status tags descriptionHtml}}`;
const SCHREIBEN = `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id descriptionHtml} userErrors{field message}}}`;
const LEDGER = join(dirname(fileURLToPath(import.meta.url)), '..', 'dropship', 'lieferzeit_fortura_ledger.tsv');   // unabhängig vom Arbeitsverzeichnis
const MAX_FOLGE_FEHLER = 10;

async function main() {
  const LIVE = process.env.LIVE === '1', LIMIT = Number(process.env.LIMIT || 1e9), PARALLEL = Number(process.env.PARALLEL || 2);
  const STATUS = (process.env.STATUS || 'active').toLowerCase();
  if (!['active', 'draft'].includes(STATUS)) { console.error('STATUS muss active oder draft sein'); process.exit(1); }
  if (!Number.isInteger(PARALLEL) || PARALLEL < 1 || PARALLEL > 6) { console.error('PARALLEL muss eine ganze Zahl von 1 bis 6 sein'); process.exit(1); }
  if (!(LIMIT >= 1)) { console.error('LIMIT muss eine Zahl ab 1 sein'); process.exit(1); }
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
    if (!p.tags.includes('ch-lager') || p.tags.includes('profil-ch-lager') || String(p.status).toLowerCase() !== STATUS) {
      klassen.sonderfall.push({ ...p, grund: 'Tags/Status passen nicht zum Filter' }); continue;
    }
    const pl = planeText(p.descriptionHtml);
    klassen[pl.art].push({ id: p.id, handle: p.handle, grund: pl.grund, alt: pl.alt });
    if (KURZ.test(p.seo?.description || '')) seoKurz.push(p.handle);
  }
  const nachAlt = k => klassen.ersetzen.filter(x => x.alt === k).length;
  console.log(`Filter «${FILTER}»: ${alle.length} Produkte gelesen`);
  console.log(`  zu ersetzen: ${klassen.ersetzen.length} (alt 1–2: ${nachAlt('A')}, alt 2–3: ${nachAlt('P')}) · schon sauber: ${klassen.sauber.length} · Sonderfälle (nichts geschrieben): ${klassen.sonderfall.length} · SEO-Beschreibung mit Kurz-Zusage: ${seoKurz.length}`);
  for (const s of klassen.sonderfall.slice(0, 15)) console.log(`  ⚠ ${s.handle} — ${s.grund}`);
  for (const h of seoKurz.slice(0, 10)) console.log(`  ⚠ SEO-Beschreibung: ${h}`);
  writeFileSync('/tmp/lieferzeit_fortura_plan.json', JSON.stringify({ filter: FILTER, ersetzen: klassen.ersetzen.map(x => ({ handle: x.handle, alt: x.alt })), sonderfall: klassen.sonderfall.map(x => ({ handle: x.handle, grund: x.grund })), seoKurz }, null, 1));
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben. Plan: /tmp/lieferzeit_fortura_plan.json'); return; }

  const ziel = klassen.ersetzen.slice(0, LIMIT);
  if (!existsSync(LEDGER)) appendFileSync(LEDGER, 'zeit\tid\thandle\talt\n');
  let ok = 0, fehler = 0, uebersprungen = 0, abweichung = 0, ledgerFehler = 0, folge = 0, i = 0, abbruch = false;
  const abw = [];
  const einer = async a => {
    try {
      const f = (await q(FRISCH, { id: a.id })).product;
      if (!f || !f.tags.includes('ch-lager') || f.tags.includes('profil-ch-lager') || String(f.status).toLowerCase() !== STATUS) { uebersprungen++; return; }   // Marke/Status inzwischen geändert → nicht anfassen
      const pl = planeText(f.descriptionHtml); if (pl.art !== 'ersetzen') { uebersprungen++; return; }
      const m = (await q(SCHREIBEN, { p: { id: a.id, descriptionHtml: pl.neu } })).productUpdate;
      const ist = m.product?.descriptionHtml || '';
      if (m.userErrors?.length || !ist.includes(NEU) || BEKANNT.some(b => ist.includes(b.satz))) {
        fehler++; folge++; console.log('  ✗', a.handle, JSON.stringify(m.userErrors).slice(0, 160)); return;
      }
      folge = 0; ok++;
      if (ist !== pl.neu) { abweichung++; if (abw.length < 3) abw.push(a.handle); }   // Shopify hat beim Speichern mehr als den einen Satz verändert
      try { appendFileSync(LEDGER, `${new Date().toISOString()}\t${a.id}\t${a.handle}\t${pl.alt}\n`); }
      catch (e) { ledgerFehler++; console.log('  ✗ Ledger', a.handle, String(e.message).slice(0, 100)); }
    } catch (e) { fehler++; folge++; console.log('  ✗', a.handle, String(e.message).slice(0, 120)); }
  };
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (;;) {
      if (abbruch) return;
      if (folge >= MAX_FOLGE_FEHLER) { abbruch = true; console.log(`\n⛔ ${MAX_FOLGE_FEHLER} Fehler in Folge — Lauf abgebrochen, nichts weiter geschrieben.`); return; }
      const a = ziel[i++]; if (!a) return;
      await einer(a);
    }
  }));
  console.log(`\nGESCHRIEBEN: ${ok} · übersprungen (inzwischen anders): ${uebersprungen} · Fehler ${fehler}${ledgerFehler ? ` · Ledger-Fehler ${ledgerFehler}` : ''}`);
  if (abweichung) console.log(`⚠ ${abweichung} Texte kamen von Shopify NICHT exakt wie geplant zurück (mehr als der eine Satz verändert) — Beispiele: ${abw.join(', ')}. Vor dem nächsten Schritt Text vergleichen.`);
  if (fehler || abbruch || ledgerFehler) process.exitCode = 1;
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
