#!/usr/bin/env node
/**
 * produkt_qualitaet.mjs — zaehlt konkrete, behebbare Defekte an Live-Produkten.
 *
 *   node tools/produkt_qualitaet.mjs <dump.json> [<dump2.json> …]
 *   node tools/produkt_qualitaet.mjs --selbsttest
 *
 * Eingabe: eine Shopify-GraphQL-Antwort mit `data.products.edges[].node` und den Feldern
 *   id, title, seo{title,description}, media(first:n){alt,status},
 *   variants(first:n){sku,title,inventoryItem{measurement{weight{value}}}}
 *
 * WARUM ein Messgeraet: "Produkte optimieren" ist ohne Zahl nicht entscheidbar. Gezaehlt wird
 * nur, was dem Kunden wirklich schadet — und ausdruecklich NICHT, was bloss anders aussieht.
 *
 * BEWUSST KEIN DEFEKT (sonst zaehlt das Geraet Absicht als Fehler):
 *   - "Default Title" bei EINvariantigen Produkten. Shopify zeigt dort keinen Variantenwaehler,
 *     der Kunde sieht den Text nie. Nur bei mehreren Varianten waere er sichtbar.
 *   - fehlendes Gewicht bei Produkten ohne Variante (nichts zu wiegen).
 *   - englische Farbnamen, die im Deutschen ueblich sind (Beige, Pink, Blau …).
 */
import fs from 'node:fs';

/** Rohe Lieferantensprache, die im Variantenwaehler sichtbar wird. */
const ROH = [
  /\b(Violent|Robber|Bear|Random|Style|Color|Colour|Size|Pieces?|Set of|As Picture|As shown)\b/i,
  /-\d{2,4}\s?mm-/i,                    // "…-213mm-…" = Lieferanten-Kennung
  /\b(Wooden Handle|Stainless|Plastic|Alloy)\b/i,
  /^(.{4,}?)\s*-\s*\1/i,                 // derselbe Text zweimal, mit Bindestrich getrennt
];
/** Groessen-Codes, die es nicht gibt. 2XL bis 5XL sind normale Konfektionsgroessen und
 *  ausdruecklich KEIN Defekt — 2026-09-12 korrigiert, vorher zaehlte die Regel 48 statt 2. */
const FALSCHE_GROESSE = /\b[01]XL\b/;
/** Marketing-Fuellung im Titel statt Produktinformation. */
const HYPE_TITEL = [/!/, /\bfür Sie\b/i, /\bAngenehme?s?\b/i, /\bperfekt/i, /\bideal für Sie\b/i];

export function pruefe(node) {
  const befunde = [];
  // Ein Feld, das die Abfrage nicht angefordert hat, ist UNBEKANNT — nicht leer.
  // Ohne diese Unterscheidung meldete das Geraet 100 % "ohne_seo" fuer einen Auszug,
  // der seo gar nicht enthielt (2026-09-12 aufgefallen und behoben).
  const hat = (feld) => Object.prototype.hasOwnProperty.call(node, feld);

  if (hat('seo')) {
    const seo = node.seo || {};
    if (!seo.title && !seo.description) befunde.push('ohne_seo');
  }

  const media = hat('media') ? (node.media?.edges || []).map(e => e.node) : null;
  if (media === null) { /* nicht abgefragt */ }
  else if (media.length === 0) befunde.push('ohne_bild');
  else {
    if (!media.some(m => m.alt && m.alt.trim())) befunde.push('ohne_alt_text');
    if (media.some(m => m.status && m.status !== 'READY')) befunde.push('bild_nicht_ready');
  }

  const vs = hat('variants') ? (node.variants?.edges || []).map(e => e.node) : [];
  if (vs.length) {
    // Gewicht und SKU nur pruefen, wenn die Abfrage sie ueberhaupt geholt hat.
    if ('inventoryItem' in vs[0]) {
      const w = vs[0].inventoryItem?.measurement?.weight?.value;
      // HINWEIS: im LuxeStyle-Shop haengen ALLE Versandregeln am Warenwert (TOTAL_PRICE),
      // nicht am Gewicht (gemessen 2026-09-12 am Lieferprofil). Ein fehlendes Gewicht
      // schadet dem Kunden dort also NICHT — darum nur informativ.
      if (!w) befunde.push('ohne_gewicht_nur_info');
    }
    if ('sku' in vs[0] && (!vs[0].sku || !String(vs[0].sku).trim())) befunde.push('ohne_sku');
  }
  // Varianten-Texte zaehlen nur, wenn der Kunde sie ueberhaupt sieht (mehr als eine Variante)
  if (vs.length > 1) {
    for (const v of vs) {
      const t = v.title || '';
      if (ROH.some(re => re.test(t))) { befunde.push('rohe_variante'); break; }
    }
    for (const v of vs) {
      if (FALSCHE_GROESSE.test(v.title || '')) { befunde.push('falsche_groesse'); break; }
    }
  }

  if (hat('title')) {
    if (HYPE_TITEL.some(re => re.test(node.title || ''))) befunde.push('hype_titel');
    if ((node.title || '').length < 12) befunde.push('titel_zu_kurz');
  }

  return befunde;
}

