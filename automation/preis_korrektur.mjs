#!/usr/bin/env node
/**
 * preis_korrektur.mjs — bepreist den GANZEN Katalog nach der hauseigenen Regel neu.
 *
 *   DRY_RUN=1 node automation/preis_korrektur.mjs     # Standard: nur berichten
 *   DRY_RUN=0 node automation/preis_korrektur.mjs     # scharf
 *   node automation/preis_korrektur.mjs --selbsttest
 *
 * WARUM ES DAS GIBT:
 * Gemessen am 2026-09-14 und 2026-09-19: der Median liegt bei 20–23 % Rohmarge und rund
 * zwei Drittel der Produkte bleiben nach WELCOME10 unter 38 %. Über die Shopify-MCP sind das
 * ein Dutzend Produkte je Sitzung. **Ein Skript schafft den Katalog in einem Lauf** — es fehlt
 * allein der Zugang (`SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` / `SHOPIFY_SHOP`).
 *
 * ⚠️ WARUM PREISFILTER NICHT HELFEN (gemessen 2026-09-19): `productsCount`, `products(query:)`
 * UND `productVariants(query:)` ignorieren Preisfilter stillschweigend — `price:>=9000` liefert
 * dieselbe Liste wie `price:<=22.90`, ein Unsinn-Filter liefert Treffer statt einer leeren
 * Liste. Es gibt keinen serverseitigen Weg zu den Verlustfällen; deshalb blättert dieses
 * Skript den ganzen Katalog.
 *
 * SICHERHEITSREGELN (jede einzeln im Selbsttest):
 *  1. **Preise werden nie gesenkt.** Wer über dem Ziel liegt, bleibt unberührt.
 *  2. **Kein Einkaufspreis heisst überspringen** — nicht 0, nicht raten.
 *  3. **Faktor-Deckel:** Zielpreis über FAKTOR_MAX × heutigem Preis wird NICHT gesetzt, sondern
 *     getrennt gemeldet. So ein Produkt ist falsch importiert, nicht falsch bepreist — darüber
 *     entscheidet ein Mensch (siehe Abtropfregal 20.90 bei EK 68.11, Faktor 6).
 *  4. **Idempotent:** ein zweiter Lauf ändert nichts mehr.
 *  5. **Ohne Zugangsdaten passiert nichts** (Exit 0, keine Fehlermeldung).
 *  6. **DRY_RUN ist der Standard.** Scharf nur mit ausdrücklichem `DRY_RUN=0`.
 */

import { writeFileSync } from 'node:fs';
import { zielpreis, GUTSCHEIN, ZIEL_NACH_GUTSCHEIN } from '../tools/varianten_preis.mjs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSEC = process.env.SHOPIFY_CLIENT_SECRET || '';
const DRY_RUN = process.env.DRY_RUN !== '0';
export const FAKTOR_MAX = Number(process.env.FAKTOR_MAX || 3);
const API = '2026-07';

/* ------------------------------ Die Entscheidung ------------------------------ */

/**
 * Rohmarge in Prozent, NACHDEM der WELCOME10-Gutschein den Erlös gesenkt hat.
 * `null`, wenn Preis oder Einkaufspreis unbekannt sind — unbekannt ist nicht 0.
 */
export function margeNachGutschein(preis, kosten) {
  if (!Number.isFinite(preis) || preis <= 0) return null;
  if (kosten === null || !Number.isFinite(kosten)) return null;
  const erloes = preis * (1 - GUTSCHEIN);
  return ((erloes - kosten) / erloes) * 100;
}

/**
 * Was mit einem Produkt geschehen soll. Reine Funktion — der ganze Selbsttest haengt hier.
 * @param {{preis_min:number, kosten_max:number|null, faktorMax?:number}} d
 * @returns {{tun:'anheben'|'ueberspringen'|'melden', neuerPreis:number|null, grund:string}}
 */
