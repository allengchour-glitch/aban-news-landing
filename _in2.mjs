import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:900,height:520}});
const e=[];p.on('pageerror',x=>e.push(String(x).slice(0,160)));
await p.goto('http://127.0.0.1:8899/traumhaus.html',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForTimeout(2500);
await p.evaluate(()=>document.getElementById('soloBtn').click());
await p.waitForTimeout(2000);
await p.evaluate(()=>{var b=document.getElementById('introOk');if(b)b.click();});
await p.waitForTimeout(15000);
await p.evaluate(()=>window.__th.inspektorRuf());
// Software-Renderer ist langsam — grosszuegig warten, NPC-Spawner tickt periodisch
for(let i=0;i<8;i++){
  await p.waitForTimeout(5000);
  const l=await p.evaluate(()=>window.__th.npcListe());
  const h=await p.evaluate(()=>document.getElementById('hint').textContent);
  console.log(i*5+5+'s NPCs:',JSON.stringify(l),'| Hint:',h.slice(0,70));
  if(l.some(n=>n.typ==='inspektor')&&h.includes('Bauabnahme')) break;
  if(h.includes('ABNAHME')||h.includes('Bauabnahme')) break;
}
console.log('errs',e.length,e.slice(0,2));
await b.close();
