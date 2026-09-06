/* th-nachthelle.mjs — wird nachts irgendwo im Land das Licht ausgeknipst?
 *
 *   node spiele-dev/tools/th-nachthelle.mjs
 *
 * WARUM DIESES WERKZEUG ENTSTAND: Auf einem Nachtbild sah der Flughafen aus wie ein
 * schwarzes Loch, und ich hielt das fuer einen Fund. Gemessen ist er mit 32 % der
 * Tageshelligkeit genau so hell wie die INNENSTADT (31 %) — der Eindruck kam vom
 * Vergleich mit einer Erinnerung an ein Tagbild, nicht von den Bildern selbst.
 * Ein Bild allein sagt nicht, ob etwas dunkel IST; es sagt nur, dass es dunkel
 * AUSSIEHT. Dafuer braucht es einen Massstab, und den liefert diese Pruefung:
 * dasselbe Viertel, dieselbe Kamera, einmal mittags und einmal um 22 Uhr.
 *
 * ⚠️ ZWEI FALLEN BEIM MESSEN VON HELLIGKEIT — beide hier schon zugeschlagen:
 *  1. `gl.readPixels` liefert den unaufgeloesten Puffer. In einer frueheren Runde
 *     wich er um den Faktor DREI vom Bildschirmabzug ab (Mehrfachabtastung).
 *     Gemessen wird darum die fertige Leinwand.
 *  2. Eine WebGL-Leinwand ist nach dem Bild LEER (kein preserveDrawingBuffer).
 *     `drawImage` liefert dann schwarz — der erste Anlauf meldete fuer JEDEN Ort 0.
 *     Es muss im selben Arbeitsschritt vorher selbst gezeichnet werden.
 *
 * GEMESSENER STAND 2026-09-06, zwei Laeufe (Nacht in Prozent des Tages):
 *   Innenstadt 52/54 · Flughafen 58/60 · Gewerbe Ost 64/66 · Bauernhof 65/66
 *   Freizeitpark 76/76
 * Die Unterschiede sind Untergrund und Bebauung: eine helle Kies- oder Rasenflaeche
 * gibt im Mondlicht mehr zurueck als eine enge Gasse. Es gibt also KEINEN einzelnen
 * richtigen Wert — die Pruefung schlaegt erst an, wenn ein Ort unter 20 % faellt,
 * also wenn dort wirklich niemand mehr das Licht anmacht.
 *
 * ⚠️ NUR DAS VERHAELTNIS IST VERGLEICHBAR, NICHT DIE ABSOLUTE ZAHL. Zwischen den
 * beiden Laeufen sprang die Tageshelligkeit des Flughafens von 134,6 auf 172,3 —
 * das ist das Wetter. Die Verhaeltnisse blieben dabei auf zwei Punkte genau gleich.
 * Wer absolute Helligkeiten zwischen Laeufen vergleicht, vergleicht Wolken.
 *
 * ⚠️ UND DIE ERSTE FASSUNG DIESES WERKZEUGS HAT FALSCHE ZAHLEN GELIEFERT: sie mass
 * "Innenstadt 31 %, Flughafen 32 %". Richtig sind 52…54 und 58…60 — der Flughafen
 * ist nachts sogar HELLER als die Innenstadt. Der Fehler lag im Warten (siehe unten),
 * nicht in der Welt.
 */
import { spielOeffnen, mitSonden, warteWeltzeit } from './th-lib.mjs'

const GRENZE = 20   /* Prozent — darunter ist ein Ort nachts wirklich finster */

const datei = mitSonden('traumhaus.html', {
  hin: 'function(x,z,r,b,a){var me=sims[meinSi()];if(me){me.x=x;me.z=z;}' +
    'camA=a;camAT=null;window.__CAM(x,z,r,b);return true;}',
  zeit: 'function(m){uhrzeit=m;return true;}',
  uhr: 'function(){return uhrzeit;}',            /* warteWeltzeit braucht sie */
  hell: 'function(){' +
    'renderer.render(scene,camera);' +            /* siehe Falle 2 im Kopf */
    'var q=renderer.domElement;' +
    'var c=document.createElement("canvas"),W=300,H=170;c.width=W;c.height=H;' +
    'var g=c.getContext("2d");' +
    'g.drawImage(q,0,q.height*0.35,q.width,q.height*0.5,0,0,W,H);' +
    'var d=g.getImageData(0,0,W,H).data,s=0;' +
    'for(var i=0;i<d.length;i+=4)s+=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];' +
    'return Math.round(s/(W*H)*10)/10;}'
}, 'spiele-dev/tools/_nachthelle_probe.html')

