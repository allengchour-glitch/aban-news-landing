/* th-spielfahrt.mjs — SELBST SPIELEN: fahren und gehen, Fotos aus der Spielkamera.
 *
 *   node spiele-dev/tools/th-spielfahrt.mjs [praefix]     → spiele-dev/screenshots/<praefix>-NN-name.png
 *
 * ⚠️ WOZU. User 2026-09-23: „spiele es selber dann siehst du alles". Die Messwerkzeuge
 * pruefen Zahlen von oben (th-autoboden: worauf steht ein Auto), sehen aber nicht, was
 * der Spieler sieht: Ein Taxi, das quer ueber 1,5 Stellplaetze steht, ist fuer die
 * Bodenmessung "auf Asphalt" und damit unauffaellig — im Spielbild sofort falsch.
 * Dieses Werkzeug kauft ein Auto, steigt ein und faehrt mit dem ECHTEN Fahrmodell
 * (fahrStart/fahr wie th-fahrgefuehl, synchron getaktet) eine Wegpunktroute:
 * Stadtrunde (Suedstrasse, Quer Ost, Nordstrasse, Quer West, Ring), Landstrasse ueber
 * die Anbindungs-Kreuzung (200|0), Bauernhof- und Flughafenstrasse; danach sechs
 * Stationen zu Fuss mit der Folgekamera. Foto alle ~45 m, Handy-Format 844x390.
 * Lenkvorzeichen und Fahrtrichtung werden zu Beginn GEMESSEN, nicht angenommen.
 * Das Werkzeug urteilt nicht — die Bilder werden angeschaut (wie th-stadtrundgang).
 *
 * Kosten: ~10 min auf dem Software-Renderer (52 km/h, ~1,2 km Strecke, 40 Fotos).
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const PRE = process.argv[2] || 'spielfahrt'
const OUT = 'spiele-dev/screenshots/'
const TMP = 'spiele-dev/tools/_spielfahrt_probe.html'
mitSonden('traumhaus.html', { sf: `function(was,a){
  if(was==="hin"){var me=sims[0];me.x=a[0];me.z=a[1];me.state="idle";me.pose="stand";me.path=null;if(me.mesh){me.mesh.position.x=a[0];me.mesh.position.z=a[1];}
    followSim=me;camTx=a[0];camTz=a[1];camRT=a[2]||30;camR=camRT;camB=a[3]||0.72;if(a[4]!==undefined)camA=a[4];updCam();if(typeof updVerdecker==='function'){updVerdecker();updVerdecker();updVerdecker();}return true;}
  if(was==="auto"){geld=99999;applyFurn("auto_kombi",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}
  if(was==="da")return !!window.autoRec;
  if(was==="fahrStart"){var m=window.autoRec.mesh;m.position.set(a[0],m.position.y,a[1]);carRot=a[2];if(!fahren){einsteigen(window.autoRec);if(!fahren)return false;window.__af=autoFahr;autoFahr=function(){};}return true;}
  if(was==="lage"){var m2=window.autoRec.mesh;return {x:m2.position.x,z:m2.position.z,rot:carRot,kmh:window._carKmh||0};}
  if(was==="fahr"){steer.x=a[0];steer.z=a[1];for(var i=0;i<a[2];i++)window.__af(1/60);var m3=window.autoRec.mesh;return {x:m3.position.x,z:m3.position.z,rot:carRot,kmh:window._carKmh||0};}
  if(was==="aus"){autoFahr=window.__af;steer.x=0;steer.z=0;aussteigen();return !fahren;}
  if(was==="zeit"){uhrzeit=a;return uhrzeit;}
  return null;}` }, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 50000, screen: { width: 412, height: 915 }, viewport: { width: 844, height: 390 } })
const P = (...a) => page.evaluate((x) => window.__th.sf(...x), a)
let nr = 0
const foto = async (n) => { nr++; await page.waitForTimeout(2400); const f = `${OUT}${PRE}-${String(nr).padStart(2, '0')}-${n}.png`; await page.screenshot({ path: f, timeout: 120000 }); console.log('📷 ' + f.split('/').pop()) }
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

await P('auto'); for (let i = 0; i < 60 && !(await P('da')); i++) await page.waitForTimeout(500)
if (!(await P('da'))) { console.log('kein Auto'); await browser.close(); aufraeumen(TMP); process.exit(1) }

/* Vorzeichen der Lenkung und Fahrtrichtung einmal MESSEN statt raten */
await P('fahrStart', [-60, 62.4, Math.PI / 2])
let L0 = await P('lage'); let L1 = await P('fahr', [0, -1, 40])
const fx = L1.x - L0.x, fz = L1.z - L0.z
/* Richtungsmodell: vor = (sin rot, cos rot)?  pruefen */
const modellA = Math.hypot(fx - Math.sin(L0.rot), fz - Math.cos(L0.rot)) < Math.hypot(fx + Math.sin(L0.rot), fz + Math.cos(L0.rot))
const vor = (rot) => modellA ? [Math.sin(rot), Math.cos(rot)] : [-Math.sin(rot), -Math.cos(rot)]
L0 = await P('lage'); L1 = await P('fahr', [1, -1, 30]); const lenkVz = wrap(L1.rot - L0.rot) > 0 ? 1 : -1
console.log(`Fahrtmodell: vor=${modellA ? '(sin,cos)' : '-(sin,cos)'}  Lenken +1 dreht rot ${lenkVz > 0 ? 'auf' : 'ab'}  (Bewegung ${fx.toFixed(1)}/${fz.toFixed(1)})`)

