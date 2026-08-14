// Erkennt verdeckte ÜBERWACHUNGSTECHNIK und Waffen gegen Menschen an ihrer FUNKTION —
// nicht an der Produktbezeichnung, die der Lieferant gewählt hat.
//
// BEFUND (14.08.2026): Elf Produkte standen aktiv im Google-Kanal, obwohl beide Gruppen dort
// seit dem 12.08. gesäubert sein sollten. Der 12.08.-Lauf verlangte, dass der Verkäufer sich
// selbst verrät — «versteckte Kamera», «Teleskopschlagstock», ein Klingen-Nomen oder die
// Wortendung «…waffe». Wer sein Produkt anders nennt, blieb drin:
//   • «SQ13 Wireless Mini-Kamera» — rein technischer Text, kein einziges Tarnwort. Ihre beiden
//     SQ11-Zwillinge wurden am selben Tag entfernt.
//   • «A9 Mini-WLAN-Kamera», «Kabellose HD-Kamera mit Fernbedienung», «HD Video Recorder»,
//     «Mini HD-Überwachungskamera» — identische Würfel-/43×35×25-mm-Bauform, alle mit dem Satz
//     «lässt sich diskret platzieren». Das Muster vom 12.08. verlangte «diskret» PLUS ein
//     Aufnahmewort direkt dahinter; hier folgt «platzieren», also kein Treffer.
//   • «Automatischer Feder-Abwehrstock» statt «Teleskopschlagstock», «Selbstverteidigungs-
//     WERKZEUG» statt «…waffe», «PC Defense Stick» statt «Schlagstock».
// Drei der elf waren zusätzlich als «Aufbewahrung & Organizer» deklariert, einer als
// «Werkzeug & Heimwerken» — sie rutschen durch jede Warengruppenprüfung.
//
// WARUM DIESE DATEI UND NICHT NUR EIN AUFRÄUMLAUF: Der Importer publiziert jedes neue Produkt
// in alle sechs Kanäle, Google inbegriffen. Zwei der elf Fälle wurden NACH dem letzten
// Säuberungslauf angelegt — ein Bestandsreiniger allein hätte sie am nächsten Tag wieder
// vorgefunden. Deshalb prüft cj_category_fill.mjs jetzt VOR dem Publizieren, genauso wie bei
// der medizinischen Zweckbestimmung. Ware wird nicht verworfen: sie kommt als Entwurf in den
// Shop und lässt sich jederzeit freischalten.
//
// PROBELAUF über alle aktiven Produkte im Google-Kanal (Export 12.08. + Live-Nachzug bis
// 14.08.): 14 Treffer. Vorher aussortierte Fehltreffer stehen mit Begründung in
// heikel_zweck.json — die teuersten waren:
//   • 4 Kamera-/Wanzen-DETEKTOREN (sie suchen versteckte Kameras — das Schutzgerät zu
//     bestrafen wäre die Umkehrung des Zwecks)
//   • 8 Ansteck-/Kragenclip-Mikrofone («unauffällige Befestigung am Kragen» = Videozubehör)
//   • 5 Polizei-Spielfiguren und ein Modellauto-Set («Schlagstock» bzw. «Selbstverteidigungs-
//     streitkräfte Typ 16» in der Zubehörliste), «Washed Machete Jeans» (eine Waschung)
//   • 3 Paar Militär-/Wanderstiefel und eine taktische Weste, deren Text «Kampfsport,
//     Selbstverteidigung» als Einsatzzweck aufzählt
//   • 16 Mini-Drohnen mit Kamera, ein FPV-Rahmen, ein Sportkamera-Adapter, eine TF-Karte
//   • 5 Elektroschock-Hundehalsbänder und eine Mückenklatsche (richten sich nicht gegen
//     Menschen — ob Reizstrom am Hund verkauft werden soll, ist eine Tierschutzfrage und
//     gehört nicht in dieses Muster)
//
// BEWUSST NICHT ERFASST, obwohl das Wort «diskret» vorkommt: Smart-Brillen mit offener
// 8-MP-Kamera (sie verbergen nichts), fest montierte Innen-/Aussenkameras, Babyphones,
// Türspione, Dashcams, Wildkameras, ein MP3-Diktiergerät («diskret, da kein Display») und der
// U03-Aufnahme-Stick («handlich und diskret»). Die Trennlinie ist nicht das Wort, sondern ob
// die Unauffälligkeit dazu dient, ANDERE unbemerkt aufzunehmen.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(fs.readFileSync(path.join(HIER, 'heikel_zweck.json'), 'utf8'));

const bau = (l) => l.map(x => ({ n: x.n, re: new RegExp(x.re, 'i') }));
const SPERRE = bau(M.sperre);
const TREFFER = bau(M.treffer);

// Welche Treffer sind zugleich in der Schweiz verbotene Ware? Diese kommen nicht nur aus den
// Kanälen, sondern werden gar nicht erst aktiv geschaltet.
const VERBOTEN = new Set(['ch-verbotene-waffe', 'elektroschock-gegen-menschen']);

// Nimmt HTML oder Klartext. Gibt null zurück oder {gruppe, grund, muster, stelle, verboten}.
// gruppe: 'ueberwachung' | 'waffe'
export function heikelZweck(titel, text) {
  const roh = String(titel || '') + ' || ' + String(text || '');
  const klar = roh.replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                  .replace(/\s+/g, ' ');
  for (const s of SPERRE) if (s.re.test(klar)) return null;
  for (const t of TREFFER) {
    const m = t.re.exec(klar);
    if (!m) continue;
    const gruppe = /waffe|elektroschock/.test(t.n) ? 'waffe' : 'ueberwachung';
    return { gruppe, grund: t.n, muster: m[0].slice(0, 90),
             verboten: VERBOTEN.has(t.n),
             stelle: klar.slice(Math.max(0, m.index - 60), m.index + 140) };
  }
  return null;
}

export default heikelZweck;
