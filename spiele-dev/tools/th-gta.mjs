/* th-gta.mjs — prueft das GTA-Paket (Runde 90) im laufenden Spiel.
 *
 * WAS: Streifenwagen (Modell geladen, Laengsachse = Fahrtrichtung, Blaulichter links/
 * rechts gefunden), Verkehr mit den Charge-50-Wagen (4 Raeder je Wagen), Einsteigen
 * (Wagen- und Gegendname, Radio laeuft, Taste R wechselt den Sender), Verhaftet-
 * Einblendung (Bild grau, Zeitlupe), Aussteigen (Radio aus).
 *
 * Aufruf:  /opt/node22/bin/node spiele-dev/tools/th-gta.mjs [--bilder]
 * Exit 1, sobald eine Pruefung scheitert.
 *
 * ⚠️ Nicht auf eine Frist warten, sondern auf Ruhe (RUNBOOK-TRAUMHAUS Regel 4): das
 * Laden der Modelle wird abgefragt, bis es da ist oder die Geduld aufgebraucht ist.
 */
import { spielOeffnen, mitSonden, REPO } from './th-lib.mjs'
import { unlinkSync } from 'node:fs'

const BILDER = process.argv.includes('--bilder')
const DATEI = '_th_gta.html'
mitSonden('traumhaus.html', {
  verkehr50: `function(){var r=[];verkehr.forEach(function(v){if(/^th50_/.test(v.datei||""))r.push({d:v.datei,raeder:(v.raeder||[]).length});});return r;}`,
  polizeiSetzen: `function(n){setWanted(n);return polizei.length;}`,
  polizeiStand: `function(){return polizei.map(function(p){
    var out={modell:!!p.modell,bl:!!(p.bl&&p.bl.isMesh),br:!!(p.br&&p.br.isMesh),blName:p.bl&&p.bl.material&&p.bl.material.name};
    if(p.modell){p.mesh.rotation.set(0,0,0);p.mesh.updateMatrixWorld(true);
      var b=new THREE.Box3().setFromObject(p.modell),s=new THREE.Vector3();b.getSize(s);out.lx=s.x;out.lz=s.z;}
    return out;});}`,
  polizeiHer: `function(x,z){polizei.forEach(function(p,i){p.mesh.position.set(x+i*6,0.01,z);p.mesh.rotation.set(0,0.6,0);});return true;}`,
  autoKaufen: `function(){geld=99999;applyFurn("auto_suv",Math.round(GW/2),Math.round(GH/2)+3,0);return true;}`,
  autoDa: `function(){return !!(window.autoRec&&window.autoRec.mesh);}`,
  einsteigen: `function(){einsteigen(window.autoRec);return !!fahren;}`,
  aussteigen: `function(){aussteigen();return !fahren;}`,
  radio: `function(){return {an:radioAn,sender:radioSender,src:radioAud&&radioAud._src,pausiert:radioAud?radioAud.paused:null};}`,
  banner: `function(){gtaBanner("Verhaftet","Busse -350 $","schlecht");return true;}`,
  zeit: `function(){return window._zeitFaktor;}`,
  /* Fuers Bild: der Software-Renderer braucht fuer EIN Bildschirmfoto laenger als die
     Einblendung steht (3,2 s) — erster Lauf zeigte darum nur das Spiel ohne Band. */
  bannerHalten: `function(){gtaBanner("Verhaftet","Busse -350 $ · Fahndung 2 Sterne","schlecht");clearTimeout(window._gbT);return true;}`,
  bannerWeg: `function(){document.getElementById("gtaBanner").className="";renderer.domElement.style.filter="";window._zeitFaktor=1;return true;}`,
  /* Die Gegend-Pruefung laeuft einmal je SPIELsekunde — im Software-Renderer sind das
     10 bis 20 echte Sekunden. Statt zu warten, wird sie hier direkt ausgeloest. */
  ortTakt: `function(){_gegendT=0;gtaOrtTakt(0.1);return document.getElementById("gtaOrt").textContent;}`,
  /* Runde 91: Taxi-Schicht. Das Auto wird fuer die Pruefung neben Fahrgast und Ziel
     GESETZT statt gefahren — gemessen wird die Logik, nicht die Fahrkunst. */
  taxiSchicht: `function(){var v=null;verkehr.forEach(function(x){if(!v&&/th50_taxi/.test(x.datei||""))v=x;});
    if(!v)return {da:false};geld=5000;geldLast=5000;wanted=0;var g0=geld;taxiSchicht(v);
    return {da:true,fahren:!!fahren,an:TAXI.an,miete:g0-geld,wanted:wanted};}`,
  taxiStand: `function(){return {an:TAXI.an,phase:TAXI.phase,gast:!!TAXI.gast,gps:GPS.aktiv,ab:TAXI.ab&&TAXI.ab.n,ziel:TAXI.ziel&&TAXI.ziel.n,
    fahrten:stats.taxiFahrten||0,geld:geld,hud:document.getElementById("taxiHud").textContent};}`,
  taxiZumGast: `function(){var G=TAXI.gast.m.position;driveCar.mesh.position.set(G.x-3,driveCar.mesh.position.y,G.z);window._carKmh=0;updTaxi(0.1);return TAXI.phase;}`,
  taxiZumZiel: `function(){var g0=geld;driveCar.mesh.position.set(TAXI.ziel.x+2,driveCar.mesh.position.y,TAXI.ziel.z);window._carKmh=0;updTaxi(0.1);return {phase:TAXI.phase,plus:geld-g0};}`,
  /* Halteplaetze aller Orte: Strassenpunkt fuers Taxi, Gehsteig fuer den Fahrgast. */
  taxiHalte: `function(){return LIEFERZIELE.map(function(z){var h=taxiHalt(z);
    if(!h)return {n:z[0],fehlt:true};
    return {n:z[0],zurStrasse:Math.round(Math.hypot(h.x-z[1],h.z-z[2])),gastAufStrasse:gpsStrasse(h.gx,h.gz),
      gastGesperrt:gpsGesperrt(h.gx,h.gz),randAbstand:Math.round(Math.hypot(h.gx-h.x,h.gz-h.z)*10)/10};});}`,
  /* Fuers Bild: Fahrgast zu Fuss zeigen — im Taxi folgt die Kamera dem Wagen. */
  gastZeigen: `function(n){var z=LIEFERZIELE.filter(function(q){return q[0]===n;})[0],h=taxiHalt(z),G=taxiGast(h.gx,h.gz);
    G.m.userData.ra.rotation.z=2.6;G.m.rotation.y=Math.atan2(h.x-h.gx,h.z-h.gz);return {x:h.gx,z:h.gz};}`,
  ortHalten: `function(){gtaOrt(wagenName(window.autoRec));clearTimeout(window._goT);return document.getElementById("gtaOrt").textContent;}`,
}, DATEI)

