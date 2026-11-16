/* Reproduzierbare Kamera-/Kapitel-Fixtures, keine gespielte Kampagne.
 * LP_BASE=http://127.0.0.1:8185 LP_OUT=/tmp/lp-atmo LP_HTML=/tmp/alt.html(optional)
 * PLAYWRIGHT_MODULE / CHROMIUM_PATH optional. Echte _headers bleiben erhalten.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LP_OUT||'/tmp/lp-atmo',base=process.env.LP_BASE||'http://127.0.0.1:8185';
const hook=`
window.__atmoQA={
 frame:function(ch,slot,overview){
  window.__atmoHold=true;__lp.chapter(ch);__lp.pos(ch*18+slot);updPlayers();updChapter();
  var pw=pawns[0];camT.x=pw.position.x;camT.z=pw.position.z;panOff.x=panOff.z=0;
  camera.position.set(camT.x,16.5*(H>W?1.45:1),camT.z+15*(H>W?1.3:1));camera.lookAt(camT.x,.5,camT.z-2);
  if(overview){camera.position.set(15,87,156);camera.lookAt(15,14,-55);}
  for(var i=0;i<240;i++){
   updSeason(.05,ch);
   if(typeof lpAtmosphere!=='undefined')lpAtmosphere.update(.05,camera,camT);
   else {scene.background.lerp(window._skyTarget,.06);scene.fog.color.copy(scene.background);lpSkyMat.uniforms.botCol.value.copy(scene.background);lpSkyMat.uniforms.topCol.value.copy(scene.background).multiplyScalar(.82).offsetHSL(0,.06,.03);lpSkyDome.position.copy(camera.position);sunL.position.set(camT.x+30,60,camT.z+20);sunL.target.position.set(camT.x,0,camT.z);sunL.target.updateMatrixWorld();}
  }
  if(window._lpBillboards){_lpBillboards.forEach(function(m){m.position.x=camT.x-110;m.position.z=camT.z-120;m.lookAt(camera.position);});}
  renderer.render(scene,camera);
 },
 render:function(){renderer.render(scene,camera);},
 read:function(){var gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {graphics:__lp.graphics(),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),coarse:IS_COARSE,camera:camera.position.toArray(),fog:{near:scene.fog.near,far:scene.fog.far,color:scene.fog.color.toArray()},sun:{position:sunL.position.toArray(),color:sunL.color.toArray(),intensity:sunL.intensity},atmosphere:typeof lpAtmosphere!=='undefined'?{stats:lpAtmosphere.stats,state:lpAtmosphere.read()}:null,art:typeof lpArtStatus!=='undefined'?lpArtStatus:null,models:scene.children.filter(function(o){return o.userData.lpGround;}).length,programs:renderer.info.programs.length,seed:NET.seed};},
 lights:function(){var a=[];scene.traverse(function(o){if(o.isLight)a.push(o.type);});return a;},
 seam:function(){
  if(typeof LPAtmosphere==='undefined')return null;
  var s=new THREE.Scene(),sun=new THREE.DirectionalLight(),hemi=new THREE.HemisphereLight(),cam=new THREE.PerspectiveCamera(50,1,.1,800);
  s.add(sun,hemi);cam.lookAt(0,0,-1);var a=LPAtmosphere(THREE,{scene:s,sun:sun,hemi:hemi});
  a.group.children.forEach(function(m){if(m.name!=='lp-sky')m.visible=false;});
  var plane=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshBasicMaterial({color:0x000000}));plane.position.z=-500;s.add(plane);
  var rt=new THREE.WebGLRenderTarget(64,64);rt.texture.encoding=THREE.sRGBEncoding;
  var results=[];renderer.setRenderTarget(rt);
  for(var ch=0;ch<8;ch++){a.setChapter(ch);a.update(0,cam,{x:0,z:0},true);plane.visible=false;renderer.render(s,cam);
   var sky=new Uint8Array(4),fog=new Uint8Array(4);renderer.readRenderTargetPixels(rt,32,32,1,1,sky);
   plane.visible=true;renderer.render(s,cam);renderer.readRenderTargetPixels(rt,32,32,1,1,fog);
   results.push({chapter:ch,sky:Array.from(sky),fog:Array.from(fog),delta:Math.max.apply(null,Array.from(sky).map(function(v,i){return Math.abs(v-fog[i]);}))});}
  renderer.setRenderTarget(null);rt.dispose();plane.geometry.dispose();plane.material.dispose();a.dispose();return results;
 },
 landmark:function(key){var spec=lpArtLandmarks.find(function(s){return s.key===key;});this.frame(Math.floor(spec.tile/18),spec.tile%18,false);
  var root=scene.children.find(function(o){return o.userData.lpSiteKey===key;}),box=new THREE.Box3().setFromObject(root),v=box.getCenter(new THREE.Vector3()).project(camera);
  return {key:key,ndc:v.toArray(),inView:Math.abs(v.x)<.9&&Math.abs(v.y)<.9&&v.z<1};},
 artConflicts:function(){scene.updateMatrixWorld(true);var art=scene.children.filter(function(o){return o.userData.lpArt;}),conflicts=[];
  art.forEach(function(a){var box=new THREE.Box3().setFromObject(a);scene.children.forEach(function(o){if(!o.isGroup||!o.visible||o.userData.lpArt||o.name==='lp-atmosphere')return;
   var b=new THREE.Box3().setFromObject(o);if(!b.isEmpty()&&box.intersectsBox(b))conflicts.push({key:a.name,other:o.name||o.userData.lpSiteKey||'bestehende Gruppe',bounds:b.min.toArray().concat(b.max.toArray())});});});return conflicts;},
 artBounds:function(){scene.updateMatrixWorld(true);return scene.children.filter(function(o){return o.userData.lpArt;}).map(function(o){
  var site=lpSites.get(o.userData.lpSiteKey),box=new THREE.Box3().setFromObject(o),materials=new Set(),triangles=0,vertices=[],v=new THREE.Vector3();
  o.traverse(function(m){if(!m.isMesh)return;var p=m.geometry.attributes.position;triangles+=(m.geometry.index?m.geometry.index.count:p.count)/3;
   (Array.isArray(m.material)?m.material:[m.material]).forEach(function(a){materials.add(a);});
   for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);vertices.push([v.x,v.y,v.z]);}});
  return {key:site.key,site:site,size:box.getSize(new THREE.Vector3()).toArray(),floor:box.min.y,ground:terrainH(site.x,site.z)-.35,materials:materials.size,triangles:triangles,radius:o.userData.lpArt.radius,vertices:vertices};});}
};
`;
(async()=>{
 fs.mkdirSync(out,{recursive:true});const graphics=process.env.LP_GRAPHICS||'light';const report={kind:'GEMESSEN: feste Kapitel/Kamera, Animation aus; Rendering-Gegenprobe bei parallelen2D-Tests, keine isolierte FPS-Messung',graphics,views:[],errors:[]};
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  for(const profile of [{name:'desktop',width:1280,height:800,mobile:false},{name:'touch',width:390,height:844,mobile:true}]){
   const ctx=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,isMobile:profile.mobile,hasTouch:profile.mobile});
   await ctx.addInitScript(mode=>{let seed=51191;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};localStorage.setItem('lp_tut_seen','1');localStorage.setItem('lp_opt',JSON.stringify({motion:false,music:false,sfx:false,graphics:mode}));},graphics);
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   if(process.env.LP_BAD_FOG)await page.route('**/js/lebenspfad/atmosphere.js*',async route=>{const r=await route.fetch();const body=(await r.text()).replace('scene.fog.color.copy(scene.background);','scene.fog.color.copy(u.horizon.value);');await route.fulfill({response:r,body});});
   await page.route('**/lebenspfad.html',async route=>{const response=await route.fetch();let html=process.env.LP_HTML?fs.readFileSync(process.env.LP_HTML,'utf8'):await response.text();
    report.sourceHash=crypto.createHash('sha256').update(html).digest('hex');
    html=html.replace('requestAnimationFrame(loop);','requestAnimationFrame(loop);if(window.__atmoHold)return;');const i=html.lastIndexOf('})();');assert(i>0);await route.fulfill({response,body:html.slice(0,i)+hook+html.slice(i)});});
   const response=await page.goto(base+'/lebenspfad.html',{waitUntil:'domcontentloaded'});assert(response.headers()['content-security-policy']);
   await page.waitForFunction(()=>window.__atmoQA);await page.locator('#pselect button').first().click();await page.locator('#botChk').uncheck();await page.locator('#startBtn').click();
   await page.waitForFunction(()=>__atmoQA.read().models>=22);await page.waitForTimeout(1200);
   if(!process.env.LP_HTML){await page.waitForFunction(()=>Object.values(__atmoQA.read().art).every(a=>a.state==='ready'),null,{timeout:30000});
    report[profile.name+'Seams']=await page.evaluate(()=>__atmoQA.seam());assert(report[profile.name+'Seams'].every(s=>s.delta<=2),'Nebel/Himmel weichen in der tatsächlichen Pixelausgabe ab');
    const bounds=await page.evaluate(()=>__atmoQA.artBounds());assert.equal(bounds.length,3);bounds.forEach(b=>{assert(Math.abs(b.floor-b.ground)<.002);assert(b.radius<=b.site.r-.1);assert(b.materials<=5);assert(b.triangles<=2500);});
    report[profile.name+'Art']=bounds.map(({vertices,...b})=>b);
    report[profile.name+'Conflicts']=await page.evaluate(()=>__atmoQA.artConflicts());assert.deepEqual(report[profile.name+'Conflicts'],[],'Eigenes Objekt überlappt sichtbare bestehende Gruppe');
   }
   for(const chapter of (process.env.LP_QUICK?[0,5,7]:[0,1,2,3,4,5,6,7])){
    await page.evaluate(ch=>__atmoQA.frame(ch,ch===0?0:8,false),chapter);
    const read=await page.evaluate(()=>__atmoQA.read());assert.equal(read.coarse,profile.mobile);assert.equal(read.graphics.profile,graphics);
    await page.screenshot({path:path.join(out,`${profile.name}-${chapter+1}.png`),timeout:60000});report.views.push({profile:profile.name,chapter,...read});
   }
   if(!profile.mobile){await page.evaluate(()=>__atmoQA.frame(3,8,true));await page.screenshot({path:path.join(out,'panorama.png'),timeout:60000});}
   if(!process.env.LP_HTML)for(const key of ['own:welcome','own:memories','own:observatory']){const view=await page.evaluate(k=>__atmoQA.landmark(k),key);assert(view.inView,'Objektzentrum außerhalb der normalen Kamera: '+key);report.views.push({profile:profile.name,landmark:view});await page.screenshot({path:path.join(out,profile.name+'-'+key.split(':')[1]+'.png'),timeout:60000});}
   await page.evaluate(()=>__atmoQA.frame(0,0,false));
   const measure=process.env.LP_QUICK?await page.evaluate(()=>__atmoQA.read()):await page.evaluate(()=>new Promise(resolve=>{let samples=[],last=performance.now(),start=last;function tick(t){samples.push(t-last);last=t;__atmoQA.render();if(t-start<6000)requestAnimationFrame(tick);else{samples.sort((a,b)=>a-b);resolve({rafPerSecond:samples.length/((t-start)/1000),median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],frames:samples.length,...__atmoQA.read()});}}requestAnimationFrame(tick);}));
   report[profile.name]=measure;report[profile.name].lights=await page.evaluate(()=>__atmoQA.lights());
   await ctx.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,views:report.views.length,desktop:report.desktop,touch:report.touch,failure:report.failure}));await browser.close();}
})();
