#!/usr/bin/env node
/* LuxeStyle — tiktok-autopost.mjs  (TikTok Content Posting API — Foto-Direktpost)
 *
 * Postet den nächsten fälligen Foto-Post (status=ready) aus social/posts_tiktok.csv direkt auf
 * TikTok über die offizielle Content Posting API (KEIN Drittanbieter). Foto-Modus (PHOTO),
 * Carousel bis 35 Bilder. Reines Node, keine Dependencies.
 *
 * Verifiziert (developers.tiktok.com, 2026):
 *   POST https://open.tiktokapis.com/v2/post/publish/content/init/
 *   Header: Authorization: Bearer <TIKTOK_ACCESS_TOKEN> · Content-Type: application/json
 *   Body:   media_type=PHOTO, post_mode=DIRECT_POST,
 *           post_info{title, description, privacy_level, disable_comment, auto_add_music},
 *           source_info{source:PULL_FROM_URL, photo_images:[urls], photo_cover_index}
 *
 * ⚠️ VORAUSSETZUNGEN (User, einmalig — siehe dropship/USER-CHECKLISTE.md):
 *   1. TikTok-for-Developers-App mit Scope `video.publish` (+ Login-Kit, OAuth).
 *   2. Domain `abannews.com` (Bild-Host) im App **URL-Prefix verifizieren** (Pflicht für PULL_FROM_URL).
 *   3. App-**Audit** für öffentliche Posts — sonst sind Posts nur privat (SELF_ONLY) sichtbar.
 *   4. User-Access-Token als Secret `TIKTOK_ACCESS_TOKEN` (Tokens laufen ab → ggf. Refresh-Flow).
 *
 * ENV:
 *   TIKTOK_ACCESS_TOKEN   (Pflicht; ohne = sauberer No-Op)
 *   TIKTOK_PRIVACY        (optional, Default PUBLIC_TO_EVERYONE; unaudited→TikTok erzwingt privat)
 *   MAX_PER_RUN=1 · DRY_RUN=1
 */
import fs from 'node:fs';

const CSV = new URL('../social/posts_tiktok.csv', import.meta.url).pathname;
const TOKEN = process.env.TIKTOK_ACCESS_TOKEN || '';
const PRIVACY = process.env.TIKTOK_PRIVACY || 'PUBLIC_TO_EVERYONE';
const MAX = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10) || 1);
const DRY = process.env.DRY_RUN === '1';
const ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/content/init/';
const COLS = ['id','scheduled_date','images','title','caption','status','posted_at','publish_id'];

// --- CSV (identisch zu den anderen Postern) ---
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

if(!TOKEN && !DRY){ console.log('Kein TIKTOK_ACCESS_TOKEN → No-op (nichts gepostet). Siehe USER-CHECKLISTE §TikTok.'); process.exit(0); }
if(!fs.existsSync(CSV)){ console.log('Keine social/posts_tiktok.csv → nichts zu tun.'); process.exit(0); }

const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);
const ready = data.filter(r => (r[idx.status]||'').trim()==='ready' && (r[idx.images]||'').trim());
if(ready.length===0){ console.log('Kein TikTok-Post mit status=ready — nichts zu tun.'); process.exit(0); }

console.log(`TikTok-Queue · ready: ${ready.length} · MAX_PER_RUN: ${MAX} · privacy: ${PRIVACY}`);
let posted = 0, anyFail = false;

for(const next of ready.slice(0, MAX)){
  const images = (next[idx.images]||'').split('|').map(s=>s.trim()).filter(Boolean);
  const title = (next[idx.title]||'').slice(0,90);
  const description = (next[idx.caption]||'').slice(0,4000);
  if(images.length===0){ next[idx.status]='skipped-noimg'; anyFail=true; continue; }
  console.log(`→ TikTok ${next[idx.id]} | ${images.length} Bild(er) | ${images[0]}`);
  if(DRY){ console.log(`   DRY_RUN: würde Direktpost (PHOTO) senden.`); posted++; continue; }

  const body = {
    media_type: 'PHOTO',
    post_mode: 'DIRECT_POST',
    post_info: { title, description, privacy_level: PRIVACY, disable_comment: false, auto_add_music: true },
    source_info: { source: 'PULL_FROM_URL', photo_images: images, photo_cover_index: 0 },
  };
  try{
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(()=>({}));
    const pubId = j?.data?.publish_id;
    if(r.ok && pubId){
      next[idx.status]='posted'; next[idx.posted_at]=new Date().toISOString(); next[idx.publish_id]=pubId;
      posted++; console.log('   ✅ TikTok angenommen, publish_id:', pubId);
    } else {
      anyFail = true;
      console.error('   ❌ TikTok-Fehler:', r.status, JSON.stringify(j?.error||j));
      const msg = j?.error?.message || '';
      if(/url ownership|unverified|domain/i.test(msg))
        console.error('   ↳ FIX: Bild-Domain (abannews.com) im TikTok-App unter „URL properties" verifizieren.');
      if(/scope|permission/i.test(msg))
        console.error('   ↳ FIX: App/Token braucht Scope video.publish.');
    }
  }catch(e){ anyFail = true; console.error('   ❌ Netzfehler:', e.message); }
}

if(!DRY && posted>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${posted} an TikTok gesendet${DRY?' (DRY)':''}.`);
// publish_id = Annahme durch TikTok; finaler Status via /v2/post/publish/status/fetch/ abrufbar.
process.exit(anyFail && posted===0 ? 1 : 0);
