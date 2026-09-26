#!/usr/bin/env node
/**
 * preis_nachmessen.mjs — prueft an der ECHTEN Kundenseite, ob gesetzte Preise angekommen sind.
 *
 *   node tools/preis_nachmessen.mjs --selbsttest
 *   node tools/preis_nachmessen.mjs plan.json        # [{handle, setzen:[{id, neu}]}, ...]
 *
 * WARUM ES DIESES GERAET GIBT
 * `userErrors: []` sagt nur, dass das GESENDETE gueltig war — nicht, dass alles Geplante
 * gesendet wurde (19.09.2026: zwoelf geplant, zehn gesendet, Fehlerliste leer). Nur die
 * Kundenseite entscheidet.
 *
 * ZWEI FRAGEN, ZWEI QUELLEN (teuer gelernt am 25.09.2026):
 *  - „Steht der neue Preis in den Produktdaten?" → `https://luxestyle.ch/products/<handle>.js`.
 *    Dort steht JE VARIANTE der Preis in Rappen, ohne Zugangsdaten, ohne fremde Produkte.
 *  - „Ist der alte Preis weg?" gehoert AUCH dorthin. Auf der gerenderten Seite stehen
 *    Empfehlungsbloecke mit FREMDEN Produkten — deren Preise zaehlt ein naiver Greifer mit
 *    und meldet Fehlalarm.
 *
 * DREI FALLEN, die als Gegenprobe im Selbsttest stehen:
 *  1. Vergleich als ZEICHENKETTE: Python schreibt `44.9`, der Shop `44.90` — beides derselbe
 *     Preis. Hier wird ganzzahlig in Rappen verglichen.
 *  2. Eine Variante, die die Seite gar nicht kennt, ist UNBEKANNT — nicht „in Ordnung".
 *  3. HTTP 429/430/503 heisst „warte", nicht „Produkt fehlt".
 */

export const GEDROSSELT = new Set([429, 430, 503]);
export const BASIS = 'https://luxestyle.ch';

