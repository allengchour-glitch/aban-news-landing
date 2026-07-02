import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const DRY=process.env.DRY==='1';
const items=JSON.parse(fs.readFileSync('/tmp/cj_typ.json','utf8'));
// echte, natürliche Umschreibung der maschinen-Typnamen (nichts erfunden — nur Produkttyp klarer benannt)
const MAP={
 'Ergo-Mauspad':'Ergonomisches Gaming-Mauspad',
 'Farbwechsel-Maus':'Gaming-Maus mit RGB-Beleuchtung',
 'Leicht-Maus':'Gaming-Maus (leicht)',
 'Mechanische-Tastatur':'Mechanische Gaming-Tastatur',
 'Bluetooth-Tastatur':'Kabellose Bluetooth-Tastatur',
 'Gaming-Headset':'Gaming-Headset mit Mikrofon',
 'Bluetooth-Headset':'Kabelloses Bluetooth-Headset',
 'Grosse Maus-Matte':'XXL Gaming-Mauspad',
 'Spiel-Set 87 Tasten':'Gaming-Tastatur mit 87 Tasten',
 'Spiel-Set T87':'Gaming-Tastatur «T87»',
 'Gaming-Set UK':'Gaming-Set · Tastatur & Maus',
 'Fischer-Station mit Rollen':'Angel-Sitzkiepe mit Rollen',
 'Hydraulikventil':'Hydraulikventil',
};
async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const UP=`mutation($id:ID!,$t:String!,$s:String!){productUpdate(input:{id:$id,title:$t,seo:{title:$s}}){userErrors{message}}}`;
const T=DRY?null:await tok();
let done=0,planned=[];
for(const p of items){
 const m=p.title.match(/^(.*?)\s*\(Typ\s+([^)]+)\)\s*$/);
 if(!m)continue;
 const base=m[1].trim(), ref=m[2].trim();
 const nice=MAP[base]||base;
 const nt=`${nice} (Typ ${ref})`.slice(0,90); // Typ bleibt: einziger echter Unterscheider (CJ-API tot, Specs zu dünn)
 planned.push(`${p.title}  →  ${nt}`);
 if(!DRY){const r=await gql(T,UP,{id:p.id,t:nt,s:(nice+' | LuxeStyle CH').slice(0,70)});if(!(r.data?.productUpdate?.userErrors||[]).length)done++;await new Promise(r=>setTimeout(r,90));}
}
console.log(planned.join('\n'));
console.log(DRY?`\n[DRY] ${planned.length}`:`\nFERTIG: ${done}/${planned.length} umbenannt.`);
