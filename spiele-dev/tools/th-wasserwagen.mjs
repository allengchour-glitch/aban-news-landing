/* 🌊🚗 FAEHRT EIN WAGEN UEBER WASSER?
   Gesehen 2026-09-05 auf spiele-dev/screenshots/r59/landstrasse-tag.png: zwei Autos
   schwimmen im offenen Meer, ohne Fahrbahn darunter. Der Grund steht im Quelltext —
   die Landstrasse spart den Meer-Sektor bewusst aus (Bogen 126..234 Grad), die
   Ring-Routen fahren aber den vollen Kreis.

   Gemessen wird nicht die Formel, sondern das Bild: von jedem Wagen aus ein Strahl
   nach unten. Trifft er Asphalt (4a4a53) oder Mittelstreifen (d8d8cc), steht der
   Wagen auf einer Strasse. Trifft er nur Wasser oder nichts, faehrt er darueber.
   So faellt die Pruefung auch dann richtig aus, wenn die Luecke spaeter anders
   geschlossen wird als heute gedacht (Damm, Bruecke, umgeleitete Route). */
import { spielOeffnen, mitSonden, warteWeltzeit } from './th-lib.mjs'

const datei = mitSonden('traumhaus.html', {
  uhr: 'function(){return uhrzeit;}',   /* sonst wartet warteWeltzeit nach der Wanduhr */
  ueberWasser: 'function(){' +
    'var rc=new THREE.Raycaster(),ab=new THREE.Vector3(0,-1,0),res=[];' +
    /* ⚠️ Sprites brauchen eine Kamera. THREE.Sprite.raycast greift auf
       raycaster.camera.matrixWorld zu; ohne gesetzte Kamera bricht der erste
       Strahl mit "Cannot read properties of null" ab — nicht der Wagen ist
       schuld, sondern irgendein Sprite irgendwo in der Szene. */
    'if(typeof camera!=="undefined")rc.camera=camera;' +
    'verkehr.forEach(function(v,i){var p=v.mesh.position;' +
      'rc.set(new THREE.Vector3(p.x,6,p.z),ab);' +
      'var tr=rc.intersectObjects(scene.children,true),str=false,wa=false;' +
      'for(var h=0;h<tr.length;h++){var o=tr[h].object;' +
        'if(!o.isMesh||!o.material||o===v.mesh)continue;' +
        'var m=Array.isArray(o.material)?o.material[0]:o.material;if(!m||!m.color)continue;' +
        'var c=m.color.getHexString();' +
        'if(tr[h].point.y<1.2&&/^4a4a5|^d8d8cc|^6b6b7/.test(c))str=true;' +
        'if(/^2e6f9e|^1f6bb0|^2c6a8e/.test(c))wa=true;}' +
      'if(!str)res.push({i:i,x:Math.round(p.x),z:Math.round(p.z),wasser:wa,' +
        'achse:(v.route&&v.route.axis)||"?"});});' +
    'return res;}'
}, '_wasserwagen.html')

const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 55000 })

/* Ueber mehrere Proben schauen: ein Wagen braucht eine Weile, bis er den
   Meer-Sektor erreicht — eine einzige Momentaufnahme wuerde ihn verpassen. */
const alle = []
for (let k = 0; k < 8; k++) {
  alle.push(...await page.evaluate(() => window.__th.ueberWasser()))
  await warteWeltzeit(page, 2.0, { maxWanduhr: 45 })
}
const schwimmer = alle.filter(v => v.wasser)
const ohneStrasse = alle.filter(v => !v.wasser)

console.log('\n🌊 Wagen ueber Wasser (8 Proben): ' + schwimmer.length)
for (const s of schwimmer.slice(0, 10)) console.log('   Wagen ' + s.i + ' bei x' + s.x + ' z' + s.z + ' (' + s.achse + ')')
console.log('🕳️  Wagen ohne Fahrbahn, aber auch ohne Wasser: ' + ohneStrasse.length +
  (ohneStrasse.length ? ' — z. B. ' + JSON.stringify(ohneStrasse.slice(0, 3)) : ''))
console.log('JS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
console.log(schwimmer.length ? '\n❌ WASSERWAGEN: ' + schwimmer.length + ' Sichtungen ueber Wasser'
                             : '\n🎉 WASSERWAGEN BESTANDEN — kein Wagen faehrt ueber Wasser')
await browser.close()
process.exit(schwimmer.length ? 1 : 0)
