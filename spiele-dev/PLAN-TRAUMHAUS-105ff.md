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

## 8. Story, Missionen, Bewegung, „wie echt" — Entwurf von Gemini (gemini-2.5-pro, 2026-09-29), auf Wunsch des Users

> User: „gute story auch oder missionen? aufträge etc? viel bewegung und alles wie echt machen". Entwurf ungefiltert; vor dem
> Einbau pruefen: Missionen nur mit vorhandenen Systemen (Angelrute/Tuning-Kit/Schatzkarte gibt es noch nicht), Figuren als
> feste Passanten mit Tagesablauf (Stunde → Ort), Auftraege ueber die bestehende Endlos-Auftrags-Vorlage (PQ) einhaengen.
> Billigster Einstieg fuer Runde 105: die „klein"-Punkte unter BEWEGUNG (Schulweg, Regen-Reaktion, Glocken/Zugansage,
> Enten) + 3 Story-Missionen (1, 2, 7) mit Elian/Lena/Luca als benannte Passanten. Messen: probe-sog um Missionskette erweitern.


### 1. STORY-BOGEN

**Akt 1: Ankunft und Fundament.** Mia kommt als Neuling in die Stadt, ohne grosses Vermoegen. Sie lernt die Grundlagen, um sich ein Leben aufzubauen: erster Job, erstes kleines Haus, erste Kontakte. Sie beweist ihren Wert durch Fleiss und Zuverlaessigkeit und erarbeitet sich den Respekt der Dorfgemeinschaft.

**Akt 2: Wachstum und Gemeinschaft.** Mia ist etabliert und wird zur treibenden Kraft. Sie investiert nicht nur in ihr eigenes Eigentum, sondern engagiert sich in Grossprojekten, die allen zugutekommen, wie dem Stadtfest oder der Modernisierung von Infrastruktur. Ihre Entscheidungen praegen sichtbar das Stadtbild und die Wirtschaft.

**Akt 3: Vermächtnis und Einfluss.** Als eine der wohlhabendsten und angesehensten Personen der Stadt sichert Mia deren Zukunft. Sie agiert als Mentorin und Investorin, finanziert Wahrzeichen und sorgt dafuer, dass der Ort auch fuer kommende Generationen ein "Traumhaus" bleibt. Ihr Fokus liegt nun auf dem grossen Ganzen.

**Wiederkehrende Figuren:**
*   **Elian Gerber:** Der pragmatische Gemeindepraesident im Rathaus. Er will, dass die Stadt waechst, modern und attraktiv bleibt.
*   **Lena Bachmann:** Die bodenstaendige Baeuerin vom Bauernhof. Sie will ihre Produkte frisch auf den Markt bringen und den Hof am Laufen halten.
*   **Marco Frei:** Der Auto-enthusiastische Mechaniker im Technikpark. Er will die schnellsten und schoensten Autos in der Stadt sehen.
*   **Sofia Zuercher:** Die elitaere Architektin und Investorin aus der Sunnehalde. Sie will Aesthetik und maximalen Profit aus Immobilien.
*   **Luca Schmid:** Der alte Fischer am Seepark. Er will die Traditionen bewahren und sorgt sich um die Natur rund um den See.

### 2. 12 STORY-MISSIONEN

