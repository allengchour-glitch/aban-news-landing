/* Begrenzte Layout-/Standhöhenprüfung; keine Kampagne und keine Zufallswürfe.
   PLAYWRIGHT_MODULE=/pfad/zu/playwright LP_BASE_URL=http://127.0.0.1:8150
   LP_QA_OUT=/tmp/lebenspfad-layout-qa node spiele-dev/lebenspfad/layout-qa.cjs */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');
const out=process.env.LP_QA_OUT || '/tmp/lebenspfad-layout-qa';
const base=process.env.LP_BASE_URL || 'http://127.0.0.1:8150';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
fs.mkdirSync(out,{recursive:true});
const results={scope:'UI-Start echtes Solo; fünf HUD-Größen; explizite chapter/pos-Standfixtures; keine Kampagne',views:[],feet:[],errors:[]};
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext();
 if(process.env.LP_CSS)await context.route('**/css/lebenspfad.css*',route=>route.fulfill({path:process.env.LP_CSS,contentType:'text/css'}));
 await context.route('**/lebenspfad.html',async route=>{
  const response=await route.fetch();
  const original=await response.text();
  assert(original.includes('window.__lp={'),'Read-only-Hook-Anker fehlt');
  const body=original.replace('window.__lp={','Object.defineProperty(window,"__qaRead",{get:function(){return {G:G,fields:fields,pawns:pawns,camera:camera,scene:scene,THREE:THREE};}});\nwindow.__lp={');
  await route.fulfill({response,body});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>results.errors.push(String(e)));
 await page.goto(`${base}/lebenspfad.html`,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__lp);
 await page.setViewportSize({width:360,height:640});
 await page.locator('#pselect button').first().click();
 await page.locator('#botChk').uncheck();await page.locator('#startBtn').click();
 await page.locator('#tutSkip').waitFor({state:'visible'});await page.locator('#tutSkip').click();
 results.players=await page.evaluate(()=>__lp.state().players.map(p=>({name:p.name,bot:!!p.bot})));
 assert(results.players.length===1&&!results.players[0].bot,'Kein echtes Solo');
 for(const [width,height] of [[360,640],[390,844],[640,360],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});
  const controls=await page.evaluate(()=>['rollBtn','journeyOpen','menuBtn','emoBtn','chatBtn'].map(id=>{
   const e=document.getElementById(id),r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {selector:'#'+id,inside:r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,centerHit:!!top&&(top===e||e.contains(top))};
  }));
  results.views.push({width,height,controls});
  await page.screenshot({path:`${out}/${width}x${height}.png`,timeout:60000});
  controls.forEach(c=>assert(c.inside&&c.centerHit,`${width}x${height}: ${c.selector} blockiert/abgeschnitten`));
  const overlaps=await page.evaluate(()=>{
   const intersect=(a,b)=>{const x=document.getElementById(a).getBoundingClientRect(),y=document.getElementById(b).getBoundingClientRect();return x.width>0&&x.height>0&&y.width>0&&y.height>0&&Math.min(x.right,y.right)>Math.max(x.left,y.left)&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top);};
   return {bookHint:intersect('journeyPanel','hint'),helpLegal:intersect('keysHelp','aban-recht'),rollLegal:intersect('rollBtn','aban-recht')};
  });
  results.views[results.views.length-1].overlaps=overlaps;
  assert(!Object.values(overlaps).some(Boolean),`${width}x${height}: Hinweis/Fußbereich überlappt: ${JSON.stringify(overlaps)}`);
  // Tatsächlicher Buchaufruf ohne offene Ereigniskarte; keine Modal-Blockade als Defekt werten.
  await page.locator('#journeyOpen').click();await page.locator('#liClose').click();
 }
 for(const chapter of [0,1,3,6]){
  await page.evaluate(ch=>__lp.chapter(ch),chapter);
  await page.waitForFunction(()=>{const p=__qaRead.pawns[0];return Math.abs(p.scale.y-1.35*p.userData.ageScale*1.1)<.005;});
  const s=await sample(page,`chapter-${chapter}-fixture`);results.feet.push(s);checkFeet(s);
 }
 const raised=await page.evaluate(()=>__qaRead.fields.map((f,i)=>({i,y:f.disc.position.y+.13})).filter(f=>f.i<144).sort((a,b)=>b.y-a.y)[0]);
 results.raised=raised;assert(await page.evaluate(n=>__lp.pos(n),raised.i)===raised.i,'Positionsfixture wurde begrenzt');
 await page.waitForFunction(()=>{const q=__qaRead,p=q.pawns[0],f=q.fields[q.G.players[0].tile];return Math.abs(p.position.y-(f.disc.position.y+.13+.12*p.scale.y))<.005;});
 let s=await sample(page,'raised-fixture');results.feet.push(s);checkFeet(s);
 await page.locator('#emoBtn').click();await page.locator('#emoFan button').first().click();
 await page.waitForFunction(()=>__qaRead.pawns[0].userData.emote?.t>0,null,{timeout:60000});
 results.feet.push(await sample(page,'raised-emote-active-fixture'));
 await page.waitForFunction(()=>!__qaRead.pawns[0].userData.emote,null,{timeout:60000});
 s=await sample(page,'raised-emote-cleared-fixture');results.feet.push(s);checkFeet(s);
 await page.screenshot({path:`${out}/raised-emote-cleared.png`,timeout:60000});
 assert(results.errors.length===0,'Browserfehler: '+results.errors.join('; '));
 results.pass=true;
})().catch(e=>{results.pass=false;results.failure=String(e.stack);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify({pass:results.pass,views:results.views.length,fixtures:results.feet.length,failure:results.failure}));
});
function checkFeet(s){assert(!s.emote,`${s.label}: Emote noch aktiv`);assert(s.clearance.length===2&&s.clearance.every(v=>Math.abs(v)<.01),`${s.label}: Füße nicht auf Feld: ${s.clearance}`);}
async function sample(page,label){return page.evaluate(label=>{
 const q=__qaRead,T=q.THREE,p=q.pawns[0],f=q.fields[q.G.players[0].tile],surface=f.disc.position.y+.13;
 p.updateWorldMatrix(true,true);const feet=[];
 // Tatsächliche Unterkante beider Rig-Beine; funktioniert auch nach Materialbündelung.
 const limbs=p.userData.limbs;
 if(limbs?.ll&&limbs?.rl)[limbs.ll,limbs.rl].forEach(leg=>feet.push(new T.Box3().setFromObject(leg).min.y));
 else p.traverse(n=>{if(n.isMesh&&n.geometry?.type==='SphereGeometry'&&n.parent?.position.y===.5)feet.push(new T.Box3().setFromObject(n).min.y);});
 // Auch für vom Eltern-Agenten erzeugte Familienfixtures nutzbar: tatsächliche XZ-Unterstützung lesen.
 const followers=(p.followers||[]).map(a=>{const support=q.fields.filter(f=>Math.hypot(f.x-a.position.x,f.z-a.position.z)<f.disc.geometry.parameters.radiusTop).sort((a,b)=>b.disc.position.y-a.disc.position.y)[0];return {visible:a.visible,x:a.position.x,z:a.position.z,minY:new T.Box3().setFromObject(a).min.y,supportY:support?support.disc.position.y+.13:0};});
 return {label,tile:q.G.players[0].tile,stage:p.userData.ageStage,emote:p.userData.emote?{t:p.userData.emote.t}:null,surface,feet,clearance:feet.map(y=>y-surface),followers};
},label);}
