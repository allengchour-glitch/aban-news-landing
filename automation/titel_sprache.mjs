// 🇩🇪 TITEL-SPRACHWACHE (20.08.2026)
//
// Der CJ-Übersetzer liefert die BESCHREIBUNG zuverlässig deutsch, den TITEL aber manchmal roh
// aus dem CJ-Listing. Sechs so angelegte Produkte standen am 20.08.2026 ACTIVE im Google-Kanal:
//   «Yoga Bag Sports Travel Bag Large Capacity Yoga Mat Back»  (sogar mitten im Wort abgeschnitten)
//   «Daddy Shoes All-match Casual White Sports Women's Shoes»
//   «Korean Style All-match Large-capacity Backpack»
//   «Mini Summer Butter Lip Balm Suit»   («Suit» = wörtliche Fehlübersetzung von 套装 = Set)
//   «Smear-proof Makeup Natural Freckle Liquid»
//   «Hot and Cold Compress Eye Mask for Relaxation and Sleep»
// Ein englischer Titel konkurriert im Feed nicht um deutschsprachige Suchen, und die Kundin
// liest ihn zuerst. Nachfüllen allein reicht nicht (CLAUDE.md: «wer schreibt das Feld beim
// NÄCHSTEN Produkt?») — die Prüfung gehört VOR das Anlegen, nicht in den nächsten Aufräumlauf.
//
// ⚠️ Die naheliegende Prüfung «enthält englische Funktionswörter (for/with/and/of/the)» ist die
// FALSCHE. Gegen die sechs Fundstücke getestet erwischt sie nur ZWEI — die übrigen sind reine
// Nomenketten ohne jedes Funktionswort. Gleichzeitig schlägt sie bei Motiv- und Modellnamen
// falsch an («Rubik's Cube Diamond Painting Stickerei», «Dragon's Descendant Knochenbeil»,
// «Cat's Eye Nails: Abnehmbare Sticker in Mint»), die längst deutsch übersetzt sind.
//
// Der tragfähige Test fragt nicht «ist das Englisch?», sondern «wurde überhaupt übersetzt?»:
// Stehen praktisch ALLE Titelwörter schon im englischen CJ-Lieferantennamen, hat das Modell die
// Quelle abgeschrieben statt übersetzt. Ein echt deutscher Titel schafft das nie — deutsche
// Wörter kommen im englischen Quelltext nicht vor. Verglichen wird per SUBSTRING, damit auch der
// abgeschnittene Fall greift («back» steckt in «backpack»).
//
// Zusätzlich VETO bei jedem deutschen Marker im Titel. Das schützt Titel, deren Wörter in beiden
// Sprachen gleich heissen — «Centechia 1-zu-3 RJ45 Ethernet Splitter» ist korrektes Deutsch,
// obwohl jedes Einzelwort auch im englischen Namen steht. Anglizismen wie «High Waist»,
// «Slim Fit», «Oversized», «Wireless» oder «3-in-1» bleiben damit unangetastet; sie sind im
// CH-Modehandel normal (CLAUDE.md, Titel-Anglizismen).
//
// Gegen 8'629 aktive cj-real-Titel der Woche vom 14.–20.08.2026 geprüft.

const DEMARK=/[äöüÄÖÜß]|\b(und|für|mit|aus|der|die|das|den|dem|des|ein|eine|einen|einem|im|in|zu|zum|zur|von|bei|auf|ohne|nach|vor|oder|als|wie|ist|sind|zwei|drei|vier|fünf)\b/i;
const flach=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

// true  = der Titel ist der englische Lieferantenname, nicht übersetzt → NICHT publizieren
// false = übersetzt, oder zu wenig Anhalt für ein sicheres Urteil → durchlassen
export function echoVomLieferanten(titel, quellName){
  if(!titel || DEMARK.test(titel)) return false;
  const q=flach(quellName).replace(/[^a-z0-9]+/g,'');
  if(q.length<8) return false;                       // ohne Quellnamen kein Urteil
  const w=flach(titel).split(/[^a-z0-9]+/).filter(x=>x.length>=3);
  if(w.length<3) return false;                       // Marken-/Modellkürzel nicht antasten
  return w.filter(x=>q.includes(x)).length/w.length >= 0.9;
}
