import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const CJT=fs.readFileSync('/tmp/cj_token.txt','utf8').trim();
const GK=fs.readFileSync('/tmp/gemini_key','utf8').trim();
const DRY=process.env.DRY==='1', LIMIT=parseInt(process.env.LIMIT||'99',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const arr=x=>{if(Array.isArray(x))return x;if(typeof x==="string"){try{const p=JSON.parse(x);return Array.isArray(p)?p:[x];}catch{return [x];}}return [];};
const real=JSON.parse(fs.readFileSync('/tmp/cj_real.json','utf8')).filter(x=>x.nameEn);
async function shTok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
async function cj(sku){try{const r=await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku=${encodeURIComponent(sku)}`,{headers:{'CJ-Access-Token':CJT}});const j=await r.json();return j.result?j.data:null;}catch{return null;}}
async function gemini(nameEn,feats,facts){
 const prompt=`Übersetze & schreibe eine DEUTSCHE Produktbeschreibung (Schweizer Shop, Stil Galaxus: sachlich, ehrlich, ausführlich, 130-200 Wörter). NUR aus den gegebenen Fakten – NICHTS erfinden, keine erfundenen Zahlen/Marken.
Produkt (EN): ${nameEn}
Feature-Text (EN, übersetzen & sauber zusammenfassen): ${feats.slice(0,1200)}
Bekannte Fakten: ${facts}
HTML: 1 Einleitungs-<p>, dann <h3>Das zeichnet es aus</h3> mit 3-4 <li> in einem <ul> (echte Vorteile aus dem Feature-Text), dann <h3>Gut zu wissen</h3> mit 1 <p>. Schweizer Rechtschreibung (ss statt ß). Kein Preis/Versand/Rabatt. Nur HTML, keine Markdown-Fences.`;
 for(let i=0;i<3;i++){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.6,maxOutputTokens:2000,thinkingConfig:{thinkingBudget:0}}})});
  const j=await r.json();if(j.error){if(j.error.code===429){await sleep(15000);continue;}return null;}
  let t=j.candidates?.[0]?.content?.parts?.[0]?.text||'';t=t.replace(/```html?/g,'').replace(/```/g,'').trim();if(t.length>120)return t;}
 return null;
}
const TRUST=`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ Geprüfte Qualität · \u{1F69A} Lieferung ca. 8–16 Tage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop · \u{1F4B3} TWINT, Karte & Klarna.</div>\n<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;
function specsList(d){
 const li=[]; const v=(d.variants||[])[0]||{};
 const TMAP={'Mouse Pad':'Mauspad','Rubber Mouse Pad':'Mauspad (Gummi)','Keyboard':'Tastatur','Gaming Keyboard':'Gaming-Tastatur','Mouse':'Maus','Gaming Mouse':'Gaming-Maus','Headset':'Headset','Headphone':'Kopfhörer','Earphone':'Kopfhörer'};const type=TMAP[d.entryNameEn]||d.entryNameEn||''; if(type)li.push(`<li><strong>Produktart:</strong> ${type}</li>`);
 const mat=arr(d.materialNameEn).filter(m=>m&&!/others/i.test(m)).join(', '); if(mat)li.push(`<li><strong>Material:</strong> ${mat}</li>`);
 if(v.variantLength&&v.variantWidth){const L=(v.variantLength/10),W=(v.variantWidth/10),H=v.variantHeight?(v.variantHeight/10):0;li.push(`<li><strong>Masse:</strong> ca. ${L}×${W}${H?'×'+H:''} cm</li>`);}
 if(d.productWeight)li.push(`<li><strong>Gewicht:</strong> ca. ${Math.round(Number(d.productWeight))} g</li>`);
 const col=v.variantKey&&!/as shown|color/i.test(v.variantKey)?v.variantKey:''; if(col)li.push(`<li><strong>Ausführung:</strong> ${col}</li>`);
 return li.length?`<h3>Eigenschaften</h3>\n<ul>\n${li.join('\n')}\n</ul>`:'';
}
const T=DRY?null:await shTok();
const UP=`mutation($id:ID!,$d:String!){productUpdate(input:{id:$id,descriptionHtml:$d}){userErrors{message}}}`;
const TAG=`mutation($id:ID!){tagsAdd(id:$id,tags:["cj-real-desc"]){userErrors{message}}}`;
let done=0;
for(const p of real.slice(0,LIMIT)){
 const d=await cj(p.sku); await sleep(600); if(!d){console.log('  CJ miss',p.sku);continue;}
 const feats=(d.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 const facts=[d.entryNameEn,arr(d.materialNameEn).filter(m=>!/others/i.test(m)).join('/'),d.productWeight?d.productWeight+'g':''].filter(Boolean).join(' · ');
 const prose=await gemini(p.nameEn,feats,facts); await sleep(4200);
 if(!prose){console.log('  gemini miss',p.nameEn.slice(0,30));continue;}
 const html=`${prose}\n${specsList(d)}\n${TRUST}`;
 if(DRY){console.log('\n=== '+p.nameEn.slice(0,50)+' ===');console.log(prose.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,400));console.log('SPECS:',specsList(d).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,150));done++;if(done>=2)break;continue;}
 const ur=await gql(T,UP,{id:p.id,d:html}); if((ur.data?.productUpdate?.userErrors||[]).length){console.log('  ✗',JSON.stringify(ur.data.productUpdate.userErrors).slice(0,80));continue;}
 await gql(T,TAG,{id:p.id}); done++; console.log('  ✓',p.nameEn.slice(0,40));
}
console.log(DRY?`\n[DRY] ${done} Vorschau`:`\nFERTIG: ${done}/${real.length} Beschreibungen angereichert.`);
