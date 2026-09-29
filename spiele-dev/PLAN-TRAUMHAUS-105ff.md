# Traumhaus — Plan für Runde 105 ff. (geschrieben 2026-09-29, Budget-Sparmodus)

> Für die nächste Session mit frischem Budget. Stand: PR #2528 (Branch `claude/zen-knuth-hya5zc`, Kopf `1d3651c`,
> Runde 89–104) ist grün, konfliktfrei, Draft, wartet auf den Merge nach `main`. Alles Folgende ist NICHT begonnen.
> Arbeitsregel bleibt: **erst Messgerät (mit Gegenprobe), dann eine Änderung, dann nachmessen, dann Commit** —
> ein Thema je Runde, jede Runde einzeln committen, damit nie halb fertige Arbeit liegen bleibt.

## 0. Zuerst (billig, 1 Session-Anfang)
1. **Nach dem Merge:** `curl -sL https://abannews.com/traumhaus.html | grep -c stufeDaten` (> 0 = Runde 104 live).
   Falls 0: `actions_list list_workflow_runs resource_id=cf-deploy-mainsite.yml` und das Log lesen (Lehre 2026-09-23).
2. **Volle Prüfreihe einmal auf `main`:** `th-alle` (nicht `--schnell`), Befunde in die Liste unten eintragen.
3. Check-in-Routine für den PR beenden, sobald gemergt (steht so im Trigger-Text).

## 1. Handy-Start: 174 MB Modelle, 61 s Parser-Blockade (Runde 103 „nicht gelöst") — GROSS, 2–3 Sessions
Messgeräte vorhanden: `th-laden handy`, `probe-ladenah [alt|neu] [R]`, `probe-aufrufe`.
- **Modelle kleiner:** meshopt/Draco-Kompression als Bauschritt in `tools/assets/` (GLB in place, Loader mit Decoder);
  Texturen auf 1024 px deckeln. Erwartung: 174 MB → < 60 MB. Gegenprobe: `th-pruef` Modelle 1001, `th-echt` unverändert.
- **Parser aus dem Hauptfaden:** GLTFLoader mit Worker (three.js `setMeshoptDecoder`/`KTX2`) — misst `th-laden`
  (längste Blockade 13,8 s → Ziel < 1 s).
- **Echtes Nachladen nach Entfernung:** bricht heute die Schlusskette (freiRaeumen/entwirren/Zoo hängen an der LETZTEN
  Datei, `_ladeFertigEins`). Erst die Kette auf „nahe Menge fertig" umhängen (Sonde: `probe-stabil` darf danach nicht
  wandern), dann Fernes nach dem Start laden.
- **Service Worker Cache** für GLB (zweiter Start ohne Netz). Messen: `probe-ladenah` zweiter Lauf.

## 2. Unendliches Spiel, zweite Schicht (Runde 104 offen) — MITTEL, je 1 Session
Messgerät: `probe-sog 365` (Ereignis-Tage je 30 Tage; Ziel: kein 30-Tage-Fenster unter 8 Ereignis-Tagen).
- **Ausbau-Dichte fällt ab Monat 5** (Verdopplung → 4–7 Ereignis-Tage/30). Optionen: Preis ×1,6 mit mehr Stufen
  (Sonde entscheidet), ODER neue Senke **Stadtprojekte** (Brücke, Park, Denkmal, Seilbahn-Ausbau: Ziel mit Prämie
  und sichtbarem Bau in der Welt) — die späte Ereignisquelle, die dem Spiel noch fehlt.
- **Neues Spiel+ / Prestige:** freiwilliger Neustart mit dauerhaftem Bonus (+5 % je Durchlauf, Abzeichen), Endlos-Schleife
  statt Endlos-Leiter. Spielstand-Umweg mit `th-speichern` prüfen.
