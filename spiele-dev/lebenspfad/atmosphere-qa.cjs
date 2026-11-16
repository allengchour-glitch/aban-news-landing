/* Echte THREE r128-Geometrie, Kapitelübergänge, Bauplätze und Modellgrenzen. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'js/vendor/three.min.js'));
const c={THREE:T};c.window=c;vm.createContext(c);
for(const name of ['route-layout','world-sites','terrain','atmosphere'])vm.runInContext(fs.readFileSync(path.join(root,`js/lebenspfad/${name}.js`),'utf8'),c);
const html=fs.readFileSync(path.join(root,'lebenspfad.html'),'utf8');
function section(a,b){const start=html.indexOf(a),end=html.indexOf(b,start+a.length);assert(start>=0&&end>start);return html.slice(start,end);}
vm.runInContext(section('var CHAPTERS=','function chapterOf'),c);
vm.runInContext(section('var lpBasins=','function sceneryModel'),c);
const oldSites=JSON.stringify(c.lpSites.sites),oldPoints=JSON.stringify(c.pathPts),oldEdges=JSON.stringify(c.lpRoute.edges);
vm.runInContext(section('var lpArtLandmarks=','[0,2,4,6].forEach'),c);
vm.runInContext(section('[0,2,4,6].forEach','var _lpTerrain='),c);
const report={kind:'GEMESSEN: Geometrie/Palette/Bauplätze, keine Browser-Kampagne',checks:[],sites:c.lpSites.sites.filter(s=>s.key.startsWith('own:'))};
function test(name,fn){fn();report.checks.push(name);console.log('ok',name);}
function near(a,b,tol=1e-6){assert(Math.abs(a-b)<tol,`${a} / ${b}`);}
function distance(p,a,b){const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1)));return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);}
function fixture(){const scene=new T.Scene(),sun=new T.DirectionalLight(),hemi=new T.HemisphereLight(),camera=new T.PerspectiveCamera();scene.add(sun,hemi);const a=c.LPAtmosphere(T,{scene,sun,hemi});return {a,scene,sun,hemi,camera};}
test('175 Knoten/178 Kanten und alle32 alten Bauplätze bytegleich',()=>{
 assert.equal(c.pathPts.length,175);assert.equal(c.lpRoute.edges.length,178);assert.equal(JSON.stringify(c.pathPts),oldPoints);assert.equal(JSON.stringify(c.lpRoute.edges),oldEdges);
 assert.equal(JSON.stringify(c.lpSites.sites.slice(0,32)),oldSites);assert.equal(c.lpSites.stats.sites,35);assert.equal(c.lpSites.pads.length,35);
 assert.throws(()=>c.lpSites.plan('house',0,1,2,3),/belegt/);assert.throws(()=>c.lpSites.plan('invalid',-1,0,0,3),/Ungültig/);
});
test('Drei Kunstplätze halten alle Felder, Verbindungen, Bauwerke und Gewässer frei',()=>{
 assert.equal(report.sites.length,3);
 for(const s of report.sites){
  assert(s.x-s.r>=-260&&s.x+s.r<=300&&Math.abs(s.z)+s.r<=110);
  for(const p of c.pathPts)assert(Math.hypot(s.x-p.x,s.z-p.z)>=s.r+3.2);
  for(const e of c.lpRoute.edges)assert(distance(s,c.pathPts[e.a],c.pathPts[e.b])>=s.r+1.15);
  for(const p of c.lpSites.sites)if(p!==s)assert(Math.hypot(s.x-p.x,s.z-p.z)>=s.r+p.r+1.3);
  for(const b of c.lpBasins)assert(Math.hypot(s.x-b.x,s.z-b.z)>s.r+Math.max(b.rx,b.rz));
 }
});
test('Zusätzliche Plätze entstehen deterministisch ohne Spielzufall',()=>{
 const math=Object.create(Math);math.random=()=>{throw Error('Direkter Math.random-Aufruf');};c.Math=math;c.srand=()=>{throw Error('Spielzufall');};
 const planned=c.LPWorldSites({points:c.pathPts,edges:c.lpRoute.edges,buildings:c.lpBuildings,props:c.lpProps,basins:c.lpBasins.slice(0,2),forks:c.FORKS});
 for(const s of c.lpArtLandmarks){const p=planned.plan(s.key,s.tile,s.dx,s.dz,s.r);assert.equal(JSON.stringify(p),JSON.stringify(c.lpSites.get(s.key)));}
});
test('Reales Terrain unter allen Kunstplätzen bleibt eben und unter den Füßen',()=>{
 const terrain=c.LPLandscapeTerrain(T,{pathPoints:c.pathPts,chapters:c.CHAPTERS,basins:c.lpBasins,pads:c.lpSites.pads});
 const mesh=new T.Mesh(terrain.geometry,terrain.material);mesh.updateMatrixWorld();const ray=new T.Raycaster();
 for(const s of report.sites)for(let i=0;i<24;i++){const a=i*Math.PI/12,x=s.x+Math.cos(a)*s.r,z=s.z+Math.sin(a)*s.r;
  ray.set(new T.Vector3(x,40,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert(hit);near(hit.point.y,-.02,.0002);
 }
 terrain.geometry.dispose();terrain.material.dispose();
});
test('Berge hinter dem Gelände,576 Dreiecke,0 Zusatzlichter/Texturen/Schattenwerfer',()=>{
 const {a,scene}=fixture();const ridges=a.group.children.filter(o=>o.name.startsWith('lp-ridge'));assert.equal(ridges.length,2);
 assert.equal(ridges.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),576);
 for(const m of ridges){assert(m.geometry.boundingBox.max.z<-110);assert.equal(m.castShadow,false);assert.equal(m.receiveShadow,false);assert.equal(m.material.transparent,false);
  for(const attr of Object.values(m.geometry.attributes))assert(attr.array.every(Number.isFinite));}
 assert.equal(a.group.children.filter(o=>o.isLight).length,0);assert.equal(a.group.children.filter(o=>o.material.map).length,0);
 const seen=new Set();let frees=0;a.group.traverse(o=>{for(const r of [o.geometry,o.material])if(r&&!seen.has(r)){seen.add(r);r.addEventListener('dispose',()=>frees++);}});
 a.dispose();a.dispose();assert.equal(frees,seen.size);assert(!scene.children.includes(a.group));
});
test('Acht Paletten: Himmel/Nebel in derselben r128-Ausgabefarbe, positive Lichter',()=>{
 const f=fixture();for(let ch=0;ch<8;ch++){f.a.setChapter(ch);f.a.update(0,f.camera,{x:0,z:0},true);
  const sky=f.a.group.children.find(o=>o.name==='lp-sky'),expected=sky.material.uniforms.horizon.value.clone().convertLinearToSRGB();
  near(expected.r,f.scene.fog.color.r);near(expected.g,f.scene.fog.color.g);near(expected.b,f.scene.fog.color.b);
  assert.equal(sky.material.toneMapped,false);assert(f.sun.intensity>=.9&&f.sun.intensity<=1);assert(f.scene.fog.near>=50);
  assert.equal(f.a.read().chapter,ch);}
 f.a.dispose();
});
test('Kapitelübergang zeitstabil bei30/60Hz;0dt still; Sonne folgt nur dem Fokus',()=>{
 const a=fixture(),b=fixture();for(const f of [a,b]){f.a.update(0,f.camera,{x:0,z:0},true);f.a.setChapter(7);}
 const before=JSON.stringify(a.a.read());a.a.update(0,a.camera,{x:10,z:20});assert.equal(JSON.stringify(a.a.read()),before);
 for(let i=0;i<60;i++)a.a.update(1/30,a.camera,{x:10,z:20});for(let i=0;i<120;i++)b.a.update(1/60,b.camera,{x:10,z:20});
 a.a.read().horizon.forEach((v,i)=>near(v,b.a.read().horizon[i]));near(a.sun.position.x,-32);near(a.sun.position.z,58);
 a.a.dispose();b.a.dispose();
});
test('Modell-Bounds: Füße auf Boden, konservativer Radius, Übergröße wird abgelehnt',()=>{
 const site=report.sites[0],model=new T.Mesh(new T.BoxGeometry(5.4,4,1.5),new T.MeshStandardMaterial());model.position.set(2,6,-3);
 const placed=c.LPAtmosphere.placeLandmark(T,model,site,-.02,.75);placed.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(placed);near(bounds.min.y,-.02);
 assert(placed.userData.lpArt.radius<site.r);assert.equal(placed.userData.lpSiteKey,site.key);
 const giant=new T.Mesh(new T.BoxGeometry(50,5,50),new T.MeshStandardMaterial());assert.throws(()=>c.LPAtmosphere.placeLandmark(T,giant,site,0,0),/größer/);
});
report.passed=true;
if(process.env.LP_REPORT)fs.writeFileSync(process.env.LP_REPORT,JSON.stringify(report,null,2));
console.log(`${report.checks.length} Prüfgruppen grün`);
