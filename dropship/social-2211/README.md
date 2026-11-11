# Social Woche 22. bis 28.11.2026: sieben Foto-Pakete, Seiten bereinigt, 28 Metricool-Entwürfe (11.11.2026)

## Was entstand

Je Produkt ein Paket (Instagram/Facebook-Karussell, TikTok-Fotos, Threads, Pinterest-Pin), alle zu denselben Uhrzeiten:
Threads 11:00, Instagram/Facebook 17:00, TikTok 18:00, Pinterest 20:00 (Schweizer Zeit).

| Tag | Produkt | Seite korrigiert (LIVE, frisch nachgelesen) |
|---|---|---|
| So 22.11. | Christbaumdecke mit goldenen Pailletten | 16:53 UTC: Bild mit Grössentabelle 78/90/122/152 cm und Fremdschrift gelöst, Beitragsfoto an Stelle 1, Spiegelbild des Fotografen ans Ende |
| Mo 23.11. | Weihnachtlicher Stuhlbezug | 16:52 UTC: Option «Farbe» heisst «Motiv», «Alter Mann» heisst «Weihnachtsmann», Masssatz ohne Richtung, 3 Bilder mit lesbarer Fremdmarke («McKenzie») gelöst, SEO neu |
| Di 24.11. | Weihnachtsbaum-Anhänger Alpaka-Set | keine Änderung nötig (Skript prüft nur) |
| Mi 25.11. | Kartenetui aus Aluminium | 16:53 UTC: Variante Blau zeigt nicht mehr ein Bild mit chinesischem Text und QR-Code, 7 Bilder (Fremdschrift, 370-px-Doppel) gelöst, SEO ohne Rabattcode |
| Do 26.11. | Kaffeebecher Edelstahl | 16:54 UTC: Option «Volumen» heisst «Ausführung» (Werte sind Farben), SEO ohne «Trend-Hit» |
| Fr 27.11. | Weihnachts-Plüschfiguren 5er-Set | 15:26 UTC: Bild mit gekacheltem Wasserzeichen und Bild mit englischer Schrift gelöst |
| Sa 28.11. | Weihnachtsgirlande mit Zapfen und Schleife | 16:54 UTC: Titel ohne «Rattan» (PVC laut eigener Beschreibung und Metafeld), Optionswerte «Ohne Licht / Warmlicht / Farblicht», Variantenbilder ohne englische Balken, 3 Balkenbilder gelöscht, 5 Alt-Texte; danach in den Wegweiser aufgenommen (39 → 40) |

Shopseiten aller sieben danach gelesen (`products/<handle>.js`): Titel, Optionen, Bildzahl, alle Ausführungen kaufbar.

Bilder werden mit `fileUpdate referencesToRemove` gelöst (die Datei bleibt unter Inhalt > Dateien, die Rücknahme hängt sie wieder an),
nur die Girlande löscht ihre drei Balkenbilder (`productDeleteMedia`, lokale Kopien `seite_sicherung_bild*.jpg`).

## Prüfung

Zwei Arbeitsläufe (`wf_56840bb1-384`, `wf_7a311525-e90`): je Produkt Bau, unabhängige Gegenprüfung, Nachbesserung, zweite
unabhängige Prüfung mit eigener Attrappe der Admin-API (Netzfehler mitten im Schreibweg, verzögerte Lesung, zweiter Lauf,
Rücknahme). Ergebnis der zweiten Prüfung: Stuhlbezug, Kartenetui, Christbaumdecke, Kaffeebecher «ok» (nur kleine Funde);
Girlande «nachbessern» wegen eines Falls in der **Rücknahme** (nicht im Vorwärtslauf, siehe unten).

## Entwürfe

`entwuerfe_anlegen.py` (`NUR=<handle,…>` Pflicht bei `LIVE=1`): 28 Entwürfe, `draft: true`, `autoPublish: false`,
Protokoll `angelegt.json`. Frisch gelesen: genau 4 je Tag vom 22. bis 28.11. Eingeplant wird erst durch die tägliche
Freigabe (`automation/metricool_freigabe.py`, 05:41 UTC, 10-Tage-Fenster, höchstens 12 je Lauf). Trockenlauf 11.11. 17:02 UTC
(Stand main): alle 19 Entwürfe im Fenster bestehen die Tore. Stopp je Beitrag: uuid in `dropship/METRICOOL-HALTEN.txt`.

## Wegweiser ordnen (noch nicht live)

`wegweiser/ordnen.mjs` stellt die Produkte der Beiträge 16. bis 28.11. nach Datum nach vorn (Seite 1 zeigt 24 Produkte).
**Zeitfenster:** frühestens So 15.11. 20:00, spätestens Mo 16.11. 11:00 Schweizer Zeit. Früher rutschen 9 Produkte mit
noch laufenden Beiträgen auf Seite 2 (Prüferfund). Wecker `trig_013ku4rpiE7VFDeLFMtDaaz1` (15.11. 20:30). Ablauf:
`node ordnen.mjs` (Trockenlauf), dann `LIVE=1 node ordnen.mjs`; Rücknahme `ZURUECK=1 LIVE=1`.

## Rücknahme je Seite

`ZURUECK=1 node seite.mjs` (Plan), dann `ZURUECK=1 LIVE=1 node seite.mjs` im Produktordner; die Sicherung
`seite_sicherung.json` liegt daneben. **Girlande:** die Rücknahme einmal fahren und danach die Galerie von Hand lesen;
geht beim Hochladen eine Antwort verloren, kann ein zweiter Rücknahmelauf ein Balkenbild doppelt anlegen (Prüferfund,
nicht behoben, nur im Notfall relevant).

## Ungemessen

Ob die Plattformen die Beiträge annehmen; Wirkung auf Besuche und Käufe; das CJ-Datenblatt bei Kaffeebecher, Alpaka,
Plüschfiguren und Girlande-Farblicht (Lesebudget erschöpft); die Rücknahme per `referencesToAdd` am echten Shop.
Die Bildpfade in `pack.json` zeigen in den Sitzungsordner; die Bilder selbst liegen im Shopify-CDN und in Metricool.
