/* Gezielte Geometrie-Fixture: Familie direkt aufbauen, kein Lebenslauf-Nachweis. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LP_OUT||'/tmp/lebenspfad-familie';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const result={kind:'Geometrie-Fixture, kein echter Lebenslauf',cases:[],errors:[]};
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const p=await b.newPage({viewport:{width:960,height:640}});p.on('pageerror',e=>result.errors.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('lp_tut_seen','1');localStorage.setItem('lp_opt',JSON.stringify({motion:false,music:false,sfx:false,graphics:'light'}));});
  await p.route('**/lebenspfad.html',async route=>{const r=await route.fetch();let h=process.env.LP_HTML?fs.readFileSync(process.env.LP_HTML,'utf8'):await r.text();const i=h.lastIndexOf('})();');assert(i>0);h=h.slice(0,i)+`
   window.__familyFixture=function(tile,outside){
    G.players[0].fam={partner:true,kids:1,dog:true};G.players[0].tile=tile;placePawn(0);syncFam(0);
    var pw=pawns[0];if(outside){pw.position.x=-1000;pw.position.z=-1000;}
    pw.followers.forEach(function(f,j){var a=2.6+j*.85;f.position.x=pw.position.x+Math.cos(a)*(1.1+j*.55);f.position.z=pw.position.z+Math.sin(a)*(1.1+j*.55);});
    updFam(0);scene.updateMatrixWorld(true);
    return pw.followers.map(function(f,j){var support=0;fields.forEach(function(fl){var dx=f.position.x-fl.x,dz=f.position.z-fl.z,r=fl.disc.geometry.parameters.radiusTop+.08;if(dx*dx+dz*dz<=r*r)support=Math.max(support,fl.disc.position.y+.13);});return {j:j,dog:!!f.userData.dog,support:support,y:f.position.y,minY:new THREE.Box3().setFromObject(f).min.y};});
   };
   window.__familyRoadFixture=function(){
    var link=_lpPathArt.links.find(function(l){return l.from===2&&l.to===3;}),x=(link.start.x+link.end.x)/2,z=(link.start.z+link.end.z)/2;
    G.players[0].fam={partner:true,kids:0,dog:false};syncFam(0);var pw=pawns[0],f=pw.followers[0],a=2.6;
    pw.position.x=x-Math.cos(a)*1.1;pw.position.z=z-Math.sin(a)*1.1;f.position.x=x;f.position.z=z;updFam(0);scene.updateMatrixWorld(true);
    return {support:_lpPathArt.surfaceAt(x,z),minY:new THREE.Box3().setFromObject(f).min.y};
   };
  `+h.slice(i);await route.fulfill({response:r,body:h});});
  await p.goto((process.env.LP_BASE||'http://localhost:8150')+'/lebenspfad.html');await p.waitForFunction(()=>window.__lp);
  await p.locator('#pselect button').first().click();await p.locator('#botChk').uncheck();await p.locator('#startBtn').click();await p.locator('#menuBtn').click();
  for(const [tile,outside] of [[0,false],[107,false],[143,false],[0,true]]){
   const followers=await p.evaluate(([tile,outside])=>__familyFixture(tile,outside),[tile,outside]);result.cases.push({tile,outside,followers});
   assert.equal(followers.length,3);
   for(const f of followers){assert(f.minY>=f.support-.0001,`Begleiter ${f.j}: ${f.minY} unter Deckel ${f.support}`);if(!f.dog)assert(Math.abs(f.minY-f.support)<.005,'Wartende Person schwebt');}
  }
  if(!process.env.LP_HTML){const road=await p.evaluate(()=>__familyRoadFixture());result.road=road;assert(road.support>.2);assert(Math.abs(road.minY-road.support)<.005,'Partner steckt im Verbindungsweg');}
  assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(e){result.status='failed';result.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(result,null,2));console.log(result);await b.close();}
})();
