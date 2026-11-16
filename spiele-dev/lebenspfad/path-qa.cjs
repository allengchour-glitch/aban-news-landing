/* Echte r128-Geometrie + unveränderte HTML-Builder, ohne Browser/GPU.
   node spiele-dev/lebenspfad/path-qa.cjs
   LP_HTML=/pfad/vorher.html LP_REPORT=/pfad/geometry.json node ...
   Ein LP_HTML-Lauf wird als eigener Befund im selben Bericht aufbewahrt. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const htmlPath=path.resolve(process.env.LP_HTML||path.join(root,'lebenspfad.html'));
const reportPath=path.resolve(process.env.LP_REPORT||'/tmp/lebenspfad-pfad-geometry.json');
const T=require(path.join(root,'js/vendor/three.min.js'));
const html=fs.readFileSync(htmlPath,'utf8');
const moduleSource=fs.readFileSync(path.join(root,'js/lebenspfad/route-layout.js'),'utf8');
const result={source:htmlPath,threeRevision:T.REVISION,checks:[],failures:[],scope:'GEMESSEN: echte HTML-Pfad-/Feld-Builder, calcNext und routeFrac; keine Browser-/Shader-Prüfung'};
function check(name,fn){try{fn();result.checks.push(name);}catch(e){result.failures.push({name,error:e.message});}}
function extract(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert(a>=0&&b>a,`HTML-Anker fehlt: ${start} / ${end}`);return html.slice(a,b);}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function load(seed){
 const math=Object.create(Math);math.random=seeded(seed);
 const ctx={THREE:T,Math:math,scene:new T.Scene(),mat:(color,emissive=0,intensity=0)=>new T.MeshStandardMaterial({color,emissive,emissiveIntensity:intensity}),
  document:{createElement(tag){assert.equal(tag,'canvas');return {getContext(){return new Proxy({},{get:()=>()=>{}});}};}},crispTex:()=>new T.Texture(),console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(moduleSource,ctx);
 vm.runInContext(extract('var CHAPTERS=','function chapterOf'),ctx);
 vm.runInContext(extract('var FTYPE_COL=','/* Nur fertig aufgebaute'),ctx);
 vm.runInContext(extract('var SHORT_CHAPS=','var pawns='),ctx);
 vm.runInContext(extract('function calcNext()','function showForkUI'),ctx);
 ctx.announce=()=>{};ctx.beep=()=>{};ctx.showForkUI=()=>{};
 return ctx;
}
function edgesOf(c){return c.fields.flatMap((f,i)=>i===143?[]:f.fork?[{a:i,b:f.fork.a},{a:i,b:f.fork.b}]:[{a:i,b:f.nxt===undefined?i+1:f.nxt}]);}
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function intersects(a,b,c,d){
 const orient=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
 if(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0)return true;
 return Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b))<1e-7;
}
function geometry(c){
 c.scene.updateMatrixWorld(true);
 const nodes=c.fields.map((f,id)=>{
  // Sockel anhand des echten Meshes identifizieren, nicht anhand von f.rsock.
  const sock=f.vparts.find(m=>m!==f.disc&&m.geometry.type==='CylinderGeometry');
  assert(sock,`Sockel fehlt: ${id}`);const p=sock.geometry.parameters,d=f.disc.geometry.parameters;
  const center=sock.getWorldPosition(new T.Vector3()),scale=sock.getWorldScale(new T.Vector3()),dc=f.disc.getWorldPosition(new T.Vector3()),ds=f.disc.getWorldScale(new T.Vector3());
  assert(Math.hypot(center.x-f.x,center.z-f.z)<1e-7,`Sockel und Graphposition verschieden: ${id}`);
  assert(Math.hypot(dc.x-center.x,dc.z-center.z)<1e-7,`Deckel neben Sockel: ${id}`);
  return {id,x:center.x,z:center.z,r:Math.max(p.radiusTop,p.radiusBottom)*Math.max(Math.abs(scale.x),Math.abs(scale.z)),discRadius:d.radiusTop*Math.max(Math.abs(ds.x),Math.abs(ds.z)),top:dc.y+d.height*Math.abs(ds.y)/2,rsock:f.rsock};
 });
 const edges=edgesOf(c),overlaps=[],crossings=[],throughFields=[],steps=[];let minGap=Infinity;
 for(let i=0;i<nodes.length;i++)for(let j=0;j<i;j++){
  const a=nodes[i],b=nodes[j],gap=Math.hypot(a.x-b.x,a.z-b.z)-a.r-b.r;minGap=Math.min(minGap,gap);if(gap< -1e-7)overlaps.push({a:i,b:j,gap});
 }
 for(let i=0;i<edges.length;i++){
  const e=edges[i],a=nodes[e.a],b=nodes[e.b];steps.push(Math.hypot(a.x-b.x,a.z-b.z));
  for(let j=0;j<i;j++){const f=edges[j];if([e.a,e.b].some(v=>v===f.a||v===f.b))continue;if(intersects(a,b,nodes[f.a],nodes[f.b]))crossings.push([e,f]);}
  for(const n of nodes)if(n.id!==e.a&&n.id!==e.b&&segmentDistance(n,a,b)<n.r-1e-7)throughFields.push({edge:e,field:n.id});
 }
 return {nodes,edges,overlaps,crossings,throughFields,minGap,minStep:Math.min(...steps),maxStep:Math.max(...steps)};
}
function signature(c){return {chapters:c.CHAPTERS,forks:c.FORKS.map(({pts,...fk})=>fk),shortChaps:c.SHORT_CHAPS,shortJump:c.SHORT_JUMP,
 fields:c.fields.map((f,id)=>({id,type:f.type,nxt:f.nxt,fork:f.fork,mchap:f.mchap,prog:f.prog}))};}
function graphChecks(c){
 const edges=edgesOf(c),adj=c.fields.map(()=>[]),seen=new Set(),active=new Set();edges.forEach(e=>{assert(c.fields[e.b],`Ungültiges Ziel ${e.b}`);adj[e.a].push(e.b);});
 function visit(i){assert(!active.has(i),`Zyklus bei ${i}`);if(seen.has(i))return;active.add(i);adj[i].forEach(visit);active.delete(i);seen.add(i);}
 visit(0);assert.equal(seen.size,175);assert.equal(edges.length,178);assert.equal(c.FORKS.length,4);assert.equal(adj[143].length,0);
 adj.forEach((next,id)=>assert(id===143||next.length>0,`Sackgasse bei ${id}`));
 c.FORKS.forEach(fk=>{let i=c.fields[fk.at].fork.b;const ids=[];for(let j=0;j<fk.types.length;j++){ids.push(i);assert.equal(c.fields[i].type,fk.types[j]);i=c.fields[i].nxt;}assert.equal(i,fk.rejoin);assert.equal(ids.length,fk.pts.length);});
 const routes=[];
 for(const mode of ['voll','kurz'])for(let mask=0;mask<16;mask++){
  c.G={mode,turn:0,phase:'moving',players:[{tile:0}]};c.forkSel=null;let i=0;const ids=[0],jumps=[];let frac=c.routeFrac(i);
  while(i!==143){
   assert(ids.length<176,'Route endet nicht');const f=c.fields[i];
   if(f.fork){c.forkSel=null;assert.equal(c.calcNext(),-1);assert.equal(c.G.phase,'fork');const k=c.FORKS.findIndex(fk=>fk.at===i);c.forkSel=(mask>>k)&1?f.fork.b:f.fork.a;}
   const next=c.calcNext();assert.equal(c.forkSel,null);assert(!ids.includes(next),'Route enthält Zyklus');
   const nf=c.routeFrac(next);assert(nf>frac&&nf<=1,`Fortschritt ${mode}: ${i}→${next}: ${frac}→${nf}`);
   if((i===35&&next===72)||(i===89&&next===126))jumps.push(`${i}→${next}`);
   else assert(adj[i].includes(next),`Unerwarteter Sprung ${i}→${next}`);
   i=next;c.G.players[0].tile=i;ids.push(i);frac=nf;
  }
  assert.equal(frac,1);assert.deepEqual(jumps,mode==='kurz'?['35→72','89→126']:[]);
  routes.push({mode,mask,steps:ids.length-1,jumps});
 }
 result.routes=routes;
}
function purity(c){
 const forkData=JSON.parse(JSON.stringify(c.FORKS.map(({pts,...f})=>f))),snap=JSON.stringify(forkData),options=freeze({chapters:8,perChapter:18});freeze(forkData);
 let previous;const seeds=[0,1,7,42,12345,0xffffffff];
 for(const seed of seeds){
  let calls=0;const math=Object.create(Math);math.random=()=>{calls++;return seeded(seed)();};
  const ctx={THREE:T,Math:math,srand:()=>{throw Error('srand aufgerufen');}};ctx.window=ctx;
  for(const key of ['NET','G'])Object.defineProperty(ctx,key,{get(){throw Error(`${key} gelesen`);},set(){throw Error(`${key} geändert`);},enumerable:true});
  vm.createContext(ctx);const keys=Object.keys(ctx);vm.runInContext(moduleSource,ctx);const layout=ctx.LPRouteLayout(T,options);
  forkData.forEach(f=>layout.addFork(f));const fingerprint=JSON.stringify({points:layout.allPoints,edges:layout.edges,measure:layout.measure()});
  if(previous)assert.equal(fingerprint,previous,`Geometrie von Seed ${seed} abhängig`);previous=fingerprint;
  assert.equal(calls,0,'Math.random im Routenmodul');assert.equal(JSON.stringify(forkData),snap);assert.deepEqual(Object.keys(ctx).sort(),[...keys,'LPRouteLayout'].sort());
 }
 result.determinism={seeds,rngCalls:0,inputUnchanged:true};
}
try{
 const c=load(42),g=geometry(c);
 result.geometry={nodeCount:g.nodes.length,edgeCount:g.edges.length,minGap:g.minGap,minStep:g.minStep,maxStep:g.maxStep,overlapCount:g.overlaps.length,crossingCount:g.crossings.length,throughFieldCount:g.throughFields.length,
  overlaps:g.overlaps.slice(0,20),crossings:g.crossings.slice(0,20),throughFields:g.throughFields.slice(0,20),bounds:{minX:Math.min(...g.nodes.map(n=>n.x-n.r)),maxX:Math.max(...g.nodes.map(n=>n.x+n.r)),minZ:Math.min(...g.nodes.map(n=>n.z-n.r)),maxZ:Math.max(...g.nodes.map(n=>n.z+n.r))},nodes:g.nodes,edges:g.edges};
 result.logicalHash=hash(signature(c));
 check('THREE r128',()=>assert.equal(T.REVISION,'128'));
 // SHA-256 der logischen Daten aus lp-pfad-vorher.html; ohne Feldkoordinaten oder Meshes.
 check('Feld-IDs, Typen, Graph und Kurzmodus entsprechen Vorher',()=>assert.equal(result.logicalHash,'e56bbfc4e725a4439af4e41ce46b262a005576a1d5e556e8b0fb4b807f0d0152'));
 check('Keine Sockelüberlappung in echter Mesh-Geometrie',()=>assert.equal(g.overlaps.length,0,JSON.stringify(g.overlaps.slice(0,4))));
 check('Keine ungewollten Kantenkreuzungen einschließlich Berührung',()=>assert.equal(g.crossings.length,0));
 check('Keine Verbindung durch fremde Sockel',()=>assert.equal(g.throughFields.length,0));
 check('Jeder normale Graphschritt unter 12',()=>{assert(g.minStep>0);assert(g.maxStep<12,`Längster Schritt: ${g.maxStep}`);});
 check('Alle Sockel vollständig innerhalb Terrain',()=>{for(const n of g.nodes)assert(n.x-n.r>=-260&&n.x+n.r<=300&&n.z-n.r>=-110&&n.z+n.r<=110,`Terrain verlassen: ${n.id}`);});
 check('Reale Sockel, Deckel und Standhöhen passen zu Layout',()=>g.nodes.forEach(n=>{assert(Math.abs(n.r-n.rsock)<1e-7);assert(Math.abs(n.r-(n.id>=144?1.7:c.fields[n.id].type==='m'?2.55:1.85))<1e-7);assert(Math.abs(n.discRadius-(n.id>=144?1.4:c.fields[n.id].type==='m'?2.2:1.5))<1e-7);assert(Math.abs(n.top-.41)<1e-7);}));
 check('DAG, vier Wiedereinstiege, alle 16 Entscheidungen in beiden Modi',()=>graphChecks(c));
 check('HTML nutzt Routenmodul mit denselben IDs und Kanten',()=>{assert(c.lpRoute,'HTML nutzt noch alten Pfad');const include=html.search(/<script\b[^>]*src=["'][^"']*\/route-layout\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/);assert(include>=0&&include<html.indexOf('var CHAPTERS='),'Routenmodul nicht vor Builder eingebunden');assert.equal(c.lpRoute.points.length,144);assert.equal(c.lpRoute.allPoints.length,g.nodes.length);g.nodes.forEach(n=>{const p=c.lpRoute.allPoints[n.id];assert.equal(p.x,n.x);assert.equal(p.z,n.z);});const ids=es=>es.map(e=>`${e.a}:${e.b}`).sort();assert.deepEqual(ids(c.lpRoute.edges),ids(g.edges));const m=c.lpRoute.measure();assert(Math.abs(m.minGap-g.minGap)<1e-7);assert.equal(m.overlaps,g.overlaps.length);});
 check('Deterministisch, ohne RNG, Netz-/Spielzustand oder Eingabemutation',()=>purity(c));
 check('Feldgeometrie identisch bei fünf weiteren Dekorations-Seeds',()=>{for(const seed of [0,1,7,12345,0xffffffff]){const other=load(seed);assert.equal(hash(geometry(other)),hash(g));assert.equal(hash(signature(other)),result.logicalHash);}});
 check('Messgerät erkennt übergroße echte Sockel und Kreuzungs-Sonderfälle',()=>{
  const p=c.fields[0].vparts[0].geometry.parameters,old=p.radiusBottom;p.radiusBottom=100;try{assert(geometry(c).overlaps.length>g.overlaps.length);}finally{p.radiusBottom=old;}
  const pt=(x,z)=>({x,z});assert(intersects(pt(0,0),pt(2,2),pt(0,2),pt(2,0)));assert(intersects(pt(0,0),pt(2,0),pt(1,0),pt(3,0)));assert(!intersects(pt(0,0),pt(1,0),pt(2,0),pt(3,0)));
 });
}catch(e){result.failures.push({name:'Builder laden',error:e.stack});}
result.pass=result.failures.length===0;
let report={};if(fs.existsSync(reportPath)){try{report=JSON.parse(fs.readFileSync(reportPath,'utf8'));}catch{}}
if(process.env.LP_HTML){report.fixtures=report.fixtures||{};report.fixtures[htmlPath]=result;}else report.current=result;
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,checks:result.checks.length,failures:result.failures,geometry:result.geometry&&{nodes:result.geometry.nodeCount,edges:result.geometry.edgeCount,overlaps:result.geometry.overlapCount,crossings:result.geometry.crossingCount,minGap:result.geometry.minGap,minStep:result.geometry.minStep,maxStep:result.geometry.maxStep},logicalHash:result.logicalHash,report:reportPath},null,2));
process.exitCode=result.pass?0:1;
