// Routen, Spielbeschreibungen und neue Direktstarts prüfen; kein vollständiger Spiellauf.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=process.env.ARCADE_BASE||'http://127.0.0.1:8182';
(async()=>{const inv=JSON.parse(fs.readFileSync(path.join(__dirname,'inventar.json'),'utf8'));
assert.equal(inv.aktiveSpiele,31);assert(!inv.spiele.some(g=>g.path==='traumhaus.html'));assert.equal(new Set(inv.spiele.map(g=>g.path)).size,31);
const responses=await Promise.all(inv.spiele.map(async g=>{const r=await fetch(base+'/'+g.path);const text=await r.text();return {path:g.path,status:r.status,title:(text.match(/<title>([^<]+)/)||[])[1],csp:r.headers.get('content-security-policy'),text};}));
for(const r of responses){assert.equal(r.status,200,r.path);assert(r.title,r.path);assert(r.csp&&/script-src/.test(r.csp),r.path+' CSP');assert(!['neon-abyss.html','neon-colossus.html','neon-duo.html','neon-realm.html'].includes(r.path),r.path);}
assert.equal(new Set(responses.map(r=>r.title)).size,31,'Eigenständige Titel, keine vierfach gezählten Weiterleitungen');
const hub=fs.readFileSync(path.join(root,'spiele.html'),'utf8');for(const f of ['neon-racer.html?station=1','neon-jump.html?station=1','neon-survivor.html?station=1','neon-dungeon.html?station=1','neon-park.html'])assert(hub.includes('href="/'+f+'"'),f);
const index=fs.readFileSync(path.join(root,'minispiele/index.html'),'utf8');assert(index.includes('Schalt-Rennen'));assert(!index.includes('wer öfter tippt gewinnt'));assert(!index.includes('Knopf hämmern'));
const report={kind:'31 HTTP-Routen mit tatsächlichen Headern, eindeutige Titel und aktuelle Katalog-Regeln. Keine Spiellogik-/Browser-Fertigmeldung.',checks:31+5+3,passed:true,games:responses.map(({text,...r})=>r)};
const out=process.env.ARCADE_INVENTORY_OUT||'/tmp/arcade-inventar.json';fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(report.checks+' Routen-/Katalogbedingungen grün · '+out);
})().catch(e=>{console.error(e);process.exitCode=1;});
