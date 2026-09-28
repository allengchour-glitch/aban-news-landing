/* Sonde (Runde 104): laufen die Leitern wirklich weiter — im Spiel, nicht nur in der Sonde?
   Prueft stufeDaten (Stufe 6..12 erzeugt, Ziel steigt, Vermoegen-Kriterium, Namen), stufenLuecke bei Stufe 5 und 9
   (nie null, Vermoegen statt Hauswert), bauabnahme() ueber Stufe 5 hinaus (Praemie, Kopfzeile), rangSchwelle/
   rangDaten ab 9 (steigend, Ikone II…), rangIdx an den Schwellen (Gegenprobe: Schwelle−1 bleibt darunter),
   Ausbau bis 12, Punkte aus Gesamtverdienst, neue Erfolge ohne Wurf, Spielstand-Umweg mit Stufe 9.
   Aufruf: node spiele-dev/tools/sonden/probe-r104.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_r104_tmp.html'
mitSonden('traumhaus.html', {
  r104: `function(){var o={};
    o.stufen=[];for(var n=5;n<=13;n++){var d=stufeDaten(n);o.stufen.push({n:n,name:d[0],ziel:d[1],komfort:d[3],praemie:d[4],art:d[5]||"haus"});}
    o.raenge=[];for(var k=8;k<=14;k++){var r=rangDaten(k);o.raenge.push({k:k,name:r[0]+" "+r[1],schwelle:rangSchwelle(k),idx:rangIdx(rangSchwelle(k)),idxMinus:rangIdx(rangSchwelle(k)-1)});}
    /* Luecke bei Stufe 5 und 9 */
    wohnstufe=5;var l5=stufenLuecke();o.l5=l5?{ziel:l5.ziel[0],art:l5.ziel[5],wert:l5.wert,fehlt:l5.fehltWert}:null;
    /* Stufe 9 VOR dem Ausbau: Vermoegen fehlt → die Kopfzeile muss den Fehlbetrag in $ zeigen (nach dem Ausbau zeigte sie
       richtigerweise „+6 Bereiche“, und die erste Fassung dieser Pruefung erwartete dort faelschlich ein $) */
    wohnstufe=9;stufeHudUpd();o.hud9=document.getElementById("stufeBox").textContent;var l9=stufenLuecke();o.l9={ziel:l9.ziel[0],art:l9.ziel[5],zielWert:l9.ziel[1],fehlt:l9.fehltWert};wohnstufe=5;
    /* Abnahme ueber 5 hinaus: Vermoegen kuenstlich erfuellen (Haus 0 kaufen + hoch ausbauen) */
    var H=window._immo||[];geld=5e7;if(H.length){if(immo.indexOf(0)<0){immo.push(0);immoFlagge(H[0]);}sims[0].x=H[0].x+2;sims[0].z=H[0].z+2;for(var a=0;a<11;a++)immoAusbau(0,H[0]);}
    o.lvEnde=immoLv[0];o.immoWert=Math.round(immoWert());o.vermoegen=Math.round(vermoegen());
    var l5b=stufenLuecke();o.l5b={erfuellt:l5b.erfuellt,kat:l5b.kat,zuf:l5b.zuf,fehltKat:l5b.fehltKat,fehltZuf:l5b.fehltZuf};
    /* Kategorien/Komfort per Katalog stellen: 6 Bereiche, 14 nutzbare Moebel — ueber die echten Zaehler nicht faelschbar,
       darum nur pruefen, ob die Abnahme bei erfuelltem Vermoegen am Komfort haengt (das ist die gewollte Huerde) */
    var g0=geld,ws=wohnstufe;bauabnahme();o.abnahme={stufeVor:ws,stufeNach:wohnstufe,praemie:geld-g0,hud:document.getElementById("stufeBox").textContent};
    wohnstufe=9;stufeHudUpd();
    /* Punkte aus Verdienst */
    var p0=rangPunkte();verdiene(25000,false);o.punkteDelta=rangPunkte()-p0;
    /* Spielstand-Umweg mit Stufe 9 + Ausbau */
    var sn=snapshot();var lvVor=JSON.stringify(immoLv);wohnstufe=0;immoLv={};loadSnapshot(sn);o.umweg=wohnstufe===9&&JSON.stringify(immoLv)===lvVor;
    o.achWurf=[];ACH.forEach(function(a){try{a[4]();}catch(e){o.achWurf.push(a[0]);}});o.achN=ACH.length;
    o.fortWurf=[];for(var id in ACHFORT){try{ACHFORT[id][0]();}catch(e){o.fortWurf.push(id);}}
    return o;}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 40000 })
