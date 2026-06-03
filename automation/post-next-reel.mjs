#!/usr/bin/env node
/* aban/LuxeStyle — post-next-reel.mjs
 * Selbstgemachtes Automatik-Tool: nimmt das nächste freigegebene Reel (status=ready) aus
 * automation/reels_seed.csv, schickt es an den Make-Webhook (→ Buffer → TikTok + Instagram),
 * markiert die Zeile als posted und schreibt die CSV zurück.
 * Wird von .github/workflows/reel-autopost.yml alle 4h aufgerufen.
 * No-op (Exit 0), wenn kein Webhook-Secret gesetzt ist oder keine Zeile 'ready' ist.
 *
 * ENV:
 *   MAKE_REEL_WEBHOOK  (Pflicht für echtes Posten; sonst Trockenlauf/No-op)
 *   DRY_RUN=1          (optional: nur loggen, nichts senden/schreiben)
 */
import fs from 'node:fs';

const CSV = new URL('./reels_seed.csv', import.meta.url).pathname;
// Default = der bestehende Make-Webhook aus dem abannews/dropship-Setup (Buffer bereits verbunden).
// Per Secret MAKE_REEL_WEBHOOK überschreibbar. (Webhook steht bereits in dropship/CJ-IMPORT-LOG.md.)
const HOOK = process.env.MAKE_REEL_WEBHOOK || 'https://hook.eu1.make.com/pkgmkm46y3aw6r3fy4ttedr5os7yn0ly';
const DRY = process.env.DRY_RUN === '1';
const COLS = ['id','scheduled_date','video_url','caption','hashtags','platforms','status','posted_at','post_url'];

// --- minimal CSV parse/serialize (RFC-4180-ish, handles quotes/commas/newlines) ---
function parse(text){
  const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; } else field+=c; }
    else { if(c==='"')q=true; else if(c===','){row.push(field);field='';}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(c==='\r'){} else field+=c; } }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.length>1||(r.length===1&&r[0]!==''));
}
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function serialize(rows){ return rows.map(r=>r.map(esc).join(',')).join('\n')+'\n'; }

const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);

const next = data.find(r => (r[idx.status]||'').trim()==='ready' && (r[idx.video_url]||'').trim());
if(!next){ console.log('Kein Reel mit status=ready & video_url — nichts zu tun.'); process.exit(0); }

const payload = {
  id: next[idx.id], video_url: next[idx.video_url], caption: next[idx.caption],
  hashtags: next[idx.hashtags], platforms: next[idx.platforms],
  posted_at: new Date().toISOString()
};
console.log('Nächstes Reel:', payload.id, '→', payload.platforms, '|', payload.video_url);

if(!HOOK || DRY){
  console.log(HOOK ? 'DRY_RUN: würde an Webhook senden.' : 'Kein MAKE_REEL_WEBHOOK gesetzt → No-op (nichts gepostet).');
  process.exit(0);
}

const res = await fetch(HOOK, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
  .catch(e=>{ console.error('Webhook-Fehler:', e.message); process.exit(1); });
if(!res.ok){ console.error('Webhook HTTP', res.status); process.exit(1); }

// Erfolg → Zeile als posted markieren
next[idx.status] = 'posted';
next[idx.posted_at] = payload.posted_at;
fs.writeFileSync(CSV, serialize(rows));
console.log('✅ Reel', payload.id, 'an Make/Buffer gesendet + als posted markiert.');
