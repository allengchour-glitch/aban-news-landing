/* Sonde (Runde 100): kriechen die Schattenkanten, wenn die Kamera wandert? node probe-schattenkriechen.mjs [quelle]
   Rechner-Pfad (Schatten an). Die Kamera STEHT an der Kreuzung (12:00), nur Licht+Ziel werden wie in loop() auf
   eine um 0…20 cm versetzte Kameramitte gesetzt (`_sonneAufKamera`), dann ein Bild. Jeder Bildpunkt, der sich
   dabei aendert, ist Schatten-Kriechen: die Welt steht, die Kamera steht, nur das Schattenraster wandert.
   Gezaehlt wird, wie oft sich das Bild von einem 2-cm-Schritt zum naechsten aendert. Mit Raster springt es nur,
   wenn ein ganzes Texel (11 cm) ueberschritten wird — hoechstens zweimal auf 20 cm. Ohne Raster bei jedem Schritt.
   Gegenprobe: derselbe Lauf mit `ohneRaster` muss anschlagen, sonst misst die Sonde nichts. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_schatten_tmp.html'
mitSonden(quelle, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;window.__th.zeit(12*60);updCam();return renderer.shadowMap.enabled;}`,
  kriech: `function(ohne){var hh=12,dayA=Math.max(0,Math.sin((hh-5.75)/14*Math.PI)),px=Math.cos((hh-5.75)/14*Math.PI)*34,py=4+dayA*36,pz=18;
    var gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,ref=null,R=[],MX=[],x0=camTx,z0=camTz;
    window._vdAus=true;if(typeof _vdAlleFrei==="function")_vdAlleFrei();
    var still=[];scene.traverse(function(o){if(o.visible&&o._bewegt){still.push(o);o.visible=false;}});
    for(var i=0;i<=10;i++){var d=i*0.02;window._sonneAufKamera(x0+d,z0+d*0.5,px,py,pz,ohne);
      renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);var b=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,b);
      if(!ref){ref=b;continue;}var n=0,mx=0;for(var k=0;k<b.length;k+=4){var dd=Math.abs(b[k]-ref[k])+Math.abs(b[k+1]-ref[k+1])+Math.abs(b[k+2]-ref[k+2]);if(dd>mx)mx=dd;if(dd>3)n++;}
      R.push(+(100*n/(w*h)).toFixed(3));MX.push(mx);ref=b;}
    still.forEach(function(o){o.visible=true;});var sc=sun.shadow.camera;
    return {prozent:R,max:MX,texel:+((sc.right-sc.left)/sun.shadow.mapSize.x).toFixed(4)};}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 60000, viewport: { width: 1100, height: 620 }, screen: { width: 1920, height: 1080 } })
await warteAufRuhe(page, { minSekunden: 60 })
let sch; for (let i = 0; i < 3; i++) { sch = await page.evaluate(() => window.__th.kam(78, 58, 44, 0.78, 0.8)); await page.waitForTimeout(1500) }
if (!sch) console.log('⚠️ Schatten sind aus — Handy-Pfad? (screen muss >= 820 sein)')
const mit = await page.evaluate(() => window.__th.kriech(false)), ohne = await page.evaluate(() => window.__th.kriech(true))
console.log(`Texel ${mit.texel} m · Versatz 0…20 cm in 2-cm-Schritten, Anteil Bildpunkte mit Farbsumme-Abweichung > 3 je Schritt (%):`)
console.log(`   mit Raster : ${mit.prozent.join(' · ')}   (groesste Abweichung je Schritt: ${mit.max.join(' ')})`)
console.log(`   ohne Raster: ${ohne.prozent.join(' · ')}   (groesste Abweichung: ${ohne.max.join(' ')})  ← Gegenprobe`)
const sprungM = mit.prozent.filter((v) => v > 0.01).length, sprungO = ohne.prozent.filter((v) => v > 0.01).length
console.log(`Bildwechsel auf 10 Schritte: mit Raster ${sprungM} (Soll <= 2) ${sprungM <= 2 ? '✓' : '✗'} · ohne Raster ${sprungO} ${sprungO >= 5 ? '✓ Gegenprobe schlaegt an' : '✗ MESSGERAET TAUGT NICHT'}`)
console.log('JS-Fehler', jsFehler.length, jsFehler.slice(0, 2))
await browser.close(); aufraeumen(TMP)
