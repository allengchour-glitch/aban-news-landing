/**
 * th-erfolge.mjs — kann jeder Erfolg und jede Tages-Mission ueberhaupt eintreten?
 *
 * ⚠️ WOZU. Ein Erfolg ist die einzige Belohnung im Spiel, die man NICHT bemerkt, wenn
 * sie ausbleibt. Wer 20 Fische angelt und nichts bekommt, haelt das fuer eine hohe
 * Huerde — nicht fuer einen Fehler. Genau diese Klasse hat das Spiel schon einmal
 * getroffen: `stats.coups` und `stats.sperrgut` wurden hochgezaehlt und nirgends
 * gelesen (tote Zahlen, behoben mit den Erfolgen "Tresorknacker"/"Schwerlast").
 * Der umgekehrte Fall ist der schlimmere: eine Bedingung liest einen Zaehler, den
 * niemand hochzaehlt — dann ist der Erfolg unerreichbar und es sagt einem keiner.
 *
 * Drei Fragen:
 *   1. WIRFT eine Bedingung? `checkAch()` hat KEIN try/catch — die Schleife bricht ab,
 *      und JEDER Erfolg dahinter in der Liste kann nie mehr eintreten. Ein einziger
 *      Fehler in Eintrag 3 legt also 40 Erfolge still, ohne eine Zeile in der Konsole.
 *   2. Ist eine Bedingung schon beim Start WAHR? Dann ploppt der Erfolg in der ersten
 *      Sekunde auf und belohnt nichts.
 *   3. Wird jeder gelesene Zaehler auch irgendwo GESCHRIEBEN — ausserhalb der
 *      Erfolgs- und Missionsliste selbst?
 *
 * ⚠️ FALLE BEIM ZAEHLEN VON SCHREIBSTELLEN. Die uebliche Zeile lautet
 * `stats.x=(stats.x||0)+1` — darin steht der Zaehler ZWEIMAL, einmal als Ziel und
 * einmal als Lesung. Wer nur "kommt vor" zaehlt, findet jeden Zaehler gelesen UND
 * geschrieben und meldet immer "alles in Ordnung". Darum zaehlt hier als Schreibstelle
 * nur ein Vorkommen mit `=`, `++`, `--` oder `+=` direkt dahinter, und die Zeilen der
 * Erfolgs-/Missionsliste sind ausgenommen.
 *
 * Aufruf:  node spiele-dev/tools/th-erfolge.mjs
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'

/* ⚠️ Regel 2 des Runbooks: die Sonde laeuft INNERHALB der IIFE. `ACH`, `MISS_POOL`,
   `stats`, `checkAch` sind direkt sichtbar; `window.ACH` waere `undefined` und
   lieferte kein Fehlerbild, sondern eine leere Liste. */
