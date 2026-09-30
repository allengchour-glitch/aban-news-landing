/**
 * tor_quellen_anfragen.mjs — Quellvideos für vom Meisterwerk-Tor gesperrte Reels über den Server holen (30.09.2026).
 *
 * ANLASS: 36 Reels stehen auf `meisterwerk-tor-skip` (HOOK < 3,0 — fester Einstieg bei 2 s). reel/reel_neu_rendern.py
 * MODUS=hook schneidet sie mit der bewegtesten Sekunde neu, braucht dafür aber die Quelle in auftraege/ergebnis/ —
 * vorhanden für 13, fehlend für 23. Die Cloud erreicht den CJ-Download-Host nicht (Proxy 403, 27.09.), die CJ-API schon:
 * Adresse hier holen (queryVideosByProductId, über cj_takt), Download auf dem Server (automation/browser/cj_quellvideo_holen.mjs,
 * höchstens 3 Videos je Auftrag). Merkliste wie der Reel-Motor: dropship/_reel_serverquelle.txt (24 h nicht erneut fragen).
 *
 *   /opt/node22/bin/node automation/reel/tor_quellen_anfragen.mjs        → Trockenlauf (zeigt pids, fragt CJ nicht)
 *   SCHARF=1 /opt/node22/bin/node automation/reel/tor_quellen_anfragen.mjs [MAX=24]
 * git add/commit/push macht der Aufrufer (die Aufträge wirken erst auf origin).
 */
import fs from 'node:fs';
import { takt as cjTakt } from '../cj_takt.mjs';

process.chdir(new URL('../..', import.meta.url).pathname);
const SCHARF = process.env.SCHARF === '1';
const MAX = +(process.env.MAX || 24);
const CSV = 'automation/reels_seed.csv';
const SQ_MERK = 'dropship/_reel_serverquelle.txt';
const sqName = pid => ('rq-' + String(pid).toLowerCase().replace(/[^a-z0-9-]/g, '')).slice(0, 41);   // wie der Reel-Motor
const sleep = ms => new Promise(r => setTimeout(r, ms));

function csvZeilen(t) {   // RFC-4180: Captions enthalten Zeilenumbrüche und Kommas in Anführungszeichen
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function ids() {
  const [h, ...rows] = csvZeilen(fs.readFileSync(CSV, 'utf8'));
  const iid = h.indexOf('id'), ist = h.indexOf('status');
  return [...new Set(rows.filter(r => /^cjreel-/.test(r[iid] || '') && r[ist] === 'meisterwerk-tor-skip').map(r => r[iid].slice(7)))];
}
function hatQuelle(pid) {
  const n = sqName(pid);
  try { return fs.readdirSync('auftraege/ergebnis').some(f => f.endsWith(`-${n}.mp4`)); } catch { return false; }
}
function angefragt(pid) {
  try { const jetzt = Date.now(); return fs.readFileSync(SQ_MERK, 'utf8').split('\n').some(z => { const [p, d] = z.split('\t'); return p === pid && jetzt - Date.parse(d) < 864e5; }); }
  catch { return false; }
}
async function cjVideo(pid, tok) {
  let grund = '';
  for (let a = 0; a < 3; a++) {
    await cjTakt();
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/queryVideosByProductId', { method: 'POST',
        headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: String(pid) }) });
      const j = await r.json();
      if (j?.code === 1600200) { grund = 'gedrosselt'; await sleep(8000); continue; }
      if (j?.code === 16900500) throw new Error('CJ-Tagesbudget erschoepft');
      const v = (Array.isArray(j?.data) ? j.data : []).filter(x => x?.videoUrl).sort((a, b) => (b.videoSize || 0) - (a.videoSize || 0))[0];
      return v ? v.videoUrl : '';
    } catch (e) { if (/Tagesbudget/.test(String(e))) throw e; grund = String(e.message || e).slice(0, 100); await sleep(3000); }
  }
  throw new Error(`CJ ohne Antwort (${grund})`);
}

const offen = ids().filter(p => !hatQuelle(p) && !angefragt(p)).slice(0, MAX);
console.log(`START ${new Date().toISOString().slice(0, 16)}Z: ${offen.length} gesperrte Reels ohne Quelle · ${SCHARF ? 'SCHARF' : 'TROCKEN'}`);
if (!SCHARF) { for (const p of offen) console.log('  ' + p); process.exit(0); }
const tok = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json') ? JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '' : '')).trim();
if (!tok) { console.error('Kein CJ-Token (/tmp/cj_token.json)'); process.exit(2); }
const liste = []; let kein = 0;
for (const pid of offen) {
  const url = await cjVideo(pid, tok);
  if (/^https:\/\/download-only-api\.cjdropshipping\.com\/.+\.mp4$/i.test(url)) liste.push({ pid, url });
  else { kein++; console.log(`  ${pid}: kein ladbares CJ-Video (${url ? url.slice(0, 60) : 'leer'})`); }
}
fs.mkdirSync('auftraege/offen', { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
for (let i = 0; i < liste.length; i += 3) {
  const id = `cj-torquellen-${stamp}-${String.fromCharCode(97 + i / 3)}`;
  const teil = liste.slice(i, i + 3);
  fs.writeFileSync(`auftraege/offen/${id}.json`, JSON.stringify({ id, typ: 'skript', skript: 'cj_quellvideo_holen.mjs',
    warum: 'Meisterwerk-Tor sperrte Reels (HOOK < 3,0); reel_neu_rendern.py MODUS=hook schneidet sie mit neuem Einstieg neu.',
    videos: teil.map(x => ({ name: sqName(x.pid), url: x.url })) }, null, 2) + '\n');
  console.log(`  📮 ${id}: ${teil.map(x => x.pid).join(', ')}`);
}
const d = new Date().toISOString();
if (liste.length) fs.appendFileSync(SQ_MERK, liste.map(x => `${x.pid}\t${d}`).join('\n') + '\n');
console.log(`FERTIG: ${liste.length} angefragt in ${Math.ceil(liste.length / 3)} Aufträgen · ${kein} ohne CJ-Video`);
