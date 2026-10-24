import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ONLINE='gid://shopify/Publication/1';
const SOCIAL='gid://shopify/Publication/2';
const product=(id='1', extra={})=>({id:`gid://shopify/Product/${id}`,handle:`product-${id}`,
  status:'ACTIVE',tags:[],resourcePublications:{nodes:[]},...extra});

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'luxe-publish-guard-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'automation'));
  // Copy every helper so changes to their imports remain exercised in isolation.
  fs.cpSync(new URL('lib/',import.meta.url),path.join(root,'automation/lib'),{recursive:true});
  const script=path.join(root,'automation/publish_guard.mjs');
  fs.copyFileSync(new URL('publish_guard.mjs',import.meta.url),script);
  return {root,script};
}

function lines(f,file){
  const location=path.join(f.root,file);
  return fs.existsSync(location)?fs.readFileSync(location,'utf8').trim().split('\n').filter(Boolean):[];
}
const calls=f=>lines(f,'calls.jsonl').map(JSON.parse);
const mutations=f=>calls(f).filter(c=>c.query?.includes('publishablePublish('));
const report=result=>JSON.parse(result.stdout);

function run(f,config={},env={}){
  const preload=path.join(f.root,'fake-fetch.mjs');
  fs.writeFileSync(preload,`import fs from 'node:fs';
    const config=${JSON.stringify(config)};
    const defaults=[${JSON.stringify(product())}];
    const response=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
    const timeout=AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout=ms=>{fs.appendFileSync('timeouts.jsonl',ms+'\\n');return timeout(ms);};
    globalThis.setTimeout=fn=>{queueMicrotask(fn);return 0;};
    globalThis.fetch=async(input,opts={})=>{
      const url=new URL(String(input));
      const body=JSON.parse(opts.body||'{}');
      fs.appendFileSync('calls.jsonl',JSON.stringify({host:url.hostname,path:url.pathname,
        query:body.query,variables:body.variables,redirect:opts.redirect,hasSignal:!!opts.signal})+'\\n');
      if(url.hostname!=='test.myshopify.com')throw new Error('UNEXPECTED HOST');
      if(url.pathname==='/admin/oauth/access_token'){
        return response(config.oauthStatus??200,config.oauthBody??{access_token:'fake-granted-token'});
      }
      if(!url.pathname.endsWith('/graphql.json'))throw new Error('UNEXPECTED API PATH');
      if(body.query.includes('publications(first:')){
        return response(200,config.publicationsBody??{data:{publications:{nodes:[
          {id:'${ONLINE}',name:'Online Store'},{id:'${SOCIAL}',name:'Facebook & Instagram'},
          {id:'gid://shopify/Publication/3',name:'Google & YouTube'},
          {id:'gid://shopify/Publication/4',name:'Point of Sale'},
          {id:'gid://shopify/Publication/5',name:'Inbox'},
          {id:'gid://shopify/Publication/6',name:'Luxe Style Headless'}]}}});
      }
      if(body.query.includes('products(first:')){
        return response(200,config.productsBody??{data:{products:{
          nodes:config.products??defaults,pageInfo:{hasNextPage:false,endCursor:null}}}});
      }
      if(body.query.includes('publishablePublish(')){
        const id=body.query.match(/publishablePublish\\(id:"([^"]+)"/)?.[1];
        if(!id)throw new Error('MISSING MUTATION PRODUCT');
        const outcome=config.outcomes?.[id]??{body:{data:{publishablePublish:{userErrors:[]}}}};
        if(outcome.networkError)throw new TypeError('simulated connection lost');
        return response(outcome.status??200,outcome.body);
      }
      throw new Error('UNEXPECTED GRAPHQL OPERATION');
    };`);
  const result=spawnSync(process.execPath,['--import',preload,f.script],{
    cwd:f.root,encoding:'utf8',timeout:10000,
    // Fake credentials only; do not inherit the caller's credentials or live flags.
    env:{PATH:process.env.PATH,SHOPIFY_SHOP:'test.myshopify.com',SHOPIFY_ADMIN_TOKEN:'fake-token',...env}
  });
  assert.equal(result.error,undefined,String(result.error));
  assert.doesNotMatch(result.stdout+result.stderr,/UNEXPECTED HOST|UNEXPECTED API PATH|UNEXPECTED GRAPHQL/);
  return result;
}

