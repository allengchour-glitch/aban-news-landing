import assert from 'node:assert/strict';
import {plan,verify,HANDLE,RENAMES} from './fix.mjs';
const base={id:'p',title:'Schuhe',handle:HANDLE,status:'ACTIVE',options:[{id:'o',name:'Farbe',optionValues:[...Object.keys(RENAMES),'Schwarz Fashion'].map((name,i)=>({id:'v'+i,name}))}],variants:{pageInfo:{hasNextPage:false},nodes:[...Object.keys(RENAMES),'Schwarz Fashion'].map((value,i)=>({id:'variant'+i,sku:'sku'+i,price:'28.90',compareAtPrice:null,selectedOptions:[{name:'Farbe',value},{name:'Grösse',value:'40'}]}))}};
assert.equal(plan(base).changes.length,3);
assert.throws(()=>plan({...base,status:'DRAFT'}));
assert.throws(()=>plan({...base,handle:'anderes'}));
assert.throws(()=>plan({...base,variants:{...base.variants,pageInfo:{hasNextPage:true}}}));
const collision=structuredClone(base);collision.options[0].optionValues.push({id:'extra',name:'Beige – Modell 3'});assert.throws(()=>plan(collision));
const partial=structuredClone(base);partial.options[0].optionValues.shift();assert.throws(()=>plan(partial));
const good=structuredClone(base);for(const v of good.options[0].optionValues)v.name=RENAMES[v.name]??v.name;for(const v of good.variants.nodes)v.selectedOptions[0].value=RENAMES[v.selectedOptions[0].value]??v.selectedOptions[0].value;
assert.equal(verify(base,good),true);assert.equal(plan(good).changes.length,0);
for(const field of ['price','sku','id']){const bad=structuredClone(good);bad.variants.nodes[0][field]='anders';assert.throws(()=>verify(base,bad));}
const bad=structuredClone(good);bad.variants.nodes[0].selectedOptions[1].value='42';assert.throws(()=>verify(base,bad));
const reverse=Object.fromEntries(Object.entries(RENAMES).map(([a,b])=>[b,a]));
assert.equal(plan(good,reverse).changes.length,3);
assert.equal(verify(good,base,reverse),true);
console.log('14 ok, 0 Fehler');
