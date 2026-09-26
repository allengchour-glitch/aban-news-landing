/* Sonde (Runde 101): WAS steht in einem Rechteck — jedes Objekt direkt in der Szene, dessen Huellbox
   den Ausschnitt schneidet, mit Datei/Name, Lage, Drehung, Groesse und Merkmalen (fest, bewegt, Verkehr).
   Anders als th-umfeld (nur _gebaeude + flache Boeden) sieht diese Sonde ALLES: Autos, Moebel, Deko.
   Aufruf: node spiele-dev/tools/sonden/probe-wasda.mjs <x0> <z0> <x1> <z1> [warteSekunden] */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const [x0, z0, x1, z1, w = 20] = process.argv.slice(2).map(Number)
if ([x0, z0, x1, z1].some(isNaN)) { console.log('Aufruf: probe-wasda.mjs <x0> <z0> <x1> <z1> [warteSekunden]'); process.exit(1) }
const TMP = '_probe_wasda_tmp.html'
mitSonden('traumhaus.html', {
  wasda: `function(X0,Z0,X1,Z1){
    /* Entfernungs-Ausblendung (lodTakt, _lodM) und Gruppen-Sichtpruefung (_gsAus) schalten Teile fern der Figur
       bzw. ausserhalb des Blickfelds unsichtbar — sie stehen trotzdem da.
       Ohne das fehlten Trinkbrunnen, Bank und Vogeltraenke mitten im Bahnhof-Parkplatz (Runde 101). */
    var _lodAn=[];scene.traverse(function(n){if((n._lodM||n._gsAus)&&!n.visible){n.visible=true;_lodAn.push(n);}});var bb=new THREE.Box3(),s=new THREE.Vector3(),out=[];
    scene.children.forEach(function(o){if(o.isLight||o.isCamera||!o.visible)return;
      o.updateMatrixWorld(true);bb.setFromObject(o);if(bb.isEmpty())return;bb.getSize(s);
      if(Math.max(s.x,s.z)>60)return;
      if(bb.max.x<X0||bb.min.x>X1||bb.max.z<Z0||bb.min.z>Z1)return;
      var u=o.userData||{},m=[];["fest","animiert","nieAusblenden","zf","verkehr","modellTraeger"].forEach(function(k){if(u[k])m.push(k);});
      if(o._bewegt)m.push("bewegt");
      var nm=u.datei||o.name||"";if(!nm){var c=o;while(c&&c.children&&c.children.length===1&&!nm){c=c.children[0];nm=(c.userData&&c.userData.datei)||c.name||"";}}
      if(!nm&&o.children.length){nm=o.type+"["+o.children.slice(0,4).map(function(k){var g=k.geometry;return (k.name||(g&&g.type)||k.type).replace("Geometry","")+(k.material&&k.material.color?"#"+k.material.color.getHexString():"");}).join(" ")+"]";}
      out.push({n:nm||(o.type+"/"+o.children.length),x:+o.position.x.toFixed(1),z:+o.position.z.toFixed(1),ry:+(o.rotation.y*180/Math.PI).toFixed(0),
        box:[+bb.min.x.toFixed(1),+bb.min.z.toFixed(1),+bb.max.x.toFixed(1),+bb.max.z.toFixed(1)],h:+s.y.toFixed(2),m:m.join(",")});});
    _lodAn.forEach(function(n){n.visible=false;});
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(w * 1000)
const r = await page.evaluate((a) => window.__th.wasda(...a), [x0, z0, x1, z1])
await browser.close(); aufraeumen(TMP)
r.sort((a, b) => b.h - a.h)
console.log(`${r.length} Objekte in x ${x0}…${x1} · z ${z0}…${z1}`)
for (const e of r) console.log(`  ${String(e.n).slice(0, 34).padEnd(34)} (${e.x}|${e.z}) ry ${e.ry}°  box x ${e.box[0]}…${e.box[2]} z ${e.box[1]}…${e.box[3]}  h ${e.h}  ${e.m}`)
