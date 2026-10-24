import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

function run(t,config={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'luxe-cj-enrich-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'token.json'),'{corrupt');
  const fake=path.join(root,'fake.mjs');
  fs.writeFileSync(fake,`import fs from 'node:fs';
    const config=${JSON.stringify(config)};
    globalThis.setTimeout=(fn)=>{fn();return 0;};
    globalThis.fetch=async(input,opts={})=>{
      const url=new URL(input);
      if(url.hostname!=='developers.cjdropshipping.com')throw new Error('UNEXPECTED HOST');
      if(opts.redirect!=='error'||!(opts.signal instanceof AbortSignal))throw new Error('MISSING REQUEST CONTROLS');
      fs.appendFileSync('calls.jsonl',JSON.stringify({path:url.pathname,method:opts.method||'GET'})+'\\n');
      let body;
      if(url.pathname.endsWith('/getAccessToken')){
        if(JSON.parse(opts.body).password!=='fake-cj-key')throw new Error('WRONG AUTH FIELD');
        body={result:true,data:{accessToken:'fake-token'}};
      }else if(url.pathname.endsWith('/product/list'))body=config.list||{result:true,data:{list:[{pid:'p1',productNameEn:'Digital meat thermometer',listedNum:2}]}};
      else body=config.product||{result:true,data:{pid:'p1',productNameEn:'Digital meat thermometer',variants:[
        {vid:'v1',variantSku:'SKU1',variantKey:'Black',variantSellPrice:3,variantWeight:90,inventories:[{countryCode:'CN',storageNum:4}]},
        {vid:'v2',variantSku:'SKU2',variantKey:'White',variantSellPrice:4,variantWeight:100}
      ],productImageSet:['https://example.invalid/image.jpg']}};
      return {status:config.status||200,json:async()=>body};
    };`);
  const output=path.join(root,'output.json');
  const result=spawnSync(process.execPath,['--import',fake,new URL('./cj_enrich.mjs',import.meta.url).pathname],
    {cwd:root,encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,CJ_EMAIL:'fake@example.invalid',
      CJ_API_KEY:'fake-cj-key',CJ_TOKEN_CACHE:path.join(root,'token.json'),CJ_ENRICH_OUTPUT:output}});
  assert.equal(result.error,undefined,String(result.error));
  return {root,output,result};
}
test('CJ-Anreicherung läuft ohne Browserinstallation, erneuert kaputten Cache und erhält Varianten',t=>{
  const {root,output,result}=run(t);
  assert.equal(result.status,0,result.stderr);
  const rows=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(rows.length,1,'gleiches Produkt aus zwei Suchläufen nur einmal');
  assert.deepEqual(rows[0].variants.map(v=>[v.vid,v.sku,v.key]),[['v1','SKU1','Black'],['v2','SKU2','White']]);
  assert.equal(rows[0].variants[1].inventories,null,'fehlender Bestand ist unbekannt');
  const calls=fs.readFileSync(path.join(root,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(calls.filter(c=>c.path.endsWith('/getAccessToken')).length,1);
  assert.equal(calls.filter(c=>c.path.endsWith('/product/query')).length,1);
  assert.doesNotMatch(result.stdout+result.stderr,/fake-cj-key|fake-token/);
});
test('CJ-Quota und fehlende Listen erzeugen keine falsche erfolgreiche Kandidatendatei',t=>{
  for(const list of [{result:false,message:'Insufficient API points'},{result:true},{result:true,data:{}}]){
    const {output,result}=run(t,{list});
    assert.equal(result.status,1,result.stdout+result.stderr);assert.equal(fs.existsSync(output),false);
    assert.match(result.stderr,/CJ_QUOTA|CJ_DATA/);
  }
});
test('CJ-Details ohne Varianten werden nicht als importierbar ausgegeben',t=>{
  const {output,result}=run(t,{product:{result:true,data:{pid:'p1'}}});
  assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/CJ_DATA/);
  assert.equal(fs.existsSync(output),false);
});
