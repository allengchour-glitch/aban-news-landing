// Erkennt eine medizinische ZWECKBESTIMMUNG in Titel + Beschreibungstext.
//
// BEFUND (14.08.2026): Acht im August neu importierte Geräte standen aktiv im Shop UND im
// Google-Kanal, obwohl sie nach MepV eine Konformitätsbewertung brauchen — ein Temperatur-
// pflaster, das bei kranken Kindern ab 38 °C Alarm schlägt, zwei Elektrostimulations-
// Schlafgeräte (CES/EMS), ein Endoskop für den Gehörgang, zwei Korrektursets für eingewachsene
// Nägel, ein elektrischer Zahnsteinentferner und ein Baby-Pflegeset mit klinischem Thermometer.
//
// URSACHE, und der eigentliche Grund für diese Datei: `automation/medizinprodukte_guard.py`
// sucht nach PRODUKTNAMEN («Hörgerät», «Stirnthermometer»). Alle acht tragen ihren Zweck nur im
// Beschreibungstext und heissen nach aussen «Gadget», «Beauty» oder «Haushalt». Ein Bestands-
// reiniger allein hätte nichts geändert: der Importer legt am nächsten Tag die nächsten an.
// Deshalb prüft cj_category_fill.mjs jetzt VOR dem Anlegen — Ware wird nicht verworfen, sondern
// als DRAFT mit Tag `medizinprodukt-pruefen` angelegt und NICHT in die Kanäle publiziert.
//
// PROBELAUF über 31'398 aktive Produkte: 8 Treffer, 0 Fehltreffer. Vorher aussortiert
// (Sperrliste in medizin_zweck.json, jeweils mit Begründung dort):
//   • 4 Hunde-Kauspielzeuge («reduziert Zahnstein») — Zahnstein beim Tier
//   • 1 Glättbürste («Heizmethode: PTC-Fieber») — Fehlübersetzung von 发热 = Wärmeerzeugung
//   • 4 Beauty-Mikrostromgeräte (Falten, Augenpartie, straffe Haut) — Kosmetik, keine Krankheit
//   • 1 Smartwatch-Schutzhülle (nennt die EKG-Funktion der Uhr) — Zubehör
//   • 1 Ear-Clip-Sportheadset («ohne den Gehörgang zu verschliessen») — Kopfhörer
//   • 1 Ultraschallreiniger für Zahnspangen — reinigt Apparate ausserhalb des Mundes
//
// BEWUSST NICHT ERFASST: Smartwatches/Armbänder mit Körpertemperatur-, EKG- oder Blutdruck-
// Anzeige. Das ist eine eigene, im Gedächtnis schon notierte Baustelle (135 aktive Wearables);
// würde dieses Muster sie mitnehmen, drafteten Importer und Reiniger schlagartig die halbe
// Uhren-Abteilung. Für eigenständige Messgeräte (Blutdruckmessgerät, Pulsoximeter) greift es.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(fs.readFileSync(path.join(HIER, 'medizin_zweck.json'), 'utf8'));

const bau = (l) => l.map(x => ({ n: x.n, re: new RegExp(x.re, 'i'),
                                 nicht: x.nicht ? new RegExp(x.nicht, 'i') : null }));
const SPERRE = bau(M.sperre);
const TREFFER = bau(M.treffer);

// Nimmt HTML oder Klartext. Gibt null zurück, wenn nichts vorliegt, sonst
// {grund, muster, stelle} — `stelle` ist der Textausschnitt für den Probelauf.
export function medizinZweck(titel, text) {
  const roh = String(titel || '') + ' || ' + String(text || '');
  const klar = roh.replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                  .replace(/\s+/g, ' ');
  for (const s of SPERRE) if (s.re.test(klar)) return null;
  for (const t of TREFFER) {
    if (t.nicht && t.nicht.test(klar)) continue;   // Sperre gilt NUR für diese Regel
    const m = t.re.exec(klar);
    if (m) return { grund: t.n, muster: m[0].slice(0, 90),
                    stelle: klar.slice(Math.max(0, m.index - 60), m.index + 120) };
  }
  return null;
}

export default medizinZweck;
