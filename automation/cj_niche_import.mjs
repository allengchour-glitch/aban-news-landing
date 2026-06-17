/* cj_niche_import.mjs — importiert Nischen-Gadgets von CJ (Gaming-Schwerpunkt, Anime, Angeln, Tauchen,
 * Metalldetektor, Velo, Fitness). CJ-Suche ist lose → strenger Namens-Filter (must/ban).
 * Token: /tmp/cj_token.json (CJ-Access-Token). Shopify via Client-Credentials (Env). Groq für DE-Titel.
 * Lauf: set -a; . /tmp/shopify_creds.env; set +a; CATS=gaming PER=25 LIVE=1 node automation/cj_niche_import.mjs
 * No-op ohne Shopify-Creds. Idempotent via dropship/cj_niche_done.txt.
 */
import fs from 'node:fs';
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*$/,'');
const CID=process.env.SHOPIFY_CLIENT_ID||'', CSEC=process.env.SHOPIFY_CLIENT_SECRET||'', API='2025-01';
const GKEY=(()=>{try{return fs.readFileSync('/tmp/groq.key','utf8').trim();}catch{return'';}})();
const CJTOK=(()=>{try{return JSON.parse(fs.readFileSync('/tmp/cj_token.json','utf8')).accessToken||'';}catch{return'';}})();
const PER=parseInt(process.env.PER||'20',10);
const DRY=process.env.LIVE!=='1';
const CATS=(process.env.CATS||'gaming').split(',').map(s=>s.trim()).filter(Boolean);
const LEDGER='dropship/cj_niche_done.txt';
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split(/\n/).filter(Boolean):[]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chf=usd=>{const v=Math.max(9.9,(parseFloat(usd)||0)*2.4);return (Math.floor(v)+0.90).toFixed(2);};

const NICHE={
  gaming:{coll:{handle:'gaming',title:'🎮 Gaming',tag:'gaming'},type:'Gaming',tags:['gaming','tech','hype-2026','geschenk'],
    kw:['gaming mouse','gaming keyboard','gaming headset','gaming mouse pad','game controller','gamepad joystick','mechanical keyboard rgb','gaming headphone'],
    must:['gaming mouse','gaming mice','gaming keyboard','mechanical keyboard','gaming headset','gaming headphone','game controller','gamepad','joystick','mouse pad','mousepad','controller for'],
    ban:['trap','falle','rat ','rodent','pet ','animal','jewelry','schmuck','pendant','necklace','ring ','symbol','hindu','toy','kids','child','water gun','wasserpistole','sculpture','skulptur','statue','glasses','eye ','bag','phone case','sticker','decoration','figurine']},
  anime:{coll:{handle:'anime-manga',title:'🎌 Anime & Manga',tag:'anime'},type:'Anime',tags:['anime','geschenk','hype-2026','sammler'],
    kw:['anime figure','anime keychain','anime acrylic stand','naruto figure','one piece figure','dragon ball figure','anime poster','demon slayer'],
    must:['anime','manga','naruto','one piece','dragon ball','demon slayer','figure','keychain','acrylic'],
    ban:['costume','wig only','phone case','bedding','blanket']},
  fishing:{coll:{handle:'angeln',title:'🎣 Angeln',tag:'angeln'},type:'Angelsport',tags:['angeln','outdoor','hobby'],
    kw:['fishing lure','fishing reel','fishing rod','fishing line','fishing hook set','soft bait fishing'],
    must:['fishing','lure','reel','rod','bait','hook','tackle'],ban:['toy','kids','clothing','shirt']},
  tauchen:{coll:{handle:'tauchen-schnorcheln',title:'🤿 Tauchen & Schnorcheln',tag:'tauchen'},type:'Wassersport',tags:['tauchen','wassersport','sommer'],
    kw:['diving mask snorkel','snorkel set','swimming goggles anti fog','diving fins','freediving mask'],
    must:['diving','snorkel','goggles','fins','mask'],ban:['toy','baby','inflatable','arm float']},
  metalldetektor:{coll:{handle:'metalldetektoren-schatzsuche',title:'🔍 Metalldetektoren & Schatzsuche',tag:'metalldetektor'},type:'Metalldetektor',tags:['metalldetektor','outdoor','hobby','schatzsuche'],
    kw:['metal detector','treasure hunting detector','gold detector','pinpointer metal'],
    must:['metal detector','detector','pinpointer'],ban:['stud finder','wall scanner','cable','voltage']},
  velo:{coll:{handle:'velo-radsport',title:'🚲 Velo & Radsport',tag:'velo'},type:'Radsport',tags:['velo','fahrrad','sport','outdoor'],
    kw:['bicycle light','bike phone holder','bike pump','bike repair tool','bicycle bell','bike bag frame'],
    must:['bicycle','bike','cycling'],ban:['kids','toy','child','decoration','wall']},
  fitness:{coll:{handle:'fitness-training',title:'💪 Fitness & Training',tag:'fitness'},type:'Fitness',tags:['fitness','sport','training','wellness'],
    kw:['resistance band set','adjustable dumbbell','jump rope counter','ab roller wheel','fascia massage gun','hand grip strengthener'],
    must:['resistance','dumbbell','jump rope','ab roller','massage gun','grip','fitness','workout'],ban:['kids','toy']},
};

