/* Bauplatz-/Bodenprüfung ohne Browser. Echte HTML-Register und Pfade, THREE r128.
   node spiele-dev/lebenspfad/world-sites-qa.cjs
   Optional: LP_HTML=/pfad/lebenspfad.html LP_REPORT=/pfad/world-sites.json */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'js/vendor/three.min.js'));
const htmlPath=path.resolve(process.env.LP_HTML||path.join(root,'lebenspfad.html')),html=fs.readFileSync(htmlPath,'utf8');
const result={source:htmlPath,scope:'GEMESSEN: reine Bauplatzplanung, echte Register/Pfade, analytisches Terrain und r128-Raycaster; Browser-Modellgrenzen separat',checks:[],failures:[]};
// Das Dreiecksnetz interpoliert am Padrand. 0.0001 ist die feste Mesh-Toleranz,
// die analytische Planhöhe wird weiterhin auf 0.0000001 genau geprüft.
const meshFlatTolerance=.0001;
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert(a>=0&&b>a,`HTML-Anker fehlt: ${start} / ${end}`);return html.slice(a,b);}
function test(name,fn){try{fn();result.checks.push(name);}catch(e){result.failures.push({name,error:e.message});}}
function near(a,b,tol=1e-7,label=''){assert(Number.isFinite(a)&&Math.abs(a-b)<=tol,`${label}: ${a} statt ${b}`);}
function clone(v){return JSON.parse(JSON.stringify(v));}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');}
function lineDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function constraints(sites,points,edges,basins){
 const violations=[];let nodeMargin=Infinity,lineMargin=Infinity,siteMargin=Infinity,waterMargin=Infinity;
 for(let i=0;i<sites.length;i++){
  const s=sites[i];
  for(let j=0;j<points.length;j++){const p=points[j],m=Math.hypot(s.x-p.x,s.z-p.z)-s.r-3.2;nodeMargin=Math.min(nodeMargin,m);if(m< -1e-7)violations.push(`Feld ${j}: ${s.key} (${m})`);}
  for(const e of edges){const m=lineDistance(s,points[e.a],points[e.b])-s.r-1.15;lineMargin=Math.min(lineMargin,m);if(m< -1e-7)violations.push(`Kante ${e.a}→${e.b}: ${s.key} (${m})`);}
  for(let j=0;j<i;j++){const b=sites[j],m=Math.hypot(s.x-b.x,s.z-b.z)-s.r-b.r-1.3;siteMargin=Math.min(siteMargin,m);if(m< -1e-7)violations.push(`Bauplätze ${s.key}/${b.key} (${m})`);}
  for(const b of basins){const m=Math.hypot(s.x-b.x,s.z-b.z)-s.r-Math.max(b.rx,b.rz)-1.5;waterMargin=Math.min(waterMargin,m);if(m< -1e-7)violations.push(`Wasser ${s.key} (${m})`);}
 }
 return {nodeMargin,lineMargin,siteMargin,waterMargin,violations};
}
let terrain;
try{
 let rngCalls=0;const math=Object.create(Math);math.random=()=>{rngCalls++;throw Error('Math.random im Planer/Terrain');};
 const c={THREE:T,Math:math};c.window=c;vm.createContext(c);
 for(const name of ['route-layout','world-sites','terrain'])vm.runInContext(fs.readFileSync(path.join(root,`js/lebenspfad/${name}.js`),'utf8'),c,{filename:`${name}.js`});
 vm.runInContext(section('var CHAPTERS=','function chapterOf'),c);
 vm.runInContext(section('var lpBasins=','var lpSites='),c);
 const options=freeze(clone({points:c.pathPts,edges:c.lpRoute.edges,buildings:c.lpBuildings,props:c.lpProps,basins:c.lpBasins,forks:c.FORKS}));
 const before=JSON.stringify(options),planned=c.LPWorldSites(options),sites=planned.sites;
 result.sites=clone(sites);result.clearance=constraints(sites,options.points,options.edges,options.basins);
 test('Echte r128-Pfade: 175 Knoten, 178 Kanten, vier Nebenrouten',()=>{assert.equal(T.REVISION,'128');assert.equal(options.points.length,175);assert.equal(options.edges.length,178);assert.equal(c.FORKS.length,4);});
 test('32 eindeutige Slots aus tatsächlichen Registern, Winterfiguren und Gabelschildern',()=>{
  const keys=[...c.CHAPTERS.map((_,i)=>`chapter:${i}`),...options.buildings.concat(options.props).map(v=>v[0].replace(/\.glb$/,'')),'house','wheel','mill','wind','flag','chalk','goalTree','winter:0','winter:1','winter:2',...options.forks.map(f=>`fork:${f.at}`)];
  assert.equal(keys.length,32);assert.equal(new Set(keys).size,32);assert.equal(sites.length,32);assert.deepEqual(Array.from(sites,s=>s.key).sort(),keys.sort());assert.equal(planned.pads.length,32);
  sites.forEach(s=>{assert.strictEqual(planned.get(s.key),s);assert([s.x,s.z,s.r,s.cx,s.cz].every(Number.isFinite));assert(s.r>0);assert(Number.isInteger(s.tile)&&s.tile>=0&&s.tile<144);assert(s.x-s.r>=-260&&s.x+s.r<=300&&s.z-s.r>=-110&&s.z+s.r<=110);});
  assert.equal(planned.get('unbekannt'),undefined);
 });
 test('Modellradien verwenden die vermessenen Footprint-Verhältnisse',()=>{
  // Referenzwerte des separaten GLB-Bounds-Laufs; hier werden keine Modelle geladen.
  const ratios={lp_schule:.567,lp_uni:.609,lp_buero:.206,lp_parkbank:.459,lp_prop_kinderwagen:.515,lp_prop_abschlusshut:.654,lp_prop_cabrio:.580,lp_prop_hochzeitsbogen:.330,lp_prop_haus:.575,lp_prop_herz:.493};
  for(const spec of options.buildings.concat(options.props)){const key=spec[0].replace(/\.glb$/,'');assert(Object.hasOwn(ratios,key),`Footprint-Referenz fehlt: ${key}`);near(planned.get(key).r,spec[1]*ratios[key]+.25);}
 });
 test('Alle Kreise halten Feld-, Kanten-, Bauplatz- und Altgewässerabstand',()=>assert.deepEqual(result.clearance.violations,[]));
 test('Pad-Zentren stimmen mit Bauplätzen überein; Radius = Modellradius + 4.5',()=>sites.forEach((s,i)=>{const p=planned.pads[i];near(p.x,s.x);near(p.z,s.z);near(p.radius,s.r+4.5);}));
 test('Planer bleibt deterministisch, ohne RNG oder Eingabemutation',()=>{
  const expected=digest({sites:planned.sites,pads:planned.pads});
  for(const seed of [0,1,7,42,12345,0xffffffff]){let state=seed,calls=0;math.random=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};const again=c.LPWorldSites(options);assert.equal(digest({sites:again.sites,pads:again.pads}),expected);assert.equal(calls,0);assert.equal(JSON.stringify(options),before);}
  math.random=()=>{rngCalls++;throw Error('Math.random im Terrain');};result.determinism={runs:6,inputUnchanged:true,rngCalls:0};
 });
 test('Tatsächlicher HTML-Aufruf übergibt dieselben Register samt Gabelungen',()=>{
  vm.runInContext(section('var lpSites=','var lpLandscapeAnchors='),c);
  assert.equal(digest({sites:c.lpSites.sites,pads:c.lpSites.pads}),digest({sites:planned.sites,pads:planned.pads}));
 });
 // Die echten zusätzlichen Teiche werden nach der Bauplatzplanung angelegt.
 c.lpSites=planned;
 vm.runInContext(section('var lpLandscapeAnchors=','function sceneryModel'),c);
 vm.runInContext(section('[0,2,4,6].forEach(function(ci)','var _lpTerrain='),c);
 result.basins=clone(c.lpBasins);
 test('Neue Teiche lassen alle geplanten Modellkreise frei',()=>{
  for(const s of sites)for(const b of c.lpBasins)assert(Math.hypot(s.x-b.x,s.z-b.z)>=s.r+Math.max(b.rx,b.rz),`${s.key} im Teich`);
 });
 const terrainOptions=freeze(clone({pathPoints:options.points,chapters:c.CHAPTERS,basins:c.lpBasins,pads:planned.pads})),terrainBefore=JSON.stringify(terrainOptions);
 test('Tatsächlicher Terrain-Aufruf übergibt alle Pads und neuen Teiche',()=>{
  const factory=c.LPLandscapeTerrain;let captured;
  c.LPLandscapeTerrain=(three,input)=>{assert.strictEqual(three,T);captured=input;return null;};
  try{vm.runInContext(section('var _lpTerrain=','function hsh'),c);}finally{c.LPLandscapeTerrain=factory;}
  assert.deepEqual(clone(captured),clone(terrainOptions));
 });
 terrain=c.LPLandscapeTerrain(T,terrainOptions);
 const mesh=new T.Mesh(terrain.geometry,terrain.material);mesh.updateMatrixWorld(true);const ray=new T.Raycaster();
 let siteSamples=0,nodeSamples=0,maxAnalyticError=0,maxMeshError=0,maxSurfaceMismatch=0;
 function sample(x,z,label){
  const h=terrain.heightAt(x,z)-.35;maxAnalyticError=Math.max(maxAnalyticError,Math.abs(h+.02));near(h,-.02,1e-7,label+' analytisch');
  ray.set(new T.Vector3(x,50,z),new T.Vector3(0,-1,0));const hits=ray.intersectObject(mesh);assert(hits.length,`${label}: kein Terrain-Treffer`);
  const y=hits[0].point.y;maxMeshError=Math.max(maxMeshError,Math.abs(y+.02));near(y,-.02,meshFlatTolerance,label+' Mesh');
  const surface=terrain.surfaceHeightAt(x,z)-.35;maxSurfaceMismatch=Math.max(maxSurfaceMismatch,Math.abs(surface-y));near(surface,y,1e-5,label+' surfaceHeightAt');
 }
 test('160 Bauplatzproben: Mittelpunkt + vier Randpunkte sind flach auf -.02',()=>{
  const errors=[];for(const s of sites)for(const [dx,dz] of [[0,0],[s.r,0],[-s.r,0],[0,s.r],[0,-s.r]]){try{sample(s.x+dx,s.z+dz,s.key);}catch(e){errors.push(e.message);}siteSamples++;}
  assert.equal(siteSamples,160);assert.deepEqual(errors,[]);
 });
 test('Alle 175 Feldbasen bleiben frei; fünf Proben je realem Sockelfuß',()=>{
  for(let i=0;i<options.points.length;i++){const p=options.points[i],r=i>=144?1.7:i===0||i%18===17?2.55:1.85;
   for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){sample(p.x+dx,p.z+dz,`Feld ${i}`);nodeSamples++;}
  }
  assert.equal(nodeSamples,875);
 });
 test('Terrain mit Pads ist reproduzierbar und verändert keine Eingaben/RNG',()=>{
  const again=c.LPLandscapeTerrain(T,terrainOptions);try{
   for(const key of Object.keys(terrain.geometry.attributes))assert.deepEqual(terrain.geometry.attributes[key].array,again.geometry.attributes[key].array);
   assert.deepEqual(terrain.geometry.index.array,again.geometry.index.array);assert.equal(JSON.stringify(terrainOptions),terrainBefore);assert.equal(rngCalls,0);
  }finally{again.dispose();}
 });
 test('Messgerät erkennt Requisiten auf Zweig 162 und kollidierende Bauplätze',()=>{
  const bad=clone(sites),p=options.points[162];bad[0].x=p.x;bad[0].z=p.z;
  assert(constraints(bad,options.points,options.edges,options.basins).violations.some(v=>v.startsWith('Feld 162:')));
  bad[1].x=bad[0].x;bad[1].z=bad[0].z;assert(constraints(bad,options.points,options.edges,options.basins).violations.some(v=>v.startsWith('Bauplätze')));
  const noPads=c.LPLandscapeTerrain(T,{pathPoints:options.points,chapters:c.CHAPTERS,basins:c.lpBasins});try{
   const changed=sites.some(s=>[[0,0],[s.r,0],[-s.r,0],[0,s.r],[0,-s.r]].some(([dx,dz])=>Math.abs(noPads.heightAt(s.x+dx,s.z+dz)-.33)>.001));
   assert(changed,'Pad-Fixture prüft nur ohnehin flachen Pfad; kein Wirkungsnachweis');
  }finally{noPads.dispose();}
 });
 result.terrain={siteSamples,nodeSamples,basins:c.lpBasins.length,meshFlatTolerance,maxAnalyticError,maxMeshError,maxSurfaceMismatch};
}catch(e){result.failures.push({name:'Fixture/Builder laden',error:e.stack});}
finally{if(terrain)terrain.dispose();}
result.pass=result.failures.length===0;
if(process.env.LP_REPORT){const file=path.resolve(process.env.LP_REPORT);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({pass:result.pass,checks:result.checks.length,failures:result.failures,sites:result.sites&&result.sites.length,clearance:result.clearance,terrain:result.terrain,determinism:result.determinism},null,2));
process.exitCode=result.pass?0:1;
