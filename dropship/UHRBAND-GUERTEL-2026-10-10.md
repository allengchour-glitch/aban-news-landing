# Uhrenarmbänder als «Gürtel» und als «Uhr» (10.10.2026, Verbesserungsrunde 04:25)

## Gemessen

**Neuimporte der letzten 4 h:** 128 aktiv, alle mit ≥ 2 Bildern und Google-Kategorie.
- **9 Uhrenarmbänder und Uhr-Zubehörteile standen bei Google und Shopify unter «Watches»**, also als Uhr.
- Drei davon tragen einen falsch übersetzten Titel: «Armbanduhr-Gürtel» (2×) und «Armbanduhr-Gurtschiene».

**Ursache 1, Übersetzung:** CJ/KI übersetzt 表带 (Uhrband; 带 heisst auch Gürtel) als «Gürtel», «Gurt» oder «Gurtschiene».
- Im ganzen Katalog gibt es 5 solche Titel.
- **4 sind Armbänder für die Apple Watch.** Das Bild zeigt das Band an einer Uhr, die Beschreibung sagt «passt zu Apple Watch 38–49 mm», geliefert wird ein einzelnes Band.
- **«Business-Uhrgürtel» ist eine Uhr.** Das ist 皮带表, eine Uhr mit Lederband (Bild: goldene Herrenuhr, Beschreibung «zwei Zeiger, 10 mm»).
- Die Uhren-Regel hatte «uhrgürtel» deshalb zu Recht ausgeschlossen.

**Ursache 2, Lücken in `uhren_fein.py`:**
- «Armbanduhr-Gürtel» traf die Uhr-Regel («armbanduhr»).
- «Smartwatch-Lade-Station» mit Bindestrich traf die Ladestation-Regel nicht.
- Die Bandbreite *nach* dem Wort («Lederarmband 22mm», «Kunstharz-Armband 22 mm») kannte nur die umgekehrte Reihenfolge.
- Trockenlauf über den Bestand:
  - **29 umzuordnen:** 13 Armbänder, 3 Zubehörteile, 13 Smartwatches feiner (Shopify «Smart Watches»).
  - **Im Schmuck-Zweig 1 Fall:** «Herrenarmband 25 mm». Laut Beschreibung ist das ein Uhrband mit Schrauben, eine reine mm-Regel wäre dort aber gefährlich («Panzerkette Armband 12 mm»).

## Getan

**Quelle:**
- In `cj_copy_prompt.mjs` stehen unter «Bekannte Übersetzungsfallen» jetzt diese Fälle:
  - «watch strap / watch band / watch belt / strap for … watch» = Uhrenarmband, nie «Gürtel/Gurt/Gurtschiene»
  - «belt watch / leather belt watch» = Uhr mit Lederarmband, nie «Uhrgürtel»
- `node --check` ok.

**Sicherheitsregel für Titel:** `automation/data/haendlerwort_regel.json` → `fremdwort_titel`.
- «Armbanduhr-Gürtel/-Gurt/-Gurtschiene» wird zu **«Uhrenriemen»**. Das Wort ist männlich wie «Gürtel», die Adjektive davor bleiben also richtig. «Uhrenarmband» wäre sächlich.
- Die Datei lesen alle drei CJ-Importer (`fallenSicher`) und der tägliche Bestand-Wächter `haendlerwort.py`.
- «Uhrgürtel» allein bleibt unverändert und steht als Handtitel in der Datei.
- `HANDLE_WORT` kennt die Wörter, die Adresse wird mit 301 umbenannt.
- Kanarien 102/102 (+6, darunter Herrengürtel und «Gurtschiene für Dachträger», die bleiben müssen). Die neuen Regeln liefern in JS dasselbe.

