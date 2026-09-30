/* figuren-schau.mjs — Kontaktbogen von Figuren-GLBs (Runde 105 Teil 3).
 *
 * WARUM: Welche Figurensaetze passen zum Spiel? Datei-Kopfdaten (Dreiecke, Clips)
 * sagen nichts ueber den Stil. Das Werkzeug stellt jede Figur auf 1,7 m, spielt den
 * Geh-Clip bis zur Haelfte und rendert alle nebeneinander — gleiches Licht, gleiche
 * Kamera. Aufruf:  node spiele-dev/tools/figuren-schau.mjs npc_ma anime_boy ... [--aus datei.png]
 */
import { chromium } from 'playwright'
import { serverStarten, PORT, CHROMIUM, REPO } from './th-lib.mjs'
import { join } from 'node:path'

const arg = process.argv.slice(2)
const ai = arg.indexOf('--aus')
const aus = ai >= 0 ? arg.splice(ai, 2)[1] : join(REPO, 'spiele-dev/screenshots/figuren-schau.png')
/* --schritt: statt nur zu zeigen, je Clip Walk/Run die Fussbahn ueber einen Zyklus messen.
   Liefert Clip-Dauer, Fuss-Hub vor/zurueck, daraus Tempo bei timeScale 1 (2 x Hub / Dauer),
   Hueft-Drift (wandert der Clip von selbst vorwaerts?) und tiefsten Punkt (steht er auf 0?). */
const si = arg.indexOf('--schritt'), schritt = si >= 0; if (schritt) arg.splice(si, 1)
const namen = arg.length ? arg : ['npc_ma', 'npc_fa', 'anime_boy', 'anime_girl', 'th_mann', 'th_frau']
const spalten = Math.min(6, namen.length), zeilen = Math.ceil(namen.length / spalten)
const W = 260 * spalten, H = 380 * zeilen

