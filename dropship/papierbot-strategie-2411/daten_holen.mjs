import fs from 'node:fs';
const syms=['BTC','ETH','BNB','XRP','ADA','DOGE','SOL','LTC','LINK','DOT','AVAX','BCH','TRX','XLM','ATOM','UNI','NEAR','AAVE','ETC','FIL','ALGO','VET','EOS','XTZ','SAND','MANA','SHIB','SUI','APT','ARB'].map(s=>s+'USDT');
let ok=0;for(const s of syms){let rows=[],t=1546300800000;for(;;){const r=await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1d&startTime=${t}&limit=1000`);if(!r.ok){console.log(s,'ERR',r.status);break;}const a=await r.json();if(!a.length)break;rows.push(...a.map(x=>[x[0],+x[1],+x[2],+x[3],+x[4],+x[5]]));t=a.at(-1)[0]+86400000;if(a.length<1000)break;}
if(rows.length){fs.writeFileSync('d_'+s+'.json',JSON.stringify(rows));ok++;}
let gaps=0;for(let i=1;i<rows.length;i++)if(rows[i][0]-rows[i-1][0]!==86400000)gaps++;console.log(s,rows.length,rows[0]&&new Date(rows[0][0]).toISOString().slice(0,10),'Luecken',gaps);}
const fg=await (await fetch('https://api.alternative.me/fng/?limit=0&format=json')).json();fs.writeFileSync('fng.json',JSON.stringify(fg.data));console.log('fng',fg.data.length);
