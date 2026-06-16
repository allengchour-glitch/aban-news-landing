#!/usr/bin/env node
/**
 * link_guard.mjs — findet kaputte interne Collection-Links (404-Wächter).
 *
 * Sammelt /collections/<handle>-Links aus (a) Hauptmenü und (b) den zuletzt geänderten Produkt-
 * Beschreibungen (Cross-Sell-Footer). Prüft je Handle: existiert die Collection UND ist sie publiziert
 * (resourcePublicationsCount>0)? Meldet alle kaputten/unpublizierten Handles.
 *
 * AUTO-FIX (nur LIVE + nur sicher): wenn ein kaputter Handle ein „swapped prefix"-Pendant hat, das
 * existiert+publiziert ist (z. B. taschen-sub ↔ sub-taschen — der dokumentierte Fall), legt es einen
 * 301-URL-Redirect an. Sonst nur Report (kein Raten).
 *
 * No-op-sicher · DRY-Default · LIVE=1 · SCAN=Produkt-Beschreibungen scannen (Default 300).
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 */
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=process.env.SHOPIFY_CLIENT_SECRET||'',
  LIVE=process.env.LIVE==='1', SCAN=Math.min(parseInt(process.env.SCAN||'300',10),3000),
  MENU=process.env.MENU_HANDLE||'main-menu', API='2025-01';

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
async function gql(token,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
  const j=await r.json(); if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors).slice(0,300)); return j.data;
}
const swap=h=>h.startsWith('sub-')?h.slice(4):'sub-'+h;   // sub-X <-> X (und X -> sub-X)
const swap2=h=>h.endsWith('-sub')?h.slice(0,-4):h+'-sub'; // X-sub <-> X

async function collState(token,h){
  const d=await gql(token,`query($h:String!){ collectionByHandle(handle:$h){ id resourcePublicationsCount{count} } }`,{h});
  const c=d.collectionByHandle; if(!c) return 'missing'; return c.resourcePublicationsCount.count>0?'ok':'unpublished';
}

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  // 1) Handles aus dem Menü
  const handles=new Set();
  try{
    const m=await gql(token,`query($h:String!){ menu(handle:$h){ items{ url items{ url items{ url } } } } }`,{h:MENU});
    const walk=items=>{ for(const it of items||[]){ const mm=(it.url||'').match(/\/collections\/([a-z0-9\-]+)/i); if(mm) handles.add(mm[1]); walk(it.items); } };
    if(m.menu) walk(m.menu.items);
  }catch(e){ report.menuError=e.message; }
  report.menuHandles=handles.size;

  // 2) Handles aus Produkt-Beschreibungen (zuletzt geändert)
  let scanned=0, cur=null;
  while(scanned<SCAN){
    const d=await gql(token,`query($c:String){ products(first:100, after:$c, sortKey:UPDATED_AT, reverse:true, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{ descriptionHtml } } }`,{c:cur});
    for(const p of d.products.nodes){ scanned++; const body=p.descriptionHtml||'';
      const re=/\/collections\/([a-z0-9\-]+)/gi; let mm; while((mm=re.exec(body))) handles.add(mm[1]); }
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  report.scannedProducts=scanned; report.uniqueHandles=handles.size;

  // 3) jeden Handle prüfen
  const broken=[], unpublished=[], okHandles=new Set();
  for(const h of handles){
    let st; try{ st=await collState(token,h); }catch{ st='missing'; }
    if(st==='ok') okHandles.add(h);
    else if(st==='unpublished') unpublished.push(h);
    else broken.push(h);
  }
  report.broken=broken; report.unpublished=unpublished;

  // 4) sichere Auto-Redirects (nur wenn ein existierendes+publiziertes Pendant da ist)
  if(LIVE && broken.length){
    const created=[];
    for(const h of broken){
      let target=null;
      for(const cand of [swap(h),swap2(h)]){ if(cand===h) continue;
        let st; try{ st=await collState(token,cand); }catch{ st='missing'; }
        if(st==='ok'){ target='/collections/'+cand; break; } }
      if(!target) continue;
      try{
        const d=await gql(token,`mutation($r:URLRedirectInput!){ urlRedirectCreate(urlRedirect:$r){ urlRedirect{id} userErrors{message} } }`,
          {r:{path:'/collections/'+h, target}});
        const e=d.urlRedirectCreate.userErrors; if(!e.length) created.push(`${h} → ${target}`); else console.log('redirect err',h,e);
      }catch(e){ console.log('redirect fail',h,e.message); }
    }
    report.redirectsCreated=created;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
