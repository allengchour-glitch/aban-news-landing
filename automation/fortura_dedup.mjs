/* fortura_dedup.mjs — findet Fortura-Produkte mit IDENTISCHEM norm. Titel (Shard-Kollision) und
 * draftet die Extras (behält das mit meister Bestand). Nie löschen → Tag 'duplikat-auto-draft'. */
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=x=>(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}
TOK=await scc();
const groups=new Map();
let cursor=null,scanned=0;
for(let p=0;p<90;p++){
  const q=`query($c:String){products(first:100,query:"tag:fortura status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title createdAt totalInventory}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){scanned++;const k=norm(n.title);if(!k)continue;
    if(!groups.has(k))groups.set(k,[]);groups.get(k).push(n);}
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
let drafted=0,dupGroups=0;
for(const [k,arr] of groups){
  if(arr.length<2)continue; dupGroups++;
  // behalte das mit meister Bestand (sonst ältestes)
  arr.sort((a,b)=>(b.totalInventory||0)-(a.totalInventory||0) || (a.createdAt<b.createdAt?-1:1));
  for(const dup of arr.slice(1)){
    await gql(`mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT,tags:["duplikat-auto-draft"]}){userErrors{message}}}`,{id:dup.id});
    drafted++; await sleep(160);
  }
}
console.log(`gescannt=${scanned} Dubletten-Gruppen=${dupGroups} gedraftet=${drafted}`);
