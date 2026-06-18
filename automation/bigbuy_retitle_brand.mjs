#!/usr/bin/env node
/*
 * BigBuy-Retitle mit echtem Marken-Namen.
 * Der Gemini-Titel-Generator strippt Marken — bei Marken-Kategorien (Uhren/Sonnenbrillen/Parfum)
 * ist die Marke aber der Wert. Dieses Skript setzt für die angegebenen Produkte den ECHTEN
 * BigBuy-Namen (enthält Marke + Modell, z. B. "Herrenuhr Kenneth Cole IKC8005") als Titel + SEO.
 *
 * Scope: HANDLES-Env (kommagetrennte Liste der frisch angelegten Handles) ODER alle, deren
 * Handle auf -<BigBuyId> endet und in der NAMES-Map vorkommt, begrenzt auf die in HANDLES gelisteten.
 *
 * Env: BIGBUY_API_KEY + Shopify-Creds + HANDLES="h1,h2,…". DRY default, LIVE=1 schreibt.
 */
import fs from 'node:fs';
const env = fs.existsSync('/tmp/shopify_creds.env')
  ? Object.fromEntries(fs.readFileSync('/tmp/shopify_creds.env','utf8').split('\n').filter(Boolean)
      .map(l => l.replace(/^export /,'').split('=').map(s=>s.trim().replace(/^["']|["']$/g,''))))
  : process.env;
const SHOP=env.SHOPIFY_SHOP, CID=env.SHOPIFY_CLIENT_ID, SECRET=env.SHOPIFY_CLIENT_SECRET;
const BB=(process.env.BIGBUY_API_KEY||env.BIGBUY_API_KEY||'').trim();
const LIVE=process.env.LIVE==='1';
const HANDLES=(process.env.HANDLES||'').split(',').map(s=>s.trim()).filter(Boolean);
if(!SHOP||!CID||!SECRET){ console.log('No Shopify creds → no-op.'); process.exit(0); }
if(!BB){ console.log('No BIGBUY_API_KEY → no-op.'); process.exit(0); }
if(!HANDLES.length){ console.log('No HANDLES → no-op.'); process.exit(0); }
const API=`https://${SHOP}/admin/api/2025-01/graphql.json`;

async function bbGet(p){ for(let a=0;a<5;a++){ const r=await fetch('https://api.bigbuy.eu'+p,{headers:{Authorization:`Bearer ${BB}`}}); if(r.status===429||r.status>=500){await new Promise(s=>setTimeout(s,2000*(a+1)));continue;} if(!r.ok)throw new Error('bb '+r.status); return r.json(); } throw new Error('bb retries'); }
async function token(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SECRET,grant_type:'client_credentials'})}); const j=await r.json(); if(!j.access_token)throw new Error('token'); return j.access_token; }
let TOK;
async function gql(q,v={}){ for(let a=0;a<6;a++){ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})}); if(r.status===429||r.status>=500){await new Promise(s=>setTimeout(s,1500*(a+1)));continue;} const j=await r.json(); if(j.errors){ if(JSON.stringify(j.errors).includes('Throttled')){await new Promise(s=>setTimeout(s,2500*(a+1)));continue;} throw new Error(JSON.stringify(j.errors)); } return j.data; } throw new Error('gql retries'); }

// Namen-Map (productsinformation, gecacht)
console.log('Lade BigBuy productsinformation (Namen) …');
let info;
if(fs.existsSync('/tmp/bb_names.json')){ info=JSON.parse(fs.readFileSync('/tmp/bb_names.json','utf8')); }
else { info=await bbGet('/rest/catalog/productsinformation.json?isoCode=de'); const m={}; for(const p of info){ if(p&&p.id&&p.name) m[String(p.id)]=p.name; } fs.writeFileSync('/tmp/bb_names.json',JSON.stringify(m)); info=m; }
const nameMap = Array.isArray(info) ? new Map(info.filter(p=>p&&p.id&&p.name).map(p=>[String(p.id),p.name])) : new Map(Object.entries(info));
console.log(`  ${nameMap.size} Namen.`);

function cleanTitle(raw){
  let t = raw.replace(/\s+/g,' ').trim();
  t = t.replace(/\s*\(Ø[^)]*\)/g,'');          // (Ø 39 mm) weg
  t = t.replace(/\s*Ø\s*[\d.,]+\s*mm/gi,'');    // "Ø 54 mm" weg
  t = t.replace(/\s{2,}/g,' ').trim();
  if(t.length>72) t=t.slice(0,72).replace(/\s+\S*$/,'').trim();
  return t;
}

TOK=await token();
const Q=`query($h:String!){ products(first:1, query:$h){ edges{ node{ id handle } } } }`;
const jobs=[];
for(const h of HANDLES){
  const m=h.match(/-(\d+)$/); if(!m) continue;
  const name=nameMap.get(m[1]); if(!name) { console.log('  kein Name für',h); continue; }
  const d=await gql(Q,{h:`handle:${h}`});
  const node=d.products.edges[0]?.node; if(!node){ console.log('  nicht gefunden',h); continue; }
  jobs.push({id:node.id, title:cleanTitle(name)});
}
console.log(`${jobs.length} Produkte zum Re-Titel.`);
jobs.slice(0,50).forEach(j=>console.log('  →', j.title));
if(!LIVE){ console.log('DRY (LIVE=1 schreibt).'); process.exit(0); }

const MU=`mutation($id:ID!,$t:String!,$st:String!){ productUpdate(input:{id:$id, title:$t, seo:{title:$st}}){ userErrors{ message } } }`;
let done=0;
for(const j of jobs){ const st=(j.title.length>56?j.title.slice(0,56):j.title)+' | LuxeStyle'; const r=await gql(MU,{id:j.id,t:j.title,st}); if(r.productUpdate.userErrors.length) console.log('err',j.id,r.productUpdate.userErrors); else done++; }
console.log(`✅ ${done}/${jobs.length} re-betitelt mit echtem Marken-Namen.`);
