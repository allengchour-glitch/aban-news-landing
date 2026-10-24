#!/usr/bin/env node
/**
 * Erprobte CJ-Produkte für LuxeStyle finden — der ehrliche Ersatz für „VIP-Produkte".
 *
 * WARUM NICHT DIE VIP-LISTE: CJ Prime wirbt mit einer kuratierten VIP-Liste. Die API hat sie
 * nicht. Am 24.10.2026 live gelesen (`setting/get`): 69 Endpunkte, keiner für VIP, keiner für
 * Gutscheine. Beides liegt allein in CJs Weboberfläche und ist von hier aus nicht erreichbar.
 *
 * WAS STATTDESSEN GEHT, und messbar besser ist: `/product/list` nennt je Treffer `listedNum` —
 * wie viele Läden das Produkt führen. Das ist ein Beliebtheitswert aus echten Daten statt
 * eines Etiketts. Die Auswahl trifft `automation/lib/top_kandidaten.mjs`.
 *
 * DIE ENTSCHEIDENDE PRÜFUNG KOMMT ZULETZT: `logistic/freightCalculate` CN→CH je Variante.
 * Elf von elf Erstattungen dieses Shops hiessen „nicht lieferbar"; ein erprobtes Produkt, das
 * nicht hierher kommt, wiederholt genau das. Die Länderliste des Katalogs ist eine Behauptung,
 * die Frachtabfrage eine Messung — und eine FEHLGESCHLAGENE Abfrage heisst `unbekannt`, nicht
 * `nicht lieferbar` (dieselbe Zurückhaltung wie im Lieferbarkeits-Wächter).
 *
 * DER LAUF LEGT NICHTS AN. Er schreibt einen Bericht; das Anlegen bleibt ein eigener Schritt
 * mit Preis, Übersetzung und Bildprüfung.
 *
 * Schalter:
 *   SUCHE     Komma-Liste englischer Suchwörter (Vorgabe: Themen mit gemessener Nachfrage)
 *   SEITEN    Katalogseiten je Suchwort (Vorgabe 2, je 20 Treffer)
 *   MAX       wie viele Kandidaten die Fracht geprüft bekommen (Vorgabe 15)
 *   LISTED    Mindestzahl Läden (Vorgabe 5 — gemessen, siehe top_kandidaten.mjs)
 *   MAXEK     höchster Einkauf in USD (Vorgabe 40)
 *   BERICHT   Zieldatei (Vorgabe dropship/cj-top-kandidaten.csv)
 */
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { topUrteil, topAuswahl } from './lib/top_kandidaten.mjs';
import { writeFile } from 'node:fs/promises';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1',
  SEITEN = Math.min(parseInt(process.env.SEITEN || '2', 10), 10),
  MAX = Math.min(parseInt(process.env.MAX || '15', 10), 50),
  LISTED = parseInt(process.env.LISTED || '5', 10),
  MAXEK = parseFloat(process.env.MAXEK || '40'),
  BERICHT = process.env.BERICHT || 'dropship/cj-top-kandidaten.csv',
  // Vorgabe aus gemessener Nachfrage: Rizinusöl ist das stärkste Suchthema des Shops, und die
  // Käufe kamen über konkrete Suchen nach benannten Dingen (Uhr, Ladegerät) — nicht über Mode.
  SUCHE = (process.env.SUCHE || 'castor oil,humidifier,aroma diffuser,phone charger,watch men,pet grooming')
    .split(',').map(s => s.trim()).filter(Boolean);

const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function suchen(tok, wort) {
  const out = [];
  for (let seite = 1; seite <= SEITEN; seite++) {
    const r = await cjFetch(`${BASE}/product/list?pageNum=${seite}&pageSize=20&productNameEn=${encodeURIComponent(wort)}`,
      { headers: { 'CJ-Access-Token': tok }, context: `Suche ${wort}` });
    const l = r?.data?.list || [];
    out.push(...l.map(t => ({ ...t, suchwort: wort })));
    if (l.length < 20) break;
    await schlaf(400);
  }
  return out;
}

