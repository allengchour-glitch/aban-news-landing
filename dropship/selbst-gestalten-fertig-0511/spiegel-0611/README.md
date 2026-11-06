# Vorlagenbilder von Printful nach Shopify Files gespiegelt (06.11.2026)

**Besitzer-Ja 06.11.2026 ca. 15:15 UTC: «2 ja sofort»** zur Frage, ob die 1 176 Vorlagenbilder gespiegelt werden (Entscheide 8 und 10 im `pod/v6/README.md`). Zu den Rechten (Entscheid 10): am 02.11.2026 hat der Besitzer die Nutzung der Printful-Galeriebilder laut AGB bestätigt (`dropship/ANTWORTEN-0211.md`); für die Vorlagenbilder unter `files.cdn.printful.com/m/` gibt es keine eigene Prüfung (Hypothese: gleiche Regel).

## Ergebnis (GEMESSEN 06.11.2026 15:20 bis 15:31 UTC)

- **1 176 von 1 176 Dateien liegen im Shopify-CDN** (1 165 neu in einem Lauf von 59 Stapeln, 11 aus den beiden Probestapeln davor), Name `luxe-vorschau-<10 Hex>.<png|jpg>`, 1 147 PNG und 29 JPG. 0 Fehler.
- **Gegenprobe, unabhängig vom Lauf** (`pruefen.mjs`): Plan 1 176 = im Shop 1 176 (Muster `luxe-vorschau-…`), 0 fehlend, 0 fremde; `lauf/hochgeladen.json` (Name → Adresse) gleich dem Shop; **Abmessungen Quelle gegen CDN gleich bei 1 176 von 1 176**; **PNG-Stichprobe 60 von 60 pixelgleich** (RGBA, ffmpeg-`framemd5`; das CDN fügt nur rund 48 Byte Metadaten an), dazu die 6 PNG des Modells 71 pixelgleich.
- **Das CDN kodiert JPEG neu** (GEMESSEN an den 3 Tassenfotos und 2 Hintergründen: 4 678 → 4 724 Byte, 23 854 → 17 203 Byte, PSNR 53,0 und 50,9 dB: optisch verlustfrei, nicht byte-gleich). Darum prüft das Werkzeug Abmessungen und Bildtyp, nicht Bytes (die eine Zeile `ABWEICHUNG` im Ledger stammt aus dem allerersten Probestapel vor dieser Änderung).
- **Fünf Quellen heissen `.jpg`, liefern aber PNG-Inhalt** (Palettenbilder ohne Transparenz, `PLTE`, kein `tRNS`; `bgImages/…solidblack.jpg` ×4 und `flat_2/front/yupoong6006_…whitebg.jpg`): das CDN liefert sie als JPEG aus (PSNR 40,5 bis 44,2 dB gegen die Quelle). Kein Alphakanal geht verloren; es sind Hintergründe und Vorlagen mit weissem Grund.
- Modell 403 (Canary-Tasse) hat bei den Vorschaudaten den Adapter `keine` (technisch ungeeignet, Vorlage nur Raster) und braucht den Spiegel nicht; die Tassenvorschau gilt dem klassischen Becher (Modell 19, SKU-Familie `9365183_…`), dessen 3 Tassenfotos jetzt gespiegelt sind (`foto` zeigt auf `cdn.shopify.com`).

## Dateien

| Datei | Inhalt |
|---|---|
| `spiegeln.mjs` | Das Werkzeug. Trockenlauf Vorgabe (`PRUEFEN=1` fragt jede Quelle per HEAD), `LIVE=1` legt nur NEUE Dateien an (vorhandene Namen werden nie überschrieben, der Name hängt am Hash der ganzen Quelladresse samt `?v=`), `ZURUECK=1 LIVE=1` löscht nur Ledger-Dateien. Stapel zu 20, 5 parallel, Wiederholung bei `Throttled`. |
| `spiegeln_test.mjs` | 40 Prüfungen gegen eine Attrappe (kein Netz). Mutationsprobe `spiegeln_mutation.mjs` 23 von 23 erkannt; die erste Fassung liess drei überleben (Rücknahme prüfte nicht Status und Namen, Fehler bei `stagedUploadsCreate` mit Zielen), sie sind jetzt durch Tests gedeckt. |
| `pruefen.mjs` | Gegenprobe (Pfade zum Scratch fest): Anzahl im Shop, Adressen, Abmessungen aller Dateien, Stichprobe für den Pixelvergleich. |
| `lauf/hochgeladen.json` | `{ "<dateiname>": "<https-Adresse>" }` für alle 1 176 Dateien; das ist die Eingabe `--spiegel` des Vorschaudaten-Bauers. |
| `lauf/ledger.tsv`, `lauf/lauf-alle.log` | Protokoll (Zeit, Name, Status, Datei-ID, Adresse). |

## So geht es weiter (Vorschaudaten backen)

`node pod/v6/werkzeug/vorschau_daten_bauen.mjs --katalog <Katalogordner> --modelle alle --out <Ordner> --spiegel dropship/selbst-gestalten-fertig-0511/spiegel-0611/lauf/hochgeladen.json [--buendel tshirt=71,456,586] --stand JJJJ-MM-TT` (GEMESSEN: danach zeigt `19.vorschau.json` das gespiegelte Tassenfoto). **Noch kein Produkt nutzt die Vorschau:** die Datei `<id>.vorschau.json` wird erst mit dem ersten v6-Einmodell-Produkt (L5: Tasse Modell 19, T-Shirt) als Shopify-Datei hochgeladen und mit `data-vorschau-url` eingebunden. Der Katalogordner liegt im Scratch (`sg/katalog`, 577 Dateien vom 05.11.2026, nicht im Repo).

## Rücknahme

`ZURUECK=1 LIVE=1 OUT=dropship/selbst-gestalten-fertig-0511/spiegel-0611/lauf node dropship/selbst-gestalten-fertig-0511/spiegel-0611/spiegeln.mjs` löscht genau die 1 176 Dateien laut Ledger (nur Status OK, gültiger Name und Datei-ID). Ohne Spiegel liest der Editor die Vorlagen weiter vom Printful-CDN (CORS `*` für `/m/`, GEMESSEN 06.11.); nur die Katalogfotos der Tasse unter `products/` haben keinen CORS-Kopf und brauchen den Spiegel.

## Offen / ungemessen

- Dateien im Shopify-CDN sind öffentlich und zählen zum Speicher des Shops (Gesamtgrösse der 1 176 Dateien nicht gemessen; HEAD liefert keine `content-length`, Hypothese: einige Dutzend MB).
- Ändert Printful ein Bild (neues `?v=`), entsteht beim nächsten Plan ein neuer Name; alte Dateien werden nie überschrieben und auch nicht automatisch gelöscht.
- Ob die Ansicht «Auf dem Produkt» im echten Shop mit den gespiegelten Bildern zeichnet, ist erst am ersten v6-Produkt messbar (L5).

## Lehren

1. Shopify Files kodiert hochgeladene JPEGs neu: Gleichheit nie an Bytes prüfen, sondern an Abmessungen und (stichprobenweise) Pixeln.
2. Eine Dateiendung der Quelle ist keine Aussage über den Inhalt (5 Quellen hiessen `.jpg` und waren PNG): den `content-type` der Quelle prüfen.
3. Ein Prüfskript, das nach dem ersten Lauf sofort 36 von 36 grün meldete, hatte 3 überlebende Mutanten: eine Mutationsprobe gehört vor den Live-Lauf, nicht danach.
