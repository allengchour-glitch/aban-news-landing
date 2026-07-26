const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, SHOP='au3j0y-hq.myshopify.com';
const DRY=process.env.DRY==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scc(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return JSON.parse(await r.text()).access_token;}
let TOK=await scc();
const gql=async(q,v)=>{for(let a=0;a<6;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(4000);continue;}TOK=await scc();await sleep(1000);}return null;};

// Entfernt Lieferanten-Codes aus der Beschreibung. Reine Entfernung, kein Umschreiben.
function clean(html){
  let h=html;
  // <li><strong>Artikel-Nr.:</strong> CODE</li>  (mit optionalen Newlines)
  h=h.replace(/<li>\s*<strong>\s*Artikel-?Nr\.?:?\s*<\/strong>[^<]*<\/li>\s*/gi,'');
  // <li><strong>Marke:</strong> FT</li>  (nur exakt Wert "FT")
  h=h.replace(/<li>\s*<strong>\s*Marke:?\s*<\/strong>\s*FT\s*<\/li>\s*/gi,'');
  // Inline-Varianten (HTML-strip-Format ohne <li>): "Artikel-Nr.: CODE" am Satzende
  h=h.replace(/\s*[·—-]?\s*Artikel-?Nr\.?:?\s*[A-Za-z0-9\-]{2,20}\b/gi,'');
  h=h.replace(/\s*[·—-]?\s*Marke:\s*FT\b(?![A-Za-z0-9])/gi,'');
  return h;
}
let after=null, scanned=0, changed=0, samples=[];
const QUERIES=['Artikel-Nr','Marke FT'];
const seen=new Set();
for(const query of QUERIES){
  after=null;
  for(let p=0;p<12;p++){
    const r=await gql(`query($c:String){products(first:40,query:${JSON.stringify(query)},after:$c){pageInfo{hasNextPage endCursor}edges{node{id title descriptionHtml}}}}`,{c:after});
    if(!r){break;}
    for(const e of r.data.products.edges){
      const n=e.node; if(seen.has(n.id))continue; seen.add(n.id); scanned++;
      const before=n.descriptionHtml||''; const nc=clean(before);
      if(nc!==before){
        changed++;
        if(samples.length<4){ samples.push(n.title+' :: '+before.slice(-260).replace(/\n/g,' ')+'  →→→  '+nc.slice(-200).replace(/\n/g,' ')); }
        if(!DRY){ await gql(`mutation($in:ProductInput!){productUpdate(input:$in){userErrors{message}}}`,{in:{id:n.id,descriptionHtml:nc}}); await sleep(280); }
      }
    }
    if(!r.data.products.pageInfo.hasNextPage)break; after=r.data.products.pageInfo.endCursor;
  }
}
console.log('SAMPLES:'); samples.forEach(s=>console.log(' • '+s+'\n'));
console.log(`${DRY?'WÜRDE bereinigen':'BEREINIGT'}: ${changed} / gescannt ${scanned}`);
