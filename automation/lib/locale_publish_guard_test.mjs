import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  REQUIRED_TRANSLATION_SCOPES,
  loadTranslationCoverage,
  localeWriteEnabled,
  translationCoverageForLocale,
} from './locale_publish_guard.mjs';

let ok=0;
const test=(name,fn)=>{
  try { fn(); ok++; console.log(`ok  ${name}`); }
  catch(error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode=1; }
};
const now=Date.parse('2026-11-08T00:00:00Z');
const evidence=()=>({
  version:1,
  shopDomain:'au3j0y-hq.myshopify.com',
  sourceLocale:'de',
  generatedAt:'2026-11-07T23:30:00Z',
  sourceSnapshotSha256:'b'.repeat(64),
  locales:{
    fr:{
      coverageKind:'complete_catalog',
      targetLanguageVerified:true,
      scopes:Object.fromEntries(REQUIRED_TRANSLATION_SCOPES.map(scope=>[scope,{
        total:scope==='PRODUCT'?120:0,
        translated:scope==='PRODUCT'?120:0,
        missing:0,
        complete:true,
      }])),
    },
  },
});
const bind=value=>{
  const raw=Buffer.from(JSON.stringify(value));
  return {raw,sha:createHash('sha256').update(raw).digest('hex')};
};
const load=(value=evidence(),overrides={})=>{
  const {raw,sha}=bind(value);
  return loadTranslationCoverage({
    file:'/beleg.json', expectedSha256:sha, shopDomain:'au3j0y-hq.myshopify.com',
    now, readFile:()=>raw, ...overrides,
  }).evidence;
};

test('vollstaendiger, frischer und hashgebundener Beleg besteht',()=>{
  assert.equal(translationCoverageForLocale(load(),'fr').ok,true);
});
test('fehlende Datei blockiert',()=>{
  assert.throws(()=>loadTranslationCoverage({expectedSha256:'a'.repeat(64),shopDomain:'au3j0y-hq.myshopify.com'}),/FILE fehlt/);
});
test('falscher Dateihash blockiert',()=>{
  assert.throws(()=>load(evidence(),{expectedSha256:'a'.repeat(64)}),/stimmt nicht/);
});
test('falscher Shop blockiert',()=>{
  assert.throws(()=>load(evidence(),{shopDomain:'anderer.myshopify.com'}),/verbundenen Shop/);
});
test('alter Beleg blockiert',()=>{
  const e=evidence(); e.generatedAt='2026-11-06T00:00:00Z';
  assert.throws(()=>load(e),/zu alt/);
});
test('Beleg aus der Zukunft blockiert',()=>{
  const e=evidence(); e.generatedAt='2026-11-08T00:06:00Z';
  assert.throws(()=>load(e),/Zukunft/);
});
test('Stichprobe ist kein Vollkatalog-Beleg',()=>{
  const e=evidence(); e.locales.fr.coverageKind='sample';
  assert.equal(translationCoverageForLocale(load(e),'fr').ok,false);
});
test('fehlender Ressourcentyp blockiert',()=>{
  const e=evidence(); delete e.locales.fr.scopes.THEME;
  assert.match(translationCoverageForLocale(load(e),'fr').reason,/THEME/);
});
test('eine fehlende Uebersetzung blockiert',()=>{
  const e=evidence(); e.locales.fr.scopes.PRODUCT.translated=119; e.locales.fr.scopes.PRODUCT.missing=1;
  assert.equal(translationCoverageForLocale(load(e),'fr').ok,false);
});
test('leerer Produktkatalog ist kein Abdeckungsbeleg',()=>{
  const e=evidence(); e.locales.fr.scopes.PRODUCT={total:0,translated:0,missing:0,complete:true};
  assert.equal(translationCoverageForLocale(load(e),'fr').ok,false);
});
test('Beleg gilt nur fuer die exakte Zielsprache',()=>{
  assert.equal(translationCoverageForLocale(load(),'it').ok,false);
});
test('Trockenlauf ist Vorgabe und Write braucht zwei Flags',()=>{
  assert.equal(localeWriteEnabled({}),false);
  assert.equal(localeWriteEnabled({LIVE:'1'}),false);
  assert.equal(localeWriteEnabled({DRY_RUN:'0'}),false);
  assert.equal(localeWriteEnabled({LIVE:'1',DRY_RUN:'0'}),true);
});

if(process.exitCode) console.error(`\n${ok} ok, mindestens ein Fehler`);
else console.log(`\n${ok} ok, 0 Fehler`);
