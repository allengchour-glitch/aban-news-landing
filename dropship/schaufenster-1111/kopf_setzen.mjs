#!/usr/bin/env node
/**
 * Kopf-Fotos (Collection-Metafeld luxe.kopf_produkte, list.product_reference) aus der Pin-Datei setzen (Weihnachts-Schaufenster).
 * Das Theme-Snippet lx-kopf-kompakt zeigt zuerst dieses Metafeld, dann die ersten 24 Produkte der Sammlung (nur lieferbare mit Hauptbild ab 500 px,
 * höchstens 4 Fotos, nur Desktop). Weniger als 4 Einträge sind darum erlaubt: den Rest füllt die Sammlung.
 *
 * Ziele: alle Kategorien mit modus «kopf» (Sortierung bleibt). HANDLES=a,b wählt aus (auch Kategorien mit modus «reihenfolge», z. B. wenn dort ein
 * altes Metafeld vor den Pins steht: heute weihnachten-2026 und geschenke-fuer-ihn). MIT_REIHENFOLGE=1: alle Kategorien beider Modi.
 *
 * TROCKENLAUF IST VORGABE. LIVE=1 schreibt; vorher Sicherung des alten Werts (SICHERUNG, Vorgabe dropship/schaufenster-1111/kopf-sicherung.json,
 * nur der ERSTE alte Wert je Kategorie wird gesichert), danach frisch zurücklesen.
 * ZURUECK=1 [LIVE=1]: alte Werte aus der Sicherung zurück (war vorher keiner gesetzt: Metafeld löschen), danach zurücklesen. Exit 1 bei jeder Abweichung.
 * Aufruf aus dem Repo-Wurzelordner: node dropship/schaufenster-1111/kopf_setzen.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ladePins, PIN_STANDARD } from '../../automation/lib/schaufenster_pins.mjs';
import { verbinden } from './shop.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const SICHERUNG = process.env.SICHERUNG || 'dropship/schaufenster-1111/kopf-sicherung.json';
const nurHandles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
const q = await verbinden();
const lese = async h => (await q(`query($h:String!){collectionByHandle(handle:$h){id sortOrder metafield(namespace:"luxe",key:"kopf_produkte"){id type value}}}`, { h })).collectionByHandle;
let fehler = 0;

if (ZURUECK) {
  if (!existsSync(SICHERUNG)) { console.error(`keine Sicherung ${SICHERUNG}`); process.exit(1); }
  const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  for (const [h, alt] of Object.entries(s)) {
    if (nurHandles.length && !nurHandles.includes(h)) continue;
    const c = await lese(h); if (!c) { console.log(`${h}: Collection fehlt`); fehler++; continue; }
    const jetzt = c.metafield?.value ?? null;
    if (jetzt === (alt.value ?? null)) { console.log(`${h}: steht schon auf dem gesicherten Wert`); continue; }
    if (!LIVE) { console.log(`${h}: würde zurück auf ${alt.value ?? '(leer, Metafeld löschen)'} [Trockenlauf]`); continue; }
    const u = alt.value == null
      ? (await q(`mutation($m:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$m){userErrors{message}}}`, { m: [{ ownerId: c.id, namespace: 'luxe', key: 'kopf_produkte' }] })).metafieldsDelete
      : (await q(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}`, { m: [{ ownerId: c.id, namespace: 'luxe', key: 'kopf_produkte', type: 'list.product_reference', value: alt.value }] })).metafieldsSet;
    if (u.userErrors.length) { console.log(`${h}: ✗ ${JSON.stringify(u.userErrors)}`); fehler++; continue; }
    const nach = (await lese(h)).metafield?.value ?? null;
    if (nach === (alt.value ?? null)) console.log(`${h}: ✓ zurück, zurückgelesen gleich der Sicherung`); else { console.log(`${h}: ✗ zurückgelesen ${nach}`); fehler++; }
  }
  if (fehler) process.exitCode = 1;
} else {
  const P = ladePins(process.env.PINS || PIN_STANDARD);
  if (P.fehlt || P.fehler.length) { console.error(`Pin-Datei ${P.pfad} fehlt oder fehlerhaft: ${P.fehler.join('; ')}`); process.exit(1); }
  const alle = new Map([...P.kopf, ...P.reihenfolge]);
  const ziele = nurHandles.length ? new Map(nurHandles.map(h => [h, alle.get(h)]))
    : new Map([...P.kopf, ...(process.env.MIT_REIHENFOLGE === '1' ? P.reihenfolge : [])]);
  const sicherung = existsSync(SICHERUNG) ? JSON.parse(readFileSync(SICHERUNG, 'utf8')) : {};
  for (const [h, ids] of ziele) {
    if (!ids) { console.log(`${h}: steht nicht in der Pin-Datei`); fehler++; continue; }
    const c = await lese(h); if (!c) { console.log(`${h}: Collection fehlt`); fehler++; continue; }
    const neu = JSON.stringify(ids), alt = c.metafield?.value ?? null;
    if (alt === neu) { console.log(`${h}: schon gesetzt`); continue; }
    console.log(`${h} (${c.sortOrder}): ${alt ?? '(leer)'} → ${neu}${LIVE ? '' : ' [Trockenlauf]'}`);
    if (!LIVE) continue;
    if (!(h in sicherung)) { sicherung[h] = { value: alt, gesichert: new Date().toISOString() }; writeFileSync(SICHERUNG, JSON.stringify(sicherung, null, 1) + '\n'); }
    const u = (await q(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}`, { m: [{ ownerId: c.id, namespace: 'luxe', key: 'kopf_produkte', type: 'list.product_reference', value: neu }] })).metafieldsSet;
    if (u.userErrors.length) { console.log(`   ✗ ${JSON.stringify(u.userErrors)}`); fehler++; continue; }
    const nach = (await lese(h)).metafield?.value;
    if (nach === neu) console.log('   ✓ zurückgelesen gleich'); else { console.log(`   ✗ zurückgelesen: ${nach}`); fehler++; }
  }
  if (fehler) process.exitCode = 1;
}
