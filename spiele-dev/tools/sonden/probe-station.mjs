/* Sonde: Meshes der Bergstation im LOKALEN Rahmen (Grundriss), plus Terrasse. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_station_tmp.html'
mitSonden('traumhaus.html', {
  station: `function(){
    var out=[],S=window._seilbahn;
    scene.traverse(function(o){var d=o.userData&&o.userData.datei;if(d!=="th26_seilbahn_station.glb")return;
      if(Math.hypot(o.position.x-S.berg.x,o.position.z-S.berg.z)>5)return;
      o.updateMatrixWorld(true);
      var inv=new THREE.Matrix4().copy(o.matrixWorld).invert();
      o.traverse(function(n){if(!n.isMesh||!n.geometry)return;
        n.geometry.computeBoundingBox();var b=n.geometry.boundingBox.clone();
        /* in den Rahmen des Wrappers (o): Ecken transformieren */
        var m=new THREE.Matrix4().multiplyMatrices(inv,n.matrixWorld),lb=new THREE.Box3(),c=new THREE.Vector3();
        for(var k=0;k<8;k++){c.set(k&1?b.max.x:b.min.x,k&2?b.max.y:b.min.y,k&4?b.max.z:b.min.z);c.applyMatrix4(m);lb.expandByPoint(c);}
        var cnt=n.geometry.attributes.position?n.geometry.attributes.position.count:0;
        out.push({name:n.name||"?",tri:cnt,x:[+lb.min.x.toFixed(1),+lb.max.x.toFixed(1)],y:[+lb.min.y.toFixed(1),+lb.max.y.toFixed(1)],z:[+lb.min.z.toFixed(1),+lb.max.z.toFixed(1)]});});});
    return {berg:S.berg,winkel:S.winkel,meshes:out};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 70000 })
const r = await page.evaluate(() => window.__th.station())
await browser.close(); aufraeumen(TMP)
console.log('BERG', JSON.stringify(r.berg), 'winkel', r.winkel)
r.meshes.forEach(m => console.log(m.name.padEnd(30), 'x', m.x.join('..'), ' y', m.y.join('..'), ' z', m.z.join('..'), ' verts', m.tri))