const sonde = `function(){
  var raus={erfolge:[],missionen:[],doppelt:[],checkAchWirft:null,anzahl:0};
  var ids={};
  for(var i=0;i<ACH.length;i++){
    var a=ACH[i], e={i:i,id:a[0],name:a[2],text:a[3],fehler:null,startWahr:false,liest:[]};
    if(ids[a[0]])raus.doppelt.push(a[0]); else ids[a[0]]=1;
    try{ e.startWahr=!!a[4](); }catch(err){ e.fehler=String(err&&err.message||err); }
    var q=String(a[4]); var m, re=/stats\\.([A-Za-z_$][\\w$]*)/g;
    while((m=re.exec(q)))if(e.liest.indexOf(m[1])<0)e.liest.push(m[1]);
    raus.erfolge.push(e);
    raus.anzahl++;
  }
  if(typeof MISS_POOL!=="undefined")for(var j=0;j<MISS_POOL.length;j++){
    var p=MISS_POOL[j], f={j:j,text:p[1],ziel:p[2],fehler:null,wert:null,liest:[]};
    try{ f.wert=p[3](); }catch(err2){ f.fehler=String(err2&&err2.message||err2); }
    var q2=String(p[3]), m2, re2=/stats\\.([A-Za-z_$][\\w$]*)/g;
    while((m2=re2.exec(q2)))if(f.liest.indexOf(m2[1])<0)f.liest.push(m2[1]);
    raus.missionen.push(f);
  }
  /* Und die Schleife selbst: laeuft sie im Ist-Zustand durch? */
  try{ checkAch(); raus.checkAchWirft=false; }catch(err3){ raus.checkAchWirft=String(err3&&err3.message||err3); }

  /* ⚠️ BELASTUNGSPROBE — der eigentliche Punkt. Dass heute nichts wirft, ist ein
     Zustand, keine Eigenschaft. Die Frage ist, was PASSIERT, wenn eine Bedingung
     wirft: reisst sie die uebrigen mit? Darum bekommt eine Kopie der Liste vorne
     einen absichtlich kaputten Eintrag und hinten eine Marke, die immer wahr ist.
     Faellt die Marke aus, blockiert ein einziger Fehler die ganze Liste. */
  var sichAch=ACH.slice(), sichDone=achDone, sichToast=achToast;
  try{
    ACH.length=0;
    ACH.push(["_gift","x","Gift","Belastungsprobe",function(){throw new Error("Testfehler");}]);
    ACH.push(["_marke","x","Marke","Belastungsprobe",function(){return true;}]);
    achDone={}; achToast=function(){};   /* kein Toast, kein saveGame waehrend der Probe */
    var abbruch=null;
    try{ checkAch(); }catch(e4){ abbruch=String(e4&&e4.message||e4); }
    raus.belastung={abbruch:abbruch, markeGesetzt:!!achDone._marke};
  }finally{
    ACH.length=0; for(var z=0;z<sichAch.length;z++)ACH.push(sichAch[z]);
    achDone=sichDone; achToast=sichToast;
  }

  /* Dieselbe Frage fuer die Tages-Missionen: dort steht MISS_POOL[m.i][3]() ebenso
     ungeschuetzt in einer forEach-Schleife, eine Zeile neben checkAch im selben Takt. */
  var sichMiss=missHeute, sichPool=MISS_POOL.slice(), sichGeld=geld;
  try{
    MISS_POOL.length=0;
    MISS_POOL.push(["x","Gift",1,function(){throw new Error("MissTest");}]);
    MISS_POOL.push(["x","Marke",1,function(){return 99;}]);
    missHeute={tag:tag,bonus:false,liste:[
      {i:0,e:"x",tx:"Gift",ziel:1,basis:0,done:false},
      {i:1,e:"x",tx:"Marke",ziel:1,basis:0,done:false}]};
    var mAbbruch=null;
    try{ missCheck(); }catch(e5){ mAbbruch=String(e5&&e5.message||e5); }
    raus.missProbe={abbruch:mAbbruch, markeGesetzt:!!missHeute.liste[1].done};
  }finally{
    MISS_POOL.length=0; for(var z2=0;z2<sichPool.length;z2++)MISS_POOL.push(sichPool[z2]);
    missHeute=sichMiss; geld=sichGeld;
  }
  /* ⚠️ RAHMENPROBE — wie weit reicht der Schaden wirklich? "checkAch()" steht in der
     Bildschleife ("loop") in EINER Zeile mit checkQuest, checkTeamQ und missCheck, und
     weit DAHINTER stehen der Spielstand (saveGame alle 6 s), die Host-Synchronisierung
     und "renderer.render(scene,camera)".
     ⚠️ DIE ERSTE FASSUNG DIESER PROBE HAT SICH SELBST WIDERLEGT. Vermutung war: das
     Bild friert ein. Gemessen: es laeuft weiter. Grund — "simTick=0" wird VOR den
     Aufrufen gesetzt, der Wurf trifft also nur jedes rund siebte Bild (0,35 s Spielzeit
     bei gedeckeltem dt von 0,05). Der Schaden ist real, aber er heisst nicht "Standbild",
     sondern "jedes siebte Bild verliert Zeichnen, Speichern und Host-Abgleich" — plus
     jeder Erfolg hinter dem kaputten Eintrag dauerhaft tot.
     Darum wird hier gegen eine REFERENZ gemessen: gleiche Dauer ohne und mit Gift. */
  return new Promise(function(fertig){
    var zaehl=function(){return renderer.info.render.frame;};
    var a0=zaehl();
    setTimeout(function(){
      var a1=zaehl();                                   /* Referenz: 4 s unvergiftet */
      ACH.unshift(["_rahmen","x","Rahmen","Rahmenprobe",function(){throw new Error("Rahmentest");}]);
      setTimeout(function(){
        var a2=zaehl();                                 /* 4 s mit werfender Bedingung */
        for(var q=0;q<ACH.length;q++)if(ACH[q][0]==="_rahmen"){ACH.splice(q,1);break;}
        delete achDone._rahmen;
        raus.rahmen={ohne:a1-a0, mit:a2-a1};
        fertig(raus);
      },4000);
    },4000);
  });}`

