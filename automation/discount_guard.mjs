#!/usr/bin/env node
/**
 * discount_guard.mjs — sorgt dafür, dass der Willkommens-Code (WELCOME10) NIE abläuft.
 * Prüft den Code: läuft er in <EXTEND_DAYS Tagen ab oder ist er inaktiv/abgelaufen → endsAt um 1 Jahr verlängern.
 * (Der Willkommensrabatt ist ein Conversion-Hebel; ein abgelaufener Code im Popup/Mails kostet Verkäufe.)
 *
 * No-op-sicher · DRY-Default · LIVE=1.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 *      DISCOUNT_CODE=WELCOME10  EXTEND_DAYS=30  EXTEND_MONTHS=12
 */
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=process.env.SHOPIFY_CLIENT_SECRET||'',
  LIVE=process.env.LIVE==='1', CODE=process.env.DISCOUNT_CODE||'WELCOME10',
  EXTEND_DAYS=parseInt(process.env.EXTEND_DAYS||'30',10), EXTEND_MONTHS=parseInt(process.env.EXTEND_MONTHS||'12',10), API='2025-01';

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
async function gql(token,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
  const j=await r.json(); if(j.errors) throw new Error('GraphQL: '+JSON.stringify(j.errors).slice(0,300)); return j.data;
}

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE, code:CODE };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  const d=await gql(token,`query($c:String!){ codeDiscountNodeByCode(code:$c){ id codeDiscount{ __typename ... on DiscountCodeBasic{ title status endsAt } } } }`,{c:CODE});
  const node=d.codeDiscountNodeByCode;
  if(!node){ report.found=false; console.log(JSON.stringify(report,null,2)); return; }
  report.found=true;
  const cd=node.codeDiscount; report.status=cd.status; report.endsAt=cd.endsAt;
  const now=Date.now();
  const ends=cd.endsAt?Date.parse(cd.endsAt):null;
  const expiringSoon = ends!==null && ends < now + EXTEND_DAYS*864e5;
  const inactive = cd.status!=='ACTIVE';
  report.needsExtend = expiringSoon || inactive;

  if(LIVE && (expiringSoon || inactive)){
    const newEnd=new Date(now + EXTEND_MONTHS*30*864e5).toISOString();
    const u=await gql(token,`mutation($id:ID!,$d:DiscountCodeBasicInput!){ discountCodeBasicUpdate(id:$id, basicCodeDiscount:$d){ codeDiscountNode{id} userErrors{message} } }`,
      {id:node.id, d:{ endsAt:newEnd }});
    const e=u.discountCodeBasicUpdate.userErrors;
    if(e.length){ report.error=e; } else { report.extendedTo=newEnd; }
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
