import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeShopifyHost } from './shopify_host.mjs';
import { shopifyGql } from './shopify_gql.mjs';

test('Shopify-Hosts werden vor dem Anfügen von Zugangsdaten normalisiert',()=>{
  for(const value of ['shop.myshopify.com',' SHOP.myshopify.com ','https://SHOP.myshopify.com/','shop.myshopify.com/']) {
    assert.equal(normalizeShopifyHost(value),'shop.myshopify.com');
  }
  assert.equal(normalizeShopifyHost(undefined),'');
});
test('Ähnliche Domains, URL-Zugangsdaten und Pfade werden vor jedem Request abgewiesen',async()=>{
  let calls=0;
  for(const value of ['attacker-myshopify.com','myshopify.com','shop.myshopify.com.attacker.test',
    'shop.myshopify.com@attacker.test','https://user:pass@shop.myshopify.com/',
    'https://shop.myshopify.com/admin','https://shop.myshopify.com/?next=x',
    'http://shop.myshopify.com','https://shop.myshopify.com:8443/','a.b.myshopify.com','']) {
    await assert.rejects(shopifyGql(value,'2025-01','fake-token','{shop{name}}',{},
      {fetch:async()=>{calls++;throw new Error('MUST NOT RUN');}}),/SHOPIFY_HOST/);
  }
  assert.equal(calls,0);
});
test('Gültige GraphQL-Anfragen folgen keinen Weiterleitungen und haben ein Zeitlimit',async()=>{
  let options;
  const out=await shopifyGql('https://SHOP.myshopify.com/','2025-01','fake-token','{shop{name}}',{},
    {fetch:async(url,opts)=>{assert.equal(new URL(url).hostname,'shop.myshopify.com');options=opts;
      return {status:200,json:async()=>({data:{shop:{name:'Test'}}})};}});
  assert.equal(out.shop.name,'Test');
  assert.equal(options.redirect,'error');
  assert.ok(options.signal instanceof AbortSignal);
});
test('CJ-Importer sendet bei einer ähnlichen Fremddomain weder Token noch Grant',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'luxe-host-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const preload=path.join(root,'fake.mjs');
  fs.writeFileSync(preload,"import fs from 'node:fs'; globalThis.fetch=async()=>{fs.writeFileSync('called','bad');throw new Error('MUST NOT RUN');};");
  const script=new URL('../cj_reviews_import.mjs',import.meta.url).pathname;
  const out=spawnSync(process.execPath,['--import',preload,script],{cwd:root,encoding:'utf8',timeout:5000,
    env:{PATH:process.env.PATH,SHOPIFY_SHOP:'attacker-myshopify.com',SHOPIFY_ADMIN_TOKEN:'fake-admin',
      SHOPIFY_CLIENT_ID:'fake-id',SHOPIFY_CLIENT_SECRET:'fake-secret',CJ_EMAIL:'fake@example.invalid',
      CJ_API_KEY:'fake-key',JUDGEME_PRIVATE_TOKEN:'fake-judge'}});
  assert.equal(out.status,1);assert.match(out.stderr,/SHOPIFY_HOST/);
  assert.equal(fs.existsSync(path.join(root,'called')),false);
  assert.doesNotMatch(out.stderr,/fake-admin|fake-secret|fake-judge/);
});
