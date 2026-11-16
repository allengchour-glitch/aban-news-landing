/* Traumstadt: Bauplan, Strassengraph und sparsame Grossstadt-Geometrie. */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Traumstadt=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var bounds={x0:-400,x1:900,z0:-700,z1:620};
function dist(a,b){return Math.hypot(b[0]-a[0],b[1]-a[1]);}
function projekt(p,a,b){var dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0;return {p:[a[0]+dx*t,a[1]+dz*t],t:t,d:Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t)};}
function plan(){
  var roads=[{a:[80,236],b:[80,246],w:9},{a:[420,-140],b:[560,-140],w:12},{a:[560,-140],b:[560,320],w:12},{a:[560,320],b:[780,320],w:12},{a:[780,320],b:[780,340],w:12}],buildings=[];
  [560,640,720,800].forEach(function(x){roads.push({a:[x,0],b:[x,240],w:12});});
  [0,80,160,240].forEach(function(z){roads.push({a:[560,z],b:[800,z],w:12});});
  var seed=101;
  for(var ix=0;ix<3;ix++)for(var iz=0;iz<3;iz++){
    if(ix===1&&iz===1)continue;
    [[20,20],[40,20],[60,20],[20,40],[60,40],[20,60],[40,60],[60,60]].forEach(function(p){var n=seed++,floors=4+n%9;
      buildings.push({x:560+ix*80+p[0],z:iz*80+p[1],w:14+n%3,d:13+n%3,h:3+floors*2.8,floors:floors,seed:n});});
  }
  var track=[];[[770,370,-90],[770,450,0],[610,450,90],[610,370,180]].forEach(function(c){for(var i=0;i<=8;i++){var a=(c[2]+i*90/8)*Math.PI/180;track.push([c[0]+Math.cos(a)*30,c[1]+Math.sin(a)*30]);}});
  return {roads:roads,buildings:buildings,track:track,pit:[770,320],grid:[752,340],forum:[680,120]};
}
function path(points,closed){var p=points.map(function(a){return a.slice();});if(closed&&dist(p[0],p[p.length-1])>.01)p.push(p[0].slice());var lengths=[0];for(var i=1;i<p.length;i++)lengths.push(lengths[i-1]+dist(p[i-1],p[i]));return {points:p,lengths:lengths,length:lengths[lengths.length-1]};}
function punkt(p,d){d=Math.max(0,Math.min(p.length,d));for(var i=1;i<p.points.length;i++)if(d<=p.lengths[i]||i===p.points.length-1){var a=p.points[i-1],b=p.points[i],t=(d-p.lengths[i-1])/(p.lengths[i]-p.lengths[i-1]||1);return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])};}return {x:p.points[0][0],z:p.points[0][1],yaw:0};}
function sample(p,d){var q=punkt(p,d),a=punkt(p,d-3),b=punkt(p,d+3);if(Math.hypot(b.x-a.x,b.z-a.z)>.01)q.yaw=Math.atan2(b.x-a.x,b.z-a.z);return q;}
function abstand(p,points,closed){var best=Infinity;for(var i=0;i<points.length-(closed?0:1);i++)best=Math.min(best,projekt(p,points[i],points[(i+1)%points.length]).d);return best;}
/* Geraden werden an echten Kreuzungen UND Haltepunkten geteilt. Kein Bus faehrt querfeldein. */
function graph(segments,stops){
  var S=segments.filter(function(s){return dist(s.a,s.b)>.1;}).map(function(s){return {a:s.a,b:s.b,ts:[0,1]};}),nodes=[],byKey={},adj=[];
  function node(p){var k=p[0].toFixed(3)+'_'+p[1].toFixed(3);if(byKey[k]!==undefined)return byKey[k];var n=nodes.length;nodes.push(p);adj.push([]);byKey[k]=n;return n;}
  function edge(a,b){if(a===b)return;var d=dist(nodes[a],nodes[b]);if(d<.001)return;adj[a].push([b,d]);adj[b].push([a,d]);}
  for(var i=0;i<S.length;i++)for(var j=0;j<i;j++){
    var a=S[i],b=S[j];
    [a.a,a.b].forEach(function(p){var q=projekt(p,b.a,b.b);if(q.d<3.8)b.ts.push(q.t);});
    [b.a,b.b].forEach(function(p){var q=projekt(p,a.a,a.b);if(q.d<3.8)a.ts.push(q.t);});
    var ux=a.b[0]-a.a[0],uz=a.b[1]-a.a[1],vx=b.b[0]-b.a[0],vz=b.b[1]-b.a[1],den=ux*vz-uz*vx;
    if(Math.abs(den)<1e-8){[a.a,a.b].forEach(function(p){var q=projekt(p,b.a,b.b);if(q.d<.05)b.ts.push(q.t);});[b.a,b.b].forEach(function(p){var q=projekt(p,a.a,a.b);if(q.d<.05)a.ts.push(q.t);});continue;}
    var dx=b.a[0]-a.a[0],dz=b.a[1]-a.a[1],t=(dx*vz-dz*vx)/den,u=(dx*uz-dz*ux)/den;
    if(t>=-1e-7&&t<=1+1e-7&&u>=-1e-7&&u<=1+1e-7){a.ts.push(Math.max(0,Math.min(1,t)));b.ts.push(Math.max(0,Math.min(1,u)));}
  }
  var projected=stops.map(function(st){var best=null;S.forEach(function(s,i){var q=projekt(st.p,s.a,s.b);if(!best||q.d<best.d)best={s:i,t:q.t,p:q.p,d:q.d};});if(!best)return null;S[best.s].ts.push(best.t);return best;});
  S.forEach(function(s){s.ts.sort(function(a,b){return a-b;});var prev=null;s.ts.forEach(function(t){var p=[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],n=node(p);if(prev!==null)edge(prev,n);prev=n;});});
  /* Fahrbahn-Baender beruehren sich gelegentlich mit weniger als einer Rasterzelle Abstand. */
  var buckets={};nodes.forEach(function(p,i){var gx=Math.floor(p[0]/4),gz=Math.floor(p[1]/4);for(var dx=-1;dx<=1;dx++)for(var dz=-1;dz<=1;dz++)(buckets[(gx+dx)+'_'+(gz+dz)]||[]).forEach(function(j){if(dist(p,nodes[j])<3.8)edge(i,j);});(buckets[gx+'_'+gz]||(buckets[gx+'_'+gz]=[])).push(i);});
  return {nodes:nodes,adj:adj,stops:projected.map(function(q,i){return q?{name:stops[i].name,p:q.p,node:node(q.p),segment:S[q.s],versatz:q.d}:null;})};
}
function route(g,start,end){
  if(start===end)return [g.nodes[start].slice()];var D=new Float64Array(g.nodes.length),prev=new Int32Array(g.nodes.length),done=new Uint8Array(g.nodes.length);D.fill(Infinity);prev.fill(-1);D[start]=0;
  for(var n=0;n<g.nodes.length;n++){var best=-1;for(var i=0;i<D.length;i++)if(!done[i]&&(best<0||D[i]<D[best]))best=i;if(best<0||!isFinite(D[best]))break;if(best===end)break;done[best]=1;g.adj[best].forEach(function(e){var d=D[best]+e[1];if(d<D[e[0]]){D[e[0]]=d;prev[e[0]]=best;}});}
  if(!isFinite(D[end]))return null;var a=[],k=end;while(k!==-1){a.push(g.nodes[k].slice());if(k===start)break;k=prev[k];}return a.reverse();
}
function fahrplan(g,ids,speed,dwell){var parts=[],duration=0;for(var i=0;i<ids.length;i++){var a=ids[i],b=ids[(i+1)%ids.length],r=route(g,g.stops[a].node,g.stops[b].node);if(!r)return null;var p=path(r,false);parts.push({stop:a,next:b,start:duration,depart:duration+dwell,end:duration+dwell+p.length/speed,path:p});duration+=dwell+p.length/speed;}return {parts:parts,duration:duration,speed:speed,dwell:dwell};}
function fahrzeugStand(f,zeit){var t=((zeit%f.duration)+f.duration)%f.duration;for(var i=0;i<f.parts.length;i++){var a=f.parts[i];if(t<a.end||i===f.parts.length-1){var halt=t<a.depart,p=sample(a.path,halt?0:(t-a.depart)*f.speed);return {x:p.x,z:p.z,yaw:p.yaw,halt:halt,stop:a.stop,next:a.next,rest:Math.max(0,(halt?a.depart:a.end)-t),teil:i};}}}
function cameraClip(buildings,a,b){
  if(Math.max(a.x,b.x)<540||Math.min(a.x,b.x)>820||Math.max(a.z,b.z)<-20||Math.min(a.z,b.z)>260)return 1;
  var dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz)||1,best=1;
  buildings.forEach(function(h){var lo=[h.x-h.w/2-.4,-.2,h.z-h.d/2-.4],hi=[h.x+h.w/2+.4,h.h+.5,h.z+h.d/2+.4],p=[a.x,a.y,a.z],d=[dx,dy,dz],t0=0,t1=1;
    for(var i=0;i<3;i++){if(Math.abs(d[i])<1e-8){if(p[i]<lo[i]||p[i]>hi[i])return;}else{var l=(lo[i]-p[i])/d[i],r=(hi[i]-p[i])/d[i];if(l>r){var q=l;l=r;r=q;}t0=Math.max(t0,l);t1=Math.min(t1,r);if(t0>t1)return;}}
    if(t0>.001&&t0<best)best=Math.max(.025,t0-.8/len);
  });return best;
}
function createWorld(T,scene,solid){
  var P=plan(),root=new T.Group(),groups=[],materials=[],box=new T.BoxGeometry(1,1,1),plane=new T.PlaneGeometry(1,1),tmp=new T.Object3D(),pal=[0xc2b5a1,0xa6b3ad,0xd0c3aa,0x8f9c9e,0xc8b5a6,0xada9b1];root.name='Oststadt und Motorsportpark';scene.add(root);
  var bodyMat=new T.MeshLambertMaterial({color:0xffffff}),glassMat=new T.MeshLambertMaterial({color:0x476b77,emissive:0xf6cb7a,emissiveIntensity:0}),roofMat=new T.MeshLambertMaterial({color:0x727b78}),roadMat=new T.MeshLambertMaterial({color:0x41484e}),paveMat=new T.MeshLambertMaterial({color:0xb5b8ae}),lineMat=new T.MeshBasicMaterial({color:0xf0e9cf}),redMat=new T.MeshLambertMaterial({color:0xad5946});materials.push(glassMat);
  var chunks={};function add(kind,x,y,z,w,h,d,rot,color){var k=Math.floor(x/80)+'_'+Math.floor(z/80),b=chunks[k]||(chunks[k]={x:Math.floor(x/80)*80+40,z:Math.floor(z/80)*80+40,body:[],glass:[],roof:[]});b[kind].push({x:x,y:y,z:z,w:w,h:h,d:d,rot:rot||0,color:color||0xffffff});}
  P.buildings.forEach(function(b){add('body',b.x,b.h/2,b.z,b.w,b.h,b.d,0,pal[b.seed%pal.length]);add('roof',b.x,b.h+.2,b.z,b.w+.4,.4,b.d+.4);add('glass',b.x,1.7,b.z+b.d/2+.04,b.w*.68,2,1,0);add('glass',b.x,1.7,b.z-b.d/2-.04,b.w*.68,2,1,Math.PI);
    /* Geschaeftssockel, Vordach und Dachaufbau brechen die gleiche Silhouette. */
    add('body',b.x,2.85,b.z+b.d/2+.15,b.w*.9,.35,.5,0,[0x486d70,0xa4664f,0x7d8057,0x7d6680][b.seed%4]);
    add('body',b.x,.95,b.z+b.d/2+.08,1.5,1.9,.14,0,0x344f53);
    if(b.seed%3===0)add('roof',b.x+2,b.h+1.3,b.z-2,b.w*.4,2.2,b.d*.36);
    if(b.seed%4===0)for(var f9=1;f9<4;f9++)add('body',b.x,f9*2.8+3,b.z+b.d/2+.65,b.w*.7,.22,1.3,0,0xc4c4af);
    for(var f=0;f<b.floors;f++)for(var c=-1;c<=1;c++){var y=4.4+f*2.8;[1,-1].forEach(function(side){add('glass',b.x+c*4,y,b.z+side*(b.d/2+.035),1.65,1.6,1,side>0?0:Math.PI);add('glass',b.x+side*(b.w/2+.035),y,b.z+c*3.4,1.65,1.6,1,side*Math.PI/2);});}
    solid(b.x,b.z,b.w,b.d);});
  Object.keys(chunks).forEach(function(k){var b=chunks[k];['body','glass','roof'].forEach(function(kind){var rows=b[kind];if(!rows.length)return;var geo=(kind==='glass'?plane:box).clone();geo.boundingSphere=new T.Sphere(new T.Vector3(0,25,0),80);var m=new T.InstancedMesh(geo,kind==='glass'?glassMat:(kind==='body'?bodyMat:roofMat),rows.length);m.position.set(b.x,0,b.z);rows.forEach(function(a,i){tmp.position.set(a.x-b.x,a.y,a.z-b.z);tmp.rotation.set(0,a.rot,0);tmp.scale.set(a.w,a.h,a.d);tmp.updateMatrix();m.setMatrixAt(i,tmp.matrix);if(kind==='body')m.setColorAt(i,new T.Color(a.color));});m.instanceMatrix.needsUpdate=true;m.updateMatrix();m.matrixAutoUpdate=false;root.add(m);groups.push({mesh:m,x:b.x,z:b.z,detail:kind==='glass'});});});
  function slab(x,z,w,d,mat,y){var m=new T.Mesh(box,mat);m.position.set(x,y===undefined?.02:y,z);m.scale.set(w,.06,d);m.updateMatrix();m.matrixAutoUpdate=false;root.add(m);return m;}
  P.roads.forEach(function(r){var dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],len=Math.hypot(dx,dz),x=(r.a[0]+r.b[0])/2,z=(r.a[1]+r.b[1])/2,rot=-Math.atan2(dz,dx);var a=slab(x,z,len+r.w,r.w+7,paveMat,.015);a.rotation.y=rot;a.updateMatrix();var b=slab(x,z,len+r.w,r.w,roadMat,.055);b.rotation.y=rot;b.updateMatrix();for(var t=5;t<len-5;t+=12){var q=t/len,m=slab(r.a[0]+dx*q,r.a[1]+dz*q,4,.14,lineMat,.092);m.rotation.y=rot;m.updateMatrix();}});
  slab(680,120,57,57,paveMat,.04);slab(680,120,28,28,new T.MeshLambertMaterial({color:0x6d9567}),.09);
  var track=path(P.track,true),pos=[],uv=[],idx=[];
  for(var i=0;i<track.points.length;i++){var a=track.points[Math.max(0,i-1)],b=track.points[Math.min(track.points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;[-1,1].forEach(function(s){pos.push(track.points[i][0]-dz/l*7*s,.095,track.points[i][1]+dx/l*7*s);uv.push(track.lengths[i]/12,(s+1)/2);});if(i){var k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}}
  var tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(pos,3));tg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));tg.setIndex(idx);tg.computeVertexNormals();var tm=new T.Mesh(tg,new T.MeshLambertMaterial({color:0x38434a,side:T.DoubleSide}));root.add(tm);
  for(var i=0;i<track.points.length-1;i++){var a=track.points[i],b=track.points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);[-1,1].forEach(function(side){var m=slab((a[0]+b[0])/2-dz/l*7.5*side,(a[1]+b[1])/2+dx/l*7.5*side,l+1,1,i%2?redMat:lineMat,.11);m.rotation.y=-Math.atan2(dz,dx);m.updateMatrix();});}
  for(var i=0;i<8;i++)for(var j=0;j<2;j++)slab(754+i,340-5+j*5,1,5,(i+j)%2?lineMat:roofMat,.13);
  slab(770,320,34,22,paveMat,.08);for(var i=0;i<3;i++)slab(685,503+i*2,58,2,paveMat,.7+i*.6);
  /* Markierungen, Gehwege und Randsteine gemeinsam zeichnen statt je Strich. */
  var flat={};root.children.slice().forEach(function(m){if(m.isMesh&&!m.isInstancedMesh&&m.geometry===box){(flat[m.material.uuid]||(flat[m.material.uuid]=[])).push(m);}});
  Object.keys(flat).forEach(function(k){var a=flat[k],g=box.clone();g.boundingSphere=new T.Sphere(new T.Vector3(440,0,200),550);var im=new T.InstancedMesh(g,a[0].material,a.length);a.forEach(function(m,i){im.setMatrixAt(i,m.matrix);root.remove(m);});im.instanceMatrix.needsUpdate=true;im.updateMatrix();im.matrixAutoUpdate=false;root.add(im);});
  var roadPoints=P.roads.map(function(r){return [r.a,r.b];});
  return {root:root,plan:P,track:track,groups:groups,cameraClip:function(a,b){return cameraClip(P.buildings,a,b);},onRoad:function(x,z){if(P.roads.some(function(r){return x>=Math.min(r.a[0],r.b[0])-r.w/2&&x<=Math.max(r.a[0],r.b[0])+r.w/2&&z>=Math.min(r.a[1],r.b[1])-r.w/2&&z<=Math.max(r.a[1],r.b[1])+r.w/2&&projekt([x,z],r.a,r.b).d<r.w/2;}))return true;if(x>570&&x<810&&z>330&&z<490&&abstand([x,z],P.track,true)<8)return true;return false;},tick:function(x,z,night){groups.forEach(function(g){var d=Math.hypot(g.x-x,g.z-z);g.mesh.visible=d<(g.detail?200:570);});glassMat.emissiveIntensity=night?.55:0;}};
}
/* Der Platz und seine Bewohner teilen Geometrien und Materialien. Keine weiteren GLBs. */
function createLife(T,scene,solid){
  var root=new T.Group();root.name='Forum und Stadtleben';scene.add(root);
  var tmp=new T.Object3D(),box=new T.BoxGeometry(1,1,1),rows=[],crowd=[],clock=0,last=-1;
  function part(x,y,z,w,h,d,c,rot){rows.push({x:x,y:y,z:z,w:w,h:h,d:d,c:c,r:rot||0});}
  /* Freie Sichtachsen vom Bus bis zum Forum, mit Grueninseln an den Raendern. */
  [[658,98],[702,98],[658,142],[702,142],[600,40],[680,200],[760,120],[760,40]].forEach(function(p,i){
    part(p[0],.35,p[1],4,.6,4,0x9caaa0);part(p[0],2,p[1],.35,3.2,.35,0x735940);
    part(p[0],4.1,p[1],3.7,2.4,3.7,i%2?0x668f68:0x447653);solid(p[0],p[1],4,4);
  });
  [[664,103],[696,103],[664,137],[696,137]].forEach(function(p){
    part(p[0],.65,p[1],4,.22,1,0x977046);part(p[0],1.15,p[1]+.5,4,.8,.16,0x977046);
    [-1.5,1.5].forEach(function(dx){part(p[0]+dx,.32,p[1],.18,.65,.8,0x354a47);});solid(p[0],p[1],4,1.5);
  });
  /* Flacher Brunnen: niedriger Rand, sichtbares Wasser, keine zusaetzliche Lichtquelle. */
  part(680,.25,120,10,.45,10,0xd2c9ae);part(680,.51,120,8.7,.08,8.7,0x70aeb1);
  part(680,1.05,120,1.1,1.1,1.1,0xb3b9b1);solid(680,120,10,10);
  /* Zwei Cafekioske geben dem Forum erkennbare Vorderseiten. */
  [653,707].forEach(function(x,i){part(x,1.5,120,6,3,8,0xdfc6a2);part(x,3.2,120,7,.35,9,i?0x5f8d7f:0xae6650);part(x+(i?-3.04:3.04),1.6,120,.06,1.4,5,0x385e66);solid(x,120,7,9);});
  var geo=box.clone();geo.boundingSphere=new T.Sphere(new T.Vector3(680,2,120),130);
  var props=new T.InstancedMesh(geo,new T.MeshLambertMaterial({color:0xffffff}),rows.length);
  rows.forEach(function(a,i){tmp.position.set(a.x,a.y,a.z);tmp.rotation.set(0,a.r,0);tmp.scale.set(a.w,a.h,a.d);tmp.updateMatrix();props.setMatrixAt(i,tmp.matrix);props.setColorAt(i,new T.Color(a.c));});props.instanceMatrix.needsUpdate=true;root.add(props);
  /* Alle Wege liegen auf breiten Gehstreifen; das Forum bleibt in der Mitte offen. */
  var routes=[[[660,108],[700,108],[700,132],[660,132]],[[570,9],[630,9],[630,71],[570,71]],[[650,169],[710,169],[710,231],[650,231]],[[730,89],[790,89],[790,151],[730,151]]];
  routes.forEach(function(p,k){for(var j=0;j<5;j++)crowd.push({path:path(p,true),offset:j*24+k*7,speed:1.1+(j%3)*.18,phase:j*1.8+k,skin:[0xd9ae88,0x9c6d50,0xefd1ae][j%3],shirt:[0x477d8b,0xb86448,0x73965f,0xc4a35f,0x746b93][j],pants:0x394955});});
  var cg=box.clone();cg.boundingSphere=new T.Sphere(new T.Vector3(680,2,120),160);
  var people=new T.InstancedMesh(cg,new T.MeshLambertMaterial({color:0xffffff}),crowd.length*6);people._bewegt=true;people.instanceMatrix.setUsage(T.DynamicDrawUsage);people.frustumCulled=false;root.add(people);
  var colors=new T.Color();crowd.forEach(function(p,i){[p.skin,p.shirt,p.skin,p.skin,p.pants,p.pants].forEach(function(c,j){people.setColorAt(i*6+j,colors.setHex(c));});});
  function tick(dt,x,z,reduced){
    var near=Math.hypot(x-680,z-120)<230;root.visible=near;if(!near)return;clock+=dt;
    /* 20 Hz reichen fuer entfernte Figuren, waehrend Kamera und Spieler frei laufen. */
    var frame=Math.floor(clock*(reduced?5:20));if(frame===last)return;last=frame;
    crowd.forEach(function(p,i){var q=sample(p.path,(clock*p.speed+p.offset)%p.path.length),wave=reduced?0:Math.sin(clock*p.speed*5+p.phase)*.42,c=Math.cos(q.yaw),s=Math.sin(q.yaw);
      var parts=[[0,1.64,0,.3,.34,.3,0],[0,1.12,0,.52,.66,.3,0],[-.36,1.12,0,.16,.62,.18,wave],[.36,1.12,0,.16,.62,.18,-wave],[-.15,.4,0,.2,.76,.23,-wave],[.15,.4,0,.2,.76,.23,wave]];
      parts.forEach(function(a,j){tmp.position.set(q.x+a[0]*c+a[2]*s,a[1]+.1,q.z-a[0]*s+a[2]*c);tmp.rotation.set(a[6],q.yaw,0);tmp.scale.set(a[3],a[4],a[5]);tmp.updateMatrix();people.setMatrixAt(i*6+j,tmp.matrix);});
    });people.instanceMatrix.needsUpdate=true;
  }
  tick(.1,680,120,false);return {root:root,people:people,props:props,crowd:crowd,tick:tick};
}
function vehicle(T,color,bus){var root=new T.Group(),geo=new T.BoxGeometry(1,1,1),paint=new T.MeshLambertMaterial({color:color}),glass=new T.MeshLambertMaterial({color:0x315565}),dark=new T.MeshLambertMaterial({color:0x26333a}),light=new T.MeshBasicMaterial({color:0xffe9ac}),L=bus?8.4:4.1,W=bus?2.5:1.85;
  function b(w,h,d,x,y,z,mat){var m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m._bewegt=true;root.add(m);return m;}
  b(W,bus?2.5:.75,L,0,bus?1.7:.85,0,paint);b(W+.02,bus?1.05:.65,bus?L-1:2.2,0,bus?2.05:1.4,bus?0:-.1,glass);b(W+.05,.2,L+.1,0,.55,0,dark);b(W,.25,.18,0,bus?1.45:.82,L/2+.02,light);
  var wheels=[];[-1,1].forEach(function(x){[-1,1].forEach(function(z){var m=new T.Mesh(new T.CylinderGeometry(.4,.4,.22,8),dark);m.rotation.z=Math.PI/2;m.position.set(x*(W/2+.06),.4,z*L*.33);m._bewegt=true;root.add(m);wheels.push(m);});});root._bewegt=true;return {mesh:root,raeder:[],wheels:wheels,homeY:.05,homeX:0,homeZ:0,state:'parkt',_stadt:true};
}
return {bounds:bounds,plan:plan,cameraClip:cameraClip,projekt:projekt,dist:dist,path:path,sample:sample,abstand:abstand,graph:graph,route:route,fahrplan:fahrplan,fahrzeugStand:fahrzeugStand,createWorld:createWorld,createLife:createLife,vehicle:vehicle};
});
