#!/usr/bin/env node
/* feed_details_fill — ergänzt Produktbeschreibungen um die von Google Merchant geforderten Details
 * (Farbe, Muster, Material). Werte GEGROUNDET: Farbe/Grösse aus Varianten-Optionen, Material/Muster
 * aus Titel+Beschreibung extrahiert. Nichts erfunden. Idempotent (Marker) + Ledger.
 * ENV: SHOPIFY_*. IDS=/tmp/feed_pids.txt (eine Produkt-Nummer/Zeile). LIVE=1 schreibt. MAX=Zahl.
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,API='2025-01',CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const LIVE=process.env.LIVE==='1';
const IDS=process.env.IDS||'/tmp/feed_pids.txt';
const MAX=Number(process.env.MAX||0);
const LEDGER=process.env.LEDGER||'dropship/feed_details_done.txt';
const MARK='<!--gdetails-->';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchT(u,o={},ms=25000){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,{...o,signal:ac.signal});}finally{clearTimeout(to);}}
const tok=async()=>{const r=await fetchT(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;};
let T=await tok();
const gql=async(q,v)=>{for(let a=0;a<5;a++){let r;try{r=await fetchT(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':T},body:JSON.stringify({query:q,variables:v})},30000);}catch{await sleep(1500);continue;}if(r.status===401){T=await tok();continue;}if(r.status===429||r.status>=500){await sleep((a+1)*1500);continue;}return r.json();}return null;};

// Material- & Muster-Vokabular (DE + EN→DE), Wortgrenzen
const MATERIALS=[['baumwolle','Baumwolle'],['cotton','Baumwolle'],['polyester','Polyester'],['leinen','Leinen'],['linen','Leinen'],['viskose','Viskose'],['viscose','Viskose'],['elastan','Elastan'],['spandex','Elastan'],['nylon','Nylon'],['polyamid','Polyamid'],['seide','Seide'],['silk','Seide'],['wolle','Wolle'],['wool','Wolle'],['kaschmir','Kaschmir'],['cashmere','Kaschmir'],['denim','Denim'],['jeans','Denim'],['leder','Leder'],['leather','Leder'],['kunstleder','Kunstleder'],['fleece','Fleece'],['chiffon','Chiffon'],['satin','Satin'],['samt','Samt'],['velvet','Samt'],['cord','Cord'],['jersey','Jersey'],['strick','Strick'],['knit','Strick'],['modal','Modal'],['acryl','Acryl'],['bambus','Bambus']];
const PATTERNS=[['bedruckt','Bedruckt'],['print','Bedruckt'],['gestreift','Gestreift'],['stripe','Gestreift'],['striped','Gestreift'],['gepunktet','Gepunktet'],['polka','Gepunktet'],['dotted','Gepunktet'],['geblümt','Geblümt'],['floral','Geblümt'],['blumen','Geblümt'],['kariert','Kariert'],['plaid','Kariert'],['check','Kariert'],['einfarbig','Uni'],['\\buni\\b','Uni'],['solid','Uni'],['gemustert','Gemustert'],['leopard','Leopard-Print'],['animal print','Animal-Print'],['camouflage','Camouflage'],['batik','Batik'],['patchwork','Patchwork'],['häkel','Häkelmuster'],['spitze','Spitze'],['lace','Spitze'],['glitzer','Glitzer'],['metallic','Metallic']];
const findAll=(txt,voc)=>{const low=txt.toLowerCase();const out=[];for(const [re,label] of voc){if(new RegExp(re.includes('\\b')?re:('\\b'+re),'i').test(low)&&!out.includes(label))out.push(label);}return out;};

const idnums=fs.readFileSync(IDS,'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
const Q=`query($id:ID!){product(id:$id){id title descriptionHtml options{name optionValues{name}}}}`;
const UP=`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
let setN=0,skip=0,n=0;
for(const num of idnums){
 const gid=`gid://shopify/Product/${num}`;
 if(done.has(num)){skip++;continue;}
 const r=await gql(Q,{id:gid}); const p=r?.data?.product;
 if(!p){done.add(num);continue;}
 if((p.descriptionHtml||'').includes(MARK)){done.add(num);skip++;continue;}
 const opt=n=>{const o=(p.options||[]).find(x=>new RegExp('^'+n+'$','i').test(x.name));return o?o.optionValues.map(v=>v.name):[];};
 const farben=opt('farbe').concat(opt('color')); const groessen=opt('grösse').concat(opt('grosse')).concat(opt('size'));
 const txt=(p.title+' '+(p.descriptionHtml||'').replace(/<[^>]+>/g,' '));
 const mat=findAll(txt,MATERIALS); const mus=findAll(txt,PATTERNS);
 const li=[];
 if(farben.length)li.push(`<li><strong>Farbe:</strong> ${farben.slice(0,12).join(', ')}</li>`);
 if(mus.length)li.push(`<li><strong>Muster:</strong> ${mus.slice(0,4).join(', ')}</li>`);
 if(mat.length)li.push(`<li><strong>Material:</strong> ${mat.slice(0,4).join(', ')}</li>`);
 if(groessen.length)li.push(`<li><strong>Grösse:</strong> ${groessen.slice(0,12).join(', ')}</li>`);
 if(!li.length){done.add(num);skip++;continue;}
 const block=`\n<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>${li.join('')}</ul></div>${MARK}`;
 const nd=(p.descriptionHtml||'')+block;
 if(LIVE){const u=await gql(UP,{id:gid,d:nd});if(!(u?.data?.productUpdate?.userErrors||[]).length){setN++;done.add(num);}await sleep(120);}
 else{setN++;console.log(`[DRY] ${p.title.slice(0,32)} → ${li.map(x=>x.match(/<strong>([^:]+)/)[1]).join('+')}`);}
 n++;
 if(LIVE&&setN%25===0){fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');console.log(`  … ${setN} ergänzt`);}
 if(MAX&&setN>=MAX)break;
}
if(LIVE)fs.writeFileSync(LEDGER,[...done].join('\n')+'\n');
console.log(`\nFERTIG${LIVE?'':' [DRY]'}: ${setN} Produkte mit Detail-Block · ${skip} übersprungen (von ${idnums.length}).`);