1.  **Willkommen in der Neustadt** — Erreiche Buergerrang 2 — 500 Fr. und 20 Rangpunkte — Elian Gerber — Rathaus
2.  **Eine helfende Hand** — Ernte 10 Kisten Gemuese — 1'000 Fr. und Werkzeug-Upgrade — Lena Bachmann — Bauernhof
3.  **Frisch auf den Tisch** — Schliesse eine Lieferung fuer Lena ab — 1'500 Fr. und Zugang zu Liefer-Auftraegen — Lena Bachmann — Marktplatz
4.  **Mobilitaet ist alles** — Kaufe dein erstes Auto — 2'000 Fr. und Rabatt auf erste Lackierung — Marco Frei — Technikpark
5.  **Ein Dach ueber dem Kopf** — Baue dein Haus auf Wohnstufe 3 aus — 5'000 Fr. und neue Moebel-Optionen — Sofia Zuercher — Sunnehalde
6.  **Das erste Investment** — Kaufe ein zweites Haus zur Vermietung — 10'000 Fr. und 5 % hoehere Miete fuer dieses Haus — Sofia Zuercher — Buergli
7.  **Die Ruhe des Sees** — Fange 5 Fische im See — 3'000 Fr. und eine bessere Angelrute — Luca Schmid — Seepark
8.  **Ein Fest fuer alle** — Spende 20'000 Fr. fuer das Stadtfest — Permanenter Erfolg und Verdopplung der Einnahmen am Festtag — Elian Gerber — Chilbiplatz
9.  **Portfolio-Aufbau** — Erreiche 5'000 Fr. Mieteinnahmen pro Woche — 25'000 Fr. und Zugang zu Luxus-Immobilien — Sofia Zuercher — Neustadt
10. **Der Traum vom Sportwagen** — Kaufe ein Auto im Wert von ueber 100'000 Fr. — Gratis Tuning-Kit und exklusive Felgen — Marco Frei — Technikpark
11. **Geheimnis der Pirateninsel** — Fange einen "Legendären Silberbarsch" nahe der Pirateninsel — Schatzkarte (fuehrt zu 50'000 Fr.) — Luca Schmid — Meer
12. **Ein Denkmal fuer die Zukunft** — Spende 250'000 Fr. fuer die neue Seepark-Bruecke — Namensplakette auf der Bruecke und höchster Buergerrang — Elian Gerber — Seepark

### 3. 6 AUFTRAGS-VORLAGEN

*   **Express-Lieferung:** Lena Bachmann braucht dringend 5 Kisten Tomaten fuer das Restaurant am Marktplatz, weil eine Reisegruppe unerwartet eingetroffen ist.
*   **Immobilien-Aufwertung:** Sofia Zuercher will, dass du ein Mietshaus in der Rebhalde auf Wohnstufe X ausbaust, um einen anspruchsvollen Mieter zu gewinnen.
*   **VIP-Fahrdienst:** Elian Gerber braucht einen diskreten Fahrer, der einen Investor vom Flughafen zum Hotel in der Neustadt faehrt.
*   **Exotischer Fang:** Der Zoo benoetigt drei seltene Flusskrebse fuer das neue Aquarium, die nur im Fluss nahe der Burg zu finden sind.
*   **Testfahrt-Vorbereitung:** Marco Frei bittet dich, ein frisch getuntes Auto unfallfrei vom Technikpark zu einem Kunden in der Sunnehalde zu ueberfuehren.
*   **Materialtransport:** Die Schmiede in Burgdorf braucht eine Lieferung Eisenerz vom Gesteinsbruch am Grossen Berg, um neue Werkzeuge herzustellen.

### 4. BEWEGUNG

*   **Figuren-Tagesablauf:** Die 5 Hauptfiguren sind nur zu bestimmten Zeiten an ihren Hauptorten; abends sind sie z.B. im Restaurant am Marktplatz (Aufwand: mittel).
*   **Schulweg:** Gruppen von Kindern laufen um 07:30 Uhr und 12:00 Uhr zwischen den Wohnvierteln und der Schule in der Neustadt (Aufwand: klein).
*   **Wetter-Reaktionen:** Passanten spannen bei Regen Regenschirme auf und laufen schneller; bei Sonnenschein sitzen mehr Leute im Seepark (Aufwand: klein).
*   **Markttag:** Jeden Samstagvormittag sind auf dem Marktplatz zusaetzliche Marktstaende und mehr Passanten (Aufwand: mittel).
*   **Geraeuschkulisse:** Kirchenglocken laeuten zur vollen Stunde; am Bahnhof hoert man Zugansagen, wenn ein Zug einfaehrt (Aufwand: klein).
*   **Tierverhalten:** Die Zootiere haben Schlaf- und Fressenszeiten; die Enten im Seepark versammeln sich, wenn man sich dem Ufer naehert (Aufwand: klein).
*   **Berufsverkehr:** Die Verkehrsdichte auf den Hauptstrassen ist zwischen 07:00–09:00 und 17:00–19:00 Uhr sichtbar hoeher (Aufwand: mittel).
*   **Seilbahn-Betrieb:** Die Seilbahn zum Grossen Berg faehrt nur von 08:00 bis 20:00 Uhr und macht mittags eine Pause (Aufwand: gross).

### 5. WIE ECHT

*   **Konsequenzen:** Ein hoher Fahndungslevel fuehrt dazu, dass Buerger dir ausweichen und Figuren wie Elian dir voruebergehend keine Auftraege geben.
*   **Zeit:** Bauvorhaben dauern Ingame-Stunden oder -Tage; das Geld dafuer wird bei Baubeginn abgebucht, nicht bei Fertigstellung.
*   **Geldfluss:** Mieteinnahmen werden einmal pro Ingame-Woche ausgezahlt, nicht in Echtzeit; Lohn fuer die Karriere kommt am Monatsende.
*   **Oekonomie:** Preise fuer Fische und Ernteprodukte schwanken je nach Wochentag und Nachfrage (z.B. am Markttag teurer).
*   **Zustand:** Ein Auto muss nach einem Unfall im Technikpark repariert werden, bevor der Taxi-Nebenjob wieder angenommen werden kann.
*   **Ruf:** Das Erfuellen von Auftraegen fuer eine Figur verbessert den Ruf bei ihr, was zu besseren Belohnungen oder exklusiven Auftraegen fuehrt.

### 6. MESSEN

*   **Story-Missions-Abschlussrate:** Prozentualer Anteil der Spieler, die Story-Mission X abschliessen, nachdem sie Mission X-1 beendet haben (misst das Story-Pacing und Engagement).
*   **Auftragsgeber-Diversitaet:** woechentliche Verteilung der abgeschlossenen, wiederholbaren Auftraege auf die verschiedenen Auftraggeber (zeigt, ob alle Figuren und Spielsysteme genutzt werden).
*   **Figuren-Interaktions-Hotspot:** Heatmap, die anzeigt, wo und zu welcher Ingame-Uhrzeit Spieler mit den 5 Hauptfiguren interagieren (prueft, ob die Tagesablaeufe wahrgenommen und genutzt werden).

## 9. „Wie GTA": Rangeln, Bestehlen, schöne Bewegungen bei allem (User 2026-09-29)

> User: „wie gta, schlagen und so, bestehlen, schöne bewegungen bei allem". Muster aus GTA, keine Inhalte. Ton wie bisher:
> Slapstick, kein Blut, jede Tat hat Folgen über die vorhandenen Systeme (Fahndungssterne, Polizei mit Zugriff und
> VERHAFTET-Einblendung, Bürgerrang, Ruf bei Figuren aus Abschnitt 8). Reihenfolge ist zwingend: erst Bewegungen, dann Taten.

### 9.1 Bewegungen zuerst (GROSS, 2 Sessions) — die Voraussetzung für alles andere
> Entwurf von ChatGPT (gpt-4.1, 2026-09-29, ungeprueft, mit Lizenz-Korrektur im Kopf): `spiele-dev/entwuerfe/r105-bewegungen-chatgpt.md`
> — Asset-Rezept, JS-Modul „Figuren“ (Mixer, Blenden, LOD), Integrationsstellen, probe-bewegung, Risiken.

Heute sind Figuren prozedural (Gliedmassen als Einzelteile, ~440 Aufrufe an der Kreuzung), es gibt kein Animationssystem.
Schlagen und Stehlen sehen ohne echte Animationen nach Kasperletheater aus.
- **Skinned Figuren mit Clips** aus CC0-Paketen (wie die Autos in Runde 90 in Blender nachbearbeitet, `tools/assets/`):
  idle, gehen, rennen, sitzen, einsteigen/aussteigen, aufheben, winken, Schlag, Taschengriff, taumeln, hinfallen, aufstehen.
  three.js `AnimationMixer` mit Überblendung (0,15–0,25 s), Fussbodenkontakt über den Boden-Strahl, der schon für Autos
  existiert (`th-autoboden`-Logik).
- **Alle Wesen über dieselbe Schleife**: Mia, Passanten, die fünf Figuren, Kinder auf dem Schulweg, Polizei. Ein Mixer je
  Figur, Clips geteilt (eine Instanz je Clip-Typ) — misst `probe-aufrufe` (Ziel: Bewegtes an der Kreuzung 440 → < 200,
  weil eine skinned Figur EIN Aufruf ist statt zehn Gliedmassen).
- **Fahrzeuge**: Einsteigen als Clip statt Teleport, Tür schwenkt (Modelle haben Türen als Teile — messen mit `th-echt`).
- **Kamera**: leichte Verzögerung und Schulterblick beim Rennen (billig, grosse Wirkung).
- Messen: neue Sonde `probe-bewegung` — je Clip: spielt ab, blendet über, Füsse ≤ 3 cm über Boden, keine T-Pose länger
  als 1 Bild; `th-bewegt` erweitert um Figuren.

### 9.2 Rangeln (MITTEL, 1 Session, nach 9.1)
- Tipp/Taste neben einem Passanten: Schlag-Clip, Ziel taumelt oder fällt (Clip), steht nach 2 s auf und läuft weg oder
  schlägt zurück (50 %). Kein Lebensbalken für Passanten; Mia hat einen kleinen Ausdauer-Balken (nach 3 Schlägen Pause).
- **Folgen**: 1 Fahndungsstern, Passanten in 30 m weichen aus und rufen (vorhandene Meinungs-Sprechblasen), Ruf bei
  allen fünf Figuren −1, Elian sperrt Aufträge bis zum Ende der Fahndung. Polizei kommt über `polizeiStart/polizeiKurs`.
- **Warum überhaupt**: Story-Missionen und Aufträge, die es brauchen (Dieb stellen, Streit im Chilbiplatz schlichten =
  zwei Schläge, dann Belohnung), damit es Spiel ist und kein Selbstzweck.
- Messen: `th-gta` erweitert (Schlag → Stern, Zugriff, VERHAFTET-Ablauf, Ruf-Abzug, Reset nach Verhaftung).

### 9.3 Bestehlen (MITTEL, 1 Session, nach 9.1)
- Von hinten an einen Passanten: Taschengriff-Clip 1,2 s; Erfolg 70 % (Beute 20–120 $ nach Viertel, Sunnehalde mehr),
  Misserfolg: Passant dreht sich um, ruft, 1 Stern. Automaten, Spendenkästen, Marktstände als feste Ziele mit Cooldown.
- Auto stehlen gibt es schon (Fahndung) — Ergänzung: Besitzer rennt hinterher (Clip) und ruft.
- **Folgen** wie 9.2 plus: gestohlenes Geld zählt NICHT als „verdient" für den Bürgerrang (Abschnitt 7, Exploit-Kritik),
  stattdessen ein eigener Zähler „Schattenkasse" mit eigenen Erfolgen („Kleinganove", „Taschendieb")
  und einem Hehler in Burgdorf, der die Schattenkasse mit Abschlag wechselt (Geldsenke + Ort mit Sinn).
- **Umkehr**: Ruf zurückkaufen (Spende ans Stadtfest, Sozialdienst-Aufträge für Lena) — die GTA-Schleife Tat → Folge →
  Wiedergutmachung, die das Spiel endlos hält.
- Messen: `probe-sog` bekommt den Pfad „Kleinganove" als drittes Spielerprofil (Einnahmen aus Diebstahl, Sterne, Verhaftungen
  pro 30 Tage; Verhaftung kostet Zeit und 10 % Bargeld — muss sich messbar weniger lohnen als Arbeit, sonst kippt die Ökonomie).

