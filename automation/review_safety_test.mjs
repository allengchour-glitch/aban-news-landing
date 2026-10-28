import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t, script) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-review-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'automation/lib'), { recursive: true });
  fs.mkdirSync(path.join(root, 'social'));
  const file = path.join(root, 'automation', script);
  fs.copyFileSync(new URL(script, import.meta.url), file);
  // Den ganzen lib-Ordner kopieren statt einer Namensliste: die Liste war beim Hinzufuegen
  // von automation/lib/cj_fetch.mjs stillschweigend veraltet, das Skript fand sein eigenes
  // Modul im Fixture nicht (ERR_MODULE_NOT_FOUND) und die Pruefung fiel aus einem Grund,
  // der mit dem geprueften Verhalten nichts zu tun hat.
  const libDir = new URL('lib/', import.meta.url);
  for (const lib of fs.readdirSync(libDir)) {
    if (!lib.endsWith('.mjs') || lib.endsWith('_test.mjs')) continue;
    fs.copyFileSync(new URL(lib, libDir), path.join(root, 'automation/lib', lib));
  }
  fs.writeFileSync(path.join(root, 'social/metricool_queue.csv'),
    'id,publish_date,media_url,text,networks,status,scheduled_at,note\n' +
    'one,2026-12-01T10:00:00,https://example.com/one.mp4,First,instagram,ready,,\n' +
    'two,2026-12-02T10:00:00,https://example.com/two.mp4,Second,instagram,ready,,\n');
  return { root, file };
}

function run(f, env = {}, fake = "globalThis.fetch = async () => { throw new Error('NETWORK MUST NOT RUN'); };") {
  const preload = path.join(f.root, 'fake.mjs');
  // The managed Node runtime may buffer console output at process.exit().
  fs.writeFileSync(preload, `import fs from 'node:fs';
    console.log=(...args)=>fs.writeSync(1,args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\\n');
    console.error=(...args)=>fs.writeSync(2,args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\\n');
    ` + fake);
  return spawnSync(process.execPath, ['--import', preload, f.file], {
    cwd: f.root, encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, ...env }
  });
}

