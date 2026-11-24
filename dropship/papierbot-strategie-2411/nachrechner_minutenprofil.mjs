import fs from 'node:fs';
const P='/tmp/claude-0/-home-user-aban-news-landing/f60e8419-5cec-583c-b9c3-333c2a6384f1/scratchpad/bot2211/x/ABAN-Hetzner-Paper/app';
const F=await import(P+'/daytrading_forward.js');
const {createArena,armArena,tickArenaBars,tickArenaQuote,arenaSummary}=F;
const S=await import(P+'/daytrading_scalping.js');
const profile=process.argv[2]||'scalping-aggressiv-v1', days=+process.argv[3]||1, spreadBps=+(process.argv[4]||2), dir='/tmp/claude-0/-home-user-aban-news-landing/f60e8419-5cec-583c-b9c3-333c2a6384f1/scratchpad/replay';
const syms=['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','DOTUSDT','LTCUSDT','BCHUSDT','TRXUSDT'];
const data=Object.fromEntries(syms.map(s=>[s,JSON.parse(fs.readFileSync(dir+'/'+s+'.json'))]));
const N=data.BTCUSDT.length, from=N-days*1440, WARM=40;
const quote=(price,t,sp)=>{const h=price*sp/20000;return {bid:price-h,ask:price+h,time:t,bookRequestedAt:t,last:price};};
let arena=createArena(data.BTCUSDT[from-1][6]+5000,syms);
const t0=data.BTCUSDT[from-1][6]+5000;
const mk=(i,t)=>Object.fromEntries(syms.map(s=>[s,{rows:data[s].slice(Math.max(0,i-60),i),quote:quote(+data[s][i-1][4],t,spreadBps)}]));
arena=armArena(arena,mk(from,t0),t0);
let ticks=0,reasons={},errs=0;const t00=Date.now();
for(let i=from;i<N;i++){
  for(const s of syms){
    const c=data[s][i],o=+c[1],h=+c[2],l=+c[3],cl=+c[4],open=c[0];
    if(arena.books.some(b=>b.symbol===s&&b.account.position)){
      const path=cl>=o?[o,l,h,cl]:[o,h,l,cl];
      path.forEach((p,k)=>{const t=open+5000+k*18000;try{arena=tickArenaQuote(arena,s,quote(p,t,spreadBps),t);}catch(e){errs++;}});
    }
  }
  const now=data.BTCUSDT[i][6]+5000;
  for(const s of syms){try{arena=tickArenaBars(arena,s,data[s].slice(Math.max(0,i-59),i+1),quote(+data[s][i][4],now,spreadBps),now,profile,8);ticks++;}catch(e){errs++;reasons['ERR '+e.message]=(reasons['ERR '+e.message]||0)+1;}}
}
const q=Object.fromEntries(syms.map(s=>[s,quote(+data[s][N-1][4],data.BTCUSDT[N-1][6]+5000,spreadBps)]));
const sm=arenaSummary(arena,q,data.BTCUSDT[N-1][6]+5000,true);
for(const e of arena.events){const r=e.message.replace(/[0-9.,]+/g,'#').slice(0,70);reasons[e.type+': '+r]=(reasons[e.type+': '+r]||0)+1;}
console.log(JSON.stringify({profile,days,spreadBps,keys:Object.keys(sm),sm:{...sm,books:undefined},secs:(Date.now()-t00)/1000,errs,reasons},null,1));
