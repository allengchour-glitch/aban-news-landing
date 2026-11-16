(function(global){
 "use strict";
 // Die Feld-IDs bleiben gleich. Nur ihre räumliche Anordnung wird neu aufgebaut.
 global.LPRouteLayout=function(T,options){
  options=options||{};
  var count=options.chapters||8,per=options.perChapter||18;
  var crests=[-36,34,-35,36,-34,35,-36,34,-35],anchors=[];
  for(var c=0;c<=count;c++)anchors.push(new T.Vector3(-160+c*46,0,crests[c%crests.length]));
  var mainCurve=new T.CatmullRomCurve3(anchors,false,'centripetal'),points=[],all=[],edges=[],forks=[];
  function spaced(curve,n,from,to){
   var samples=[],lengths=[0],length=0,steps=256;
   for(var i=0;i<=steps;i++){var p=curve.getPoint(from+(to-from)*i/steps);samples.push(p);if(i){length+=p.distanceTo(samples[i-1]);lengths.push(length);}}
   var result=[];
   for(var j=0;j<=n;j++){var target=length*j/n,lo=1,hi=steps;while(lo<hi){var mid=(lo+hi)>>1;if(lengths[mid]<target)lo=mid+1;else hi=mid;}
    var k=lo,t=(target-lengths[k-1])/(lengths[k]-lengths[k-1]||1);result.push(samples[k-1].clone().lerp(samples[k],t));}
   return result;
  }
  for(var ci=0;ci<count;ci++){var section=spaced(mainCurve,ci?per:per-1,ci/count,(ci+1)/count);for(var j=ci?1:0;j<section.length;j++)points.push(section[j]);}
  function radius(i){return i>=count*per?1.7:(i===0||i%per===per-1?2.55:1.85);}
  points.forEach(function(p,i){all.push(p);if(i)edges.push({a:i-1,b:i});});
  function distanceToSegment(p,a,b){var dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,t=len?((p.x-a.x)*dx+(p.z-a.z)*dz)/len:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
  function orient(a,b,c){return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);}
  function cross(a,b,c,d){return orient(a,b,c)*orient(a,b,d)<-1e-7&&orient(c,d,a)*orient(c,d,b)<-1e-7;}
  function candidateScore(ps,ids){
   var score=0,gap=Infinity,minStep=Infinity,maxStep=0,crossings=0;
   for(var k=1;k<ps.length-1;k++){
    var p=ps[k];
    for(var i=0;i<all.length;i++){var d=p.distanceTo(all[i])-radius(ids[k])-radius(i);gap=Math.min(gap,d);if(d<.15)score+=(.15-d)*100;}
    for(var j=1;j<k;j++){var d2=p.distanceTo(ps[j])-3.4;gap=Math.min(gap,d2);if(d2<.15)score+=(.15-d2)*100;}
    for(var e=0;e<edges.length;e++){var edge=edges[e],dist=distanceToSegment(p,all[edge.a],all[edge.b]);if(dist<2.55)score+=(2.55-dist)*80;}
   }
   for(var s=1;s<ps.length;s++){
    var step=ps[s].distanceTo(ps[s-1]);minStep=Math.min(minStep,step);maxStep=Math.max(maxStep,step);
    if(step<3.85)score+=(3.85-step)*100;if(step>10.8)score+=(step-10.8)*100;
    for(var t=0;t<all.length;t++){if(t===ids[s]||t===ids[s-1])continue;var clearance=radius(t)+.85,dd=distanceToSegment(all[t],ps[s-1],ps[s]);if(dd<clearance)score+=(clearance-dd)*100;}
    for(var ei=0;ei<edges.length;ei++){var old=edges[ei];if([ids[s],ids[s-1]].indexOf(old.a)>=0||[ids[s],ids[s-1]].indexOf(old.b)>=0)continue;
     if(cross(ps[s-1],ps[s],all[old.a],all[old.b])){score+=10000;crossings++;}}
    for(var si=1;si<s-1;si++)if(cross(ps[s-1],ps[s],ps[si-1],ps[si])){score+=10000;crossings++;}
   }
   return {score:score,minGap:gap,minStep:minStep,maxStep:maxStep,crossings:crossings};
  }
  var stats={mainCount:points.length,forks:[]};
  function addFork(fk){
   var a=points[fk.at],b=points[fk.rejoin],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,n=fk.types.length;
   var ids=[fk.at];for(var k=0;k<n;k++)ids.push(all.length+k);ids.push(fk.rejoin);
   var best=null;
   for(var side=-1;side<=1;side+=2)for(var depth=8;depth<=30;depth+=2)for(var tangent=0;tangent<=.2;tangent+=.1){
    var nx=-uz*side,nz=ux*side;
    var curve=new T.CatmullRomCurve3([a.clone(),new T.Vector3(a.x+ux*len*tangent+nx*depth,0,a.z+uz*len*tangent+nz*depth),new T.Vector3((a.x+b.x)/2+nx*(depth+1),0,(a.z+b.z)/2+nz*(depth+1)),new T.Vector3(b.x-ux*len*tangent+nx*depth,0,b.z-uz*len*tangent+nz*depth),b.clone()],false,'centripetal');
    var ps=spaced(curve,n+1,0,1),quality=candidateScore(ps,ids);
    var preference=quality.score+Math.abs((quality.minStep+quality.maxStep)/2-5)*.01+depth*.0001;
    if(!best||preference<best.preference)best={points:ps,quality:quality,preference:preference,depth:depth,side:side};
   }
   var branch=best.points.slice(1,-1);branch.forEach(function(p){all.push(p);});for(var i=1;i<ids.length;i++)edges.push({a:ids[i-1],b:ids[i]});
   stats.forks.push({at:fk.at,rejoin:fk.rejoin,depth:best.depth,side:best.side,...best.quality});forks.push({at:fk.at,rejoin:fk.rejoin,indices:ids,points:best.points});return branch;
  }
  function measure(){var overlaps=0,minGap=Infinity,minStep=Infinity,maxStep=0,crossings=0;
   for(var i=0;i<all.length;i++)for(var j=0;j<i;j++){var g=all[i].distanceTo(all[j])-radius(i)-radius(j);minGap=Math.min(minGap,g);if(g<0)overlaps++;}
   edges.forEach(function(e){var d=all[e.a].distanceTo(all[e.b]);minStep=Math.min(minStep,d);maxStep=Math.max(maxStep,d);});
   for(var a=0;a<edges.length;a++)for(var b=0;b<a;b++){var x=edges[a],y=edges[b];if(x.a===y.a||x.a===y.b||x.b===y.a||x.b===y.b)continue;if(cross(all[x.a],all[x.b],all[y.a],all[y.b]))crossings++;}
   return {nodes:all.length,edges:edges.length,overlaps:overlaps,minGap:minGap,minStep:minStep,maxStep:maxStep,crossings:crossings};
  }
  return {points:points,addFork:addFork,stats:stats,measure:measure,forks:forks,edges:edges,allPoints:all};
 };
})(window);
