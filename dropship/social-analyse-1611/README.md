# Social-Analyse 16.11.2026 und Entscheide des Besitzers

Besitzer 16.11. ca. 07:48 UTC: «kannst du gsnzen sozial post anschauen und analysieren oder hst das der andere session schon gemacht».

- **Antwort:** Teilweise. Die Handy-Sitzung «metricool analyse …» hat am 09.11. nur den Zeitraum 12.10. bis 09.11. ausgewertet (`dropship/social-woche-1611/PLAN.md`). Die Nachmessung der neuen Woche hatte sie auf den 16.11. gelegt. Sie ist seit dem 09.11. abends archiviert, die Nachmessung kam also nie.
- **Diese Analyse:** Workflow `social-analyse-1611` mit 22 Agenten, nur lesend (Metricool Marke `6227837`, Shopify ShopifyQL).
  - Sechs Messagenten: Instagram, Facebook, TikTok, YouTube/Pinterest/Threads, Planer, Shop.
  - Eine Analystin.
  - 14 Prüfer haben je eine Kernzahl nachgemessen: 13 hielten, eine hielt mit korrigiertem Zeitraum (B8).
  - Eine Gegenleserin hat die Schlüsse angegriffen.
  - Die Planer-Funde habe ich selbst nachgelesen.
- **Rohdaten:** `daten/*.json` (eine Zeile je Beitrag mit Alter in Stunden), dazu Analyse, Prüfurteile und Kritik in `ergebnis.json`.
- **Marken:** GEMESSEN, Hypothese, unbekannt.

## Ergebnis

**Wirkung auf den Shop (GEMESSEN, ShopifyQL 16.11. ca. 08:00 UTC)**
- **7 Tage:** 20 Social-Sitzungen von 2 336 insgesamt (Facebook 10, Pinterest 7, Instagram 3, TikTok 0). In der Schweiz sind es 9 von rund 309. Daraus entstand 1 Warenkorb und keine Kasse.
- **45 Tage:** kein Kauf aus Social. Bei rund 20 Besuchen je Woche ist auch bei 1 % Kaufquote weniger als ein Kauf zu erwarten. Die Null ist also ein schwacher Beleg.
- **Bezahlter TikTok-Test 01. bis 04.10.:** 414 Sitzungen, 6 Kassenstarts, 0 Käufe.
- **Kurzlinks:** `/ig` brachte 2 Sitzungen, `/tt` und `/yt` keine. Beide gibt es erst seit 03.11. bzw. 09.11.
- **Fragliche Zahl:** «5 von 20 Bestellungen über chatgpt.com» ist nicht belastbar. Die Bestellquellen ergeben zusammen 25 statt 20, und die Sitzungszeile zeigt 0 Kassen.

**Woche 10. bis 15.11. gegen 12.10. bis 09.11. (GEMESSEN)**
- **TikTok:**
  - 16 Beiträge, im Median 248 Aufrufe je Beitrag gegen 270 vorher.
  - Insgesamt 671 statt 470 Aufrufe je Tag, das kommt nur von der grösseren Menge.
  - Sehdauer 1,4 statt 2,3 Sekunden.
  - 113 von 116 Beiträgen liegen bei 241 bis 307 Aufrufen, 96 bis 99 % aus «Für dich». Das ist die Grundausspielung, ±20 Aufrufe sind Rauschen.
  - Follower 557 → 569.
- **YouTube-Shorts:** Die Tagesaufrufe stiegen mit 2 Shorts je Tag im Median von 55 auf 213 (4 Tage). Metricool führt nur 2 der 10 Wochen-Shorts in der Videoliste.
- **Instagram-Reels:**
  - 5 Reels, Reichweite im Median 26 gegen 49 vorher. 91 % wischen in den ersten 3 Sekunden weg (vorher 80 %).
  - Schwacher Befund: Die Reels sind noch jung, und der Vergleich mischt Format und Zeitraum. Die Basis bestand zu 25 von 29 aus automatischen Katalog-Reels mit Musik.
  - Follower 171 → 166.
- **Kaum Reichweite:**
  - Instagram-Fotos und Karussells erreichen im Median 8 bis 11,5 Konten, aus 141 Beiträgen kam kein Follower.
  - Facebook-Feed: 270 Impressionen auf 107 Beiträge, 6 Follower. Facebook-Reels der Woche: Median 5 Aufrufe, zwei mit 0.
  - Threads: 3 Follower, im Median 2 Aufrufe.
  - Neue Pinterest-Pins: zusammen 37 Impressionen, 0 Klicks (noch jung). Der grösste Teil der Pinterest-Impressionen stammt aus einer anderen Quelle, Herkunft unbekannt.
- **Was trägt (Hypothese, kleine Zahlen):** kurze Videos mit sichtbarer Wirkung aus den Bereichen Gadget, Haustier und Wohnen. Dazu CJ-Produktclips mit Musik vor dem 10.11. (Duft 116, Wasser-Speaker 134 Reichweite). Mode und Sammelbeiträge («5 Geschenke») laufen am schwächsten.

**Planer (GEMESSEN)**
- **Veröffentlichung 10. bis 15.11.:** 71 von 76 Netzwerk-Zeilen PUBLISHED, 0 ERROR.
- **5 verfallene Entwürfe** (Kristallspitzen 13.11., Rose-Threads 15.11.). Ursache: Die tägliche Freigabe läuft in der Praxis gegen 13 UTC statt 05:41, und ihr 2-Stunden-Tor lässt Termine vom selben Vormittag nicht mehr zu.
- **Rosen-Clip vom 11.11.:** Er lief mit Mixkit «violin-uplift-675», einem der zwei am 10.11. abgelehnten Stücke (laut `cj_clips.json`). Er war schon vorher eingeplant und wurde nicht zurückgezogen.

