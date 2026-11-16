/* Chibi: echte Produktvorschauen, Rig-/Save-/Koop-Look-Fixtures.
 * Kein Netztest, keine FPS-Messung; Lockstep separat mit bestehendem Replay. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LP_OUT||'/tmp/lebenspfad-figur-qa',base=process.env.LP_BASE||'http://127.0.0.1:8187';
function fixture(){
 const api=window.__figur={};
 function vertices(root,fn){root.updateMatrixWorld(true);root.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)fn(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld));});}
 function dispose(root){const mats=new Set();root.traverse(o=>{if(o.isMesh){o.geometry.dispose();mats.add(o.material);}});mats.forEach(m=>m.dispose());}
 function make(cfg,stage){const p=mkPawnMesh(PCOLORS[0],cfg);if(stage!==undefined){const old=pawns[0],tile=G.players[0].tile;try{pawns[0]=p;G.players[0].tile=[0,1,3,6][stage]*FIELDS_PER;agePawn(0,false);animLife(p,0,false);}finally{pawns[0]=old;G.players[0].tile=tile;}}return p;}
 api.defaults=()=>[loadChar(0),loadChar(1)];
 api.save=cfg=>{saveChar(0,cfg);return loadChar(0);};
 api.preview=cfg=>{
  const cv=document.createElement('canvas');cv.width=PV_W;cv.height=PV_H;
  const original=renderer.render;let data;
  renderer.render=function(s,c){if(_pv&&s===_pv.s){c.updateMatrixWorld(true);let margin=Infinity,finite=true,count=0;
   s.children.filter(o=>o.isGroup||o.isMesh).forEach(root=>vertices(root,v=>{v.project(c);count++;finite=finite&&[v.x,v.y,v.z].every(Number.isFinite)&&v.z>-1&&v.z<1;margin=Math.min(margin,1-Math.abs(v.x),1-Math.abs(v.y));}));
   data={margin,finite,count,encoding:_pv.rt.texture.encoding,rendererEncoding:renderer.outputEncoding};}return original.call(this,s,c);};
  try{charPreview(cv,cfg,PCOLORS[0]);}finally{renderer.render=original;}return data;
 };
 function render(root,w,h){
  const s=new THREE.Scene();s.background=new THREE.Color(0xf6efe0);s.add(root,new THREE.HemisphereLight(0xffffff,0x8a7a5a,1.05));const light=new THREE.DirectionalLight(0xfff2d8,.9);light.position.set(2,4,3);s.add(light);
  const box=pawnPreviewBounds(root),sz=box.getSize(new THREE.Vector3()),mid=box.getCenter(new THREE.Vector3()),c=new THREE.PerspectiveCamera(36,w/h,.1,100),tan=Math.tan(c.fov*Math.PI/360),d=Math.max(sz.y/2/tan,sz.x/2/(tan*c.aspect))*1.12+sz.z/2;
  c.position.set(mid.x,mid.y,mid.z+d);c.lookAt(mid);const rt=new THREE.WebGLRenderTarget(w,h);rt.texture.encoding=renderer.outputEncoding;renderer.setRenderTarget(rt);renderer.render(s,c);
  const stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,size:sz.toArray()},pixels=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(rt,0,0,w,h,pixels);renderer.setRenderTarget(null);rt.dispose();
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d'),img=cx.createImageData(w,h);for(let y=0;y<h;y++)img.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);cx.putImageData(img,0,0);s.remove(root);return {cv,stats};
 }
 api.sheet=cases=>{window.__figurHold=true;const cv=document.createElement('canvas');cv.width=960;cv.height=Math.ceil(cases.length/4)*330;const cx=cv.getContext('2d');cx.fillStyle='#f6efe0';cx.fillRect(0,0,cv.width,cv.height);const results=[];
  cases.forEach((v,i)=>{const pw=make(v.cfg,v.stage);pw.rotation.y=v.angle===undefined?.32:v.angle;const r=render(pw,240,300);cx.drawImage(r.cv,(i%4)*240,Math.floor(i/4)*330);cx.fillStyle='#303241';cx.font='16px sans-serif';cx.textAlign='center';cx.fillText(v.name,(i%4)*240+120,Math.floor(i/4)*330+320);results.push({name:v.name,...r.stats});dispose(pw);});return {image:cv.toDataURL(),results};};
 api.motion=cfg=>{const pw=make(cfg),u=pw.userData,h=u.headGroup,parts=[u.head,u.mouth,...u.eyes];h.traverse(o=>{if(o.isMesh&&o.material===u.hairMat)parts.push(o);});
  function capture(){pw.updateMatrixWorld(true);const inv=h.matrixWorld.clone().invert();return parts.map(o=>({local:inv.clone().multiply(o.matrixWorld).elements.slice(),world:o.matrixWorld.elements.slice()}));}
  const before=capture();u.lookT=.5;u.lookDir=.5;u.blinkT=10;animLife(pw,.25,false);const after=capture(),drift=Math.max(...before.flatMap((p,j)=>p.local.map((v,i)=>Math.abs(v-after[j].local[i]))));
  u.blinkD=.1;animLife(pw,.01,false);const closed=u.eyes.map(e=>e.scale.y);u.blinkD=0;u.blinkT=10;animLife(pw,.01,false);const opened=u.eyes.map(e=>e.scale.y);
  animWalk(pw,true,.13);const limbs=u.limbs,walking=['ll','rl','la','ra'].map(k=>limbs[k].rotation.x);for(let i=0;i<30;i++)animWalk(pw,false,.05);const stopped=['ll','rl','la','ra'].map(k=>limbs[k].rotation.x);
  const result={drift,moved:before.map((p,j)=>Math.hypot(...p.world.map((v,i)=>v-after[j].world[i]))>1e-6),closed,opened,walking,stopped};dispose(pw);return result;};
 api.ages=cfg=>[0,1,2,3].map(stage=>{const p=make(cfg,stage),u=p.userData,surface=fieldSurface([0,1,3,6][stage]*FIELDS_PER);p.position.y=surface+pawnClearance(p);p.updateMatrixWorld(true);const feet=[u.limbs.ll,u.limbs.rl].map(l=>new THREE.Box3().setFromObject(l).min.y-surface),data={stage,feet,scale:p.scale.y,head:u.headGroup.scale.x,stoop:u.headStoop,hair:u.hairMat.color.toArray(),eyes:u.eyeOpen};dispose(p);return data;});
 api.gameImage=()=>{window.__figurHold=true;renderer.setRenderTarget(null);renderer.render(scene,camera);return renderer.domElement.toDataURL();};
 api.family=()=>{G.players[0].fam={partner:true,kids:1,dog:true};syncFam(0);const source=pawns[0].followers,group=new THREE.Group(),saved=source.map(f=>({p:f.position.clone(),r:f.rotation.clone()}));
  source.forEach((f,i)=>{scene.remove(f);group.add(f);f.position.set((i-1)*1.05,0,0);f.rotation.set(0,.25,0);});const r=render(group,800,500);
  const people=source.filter(f=>f.userData.person).map(f=>({native:f.userData.person.userData.characterArt,minY:new THREE.Box3().setFromObject(f).min.y}));source.forEach((f,i)=>{group.remove(f);scene.add(f);f.position.copy(saved[i].p);f.rotation.copy(saved[i].r);});return {image:r.cv.toDataURL(),people,stats:r.stats};};
 api.netLooks=cfgs=>{NET.host=true;NET.conns=[];beginNet({seed:0x1eb3a9,you:0,names:['Look A','Look B'],mode:'voll',adult:false,bots:[false,false],cfgs});
  return pawns.map(p=>{let hash=2166136261,meshes=0;p.traverse(o=>{if(!o.isMesh)return;meshes++;for(const v of o.geometry.attributes.position.array){hash=Math.imul(hash^Math.round(v*1e5),16777619)>>>0;}});return {cfg:p.userData.cfg,hash,meshes,native:p.userData.characterArt};});};
}
(async()=>{fs.mkdirSync(out,{recursive:true});const report={scope:'Browser-Fixtures Desktop/Mobil; keine FPS/kein echter Netztransport',checks:[],profiles:[],errors:[]};
 const check=(name,ok,data)=>{report.checks.push({name,passed:!!ok,data});if(!ok)throw Error(name);};
 const writeImage=(name,data)=>fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
 const b=await chromium.launch({executablePath:'/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{let expectedLooks;
  for(const mobile of [false,true]){const profile=mobile?'mobil':'desktop',ctx=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),p=await ctx.newPage();
   p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   await p.addInitScript(()=>{if(!sessionStorage.getItem('figurQA')){localStorage.clear();sessionStorage.setItem('figurQA','1');}localStorage.setItem('lp_tut_seen','1');localStorage.setItem('lp_opt',JSON.stringify({music:false,sfx:false,motion:false,graphics:'light'}));});
   await p.route('**/lebenspfad.html',async route=>{const r=await route.fetch();let h=await r.text();h=h.replace('requestAnimationFrame(loop);','requestAnimationFrame(loop);if(window.__figurHold)return;');const i=h.lastIndexOf('})();');assert(i>0);await route.fulfill({response:r,body:h.slice(0,i)+'('+fixture.toString()+')();'+h.slice(i)});});
   await p.goto(base+'/lebenspfad.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__figur);const defaults=await p.evaluate(()=>__figur.defaults()),f=defaults[0],m=defaults[1];
   await p.locator('#pselect button').first().click();await p.locator('#charRow').screenshot({path:path.join(out,profile+'-editor.png')});
   const variants=[['Standard',f],['Mann',m],...Array.from({length:10},(_,style)=>['Accessoire '+style,{...f,style,skin:style%5,hair:style,cloth:(style*2)%20,top:style%8,outfit:style%3}]),...Array.from({length:5},(_,hstyle)=>['Haar '+hstyle,{...f,style:9,hstyle,skin:hstyle,cloth:5,top:0}]),...Array.from({length:8},(_,top)=>['Oberteil '+top,{...m,style:9,top,cloth:8}])];
   const data={profile,previews:[],ages:[],motions:[]};report.profiles.push(data);
   for(const [name,cfg] of variants){const v=await p.evaluate(cfg=>__figur.preview(cfg),cfg);data.previews.push({name,...v});check(profile+' Vorschau '+name,v&&v.count>0&&v.finite&&v.margin>0&&v.encoding===v.rendererEncoding,v);}
   await p.locator('#botChk').uncheck();await p.locator('#startBtn').click();await p.waitForTimeout(500);writeImage(profile+'-spielkamera',await p.evaluate(()=>__figur.gameImage()));
   for(const cfg of [f,m]){const a=await p.evaluate(cfg=>__figur.ages(cfg),cfg);data.ages.push(a);check(profile+' vier Standhöhen '+cfg.g,a.every(a=>a.feet.every(d=>Math.abs(d)<.005)),a);check(profile+' Altersunterschiede '+cfg.g,a[0].scale<a[1].scale&&a[1].scale<a[2].scale&&a[0].head>a[1].head&&a[1].head>a[2].head&&a[3].stoop>0&&a[3].eyes<1&&JSON.stringify(a[3].hair)!==JSON.stringify(a[2].hair),a);
    const motion=await p.evaluate(cfg=>__figur.motion(cfg),cfg);data.motions.push(motion);check(profile+' Rig/Blinzeln/Gang '+cfg.g,motion.drift<1e-6&&motion.moved.every(Boolean)&&motion.closed.every(v=>v<.2)&&motion.opened.every(v=>v===1)&&motion.walking[0]*motion.walking[1]<0&&motion.walking[2]*motion.walking[3]<0&&motion.stopped.every(v=>Math.abs(v)<1e-5),motion);}
   const ageSheet=await p.evaluate(cases=>__figur.sheet(cases),['Kind','Teenager','Erwachsen','Senior'].map((name,stage)=>({name,cfg:f,stage})));writeImage(profile+'-alter',ageSheet.image);data.ageDraws=ageSheet.results;
   if(!mobile){const sheet=await p.evaluate(cases=>__figur.sheet(cases),variants.map(([name,cfg])=>({name,cfg})));writeImage('varianten',sheet.image);data.draws=sheet.results;check('Geometriebudget native Varianten',sheet.results.every(r=>r.calls<=45&&r.triangles<18000),sheet.results);
    const fam=await p.evaluate(()=>__figur.family());writeImage('familie',fam.image);data.family=fam.stats;check('Chibi-Familie Bodenkontakt',fam.people.length===2&&fam.people.every(v=>v.native&&Math.abs(v.minY)<.005),fam.people);}
   const saved={g:'f',style:8,skin:4,hair:7,pants:5,cloth:6,hstyle:3,outfit:2,top:6};assert.deepEqual(await p.evaluate(c=>__figur.save(c),saved),saved);await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__figur);check(profile+' gespeicherter Look nach Reload',JSON.stringify((await p.evaluate(()=>__figur.defaults()))[0])===JSON.stringify(saved));
   const looks=await p.evaluate(cfgs=>__figur.netLooks(cfgs),[saved,{...saved,g:'m',style:2,skin:1,top:3}]);check(profile+' übertragene Koop-Looks',looks.every(v=>v.native)&&looks[0].cfg.skin===4&&looks[1].cfg.skin===1,looks);if(!expectedLooks)expectedLooks=looks.map(v=>v.cfg);else assert.deepEqual(looks.map(v=>v.cfg),expectedLooks);
   const repeated=await p.evaluate(cfgs=>__figur.netLooks(cfgs),[saved,{...saved,g:'m',style:2,skin:1,top:3}]);check(profile+' reproduzierbare Koop-Geometrie',JSON.stringify(looks)===JSON.stringify(repeated));await ctx.close();
  }
  check('Keine JS-/Shaderfehler',report.errors.length===0,report.errors);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,failure:report.failure,errors:report.errors}));await b.close();}
})();
