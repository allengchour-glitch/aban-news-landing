import { shopifyClientSecret } from '../lib/shopify_secret.mjs';
export async function createShopifyClient(){
  const shop=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/$/,'');
  if(!/^[a-z0-9-]+\.myshopify\.com$/i.test(shop))throw new Error('Ungültige Shop-Domain');
  // Statische Admin-Tokens können abgelaufen sein; eingerichteten Client-Grant bevorzugen.
  let token=(process.env.SHOPIFY_CLIENT_ID && shopifyClientSecret())?undefined:process.env.SHOPIFY_ADMIN_TOKEN;
  if(!token){
    const id=process.env.SHOPIFY_CLIENT_ID,secret=shopifyClientSecret();
    if(!id||!secret)throw new Error('Shopify-Zugang fehlt');
    const r=await fetch(`https://${shop}/admin/oauth/access_token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:id,client_secret:secret,grant_type:'client_credentials'})});
    if(!r.ok)throw new Error(`Token HTTP ${r.status}`);
    token=(await r.json()).access_token;if(!token)throw new Error('Kein Token erhalten');
  }
  async function gql(query,variables={}){
    const r=await fetch(`https://${shop}/admin/api/2026-10/graphql.json`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
    if(!r.ok)throw new Error(`GraphQL HTTP ${r.status}; keine automatische Wiederholung`);
    const j=await r.json();if(j.errors?.length)throw new Error('GraphQL: '+j.errors.map(e=>e.message).join('; '));
    if(!j.data)throw new Error('GraphQL ohne Daten');return j.data;
  }
  return gql;
}
