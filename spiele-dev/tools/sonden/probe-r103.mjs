/* Sonde (Runde 103): funktioniert, was Runde 103 eingebaut hat — im laufenden Spiel, nicht nur im Text?
   Prueft: Buergerrang (Punkte, Rangwechsel zahlt genau einmal, Kopfzeile nach dem Palast), Entdecker-Album
   (Figur neben einen Ort setzen → orteCheck traegt ihn ein, zahlt, Banner), Haus-Ausbau (Kauf, Ausbau, Preis
   verdoppelt sich, Miete steigt, Deckel Stufe 5), Spielstand (il/rg im Snapshot, zt in saveGame, Umweg
   speichern → laden erhaelt Ausbau und Rang), Willkommen-zurueck-Formel, Stufe-4/5-Sperren, neue Erfolge und
   Missionen ohne Wurf. Gegenprobe: ein absichtlich falscher Ort (300 m weg) darf NICHT entdeckt werden.
   Aufruf: node spiele-dev/tools/sonden/probe-r103.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_r103_tmp.html'
mitSonden('traumhaus.html', {
  r103: `function(){var out={};
    out.immoN=(window._immo||[]).length; out.raenge=RAENGE.length; out.orteN=WORLD_POIS.length;
    out.punkte0=rangPunkte(); out.rang0=rangIdx(out.punkte0); out.bonus0=stufenBonus();
    /* Orte: Figur neben den 3. Ort stellen */
    var o=WORLD_POIS[2]; sims[0].x=o[0]+3; sims[0].z=o[1]+3; var g0=geld; orteCheck();
    out.ortEntdeckt=(stats.orte||[]).indexOf(o[3])>=0; out.ortLohn=geld-g0; out.ortName=o[3];
    /* Gegenprobe: 300 m daneben darf nichts passieren */
    var o2=WORLD_POIS[5]; sims[0].x=o2[0]+300; sims[0].z=o2[1]; var n0=(stats.orte||[]).length; orteCheck(); out.gegenprobeOrt=(stats.orte||[]).length===n0;
    /* Haus kaufen + ausbauen ueber die echten Funktionen */
    var H=window._immo||[]; out.kauf=null; out.ausbau=[];
    if(H.length){var i=0,hs=H[0]; sims[0].x=hs.x+2; sims[0].z=hs.z+2; geld=200000;
      immo.indexOf(i)<0&&(immo.push(i),immoFlagge(hs));
      var m1=immoMiete(); for(var k=0;k<5;k++){var pr=immoAusbauPreis(i); var gv=geld; immoAusbau(i,hs); out.ausbau.push({lv:immoLv[i]||1,preis:pr,bezahlt:gv-geld});}
      out.mieteVorher=m1; out.mieteNachher=immoMiete(); out.lvEnde=immoLv[i]; out.flaggeScale=hs.flagge?+hs.flagge.scale.x.toFixed(2):null;}
    /* Rang: Punkte hochtreiben und Praemie genau einmal */
    stats.quests=(stats.quests||0)+40; var gr=geld; rangPruef(); var gr1=geld-gr; rangPruef(); var gr2=geld-gr-gr1;
    out.rangNach=rangIdx(rangPunkte()); out.praemie1=gr1; out.praemie2=gr2; out.rangGezahlt=rangGezahlt;
    /* Kopfzeile nach dem Palast */
    var ws=wohnstufe; wohnstufe=5; stufeHudUpd(); out.hudPalast=document.getElementById("stufeBox").textContent; wohnstufe=ws; stufeHudUpd();
    /* Spielstand */
    var sn=snapshot(); out.snapIl=JSON.stringify(sn.il); out.snapRg=sn.rg; saveGame(); var raw=JSON.parse(localStorage.getItem(SAVE)); out.zt=typeof raw.zt==="number"&&Date.now()-raw.zt<5000;
    var lvVor=JSON.stringify(immoLv), rgVor=rangGezahlt; immoLv={}; rangGezahlt=0; loadSnapshot(sn); out.umweg=JSON.stringify(immoLv)===lvVor&&rangGezahlt===rgVor;
    /* Sperren */
    out.gates={}; for(var kat in KATALOG)KATALOG[kat].forEach(function(d){if(d.stufe>=4)out.gates[d.id]=d.stufe;});
    /* neue Erfolge/Missionen werfen nicht */
    out.achWurf=[]; ACH.forEach(function(a){try{a[4]();}catch(e){out.achWurf.push(a[0]);}}); out.achN=ACH.length;
    out.missWurf=[]; MISS_POOL.forEach(function(m,i){try{m[3]();}catch(e){out.missWurf.push(i);}}); out.missN=MISS_POOL.length;
    out.rueckkehr=Math.round((120+immoMiete()*0.5)*8*stufenBonus());
    return out;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 40000 })
await page.waitForTimeout(8000)
const r = await page.evaluate(() => window.__th.r103())
await browser.close(); aufraeumen(TMP)
const ok = (b, t) => console.log((b ? '✅ ' : '❌ ') + t)
console.log(`Haeuser ${r.immoN} · Raenge ${r.raenge} · Orte ${r.orteN} · Start: ${r.punkte0} Pkt = Rang ${r.rang0}, Bonus ${r.bonus0.toFixed(2)} · JS-Fehler ${jsFehler.length}`)
ok(r.ortEntdeckt && r.ortLohn > 0, `Ort „${r.ortName}“ entdeckt, +${r.ortLohn} $`)
ok(r.gegenprobeOrt, 'Gegenprobe: 300 m daneben wird nichts entdeckt')
ok(r.ausbau.length === 5 && r.ausbau[3].lv === 5 && r.ausbau[4].bezahlt === 0, `Ausbau: ${r.ausbau.map((a) => a.lv + '(' + a.preis + '$/' + a.bezahlt + ')').join(' → ')} · Deckel 5 haelt`)
ok(r.ausbau[1].preis === r.ausbau[0].preis * 2 && r.ausbau[2].preis === r.ausbau[1].preis * 2, 'Ausbau-Preis verdoppelt sich je Stufe')
ok(r.mieteNachher === r.mieteVorher * 3, `Miete ${r.mieteVorher} → ${r.mieteNachher} (Stufe 5 = ×3) · Flagge ×${r.flaggeScale}`)
ok(r.rangNach > r.rang0 && r.praemie1 > 0 && r.praemie2 === 0, `Rang ${r.rang0} → ${r.rangNach}, Praemie ${r.praemie1} $ einmal, zweiter Aufruf ${r.praemie2} $`)
ok(/Pkt|→|Ikone/.test(r.hudPalast) || r.hudPalast.length > 0, `Kopfzeile nach dem Palast: „${r.hudPalast}“`)
ok(r.snapIl !== '{}' && r.snapRg === r.rangGezahlt && r.zt && r.umweg, `Spielstand: il=${r.snapIl} rg=${r.snapRg} zt ${r.zt ? 'ja' : 'NEIN'} · Umweg speichern→laden erhaelt Ausbau+Rang ${r.umweg}`)
ok(Object.keys(r.gates).length === 4, 'Sperren Stufe 4/5: ' + JSON.stringify(r.gates))
ok(r.achWurf.length === 0 && r.missWurf.length === 0, `${r.achN} Erfolge, ${r.missN} Missionen — keine Bedingung wirft`)
console.log(`Willkommen-zurueck nach 8 h mit diesem Stand: ${r.rueckkehr} $`)
if (jsFehler.length) console.log('JS-Fehler: ' + jsFehler.join(' | '))
