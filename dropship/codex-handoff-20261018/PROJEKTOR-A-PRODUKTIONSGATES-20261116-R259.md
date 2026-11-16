# R259 – Projektor A: Produktionsgates und offene Belege

**Status: Entwurf, blockiert.** Kein fertiger 18-Sekunden-Master, keine Aufnahme, kein Render und keine Veröffentlichung. Aktuelle A-Auswahl: Variante 68122445283719, SKU CJSN139239101AZ. Asset-Abgleich beweist keine physische Probe oder Motivbindung.

# R259 – A-Varianten-Kontinuität und Shot-Abnahme

**Projekt:** `luxe_sternenprojektor_master_20261018` · genau ein 18-s-Master.
**Status:** Produktionsvorbereitung; keine Aufnahme, kein Render und kein Upload.

## Aktuelle A-Bindung

Root hat das Produkt in R259 frisch nativ gelesen (Produktfeld updatedAt: 16.11.2026, 07:06:59 UTC): Produkt `15521256604033`, Variante A `68122445283719`, SKU `CJSN139239101AZ`, CHF 34.90, Auswahl «A · Grundmodell · USB». Die ältere Variante `56197916361089` ist veraltet. Die bereits vorhandene R253-CJ-/Shopify-Abbildung bindet A und Bild `752b9e0c-e2c0-40d0-a56a-1ae8aa4c2a15.jpg` auf Asset-Ebene; sie bindet weder ein physisches Gerät noch das Motiv eines alten Clips.

Der lokale Referenzstill `/dev/shm/luxestyle-review/r253/master/source/current-A-reference.jpg` (SHA-256 `5fa8b110b3115cd0a98324c42a06a8fdd41981e3536010f9d657b93bd1539612`) zeigt einen weissen, rundlichen Projektor in U-förmiger Stütze, ein kuppelförmiges oberes Gehäuse mit radialen Öffnungen, mehrere Frontbedienelemente und eine seitliche Öffnung. Das ist eine Sichtreferenz für den Vergleich nach Erhalt einer A-Probe. Es ist weder visuelle Freigabe noch Rechtebeleg. Die daneben abgebildete Scheibe und Verpackung beweisen keinen variantenspezifischen Lieferumfang.

## Anschluss an den bestehenden 18-Sekunden-Plan

Der Master bleibt **1080 × 1920, 30 fps, 540 Frames**. A und B sind alternative Einstiege desselben Masters; nur Frames 000–059 dürfen wechseln: A «Dein Raum. Neues Licht.», B «Licht im Detail.». Ab Frame 060 läuft dieselbe geprüfte Aufnahmefolge weiter. Kein Zweitfilm.

| Frames / Zeit | Kontinuitätsnachweis vor Abnahme | Ausschlusskriterium |
|---|---|---|
| 000–059 / 0–2 s, beide Hooks | Dieselbe physische A-Probe und dasselbe belegte Motiv; Hooktext jeweils korrekt. | Motiv oder Ausführung wechselt zwischen A/B. |
| 060–149 / 2–5 s | Ein realer Knopfdruck der geprüften A-Probe, in einer nachvollziehbaren Einstellung. | Bedienhandlung, die am Testgerät nicht nachgewiesen wurde. |
| 150–269 / 5–9 s | Grundmodell und USB-Zuleitung so zeigen, wie sie tatsächlich verwendet werden. | Kabel retuschieren oder Zusatzteile aus B–G einblenden. |
| 270–389 / 9–13 s | Scheibe und resultierende Projektion in derselben ungeschnittenen Nachweisaufnahme dokumentieren; Projektion nicht digital ergänzen. | Kein nachgewiesener Scheiben-Motiv-Bezug, Sternen-Compositing oder ungeklärte Farbveränderung. |
| 390–479 / 13–16 s | Dasselbe A-Gerät, dieselbe Wand/Decke und unveränderte Raumgeometrie. | Geräte-, Film- oder Raumtausch ohne dokumentierte Kontinuität. |
| 480–539 / 16–18 s | Ruhiges Produktendbild und «Produkt ansehen»; kein Preis/Versandversprechen. | Ungeprüfte Produktbehauptung oder Rechte ungeklärtes Logo. |

## Aufnahme-Gates

