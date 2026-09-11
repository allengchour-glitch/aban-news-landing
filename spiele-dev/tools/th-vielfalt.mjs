/* th-vielfalt.mjs — was steht hundertmal exakt gleich in der Welt?
 *
 *   node spiele-dev/tools/th-vielfalt.mjs [mindestzahl]
 *
 * WARUM: Am Grundstuecksrand standen 588 Hecken-Instanzen mit EINER Groesse und ZWEI
 * Drehungen — im Bild eine Reihe voellig gleicher Kugeln. Das ist der Eindruck, den
 * der User "zu KI-generiert" nennt, und er entsteht nicht aus schlechten Modellen,
 * sondern aus fehlender Streuung. Kein Werkzeug hat danach gefragt.
 *
 * Gemeldet wird jede Gruppe ab `mindestzahl` gleichartiger Dinge mit ihrer Streuung:
 * wie viele verschiedene Groessen und Drehungen kommen darin vor.
 *
 * ⚠️ ZWEI FALLEN, BEIDE HIER SCHON ZUGESCHLAGEN:
 *  1. `mesh.scale` ist die LOKALE Skalierung. Ein Baum ist eine Gruppe; wird die
 *     Gruppe skaliert, bleibt die Kugel darin auf 1 — und 620 verschieden grosse
 *     Baumkronen sehen aus wie 620 gleiche. Gemessen wird die WELT-Skalierung.
 *  2. Eine `InstancedMesh` taucht beim Durchlaufen der Szene nur EINMAL auf. Wer
 *     Objekte zaehlt, sieht die 588er-Hecke als ein einziges Objekt und uebersieht
 *     sie vollstaendig. Ihre Vielfalt steckt in der Matrixliste.
 *
 * ⚠️ NICHT JEDE GLEICHFOERMIGKEIT IST EIN FEHLER. Strassenlaternen, Poller, Schilder
 * und Fahrzeuge sind INDUSTRIEPRODUKTE — die sollen gleich aussehen. Gemeint sind
 * gewachsene Dinge: Hecken, Buesche, Blumen, Steine, Schilf. Die Liste sortiert
 * darum nur; welche Zeile ein Fund ist, entscheidet ein Mensch.
 *
 * ⚠️ UND GENAU DAFUER BRAUCHT DER MENSCH DEN ORT (nachgeruestet 2026-09-08). Die
 * erste Fassung meldete Zeilen wie „261 SphereGeometry|ffe9c0, eine Groesse" — und
 * damit war nichts anzufangen: cremefarbene Kugeln koennen Lampenschirme sein (dann
 * ist Gleichheit richtig) oder Bluetenkoepfe (dann ist sie ein Fund). Ohne Ort ist
 * jede Zeile unentscheidbar, und ein Werkzeug, dessen Ausgabe man nicht entscheiden
 * kann, wird nicht benutzt — dieses lag von seinem Bau bis heute unberuehrt.
 * Jetzt nennt jede Zeile zusaetzlich: den naechsten benannten Ort, die Hoehe ueber
 * Grund und die Ausdehnung der Gruppe. Eine Kugelreihe auf 4 m Hoehe am Seepark ist
 * eine Lampenkette; dieselbe Reihe auf 0,6 m im Wald ist Gebuesch.
 */
import { spielOeffnen, mitSonden } from './th-lib.mjs'

const MIN = Number(process.argv[2] || 20)