/** Franken → Rappen, ganzzahlig. `null` bleibt `null`. */
export function zuRappen(preis) {
  if (preis === null || preis === undefined || preis === '') return null;
  const n = typeof preis === 'number' ? preis : Number(String(preis).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Zahlenteil einer Shopify-GID. Nimmt auch eine blanke Zahl an. */
export function variantenNummer(id) {
  const s = String(id);
  const m = s.match(/(\d+)\s*$/);
  return m ? m[1] : null;
}

/** Produktdaten (`/products/<handle>.js`) → Map Variantennummer → Preis in Rappen. */
export function preiseAusProduktdaten(daten) {
  const m = new Map();
  if (!daten || !Array.isArray(daten.variants)) return m;
  for (const v of daten.variants) {
    const nr = variantenNummer(v.id);
    if (nr !== null && Number.isFinite(v.price)) m.set(nr, v.price);
  }
  return m;
}

/**
 * Vergleicht Soll gegen Ist. Liefert je Variante einen von drei Zustaenden —
 * `stimmt`, `abweichend`, `unbekannt` — nie stillschweigend „in Ordnung".
 */
export function vergleich(soll, ist) {
  const stimmt = [], abweichend = [], unbekannt = [];
  for (const s of soll) {
    const nr = variantenNummer(s.id);
    const sollRappen = zuRappen(s.neu);
    if (nr === null || sollRappen === null) { unbekannt.push({ ...s, grund: 'unlesbar' }); continue; }
    if (!ist.has(nr)) { unbekannt.push({ ...s, grund: 'Variante nicht auf der Seite' }); continue; }
    const istRappen = ist.get(nr);
    (istRappen === sollRappen ? stimmt : abweichend).push({ ...s, ist: istRappen, soll: sollRappen });
  }
  return { stimmt, abweichend, unbekannt };
}

/** Steht dieser Preis im sichtbaren Text der gerenderten Seite? (nur als Zusatzbeleg) */
export function preisImText(text, rappen) {
  if (rappen === null) return false;
  const franken = (rappen / 100).toFixed(2);
  return new RegExp(`\\b${franken.replace('.', '\\.')}\\b`).test(String(text));
}

async function hol(pfad, versuche = 4) {
  for (let i = 0; i < versuche; i++) {
    const antwort = await fetch(`${BASIS}${pfad}`, { headers: { 'user-agent': 'LuxeStyle-Preispruefung' } });
    if (GEDROSSELT.has(antwort.status)) { await new Promise((r) => setTimeout(r, 600 * (i + 1))); continue; }
    return { status: antwort.status, text: await antwort.text() };
  }
  return { status: 429, text: '' };
}

export async function messen(plan, pause = 350) {
  const bericht = [];
  for (const p of plan) {
    const { status, text } = await hol(`/products/${p.handle}.js`);
    if (status !== 200) { bericht.push({ handle: p.handle, status, ergebnis: 'unerreichbar' }); continue; }
    let daten = null;
    try { daten = JSON.parse(text); } catch { /* kaputte Antwort = unbekannt, nicht in Ordnung */ }
    if (!daten) { bericht.push({ handle: p.handle, status, ergebnis: 'unlesbar' }); continue; }
    bericht.push({ handle: p.handle, status, ...vergleich(p.setzen, preiseAusProduktdaten(daten)) });
    await new Promise((r) => setTimeout(r, pause));
  }
  return bericht;
}

function selbsttest() {
  const pruef = [];
  const ok = (name, bed) => pruef.push({ name, bestanden: !!bed });

  ok('Rappen ganzzahlig', zuRappen(44.9) === 4490 && zuRappen('44.90') === 4490);
  ok('44.9 und 44.90 sind derselbe Preis', zuRappen(44.9) === zuRappen('44.90'));
  ok('Komma statt Punkt', zuRappen('24,90') === 2490);
  ok('leerer Preis bleibt unbekannt', zuRappen('') === null && zuRappen(null) === null);
  ok('Unsinn ergibt null statt 0', zuRappen('abc') === null);
  ok('GID → Nummer', variantenNummer('gid://shopify/ProductVariant/55889895063937') === '55889895063937');
  ok('blanke Zahl geht auch', variantenNummer(12345) === '12345');

  const daten = { variants: [{ id: 111, price: 2490 }, { id: 222, price: 4490 }] };
  const ist = preiseAusProduktdaten(daten);
  ok('Produktdaten gelesen', ist.get('111') === 2490 && ist.get('222') === 4490);
  ok('ohne variants leere Karte', preiseAusProduktdaten({}).size === 0);

  const gut = vergleich([{ id: 111, neu: 24.9 }, { id: 222, neu: '44.90' }], ist);
  ok('beide stimmen', gut.stimmt.length === 2 && gut.abweichend.length === 0);

  // GEGENPROBE: ein absichtlich falscher Sollwert MUSS ausschlagen.
  const falsch = vergleich([{ id: 111, neu: 25.9 }], ist);
  ok('falscher Sollwert schlaegt aus', falsch.abweichend.length === 1 && falsch.stimmt.length === 0);

  // GEGENPROBE: eine Variante, die es nicht gibt, ist unbekannt — nicht in Ordnung.
  const fehlt = vergleich([{ id: 999, neu: 24.9 }], ist);
  ok('fehlende Variante ist unbekannt', fehlt.unbekannt.length === 1 && fehlt.stimmt.length === 0);

  ok('Preis im Text gefunden', preisImText('Jetzt nur CHF 44.90 statt', 4490));
  ok('alter Preis wird nicht gefunden', !preisImText('Jetzt nur CHF 44.90 statt', 2590));
  ok('144.90 ist nicht 44.90', !preisImText('CHF 144.90', 4490));
  ok('gedrosselt ist nicht fehlend', GEDROSSELT.has(429) && GEDROSSELT.has(503) && !GEDROSSELT.has(404));

  const durch = pruef.filter((p) => p.bestanden).length;
  for (const p of pruef) if (!p.bestanden) console.log(`  FEHLER: ${p.name}`);
  console.log(`${durch}/${pruef.length} Selbsttests bestanden`);
  return durch === pruef.length ? 0 : 1;
}

const direkt = process.argv[1] && import.meta.url === `file://${await import('node:path').then((p) => p.resolve(process.argv[1]))}`;
if (direkt) {
  const arg = process.argv[2];
  if (!arg || arg === '--selbsttest') {
    process.exit(selbsttest());
  } else {
    const { readFileSync } = await import('node:fs');
    const plan = JSON.parse(readFileSync(arg, 'utf8')).filter((p) => p.setzen && p.setzen.length);
    const bericht = await messen(plan);
    const sauber = bericht.filter((b) => b.abweichend && !b.abweichend.length && !b.unbekannt.length);
    console.log(`${sauber.length}/${bericht.length} Produkte an der Kundenseite bestaetigt`);
    for (const b of bericht) {
      if (b.ergebnis) { console.log(`  ${b.ergebnis} (${b.status}): ${b.handle}`); continue; }
      if (b.abweichend.length || b.unbekannt.length) {
        console.log(`  ABWEICHUNG ${b.handle}: ${b.abweichend.length} falsch, ${b.unbekannt.length} unbekannt`);
        for (const a of b.abweichend.slice(0, 3)) console.log(`      soll ${a.soll} ist ${a.ist}`);
        for (const u of b.unbekannt.slice(0, 3)) console.log(`      unbekannt: ${u.grund}`);
      }
    }
  }
}
