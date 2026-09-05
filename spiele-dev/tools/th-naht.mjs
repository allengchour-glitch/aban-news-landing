/* Ist die Naht zwischen Hauptstrasse und Ringschenkel jetzt zu? Halbmeterraster
   ueber alle vier Stellen und ueber die volle Strassenbreite. */
import { spielOeffnen, mitSonden } from './th-lib.mjs'

const datei = mitSonden('traumhaus.html', {
  linie: 'function(z,von,bis,schritt){' +
    'var rc=new THREE.Raycaster(),ab=new THREE.Vector3(0,-1,0),res=[];' +
    'if(typeof camera!=="undefined")rc.camera=camera;' +
    'for(var t=von;t<=bis;t+=schritt){' +
      'rc.set(new THREE.Vector3(t,6,z),ab);' +
      'var tr=rc.intersectObjects(scene.children,true),str=false;' +
      'for(var h=0;h<tr.length;h++){var o=tr[h].object;' +
        'if(!o.isMesh||!o.material)continue;' +
        'var m=Array.isArray(o.material)?o.material[0]:o.material;if(!m||!m.color)continue;' +
        'if(tr[h].point.y>1.2)continue;' +
        'if(/^4a4a5|^d8d8cc/.test(m.color.getHexString()))str=true;}' +
      'res.push(str);}' +
    'return res;}'
}, 'spiele-dev/tools/_naht_probe.html')

const { browser, page } = await spielOeffnen(datei, { warten: 55000 })
let luecken = 0, felder = 0
/* ⚠️ NICHT AUF DER KANTE MESSEN. Die Fahrbahn ist 16 m breit (z = 50…66); ein Strahl
   GENAU auf z=66 oder z=-50 trifft die Flaeche mal und mal nicht. Beim ersten Lauf
   meldeten genau diese zwei Reihen "kein Asphalt" — und zwar auch ueber x 98…102, also
   mitten auf der Hauptstrasse, die nie zur Debatte stand. Das war die Kante, nicht die
   Welt. Es wird darum 1 m innerhalb der Kante gemessen. */
for (const z of [51, 54, 58, 62, 65, -51, -54, -58, -62, -65]) {
  for (const [von, bis] of [[98, 112], [-112, -98]]) {
    const li = await page.evaluate((a) => window.__th.linie(a[0], a[1], a[2], 0.5), [z, von, bis])
    felder += li.length
    const fehl = li.filter(b => !b).length
    luecken += fehl
    if (fehl) console.log('  ❌ z=' + z + ' x ' + von + '…' + bis + ': ' + fehl + ' Punkte ohne Asphalt  ' + li.map(b => b ? '#' : '.').join(''))
  }
}
console.log('\n' + felder + ' Messpunkte ueber alle vier Naehte · ohne Asphalt: ' + luecken)
console.log(luecken ? '❌ NAHT OFFEN' : '🎉 NAHT GESCHLOSSEN')
await browser.close()
process.exit(luecken ? 1 : 0)
