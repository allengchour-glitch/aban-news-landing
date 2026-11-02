import fs from 'node:fs';
import { g } from './sh.mjs';
import { eingabeAus, unterschiede } from '/home/user/aban-news-landing/automation/menu_eintrag_einfuegen.mjs';
const LIVE=process.env.LIVE==='1';
const FELDER='id title type resourceId url tags';
const m=(await g(`query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`,{h:'handle:main-menu'})).menus.nodes[0];
const SICH='/home/user/aban-news-landing/dropship/menu-sicherung/main-menu-vor-jacken-kleider-0211.json';
if(!fs.existsSync(SICH))fs.writeFileSync(SICH,JSON.stringify(m,null,1));
const eing=eingabeAus(m.items);
const cache={};const col=async h=>cache[h]??=(await g(`query($h:String!){collectionByHandle(handle:$h){id title}}`,{h})).collectionByHandle;
const kind=async(h,titel)=>{const c=await col(h);if(!c)throw new Error('Collection fehlt '+h);return{title:(titel||c.title).slice(0,34),type:'COLLECTION',resourceId:c.id,items:[]}};
const ast=(t)=>{const a=eing.find(x=>x.title===t);if(!a)throw new Error('Ast fehlt '+t);return a};
const kind2=(a,t)=>{const k=a.items.find(x=>x.title===t);if(!k)throw new Error('Eintrag fehlt '+t);return k};
const hat=(arr,h,c)=>arr.some(x=>x.resourceId===c.id);
// 1) Kleider
const damen=ast('Damen');const kleider=kind2(damen,'Kleider');
for(const [h,t] of [['damen-kleider-aline'],['damen-kleider-figurbetont'],['damen-kleider-traeger'],['damen-kleider-satin'],['damen-kleider-samt'],['damen-kleider-gemustert'],['damen-kleider-ruesche'],['damen-kleider-plissee'],['damen-kleider-wickel'],['damen-kleider-leinen'],['damen-kleider-jeans']]){const k=await kind(h,t);if(!hat(kleider.items,h,{id:k.resourceId}))kleider.items.push(k)}
// 2) Damen Jacken
const dj=kind2(damen,'Jacken & Mäntel');
for(const h of ['damen-jacken-maentel-maentel','damen-jacken-winter','damen-jacken-stepp','damen-jacken-trench','damen-jacken-uebergang','damen-jacken-westen','damen-jacken-blazer','damen-jacken-kunstfell','damen-jacken-kapuze','damen-jacken-cape']){const k=await kind(h);if(!hat(dj.items,h,{id:k.resourceId}))dj.items.push(k)}
// 3) Herren Jacken
const herren=ast('Herren');const hj=kind2(herren,'Jacken & Mäntel');
for(const h of ['herren-jacken-maentel-lang','herren-jacken-winter','herren-jacken-uebergang','herren-jacken-jeans','herren-jacken-leder','herren-jacken-baseball-bomber','herren-jacken-kapuze','herren-jacken-outdoor','herren-jacken-hemdjacke']){const k=await kind(h);if(!hat(hj.items,h,{id:k.resourceId}))hj.items.push(k)}
// 4) Herbst & Übergang
const hb=ast('Herbst & Übergang');
const idx=t=>hb.items.findIndex(x=>x.title===t);
const i1=idx('Jacken & Mäntel');if(i1>=0){const a=await kind('damen-jacken-maentel','Damen-Jacken & Mäntel'),b=await kind('herren-jacken-maentel','Herren-Jacken & Mäntel');a.id=hb.items[i1].id;hb.items.splice(i1,1,a,b)}
const i2=idx('Winterjacken & Daunenjacken');if(i2>=0){const a=await kind('damen-jacken-winter','Winterjacken Damen'),b=await kind('herren-jacken-winter','Winterjacken Herren');a.id=hb.items[i2].id;hb.items.splice(i2,1,a,b)}
// Prüfung
let maxTiefe=0;(function w(it,d){for(const i of it){maxTiefe=Math.max(maxTiefe,d);w(i.items||[],d+1)}})(eing,1);
const u=unterschiede(m.items,eing.map(x=>x));
console.log('Tiefe',maxTiefe,'| fehlend',u.fehlend.length,u.fehlend.slice(0,6),'| neu',u.neu.length,'| Reihenfolge der alten gleich',u.reihenfolgeGleich);
console.log('Kleider-Kinder',kleider.items.length,'Damen-Jacken-Kinder',dj.items.length,'Herren-Jacken-Kinder',hj.items.length);
if(!LIVE){console.log('Trockenlauf');process.exit(0)}
const w=await g(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`,{id:m.id,t:m.title,h:m.handle,i:eing});
if(w.menuUpdate.userErrors.length)throw new Error(JSON.stringify(w.menuUpdate.userErrors));
const nach=(await g(`query($h:String!){menus(first:1,query:$h){nodes{items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`,{h:'handle:main-menu'})).menus.nodes[0];
const v=unterschiede(m.items,nach.items);console.log('Nachlesen: fehlend',v.fehlend.length,v.fehlend.slice(0,6),'neu',v.neu.length);
