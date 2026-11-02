import fs from 'node:fs';
import { g } from './sh.mjs';
import { eingabeAus, unterschiede } from '/home/user/aban-news-landing/automation/menu_eintrag_einfuegen.mjs';
const LIVE=process.env.LIVE==='1';
const FELDER='id title type resourceId url tags';
const m=(await g(`query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`,{h:'handle:main-menu'})).menus.nodes[0];
const SICH='/home/user/aban-news-landing/dropship/menu-sicherung/main-menu-vor-kleider-gruppen-0211.json';
if(!fs.existsSync(SICH))fs.writeFileSync(SICH,JSON.stringify(m,null,1));
const eing=eingabeAus(m.items);
const damen=eing.find(x=>x.title==='Damen');const ki=damen.items.findIndex(x=>x.title==='Kleider');
const kleider=damen.items[ki];
if(!kleider.items.length){console.log('Kleider hat keine Kinder (schon gruppiert?)');process.exit(0)}
const kinder=kleider.items;const nimm=t=>{const i=kinder.findIndex(x=>x.title===t);if(i<0)throw new Error('Kind fehlt: '+t);return kinder.splice(i,1)[0]};
const col=(await g(`query{collectionByHandle(handle:"damen-kleider"){id}}`)).collectionByHandle.id;
const GR=[
 ['Kleider nach Länge & Schnitt',['Minikleider','Midikleider','Maxikleider','Langarmkleider','Schulterfreie Kleider','A-Linien-Kleider','Wickelkleider','Träger- & Neckholderkleider','Figurbetonte & Etuikleider','Rüschen- & Puffärmelkleider']],
 ['Kleider nach Anlass & Saison',['Abendkleider & festliche Kleider','Cocktail- & Partykleider','Business- & Etuikleider','Sommerkleider','Strandkleider','Strick- & Winterkleider','Freizeit- & Hemdblusenkleider']],
 ['Kleider nach Material & Muster',['Blumenkleider','Spitzenkleider','Boho-Kleider','Leinenkleider','Jeans- & Denimkleider','Plisseekleider','Satin-, Seiden- & Chiffonkleider','Samt- & Paillettenkleider','Gepunktete & gestreifte Kleider']],
];
const koepfe=GR.map(([t,ks])=>({title:t,type:'COLLECTION',resourceId:col,items:ks.map(nimm)}));
if(kinder.length)throw new Error('Nicht zugeordnet: '+kinder.map(x=>x.title).join(', '));
damen.items.splice(ki+1,0,...koepfe);
let tiefe=0;(function w(it,d){for(const i of it){tiefe=Math.max(tiefe,d);w(i.items||[],d+1)}})(eing,1);
const u=unterschiede(m.items,eing);
console.log('Tiefe',tiefe,'| neue Köpfe',koepfe.map(k=>k.items.length).join('+'),'| fehlend',u.fehlend.length,u.fehlend.slice(0,30).map(x=>x.split('|')[0]).join(' ; '),'| neu',u.neu.length);
if(!LIVE){console.log('Trockenlauf');process.exit(0)}
const w=await g(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`,{id:m.id,t:m.title,h:m.handle,i:eing});
if(w.menuUpdate.userErrors.length)throw new Error(JSON.stringify(w.menuUpdate.userErrors));
const nach=(await g(`query($h:String!){menus(first:1,query:$h){nodes{items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`,{h:'handle:main-menu'})).menus.nodes[0];
const lies=it=>it.flatMap(i=>[i.title,...lies(i.items||[])]);const a=lies(eing),b=lies(nach.items);
console.log('Nachlesen: Titel gleich Reihenfolge',JSON.stringify(a)===JSON.stringify(b),a.length,b.length);
