/* Sonde (Runde 97): liegt eine weisse Fahrbahnmarkierung (Material aus window._markMats) in einem
   Fussgaengerstreifen? Auf einer echten Strasse endet jede Linie vor dem Streifen.
   Streifenflaeche je Uebergang [x,z,quer,lang,hb]: Gehrichtung p ±hb, quer dazu ±lang/2.
   Geprueft werden einzelne Meshes (Weltkasten) und Instanzen (Mittelpunkt + halbe Ausdehnung).
   GEGENPROBE: zwei kuenstliche, unsichtbar geschaltete Striche (Uebergang 0 und der letzte) muessen als Treffer erscheinen. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_strichzeb_tmp.html'
mitSonden(quelle, {
  messen: `function(gegen){var U=window._uebergaenge||[],M=window._markMats||[],out=[];
    /* zwei kuenstliche Striche: Uebergang 0 (nah) und der letzte (weit draussen, dort blendet die Sichtweite aus) */
    if(gegen)[0,U.length-1].forEach(function(i){if(!U[i])return;var g=new THREE.Mesh(new THREE.PlaneGeometry(3,0.15),M[0]);g.rotation.x=-Math.PI/2;g.position.set(U[i][0],0.005,U[i][1]);g.name="GEGENPROBE";g.visible=false;scene.add(g);});
    scene.updateMatrixWorld(true);
    function treffer(cx,cz,ex,ez){for(var i=0;i<U.length;i++){var u=U[i],px=u[2]?0:1,pz=u[2]?1:0;
        var dp=(cx-u[0])*px+(cz-u[1])*pz,dq=(cx-u[0])*pz-(cz-u[1])*px;
        var ep=ex*px+ez*pz,eq=ex*pz+ez*px;             /* halbe Ausdehnung in p/q */
        if(Math.abs(dp)<u[4]-0.3+ep&&Math.abs(dq)<u[3]/2+eq-0.05)return i;}return -1;}
    var bx=new THREE.Box3(),m4=new THREE.Matrix4(),v=new THREE.Vector3(),s=new THREE.Vector3(),q=new THREE.Quaternion();
    /* ⚠️ NICHT nach o.visible filtern: die Sichtweiten-Pflege (_vdListe) schaltet alles Ferne unsichtbar —
       im ersten Lauf fehlten darum alle Viertel (Bild k31-t-gegenueber zeigte den Strich trotzdem).
       Ausgenommen ist nur, was das Spiel selbst dauerhaft entfernt hat (kein parent). */
    scene.traverse(function(o){if(!o.isMesh||!o.parent)return;var mt=Array.isArray(o.material)?o.material[0]:o.material;
      if(M.indexOf(mt)<0)return;
      if(o.isInstancedMesh){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();var gb=o.geometry.boundingBox;
        for(var k=0;k<o.count;k++){o.getMatrixAt(k,m4);m4.premultiply(o.matrixWorld);m4.decompose(v,q,s);if(s.x<1e-4&&s.z<1e-4)continue;
          var b2=gb.clone().applyMatrix4(m4);if(b2.max.y>0.2)continue;
          var ex=(b2.max.x-b2.min.x)/2,ez=(b2.max.z-b2.min.z)/2,i=treffer((b2.min.x+b2.max.x)/2,(b2.min.z+b2.max.z)/2,ex,ez);
          if(i>=0)out.push(["inst",o.name||"",+((b2.min.x+b2.max.x)/2).toFixed(1),+((b2.min.z+b2.max.z)/2).toFixed(1),+(2*ex).toFixed(1),+(2*ez).toFixed(1),i]);}
        return;}
      bx.setFromObject(o);if(bx.isEmpty()||bx.max.y>0.2)return;
      var ex=(bx.max.x-bx.min.x)/2,ez=(bx.max.z-bx.min.z)/2,i=treffer((bx.min.x+bx.max.x)/2,(bx.min.z+bx.max.z)/2,ex,ez);
      if(i>=0)out.push(["mesh",o.name||"",+((bx.min.x+bx.max.x)/2).toFixed(1),+((bx.min.z+bx.max.z)/2).toFixed(1),+(2*ex).toFixed(1),+(2*ez).toFixed(1),i]);});
    return {u:U.length,out:out};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(8000)
const r = await page.evaluate(() => window.__th.messen(false))
const g = await page.evaluate(() => window.__th.messen(true))
await browser.close(); aufraeumen(TMP)
console.log(`${r.u} Uebergaenge · Markierungen im Streifen: ${r.out.length}`)
for (const e of r.out) console.log('   ', JSON.stringify(e), '[art,name,x,z,breite x,breite z,Uebergang]')
const gp = g.out.filter((e) => e[1] === 'GEGENPROBE').length
console.log(`GEGENPROBE (2 kuenstliche, unsichtbar geschaltete Striche: Uebergang 0 und ${r.u - 1}): ${gp}/2 ${gp === 2 ? 'erkannt ✓' : 'NICHT erkannt ✗ — Messgeraet kaputt'}`)
