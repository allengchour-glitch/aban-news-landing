# Grind-Entwürfe aufbereiten und freigeben (09.11.2026)

Auftrag: «fix alles» (Besitzer 09.11.), nach meiner Meldung, dass 14 Grind-Entwürfe (`text-offen`) ohne Fliesstext liegen.
Werkzeug: `automation/grind_freigabe.mjs` (Test `automation/grind_freigabe_test.mjs`, 50 Prüfungen, Mutationsprobe 26 von 26), Plan: `plan.json`, Sicherung: `sicherung.json`.

## Was gemacht wurde

1. **Text-Werkzeuge für Entwürfe** (`STATUS_OK=DRAFT`, `LEERE_PROSA_OK=1`; Vorgabe bleibt nur ACTIVE mit schlichter Prosa): `automation/lib/text_prosa.mjs` (`erlaubteStatus`, `prosaBearbeitbar`, 14 neue Prüfungen, Mutationsprobe 8 von 8), `text_eingabe.mjs`, `text_anwenden.mjs`, `cj_fakten_block.mjs`.
2. **Datenblätter geholt** (CJ, 14 Abfragen) und jedes Produkt gegen sein Datenblatt, seine Variantenpreise und seine Bilder gesichtet.
3. **Sechs Fliesstexte** geschrieben, mechanisch geprüft (`text_pruefen_cli.mjs`: 6 von 6 OK, 486 bis 808 Zeichen), gegen die Datenblätter gelesen und mit `text_anwenden.mjs` gesetzt (nur Beschreibung der Entwürfe, Datenblatt-Kasten unverändert).
4. **Aufbereitet** (Sicherung vorher, Rücklesen nachher): Optionswerte «15.4Inch» → «15.4 Zoll» und «16MM» → «16 mm», Hauptbild der Choker-Halskette (Collage → Produkt auf Weiss), Titel der Laptop-Hülle («Laptoptasche einfach» → «Laptop-Hülle aus mattem PU, 12 bis 14 Zoll»), «zipper»/«nylon» im Datenblatt-Kasten eingedeutscht, Tag `text-offen` entfernt.
5. **Veröffentlicht 10:14 UTC (LIVE, je 6 Kanäle, Seite HTTP 200, frisch zurückgelesen):** Laptop-Tasche Schultertasche, Webcam 1080P Konferenz, Choker-Halskette, Herren-Halskette Nagelkreuz, Laptop-Hülle. Ledger: `dropship/grind2_freigabe_ledger.txt`.

## Entscheid je Produkt

| Produkt | Entscheid | Grund |
|---|---|---|
| laptop-tasche-schultertasche-50b73c | **veröffentlicht** | Datenblatt, Bilder und Preise stimmig |
| webcam-1080p-konferenz-video-4521a2 | **veröffentlicht** | Auflösung, Anschluss, Masse belegt; Hauptbild sauber |
| choker-halskette-damen-voll-kristall-strass-sc-cbbc67 | **veröffentlicht** | Hauptbild getauscht (war eine Collage) |
| herren-halskette-mit-eisen-nagelkreuz-anhanger-376512 | **veröffentlicht** | die Mengen 1 bis 20 sind echte CJ-Mengen (Gewicht und Preis steigen), alle Preise ab CHF 14.90 |
| laptoptasche-einfach-844636 | **veröffentlicht** | Titel verbessert |
| damen-perucke-lockig-flauschig-pony-368960 | **bereit, aber nicht veröffentlicht** | Das Berechtigungssystem hat den zweiten Veröffentlichungslauf blockiert, nicht umgangen. Aufbereitet, alle 11 Tore bestanden: `LIVE=1 FREIGEBEN=1 node automation/grind_freigabe.mjs` veröffentlicht es (Notbremse: Freigabedatei `dropship/GRIND2-FREI.txt`). |
| damen-perucken-gewellt-617792 | bleibt Entwurf | alle gesichteten Bilder tragen Fremdmarken-Wasserzeichen («Tinylana», «Tesco») |
| webcam-1080p2k-hd-videokonferenz-treiberlos-us-448000 | bleibt Entwurf | Bilder mit Texteinblendungen und Fremdlogos (YouTube, Skype, Zoom, Xbox …); «2K» widerspricht den Varianten 1080p/720p |
| perucke-lockig-echthaar-spitze-664896 | bleibt Entwurf | Variantenpreise unplausibel (8 Zoll CHF 67.90, 32 Zoll CHF 18.90); Echthaar nur Lieferantenangabe |
| perucken-und-haarteile-echthaar-426048 | bleibt Entwurf | Echthaar nur Lieferantenangabe bei CHF 18.90 bis 63.90; ohne Muster nicht belegbar |
| webcam-4k-usb-hd-video-197312 | bleibt Entwurf | «4K» im Titel, das Datenblatt nennt einen «Full HD CMOS sensor» |
| webcam-usb-hd-1080p-mit-licht-netzwerk-video-k-276928 | bleibt Entwurf | «1080P» bei 300 000 Pixeln Sensor, die 480P-Variante kostet dasselbe |
| webcam-hd-fur-notebook-usb-2-0-mini-smart-562496 | bleibt Entwurf | Datenblatt dünn und widersprüchlich (USB-Webcam oder App-Kamera), keine Auflösung |
| webcam-outdoor-wifi-931712 | bleibt Entwurf | Überwachungskamera (12 V, Schwenkkopf), keine Webcam; Netzteil nicht im Lieferumfang |

Die acht gehaltenen Produkte tragen jetzt `grind-gehalten-0911` statt `text-offen`. Sie lassen sich später mit neuen Bildern, einem Muster oder einem anderen Titel nachholen (Plan ergänzen, Text mit `STATUS_OK=DRAFT LEERE_PROSA_OK=1` schreiben).

## Rücknahme

`ZURUECK=1 LIVE=1 node automation/grind_freigabe.mjs` stellt Titel, SEO, Tags, Beschreibung, Optionswerte und Bildreihenfolge aus `sicherung.json` wieder her und setzt die Produkte auf ENTWURF (frisch zurückgelesen).

## Ungemessen

Die Merchant-Prüfung durch Google (Stunden bis Tage), die Wirkung auf Verkäufe, ob die Bilder der fünf Produkte im Merchant Center ohne «Promotional overlay» durchgehen (gesichtet, nicht von Google bestätigt).

## Lehren

- Ein Werkzeug, das nur ACTIVE-Produkte bearbeitet, kann die Entwürfe nie fertig machen, auf die die Veröffentlichung wartet: die Text-Kette brauchte einen Schalter für Entwürfe und leere Prosa (Standard unverändert).
- Beim Sichten der Bilder fielen zwei von acht Kandidaten wegen Wasserzeichen und Fremdlogos durch, obwohl alle 23 Tore des Grind sie bestanden hatten: die Tore prüfen keinen Bildinhalt.
- Zahlen im Datenblatt gegeneinander lesen: «1080P» neben «Sensor 300 000 Pixel» und «4K» neben «Full HD sensor» stehen in denselben Datenblättern.
- Die Mutationsprobe fand drei Lücken im ersten Test (Notbremse unmittelbar vor ACTIVE, teilweise veröffentlichte Kanäle, still ignoriertes Feld beim Rücklesen).
