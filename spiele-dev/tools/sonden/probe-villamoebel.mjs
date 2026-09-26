/* Sonde (Runde 101): passen die Moebel der Villa-Vorlage in ihre Zimmer?
   Stempelt die Villa (stampVilla), wartet auf alle Modelle und prueft je Moebel die Huellbox (Grundriss):
     in Wand   — schneidet eine Wand (Wandkante = Zellkante, 16 cm dick; 3 cm Toleranz)
     in Moebel — ueberlappt ein anderes Moebel um mehr als 0,05 m²
     ausser    — ragt mehr als 0,3 m ueber die eigene Belegung (furnCells) hinaus
   Gegenprobe: ein freies Moebel wird um 1,5|1,5 m verschoben und muss gemeldet werden (Wand, Moebel oder ragt).
   Aufruf: node spiele-dev/tools/sonden/probe-villamoebel.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_villamoebel_tmp.html'
mitSonden('traumhaus.html', {
  vmSetzen: `function(){geld=999999;var n0=furn.length;stampVilla();return furn.length-n0;}`,
  vmMessen: `function(schiebeFid){var offen=0,M=[];
    furn.forEach(function(f){if(!f.gratis)return;if(!f.mesh){offen++;return;}
      if(schiebeFid===f.fid){f.mesh.position.x+=1.5;f.mesh.position.z+=1.5;f.mesh.updateMatrix();}
      f.mesh.updateMatrixWorld(true);var bb=new THREE.Box3().setFromObject(f.mesh);
      var cs=furnCells(f),x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      cs.forEach(function(c){x0=Math.min(x0,cx(c[0])-CS/2);x1=Math.max(x1,cx(c[0])+CS/2);z0=Math.min(z0,cz(c[1])-CS/2);z1=Math.max(z1,cz(c[1])+CS/2);});
      M.push({f:f,a:[bb.min.x+0.03,bb.max.x-0.03,bb.min.z+0.03,bb.max.z-0.03],
        ue:Math.max(x0-bb.min.x,bb.max.x-x1,z0-bb.min.z,bb.max.z-z1,0)});});
    if(offen)return {offen:offen};
    var W=[];for(var k in walls){if(!walls[k])continue;var p=k.split(","),x=+p[0],y=+p[1],d=+p[2];
      if(d===0)W.push([cx(x)-CS/2,cx(x)+CS/2,cz(y)-CS/2-0.08,cz(y)-CS/2+0.08,k]);
      else W.push([cx(x)+CS/2-0.08,cx(x)+CS/2+0.08,cz(y)-CS/2,cz(y)+CS/2,k]);}
    var ov=function(a,b){return Math.max(0,Math.min(a[1],b[1])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[2],b[2]));};
    var out=[];M.forEach(function(m,i){var inW=[],inM=[];
      W.forEach(function(w){if(ov(m.a,w)>0.001)inW.push(w[4]);});
      M.forEach(function(o,j){if(j!==i&&ov(m.a,o.a)>0.05)inM.push(o.f.id);});
      var s=m.f.def.size||[1,1];
      out.push({fid:m.f.fid,id:m.f.id,gx:m.f.gx,gy:m.f.gy,rot:m.f.rot,g:s[0]+"x"+s[1],inW:inW.length,inM:inM,ue:+m.ue.toFixed(2)});});
    return {offen:0,waende:W.length,list:out};}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 30000 })
const n = await page.evaluate(() => window.__th.vmSetzen())
let r
for (let i = 0; i < 40; i++) { await page.waitForTimeout(1500); r = await page.evaluate(() => window.__th.vmMessen()); if (!r.offen) break }
const zeige = (r) => {
  const w = r.list.filter((e) => e.inW), m = r.list.filter((e) => e.inM.length), u = r.list.filter((e) => e.ue > 0.3)
  console.log(`${r.list.length} Moebel · ${r.waende} Wandstuecke · in Wand ${w.length} · in anderem Moebel ${m.length} · ragt > 0,3 m ueber Belegung ${u.length}`)
  for (const e of r.list.filter((e) => e.inW || e.inM.length || e.ue > 0.3))
    console.log(`   ${e.id.padEnd(16)} ${e.g} r${e.rot} (${e.gx}|${e.gy})  Wand ${e.inW}  Moebel [${e.inM.join(', ')}]  ragt ${e.ue} m`)
  return w.length
}
console.log(`Villa gestempelt: ${n} Moebel · JS-Fehler ${jsFehler.length}${r.offen ? ` · ⚠️ ${r.offen} nicht geladen` : ''}`)
const vorher = zeige(r)
/* Gegenprobe: ein freies Moebel (in keiner Wand) um 1,5 m schieben */
const frei = r.list.find((e) => !e.inW && !e.inM.length)
if (frei) {
  const g = await page.evaluate((fid) => window.__th.vmMessen(fid), frei.fid)
  const e2 = g.list.find((e) => e.fid === frei.fid)
  console.log(`Gegenprobe: ${frei.id} um 1,5|1,5 m geschoben → Wand ${e2.inW}, Moebel [${e2.inM.join(', ')}], ragt ${e2.ue} m ${e2.inW || e2.inM.length || e2.ue > 0.3 ? '✓ erkannt' : '✗ NICHT erkannt'}`)
}
await browser.close(); aufraeumen(TMP)
