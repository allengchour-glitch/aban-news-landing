import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  auditRequestedLocaleCoverage,
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
    expectedSourceSnapshotSha256:'b'.repeat(64), now, readFile:()=>raw, ...overrides,
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
test('fehlende Bindung an den Quellkatalog blockiert',()=>{
  const {raw,sha}=bind(evidence());
  assert.throws(()=>loadTranslationCoverage({
    file:'/beleg.json',expectedSha256:sha,shopDomain:'au3j0y-hq.myshopify.com',now,readFile:()=>raw,
  }),/SOURCE_SNAPSHOT/);
});
test('falscher Quellkatalog-Snapshot blockiert',()=>{
  assert.throws(()=>load(evidence(),{expectedSourceSnapshotSha256:'c'.repeat(64)}),/Quellkatalog-Snapshot/);
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
test('publiziertes FR ohne Abdeckung wird vor dem Skip zum Alarm',()=>{
  const result=auditRequestedLocaleCoverage({
    shopLocales:[{locale:'de',primary:true,published:true},{locale:'fr',primary:false,published:true}],
    wantedLocales:['fr'],evidence:load({...evidence(),locales:{}}),
  });
  assert.equal(result.ok,false);
  assert.equal(result.publishedBlocker,true);
  assert.equal(result.rows[0].published,true);
  assert.match(result.rows[0].coverage.reason,/kein exakter Beleg/);
});
test('publiziertes FR mit vollstaendiger Abdeckung besteht',()=>{
  const result=auditRequestedLocaleCoverage({
    shopLocales:[{locale:'de',primary:true,published:true},{locale:'fr',primary:false,published:true}],
    wantedLocales:['fr'],evidence:load(),
  });
  assert.equal(result.ok,true);
  assert.equal(result.publishedBlocker,false);
  assert.equal(result.rows[0].coverage.ok,true);
});
test('LOCALES kann publiziertes unbelegtes FR nicht aus dem Audit entfernen',()=>{
  const result=auditRequestedLocaleCoverage({
    shopLocales:[
      {locale:'de',primary:true,published:true},
      {locale:'fr',primary:false,published:true},
      {locale:'it',primary:false,published:false},
    ],
    wantedLocales:['it'],
    evidence:load({...evidence(),locales:{}}),
  });
  assert.equal(result.ok,false);
  assert.equal(result.publishedBlocker,true);
  assert.deepEqual(result.rows.map(row=>row.locale),['it','fr']);
  const fr=result.rows.find(row=>row.locale==='fr');
  assert.equal(fr.published,true);
  assert.match(fr.coverage.reason,/kein exakter Beleg/);
});
test('primaere publizierte Quellsprache wird nicht als Zielsprache auditiert',()=>{
  const result=auditRequestedLocaleCoverage({
    shopLocales:[{locale:'de',primary:true,published:true}],
    wantedLocales:[],evidence:load(),
  });
  assert.equal(result.ok,true);
  assert.deepEqual(result.rows,[]);
});
test('Belegfehler blockiert auch eine bereits publizierte Locale',()=>{
  const result=auditRequestedLocaleCoverage({
    shopLocales:[{locale:'fr',published:true}],wantedLocales:['fr'],coverageError:'Belegdatei fehlt',
  });
  assert.equal(result.ok,false);
  assert.equal(result.publishedBlocker,true);
  assert.equal(result.rows[0].coverage.reason,'Belegdatei fehlt');
});
test('Publisher prueft Coverage vor dem Skip bereits publizierter Sprachen',()=>{
  const source=readFileSync(new URL('../markets_languages.mjs',import.meta.url),'utf8');
  const audit=source.indexOf('const audit=auditRequestedLocaleCoverage');
  const stop=source.indexOf('if(!audit.ok)');
  const skip=source.indexOf('if(existing && existing.published)');
  assert.ok(audit>=0 && stop>audit && skip>stop,`audit=${audit} stop=${stop} skip=${skip}`);
});
test('Trockenlauf ist Vorgabe und Write braucht zwei Flags',()=>{
  assert.equal(localeWriteEnabled({}),false);
  assert.equal(localeWriteEnabled({LIVE:'1'}),false);
  assert.equal(localeWriteEnabled({DRY_RUN:'0'}),false);
  assert.equal(localeWriteEnabled({LIVE:'1',DRY_RUN:'0'}),true);
});

if(process.exitCode) console.error(`\n${ok} ok, mindestens ein Fehler`);
else console.log(`\n${ok} ok, 0 Fehler`);
