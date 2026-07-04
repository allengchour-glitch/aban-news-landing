#!/usr/bin/env node
/* gemini_descriptions.mjs — baut kurze Beschreibungen zu langen Galaxus-Texten aus (Gemini 2.5-flash, grounded).
 * Nimmt die vorhandene Eigenschaften-Liste als FAKTEN → Gemini schreibt ausführliche DE-Prosa (nichts erfinden)
 * → Prosa + Eigenschaften-Liste (behalten) + Trust-Block. Taggt 'gemini-desc' zum Dedup.
 * ENV: GEMINI_API_KEY · SHOPIFY_CLIENT_ID/SECRET · QUERY (Default "tag:marke AND -tag:gemini-desc") · LIMIT=100 · DRY=1
 */
const KEY=(process.env.GEMINI_API_KEY||'').trim();
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const QUERY=process.env.QUERY||'tag:marke AND -tag:gemini-desc';
const LIMIT=parseInt(process.env.LIMIT||'100',10), DRY=process.env.DRY==='1';
const MODEL='gemini-2.5-flash';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function tok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const Q=`query($c:String){products(first:30,after:$c,query:${JSON.stringify(QUERY)}){pageInfo{hasNextPage endCursor}nodes{id title descriptionHtml productType}}}`;
const UP=`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
const TAG=`mutation($id:ID!){tagsAdd(id:$id,tags:["gemini-desc"]){userErrors{message}}}`;

function extract(html){
 // Eigenschaften-<ul> + Trust-<div> aus vorhandener Beschreibung ziehen (behalten)
 const ul=(html.match(/<h3>Eigenschaften<\/h3>\s*<ul>[\s\S]*?<\/ul>/i)||[''])[0];
 const trust=(html.match(/<div style="background:#f7faf7[\s\S]*?<\/div>\s*(?:<p>[^<]*WELCOME10[\s\S]*?<\/p>)?/i)||[''])[0]
   || `<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ 100 % Original-Markenware · \u{1F69A} EU-Lager – Lieferung ca. 3–7 Tage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop.</div>\n<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;
 // Fakten = Text der ul-Items
 // NUR echte Spec-Fakten (aus Eigenschaften-Liste) — verhindert Halluzination bei spec-armen Produkten (Parfum/Schmuck)
 const facts=[...ul.matchAll(/<li>[\s\S]*?<strong>([^<]+)<\/strong>\s*([^<]*)<\/li>/gi)].map(m=>`${m[1].replace(/:$/,'')}: ${m[2].trim()}`).join(' · ');
 return {ul,trust,facts};
}
async function gemini(title,facts,ptype){
 const prompt=`Du bist Produkttexter für einen Schweizer Premium-Online-Shop (Stil wie Galaxus: sachlich, informativ, ausführlich, vertrauenswürdig). Schreibe eine DEUTSCHE Produktbeschreibung (220-320 Wörter). Bleibe strikt beim Produkttyp und den Fakten – NICHTS erfinden (keine erfundenen Zahlen/Materialien/Funktionen). Wenn es z. B. ein Parfum ist, beschreibe ein Parfum; wenn eine Uhr, eine Uhr.
Produkttyp/Kategorie: ${ptype||'—'}
Titel: ${title}
Bekannte Angaben: ${facts||'(wenig Detaildaten – bleib beim Produkttyp, allgemein & ehrlich, keine Spezifika erfinden)'}
HTML-Struktur: 1 Einleitungs-<p>, dann <h3>Das zeichnet es aus</h3> (2 <p>), <h3>Für wen geeignet</h3> (1 <p>), <h3>Gut zu wissen</h3> (1 <p>). Schweizer Rechtschreibung (ss statt ß). Kein Preis, kein Versand, kein Rabattcode. Gib NUR das HTML aus, ohne Markdown-Fences.`;
 for(let i=0;i<4;i++){
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:2500,thinkingConfig:{thinkingBudget:0}}})});
  const j=await r.json();
  if(j.error){if(j.error.code===429){await sleep(20000);continue;}return null;}
  let t=j.candidates?.[0]?.content?.parts?.[0]?.text||'';
  t=t.replace(/```html?/g,'').replace(/```/g,'').trim();
  if(t.length>120)return t;
 }
 return null;
}

const T=DRY?null:await tok();
let cursor=null,done=0,upd=0;
outer: while(true){
 const r=await gql(await tok(),Q,{c:cursor}); const conn=r.data?.products; if(!conn){console.log('q fail',JSON.stringify(r).slice(0,150));break;}
 for(const p of conn.nodes){
  if(done>=LIMIT)break outer; done++;
  const {ul,trust,facts}=extract(p.descriptionHtml||'');
  if(facts.split('·').filter(x=>x.trim()).length<2){continue;} // ohne echte Specs überspringen (Halluzinations-Schutz)
  const prose=await gemini(p.title,facts,p.productType); await sleep(4200); // Rate-Limit Gemini free ~15rpm
  if(!prose){console.log('  skip (gemini):',p.title.slice(0,30));continue;}
  const html=`${prose}\n${ul}\n${trust}`;
  if(DRY){if(upd<2)console.log('\n=== '+p.title.slice(0,40)+' ===\n'+prose.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,500));upd++;continue;}
  const ur=await gql(T,UP,{id:p.id,d:html}); if((ur.data?.productUpdate?.userErrors||[]).length){continue;}
  await gql(T,TAG,{id:p.id});
  upd++; if(upd%20===0)console.log(`  ${upd} Galaxus-Langtexte…`);
 }
 if(!conn.pageInfo.hasNextPage)break; cursor=conn.pageInfo.endCursor;
}
console.log(`FERTIG: ${upd}/${done} Gemini-Galaxus-Beschreibungen${DRY?' [DRY]':''}.`);
