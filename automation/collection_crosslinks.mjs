#!/usr/bin/env node
/* collection_crosslinks — hängt an jede Kategorie-Collection einen internen Geschwister-Link-Block an
 * ("👉 Auch beliebt: …"), basierend auf der Hauptmenü-Gruppierung. Stärkt internes Linking (Google-Ranking
 * + Navigation, hält Besucher im Shop). Idempotent via Marker <!--ls-xlink-->. DRY-Default · LIVE=1. ENV: SHOPIFY_*.
 */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const MENU=process.env.MENU_ID||'gid://shopify/Menu/310224093569';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
const ctitle=s=>(s||'').replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s+/g,' ').trim();

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
// Menü laden → Gruppen mit /collections/<handle>-Kindern bilden
const mr=await gql(t,`{menu(id:"${MENU}"){items{title items{title url}}}}`);
const groups=[];
for(const top of mr.data.menu.items){
  const kids=(top.items||[]).map(i=>{const m=(i.url||'').match(/^\/collections\/([a-z0-9\-]+)$/i);return m?{handle:m[1],title:ctitle(i.title)}:null;}).filter(Boolean);
  // Dubletten-Handles in der Gruppe entfernen
  const seen=new Set(),uniq=[]; for(const k of kids){if(seen.has(k.handle))continue;seen.add(k.handle);uniq.push(k);}
  if(uniq.length>=3) groups.push({name:ctitle(top.title),kids:uniq});
}
console.log('Menü-Gruppen mit ≥3 Collections:',groups.length);

let done=0,skip=0,miss=0;
for(const g of groups){
  for(let i=0;i<g.kids.length;i++){
    const me=g.kids[i];
    // 4 Geschwister rotierend (nicht sich selbst)
    const sibs=[]; for(let k=1;k<=g.kids.length-1 && sibs.length<4;k++){const s=g.kids[(i+k)%g.kids.length]; if(s.handle!==me.handle)sibs.push(s);}
    if(!sibs.length){skip++;continue;}
    const r=await gql(t,`query($h:String!){collectionByHandle(handle:$h){id productsCount{count} descriptionHtml}}`,{h:me.handle});
    const cl=r?.data?.collectionByHandle;
    if(!cl){miss++;continue;}
    if((cl.descriptionHtml||'').includes('ls-xlink')){skip++;continue;}     // schon verlinkt
    const links=sibs.map(s=>`<a href="/collections/${s.handle}">${s.title}</a>`).join(' · ');
    const block=`\n<p class="ls-xlink"><strong>👉 Auch beliebt:</strong> ${links}</p>\n<!--ls-xlink-->`;
    const desc=(cl.descriptionHtml||'')+block;
    if(LIVE){
      const u=await gql(t,`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`,{i:{id:cl.id,descriptionHtml:desc}});
      const e=u?.data?.collectionUpdate?.userErrors||[]; if(e.length){console.log(' ⚠️',me.handle,JSON.stringify(e).slice(0,120));skip++;continue;}
    } else console.log('（DRY)',me.handle,'→',sibs.map(s=>s.handle).join(','));
    done++; await sleep(200);
  }
}
console.log(`\nFertig. Cross-Links gesetzt ${done} · übersprungen(schon/0) ${skip} · Collection fehlt ${miss} ${LIVE?'':'(DRY)'}`);
