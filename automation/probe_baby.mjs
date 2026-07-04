#!/usr/bin/env node
/* probe_baby — LIST collections + scan live product titles/tags for Baby&Kleinkind matches. Read-only. */
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tk=async()=>{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
const t=await tk();
async function gql(q,v){for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}const j=await r.json();if((j?.data==null)&&Array.isArray(j?.errors)&&j.errors.some(e=>/THROTTLED/i.test(e?.extensions?.code||e?.message||''))){await sleep((a+1)*2500);continue;}return j;}return null;}

// 1) list collections
let cols=[],cur=null;
do{const r=await gql(`query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor}edges{node{handle title productsCount{count}}}}}`,{c:cur});const c=r?.data?.collections;if(!c)break;cols.push(...c.edges.map(e=>e.node));cur=c.pageInfo.hasNextPage?c.pageInfo.endCursor:null;}while(cur);
console.log(`=== ${cols.length} COLLECTIONS ===`);
for(const c of cols){if(/baby|kinder|kind|klein|s[aä]ugling/i.test(c.handle+' '+c.title))console.log(`  BABYish: ${c.handle} | ${c.title} (${c.productsCount?.count})`);}

// 2) scan products
let prods=[],pc=null,n=0;
do{const r=await gql(`query($c:String){products(first:250,after:$c){pageInfo{hasNextPage endCursor}edges{node{title status tags}}}}`,{c:pc});const p=r?.data?.products;if(!p)break;prods.push(...p.edges.map(e=>e.node));pc=p.pageInfo.hasNextPage?p.pageInfo.endCursor:null;n++;}while(pc);
console.log(`\n=== ${prods.length} PRODUCTS scanned (${n} pages) ===`);

const has=(s,arr)=>arr.some(x=>s.includes(x));
const low=p=>p.title.toLowerCase();
const tags=p=>(p.tags||[]).map(x=>x.toLowerCase());

// PARENT: tag baby OR kinder OR title contains baby/kleinkind/säugling
const parent=prods.filter(p=>{const tt=tags(p);return tt.includes('baby')||tt.includes('kinder')||has(low(p),['baby','kleinkind','säugling','saeugling']);});
console.log(`\nPARENT baby-kleinkind matches: ${parent.length} (active: ${parent.filter(p=>p.status==='ACTIVE').length})`);

const subs={
 'Baby-Pflege':['babypflege','wickeltasche','wickelunterlage','babybürste','babybuerste','nasensauger'],
 'Baby-Spielzeug':['babyspielzeug','greifling','rassel','mobile','motorikspielzeug'],
 'Baby-Ausstattung':['babyphone','laufgitter','hochstuhl','babytrage','kinderwagen-zubehör','kinderwagen'],
};
for(const [name,terms] of Object.entries(subs)){
  const m=prods.filter(p=>terms.some(term=>low(p).includes(term)));
  console.log(`\nSUB ${name}: ${m.length} (active ${m.filter(p=>p.status==='ACTIVE').length})`);
  for(const term of terms){const c=prods.filter(p=>low(p).includes(term)).length;if(c)console.log(`   "${term}": ${c}`);}
}
// sample parent titles
console.log('\n--- sample PARENT titles ---');
for(const p of parent.slice(0,40))console.log(`  [${p.status}] ${p.title}  {${(p.tags||[]).join(',')}}`);