## Entscheide des Besitzers (16.11. ca. 08:40 UTC, gezielte Fragen)

1. **Hobel- und Sternenlicht-Entwürfe:** «Ja, ich: zurückhalten». Er hat sie selbst auf Entwurf gestellt (Hobel 16.11. 08:20, Sternenlicht 15.11. 19:07 Schweizer Zeit). Sie stehen auf der Halteliste.
2. **TikTok-Bibliotheks-Sound:** «Ja, Sound aus». Die Musikregel vom 10.11. gilt auch für `autoAddMusic`.
3. **Drei Videos vom 15.11.:** «Anhalten, erst prüfen». Die Videos «3 Ideen für Hund und Katze», Medizin-Box und Wasserwellen-Wiederholung waren direkt mit autoPublish angelegt, an der Freigabe vorbei.
4. **Aufwand:** «Nur noch Videos». Keine neuen Fotos, Karussells, Threads- oder TikTok-Fotobeiträge mehr. Eingeplantes läuft aus.

## Umgesetzt (16.11. ca. 08:45 bis 09:05 UTC)

- **Halteliste `dropship/METRICOOL-HALTEN.txt`:** 11 neue uuids (Hobel 3, Sternenlicht 4, drei Videos, ein Krallenschleifer-Foto). PR #3180, gemergt `9899714f87`. Im echten Parser von `metricool_freigabe.py` werden alle 11 als gehalten erkannt.
- **Drei Videos auf Entwurf gestellt** (autoPublish aus).
  - Metricool verlangte für die TikTok-Fassungen einen Titel. Gesetzt sind «3 Ideen für Hund und Katze» und «Licht wie Wasserwellen». Der übrige Text ist unverändert.
- **Acht TikTok-Fotobeiträge (16. bis 23.11.):** `autoAddMusic` aus, alles andere unverändert.
  - Metricool hat dabei die Bilder von Shopify Files auf eigene Adressen (`static.metricool.com`) kopiert.
- **Frisch über REST gelesen** (`planer_pruefen.py`, 16.11. 10:00 bis 24.11.):
  - 47 Beiträge, keine doppelte uuid, kein TikTok-Beitrag mit `autoAddMusic`.
  - Die drei Videos sind Entwurf, und kein Netzwerk hat zwei automatische Beiträge mit weniger als 3 Stunden Abstand.
- **Prüfung der drei Videos:**
  - **Ton (GEMESSEN):** Alle drei haben durchgehend Ton ohne Pause über 0,15 s bei −35 dB, mittlere Lautstärke rund −19 dB, viel Bass. Das ist sehr wahrscheinlich Hintergrundmusik und keine Stimme (Hypothese). Die Lautstärke-Hülle passt zu keinem der fünf Mixkit-Stücke (Korrelation höchstens 0,47; Hypothese: andere Musik).
  - **Folge:** Nach der Regel vom 10.11. bleiben sie gehalten, bis der Besitzer über die Musik entscheidet.
  - **Produkte:** Medizin-Box (CHF 15.90, 5 von 5 kaufbar) und Wasserwellen-Leuchte (16 von 18 kaufbar) sind ACTIVE. Die Texte nennen keine Preise.
  - **«3 Ideen»:** Die Einblendungen schreiben «fuer» statt «für». «Spielzeit fuer deine Katze» liegt über einem Hund. Im ersten Bild steht ein fremder Textrest «darf».

## Offen (Besitzer)

- Die drei Videos stumm schalten und neu hochladen, mit Musik lassen, oder verwerfen. «3 Ideen» braucht zusätzlich neue Einblendungen.
- Abgelaufene Entwürfe im Planer löschen: Kristallspitzen 13.11. (4 Netzwerke), Rose-Threads 15.11., Rose-Kopie 422206691. Die Schnittstelle kann nicht löschen.
- Die Freigabe startet in der Praxis gegen 13 UTC. Entwürfe für Termine vor etwa 16 Uhr darum mindestens einen Tag im Voraus anlegen.

## Nachmessung

- **Fr 20.11.:** Woche 10. bis 15.11. erneut lesen (Reels dann 5 bis 10 Tage alt), dann ist klar, ob der Abfall der Reels mit dem Alter verschwindet.
- **Woche 16. bis 23.11.:** TikTok-Fotos ohne Sound gegen die Fotos vom 03. bis 08.11. mit Sound.

## Lehren

1. Eine Analyse ohne Zeitreihe je Beitrag vergleicht Alter mit Alter: jeden Beitrag nach 48 h und nach 7 Tagen lesen.
2. Ein Beitrag, der direkt mit autoPublish angelegt wird, umgeht alle Tore der Freigabe. Den Planer darum in jeder Analyse auch auf solche Beiträge lesen (`creationDate` und `autoPublish`).
3. `updateScheduledPost`: Für TikTok ist ein Titel Pflicht. Die Bilder werden auf Metricool-Adressen kopiert. Die id ändert sich, die uuid bleibt. Danach immer frisch lesen und auf doppelte uuids prüfen.
4. Wer Beiträge auf Entwurf zurückstellt, wird von der täglichen Freigabe überstimmt, solange sie nicht auf der Halteliste stehen. Zurückstellen heisst darum auch: Halteliste.
