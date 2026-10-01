/* alle-strassen.mjs — jede Strasse der Welt abfahren, jeden Ort der Weltkarte zu Fuss fotografieren.
   Baender kommen zur Laufzeit aus dem Spiel (_viertelBaender + feste Baender), nicht aus einer Liste hier. */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const PRE = process.argv[2] || 'welt'
const NUR = process.argv[3] ? new RegExp(process.argv[3]) : null   /* nur Baender/Zubringer, deren Name passt */
const OUT = (process.env.TH_OUT || '/tmp') + '/'
const TMP = '_allestrassen_tmp.html'
mitSonden('traumhaus.html', { sf: `function(was,a){
  if(was==="hin"){var me=sims[0];me.x=a[0];me.z=a[1];me.state="idle";me.pose="stand";me.path=null;if(me.mesh){me.mesh.position.x=a[0];me.mesh.position.z=a[1];}
    followSim=me;camTx=a[0];camTz=a[1];camRT=a[2]||30;camR=camRT;camB=a[3]||0.72;updCam();if(typeof updVerdecker==='function'){updVerdecker();updVerdecker();updVerdecker();}return true;}
  if(was==="auto"){geld=99999;applyFurn("auto_kombi",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}
  if(was==="da")return !!window.autoRec;
  if(was==="fahrStart"){var m=window.autoRec.mesh;m.position.set(a[0],m.position.y,a[1]);carRot=a[2];if(!fahren){einsteigen(window.autoRec);if(!fahren)return false;window.__af=autoFahr;autoFahr=function(){};}return true;}
  if(was==="lage"){var m2=window.autoRec.mesh;return {x:m2.position.x,z:m2.position.z,rot:carRot,kmh:window._carKmh||0};}
  if(was==="fahr"){steer.x=a[0];steer.z=a[1];for(var i=0;i<a[2];i++)window.__af(1/60);var m3=window.autoRec.mesh;return {x:m3.position.x,z:m3.position.z,rot:carRot,kmh:window._carKmh||0};}
  if(was==="aus"){autoFahr=window.__af;steer.x=0;steer.z=0;aussteigen();return !fahren;}
  if(was==="baender"){
    var SZr=GH*CS/2+12,B=[
      {n:"Suedstrasse",a:"z",c:SZr,h:8,von:-RL/2+8,bis:RL/2-8},{n:"Nordstrasse",a:"z",c:-SZr,h:8,von:-RL/2+8,bis:RL/2-8},
      {n:"Quer-Ost",a:"x",c:RX,h:5,von:-SZr-8,bis:SZr+8},{n:"Quer-West",a:"x",c:-RX,h:5,von:-SZr-8,bis:SZr+8},
      {n:"Ring-Sued",a:"z",c:118,h:4.5,von:-104,bis:104},{n:"Ring-Nord",a:"z",c:-100,h:4.5,von:-104,bis:104},
      {n:"Ring-Ost",a:"x",c:112,h:4.5,von:-92,bis:110},{n:"Ring-West",a:"x",c:-112,h:4.5,von:-92,bis:110},
      {n:"Seepark-Stich",a:"x",c:0,h:4,von:122,bis:148},{n:"Strandzufahrt",a:"z",c:-30,h:4,von:-132,bis:-80},
      {n:"Achterbahn-West",a:"z",c:173,h:4.2,von:-188,bis:-104},{n:"Achterbahn-Sued",a:"x",c:-190,h:4.2,von:176,bis:204}];
    (window._viertelBaender?window._viertelBaender():[]).forEach(function(b,i){B.push({n:"Viertel-"+(b.n||i),a:b.a,c:b.c,h:b.h,von:b.von,bis:b.bis});});
    return B;}
  if(was==="pois")return WORLD_POIS.map(function(p){return [p[0],p[1],p[3]];});
  return null;}` }, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 60000, screen: { width: 412, height: 915 }, viewport: { width: 844, height: 390 } })
