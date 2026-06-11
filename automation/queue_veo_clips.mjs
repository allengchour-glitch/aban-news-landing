#!/usr/bin/env node
/* LuxeStyle — queue_veo_clips.mjs
 *
 * Bringt die fertig gerenderten Veo-„Hero"-Clips (echtes Bild→Video, reels/veo-hero-*.mp4)
 * ins Live-Posting: lädt jeden Clip per Shopify-CDN hoch (upload_to_shopify_cdn.mjs) und reiht
 * ihn als status=ready-Zeile in social/video_queue.csv ein — gestaffelt (1 Clip/Tag), damit der
 * Meta-Autopilot (video-autopost-meta.mjs) sie tropfenweise auf IG/FB/Threads postet.
 *
 * NUR echte LuxeStyle-Mode-Clips (live im Katalog verifiziert) — Merch/POD-Clips bleiben draussen.
 * Idempotent: überspringt Clips, deren id schon in der Queue steht. No-op ohne Shopify-Env.
 *
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) — wie reel-analytics.mjs.
 * Nutzung: node automation/queue_veo_clips.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const VQ = path.join(ROOT, 'social', 'video_queue.csv');
const UPLOADER = path.join(HERE, 'upload_to_shopify_cdn.mjs');
const SITE = 'https://luxestyle.ch';
const HEADER = 'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url';

// Gestaffelt ab morgen — techno2/3 belegen 11./12.06., Veo-Clips ab 13.06. (1/Tag).
const TAGS_MODE = '#schweizmode #sommerkleid #ootdschweiz #fashionreels #luxestyle';
const TAGS_ACC  = '#schweizmode #handtasche #ootdschweiz #fashionreels #luxestyle';
const CLIPS = [
  { id:'veo-brise', date:'2026-06-13', file:'reels/veo-hero-brise-2026-06-08.mp4',
    cap:'Sommer in Bewegung 🌬️ Off-Shoulder-Kleid «Brise» — luftig, ärmellos, schmeichelhaft. Unser Bestseller. –10% mit Code WELCOME10 👉 '+SITE+'/products/off-shoulder-kleid-brise-locker-armellos', tags:TAGS_MODE },
  { id:'veo-daisy', date:'2026-06-14', file:'reels/veo-hero-daisy-2026-06-08.mp4',
    cap:'Retro-Charme zum Leben erweckt 🎀 Polka-Dot-Kleid «Daisy» — Vintage-Look mit tiefem V & Schleife. Schweizer Shop · –10% mit WELCOME10 👉 '+SITE+'/products/polka-dot-retro-kleid-daisy-deep-v-mit-schleife', tags:TAGS_MODE },
  { id:'veo-sirene', date:'2026-06-15', file:'reels/veo-hero-sirene-2026-06-08.mp4',
    cap:'Der grosse Auftritt 🧜‍♀️ Abendkleid «Sirène» — High-Slit, Meerjungfrau-Silhouette, Schleppe. Premium-Look von deinem Schweizer Shop · –10% WELCOME10 👉'+SITE+'/products/abendkleid-sirene-high-slit-meerjungfrau-mit-schleppe', tags:TAGS_MODE },
  { id:'veo-cosy', date:'2026-06-16', file:'reels/veo-hero-cosy-2026-06-08.mp4',
    cap:'Soft-Season ✨ Kapuzen-Cardigan «Cosy» — kuschelig, viele Farben, Knopfleiste + Kapuze. Schweizer Shop · –10% mit WELCOME10 👉 '+SITE+'/products/kapuzen-cardigan-cosy-uni-mit-knopfen-damen', tags:TAGS_MODE },
  { id:'veo-nuit', date:'2026-06-17', file:'reels/veo-hero-nuit-2026-06-08.mp4',
    cap:'Dein Abend-Begleiter 🌙 Crossbody-Tasche «Nuit» — eleganter Vintage-Look, verstellbarer Riemen. Nur CHF 24.90 · –10% mit WELCOME10 👉 '+SITE+'/products/crossbody-tasche-nuit-elegant-im-vintage-look', tags:TAGS_ACC },
];

const csv = s => '"'+String(s).replace(/"/g,'""')+'"';

if (!process.env.SHOPIFY_SHOP && !process.env.SHOPIFY_ADMIN_TOKEN) {
  console.error('Keine Shopify-Env → No-op (lokal). In der Action sind die Secrets gesetzt.');
  process.exit(0);
}
if (!fs.existsSync(VQ)) fs.writeFileSync(VQ, HEADER+'\n');
const existing = fs.readFileSync(VQ, 'utf8');

let added = 0;
for (const c of CLIPS) {
  if (existing.includes(c.id+',') || existing.includes('\n'+c.id+',')) { console.error('skip (schon in Queue):', c.id); continue; }
  const fp = path.join(ROOT, c.file);
  if (!fs.existsSync(fp)) { console.error('FEHLT (übersprungen):', c.file); continue; }
  console.error('Upload →', c.file);
  let url = '';
  try {
    const out = execFileSync('node', [UPLOADER, fp, 'LuxeStyle '+c.id], { encoding:'utf8' });
    url = out.trim().split('\n').filter(Boolean).pop() || '';
  } catch (e) { console.error('Upload-Fehler', c.id, e.message); continue; }
  if (!/^https:\/\/cdn\.shopify\.com\//.test(url)) { console.error('Keine CDN-URL für', c.id, '→', url); continue; }
  const caption = c.cap + '\n' + c.tags;
  const row = [c.id, c.date, csv(url), csv(caption), '', 'ready', '', ''].join(',');
  fs.appendFileSync(VQ, row + '\n');
  console.error('✓ Queue:', c.id, '@', c.date, '→', url);
  added++;
}
console.error(`Fertig: ${added} Veo-Clip(s) eingereiht.`);
