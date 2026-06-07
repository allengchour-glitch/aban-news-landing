#!/usr/bin/env node
/* LuxeStyle — social-queue.mjs  (Queue-Helfer für die Bild-Posts)
 *
 * Macht das Pflegen von social/posts_image.csv einfach — die Queue, die
 * `social-autopost-meta.mjs` (GitHub-Action) an Instagram + Facebook + Threads postet.
 * Reines Node, keine Dependencies, gleiche CSV-Logik wie die Poster.
 *
 * BEFEHLE:
 *   node automation/social-queue.mjs status
 *       → Übersicht: wie viele ready/posted, welche IDs ready sind, Kanal-Hinweise.
 *
 *   node automation/social-queue.mjs add --image <url> --caption "<text>" \
 *        [--platforms instagram,facebook,threads] [--date YYYY-MM-DD] [--id <id>] [--check]
 *       → Hängt eine neue ready-Zeile an. --check prüft die Bild-URL per HTTP 200.
 *         Meta verlangt eine ÖFFENTLICHE .jpg/.jpeg-URL (kein .webp) → wird validiert.
 *
 *   node automation/social-queue.mjs add-product <slug> --caption "<text>" [...]
 *       → Komfort: image_url = https://abannews.com/social/static/<slug>-portrait.jpg
 *
 *   node automation/social-queue.mjs requeue <id> [<id> ...]
 *       → Setzt gepostete Zeilen zurück auf ready (posted_at/post_url geleert),
 *         z. B. um Brise/Strohtasche nachträglich auch auf Facebook zu posten.
 *
 * Danach posten: GitHub-Action „Social Meta Auto-Post" läuft 2×/Tag automatisch,
 * oder manuell via workflow_dispatch (Input max = wie viele Bilder pro Lauf).
 *
 * HINWEISE (verifiziert 2026-06-07):
 *   - Instagram + Facebook + Threads funktionieren (FB-Page-Token wird automatisch
 *     aus META_ACCESS_TOKEN abgeleitet, sofern Scope pages_manage_posts vorhanden).
 *   - TikTok geht NICHT über diesen Weg (nur Video/Reel via PUBLISH_WEBHOOK_URL→n8n).
 */
import fs from 'node:fs';

const CSV = new URL('../social/posts_image.csv', import.meta.url).pathname;
const COLS = ['id','scheduled_date','image_url','caption','platforms','status','posted_at','post_url'];
const DEFAULT_PLATFORMS = 'instagram,facebook,threads';

// --- CSV (identisch zu social-autopost-meta.mjs / post-next-reel.mjs) ---
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

function load(){
  if(!fs.existsSync(CSV)){ console.error('Keine social/posts_image.csv gefunden.'); process.exit(1); }
  const rows = parse(fs.readFileSync(CSV,'utf8'));
  const header = rows[0];
  const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
  return { rows, header, idx, data: rows.slice(1) };
}
function save(rows){ fs.writeFileSync(CSV, serialize(rows)); }

// --- arg parsing: --key value | --key=value | positionals ---
function parseArgs(argv){
  const opts={}, pos=[];
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(a.startsWith('--')){
      const eq=a.indexOf('=');
      if(eq>=0){ opts[a.slice(2,eq)]=a.slice(eq+1); }
      else if(i+1<argv.length && !argv[i+1].startsWith('--')){ opts[a.slice(2)]=argv[++i]; }
      else { opts[a.slice(2)]=true; }
    } else pos.push(a);
  }
  return { opts, pos };
}

const today = () => new Date().toISOString().slice(0,10);
const isJpg = u => /\.jpe?g($|\?)/i.test(u);

// Rotierende Caption-Vorlagen → jeder Post variiert (kein Spam-Duplikat). {p}=Produktname, {link}=Linkzeile.
const TEMPLATES = [
  'Designer-Look zum fairen Preis 👀 {p} bei LuxeStyle. Code WELCOME10 = -10% {link}',
  'Neu entdeckt: {p} 🤍 Sommer 2026 bei LuxeStyle. -10% mit WELCOME10 {link}',
  'Dein Sommer-Liebling? {p} 🌿 Gratis-Versand ab CHF 65 · 30 Tage Rückgabe {link}',
  '{p} ✨ Premium & bezahlbar, Schweizer Shop. -10% Code WELCOME10 {link}',
  'Welcher Look ist deiner? 👇 {p} bei LuxeStyle. Code WELCOME10 = -10% {link}',
];
// Rotation an die ID/den Tag koppeln → stabil, aber pro Produkt/Tag anders.
function pickTemplate(seed){
  let h=0; for(const c of String(seed)) h=(h*31+c.charCodeAt(0))>>>0;
  return TEMPLATES[h % TEMPLATES.length];
}
function buildCaption(product, link, seed){
  const linkLine = link ? `→ ${link}` : '→ luxestyle.ch';
  return pickTemplate(seed).replace('{p}', product).replace('{link}', linkLine)
    + ' #schweizmode #sommermode2026 #ootdschweiz';
}

async function check200(url){
  try{
    const r = await fetch(url, { method:'HEAD' });
    return r.status;
  }catch(e){ return 0; }
}

