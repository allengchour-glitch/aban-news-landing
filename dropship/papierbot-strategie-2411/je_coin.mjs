import fs from 'node:fs';
const T0=Date.UTC(2020,0,1);
const out=[];
for(const f of fs.readdirSync(process.argv[2]).filter(f=>f.startsWith('d_'))){
 const a=JSON.parse(fs.readFileSync(process.argv[2]+'/'+f)).filter(r=>r[0]>=T0-120*864e5);const c=a.map(r=>r[4]),t=a.map(r=>r[0]);
 let eq=1,w=0,peak=1,dd=0,hold=1,hpk=1,hdd=0,n=0,trades=0;
 for(let i=100;i<c.length;i++){if(t[i]<T0)continue;let s=0;for(let k=i-100;k<i;k++)s+=c[k];const nw=c[i-1]>s/100?1:0;const r=c[i]/c[i-1]-1;
  eq*=1+nw*r-Math.abs(nw-w)*0.0015;if(nw!==w)trades++;w=nw;peak=Math.max(peak,eq);dd=Math.max(dd,1-eq/peak);hold*=1+r;hpk=Math.max(hpk,hold);hdd=Math.max(hdd,1-hold/hpk);n++;}
 out.push([f.slice(2,-5),n,(eq-1)*100,dd*100,(hold-1)*100,hdd*100,trades]);}
console.log('Coin       Tage  Regel%  RegelDD  Halten%  HaltenDD  Wechsel');
let better=0,ddb=0;for(const o of out){console.log(o[0].padEnd(10),String(o[1]).padStart(5),o[2].toFixed(0).padStart(7),o[3].toFixed(0).padStart(7),o[4].toFixed(0).padStart(8),o[5].toFixed(0).padStart(8),String(o[6]).padStart(7));if(o[2]>o[4])better++;if(o[3]<o[5])ddb++;}
console.log('Regel besser als Halten (Rendite):',better,'von',out.length,'| kleinerer Rueckgang:',ddb,'von',out.length);
