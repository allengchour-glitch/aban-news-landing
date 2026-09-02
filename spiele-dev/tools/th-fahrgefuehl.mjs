/* th-fahrgefuehl.mjs — faehrt das Auto SELBST und misst, ob es sich wie ein Auto anfuehlt.
 *
 * ⚠️ WOZU. User 2026-09-02: "auto fahren komisch". Selbst gefahren (Wegwerf-Probe) und
 * gemessen: der Stick war eine WELT-Richtung wie zu Fuss — zweite Sekunde "links halten"
 * = 1 Grad Drehung, weil das Auto laengst nach Westen zeigte und geradeaus fuhr. Tempo
 * 0->52 km/h im ersten Frame, Loslassen = 0,0 m Ausrollen. Kamera jedes Bild hart aufs Auto.
 *
 * Geprueft wird das Fahrmodell direkt (autoFahr synchron mit 1/60 s je Schritt — die
 * Hauptschleife wird dafuer stillgelegt, sonst mischt sie ~2 fps Echtzeit hinein):
 *   Anfahren weich · Lenken relativ zur Fahrtrichtung, dauerhaft, beidseitig · Ausrollen ·
 *   Bremsen + Rueckwaerts · im Stand keine Drehung · Kamera legt sich hinter das Auto, aber
 *   nicht, solange der Spieler sie selbst dreht.
 *
 * Gegenkontrolle (einmal gemacht, 2026-09-02): gegen das alte Fahrmodell (git show
 * HEAD~:traumhaus.html) schlagen Anfahren, Dauer-Lenken, Ausrollen, Rueckwaerts und
 * Kamera-hinter rot an. Bei Aenderungen am Fahrmodell wieder so gegenpruefen.
 *
 * Aufruf:  node spiele-dev/tools/th-fahrgefuehl.mjs [datei]   (Standard: traumhaus.html)
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const QUELLE = process.argv[2] || 'traumhaus.html'
const TMP = 'spiele-dev/tools/_fahrgefuehl_probe.html'
mitSonden(QUELLE, {
  ff: `function(was,a){
    function mess(){var m=window.autoRec.mesh,v=new THREE.Vector3();m.getWorldPosition(v);var w=v.clone();w.project(camera);
      return {x:+m.position.x.toFixed(3),z:+m.position.z.toFixed(3),rot:+carRot.toFixed(4),kmh:window._carKmh||0,
        ndcX:+w.x.toFixed(2),ndcY:+w.y.toFixed(2),camA:+camA.toFixed(4),wand:inSolid(m.position.x,m.position.z)};}
    if(was==="auto"){geld=99999;applyFurn("auto_kombi",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}
    if(was==="da")return !!window.autoRec;
    if(was==="ein"){einsteigen(window.autoRec);if(!fahren)return false;
      window.__af=autoFahr;autoFahr=function(){};return true;}
    if(was==="fahr"){steer.x=a[0];steer.z=a[1];for(var i=0;i<a[2];i++)window.__af(1/60);return mess();}
    if(was==="mess")return mess();
    if(was==="hand"){window._camHandT=a?performance.now():0;return true;}
    if(was==="camDreh"){camA+=a;updCam();return camA;}
    if(was==="aus"){autoFahr=window.__af;steer.x=0;steer.z=0;aussteigen();return !fahren;}
    return null;}`
}, TMP)

const { browser, page } = await spielOeffnen(TMP, { warten: 40000, screen:{width:412,height:915}, viewport:{width:844,height:390} })
const F=(...a)=>page.evaluate((x)=>window.__th.ff(...x),a)
const wrap=r=>((r+Math.PI*3)%(Math.PI*2)-Math.PI)
const grad=r=>wrap(r)*180/Math.PI
const weg=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z)
let rot=0, gruen=0
function pruef(ok,text){ console.log(`  ${ok?'✅':'❌'} ${text}`); ok?gruen++:rot++ }

await F('auto'); for(let i=0;i<40&&!(await F('da'));i++)await page.waitForTimeout(500)
if(!(await F('da'))){console.log('❌ kein Auto entstanden');await browser.close();aufraeumen(TMP);process.exit(1)}
pruef(await F('ein'),'eingestiegen (Hauptschleife fuer die Messung stillgelegt)')
await F('hand',false)

// A — Anfahren
let p0=await F('mess'), p1=await F('fahr',[0,-1,15]), p2=await F('fahr',[0,-1,150])
pruef(p1.kmh>3&&p1.kmh<40,`Anfahren weich: nach 0,25 s ${p1.kmh} km/h (erwartet 3–40, nicht sofort Vollgas)`)
pruef(p2.kmh>=48,`Vollgas erreicht: nach 2,75 s ${p2.kmh} km/h (erwartet ≥ 48)`)
pruef(weg(p0,p2)>15,`Auto faehrt wirklich: ${weg(p0,p2).toFixed(1)} m in 2,75 s${p2.wand?' — steht in einer Wand!':''}`)

// B — Lenken links, dauerhaft (nicht auf eine Weltrichtung einrasten)
let b0=await F('mess'), b1=await F('fahr',[-1,-1,60]), b2=await F('fahr',[-1,-1,60])
const d1=grad(b1.rot-b0.rot), d2=grad(b2.rot-b1.rot)
pruef(d1>60&&d1<140,`Links lenken: 1. Sekunde ${d1.toFixed(0)}° (erwartet +60…+140)`)
pruef(d2>60&&d2<140,`… und weiter: 2. Sekunde nochmal ${d2.toFixed(0)}° — dreht dauerhaft, rastet nicht ein`)
pruef(Math.hypot(b1.x-b0.x,b1.z-b0.z)>6,`Waehrend der Kurve bleibt Tempo: ${weg(b0,b1).toFixed(1)} m in 1 s`)

// H — rechts spiegelt
let h0=await F('mess'), h1=await F('fahr',[1,-1,60]); const dh=grad(h1.rot-h0.rot)
pruef(dh<-60&&dh>-140,`Rechts lenken: ${dh.toFixed(0)}° (erwartet −60…−140)`)

// C — Kamera legt sich hinter das Auto
let c1=await F('fahr',[0,-1,180]); const hinter=Math.abs(grad(c1.camA-(c1.rot+Math.PI)))
pruef(hinter<20,`Kamera hinter dem Auto nach 3 s Geradeaus: ${hinter.toFixed(0)}° daneben (erwartet < 20)`)
pruef(Math.abs(c1.ndcX)<0.6&&Math.abs(c1.ndcY)<0.6,`Auto im Bild nahe Mitte (NDC ${c1.ndcX}/${c1.ndcY})`)

// D — Loslassen: ausrollen, nicht Vollbremsung
let d0=await F('mess'), dA=await F('fahr',[0,0,30]), dB=await F('fahr',[0,0,150])
pruef(dA.kmh>20&&dA.kmh<d0.kmh,`Loslassen: nach 0,5 s noch ${dA.kmh} km/h (vorher ${d0.kmh}; erwartet 20 < x < vorher)`)
pruef(dB.kmh===0&&weg(d0,dB)>5,`Ausgerollt: nach 3 s ${dB.kmh} km/h, Rollweg ${weg(d0,dB).toFixed(1)} m (erwartet 0 km/h, > 5 m)`)

// F — im Stand lenken dreht nichts
let f0=await F('mess'), f1=await F('fahr',[1,0,60])
pruef(Math.abs(grad(f1.rot-f0.rot))<2&&weg(f0,f1)<0.1,`Im Stand lenken: ${grad(f1.rot-f0.rot).toFixed(1)}° Drehung, ${weg(f0,f1).toFixed(2)} m Weg (erwartet ~0)`)

// E — Bremsen, dann rueckwaerts
await F('fahr',[0,-1,120]); let e0=await F('mess'), e1=await F('fahr',[0,1,60])
pruef(e1.kmh===0,`Bremsen aus ${e0.kmh} km/h: nach 1 s ${e1.kmh} km/h (erwartet 0)`)
let e2=await F('fahr',[0,1,60]); const vor=[Math.sin(e1.rot),Math.cos(e1.rot)], rueck=(e2.x-e1.x)*vor[0]+(e2.z-e1.z)*vor[1]
pruef(rueck<-0.5&&e2.kmh>0,`Weiter halten = rueckwaerts: ${(-rueck).toFixed(1)} m nach hinten, Tacho ${e2.kmh} km/h`)

// G — Spieler dreht die Kamera selbst: Auto-Kamera haelt 2,5 s still
await F('fahr',[0,0,200]); await F('hand',true); const camVor=await F('camDreh',1.0)
let g1=await F('fahr',[0,-1,60]); const gedreht=Math.abs(grad(g1.camA-camVor))
pruef(gedreht<3,`Kamera von Hand gedreht: das Auto dreht sie 1 s lang NICHT zurueck (${gedreht.toFixed(1)}°)`)
await F('hand',false); let g2=await F('fahr',[0,-1,240]); const hinter2=Math.abs(grad(g2.camA-(g2.rot+Math.PI)))
pruef(hinter2<20,`… nach der Schonfrist wieder hinter dem Auto (${hinter2.toFixed(0)}° daneben)`)

pruef(await F('aus'),'ausgestiegen, Hauptschleife wieder frei')
await page.screenshot({path:'spiele-dev/screenshots/fahrgefuehl-844x390.png'})
console.log(`\n${rot?'❌':'✅'} th-fahrgefuehl: ${gruen} gruen, ${rot} rot`)
await browser.close(); aufraeumen(TMP)
process.exit(rot?1:0)
