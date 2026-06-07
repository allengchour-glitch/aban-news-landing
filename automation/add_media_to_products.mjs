#!/usr/bin/env node
/* LuxeStyle — add_media_to_products.mjs
 * Hängt generierte Medien (Bilder + Veo-Videos) an die passenden Shopify-Produkte an
 * (Admin GraphQL productCreateMedia), zugeordnet über den Produkt-`handle`.
 *
 * Quellen:
 *   - Bilder:  social/static/<name>-portrait.jpg  (Zuordnung name→handle via automation/good_products.csv)
 *   - Videos:  social/generated_media.csv          (Zeilen handle,type,url — von gen_veo_reel.mjs geschrieben)
 *
 * ⚠️ Marken-Hinweis: Die Masterpiece-BILDER tragen Promo-Overlays (-10% WELCOME10 etc.) — für Produkt-Galerien
 *    eignen sich eher saubere Fotos/Veo-Clips. Standardmäßig nur VIDEOS anhängen (MEDIA_KINDS=videos);
 *    Bilder nur, wenn ausdrücklich MEDIA_KINDS=images bzw. images,videos gesetzt.
 *
 * Auth (eine Variante reicht): SHOPIFY_ADMIN_TOKEN  ODER  SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET (client_credentials).
 * ENV: SHOPIFY_SHOP (z.B. au3j0y-hq.myshopify.com), MEDIA_KINDS=videos|images|images,videos, DRY_RUN=1,
 *      OUT_BASE_URL (Default https://abannews.com), API_VERSION (Default 2024-10).
 * No-op (Exit 0) ohne Shop/Creds.
 */
import fs from 'node:fs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const API = process.env.API_VERSION || '2024-10';
const OUT_BASE = (process.env.OUT_BASE_URL || 'https://abannews.com').replace(/\/$/, '');
const KINDS = (process.env.MEDIA_KINDS || 'videos').split(',').map(s => s.trim().toLowerCase());
const DRY = process.env.DRY_RUN === '1';

const PRODUCTS = new URL('./good_products.csv', import.meta.url).pathname;
const MANIFEST = new URL('../social/generated_media.csv', import.meta.url).pathname;
const STATIC_DIR = new URL('../social/static/', import.meta.url).pathname;

function parseCsv(text){
  const rows=[]; let row=[], f='', q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else { if(c==='"')q=true; else if(c===','){row.push(f);f='';}
      else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}
      else if(c==='\r'){} else f+=c; } }
  if(f.length||row.length){row.push(f);rows.push(row);}
  return rows.filter(r=>r.length>1||(r.length===1&&r[0]!==''));
}

async function shopifyToken(){
  if(process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if(!id || !sec) return null;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ client_id:id, client_secret:sec, grant_type:'client_credentials' }),
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.access_token){ console.error('Shopify-Token-Fehler:', r.status, JSON.stringify(j)); return null; }
  return j.access_token;
}