test('LIVE=1 ohne explizite Freigabe bleibt lesender Testlauf',t=>{
  const f=fixture(t),result=run(f,{}, {LIVE:'1'}),r=report(result);
  assert.equal(result.status,0,result.stderr);
  assert.equal(r.live,false);assert.equal(r.liveRequested,true);assert.equal(r.publishApproved,false);
  assert.equal(r.productsMissingChannels,1);assert.equal(r.published,0);
  assert.deepEqual(mutations(f),[]);
});

test('Freigabe allein aktiviert keinen Schreibmodus',t=>{
  const f=fixture(t),result=run(f,{}, {APPROVE_PUBLISH:'1'});
  assert.equal(result.status,0,result.stderr);assert.equal(report(result).live,false);
  assert.deepEqual(mutations(f),[]);
});

test('Nur ACTIVE wird publiziert, auch bei einer benutzerdefinierten Draft-Abfrage',t=>{
  const f=fixture(t),result=run(f,{products:[product('draft',{status:'DRAFT'}),product('active'),
    product('archived',{status:'ARCHIVED'})]}, {LIVE:'1',APPROVE_PUBLISH:'1',PQUERY:'status:draft OR status:active'});
  assert.equal(result.status,0,result.stderr);
  const r=report(result);assert.equal(r.skippedInactive,2);assert.equal(r.published,1);
  const query=calls(f).find(c=>c.query?.includes('products(first:'));
  assert.match(query.query,/nodes\{[^}]*\bstatus\b/);
  assert.equal(query.variables.q,'status:draft OR status:active');
  assert.equal(mutations(f).length,1);assert.match(mutations(f)[0].query,/Product\/active/);
  assert.doesNotMatch(mutations(f)[0].query,/Product\/draft|Product\/archived/);
});

