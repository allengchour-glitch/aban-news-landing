/* Sichtfeldfilter fuer ausdruecklich registrierte, statische Instanzgruppen. */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TraumSicht=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create(T){
    var entries=[],known=new WeakMap(),hidden=[],frustum=new T.Frustum(),projection=new T.Matrix4();
    var matrix=new T.Matrix4(),part=new T.Box3(),whole=new T.Box3(),worldSphere=new T.Sphere();
    function moving(m){for(var p=m;p;p=p.parent)if(p._bewegt||p.isSkinnedMesh||(p.userData&&p.userData.animiert))return true;return false;}
    function bounds(e){
      var m=e.mesh,g=m.geometry,position=g.attributes.position;
      if(e.geometry===g&&e.version===m.instanceMatrix.version&&e.positionVersion===position.version&&e.count===m.count)return;
      /* Keine boundingBox/Sphere an der geteilten Quellgeometrie ueberschreiben. */
      var base=new T.Box3().setFromBufferAttribute(position);whole.makeEmpty();
      for(var i=0;i<m.count;i++){m.getMatrixAt(i,matrix);part.copy(base).applyMatrix4(matrix);whole.union(part);}
      whole.getBoundingSphere(e.sphere);e.sphere.radius+=.15;
      e.geometry=g;e.version=m.instanceMatrix.version;e.positionVersion=position.version;e.count=m.count;
    }
    function add(m){
      if(!m||!m.isInstancedMesh||!m.geometry||!m.geometry.attributes.position||moving(m))return false;
      if(known.has(m))return true;
      var e={mesh:m,sphere:new T.Sphere(),version:-1};bounds(e);entries.push(e);known.set(m,e);return true;
    }
    function end(){for(var i=0;i<hidden.length;i++)hidden[i].visible=true;hidden.length=0;}
    function begin(camera){
      end();camera.updateMatrixWorld(true);
      projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
      for(var i=entries.length-1;i>=0;i--){var e=entries[i],m=e.mesh,attached=false,visible=true;
        for(var p=m;p;p=p.parent){if(!p.visible)visible=false;if(p.isScene)attached=true;}
        if(!attached){known.delete(m);entries.splice(i,1);continue;}
        if(!visible||moving(m))continue;
        bounds(e);if(!Number.isFinite(e.sphere.radius))continue;
        /* Nachladen und eingefrorene Eltern: die Weltlage vor der Pruefung aktualisieren. */
        m.updateWorldMatrix(true,false);worldSphere.copy(e.sphere).applyMatrix4(m.matrixWorld);
        if(!frustum.intersectsSphere(worldSphere)){hidden.push(m);m.visible=false;}
      }
      return hidden.length;
    }
    return {add:add,begin:begin,end:end,count:function(){return entries.length;}};
  }
  return {create:create};
});
