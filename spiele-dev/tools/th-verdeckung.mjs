/* th-verdeckung.mjs — steht etwas UNDURCHSICHTIGES zwischen Kamera und Auto/Figur?
 *
 * ⚠️ WOZU. th-stadtrundgang (2026-09-05): beim Fahren auf der Suedstrasse war das Auto nicht im
 * Bild. Gemessen mit diesem Werkzeug: 38 % der Bilder verdeckt — durch Baumkronen, nicht Haeuser
 * (Verdecker-Liste: Cone/Sphere 2–3 m: 72 von 82 Treffern). Seitdem blendet updVerdecker die
 * Kronen auf der Sichtlinie aus. Hier zaehlt nur, was noch undurchsichtig ist (Deckkraft ≥ 0,5).
 * Gegenkontrolle: mit window._vdAus (Ausblenden abgeschaltet) muss der Wert wieder hoch sein.
 *
 * Aufruf:  node spiele-dev/tools/th-verdeckung.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const TMP='spiele-dev/tools/_verdeckung_probe.html'
mitSonden('traumhaus.html',{ vd:`function(was,a){
  function kandidaten(){if(window.__okk)return window.__okk;var L=[];scene.traverse(function(o){if(!o.isMesh||o.isInstancedMesh||o.isSprite||!o.geometry||!o.visible)return;var p=o,eig=false;while(p){if(p===(window.autoRec&&window.autoRec.mesh)||p===sims[0].mesh)eig=true;p=p.parent;}if(eig)return;
      try{var bb=new THREE.Box3().setFromObject(o);if(isFinite(bb.max.y)&&(bb.max.y-bb.min.y)>1.5)L.push(o);}catch(e){}});window.__okk=L;return L;}
  function treffer(ziel){var rc=new THREE.Raycaster();var von=camera.position.clone();var dir=ziel.clone().sub(von);var d=dir.length();rc.set(von,dir.normalize());rc.far=d-0.8;
    var hs0=rc.intersectObjects(kandidaten().filter(function(o){var p=o,v=true;while(p){if(!p.visible)v=false;p=p.parent;}return v;}),false);var hs=hs0.filter(function(h){return !(h.object.material&&h.object.material.transparent&&h.object.material.opacity<0.5);});window.__wer=window.__wer||{};hs.forEach(function(h){var o=h.object,p=o,name="",flag="";while(p){if(!name)name=p.name||(p.userData&&p.userData.datei)||"";if(p.userData&&p.userData.nieAusblenden)flag+="N";if(p.userData&&p.userData._bewegt)flag+="B";p=p.parent;}var bb=new THREE.Box3().setFromObject(o);var inL=(typeof _vdListe!=='undefined')&&_vdListe.indexOf(o)>=0;var k=(name||o.geometry.type)+" h"+(bb.max.y-bb.min.y).toFixed(1)+" y"+bb.min.y.toFixed(1)+" w"+Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z).toFixed(0)+(inL?" L":" -")+flag+(o.visible?"":" unsichtbar");window.__wer[k]=(window.__wer[k]||0)+1;});return hs.length;}
  if(was==="wer")return window.__wer;
  if(was==="auto"){geld=99999;applyFurn("auto_kombi",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}
  if(was==="da")return !!window.autoRec;
  if(was==="start"){var m=window.autoRec.mesh;m.position.set(a[0],m.position.y,a[1]);carRot=a[2];einsteigen(window.autoRec);window.__af=autoFahr;autoFahr=function(){};camB=a[3];return fahren;}
  if(was==="fahr"){steer.x=a[0];steer.z=a[1];var verdeckt=0,n=0;for(var i=0;i<a[2];i++){window.__af(1/60);if(typeof updVerdecker==='function')updVerdecker();if(i%15===0){if(typeof updVerdecker==='function'){updVerdecker();updVerdecker();updVerdecker();}n++;var m=window.autoRec.mesh;var z=m.position.clone();z.y+=0.8;if(treffer(z)>0)verdeckt++;}}
    return {proben:n,verdeckt:verdeckt,camB:+camB.toFixed(2),x:+window.autoRec.mesh.position.x.toFixed(0),z:+window.autoRec.mesh.position.z.toFixed(0)};}
  if(was==="diag")return {liste:(typeof _vdListe!=="undefined")?_vdListe.length:-1,aktiv:(typeof _vdAktiv!=="undefined")?_vdAktiv.length:-1,funktion:typeof updVerdecker};
  if(was==="schalter"){window._vdAus=!!a;return window._vdAus;}
  if(was==="aus"){autoFahr=window.__af;steer.x=0;steer.z=0;aussteigen();return true;}
  if(was==="geh"){var me=sims[0];var verdeckt=0,n=0;for(var i=0;i<a.length;i++){me.x=a[i][0];me.z=a[i][1];if(me.mesh){me.mesh.position.x=me.x;me.mesh.position.z=me.z;}followSim=me;camTx=me.x;camTz=me.z;camR=30;camRT=30;camB=0.72;updCam();if(typeof updVerdecker==='function'){for(var t9=0;t9<3;t9++)updVerdecker();}var z=new THREE.Vector3(me.x,1.0,me.z);n++;if(treffer(z)>0)verdeckt++;}return {proben:n,verdeckt:verdeckt};}
  return null;}`},TMP)
const { browser, page } = await spielOeffnen(TMP,{ warten:45000, screen:{width:412,height:915}, viewport:{width:844,height:390} })
const V=(...a)=>page.evaluate((x)=>window.__th.vd(...x),a)
await V('auto');for(let i=0;i<40&&!(await V('da'));i++)await page.waitForTimeout(500)
const STRECKEN=[['Suedstrasse west→ost',-60,72,Math.PI/2],['Nordstrasse ost→west',60,-68,-Math.PI/2],['Oststrasse nord→sued',78,-40,Math.PI],['Altstadt-Gasse',-40,80,0]]
let rot=0
async function messen(){let v=0,n=0;for(const [name,x,z,rot9] of STRECKEN){await V('start',[x,z,rot9,0.72]);const r=await V('fahr',[0,-1,300]);v+=r.verdeckt;n+=r.proben;await V('aus')}return [v,n]}
await V('schalter',true);const [va,na]=await messen();console.log(`ohne Ausblenden: Auto verdeckt in ${va} von ${na} Proben (${Math.round(100*va/na)} %)`)
await V('schalter',false);await page.evaluate(()=>{window.__wer={}});const [vb,nb]=await messen();console.log('Verdecker MIT Ausblenden:',JSON.stringify(Object.entries(await V('wer')).sort((a,b)=>b[1]-a[1]).slice(0,10)));console.log('diag:',JSON.stringify(await V('diag')));console.log(`mit Ausblenden : Auto verdeckt in ${vb} von ${nb} Proben (${Math.round(100*vb/nb)} %)`)
const ORTE=[[-33,86],[-40,80],[26,67],[0,102],[68,68],[-24,74],[-6,88],[96,-33],[-96,18],[10,139]]
await page.evaluate(()=>{window.__wer={}});const g=await V('geh',ORTE);console.log('Verdecker zu Fuss:',JSON.stringify(Object.entries(await V('wer')).sort((a,b)=>b[1]-a[1]).slice(0,8)));console.log(`zu Fuss, mit Ausblenden (10 Orte): Figur verdeckt an ${g.verdeckt} von ${g.proben}`)
const ok1=vb/nb<=0.08, ok2=va/na>=0.2, ok3=g.verdeckt<=1
console.log((ok1?'  ✅':'  ❌')+' Auto beim Fahren zu ≥ 92 % frei sichtbar')
console.log((ok2?'  ✅':'  ❌')+' GEGENKONTROLLE: ohne Ausblenden wieder ≥ 20 % verdeckt (Messung ist nicht blind)')
console.log((ok3?'  ✅':'  ❌')+' Figur zu Fuss an höchstens 1 von 10 Orten verdeckt')
rot=[ok1,ok2,ok3].filter(x=>!x).length
await browser.close();aufraeumen(TMP)
console.log(rot?'💥 VERDECKUNG FEHLGESCHLAGEN':'🎉 VERDECKUNG BESTANDEN');process.exit(rot?1:0)
