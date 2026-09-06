/* th-stadtrundgang.mjs — die Stadt aus der Spielkamera, an den Orten, wo Spieler hingehen.
 *
 * ⚠️ WOZU. th-spielerblick fotografiert die ersten Minuten auf dem Grundstueck. Der User
 * (2026-09-05): „spiele selber, dann siehst du es." Also weiter: die Figur wird an sechs Orte
 * gesetzt (Zentrum, Altstadt, Bahnhof, Seepark, Marktplatz, Grosser Park), dazu Nacht in der
 * Altstadt und eine Fahrt auf der Suedstrasse — immer mit der Folgekamera des Spiels, so wie
 * ein Spieler es sieht (844x390, Handy-Modus). Bilder: spiele-dev/screenshots/stadt-*.png.
 * Headless laeuft die Hauptschleife mit ~2 fps — darum wird der Verdecker-Filter nach dem
 * Versetzen sofort dreimal getaktet, sonst zeigt das Bild noch das Dach (im Spiel: 0,05 s).
 * Das Werkzeug urteilt nicht; die Bilder werden angeschaut.
 *
 * Aufruf:  node spiele-dev/tools/th-stadtrundgang.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const TMP='spiele-dev/tools/_stadtrundgang_probe.html'
mitSonden('traumhaus.html',{ sr:`function(was,a){
  if(was==="hin"){var me=sims[0];me.x=a[0];me.z=a[1];me.state="idle";me.pose="stand";me.path=null;if(me.mesh){me.mesh.position.x=a[0];me.mesh.position.z=a[1];}
    followSim=me;camTx=a[0];camTz=a[1];camRT=a[2]||30;camR=camRT;camB=0.72;updCam();if(typeof updVerdecker==='function'){updVerdecker();updVerdecker();updVerdecker();}return true;}
  if(was==="zeit"){uhrzeit=a;return uhrzeit;}
  if(was==="stand")return {x:+sims[0].x.toFixed(1),z:+sims[0].z.toFixed(1),uhr:(document.getElementById("uhr")||{}).textContent,nacht:!!window._dorfNacht};
  if(was==="auto"){geld=99999;applyFurn("auto_kombi",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}
  if(was==="da")return !!window.autoRec;
  if(was==="fahrStart"){var m=window.autoRec.mesh;m.position.set(a[0],m.position.y,a[1]);carRot=a[2];einsteigen(window.autoRec);if(!fahren)return false;window.__af=autoFahr;autoFahr=function(){};return true;}
  if(was==="fahr"){steer.x=a[0];steer.z=a[1];for(var i=0;i<a[2];i++)window.__af(1/60);return {kmh:window._carKmh,x:+window.autoRec.mesh.position.x.toFixed(1),z:+window.autoRec.mesh.position.z.toFixed(1)};}
  if(was==="aus"){autoFahr=window.__af;steer.x=0;steer.z=0;aussteigen();return !fahren;}
  return null;}`},TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP,{ warten:45000, screen:{width:412,height:915}, viewport:{width:844,height:390} })
const P=(...a)=>page.evaluate((x)=>window.__th.sr(...x),a)
const foto=async(n)=>{await page.waitForTimeout(2200);await page.screenshot({path:`spiele-dev/screenshots/stadt-${n}.png`});console.log('  📷 '+n,JSON.stringify(await P('stand')))}
const ORTE=[['1-zentrum',0,0,30],['2-altstadt',-33,86,28],['3-bahnhof',0,102,30],['4-seepark',10,139,32],['5-marktplatz',26,67,28],['6-park',68,68,30]]
for(const [n,x,z,r] of ORTE){await P('hin',[x,z,r]);await foto(n)}
await P('zeit',21.5*60);await P('hin',[-33,86,28]);await page.waitForTimeout(3000);await foto('7-altstadt-nacht')
await P('zeit',8*60)
await P('auto');for(let i=0;i<40&&!(await P('da'));i++)await page.waitForTimeout(500)
if(await P('fahrStart',[-60,72,Math.PI/2])){await P('fahr',[0,-1,150]);await foto('8-fahrt-suedstrasse');await P('fahr',[0,-1,240]);await foto('9-fahrt-weiter');await P('aus')}
console.log('  JS-Fehler: '+jsFehler.length+(jsFehler.length?' — '+jsFehler.slice(0,3).join(' | '):''))
await browser.close();aufraeumen(TMP)
