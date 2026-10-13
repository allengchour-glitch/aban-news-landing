// werbetest_sperre.mjs — Produkte im laufenden Werbetest nicht anfassen (13.10.2026).
// Gleiche Regeln wie automation/werbetest_sperre.py (dort die Begründung):
//   dropship/_werbetest_sperre.txt · Kopf «# ende: JJJJ-MM-TT» Pflicht (ohne Ende gilt nichts) ·
//   je Zeile «<Produkt-ID oder GID> [handle] [bis:JJJJ-MM-TT] # Kommentar» · nach dem Ende (UTC-Datum) ignoriert.
//   import { gesperrt, HINWEIS } from './lib/werbetest_sperre.mjs';
//   if (gesperrt(p.id) || gesperrt(handle)) { console.log('  ' + HINWEIS, handle); continue; }
//   node automation/lib/werbetest_sperre.mjs --selbsttest
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const DATEI = process.env.WERBETEST_SPERRE || path.join(HIER, '..', '..', 'dropship', '_werbetest_sperre.txt');
export const HINWEIS = 'übersprungen (Werbetest-Sperre)';

const heuteUTC = () => new Date().toISOString().slice(0, 10);
const pid = x => { const m = String(x ?? '').trim().match(/^(?:gid:\/\/shopify\/Product\/)?(\d{6,})$/); return m ? m[1] : null; };
const datumOk = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

export function lesen(text, heute = heuteUTC()) {
  let ende = null; const zeilen = [];
  for (const roh of String(text || '').split('\n')) {
    const z = roh.trim(); if (!z) continue;
    if (z.startsWith('#')) { const m = z.match(/^#\s*ende\s*:\s*(\d{4}-\d{2}-\d{2})/i); if (m) ende = datumOk(m[1]) ? m[1] : null; continue; }
    zeilen.push(z.split('#')[0].trim().split(/\s+/).filter(Boolean));
  }
  const ids = new Set(), handles = new Set();
  if (!ende || heute > ende) return { ids, handles, ende };
  for (const teile of zeilen) {
    if (!teile.length) continue;
    const bis = teile.find(t => t.toLowerCase().startsWith('bis:'));
    if (bis && datumOk(bis.slice(4)) && heute > bis.slice(4)) continue;
    const p = pid(teile[0]); if (!p) continue;
    ids.add(p);
    for (const t of teile.slice(1)) if (!t.toLowerCase().startsWith('bis:')) handles.add(t.toLowerCase());
  }
  return { ids, handles, ende };
}

let cache = null;
export function laden(datei = DATEI, heute = heuteUTC()) {
  let st; try { st = fs.statSync(datei); } catch { return { ids: new Set(), handles: new Set(), ende: null }; }
  const k = `${datei}|${st.mtimeMs}|${heute}`;
  if (!cache || cache.k !== k) cache = { k, s: lesen(fs.readFileSync(datei, 'utf8'), heute) };
  return cache.s;
}

export function gesperrt(x, datei = DATEI, heute = heuteUTC()) {
  const { ids, handles } = laden(datei, heute);
  if (!ids.size) return false;
  const p = pid(x);
  return p ? ids.has(p) : handles.has(String(x ?? '').trim().toLowerCase());
}

function selbsttest() {
  const t = `# Werbetest A
# ende: 2026-10-24
15453601890689  silberarmband-614500   # Silberarmband
gid://shopify/Product/15454414111105 luminous-sonne-mond-stern-herren-mechanische-u-602700
15412915110273 abendkleid-sirene bis:2026-10-15
kein-id-zeile
`;
  const eq = (a, b) => a.size === b.length && b.every(x => a.has(x));
  const f = [
    ['Ende gelesen', lesen(t, '2026-10-14').ende === '2026-10-24'],
    ['3 IDs aktiv am 14.10.', eq(lesen(t, '2026-10-14').ids, ['15453601890689', '15454414111105', '15412915110273'])],
    ['Handle-Spalte', lesen(t, '2026-10-14').handles.has('silberarmband-614500')],
    ['Zeile ohne ID ignoriert', !lesen(t, '2026-10-14').handles.has('kein-id-zeile')],
    ['am Endtag noch gültig', lesen(t, '2026-10-24').ids.size === 2],
    ['nach Ende leer', lesen(t, '2026-10-25').ids.size === 0],
    ['bis: früher abgelaufen', !lesen(t, '2026-10-16').ids.has('15412915110273')],
    ['ohne Ende-Zeile gilt nichts', lesen('15453601890689 x\n', '2026-10-14').ids.size === 0],
    ['leere Datei', lesen('', '2026-10-14').ids.size === 0],
  ];
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wts-')), 'sperre.txt');
  fs.writeFileSync(tmp, t);
  const h = '2026-10-14';
  f.push(
    ['gesperrt: Ziffern', gesperrt('15453601890689', tmp, h)],
    ['gesperrt: GID', gesperrt('gid://shopify/Product/15454414111105', tmp, h)],
    ['gesperrt: Zahl', gesperrt(15453601890689, tmp, h)],
    ['gesperrt: Handle (Gross/klein)', gesperrt('Silberarmband-614500', tmp, h)],
    ['nicht gesperrt: fremde ID', !gesperrt('gid://shopify/Product/15500372771201', tmp, h)],
    ['nicht gesperrt: fremder Handle', !gesperrt('silberarmband', tmp, h)],
    ['nach Ende frei', !gesperrt('15453601890689', tmp, '2026-10-25')],
    ['Datei fehlt → frei', !gesperrt('15453601890689', tmp + '.fehlt', h)],
  );
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  const fehler = f.filter(([, ok]) => !ok);
  for (const [n, ok] of f) console.log((ok ? '  ok  ' : '  FEHLER ') + n);
  console.log(`Selbsttest werbetest_sperre.mjs: ${f.length - fehler.length}/${f.length}`);
  return !fehler.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selbsttest')) process.exit(selbsttest() ? 0 : 1);
  const { ids, ende } = laden();
  console.log(`Werbetest-Sperre ${DATEI}: ${ids.size} Produkte aktiv, Ende ${ende || '—'}`);
  for (const i of [...ids].sort()) console.log('  ', i);
}
