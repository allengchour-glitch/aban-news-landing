#!/usr/bin/env node
/* frosch_maske_import.mjs — holt die virale Frosch-Plüsch-Schlafmaske (User-Fund 16.08.2026,
 * Meme-Reel «Gefunden auf Amazon») und Verwandte (Tier-Plüschmasken). Muster wie
 * schulstart_import: bei jedem Aufseher-Durchlauf kurz Punkte probieren, dann durchziehen.
 * Nach Erfolg FERTIG; die Startseiten-Aufnahme (hype-jetzt) passiert BEWUSST NICHT hier —
 * erst nach Bildprüfung in einer betreuten Runde (NUR_RAEUMEN-Regel vom 16.08.).
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const CJT = (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cj(path) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path,
        { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
      const j = JSON.parse(await r.text());
      if (Number(j.code) === 1600200) { await sleep(2500 * (i + 1)); continue; }
      return j;
    } catch { await sleep(2000 * (i + 1)); }
  }
  return { code: 0 };
}

const MUSS = /(frog|animal|duck|panda|shrek|plush).{0,25}(eye|sleep).{0,12}mask|sleep.{0,10}mask.{0,20}(plush|frog|funny|cartoon)/i;

async function main() {
  const probe = await cj('/product/list?pageNum=1&pageSize=1&productNameEn=mask');
  if (Number(probe.code) === 16900500) { console.log('PAUSE (CJ-Punkte leer, nächster Versuch beim nächsten Durchlauf)'); return; }
  if (Number(probe.code) !== 200) { console.log('CJ nicht erreichbar:', probe.code); return; }

  const tref = [];
  for (const q of ['frog eye mask plush', 'plush sleep mask funny', 'cartoon sleep eye mask']) {
    for (let s = 1; s <= 3; s++) {
      const j = await cj(`/product/list?pageNum=${s}&pageSize=50&productNameEn=${encodeURIComponent(q)}`);
      if (Number(j.code) === 16900500) { console.log('PAUSE (Punkte leer mitten in der Suche)'); return; }
      for (const p of (j.data || {}).list || [])
        if (MUSS.test(p.productNameEn || '')) tref.push(p);
      await sleep(2200);
      if (tref.length >= 4) break;
    }
    if (tref.length >= 4) break;
  }
  tref.sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));
  const pids = [...new Set(tref.slice(0, 2).map(p => p.pid))];
  if (!pids.length) { console.log('FERTIG: kein sauberer Treffer — Suchbegriffe erweitern.'); return; }
  for (const p of tref.slice(0, 4)) console.log(' ', p.pid, '|', String(p.productNameEn).slice(0, 60), '| $' + p.sellPrice);

  const r = spawnSync('/opt/node22/bin/node', ['automation/cj_sku_import.mjs'], {
    encoding: 'utf8', timeout: 1200000,
    env: { ...process.env, CJ_TOKEN: CJT, ITEMS: pids.map(p => 'pid:' + p).join(',') },
  });
  console.log((r.stdout || '').slice(-1200));
  console.log('FERTIG: Frosch-Masken-Import —', pids.length, 'Kandidaten übergeben. (Startseite: erst nach Bildprüfung taggen!)');
}

main();
