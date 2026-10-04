# 🔧 Shop-QA 04.10.2026 — was wirklich kaputt war

> Reihenfolge der Prüfung: Katalog-Mechanik → Warn-Tags → Marge → Recht → Wortlaut.
> Jede Zahl ist gemessen, jede Behauptung mit einer Gegenprobe.

## 1. ⛔ Ich hatte selbst ein Verlustgeschäft live geschaltet

`holzspiegel-im-europaischen-stil-621200` trug die Tags **`marge-verlust-draft`** und
**`verlust-auto-draft`** — eine Automatik hatte das Produkt genau deshalb auf DRAFT gesetzt.
Ich habe es heute Mittag reaktiviert („404-Chance gerettet", PR #2595) und die Tags übersehen.

**Gemessen:** Verkaufspreis **CHF 15.90**, hinterlegter Einkauf **CHF 33.62** → **−17.72 pro Stück**,
vor Versand. Es stand in **9 Kanälen**.

**Erledigt:** zurück auf DRAFT, Tag `verlustverkauf-gestoppt-0410`, live 404 geprüft.
**Keine Bestellung betroffen** (letzte 20 Bestellungen geprüft).

**Lehre:** Vor dem Aktivieren eines DRAFT-Produkts die Tags lesen. Ein DRAFT hat meistens einen Grund,
und `*-verlust-*` ist der teuerste davon. Platz 17 für «holzspiegel» ist das nicht wert — rentabel wäre
die Seite erst ab etwa CHF 50. Das ist eine Preisentscheidung des Users, keine QA-Frage.

## 2. ✅ Gegenprobe: sonst verkauft nichts unter Einkauf

Katalogweiter Scan über alle aktiven Produkte mit hinterlegten Kosten:
**0 Produkte unter Einkaufspreis, 0 mit Marge unter 15 %** (6956 von 7200 geprüften Produkten haben
Kostenangaben). Der Holzspiegel war ein Einzelfall — verursacht durch meine Reaktivierung, nicht durch
ein Katalogproblem.

## 3. ⚖️ Ein Produkt mit Rechtsrisiko war aktiv

`ir-nachtsicht-kamera-stift-mit-bildschirm-607000` — Kamera im Kugelschreiber, getaggt
**`verdeckte-ueberwachung`**, aktiv in 3 Kanälen. Dieselbe Klasse wie der GPS-Tracker, den ich heute
Mittag bewusst nicht aktiviert habe (StGB Art. 179bis ff. / 179quater).
**Erledigt:** DRAFT, Tag `rechtspruefung-0410`, live 404 geprüft.

## 4. 🩺 Zwei Trainingsgeräte klangen nach Diagnosegerät

Die beiden Beckenboden-Trainer enthielten **keine Heilversprechen** (geprüft auf heilt/Therapie/
Inkontinenz/klinisch → 0 Treffer), aber Übersetzungsartefakte mit medizinischem Beiklang:
«**Reparatur** der Beckenbodenmuskulatur», «**Reparatursonde**», «Sonde zur **Beurteilung**»,
«den Zustand … **analysieren**». Eine behauptete Diagnosefunktion kann ein Produkt zum Medizinprodukt
machen (MepV); das ist bei einem Trainingsgerät aus dem Dropship-Katalog nicht gewollt.

**Erledigt:** nur die Formulierungen ersetzt, **keine neuen Aussagen** — Reparatur → Kräftigung,
Reparatursonde/-kopf → Trainingsaufsatz, Beurteilungssonde → Trainingsaufsatz. Beide Seiten live
geprüft, 0 Restbegriffe. Produkte bleiben verkäuflich.
*Nebenbefund:* Die erste Live-Prüfung meldete noch «Reparatur» — das stand in einem **Theme-Kommentar**
vom 14.08., nicht im Produkttext. Messgerät las Theme-Quelltext mit.

## 5. ✅ Was gemessen wurde und sauber war

| Prüfung | Umfang | Ergebnis |
|---|---|---|
| Produkte ohne Bild | 12 000 aktiv | **0** |
| Bilder nicht READY | 12 000 | **0** |
| Aktiv, aber in 0 Kanälen | 12 000 | **0** |
| Preis 0 | 12 000 | **0** |
| Varianten ausverkauft | 1516 mit Mehrfachvarianten | 98,7 % voll verfügbar |
| Interne Links in Produkttexten | 118 Ziele | **alle 200** |
| Leere Collections im Onlineshop | 530 Collections | 3 leer, alle **nicht** im Onlineshop (404) |
| Produkte mit Sperrtag `cj-nicht-versendbar-ch` aktiv | — | **0** |
| Verkauf unter Einkauf | 6956 mit Kosten | **0** (nach Fix) |

**Zwei eigene Fehlalarme unterwegs korrigiert:** „10 Produkte nicht kaufbar" (Messgerät las nur die
ersten 4 Varianten — alle 10 sind kaufbar) und „13 kaputte Links" (alles HTTP 429, nicht 404).

## 6. 🟡 Für den User

- **Holzspiegel:** ab ca. CHF 50 rentabel. Preis setzen → ich schalte ihn wieder live, inkl. Platz 17.
- **Gemini-Credits sind aufgebraucht** (HTTP 402) → importierte Reviews bleiben in der Originalsprache.
