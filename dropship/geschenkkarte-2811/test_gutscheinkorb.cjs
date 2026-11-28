// Offline only. Cart jobs, Shopify and browsers are never contacted.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const RealDate=Date;
const sampleTime=RealDate.parse('2026-11-28T10:00:00Z');
global.Date=class extends RealDate {
  constructor(...args){super(...(args.length ? args : [sampleTime]));}
  static now(){return sampleTime;}
};
const {Liquid}=require(process.env.LIQUIDJS_PATH || 'liquidjs');
const engine=new Liquid({timezoneOffset:0});
engine.registerFilter('money', val=>'CHF '+(val/100).toFixed(2));
const render=(source,props)=>engine.parseAndRenderSync(source,props);
const first=process.argv[2]||path.join(__dirname,'original');
const next=process.argv[3]||path.join(__dirname,'vorschau-komplett');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
function liquid(dir){
 const src=read(dir,'templates/cart.json');
 const cart=JSON.parse(src.slice(src.indexOf('{')));
 const summary=read(dir,'snippets/cart-summary.liquid');
 const pos=summary.indexOf('LUX-GRATISVERSAND-HINWEIS');
 const end=summary.indexOf('/LUX-BW-HINWEIS-2711');
 assert.ok(pos>0 && end>pos);
 let block=summary.slice(summary.indexOf('{%- unless cart == empty -%}',pos),summary.indexOf('{%- endunless -%}',end)+'{%- endunless -%}'.length);
 const view=read(dir,'templates/cart.lux-chlager.liquid').replace('{%- layout none -%}','');
 return {trust:cart.sections.lux_cart_trust.settings.custom_liquid,summary:block,view};
}
const lhs=liquid(first),rhs=liquid(next);
function line(id,tags,quantity,amount,gift=false,editor=false){
 return {product_id:id,quantity,amount,product:{tags,'gift_card?':gift,description:editor?'lspod-designer':''}};
}
const ch=line(11,['ch-lager','profil-ch-lager'],1,2500);
const eu=line(12,['eu-lager'],1,3200);
const pod=line(13,['selbst-gestalten'],1,9000,false,true);
const asia=line(14,[],1,6400);
const fakegift=line(15,['geschenkkarte'],1,2500);
const gift=(q,cost)=>line(16742376538503,['geschenk','geschenkkarte','nicht-google-bewerben','weihnachten'],q,cost,true);
const cases=[[ch],[eu],[pod],[asia],[fakegift],[ch,eu],[ch,pod],[pod,asia],[{...ch,quantity:2}]];
function ctx(items,locale,discount){
 const amount=items.reduce((tot,line)=>tot+line.amount*line.quantity,0);
 return {request:{locale:{iso_code:locale}},cart:{items,item_count:items.reduce((n,x)=>n+x.quantity,0),items_subtotal_price:amount,total_price:amount,cart_level_discount_applications:discount?[{title:'Black Week'}]:[]}, shop:{metafields:{luxe:{ch_lager_stufe:{value:1},druck_profil_ids:{value:',13,'}}},refund_policy:{url:locale==='fr'?'/fr/policies/refund-policy':'/policies/refund-policy'}}};
}
let scenarios=0;
const row=html=>(html.match(/<li>[^<]*Lieferung voraussichtlich .*?<\/li>/)||[])[0];
for(const locale of ['de','fr']){
 const empty=ctx([],locale,false);
 assert.equal(render(lhs.trust,empty),render(rhs.trust,empty));scenarios++;
 for(const physical of cases){
   const p=ctx(physical,locale,false);
   assert.equal(render(lhs.trust,p),render(rhs.trust,p));
   assert.equal(render(lhs.summary,p),render(rhs.summary,p));
   const props=JSON.parse(render(rhs.view,p));assert.equal(props.enthaelt_geschenkkarte,false);
   delete props.enthaelt_geschenkkarte;assert.deepEqual(JSON.parse(render(lhs.view,p)),props);scenarios++;
 }
 for(const only of [[gift(1,2500)],[gift(3,5000)],[gift(1,10000),gift(1,2500)]]){
   const p=ctx(only,locale,false);
   assert.match(render(lhs.trust,p),/Direktversand aus Asien/);
   assert.match(render(lhs.summary,p),/CHF 7|Gratisversand inklusive/);
   const trust=render(rhs.trust,p),info=render(rhs.summary,p);
   assert.match(trust,locale==='fr'?/Carte-cadeau par e-mail/:/Geschenkkarte per E-Mail/);
   assert.match(trust,/href="(?:\/fr)?\/policies\/refund-policy"/);
   assert.doesNotMatch(trust,/Direktversand|Lieferdatum|Lieferung voraussichtlich|30 Tage Rückgaberecht/);
   assert.doesNotMatch(info,/CHF 7|Gratisversand|Black-Week|15 %/);
   assert.equal(JSON.parse(render(rhs.view,p)).enthaelt_geschenkkarte,true);
   scenarios++;
 }
 for(const physical of cases){
   for(const lines of [[gift(2,5000),...physical],[...physical,gift(1,2500)]]){
     const p=ctx(lines,locale,false);
     const trust=render(rhs.trust,p);
     assert.ok(row(trust));
     assert.equal(row(trust),row(render(lhs.trust,ctx(physical,locale,false))));
     assert.match(trust,/conditions de retour|Rückgabebedingungen/);
     assert.doesNotMatch(render(rhs.summary,p),/CHF 7|Gratisversand|Black-Week|15 %/);
     assert.equal(JSON.parse(render(rhs.view,p)).enthaelt_geschenkkarte,true);
     scenarios++;
   }
 }
 const actual=ctx([ch,gift(1,5000)],locale,true);
 assert.match(render(rhs.summary,actual),/Black-Week-Rabatt 15 % ist aktiv/);
 scenarios++;
}
function dom(dir){
 let bar=null;
 const handlers={};
 const pending=[];
 const anchor={parentNode:{insertBefore(el){bar=el;}}};
 const doc={documentElement:{},addEventListener(k,cb){handlers[k]=cb;},
   querySelectorAll(sel){if(sel==='.luxe-ship-bar')return bar?[bar]:[];return [anchor];},
   querySelector(){return null;},createElement(){return {remove(){bar=null;}};}};
 const fetch=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
 const src=read(dir,'layout/theme.liquid');
 const offset=src.indexOf('  var SCHWELLE=5000');
 const body=src.slice(src.lastIndexOf('(function(){',offset),src.indexOf('</script>',offset));
 vm.runInNewContext(body,{document:doc,window:{fetch},fetch,MutationObserver:class{observe(){}},setTimeout(){}});
 return {handlers,pending,html:()=>bar?.innerHTML||'',refresh(){handlers['cart:change']();}};
}
const tick=()=>new Promise(r=>setImmediate(r));
const json=val=>({ok:true,json:async()=>val});
async function jsTests(){
 const d=dom(next);const base={item_count:1,total_price:2500,items_subtotal_price:2500,alle_chlager:false};
 const old=dom(first);old.refresh();old.pending.shift().resolve(json(base));await tick();assert.match(old.html(),/CHF 7.00/);
 d.refresh();d.pending.shift().resolve(json({...base,enthaelt_geschenkkarte:false}));await tick();assert.equal(old.html(),d.html());scenarios++;
 d.refresh();d.pending.shift().resolve(json({...base,enthaelt_geschenkkarte:true}));await tick();assert.equal(d.html(),'');scenarios++;
 for(const [lines,shown] of [[[{gift_card:true}],false],[[{gift_card:false},{gift_card:true}],false],[[{}],false],[[],false],[[{gift_card:false}],true]]){
   d.refresh();d.pending.shift().reject(Error('unavailable'));await tick();d.pending.shift().resolve(json({...base,items:lines}));await tick();
   assert.equal(!!d.html(),shown);scenarios++;
 }
 d.refresh();d.refresh();const [r1,r2]=d.pending.splice(0,2);
 r2.resolve(json({...base,enthaelt_geschenkkarte:true}));await tick();assert.equal(d.html(),'');
 r1.resolve(json({...base,enthaelt_geschenkkarte:false}));await tick();assert.equal(d.html(),'');scenarios++;
 console.log(scenarios+' Offline-Szenarien bestanden. Warenkorb-Liquid, CHF-Paket, reduzierte JSON-Ansicht, JS-Fallback und überholte Antworten geprüft.');
}
jsTests().catch(err=>{console.error(err);process.exitCode=1;});
