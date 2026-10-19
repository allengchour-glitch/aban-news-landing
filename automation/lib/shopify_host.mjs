// shopify_host.mjs — EINE Quelle für «ist das ein Shop-Host, an den Zugangsdaten gehen dürfen?» (19.10.2026).
//
// ANLASS: Am 19.10. war SHOPIFY_CLIENT_SECRET der Umgebung verdorben (gültiger Schlüssel + «=SHOPIFY_CLIENT_SECRET»; lib/shopify_secret.sh
// heilt das). Derselbe Einfügefehler kann SHOPIFY_SHOP treffen — dann ginge das gültige Secret an einen Fantasie-Host.
// GEMESSEN 19.10. (grep «admin/oauth/access_token», 125 Dateien, 123 senden wirklich): 39 nehmen den Host roh aus der Umgebung, 24 prüfen
// nur das Suffix `/myshopify\.com$/`, 1 prüft streng (publish_guard.mjs, noch nicht eingecheckt), 59 haben ihn fest eingebaut.
// IDEE aus Codex #2673 (lib/shopify_host.mjs, QUELLE): Host-Regex vor dem Anfügen von Zugangsdaten. Hier als drei Umsetzungen mit EINER
// Regel (shopify_secret.sh · dieses Modul · shopify_host.py) und EINER Fallliste (shopify_host_faelle.tsv); Test: shopify_host_test.mjs.
//
// REGEL (ASCII-genau, in allen drei Umsetzungen gleich):
//  0. Länge über 253 (Hostname-Maximum, DNS) ist «falsch» und wird NIE bereinigt. GEMESSEN 19.10. an der ersten Fassung dieses Moduls: die
//     Regex `/^[ws]+|[ws]+$/g` ist bei «Zeichen + Leerraum + Zeichen» quadratisch (40'000 Leerzeichen 1,9 s · 130'000: 20,5 s; bei 1,3 Mio.
//     Zeichen lief ein Prozess über 3 Minuten und wurde abgebrochen); die Bash-Umsetzung trimmt auf langem Leerraum ebenso (40'000: 4,08 s). Jetzt trimmt trimmeRand() linear UND die Schranke
//     greift vor jeder Bereinigung.
//  1. Leerraum (Leerzeichen, Tab, CR, LF, VT, FF) am Rand weg; ein Paar umschliessender Anführungszeichen weg; nochmals Leerraum weg.
//  2. Kleinschreibung (nur A–Z).
//  3. «https://» am Anfang weg (nur dieses Schema); Vorsatz «shopify_shop=» ODER Anhang «=shopify_shop» weg (Variablenname aus einem
//     Einfügefehler); EIN «/» am Ende weg. Jeder Schritt höchstens einmal.
//  4. Der Rest muss ganz auf ^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.myshopify\.com$ passen. Hosts unter myshopify.com gehören Shopify: Zugangsdaten
//     gehen so nie an einen fremden Betreiber. Zusätzlich muss er (Standard) der LuxeStyle-Host sein (SHOP_ECHT).
//  Nicht gesetzt (null, undefined oder '') ist «leer» — nichts zu prüfen. Gesetzt, aber nur Leerraum, ist «falsch». Ein Paar Anführungszeichen muss GLEICH sein.
//  Fehlertexte nennen nie den Wert, nur Länge und Merkmale (hostStruktur) — der Wert könnte ein vertauschter Schlüssel sein.
//
//   import { assertShopifyHost, heileShopifyHost } from './lib/shopify_host.mjs';
//   const SHOP = assertShopifyHost(process.env.SHOPIFY_SHOP);               // wirft ShopifyHostFehler, BEVOR ein Schlüssel angefügt wird
//   const { host: SHOP } = heileShopifyHost(process.env.SHOPIFY_SHOP);        // wie lib/shopify_secret.sh: bei falsch der echte Host
//   node automation/lib/shopify_host_test.mjs                               // Test inkl. Abgleich mit shopify_host.py und shopify_secret.sh
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SHOP_ECHT = 'au3j0y-hq.myshopify.com';
export const MAX_LAENGE = 253;   // Hostname-Maximum (DNS), Regel 0
export const HOST_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/;   // ohne /m-Flag: «$» passt nur am Ende, nicht vor einem Zeilenende
export const FAELLE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shopify_host_faelle.tsv');
const LEERRAUM = ' \t\r\n\v\f';
/** Leerraum (nur diese sechs ASCII-Zeichen) an beiden Rändern weg — linear (eine Regex mit `$` wäre bei langem Leerraum quadratisch). */
const trimmeRand = s => { let a = 0, b = s.length; while (a < b && LEERRAUM.includes(s[a])) a++; while (b > a && LEERRAUM.includes(s[b - 1])) b--; return s.slice(a, b); };
const NAME = 'shopify_shop';
const klein = s => s.replace(/[A-Z]/g, c => c.toLowerCase());

export class ShopifyHostFehler extends Error {
  /** art ∈ falsch | fremd | leer. Der Text enthält nie den Wert. */
  constructor(art, text) { super(text); this.name = 'ShopifyHostFehler'; this.art = art; }
}

