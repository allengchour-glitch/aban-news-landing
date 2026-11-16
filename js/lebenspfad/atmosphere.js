(function (global) {
  'use strict';

  // Lokale Art Direction: lineares Licht/Himmel; r128-Nebel erwartet Ausgabefarben.
  // Kein Spielzufall, keine Textur, keine zusätzlichen Lichter/Renderpässe.
  var PALETTES = [
    [0x76a9c2, 0xcbd8cf, 0xffefd8, 0xc5dded, 0x65715b, .98],
    [0x79adc3, 0xd1ddd2, 0xffefd8, 0xc9dfec, 0x62745e, .98],
    [0x80aec2, 0xe3dfc8, 0xffebce, 0xcbdde9, 0x73765c, 1.00],
    [0x8bacbd, 0xeadac2, 0xffe5c4, 0xcbd9e5, 0x79705b, 1.00],
    [0x98acbd, 0xecd4ba, 0xffe1bb, 0xcbd7e5, 0x796b59, 1.00],
    [0x9cabbc, 0xe4cdb8, 0xffdfb9, 0xcbd5e5, 0x786657, .96],
    [0x9aa5ba, 0xdfc8b9, 0xffdfbe, 0xcbd4e6, 0x72675e, .94],
    [0x95abc3, 0xe0dce0, 0xffead6, 0xd4e3f5, 0x7c8b9b, .90]
  ];
  global.LPAtmosphere = function (THREE, options) {
    var scene = options.scene, sun = options.sun, hemi = options.hemi;
    var group = new THREE.Group(); group.name = 'lp-atmosphere'; scene.add(group);
    function color(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
    var palettes = PALETTES.map(function (p) {
      return { zenith:color(p[0]), horizon:color(p[1]), sun:color(p[2]),
        sky:color(p[3]), ground:color(p[4]), intensity:p[5] };
    });
    var current = 0, target = palettes[0], disposed = false;
    var sunDirection = new THREE.Vector3(-42, 62, 38).normalize();
    var skyMaterial = new THREE.ShaderMaterial({
      uniforms:{zenith:{value:target.zenith.clone()}, horizon:{value:target.horizon.clone()},
        sunlight:{value:target.sun.clone()}, sunDirection:{value:sunDirection}},
      vertexShader:'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:[
        'uniform vec3 zenith,horizon,sunlight,sunDirection; varying vec3 vDirection;',
        'void main(){vec3 d=normalize(vDirection);',
        'float h=smoothstep(0.0,0.72,max(0.0,d.y));',
        'vec3 sky=mix(horizon,zenith,h);',
        'float facing=dot(d,sunDirection);',
        'sky=mix(sky,sunlight,0.13*smoothstep(0.78,1.0,facing));',
        'sky=mix(sky,sunlight*1.25,smoothstep(0.9995,0.9998,facing));',
        'gl_FragColor=vec4(sky,1.0);',
        '#include <encodings_fragment>',
        '}'
      ].join('\n'), side:THREE.BackSide, depthWrite:false, fog:false, toneMapped:false
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(700,24,12),skyMaterial);
    sky.name='lp-sky'; sky.renderOrder=-2; sky.frustumCulled=false; group.add(sky);
    scene.background=target.horizon.clone().convertLinearToSRGB();
    scene.fog=new THREE.Fog(scene.background.clone(),55,340);

    // Zwei feste, durchgehend geschlossene Bergzüge hinter dem Terrain (z >= -110).
    // Eigene trigonometrische Kontur: unabhängig von Math.random und srand.
    var ridges=[];
    function ridge(z, base, amplitude, tint) {
      var positions=[], colors=[], segments=72, span=1100;
      function top(i) { return base+amplitude*(.48+.23*Math.sin(i*.83)+.19*Math.sin(i*.37+1.4)+.10*Math.cos(i*1.91)); }
      function vertex(x,y,shade) { positions.push(x,y,z); colors.push(shade,shade,shade); }
      for(var i=0;i<segments;i++) {
        var x=-550+i*span/segments, next=x+span/segments, a=top(i), b=top(i+1), mid=(x+next)/2;
        vertex(x,-32,0); vertex(next,-32,0); vertex(mid,(a+b)*.27,.55);
        vertex(x,-32,0); vertex(mid,(a+b)*.27,.55); vertex(x,a,1);
        vertex(mid,(a+b)*.27,.55); vertex(next,-32,0); vertex(next,b,.95);
        vertex(x,a,1); vertex(mid,(a+b)*.27,.55); vertex(next,b,.95);
      }
      var geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      // Höhenverlauf ins Horizontlicht vermeidet eine harte Wand am Bergfuß.
      // Nur Farbmischung, keine Textursamples, Lichter oder transparenten Flächen.
      var material=new THREE.ShaderMaterial({
        uniforms:{horizon:skyMaterial.uniforms.horizon,tint:{value:color(tint)}},
        vertexShader:'varying float vRelief;void main(){vRelief=color.r;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'uniform vec3 horizon,tint;varying float vRelief;void main(){gl_FragColor=vec4(mix(horizon,tint,vRelief),1.0);\n#include <encodings_fragment>\n}',
        vertexColors:true,fog:false,toneMapped:false
      });
      var mesh=new THREE.Mesh(geometry,material);mesh.name='lp-ridge-'+ridges.length;
      group.add(mesh);ridges.push(mesh);
    }
    ridge(-192,47,61,0xaebdcd);
    ridge(-132,22,50,0x6c8794);
    var ridgeColor=color(0x6c8794), farColor=color(0xaebdcd);
    function setChapter(ch) { current=Math.max(0,Math.min(7,ch|0));target=palettes[current]; }
    function update(dt,camera,focus,snap) {
      if(disposed)return;
      var k=snap?1:1-Math.exp(-Math.max(0,dt)*1.1), u=skyMaterial.uniforms;
      u.zenith.value.lerp(target.zenith,k);u.horizon.value.lerp(target.horizon,k);u.sunlight.value.lerp(target.sun,k);
      // r128 mischt fog_fragment NACH encodings_fragment. Hier genau einmal kodieren.
      scene.background.copy(u.horizon.value).convertLinearToSRGB();scene.fog.color.copy(scene.background);
      sun.color.lerp(target.sun,k);sun.intensity+=(target.intensity-sun.intensity)*k;
      hemi.color.lerp(target.sky,k);hemi.groundColor.lerp(target.ground,k);hemi.intensity=.55;
      sun.position.set(focus.x-42,62,focus.z+38);sun.target.position.set(focus.x,0,focus.z);sun.target.updateMatrixWorld();
      sky.position.copy(camera.position);
      ridges[0].material.uniforms.tint.value.copy(farColor).lerp(u.horizon.value,.65);
      ridges[1].material.uniforms.tint.value.copy(ridgeColor).lerp(u.horizon.value,.35);
    }
    function dispose() {
      if(disposed)return;disposed=true;
      group.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
      scene.remove(group);
    }
    return {setChapter:setChapter,update:update,dispose:dispose,group:group,
      stats:{ridgeMeshes:2,ridgeTriangles:576,skyTriangles:528,extraLights:0,textures:0},
      read:function(){return {chapter:current,horizon:scene.fog.color.toArray(),zenith:skyMaterial.uniforms.zenith.value.toArray(),fogNear:scene.fog.near,fogFar:scene.fog.far};}};
  };

  // Exportierte Blender-Objekte: Y-up, Fußboden0, reale Einheiten. Nie blind skalieren.
  // Erst Maße prüfen, dann die fertige Gruppe in die Szene stellen.
  global.LPAtmosphere.placeLandmark = function (THREE, model, site, ground, angle) {
    var box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
    if(box.isEmpty()||![size.x,size.y,size.z].every(Number.isFinite)||size.y<=0)throw new Error('Leeres Kunstobjekt: '+site.key);
    var radius=Math.hypot(size.x,size.z)/2;
    if(radius>site.r-.10)throw new Error('Kunstobjekt größer als Bauplatz: '+site.key);
    var center=box.getCenter(new THREE.Vector3());
    model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box.min.y;
    var root=new THREE.Group();root.name=site.key;root.add(model);
    root.position.set(site.x,ground,site.z);root.rotation.y=angle||0;
    root.userData.lpGround=true;root.userData.lpSiteKey=site.key;
    root.userData.lpArt={radius:radius,size:size.toArray()};
    model.traverse(function(m){if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
      (Array.isArray(m.material)?m.material:[m.material]).forEach(function(mat){if(mat&&mat.isMeshStandardMaterial)mat.envMapIntensity=.3;});});
    return root;
  };
})(typeof window!=='undefined'?window:globalThis);