**Kategorie-Regel `uhren_fein.py`:**
- Neu erkannt werden «Uhrenriemen», «Armbanduhr-Gürtel», «Lade-Station» mit Bindestrich und die Stegbreite 12–26 mm nach «armband».
- «Armbanduhr … 42 mm» trifft nicht (`\b`), Gehäuse-Durchmesser liegen darüber.
- **Im Schmuck-Zweig gilt die Breite nur mit Uhrbezug** (watch/uhr/Apple/Samsung/Garmin …).
- Kanarien 56/56 und Schmuck-Zweig 17/17. Neu sind 13: Gürtel/Gurtschiene/Uhrenriemen → Band, Lade-Station → Zubehör, «Business-Uhrgürtel» bleibt, «Damen-Armbanduhr 26 mm» bleibt Uhr, «Panzerkette Armband 12 mm» bleibt Schmuck.

**Bestand:**
- 5 Produkte von Hand korrigiert: Titel, SEO-Titel und SEO-Beschreibung, erster Absatz ohne «Gürtel», neue Adresse mit **301 (5/5)**.
- Die Beschreibung ergänzt jetzt «die Uhr ist nicht enthalten». Das Bild zeigt das Band an einer Uhr.
- Vorher-Sicherung liegt in `dropship/_uhrband_titel_vorher_2026-10-10.json`.

| Vorher | Nachher |
|---|---|
| Business-Uhrgürtel | Business-Herrenuhr mit braunem Lederarmband |
| Nylon-Farbenpassender Armbanduhr-Gürtel | Nylon-Uhrenarmband in Kontrastfarben für Apple Watch |
| Vintage Leder Armbanduhr-Gurtschiene Retro | Vintage-Uhrenarmband aus Leder für Apple Watch |
| T-förmige atmungsaktive Armbanduhr-Gürtel aus Leder | Atmungsaktives Leder-Uhrenarmband in T-Form für Apple Watch |
| Silikon-Loop Magnetische Armbanduhr-Gürtel | Magnetisches Silikon-Loop-Uhrenarmband für Apple Watch |

**Kategorien:** `uhren_fein.py` SCHARF hat **29 gesetzt, 0 Fehler**.
- Zurückgelesen: die Uhr steht unter «Watches», die 4 Armbänder bei Shopify und Google unter «Watch Bands», alle kaufbar.
- WebFetch der alten Adresse: Die Weiterleitung greift und zeigt den neuen Titel, im Text steht kein «Gürtel» mehr.

**Wächter:** `uhren_fein.py` (täglich im Aufseher) und `haendlerwort.py` (täglich) tragen die neuen Regeln. Für Neuimporte greifen die Regel in `fallenSicher` und die Anweisung im Importer.

## Offen

- **Bild-Alttexte** der 5 Produkte tragen noch den alten Titel. `alt_titel_abgleich.py` gleicht sie im täglichen Lauf ab.
- **Lieferantenpreis im Text:** «Mini Matt Dragon Canvas Wasserfestes Herrenarmband 25 mm» schreibt «Für 10 Paare beträgt der Preis 40 yuan».
  - Die Schnellsuche «yuan» findet 11 Produkte, teils mit Modellnamen (BYD «Yuan PLUS»). Eigene Klasse.
- **Armbänder mit Farb- und Grössenliste im Text, aber nur einer Variante** (alle 4 Apple-Watch-Bänder). Der stündliche Auswahl-Nachrüster ist dafür zuständig.

## Lehre

**Ein chinesisches Zeichen mit zwei Bedeutungen braucht das Bild als Schiedsrichter.**
- 表带 (Uhrband) und 皮带表 (Uhr mit Lederband) werden beide zu «…gürtel». Das eine ist Zubehör, das andere eine Uhr.
- Die Regel darf nur die eindeutige Form umbenennen: «Armbanduhr-Gürtel» = Band. Die mehrdeutige («Uhrgürtel») bekommt einen gesichteten Handtitel.

**Ein Ersatzwort muss das grammatische Geschlecht des alten tragen,** sonst zerbricht jedes Adjektiv davor («atmungsaktive Uhrenarmband»).