const { browser, page, jsFehler } = await spielOeffnen(DATEI, {
  warten: 20000, viewport: { width: 1280, height: 760 }, screen: { width: 1920, height: 1080 } })
const ergebnisse = []
function pruefe(name, ok, info) { ergebnisse.push({ name, ok, info }); console.log((ok ? '✅' : '❌') + ' ' + name + (info ? '  — ' + info : '')) }
const th = (n, ...a) => page.evaluate(([n, a]) => window.__th[n](...a), [n, a])
const bild = async (n) => { if (BILDER) await page.screenshot({ path: `${REPO}/spiele-dev/screenshots/gta-${n}.png`, timeout: 150000 }) }
async function warteAuf(fn, max = 40) { let v; for (let i = 0; i < max; i++) { v = await fn(); if (v) return v; await page.waitForTimeout(2000) } return v }

/* ── Verkehr ── */
const v50 = await warteAuf(async () => { const r = await th('verkehr50'); return r.length >= 6 ? r : null })
pruefe('Charge-50-Wagen fahren im Verkehr', v50 && v50.length >= 6, v50 ? v50.length + ' Wagen' : 'keine')
const ohneRad = (v50 || []).filter((w) => w.raeder !== 4)
pruefe('Jeder Charge-50-Wagen hat 4 drehbare Raeder', v50 && ohneRad.length === 0,
  ohneRad.length ? ohneRad.map((w) => w.d + ':' + w.raeder).join(', ') : '')

/* ── Polizei ── */
await th('polizeiSetzen', 2)
const ps = await warteAuf(async () => { const p = await th('polizeiStand'); return p.every((x) => x.modell) ? p : null })
pruefe('Streifenwagen-Modell geladen', ps && ps.length === 2, JSON.stringify(ps && ps[0]))
pruefe('Streifenwagen liegt laengs zur Fahrtrichtung (+z)', ps && ps[0].lz > ps[0].lx * 1.6,
  ps ? `x ${ps[0].lx.toFixed(2)} / z ${ps[0].lz.toFixed(2)}` : '')
pruefe('Blaulichter links und rechts gefunden', ps && ps.every((p) => p.bl && p.br), ps ? ps.map((p) => p.blName).join(',') : '')
if (BILDER) {
  await th('polizeiHer', 20, -40)
  await page.evaluate(() => window.__CAM(23, -40, 12, 0.55)); await page.waitForTimeout(3000)
  await bild('1-streife')
}
await th('polizeiSetzen', 0)

