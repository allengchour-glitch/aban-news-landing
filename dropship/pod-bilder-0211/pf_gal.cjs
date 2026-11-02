const {chromium}=require('playwright');const fs=require('fs');
const map=JSON.parse(fs.readFileSync(process.env.MAP||'map.json'));const out={};
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1400,height:1000}});const p=await c.newPage();let first=true;
for(const [h,u] of Object.entries(map)){try{await p.goto('https://www.printful.com'+u,{waitUntil:'domcontentloaded',timeout:40000});await p.waitForTimeout(6000);if(first){try{await p.getByText('Continue to Site').click({timeout:3000})}catch(e){}first=false;await p.waitForTimeout(1500)}
const urls=await p.evaluate(()=>{const o=[];document.querySelectorAll('img').forEach(i=>{const s=i.currentSrc||i.src;if(/variant-image(-jpg)?\/.*_l/.test(s)&&!o.includes(s))o.push(s);(i.srcset||'').split(',').forEach(x=>{const t=x.trim().split(' ')[0];if(/variant-image(-jpg)?\/.*_l/.test(t)&&!o.includes(t))o.push(t)})});return o});
out[h]=urls;console.log(h.slice(0,40),urls.length)}catch(e){console.log('ERR',h,e.message.slice(0,60));out[h]=[]}}
fs.writeFileSync(process.env.OUT||'gal.json',JSON.stringify(out,null,1));await b.close()})();