const ORTE = [['Flughafen', 300, -260], ['Innenstadt', 0, 40], ['Gewerbe Ost', 250, -40],
              ['Bauernhof', -40, -246], ['Freizeitpark', 60, 340]]

const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 55000, viewport: { width: 900, height: 520 } })
const werte = { tag: [], nacht: [] }
for (const [schl, uhr] of [['tag', 720], ['nacht', 1330]]) {
  await page.evaluate((m) => window.__th.zeit(m), uhr)
  /* ⚠️ DAS LICHT BLENDET EIN — UND ZWAR IN SPIELZEIT, NICHT IN WANDUHRZEIT.
     Erster Anlauf: 6 s warten, dann der Reihe nach messen. Die beiden ERSTEN Orte
     kamen zu dunkel heraus, die spaeteren stimmten. Zweiter Anlauf: einmal warten,
     bis der Messwert steht — jetzt stimmten die ersten drei, und die LETZTEN beiden
     sprangen zwischen zwei Laeufen von 24/31 auf 67/67.
     Der Grund ist derselbe wie ueberall in diesem Spiel: die Spieluhr laeuft rund
     zwoelfmal langsamer als die Wanduhr, und wie viel Spielzeit in acht Sekunden
     Wanduhr passt, haengt an der Systemlast. Wer nach der Wanduhr wartet, misst die
     Maschine mit.
     Darum wird JE ORT in WELTZEIT gewartet.

     ⚠️ ZUERST STAND HIER EINE ABBRUCHBEDINGUNG ("warten, bis zwei Ablesungen weniger
     als 1 auseinanderliegen"), und die hat NIE gegriffen: das Bild flackert von Bild
     zu Bild um ein paar Stufen — Wolken ziehen, Wasser kraeuselt sich, Autos fahren.
     Die Schleife lief also jedes Mal bis an ihre Obergrenze. Beim Lockern der Toleranz
     von 1 auf 2 wurde die Pruefung sogar LANGSAMER statt schneller (773 s im Tor
     gegen 886 und 921 s einzeln) — ein Beleg, dass die Bedingung nichts entschied.
     Jetzt steht da, was ohnehin geschah: eine feste Wartezeit in Weltsekunden. Eine
     Bedingung, die nie greift, ist schlimmer als keine — sie taeuscht Genauigkeit vor. */
  for (const [name, x, z] of ORTE) {
    await page.evaluate((p) => window.__th.hin(p[0], p[1], 90, 0.42, 0), [x, z])
    await warteWeltzeit(page, 6.0, { maxWanduhr: 150 })
    werte[schl].push(await page.evaluate(() => window.__th.hell()))
  }
}
console.log('\nMittlere Bildhelligkeit, gleiche Kamera (0 = schwarz, 255 = weiss):')
console.log('  Ort                  Tag    Nacht   Nacht/Tag')
let finster = 0
for (let i = 0; i < ORTE.length; i++) {
  const q = 100 * werte.nacht[i] / werte.tag[i]
  if (q < GRENZE) finster++
  console.log('  ' + (q < GRENZE ? '❌ ' : '   ') + ORTE[i][0].padEnd(18) +
    String(werte.tag[i]).padStart(6) + String(werte.nacht[i]).padStart(8) + q.toFixed(0).padStart(9) + ' %')
}
console.log('\nJS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
console.log(finster ? `\n❌ NACHTHELLE: ${finster} Ort(e) unter ${GRENZE} %`
                    : `\n🎉 NACHTHELLE BESTANDEN — kein Ort faellt unter ${GRENZE} % seiner Tageshelligkeit`)
await browser.close()
process.exit(finster ? 1 : 0)
