/* fortura_draft_old.mjs — nach dem Umbau auf gruppierte Produkte: die ALTEN Einzel-Grössen-Produkte
 * (Handle-Muster '-ft<ArtNr>') auf DRAFT setzen. Die NEUEN gruppierten haben '-fg<key>'. Nie löschen.
 * ERST laufen lassen, wenn der gruppierte Import (fortura_import_grouped.mjs) durch ist!
 */
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function gql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}
const OLD=/-ft\d+$/;   // altes Einzel-Format: ...-ft12345
TOK=await scc();
let cursor=null,scanned=0,drafted=0;
for(let p=0;p<120;p++){
  const q=`query($c:String){products(first:100,query:"tag:fortura status:active",after:$c){pageInfo{hasNextPage endCursor}edges{node{id handle}}}}`;
  const r=await gql(q,{c:cursor}); if(!r.data)break;
  for(const {node:n} of r.data.products.edges){scanned++;
    if(OLD.test(n.handle)){
      await gql(`mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT,tags:["alt-einzelgroesse-ersetzt"]}){userErrors{message}}}`,{id:n.id});
      drafted++; await sleep(60);
    }
  }
  if(!r.data.products.pageInfo.hasNextPage)break; cursor=r.data.products.pageInfo.endCursor;
}
console.log(`gescannt=${scanned} alte Einzelprodukte gedraftet=${drafted}`);
