/* Sonde: Gelaendehoehe (window._bergHoehe) entlang Anschluss Bauernhof und Bauernhof-Strasse. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_bh_tmp.html'
mitSonden('traumhaus.html', {
  bh: `function(){
    var H=window._bergHoehe,out={anschluesse:[],baender:[],profil:[]};
    (window._anschluesse||[]).forEach(function(a){if(/Bauernhof/.test(a.n))out.anschluesse.push(a);});
    (window._viertelBaender?window._viertelBaender():[]).forEach(function(b){if(/Bauernhof/.test(b.n||""))out.baender.push(b);});
    function prof(name,pts){var r=[];pts.forEach(function(p){r.push([p[0],p[1],+H(p[0],p[1]).toFixed(2)]);});out.profil.push({n:name,p:r});}
    var pA=[];for(var z=-100;z>=-245;z-=5)pA.push([60,z]);prof("x=60 (Anschluss Nord-Sued)",pA);
    var pB=[];for(var x=60;x>=-110;x-=10)pB.push([x,-229]);prof("z=-229",pB);
    var pC=[];for(var x=60;x>=-110;x-=10)pC.push([x,-196]);prof("z=-196 (Bauernhof-Mitte)",pC);
    var pD=[];for(var x=60;x>=-110;x-=10)pD.push([x,-241]);prof("z=-241 (Bauernhof-Nordrand)",pD);
    out.berge=(window._berge||[]).map(function(b){return {x:b.x,z:b.z,r:b.r||b.rad||null,h:b.h||b.hoch||null,keys:Object.keys(b).slice(0,8)};});
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 40000 })
const r = await page.evaluate(() => window.__th.bh())
await browser.close(); aufraeumen(TMP)
console.log('ANSCHLUESSE', JSON.stringify(r.anschluesse))
console.log('BAENDER', JSON.stringify(r.baender))
console.log('BERGE', JSON.stringify(r.berge))
r.profil.forEach(p => console.log(p.n + ': ' + p.p.map(q => `(${q[0]}|${q[1]})=${q[2]}`).join(' ')))