/** Fracht CN→CH für die erste Variante. null = unbekannt, nicht „geht nicht". */
async function fracht(tok, pid) {
  let vid = null;
  try {
    const q = await cjFetch(`${BASE}/product/query?pid=${encodeURIComponent(pid)}`,
      { headers: { 'CJ-Access-Token': tok }, context: 'Variante', weicheCodes: [1602001, 1602002, 1602003] });
    vid = q?.data?.variants?.[0]?.vid || null;
  } catch { return { vid: null, linien: null }; }
  if (!vid) return { vid: null, linien: null };
  try {
    const f = await cjFetch(`${BASE}/logistic/freightCalculate`, {
      context: 'Fracht', headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' },
      init: { method: 'POST', body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid }] }) },
    });
    return { vid, linien: Array.isArray(f?.data) ? f.data.length : null };
  } catch { return { vid, linien: null }; }
}

(async () => {
  const tok = await cjToken();
  if (!tok) { console.error('Kein CJ-Token: CJ_EMAIL/CJ_API_KEY fehlen oder CJ lehnt ab. Abbruch.'); process.exit(1); }

  const treffer = [];
  for (const w of SUCHE) {
    try { const t = await suchen(tok, w); treffer.push(...t); console.log(`  ${w}: ${t.length} Treffer`); }
    catch (e) { console.error(`  ${w}: ${e.message}`); if (/CJ_QUOTA|CJ_THROTTLED/.test(e.message)) break; }
  }
  // Dasselbe Produkt steht bei mehreren Suchwörtern — und im ersten Lauf dreimal in der
  // Auswahl, was drei Frachtabfragen für dieselbe Ware kostete.
  const nachPid = new Map();
  for (const t of treffer) if (t.pid && !nachPid.has(t.pid)) nachPid.set(t.pid, t);
  const einmalig = [...nachPid.values()];
  console.log(`\nGelesen ${treffer.length} Katalogtreffer aus ${SUCHE.length} Suchwörtern, ${einmalig.length} verschiedene.`);

  const gruende = {};
  for (const t of einmalig) { const u = topUrteil(t, { listedMin: LISTED, maxEk: MAXEK }); gruende[u.grund] = (gruende[u.grund] || 0) + 1; }
  console.log('Gründe:', JSON.stringify(gruende));

  const gewaehlt = topAuswahl(einmalig, MAX, { listedMin: LISTED, maxEk: MAXEK });
  console.log(`\nFracht nach CH wird für ${gewaehlt.length} Kandidaten gemessen:`);
  const zeilen = [['suchwort', 'pid', 'name', 'laeden', 'ek_usd', 'frachtlinien', 'urteil', 'bild'].join(',')];
  let lieferbar = 0, unbekannt = 0;
  for (const { t, u } of gewaehlt) {
    const { linien } = await fracht(tok, t.pid);
    const urteil = linien === null ? 'unbekannt' : (linien > 0 ? 'lieferbar-ch' : 'keine-ch-fracht');
    if (urteil === 'lieferbar-ch') lieferbar++; if (urteil === 'unbekannt') unbekannt++;
    console.log(`  ${urteil.padEnd(15)} ${String(u.laeden).padStart(5)} Läden  $${u.preis}  ${t.productNameEn.slice(0, 60)}`);
    zeilen.push([t.suchwort, t.pid, `"${String(t.productNameEn).replace(/"/g, "'")}"`, u.laeden, u.preis,
      linien ?? '', urteil, `"${(u.lager || []).join(' ')}"`, t.productImage].join(','));
    await schlaf(400);
  }
  await writeFile(BERICHT, zeilen.join('\n') + '\n');
  console.log(`\n${lieferbar} liefern nach CH, ${unbekannt} unbekannt. Bericht: ${BERICHT}`);
  console.log('Der Lauf legt nichts an — Anlegen ist ein eigener Schritt (Preis, Übersetzung, Bildprüfung).');
})();