- **Wochen-Herausforderung:** Seed aus Kalenderwoche, ein Ziel („3 Häuser auf Ausbau 4"), Prämie; Rückkehr-Anlass.
- **Karriere spät:** Lv alle 45–55 Tage — `xpNeed` prüfen, Karriere-Titel ab Lv 10 (erzeugt wie `rangDaten`).
- **Erfolge erzeugt:** Ikone/Legende ab V automatisch mit römischen Zahlen (th-erfolge-Regel: nur am Listenende, `];`
  auf eigener Zeile).
- **Komfort real messen:** Sonde, die zählt, wie viele nutzbare Möbel auf dem Grundstück wirklich Platz haben —
  `probe-sog` rechnet ohne Komfort (Lehre Runde 104); damit auch der Palast (12) auf dem Handy erreichbar bleibt.
- Kopfzeile auf Handy < 1000 px zeigt keinen Stufennamen — prüfen, ob „Vermögen" dort noch verständlich ist (`th-hud`).

## 3. Beobachtet, nicht behoben (aus dem PR-Text; klein bis mittel, je ½–1 Session)
- Kleinste Handys ≤ 340 px Höhe: Tacho ausgeblendet → Radio nicht umschaltbar → Senderknopf ins Menü (`th-hud`).
- Müllwagen Zubringer 60° streift den Sportplatz (Flutlichtmast + Ballfangzaun im Band; `th-autoboden` 1–3 Proben).
- Doppelmündung x 60 (Zubringer 300° + Bauernhof-Anschluss): sehr breite Mündung → Kreuzung umbauen (`th-kante`,
  `probe-schild`, `probe-stufen`).
- ~440 Zeichenaufrufe Bewegtes an der Kreuzung (Figuren: jede Gliedmasse ein Teil) → je Gelenk zusammenfassen
  (`probe-aufrufe`, `probe-zusammen`, `probe-anfasser`).
- „Schwarze Zacke" am Grossen Berg: Ende des Fahrweg-Bands am 52°-Hang; Bergwege radial statt tangential verbreitern
  (`probe-bergstrasse`, Luftbild).
- 9 schmale Wiesenstreifen neben Steinenden, wo die andere Fläche tiefer liegt (Runde 98, `probe-stufen` „Löcher").
- Wendeplatz am Strand ragt 6 m über den Sand (Pier-Optik) — entscheiden: Pier bauen oder kürzen.
- Fluggastbrücke × Flugzeug 2,4 m = Zeitpunkt der Andock-Animation — `th-echt` soll Bewegtes zum Zeitpunkt kennen.

## 4. Messgeräte-Hygiene (klein, nebenbei)
- `probe-r103` + `probe-r104` zu einer `probe-fortschritt` zusammenlegen (gleiche Spielfunktionen).
- `probe-sog`: Komfort-Modell ergänzen (s. 2), Ausbau-Politik „billigster zuerst" ist drin.
- `th-erfolge` Rahmenprobe dauert jetzt ~4 min (wartet auf Ruhe) — in `th-alle --schnell` prüfen, ob das Zeitbudget hält.
- `th-boden` kennt Inseln generisch — bei neuen Wasserflächen (Bergsee!) prüfen, ob `_wasser` sie führt.

## 5. Spielinhalt-Ideen (User-Wünsche: „cooler, nicht KI-generiert", „GTA-Stil", „grösser", „süchtig") — je 1 Session
- Fahrzeug-Tuning als Geldsenke mit sichtbarem Effekt (Lack, Felgen, Tempo) — Vorbild GTA, nur Muster.
- Foto-Modus (Bild speichern/teilen) — billige Reichweite.
- Haustier (folgt, kostet Futter, Erfolg) — Rückkehr-Anlass.
- Koop-Aufträge (Netz existiert: `netSend`) — gemeinsames Stadtprojekt.
- Wetter wirkt auf Einnahmen (Regen: weniger Lieferungen, mehr Taxi) — Vielfalt ohne neue Modelle.
- Bestenliste lokal (Vermögen, Rang) — kein Server nötig.

## 6. Budget-Regeln für die nächste Session
- Reihenfolge nach Wert/Kosten: 0 → 3 (billige Befunde) → 2 → 5 → 1 (gross, nur mit vollem Budget).
- Keine zwei Browser-Sonden gleichzeitig; Sonden-Ausgaben kurz halten (`cut -c1-200`, nur ❌-Zeilen).
- Jede Runde: Messung vorher, Änderung, Messung nachher, Runbook-Abschnitt, Commit, Push — dann erst die nächste.
- Geheimnisse (API-Schlüssel) nie in Chat, Dateien oder Commits — nur als Umgebungs-/GitHub-Secret setzen.

## 7. Kritik von ChatGPT (gpt-5, 2026-09-29) — auf Wunsch des Users eingeholt, ungefiltert

> Eingabe: Runbook-Abschnitt Runde 104 + Abschnitte 0–6 dieses Plans. Bewertung der Punkte folgt in der nächsten Session
> (Prüfen: Rangpunkte aus Brutto sind tatsaechlich exploitbar? Micro-Ziele mit ETA aus vorhandenen Zahlen = billigste Massnahme).


1) Schwächen/Risiken Runde-104-Design (Endlosspiel)
1. Reine Zahlenleiter ohne neue Systeme: Nach ~2–4 h sind alle Mechaniken bekannt, danach nur Skalierung (Vermögen, Rang, Ausbau). Kein neues Feature/Interaktion nach 20 h → Monotonie, kein „second layer“ (Risiko: Abbruch trotz „unendlich“).
2. Grind-Anreiz durch Rangpunkte pro „verdient“ statt Nettogewinn: Farming/Exploit möglich (Flippen, Kleinsttransaktionen, Rückerstattungen), Progress wird vom geschicktesten Exploit dominiert statt vom Spiel. Untergräbt Fairness und Koop.
3. Ereignis-Kadenz bleibt mechanisch: 4–6 Tage Ingame zwischen Highlights ab Monat 5 sind „leere Strecken“ ohne Entscheidung. Es fehlt eine reaktive Zwischenlage (Events, Mini-Ziele), die Gaps füllt.
4. Kein Risiko/Spannung: Keine Kostenwellen, Brüche oder Dilemmata (Wartung, Steuern, Marktpreise, Zufallsereignisse). Progress ist deterministisch → geringe Retention.
5. Sichtbarkeit der Fortschritte sinkt: Hohe Ausbaustufen sind unsichtbare Zahlen; wenig neue Optik/Spielgefühl bei Stufe 8–12. Motivationsknick, v. a. auf Mobile.
6. Koop ohne Koop-Ziele: WebRTC existiert, aber keine kooperativen Anreize/Belohnungen → Feature „unsichtbar“ für Retention.
7. Onboarding/Ziele-Transparenz: „Vermögen“ als Stufen-Kriterium ersetzt „Wert“; auf <1000 px HUD fehlt der Stufenname → unklare Nächstziele/ETA auf Handy.
8. Wirtschaft kann kippen: 50 % Mietenje-Stufe + exponentielle Ausbaukosten wirken stabil, aber ohne Gegenkräfte (Wartung, Leerstand, Steuern) droht späterer Überschuss/Übersättigung (erneut „Geldstapel ohne Nutzen“).
9. Karriere spät und flach: 45–55 Tage je Level ab Mitte → de-facto obsolet als Motivator im Spätspiel.
10. Komfort-Realität ungemessen: Risiko, dass reale Grundstück-Limits Progress heimlich drosseln (wurde schon fast passiert).

2) Plan-Lücken, Fehlpriorisierungen, Overkill
1. Fehlend: Exploit-Schranke fürs Rangsystem (Brutto→Netto; Ausnahmen für Rückerstattungen). Muss vor jedem weiteren Meta-Progress.
2. Stadtprojekte nur als Option „ODER“ zu Preisschraube: Das ist der dringendste späte Ereignis-Lieferant und sollte vor Balancingschrauben kommen (liefert neue Ziele + Sichtbarkeit).
3. Kein „Session-Ziele/ETA“-Layer: Auf Mobile brauchen Spieler jederzeit „Nächstes Ziel in X min / Schritt Y von Z“.
4. Prestige/NG+ zu früh vorgeschlagen: Ohne neue Mechanik wird nur Reset mit +5 % Bonus → gleiche Langeweile schneller. Erst neue Senken/Interaktionen, dann Prestige.
5. Komfort-Sonde steht unter „2“, aber sie ist Blocking für Balancing-Entscheidungen (und Erfolgserreichbarkeit am Handy). Höher priorisieren.
6. Service Worker ja; aber kein Fallback für teilweises Laden/Abbruch (Resume/Graceful Degradation). Mobile Drop-offs bleiben sonst hoch.
7. Wetter/Bestenliste/Haustier/Tuning wirken teurer als ihr Nutzen für Kernprobleme (Kadenz, Sichtbarkeit, Exploit). Niedriger priorisieren.
8. GLTF-Kompression/Worker sind richtig, aber Textur-Deckel 1024 px kann zu sichtbarer Qualitätsminderung an Close-ups führen; ergänze Mip-Tuning/Aniso-Check, sonst UX-Schaden.

