/* Sonde: WOHER kommen die Zeichenaufrufe? node probe-aufrufe-herkunft.mjs [quelle] [vergleich.html]
   Runde 99 (User: „gefuehlte 10 fps"; th-tempo Handy-Modus: main 175 Aufrufe, PR 309). Zaehlt je Kamerapunkt, was
   three.js wirklich zeichnet (sichtbare Kette, Sichtkegel, Materialgruppen), und ordnet jeden Aufruf einer Herkunft zu:
   Modell (userData.datei eines Vorfahren), InstancedMesh, sonst Geometrie-Typ + Farbe + Name. Mit einer zweiten Datei
   werden beide Staende an denselben Punkten verglichen und die groessten Zuwaechse gelistet. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe, REPO } from '../th-lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [A = 'traumhaus.html', B] = process.argv.slice(2)
const P = [['Start', null], ['Kreuzung (78|58)', [78, 58, 44, 0.78, 0.8]], ['Stadtmitte', [0, 20, 44, 0.78, 0.3]],
  ['Ring Ost', [117, 0, 44, 0.78, 1.3]], ['Viertel Gewerbe', [230, 0, 44, 0.78, 0.5]]]
async function messe(quelle) {
  const TMP = '_probe_herkunft_tmp.html'
  mitSonden(quelle, {
    kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;
      followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();
      if(typeof lodTakt==="function")lodTakt(x,z);return true;}`,
    zaehl: `function(){if(typeof gruppenSicht==="function")gruppenSicht();scene.updateMatrixWorld();camera.updateMatrixWorld();
      var F=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      var H={},n=0;
      function geh(o,datei){if(!o.visible)return;if(o.userData&&o.userData.datei)datei=o.userData.datei;
        if((o.isMesh||o.isInstancedMesh)&&o.geometry&&o.material){
          if(!o.frustumCulled||F.intersectsObject(o)){
            var g=Array.isArray(o.material)?Math.max(1,o.geometry.groups.length):1,k;
            if(datei)k="Modell "+datei;else if(o.isInstancedMesh)k="Instanzen "+(o.name||o.geometry.type)+" x"+o.count;
            else{var m=Array.isArray(o.material)?o.material[0]:o.material;
              k=o.geometry.type+" #"+(m.color?m.color.getHexString():"-")+(m.map?" +Textur":"")+(o.name?" "+o.name:"")+(o.userData&&o.userData.r98?" [r98]":"");}
            H[k]=(H[k]||0)+g;n+=g;}}
        for(var i=0;i<o.children.length;i++)geh(o.children[i],datei);}
      geh(scene,null);
      /* ART=1 (Runde 100): grobe Klassen — was ist der Rest nach dem Zusammenfassen? */
      var A={},GR={},HK={},bb=new THREE.Box3();
      function art(o,oben,modell,bew){if(!o.visible)return;if(o.userData&&o.userData.datei)modell=1;if(o._bewegt)bew=1;
        if((o.isMesh||o.isInstancedMesh)&&o.geometry&&o.material&&(!o.frustumCulled||F.intersectsObject(o))){
          var m=Array.isArray(o.material)?o.material[0]:o.material,k;
          if(bew)k="bewegt";else if(modell)k="Modell";else if(o.isInstancedMesh)k="Instanzen";else if(m&&m.transparent)k="durchsichtig";
          else if(o.parent===scene){bb.setFromObject(o);k=(bb.max.y-bb.min.y<=0.3&&bb.max.y<=0.35)?"Boden lose":"Mesh lose";}
          else{k="Gruppe prozedural";var gk=oben.uuid;if(!GR[gk]){oben.updateMatrixWorld();GR[gk]={n:0,x:+oben.matrixWorld.elements[12].toFixed(0),z:+oben.matrixWorld.elements[14].toFixed(0),kinder:0,name:oben.name||"",ud:Object.keys(oben.userData||{}).join(",")};oben.traverse(function(q){if(q.isMesh)GR[gk].kinder++;});}GR[gk].n++;}
          A[k]=(A[k]||0)+1;
          if(!bew&&!modell&&k!=="Instanzen"){var top=oben||o,hk=k+" · "+((top.__herk||"?").split(" < ")[0]);HK[hk]=(HK[hk]||0)+1;}}
        for(var i=0;i<o.children.length;i++)art(o.children[i],oben||o,modell,bew);}
      for(var t=0;t<scene.children.length;t++)art(scene.children[t],scene.children[t].children.length?scene.children[t]:null,0,0);
      var GL=Object.keys(GR).map(function(k){return GR[k];}).sort(function(p,q){return q.n-p.n;}).slice(0,12);
      return {n:n,H:H,A:A,GL:GL,HK:HK};}`
  }, TMP)
  /* HERK=1: vor dem Weltaufbau an scene.add haengen und die Aufrufkette merken (wie probe-gruppen-herkunft) */
  if (process.env.HERK) { const an = 'var scene=new THREE.Scene();'; let t = readFileSync(join(REPO, TMP), 'utf8')
    t = t.replace(an, an + `(function(){var _a=scene.add;scene.add=function(){for(var i=0;i<arguments.length;i++){var o=arguments[i];
      if(o&&!o.__herk){var st=(new Error().stack||"").split("\\n").slice(2,6).map(function(l){var m=l.match(/at ([^ ]+) .*:(\\d+):\\d+\\)?$/)||l.match(/at .*:(\\d+):\\d+$/);return m?(m[2]?m[1]+":"+m[2]:"anon:"+m[1]):l.trim();});o.__herk=st.join(" < ");}}
      return _a.apply(this,arguments);};})();`); writeFileSync(join(REPO, TMP), t) }
  const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
  if (!process.env.SCHNELL) { await warteAufRuhe(page, { minSekunden: 150 }); await page.waitForTimeout(12000) }   /* fertige Welt, s. probe-bildlast */
  const R = {}
  for (const [name, k] of P) {
    if (k) { await page.evaluate((v) => window.__th.kam(...v), k); await page.waitForTimeout(4000); await page.evaluate((v) => window.__th.kam(...v), k) }
    await page.waitForTimeout(1500)
    R[name] = await page.evaluate(() => window.__th.zaehl())
  }
  await browser.close(); aufraeumen(TMP)
  return R
}
const RA = await messe(A)
const RB = B ? await messe(B) : null
for (const [name] of P) {
  const a = RA[name]
  if (process.env.ART) { console.log(`\n${name}: ${a.n} Aufrufe · ` + Object.entries(a.A).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
    if (process.env.HERK) Object.entries(a.HK).sort((p, q) => q[1] - p[1]).slice(0, +(process.env.TOP || 18)).forEach(([k, v]) => console.log(`   ${String(v).padStart(4)}  ${k}`))
    else a.GL.forEach((g) => console.log(`     Gruppe (${g.x}|${g.z}) ${g.n} Aufrufe, ${g.kinder} Meshes ${g.name} ${g.ud}`)); continue }
  if (!RB) {
    console.log(`\n${name}: ${a.n} Aufrufe`)
    Object.entries(a.H).sort((p, q) => q[1] - p[1]).slice(0, +(process.env.TOP || 15)).forEach(([k, v]) => console.log(`   ${String(v).padStart(4)}  ${k}`))
    continue
  }
  const b = RB[name], d = {}
  for (const k of new Set([...Object.keys(a.H), ...Object.keys(b.H)])) d[k] = (a.H[k] || 0) - (b.H[k] || 0)
  console.log(`\n${name}: ${A} ${a.n} · ${B} ${b.n} · Differenz ${a.n - b.n > 0 ? '+' : ''}${a.n - b.n}`)
  Object.entries(d).filter(([, v]) => v !== 0).sort((p, q) => Math.abs(q[1]) - Math.abs(p[1])).slice(0, 14)
    .forEach(([k, v]) => console.log(`   ${(v > 0 ? '+' : '') + v}`.padEnd(9) + k))
}