export function auswerten(knoten) {
  const zaehler = {};
  const beispiele = {};
  for (const n of knoten) {
    for (const b of new Set(pruefe(n))) {
      zaehler[b] = (zaehler[b] || 0) + 1;
      (beispiele[b] ||= []).push(n.title);
    }
  }
  return { gesamt: knoten.length, zaehler, beispiele };
}

function laden(pfade) {
  const out = [];
  for (const p of pfade) {
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const ed = d?.data?.products?.edges || [];
    for (const e of ed) out.push(e.node);
  }
  return out;
}

function bericht(r) {
  console.log(`\n${r.gesamt} Produkte geprueft\n`);
  const zeilen = Object.entries(r.zaehler).sort((a, b) => b[1] - a[1]);
  if (!zeilen.length) { console.log('  keine Befunde'); return; }
  console.log(`  ${'Defekt'.padEnd(20)} ${'Anzahl'.padStart(6)} ${'Anteil'.padStart(7)}  Beispiel`);
  console.log('  ' + '-'.repeat(96));
  for (const [k, v] of zeilen) {
    const q = ((v / r.gesamt) * 100).toFixed(1) + ' %';
    const bsp = (r.beispiele[k][0] || '').slice(0, 46);
    console.log(`  ${k.padEnd(20)} ${String(v).padStart(6)} ${q.padStart(7)}  ${bsp}`);
  }
}