const datei = mitSonden('traumhaus.html', {
  vielfalt: 'function(min){var G={},out=[];' +
    'function schluessel(o,m){return (o.geometry.type||"?")+"|"+((m&&m.color)?m.color.getHexString():"-");}' +
    'scene.traverse(function(o){' +
      'if(!o.isMesh||!o.geometry||!o.material)return;' +
      'var m=Array.isArray(o.material)?o.material[0]:o.material;' +
      'var nam=(o.userData&&o.userData.datei)||o.name||(m&&m.name)||"";' +
      'if(o.isInstancedMesh){' +
        'if(o.count<min)return;' +
        'var M=new THREE.Matrix4(),P=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();' +
        'var sk={},dr={};' +
        'var ix0=1e9,ix1=-1e9,iz0=1e9,iz1=-1e9,iy0=1e9,iy1=-1e9,isx=0,isz=0;' +
        'for(var i=0;i<o.count;i++){o.getMatrixAt(i,M);M.decompose(P,Q,S);' +
          'sk[Math.round(S.x*200)+"|"+Math.round(S.y*200)+"|"+Math.round(S.z*200)]=1;' +
          'var e=new THREE.Euler().setFromQuaternion(Q);dr[Math.round(e.y*200)]=1;' +
          /* ⚠️ DER ORT EINER INSTANZ-GRUPPE STEHT NICHT AM CONTAINER. Die erste
             Fassung las o.getWorldPosition() — das ist bei einer InstancedMesh fast
             immer der Ursprung, und die Liste meldete brav "(0|0), Weite 0 m" fuer
             Gruppen, die quer durch die Stadt stehen. Die Lage steckt in denselben
             Matrizen, die hier ohnehin durchlaufen werden. */
          'isx+=P.x;isz+=P.z;' +
          'if(P.x<ix0)ix0=P.x;if(P.x>ix1)ix1=P.x;' +
          'if(P.z<iz0)iz0=P.z;if(P.z>iz1)iz1=P.z;' +
          'if(P.y<iy0)iy0=P.y;if(P.y>iy1)iy1=P.y;}' +
        'var imx=isx/o.count,imz=isz/o.count;' +
        'out.push({n:o.count,art:"Instanzen",name:nam||schluessel(o,m),' +
          'groessen:Object.keys(sk).length,drehungen:Object.keys(dr).length,' +
          'ort:_naechsterOrt(imx,imz),x:Math.round(imx),z:Math.round(imz),' +
          'yMin:+iy0.toFixed(1),yMax:+iy1.toFixed(1),' +
          'weite:Math.round(Math.max(ix1-ix0,iz1-iz0))});return;}' +
      /* Einzelmeshes nach Geometrie + Farbe buendeln — die Welt-Matrix zaehlt. */
      'var k=schluessel(o,m)+"|"+nam;' +
      'if(!G[k])G[k]={n:0,name:nam,art:"Einzelteile",sk:{},dr:{},bsp:schluessel(o,m),' +
        'sx:0,sz:0,x0:1e9,x1:-1e9,z0:1e9,z1:-1e9,y0:1e9,y1:-1e9};' +
      'var q=G[k];q.n++;' +
      'var WP=new THREE.Vector3(),WS=new THREE.Vector3(),WQ=new THREE.Quaternion();' +
      'o.matrixWorld.decompose(WP,WQ,WS);' +
      'q.sx+=WP.x;q.sz+=WP.z;' +
      'if(WP.x<q.x0)q.x0=WP.x;if(WP.x>q.x1)q.x1=WP.x;' +
      'if(WP.z<q.z0)q.z0=WP.z;if(WP.z>q.z1)q.z1=WP.z;' +
      'if(WP.y<q.y0)q.y0=WP.y;if(WP.y>q.y1)q.y1=WP.y;' +
      'q.sk[Math.round(WS.x*200)+"|"+Math.round(WS.y*200)+"|"+Math.round(WS.z*200)]=1;' +
      'var we=new THREE.Euler().setFromQuaternion(WQ);q.dr[Math.round(we.y*200)]=1;});' +
    'for(var k2 in G){var q2=G[k2];if(q2.n<min)continue;' +
      'var mx=q2.sx/q2.n,mz=q2.sz/q2.n;' +
      'out.push({n:q2.n,art:q2.art,name:q2.name||q2.bsp,' +
        'groessen:Object.keys(q2.sk).length,drehungen:Object.keys(q2.dr).length,' +
        'ort:_naechsterOrt(mx,mz),x:Math.round(mx),z:Math.round(mz),' +
        'yMin:+q2.y0.toFixed(1),yMax:+q2.y1.toFixed(1),' +
        'weite:Math.round(Math.max(q2.x1-q2.x0,q2.z1-q2.z0))});}' +
    'out.sort(function(a,b){' +
      'var va=(a.groessen+a.drehungen)/a.n, vb=(b.groessen+b.drehungen)/b.n;' +
      'if(va!==vb)return va-vb;return b.n-a.n;});' +
    'return out.slice(0,24);}'
}, 'spiele-dev/tools/_vielfalt_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 55000 })
const L = await page.evaluate((m) => window.__th.vielfalt(m), MIN)
console.log('\nGruppen ab ' + MIN + ' gleichartigen Dingen, die eintoenigsten zuerst:')
console.log('  Anzahl  Gr.  Dreh.  Streuung  Hoehe        Weite  Wo                     Was')
for (const q of L) {
  const streu = ((q.groessen + q.drehungen) / q.n).toFixed(2)
  const hoehe = q.yMax > q.yMin ? `${q.yMin}…${q.yMax} m` : `${q.yMin} m`
  /* ⚠️ EIN ORTSNAME FUER EINE VERSTREUTE GRUPPE LUEGT. Der Schwerpunkt von 778
     Flaechen, die 629 m weit auseinanderliegen, landet zufaellig irgendwo — die
     erste Fassung schrieb dann „Dein Grundstueck" hin, als staende die Gruppe dort.
     Ab 80 m Ausdehnung heisst es darum „verstreut", und der Ort entfaellt. */
  const wo = q.weite > 80 ? `verstreut (${q.weite} m)` : `${q.ort} (${q.x}|${q.z})`
  console.log('  ' + String(q.n).padStart(5) + String(q.groessen).padStart(5) + String(q.drehungen).padStart(7) +
    streu.padStart(10) + '  ' + hoehe.padEnd(12) + String(q.weite).padStart(4) + 'm  ' +
    wo.padEnd(24) + ' ' + String(q.name).slice(0, 30))
}
console.log('\nStreuung = (Groessen + Drehungen) / Anzahl. 0,03 heisst: 100 Dinge teilen sich')
console.log('drei Auspraegungen. Bei Industrieprodukten (Laternen, Poller, Schilder) ist das')
console.log('richtig so — bei Gewachsenem (Hecken, Buesche, Blumen, Steinen) nicht.')
console.log('\nJS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
await browser.close()
