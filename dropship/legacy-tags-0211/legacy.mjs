import fs from 'node:fs';import { g } from './sh.mjs';
const m=(await g(`query{menus(first:10){nodes{handle items{title url items{title url items{title url}}}}}}`)).menus.nodes.find(x=>x.handle==='main-menu');
const urls=new Map();const walk=(it,p)=>{for(const i of it){const mm=(i.url||'').match(/\/collections\/([^/?#]+)/);if(mm)urls.set(decodeURIComponent(mm[1]),p+i.title);walk(i.items||[],p+i.title+' › ')}};walk(m.items,'');
console.log('Menü-Sammlungen',urls.size);
const res=[];let n=0;
for(const [h,pfad] of urls){const c=(await g(`query($h:String!){collectionByHandle(handle:$h){productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}`,{h})).collectionByHandle;n++;
 if(!c)continue;const rs=c.ruleSet?.rules||[];res.push({h,pfad,n:c.productsCount.count,or:!!c.ruleSet?.appliedDisjunctively,rules:rs});if(n%100===0)console.log(n)}
fs.writeFileSync('/tmp/cm/legacy_regeln.json',JSON.stringify(res));
const kind=r=>r.rules.length===0?'manuell':r.rules.every(x=>x.column==='TAG'&&/^(sort-|m-|s-)/.test(x.condition))?'sort':r.rules.some(x=>x.column==='TAG')?'alt-tag':'titel/typ';
const cnt={};res.forEach(r=>{const k=kind(r);cnt[k]=(cnt[k]||0)+1});console.log(cnt);
console.log(res.filter(r=>kind(r)==='alt-tag').sort((a,b)=>b.n-a.n).map(r=>String(r.n).padStart(6)+' '+r.h.padEnd(34)+(r.or?'OR ':'AND ')+r.rules.map(x=>x.condition).join('|').slice(0,80)).join('\n'));
