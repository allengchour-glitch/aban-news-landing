#!/usr/bin/env node
/* queue_winner_reels.mjs — laedt die 6 veredelten Winner-Reels (reels/winner-*-ig.mp4) auf die Shopify-CDN
 * (via upload_to_shopify_cdn.mjs) und haengt sie mit den Captions aus automation/winner_reel_captions.json
 * an social/video_queue.csv (Quelle fuer build_queue -> queue.json -> Worker postet IG/FB). Idempotent per id.
 * Laeuft auf dem PC (Shopify-Creds fuer Upload). DRY_RUN=1. No-op ohne Creds/Captions.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1]
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const DRY=process.env.DRY_RUN==='1';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(String(m)); console.log(m); try{ writeFileSync('reports/queue-winner-reels.txt', out.join('\n')+'\n'); }catch{} };
let CAPS={}; try{ CAPS=JSON.parse(readFileSync('automation/winner_reel_captions.json','utf8')); }catch(e){ W('Keine winner_reel_captions.json → No-op.'); process.exit(0); }
const CSV='social/video_queue.csv';
if(!existsSync(CSV)){ W('social/video_queue.csv fehlt → No-op.'); process.exit(0); }
const existing=readFileSync(CSV,'utf8');
const today=new Date().toISOString().slice(0,10);
const csvq=s=>'"'+String(s).replace(/"/g,'""')+'"';
let added=0, skipped=0, failed=0;
const reels=Object.keys(CAPS);
for(let i=0;i<reels.length;i++){
  const base=reels[i]; const id=base+'-adkit';
  const file=`reels/${base}-ig.mp4`;
  if(existing.includes(id+',') || existing.includes(','+id+',')){ W('= schon in Queue: '+id); skipped++; continue; }
  if(!existsSync(file)){ W('? Datei fehlt: '+file); failed++; continue; }
  if(DRY){ W('[DRY] wuerde hochladen+queuen: '+file+' als '+id); continue; }
  const r=spawnSync('node',['automation/upload_to_shopify_cdn.mjs',file],{encoding:'utf8',timeout:1000*180});
  const url=(r.stdout||'').trim().split('\n').filter(l=>/^https:\/\/cdn\.shopify\.com/.test(l)).pop()||'';
  if(!url){ W('✗ Upload fehlgeschlagen '+base+': '+((r.stderr||'').trim().slice(-160))); failed++; continue; }
  const row=[id, today, url, csvq(CAPS[base]), '', 'ready', '', ''].join(',')+'\n';
  appendFileSync(CSV, row);
  W('✓ '+id+' -> '+url);
  added++;
}
W(`\nFertig: ${added} Reels in die Queue, ${skipped} schon drin, ${failed} fehlgeschlagen${DRY?' (DRY)':''}.`);
