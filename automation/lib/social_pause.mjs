// social_pause.mjs — fragt, ob eine Queue-Zeile Ware bewirbt, die gerade eine Anlass-Social-Sperre hat (13.10.2026).
//
// Quelle: dropship/_social_pause.txt, geschrieben von automation/anlass_social_sperre.py --scharf (täglich im Aufseher).
// Kopf «# <anlass>\t<ab>\t<bis>\t<tag>», danach Schlüssel pid:<Shopify-ID> · h:<handle> · titel:<erste Caption-Zeile klein>
// · zeile:<Queue-Zeilen-ID>. Ausserhalb [ab, bis) gilt die Datei nicht (fail-open nach dem Anlass, nie über «bis» hinaus).
//
// WARUM: Die Poster prüfen nur ACTIVE + onlineStoreUrl. Die Abmeldung aus TikTok/FB-IG/Pinterest ändert daran nichts —
// ein Halloween-Kostüm (CJ, Ankunft nach dem 31.10.) bliebe für meta_reel_post/metricool_tiktok_post «kaufbar».
// Nutzung im Poster (eine Zeile vor dem Claim):
//   import { socialPause } from './lib/social_pause.mjs';
//   const sp = socialPause({ id, caption, produkte }); if (sp) { status = 'social-pause-skip'; … weiter/Exit 3 }
import fs from 'fs';

const DATEI = new URL('../../dropship/_social_pause.txt', import.meta.url).pathname;

export function pauseSchluessel(datei = DATEI, jetzt = new Date()) {
  let roh = '';
  try { roh = fs.readFileSync(datei, 'utf8'); } catch { return new Set(); }
  const zeilen = roh.split('\n').map(z => z.trim()).filter(Boolean);
  const aus = new Set();
  let gilt = false;
  for (const z of zeilen) {
    if (z.startsWith('#')) {
      const [, ab, bis] = z.slice(1).trim().split('\t');
      gilt = !!(ab && bis) && jetzt >= new Date(ab) && jetzt < new Date(bis);
      continue;
    }
    if (gilt) aus.add(z);
  }
  return aus;
}

// Gleiche Zuordnung wie anlass_social_sperre.zeile_treffer (Python) — dort mit Selbsttest abgesichert.
export function socialPause(row, schluessel = pauseSchluessel()) {
  if (!schluessel.size) return '';
  const zid = String(row.id || row.slug || '').trim();
  const cap = String(row.caption || row.text || '');
  if (zid && schluessel.has('zeile:' + zid)) return 'zeile:' + zid;
  const m = /(\d{12,15})\s*$/.exec(zid);
  if (m && !zid.startsWith('cjreel-') && schluessel.has('pid:' + m[1])) return 'pid:' + m[1];
  for (const h of cap.matchAll(/\/products\/([a-z0-9][a-z0-9-]*)/g)) if (schluessel.has('h:' + h[1])) return 'h:' + h[1];
  const kand = [zid.replace(/^bildreel-/, ''), zid.replace(/^(?:ki|kimi|img|clip|post|auto|fresh\d*|meta-auto)-/, '')];
  for (const k of [...kand, ...kand.map(k => k.replace(/-\d{1,8}$/, '')), ...String(row.produkte || '').split(/\s+/)])
    if (k && schluessel.has('h:' + k)) return 'h:' + k;
  const erste = cap.replace(/⏎/g, '\n').split('\n')[0].trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s+·\s+chf.*$/, '');
  if (erste && schluessel.has('titel:' + erste)) return 'titel:' + erste;
  return '';
}
