// Nur erfundene Schattenwerte, keine Börse, Schlüssel oder Netzaufrufe.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{KB3D:{}}};
vm.runInNewContext(fs.readFileSync(new URL('./kb3d-buero.js',import.meta.url),'utf8'),context);
const lesen=context.window.KB3D.kryptoModell,now=Date.parse('2026-11-15T12:00:00Z');
const demo=()=>({version:2,strategien:Object.fromEntries(['KI-Bot','Ausgleich','Trendfilter 200'].map((name,i)=>[name,{eintraege:[{stand:'2026-11-01',depot:10000},{stand:'2026-11-02',depot:9900+i*100}]}]))});
let n=0;
const d=demo(),vorher=JSON.stringify(d),m=lesen(d,now);
assert.equal(m.reihen.length,3);assert.equal(m.reihen[0].letzte.wert,9900);assert.equal(m.stand,'2026-11-02');assert.equal(m.abgerufen,'2026-11-15T12:00:00.000Z');assert.equal(JSON.stringify(d),vorher);n++;
for(const value of [null,{},[],{version:1,strategien:{}},{version:2,strategien:{}}]){assert.throws(()=>lesen(value,now));n++;}
for(const depot of [null,'10000',NaN,Infinity,-1,0]){const x=demo();x.strategien['KI-Bot'].eintraege[1].depot=depot;assert.throws(()=>lesen(x,now));n++;}
for(const stand of ['2026-02-30','2026-11-16','2026-11-01','2026-10-31','gestern']){const x=demo();x.strategien['KI-Bot'].eintraege[1].stand=stand;assert.throws(()=>lesen(x,now));n++;}
for(const value of [[],null,{}]){const x=demo();x.strategien['KI-Bot'].eintraege=value;assert.throws(()=>lesen(x,now));n++;}
// Historische Werte bleiben historische Werte: kein Umstempeln auf Abrufdatum.
assert.equal(lesen(demo(),Date.parse('2027-01-01T00:00:00Z')).stand,'2026-11-02');n++;
console.log(`${n} ok, 0 Fehler`);