1. Verpackung/Probenbeleg mit SKU `CJSN139239101AZ` sichern; Identität per ungeschnittenem Clip und Vergleich mit dem kanonischen A-Referenzbild dokumentieren.
2. A-spezifischen Lieferumfang prüfen. Die bisherige CJ-Gesamtpackliste ist nicht A-spezifisch. Keine Akku-, Bluetooth-, Motivscheiben- oder Galaxiescheiben-Aussage bei A ohne variantenspezifischen Nachweis.
3. Das tatsächlich eingesetzte Motiv und dessen Scheibe gemeinsam mit der A-Probe ungeschnitten aufzeichnen. Rechte an Scheiben-/Verpackungsgrafiken separat klären.
4. Musik und Film-/Bearbeitungs-/Werbe-/Plattformrechte schriftlich belegen; danach kreatives und Audio-Review.
5. Nach Produkt-/Quellen-/Musikrechte- und Drehmaterialprüfung einen unbezahlten internen Prüffilm exportieren. 540 Frames, 1080 × 1920, 30 fps, vollständige Dekodierung, Zuschnitt, Lesbarkeit, Ton und Hash prüfen; erst den tatsächlich fertigen Film zur abschliessenden kreativen Inhaberabnahme vorlegen.

Der aktuelle native Shopify-Medienbeleg (`/dev/shm/luxestyle-review/r259/master-existing-video.json`, SHA-256 `5d80497da05e925704b78e25d09057cba50777bc6ad231f097d0a31d4681fd7a`) bestätigt für Clip `77496185356679` den Dateinamen `cj-1477820492730732544.mp4`, erstellt am 12.10.2026 00:39:06 UTC und aktualisiert am 05.11.2026 02:32:33 UTC. Status `READY`, Dauer 27 960 ms; Originalquelle 960 × 540, 3 679 836 Bytes; abgeleiteter Shopify-Stream 852 × 480. `READY` bestätigt die technische Medienverarbeitung/Anhängung, keine kreative Freigabe, Bildrechte, A-Identität oder Motivbindung. Die Dauer/Auflösung erfüllen das Masterziel nicht; kein Download erfolgte.

## Musik- und Rechte-Prüfung (lokale Dateien)

Die kanonische Datei `/workspace/luxestyle-review/r124/automation/music/luxe-premium.wav` ist lokal vorhanden, getrackt und bytegleich zur R253-Datei: 11 343 950 Bytes, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`, Git-Blob `61de48704b2b3ae22fb028e6cf0a3c88e4826a7c`. `CREDITS.txt` nennt die Spur «original» und royalty-free. Das ist noch kein Buildnachweis: `make_premium.sh` nutzt standardmässig `FluidR3_GM.sf2`, erlaubt aber `SF2`-Overrides. Diese lokale Repo-/Dateiprüfung erfolgte am 16.11.2026 im R259-Lauf: Der WAV-Hash und Git-Blob stimmen mit den im R253-Beleg notierten Werten überein. Das bestätigt nur die lokale Artefaktkontinuität. Im geprüften Musikbaum wurden keine SoundFont-Datei, Rights-Manifestdatei oder exakte verwendete Input-/Build-Protokolle gefunden. Rechte und kommerzielle Audioabnahme bleiben offen; keine Musikfreigabe daraus ableiten.

## Ergebnis

**Unabhängiger Fortschritt:** Ein variantenspezifisches Continuity-/Shot-Acceptance-Protokoll ist an aktuelle SKU A und deren kanonische Bildreferenz gebunden. Es macht die bisherigen abstrakten Aufnahmepunkte auf konkrete A-Identität, Gehäusemerkmale, Scheibe/Motiv und verworfene Legacy-Datei prüfbar.

**Blockiert:** Physische A-Probe, A-spezifischer Lieferumfang, Motiv-/Grafikrechte, kommerzielle Filmrechte, tatsächlicher SoundFont-/Build-/Musikrechtebeleg, neuer geeigneter Dreh, finaler 18-s-/540-Frame-Master und kreative/audioseitige Freigabe. Kein Master-MP4 erstellt.


## Konkrete Bild- und Overlayführung für die Produktion

Hook A «Dein Raum. Neues Licht.» beginnt mit der ruhigen Raumwirkung der physisch belegten A-Projektion. Hook B «Licht im Detail.» beginnt stattdessen mit einer Nahaufnahme desselben A-Gehäuses und seiner echten USB-Zuleitung. Die beiden unterschiedlichen Einstiege sind Auswahlvorschläge für denselben Master, keine neue Serie; ab Frame 060 gilt dieselbe Aufnahmefolge.

Die Overlays lauten ab Frame 060 «Grundmodell A», ab150 «USB-Ausführung», ab270 «Licht im Raum» nur nach belegter Motivzuordnung, ab390 «Variante A» und ab480 «Produkt ansehen». Raum, Requisiten und Grafik bleiben taupe/cream; Produkt- und Projektionsfarben werden farbtreu belassen. Kontrollierte Beleuchtung und Weissabgleich, ruhige Kamera und lesbare Texte innerhalb der Plattform-Ausschnitte sind beim echten Film zu prüfen. Kein Voiceover; ausschliesslich die kanonische Musik nach genauer Quellen-/Lizenz-/Hörabnahme.
