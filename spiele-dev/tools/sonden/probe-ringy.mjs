/* Sonde: Hoehe (y) der Belaege an Ring, Zubringer-Muendung, Hauptstrasse — alle Treffer eines Strahls. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_ringy_tmp.html'
mitSonden('traumhaus.html', {
  ringy: `function(){
    var RC=new THREE.Raycaster(),DN=new THREE.Vector3(0,-1,0),O=new THREE.Vector3();RC.camera=camera;
    var L=[];scene.traverse(function(o){if(o.isMesh&&o.visible)L.push(o);});
    function alle(x,z){O.set(x,2,z);RC.set(O,DN);RC.far=3;var H=RC.intersectObjects(L,false),r=[];
      for(var i=0;i<H.length;i++){var h=H[i];if(!h.face)continue;var m=h.object.material;var c=m&&m.color?"#"+m.color.getHexString():"-";
        r.push([+h.point.y.toFixed(4),h.object.geometry.type,c,(h.object.name||""),m&&m.transparent?"T":""]);if(r.length>5)break;}
      return r;}
    var P={"Ring-Nord Mitte (0|-100)":[0,-100],"Ring-Nord Aussenspur (0|-102.5)":[0,-102.5],"Ring-Ost (112|0)":[112,0],"Ring-Sued (0|118)":[0,118],"Ring-West (-112|0)":[-112,0],
           "Muendung 300 im Ring (57.7|-101)":[57.7,-101],"Muendung 300 Aussenkante (60.3|-104.5)":[60.3,-104.5],"Zubringer 300 (64.7|-112)":[64.7,-112],
           "Muendung 30 im Ring (113|65.2)":[113,65.2],"Hauptstrasse Sued (0|58)":[0,58],"Querstrasse Ost (78|0)":[78,0],"Wiese (30|-80)":[30,-80]};
    var out={};for(var k in P)out[k]=alle(P[k][0],P[k][1]);return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 65000 })
const r = await page.evaluate(() => window.__th.ringy())
await browser.close(); aufraeumen(TMP)
for (const k in r) console.log(k.padEnd(40), JSON.stringify(r[k]))
