/* th-schild.mjs — steht auf einem Schild wirklich, was draufstehen soll?
 *
 *   node spiele-dev/tools/th-schild.mjs [modell.glb] [zielordner]
 *   (ohne Angabe: th14_neonschild_gross.glb nach /tmp)
 *
 * ⚠️ WOZU DIESES WERKZEUG UEBERHAUPT. Fuer die eine Frage „steht die Schrift da"
 * sind am 2026-09-08 VIER Bildlaeufe nacheinander gescheitert — jedes Mal, weil
 * etwas anderes als der Inhalt gemessen wurde:
 *
 *   1. Blickrichtung geraten → Kamera im Gebaeude, Bild leer.
 *   2. Richtung gelesen, Hoehe vergessen → `__CAM` zielt IMMER auf y = 0,6,
 *      also auf den Boden vor dem Schild.
 *   3. Umfeld „freigestellt" → die Elternkette wieder sichtbar gesetzt und damit
 *      alle Geschwister zurueckgeholt.
 *   4. Eigene Kamera gebaut → `gruppenSicht` hatte die Gruppe langst auf
 *      visible=false gesetzt, weil sie ausserhalb des Sichtkegels der HAUPTkamera
 *      lag. Ergebnis: 0,0 % Schriftpixel bei drei einwandfrei beschrifteten Schildern.
 *
 * DREI ABSCHALTER also, die ein leeres Bild erzeugen, ohne dass an der Welt etwas
 * fehlt: `lodTakt` (haengt am SPIELER), `gruppenSicht` (haengt an der HAUPTkamera)
 * und die Elternkette. Dieses Werkzeug umgeht alle drei: es setzt die Figur an das
 * Schild, schaltet Gruppe und Elternkette unmittelbar vor dem Zeichnen sichtbar und
 * rendert mit einer EIGENEN Kamera 1,6 m frontal vor der Schriftflaeche in ein
 * Render-Ziel.
 *
 * Ausgegeben wird ein Bild UND eine Zahl (Anteil kraeftig farbiger Bildpunkte).
 * Die Zahl beantwortet nur die grobe Frage — 0 % heisst „nichts gezeichnet". Ob die
 * Schrift GUT sitzt, entscheidet das Bild: so kam heraus, dass die Neonroehren quer
 * durch „NACHTCLUB" liefen. Eine Kennzahl haette das nie gezeigt, sie war mit
 * verdeckter Schrift sogar HOEHER (34 % gegen 20 %), weil die Zierde selbst bunt ist.
 */
import { spielOeffnen, mitSonden } from './th-lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'

