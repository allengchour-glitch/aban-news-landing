import fs from 'node:fs';
const H={Authorization:'Bearer '+process.env.PRINTFUL_API_KEY,'X-PF-Store-Id':process.env.PRINTFUL_STORE_ID||'','Content-Type':'application/json'};
const A='https://api.printful.com';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const design=fs.readFileSync('/tmp/cm/mock/design_url.txt','utf8').trim();
const prod=JSON.parse(fs.readFileSync('/tmp/cm/sg_produkte.json','utf8'));
const NUR=process.env.NUR;const p=prod.find(x=>x.handle===NUR);
const api=async(m,u,b)=>{for(let i=0;i<6;i++){const r=await fetch(A+u,{method:m,headers:H,body:b?JSON.stringify(b):undefined});if(r.status===429){const w=+(r.headers.get('retry-after')||20);console.log('429 warte',w);await sleep(w*1000+500);continue}const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return {s:r.status,j}}return {s:429}};
const ids=[...new Set(p.variants.nodes.map(v=>(v.sku||'').match(/_(\d{3,6})$/)?.[1]).filter(Boolean))];
const vs=[];for(const id of ids.slice(0,80)){const r=await api('GET','/v2/catalog-variants/'+id);if(r.s===200)vs.push(r.j.data)}
const cid=+process.env.CID||vs[0].catalog_product_id;
const mine=vs.filter(v=>v.catalog_product_id===cid);
const farben=new Map();mine.forEach(v=>{if(!farben.has(v.color))farben.set(v.color,v.id)});
console.log('Katalog',cid,'Farben',[...farben.keys()].join(' | '));
const st=(await api('GET',`/v2/catalog-products/${cid}/mockup-styles`)).j.data;
const pl=st.find(x=>/front|default/.test(x.placement))||st[0];
console.log('Placement',pl.placement,pl.technique,pl.mockup_styles.map(s=>s.id+':'+s.category_name+'/'+s.view_name).join(', ').slice(0,600));
if(process.env.SHOW)process.exit(0);
const maxF=+process.env.FARBEN||4;
const wahl=[...farben.entries()].slice(0,maxF);
let styles=(process.env.STYLES||'').split(',').filter(Boolean).map(Number);
if(!styles.length){const ms=pl.mockup_styles;const fr=ms.filter(x=>/front|default/i.test(x.view_name)||ms.length<4);const lf=fr.filter(x=>/life|couple|women|men|model|on/i.test(x.category_name));const flat=fr.filter(x=>/flat|ghost|default/i.test(x.category_name));
 styles=[...new Set([...lf.slice(0,2),...flat.slice(0,1),...fr].map(x=>x.id))].slice(0,3)}
console.log('Styles',styles.join(','));
const cs=st.some(x=>x.technique==='cut-sew');
const pls=(cs?st.filter(x=>!/label|embroidery/.test(x.placement)):[pl]).map(x=>({placement:x.placement,technique:x.technique,layers:[{type:'file',url:design}]}));
const body={format:'jpg',products:[{source:'catalog',catalog_product_id:cid,catalog_variant_ids:wahl.map(x=>x[1]),placements:pls,...(cs?{product_options:[{name:'stitch_color',value:'white'}]}:{}),...(styles.length&&!cs&&!process.env.NOSTYLE?{mockup_style_ids:styles}:{})}]};
let c=await api('POST','/v2/mockup-tasks',body);if(c.s===400&&/style_ids/.test(JSON.stringify(c.j))){delete body.products[0].mockup_style_ids;c=await api('POST','/v2/mockup-tasks',body)}console.log('create',c.s,JSON.stringify(c.j).slice(0,300));
const tid=c.j.data?.[0]?.id;if(!tid)process.exit(1);
let res;for(let i=0;i<40;i++){await sleep(6000);const r=await api('GET','/v2/mockup-tasks?id='+tid);const d=r.j.data?.[0];console.log(i,d?.status);if(d?.status==='completed'){res=d;break}if(d?.status==='failed'){console.log(JSON.stringify(d).slice(0,500));process.exit(1)}}
fs.mkdirSync('/tmp/cm/mock/'+NUR,{recursive:true});
const out=[];for(const vm of res.catalog_variant_mockups)for(const m of vm.mockups)out.push({variant:vm.catalog_variant_id,farbe:wahl.find(x=>x[1]===vm.catalog_variant_id)?.[0],style:m.style_id,name:m.display_name,url:m.mockup_url});
fs.writeFileSync(`/tmp/cm/mock/${NUR}.json`,JSON.stringify(out,null,1));console.log(out.length,'Mockups');out.slice(0,3).forEach(o=>console.log(o.farbe,o.style,o.url.slice(0,90)));