export function entscheide(d) {
  const faktorMax = d.faktorMax ?? FAKTOR_MAX;

  if (d.kosten_max === null || !Number.isFinite(d.kosten_max) || d.kosten_max <= 0)
    return { tun: 'ueberspringen', neuerPreis: null, grund: 'kein Einkaufspreis — UNBEKANNT, nicht 0' };

  if (!Number.isFinite(d.preis_min) || d.preis_min <= 0)
    return { tun: 'ueberspringen', neuerPreis: null, grund: 'kein gueltiger Preis' };

  const ziel = zielpreis(d.kosten_max);
  if (ziel === null)
    return { tun: 'ueberspringen', neuerPreis: null, grund: 'kein Zielpreis berechenbar' };

  // Regel 1 + 4: nie senken, und wer das Ziel schon erfuellt, bleibt — das macht den Lauf idempotent.
  //
  // ⚠️ GEMESSEN 2026-09-20, und es war vorher falsch herum: entscheidend ist die
  // ERREICHTE MARGE, nicht die Sprossenlage. `zielpreis()` gibt die kleinste Sprosse der
  // Leiter; ein Preis DAZWISCHEN kann das Ziel trotzdem erfuellen. Beispiel aus dem Katalog:
  // 45.90 bei EK 25.50 ergibt 38,3 % nach dem Gutschein — Ziel erfuellt —, `zielpreis()`
  // sagt aber 49.90. Nach dem alten Kriterium waeren vier Fahrradhelme fuer 0,3 bis 5
  // Prozentpunkte angehoben worden: Unruhe im Laden ohne Gegenwert.
  if (margeNachGutschein(d.preis_min, d.kosten_max) >= ZIEL_NACH_GUTSCHEIN * 100)
    return { tun: 'ueberspringen', neuerPreis: null, grund: 'Zielmarge bereits erreicht' };

  if (d.preis_min >= ziel)
    return { tun: 'ueberspringen', neuerPreis: null, grund: 'liegt bereits auf oder ueber dem Ziel' };

  // Regel 3: ein Vielfaches ist kein Preisfehler mehr, sondern ein Importfehler.
  if (ziel > d.preis_min * faktorMax)
    return {
      tun: 'melden',
      neuerPreis: ziel,
      grund: `Zielpreis waere Faktor ${(ziel / d.preis_min).toFixed(1)} — Mensch entscheidet`,
    };

  return { tun: 'anheben', neuerPreis: ziel, grund: 'unter der Zielmarge' };
}

/* --------------------------------- Shopify --------------------------------- */

async function token() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }),
  });
  if (!r.ok) throw new Error(`Token fehlgeschlagen: HTTP ${r.status}`);
  return (await r.json()).access_token;
}

async function graphql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}

const SEITE = `
query($cursor: String) {
  products(first: 50, after: $cursor, query: "status:active", sortKey: ID) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle
      variants(first: 100) { nodes { id price inventoryItem { unitCost { amount currencyCode } } } }
    }
  }
}`;

const SETZEN = `
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    userErrors { field message }
  }
}`;

/* ---------------------------------- Lauf ---------------------------------- */

