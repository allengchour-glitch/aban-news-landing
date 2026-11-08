#!/usr/bin/env node
/**
 * Read-only Probe fuer page_view/view_item auf einer LuxeStyle-Produktseite.
 *
 * Lauf:
 *   node automation/tracking_contract_probe.mjs [Produkt-URL] [--json]
 *
 * Exit 0 = statisches Routing erfuellt, 1 = belegter Vertragsfehler, 2 = unbekannt.
 */
import { pathToFileURL } from 'node:url';
import {
  exitCodeFuer,
  produktseitePruefen,
  STANDARD_ZIELE,
} from './lib/tracking_contract.mjs';

const STANDARD_URL = 'https://luxestyle.ch/products/unisex-t-shirt-selbst-gestalten';

function csv(wert, fallback) {
  const teile = String(wert || '').split(',').map(teil => teil.trim()).filter(Boolean);
  return teile.length ? teile : fallback;
}

function argumente(argv) {
  const json = argv.includes('--json');
  const url = argv.find(arg => !arg.startsWith('--')) || process.env.TRACKING_PRODUCT_URL || STANDARD_URL;
  return { json, url };
}

function zeile(name, befund) {
  if (!befund) return `${name}: UNKNOWN — kein Befund`;
  return `${name}: ${befund.status} — ${befund.grund}`;
}

function textBericht(ergebnis) {
  const ausgabe = [
    `Statische Routing-Konfiguration: ${ergebnis.statischeKonfiguration.status}`,
    `Gesamtbeobachtung: ${ergebnis.status}`,
    zeile('Quelle', ergebnis.quelle),
    zeile('Produktseite', ergebnis.produktseite),
  ];

  if (ergebnis.tracking) {
    ausgabe.push(zeile('Google-Pixel', ergebnis.tracking.googlePixel));
    ausgabe.push(zeile('Direktes GA4-Ziel konfiguriert', ergebnis.tracking.konfiguriert?.ga));
    ausgabe.push(zeile('Google Tag konfiguriert', ergebnis.tracking.konfiguriert?.gt));
    ausgabe.push(zeile('Custom Pixel', ergebnis.tracking.customPixel));
    for (const typ of ['page_view', 'view_item']) {
      const ereignis = ergebnis.tracking.routing?.ereignisse?.[typ];
      ausgabe.push(`${typ}: ${ereignis?.status || 'UNKNOWN'}`);
      ausgabe.push(`  ${zeile('GA4', ereignis?.kanaele?.ga)}`);
      ausgabe.push(`  ${zeile('Google Ads', ereignis?.kanaele?.aw)}`);
      ausgabe.push(`  ${zeile('Merchant Center', ereignis?.kanaele?.mc)}`);
    }
  }
  ausgabe.push(zeile('Consent', ergebnis.consent));
  ausgabe.push(zeile('Tatsaechliche Auslieferung', ergebnis.tracking?.auslieferung));
  ausgabe.push(`Messweg: ${ergebnis.request.methode}, ${ergebnis.request.anfragen} Anfrage(n), keine Mutation`);
  return ausgabe.join('\n');
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = argumente(argv);
  const ergebnis = await produktseitePruefen({
    url: args.url,
    apiClientId: Number(env.TRACKING_GOOGLE_API_CLIENT_ID || STANDARD_ZIELE.apiClientId),
    ga: csv(env.TRACKING_GA_TARGETS, [...STANDARD_ZIELE.ga]),
    gt: env.TRACKING_GT_TARGET || STANDARD_ZIELE.gt,
    aw: env.TRACKING_AW_TARGET || STANDARD_ZIELE.aw,
    mc: env.TRACKING_MC_TARGET || STANDARD_ZIELE.mc,
  });
  console.log(args.json ? JSON.stringify(ergebnis, null, 2) : textBericht(ergebnis));
  return exitCodeFuer(ergebnis);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
