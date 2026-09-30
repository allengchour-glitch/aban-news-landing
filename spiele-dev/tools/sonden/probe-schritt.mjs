/* Sonde (Runde 105): der Geh-Clip von Mia/Partner (th_mann/th_frau, ein Clip „walking“). Misst je Figur: Dauer, Fussknochen,
   Zeitpunkt mit engster Fussstellung (Stand-Pose statt „mitten im Schritt eingefroren“) und die Schrittlaenge im Clip
   (Vorwaerts-Auslenkung eines Fusses relativ zur Huefte) — daraus folgt die Abspielgeschwindigkeit, bei der die Fuesse nicht
   rutschen: timeScale = v_ist / (2·Schrittlaenge / Dauer).  Aufruf: node spiele-dev/tools/sonden/probe-schritt.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_schritt_tmp.html'
mitSonden('traumhaus.html', { gang: `function(){return new Promise(function(fertig){
    /* Mia 3 Zellen weit gehen lassen (simWalk, 2,6 m/s), dabei Tempo-Kopplung messen; dann Anhalten erzwingen (Zustand
       „propose“ zaehlt nicht als Bewegung) und pruefen, ob der Clip im Stand-Bild (t=1,049) pausiert.
       ⚠️ In BILDERN warten, nicht in Sekunden: hier laeuft das Spiel mit ~1 Bild/s und deckelt dt auf 0,05 s — nach 1,8 s
       Wanduhr war der Clip erst 0,07 s weiter (erste Fassung dieser Sonde meldete deshalb faelschlich ❌). */
    var s=sims[0];if(!s||!s.walkAction)return fertig({fehler:"kein walkAction"});
    var bild=function(){return renderer.info.render.frame;};
    function nachBildern(n,dann){var f0=bild(),t0=Date.now();(function w(){if(bild()-f0>=n||Date.now()-t0>60000)dann(bild()-f0);else setTimeout(w,100);})();}
    var zelle=cx(1)-cx(0),gx=Math.round((s.x-cx(0))/zelle),gz=Math.round((s.z-cz(0))/(cz(1)-cz(0)));
    s.target=null;s.path=[[gx+3,gz]];s.state="walk";var o={};
    nachBildern(8,function(b1){o.unterwegs={bilder:b1,state:s.state,v:+(s._v||0).toFixed(2),ts:+s.walkAction.timeScale.toFixed(2),paused:s.walkAction.paused};
      s.path=[];s.target=null;s.state="propose";s.useT=60;
      nachBildern(18,function(b2){o.danach={bilder:b2,state:s.state,paused:s.walkAction.paused,t:+s.walkAction.time.toFixed(3),v:+(s._v||0).toFixed(2)};fertig(o);});});});}`, schritt: `function(){var out=[];
  [0,1].forEach(function(si){var s=sims[si];if(!s||!s.glb||!s.mixer||!s.walkAction){out.push({sim:si,fehler:"kein glb/mixer"});return;}
    var act=s.walkAction,clip=act.getClip(),o={sim:si,name:s.name,clip:clip.name,dauer:+clip.duration.toFixed(3),skala:+s.glb.scale.x.toFixed(3)};
    var bones=[];s.glb.traverse(function(n){if(n.isBone)bones.push(n);});o.knochen=bones.length;
    var fuss=bones.filter(function(b){return /foot|fuss/i.test(b.name)&&!/toe|zeh/i.test(b.name);});
    if(fuss.length<2)fuss=bones.filter(function(b){return /toe|ankle|foot/i.test(b.name);});
    o.fuss=fuss.map(function(b){return b.name;}).slice(0,4);
    var hip=bones.find(function(b){return /hip|pelvis|root|huefte/i.test(b.name);})||bones[0];o.huefte=hip.name;
    if(fuss.length<2){o.fehler="Fussknochen nicht gefunden";out.push(o);return;}
    var A=fuss[0],B=fuss[1],va=new THREE.Vector3(),vb=new THREE.Vector3(),vh=new THREE.Vector3(),proben=[];
    var war={t:act.time,p:act.paused};act.paused=false;
    for(var i=0;i<=60;i++){var t=clip.duration*i/60;act.time=t;s.mixer.update(0);s.glb.updateMatrixWorld(true);
      A.getWorldPosition(va);B.getWorldPosition(vb);hip.getWorldPosition(vh);
      var q=s.mesh.quaternion.clone().invert();va.sub(vh).applyQuaternion(q);vb.sub(vh).applyQuaternion(q);
      proben.push({t:+t.toFixed(3),sep:+Math.hypot(va.x-vb.x,va.z-vb.z).toFixed(3),az:+va.z.toFixed(3),bz:+vb.z.toFixed(3),ay:+va.y.toFixed(3),by:+vb.y.toFixed(3)});}
    act.time=war.t;act.paused=war.p;s.mixer.update(0);
    var eng=proben.reduce(function(m,p){return p.sep<m.sep?p:m;}),weit=proben.reduce(function(m,p){return p.sep>m.sep?p:m;});
    var az=proben.map(function(p){return p.az;}),schritt=Math.max.apply(null,az)-Math.min.apply(null,az);
    o.engste={t:eng.t,sep:eng.sep};o.weiteste={t:weit.t,sep:weit.sep};o.schrittlaenge=+schritt.toFixed(3);
    o.zyklusWeg=+(2*schritt).toFixed(3);o.vBeiTimescale1=+(2*schritt/clip.duration).toFixed(3);
    o.fussHoehe={min:+Math.min.apply(null,proben.map(function(p){return Math.min(p.ay,p.by);})).toFixed(3)};
    out.push(o);});
  return out;}` }, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 30000 })
const r = await page.evaluate(() => window.__th.schritt())
const g = await page.evaluate(() => window.__th.gang())
console.log('Gang:', JSON.stringify(g))
await browser.close(); aufraeumen(TMP)
console.log('JS-Fehler', jsFehler.length)
for (const o of r) console.log(JSON.stringify(o))
/* Gegenprobe: weiteste und engste Stellung muessen sich deutlich unterscheiden, sonst misst die Sonde keinen Gang */
const ok = r.every((o) => !o.fehler && o.weiteste.sep > o.engste.sep * 2 && o.schrittlaenge > 0.1)
const gOk = g && g.unterwegs && !g.unterwegs.paused && g.unterwegs.v > 0.5 && Math.abs(g.unterwegs.ts - g.unterwegs.v / 1.45) < 0.15 && g.danach && g.danach.paused && Math.abs(g.danach.t - 1.049) < 0.01
console.log(gOk ? `✅ Gang im Spiel: Tempo gekoppelt (timeScale ${g.unterwegs.ts} bei ${g.unterwegs.v} m/s = v/1,45), nach dem Anhalten Stand-Bild t=1,049 pausiert` : '❌ Gang im Spiel: Kopplung oder Stand-Bild stimmt nicht')
console.log(ok ? '✅ Gegenprobe: Gang erkannt (weit > 2× eng, Schritt > 10 cm)' : '❌ Gegenprobe: kein Gang erkannt — Sonde oder Clip pruefen')
process.exit(ok && gOk ? 0 : 1)
