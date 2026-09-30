/* Sonde: was kosten die Passanten, und bewegen sie sich richtig? node probe-passanten.mjs [quelle]
   Runde 105 Teil 3. Zwei Teile:
   1) LAST — fester Kamerapunkt, eigener render(), einmal mit und einmal ohne alle Passanten
      (fussg). Differenz = Zeichenaufrufe/Dreiecke der Passanten (Schattendurchgang inbegriffen,
      renderer.info zaehlt ihn mit). Dazu Teile je Figur und CPU-Zeit von updFussg.
   2) GANG — nur wenn die Figuren echte Clips haben (p.fig): je Figur das Abspieltempo gegen das
      echte Tempo (Fussrutschen), Stand-Clip bei Verkaeufern, Renn-Clip bei Panik, Fuss am Boden.
      GEGENPROBE: eine Figur wird absichtlich falsch getaktet und 20 cm angehoben — beides muss
      der Pruefer melden, sonst misst er nichts. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const quelle = process.argv[2] || 'traumhaus.html'
const TMP = '_probe_passanten_tmp.html'
mitSonden(quelle, {
  kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
    followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();return true;}`,
  last: `function(){
    function r(){renderer.render(scene,camera);return [renderer.info.render.calls,renderer.info.render.triangles];}
    var n=fussg.length,glb=0,teile=0;
    fussg.forEach(function(p){var c=0;p.mesh.traverse(function(o){if(o.isMesh&&o.visible&&!(o.userData&&o.userData.blob))c++;});teile+=c;if(p.fig)glb++;});
    var mit=r(),vis=fussg.map(function(p){return p.mesh.visible;});
    fussg.forEach(function(p){p.mesh.visible=false;});var ohne=r();fussg.forEach(function(p,i){p.mesh.visible=vis[i];});
    var t0=performance.now();for(var k=0;k<40;k++)updFussg(0.016,performance.now());var cpu=(performance.now()-t0)/40;
    return {n:n,glb:glb,teileJeFigur:+(teile/n).toFixed(1),mit:mit,ohne:ohne,cpuMs:+cpu.toFixed(3)};}`,
  gang: `function(stoer){
    if(!fussg.length||!fussg[0].fig)return {ohneClips:true};
    if(stoer){var s0=fussg.find(function(p){return p.fig&&!p.stand;});s0._stoerTs=true;s0.fig.root.position.y+=0.2;}
    for(var k=0;k<6;k++)updFussg(0.05,performance.now());
    var fehler=[],v=new THREE.Vector3(),geprueft=0;
    fussg.forEach(function(p,i){var f=p.fig;if(!f)return;geprueft++;
      var soll=p.stand?"idle":"walk",akt=f.aktuell;
      if(akt!==soll)fehler.push(i+": Clip "+akt+" statt "+soll);
      var a=f.act[akt];if(!a||!a.isRunning()||a.getEffectiveWeight()<0.5)fehler.push(i+": "+akt+" laeuft nicht");
      if(!p.stand&&!(p._wende>0)){var vEcht=p.speed,vClip=a.timeScale*f.v1*f.skala; /* beim Umdrehen am Streckenende tritt sie absichtlich auf der Stelle */
        if(Math.abs(vClip-vEcht)>0.12)fehler.push(i+": rutscht (Clip "+vClip.toFixed(2)+" m/s, echt "+vEcht.toFixed(2)+")");}
      p.mesh.updateMatrixWorld(true);var tief=1e9;
      [f.fussL,f.fussR].forEach(function(b){if(b){b.getWorldPosition(v);tief=Math.min(tief,v.y);}});
      var boden=p.mesh.position.y;if(Math.abs(tief-boden)>0.14)fehler.push(i+": Fuss "+(tief-boden).toFixed(2)+" m ueber Boden");});
    return {geprueft:geprueft,fehler:fehler};}`,
  /* 3) RUTSCHEN IN WELTKOORDINATEN — der eigentliche Beweis. Tempo-Kopplung allein sagt nichts ueber
     die RICHTUNG: eine Figur, die rueckwaerts geht, hat dasselbe Tempo. Der aufgesetzte Fuss (der tiefere
     Knoechel) muss am Boden stillstehen; laeuft die Figur verkehrt herum, gleitet er mit 2 x Tempo.
     umdrehen=true ist die Gegenprobe (Figur um 180 Grad gedreht). */
  rutsch: `function(i,umdrehen,renn,stoer){var p=fussg[i],f=p.fig;if(!f)return null;if(stoer)p._stoerTs=true;
    if(umdrehen)f.root.rotation.y+=Math.PI;var w0=wanted;if(renn){wanted=2;for(var q=0;q<10;q++){camera.position.set(p.x+3,4,p.z+3);updFussg(0.03,performance.now());}}
    var v=new THREE.Vector3(),pr=[];
    /* Rennen: der Fuss steht nur ~22 % des Zyklus — mit 0,02-s-Schritten waren das ~10 Bilder je Kontakt und
       die Werte schwankten zwischen Figuren um den Faktor 4. Darum beim Rennen 0,005 s und 240 Schritte. */
    var DT=renn?0.005:0.02,NS=renn?240:50;
    for(var k=0;k<NS;k++){camera.position.set(p.x+3,4,p.z+3);updFussg(DT,performance.now());p.mesh.updateMatrixWorld(true);
      f.fussL.getWorldPosition(v);var L=[v.x,v.y,v.z];f.fussR.getWorldPosition(v);pr.push({L:L,R:[v.x,v.y,v.z],w:(p._wende>0),d:p.dir,px:p.x,pz:p.z,ts:(f.act[f.aktuell]?f.act[f.aktuell].timeScale:0)});}
    if(umdrehen)f.root.rotation.y-=Math.PI;if(stoer)p._stoerTs=false;
    var diag=f.aktuell+" ts "+(f.act[f.aktuell]?f.act[f.aktuell].timeScale.toFixed(3):"-")+" w(walk "+(f.act.walk?f.act.walk.getEffectiveWeight().toFixed(2):"-")+", run "+(f.act.run?f.act.run.getEffectiveWeight().toFixed(2):"-")+")  skala "+f.skala;
    var tempo=renn?Math.max(p.speed*2.6,3.4):p.speed;if(renn){wanted=w0;for(var q2=0;q2<10;q2++)updFussg(0.03,performance.now());}
    /* gerichtet = mittlere Gleitgeschwindigkeit ENTLANG der Laufrichtung (+ = Fuss rutscht mit, − = nach hinten).
       Nahe 0 heisst: das Restgleiten ist Abrollen des Knoechels (vor/zurueck), keine Fehlabstimmung des Tempos. */
    /* ⚠️ Erste Fassung nahm „den tieferen Knoechel" — das zaehlt das Aufsetzen mit, wenn der Fuss noch
       vorwaerts schwingt, und meldete +0,2…+0,5 m/s Gleiten, das es nicht gibt. Jetzt wie figuren-schau:
       nur Bilder, in denen der Fuss FLACH steht (hoechstens 1,5 cm ueber seinem tiefsten Punkt). */
    /* Bodenkontakt wie figuren-schau: je Fuss eigenes Minimum, Gehen 1,5 cm, Rennen 2,5 cm darueber. */
    var yM={L:1e9,R:1e9};pr.forEach(function(q){yM.L=Math.min(yM.L,q.L[1]);yM.R=Math.min(yM.R,q.R[1]);});
    /* Umdreh-Momente am Streckenende zaehlen nicht: dort steht die Figur und dreht sich (Absicht). */
    var ax=p.axis==="z"?2:0,s=0,sg=0,n=0,kv=0;for(var k2=1;k2<pr.length;k2++){var a=pr[k2-1],b=pr[k2];if(a.w||b.w||a.d!==b.d)continue;
      var sw=renn?0.025:0.015;
      ["L","R"].forEach(function(fb){if(a[fb][1]>yM[fb]+sw||b[fb][1]>yM[fb]+sw)return;
        s+=Math.hypot(b[fb][0]-a[fb][0],b[fb][2]-a[fb][2])/DT;sg+=(b[fb][ax]-a[fb][ax])*b.d/DT;n++;
        kv+=((ax===2?b.pz-a.pz:b.px-a.px)*b.d)/DT;});}
    return {i:i,datei:p.datei,tempo:+tempo.toFixed(2),diag:diag+" koerper "+(kv/Math.max(1,n)).toFixed(2)+" m/s",rutsch:+(s/Math.max(1,n)).toFixed(2),gerichtet:+(sg/Math.max(1,n)).toFixed(2)};}`,
  panik: `function(){if(!fussg.length||!fussg[0].fig)return {ohneClips:true};
    var alt=wanted;wanted=2;for(var k=0;k<8;k++)updFussg(0.05,performance.now());
    var lauf=0,renn=0;fussg.forEach(function(p){if(p.fig&&!p.stand){lauf++;if(p.fig.aktuell==="run")renn++;}});
    wanted=alt;for(var k2=0;k2<8;k2++)updFussg(0.05,performance.now());
    var zurueck=0;fussg.forEach(function(p){if(p.fig&&!p.stand&&p.fig.aktuell==="walk")zurueck++;});
    return {lauf:lauf,renn:renn,zurueck:zurueck};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 70000 })