function cmdStatus(){
  const { idx, data } = load();
  const by = {};
  for(const r of data){ const s=(r[idx.status]||'').trim()||'(leer)'; by[s]=(by[s]||0)+1; }
  console.log('📋 social/posts_image.csv —', data.length, 'Zeilen');
  for(const [s,n] of Object.entries(by)) console.log(`   ${s}: ${n}`);
  const ready = data.filter(r => (r[idx.status]||'').trim()==='ready');
  if(ready.length){
    console.log('\n🟢 ready (wird beim nächsten Lauf gepostet):');
    for(const r of ready) console.log(`   - ${r[idx.id]} → ${r[idx.platforms]} | ${r[idx.image_url]}`);
  } else console.log('\n(keine ready-Zeile — nichts offen)');
  console.log('\nKanäle: Instagram + Facebook + Threads ✅ (FB-Page-Token wird auto-abgeleitet).');
  console.log('TikTok: NICHT über diesen Weg (nur Video/Reel via n8n).');
  console.log('Posten: Action „Social Meta Auto-Post" (2×/Tag) oder workflow_dispatch (Input max).');
}

async function addRow({ id, image, caption, platforms, date, check, link }){
  if(!image){ console.error('Fehlt: --image <url>'); process.exit(1); }
  if(!caption){ console.error('Fehlt: --caption "<text>"'); process.exit(1); }
  if(link && !caption.includes(link)) caption = caption.trimEnd() + ` → ${link}`;
  if(!isJpg(image)){ console.error(`❌ Meta-Pflicht: Bild muss .jpg/.jpeg sein (kein .webp): ${image}`); process.exit(1); }
  if(check){
    const code = await check200(image);
    if(code!==200){ console.error(`❌ Bild-URL nicht erreichbar (HTTP ${code}): ${image}`); process.exit(1); }
    console.log('✓ Bild-URL erreichbar (HTTP 200).');
  }
  const { rows, idx, data } = load();
  const d = date || today();
  const rid = id || (image.split('/').pop().replace(/\.[a-z]+$/i,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase() + '-' + d);
  if(data.some(r => (r[idx.id]||'').trim()===rid)){ console.error(`❌ ID existiert bereits: ${rid}`); process.exit(1); }
  const row = new Array(rows[0].length).fill('');
  row[idx.id]=rid; row[idx.scheduled_date]=d; row[idx.image_url]=image;
  row[idx.caption]=caption; row[idx.platforms]=platforms||DEFAULT_PLATFORMS; row[idx.status]='ready';
  rows.push(row); save(rows);
  console.log(`✅ Hinzugefügt (ready): ${rid} → ${row[idx.platforms]}`);
}

function cmdRequeue(ids){
  if(!ids.length){ console.error('Nutzung: requeue <id> [<id> ...]'); process.exit(1); }
  const { rows, idx, data } = load();
  let n=0;
  for(const r of data){
    if(ids.includes((r[idx.id]||'').trim())){
      r[idx.status]='ready'; r[idx.posted_at]=''; r[idx.post_url]=''; n++;
      console.log(`↻ ready: ${r[idx.id]}`);
    }
  }
  if(n===0){ console.error('Keine passende ID gefunden.'); process.exit(1); }
  save(rows);
  console.log(`✅ ${n} Zeile(n) wieder auf ready gesetzt.`);
}

// --- main ---
const [cmd, ...rest] = process.argv.slice(2);
const { opts, pos } = parseArgs(rest);

switch(cmd){
  case 'status': cmdStatus(); break;
  case 'add':
    await addRow({ id:opts.id, image:opts.image, caption:opts.caption,
      platforms:opts.platforms, date:opts.date, check:!!opts.check, link:opts.link });
    break;
  case 'add-product': {
    const slug = pos[0];
    if(!slug){ console.error('Nutzung: add-product <slug> [--name "Produktname"] [--link <url>] [--caption "<text>"]'); process.exit(1); }
    const d = opts.date || today();
    const id = opts.id || `${slug}-${d}`;
    // Ohne --caption: rotierende Vorlage (jeder Post variiert), Produktname aus --name oder Slug.
    const caption = opts.caption || buildCaption(opts.name || slug, opts.link, id);
    await addRow({ id, image:opts.image || `https://abannews.com/social/static/${slug}-portrait.jpg`,
      caption, platforms:opts.platforms, date:d, check:!!opts.check,
      link:opts.caption ? opts.link : '' });  // bei Vorlage ist der Link schon drin
    break;
  }
  case 'requeue': cmdRequeue(pos); break;
  default:
    console.log(`social-queue.mjs — Queue-Helfer für Bild-Posts (IG+FB+Threads)

  status                          Queue-Übersicht + Kanal-Hinweise
  add --image <url> --caption ".." [--link <produkt-url>] [--platforms ..] [--date ..] [--id ..] [--check]
  add-product <slug> [--name "Produktname"] [--link <produkt-url>] [--caption ".."] [--check]
        (nutzt social/static/<slug>-portrait.jpg; ohne --caption: rotierende Vorlage → jeder Post variiert)
  requeue <id> [<id> ...]         gepostete Zeile(n) wieder auf ready (z.B. FB nachposten)

Danach postet die Action „Social Meta Auto-Post" (2×/Tag) oder manuell via workflow_dispatch.
TikTok geht hier nicht (nur Video/Reel via n8n).`);
}
