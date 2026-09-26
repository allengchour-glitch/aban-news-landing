/* Sonde: Kaesten der Bergstations-Modelle + Hoehen an der Bahnhofs-Zufahrt (Ring-Sued innen). */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_berg_tmp.html'
mitSonden('traumhaus.html', {
  berg: `function(){
    var out={objekte:[],huette:window._huette||null,seil:window._seilbahn?{berg:window._seilbahn.berg,winkel:window._seilbahn.winkel,bergy:window._seilbahn.bergy}:null};
    scene.traverse(function(o){var d=o.userData&&o.userData.datei;if(!d||!/th26_/.test(d))return;
      var b=new THREE.Box3().setFromObject(o);
      out.objekte.push({d:d,x:+o.position.x.toFixed(1),z:+o.position.z.toFixed(1),y:+o.position.y.toFixed(1),
        min:[+b.min.x.toFixed(1),+b.min.y.toFixed(1),+b.min.z.toFixed(1)],max:[+b.max.x.toFixed(1),+b.max.y.toFixed(1),+b.max.z.toFixed(1)]});});
    var RC=new THREE.Raycaster(),DN=new THREE.Vector3(0,-1,0),O=new THREE.Vector3();RC.camera=camera;
    var L=[];scene.traverse(function(o){if(o.isMesh&&o.visible&&!(o.material&&o.material.transparent&&o.material.depthWrite===false))L.push(o);});
    function h(x,z){O.set(x,3,z);RC.set(O,DN);RC.far=4;var H=RC.intersectObjects(L,false);
      for(var i=0;i<H.length;i++){if(!H[i].face)continue;var c=H[i].object.material&&H[i].object.material.color;
        return {y:+H[i].point.y.toFixed(3),c:c?"#"+c.getHexString():"-",g:H[i].object.geometry&&H[i].object.geometry.type};}
      return null;}
    out.zufahrt=[];for(var x=3;x<=33;x+=1){out.zufahrt.push({x:x,stein:h(x,113.6),platte:h(x,112.6),innen:h(x,111.6)});}
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 70000 })
const r = await page.evaluate(() => window.__th.berg())
await browser.close(); aufraeumen(TMP)
console.log('SEILBAHN', JSON.stringify(r.seil)); console.log('HUETTE', JSON.stringify(r.huette))
r.objekte.forEach(o => console.log(o.d.padEnd(28), `pos (${o.x}|${o.z}) y ${o.y}`, 'box x', o.min[0], '..', o.max[0], ' z', o.min[2], '..', o.max[2], ' y', o.min[1], '..', o.max[1]))
console.log('\nBAHNHOF-ZUFAHRT (Ring-Sued innen, z 113,6 Stein / 112,6 Platte / 111,6 innen):')
r.zufahrt.forEach(q => console.log(String(q.x).padStart(3), JSON.stringify(q.stein), JSON.stringify(q.platte), JSON.stringify(q.innen)))