/* ── Einsteigen, Gegend, Radio ── */
await th('autoKaufen')
await warteAuf(() => th('autoDa'), 20)
await th('einsteigen'); await page.waitForTimeout(1500)
const ort = await page.evaluate(() => ({ t: document.getElementById('gtaOrt').textContent, an: document.getElementById('gtaOrt').className }))
pruefe('Einsteigen zeigt Wagen und Gegend', /Geländewagen/.test(ort.t) && ort.an === 'an', ort.t)
let rd = await th('radio')
pruefe('Radio spielt beim Einsteigen', rd.an && /\/audio\//.test(rd.src || ''), JSON.stringify(rd))
const sp1 = await page.evaluate(() => document.getElementById('spRadio').textContent)
const ort2 = await th('ortTakt')
pruefe('Wagenname bleibt stehen (Gegend ueberschreibt ihn nicht)', /Geländewagen/.test(ort2), ort2)
await page.keyboard.press('r'); await page.waitForTimeout(600)
rd = await th('radio')
const sp2 = await page.evaluate(() => document.getElementById('spRadio').textContent)
pruefe('Taste R wechselt den Sender', sp1 !== sp2, `${sp1} → ${sp2}`)
if (BILDER) { await th('ortHalten'); await bild('2-einsteigen') }

/* ── Verhaftet ── */
await th('banner'); await page.waitForTimeout(400)
const bn = await page.evaluate(() => ({ k: document.getElementById('gtaBanner').className, f: document.querySelector('canvas').style.filter }))
const zf = await th('zeit')
pruefe('VERHAFTET-Einblendung mit grauem Bild', /an/.test(bn.k) && /grayscale/.test(bn.f), JSON.stringify(bn))
pruefe('Zeitlupe waehrend der Einblendung', zf < 1, 'Faktor ' + zf)
await page.waitForTimeout(4000)
const bn2 = await page.evaluate(() => ({ k: document.getElementById('gtaBanner').className, f: document.querySelector('canvas').style.filter }))
/* Seit Runde 93 stellt gtaBanner den GRUNDFILTER des Spiels wieder her (saturate/contrast) statt ihn zu
   loeschen — vorher war das Bild nach der ersten Einblendung flau. Weg muss nur das Grau sein. */
pruefe('Einblendung und Grau verschwinden wieder', !/an/.test(bn2.k) && !/grayscale/.test(bn2.f), JSON.stringify(bn2))
pruefe('Zeitlupe endet', (await th('zeit')) === 1)

if (BILDER) { await th('bannerHalten'); await bild('3-verhaftet'); await th('bannerWeg') }

/* ── Aussteigen ── */
await th('aussteigen'); await page.waitForTimeout(400)
rd = await th('radio')
pruefe('Aussteigen stellt das Radio ab', rd.pausiert === true || rd.pausiert === null, JSON.stringify(rd))

/* ── Taxi-Schicht (Runde 91) ── */
const halte = await th('taxiHalte')
const schlechteHalte = halte.filter((h) => h.fehlt || h.gastAufStrasse || h.gastGesperrt || h.zurStrasse > 80 || h.randAbstand > 12)
pruefe('Jeder Ort hat einen Halteplatz, Fahrgast steht am Rand (nicht Fahrbahn/Wasser/Haus)', schlechteHalte.length === 0,
  schlechteHalte.length ? JSON.stringify(schlechteHalte) : halte.map((h) => h.n + ' ' + h.zurStrasse + '/' + h.randAbstand + 'm').join(', '))
if (BILDER) for (const n of ['Seepark', 'Markt']) {
  const g = await th('gastZeigen', n); await page.evaluate(([x, z]) => window.__CAM(x, z, 10, 0.5), [g.x, g.z])
  await page.waitForTimeout(3000); await bild('4-taxi-halt-' + n.toLowerCase())
}
const ts = await th('taxiSchicht')
pruefe('Taxi antippen uebernimmt die Schicht (20 $, keine Fahndung)', ts.da && ts.fahren && ts.an && ts.miete === 20 && ts.wanted === 0, JSON.stringify(ts))
const tA = await warteAuf(async () => { const s = await th('taxiStand'); return s.phase === 'abholen' ? s : null }, 15)
pruefe('Zentrale schickt einen Fahrgast (Figur, GPS, Anzeige)', tA && tA.gast && tA.gps && /wartet/.test(tA.hud), JSON.stringify(tA))
const ph = await th('taxiZumGast')
const tF = await th('taxiStand')
pruefe('Fahrgast steigt ein, Ziel ist gesetzt', ph === 'fahren' && tF.ziel && tF.ziel !== tF.ab && tF.gps && !tF.gast, JSON.stringify(tF))
const za = await th('taxiZumZiel')
const tZ = await th('taxiStand')
pruefe('Am Ziel: Fahrpreis bezahlt, Fahrt gezaehlt', za.phase === 'warten' && za.plus > 0 && tZ.fahrten === 1, JSON.stringify(za))
await th('aussteigen'); await page.waitForTimeout(400)
const tE = await th('taxiStand')
pruefe('Aussteigen beendet die Schicht', !tE.an && !tE.gps && !tE.gast, JSON.stringify(tE))
pruefe('Keine JS-Fehler', jsFehler.length === 0, jsFehler.slice(0, 3).join(' | '))

await browser.close()
unlinkSync(`${REPO}/${DATEI}`)
const schlecht = ergebnisse.filter((e) => !e.ok).length
console.log(`\n${ergebnisse.length - schlecht}/${ergebnisse.length} bestanden`)
process.exit(schlecht ? 1 : 0)
