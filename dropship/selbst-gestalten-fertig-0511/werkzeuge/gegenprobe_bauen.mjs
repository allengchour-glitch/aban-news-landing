#!/usr/bin/env node
// Baut aus <OUT>/auswertung.json (kosten_auswerten.mjs) die Offline-Gegenprobe preise_gegenprobe.json für preisformel_test.mjs:
// je Shop-Variante Handle, SKU, Printful-Variantennummer, heutiger Shop-Preis (CHF, inkl. MWST), Printful-Katalogpreis und -Versand (USD, STANDARD, CH 8001, 1 Stück).
// NUR RECHNEN/SCHREIBEN einer lokalen Datei. ENV: OUT=<Ordner mit auswertung.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.env.OUT || './kosten_daten';
const ziel = fileURLToPath(new URL('./preise_gegenprobe.json', import.meta.url));
const { bericht, zeilen } = JSON.parse(readFileSync(join(OUT, 'auswertung.json'), 'utf8'));
const mit = zeilen.filter((z) => z.versandUsd != null);
const daten = {
  stand: bericht.stand.slice(0, 10),
  quelle: 'Shopify Admin (Preise, Abfrage) · Printful GET /products/variant/<id> (ekKatalogUsd) · POST /shipping/rates CH 8001 STANDARD 1 Stück (versandUsd) · POST /orders/estimate-costs CH 8001 (ekSchaetzungUsd = Zwischensumme, null wo nicht schätzbar), gemessen am angegebenen Tag; nur gelesen, nichts geschrieben',
  spalten: ['handle', 'status', 'sku', 'printfulVariante', 'preisChf', 'ekKatalogUsd', 'versandUsd', 'ekSchaetzungUsd'],
  zeilen: mit.map((z) => [z.handle, z.status, z.sku, z.vid, z.preis, z.ekKatalogUsd, z.versandUsd, z.ekSchaetzungUsd]),
  ohneVersandOderKosten: bericht.varianten.shop - mit.length,
};
writeFileSync(ziel, JSON.stringify(daten) + '\n');
console.log('Gegenprobe:', mit.length, 'Zeilen →', ziel);
