#!/usr/bin/env node
/* cj_perpetual — Dauer-Import-Treiber ("ohne pause"): füllt KLEIDER/MODE zuerst tief,
 * dann alle anderen sauber kategorisierten CJ-Gruppen. Ruft `cj_category_fill.mjs` je Gruppe
 * als Kindprozess (GRP + CAP + MAXPAGE/PERCAT). Idempotent via Ledger (dropship/cj_niche_done.txt).
 *
 * KERN: CJ hat ein TAGESPUNKTE-Limit (~50k). Bei Erschöpfung liefert die API code 16900500.
 * Der Treiber ERKENNT das und WARTET auf den Tages-Reset (statt zu crashen) → grindet jeden Tag
 * die vollen Punkte, unbeaufsichtigt, Richtung 100k Produkte.
 *
 * ENV: SHOPIFY_CLIENT_ID/SECRET · GEMINI (/tmp/gemini_key) · CJ_TOKEN (oder /tmp/cj_token.json).
 * Optional: ONCE=1 (nur eine Welle, kein Endlos) · CLOTHES_CAP=80 · REST_CAP=40.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

let CJT = (process.env.CJ_TOKEN || '').trim();
if (!CJT && fs.existsSync('/tmp/cj_token.json')) {
  try { const j = JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')); CJT = (j.accessToken || j.data?.accessToken || '').trim(); } catch {}
}
if (!CJT) { console.error('Kein CJ_TOKEN (env oder /tmp/cj_token.json). Abbruch.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Reihenfolge: PRIORITY-Gruppen zuerst (tief), dann Kleider/Mode, dann breite Abdeckung.
// PRIORITY per Env übersteuerbar (Komma-Liste), Default Elektronik-Fokus (User-Auftrag 2026-07-06).
const PRIORITY = (process.env.PRIORITY || 'cjelektronik,cjgadgets,gaming').split(',').map(s => s.trim()).filter(Boolean);
const CLOTHES = ['cjdamen', 'cjherren'];
const REST = ['cjauto', 'cjbasteln', 'cjspielelektronik', 'cjschuhedamen', 'cjschuheherren', 'cjsneaker', 'cjschuhekids',
  'cjtaschen', 'cjschmuck', 'cjuhren', 'cjhome', 'cjbeautytools', 'cjhaustier',
  'cjelektronik', 'cjgadgets', 'skincare', 'makeup', 'nagel', 'kueche', 'storage', 'sport', 'pet', 'gaming', 'musik', 'cj3d']
  .filter(g => !PRIORITY.includes(g));

const CLOTHES_CAP = Number(process.env.CLOTHES_CAP || 80);
const REST_CAP = Number(process.env.REST_CAP || 40);
const MINPTS = 200;            // unter so vielen Restpunkten lohnt keine Welle mehr
const WAIT_EXHAUST = 1800000;  // 30 Min warten, wenn Punkte leer (Reset abwarten)
const PROBE_CAT = 'D2432903-0D4E-4787-886F-D3D9DA7890D9'; // Lady Dresses (Kleider)

async function points() {
  try {
    const r = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/list?pageSize=1&pageNum=1&categoryId=${PROBE_CAT}`, { headers: { 'CJ-Access-Token': CJT } });
    const j = await r.json();
    return { code: j.code, remaining: j.pointsInfo?.remaining ?? null, used: j.pointsInfo?.usedToday ?? null };
  } catch (e) { return { code: -1, remaining: null, used: null }; }
}

function run(grp, cap, extra) {
  return new Promise(res => {
    const env = { ...process.env, CJ_TOKEN: CJT, GRP: grp, CAP: String(cap), ...extra };
    const ch = spawn('/opt/node22/bin/node', ['automation/cj_category_fill.mjs'], { env, stdio: ['ignore', 'inherit', 'inherit'] });
    ch.on('exit', code => res(code));
    ch.on('error', () => res(-1));
  });
}

// "CJ ALLES": globaler Katalog-Sweep (cj_trending_import mit Seiten-Cursor) — frisst Restpunkte der Welle.
function runAllSweep() {
  return new Promise(res => {
    const env = { ...process.env, CJ_TOKEN: CJT, CAP: String(process.env.ALL_CAP || 300), PAGES: String(process.env.ALL_PAGES || 30), GSLEEP: '3500', CJSLEEP: '900' };
    const ch = spawn('/opt/node22/bin/node', ['automation/cj_trending_import.mjs'], { env, stdio: ['ignore', 'inherit', 'inherit'] });
    ch.on('exit', code => res(code));
    ch.on('error', () => res(-1));
  });
}

function exhausted(pt) { return pt.code === 16900500 || (pt.remaining !== null && pt.remaining < MINPTS); }

async function waitForPoints() {
  while (true) {
    const pt = await points();
    if (!exhausted(pt) && (pt.code === 200 || pt.code === 0)) return pt;
    if (exhausted(pt)) { console.log(`[${now()}] CJ-Punkte erschöpft (used ${pt.used}, rem ${pt.remaining}). Warte auf Tages-Reset…`); await sleep(WAIT_EXHAUST); }
    else { console.log(`[${now()}] Probe-Code ${pt.code} — warte 5 Min.`); await sleep(300000); }
  }
}

let round = 0;
do {
  round++;
  const pt = await waitForPoints();
  console.log(`[${now()}] Runde ${round}: ${pt.remaining} Punkte frei. Import-Welle — PRIORITY [${PRIORITY.join(', ')}] zuerst.`);
  // 0) Prioritäts-Gruppen tief füllen (z. B. Elektronik)
  for (const g of PRIORITY) {
    await run(g, CLOTHES_CAP, { MAXPAGE: '25', PERCAT: '40', GSLEEP: '3500', CJSLEEP: '900' });
    if (exhausted(await points())) break;
  }
  // 1) Kleider tief füllen
  for (const g of CLOTHES) {
    if (exhausted(await points())) break;
    await run(g, CLOTHES_CAP, { MAXPAGE: '25', PERCAT: '40', GSLEEP: '3500', CJSLEEP: '900' });
  }
  // 2) Rest breit füllen
  for (const g of REST) {
    if (exhausted(await points())) break;
    await run(g, REST_CAP, { MAXPAGE: '12', PERCAT: '20', GSLEEP: '3500', CJSLEEP: '900' });
  }
  // 3) Video-Kategorie kopieren: nur Produkte MIT CJ-Video (User 2026-07-06)
  if (!exhausted(await points())) {
    console.log(`[${now()}] Stufe 3: VIDEO-Sweep (nur Produkte mit CJ-Video).`);
    await new Promise(res => {
      const env = { ...process.env, CJ_TOKEN: CJT, VIDEO_ONLY: '1', CAP: '120', PAGES: '40', GSLEEP: '3500', CJSLEEP: '1400' };
      const ch = spawn('/opt/node22/bin/node', ['automation/cj_trending_import.mjs'], { env, stdio: ['ignore', 'inherit', 'inherit'] });
      ch.on('exit', res); ch.on('error', () => res(-1));
    });
  }
  // 4) "CJ ALLES": globaler Sweep durch den ganzen Katalog (Cursor merkt sich die Seite)
  if (!exhausted(await points())) {
    console.log(`[${now()}] Stufe 4: CJ-ALLES-Sweep (globaler Katalog, Cursor-Fortsetzung).`);
    await runAllSweep();
  }
  console.log(`[${now()}] Runde ${round} fertig.`);
  await sleep(8000);
} while (process.env.ONCE !== '1');

console.log(`[${now()}] cj_perpetual beendet (ONCE).`);
