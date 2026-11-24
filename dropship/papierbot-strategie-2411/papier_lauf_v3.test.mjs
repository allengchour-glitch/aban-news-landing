import assert from 'node:assert/strict';
import {donchianW,momentumW,rueckkehrW,SLOT} from './papier_lauf_v3.mjs';
const mk=(c,h,l)=>({c,h:h||c.map(x=>x*1.01),l:l||c.map(x=>x*0.99)});
const up=Array.from({length:220},(_,i)=>100+i*0.3), down=Array.from({length:220},(_,i)=>300-i*0.3);
const brk=[...Array.from({length:219},()=>100),110]; // Ausbruch am letzten Tag
// Donchian
let r=donchianW({BTCUSDT:mk(brk,brk.map(x=>x===110?110:101),brk.map(x=>x*0.99))},[]); assert.equal(r.w.BTCUSDT,SLOT);
r=donchianW({BTCUSDT:mk([...Array.from({length:219},()=>100),100.5])},[]); assert.deepEqual(r.w,{},'kein Ausbruch');
const fall=[...Array.from({length:219},()=>100),90];
r=donchianW({BTCUSDT:mk(fall)},['BTCUSDT']); assert.deepEqual(r.w,{},'Schluss unter 20-Tage-Tief: raus');
r=donchianW({BTCUSDT:mk(Array.from({length:219},()=>100).concat([100]))},['BTCUSDT']); assert.equal(r.w.BTCUSDT,SLOT,'gehalten');
const many={};for(let i=0;i<8;i++)many['C'+i+'USDT']=mk(brk,brk.map(x=>x===110?110:101)); assert.equal(Object.keys(donchianW(many,[]).w).length,5,'hoechstens 5');
// Momentum
r=momentumW({BTCUSDT:mk(down)}); assert.deepEqual(r.w,{},'BTC unter SMA200: Cash');
const d={BTCUSDT:mk(up)};for(let i=0;i<7;i++)d['C'+i+'USDT']=mk(Array.from({length:220},(_,j)=>100+j*(0.1+i*0.05)));
r=momentumW(d); assert.equal(Object.keys(r.w).length,5); assert.ok('C6USDT' in r.w&&!('C0USDT' in r.w),'staerkste vorn');
// Rueckkehr
const dip=[...Array.from({length:219},(_,i)=>100+(i%2?0.5:-0.5)),90];
r=rueckkehrW({BTCUSDT:mk(up),ETHUSDT:mk(dip)},[]); assert.equal(r.w.ETHUSDT,SLOT,'Kauf unter Band');
r=rueckkehrW({BTCUSDT:mk(down),ETHUSDT:mk(dip)},[]); assert.deepEqual(r.w,{},'BTC unter SMA200: kein Kauf');
r=rueckkehrW({BTCUSDT:mk(up),ETHUSDT:mk([...dip.slice(0,219),105])},['ETHUSDT']); assert.deepEqual(r.w,{},'ueber SMA20: raus');
r=rueckkehrW({BTCUSDT:mk(up),ETHUSDT:mk([...dip.slice(0,219),91])},['ETHUSDT']); assert.equal(r.w.ETHUSDT,SLOT,'weiter gehalten');
// leichter Rutsch (nur knapp unter SMA20, nicht unter dem Band): kein Kauf
const mild=[...Array.from({length:219},(_,i)=>100+(i%2?2:-2)),99];
r=rueckkehrW({BTCUSDT:mk(up),ETHUSDT:mk(mild)},[]); assert.deepEqual(r.w,{},'knapp unter SMA20 reicht nicht');
// Momentum: Rendite ueber 30 Tage zaehlt, nicht ueber 8 Tage
const slow=Array.from({length:220},(_,j)=>j<212?100+j*0.5:100+212*0.5-(j-212)*2), fast=Array.from({length:220},(_,j)=>j<189?100:100+(j-189)*0.3);
const dm={BTCUSDT:mk(up),SLOWUSDT:mk(slow),FASTUSDT:mk(fast)}; for(let i=0;i<4;i++)dm['F'+i+'USDT']=mk(Array.from({length:220},()=>100));
r=momentumW(dm); assert.ok('FASTUSDT' in r.w,'30-Tage-Staerke zaehlt'); assert.ok(Object.keys(r.w).length===5);
// 30-Tage-Starke (dann flach) schlaegt 8-Tage-Starke
const s30=Array.from({length:220},(_,j)=>j<=189?100:j<=211?100+(j-189)*1:122), y8=Array.from({length:220},(_,j)=>j<=211?100:100+(j-211)*0.4);
const d2={BTCUSDT:mk(up),Y8USDT:mk(y8)}; for(let i=0;i<5;i++)d2['S'+i+'USDT']=mk(s30);
r=momentumW(d2); assert.ok(!('Y8USDT' in r.w),'nur 8-Tage-Staerke kommt nicht in die Top 5'); assert.ok('S0USDT' in r.w);
console.log('ok Pruefungen Papier-Lauf v3');