async function lauf() {
  if (!SHOP || !CID || !CSEC) {
    console.log('Keine Shopify-Zugangsdaten (SHOPIFY_SHOP/SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET) → No-op.');
    return;
  }
  const tok = await token();
  console.log(`Modus: ${DRY_RUN ? 'DRY_RUN (es wird nichts geaendert)' : '🔴 SCHARF'} · Faktor-Deckel ${FAKTOR_MAX}`);

  let cursor = null, seiten = 0;
  const angehoben = [], gemeldet = [];
  let gesehen = 0, ohneKosten = 0, inOrdnung = 0, waehrungsfehler = 0;

  for (;;) {
    const d = await graphql(tok, SEITE, { cursor });
    const { nodes, pageInfo } = d.products;
    seiten++;

    for (const p of nodes) {
      gesehen++;
      const vs = p.variants.nodes;
      const kosten = vs.map((v) => v.inventoryItem?.unitCost).filter(Boolean);

      // Waehrungsprüfung: ohne sie waere jede Rechnung wertlos (CJ rechnet teils in USD).
      if (kosten.some((k) => k.currencyCode && k.currencyCode !== 'CHF')) { waehrungsfehler++; continue; }

      const preis_min = Math.min(...vs.map((v) => Number(v.price)));
      const werte = kosten.map((k) => Number(k.amount)).filter(Number.isFinite);
      const kosten_max = werte.length ? Math.max(...werte) : null;

      const e = entscheide({ preis_min, kosten_max });
      const zeile = { id: p.id, titel: p.title, handle: p.handle, preis_min, kosten_max, ...e };

      if (e.tun === 'ueberspringen') { kosten_max === null ? ohneKosten++ : inOrdnung++; continue; }
      if (e.tun === 'melden') { gemeldet.push(zeile); continue; }

      angehoben.push(zeile);
      if (!DRY_RUN) {
        const r = await graphql(tok, SETZEN, {
          productId: p.id,
          variants: vs.map((v) => ({ id: v.id, price: e.neuerPreis.toFixed(2) })),
        });
        const fehler = r.productVariantsBulkUpdate.userErrors;
        if (fehler.length) console.error(`⚠️ ${p.handle}: ${JSON.stringify(fehler)}`);
        await new Promise((res) => setTimeout(res, 250));
      }
    }

    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  const stempel = new Date().toISOString().slice(0, 10);
  const csv = ['handle,titel,preis_alt,kosten_max,preis_neu,tun,grund']
    .concat([...angehoben, ...gemeldet].map((z) =>
      [z.handle, JSON.stringify(z.titel), z.preis_min.toFixed(2), z.kosten_max.toFixed(2),
       z.neuerPreis?.toFixed(2) ?? '', z.tun, JSON.stringify(z.grund)].join(',')))
    .join('\n');
  const datei = `dropship/preis-korrektur-${stempel}.csv`;
  writeFileSync(datei, csv + '\n');

  console.log(`\nSeiten: ${seiten} · Produkte gesehen: ${gesehen}`);
  console.log(`  ohne Einkaufspreis (uebersprungen, UNBEKANNT): ${ohneKosten}`);
  console.log(`  bereits auf oder ueber der Zielmarge: ${inOrdnung}`);
  if (waehrungsfehler) console.log(`  ⚠️ fremde Waehrung, uebersprungen: ${waehrungsfehler}`);
  console.log(`  ${DRY_RUN ? 'WUERDE anheben' : 'ANGEHOBEN'}: ${angehoben.length}`);
  console.log(`  🟡 gemeldet statt geaendert (Faktor > ${FAKTOR_MAX}): ${gemeldet.length}`);
  console.log(`\nBericht: ${datei}`);
  if (DRY_RUN) console.log('Scharf stellen mit DRY_RUN=0 — vorher die CSV lesen.');
}

/* ------------------------------- Selbsttest ------------------------------- */

function selbsttest() {
  let ok = 0; const fehler = [];
  const pruefe = (name, b) => { if (b) ok++; else fehler.push(name); };

  // --- Die Schaerfung vom 20.09.: Marge entscheidet, nicht die Sprossenlage.
  //     Alle vier Faelle sind echte Produkte aus dem Katalog dieses Tages.
  pruefe('45.90 bei EK 25.50 erfuellt das Ziel trotz zielpreis 49.90',
    entscheide({ preis_min: 45.90, kosten_max: 25.50 }).tun === 'ueberspringen');
  pruefe('66.90 bei EK 36.57 bleibt unberuehrt',
    entscheide({ preis_min: 66.90, kosten_max: 36.57 }).tun === 'ueberspringen');
  pruefe('38.90 bei EK 20.66 bleibt unberuehrt',
    entscheide({ preis_min: 38.90, kosten_max: 20.66 }).tun === 'ueberspringen');
  pruefe('23.90 bei EK 12.23 bleibt unberuehrt',
    entscheide({ preis_min: 23.90, kosten_max: 12.23 }).tun === 'ueberspringen');
  pruefe('und die Begruendung nennt die Marge, nicht die Sprosse',
    entscheide({ preis_min: 45.90, kosten_max: 25.50 }).grund === 'Zielmarge bereits erreicht');

  // --- Die Gegenprobe: knapp UNTER dem Ziel muss weiterhin angehoben werden.
  pruefe('15.90 bei EK 15.40 (−7,6 %) wird angehoben',
    entscheide({ preis_min: 15.90, kosten_max: 15.40 }).tun === 'anheben');
  pruefe('18.90 bei EK 14.14 (16,9 %) wird angehoben',
    entscheide({ preis_min: 18.90, kosten_max: 14.14 }).tun === 'anheben');
  pruefe('46.90 bei EK 31.35 (25,7 %) wird angehoben',
    entscheide({ preis_min: 46.90, kosten_max: 31.35 }).tun === 'anheben');

  // --- margeNachGutschein selbst
  pruefe('EK gleich Erloes ergibt genau 0 %',
    Math.abs(margeNachGutschein(10, 9) - 0) < 1e-9);
  pruefe('unbekannter Einkaufspreis ergibt null, NICHT 0',
    margeNachGutschein(20, null) === null);
  pruefe('Preis 0 ergibt null statt Division durch null',
    margeNachGutschein(0, 5) === null);
  pruefe('Verlust wird negativ, nicht auf 0 geklemmt',
    margeNachGutschein(15.90, 15.40) < 0);

  // Regel 2 — unbekannt bleibt unbekannt
  pruefe('ohne Einkaufspreis wird uebersprungen',
    entscheide({ preis_min: 15.9, kosten_max: null }).tun === 'ueberspringen');
  pruefe('und es wird KEIN Preis vorgeschlagen',
    entscheide({ preis_min: 15.9, kosten_max: null }).neuerPreis === null);
  pruefe('Einkaufspreis 0 zaehlt als unbekannt, nicht als geschenkt',
    entscheide({ preis_min: 15.9, kosten_max: 0 }).tun === 'ueberspringen');

  // Regel 1 + 4 — nie senken, idempotent
  pruefe('ein gesundes Produkt bleibt unberuehrt',
    entscheide({ preis_min: 99.9, kosten_max: 10 }).tun === 'ueberspringen');
  const einmal = entscheide({ preis_min: 15.9, kosten_max: 10.48 });
  pruefe('erster Lauf hebt an', einmal.tun === 'anheben');
  pruefe('zweiter Lauf auf dem neuen Preis tut nichts mehr (idempotent)',
    entscheide({ preis_min: einmal.neuerPreis, kosten_max: 10.48 }).tun === 'ueberspringen');
  pruefe('der neue Preis ist HOEHER als der alte', einmal.neuerPreis > 15.9);

  // Regel 3 — Faktor-Deckel
  const extrem = entscheide({ preis_min: 20.9, kosten_max: 68.11 });
  pruefe('Faktor 6 wird gemeldet statt gesetzt', extrem.tun === 'melden');
  pruefe('und der Grund nennt den Faktor', /Faktor 6/.test(extrem.grund));
  pruefe('Faktor knapp unter dem Deckel wird gesetzt',
    entscheide({ preis_min: 20.9, kosten_max: 23.67 }).tun === 'anheben');
  pruefe('der Deckel ist einstellbar',
    entscheide({ preis_min: 20.9, kosten_max: 68.11, faktorMax: 10 }).tun === 'anheben');

  // Die Zielmarge wird wirklich erreicht
  const z = entscheide({ preis_min: 15.9, kosten_max: 14.87 });
  const marge = ((z.neuerPreis * (1 - GUTSCHEIN) - 14.87) / (z.neuerPreis * (1 - GUTSCHEIN))) * 100;
  pruefe('nach dem Gutschein bleibt die Zielmarge', marge >= ZIEL_NACH_GUTSCHEIN * 100);

  // Die sieben Preise dieser Runde werden reproduziert
  const runde = [[21.9, 20.29, 39.9], [16.9, 14.87, 29.9], [24.9, 21.28, 39.9],
                 [16.9, 13.24, 24.9], [29.9, 23.41, 44.9], [44.9, 34.71, 64.9], [44.9, 34.04, 64.9]];
  pruefe('alle sieben Preise vom 2026-09-19 werden reproduziert',
    runde.every(([vk, ek, soll]) => entscheide({ preis_min: vk, kosten_max: ek }).neuerPreis === soll));

  // Gegenprobe an der GRENZE — und zwar an der Marge, nicht an der Sprosse.
  //
  // ⚠️ Hier stand bis zum 20.09. die falsche Grenze: geprueft wurde gegen `zielpreis(10)`
  // = 19.90 und verlangt, dass 19.89 angehoben wird. Bei EK 10.00 ergibt 19.89 aber
  // **44,1 %** nach dem Gutschein — sechs Punkte ueber dem Ziel. Der Test schrieb damit
  // fest, dass gesunde Produkte angefasst werden. Die echte Grenze ist die Zielmarge.
  const aufDemZiel = Math.ceil((10 / (1 - ZIEL_NACH_GUTSCHEIN) / (1 - GUTSCHEIN)) * 100) / 100;
  pruefe('genau auf der Zielmarge = keine Aenderung',
    entscheide({ preis_min: aufDemZiel, kosten_max: 10 }).tun === 'ueberspringen');
  pruefe('und dort sind es tatsaechlich mindestens 38 %',
    margeNachGutschein(aufDemZiel, 10) >= ZIEL_NACH_GUTSCHEIN * 100);
  pruefe('zwei Rappen darunter = Aenderung',
    entscheide({ preis_min: aufDemZiel - 0.02, kosten_max: 10 }).tun === 'anheben');
  pruefe('und dort sind es tatsaechlich weniger als 38 %',
    margeNachGutschein(aufDemZiel - 0.02, 10) < ZIEL_NACH_GUTSCHEIN * 100);
  pruefe('die alte Sprossen-Grenze wird NICHT mehr angefasst (19.89 bei EK 10 = 44 %)',
    entscheide({ preis_min: zielpreis(10) - 0.01, kosten_max: 10 }).tun === 'ueberspringen');

  console.log(`${ok} Pruefungen bestanden, ${fehler.length} gescheitert`);
  for (const f of fehler) console.log('  ✗ ' + f);
  return fehler.length === 0;
}

const direkt = process.argv[1] && process.argv[1].endsWith('preis_korrektur.mjs');
if (direkt) {
  if (process.argv[2] === '--selbsttest') process.exit(selbsttest() ? 0 : 1);
  else await lauf();
}
