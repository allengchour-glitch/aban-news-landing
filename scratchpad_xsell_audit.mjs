#!/usr/bin/env node
// Catalog-wide broken cross-sell link audit + fix via urlRedirectCreate
const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const API = '2025-01';
const DO_FIX = process.env.DO_FIX === '1';

async function getToken(){
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
  const j = await r.json();
  if(!j.access_token) throw new Error('no token: '+JSON.stringify(j));
  return j.access_token;
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let TOKEN;
async function gql(query, variables={}, tries=0){
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOKEN},
    body:JSON.stringify({query,variables})});
  if(r.status===429){ await sleep(2000*(tries+1)); return gql(query,variables,tries+1); }
  const j = await r.json();
  if(j.errors){
    const throttled = JSON.stringify(j.errors).includes('THROTTLED');
    if(throttled && tries<8){ await sleep(2000*(tries+1)); return gql(query,variables,tries+1); }
    throw new Error(JSON.stringify(j.errors));
  }
  // also handle cost throttle in extensions
  return j.data;
}

async function fetchCollections(){
  const handles = new Set();
  let cursor = null;
  while(true){
    const d = await gql(`query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{handle title}}}`, {c:cursor});
    for(const n of d.collections.nodes) handles.add(n.handle);
    if(!d.collections.pageInfo.hasNextPage) break;
    cursor = d.collections.pageInfo.endCursor;
    await sleep(300);
  }
  return handles;
}

async function fetchRedirects(){
  const map = new Map(); // fromPath(normalized handle) -> target
  let cursor = null;
  while(true){
    const d = await gql(`query($c:String){urlRedirects(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id path target}}}`, {c:cursor});
    for(const n of d.urlRedirects.nodes){
      map.set(n.path, n.target);
    }
    if(!d.urlRedirects.pageInfo.hasNextPage) break;
    cursor = d.urlRedirects.pageInfo.endCursor;
    await sleep(300);
  }
  return map;
}

function extractHandles(html){
  const out = [];
  if(!html) return out;
  const re = /\/collections\/([a-zA-Z0-9\-_%]+)/g;
  let m;
  while((m=re.exec(html))){
    let h = m[1];
    // stop at any trailing slash-based product path already excluded by regex char class
    try{ h = decodeURIComponent(h); }catch(e){}
    // ignore 'all'
    if(h && h!=='all') out.push(h.toLowerCase());
  }
  return out;
}

async function main(){
  TOKEN = await getToken();
  console.error('token ok');
  const collections = await fetchCollections();
  console.error('collections:', collections.size);
  const redirects = await fetchRedirects();
  console.error('redirects:', redirects.size);

  // build set of redirect source handles (path like /collections/xyz)
  const redirectHandles = new Map(); // handle -> target
  for(const [path,target] of redirects){
    const mm = path.match(/^\/collections\/([^\/?#]+)$/);
    if(mm) redirectHandles.set(mm[1].toLowerCase(), target);
  }

  // paginate ACTIVE products
  const brokenMap = new Map(); // handle -> {count, samples:[]}
  let cursor = null, total = 0, page=0;
  while(true){
    const d = await gql(`query($c:String){products(first:100,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor} nodes{id handle title descriptionHtml}}}`, {c:cursor});
    for(const p of d.products.nodes){
      total++;
      const hs = new Set(extractHandles(p.descriptionHtml));
      for(const h of hs){
        if(collections.has(h)) continue;
        if(redirectHandles.has(h)) continue;
        if(!brokenMap.has(h)) brokenMap.set(h,{count:0,samples:[]});
        const e = brokenMap.get(h);
        e.count++;
        if(e.samples.length<3) e.samples.push(p.handle);
      }
    }
    page++;
    if(page%5===0) console.error('...scanned', total, 'products');
    if(!d.products.pageInfo.hasNextPage) break;
    cursor = d.products.pageInfo.endCursor;
    await sleep(250);
  }
  console.error('TOTAL ACTIVE PRODUCTS:', total);

  const broken = [...brokenMap.entries()].sort((a,b)=>b[1].count-a[1].count);
  console.log('\n=== BROKEN CROSS-SELL HANDLES ===');
  console.log('collections total:', collections.size, '| redirect-collection handles:', redirectHandles.size);
  console.log('distinct broken handles:', broken.length);
  for(const [h,e] of broken){
    console.log(`  ${h}  -> ${e.count} products  e.g. ${e.samples.join(', ')}`);
  }

  // suggest closest real collection for each broken handle
  const collArr = [...collections];
  function suggest(h){
    // exact contains match
    const cand = collArr.filter(c=>c.includes(h)||h.includes(c));
    if(cand.length){
      cand.sort((a,b)=>Math.abs(a.length-h.length)-Math.abs(b.length-h.length));
      return cand[0];
    }
    // token overlap
    const ht = h.split('-');
    let best=null,bestScore=0;
    for(const c of collArr){
      const ct=new Set(c.split('-'));
      let s=ht.filter(t=>ct.has(t)).length;
      if(s>bestScore){bestScore=s;best=c;}
    }
    return bestScore>0?best:null;
  }
  console.log('\n=== SUGGESTIONS ===');
  const plan = [];
  for(const [h,e] of broken){
    const s = suggest(h);
    console.log(`  ${h} -> ${s||'(no match)'}`);
    if(s) plan.push({from:`/collections/${h}`, target:`/collections/${s}`, handle:h, target_handle:s, count:e.count});
  }

  // FIX
  if(DO_FIX){
    console.log('\n=== CREATING REDIRECTS ===');
    for(const pItem of plan){
      // idempotent: skip if path already redirected
      if(redirects.has(pItem.from)){ console.log('skip existing', pItem.from); continue; }
      const d = await gql(`mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r){urlRedirect{id path target} userErrors{field message}}}`,
        {r:{path:pItem.from, target:pItem.target}});
      const ue = d.urlRedirectCreate.userErrors;
      if(ue && ue.length) console.log('ERR', pItem.from, JSON.stringify(ue));
      else console.log('CREATED', pItem.from, '->', pItem.target, `(fixes ${pItem.count} products)`);
      await sleep(400);
    }
  } else {
    console.log('\n(dry-run; set DO_FIX=1 to create redirects)');
  }
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});
