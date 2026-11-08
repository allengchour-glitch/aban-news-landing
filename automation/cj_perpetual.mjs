#!/usr/bin/env node
/* cj_perpetual — Dauer-Import-Treiber ("ohne pause"): füllt KLEIDER/MODE zuerst tief,
 * dann alle anderen sauber kategorisierten CJ-Gruppen. Ruft `cj_category_fill.mjs` je Gruppe
 * als Kindprozess (GRP + CAP + MAXPAGE/PERCAT). Idempotent via Ledger (dropship/cj_niche_done.txt).
 *
 * KERN: CJ hat ein TAGESPUNKTE-Limit (~50k). Bei Erschöpfung oder unbekanntem
 * Punkte-Status bricht der Treiber fail-closed ab. Ein Endloslauf braucht ein
 * separates, ausdrückliches Gate; Vorgabe ist genau eine begrenzte Welle.
 *
 * ENV: SHOPIFY_CLIENT_ID/SECRET · GEMINI (/tmp/gemini_key) · CJ_TOKEN (oder /tmp/cj_token.json).
 * Optional: ONCE=0 + CJ_IMPORT_PERPETUAL_APPROVED=1 (Endloslauf) · Caps max. 20.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjImportWriteFreigegeben } from './lib/cj_import_guard.mjs';

if (!cjImportWriteFreigegeben(process.env)) {
  console.error('Abbruch: Dauerimport benoetigt DRY=0 und CJ_IMPORT_WRITE_APPROVED=1; Vorgabe ist Vorschau.');
  process.exit(2);
}
const ENDLOS = process.env.ONCE === '0' && process.env.CJ_IMPORT_PERPETUAL_APPROVED === '1';

let CJT = (process.env.CJ_TOKEN || '').trim();
if (!CJT && fs.existsSync('/tmp/cj_token.json')) {
  try { const j = JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')); CJT = (j.accessToken || j.data?.accessToken || '').trim(); } catch {}
}
if (!CJT) { console.error('Kein CJ_TOKEN (env oder /tmp/cj_token.json). Abbruch.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Reihenfolge: Kleider/Mode zuerst (voll), dann breite Abdeckung aller sauberen Gruppen.
const CLOTHES = ['cjdamen', 'cjherren'];
const REST = ['cjtaschen', 'cjschmuck', 'cjuhren', 'cjhome', 'cjbeautytools', 'cjhaustier',
  'cjelektronik', 'cjgadgets', 'skincare', 'makeup', 'nagel', 'kueche', 'storage', 'sport', 'pet', 'gaming', 'musik', 'cj3d'];

const CLOTHES_CAP = Math.min(20, Math.max(1, Number(process.env.CLOTHES_CAP || 12) || 12));
const REST_CAP = Math.min(20, Math.max(1, Number(process.env.REST_CAP || 12) || 12));
const MINPTS = 200;            // unter so vielen Restpunkten lohnt keine Welle mehr
const PROBE_CAT = 'D2432903-0D4E-4787-886F-D3D9DA7890D9'; // Lady Dresses (Kleider)

async function points() {
  const j = await cjFetch(`https://developers.cjdropshipping.com/api2.0/v1/product/list?pageSize=1&pageNum=1&categoryId=${PROBE_CAT}`, {
    context: 'CJ-Punkteprobe Dauerimport', headers: { 'CJ-Access-Token': CJT },
  });
  return { code: j.code, remaining: j.pointsInfo?.remaining ?? null, used: j.pointsInfo?.usedToday ?? null };
}

function run(grp, cap, extra) {
  return new Promise(res => {
    const env = { ...process.env, CJ_TOKEN: CJT, GRP: grp, CAP: String(cap), ...extra };
    const ch = spawn(process.execPath, ['automation/cj_category_fill.mjs'], { env, stdio: ['ignore', 'inherit', 'inherit'] });
    ch.on('exit', code => res(code));
    ch.on('error', () => res(-1));
  });
}

function exhausted(pt) { return pt.code === 16900500 || (pt.remaining !== null && pt.remaining < MINPTS); }

async function waitForPoints() {
  const pt = await points();
  if (!Number.isFinite(pt.remaining) || !Number.isFinite(pt.used)) {
    throw new Error('CJ_STATUS_UNKNOWN: Punkteprobe ohne vollstaendige pointsInfo');
  }
  if (!exhausted(pt) && (pt.code === 200 || pt.code === 0)) return pt;
  if (exhausted(pt)) throw new Error(`CJ_QUOTA: Punkte erschoepft (used ${pt.used}, rem ${pt.remaining})`);
  throw new Error(`CJ_STATUS_UNKNOWN: Punkteprobe code=${pt.code}`);
}

let round = 0;
do {
  round++;
  const pt = await waitForPoints();
  console.log(`[${now()}] Runde ${round}: ${pt.remaining} Punkte frei. Import-Welle — KLEIDER zuerst.`);
  // 1) Kleider tief füllen
  for (const g of CLOTHES) {
    const code = await run(g, CLOTHES_CAP, { MAXPAGE: '5', PERCAT: '10', GSLEEP: '3500', CJSLEEP: '900' });
    if (code !== 0) throw new Error(`CJ_CHILD_FAILED: ${g} exit=${code}`);
    await waitForPoints();
  }
  // 2) Rest breit füllen
  for (const g of REST) {
    await waitForPoints();
    const code = await run(g, REST_CAP, { MAXPAGE: '5', PERCAT: '10', GSLEEP: '3500', CJSLEEP: '900' });
    if (code !== 0) throw new Error(`CJ_CHILD_FAILED: ${g} exit=${code}`);
  }
  console.log(`[${now()}] Runde ${round} fertig.`);
  await sleep(8000);
} while (ENDLOS);

console.log(`[${now()}] cj_perpetual beendet (${ENDLOS ? 'Endlosschalter beendet' : 'eine Welle, Vorgabe'}).`);