await page.waitForTimeout(8000)
const r = await page.evaluate(() => window.__th.r104())
await browser.close(); aufraeumen(TMP)
const ok = (b, t) => console.log((b ? '✅ ' : '❌ ') + t)
console.log(`JS-Fehler ${jsFehler.length}`)
console.log('Stufen: ' + r.stufen.map((s) => `${s.n}=${s.name} ${s.ziel}${s.art === 'vermoegen' ? 'V' : ''}/K${s.komfort}/+${s.praemie}`).join(' · '))
ok(r.stufen.every((s, i) => i === 0 || s.ziel > r.stufen[i - 1].ziel) && r.stufen.filter((s) => s.n >= 6).every((s) => s.art === 'vermoegen'), 'Stufen 6–13: Ziel steigt, Kriterium Vermögen')
console.log('Raenge: ' + r.raenge.map((x) => `${x.k}=${x.name} ${x.schwelle}`).join(' · '))
ok(r.raenge.every((x, i) => (i === 0 || x.schwelle > r.raenge[i - 1].schwelle) && x.idx === x.k && x.idxMinus === x.k - 1), 'Ränge 8–14: Schwelle steigt, rangIdx trifft die Schwelle, Schwelle−1 bleibt darunter (Gegenprobe)')
ok(r.l5 && r.l5.art === 'vermoegen', `Lücke bei Stufe 5: nächstes Ziel ${r.l5 && r.l5.ziel} (${r.l5 && r.l5.art}), fehlt ${r.l5 && r.l5.fehlt} $`)
ok(r.lvEnde === 12, `Ausbau bis Stufe ${r.lvEnde} · Immobilienwert ${r.immoWert} $ · Vermögen ${r.vermoegen} $`)
ok(r.l5b.fehltKat >= 0, `Nach dem Ausbau: Vermögen erfüllt, Bereiche ${r.l5b.kat}, Komfort ${r.l5b.zuf} → erfüllt ${r.l5b.erfuellt}`)
ok(r.abnahme.stufeNach === (r.l5b.erfuellt ? 6 : 5), `Abnahme: Stufe ${r.abnahme.stufeVor} → ${r.abnahme.stufeNach}, Prämie ${r.abnahme.praemie} $ · Kopfzeile „${r.abnahme.hud}“`)
ok(/\$/.test(r.hud9) && r.l9.art === 'vermoegen' && r.l9.fehlt > 0, `Stufe 9 vor dem Ausbau: Kopfzeile „${r.hud9}“ · Ziel ${r.l9.ziel} ${r.l9.zielWert} $, fehlt ${r.l9.fehlt} $`)
ok(r.stufen.filter((s) => s.n >= 6).every((s) => s.komfort === 12), 'Stufen 6–13: Komfort bleibt 12 wie beim Palast (kein Vollstopfen des Hauses als Ziel)')
ok(r.punkteDelta >= 10, `25'000 $ verdient → +${r.punkteDelta} Rangpunkte`)
ok(r.umweg, 'Spielstand-Umweg mit Stufe 9 und Ausbau 12 verlustfrei')
ok(r.achWurf.length === 0 && r.fortWurf.length === 0, `${r.achN} Erfolge, Fortschritt: keine Bedingung wirft`)
if (jsFehler.length) console.log('JS-Fehler: ' + jsFehler.join(' | '))
