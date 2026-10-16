import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com', TOK=fs.readFileSync('.shoptok','utf8').trim();
const gql=async(q,v)=>{for(let i=0;i<6;i++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',
 headers:{'X-Shopify-Access-Token':TOK,'Content-Type':'application/json'},body:JSON.stringify({query:q,variables:v})});
 const j=await r.json(); if(j.errors&&JSON.stringify(j.errors).includes('Throttled')){await new Promise(s=>setTimeout(s,2500*(i+1)));continue;} return j;} throw new Error('t');};

// Wortgrenzen-genaue Marken. Mehrdeutiges (Puma=Tier, Boss, Fila, Jordan) getrennt gefuehrt.
const EINDEUTIG = ['adidas','nike','disney','frozen','marvel','pixar','lego','playmobil','barbie','hello kitty',
 'pokemon','pokémon','harry potter','star wars','spiderman','spider-man','batman','superman','minecraft',
 'paw patrol','peppa pig','gucci','prada','chanel','louis vuitton','rolex','apple','samsung','sony','playstation',
 'xbox','nintendo','ferrari','lamborghini','porsche','bmw','mercedes','audi','coca-cola','red bull','ikea',
 'north face','under armour','reebok','new balance','converse','vans','levis','levi\'s','tommy hilfiger',
 'calvin klein','ray-ban','rayban','oakley','dyson','bosch','philips','nivea','loreal','l\'oreal','gillette'];
const MEHRDEUTIG = ['puma','boss','fila','jordan','champion','guess','diesel','mango','gap','polo','umbro','lotto'];

const rx = ws => new RegExp('(^|[^\\p{L}])(' + ws.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')([^\\p{L}]|$)','iu');
const RE_E = rx(EINDEUTIG), RE_M = rx(MEHRDEUTIG);

let c=null, seiten=0, n=0;
const eindeutig=[], mehrdeutig=[];
do{
  const r=await gql(`query($c:String){ products(first:200, after:$c, query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor}
    nodes{ handle title vendor productType tags resourcePublicationsCount{count} } } }`,{c});
  const p=r?.data?.products; if(!p){console.error(JSON.stringify(r).slice(0,200));break;}
  for(const x of p.nodes){ n++;
    const feld = `${x.title} ${x.vendor||''}`;
    const me=feld.match(RE_E), mm=feld.match(RE_M);
    if(me) eindeutig.push({h:x.handle,t:x.title,m:me[2],kan:x.resourcePublicationsCount?.count,tags:x.tags.slice(0,4)});
    else if(mm) mehrdeutig.push({h:x.handle,t:x.title,m:mm[2],kan:x.resourcePublicationsCount?.count});
  }
  c=p.pageInfo.hasNextPage?p.pageInfo.endCursor:null; seiten++;
}while(c && seiten<250);

console.log(`Aktive Produkte geprüft: ${n}\n`);
console.log(`⛔ EINDEUTIGE Marken im Titel/Vendor: ${eindeutig.length}`);
const z={}; eindeutig.forEach(x=>z[x.m.toLowerCase()]=(z[x.m.toLowerCase()]||0)+1);
Object.entries(z).sort((a,b)=>b[1]-a[1]).slice(0,18).forEach(([k,v])=>console.log(`   ${String(v).padStart(4)}×  ${k}`));
console.log(`\n🟡 MEHRDEUTIG (Wort kann harmlos sein): ${mehrdeutig.length}`);
const z2={}; mehrdeutig.forEach(x=>z2[x.m.toLowerCase()]=(z2[x.m.toLowerCase()]||0)+1);
Object.entries(z2).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>console.log(`   ${String(v).padStart(4)}×  ${k}`));
console.log('\nBeispiele eindeutig:');
eindeutig.slice(0,12).forEach(x=>console.log(`   [${x.m}] ${x.kan} Kan · ${x.t.slice(0,62)}`));
fs.writeFileSync('marken_treffer.json',JSON.stringify({eindeutig,mehrdeutig},null,1));
// Gegenprobe
console.log('\nGegenprobe Regex:',
  RE_E.test('Nike Air Max Schuhe')?'ok':'KAPUTT',
  !RE_E.test('Nikotinfreie Alternative')?'ok (kein Teilwort)':'KAPUTT',
  !RE_E.test('Applikation aus Spitze')?'ok (Apple≠Applikation)':'KAPUTT',
  RE_M.test('Puma Trainingsjacke')?'ok':'KAPUTT');
