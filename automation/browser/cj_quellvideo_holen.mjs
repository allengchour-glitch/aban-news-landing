/**
 * cj_quellvideo_holen.mjs — lädt CJ-Produktvideos (Rohmaterial für automation/reel/schnitt.py) auf dem Hetzner-Server
 * herunter und legt sie nach auftraege/ergebnis/, damit die Cloud-Session sie schneiden kann.
 *
 * WARUM (gemessen 27.09.2026): Die Cloud-Umgebung erreicht download-only-api.cjdropshipping.com nicht (Proxy 403,
 * Netzwerk-Richtlinie) — die CJ-API selbst schon. Die Shopify-Produktvideos sind 1–7 s lang; schnitt.py braucht
 * ≥ 8 s Material, sonst scheitert das Tor (Loop-Naht, gemessen: 7.58 > 1.63). Also: Adresse in der Cloud per API holen,
 * Download hier.
 *
 * SICHERHEIT: Aus dem Auftrag kommen nur DATEN (Adressen), kein Code. Erlaubt ist ausschliesslich der Host
 * download-only-api.cjdropshipping.com über https, höchstens 3 Videos je Auftrag, höchstens 60 MB je Video.
 *
 * AUFTRAG
 *   { "id": "cj-quellvideos-2026-09-27", "typ": "skript", "skript": "cj_quellvideo_holen.mjs",
 *     "videos": [ { "name": "rucksack", "url": "https://download-only-api.cjdropshipping.com/…-ld.mp4" } ] }
 *   → auftraege/ergebnis/<id>-<name>.mp4 ; Quittung: je Video Name, Bytes, Datei.
 * SELBSTTEST
 *   /opt/node22/bin/node automation/browser/cj_quellvideo_holen.mjs --selbsttest
 */
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'download-only-api.cjdropshipping.com';
const MAX_VIDEOS = 3;
const MAX_BYTES = 60 * 1024 * 1024;

export function erlaubt(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === HOST && /\.mp4$/i.test(u.pathname); }
  catch { return false; }
}
export function sicherer_name(n) { return typeof n === 'string' && /^[a-z0-9][a-z0-9-]{0,40}$/.test(n); }

export default async function ({ auftrag, ERGEBNIS }) {
  const liste = Array.isArray(auftrag.videos) ? auftrag.videos.slice(0, MAX_VIDEOS) : [];
  if (!liste.length) throw new Error('auftrag.videos fehlt oder leer');
  const aus = [];
  for (const v of liste) {
    if (!sicherer_name(v.name) || !erlaubt(v.url)) { aus.push({ name: v.name, fehler: 'nicht erlaubt (Name/Host)' }); continue; }
    try {
      const r = await fetch(v.url, { headers: { Referer: 'https://developers.cjdropshipping.com/' } });
      if (!r.ok) { aus.push({ name: v.name, fehler: `HTTP ${r.status}` }); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_BYTES) { aus.push({ name: v.name, fehler: `zu gross (${buf.length})` }); continue; }
      if (buf.length < 50000) { aus.push({ name: v.name, fehler: `zu klein (${buf.length}) — kein Video` }); continue; }
      const datei = path.join(ERGEBNIS, `${auftrag.id}-${v.name}.mp4`);
      fs.writeFileSync(datei, buf);
      aus.push({ name: v.name, bytes: buf.length, datei: path.relative(path.dirname(path.dirname(ERGEBNIS)), datei) });
    } catch (e) { aus.push({ name: v.name, fehler: String(e.message || e).slice(0, 160) }); }
  }
  return { videos: aus };
}

if (process.argv.includes('--selbsttest')) {
  const f = [];
  const ok = (b, m) => { if (!b) f.push(m); };
  ok(erlaubt(`https://${HOST}/abc/def-ld.mp4`), 'CJ-Adresse muss erlaubt sein');
  ok(!erlaubt(`http://${HOST}/abc/def-ld.mp4`), 'http darf nicht');
  ok(!erlaubt('https://evil.example/x.mp4'), 'fremder Host darf nicht');
  ok(!erlaubt(`https://${HOST}.evil.example/x.mp4`), 'Host-Suffix-Trick darf nicht');
  ok(!erlaubt(`https://${HOST}/x.sh`), 'nur .mp4');
  ok(sicherer_name('rucksack') && !sicherer_name('../x') && !sicherer_name('A B'), 'Namensprüfung');
  console.log(f.length ? `SELBSTTEST FEHLER: ${f.join(' · ')}` : 'SELBSTTEST OK (6)');
  process.exit(f.length ? 1 : 0);
}