/** Länge und Merkmale des Werts, NIE Zeichen daraus. */
export function hostStruktur(roh) {
  if (typeof roh !== 'string') return `Typ ${roh === null ? 'null' : typeof roh}`;
  const m = [`Länge ${[...roh].length}`];
  if (roh.length > MAX_LAENGE) return `${m[0]}, länger als ${MAX_LAENGE}`;   // Regel 0: nicht weiter scannen (gleich in bash und python)
  if (/[ \t\r\n\v\f]/.test(roh)) m.push('Leerraum');
  if (/["']/.test(roh)) m.push('Anführungszeichen');
  if (roh.includes('://')) m.push('enthält «://»');
  if (roh.includes('/')) m.push('enthält «/»');
  if (roh.includes('=')) m.push('enthält «=»');
  if (roh.includes('@')) m.push('enthält «@»');
  if (roh.replaceAll('://', '').includes(':')) m.push('enthält «:»');
  if (/[A-Z]/.test(roh)) m.push('Grossbuchstaben');
  if (klein(roh).includes(NAME)) m.push('enthält den Variablennamen');
  const k = trimmeRand(roh);
  if (/^(?:shp[a-z]{2}_|[0-9a-fA-F]{32}$)/.test(k)) m.push('schlüsselartig (vertauscht?)');
  if (!klein(k).endsWith('.myshopify.com')) m.push('endet nicht auf .myshopify.com');
  return m.join(', ');
}

/** Schritte 1–3 der Regel → Kandidat. Urteilt nicht (das tut hostUrteil). */
export function bereinigeShopifyHost(roh) {
  let w = trimmeRand(String(roh));
  if (w.length >= 2 && w[0] === w[w.length - 1] && (w[0] === '"' || w[0] === "'")) w = trimmeRand(w.slice(1, -1));
  w = klein(w);
  if (w.startsWith('https://')) w = w.slice('https://'.length);
  if (w.startsWith(NAME + '=')) w = w.slice(NAME.length + 1);
  else if (w.endsWith('=' + NAME)) w = w.slice(0, -(NAME.length + 1));
  if (w.endsWith('/')) w = w.slice(0, -1);
  return w;
}

/** → { art, host }. art: leer (null/undefined/''), ok (schon kanonisch), bereinigt, falsch, fremd (gültige Struktur, aber nicht `erwartet`).
 *  host ist nur bei ok/bereinigt gefüllt. erwartet = null prüft nur die Struktur (dann gibt es kein «fremd»). */
export function hostUrteil(roh, { erwartet = SHOP_ECHT } = {}) {
  if (roh === undefined || roh === null || roh === '') return { art: 'leer', host: '' };
  if (typeof roh !== 'string' || roh.length > MAX_LAENGE) return { art: 'falsch', host: '' };
  const k = bereinigeShopifyHost(roh);
  if (!HOST_RE.test(k)) return { art: 'falsch', host: '' };
  if (erwartet !== null && k !== erwartet) return { art: 'fremd', host: '' };
  return { art: k === roh ? 'ok' : 'bereinigt', host: k };
}

/** Nur Struktur (wie Codex #2673): '' bei leer, sonst der bereinigte Host; wirft ShopifyHostFehler bei falsch. */
export function normalizeShopifyHost(roh) {
  const { art, host } = hostUrteil(roh, { erwartet: null });
  if (art === 'leer') return '';
  if (art === 'falsch') throw new ShopifyHostFehler(art, `SHOPIFY_HOST: kein Shop-Host unter myshopify.com (${hostStruktur(roh)})`);
  return host;
}

const TEXT = {
  leer: 'nicht gesetzt',
  falsch: 'kein Shop-Host unter myshopify.com',
  fremd: 'gültiger myshopify.com-Host, aber nicht der erwartete Shop',
};

/** Der bereinigte Host — oder ShopifyHostFehler (leer, falsch, fremd). Vor JEDEM Anfügen von Zugangsdaten rufen. */
export function assertShopifyHost(roh, { erwartet = SHOP_ECHT } = {}) {
  const { art, host } = hostUrteil(roh, { erwartet });
  if (art === 'ok' || art === 'bereinigt') return host;
  throw new ShopifyHostFehler(art, `SHOPIFY_HOST: ${TEXT[art]} (${hostStruktur(roh)})`);
}

/** Wie shopify_shop_pruefen in lib/shopify_secret.sh → { host, art, grund }.
 *  leer → host '' (nichts zu heilen); ok/bereinigt → der Host; falsch/fremd → `erwartet` (das Secret geht nie an den Wert), grund = Länge/Merkmale. */
export function heileShopifyHost(roh, { erwartet = SHOP_ECHT } = {}) {
  if (!erwartet) throw new Error('heileShopifyHost braucht einen erwarteten Host');
  const { art, host } = hostUrteil(roh, { erwartet });
  if (art === 'falsch' || art === 'fremd') return { host: erwartet, art, grund: hostStruktur(roh) };
  return { host, art, grund: '' };
}

/** Liest die gemeinsame Fallliste → [{ roh, art, host }]. Escapes in «…»: \t \r \n. */
export function faelle(pfad = FAELLE) {
  const out = [];
  for (const z of fs.readFileSync(pfad, 'utf8').split('\n')) {
    if (!z || z.startsWith('#')) continue;
    const [feld, art, host] = z.split('\t');
    if (!(feld.startsWith('«') && feld.endsWith('»'))) throw new Error('Fallliste: roh muss in «…» stehen');
    out.push({ roh: feld.slice(1, -1).replaceAll('\\t', '\t').replaceAll('\\r', '\r').replaceAll('\\n', '\n'), art, host: host === '-' ? '' : host });
  }
  return out;
}