async function cjSearch(kw){
  const u=`https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=30&productNameEn=${encodeURIComponent(kw)}`;
  for(let a=0;a<4;a++){ try{ const r=await fetch(u,{headers:{'CJ-Access-Token':CJTOK}}); const j=await r.json(); if(j.code===200) return j.data?.list||[]; if(/frequ|limit/i.test(j.message||'')){await sleep(3000*(a+1));continue;} return []; }catch{await sleep(2000);} }
  return [];
}
async function sgql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
async function sToken(){if(!CID||!CSEC)return null;const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json().catch(()=>({}))).access_token||null;}
async function groqTitles(names){ if(!GKEY||!names.length) return names.map(()=>null);
  try{ const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+GKEY},body:JSON.stringify({model:"llama-3.3-70b-versatile",temperature:0.3,messages:[{role:'system',content:'Gib NUR ein JSON-Array zurück, gleiche Reihenfolge.'},{role:'user',content:`Mach aus jedem englischen Produktnamen einen knackigen DEUTSCHEN Shop-Titel (max 60 Zeichen, kein Markenklau, mit kurzem Nutzen, kein Code/keine Masse). Rohnamen:\n${JSON.stringify(names)}`}]})});
    const j=await r.json(); let t=(j.choices?.[0]?.message?.content||'').replace(/^```(json)?/i,'').replace(/```$/,'').trim(); const a=JSON.parse(t); return a.length===names.length?a:names.map(()=>null);
  }catch{ return names.map(()=>null); }
}
const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{id} userErrors{message} } }`;
const PUBQ=`mutation($id:ID!,$p:[PublicationInput!]!){ publishablePublish(id:$id,input:$p){ userErrors{message} } }`;
const COLLQ=`mutation($h:String!,$t:String!){ collectionCreate(input:{title:$t,handle:$h,ruleSet:{appliedDisjunctively:false,rules:[{column:TAG,relation:EQUALS,condition:$h}]}}){ collection{id} userErrors{message} } }`;
function clean(s){return (s||'').replace(/^\[?"|"\]?$/g,'').split('","')[0].replace(/["\[\]]/g,'').trim();}

const tok=await sToken(); if(!tok){console.log('Keine Shopify-Creds → No-op');process.exit(0);}
// Publications
const pr=await sgql(tok,`{publications(first:10){nodes{id name}}}`);
const pubs=(pr.data?.publications?.nodes||[]).filter(p=>p.name!=='Point of Sale').map(p=>({publicationId:p.id}));

for(const cat of CATS){
  const cfg=NICHE[cat]; if(!cfg){console.log('unbekannt:',cat);continue;}
  console.log(`\n=== ${cfg.coll.title} ===`);
  // Collection (idempotent)
  await sgql(tok,COLLQ,{h:cfg.coll.tag,t:cfg.coll.title});
  // Kandidaten sammeln
  const seen=new Set(), picks=[];
  for(const kw of cfg.kw){
    if(picks.length>=PER) break;
    const list=await cjSearch(kw); await sleep(900);
    for(const p of list){
      if(picks.length>=PER) break;
      const nm=clean(p.productNameEn).toLowerCase();
      if(!nm) continue;
      if(done.has('cj:'+p.pid)||seen.has(p.pid)) continue;
      if(!cfg.must.some(m=>nm.includes(m))) continue;
      if(cfg.ban.some(b=>nm.includes(b))) continue;
      if(!p.productImage||!/^https/.test(p.productImage)) continue;
      const price=parseFloat(p.sellPrice)||0; if(price<=0||price>120) continue;
      seen.add(p.pid); picks.push({pid:p.pid,name:clean(p.productNameEn),img:p.productImage,price:chf(p.sellPrice),sku:p.productSku});
    }
  }
  console.log(`  ${picks.length} saubere Kandidaten.`);
  const titles=await groqTitles(picks.map(p=>p.name));
  let created=0;
  for(let i=0;i<picks.length;i++){
    const p=picks[i]; const title=(titles[i]||p.name).replace(/["<>]/g,'').slice(0,60).trim();
    const handle=(title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).slice(0,55)+'-'+String(p.pid).slice(-6);
    const desc=`<p style="background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;padding:10px 14px;font-size:13px;margin:0 0 14px;">📦 <strong>Lieferzeit</strong>: 🇨🇭 CH/EU 8–16 Tage · inkl. Produktion</p>`
      +`<p><strong>${title}</strong></p><ul><li>Top für ${cfg.coll.title.replace(/[^\wäöüÄÖÜ &]/g,'').trim()}</li><li>Beliebt & gefragt</li><li>Gutes Preis-Leistungs-Verhältnis</li></ul>`
      +`<p>🇨🇭 Schweizer Shop · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>`;
    if(DRY){console.log('  [DRY]',title,'CHF',p.price);created++;continue;}
    const input={title,handle,productType:cfg.type,vendor:'LuxeStyle',status:'ACTIVE',tags:[cfg.coll.tag,...cfg.tags,'cj-real','dropship'],
      descriptionHtml:desc,seo:{title:`${title} | LuxeStyle`.slice(0,70),description:`${title} – jetzt bei LuxeStyle Schweiz. Gratis-Versand ab CHF 65, 30 Tage Rückgabe, –10% mit WELCOME10.`.slice(0,320)},
      productOptions:[{name:'Titel',values:[{name:'Standard'}]}],
      variants:[{optionValues:[{optionName:'Titel',name:'Standard'}],price:p.price,inventoryItem:{sku:`CJ-${p.sku}`.slice(0,70),tracked:false},inventoryPolicy:'CONTINUE'}],
      files:[{originalSource:p.img,contentType:'IMAGE'}]};
    const r=await sgql(tok,SET,{input}); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
    if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,120));continue;}
    if(pubs.length) await sgql(tok,PUBQ,{id:pid,p:pubs});
    fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); created++; console.log('  ✅',title,'→ CHF',p.price);
    await sleep(400);
  }
  console.log(`  ${cfg.coll.title}: ${created} angelegt${DRY?' [DRY]':''}.`);
}
console.log('\nFERTIG.');
