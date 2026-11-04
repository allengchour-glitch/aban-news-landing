// Prüft die Startseite (ohne etwas zu schreiben): stehen in den vier wechselnden Reihen genau die Produkte, die die Rechnung für das
// aktuelle Zeitfenster vorgibt? Gerechnet wird wie im Theme: Start aus automation/lib/startseite_pool.mjs (fensterStart), dann ein Fenster
// aus dem doppelten Pool, doppelte Handles übersprungen, ungültige Produkte (nicht kaufbar, ohne Bild/Preis/Tags, gesperrt) übersprungen,
// die ersten `zeigt` gültigen Karten. Dazu: 25 Karten, 25 Herzen, 25 Bilder, kein «Liquid error», keine Dublette.
// Aufruf: node dropship/startseite-wechsel-0411/pruefen_live.mjs   (Exit 0 gleich, 1 Abweichung, 2 Seite nicht lesbar)
// Betrieb: Cloudflare zeigt Skripten ohne normale Browserkennung eine Prüfseite und drosselt bei zu vielen Anfragen (429):
// deshalb normale Chrome-Kennung, Adresse der Startseite OHNE Query, Pausen zwischen den Abrufen, Wiederholung bei 429/503.
// Das Zeitfenster kommt aus dem Datum-Kopf der Antwort der Startseite (nicht aus der eigenen Uhr), damit ein Wechsel zwischen
// zwei Abrufen kein falsches «Abweichung» erzeugt.
// Seiten-Cache: Shopify hält die fertig gerechnete Startseite nach einem Fensterwechsel noch eine Weile vor (GEMESSEN 04.11.:
// Wechsel 12:00 UTC, Browser-Kopf liefert den alten Stand bis 12:22 UTC; ohne Accept-Kopf kam der neue Stand sofort). Zeigt die Seite in den
// ersten 40 Minuten (LAG_MIN) nach einer Fenstergrenze genau die Auswahl des VORHERIGEN Fensters, meldet das Skript «GLEICH (Cache-Verzug)»
// statt «Abweichung». Danach zählt nur noch das aktuelle Fenster.
import { fensterStart, slotAus, REIHEN, THEME_STOPS, ROTATION } from '../../automation/lib/startseite_pool.mjs';
const BASIS = 'https://luxestyle.ch';
const PAUSE_MS = Number(process.env.PAUSE_MS || 3200);
const LAG_MIN = Number(process.env.LAG_MIN || 40);
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
async function holen(pfad, versuche = 5) {
  let letzter = '';
  for (let i = 0; i < versuche; i++) {
    const r = await fetch(BASIS + pfad, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 'accept-language': 'de-CH,de;q=0.9' } });
    if (r.ok) return r;
    letzter = `HTTP ${r.status}`;
    if (![429, 503].includes(r.status)) break;
    await schlaf(PAUSE_MS * (i + 2));
  }
  throw new Error(`${pfad}: ${letzter}`);
}
const alle = (h, a) => [...h.matchAll(new RegExp(`data-${a}-handle="([^"]+)"`, 'g'))].map((m) => m[1]);
const BEWERBEN = /nicht-.*bewerben/i;
/** Wie das Theme: ist die Karte gültig? (products.json kennt Verfügbarkeit je Variante, Bilder, Preis und Tags.) */
function gueltig(p) {
  const tags = (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',')).map((t) => String(t).trim()).filter(Boolean);
  const verfuegbar = (p.variants || []).some((v) => v.available);
  const preis = Math.min(...(p.variants || []).map((v) => Number(v.price)).filter((x) => x >= 0), Infinity);
  if (!verfuegbar || !(p.images || []).length || !(preis > 0) || !tags.length) return false;
  const joined = tags.join('|').toLowerCase();
  if (THEME_STOPS.some((s) => joined.includes(s)) || tags.some((t) => BEWERBEN.test(t))) return false;
  if (joined.includes('waffe-pruefen')) return false;
  return true;
}
function soll(pool, k, slot) {
  const n = Math.min(pool.length, 50);
  const s = fensterStart(slot, n);
  const arr = [...pool.slice(0, n), ...pool.slice(0, n)];
  const gesehen = new Set(), ergebnis = [];
  for (const p of arr.slice(s, s + k.fenster)) {
    if (gesehen.has(p.handle)) continue;
    gesehen.add(p.handle);
    if (ergebnis.length < k.zeigt && gueltig(p)) ergebnis.push(p.handle);
  }
  return { s, n, liste: ergebnis };
}
let code = 0;
try {
  const antwort = await holen('/');
  const html = await antwort.text();
  const datum = antwort.headers.get('date');
  const sekunden = datum ? Math.floor(new Date(datum).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const slot = slotAus(sekunden);
  if (/Liquid error|translation missing/.test(html)) { console.log('FEHLER: Liquid-Fehler im HTML'); code = 1; }
  const trends = alle(html, 'trend'), edit = alle(html, 'edit'), mehr = alle(html, 'more');
  const karten = (html.match(/class="lx-wishcard"/g) || []).length;
  const herzen = (html.match(/class="lux-wish" data-handle=/g) || []).length;
  const bilder = (html.match(/class="(?:lx-trend-image|lx-edit-product-image|lx-more-photo)">\s*<img/g) || []).length;
  console.log(`Zeitfenster ${slot} (${datum || 'eigene Uhr'}) · Karten: Trends ${trends.length}, Schmuck/Wohnen ${edit.length}, Mehr ${mehr.length} · wishcard ${karten}, Herzen ${herzen}, Bilder ${bilder}`);
  if (karten !== 25 || herzen !== 25 || bilder !== 25) { console.log('FEHLER: erwartet 25 Karten, 25 Herzen und 25 Bilder'); code = 1; }
  const ist = { trends, mehr, schmuck: edit.slice(0, REIHEN.schmuck.zeigt), wohnen: edit.slice(REIHEN.schmuck.zeigt) };
  for (const n of ['trends', 'mehr', 'schmuck', 'wohnen']) {
    await schlaf(PAUSE_MS);
    const k = REIHEN[n];
    const pool = (await (await holen(`/collections/${k.handle}/products.json?limit=250`)).json()).products;
    const e = soll(pool, k, slot);
    const gl = (l) => l.length === ist[n].length && l.every((h, i) => h === ist[n][i]);
    let gleich = gl(e.liste), verzug = false;
    // Verzug: erst «Abweichung» prüfen, ob die Seite das vorherige Fenster zeigt und die Grenze noch jung ist.
    if (!gleich && sekunden - slot * ROTATION.stunden * 3600 < LAG_MIN * 60 && gl(soll(pool, k, slot - 1).liste)) { gleich = true; verzug = true; }
    const zuWenig = e.liste.length < k.zeigt;
    console.log(`${n}: Pool ${pool.length}, Start ${e.s} → ${gleich ? (verzug ? 'GLEICH (Cache-Verzug: Seite zeigt noch das vorherige Fenster)' : 'GLEICH') : 'ABWEICHUNG'}${zuWenig ? ' (Fenster hat zu wenig gültige Produkte: das Theme muss auf die feste Liste zurückfallen)' : ''}`);
    if (!gleich) { console.log('  soll', e.liste.join(', ')); console.log('  ist ', ist[n].join(', ')); code = 1; }
  }
  const doppelt = [...trends, ...edit, ...mehr]; if (new Set(doppelt).size !== doppelt.length) { console.log('FEHLER: ein Produkt steht doppelt'); code = 1; }
} catch (e) { console.log('Seite nicht lesbar:', e.message); code = 2; }
process.exit(code);