test('Sperrtag erlaubt höchstens Onlineshop und niemals Social-/Google-Kanäle',t=>{
  const f=fixture(t),result=run(f,{products:[product('blocked',{tags:['social-pause-review']})]},
    {LIVE:'1',APPROVE_PUBLISH:'1',INCLUDE_GOOGLE:'1',INCLUDE_HEADLESS:'1'});
  assert.equal(result.status,0,result.stderr);assert.equal(report(result).respektierteSperren,1);
  assert.equal(mutations(f).length,1);assert.match(mutations(f)[0].query,/Publication\/1"/);
  assert.doesNotMatch(mutations(f)[0].query,/Publication\/[23456]"/);
});

test('Bestehende Online-Zuordnung und Sperrtag erzeugen keine neue Veröffentlichung',t=>{
  const f=fixture(t),result=run(f,{products:[product('blocked',{tags:['nicht-bewerben'],
    resourcePublications:{nodes:[{publication:{id:ONLINE}}]}})]},{LIVE:'1',APPROVE_PUBLISH:'1'});
  assert.equal(result.status,0,result.stderr);assert.equal(report(result).published,0);
  assert.deepEqual(mutations(f),[]);
});

test('Teilerfolg bleibt korrekt gezählt; HTTP200-userErrors, API-Fehler und fehlende Ergebnisse scheitern',async t=>{
  const cases={
    userErrors:{body:{data:{publishablePublish:{userErrors:[{message:'Publication rejected'}]}}}},
    graphqlErrors:{body:{errors:[{message:'Access denied'}]}},
    lostResponse:{networkError:true},
    missingPayload:{body:{data:{}}},
    nullPayload:{body:{data:{publishablePublish:null}}},
    missingUserErrors:{body:{data:{publishablePublish:{}}}}
  };
  for(const [name,outcome]of Object.entries(cases))await t.test(name,t=>{
    const f=fixture(t),result=run(f,{products:[product('first'),product('failed'),product('last')],
      outcomes:{'gid://shopify/Product/failed':outcome}}, {LIVE:'1',APPROVE_PUBLISH:'1'});
    assert.equal(result.status,1,result.stdout+result.stderr);
    const r=report(result);assert.equal(r.published,2);assert.equal(r.failed,1);assert.equal(r.errors.length,1);
    assert.equal(r.errors[0].handle,'product-failed');assert.ok(r.errors[0].message);
    assert.equal(mutations(f).filter(c=>c.query.includes('Product/first')).length,1);
    assert.equal(mutations(f).filter(c=>c.query.includes('Product/last')).length,1);
  });
});

test('Fehlende oder fehlerhafte Tags werden nicht als Freigabe interpretiert',async t=>{
  for(const [name,value]of Object.entries({missing:undefined,null:null,string:'nicht-bewerben',object:{},badArray:[null]})){
    await t.test(name,t=>{
      const f=fixture(t),result=run(f,{products:[product('invalid',{tags:value})]}, {LIVE:'1',APPROVE_PUBLISH:'1'});
      assert.equal(result.status,1,result.stdout+result.stderr);assert.deepEqual(mutations(f),[]);
      const r=report(result);assert.equal(r.published,0);assert.equal(r.failed,1);assert.match(r.errors[0].message,/Tags/);
    });
  }
});

test('Unvollständige Produktdaten führen zu keinem Schreiben',async t=>{
  for(const [name,extra]of Object.entries({status:{status:undefined},publications:{resourcePublications:undefined},
    publicationId:{resourcePublications:{nodes:[{publication:{}}]}}}))await t.test(name,t=>{
    const f=fixture(t),result=run(f,{products:[product('invalid',extra)]},{LIVE:'1',APPROVE_PUBLISH:'1'});
    assert.equal(result.status,1,result.stdout+result.stderr);assert.deepEqual(mutations(f),[]);
    assert.equal(report(result).failed,1);
  });
});

test('Ungültige Shopify-Hosts brechen vor jedem API-Aufruf ab',async t=>{
  for(const host of ['attacker.invalid','test.myshopify.com.evil.invalid','https://test.myshopify.com@evil.invalid',
    'test.myshopify.com/path','https://test.myshopify.com/?x=1'])await t.test(host,t=>{
    const f=fixture(t),result=run(f,{}, {SHOPIFY_SHOP:host,LIVE:'1',APPROVE_PUBLISH:'1',
      SHOPIFY_CLIENT_ID:'fake-client',SHOPIFY_CLIENT_SECRET:'fake-secret'});
    assert.equal(result.status,1,result.stdout+result.stderr);assert.deepEqual(calls(f),[]);
    assert.match(result.stderr,/SHOPIFY_HOST/);
  });
});

test('Kanonischer Host, abgelehnte Redirects und 30s-Zeitlimit gelten auch beim Token-Grant',t=>{
  const f=fixture(t),result=run(f,{}, {SHOPIFY_SHOP:'https://TEST.myshopify.com/',LIVE:'1',APPROVE_PUBLISH:'1',
    SHOPIFY_CLIENT_ID:'fake-client',SHOPIFY_CLIENT_SECRET:'fake-secret',SHOPIFY_ADMIN_TOKEN:''});
  assert.equal(result.status,0,result.stdout+result.stderr);assert.equal(report(result).published,1);
  assert.equal(calls(f)[0].path,'/admin/oauth/access_token');
  assert.ok(calls(f).every(c=>c.host==='test.myshopify.com'&&c.redirect==='error'&&c.hasSignal));
  assert.ok(lines(f,'timeouts.jsonl').length>=4);
  assert.ok(lines(f,'timeouts.jsonl').every(ms=>ms==='30000'));
});

test('HTTP-Fehler oder fehlender Token beim Grant werden nicht als erfolgreicher No-op gemeldet',async t=>{
  for(const config of [{oauthStatus:401,oauthBody:{error:'denied'}},{oauthBody:{}}])await t.test(JSON.stringify(config),t=>{
    const f=fixture(t),result=run(f,config,{SHOPIFY_CLIENT_ID:'fake-client',SHOPIFY_CLIENT_SECRET:'fake-secret',SHOPIFY_ADMIN_TOKEN:''});
    assert.equal(result.status,1,result.stdout+result.stderr);assert.equal(calls(f).length,1);assert.deepEqual(mutations(f),[]);
    assert.match(result.stderr,/OAuth/);
  });
});
