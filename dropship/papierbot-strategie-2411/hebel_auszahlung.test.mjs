import assert from 'node:assert/strict';
import {simuliere} from './hebel_auszahlung.mjs';
const d=(h,net,stop=99,entry=100)=>({closed:Date.UTC(2026,10,24,h),net,amount:100,stop,entry});
// Hebel 1: Netto wie im Lauf
let r=simuliere([d(1,2),d(2,-1)],1); assert.equal(r.ausgezahlt,1); assert.equal(r.konto,1000);
// Hebel 10 skaliert Gewinn und Verlust
r=simuliere([d(1,2)],10); assert.equal(r.ausgezahlt,20);
r=simuliere([d(1,-1)],10); assert.equal(r.konto,990);
// Liquidation: Stop 2 % weg, Hebel 125 (Grenze 0,3 %): ganze Marge weg
r=simuliere([d(1,-0.5,98)],125); assert.equal(r.liquidiert,1); assert.ok(r.konto<=900);
// Stop 0,2 % (unter der Grenze bei Hebel 50: 1/50-0,005=1,5 %): normal skaliert
r=simuliere([d(1,-0.3,99.8)],50); assert.equal(r.liquidiert,0); assert.equal(r.konto,985);
// Auszahlung am Tagesende, Verlust danach bleibt im Konto
r=simuliere([d(1,5),{closed:Date.UTC(2026,10,25,1),net:-2,amount:100,stop:99,entry:100}],1); assert.equal(r.ausgezahlt,5); assert.equal(r.konto,998);
// Pleite: Konto unter Marge, keine weiteren Trades
const viele=Array.from({length:12},(_,i)=>d(i,-0.5,98)); r=simuliere(viele,125); assert.equal(r.pleite,true); assert.ok(r.trades<12);
console.log('ok Pruefungen Hebel und Auszahlung');