mitSonden('traumhaus.html', { erf: sonde }, '_erf.html')
const { browser, page, jsFehler } = await spielOeffnen('_erf.html', { warten: 26000 })
const R = await page.evaluate(() => window.__th.erf())   /* laeuft ~9 s: Belastungs- und Rahmenprobe */
await browser.close()
aufraeumen('_erf.html')

/* ⚠️ Regel 3: eine Null ist ein Verdacht, kein Ergebnis. Ohne Bezugszahl saehe eine
   leere Fundliste genauso aus wie eine Sonde, die nichts gemessen hat. */
if (!R.anzahl) { console.log('❌ 0 Erfolge gelesen — die Sonde hat nichts gemessen, nicht die Welt ist leer'); process.exit(1) }
console.log(`${R.anzahl} Erfolge · ${R.missionen.length} Missionen im Pool\n`)

/* --- statische Halbzeit: wer SCHREIBT die Zaehler? ------------------------------ */
const quelle = readFileSync(join(REPO, 'traumhaus.html'), 'utf8').split('\n')
const listeVon = quelle.findIndex((l) => l.includes('var ACH=['))
const listeBis = quelle.findIndex((l, i) => i > listeVon && l.trim() === '];')
const poolVon = quelle.findIndex((l) => l.includes('var MISS_POOL=['))
const poolBis = quelle.findIndex((l, i) => i > poolVon && l.trim().startsWith('];'))
const inListe = (n) => (n >= listeVon && n <= listeBis) || (poolVon >= 0 && n >= poolVon && n <= poolBis)
const schreibt = {}
quelle.forEach((l, i) => {
  let m; const re = /stats\.([A-Za-z_$][\w$]*)\s*(\+\+|--|\+=|=(?!=))/g
  while ((m = re.exec(l))) if (!inListe(i)) (schreibt[m[1]] = schreibt[m[1]] || []).push(i + 1)
})
console.log(`Schreibstellen gefunden fuer ${Object.keys(schreibt).length} Zaehler (Listenzeilen ${listeVon + 1}…${listeBis + 1} ausgenommen)\n`)

let fund = 0
const wirft = R.erfolge.filter((e) => e.fehler)
if (wirft.length) {
  fund += wirft.length
  console.log(`❌ ${wirft.length} Bedingungen WERFEN — checkAch() bricht dort ab, alles dahinter ist tot:`)
  for (const e of wirft) console.log(`   #${e.i} ${e.id.padEnd(15)} ${e.fehler}   (blockiert ${R.anzahl - e.i - 1} Erfolge dahinter)`)
} else console.log('✅ Keine Bedingung wirft')

if (R.checkAchWirft) { fund++; console.log(`❌ checkAch() selbst wirft: ${R.checkAchWirft}`) }
else console.log('✅ checkAch() laeuft durch')

const B = R.belastung || {}
if (B.markeGesetzt) console.log('✅ Belastungsprobe: eine werfende Bedingung blockiert die uebrigen NICHT')
else { fund++; console.log(`❌ Belastungsprobe: ein einziger Fehler legt die ganze Liste still — die Marke dahinter blieb aus (checkAch brach ab mit: ${B.abbruch})`) }

