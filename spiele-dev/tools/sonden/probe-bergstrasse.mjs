/* Sonde (Runde 97): liegt das Bergnetz (userData.gelaende) UEBER einer Fahrbahn?
   Strahl von oben an Punkten auf Landstrasse (r 196…204, z < -120), Bauernhof-Anschluss (x 56…64,
   z -100…-250) und Bauernhof-Strasse (z -246, x 20…60). Treffer „verdeckt", wenn das Bergnetz zuerst
   getroffen wird und darunter noch Belag (dunkles Grau #4a4a53-artig) liegt.
   GEGENPROBE: dasselbe mit dem Bergnetz 0,3 m angehoben — dann muss fast alles verdeckt sein. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_bergstrasse_tmp.html'
mitSonden(process.argv[2] || 'traumhaus.html', {
  mess: `function(heben){var berg=null,gr=0;
    /* ⚠️ Es gibt mehrere Netze mit userData.gelaende (Kettenberge) — das erste war nicht der grosse Berg,
       die Gegenprobe blieb stumm. Genommen wird das Netz mit der groessten Grundflaeche (541 m). */
    scene.traverse(function(o){if(!o.isMesh||!o.userData||!o.userData.gelaende)return;var b=new THREE.Box3().setFromObject(o),f=(b.max.x-b.min.x)*(b.max.z-b.min.z);if(f>gr){gr=f;berg=o;}});
    if(!berg)return {fehler:"kein Bergnetz"};var y0=berg.position.y;berg.position.y=y0+heben;berg.updateMatrix();berg.updateMatrixWorld(true);   /* updateMatrix: statische Netze haben matrixAutoUpdate aus — die Gegenprobe bewegte sonst nichts */
    var L=[];scene.traverse(function(o){if((o.isMesh||o.isInstancedMesh)&&!o.isSprite&&o.geometry)L.push(o);});
    var RC=new THREE.Raycaster();RC.camera=camera;var P=[];
    for(var a=0;a<360;a+=0.5){var w=a*Math.PI/180;for(var r=196;r<=204;r+=2){var x=Math.cos(w)*r,z=Math.sin(w)*r;if(z<-120)P.push([x,z,"Landstrasse"]);}}
    for(var z2=-100;z2>=-250;z2-=1)for(var x2=56;x2<=64;x2+=2)P.push([x2,z2,"Anschluss x60"]);
    for(var x3=20;x3<=60;x3+=1)for(var z3=-250;z3<=-242;z3+=2)P.push([x3,z3,"Strasse z-246"]);
    var n=0,verd=[],bel=0;
    P.forEach(function(p){RC.set(new THREE.Vector3(p[0],3,p[1]),new THREE.Vector3(0,-1,0));RC.far=4;
      var H=RC.intersectObjects(L,false);var iB=-1,iS=-1;
      H.forEach(function(h,i){var o=h.object;if(o===berg){if(iB<0)iB=i;return;}
        var m=Array.isArray(o.material)?o.material[0]:o.material;if(!m||!m.color)return;
        var c=m.color,hx=c.getHex();var g=(c.r+c.g+c.b)/3;
        if(iS<0&&Math.abs(c.r-c.g)<0.06&&Math.abs(c.g-c.b)<0.08&&g>0.2&&g<0.4&&h.point.y<0.02)iS=i;});
      if(iS<0)return;bel++;if(iB>=0&&iB<iS){n++;verd.push([+p[0].toFixed(1),+p[1].toFixed(1),p[2],+H[iB].point.y.toFixed(3),+H[iS].point.y.toFixed(3)]);}});
    berg.position.y=y0;berg.updateMatrix();berg.updateMatrixWorld(true);
    return {punkte:P.length,belag:bel,verdeckt:n,liste:verd};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(6000)
const r = await page.evaluate(() => window.__th.mess(0))
const g = await page.evaluate(() => window.__th.mess(0.3))
await browser.close(); aufraeumen(TMP)
if (r.fehler) { console.log(r.fehler); process.exit(1) }
console.log(`Punkte ${r.punkte} · mit Belag darunter ${r.belag} · vom Bergnetz verdeckt ${r.verdeckt}`)
const grp = {}; for (const e of r.liste) (grp[e[2]] = grp[e[2]] || []).push(e)
for (const [k, v] of Object.entries(grp)) { console.log(`  ${k}: ${v.length}  z.B.`, v.slice(0, 6).map((e) => `(${e[0]}|${e[1]}) Berg ${e[3]} Belag ${e[4]}`).join('  ')) }
console.log(`GEGENPROBE (Bergnetz +0,3 m): verdeckt ${g.verdeckt} von ${g.belag} ${g.verdeckt > g.belag * 0.5 ? '✓ Messgeraet schlaegt an' : '✗ Messgeraet stumm'}`)