### 9.4 Reihenfolge und Kosten
1. 9.1 Bewegungen (2 Sessions, grösster Nutzen: alles im Spiel sieht besser aus, weniger Aufrufe).
2. 8 Story + Figuren mit Tagesablauf (1 Session) — die Figuren brauchen die Clips aus 9.1.
3. 9.2 + 9.3 (je 1 Session), dazu die Missionen, die sie nutzen.
Vorher unverändert: Abschnitt 7 Punkt 2 (Rangpunkte aus Netto, Exploit-Schranke) — sonst wird Stehlen zum Rang-Turbo.

### 9.5 Korrektur nach Code-Lesen (2026-09-29, Runde 105 Teil 1 erledigt)
- **Bestehlen gibt es schon:** Taschendiebstahl als Minispiel (`mgStart("🤏 Taschendiebstahl")`, Erfolg → Beute mit
  `skills.krimi`, Misserfolg → Polizei + Busse) und Coups (`CRIMES`, `crimeScene`, Komplize, Risiko). 9.3 heisst also nicht
  „neu bauen", sondern: Clips aus 9.1 dranhängen, Besitzer-Reaktion, Hehler in Burgdorf, Ruf-Folgen bei den Figuren.
- **Erledigt:** Beute läuft in `stats.schatten` statt in den Gesamtverdienst (Runbook Runde 105 Teil 1). Der
  Kauf-Verkauf-Exploit aus Abschnitt 7 existiert nicht (Rückgaben gehen direkt über `geld+=`).

