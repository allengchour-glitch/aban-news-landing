import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { baueZiel, DATEIEN, MD5_NACH, MD5_VOR } from './patch.mjs';

const HIER = new URL('.', import.meta.url);
const OUT = process.env.OUT_DIR || '';
const QUELLEN = Object.freeze({
  [DATEIEN.meta]: 'sicherung/snippets__meta-tags.liquid.vor',
  [DATEIEN.startseite]: 'sicherung/sections__luxe-edit-home.liquid.vor',
});

const identitaet = Object.freeze({
  shop: { myshopifyDomain: 'au3j0y-hq.myshopify.com', domain: 'luxestyle.ch', currency: 'CHF' },
  theme: { id: 'gid://shopify/OnlineStoreTheme/213013037447', name: 'LuxeStyle – Schrift und Banner 02.11.2026', role: 'MAIN' },
});

const ziele = Object.values(DATEIEN).map((filename) => {
  const vorher = readFileSync(new URL(QUELLEN[filename], HIER), 'utf8');
  return baueZiel(filename, vorher, MD5_VOR[filename]);
});

const plan = {
  schemaVersion: 1,
  mode: 'offline-plan',
  status: 'GEPLANT_NICHT_LIVE_GEPRUEFT_NICHT_GESCHRIEBEN',
  evidenceDate: '2026-11-08',
  identityAtEvidenceRead: identitaet,
  files: ziele.map((z) => ({ filename: z.filename, beforeMd5: z.vorherMd5, afterMd5: z.nachherMd5 })),
  previewGate: {
    required: true,
    satisfied: false,
    checks: [
      'Liquid ohne Fehler gegen unveröffentlichte Theme-Kopie rendern',
      'DE- und FR-HTML mit richtiger Startseitenbeschreibung prüfen',
      'Canonical und Titel unverändert prüfen',
      'Dynamische Produktbild-Alttexte und dekorative Bilder prüfen',
      'Desktop und Mobil auf Layout- oder Liquid-Fehler prüfen',
    ],
  },
  limitations: [
    'Dieser Offline-Plan liest Shopify nicht frisch.',
    'Dieser Offline-Plan enthält keine Netzwerkabfrage, Mutation, Zugangsdaten oder Ausführungsroute für MAIN.',
    'Ein späterer MAIN-Write braucht einen neuen Live-Identitäts-/Hash-Read und einen separat geprüften Weg.',
  ],
};

for (const z of ziele) {
  if (z.nachherMd5 !== MD5_NACH[z.filename]) throw new Error(`${z.filename}: Zielhash abweichend.`);
  console.log(`${z.filename} ${z.vorherMd5} -> ${z.nachherMd5}`);
}

if (OUT) {
  mkdirSync(`${OUT}/vorher`, { recursive: true });
  mkdirSync(`${OUT}/nachher`, { recursive: true });
  for (const z of ziele) {
    const name = z.filename.replaceAll('/', '__');
    writeFileSync(`${OUT}/vorher/${name}`, z.vorher);
    writeFileSync(`${OUT}/nachher/${name}`, z.nachher);
  }
  writeFileSync(`${OUT}/plan.json`, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(JSON.stringify(plan, null, 2));