const RA = R.rahmen || {}
const verlust = RA.ohne ? Math.round((1 - RA.mit / RA.ohne) * 100) : 0
console.log(`ℹ️  Rahmenprobe: ${RA.ohne} Bilder je 4 s ohne Gift, ${RA.mit} mit — ${verlust} % Verlust an Zeichnen/Speichern/Host-Abgleich`)
/* ⚠️ EIN PROZENTWERT AUS VIER BILDERN IST KEINE AUSSAGE (2026-09-08, im Torlauf
   aufgeflogen). Der Browser zeichnet hier ohnehin nur ~1 Bild/s; unter Last waren
   es 3 Bilder ohne Gift und 2 mit — macht 33 % und eine rote Zeile, obwohl EIN
   einziges Bild den Unterschied ausmachte. Auf der ruhigen Maschine: 4 zu 4, also
   0 %. Die Schwelle von 25 % ist richtig, aber sie braucht genug Bilder, um sie
   ueberhaupt aufzuloesen: bei 4 Bildern ist der kleinstmoegliche Schritt selbst
   schon 25 %. Unter 12 Referenzbildern wird darum nichts behauptet. */
if (RA.ohne < 12) console.log(`   ℹ️  zu wenig Referenzbilder (${RA.ohne}) — ein einzelnes Bild waere hier schon ${Math.round(100 / Math.max(1, RA.ohne))} %; keine Aussage`)
else if (verlust > 25) { fund++; console.log('   ❌ mehr als ein Viertel der Bilder faellt aus — der Wurf trifft die Bildschleife haerter als erwartet') }

const MP = R.missProbe || {}
if (MP.markeGesetzt) console.log('✅ Missionsprobe: ein werfender Missions-Zaehler blockiert die uebrigen NICHT')
else { fund++; console.log(`❌ Missionsprobe: ein werfender Zaehler legt alle Tages-Missionen still (missCheck brach ab mit: ${MP.abbruch})`) }

const mw = R.missionen.filter((m) => m.fehler)
if (mw.length) { fund += mw.length; console.log(`❌ ${mw.length} Missions-Zaehler werfen:`); for (const m of mw) console.log(`   #${m.j} ${m.text}  ${m.fehler}`) }
else console.log('✅ Kein Missions-Zaehler wirft')

const frei = R.erfolge.filter((e) => !e.fehler && e.startWahr)
if (frei.length) { fund += frei.length; console.log(`\n⚠️  ${frei.length} Erfolge sind beim Start schon erfuellt (belohnen nichts):`); for (const e of frei) console.log(`   ${e.id.padEnd(15)} ${e.text}`) }
else console.log('✅ Kein Erfolg ist beim Start schon erfuellt')

const tot = []
for (const e of R.erfolge) for (const k of e.liest) if (!schreibt[k]) tot.push([e.id, k, e.text])
for (const m of R.missionen) for (const k of m.liest) if (!schreibt[k]) tot.push(['Mission: ' + m.text, k, ''])
if (tot.length) {
  fund += tot.length
  console.log(`\n❌ ${tot.length} gelesene Zaehler werden NIRGENDS hochgezaehlt — unerreichbar:`)
  for (const [wo, k, tx] of tot) console.log(`   ${wo.padEnd(22)} liest stats.${k}   ${tx}`)
} else console.log('✅ Jeder gelesene Zaehler wird auch geschrieben')

if (R.doppelt.length) { fund += R.doppelt.length; console.log(`\n❌ Doppelte Erfolgs-Ids: ${R.doppelt.join(', ')}`) }

/* ⚠️ Regel: eine Null ist ein Verdacht. Hier ist eine Null das ZIEL — jeder Wurf der
   Probe, der bis zum Fenster durchschlaegt, landet als unbehandelter Fehler in der
   Konsole. Ungeschuetzt waren es 3 (die Wuerfe der Rahmenprobe), geschuetzt 0. */
console.log('\nJS-Fehler:', jsFehler.length, jsFehler.length ? '(Wuerfe schlagen bis ins Fenster durch)' : '')
console.log(fund ? `\n⚠️  ${fund} Befunde` : '\n✅ Alle Erfolge und Missionen sind erreichbar')
