/* Kapitelansichten sind Positionsfixtures, kein vollständiger Spielverlauf. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LP_BASE||'http://localhost:8150',out=process.env.LP_OUT||'/tmp/lebenspfad-landschaft';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const report={kind:'Kapitel-/Kamerafixtures, keine Kampagne',views:[],errors:[]};
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const c=await b.newContext({viewport:{width:1280,height:800}});
  await c.addInitScript(()=>{localStorage.setItem('lp_tut_seen','1');localStorage.setItem('lp_opt',JSON.stringify({motion:false,music:false,sfx:false}));});
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.route('**/lebenspfad.html',async route=>{const r=await route.fetch();let h=process.env.LP_HTML?fs.readFileSync(process.env.LP_HTML,'utf8'):await r.text();const i=h.lastIndexOf('})();');assert(i>0);h=h.slice(0,i)+`
   window.__landscapeQA={frame:function(ch,slot){__lp.chapter(ch);__lp.pos(ch*18+(slot===undefined?8:slot));updPlayers();updChapter();var pw=pawns[0];camT.x=pw.position.x;camT.z=pw.position.z;var h=16.5*(H>W?1.45:1)*zoomK;camera.position.set(camT.x,h,camT.z+15*(H>W?1.3:1)*zoomK);camera.lookAt(camT.x,.5,camT.z-2);},
   read:function(){var bad=0;scene.traverse(function(o){if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;var a=o.geometry.attributes.position.array;for(var i=0;i<a.length;i++)if(!Number.isFinite(a[i]))bad++;});return {groundedCount:scene.children.filter(function(o){return o.userData.lpGround;}).length,badVertices:bad,graphics:__lp.graphics(),terrain:window._lpTerrain&&_lpTerrain.stats,scenery:window._lpScenery&&_lpScenery.stats,waterside:window._lpWaterside&&_lpWaterside.stats,fields:fields.length,seed:NET.seed};},
   clearances:function(){return fields.map(function(f){return {x:f.x,z:f.z,ground:terrainH(f.x,f.z)-.35,base:f.yoff||0};});},
   waterClearance:function(){return lpBasins.filter(function(p){return !p.legacy;}).map(function(p){var conflicts=[];scene.children.forEach(function(o){if(!o.userData.lpGround)return;var box=new THREE.Box3().setFromObject(o);if(box.isEmpty())return;var x=Math.max(box.min.x,Math.min(box.max.x,p.x)),z=Math.max(box.min.z,Math.min(box.max.z,p.z));if(Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)<1.05)conflicts.push({box:box.min.toArray().concat(box.max.toArray())});});return {basin:{x:p.x,z:p.z},conflicts:conflicts};});}};
  `+h.slice(i);await route.fulfill({response:r,body:h});});
  const r=await p.goto(base+'/lebenspfad.html',{waitUntil:'domcontentloaded'});assert(r.headers()['content-security-policy']);
  await p.waitForFunction(()=>window.__landscapeQA);await p.locator('#pselect button').first().click();await p.locator('#botChk').uncheck();await p.locator('#startBtn').click();await p.waitForTimeout(1600);
  if(!process.env.LP_HTML)await p.waitForFunction(()=>__landscapeQA.read().groundedCount>=19,null,{timeout:20000});
  report.initial=await p.evaluate(()=>__landscapeQA.read());assert.equal(report.initial.badVertices,0);
  if(!process.env.LP_HTML){assert(report.initial.terrain&&report.initial.scenery&&report.initial.waterside,'Neue Landschaftsmodule fehlen');
   report.clearances=await p.evaluate(()=>__landscapeQA.clearances());assert(report.clearances.every(f=>f.ground<=f.base+.005),'Landschaft ragt durch Spielfeldbasis');
   report.waterClearance=await p.evaluate(()=>__landscapeQA.waterClearance());assert(report.waterClearance.every(b=>!b.conflicts.length),'Gebäude oder Requisit steht im neuen Teich');}
  for(const [width,height] of [[1280,800],[390,844]]){
   await p.setViewportSize({width,height});
   for(let chapter=0;chapter<8;chapter++){
    await p.evaluate(ch=>__landscapeQA.frame(ch),chapter);await p.waitForTimeout(350);
    await p.screenshot({path:path.join(out,`${width}-kapitel-${chapter+1}.png`),timeout:60000});
    const d=await p.evaluate(()=>__landscapeQA.read());report.views.push({width,height,chapter:chapter+1,...d});assert.equal(d.badVertices,0);
   }
  }
  await p.setViewportSize({width:1280,height:800});await p.evaluate(()=>__landscapeQA.frame(0,0));await p.waitForTimeout(1800);
  await p.screenshot({path:path.join(out,'start.png'),timeout:60000});
  report.performance=await p.evaluate(()=>new Promise(resolve=>{const started=performance.now(),frames=[];let last=started,done=false;function tick(t){if(done)return;frames.push(t-last);last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);setTimeout(()=>{done=true;frames.sort((a,b)=>a-b);resolve({rafPerSecond:frames.length/((performance.now()-started)/1000),median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],...__lp.graphics()});},6000);}));
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(report,null,2));console.log({passed:report.passed,views:report.views.length,performance:report.performance,failure:report.failure});await b.close();}
})();
