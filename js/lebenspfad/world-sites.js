(function(global){
 'use strict';
 // Feste Bauplätze halten Bauwerke auch nach einer Pfadänderung von den Wegen fern.
 global.LPWorldSites=function(options){
  var points=options.points,edges=options.edges,sites=[],lookup={},basins=options.basins||[];
  var ratios={lp_schule:.567,lp_uni:.609,lp_buero:.206,lp_parkbank:.459,lp_prop_kinderwagen:.515,lp_prop_abschlusshut:.654,lp_prop_cabrio:.580,lp_prop_hochzeitsbogen:.330,lp_prop_haus:.575,lp_prop_herz:.493};
  function lineDistance(p,a,b){var dx=b.x-a.x,dz=b.z-a.z,t=((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1);t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
  function plan(key,tile,dx,dz,r,cx,cz){
   var anchor=points[tile],desired={x:anchor.x+dx+(cx||0),z:anchor.z+dz+(cz||0)},baseAngle=Math.atan2(desired.z-anchor.z,desired.x-anchor.x),best=null;
   for(var ring=0;ring<18;ring++)for(var turn=0;turn<48;turn++){
    var a=baseAngle+turn*2.3999632297,d=r+4.4+ring*1.45,p={x:anchor.x+Math.cos(a)*d,z:anchor.z+Math.sin(a)*d};
    if(p.x-r<-225||p.x+r>265||Math.abs(p.z)+r>100)continue;
    if(points.some(function(f){return Math.hypot(p.x-f.x,p.z-f.z)<r+3.2;}))continue;
    if(edges.some(function(e){return lineDistance(p,points[e.a],points[e.b])<r+1.15;}))continue;
    if(sites.some(function(s){return Math.hypot(p.x-s.x,p.z-s.z)<r+s.r+1.3;}))continue;
    if(basins.some(function(b){return Math.hypot(p.x-b.x,p.z-b.z)<r+Math.max(b.rx,b.rz)+1.5;}))continue;
    var score=(p.x-desired.x)*(p.x-desired.x)+(p.z-desired.z)*(p.z-desired.z)+d*d*.025;
    if(!best||score<best.score)best={key:key,tile:tile,x:p.x,z:p.z,r:r,cx:cx||0,cz:cz||0,score:score};
   }
   if(!best)throw new Error('Kein freier Bauplatz: '+key);
   sites.push(best);lookup[key]=best;return best;
  }
  var offsets=[[7,-8],[8,7],[-7,-8],[7,8],[-8,-7],[7,-8],[-7,8],[8,-8]];
  var shapes=[[3.6,2.65,1.3],[3.6,0,0],[1.9,0,0],[5.7,3,0],[2.1,0,0],[3.4,2.6,1.1],[3.3,1.1,1.6],[1.7,0,0]];
  offsets.forEach(function(v,c){var sh=shapes[c];plan('chapter:'+c,c*18+9,v[0],v[1],sh[0],sh[1],sh[2]);});
  (options.buildings||[]).concat(options.props||[]).forEach(function(v){var name=v[0].replace('.glb','');plan(name,v[2]*18+8,v[3],v[4],v[1]*(ratios[name]||.7)+.25);});
  plan('house',98,4,-9,5.5);plan('wheel',22,-9,-9,5.8);plan('mill',94,-8,9,5.1);
  plan('wind',99,13,-11,2.8);plan('flag',62,-12,10,1.8);plan('chalk',5,4.6,6.4,2.8);plan('goalTree',143,0,-6,4.2);
  for(var winter=0;winter<3;winter++)plan('winter:'+winter,129+winter*4,winter%2?-6:6,4,1.0);
  (options.forks||[]).forEach(function(f){plan('fork:'+f.at,f.at,1.8,-1.8,1.4);});
  return {sites:sites,get:function(key){return lookup[key];},pads:sites.map(function(s){return {x:s.x,z:s.z,radius:s.r+4.5};}),
   stats:{sites:sites.length,keys:sites.map(function(s){return s.key;})}};
 };
})(window);
