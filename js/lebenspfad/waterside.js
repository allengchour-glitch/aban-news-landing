(function(global){
 "use strict";
 // Statische Ufer, kleine Holzstege und Wasserpflanzen. Keine Spiel-Zufallszahlen.
 global.LPWaterside=function(T,options){
  var scene=options.scene,basins=options.basins,ground=options.terrainHeight,roots=[],stones=[],stems=[],leaves=[],flowers=[],timber=[];
  var stats={basins:basins.length,docks:0,rocks:0,reeds:0,lilies:0};
  function material(hex){return new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),roughness:.9,flatShading:true});}
  var shoreMat=material(0xbeb299),woodMat=material(0x977151),stoneMat=material(0x8c9893),reedMat=material(0x6b8250),leafMat=material(0x55876c),flowerMat=material(0xefc8ad);
  function point(p,a,r){return {x:p.x+Math.cos(a)*p.rx*r,z:p.z+Math.sin(a)*p.rz*r};}
  function addMesh(g,m){var mesh=new T.Mesh(g,m);mesh.receiveShadow=true;scene.add(mesh);roots.push(mesh);return mesh;}
  basins.forEach(function(p,bi){
   var segments=40,pos=[],idx=[];
   for(var j=0;j<=segments;j++){var a=j/segments*Math.PI*2;
    [.93,1.3].forEach(function(r,k){var q=point(p,a,r+(k?Math.sin(a*3+bi)*.035:0));pos.push(q.x,Math.max(p.y+.045,ground(q.x,q.z)-.325),q.z);});
    if(j<segments){var v=j*2;idx.push(v,v+2,v+1,v+1,v+2,v+3);}
   }
   var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setIndex(idx);geometry.computeVertexNormals();addMesh(geometry,shoreMat);
   for(var k=0;k<12;k++){var a=k*2.39996+bi*.8,q=point(p,a,1.12+Math.sin(k*3)*.07),s=.26+(k%3)*.11;
    stones.push({x:q.x,y:Math.max(p.y+.04,ground(q.x,q.z)-.35)+s*.3,z:q.z,sx:s*1.4,sy:s*.7,sz:s,ry:a});
   }
   for(var r=0;r<10;r++){var a=r*.39+bi*1.7,q=point(p,a,.96);
    for(var t=0;t<2;t++){var h=.5+((r+t)%4)*.12;stems.push({x:q.x+t*.12,y:p.y+h/2-.02,z:q.z-t*.09,sx:.025,sy:h,sz:.025,ry:a});}
   }
   for(var l=0;l<5;l++){var a=l*2.39996+bi,q=point(p,a,.42+(l%2)*.15),s=.24+(l%3)*.04;
    leaves.push({x:q.x,y:p.y+.05,z:q.z,sx:s,sy:1,sz:s*.8,ry:a});
    if(l%2===0)flowers.push({x:q.x+.05,y:p.y+.12,z:q.z,sx:.11,sy:.13,sz:.11,ry:a});
   }
   if(p.legacy)return;
   var nearest=options.fields.reduce(function(best,f){var d=Math.hypot(f.x-p.x,f.z-p.z);return d<best.d?{x:f.x,z:f.z,d:d}:best;},{d:Infinity});
   var nx=(nearest.x-p.x)/nearest.d,nz=(nearest.z-p.z)/nearest.d,edge=1/Math.sqrt(nx*nx/(p.rx*p.rx)+nz*nz/(p.rz*p.rz));
   var cx=p.x+nx*(edge-.5),cz=p.z+nz*(edge-.5),angle=Math.atan2(nx,nz),deckY=p.y+.33;
   for(var b=0;b<9;b++){var along=(b-4)*.28;timber.push({x:cx+nx*along,y:deckY,z:cz+nz*along,sx:1.35,sy:.12,sz:.24,ry:angle});}
   [-1,1].forEach(function(side){[-1,1].forEach(function(end){var x=cx+nx*end*.95+nz*side*.53,z=cz+nz*end*.95-nx*side*.53;
    var bottom=Math.min(p.y-.4,ground(x,z)-.35),h=deckY+.23-bottom;timber.push({x:x,y:bottom+h/2,z:z,sx:.13,sy:h,sz:.13,ry:angle});});});
   stats.docks++;
  });
  function instances(items,geometry,mat){if(!items.length)return;var mesh=new T.InstancedMesh(geometry,mat,items.length),o=new T.Object3D();items.forEach(function(p,i){o.position.set(p.x,p.y,p.z);o.rotation.set(0,p.ry,0);o.scale.set(p.sx,p.sy,p.sz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);roots.push(mesh);}
  instances(stones,new T.IcosahedronGeometry(1,0),stoneMat);
  instances(stems,new T.CylinderGeometry(1,1,1,4),reedMat);
  var lily=new T.CircleGeometry(1,10);lily.rotateX(-Math.PI/2);instances(leaves,lily,leafMat);
  instances(flowers,new T.IcosahedronGeometry(1,0),flowerMat);
  instances(timber,new T.BoxGeometry(1,1,1),woodMat);
  stats.rocks=stones.length;stats.reeds=stems.length;stats.lilies=leaves.length;
  return {roots:roots,stats:stats};
 };
})(window);