const P = [['Kreuzung (78|58)', 78, 58, 30, 0.9, 0.6], ['Hauptstrasse', 0, -52, 22, 0.7, 0.4], ['Markt (142|24)', 142, 24, 22, 0.8, 0.9], ['Bahnsteig', 0, 108, 22, 0.8, 0.3]]
for (const [n, x, z, r, b, a] of P) {
  await page.evaluate((v) => window.__th.kam(...v), [x, z, r, b, a])
  await page.waitForTimeout(3000)
  await page.evaluate((v) => window.__th.kam(...v), [x, z, r, b, a])
  await page.waitForTimeout(1200)
  const L = await page.evaluate(() => window.__th.last())
  console.log(n.padEnd(18), `Passanten ${L.n} (echte Figuren ${L.glb}), Teile/Figur ${L.teileJeFigur} · Aufrufe ${L.mit[0]}/${L.ohne[0]} (+${L.mit[0] - L.ohne[0]}) · Dreiecke +${L.mit[1] - L.ohne[1]} · updFussg ${L.cpuMs} ms`)
}
const G = await page.evaluate(() => window.__th.gang(false))
if (G.ohneClips) console.log('Gang: Passanten haben (noch) keine Clips')
else {
  console.log(G.fehler.length ? '❌ Gang: ' + G.fehler.length + ' Befunde — ' + G.fehler.slice(0, 6).join(' | ') : `✅ Gang: ${G.geprueft} Figuren, Tempo gekoppelt, richtiger Clip, Fuss am Boden`)
  const Pn = await page.evaluate(() => window.__th.panik())
  console.log(Pn.renn === Pn.lauf && Pn.zurueck === Pn.lauf ? `✅ Panik: ${Pn.renn}/${Pn.lauf} rennen, danach alle wieder gehen` : `❌ Panik: ${Pn.renn}/${Pn.lauf} rennen, ${Pn.zurueck} gehen danach wieder`)
  const R = []
  for (const i of [0, 1, 2, 3, 12, 20, 26, 45, 50]) R.push(await page.evaluate((i) => window.__th.rutsch(i, false), i))
  /* Schwelle: GEMESSEN nach der Abstimmung 0,11–0,22 m/s Rest (Knoechel rollt ab) bei 1–2 m/s, gerichtet
     −0,03…+0,06. Vorher (Hub-Schaetzung) 0,25–0,75 und gerichtet +0,2…+0,5. 20 % und ±0,1 trennen beides. */
  const Rg = R.filter(Boolean), schlimm = Rg.filter(r => r.rutsch > 0.2 * r.tempo || Math.abs(r.gerichtet) > 0.1)
  console.log(schlimm.length ? '❌ Rutschen: ' + schlimm.map(r => `${r.i} ${r.datei} ${r.rutsch} m/s bei ${r.tempo}`).join(' | ')
    : `✅ Rutschen: aufgesetzter Fuss steht (${Rg.map(r => r.rutsch).join(', ')} m/s bei Tempo ${Rg.map(r => r.tempo).join(', ')}; gerichtet ${Rg.map(r => r.gerichtet).join(', ')})`)
  const RR = []
  for (const i of [0, 1, 2, 3]) RR.push(await page.evaluate((i) => window.__th.rutsch(i, false, true), i))
  /* Rennen: nur die RICHTUNG zaehlt. Im 2,5-cm-Kontaktfenster rollt der Fuss ab (Betrag 1,0–1,6 m/s bei
     3,4–5,1 m/s, auch bei richtiger Abstimmung). GEMESSEN nach Abstimmung: gerichtet −0,61…+0,03, vorher
     (4,5 m/s angenommen) −0,67…−0,89. Schwelle 15 % des Tempos. */
  const rs = RR.filter(r => r && Math.abs(r.gerichtet) > 0.15 * r.tempo)
  if (process.env.DIAG) RR.forEach(r => console.log('  diag', r.i, r.datei, r.diag, 'g', r.gerichtet))
  console.log(rs.length ? '❌ Rennen rutscht: ' + rs.map(r => `${r.i} ${r.rutsch} (ger. ${r.gerichtet}) m/s bei ${r.tempo}`).join(' | ')
    : `✅ Rennen: kein gerichtetes Gleiten (${RR.map(r => r.gerichtet).join(', ')} m/s bei ${RR.map(r => r.tempo).join(', ')}; Abrollen ${RR.map(r => r.rutsch).join(', ')})`)
  /* Gegenprobe Rennen: Figur 1 (5,1 m/s) mit Abspieltempo 1 statt gekoppelt — muss gerichtet gleiten. */
  const Rs = await page.evaluate(() => window.__th.rutsch(1, false, true, true))
  console.log(Rs && Math.abs(Rs.gerichtet) > 0.15 * Rs.tempo ? `✅ Gegenprobe Rennen: ungekoppelter Renner gleitet gerichtet ${Rs.gerichtet} m/s bei ${Rs.tempo}` : '❌ Gegenprobe Rennen: NICHT erkannt (' + JSON.stringify(Rs) + ')')
  const Ru = await page.evaluate(() => window.__th.rutsch(0, true))
  console.log(Ru && Ru.rutsch > 1.2 * Ru.tempo ? `✅ Gegenprobe Rutschen: umgedrehte Figur gleitet ${Ru.rutsch} m/s bei Tempo ${Ru.tempo}` : '❌ Gegenprobe Rutschen: umgedrehte Figur NICHT erkannt (' + JSON.stringify(Ru) + ')')
  const S = await page.evaluate(() => window.__th.gang(true))
  const erkannt = S.fehler.some(f => /rutscht/.test(f)) && S.fehler.some(f => /ueber Boden/.test(f))
  console.log(erkannt ? '✅ Gegenprobe: falsches Tempo und schwebende Figur erkannt' : '❌ Gegenprobe: Stoerung NICHT erkannt — Pruefer blind (' + S.fehler.length + ' Befunde)')
}
await browser.close(); aufraeumen(TMP)