async function gql(token, query, variables){
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method:'POST', headers:{ 'X-Shopify-Access-Token':token, 'Content-Type':'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(()=>({}));
  if(j.errors) console.error('GraphQL-Fehler:', JSON.stringify(j.errors).slice(0,300));
  return j.data || {};
}

async function productIdByHandle(token, handle){
  const d = await gql(token, `query($q:String!){ products(first:1, query:$q){ edges{ node{ id title } } } }`, { q:`handle:${handle}` });
  return d.products?.edges?.[0]?.node || null;
}

// Video: Shopify braucht Staged-Upload (öffentliche URL reicht nicht). Lädt mp4 → staged target → resourceUrl.
async function stageVideo(token, url){
  const fname = url.split('/').pop().split('?')[0] || 'video.mp4';
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const d = await gql(token,
    `mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ message } } }`,
    { input:[{ filename:fname, mimeType:'video/mp4', resource:'VIDEO', httpMethod:'POST', fileSize:String(buf.length) }] });
  const t = d.stagedUploadsCreate?.stagedTargets?.[0];
  if(!t){ console.error('stagedUploadsCreate fehlgeschlagen:', JSON.stringify(d.stagedUploadsCreate?.userErrors||d)); return null; }
  const form = new FormData();
  for(const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([buf], {type:'video/mp4'}), fname);
  const up = await fetch(t.url, { method:'POST', body:form });
  if(!up.ok){ console.error('Staged-Upload PUT/POST fehlgeschlagen:', up.status); return null; }
  return t.resourceUrl;
}

async function attach(token, prod, contentType, source, alt){
  const d = await gql(token,
    `mutation($pid:ID!,$media:[CreateMediaInput!]!){ productCreateMedia(productId:$pid, media:$media){ media{ alt status } mediaUserErrors{ message } } }`,
    { pid:prod.id, media:[{ originalSource:source, mediaContentType:contentType, alt }] });
  const errs = d.productCreateMedia?.mediaUserErrors || [];
  if(errs.length){ console.error(`  ❌ ${prod.title}:`, JSON.stringify(errs)); return false; }
  console.log(`  ✅ ${contentType} → ${prod.title}`); return true;
}

// --- Aufgabenliste bauen ---
function buildTasks(){
  const tasks = []; // {handle, type:'IMAGE'|'VIDEO', url, alt}
  const rows = parseCsv(fs.readFileSync(PRODUCTS,'utf8'));
  const hdr = rows[0];
  const gi = Object.fromEntries(['name','image_url','label','handle'].map(c=>[c,hdr.indexOf(c)]));
  const byName = {};
  for(const r of rows.slice(1)) byName[r[gi.name]] = { handle:r[gi.handle], label:r[gi.label] };

  if(KINDS.includes('images')){
    for(const [name, p] of Object.entries(byName)){
      if(!p.handle) continue;
      const local = `${STATIC_DIR}${name}-portrait.jpg`;
      if(fs.existsSync(local)) tasks.push({ handle:p.handle, type:'IMAGE', url:`${OUT_BASE}/social/static/${name}-portrait.jpg`, alt:p.label });
    }
  }
  if(KINDS.includes('videos') && fs.existsSync(MANIFEST)){
    const mrows = parseCsv(fs.readFileSync(MANIFEST,'utf8'));
    const mh = mrows[0]; const mi = Object.fromEntries(['handle','type','url','alt'].map(c=>[c,mh.indexOf(c)]));
    for(const r of mrows.slice(1)){
      if((r[mi.type]||'').toUpperCase()==='VIDEO' && r[mi.handle] && r[mi.url])
        tasks.push({ handle:r[mi.handle], type:'VIDEO', url:r[mi.url], alt:r[mi.alt]||'' });
    }
  }
  return tasks;
}

async function main(){
  if(!SHOP || (!process.env.SHOPIFY_ADMIN_TOKEN && !(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET))){
    if(!DRY){ console.log('Kein SHOPIFY_SHOP/Token → No-op. Siehe USER-CHECKLISTE §Shopify.'); process.exit(0); }
  }
  const tasks = buildTasks();
  console.log(`Medien anzuhängen: ${tasks.length} (Kinds: ${KINDS.join(',')})`);
  if(tasks.length===0){ console.log('Nichts zu tun.'); process.exit(0); }
  if(DRY){ tasks.forEach(t=>console.log(`  DRY: ${t.type} → handle:${t.handle} | ${t.url}`)); process.exit(0); }

  const token = await shopifyToken();
  if(!token){ console.error('Kein Shopify-Token → Abbruch.'); process.exit(1); }

  let ok=0, fail=0;
  const cache = {};
  for(const t of tasks){
    const prod = cache[t.handle] || (cache[t.handle] = await productIdByHandle(token, t.handle));
    if(!prod){ console.error(`  ⚠️  Produkt nicht gefunden: handle:${t.handle}`); fail++; continue; }
    let source = t.url;
    if(t.type==='VIDEO'){ source = await stageVideo(token, t.url); if(!source){ fail++; continue; } }
    (await attach(token, prod, t.type, source, t.alt)) ? ok++ : fail++;
    await new Promise(r=>setTimeout(r, 600)); // sanftes Rate-Limit
  }
  console.log(`Fertig: ${ok} angehängt, ${fail} Fehler.`);
  process.exit(fail && !ok ? 1 : 0);
}
main().catch(e=>{ console.error('Fehler:', e.message); process.exit(1); });
