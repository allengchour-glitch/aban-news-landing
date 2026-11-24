import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('d_BTCUSDT.json')),c=a.map(r=>r[4]),t=a.map(r=>r[0]);
function run(n,cost,shortToo){let eq=[1],w=0;for(let i=1;i<c.length;i++){let nw=0;if(i-1>=n){let s=0;for(let k=i-n;k<i;k++)s+=c[k];const m=s/n;nw=c[i-1]>m?1:(shortToo?-1:0);}
 eq.push(eq[i-1]*(1+nw*(c[i]/c[i-1]-1)-Math.abs(nw-w)*cost));w=nw;}return eq;}
const yrs=[2020,2021,2022,2023,2024,2025];const idx=y=>t.findIndex(x=>new Date(x).getUTCFullYear()===y);
for(const n of [20,50,100,150,200]){const eq=run(n,0.0015);const row=yrs.map(y=>{const a0=idx(y),b0=y===2025?c.length-1:idx(y+1)-1;return ((eq[b0]/eq[a0]-1)*100).toFixed(0)+'%';});
let trades=0,w=0;console.log('SMA'+n,row.join(' '));}
