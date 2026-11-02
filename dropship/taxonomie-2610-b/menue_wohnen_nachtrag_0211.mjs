import { g } from './sh.mjs';
import { eingabeAus, unterschiede } from '/home/user/aban-news-landing/automation/menu_eintrag_einfuegen.mjs';
const LIVE=process.env.LIVE==='1';
const F='id title type resourceId url tags';
const Q=`query{menus(first:1,query:"handle:main-menu"){nodes{id title handle items{${F} items{${F} items{${F}}}}}}}`;
const m=(await g(Q)).menus.nodes[0];
const e=eingabeAus(m.items);
const w=e.find(x=>x.title==='Wohnen & Garten');
const alle=[];(function r(it){for(const i of it){alle.push(i);r(i.items||[])}})(w.items);
console.log('Teppich-Einträge im Ast jetzt:',alle.filter(i=>/teppich/i.test(i.title+(i.url||''))).map(i=>i.title).join(' | ')||'keine');
const plan=[
 ['Kochen, Grillen & Backen','Küche & Kochen (alle)','/collections/sub-kueche'],
 ['Aufbewahrung & Möbel','Alle Aufbewahrung','/collections/aufbewahrung-sub'],
 ['Kissen, Decken & Bettwäsche','Alle Wohntextilien','/collections/kissen-wohntextilien'],
 ['Kissen, Decken & Bettwäsche','Teppiche','/collections/teppiche'],
 ['Deko & Kerzen','Alle Dekoration','/collections/sub-deko'],
];
for(const [z,t,u] of plan){
  const h=w.items.find(x=>x.title===z); if(!h) throw new Error('Kopf fehlt '+z);
  if(alle.some(i=>(i.url||'').replace(/^https?:\/\/[^/]+/,'').replace(/^\/[a-z]{2}\//,'/')===u)){console.log('schon drin:',u);continue}
  if(u==='/collections/teppiche'&&alle.some(i=>/teppich/i.test(i.title)&&!/wand/i.test(i.title))){console.log('Teppich-Äquivalent vorhanden, übersprungen');continue}
  h.items.push({title:t,type:'HTTP',url:u,items:[]});
}
const z=a=>a.reduce((n,i)=>n+1+z(i.items||[]),0);
console.log('Einträge:',z(e));
if(!LIVE){console.log('Trockenlauf');process.exit(0)}
const r=await g(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`,{id:m.id,t:m.title,h:m.handle,i:e});
if(r.menuUpdate.userErrors.length)throw new Error(JSON.stringify(r.menuUpdate.userErrors));
const nach=(await g(Q)).menus.nodes[0];const u=unterschiede(m.items,nach.items);
console.log('fehlend',u.fehlend.length,'neu',u.neu.length,u.neu.join(' ; '));