const datei = mitSonden('traumhaus.html', {
  setzSpieler: 'function(x,z){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;return [s.x,s.z];}',
  frontal: 'function(nr){' +
    'var schilder=[];scene.traverse(function(o){' +
      'if(o.userData&&o.userData.datei===window.__thModell)schilder.push(o);});' +
    'var w=schilder[nr];if(!w)return null;w.updateMatrixWorld(true);' +
    'var fl=null;w.children.forEach(function(c){' +
      'if(!fl&&c.isMesh&&c.geometry&&c.geometry.type==="PlaneGeometry")fl=c;});' +
    'if(!fl)return {fehler:"keine Schriftflaeche"};' +
    'var p=new THREE.Vector3();fl.getWorldPosition(p);' +
    'var n=new THREE.Vector3(0,0,1).applyQuaternion(fl.getWorldQuaternion(new THREE.Quaternion()));' +
    'var S=384,rt=new THREE.WebGLRenderTarget(S,S);' +
    'var cam2=new THREE.PerspectiveCamera(50,1,0.05,60);' +
    'cam2.position.copy(p).add(n.clone().multiplyScalar(1.6));cam2.lookAt(p);' +
    /* ⚠️ gruppenSicht blendet Gruppen aus, die ausserhalb des Sichtkegels der
       HAUPTkamera liegen — eine eigene Kamera nuetzt dann nichts, weil das Schild
       beim Zeichnen schon auf visible=false steht. Direkt vor dem Rendern wieder an. */
    'var q=w;while(q&&q!==scene){q.visible=true;q._gsAus=false;q=q.parent;}' +
    /* ⚠️ UND NACH UNTEN, NICHT NUR NACH OBEN. Bei der Preistafel war kein einziges
       MESH unsichtbar, das Gehaeuse fehlte im Bild trotzdem: versteckt war eine
       ZWISCHENGRUPPE, und die verbirgt ihre Kinder unabhaengig von deren eigener
       Marke. Ein Zaehler, der nur `isMesh` ansieht, meldet dazu seelenruhig „0
       unsichtbar". */
    'w.traverse(function(o){o.visible=true;o._gsAus=false;});' +
    'fl.visible=true;' +
    'var altRT=renderer.getRenderTarget();' +
    'renderer.setRenderTarget(rt);renderer.render(scene,cam2);renderer.setRenderTarget(altRT);' +
    'var buf=new Uint8Array(S*S*4);renderer.readRenderTargetPixels(rt,0,0,S,S,buf);' +
    /* Bild aufbauen (zeilenweise gespiegelt, WebGL liest von unten) */
    'var cv=document.createElement("canvas");cv.width=S;cv.height=S;' +
    'var ctx=cv.getContext("2d"),img=ctx.createImageData(S,S);' +
    'for(var y=0;y<S;y++)for(var x=0;x<S;x++){' +
      'var a=((S-1-y)*S+x)*4,b=(y*S+x)*4;' +
      'img.data[b]=buf[a];img.data[b+1]=buf[a+1];img.data[b+2]=buf[a+2];img.data[b+3]=255;}' +
    'ctx.putImageData(img,0,0);' +
    /* Bunt = Schrift: kraeftige Farbe, deutlich heller als der dunkle Grund */
    'var bunt=0,hell=0;' +
    'for(var i=0;i<S*S;i++){var r=buf[i*4],g=buf[i*4+1],bl=buf[i*4+2];' +
      'var mx=Math.max(r,g,bl),mn=Math.min(r,g,bl);' +
      'if(mx>120&&(mx-mn)>60)bunt++;if(mx>120)hell++;}' +
    'rt.dispose();' +
    'return {bild:cv.toDataURL(),bunt:bunt,hell:hell,gesamt:S*S,' +
            'x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2)};}'
}, 'spiele-dev/tools/_schild_probe.html')

const MODELL = process.argv[2] || 'th14_neonschild_gross.glb'
const ORDNER = process.argv[3] || '/tmp'
mkdirSync(ORDNER, { recursive: true })   /* sonst bricht der erste Aufruf mit ENOENT ab */
const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 40000 })
await page.evaluate((m) => { window.__thModell = m }, MODELL)
console.log('\nSchilder aus ' + MODELL + ':')
for (let nr = 0; nr < 12; nr++) {
  const T = await page.evaluate((v) => window.__th.frontal(v), nr)
  if (!T) break                                     /* kein weiteres Schild dieser Art */
  if (T.fehler) { console.log('  ' + nr + ': ' + T.fehler); continue }
  await page.evaluate((v) => window.__th.setzSpieler(v[0], v[1]), [T.x, T.z])
  await page.waitForTimeout(1200)
  const U = await page.evaluate((v) => window.__th.frontal(v), nr)
  const { bild, ...rest } = U
  const anteil = 100 * rest.bunt / rest.gesamt
  const datei2 = `${ORDNER}/schild-${nr}.png`
  writeFileSync(datei2, Buffer.from(bild.split(',')[1], 'base64'))
  console.log(`  ${nr}: bei ${rest.x}/${rest.z}, Hoehe ${rest.y} m — ` +
    `${anteil.toFixed(1)} % farbige Bildpunkte` + (anteil < 1 ? '  ⚠️ nichts gezeichnet' : '') +
    `  →  ${datei2}`)
}
console.log('\nDie Zahl sagt nur, ob ueberhaupt gezeichnet wurde. Ob die Schrift gut sitzt,')
console.log('sagt das Bild — sie war mit verdeckter Schrift schon einmal HOEHER als ohne.')
console.log('JS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 3)) : 'keine'))
await browser.close()