test('Metricool startet ohne Schalter nur als Dry-Run', t => {
  const f = fixture(t, 'metricool-schedule.mjs');
  const r = run(f);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY/);
  assert.doesNotMatch(fs.readFileSync(path.join(f.root, 'social/metricool_queue.csv'), 'utf8'), /,scheduled,/);
});
test('DRY_RUN=0 allein löst keine Veröffentlichung aus', t => {
  const r = run(fixture(t, 'metricool-schedule.mjs'), { DRY_RUN: '0' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY/);
});
test('Live ohne explizite Marken-ID scheitert vor Netzwerkzugriff', t => {
  const r = run(fixture(t, 'metricool-schedule.mjs'), {
    DRY_RUN: '0', APPROVE_PUBLISH: '1', METRICOOL_USER_TOKEN: 'fake', METRICOOL_USER_ID: '4801419'
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Marken-ID/);
});
test('Teilerfolg wird als Fehler gemeldet, erfolgreiche Zeile gespeichert', t => {
  const f = fixture(t, 'metricool-schedule.mjs');
  const r = run(f, { DRY_RUN: '0', APPROVE_PUBLISH: '1', METRICOOL_USER_TOKEN: 'fake',
    METRICOOL_USER_ID: '4801419', METRICOOL_BLOG_ID: '6227837' }, `
    let count=0;
    globalThis.fetch=async (url, opts={}) => {
      if (!opts.method) return {ok:true,text:async()=>JSON.stringify({url:'https://example.com/normalized.mp4'})};
      count++;
      return {ok:count===1,status:count===1?200:500,text:async()=>count===1?'{"id":123}':'failed'};
    };`);
  assert.equal(r.status, 1, r.stderr);
  const csv=fs.readFileSync(path.join(f.root, 'social/metricool_queue.csv'), 'utf8');
  assert.match(csv, /one,.*scheduled/);
  assert.match(csv, /two,.*uncertain/);
});
test('Preiswächter schreibt selbst mit LIVE=1 keine Bestandsregel', t => {
  const r = run(fixture(t, 'price_guard.mjs'), { SHOPIFY_SHOP: 'test.myshopify.com',
    SHOPIFY_ADMIN_TOKEN: 'fake', LIVE: '1' }, `
    globalThis.fetch=async (url, opts) => {
      const query=JSON.parse(opts.body).query;
      if (/mutation/.test(query)) throw new Error('UNEXPECTED INVENTORY WRITE');
      return {status:200,json:async()=>({data:{products:{nodes:[{id:'p1',variants:{nodes:[
        {id:'v1',price:'10',compareAtPrice:null,inventoryPolicy:'DENY'}]}}],pageInfo:{hasNextPage:false}}}})};
    };`);
  assert.equal(r.status, 0, r.stderr);
  const report=JSON.parse(r.stdout);
  assert.equal(report.inventoryPolicyChanged, 0);
  assert.equal(report.denyVariants, 1);
});

test('CJ-Kommentar-Quota vergiftet das Leer-Ledger nicht', t => {
  const f = fixture(t, 'cj_reviews_import.mjs');
  fs.mkdirSync(path.join(f.root, 'dropship'));
  // DRY_RUN:'0' ausdruecklich: ohne die Variable ist der Importer ein Trockenlauf und schreibt nie ins Leer-Ledger, der Test pruefte dann nichts.
  const r = run(f, { CJ_EMAIL:'test@example.invalid', CJ_API_KEY:'fake', JUDGEME_PRIVATE_TOKEN:'fake',
    SHOPIFY_SHOP:'test.myshopify.com', SHOPIFY_ADMIN_TOKEN:'fake', DRY_RUN:'0',
    CJ_TOKEN_CACHE:path.join(f.root,'fake-token.json'), LIMIT:'1', SCAN:'1' }, `
    globalThis.fetch=async (url, opts={}) => {
      if (url.includes('graphql.json')) {
        const query=JSON.parse(opts.body).query;
        return {status:200,json:async()=>({data:query.includes('products(')?{products:{edges:[{node:{
          id:'gid://shopify/Product/1',handle:'test',variants:{edges:[{node:{sku:'CJ-TEST'}}]}
        }}],pageInfo:{hasNextPage:false}}}:{shop:{name:'Test'}}})};
      }
      if (url.includes('getAccessToken')) return {status:200,json:async()=>({result:true,data:{accessToken:'fake'}})};
      if (url.includes('/product/query')) return {status:200,json:async()=>({result:true,data:{pid:'123'}})};
      if (url.includes('productComments')) return {status:200,json:async()=>({result:false,message:'Insufficient API points'})};
      throw new Error('UNEXPECTED WRITE');
    };`);
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stderr,/CJ-TAGESPUNKTE/);
  assert.equal(fs.existsSync(path.join(f.root,'dropship/cj_reviews_leer.txt')),false);
  assert.equal(fs.existsSync(path.join(f.root,'dropship/cj_reviews_done.txt')),false);
});

test('CJ-Scan endet am Deckel, auch wenn jede Seite schon erledigt ist', t => {
  const f = fixture(t,'cj_reviews_import.mjs');
  fs.mkdirSync(path.join(f.root,'dropship'));
  fs.writeFileSync(path.join(f.root,'dropship/cj_reviews_done.txt'),'1\n');
  const r=run(f,{CJ_EMAIL:'test@example.invalid',CJ_API_KEY:'fake',JUDGEME_PRIVATE_TOKEN:'fake',
    SHOPIFY_SHOP:'test.myshopify.com',SHOPIFY_ADMIN_TOKEN:'fake',DRY_RUN:'0',LIMIT:'1',SCAN:'2',
    CJ_TOKEN_CACHE:path.join(f.root,'fake-token.json')},`
    let pages=0;
    globalThis.fetch=async (url,opts={})=>{
      if (!url.includes('graphql.json')) throw new Error('CJ MUST NOT RUN');
      const query=JSON.parse(opts.body).query;
      if (!query.includes('products(')) return {status:200,json:async()=>({data:{shop:{name:'Test'}}})};
      if (++pages>2) throw new Error('SCAN LIMIT NOT RESPECTED');
      return {status:200,json:async()=>({data:{products:{edges:[{node:{id:'gid://shopify/Product/1'}}],
        pageInfo:{hasNextPage:true,endCursor:'next-'+pages}}}})};
    };`);
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.match(r.stdout,/Teilmessung: 2 Produkte/);
  assert.match(r.stdout,/Nichts zu tun/);
});

test('Meta-Teilerfolg wird kanalweise gespeichert und ohne IG-Doppelpost fortgesetzt', t => {
  const f=fixture(t,'video-autopost-meta.mjs');
  const csv=path.join(f.root,'social/video_queue.csv');
  fs.writeFileSync(csv,'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url\n'+
    'one,,https://example.com/master.mp4,Test,instagram facebook,ready,,\n');
  const env={DRY_RUN:'0',APPROVE_PUBLISH:'1',IG_USER_ID:'ig',IG_ACCESS_TOKEN:'fake',
    FB_PAGE_ID:'fb',FB_PAGE_ACCESS_TOKEN:'fake',SKIP_THREADS:'1'};
  const first=run(f,env,`
    globalThis.setTimeout=(fn)=>{fn();return 0;};
    globalThis.fetch=async(url,opts={})=>{
      if(url.includes('/me/accounts'))return {ok:true,json:async()=>({data:[]})};
      if(url.includes('/fb/videos'))return {ok:false,status:400,json:async()=>({error:{code:100,message:'Invalid request'}})};
      if(url.includes('/media_publish'))return {ok:true,json:async()=>({id:'published-ig'})};
      if(url.includes('/media'))return {ok:true,json:async()=>({id:'container'})};
      if(url.includes('/container?'))return {ok:true,json:async()=>({status_code:'FINISHED'})};
      throw new Error('UNEXPECTED REQUEST');
    };`);
  assert.equal(first.status,1,first.stdout+first.stderr);
  assert.match(fs.readFileSync(csv,'utf8'),/,partial,/);
  assert.match(fs.readFileSync(csv,'utf8'),/published-ig/);
  const second=run(f,env,`
    globalThis.fetch=async(url)=>{
      if(url.includes('/me/accounts'))return {ok:true,json:async()=>({data:[]})};
      if(url.includes('/fb/videos'))return {ok:true,json:async()=>({id:'published-fb'})};
      throw new Error('IG MUST NOT BE POSTED AGAIN');
    };`);
  assert.equal(second.status,0,second.stdout+second.stderr);
  assert.match(fs.readFileSync(csv,'utf8'),/,posted,/);
  assert.match(second.stdout,/IG: bereits bestätigt/);
});

test('Fehlgeschlagene IG-Verarbeitung löst keinen Publish-Aufruf aus', t => {
  const f=fixture(t,'video-autopost-meta.mjs');
  fs.writeFileSync(path.join(f.root,'social/video_queue.csv'),
    'id,scheduled_date,video_url,caption,platforms,status,posted_at,post_url\n'+
    'one,,https://example.com/master.mp4,Test,instagram,ready,,\n');
  const marker=path.join(f.root,'publish-called');
  const r=run(f,{DRY_RUN:'0',APPROVE_PUBLISH:'1',IG_USER_ID:'ig',IG_ACCESS_TOKEN:'fake'},`
    globalThis.setTimeout=(fn)=>{fn();return 0;};
    globalThis.fetch=async(url)=>{
      if(url.includes('/media_publish')){fs.writeFileSync(${JSON.stringify(marker)},'bad');throw new Error('UNEXPECTED PUBLISH');}
      if(url.includes('/media'))return {ok:true,json:async()=>({id:'container'})};
      return {ok:true,json:async()=>({status_code:'ERROR'})};
    };`);
  assert.equal(r.status,1);
  assert.equal(fs.existsSync(marker),false);
});
