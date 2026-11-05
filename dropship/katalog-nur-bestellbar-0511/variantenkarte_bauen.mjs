// Baut assets/luxe-clothing-variantenkarte.json (Printful-Variante -> Modell, Farbe, Grösse) aus den 51 Datenschalen des Katalogfensters.
//   SCHALEN_DIR=<Ordner mit assets__luxe-clothing-details-sNNN.json und assets__luxe-clothing-index.json> node variantenkarte_bauen.mjs [--pruefen]
// Ohne --pruefen schreibt das Skript daten/variantenkarte.json; mit --pruefen vergleicht es die vorhandene Datei mit den Schalen (Exit 1 bei Abweichung).
// Warum diese Datei? Die Shop-Angebote (config.shopVariantOffers) kennen nur die Printful-Variantennummer; welches Modell, welche Farbe und welche Grösse
// dazugehört, steht nur in den Schalen (9 MB). Die Karte hat das Nötige für alle 13 160 Varianten (~330 KB) und gilt für jedes künftige Shopprodukt weiter.
// Die Schalen selbst ziehen: automation/…/theme_lesen.mjs-Muster (Theme-API, nur lesend) oder die Lesekopien im Scratch.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HIER = new URL('.', import.meta.url).pathname;
export const STAND = '2026-11-05';
export const QUELLE = 'assets/luxe-clothing-details-s001…s051.json (Datenschalen des Katalogfensters, Printful-Katalog, Stand 01.11.2026)';

// Liest die Schalen und liefert {modell: [[variantenId, farbe|null, grösse|null], …]} (Reihenfolge der Schalen).
export function karteAusSchalen(dir, n = 51) {
  const modelle = {};
  for (let i = 1; i <= n; i++) {
    const k = 's' + String(i).padStart(3, '0');
    const datei = `${dir}/assets__luxe-clothing-details-${k}.json`;
    if (!existsSync(datei)) throw new Error('Schale fehlt: ' + datei);
    const j = JSON.parse(readFileSync(datei, 'utf8'));
    const zeilen = Array.isArray(j.products) ? j.products : Object.values(j.products || {});
    for (const r of zeilen) {
      const pid = String(r.id);
      if (modelle[pid]) throw new Error('Modell doppelt in den Schalen: ' + pid);
      modelle[pid] = (r.variants || []).map((v) => {
        if (!/^\d+$/.test(String(v.id))) throw new Error(`Variantennummer unlesbar: Modell ${pid}`);
        const farbe = typeof v.color === 'string' && v.color ? v.color : null;
        const groesse = typeof v.size === 'string' && v.size ? v.size : null;
        return [Number(v.id), farbe, groesse];
      });
    }
  }
  return modelle;
}

// Gleiche Zeichenkette wie die Datei auf der Platte: ein Modell je Zeile (lesbar im Vergleich), gültiges JSON.
export function karteAlsText(modelle) {
  const ids = Object.keys(modelle).sort((a, b) => Number(a) - Number(b));
  const zeilen = ids.map((pid) => `${JSON.stringify(pid)}:${JSON.stringify(modelle[pid])}`);
  return `{"schemaVersion":1,"stand":${JSON.stringify(STAND)},"quelle":${JSON.stringify(QUELLE)},"modelle":{\n${zeilen.join(',\n')}\n}}\n`;
}

// Prüft die Karte gegen den Index (572 Modelle): gleiche Modelle, gleiche Anzahl, jede Farbe und Grösse des Index kommt vor und umgekehrt.
export function pruefeGegenIndex(modelle, index) {
  const fehler = [];
  const proId = new Map(index.products.map((p) => [String(p.id), p]));
  if (Object.keys(modelle).length !== proId.size) fehler.push(`Modelle: Karte ${Object.keys(modelle).length}, Index ${proId.size}`);
  const gesehen = new Set();
  for (const [pid, zeilen] of Object.entries(modelle)) {
    const p = proId.get(pid);
    if (!p) { fehler.push('Modell nicht im Index: ' + pid); continue; }
    if (p.variantCount != null && p.variantCount !== zeilen.length) fehler.push(`Modell ${pid}: variantCount ${p.variantCount}, Karte ${zeilen.length}`);
    const farbenIndex = (p.colors || []).map((c) => (Object.prototype.hasOwnProperty.call(c, 'color') ? c.color : c.name)).filter(Boolean).sort();
    const farbenKarte = [...new Set(zeilen.map((z) => z[1]).filter(Boolean))].sort();
    if (JSON.stringify(farbenIndex) !== JSON.stringify(farbenKarte)) fehler.push(`Modell ${pid}: Farben weichen vom Index ab`);
    const groessenIndex = [...(p.sizes || [])].sort();
    const groessenKarte = [...new Set(zeilen.map((z) => z[2]).filter(Boolean))].sort();
    if (JSON.stringify(groessenIndex) !== JSON.stringify(groessenKarte)) fehler.push(`Modell ${pid}: Grössen weichen vom Index ab`);
    for (const z of zeilen) { if (gesehen.has(z[0])) fehler.push('Variantennummer doppelt: ' + z[0]); gesehen.add(z[0]); }
  }
  return fehler;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.env.SCHALEN_DIR;
  if (!dir) { console.error('SCHALEN_DIR fehlt (Ordner mit den Lesekopien der Schalen und des Index)'); process.exit(1); }
  const modelle = karteAusSchalen(dir);
  const fehler = pruefeGegenIndex(modelle, JSON.parse(readFileSync(`${dir}/assets__luxe-clothing-index.json`, 'utf8')));
  const text = karteAlsText(modelle);
  const md5 = createHash('md5').update(text).digest('hex');
  console.log(`Modelle ${Object.keys(modelle).length}, Varianten ${Object.values(modelle).reduce((s, z) => s + z.length, 0)}, ${Buffer.byteLength(text)} Byte, MD5 ${md5}`);
  if (fehler.length) { console.error('Abweichungen gegen den Index:\n  ' + fehler.slice(0, 20).join('\n  ')); }
  const ziel = HIER + 'daten/variantenkarte.json';
  if (process.argv.includes('--pruefen')) {
    const ist = existsSync(ziel) ? readFileSync(ziel, 'utf8') : '';
    console.log(ist === text ? 'daten/variantenkarte.json ist gleich den Schalen' : 'daten/variantenkarte.json WEICHT von den Schalen ab');
    process.exit(ist === text && !fehler.length ? 0 : 1);
  }
  writeFileSync(ziel, text);
  console.log('geschrieben:', ziel);
  process.exit(fehler.length ? 1 : 0);
}
