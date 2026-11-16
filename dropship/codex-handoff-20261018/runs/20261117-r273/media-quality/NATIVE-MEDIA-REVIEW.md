# R273 – Shopify-Medien geprüft

Das öffentlich ausgelieferte Shopify-Original ist byte- und SHA-256-gleich zum freigegebenen 15-Sekunden-Master. Es hat 1080 × 1440 Pixel, 450 Frames bei 30 fps und keinen Audiostream. Original und gewählte Shopify-Transkodierung liefern echte HTTP-Range-Antworten mit Status 206 und werden vollständig fehlerfrei dekodiert.

Die von der Section ausgewählte Transkodierung hat 810 × 1080 Pixel, 15 Sekunden, 450 Frames und keinen Ton. Sie ist eine neu kodierte Datei, kein identischer Export-Hash. Elf Bildzeitpunkte mit allen Schnittgrenzen wurden visuell gegenüber dem Original geprüft: Kleid und relevante Keramik bleiben vollständig; kein erkennbarer Muster-/Formwechsel oder neuer Gegenstand. Zwei echte Chromium-Screenshots bestätigen die sichtbaren Produktbilder nach CDN-Seeks.

Acht tatsächliche Chromium-Seeks zu 0, 4, 8, 12, 14.9, 8, 4 und 0 Sekunden bestanden ohne Medienfehler. Dabei wurden Daten geladen und der Decoder blieb pausiert. Das ist kein Beleg für durchgehend flüssiges Scrollen auf allen Geräten oder unter kaltem Mobilnetz. Shopify setzt Keyframes nur alle 3 Sekunden statt alle 0.5 Sekunden im Original; native Vorschau und Safari/iPhone bleiben zur Performance-Abnahme erforderlich.

Standbild: öffentlich HTTP 200, 1080 × 1440; Shopify hat das JPEG neu komprimiert. Es gehört zum tatsächlichen ersten Filmbild, seine Bytezahl und sein Hash unterscheiden sich deshalb vom lokalen Poster.

Keine Shopify-/Admin-/GitHub-Writes, kein bezahlter Job und keine Live-Abnahme durch diese Medienprüfung. Belege: MEDIA-PROOF.json, CHROMIUM-CDN-QA.json, NATIVE-MEDIA-REVIEW.json.
