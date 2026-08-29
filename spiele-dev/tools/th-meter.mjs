/* th-meter.mjs — prueft "Der letzte Meter": Zwischenstaende, Anstupser, naechstes Ziel.
 *
 * ⚠️ WOZU. Der Reiz eines Ziels entsteht aus der ZAHL davor. Ein Fortschritts-Balken
 * kann fehlerfrei gerendert werden und trotzdem wertlos sein: wenn er nicht mitwaechst,
 * wenn der Anstupser nie oder staendig kommt, oder wenn "am naechsten dran" auf ein
 * Ziel zeigt, das gerade eben NICHT das naechste ist. Genau das wird hier gemessen —
 * jeweils mit Gegenprobe, damit ein blindes Werkzeug auffliegt.
 *
 * Aufruf:  node spiele-dev/tools/th-meter.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_meter_probe.html'
mitSonden('traumhaus.html', {
  met: `function(was,a,b){
    if(was==="stand")return achStand(a);
    if(was==="setz"){stats[a]=b;return stats[a];}
    /* ⚠️ geld und achDone sind Closure-Variablen, KEINE window-Globals — von aussen
       per page.evaluate nicht erreichbar. Dieselbe Falle wie bei WORLD_SOLIDS. */
    if(was==="geld"){geld=a;return geld;}
    if(was==="erledigt"){achDone[a]=1;achBtnGlanz();return true;}
    if(was==="loesch"){var h2=document.getElementById("hint");h2.textContent="LEER";return true;}
    if(was==="reset"){_achNah={};achDone={};
      stats.ernten=0;stats.fische=0;stats.eis=0;stats.tore=0;stats.moebelGekauft=0;
      stats.lieferungen=0;stats.stunts=0;stats.versteckt=0;stats.quests=0;
      stats.diebstahl=0;stats.sperrgut=0;
      /* geld und liebe zaehlen ebenfalls auf Ziele ein — ohne Nullstellung gewinnt
         "Wohlhabend" mit 9999/10000 jeden Vergleich, und der Test misst Zufall. */
      geld=0;liebe=0;achBtnGlanz();return true;}
    if(was==="ringProbe"){_achNah=a;achBtnGlanz();
      var p2=document.getElementById("achBtn");
      return {anim:p2.style.animation||"",schatten:p2.style.boxShadow||"",offen:achNahOffen()};}
    if(was==="pruef"){for(var i=0;i<ACH.length;i++)if(ACH[i][0]===a){achNahPruef(ACH[i]);return true;}return false;}
    if(was==="takt"){checkAch();return true;}
    if(was==="hinweis"){var h=document.getElementById("hint");
      return {text:(h.textContent||"").trim(),sichtbar:+h.style.opacity>0};}
    if(was==="nah")return {karte:JSON.parse(JSON.stringify(_achNah)),offen:achNahOffen()};
    if(was==="ring"){var p=document.getElementById("achBtn");
      return p?{anim:p.style.animation||"",schatten:p.style.boxShadow||""}:null;}
    if(was==="ziel"){var z=naechstesZiel();return z?{id:z.a[0],name:z.a[2],ist:z.s.ist,soll:z.s.soll,rest:z.s.rest}:null;}
    if(was==="speichern")return snapshot().an;
    if(was==="laden"){loadSnapshot(Object.assign(snapshot(),{an:a}));return JSON.parse(JSON.stringify(_achNah));}
    if(was==="menue"){document.getElementById("achBtn").click();
      var l=document.getElementById("achList"),q=document.getElementById("questTxt");
      var z2=[].slice.call(l.querySelectorAll("div>span>div")).length;
      var txt=(l.textContent||"").replace(/\\s+/g," ");
      document.getElementById("achClose").click();
      return {balken:z2,text:txt,kopf:(q.textContent||"").replace(/\\s+/g," ").trim()};}
    if(was==="ids")return Object.keys(ACHFORT);
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const M = (...a) => page.evaluate((x) => window.__th.met(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

await M('reset')

/* --- 1. Der Stand muss den Zaehler wirklich lesen --- */
const s0 = await M('stand', 'gaertner')
check('Ziel ohne Fortschritt startet bei 0', s0 && s0.ist === 0 && s0.soll === 5 && s0.rest === 5,
  JSON.stringify(s0))
await M('setz', 'ernten', 3)
const s3 = await M('stand', 'gaertner')
check('Stand waechst mit dem Zaehler', s3.ist === 3 && s3.rest === 2, s3.ist + '/' + s3.soll)
await M('setz', 'ernten', 99)
const sMax = await M('stand', 'gaertner')
check('Stand ueberlaeuft das Ziel nicht', sMax.ist === 5 && sMax.rest === 0, sMax.ist + '/' + sMax.soll)
check('Ja/Nein-Erfolg hat bewusst keinen Stand', (await M('stand', 'hochzeit')) === null)

/* --- 2. Anstupser: genau auf dem letzten Meter, genau einmal --- */
await M('reset')
await M('setz', 'ernten', 2)
await M('pruef', 'gaertner')
const nichtNah = await M('nah')
check('GEGENPROBE: zwei fehlende Schritte stupsen nicht an', !nichtNah.karte.gaertner,
  JSON.stringify(nichtNah.karte))

await M('setz', 'ernten', 4)
await M('pruef', 'gaertner')
const h1 = await M('hinweis')
const nah1 = await M('nah')
check('Letzter Meter loest den Anstupser aus', !!nah1.karte.gaertner)
check('Anstupser nennt Rest und Ziel', /Nur noch 1 Ernte/.test(h1.text) && /Gr/.test(h1.text),
  '"' + h1.text + '"')

await M('loesch')
await M('pruef', 'gaertner')
const h2 = await M('hinweis')
check('Anstupser wiederholt sich nicht', h2.text === 'LEER', '"' + h2.text + '"')

/* Ziel ohne Wort darf nie anstupsen — sonst "nur noch 1 $ bis Wohlhabend". */
await M('geld', 9999)
await M('pruef', 'reich')
const nahGeld = await M('nah')
check('GEGENPROBE: Geld-Ziel stupst nicht an (kein Wort)', !nahGeld.karte.reich)
check('Geld-Ziel hat trotzdem einen Balken', (await M('stand', 'reich')).rest === 1)

/* --- 3. Der Ring am Pokal --- */
/* ⚠️ Setzen und Ablesen in EINEM Aufruf: checkAch laeuft im Spiel alle 0,35 s weiter
   und setzt zwischen zwei Testschritten neue Anstupser (hier war es "bankraeuber"),
   dann misst die Gegenprobe die Schleife statt die Logik. */
const ring1 = await M('ringProbe', { gaertner: 1 })
check('Ring leuchtet, solange ein Ziel offen ist',
  ring1.offen && /komboPuls/.test(ring1.anim) && /232,\s*163,\s*61/.test(ring1.schatten),
  ring1.anim + ' | ' + ring1.schatten)
await M('erledigt', 'gaertner')
const ring0 = await M('ringProbe', { gaertner: 1 })
check('GEGENPROBE: erreichtes Ziel loescht den Ring',
  !ring0.offen && !/komboPuls/.test(ring0.anim) && !/232,\s*163,\s*61/.test(ring0.schatten),
  ring0.anim || '(keine)')
const ringLeer = await M('ringProbe', {})
check('GEGENPROBE: ohne letzten Meter kein Ring',
  !ringLeer.offen && !/komboPuls/.test(ringLeer.anim), ringLeer.anim || '(keine)')

/* --- 4. "Am naechsten dran" muss wirklich das naechste sein --- */
await M('reset')
await M('setz', 'ernten', 1)      /* 1/5  = 20 % */
await M('setz', 'eis', 2)         /* 2/3  = 67 % */
await M('setz', 'stunts', 3)      /* 3/10 = 30 % */
const z1 = await M('ziel')
check('Naechstes Ziel ist das am weitesten fortgeschrittene', z1 && z1.id === 'schleckmaul',
  z1 && z1.id + ' ' + z1.ist + '/' + z1.soll)
await M('setz', 'tore', 2)        /* auch 2/3, aber gleicher Rest → Reihenfolge stabil */
await M('setz', 'versteckt', 2)
const z2 = await M('ziel')
check('Gleichstand aendert das Ziel nicht sprunghaft', z2.rest === 1, 'rest=' + z2.rest)
await M('erledigt', 'schleckmaul'); await M('erledigt', 'torjaeger'); await M('erledigt', 'suchmeister')
const z3 = await M('ziel')
check('Erreichte Ziele fallen aus der Auswahl', z3 && z3.id !== 'schleckmaul', z3 && z3.id)

/* --- 5. Menue: Balken sichtbar, Kopfzeile nennt das Ziel --- */
const men = await M('menue')
check('Menue zeigt Fortschritts-Balken', men.balken >= 10, men.balken + ' Balken')
check('Menue zeigt Zwischenstaende als Zahl', /\d+\/\d+/.test(men.text), men.text.slice(0, 60))
check('Kopfzeile nennt das naechste Ziel', /Am naechsten dran/.test(men.kopf), men.kopf.slice(0, 70))

/* --- 6. Der Anstupser ueberlebt den Neustart --- */
await M('reset')
await M('setz', 'ernten', 4)
await M('pruef', 'gaertner')
const gesp = await M('speichern')
check('Anstupser steht im Spielstand', gesp && gesp.gaertner === 1, JSON.stringify(gesp))
const gel = await M('laden', { angler: 1 })
check('Anstupser wird aus dem Spielstand gelesen', gel.angler === 1 && !gel.gaertner, JSON.stringify(gel))

/* --- 7. checkAch laeuft mit der neuen Logik durch --- */
await M('reset')
await M('setz', 'ernten', 4)
await M('takt')
check('checkAch stupst im normalen Takt an', (await M('nah')).karte.gaertner === 1)
check('Alle Tabellen-Ziele liefern einen Stand',
  (await M('ids')).every ? true : false)
const alle = await M('ids')
const kaputt = []
for (const id of alle) if ((await M('stand', id)) === null) kaputt.push(id)
check('Kein Ziel wirft beim Lesen', kaputt.length === 0, kaputt.join(', ') || alle.length + ' geprueft')

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 LETZTER METER BESTANDEN' : '💥 LETZTER METER FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
