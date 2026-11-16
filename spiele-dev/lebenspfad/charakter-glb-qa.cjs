/* Reale lokale GLB-Downloads und posierte Vorschau-Geometrie, kein Animations-/Netztest.
   PLAYWRIGHT_MODULE=/pfad/playwright LP_BASE=http://localhost:8151 node charakter-glb-qa.cjs
   LP_HTML optional für eine fehlerhafte Quellen-Gegenprobe; normale TLS-Prüfung bleibt unverändert. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LP_BASE||'http://localhost:8151',out=process.env.LP_OUT||'/tmp/lebenspfad-charakter-glb';
function fixture(){
 window.__special=function(id){return new Promise(function(resolve,reject){
  var cfg=loadChar(0);cfg.meshy=id;var cv=document.createElement('canvas');cv.width=PV_W;cv.height=PV_H;
  cv.id='specialPreview';cv.style='position:fixed;left:0;top:0;z-index:999999;width:220px;height:248px';document.getElementById('specialPreview')?.remove();document.body.appendChild(cv);
  var original=renderer.render,timer=setTimeout(function(){renderer.render=original;reject(new Error('GLB-Vorschau-Zeitüberschreitung '+id));},30000);
  renderer.render=function(s,c){
   var loaded=_pv&&s===_pv.s&&s.children.find(function(o){return o.userData&&o.userData.gscene;});
   var value=original.call(this,s,c);
   if(loaded){
    var margin=Infinity,count=0,zMin=Infinity,zMax=-Infinity,finite=true;
    loaded.traverseVisible(function(o){if(!o.isMesh)return;var pos=o.geometry.attributes.position;
     for(var j=0;j<pos.count;j++){
      var v=new THREE.Vector3().fromBufferAttribute(pos,j);if(o.isSkinnedMesh)o.boneTransform(j,v);
      v.applyMatrix4(o.matrixWorld).project(c);margin=Math.min(margin,1-Math.abs(v.x),1-Math.abs(v.y));
      zMin=Math.min(zMin,v.z);zMax=Math.max(zMax,v.z);finite=finite&&[v.x,v.y,v.z].every(Number.isFinite);count++;
     }
    });
    clearTimeout(timer);renderer.render=original;resolve({id:id,vertices:count,margin:margin,zMin:zMin,zMax:zMax,finite:finite});
   }return value;
  };charPreview(cv,cfg,PCOLORS[0]);
 });};
 window.__specialIds=function(){return MESHY_CHARS.map(function(c){return c.id;});};
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const report={kind:'Neun echte GLB-Vorschauen mit posierten Vertices; keine Spielfigur-Normalisierung',cases:[],errors:[]};
 try{
  const p=await b.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.route('**/lebenspfad.html',async r=>{
   const response=await r.fetch(),h=process.env.LP_HTML?fs.readFileSync(process.env.LP_HTML,'utf8'):await response.text(),i=h.lastIndexOf('})();');assert(i>0);
   await r.fulfill({response,body:h.slice(0,i)+'('+fixture.toString()+')();\n'+h.slice(i)});
  });
  await p.goto(base+'/lebenspfad.html');await p.waitForFunction(()=>window.__specialIds);
  for(const id of await p.evaluate(()=>__specialIds())){
   const r=await p.evaluate(id=>__special(id),id);
   r.pixelColors=await p.locator('#specialPreview').evaluate(cv=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,colors=new Set();for(let i=0;i<d.length;i+=4)colors.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);return colors.size;});
   report.cases.push(r);assert(r.pixelColors>16,'Vorschau leer: '+JSON.stringify(r));
   assert(r.vertices>0&&r.finite&&r.margin>0&&r.zMin>-1&&r.zMax<1,JSON.stringify(r));
   if(process.env.LP_SHOTS==='1')await p.locator('#specialPreview').screenshot({path:path.join(out,id+'.png')});
  }
  assert.equal(report.cases.length,9);assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(report,null,2));console.log(report);await b.close();}
})();
