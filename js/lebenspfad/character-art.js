(function(global){
 'use strict';
 // Eigene Chibi-Geometrie. Keine Assets/Texturen, keine Spielzufallswerte.
 global.LPCharacterArt=function(T,color,cfg,palette,coarse){
  cfg=cfg||{g:'m',style:0,skin:0};
  var female=cfg.g==='f',style=cfg.style|0,hs=cfg.hstyle|0,top=cfg.top|0;
  var bodyHex=cfg.cloth>=0?palette.clothes[cfg.cloth%palette.clothes.length]:color;
  var skinHex=palette.skin[(cfg.skin|0)%palette.skin.length],pantsHex=palette.pants[(cfg.pants|0)%palette.pants.length];
  var hairHex=cfg.hair>=0?palette.hair[cfg.hair%palette.hair.length]:palette.hair[(style*2+(cfg.skin|0)+(female?0:1))%palette.hair.length];
  var irisHex=palette.eyes[(style+(cfg.skin|0)+(female?0:1))%palette.eyes.length];
  var n=coarse?16:24,small=coarse?10:14;
  function linear(hex){return new T.Color(hex).convertSRGBToLinear();}
  function material(hex,roughness){return new T.MeshStandardMaterial({color:linear(hex),roughness:roughness||.86,metalness:0,envMapIntensity:.18});}
  function shade(hex,k){return new T.Color(hex).multiplyScalar(k).getHex();}
  var skin=material(skinHex,.94),hair=material(hairHex,.88),cloth=material(bodyHex),pants=material(pantsHex),dark=material(0x292936),white=material(0xf4eee2),gold=material(0xd7a84c,.6);
  var trim=material(shade(bodyHex,.72)),blush=material(new T.Color(skinHex).lerp(new T.Color(0xdb8675),.23).getHex()),lip=material(0x9b544a),iris=material(irisHex,.56);
  var root=new T.Group();root.name='lp-chibi';var head=new T.Group();head.name='head';head.position.y=1.04;root.add(head);
  var rig=[];
  function group(parent,name,x,y,z){var g=new T.Group();g.name=name;g.position.set(x||0,y||0,z||0);parent.add(g);rig.push(g);return g;}
  function add(parent,geo,mat,x,y,z,sx,sy,sz,rx,ry,rz){var m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.scale.set(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz);m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function oval(parent,mat,x,y,z,rx,ry,rz){return add(parent,new T.SphereGeometry(1,small,coarse?8:12),mat,x,y,z,rx,ry,rz);}
  function tube(parent,points,r,mat,segments){return add(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3(p[0],p[1],p[2]);})),segments||12,r,coarse?5:7,false),mat);}
  function lerp(a,b,t){return a+(b-a)*t;}
  function profile(rows,y){var k=0;while(k<rows.length-2&&y>=rows[k+1][0])k++;var a=rows[k],b=rows[k+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0]||1)));return [y,lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3]||0,b[3]||0,t)];}
  // Elliptische Querschnitte: geschlossene, kontinuierliche Körper-/Kleidungsformen.
  function loft(rows,segments,deform){var p=[],indices=[],uv=[];segments=segments||n;
   for(var i=0;i<rows.length;i++)for(var j=0;j<=segments;j++){var a=j/segments*Math.PI*2,row=rows[i],x=Math.sin(a)*row[1],y=row[0],z=Math.cos(a)*row[2]+(row[3]||0);
    var v=deform?deform(x,y,z,a):[x,y,z];p.push(v[0],v[1],v[2]);uv.push(j/segments,i/(rows.length-1));
    if(i<rows.length-1&&j<segments){var q=i*(segments+1)+j,b=q+segments+1;indices.push(q,q+1,b,q+1,b+1,b);}}
   var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();smoothSeam(g,segments,rows.length);return g;}
  // Die UV-Naht liegt vorne: beide Randnormalen müssen identisch sein.
  function smoothSeam(g,segments,rows){var a=g.attributes.normal;for(var i=0;i<rows;i++){var l=i*(segments+1),r=l+segments,v=new T.Vector3(a.getX(l)+a.getX(r),a.getY(l)+a.getY(r),a.getZ(l)+a.getZ(r)).normalize();a.setXYZ(l,v.x,v.y,v.z);a.setXYZ(r,v.x,v.y,v.z);}}
  function patch(parent,mat,points){var shape=new T.Shape();points.forEach(function(p,i){if(i)shape.lineTo(p[0],p[1]);else shape.moveTo(p[0],p[1]);});shape.closePath();var g=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.007,bevelThickness:.006});return add(parent,g,mat,0,0,.205);}

  // Kurze Beine mit Knie-/Knöchelverjüngung und geformten Sneakern; Sohle exakt -0,12.
  var ll=group(root,'leg-left',-.145,.42,0),rl=group(root,'leg-right',.145,.42,0);
  [ll,rl].forEach(function(g){
   add(g,loft([[-.43,.07,.075],[-.39,.09,.085],[-.25,.10,.095],[-.10,.12,.11],[.04,.125,.115],[.07,0,0]],small),pants);
   add(g,loft([[-.54,0,0,.07],[-.54,.145,.22,.07],[-.51,.148,.225,.07],[-.49,.14,.215,.07]],small),white);
   add(g,loft([[-.49,.14,.21,.07],[-.44,.145,.22,.07],[-.39,.13,.19,.06],[-.34,.10,.115,.005],[-.30,.085,.09,0],[-.29,0,0]],small),trim);
   for(var i=0;i<2;i++)tube(g,[[-.065,-.375-i*.035,.14+i*.025],[0,-.362-i*.035,.165+i*.025],[.065,-.375-i*.035,.14+i*.025]],.009,white,4);
  });
  var skirt=female&&cfg.outfit!==2;
  var torsoRows=[[.35,0,0],[.37,.19,.14],[.43,.225,.165],[.55,.24,.18],[.70,.255,.20],[.84,.285,.205],[.94,.29,.19],[1.01,.255,.15],[1.04,.16,.10],[1.045,0,0]];
  if(skirt)torsoRows=[[.57,0,0],[.57,.245,.185]].concat(torsoRows.filter(function(r){return r[0]>.57;}));
  var body=add(root,loft(torsoRows),cloth);body.name='tailored-torso';
  add(root,loft([[.96,.10,.08],[1.04,.11,.09],[1.10,.105,.09],[1.12,0,0]],small),skin);
  tube(root,[[-.13,1.01,.10],[-.09,.98,.15],[0,.965,.17],[.09,.98,.15],[.13,1.01,.10]],.021,trim,12);
  var la=group(root,'arm-left',-.27,.94,0),ra=group(root,'arm-right',.27,.94,0);
  [la,ra].forEach(function(g,side){
   add(g,loft([[-.37,.06,.06],[-.29,.078,.075],[-.18,.09,.082],[-.08,.095,.09],[.015,.08,.08]],small),skin);
   add(g,loft([[-.19,.095,.09],[-.17,.105,.10],[-.04,.115,.11],[.035,.08,.08],[.06,0,0]],small),cloth);
   add(g,loft([[-.49,0,0,.01],[-.475,.055,.055,.02],[-.44,.085,.065,.025],[-.39,.08,.065,.02],[-.35,.06,.055,.01]],small),skin);
   var s=side?-1:1;tube(g,[[s*.052,-.39,.035],[s*.09,-.41,.055],[s*.085,-.44,.06]],.032,skin,5);
   tube(g,[[-.065,-.18,.06],[0,-.185,.095],[.065,-.18,.06]],.012,trim,5);
  });

  // Kleidung wird an die neue Rumpfform angepasst; keine Kapselhüllen übereinander.
  if(top===1||top===2){body.material=top===1?trim:cloth;
   patch(root,top===1?cloth:white,[[-.10,1.01],[0,.77],[.10,1.01]]);
   [-1,1].forEach(function(s){patch(root,trim,[[s*.095,1.01],[s*.18,.94],[s*.11,.82],[s*.025,.90]]);});
   for(var by=.54;by<.85;by+=.12)oval(root,gold,0,by,.21,.021,.021,.012);
  }else if(top===3){
   // Farbbänder auf genau derselben Geometrie, ohne neue Dicke/Zeichenaufrufe.
   var stripeY=torsoRows.map(function(r){return r[0];});for(var band=.35;band<1.045;band+=1/15)if(band>torsoRows[0][0])stripeY.push(band);
   stripeY.sort(function(a,b){return a-b;});var stripeGeo=loft(stripeY.map(function(y){return profile(torsoRows,y);}));
   var geo=stripeGeo.toNonIndexed(),col=[],a=geo.attributes.position;stripeGeo.dispose();
   for(var i=0;i<a.count;i+=3){var y=(a.getY(i)+a.getY(i+1)+a.getY(i+2))/3,c=linear((Math.floor((y-.35)*15)&1)?bodyHex:0xf4eee2);for(var j=0;j<3;j++)col.push(c.r,c.g,c.b);}
   geo.setAttribute('color',new T.Float32BufferAttribute(col,3));body.geometry.dispose();body.geometry=geo;var striped=material(0xffffff);striped.vertexColors=true;body.material=striped;
  }else if(top===4){
   patch(root,pants,[[-.13,.48],[-.13,.80],[.13,.80],[.13,.48]]);
   [-1,1].forEach(function(s){tube(root,[[s*.11,.78,.22],[s*.13,.93,.18],[s*.16,1.0,.10]],.027,pants,7);oval(root,gold,s*.11,.79,.24,.022,.022,.01);});
  }else if(top===5){
   tube(root,[[-.13,1.02,.08],[-.10,1.0,.16],[0,.985,.19],[.13,1.02,.08]],.055,trim,12);
   patch(root,trim,[[-.07,1.0],[-.11,.68],[-.015,.67],[.025,.98]]);
  }else if(top===6){
   add(root,loft([[.81,.14,.06,-.12],[.93,.22,.12,-.12],[1.08,.21,.12,-.11],[1.16,.12,.08,-.1],[1.17,0,0,-.1]],small),trim);
   patch(root,trim,[[-.13,.52],[-.10,.64],[.10,.64],[.13,.52]]);
   [-1,1].forEach(function(s){tube(root,[[s*.06,.96,.18],[s*.05,.80,.215]],.010,white,4);});
  }else if(top===7){for(var row=0;row<3;row++)for(var k=-1;k<=1;k++)oval(root,white,k*.105,.58+row*.12,.20-.02*Math.abs(k),.021,.021,.007);}
  if(skirt){var long=cfg.outfit===1,y=long?.14:.32;
   add(root,loft([[y,0,0],[y,.34,.23],[y+.035,.345,.235],[.46,.29,.205],[.54,.255,.19],[.57,.245,.185]],n,function(x,y,z,a){var f=1+.025*Math.cos(a*8)*Math.max(0,(.57-y)/(.57-.32));return [x*f,y,z*f];}),trim);

  }

  // Ein einziger modellierter Kopf mit breiten Wangen, kurzem Kinn und integrierter Nase.
  var faceRows=[[0,0,0],[.018,.13,.11],[.055,.23,.18],[.12,.32,.23],[.22,.385,.275],[.34,.41,.30],[.46,.405,.302],[.59,.38,.28],[.70,.32,.235],[.79,.21,.16],[.83,.09,.07],[.84,0,0]];
  var faceCurve=new T.CatmullRomCurve3(faceRows.map(function(r){return new T.Vector3(r[1],r[0],r[2]);}));
  faceRows=faceCurve.getPoints(42).map(function(v){return [v.y,Math.max(0,v.x),Math.max(0,v.z)];});
  function nose(x,y){return .082*Math.exp(-x*x/.0025-(y-.295)*(y-.295)/.0035)+.018*Math.exp(-x*x/.002-(y-.38)*(y-.38)/.008);}
  function front(x,y){var r=profile(faceRows,y);return r[2]*Math.sqrt(Math.max(.01,1-x*x/(r[1]*r[1]||1)))+nose(x,y);}
  var faceDense=[];for(var fy=0;fy<.84;fy+=.02)faceDense.push(profile(faceRows,fy));faceDense.push(faceRows[faceRows.length-1]);
  var faceGeo=loft(faceDense,coarse?24:32,function(x,y,z,a){if(Math.cos(a)>0)z+=nose(x,y)*Math.pow(Math.cos(a),8);return [x,y,z];});
  // Erröten ist Teil der Hautoberfläche, ohne aufgesetzte Wangenkörper.
  var faceColors=[],fp=faceGeo.attributes.position,baseSkin=linear(skinHex),rosy=linear(0xd97875);
  for(var fi=0;fi<fp.count;fi++){var fx=fp.getX(fi),fy=fp.getY(fi),fz=fp.getZ(fi),weight=fz>0?.24*Math.exp(-Math.pow((Math.abs(fx)-.245)/.085,2)-Math.pow((fy-.255)/.058,2)):0,fc=baseSkin.clone().lerp(rosy,weight);faceColors.push(fc.r,fc.g,fc.b);}
  faceGeo.setAttribute('color',new T.Float32BufferAttribute(faceColors,3));var faceMat=skin.clone();faceMat.color.setHex(0xffffff);faceMat.vertexColors=true;
  var headMesh=add(head,faceGeo,faceMat);headMesh.name='sculpted-head';
  [-1,1].forEach(function(s){oval(head,skin,s*.39,.33,0,.060,.085,.055);oval(head,blush,s*.423,.33,.025,.020,.045,.022);
   tube(head,[[s*.205,.56,front(s*.205,.56)+.012],[s*.145,.578,front(s*.145,.578)+.016],[s*.10,.566,front(s*.10,.566)+.014]],.017,hair,8);
  });
  var mouth=group(head,'smile',0,0,0);
  tube(mouth,[[-.075,.205,front(-.075,.205)+.01],[-.04,.181,front(-.04,.181)+.014],[0,.176,front(0,.176)+.015],[.04,.181,front(.04,.181)+.014],[.075,.205,front(.075,.205)+.01]],.012,lip,14);
  tube(mouth,[[-.04,.166,front(-.04,.166)+.008],[0,.158,front(0,.158)+.009],[.04,.166,front(.04,.166)+.008]],.010,blush,8);
  var eyes=[];
  [-1,1].forEach(function(s){var x=s*.15,y=.435,z=front(x,y),eg=group(head,'eye',x,y,0);eyes.push(eg);
   oval(eg,white,0,0,z+.004,.092,.070,.027);
   oval(eg,iris,-s*.004,0,z+.028,.043,.049,.012);
   oval(eg,dark,-s*.004,.002,z+.039,.022,.033,.007);
   oval(eg,white,-.016,.022,z+.046,.013,.015,.005);oval(eg,white,.014,-.018,z+.045,.006,.007,.003);
   var upper=[],lower=[];for(var i=0;i<=10;i++){var a=Math.PI*i/10,ex=-.094*Math.cos(a),ey=.069*Math.sin(a);upper.push([ex,ey,z+.005+.012*Math.sin(a)]);lower.push([ex,-ey,z+.002]);}
   tube(eg,upper,.016,skin,10);tube(eg,lower,.010,skin,10);
  });

  // Durchgehende Haarkappe mit seitlichem Scheitel und fließendem Haaransatz.
  var covered=style===0||style===3||style===7;
  function hairShell(cap){var p=[],idx=[],cols=n,rows=coarse?8:12;
   for(var i=0;i<=rows;i++)for(var j=0;j<=cols;j++){var theta=j/cols*Math.PI*2,c=Math.cos(theta),frontness=Math.max(0,c),end;
    if(cap)end=1.25;else{end=1.88-(frontness*.57)+.15*Math.sin(theta+1.0)*frontness;
     if(female&&(hs===2||hs===3))end+=(hs===2?.78:.42)*(1-frontness);if(covered)end=Math.min(end,1.95);}
    var phi=i/rows*end,x=.435*Math.sin(phi)*Math.sin(theta),y=.435+.455*Math.cos(phi),z=-.035+.345*Math.sin(phi)*c;
    if(!cap&&female&&hs===2&&i>rows*.65)y-=(1-frontness)*.14*(i/rows-.65)/.35;
    // Haaransatz liegt vor der Kopfoberfläche, auch bei langem Haar/Bob.
    if(!cap&&y>0&&y<.84){var section=profile(faceRows,y);if(Math.abs(x)<section[1]){var depth=section[2]*Math.sqrt(Math.max(0,1-x*x/(section[1]*section[1])));z=c>=0?Math.max(z,depth+.024):Math.min(z,-depth-.024);}}
    p.push(x,y,z);if(i<rows&&j<cols){var a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}}
   var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();smoothSeam(geo,cols,rows+1);return geo;}
  add(head,hairShell(false),hair);
  if(female&&hs===0){[-1,1].forEach(function(s){tube(head,[[s*.32,.43,-.09],[s*.42,.24,-.10],[s*.42,.07,-.06],[s*.37,-.035,-.02]],.095,hair,12);oval(head,trim,s*.39,.29,-.08,.105,.030,.105);});}
  if(female&&hs===1){tube(head,[[0,.59,-.27],[.03,.38,-.39],[.05,.10,-.39],[.015,-.08,-.29]],.12,hair,14);oval(head,trim,0,.52,-.33,.12,.035,.09);}
  if(female&&hs===4&&!covered)oval(head,hair,0,.85,-.08,.145,.13,.13);
  if(style===0){add(head,hairShell(true),cloth,0,.025,0,1.035,1.02,1.035);
   add(head,loft([[.565,0,0,.24],[.57,.43,.22,.24],[.60,.425,.215,.24],[.605,0,0,.24]],n),trim);
   oval(head,white,0,.71,.28,.052,.044,.01);
  }else if(style===7){add(head,hairShell(true),pants,0,.045,0,1.08,1.15,1.08);tube(head,[[-.37,.58,.12],[-.25,.56,.27],[0,.55,.33],[.25,.56,.27],[.37,.58,.12]],.045,pants,16);oval(head,hair,0,.98,-.03,.10,.10,.10);
  }else if(style===3){add(head,loft([[.70,0,0],[.705,.51,.39],[.75,.51,.39],[.755,.30,.255],[.99,.28,.24],[1.0,0,0]],n),material(0x704d36));add(head,loft([[.77,.307,.263],[.83,.30,.258]],n),cloth);
  }else if(style===4){add(head,loft([[.76,.35,.29],[.85,.35,.29]],n),gold);for(var i=0;i<7;i++){var a=i*Math.PI*2/7;add(head,new T.ConeGeometry(.055,.17,5),gold,Math.sin(a)*.33,.91,Math.cos(a)*.27);}
  }else if(style===1){for(var i=0;i<9;i++){var a=i*Math.PI*2/9;oval(head,i%2?white:cloth,Math.sin(a)*.36,.72,Math.cos(a)*.29,.054,.045,.054);}
  }else if(style===2||style===6){[-1,1].forEach(function(s){var z=front(s*.15,.435)+.062;add(head,new T.TorusGeometry(.098,.014,5,16),dark,s*.15,.435,z,1,.83,1);if(style===6)oval(head,dark,s*.15,.435,z,.09,.072,.008);});tube(head,[[-.053,.45,.35],[0,.46,.37],[.053,.45,.35]],.012,dark,6);
  }else if(style===5){tube(head,[[-.42,.38,0],[-.43,.7,0],[0,.92,0],[.43,.7,0],[.42,.38,0]],.035,dark,20);[-1,1].forEach(function(s){oval(head,trim,s*.425,.38,0,.06,.13,.11);oval(head,cloth,s*.468,.38,.01,.025,.09,.075);});
  }else if(style===8){[-1,1].forEach(function(s){oval(head,cloth,.34+s*.055,.62,.13,.077,.050,.035);});oval(head,gold,.34,.62,.16,.030,.035,.025);}

  // Je Material/Rigteil ein Mesh, niemals über Gelenke oder Augen-Pivots hinweg.
  function batch(g){var buckets=new Map();g.children.slice().forEach(function(m){if(!m.isMesh)return;m.updateMatrix();var geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);var key=m.material.uuid+'|'+!!geo.attributes.color;
    if(!buckets.has(key))buckets.set(key,{material:m.material,geometries:[],name:m.name});buckets.get(key).geometries.push(geo);g.remove(m);m.geometry.dispose();});
   var result=[];buckets.forEach(function(b){var pos=[],norm=[],uv=[],colors=[],hasColor=!!b.geometries[0].attributes.color;
    b.geometries.forEach(function(geo){var a=geo.attributes;pos.push.apply(pos,a.position.array);norm.push.apply(norm,a.normal.array);if(a.uv)uv.push.apply(uv,a.uv.array);else for(var i=0;i<a.position.count;i++)uv.push(0,0);if(hasColor)colors.push.apply(colors,a.color.array);geo.dispose();});
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(hasColor)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeBoundingBox();geo.computeBoundingSphere();
    var m=new T.Mesh(geo,b.material);m.name=b.name||'merged';m.castShadow=true;m.receiveShadow=true;g.add(m);result.push(m);});return result;}
  rig.forEach(batch);var headMeshes=batch(head);batch(root);
  root.userData={characterArt:true,cfg:cfg,headGroup:head,head:headMeshes.find(function(m){return m.material===faceMat;}),mouth:mouth,eyes:eyes,eyeOpen:1,
   hairMat:hair,hairBaseHex:hairHex,limbs:{ll:ll,rl:rl,la:la,ra:ra},walk:0,blinkT:2.6,
   ageScale:1,ageScaleT:1,headScale:1,headScaleT:1,headStoop:0,headStoopT:0,headBase:.96,tallY:1.1,slimX:.96};
  head.scale.setScalar(.96);root.scale.set(.96,1.1,.96);
  return root;
 };
})(typeof window!=='undefined'?window:globalThis);
