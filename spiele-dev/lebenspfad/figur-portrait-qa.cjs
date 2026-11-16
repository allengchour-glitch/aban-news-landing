/* Repräsentativer Editor-/Portraitvergleich; keine Kampagne. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LP_OUT||'/tmp/lp-figur-portrait';
(async()=>{fs.mkdirSync(out,{recursive:true});const report={errors:[]};
 const b=await chromium.launch({executablePath:'/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem('lp_tut_seen','1');localStorage.setItem('lp_opt',JSON.stringify({music:false,sfx:false,motion:false,graphics:'light'}));});
  await p.route('**/lebenspfad.html',async route=>{const r=await route.fetch();let h=process.env.LP_HTML?fs.readFileSync(process.env.LP_HTML,'utf8'):await r.text();const i=h.lastIndexOf('})();');
   h=h.replace('requestAnimationFrame(loop);','requestAnimationFrame(loop);if(window.__portraitHold)return;');
   const marker=h.lastIndexOf('})();');await route.fulfill({response:r,body:h.slice(0,marker)+`
    window.__portrait=function(angle){window.__portraitHold=true;var cfg=loadChar(0),pw=mkPawnMesh(PCOLORS[0],cfg);pw.rotation.y=angle;
     var s=new THREE.Scene();s.background=new THREE.Color(0xf6efe0);s.add(new THREE.HemisphereLight(0xffffff,0x8a7a5a,1.05));var dl=new THREE.DirectionalLight(0xfff2d8,.9);dl.position.set(2,4,3);s.add(dl,pw);
     var box=pawnPreviewBounds(pw),size=box.getSize(new THREE.Vector3()),mid=box.getCenter(new THREE.Vector3()),c=new THREE.PerspectiveCamera(36,.75,.1,30),tan=Math.tan(c.fov*Math.PI/360),d=Math.max(size.y/2/tan,size.x/2/(tan*c.aspect))*1.12+size.z/2;
     c.position.set(mid.x,mid.y,mid.z+d);c.lookAt(mid);var rt=new THREE.WebGLRenderTarget(600,800);rt.texture.encoding=renderer.outputEncoding;renderer.setRenderTarget(rt);renderer.render(s,c);
     var stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,size:size.toArray(),cfg:cfg};
     var data=new Uint8Array(600*800*4);renderer.readRenderTargetPixels(rt,0,0,600,800,data);renderer.setRenderTarget(null);
     var cv=document.getElementById('portraitQA')||document.createElement('canvas');cv.id='portraitQA';cv.width=600;cv.height=800;cv.style.cssText='position:fixed;top:0;left:0;z-index:999999;width:600px;height:800px';document.body.appendChild(cv);
     var ctx=cv.getContext('2d'),img=ctx.createImageData(600,800);for(var y=0;y<800;y++)img.data.set(data.subarray((799-y)*2400,(800-y)*2400),y*2400);ctx.putImageData(img,0,0);rt.dispose();return stats;};
   `+h.slice(marker)});});
  const r=await p.goto((process.env.LP_BASE||'http://127.0.0.1:8187')+'/lebenspfad.html',{waitUntil:'domcontentloaded'});assert(r.headers()['content-security-policy']);await p.waitForFunction(()=>window.__portrait);
  await p.locator('#pselect button').first().click();await p.locator('#charRow').screenshot({path:path.join(out,'editor.png')});
  for(const [name,a] of [['frontal',0],['dreiviertel',.45],['profil',Math.PI/2]]){report[name]=await p.evaluate(a=>__portrait(a),a);await p.locator('#portraitQA').screenshot({path:path.join(out,name+'.png')});}
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(report,null,2));console.log(report);await b.close();}
})();
