import fs from 'node:fs';
const dir=process.argv[2],COST=+(process.argv[3]||0.0015),MODE=process.argv[4]||'normal';
const files=fs.readdirSync(dir).filter(f=>f.startsWith('d_'));
const T0=Date.UTC(2019,0,1),DAY=86400000,N=Math.floor((Date.UTC(2026,10,23)-T0)/DAY);
const S={};for(const f of files){const a=JSON.parse(fs.readFileSync(dir+'/'+f));const c=new Array(N).fill(null);for(const r of a){const i=Math.round((r[0]-T0)/DAY);if(i>=0&&i<N)c[i]=r[4];}S[f.slice(2,-5)]=c;}
const names=Object.keys(S);
const sma=(c,i,n)=>{if(i<n-1)return null;let s=0;for(let k=i-n+1;k<=i;k++){if(c[k]==null)return null;s+=c[k];}return s/n;};
const ret=(c,i)=>c[i]!=null&&c[i-1]!=null?c[i]/c[i-1]-1:null;
const look=MODE==='lookahead'?0:1; // Kontrolle: Signal mit Zukunftsdaten muss unrealistisch gut sein
// Strategie: gibt Zielgewichte je Coin fuer Tag i (Signal aus Daten bis i-look)
const strat={
 'BTC SMA100 long/cash':(i)=>{const k=i-look,m=sma(S.BTCUSDT,k,100);return {BTCUSDT:m&&S.BTCUSDT[k]>m?1:0};},
 'Trend SMA100 je Coin long/cash':(i)=>{const k=i-look,w={},el=names.filter(n=>{const m=sma(S[n],k,100);return m&&S[n][k]>m;});el.forEach(n=>w[n]=1/Math.max(el.length,5));return w;},
 'Trend SMA100 long/short':(i)=>{const k=i-look,w={},av=names.filter(n=>sma(S[n],k,100));av.forEach(n=>w[n]=(S[n][k]>sma(S[n],k,100)?1:-1)/Math.max(av.length,5));return w;},
 'Donchian 50/20 long':(i)=>{const k=i-look,w={},el=[];for(const n of names){const c=S[n];if(k<50||c.slice(k-50,k).some(x=>x==null)||c[k]==null)continue;const hi=Math.max(...c.slice(k-50,k)),lo=Math.min(...c.slice(k-20,k));const held=strat._held[n];if(c[k]>hi||(held&&c[k]>=lo))el.push(n);}
   strat._held={};el.forEach(n=>{strat._held[n]=1;w[n]=1/Math.max(el.length,5);});return w;},
 'Momentum 30d top5 +BTC200':(i)=>{const k=i-look,m=sma(S.BTCUSDT,k,200);if(!m||S.BTCUSDT[k]<=m)return {};const r=names.filter(n=>S[n][k]!=null&&S[n][k-30]!=null).map(n=>[n,S[n][k]/S[n][k-30]-1]).sort((a,b)=>b[1]-a[1]).slice(0,5);const w={};r.forEach(x=>w[x[0]]=.2);return w;},
 'Zufall (Kontrolle)':(i)=>{const w={};let seed=i*9301+49297;for(const n of names){seed=(seed*233280+12345)%2147483647;if(seed%3===0&&S[n][i-1]!=null)w[n]=1/8;}return w;},
};
strat._held={};
const hold={'Halten BTC':()=>({BTCUSDT:1}),'Halten alle gleich':(i)=>{const w={},av=names.filter(n=>S[n][i-1]!=null);av.forEach(n=>w[n]=1/av.length);return w;}};
function run(fn){let eq=[1],prev={};for(let i=1;i<N;i++){const w=fn(i);let r=0,turn=0;const all=new Set([...Object.keys(w),...Object.keys(prev)]);for(const n of all){const a=w[n]||0,b=prev[n]||0;turn+=Math.abs(a-b);const x=ret(S[n],i);if(a!==0&&x!=null)r+=a*x;}
  eq.push(eq[i-1]*(1+r-turn*COST));prev=w;}return eq;}
const yr=(y)=>[Math.round((Date.UTC(y,0,1)-T0)/DAY),Math.round((Date.UTC(y+1,0,1)-T0)/DAY)-1];
function st(eq,a,b){b=Math.min(b,N-1);const e=eq.slice(a,b+1);let pk=e[0],dd=0;for(const v of e){pk=Math.max(pk,v);dd=Math.max(dd,1-v/pk);}return (((e.at(-1)/e[0])-1)*100).toFixed(0)+'%/DD'+(dd*100).toFixed(0);}
console.log('Kosten je Seite',COST,'Modus',MODE,'Tage',N);
console.log('Strategie'.padEnd(34),[2020,2021,2022,2023,2024,2025].join('       '),'  alle(2020-)');
for(const [n,f] of [...Object.entries(hold),...Object.entries(strat).filter(([k])=>k[0]!=='_')]){strat._held={};const eq=run(f);const cols=[2020,2021,2022,2023,2024,2025].map(y=>{const [a,b]=yr(y);return st(eq,a,b).padEnd(9);});console.log(n.padEnd(34),cols.join(' '),st(eq,yr(2020)[0],N-1));}