const P = (...a) => page.evaluate((x) => window.__th.sf(...x), a)
let nr = 0
const san = (s) => String(s).replace(/[^A-Za-z0-9äöüÄÖÜ]+/g, '-').replace(/^-|-$/g, '').slice(0, 28)
const foto = async (n) => { nr++; await page.waitForTimeout(2200); const f = `${OUT}${PRE}-${String(nr).padStart(3, '0')}-${san(n)}.png`; await page.screenshot({ path: f, timeout: 120000 }); console.log('📷 ' + f.split('/').pop()) }
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
await P('auto'); for (let i = 0; i < 60 && !(await P('da')); i++) await page.waitForTimeout(500)
await P('fahrStart', [-60, 62.4, Math.PI / 2])
let L0 = await P('lage'), L1 = await P('fahr', [0, -1, 40])
const fx = L1.x - L0.x, fz = L1.z - L0.z
const modellA = Math.hypot(fx - Math.sin(L0.rot), fz - Math.cos(L0.rot)) < Math.hypot(fx + Math.sin(L0.rot), fz + Math.cos(L0.rot))
L0 = await P('lage'); L1 = await P('fahr', [1, -1, 30]); const lenkVz = wrap(L1.rot - L0.rot) > 0 ? 1 : -1
const rotFuer = (dx, dz) => modellA ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz)
console.log(`Fahrtmodell vor=${modellA ? '(sin,cos)' : '-(sin,cos)'}, Lenken+1 ${lenkVz > 0 ? 'auf' : 'ab'}`)
async function fahre(name, wps, alle = 50) {
  let L = await P('lage'), seit = 0, k = 0
  for (const [tx, tz] of wps) {
    let versuche = 0, still = 0
    while (versuche++ < 1200) {
      const dx = tx - L.x, dz = tz - L.z, d = Math.hypot(dx, dz)
      if (d < 7) break
      if (still > 60) { console.log(`   steckt fest bei (${L.x.toFixed(0)}|${L.z.toFixed(0)})`); break }
      const e = wrap(rotFuer(dx, dz) - L.rot)
      const lenk = Math.max(-1, Math.min(1, e * 2.2)) * lenkVz
      const gas = Math.abs(e) > 1.2 ? -0.35 : -1
      const vorher = L
      L = await P('fahr', [lenk, gas, 6])
      const weg = Math.hypot(L.x - vorher.x, L.z - vorher.z); still = weg < 0.05 ? still + 1 : 0; seit += weg
      if (seit >= alle) { seit = 0; await foto(`${name}-${++k}`) }
    }
  }
  await foto(`${name}-${++k}-ende`)
}
/* 1. jedes Band einmal der Laenge nach (Rechtsverkehr: laengs x nach Osten auf c+off, laengs z nach Sueden auf c-off) */
const B = await P('baender')
console.log(`${B.length} Baender`)
for (const b of B) {
  if (NUR && !NUR.test(b.n)) continue
  const off = b.h >= 8 ? 4.4 : 2.6
  let sx, sz, ex, ez
  if (b.a === 'z') { sx = b.von + 2; sz = b.c + off; ex = b.bis - 2; ez = b.c + off } else { sx = b.c - off; sz = b.von + 2; ex = b.c - off; ez = b.bis - 2 }
  const laenge = Math.hypot(ex - sx, ez - sz); if (laenge < 20) continue
  await P('fahrStart', [sx, sz, rotFuer(ex - sx, ez - sz)])
  await fahre(b.n, [[ex, ez]], 50)
}
/* 2. Zubringer 30..330 nach aussen (Spur rechts der Speiche) */
for (const g of [30, 60, 120, 240, 300, 330]) {
  if (NUR && !NUR.test('Zubringer-' + g)) continue
  const a = g * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a)
  const p = (r) => [ca * r + 2.6 * sa, sa * r - 2.6 * ca]
  const [sx, sz] = p(126), [ex, ez] = p(194)
  await P('fahrStart', [sx, sz, rotFuer(ex - sx, ez - sz)])
  await fahre(`Zubringer-${g}`, [[ex, ez]], 50)
}
/* 3. Landstrasse: der Rest des Kreises (0,55..-0,55 war schon) */
for (const [a0, a1, n] of [[-0.6, -3.05, 'Landstrasse-A'], [3.05, 0.6, 'Landstrasse-B']]) {
  if (NUR && !NUR.test(n)) continue
  const wps = []; for (let a = a0 - 0.1; a >= a1; a -= 0.1) wps.push([200 * Math.cos(a), 200 * Math.sin(a)])
  await P('fahrStart', [200 * Math.cos(a0), 200 * Math.sin(a0), rotFuer(wps[0][0] - 200 * Math.cos(a0), wps[0][1] - 200 * Math.sin(a0))])
  await fahre(n, wps, 50)
}
await P('aus')
/* 4. jeder Ort der Weltkarte zu Fuss */
const POIS = NUR && !NUR.test('Orte') ? [] : await P('pois'); console.log(`${POIS.length} Orte`)
for (const [x, z, n] of POIS) { await P('hin', [x, z, 30, 0.72]); await foto(`ort-${n}`) }
console.log('JS-Fehler: ' + jsFehler.length + (jsFehler.length ? ' — ' + jsFehler.slice(0, 3).join(' | ') : ''))
await browser.close(); aufraeumen(TMP)
