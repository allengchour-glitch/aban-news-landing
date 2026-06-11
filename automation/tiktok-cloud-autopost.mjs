#!/usr/bin/env node
/**
 * tiktok-cloud-autopost.mjs — AUTONOMER TikTok-Upload über Browserbase (kein PC nötig).
 *
 * Nimmt die nächste fällige Zeile aus social/tiktok_queue.csv (status=ready, scheduled_date<=heute)
 * und postet sie über den eingeloggten Browserbase-Context (agent_cloud.mjs tiktok-upload --confirm).
 * Bei Erfolg → status=posted. So läuft TikTok genauso hands-off wie Meta — die „Fernsteuerung"
 * ist der Cloud-Browser, gefahren vom GitHub-Cron.
 *
 * Voraussetzung: TikTok einmal im Browserbase-Context eingeloggt (login-start/login-release).
 * No-op ohne Browserbase-Secrets oder ohne fällige Zeile.
 *
 * ENV: BROWSERBASE_API_KEY/PROJECT_ID/CONTEXT_ID · DRY_RUN=1 (nicht posten)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const QUEUE = path.join(ROOT, 'social', 'tiktok_queue.csv');
const AGENT = path.join(ROOT, 'tools', 'browser', 'agent_cloud.mjs');
const DRY = process.env.DRY_RUN === '1';

if (!process.env.BROWSERBASE_CONTEXT_ID) { console.log('Kein Browserbase-Context → No-op.'); process.exit(0); }
if (!fs.existsSync(QUEUE)) { console.log('Keine Queue → No-op.'); process.exit(0); }

// einfacher CSV-Parser (mit Quoting)
function parse(text){
  const rows=[]; let i=0, f='', row=[], q=false;
  const push=()=>{row.push(f);f='';}; const end=()=>{push();rows.push(row);row=[];};
  while(i<text.length){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else { if(c==='"')q=true; else if(c===',')push(); else if(c==='\n')end(); else if(c==='\r'){} else f+=c; }
    i++;
  }
  if(f.length||row.length) end();
  return rows.filter(r=>r.length>1||(r.length===1&&r[0]!==''));
}
function csv(s){ return '"'+String(s).replace(/"/g,'""')+'"'; }

const rows = parse(fs.readFileSync(QUEUE,'utf8'));
const hdr = rows[0]; const ix = n => hdr.indexOf(n);
const today = new Date().toISOString().slice(0,10);
const dueIdx = rows.findIndex((r,k)=> k>0 && (r[ix('status')]||'').trim()==='ready'
  && ((r[ix('scheduled_date')]||'').trim()==='' || (r[ix('scheduled_date')]||'').trim() <= today));

if (dueIdx === -1) { console.log('Keine fällige TikTok-Zeile (status=ready, scheduled_date<=heute).'); process.exit(0); }

const r = rows[dueIdx];
const id = r[ix('id')], url = r[ix('video_url')], caption = r[ix('caption')];
console.log(`→ Poste ${id} (${today})`);

try {
  const flag = DRY ? [] : ['--confirm'];
  const out = execFileSync('node', [AGENT, 'tiktok-upload', url, caption, ...flag],
    { encoding:'utf8', stdio:['ignore','pipe','inherit'] });
  process.stdout.write(out);
  if (DRY) { console.log('DRY — Status nicht geändert.'); process.exit(0); }
  r[ix('status')] = 'posted';
  r[ix('posted_at')] = new Date().toISOString();
  const rebuilt = rows.map(row => row.map((c,i)=> (i===ix('caption')||i===ix('video_url')||/[",\n]/.test(c)) ? csv(c) : c).join(',')).join('\n')+'\n';
  fs.writeFileSync(QUEUE, rebuilt);
  console.log(`✓ ${id} gepostet → status=posted.`);
} catch (e) {
  console.error('Upload fehlgeschlagen:', e.message);
  process.exit(1);
}