### 9.6 Korrektur zu 9.1 nach Code-Lesen (2026-09-30, Runde 105 Teil 2 erledigt)
- **Assets sind da:** 79 GLB mit Animationen im Repo — Meshy-Figuren `anime_boy/girl/hero/mage/ninja/warrior` (idle, walk,
  run, teils attack), `class_mage/ranger/titan`, Tiere `an_*` (8 Clips). Mia/Partner tragen bereits skinned `th_mann`/`th_frau`
  (ein Clip „walking"). Kein CC0-Download nötig; neue Clips (sitzen, Schlag, Taschengriff, taumeln) über das Meshy-Rezept
  aus `spiele-dev/RUNBOOK-SPIELE.md` auf demselben Rig erzeugen. Der ChatGPT-Entwurf (Abschnitt 1 Assets) ist damit überholt;
  sein Modul-Teil (Mixer, Blenden, LOD, Fallback) bleibt brauchbar.
- **Erledigt:** Tempo-Kopplung und Stand-Bild für Mia/Partner (Runbook Runde 105 Teil 2, `probe-schritt`).
- **Nächster Schritt 9.1:** Passanten von `mkBewohner` auf eine `anime_*`-Figur mit idle/walk/run umstellen (Mixer je
  Figur, Blenden nach Geschwindigkeit wie bei Mia, LOD ab 60 m), gemessen mit `probe-aufrufe` (Bewegtes 440 → ?) und einer
  erweiterten `probe-schritt` (Fussrutschen der Passanten).
