/* th-sicht.mjs — prueft die Gruppen-Sichtpruefung (gruppenSicht).
 *
 * 769 Gebaeude enthalten 41'348 Meshes. three.js cullt GRUPPEN nicht, prueft also
 * jedes Mesh einzeln. gruppenSicht() testet stattdessen EINE Kugel je Gebaeude.
 *
 * ⚠️ Der Fallstrick, der beim Bau zuschlug: acht Gebaeude sind SAISONAL versteckt
 * (Christbaum, Weihnachtsbuden, Eisbahn, Rodelhang, Skiliftmast). Eine Pruefung, die
 * `visible` einfach setzt, blendet sie im Sommer wieder ein. Deshalb: nur ausblenden.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_sicht_probe.html'
mitSonden('traumhaus.html', {
  gs: `function(was){
    var G=window._gebaeude||[];
    if(was==="saison"){ /* Saisonale Bauten muessen unsichtbar BLEIBEN */
      var s=G.filter(function(w){var d=(w.userData&&w.userData.datei)||"";return /th29_/.test(d);});
      return {gesamt:s.length, sichtbar:s.filter(function(w){return w.visible;}).length,
              namen:s.filter(function(w){return w.visible;}).slice(0,4)
                     .map(function(w){return w.userData.datei;})};}
    if(was==="last"){ /* Wie viel Szene laeuft pro Bild durch? */
      var sicht=0,mesh=0,verborgen=0;
      (function lauf(o){for(var i=0;i<o.children.length;i++){var c=o.children[i];
        if(!c.visible){var n=0;c.traverse(function(){n++;});verborgen+=n;continue;}
        sicht++;if(c.isMesh)mesh++;lauf(c);}})(scene);
      return {sichtbareKnoten:sicht, meshPruefungen:mesh, verborgen:verborgen};}
    if(was==="ausgeblendet")
      return G.filter(function(w){return w._gsAus;}).length;
    if(was==="fremdversteckt"){ /* von ANDEREN versteckt: unsichtbar ohne meine Marke */
      return G.filter(function(w){return !w.visible&&!w._gsAus;}).length;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000, viewport: { width: 844, height: 390 } })
const S = (w) => page.evaluate((x) => window.__th.gs(x), w)
let ok = 0, fehl = 0
const check = (n, gut, d) => { console.log((gut ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : '')); gut ? ok++ : fehl++ }

const last = await S('last')
check('Szene-Durchlauf klein genug', last.meshPruefungen < 20000,
  `${last.meshPruefungen} Mesh-Prüfungen · ${last.sichtbareKnoten} Knoten · ${last.verborgen} verborgen`)
check('Sichtprüfung blendet wirklich aus', (await S('ausgeblendet')) > 100,
  (await S('ausgeblendet')) + ' Gebäude ausgeblendet')

const sa = await S('saison')
check('Saisonale Bauten bleiben versteckt', sa.sichtbar === 0,
  `${sa.gesamt} th29-Bauten, davon ${sa.sichtbar} sichtbar ${sa.namen.join(',')}`)
check('fremde Verstecke unangetastet', (await S('fremdversteckt')) >= 8,
  (await S('fremdversteckt')) + ' von anderen versteckt')

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 SICHT BESTANDEN' : '💥 SICHT FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
