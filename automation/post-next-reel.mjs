#!/usr/bin/env node
/* LuxeStyle — post-next-reel.mjs  (Eigentool, KEIN Make nötig)
 * Nimmt das nächste freigegebene Reel (status=ready) aus automation/reels_seed.csv und
 * veröffentlicht es über die GLEICHE Mechanik wie das abannews-Eigentool social/post.py:
 *   - PUBLISH_WEBHOOK_URL  → generischer Fan-out an n8n (gratis, self-hosted) → TikTok + Instagram.
 *     (n8n-Workflow liegt im Repo: social/n8n-publish-workflow.json · Doku: social/N8N-WEBHOOK.md)
 *   - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID → direkte Benachrichtigung (Zero-Relay, ohne SaaS).
 * Markiert die Zeile als posted, sobald MINDESTENS ein Kanal geklappt hat.
 * Wird von .github/workflows/reel-autopost.yml alle 4h aufgerufen.
 * No-op (Exit 0), wenn kein Kanal konfiguriert ist oder keine Zeile 'ready' ist — nie ein harter Fehler.
 *
 * Tokens/URLs kommen NUR aus Umgebungsvariablen bzw. GitHub-Actions-Secrets — nie im Code.
 * ENV:
 *   PUBLISH_WEBHOOK_URL   (n8n/generischer Webhook → IG/TikTok; abannews-kompatibel)
 *   MAKE_REEL_WEBHOOK     (Legacy-Alias, optional — falls jemand noch Make nutzt)
 *   TELEGRAM_BOT_TOKEN    + TELEGRAM_CHAT_ID  (direkte Telegram-Meldung)
 *   DRY_RUN=1             (optional: nur loggen, nichts senden/schreiben)
 */
import fs from 'node:fs';

const CSV = new URL('./reels_seed.csv', import.meta.url).pathname;
const WEBHOOK = process.env.PUBLISH_WEBHOOK_URL || process.env.MAKE_REEL_WEBHOOK || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';
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

const caption = next[idx.caption] || '';
const hashtags = next[idx.hashtags] || '';
const videoUrl = next[idx.video_url];
// Webhook-Payload: Reel-Felder + abannews-kompatible Felder (text/url/tags) für social/post.py-artige n8n-Flows.
const payload = {
  id: next[idx.id], video_url: videoUrl, caption, hashtags,
  platforms: next[idx.platforms], posted_at: new Date().toISOString(),
  text: (caption + (hashtags ? '\n' + hashtags : '')).trim(), url: videoUrl,
  tags: hashtags.split(/\s+/).filter(Boolean).map(t=>t.replace(/^#/,'')),
};
console.log('Nächstes Reel:', payload.id, '→', payload.platforms, '|', videoUrl);

const active = [WEBHOOK && 'webhook', (TG_TOKEN && TG_CHAT) && 'telegram'].filter(Boolean);
if(active.length===0){
  console.log('Kein Kanal konfiguriert (PUBLISH_WEBHOOK_URL oder TELEGRAM_*) → No-op (nichts gepostet).');
  process.exit(0);
}
if(DRY){ console.log('DRY_RUN: würde senden an:', active.join(', ')); process.exit(0); }

let ok = false;
// 1) Generischer Webhook (n8n → TikTok/Instagram)
if(WEBHOOK){
  try{
    const res = await fetch(WEBHOOK, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.ok){ ok = true; console.log('webhook: gesendet (', res.status, ')'); }
    else console.error('webhook: HTTP', res.status);
  }catch(e){ console.error('webhook: Fehler', e.message); }
}
// 2) Direkte Telegram-Meldung (Zero-Relay)
if(TG_TOKEN && TG_CHAT){
  try{
    const body = new URLSearchParams({ chat_id: TG_CHAT,
      text: `🎬 Neues Reel live → ${payload.platforms}\n${payload.text}\n${videoUrl}`,
      disable_web_page_preview: 'false' });
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method:'POST', body });
    if(res.ok){ ok = true; console.log('telegram: gesendet'); }
    else console.error('telegram: HTTP', res.status);
  }catch(e){ console.error('telegram: Fehler', e.message); }
}

if(!ok){ console.error('Kein Kanal erfolgreich — Zeile bleibt ready (nächster Lauf versucht erneut).'); process.exit(1); }

next[idx.status] = 'posted';
next[idx.posted_at] = payload.posted_at;
fs.writeFileSync(CSV, serialize(rows));
console.log('✅ Reel', payload.id, 'veröffentlicht (', active.join('+'), ') + als posted markiert.');
