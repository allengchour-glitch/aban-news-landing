// Wächter «Katalogfenster zeigt nichts oder zu wenig» (nur lesend, kein Shopify-Token nötig): holt das Live-Dokument des Fensters, die Variantenkarte und die Zusatzschutz-Datei (live, sonst aus dem
// Paket: dann steht «Quelle: Paket» in der Ausgabe) und die Produkte der Sammlung selbst-gestalten-1, rechnet mit waechter_kern.mjs und meldet Befunde.
//   node dropship/katalog-nur-bestellbar-0511/waechter.mjs            Ausgabe als Text, Exit 0 ok · 3 Warnung · 4 Alarm · 1 Abruf gescheitert
//   JSON=1 node …/waechter.mjs                                        Ausgabe als JSON
// Wann laufen lassen: VOR dem Einspielen (Quelle: Paket), danach nach jeder Änderung an der Sammlung selbst-gestalten-1 oder an der Angebotsliste, und bevor eine Fabrik Produkte in die Sammlung
// legt. Einhängen in den Lager-Wächter (.github/workflows/lager-waechter.yml) wäre ein eigener Schritt: der Exitcode 4 soll den Lauf rot färben (nicht gebaut, Entscheid des Besitzers).
// Abrufe: ein Dokument, ein bis vier Seiten products.json (normale Chrome-Kennung, Pausen dazwischen; Cloudflare-Sperre -> Exit 1).
import { readFileSync, existsSync } from 'node:fs';
import { bewerten, exitCode, TAG } from './waechter_kern.mjs';
import { ausblendenText } from './patches.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const BASIS = process.env.WAECHTER_BASIS || 'https://luxestyle.ch';
const SEITE = BASIS + '/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const holen = async (url, json = false) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-CH,de;q=0.9' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} bei ${url}`);
  return json ? r.json() : r.text();
};

try {
  const html = await holen(SEITE);
  const m = html.match(/<script type="application\/json" data-lcl-config>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Konfiguration des Fensters im Dokument nicht gefunden (Bot-Sperre?)');
  const cfg = JSON.parse(m[1]);
  const quellen = {};
  const lade = async (name, url, paketDatei, umwandeln) => {
    if (url) { try { quellen[name] = 'live'; return await holen(new URL(url, BASIS).href, true); } catch (e) { quellen[name] = 'live nicht lesbar: ' + e.message; } }
    else quellen[name] = 'Paket (noch nicht live)';
    if (paketDatei && existsSync(HIER + paketDatei)) { quellen[name] += ' → Paket'; return umwandeln(readFileSync(HIER + paketDatei, 'utf8')); }
    return null;
  };
  await pause(500);
  const karte = await lade('karte', cfg.assets?.variantenkarte, 'daten/variantenkarte.json', (t) => JSON.parse(t));
  await pause(500);
  const ausblenden = await lade('ausblenden', cfg.assets?.ausblenden, 'daten/ausblenden-quelle.json', (t) => JSON.parse(ausblendenText(JSON.parse(t))));
  // Produkte der Sammlung (aktive, veröffentlichte): so sieht auch das Snippet products_count
  let anzahl = 0, getaggt = 0;
  for (let seite = 1; seite <= 4; seite++) {
    await pause(600);
    const j = await holen(`${BASIS}/collections/selbst-gestalten-1/products.json?limit=250&page=${seite}`, true);
    const ps = j.products || [];
    anzahl += ps.length; getaggt += ps.filter((p) => (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',')).map((x) => x.trim()).includes(TAG)).length;
    if (ps.length < 250) break;
  }
  const erg = bewerten({ angebote: cfg.shopVariantOffers || [], karte, ausblenden, sammlung: { anzahl, getaggt }, jetzt: new Date() });
  if (process.env.JSON === '1') console.log(JSON.stringify({ ...erg, quellen }, null, 1));
  else {
    console.log(`Wächter Katalogfenster (${new Date().toISOString()}): ${erg.stufe}`);
    console.log('Zahlen:', JSON.stringify(erg.zahlen), '| Quellen:', JSON.stringify(quellen));
    for (const b of erg.befunde) console.log(`  [${b.stufe}] ${b.code}: ${b.text}`);
  }
  process.exit(exitCode(erg.stufe));
} catch (e) {
  console.error('Wächter: Abruf gescheitert:', e && e.message ? e.message : e);
  process.exit(1);
}
