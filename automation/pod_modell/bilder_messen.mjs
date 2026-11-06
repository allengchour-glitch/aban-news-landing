#!/usr/bin/env node
// NUR LESEN: misst die Pixelgrösse von Bild-Adressen (Range-Anfrage auf die ersten 64 KB, bei Bedarf 512 KB) und schreibt {url: {w,h,art,bytes}} nach OUT.
// Schreibt nichts bei Shopify oder Printful. Nur Hosts files.cdn.printful.com und printful.com (Whitelist), 150 ms Pause, höchstens 400 NEU zu messende Adressen je Lauf (MAX_PRO_LAUF=…); schon Gemessenes zählt nicht mit,
// ein weiterer Lauf misst die nächsten. Weiterleitungen werden nicht verfolgt (sonst könnte ein Treffer auf einen fremden Host zeigen).
//   URLS=<Datei mit einer Adresse je Zeile oder JSON-Liste>  OUT=<bilder_masse.json>  node automation/pod_modell/bilder_messen.mjs
//   oder: PLAENE=<Ordner mit Plan-JSON-Dateien>  (Adressen aus plan.medien)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { bildMass } from './bildmass.mjs';

export const ERLAUBTE_HOSTS = ['files.cdn.printful.com', 'printful.com', 'www.printful.com'];
export function adressenAus({ urlsDatei, plaeneDir }) {
  const s = new Set();
  if (urlsDatei) { const t = readFileSync(urlsDatei, 'utf8').trim(); const l = t.startsWith('[') ? JSON.parse(t) : t.split(/\r?\n/); for (const u of l) if (u.trim()) s.add(u.trim()); }
  if (plaeneDir) for (const f of readdirSync(plaeneDir).filter((x) => x.endsWith('.json'))) { const p = JSON.parse(readFileSync(join(plaeneDir, f), 'utf8')); for (const m of p.medien ?? []) s.add(m.url); for (const u of p.bilder?.ungemessen ?? []) s.add(u); for (const u of p.bilder?.kandidaten ?? []) s.add(u); }
  return [...s];
}
export const erlaubt = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && ERLAUBTE_HOSTS.includes(x.hostname); } catch { return false; } };

async function messe(url, fetchFn) {
  for (const bis of [65535, 524287]) {
    const r = await fetchFn(url, { redirect: 'manual', headers: { Range: `bytes=0-${bis}`, 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' } });
    if (r.status >= 300 && r.status < 400) return { fehler: `Weiterleitung HTTP ${r.status} nicht verfolgt` };
    if (r.status !== 200 && r.status !== 206) return { fehler: `HTTP ${r.status}` };
    const buf = new Uint8Array(await r.arrayBuffer());
    const m = bildMass(buf);
    if (m) return { ...m, bytes: Number((r.headers.get('content-range') || '').split('/')[1]) || buf.length };
    if (buf.length < bis) return { fehler: 'Format nicht erkannt' };
  }
  return { fehler: 'Format nicht erkannt (512 KB gelesen)' };
}

export async function main(env = process.env, fetchFn = fetch, pause = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const out = env.OUT || './bilder_masse.json';
  const erg = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
  const alle = adressenAus({ urlsDatei: env.URLS, plaeneDir: env.PLAENE });
  const max = Math.max(1, Number(env.MAX_PRO_LAUF ?? 400) || 400);
  let n = 0;
  for (const u of alle) if (!erg[u]?.w && !erlaubt(u)) erg[u] = { fehler: 'Host nicht erlaubt' };      // kostet keine Anfrage und zählt nicht zur Grenze
  // erst, was noch nie versucht wurde; danach die früher gescheiterten (ein dauerhafter Fehler soll die übrigen nicht aufhalten). DANN erst die Grenze anwenden.
  const offen = alle.filter((u) => !erg[u]?.w && erlaubt(u));
  const urls = [...offen.filter((u) => !erg[u]), ...offen.filter((u) => erg[u])].slice(0, max);
  for (const u of urls) {
    try { erg[u] = await messe(u, fetchFn); } catch (e) { erg[u] = { fehler: String(e.message || e).slice(0, 80) }; }
    n++; await pause(Number(env.PAUSE_MS ?? 150));
  }
  writeFileSync(out, JSON.stringify(erg, null, 1));
  const ok = Object.values(erg).filter((x) => x.w).length;
  const rest = alle.filter((u) => !erg[u]?.w && erlaubt(u)).length;
  console.log(`gemessen: ${n} neu, ${ok} von ${Object.keys(erg).length} mit Grösse, ${Object.keys(erg).length - ok} ohne (siehe «fehler»)${rest ? `; ${rest} Adresse(n) dieses Auftrags noch ohne Grösse: den Befehl noch einmal ausführen` : ''}`);
  return erg;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((e) => { console.error(e); process.exit(1); });
