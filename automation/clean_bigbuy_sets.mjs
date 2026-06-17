/* clean_bigbuy_sets.mjs — säubert die importierten BigBuy-Trainingsanzug-Titel (BigBuy-Codes raus),
 * setzt saubere DE-Titel + SEO via Groq, und archiviert Off-Brand „Verkleidung"-Kostüme.
 * Token via Client-Credentials (Env). Groq-Key /tmp/groq.key. No-op ohne Creds.
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*$/,'');
const CID=process.env.SHOPIFY_CLIENT_ID||'', CSEC=process.env.SHOPIFY_CLIENT_SECRET||'', API='2025-01';
const GKEY=(()=>{try{return fs.readFileSync('/tmp/groq.key','utf8').trim();}catch{return'';}})();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
async function token(){if(!CID||!CSEC){console.log('Keine Creds → No-op');return null;}const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json().catch(()=>({}))).access_token||null;}
async function groqTitles(names){
  if(!GKEY) return names.map(()=>null);
  const sys="Du bist Shop-Texter. Gib NUR ein JSON-Array zurück, gleiche Reihenfolge.";
  const user=`Mach aus jedem BigBuy-Rohnamen einen sauberen deutschen Shop-Titel für einen Trainingsanzug.\nFormat: Trainingsanzug «<Marke + ggf. Modell>» · <Farbe> · <Damen|Herren>\nRegeln: Artikelnummern/Codes ENTFERNEN (z.B. 118289-PS208, 688159 96, 115768-KK001, Cvs/Nbk, Bts, Op, Ts), keine Wort-Dopplung, Marke behalten (Puma/Adidas/Champion/Joluvi/Russell Athletic/John Smith), max 64 Zeichen. Wenn „Herren" vorkommt → Herren, sonst Damen.\nRohnamen:\n${JSON.stringify(names)}`;
  try{
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+GKEY},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:'system',content:sys},{role:'user',content:user}],temperature:0.3})});
    const j=await r.json(); let t=(j.choices?.[0]?.message?.content||'').replace(/^```(json)?/i,'').replace(/```$/,'').trim();
    const arr=JSON.parse(t); return Array.isArray(arr)&&arr.length===names.length?arr:names.map(()=>null);
  }catch(e){ console.log('groq err',e.message); return names.map(()=>null); }
}
const UPD=`mutation($id:ID!,$t:String!,$s:SEOInput!){ productUpdate(input:{id:$id,title:$t,seo:$s}){ userErrors{message} } }`;
const ARCH=`mutation($id:ID!){ productUpdate(input:{id:$id,status:ARCHIVED}){ userErrors{message} } }`;

const tok=await token(); if(!tok) process.exit(0);
// alle BigBuy-Trainingsanzüge holen
let nodes=[], cursor=null;
while(true){
  const q=`query($c:String){ products(first:50,after:$c,query:"tag:set AND tag:bigbuy AND vendor:LuxeStyle"){ pageInfo{hasNextPage endCursor} nodes{ id title } } }`;
  const r=await gql(tok,q,{c:cursor}); const pg=r?.data?.products; if(!pg) break;
  nodes.push(...pg.nodes); if(!pg.pageInfo.hasNextPage) break; cursor=pg.pageInfo.endCursor;
}
console.log('BigBuy-Sets gefunden:', nodes.length);
const costumes=nodes.filter(n=>/verkleidung|kostüm/i.test(n.title));
const real=nodes.filter(n=>!/verkleidung|kostüm/i.test(n.title));
let arch=0;
for(const c of costumes){ const r=await gql(tok,ARCH,{id:c.id}); if(!(r?.data?.productUpdate?.userErrors||[]).length){arch++;console.log('archiviert (Kostüm):',c.title);} await sleep(250); }
const clean=await groqTitles(real.map(n=>n.title));
let upd=0;
for(let i=0;i<real.length;i++){
  const nt=(clean[i]||'').trim(); if(!nt||nt.length<8) continue;
  const seo={title:`${nt} | LuxeStyle`.slice(0,70), description:`${nt} – 100% Original, Marken-Sportswear, schnelle EU-Lieferung (2–7 Tage), Gratis-Versand ab CHF 65, –10% mit WELCOME10.`.slice(0,320)};
  const r=await gql(tok,UPD,{id:real[i].id,t:nt.slice(0,64),s:seo});
  if(!(r?.data?.productUpdate?.userErrors||[]).length){upd++;console.log('✓',real[i].title.slice(0,40),'→',nt);} else console.log('err',JSON.stringify(r?.data?.productUpdate?.userErrors));
  await sleep(300);
}
console.log(`FERTIG: ${upd} Titel gesäubert, ${arch} Kostüme archiviert.`);