function selbsttest() {
  console.log('Selbsttest produkt_qualitaet.mjs\n' + '-'.repeat(52));
  let fehler = 0;
  const mk = (o = {}) => ({
    title: 'Leinenhemd mit Rundhals',
    seo: { title: 'T', description: 'D' },
    media: { edges: [{ node: { alt: 'Ein Leinenhemd', status: 'READY' } }] },
    variants: { edges: [{ node: { sku: 'CJ-1', title: 'Schwarz / S',
      inventoryItem: { measurement: { weight: { value: 200 } } } } }] },
    ...o,
  });

  const pruefung = [
    ['sauberes Produkt hat 0 Befunde', mk(), []],
    ['fehlendes SEO', mk({ seo: {} }), ['ohne_seo']],
    ['fehlender Alt-Text', mk({ media: { edges: [{ node: { alt: '', status: 'READY' } }] } }), ['ohne_alt_text']],
    ['Bild nicht READY', mk({ media: { edges: [{ node: { alt: 'x', status: 'FAILED' } }] } }), ['bild_nicht_ready']],
    ['kein Bild', mk({ media: { edges: [] } }), ['ohne_bild']],
    ['fehlendes Gewicht ist nur Hinweis', mk({ variants: { edges: [{ node: { sku: 'CJ-1', title: 'A',
        inventoryItem: { measurement: {} } } }] } }), ['ohne_gewicht_nur_info']],
    ['fehlende SKU', mk({ variants: { edges: [{ node: { sku: null, title: 'A',
        inventoryItem: { measurement: { weight: { value: 1 } } } } }] } }), ['ohne_sku']],
    ['Hype im Titel', mk({ title: 'Kompakte Kuehlung: Angenehme Frische für Sie!' }), ['hype_titel']],
  ];
  for (const [name, node, erwartet] of pruefung) {
    const ist = [...new Set(pruefe(node))].sort();
    const soll = [...erwartet].sort();
    const ok = JSON.stringify(ist) === JSON.stringify(soll);
    console.log(`  ${ok ? 'OK ' : 'FEHLER'} ${name}: [${ist.join(', ')}] (erwartet [${soll.join(', ')}])`);
    fehler += ok ? 0 : 1;
  }

  // Gegenprobe: die bewusst NICHT gezaehlten Faelle duerfen NICHT ausschlagen
  const einVariante = mk({ variants: { edges: [{ node: { sku: 'CJ-1', title: 'Default Title',
    inventoryItem: { measurement: { weight: { value: 200 } } } } }] } });
  const okA = pruefe(einVariante).length === 0;
  console.log(`  ${okA ? 'OK ' : 'FEHLER'} Gegenprobe: "Default Title" bei EINER Variante ist kein Defekt`);
  fehler += okA ? 0 : 1;

  const mehrere = mk({ variants: { edges: [
    { node: { sku: 'CJ-1', title: 'Violent Robber Bear / S', inventoryItem: { measurement: { weight: { value: 1 } } } } },
    { node: { sku: 'CJ-2', title: 'Pink / 0XL', inventoryItem: { measurement: { weight: { value: 1 } } } } },
  ] } });
  const b = [...new Set(pruefe(mehrere))].sort();
  const okB = JSON.stringify(b) === JSON.stringify(['falsche_groesse', 'rohe_variante']);
  console.log(`  ${okB ? 'OK ' : 'FEHLER'} rohe Variante UND falsche Groesse bei MEHREREN Varianten: [${b.join(', ')}]`);
  fehler += okB ? 0 : 1;

  // Gegenprobe zu den zwei Korrekturen vom 2026-09-12
  const nurTitel = { title: 'Off-Shoulder T-Shirt für den Sommer' };
  const okD = pruefe(nurTitel).length === 0;
  console.log(`  ${okD ? 'OK ' : 'FEHLER'} Gegenprobe: nicht abgefragte Felder ergeben KEINEN Befund`);
  fehler += okD ? 0 : 1;

  const grosseGroessen = mk({ variants: { edges: [
    { node: { sku: 'a', title: 'Schwarz / 2XL', inventoryItem: { measurement: { weight: { value: 1 } } } } },
    { node: { sku: 'b', title: 'Schwarz / 4XL', inventoryItem: { measurement: { weight: { value: 1 } } } } },
  ] } });
  const okE = pruefe(grosseGroessen).length === 0;
  console.log(`  ${okE ? 'OK ' : 'FEHLER'} Gegenprobe: 2XL und 4XL sind normale Konfektionsgroessen`);
  fehler += okE ? 0 : 1;

  const deutschFarben = mk({ variants: { edges: [
    { node: { sku: 'a', title: 'Beige / S', inventoryItem: { measurement: { weight: { value: 1 } } } } },
    { node: { sku: 'b', title: 'Pink / M', inventoryItem: { measurement: { weight: { value: 1 } } } } },
  ] } });
  const okC = pruefe(deutschFarben).length === 0;
  console.log(`  ${okC ? 'OK ' : 'FEHLER'} Gegenprobe: im Deutschen uebliche Farbnamen sind kein Defekt`);
  fehler += okC ? 0 : 1;

  console.log('-'.repeat(52));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--selbsttest')) process.exit(selbsttest());
  const pfade = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!pfade.length) { console.log('Kein Dump angegeben. Siehe Kopf der Datei.'); process.exit(2); }
  bericht(auswerten(laden(pfade)));
}
