const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const T=await tok();
// alle Collections holen
let cur=null, all=[];
while(true){const r=await gql(T,`query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor}nodes{id handle sortOrder ruleSet{rules{column}} productsCount{count}}}}`,{c:cur});const c=r.data?.collections;if(!c)break;all.push(...c.nodes);if(!c.pageInfo.hasNextPage)break;cur=c.pageInfo.endCursor;}
// Ausschluss: Geschenk-/Preis-Buckets, saisonal, generisch, selbst-gestalten, Marken (schon PRICE_DESC), manuelle
const skip=/geschenk|unter-chf|kleine-|-ab-chf|bestseller|^neu|topseller|hype|mystery|launch|sommer|vatertag|weihnacht|halloween|silvester|black-friday|wm-|erste-august|schweiz|sticker|selbst|^sg-|premium$|highend|express|tiktok|us-|frontpage|top-5|home-family|marke-|-look$/i;
const targets=all.filter(c=>c.ruleSet && (c.ruleSet.rules||[]).length && c.sortOrder!=='PRICE_DESC' && c.sortOrder!=='MANUAL' && c.productsCount.count>=4 && !skip.test(c.handle));
console.log(`Kategorie-Collections zum Umsortieren (→PRICE_DESC): ${targets.length}`);
const UP=`mutation($id:ID!){collectionUpdate(input:{id:$id,sortOrder:PRICE_DESC}){collection{handle}userErrors{message}}}`;
let done=0;
for(const c of targets){
 if(DRY){if(done<25)console.log('  '+c.handle+' ('+c.sortOrder+'→PRICE_DESC, '+c.productsCount.count+')');done++;continue;}
 const r=await gql(T,UP,{id:c.id});if(!(r.data?.collectionUpdate?.userErrors||[]).length)done++;await sleep(60);
 if(done%30===0)console.log('  '+done+' sortiert…');
}
console.log(`\nFERTIG: ${done} Kategorien auf PRICE_DESC${DRY?' [DRY]':''}.`);