const seite = `<!doctype html><html><body style="margin:0;background:#cfd8dc">
<canvas id="c" width="${W}" height="${H}"></canvas>
<script src="/js/vendor/three.min.js"></script><script src="/js/vendor/GLTFLoader.js"></script>
<script>
const namen=${JSON.stringify(namen)},SP=${spalten},W=${W},H=${H},SCHRITT=${schritt};
const r=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,preserveDrawingBuffer:true});
r.setSize(W,H,false);r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=0.78; /* wie traumhaus.html */r.setScissorTest(true);
const L=new THREE.GLTFLoader();window.info=[];let offen=namen.length;
const szenen=[];
namen.forEach((n,i)=>{L.load('/models/'+n+'.glb',g=>{
  const sc=new THREE.Scene();sc.background=new THREE.Color(0xdfe6ea);
  sc.add(new THREE.HemisphereLight(0xffffff,0x8a8070,0.9));const d=new THREE.DirectionalLight(0xffffff,0.9);d.position.set(2,4,3);sc.add(d);
  const root=g.scene;root.updateMatrixWorld(true);
  let mx=null;const clip=g.animations.find(a=>/walk/i.test(a.name))||g.animations[0];
  if(clip){mx=new THREE.AnimationMixer(root);const a=mx.clipAction(clip);a.play();mx.update(clip.duration*0.25);}
  root.updateMatrixWorld(true);
  /* ⚠️ Box3 ignoriert Skinning: sie misst die Bind-Geometrie, nicht die Figur. Gemessen hier:
     th_mann 0,017 statt ~1,7, Kenney 0,67 bei vierfach groesserem Bild. Darum jeden Eckpunkt
     ueber boneTransform (r128) in die aktuelle Pose rechnen und DIESE Box nehmen. */
  function box(){const bx=new THREE.Box3(),v=new THREE.Vector3();root.updateMatrixWorld(true);
    root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;const st=Math.max(1,Math.floor(p.count/4000));
      for(let q=0;q<p.count;q+=st){v.fromBufferAttribute(p,q);if(o.isSkinnedMesh)o.boneTransform(q,v);v.applyMatrix4(o.matrixWorld);bx.expandByPoint(v);}});return bx;}
  const b=box();let h=b.max.y-b.min.y;
  const k=SCHRITT?1:1.7/h;root.scale.multiplyScalar(k); /* --schritt misst in der ECHTEN Groesse der Datei, sonst waeren die Meter um k verfaelscht */
  const b2=box();root.position.y-=b2.min.y;root.position.x-=(b2.min.x+b2.max.x)/2;root.position.z-=(b2.min.z+b2.max.z)/2;
  sc.add(root);
  if(SCHRITT){const mess={};
    const knochen=n=>{let r=null;root.traverse(o=>{if(o.isBone&&o.name===n)r=o;});return r;};
    const fussL=knochen('LowerLegL_end')||knochen('FootL'),fussR=knochen('LowerLegR_end')||knochen('FootR'),huefte=knochen('Hips')||knochen('Body');
    for(const cn of ['Walk','Run','Idle']){const c=g.animations.find(a=>a.name===cn);if(!c||!fussL)continue;
      const m2=new THREE.AnimationMixer(root);const a2=m2.clipAction(c);a2.play();
      const v=new THREE.Vector3();let zL=[],zR=[],yL=[],yR=[],hz=[],hx=[],minY=1e9;
      const NQ=240;for(let q=0;q<=NQ;q++){m2.setTime(c.duration*q/NQ);root.updateMatrixWorld(true);
        fussL.getWorldPosition(v);zL.push(v.z);yL.push(v.y);fussR.getWorldPosition(v);zR.push(v.z);yR.push(v.y);
        if(huefte){huefte.getWorldPosition(v);hz.push(v.z);hx.push(v.x);}
        if(q%40===0){const b=box();minY=Math.min(minY,b.min.y);}}
      m2.stopAllAction();m2.uncacheRoot(root);
      const hub=Math.max(...zL)-Math.min(...zL);
      /* ⚠️ 2 x Hub / Dauer UEBERSCHAETZT den Weg: der Hub enthaelt die Schwungphase (Fuss vor dem Aufsetzen
         weiter vorn, nach dem Abheben weiter hinten). GEMESSEN im Spiel: aufgesetzter Fuss glitt mit +0,2
         bis +0,5 m/s in Laufrichtung. Richtig ist das Tempo, mit dem der Fuss nach hinten wandert, SOLANGE
         er flach am Boden steht (tiefster Knoechel, hoechstens 1,5 cm ueber seinem Minimum). */
      /* 240 Bilder je Zyklus (mit 60 hatte der Renn-Clip nur 13 Standbilder — zu grob, im Spiel glitt ein
         Renner mit +0,6 m/s). Schwelle 1 cm. */
      /* BODENKONTAKT je Fuss: hoechstens SW ueber dem EIGENEN tiefsten Punkt dieses Fusses. Gehen 1,5 cm,
         Rennen 2,5 cm. ⚠️ Beim Rennen rollt der Fuss ab, der Knoechel ist erst kurz vor dem Abstossen am
         tiefsten und zieht dort am schnellsten nach hinten: mit 1 cm mass man nur das Abstossen (4,5 m/s),
         mit 5 cm die ganze Landung (3,3 m/s). 2,5 cm = der Teil, in dem der Fuss wirklich traegt.
         probe-passanten benutzt DIESELBE Definition, sonst misst sie etwas anderes als hier. */
      const SW=cn==='Run'?0.025:0.015;let sv=0,sn=0;
      for(const [zz,yy] of [[zL,yL],[zR,yR]]){const ym=Math.min(...yy);
        for(let q=1;q<=NQ;q++){if(yy[q]<ym+SW&&yy[q-1]<ym+SW){sv+=-(zz[q]-zz[q-1])/(c.duration/NQ);sn++;}}}
      const vStand=sn?sv/sn:0;
      mess[cn]={dauer:+c.duration.toFixed(3),hubL:+hub.toFixed(3),hubR:+(Math.max(...zR)-Math.min(...zR)).toFixed(3),
        vBeiTs1:+(2*hub/c.duration).toFixed(2),vStand:+vStand.toFixed(3),standBilder:sn,huefteDriftZ:+(hz[hz.length-1]-hz[0]).toFixed(3),huefteSpanneZ:+(Math.max(...hz)-Math.min(...hz)).toFixed(3),
        tiefsterPunkt:+minY.toFixed(3),fussHebung:+(Math.max(...yL)-Math.min(...yL)).toFixed(3)};}
    window.mess=window.mess||{};window.mess[n]=mess;}
  let tris=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;const gg=o.geometry;tris+=(gg.index?gg.index.count:gg.attributes.position.count)/3;}});
  const cam=new THREE.PerspectiveCamera(30,260/380,0.1,50);cam.position.set(1.6,1.3,4.2);cam.lookAt(0,0.85,0);
  szenen[i]={sc,cam,n};window.info[i]={n,h:+h.toFixed(3),tris:Math.round(tris),meshes,clips:g.animations.map(a=>a.name).filter(x=>!x.includes('_character')).length};
  if(--offen===0)zeichne();
},undefined,e=>{window.info[i]={n,fehler:String(e)};if(--offen===0)zeichne();});});
function zeichne(){szenen.forEach((s,i)=>{if(!s)return;const x=(i%SP)*260,y=H-380-Math.floor(i/SP)*380;
  r.setViewport(x,y,260,380);r.setScissor(x,y,260,380);r.render(s.sc,s.cam);});window.fertig=true;}
</script></body></html>`

serverStarten()
const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.goto(`http://127.0.0.1:${PORT}/robots.txt`).catch(() => {})
await page.setContent(seite, { waitUntil: 'load' }).catch(() => {})
await page.goto(`http://127.0.0.1:${PORT}/`).catch(() => {})
await page.setContent(seite)
await page.waitForFunction('window.fertig===true', null, { timeout: 90000 })
console.log(JSON.stringify(await page.evaluate('window.info')))
if (schritt) console.log('SCHRITT', JSON.stringify(await page.evaluate('window.mess'), null, 1))
await page.screenshot({ path: aus })
console.log('Bild:', aus)
await browser.close()