3) Drei Maßnahmen mit bestem Wirkungs-/Aufwandsverhältnis (+ Messung)
1. Session-Ziele + ETA auf HUD (Micro-Missions)
   - Inhalt: Immer 3 kleinschrittige Ziele mit Zeit-/Kosten-ETA (z. B. „Nächster Ausbau X in ~7 min“, „Verdiene 25’000 $ für +10 Rangpunkte“, „Kaufe Parkbank-Set für +2 Komfort“). Belohnung: kleine Prämie/Boost.
   - Aufwand: UI + 3–4 einfache Heuristiken (es gibt alle Zahlen im Spiel).
   - Wirkung: Füllt Gaps, gibt Klarheit, steigert 2h- und 20h-Bindung.
   - Messung: 
     - Neue Kennzahlen: mediane „Leerlauf-Minuten ohne Ziel“ (Client), Anteil Sessions mit >2 erfüllten Micro-Zielen.
     - probe-sog (365): zusätzlich „Durchschnitt ETA zum nächsten Ereignis“; Ziel < 10 min ab Monat 5.
2. Rangpunkte auf Nettogewinn umstellen + Anti-Exploit
   - Inhalt: Punkte aus (Einnahmen – Ausgaben) nur bei Netto-Plus; Ausschlüsse: Rückerstattungen/An- und Verkauf gleicher Kategorie innerhalb 60 s; Cap pro Realtime-Minute.
   - Aufwand: 1–2 Funktionen in verdiene()/buche(), kleine Fenster-Queue; Migration stats.
   - Wirkung: Fairness, verhindert Grind-Loops, stabilisiert Progress-Kurve.
   - Messung:
     - A/B mit probe-sog: Punkte-Zuwachs/30 Tage stabil vs. ausreißerfrei.
     - In-Game: Anteil Transaktionen, die gefiltert wurden (< 5 % Ziel).
3. Stadtprojekte „leichtgewichtig“ als späte Senke/Ereignisquelle
   - Inhalt: 4 generische Projekte (Park, Brücke, Denkmal, Seilbahn-Ausbau) mit 3–5 Bauphasen, skalierende Kosten, kleine Stadtweiteffekte (+x % Miete für Wohnbezirk, +Taxi-Nachfrage etc.). Nutzung vorhandener Modelle/Plätze.
   - Aufwand: 1 Datenstruktur, 1 Fortschritts-UI, Phasen als sichtbare Platzhalter; keine neuen GLBs nötig.
   - Wirkung: Späte, sichtbare Meilensteine, Koop-Anker, füllt 4–6-Tage-Lücken.
   - Messung:
     - probe-sog: Ereignis-Tage/30 ab Monat 5 von 4–6 auf ≥8.
     - In-Game: Projekte pro 30 Tage, Abbruchquote zwischen Phasen (< 20 %).
