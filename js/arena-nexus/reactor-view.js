/* Wiederverwendete Geometrie: keine neuen GPU-Objekte pro Treffer oder Neustart. */
(function(root){
  "use strict";
  root.createArenaReactorView=function(THREE,scene){
    var group=new THREE.Group();
    function mesh(geometry,color,y){var m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:color,emissive:color,emissiveIntensity:0.3,metalness:0.55,roughness:0.4}));m.position.y=y;group.add(m);return m;}
    mesh(new THREE.CylinderGeometry(3.1,3.5,0.45,12),0x203455,0.23);
    var core=mesh(new THREE.IcosahedronGeometry(1.35,1),0x5ef2ff,2.3);
    var ring=mesh(new THREE.TorusGeometry(2.15,0.15,6,32),0x5ef2ff,2.3);ring.rotation.x=Math.PI/2;
    for(var i=0;i<4;i++){var post=mesh(new THREE.CylinderGeometry(0.22,0.36,2.4,6),0x597fa0,1.2);post.position.x=Math.cos(i*Math.PI/2)*2.6;post.position.z=Math.sin(i*Math.PI/2)*2.6;}
    scene.add(group);
    var fill=document.getElementById("reactorFill"),status=document.getElementById("reactorStatus"),nav=document.getElementById("reactorNav"),panel=document.getElementById("reactorPanel");
    return {group:group,update:function(r,t,position,hit,finalBoss,role){
      var ratio=r.hp/r.maxhp,color=r.hp<=0?0x474957:ratio<=0.3?0xff5555:ratio<=0.6?0xffc65e:0x5ef2ff;
      core.material.color.setHex(color);core.material.emissive.setHex(color);ring.material.color.setHex(color);ring.material.emissive.setHex(color);
      core.material.emissiveIntensity=hit?0.9:0.28;core.rotation.y=t*0.5;ring.rotation.z=-t*0.4;
      core.position.y=2.3+Math.sin(t*(ratio<=0.3?7:2))*0.12;
      fill.style.width=(ratio*100)+"%";panel.dataset.state=r.hp<=0?"lost":ratio<=0.3?"critical":ratio<=0.6?"damaged":"stable";
      status.textContent="REAKTOR "+Math.ceil(r.hp)+" / "+r.maxhp+" · "+(r.outcome==="win"?"GESICHERT":r.hp<=0?"ZERSTÖRT":hit?"UNTER ANGRIFF":ratio<=0.3?"KRITISCH":ratio<=0.6?"BESCHÄDIGT":"STABIL");
      var distance=Math.round(Math.hypot(position.x,position.z));
      var arrows=["↑","↗","→","↘","↓","↙","←","↖"];
      var arrow=arrows[(Math.round(Math.atan2(-position.x,position.z)/(Math.PI/4))+8)%8];
      nav.textContent=(distance>6?arrow+" "+distance+" m zur Mitte · ":"")+(finalBoss?"NEXUS besiegen · Reaktor halten":role==="client"?"Reparatur & Bau beim Host":"Schrott: Reparatur oder Verteidigung");
    }};
  };
})(window);