/* Fahrt entlang Wegpunkten: proportional lenken, alle `alle` m ein Foto */
async function fahre(name, wps, alle = 40) {
  let L = await P('lage'), seit = 0, k = 0, schritte = 0
  for (const [tx, tz] of wps) {
    let versuche = 0
    while (versuche++ < 4000) {
      const dx = tx - L.x, dz = tz - L.z, d = Math.hypot(dx, dz)
      if (d < 7) break
      const ziel = modellA ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz)
      const e = wrap(ziel - L.rot)
      const lenk = Math.max(-1, Math.min(1, e * 2.2)) * lenkVz
      const gas = Math.abs(e) > 1.2 ? -0.35 : -1
      const vorher = L
      L = await P('fahr', [lenk, gas, 6]); schritte += 6
      seit += Math.hypot(L.x - vorher.x, L.z - vorher.z)
      if (seit >= alle) { seit = 0; await foto(`${name}-${++k}`); console.log(`   bei (${L.x.toFixed(0)}|${L.z.toFixed(0)}) ${L.kmh.toFixed(0)} km/h`) }
    }
  }
  await foto(`${name}-${++k}-ende`)
}
/* A: Stadtrunde (Rechtsverkehr: Suedstrasse ostwaerts Spur 62,4; Quer Ost nordwaerts x 80,5;
      Nordstrasse westwaerts z -62,4; Quer West suedwaerts x -80,5; Ring Sued ostwaerts z 120,5) */
await fahre('stadt', [[20, 62.4], [70, 62.4], [80.5, 45], [80.5, -45], [76, -62.4], [0, -62.4], [-72, -62.4], [-80.5, -45], [-80.5, 45], [-80.5, 108], [-70, 120.5], [0, 120.5], [100, 120.5], [114.5, 100], [114.5, 30]], 45)
/* B: Landstrasse im Uhrzeigersinn ueber die Kreuzung bei (200|0) */
await P('fahrStart', [200 * Math.cos(0.7), 200 * Math.sin(0.7), 0])
{ const wps = []; for (let a = 0.55; a >= -0.55; a -= 0.12) wps.push([200 * Math.cos(a), 200 * Math.sin(a)]); await fahre('land', wps, 30) }
/* C: Bauernhofstrasse ostwaerts (z -248,5) — hier fuhr das Postauto "auf Gruen" */
await P('fahrStart', [-98, -248.5, Math.PI / 2]); await fahre('bauernhof', [[-60, -248.5], [-10, -248.5]], 30)
/* D: Flughafenstrasse (z -262,5) */
await P('fahrStart', [248, -262.5, Math.PI / 2]); await fahre('flughafen', [[300, -262.5], [340, -262.5]], 30)
await P('aus')
/* E: zu Fuss, mit der Folgekamera des Spiels */
for (const [n, x, z, r, b] of [['bahnhof-parkplatz', 25, 98, 26, 0.75], ['quartiersplatz', -58, -4, 26, 0.7], ['feuerwache', 50, 110, 24, 0.7], ['vorfeld', 288, -172, 34, 0.7], ['werkstatt', 3, 84, 22, 0.7], ['bushalt', -6, 49, 24, 0.7]]) {
  await P('hin', [x, z, r, b]); await foto(n)
}
console.log('JS-Fehler: ' + jsFehler.length + (jsFehler.length ? ' — ' + jsFehler.slice(0, 3).join(' | ') : ''))
await browser.close(); aufraeumen(TMP)
