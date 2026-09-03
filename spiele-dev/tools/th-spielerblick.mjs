/* th-spielerblick.mjs — spielt die ersten Minuten SELBST und fotografiert, was der Spieler sieht.
 *
 * ⚠️ WOZU. User 2026-09-02: "mach doch dass du spielen kannst, dann urteile und bearbeite
 * selbstständig." Die Mess-Werkzeuge (th-hud, th-fahrgefuehl, ...) pruefen Zahlen. Dieses
 * hier liefert die BILDER dazu, im Handy-Querformat (844x390, screen 412x915 = Handy-Modus),
 * mit der Kamera des Spiels — nicht mit __CAM von oben. Sechs Momente:
 *   start · gehen · bauen · auto (gekauft, daneben, dazu ein Nahbild Zoom 13) · fahrt (2 s Gas + Kurve) · uebersicht (Zoom 120)
 * Die Bilder liegen in spiele-dev/screenshots/spieler-<moment>.png und werden ANGESCHAUT —
 * das Urteil faellt der Betrachter, das Werkzeug urteilt nicht.
 *
 * Fahren wird synchron getaktet (wie th-fahrgefuehl), Gehen laeuft ueber die Hauptschleife
 * (headless ~2 fps → 25 s Wandzeit sind ~2,5 s Spielzeit; reicht fuer ein Bild in Bewegung).
 *
 * Aufruf:  node spiele-dev/tools/th-spielerblick.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_spielerblick_probe.html'
mitSonden('traumhaus.html', {
  sb: `function(was,a){
    if(was==="geh"){steer.x=a[0];steer.z=a[1];return true;}
    if(was==="bau"){document.getElementById("modeBtn").click();return buildMode;}
    if(was==="auto"){geld=99999;applyFurn("auto_kombi",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}
    if(was==="da")return !!window.autoRec;
    if(was==="hin"){var m=window.autoRec.mesh;sims[0].x=m.position.x+2.5;sims[0].z=m.position.z+1;sims[0].state="idle";camTx=sims[0].x;camTz=sims[0].z;updCam();return true;}
    if(was==="ein"){einsteigen(window.autoRec);if(!fahren)return false;window.__af=autoFahr;autoFahr=function(){};return true;}
    if(was==="fahr"){steer.x=a[0];steer.z=a[1];for(var i=0;i<a[2];i++)window.__af(1/60);return window._carKmh;}
    if(was==="aus"){autoFahr=window.__af;steer.x=0;steer.z=0;aussteigen();return !fahren;}
    if(was==="zoom"){camRT=a;camR=a;updCam();return camR;}
    if(was==="blick"){camRT=a[0];camR=a[0];camB=a[1];updCam();return true;}
    if(was==="stand")return {geld:geld,hud:(document.getElementById("stufeBox")||{}).textContent,uhr:(document.getElementById("uhr")||{}).textContent,fahren:fahren,bau:buildMode};
    return null;}`
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 40000, screen:{width:412,height:915}, viewport:{width:844,height:390} })
const P=(...a)=>page.evaluate((x)=>window.__th.sb(...x),a)
const foto=async(n)=>{await page.screenshot({path:`spiele-dev/screenshots/spieler-${n}.png`});console.log('  📷 '+n, JSON.stringify(await P('stand')))}

await foto('1-start')
await P('geh',[0.3,-1]); await page.waitForTimeout(25000); await foto('2-gehen'); await P('geh',[0,0])
await P('bau'); await page.waitForTimeout(2500); await foto('3-bauen'); await P('bau'); await page.waitForTimeout(1500)
await P('auto'); for(let i=0;i<40&&!(await P('da'));i++)await page.waitForTimeout(500)
await P('hin'); await page.waitForTimeout(2500); await foto('4-auto')
await P('zoom',13); await page.waitForTimeout(2500); await foto('4b-auto-nah')
await P('blick',[8,0.42]); await page.waitForTimeout(2500); await foto('4c-auto-flach'); await P('blick',[30,0.78]); await page.waitForTimeout(1500)
if(await P('ein')){ await P('fahr',[0,-1,120]); await page.waitForTimeout(1500); await foto('5-fahrt')
  await P('fahr',[-1,-1,50]); await page.waitForTimeout(1500); await foto('6-kurve'); await P('aus') }
await page.waitForTimeout(1500); await P('zoom',120); await page.waitForTimeout(4000); await foto('7-uebersicht')
console.log('  JS-Fehler: '+jsFehler.length+(jsFehler.length?' — '+jsFehler.join(' | '):''))
await browser.close(); aufraeumen(TMP)
