import fs from 'node:fs';import { g } from './sh.mjs';
const LIVE=process.env.LIVE==='1';
const P=JSON.parse(fs.readFileSync('/tmp/katalog_voll.json','utf8')).produkte;
const gc=p=>p.g||'';
const PET=/haustier|\bhund|\bkatze|\bhunde|für katzen|fuer hunde/i;
const REGELN=[
 {id:'sub-taschen',tag:'kat-taschen',pred:p=>/^Apparel & Accessories > Clothing( >|$)/.test(gc(p))&&!/Clothing Accessories/.test(gc(p))},
 {id:'hautpflege-skincare',tag:'hautpflege',pred:p=>/^(Apparel & Accessories|Sporting Goods)/.test(gc(p))&&/maske|sturmhaube|balaclava/i.test(p.title)},
 {id:'jacken-outdoor',tag:'kat-jacke-outdoor',pred:p=>PET.test(p.title)||/wandhalter|garderob|haken/i.test(p.title)},
 {id:'sub-aroma-diffuser',tag:'kat-aroma',pred:p=>/aroma-?dicht|bento|vorratsglas|duschkopf|lufterfrischer|auto-/i.test(p.title)},
 {id:'sub-deko',tag:'kat-deko',pred:p=>/armatur|wasserhahn|schlüsselanhänger|schluesselanhaenger/i.test(p.title)},
 {id:'spielzeug',tag:'spielzeug',pred:p=>PET.test(p.title)&&/pet|haustier|hund|katze/i.test(p.title)&&/^Animals/.test(gc(p))},
];
const plan=[];
for(const r of REGELN){const hit=P.filter(p=>p.tags.includes(r.tag)&&r.pred(p));plan.push({...r,hit});
 console.log('==',r.id,'Tag',r.tag,'→ entfernen bei',hit.length,'Produkten');console.log('   ',hit.slice(0,12).map(p=>p.title.slice(0,42)).join(' | '));}
// Gegenprobe: bekannt harmlose Fälle dürfen NICHT getroffen werden
const gegen=[['sub-taschen','Rucksack'],['sub-taschen','Handtasche'],['hautpflege-skincare','Hyaluron'],['jacken-outdoor','Winterjacke'],['sub-aroma-diffuser','Aroma Diffuser']];
for(const [id,w] of gegen){const r=REGELN.find(x=>x.id===id);const sample=P.filter(p=>p.tags.includes(r.tag)&&new RegExp(w,'i').test(p.title));const bad=sample.filter(r.pred);console.log('Gegenprobe',id,w,'Proben',sample.length,'fälschlich getroffen',bad.length,bad.slice(0,3).map(p=>p.title.slice(0,40)).join('|'))}
fs.writeFileSync('/tmp/cm/legacy_fix_plan.json',JSON.stringify(plan.map(r=>({id:r.id,tag:r.tag,ids:r.hit.map(p=>p.id),titel:r.hit.map(p=>p.title)}))));
if(!LIVE)process.exit(0);
const done=[];
for(const r of plan){for(let i=0;i<r.hit.length;i+=10){const blk=r.hit.slice(i,i+10);
 const q='mutation{'+blk.map((p,j)=>`a${j}:tagsRemove(id:"${p.id}",tags:["${r.tag}"]){userErrors{message}}`).join(' ')+'}';
 const res=await g(q);const err=Object.values(res).flatMap(x=>x.userErrors);if(err.length)console.log('FEHLER',JSON.stringify(err).slice(0,200));
 await new Promise(r=>setTimeout(r,600))}
 done.push([r.id,r.hit.length]);console.log('entfernt',r.id,r.hit.length)}
fs.writeFileSync('/tmp/cm/legacy_fix_done.json',JSON.stringify(done));
