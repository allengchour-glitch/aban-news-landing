(function(global){
  'use strict';
  // Ein fester Lichtpool verhindert Shader-Neubau beim Erscheinen jeder Laterne.
  function lightBudget(THREE,scene,count){
    var sources=[],known=new WeakSet(),pools=[],originalAdd=scene.add,disposed=false;
    function register(root){root.traverse(function(o){if(!o.isPointLight||o.userData.nwPool||known.has(o))return;
      known.add(o);sources.push({light:o,mask:o.layers.mask,pos:new THREE.Vector3()});o.layers.disable(0);
    });}
    scene.traverse(function(o){if(o.isPointLight)register(o);});
    for(var i=0;i<count;i++){var p=new THREE.PointLight(0xffffff,0,1);p.userData.nwPool=true;originalAdd.call(scene,p);pools.push(p);}
    var add=function(){originalAdd.apply(this,arguments);for(var n=0;n<arguments.length;n++)register(arguments[n]);return this;};
    scene.add=add;
    function attachedVisible(o){for(var a=o;a;a=a.parent){if(!a.visible)return false;if(a===scene)return true;}return false;}
    return {
      update:function(focus,dt){
        // Entfernte Bauvorschauen und Feuer dürfen keine ganzen Szenenäste festhalten.
        for(var k=sources.length-1;k>=0;k--){var found=false;for(var parent=sources[k].light;parent;parent=parent.parent){if(parent===scene){found=true;break;}}
          if(!found){var removed=sources.splice(k,1)[0];removed.light.layers.mask=removed.mask;known.delete(removed.light);}}
        var active=[];
        for(var j=0;j<sources.length;j++){
          var s=sources[j],l=s.light;if(!(s.mask&1)||!attachedVisible(l)||!(l.intensity>0))continue;
          l.getWorldPosition(s.pos);var d=s.pos.distanceTo(focus),range=l.distance||80;
          if(d>range+26)continue;
          s.score=l.intensity/(1+Math.pow(Math.max(0,d-range*.35),2));active.push(s);
        }
        active.sort(function(a,b){return b.score-a.score;});var selected=active.slice(0,count),used=new Set();
        // Bereits ausgewählte Quellen behalten ihren Poolplatz und wechseln nicht laufend die Farbe.
        pools.forEach(function(p){var s=p.userData.nwSource;if(selected.indexOf(s)>=0)used.add(s);else p.userData.nwSource=null;});
        pools.forEach(function(p){
          var s=p.userData.nwSource;if(!s){s=selected.find(function(q){return !used.has(q);});if(s){used.add(s);p.intensity=0;p.userData.nwSource=s;}}
          if(!s){p.intensity=0;return;}var l=s.light;
          p.position.copy(s.pos);p.color.copy(l.color);p.distance=l.distance;p.decay=l.decay;
          p.intensity+=(l.intensity-p.intensity)*Math.min(1,Math.max(0,dt)*9);
        });
      },
      stats:function(){return {sources:sources.length,slots:pools.length,active:pools.filter(function(p){return p.intensity>.001;}).length};},
      dispose:function(){if(disposed)return;disposed=true;if(scene.add===add)scene.add=originalAdd;
        sources.forEach(function(s){s.light.layers.mask=s.mask;});pools.forEach(function(p){scene.remove(p);});}
    };
  }
  // Nur für den synchronen Zeichenaufruf ausblenden; Spielzustände bleiben unverändert.
  function distanceCuller(THREE,scene){
    var cache=new WeakMap(),lastHidden=0,center=new THREE.Vector3();
    function bounds(root){
      if(root.isLight||root.isCamera||root.isPoints||root.isSprite||root.isInstancedMesh&&root.name!=="NWStaticInstances"&&!root.userData.nwBounded)return null;
      var old=cache.get(root);if(old&&old.children===root.children.length)return old.sphere;
      var skip=false;root.traverse(function(o){if(o.isSkinnedMesh||o.isPoints||o.isInstancedMesh&&o.name!=="NWStaticInstances"&&!o.userData.nwBounded)skip=true;
        var mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(function(m){if(m&&(!m.fog||m.isShaderMaterial))skip=true;});});
      if(skip){cache.set(root,{children:root.children.length,sphere:null});return null;}
      root.updateWorldMatrix(true,true);var box=new THREE.Box3().setFromObject(root);
      if(box.isEmpty())return null;
      box.applyMatrix4(root.matrixWorld.clone().invert());var sphere=box.getBoundingSphere(new THREE.Sphere());
      cache.set(root,{children:root.children.length,sphere:sphere});return sphere;
    }
    return {
      render:function(focus,range,draw){
        var hidden=[];
        scene.children.forEach(function(root){if(!root.visible)return;var b=bounds(root);if(!b)return;
          root.updateWorldMatrix(true,false);center.copy(b.center).applyMatrix4(root.matrixWorld);
          var e=root.matrixWorld.elements,scale=Math.max(Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),Math.hypot(e[8],e[9],e[10]));
          if(Math.hypot(center.x-focus.x,center.z-focus.z)>range+b.radius*scale){root.visible=false;hidden.push(root);}
        });
        lastHidden=hidden.length;try{return draw();}finally{hidden.forEach(function(root){root.visible=true;});}
      },stats:function(){return {hiddenForRender:lastHidden};}
    };
  }
  // Eine gemeinsame, dem Boden folgende Schattenfläche statt vieler Schattenlichter.
  function contactPatches(THREE,scene,spots,height){
    var cv=document.createElement("canvas");cv.width=cv.height=128;var c=cv.getContext("2d"),g=c.createRadialGradient(64,64,5,64,64,62);
    g.addColorStop(0,"rgba(255,255,255,.30)");g.addColorStop(.5,"rgba(255,255,255,.13)");g.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=g;c.fillRect(0,0,128,128);
    var texture=new THREE.CanvasTexture(cv),pos=[],uv=[],indices=[];
    spots.forEach(function(p){var base=pos.length/3,size=Math.max(1.7,Math.min(12,p.r*2.8));
      for(var row=0;row<=4;row++)for(var col=0;col<=4;col++){var x=p.x+(col/4-.5)*size,z=p.z+(row/4-.5)*size;pos.push(x,height(x,z)+.145,z);uv.push(col/4,row/4);}
      for(var r=0;r<4;r++)for(var q=0;q<4;q++){var a=base+r*5+q;indices.push(a,a+5,a+1,a+1,a+5,a+6);}
    });
    var geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
    var mat=new THREE.MeshBasicMaterial({map:texture,color:0x000000,transparent:true,depthWrite:false,toneMapped:false}),mesh=new THREE.Mesh(geo,mat);mesh.name="NWBodenkontakt";mesh.renderOrder=2;scene.add(mesh);var disposed=false;
    return {mesh:mesh,dispose:function(){if(disposed)return;disposed=true;scene.remove(mesh);geo.dispose();mat.dispose();texture.dispose();}};
  }
  var images={};
  // Eigene nahtlose Materialzeichnungen; geringer Kontrast statt schwarzer Riesenfugen.
  function texture(THREE,file){
    if(file!=='tex_cobble.png'&&file!=='tex_grass.png')return null;
    if(!images[file]){
      var cv=document.createElement('canvas');cv.width=cv.height=512;var c=cv.getContext('2d'),seed=81917;
      function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
      if(file==='tex_cobble.png'){
        c.fillStyle='#61695e';c.fillRect(0,0,512,512);
        for(var row=-1;row<9;row++)for(var col=-1;col<9;col++){
          var x=col*64+(row%2?32:0),y=row*64,v=116+Math.floor(rand()*15);
          c.fillStyle='rgb('+v+','+(v+3)+','+(v-6)+')';
          c.beginPath();c.moveTo(x+6,y+3);c.lineTo(x+58,y+4);c.quadraticCurveTo(x+62,y+5,x+62,y+11);
          c.lineTo(x+60,y+57);c.quadraticCurveTo(x+59,y+61,x+52,y+61);c.lineTo(x+8,y+60);c.quadraticCurveTo(x+2,y+59,x+3,y+52);c.lineTo(x+3,y+10);c.closePath();c.fill();
          c.strokeStyle='rgba(232,224,204,.15)';c.lineWidth=2;c.stroke();
        }
        for(var n=0;n<1800;n++){c.fillStyle=rand()<.5?'rgba(225,218,196,.09)':'rgba(39,58,43,.07)';c.fillRect(rand()*512,rand()*512,1+rand()*2,1+rand()*2);}
      }else{
        c.fillStyle='#c6cbb6';c.fillRect(0,0,512,512);
        for(var g=0;g<7200;g++){var v=rand();c.strokeStyle=v<.5?'rgba(51,78,48,.09)':'rgba(239,230,193,.14)';var gx=rand()*512,gy=rand()*512;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+rand()*3-1.5,gy-2-rand()*3);c.stroke();}
      }
      images[file]=cv;
    }
    var t=new THREE.CanvasTexture(images[file]);t.encoding=THREE.sRGBEncoding;return t;
  }
  global.NWWildnisVisuals={lightBudget:lightBudget,distanceCuller:distanceCuller,contactPatches:contactPatches,texture:texture};
})(typeof window!=='undefined'?window:globalThis);
