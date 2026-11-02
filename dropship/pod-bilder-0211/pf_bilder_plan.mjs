import fs from 'node:fs';
const H={Authorization:'Bearer '+process.env.PRINTFUL_API_KEY,'X-PF-Store-Id':process.env.PRINTFUL_STORE_ID||''};
const get=async u=>{for(let i=0;i<4;i++){const r=await fetch('https://api.printful.com'+u,{headers:H});if(r.status===429){await new Promise(r=>setTimeout(r,8000));continue}if(!r.ok)return null;return r.json()}return null};
const prod=JSON.parse(fs.readFileSync('/tmp/cm/sg_produkte.json','utf8')).filter(p=>p.status==='ACTIVE'&&!/christbaumschmuck/.test(p.handle));
const vcache={},icache={};
const plan=[];
for(const p of prod){
  const ids=[...new Set(p.variants.nodes.map(v=>(v.sku||'').match(/_(\d{3,6})$/)?.[1]).filter(Boolean))];
  const cats=new Map(); // katalogprodukt -> {farben:Set, name}
  for(const id of ids.slice(0,60)){ if(!vcache[id]){const j=await get('/v2/catalog-variants/'+id);vcache[id]=j?.data||null}
    const v=vcache[id];if(!v)continue;const c=cats.get(v.catalog_product_id)||{farben:new Map(),n:0};c.farben.set(v.color,(c.farben.get(v.color)||0)+1);cats.set(v.catalog_product_id,c)}
  const bilder=[];const proKat=Math.max(3,Math.floor(8/Math.max(1,cats.size)));
  for(const [cid,info] of cats){ if(!icache[cid]){const j=await get('/v2/catalog-products/'+cid+'/images');icache[cid]=j?.data||[]}
    const farbe=[...info.farben.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    const sets=icache[cid];const satz=sets.find(s=>s.color===farbe)||sets[0];if(!satz)continue;
    const gut=satz.images.filter(i=>i.image_url&&!/^label_|^embroidery_|^sleeve_/.test(i.placement)&&!/outside_label/.test(i.image_url));
    const rang=u=>/lifestyle|couple|onwoman|onman|model/i.test(u)?0:/flat|default|ghost/i.test(u)?1:2;
    const seen=new Set();const pick=[];
    for(const i of gut.sort((a,b)=>rang(a.image_url)-rang(b.image_url))){const k=i.image_url.split('?')[0];if(seen.has(k))continue;seen.add(k);pick.push(i);if(pick.length>=proKat)break}
    pick.forEach(i=>bilder.push({cid,farbe,placement:i.placement,url:i.image_url.replace('/medium/','/large/').split('?')[0]}))
  }
  plan.push({handle:p.handle,katalog:[...cats.keys()],anzahl:bilder.length,bilder:bilder.slice(0,10)});
  console.log(p.handle.slice(0,46).padEnd(46),'Katalog',[...cats.keys()].join(','),'→',Math.min(10,bilder.length),'Bilder');
}
fs.writeFileSync('/tmp/cm/pf_bilder_plan.json',JSON.stringify(plan,null,1));
